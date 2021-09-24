/* global RTCRtpTransceiver */

import * as Bowser from 'bowser';
import { Logger } from './Logger';
import { EnhancedEventEmitter } from './EnhancedEventEmitter';
import { UnsupportedError, InvalidStateError } from './errors';
import * as utils from './utils';
import * as ortc from './ortc';
import { Transport, TransportOptions, CanProduceByKind } from './Transport';
import { HandlerFactory, HandlerInterface } from './handlers/HandlerInterface';
import { Chrome74 } from './handlers/Chrome74';
import { Safari12 } from './handlers/Safari12';
import { RtpCapabilities, MediaKind } from './RtpParameters';
import { SctpCapabilities } from './SctpParameters';

const prefix = 'Device';

export type BuiltinHandlerName =
  | 'Chrome74'
  | 'Safari12'

export type DeviceOptions =
  {
    /**
     * The name of one of the builtin handlers.
     */
    handlerName?: BuiltinHandlerName;
    /**
     * Custom handler factory.
     */
    handlerFactory?: HandlerFactory;
    /**
     * DEPRECATED!
     * The name of one of the builtin handlers.
     */
    Handler?: string;
  };

interface InternalTransportOptions extends TransportOptions
{
  direction: 'send' | 'recv';
}

export function detectDevice(): BuiltinHandlerName | undefined
{
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string')
  {
    const ua = navigator.userAgent;
    const browser = Bowser.getParser(ua);
    const engine = browser.getEngine();

    // Chrome and Chromium.
    if (browser.satisfies({ chrome: '>=72', chromium: '>=72' }))
    {
      return 'Chrome74';
    }
    // Safari with Unified-Plan support enabled.
    else if (
      browser.satisfies({ safari: '>=12.0' }) &&
      typeof RTCRtpTransceiver !== 'undefined' &&
      RTCRtpTransceiver.prototype.hasOwnProperty('currentDirection')
    )
    {
      return 'Safari12';
    }
    else if (browser.getBrowserName() === "WeChat" && browser.getOS() && browser.getOS().name === "iOS") {
      //微信iOS端
      return 'Safari12';
    }
    // Unsupported browser.
    else
    {
      Logger.warn(prefix, 
        'this._detectDevice() | browser not supported [name:%s, version:%s], using Chrome72 as default',
        browser.getBrowserName(), browser.getBrowserVersion());

      return 'Chrome74';
    }
  }
  // Unknown device.
  else
  {
    Logger.warn(prefix, 'this._detectDevice() | unknown device, using Chrome 72 as default');

    return 'Chrome74';
  }
}

export class Device
{
  // RTC handler factory.
  private readonly _handlerFactory: HandlerFactory;
  // Handler name.
  private readonly _handlerName: string;
  // Loaded flag.
  private _loaded = false;
  // Extended RTP capabilities.
  private _extendedRtpCapabilities?: any;
  // Local RTP capabilities for receiving media.
  private _recvRtpCapabilities?: RtpCapabilities;
  // Whether we can produce audio/video based on computed extended RTP
  // capabilities.
  private readonly _canProduceByKind: CanProduceByKind;
  // Local SCTP capabilities.
  private _sctpCapabilities?: SctpCapabilities;
  // Observer instance.
  protected readonly _observer = new EnhancedEventEmitter();

