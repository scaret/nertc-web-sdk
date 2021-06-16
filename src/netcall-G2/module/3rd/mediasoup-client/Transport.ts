import { AwaitQueue } from 'awaitqueue';
import { Logger } from './Logger';
import { EnhancedEventEmitter } from './EnhancedEventEmitter';
import { UnsupportedError, InvalidStateError } from './errors';
import * as utils from './utils';
import * as ortc from './ortc';
import { HandlerFactory, HandlerInterface } from './handlers/HandlerInterface';
import { Producer, ProducerOptions } from './Producer';
import { Consumer, ConsumerOptions } from './Consumer';
import { SctpParameters } from './SctpParameters';
import {RtpParameters} from "./RtpParameters";

interface InternalTransportOptions extends TransportOptions
{
  direction: 'send' | 'recv';
  handlerFactory: HandlerFactory;
  extendedRtpCapabilities: any;
  canProduceByKind: CanProduceByKind;
}

export type TransportOptions =
{
  id: string;
  iceParameters?: IceParameters;
  iceCandidates?: IceCandidate[];
  dtlsParameters?: DtlsParameters;
  sctpParameters?: SctpParameters;
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  additionalSettings?: any;
  proprietaryConstraints?: any;
  appData?: any;
}

export type CanProduceByKind =
{
  audio: boolean;
  video: boolean;
  [key: string]: boolean;
}

export type IceParameters =
{
  /**
   * ICE username fragment.
   * */
  usernameFragment: string;
  /**
   * ICE password.
   */
  password: string;
  /**
   * ICE Lite.
   */
  iceLite?: boolean;
}

export type IceCandidate =
{
  /**
   * Unique identifier that allows ICE to correlate candidates that appear on
   * multiple transports.
   */
  foundation: string;
  /**
   * The assigned priority of the candidate.
   */
  priority: number;
  /**
   * The IP address of the candidate.
   */
  ip: string;
  /**
   * The protocol of the candidate.
   */
  protocol: 'udp' | 'tcp';
  /**
   * The port for the candidate.
   */
  port: number;
  /**
   * The type of candidate..
   */
  type: 'host' | 'srflx' | 'prflx' | 'relay';
  /**
   * The type of TCP candidate.
   */
  tcpType: 'active' | 'passive' | 'so';
}

export type DtlsParameters =
{
  /**
   * DTLS role. Default 'auto'.
   */
  role?: DtlsRole;
  /**
   * DTLS fingerprints.
   */
  fingerprints: DtlsFingerprint[];
}

/**
 * The hash function algorithm (as defined in the "Hash function Textual Names"
 * registry initially specified in RFC 4572 Section 8) and its corresponding
 * certificate fingerprint value (in lowercase hex string as expressed utilizing
 * the syntax of "fingerprint" in RFC 4572 Section 5).
 */
export type DtlsFingerprint =
{
  algorithm: string;
  value: string;
}

export type DtlsRole = 'auto' | 'client' | 'server';

export type ConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'disconnected'
  | 'closed';

export type PlainRtpParameters =
{
  ip: string;
  ipVersion: 4 | 6;
  port: number;
};

export interface FillRemoteRecvSdpOptions{
  kind: 'video'|'audio';
  appData: {mediaType: 'audio'|'video'|'screen'};
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
  sctpParameters?: SctpParameters;
  sendingRtpParameters: RtpParameters;
  codecOptions: any;
  offer: RTCSessionDescription;
  codec: any;
  audioProfile: string;
}

const logger = new Logger('Transport');

export class Transport extends EnhancedEventEmitter
{
  // Id.
  public _id: string;
  // Closed flag.
  private _closed = false;
  // Direction.
  private readonly _direction: 'send' | 'recv';
  // Extended RTP capabilities.
  private readonly _extendedRtpCapabilities: any;
  // Whether we can produce audio/video based on computed extended RTP
  // capabilities.
  private readonly _canProduceByKind: CanProduceByKind;
  // SCTP max message size if enabled, null otherwise.
  private readonly _maxSctpMessageSize?: number | null;
  // RTC handler isntance.
  public readonly _handler: HandlerInterface;
  // Transport connection state.
  private _connectionState: ConnectionState = 'new';
  // App custom data.
  private readonly _appData: any;
  // Map of Producers indexed by id.
  private readonly _producers: Map<string, Producer> = new Map();
  // Map of Consumers indexed by id.
  private readonly _consumers: Map<string, Consumer> = new Map();
  // Whether the Consumer for RTP probation has been created.
  private _probatorConsumerCreated = false;
  // AwaitQueue instance to make async tasks happen sequentially.
  private readonly _awaitQueue = new AwaitQueue({ ClosedErrorClass: InvalidStateError });
  // Observer instance.
  protected readonly _observer = new EnhancedEventEmitter();
  private _recvRtpCapabilities: any;

