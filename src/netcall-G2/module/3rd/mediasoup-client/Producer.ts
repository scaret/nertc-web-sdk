import ErrorCode from '../../../util/error/errorCode'
import RtcError from '../../../util/error/rtcError'
import * as env from '../../../util/rtcUtil/rtcEnvironment'
import { getParameters } from '../../parameters'
import { EnhancedEventEmitter } from './EnhancedEventEmitter'
import { InvalidStateError, UnsupportedError } from './errors'
import { Logger } from './Logger'
import {
  MediaKind,
  RtpCodecCapability,
  RtpEncodingParameters,
  RtpParameters
} from './RtpParameters'

export type ProducerOptions = {
  track?: MediaStreamTrack
  trackLow: MediaStreamTrack | null
  encodings?: RtpEncodingParameters[]
  codecOptions?: ProducerCodecOptions
  codec?: RtpCodecCapability
  stopTracks?: boolean
  disableTrackOnPause?: boolean
  zeroRtpOnPause?: boolean
  appData: {
    deviceId: string
    deviceIdLow: string | null
    mediaType: 'video' | 'audio' | 'screenShare' | 'audioSlave'
  }
}

// https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
export type ProducerCodecOptions = {
  opusStereo?: boolean
  opusFec?: boolean
  opusDtx?: boolean
  opusMaxPlaybackRate?: number
  opusMaxAverageBitrate?: number
  opusPtime?: number
  videoGoogleStartBitrate?: number
  videoGoogleMaxBitrate?: number
  videoGoogleMinBitrate?: number
}

const prefix = 'Producer'

export class Producer extends EnhancedEventEmitter {
  // Id.
  private readonly _id: string
  // Local id.
  private readonly _localId: string
  // Local id.
  private readonly _localIdLow: string | null
  // Closed flag.
  private _closed = false
  // Associated RTCRtpSender.
  public readonly _rtpSender?: RTCRtpSender
  // Associated RTCRtpSender.
  public readonly _rtpSenderLow?: RTCRtpSender
  // Local track.
  private _track: MediaStreamTrack | null
  // Local track.
  private _trackLow: MediaStreamTrack | null
  // Producer kind.
  private readonly _kind: MediaKind
  // RTP parameters.
  private readonly _rtpParameters: RtpParameters
  // Paused flag.
  private _paused: boolean
  // Video max spatial layer.
  private _maxSpatialLayer: number | undefined
  // Whether the Producer should call stop() in given tracks.
  private _stopTracks: boolean
  // Whether the Producer should set track.enabled = false when paused.
  private _disableTrackOnPause: boolean
  // Whether we should replace the RTCRtpSender.track with null when paused.
  private _zeroRtpOnPause: boolean
  // App custom data.
  private readonly _appData: any
  // Observer instance.
  protected readonly _observer = new EnhancedEventEmitter()

  /**
   * @emits transportclose
   * @emits trackended
   * @emits @replacetrack - (track: MediaStreamTrack | null)
   * @emits @setmaxspatiallayer - (spatialLayer: string)
   * @emits @setrtpencodingparameters - (params: any)
   * @emits @getstats
   * @emits @close
   */
  constructor({
    id,
    localId,
    localIdLow,
    rtpSender,
    rtpSenderLow,
    track,
    trackLow,
    rtpParameters,
    stopTracks,
    disableTrackOnPause,
    zeroRtpOnPause,
    appData
  }: {
    id: string
    localId: string
    localIdLow: string | null
    rtpSender?: RTCRtpSender
    rtpSenderLow?: RTCRtpSender
    track: MediaStreamTrack
    trackLow: MediaStreamTrack | null
    rtpParameters: RtpParameters
    stopTracks: boolean
    disableTrackOnPause: boolean
    zeroRtpOnPause: boolean
    appData: any
  }) {
    super()

    Logger.debug(prefix, 'constructor()', localId)

    this._id = id
    this._localId = localId
    this._localIdLow = localIdLow
    this._rtpSender = rtpSender
    this._rtpSenderLow = rtpSenderLow
    this._track = track
    this._trackLow = trackLow
    this._kind = track.kind as MediaKind
    this._rtpParameters = rtpParameters
    this._paused = disableTrackOnPause ? !track.enabled : false
    this._maxSpatialLayer = undefined
    this._stopTracks = stopTracks
    this._disableTrackOnPause = disableTrackOnPause
    this._zeroRtpOnPause = zeroRtpOnPause
    this._appData = appData
    this._onTrackEnded = this._onTrackEnded.bind(this)

    // NOTE: Minor issue. If zeroRtpOnPause is true, we cannot emit the
    // '@replacetrack' event here, so RTCRtpSender.track won't be null.

    this._handleTrack()
  }

  /**
   * Producer id.
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
   * Whether the Producer is closed.
   */
  get closed(): boolean {
    return this._closed
  }

  /**
   * Media kind.
   */
  get kind(): string {
    return this._kind
  }

  /**
   * Associated RTCRtpSender.
   */
  get rtpSender(): RTCRtpSender | undefined {
    return this._rtpSender
  }

  /**
   * The associated track.
   */
  get track(): MediaStreamTrack | null {
    return this._track
  }

  /**
   * RTP parameters.
   */
  get rtpParameters(): RtpParameters {
    return this._rtpParameters
  }

  /**
   * Whether the Producer is paused.
   */
  get paused(): boolean {
    return this._paused
  }