  /**
   * Create a new Device to connect to mediasoup server.
   *
   * @throws {UnsupportedError} if device is not supported.
   */
  constructor({ handlerName, handlerFactory, Handler }: DeviceOptions = {})
  {
    Logger.debug(prefix, 'constructor()');

    // Handle deprecated option.
    if (Handler)
    {
      Logger.warn(prefix, 
        'constructor() | Handler option is DEPRECATED, use handlerName or handlerFactory instead');

      if (typeof Handler === 'string')
        handlerName = Handler as BuiltinHandlerName;
      else
        throw new TypeError(
          'non string Handler option no longer supported, use handlerFactory instead');
    }

    if (handlerName && handlerFactory)
    {
      throw new TypeError(
        'just one of handlerName or handlerInterface can be given');
    }

    if (handlerFactory)
    {
      this._handlerFactory = handlerFactory;
    }
    else
    {
      if (handlerName)
      {
        Logger.debug(prefix, 'constructor() | handler given: %s', handlerName);
      }
      else
      {
        handlerName = detectDevice();

        if (handlerName)
          Logger.debug(prefix, 'constructor() | detected handler: %s', handlerName);
        else
          throw new UnsupportedError('device not supported');
      }

      switch (handlerName)
      {
        case 'Chrome74':
          this._handlerFactory = Chrome74.createFactory();
          break;
        case 'Safari12':
          this._handlerFactory = Safari12.createFactory();
          break;
        default:
          console.error(`unknown handlerName "${handlerName}, using Chrome 74 as default"`);
          this._handlerFactory = Chrome74.createFactory();
          break;
      }
    }

    // Create a temporal handler to get its name.
    const handler = this._handlerFactory();

    this._handlerName = handler.name;

    handler.close();

    this._extendedRtpCapabilities = undefined;
    this._recvRtpCapabilities = undefined;
    this._canProduceByKind =
      {
        audio : false,
        video : false
      };
    this._sctpCapabilities = undefined;
  }

  /**
   * The RTC handler name.
   */
  get handlerName(): string
  {
    return this._handlerName;
  }

  /**
   * Whether the Device is loaded.
   */
  get loaded(): boolean
  {
    return this._loaded;
  }

  /**
   * RTP capabilities of the Device for receiving media.
   *
   * @throws {InvalidStateError} if not loaded.
   */
  get rtpCapabilities(): RtpCapabilities
  {
    if (!this._loaded)
      throw new InvalidStateError('not loaded');

    return this._recvRtpCapabilities!;
  }

  /**
   * SCTP capabilities of the Device.
   *
   * @throws {InvalidStateError} if not loaded.
   */
  get sctpCapabilities(): SctpCapabilities
  {
    if (!this._loaded)
      throw new InvalidStateError('not loaded');

    return this._sctpCapabilities!;
  }

  /**
   * Observer.
   *
   * @emits newtransport - (transport: Transport)
   */
  get observer(): EnhancedEventEmitter
  {
    return this._observer;
  }

  /**
   * Initialize the Device.
   */
  async load(
    { routerRtpCapabilities }:
      { routerRtpCapabilities: RtpCapabilities }
  ): Promise<void>
  {
    Logger.debug(prefix, 'load() [routerRtpCapabilities:%o]', routerRtpCapabilities);

    routerRtpCapabilities = utils.clone(routerRtpCapabilities, undefined);

    // Temporal handler to get its capabilities.
    let handler: HandlerInterface | undefined;

    try
    {
      if (this._loaded)
        throw new InvalidStateError('already loaded');

      // This may throw.
      ortc.validateRtpCapabilities(routerRtpCapabilities);

      handler = this._handlerFactory();

      const nativeRtpCapabilities = await handler.getNativeRtpCapabilities();

      Logger.debug(prefix, 
        'load() | got native RTP capabilities:%o', nativeRtpCapabilities);

      // This may throw.
      ortc.validateRtpCapabilities(nativeRtpCapabilities);

      // Get extended RTP capabilities.
      this._extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(
        nativeRtpCapabilities, routerRtpCapabilities);

      Logger.debug(prefix, 
        'load() | got extended RTP capabilities:%o',
        this._extendedRtpCapabilities);

      // Check whether we can produce audio/video.
      this._canProduceByKind.audio =
        ortc.canSend('audio', this._extendedRtpCapabilities);
      this._canProduceByKind.video =
        ortc.canSend('video', this._extendedRtpCapabilities);

      // Generate our receiving RTP capabilities for receiving media.
      this._recvRtpCapabilities =
        ortc.getRecvRtpCapabilities(this._extendedRtpCapabilities);

      // This may throw.
      ortc.validateRtpCapabilities(this._recvRtpCapabilities);

      Logger.debug(prefix, 
        'load() | got receiving RTP capabilities:%o',
        this._recvRtpCapabilities);

      // Generate our SCTP capabilities.
      this._sctpCapabilities = await handler.getNativeSctpCapabilities();

      Logger.debug(prefix, 
        'load() | got native SCTP capabilities:%o', this._sctpCapabilities);

      // This may throw.
      ortc.validateSctpCapabilities(this._sctpCapabilities);

      Logger.debug(prefix, 'load() succeeded');

      this._loaded = true;

      handler.close();
    }
    catch (error)
    {
      if (handler)
        handler.close();

      throw error;
    }
  }