  /**
   * @emits connect - (transportLocalParameters: any, callback: Function, errback: Function)
   * @emits connectionstatechange - (connectionState: ConnectionState)
   * @emits produce - (producerLocalParameters: any, callback: Function, errback: Function)
   * @emits producedata - (dataProducerLocalParameters: any, callback: Function, errback: Function)
   */
  constructor(
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
      handlerFactory,
      extendedRtpCapabilities,
      canProduceByKind
    }: InternalTransportOptions
  )
  {
    super();

    logger.debug('constructor() [id:%s, direction:%s]', id, direction);

    this._id = id;
    this._direction = direction;
    this._extendedRtpCapabilities = extendedRtpCapabilities;
    this._canProduceByKind = canProduceByKind;
    this._maxSctpMessageSize =
      sctpParameters ? sctpParameters.maxMessageSize : null;

    // Clone and sanitize additionalSettings.
    additionalSettings = utils.clone(additionalSettings, {});

    delete additionalSettings.iceServers;
    delete additionalSettings.iceTransportPolicy;
    delete additionalSettings.bundlePolicy;
    delete additionalSettings.rtcpMuxPolicy;
    delete additionalSettings.sdpSemantics;

    this._handler = handlerFactory();

    this._handler.run(
      {
        direction,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters,
        iceServers,
        iceTransportPolicy,
        additionalSettings,
        proprietaryConstraints,
        extendedRtpCapabilities,
        appData
      });

    this._appData = appData;

    this._handleHandler();
  }

  /**
   * Transport id.
   */
  get id(): string
  {
    return this._id;
  }

  /**
   * Whether the Transport is closed.
   */
  get closed(): boolean
  {
    return this._closed;
  }

  /**
   * Transport direction.
   */
  get direction(): 'send' | 'recv'
  {
    return this._direction;
  }

  /**
   * RTC handler instance.
   */
  get handler(): HandlerInterface
  {
    return this._handler;
  }

  /**
   * Connection state.
   */
  get connectionState(): ConnectionState
  {
    return this._connectionState;
  }

  /**
   * App custom data.
   */
  get appData(): any
  {
    return this._appData;
  }

  /**
   * Invalid setter.
   */
  set appData(appData: any) // eslint-disable-line no-unused-vars
  {
    throw new Error('cannot override appData object');
  }

  /**
   * Observer.
   *
   * @emits close
   * @emits newproducer - (producer: Producer)
   * @emits newconsumer - (producer: Producer)
   * @emits newdataproducer - (dataProducer: DataProducer)
   * @emits newdataconsumer - (dataProducer: DataProducer)
   */
  get observer(): EnhancedEventEmitter
  {
    return this._observer;
  }

  /**
   * Close the Transport.
   */
  close(): void
  {
    if (this._closed)
      return;

    logger.debug('close()');

    this._closed = true;

    // Close the AwaitQueue.
    this._awaitQueue.close();

    // Close the handler.
    this._handler.close();

    // Close all Producers.
    for (const producer of this._producers.values())
    {
      producer.transportClosed();
    }
    this._producers.clear();

    // Close all Consumers.
    for (const consumer of this._consumers.values())
    {
      consumer.transportClosed();
    }
    this._consumers.clear();

    // Emit observer event.
    this._observer.safeEmit('close');
  }

  /**
   * Get associated Transport (RTCPeerConnection) stats.
   *
   * @returns {RTCStatsReport}
   */
  async getStats(): Promise<RTCStatsReport>
  {
    if (this._closed)
      throw new InvalidStateError('closed');

    return this._handler.getTransportStats();
  }

  /**
   * Restart ICE connection.
   */
  async restartIce(
    { iceParameters }:
    { iceParameters: IceParameters }
  ): Promise<void>
  {
    logger.debug('restartIce()');

    if (this._closed)
      throw new InvalidStateError('closed');
    else if (!iceParameters)
      throw new TypeError('missing iceParameters');

    // Enqueue command.
    return this._awaitQueue.push(
      async () => this._handler.restartIce(iceParameters),
      'transport.restartIce()');
  }

  /**
   * Update ICE servers.
   */
  async updateIceServers(
    { iceServers }:
    { iceServers?: RTCIceServer[] } = {}
  ): Promise<void>
  {
    logger.debug('updateIceServers()');

    if (this._closed)
      throw new InvalidStateError('closed');
    else if (!Array.isArray(iceServers))
      throw new TypeError('missing iceServers');

    // Enqueue command.
    return this._awaitQueue.push(
      async () => this._handler.updateIceServers(iceServers),
      'transport.updateIceServers()');
  }

  /**
   * Create a Producer.
   */
  async produce(
    {
      track,
      encodings,
      codecOptions,
      codec,
      stopTracks = true,
      disableTrackOnPause = true,
      zeroRtpOnPause = false,
      appData
    }: ProducerOptions
  ): Promise<Producer>
  {
    logger.debug('produce() [track:%o]', track);

    if (!track)
      throw new TypeError('missing track');
    else if (this._direction !== 'send')
      throw new UnsupportedError('not a sending Transport');
    else if (!this._canProduceByKind[track.kind])
      throw new UnsupportedError(`cannot produce ${track.kind}`);
    else if (track.readyState === 'ended')
      throw new InvalidStateError('track ended');
    // else if (this.listenerCount('connect') === 0 && this._connectionState === 'new')
    //   throw new TypeError('no "connect" listener set into this transport');
    else if (this.listenerCount('produce') === 0)
      throw new TypeError('no "produce" listener set into this transport');
    else if (appData && typeof appData !== 'object')
      throw new TypeError('if given, appData must be an object');

    // Enqueue command.
    return this._awaitQueue.push(
      async () =>
      {
        let normalizedEncodings;

        if (encodings && !Array.isArray(encodings))
        {
          throw TypeError('encodings must be an array');
        }
        else if (encodings && encodings.length === 0)
        {
          normalizedEncodings = undefined;
        }
        else if (encodings)
        {
          normalizedEncodings = encodings
            .map((encoding: any) =>
            {
              const normalizedEncoding: any = { active: true };

              if (encoding.active === false)
                normalizedEncoding.active = false;
              if (typeof encoding.dtx === 'boolean')
                normalizedEncoding.dtx = encoding.dtx;
              if (typeof encoding.scalabilityMode === 'string')
                normalizedEncoding.scalabilityMode = encoding.scalabilityMode;
              if (typeof encoding.scaleResolutionDownBy === 'number')
                normalizedEncoding.scaleResolutionDownBy = encoding.scaleResolutionDownBy;
              if (typeof encoding.maxBitrate === 'number')
                normalizedEncoding.maxBitrate = encoding.maxBitrate;
              if (typeof encoding.maxFramerate === 'number')
                normalizedEncoding.maxFramerate = encoding.maxFramerate;
              if (typeof encoding.adaptivePtime === 'boolean')
                normalizedEncoding.adaptivePtime = encoding.adaptivePtime;
              if (typeof encoding.priority === 'string')
                normalizedEncoding.priority = encoding.priority;
              if (typeof encoding.networkPriority === 'string')
                normalizedEncoding.networkPriority = encoding.networkPriority;

              return normalizedEncoding;
            });
        }

        const { localId, rtpParameters, rtpSender, dtlsParameters, offer } = await this._handler.send(
          {
            track,
            encodings : normalizedEncodings,
            codecOptions,
            appData,
            codec
          });

        try
        {
          // This will fill rtpParameters's missing fields with default values.
          ortc.validateRtpParameters(rtpParameters);

          const { id } = await this.safeEmitAsPromise(
            'produce',
            {
              kind : track.kind,
              rtpParameters,
              appData,
              localDtlsParameters: dtlsParameters,
              offer
            });

          const producer = new Producer(
            {
              id,
              localId,
              rtpSender,
              track,
              rtpParameters,
              stopTracks,
              disableTrackOnPause,
              zeroRtpOnPause,
              appData
            });

          this._producers.set(producer.id, producer);
          this._handleProducer(producer);

          // Emit observer event.
          this._observer.safeEmit('newproducer', producer);

          return producer;
        }
        catch (error)
        {
          this._handler.stopSending(localId, appData.mediaType)
            .catch(() => {});

          throw error;
        }
      },
      'transport.produce()')
      // This catch is needed to stop the given track if the command above
      // failed due to closed Transport.
      .catch((error: Error) =>
      {
        if (stopTracks)
        {
          try { track.stop(); }
          catch (error2) {}
        }

        throw error;
      });
  }

  async fillRemoteRecvSdp({ kind, appData, iceParameters, iceCandidates, dtlsParameters, sctpParameters, sendingRtpParameters, codecOptions, offer, audioProfile, codec}: FillRemoteRecvSdpOptions) {
    await this._handler.fillRemoteRecvSdp({
      kind,
      appData,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      sendingRtpParameters,
      codecOptions,
      offer,
      codec,
      audioProfile
    });
  }
  async prepareLocalSdp(kind: 'video'|'audio', edgeRtpCapabilities:any, uid: number) {
    try {
      const { dtlsParameters, rtpCapabilities, offer, mid, iceUfragReg } = await this._handler.prepareLocalSdp(kind, uid);
      if (!this._recvRtpCapabilities ||
        !ortc.canSend('audio', this._recvRtpCapabilities) ||
        !ortc.canSend('video', this._recvRtpCapabilities)) {
        let extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(rtpCapabilities, edgeRtpCapabilities);
        // Generate our receiving RTP capabilities for receiving media.
        this._recvRtpCapabilities =
          ortc.getRecvRtpCapabilities(extendedRtpCapabilities);
        //this._recvRtpCapabilities = ortc.getRecvRtpCapabilities(this._extendedRtpCapabilities);
        // This may throw.
        ortc.validateRtpCapabilities(this._recvRtpCapabilities);
      }
      return { dtlsParameters, rtpCapabilities: this._recvRtpCapabilities, offer, mid, iceUfragReg };
    }
    catch (error) {
      throw error;
    }
  }

  async recoverLocalSdp(remoteUid: number, mid:string|undefined, kind:'video'|'audio') {
    try {
      await this._handler.recoverTransceiver(remoteUid, mid, kind);
      return;
    }
    catch (error) {
      throw error;
    }
  }

  /**
   * Create a Consumer to consume a remote Producer.
   */
  async consume(
    {
      id,
      producerId,
      kind,
      rtpParameters,
      appData = {},
      offer,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      probeSSrc
    }: ConsumerOptions
  ): Promise<Consumer>
  {
    logger.debug('consume()');

    rtpParameters = utils.clone(rtpParameters, undefined);

    if (this._closed)
      throw new InvalidStateError('closed');
    else if (this._direction !== 'recv')
      throw new UnsupportedError('not a receiving Transport');
    else if (typeof id !== 'string')
      throw new TypeError('missing id');
    else if (typeof producerId !== 'string')
      throw new TypeError('missing producerId');
    else if (kind !== 'audio' && kind !== 'video')
      throw new TypeError(`invalid kind '${kind}'`);
    // else if (this.listenerCount('connect') === 0 && this._connectionState === 'new')
    //   throw new TypeError('no "connect" listener set into this transport');
    else if (appData && typeof appData !== 'object')
      throw new TypeError('if given, appData must be an object');

    // Enqueue command.
    return this._awaitQueue.push(
      async () =>
      {
        // Ensure the device can consume it.
        const canConsume = ortc.canReceive(rtpParameters, this._extendedRtpCapabilities);
        // 屏蔽canConsume的两个原因：  
        // 1. 本地的extendedRtpCapabilities是来自编码而非解码的，这会导致某些能解的情况下这里报错。  
        // 2. Native经常会不遵守声明的codec  
        // if (!canConsume)  
        //     throw new errors_1.UnsupportedError('cannot consume this Producer');  
        const { localId, rtpReceiver, track } = await this._handler.receive({ iceParameters, iceCandidates, dtlsParameters, sctpParameters,
          trackId: id, kind, rtpParameters, offer, probeSSrc, remoteUid: appData.remoteUid, extendedRtpCapabilities: this._extendedRtpCapabilities});
        
        const consumer = new Consumer(
          {
            id,
            localId,
            producerId,
            rtpReceiver,
            track,
            rtpParameters,
            appData
          });

        this._consumers.set(consumer.id, consumer);
        this._handleConsumer(consumer);

        // If this is the first video Consumer and the Consumer for RTP probation
        // has not yet been created, create it now.
        // if (0)
        // if (!this._probatorConsumerCreated && kind === 'video')
        // {
        //   try
        //   {
        //     const probatorRtpParameters =
        //       ortc.generateProbatorRtpParameters(consumer.rtpParameters);
        //
        //     await this._handler.receive(
        //       {
        //         trackId       : 'probator',
        //         kind          : 'video',
        //         rtpParameters : probatorRtpParameters
        //       });
        //
        //     logger.debug('consume() | Consumer for RTP probation created');
        //
        //     this._probatorConsumerCreated = true;
        //   }
        //   catch (error)
        //   {
        //     logger.error(
        //       'consume() | failed to create Consumer for RTP probation:%o',
        //       error);
        //   }
        // }

        // Emit observer event.
        this._observer.safeEmit('newconsumer', consumer);

        return consumer;
      },
      'transport.consume()');
  }

  _handleHandler(): void
  {
    const handler = this._handler;

    handler.on('@connect', (
      { dtlsParameters }: { dtlsParameters: DtlsParameters },
      callback: Function,
      errback: Function
    ) =>
    {
      if (this._closed)
      {
        errback(new InvalidStateError('closed'));

        return;
      }

      this.safeEmit('connect', { dtlsParameters }, callback, errback);
    });

    handler.on('@connectionstatechange', (connectionState: ConnectionState) =>
    {
      if (connectionState === this._connectionState)
        return;

      logger.debug('connection state changed to %s', connectionState);

      this._connectionState = connectionState;

      if (!this._closed)
        this.safeEmit('connectionstatechange', connectionState);
    });
  }

  _handleProducer(producer: Producer): void
  {
    producer.on('@close', () =>
    {
      // this._producers.delete(producer.id);

      if (this._closed)
        return;

      logger.warn('producer 关闭: ', producer.localId)
      // @ts-ignore
      this._awaitQueue.push(async () => this._handler.stopSending(producer.localId, producer.appData.mediaType))
        .catch((error) => logger.warn('producer.close() failed:%o', error));
    });

    producer.on('@replacetrack', (track, callback, errback) =>
    {
      this._awaitQueue.push(
        async () => this._handler.replaceTrack(producer.localId, track),
        'producer @replacetrack event')
        .then(callback)
        .catch(errback);
    });

    producer.on('@setmaxspatiallayer', (spatialLayer, callback, errback) =>
    {
      this._awaitQueue.push(
        async () => (
          this._handler.setMaxSpatialLayer(producer.localId, spatialLayer)
        ), 'producer @setmaxspatiallayer event')
        .then(callback)
        .catch(errback);
    });

    producer.on('@setrtpencodingparameters', (params, callback, errback) =>
    {
      this._awaitQueue.push(
        async () => (
          this._handler.setRtpEncodingParameters(producer.localId, params)
        ), 'producer @setrtpencodingparameters event')
        .then(callback)
        .catch(errback);
    });

    producer.on('@getstats', (callback, errback) =>
    {
      if (this._closed)
        return errback(new InvalidStateError('closed'));

      this._handler.getSenderStats(producer.localId)
        .then(callback)
        .catch(errback);
    });
  }

  _handleConsumer(consumer: Consumer): void
  {
    consumer.on('@close', () =>
    {
      this._consumers.delete(consumer.id);

      if (this._closed)
        return;

      this._awaitQueue.push(
        async () => this._handler.stopReceiving(consumer.localId),
        'consumer @close event')
        .catch(() => {});
    });

    consumer.on('@getstats', (callback, errback) =>
    {
      if (this._closed)
        return errback(new InvalidStateError('closed'));

      this._handler.getReceiverStats(consumer.localId)
        .then(callback)
        .catch(errback);
    });
  }
}