  /**
   * Max spatial layer.
   *
   * @type {Number | undefined}
   */
  get maxSpatialLayer(): number | undefined {
    return this._maxSpatialLayer
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
    appData // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    let enMessage = `Producer: cannot override appData object`,
      zhMessage = `Producer: appData override 异常`,
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
   * Closes the Producer.
   */
  close(): void {
    if (this._closed) return

    Logger.debug(prefix, 'close()')

    this._closed = true

    //媒体的清除动作由上层来处理
    //this._destroyTrack();

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
    //媒体的清除动作由上层来处理
    //this._destroyTrack();

    this.safeEmit('transportclose')

    // Emit observer event.
    this._observer.safeEmit('close')
  }

  /**
   * Get associated RTCRtpSender stats.
   */
  async getStats(): Promise<RTCStatsReport> {
    if (this._closed) throw new InvalidStateError('closed')

    return this.safeEmitAsPromise('@getstats')
  }

  /**
   * Pauses sending media.
   */
  pause(): void {
    Logger.debug(prefix, 'pause()')

    if (this._closed) {
      Logger.error(prefix, 'pause() | Producer closed')

      return
    }

    this._paused = true

    if (this._disableTrackOnPause) {
      if (this._track) {
        this._track.enabled = false
      }
      if (this._trackLow) {
        this._trackLow.enabled = false
      }
    }

    if (this._zeroRtpOnPause) {
      this.safeEmitAsPromise('@replacetrack', null).catch(() => {})
    }

    // Emit observer event.
    this._observer.safeEmit('pause')
  }

  /**
   * Resumes sending media.
   */
  resume(): void {
    Logger.debug(prefix, 'resume()')

    if (this._closed) {
      Logger.error(prefix, 'resume() | Producer closed')

      return
    }

    this._paused = false

    if (this._disableTrackOnPause) {
      if (this._track) {
        this._track.enabled = true
      }
      if (this._trackLow) {
        this._trackLow.enabled = true
      }
    }

    if (this._zeroRtpOnPause) {
      this.safeEmitAsPromise('@replacetrack', this._track).catch(() => {})
    }

    // Emit observer event.
    this._observer.safeEmit('resume')
  }

  /**
   * Replaces the current track with a new one or null.
   */
  async replaceTrack({ track }: { track: MediaStreamTrack | null }): Promise<void> {
    Logger.debug(prefix, 'replaceTrack()')

    if (this._closed) {
      // This must be done here. Otherwise there is no chance to stop the given
      // track.
      if (track && this._stopTracks) {
        try {
          if (track.kind === 'audio') {
            const globalTrackId = getParameters().tracks.audio.findIndex((mediaTrack) => {
              return track === mediaTrack
            })
            Logger.warn(
              `Stopping AUDIOTRACK#${globalTrackId} ${track.id}, ${track.label}, ${track.readyState}`
            )
          } else {
            const globalTrackId = getParameters().tracks.video.findIndex((mediaTrack) => {
              return track === mediaTrack
            })
            Logger.warn(
              `Stopping VIDEOTRACK#${globalTrackId} ${track.id}, ${track.label}, ${track.readyState}`
            )
          }
          track.stop()
        } catch (error) {}
      }

      throw new InvalidStateError('closed')
    } else if (track && track.readyState === 'ended') {
      throw new InvalidStateError('track ended')
    }

    // Do nothing if this is the same track as the current handled one.
    if (track === this._track) {
      Logger.debug(prefix, 'replaceTrack() | same track, ignored')

      return
    }

    if (!this._zeroRtpOnPause || !this._paused) {
      await this.safeEmitAsPromise('@replacetrack', track)
    }

    // Destroy the previous track.
    this._destroyTrack()

    // Set the new track.
    this._track = track

    // If this Producer was paused/resumed and the state of the new
    // track does not match, fix it.
    if (this._track && this._disableTrackOnPause) {
      if (!this._paused) this._track.enabled = true
      else if (this._paused) this._track.enabled = false
    }

    // Handle the effective track.
    this._handleTrack()
  }

  /**
   * Sets the video max spatial layer to be sent.
   */
  async setMaxSpatialLayer(spatialLayer: number): Promise<void> {
    if (this._closed) throw new InvalidStateError('closed')
    else if (this._kind !== 'video') throw new UnsupportedError('not a video Producer')
    else if (typeof spatialLayer !== 'number') throw new TypeError('invalid spatialLayer')

    if (spatialLayer === this._maxSpatialLayer) return

    await this.safeEmitAsPromise('@setmaxspatiallayer', spatialLayer)

    this._maxSpatialLayer = spatialLayer
  }

  /**
   * Sets the DSCP value.
   */
  async setRtpEncodingParameters(params: RTCRtpEncodingParameters): Promise<void> {
    if (this._closed) throw new InvalidStateError('closed')
    else if (typeof params !== 'object') throw new TypeError('invalid params')

    await this.safeEmitAsPromise('@setrtpencodingparameters', params)
  }

  private _onTrackEnded(): void {
    Logger.debug(prefix, 'track "ended" event')

    this.safeEmit('trackended')

    // Emit observer event.
    this._observer.safeEmit('trackended')
  }

  private _handleTrack(): void {
    if (!this._track) return

    this._track.addEventListener('ended', this._onTrackEnded)
  }

  private _destroyTrack(): void {
    if (!this._track) return

    Logger.warn(prefix, 'don not stop sender track')
    return
    // try
    // {
    //   this._track.removeEventListener('ended', this._onTrackEnded);
    //
    //   // Just stop the track unless the app set stopTracks: false.
    //   if (this._stopTracks)
    //     this._track.stop();
    // }
    // catch (error)
    // {}
  }
}