  /**
   * Whether we can produce audio/video.
   *
   * @throws {InvalidStateError} if not loaded.
   * @throws {TypeError} if wrong arguments.
   */
  canProduce(kind: MediaKind): boolean
  {
    if (!this._loaded)
      throw new InvalidStateError('not loaded');
    else if (kind !== 'audio' && kind !== 'video')
      throw new TypeError(`invalid kind "${kind}"`);

    return this._canProduceByKind[kind];
  }

  /**
   * Creates a Transport for sending media.
   *
   * @throws {InvalidStateError} if not loaded.
   * @throws {TypeError} if wrong arguments.
   */
  createSendTransport(
    {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers,
      iceTransportPolicy,
      additionalSettings,
      proprietaryConstraints,
      appData = {}
    }: TransportOptions
  ): Transport
  {
    Logger.debug(prefix, 'createSendTransport()');

    return this._createTransport(
      {
        direction              : 'send',
        id                     : id,
        iceParameters          : iceParameters,
        iceCandidates          : iceCandidates,
        dtlsParameters         : dtlsParameters,
        sctpParameters         : sctpParameters,
        iceServers             : iceServers,
        iceTransportPolicy     : iceTransportPolicy,
        additionalSettings     : additionalSettings,
        proprietaryConstraints : proprietaryConstraints,
        appData                : appData
      });
  }

  /**
   * Creates a Transport for receiving media.
   *
   * @throws {InvalidStateError} if not loaded.
   * @throws {TypeError} if wrong arguments.
   */
  createRecvTransport(
    {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers,
      iceTransportPolicy,
      additionalSettings,
      proprietaryConstraints,
      appData = {}
    }: TransportOptions
  ): Transport
  {
    Logger.debug(prefix, 'createRecvTransport()');

    return this._createTransport(
      {
        direction              : 'recv',
        id                     : id,
        iceParameters          : iceParameters,
        iceCandidates          : iceCandidates,
        dtlsParameters         : dtlsParameters,
        sctpParameters         : sctpParameters,
        iceServers             : iceServers,
        iceTransportPolicy     : iceTransportPolicy,
        additionalSettings     : additionalSettings,
        proprietaryConstraints : proprietaryConstraints,
        appData                : appData
      });
  }

  private _createTransport(
    {
      direction,
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers,
      iceTransportPolicy,
      additionalSettings,
      proprietaryConstraints,
      appData = {}
    }: InternalTransportOptions
  ): Transport
  {
    if (!this._loaded)
      throw new InvalidStateError('not loaded');
    else if (appData && typeof appData !== 'object')
      throw new TypeError('if given, appData must be an object');

    // Create a new Transport.
    const transport = new Transport(
      {
        direction,
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters,
        iceServers,
        iceTransportPolicy,
        additionalSettings,
        proprietaryConstraints,
        appData,
        handlerFactory          : this._handlerFactory,
        extendedRtpCapabilities : this._extendedRtpCapabilities,
        canProduceByKind        : this._canProduceByKind
      });

    // Emit observer event.
    this._observer.safeEmit('newtransport', transport);

    return transport;
  }
}
