import { MediaTypeShort } from '../../../types'
import ErrorCode from '../../../util/error/errorCode'
import RtcError from '../../../util/error/rtcError'
import * as env from '../../../util/rtcUtil/rtcEnvironment'
import { EnhancedEventEmitter } from './EnhancedEventEmitter'
import { InvalidStateError } from './errors'
import { Logger } from './Logger'
import { RtpParameters } from './RtpParameters'
import { SctpParameters } from './SctpParameters'
import { DtlsParameters, IceCandidate, IceParameters } from './Transport'

export type ConsumerOptions = {
  id?: string
  producerId?: string
  kind?: 'audio' | 'video'
  mediaType: MediaTypeShort
  uid: number | string
  rtpParameters: RtpParameters
  probeSSrc?: string
  offer: RTCSessionDescription
  iceParameters?: IceParameters
  iceCandidates?: IceCandidate[]
  dtlsParameters?: DtlsParameters
  sctpParameters?: SctpParameters
  appData?: any
  codecOptions?: any
}

const prefix = 'Consumer'

export class Consumer extends EnhancedEventEmitter {
  // Id.
  private readonly _id: string
  // Local id.
  private readonly _localId: string
  // Associated Producer id.
  private readonly _producerId: string
  // Closed flag.
  private _closed = false
  // Associated RTCRtpReceiver.
  private readonly _rtpReceiver?: RTCRtpReceiver
  // Remote track.
  private readonly _track: MediaStreamTrack
  // RTP parameters.
  private readonly _rtpParameters: RtpParameters
  // Paused flag.
  private _paused: boolean
  // App custom data.
  private readonly _appData: any
  // Observer instance.
  protected readonly _observer = new EnhancedEventEmitter()

  /**
   * @emits transportclose
   * @emits trackended
   * @emits @getstats
   * @emits @close
   */
  constructor({
    id,
    localId,
    producerId,
    rtpReceiver,
    track,
    rtpParameters,
    appData
  }: {
    id: string
    localId: string
    producerId: string
    rtpReceiver?: RTCRtpReceiver
    track: MediaStreamTrack
    rtpParameters: RtpParameters
    appData: any
  }) {
    super()

    Logger.debug(prefix, 'constructor()')

    this._id = id
    this._localId = localId
    this._producerId = producerId
    this._rtpReceiver = rtpReceiver
    this._track = track
    this._rtpParameters = rtpParameters
    this._paused = !track.enabled
    this._appData = appData
    this._onTrackEnded = this._onTrackEnded.bind(this)

    this._handleTrack()
  }

  /**
   * Consumer id.
   */
  get id(): string {
    return this._id
  }

  /**
   * Local id.
   */
  get localId(): string {
    return this._localId
  }

  /**
   * Associated Producer id.
   */
  get producerId(): string {
    return this._producerId
  }

  /**
   * Whether the Consumer is closed.
   */
  get closed(): boolean {
    return this._closed
  }

  /**
   * Media kind.
   */
  get kind(): string {
    return this._track.kind
  }

  /**
   * Associated RTCRtpReceiver.
   */
  get rtpReceiver(): RTCRtpReceiver | undefined {
    return this._rtpReceiver
  }

  /**
   * The associated track.
   */
  get track(): MediaStreamTrack {
    return this._track
  }

  /**
   * RTP parameters.
   */
  get rtpParameters(): RtpParameters {
    return this._rtpParameters
  }

  /**
   * Whether the Consumer is paused.
   */
  get paused(): boolean {
    return this._paused
  }

  /**
   * App custom data.
   */
  get appData(): any {
    return this._appData
  }

  /**
   * Invalid setter.
   */
  set appData(
    appData // eslint-disable-line no-unused-vars
  ) {
    let enMessage = `Consumer: cannot override appData object`,
      zhMessage = `Consumer: appData override 异常`,
      enAdvice = 'Please contact CommsEase technical support',
      zhAdvice = '请联系云信技术支持'
    let message = env.IS_ZH ? zhMessage : enMessage,
      advice = env.IS_ZH ? zhAdvice : enAdvice
    throw new RtcError({
      code: ErrorCode.APPDATA_OVERRIDE_ERROR,
      message,
      advice
    })
  }

  /**
   * Observer.
   *
   * @emits close
   * @emits pause
   * @emits resume
   * @emits trackended
   */
  get observer(): EnhancedEventEmitter {
    return this._observer
  }

  /**
   * Closes the Consumer.
   */
  close(): void {
    if (this._closed) return

    Logger.debug(prefix, 'close()')

    this._closed = true

    this._destroyTrack()

    this.emit('@close')

    // Emit observer event.
    this._observer.safeEmit('close')
  }

  /**
   * Transport was closed.
   */
  transportClosed(): void {
    if (this._closed) return

    Logger.debug(prefix, 'transportClosed()')

    this._closed = true

    this._destroyTrack()

    this.safeEmit('transportclose')

    // Emit observer event.
    this._observer.safeEmit('close')
  }

  /**
   * Get associated RTCRtpReceiver stats.
   */
  async getStats(): Promise<RTCStatsReport> {
    if (this._closed) throw new InvalidStateError('closed')

    return this.safeEmitAsPromise('@getstats')
  }

  /**
   * Pauses receiving media.
   */
  pause(): void {
    Logger.debug(prefix, 'pause()')

    if (this._closed) {
      Logger.error(prefix, 'pause() | Consumer closed')

      return
    }

    this._paused = true
    this._track.enabled = false

    // Emit observer event.
    this._observer.safeEmit('pause')
  }

  /**
   * Resumes receiving media.
   */
  resume(): void {
    Logger.debug(prefix, 'resume()')

    if (this._closed) {
      Logger.error(prefix, 'resume() | Consumer closed')

      return
    }

    this._paused = false
    this._track.enabled = true

    // Emit observer event.
    this._observer.safeEmit('resume')
  }

  private _onTrackEnded(): void {
    Logger.debug(prefix, 'track "ended" event, %o, %s', this.id, this.kind)

    this.safeEmit('trackended')

    // Emit observer event.
    this._observer.safeEmit('trackended')
  }

  private _handleTrack(): void {
    this._track.addEventListener('ended', this._onTrackEnded)
  }

  private _destroyTrack(): void {
    Logger.debug(prefix, 'don not stop receiver track')
    return
    // try
    // {
    //   this._track.removeEventListener('ended', this._onTrackEnded);
    //   this._track.stop();
    // }
    // catch (error)
    // {}
  }
}
