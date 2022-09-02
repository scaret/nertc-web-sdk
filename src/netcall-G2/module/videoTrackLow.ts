import { ILogger } from '../types'
import { getAutoplayVideo } from '../util/getAutoplayVideo'
import { getRTCTimer } from '../util/RTCTimer'
import { watchTrack } from '../util/gum'
import { getParameters } from './parameters'
import { get2DContext } from './browser-api/getCanvasContext'

export interface VideoTrackLowOptions {
  logger: ILogger
  mediaType: string
}

declare global {
  interface HTMLCanvasElement {
    captureStream?(frameRate?: number): MediaStream
  }
}

export class VideoTrackLow {
  private logger: ILogger
  private mediaType: string
  private WIDTH_MAX
  private HEIGHT_MAX
  private FRAME_RATE

  private width = 0
  private height = 0

  private canvas: HTMLCanvasElement = document.createElement('canvas')
  private context: CanvasRenderingContext2D | null = get2DContext(this.canvas)
  private stream: MediaStream | null
  readonly track: MediaStreamTrack | null

  private timer: number | null = null
  private lastDrawAt = 0
  private lastState: 'frame' | 'clear' | 'black' | 'paused' = 'clear'

  private high: {
    sender: RTCRtpSender | null
    track: MediaStreamTrack | null
    stream: MediaStream
    videoDom: HTMLVideoElement
    width: number
    height: number
  } = {
    sender: null,
    track: null,
    stream: new MediaStream(),
    videoDom: getAutoplayVideo(),
    width: 0,
    height: 0
  }

  constructor(options: VideoTrackLowOptions) {
    this.mediaType = options.mediaType
    if (this.mediaType === 'video') {
      this.WIDTH_MAX = getParameters().videoLowMaxWidth
      this.HEIGHT_MAX = getParameters().videoLowMaxHeight
      this.FRAME_RATE = getParameters().videoLowFramerate
    } else {
      this.WIDTH_MAX = getParameters().screenLowMaxWidth
      this.HEIGHT_MAX = getParameters().screenLowMaxHeight
      this.FRAME_RATE = getParameters().screenLowFramerate
    }
    this.stream = this.canvas.captureStream ? this.canvas.captureStream(this.FRAME_RATE) : null
    this.track = this.stream?.getTracks()[0] || null
    watchTrack(this.track)

    this.logger = options.logger.getChild(() => {
      let tag = `low_${this.mediaType} ${this.width}x${this.height}`
      if (!this.high.sender) {
        tag += ' NO_HIGH_SENDER'
      } else if (!this.high.sender.track) {
        tag += ' NO_HIGH_TRACK'
      } else if (this.high.sender.track.readyState !== 'live') {
        tag += ' HIGH_STATE_' + this.high.sender.track.readyState
      } else {
        if (this.high.sender && this.high.sender.track !== this.high.track) {
          tag += ' MISMATCH'
        }
        if (!this.high.sender.track.enabled) {
          tag += ' muted'
        }
        tag += ` 【${this.high.sender.track.label}】`
      }
      if (!this.track) {
        tag += ` NO_LOW_TRACK`
      } else if (this.track.readyState !== 'live') {
        tag += ` LOW_STATE_` + this.track.readyState
      }

      return tag
    })

    if (!this.track) {
      this.logger.error(`当前浏览器不支持CanvasTrack`)
    } else if (!this.context) {
      this.logger.error(`CanvasContext无法顺利启动`)
      this.stream = null
      this.track = null
    } else {
      this.timer = getRTCTimer().setInterval(() => {
        this.drawOneFrame()
      }, 1000 / this.FRAME_RATE)
      // document.body.prepend(this.canvas)
    }
  }
  private _correctSize() {
    if (this.high.sender) {
      this._bindTrack(this.high.sender.track)
    }
    if (
      this.high.width !== this.high.videoDom.videoWidth ||
      this.high.height !== this.high.videoDom.videoHeight
    ) {
      const aspectRatio = this.high.videoDom.videoWidth / this.high.videoDom.videoHeight
      let newWidth = this.width
      let newHeight = this.height
      const WIDTH_MAX = aspectRatio > 1 ? this.WIDTH_MAX : this.HEIGHT_MAX
      const HEIGHT_MAX = aspectRatio > 1 ? this.HEIGHT_MAX : this.WIDTH_MAX
      if (aspectRatio > WIDTH_MAX / HEIGHT_MAX) {
        newHeight = Math.floor(
          (this.high.videoDom.videoHeight / this.high.videoDom.videoWidth) * WIDTH_MAX
        )
        if (newHeight > 0) {
          newWidth = WIDTH_MAX
        } else {
          newWidth = 0
          newHeight = 0
        }
      } else {
        newHeight = HEIGHT_MAX
        newWidth = Math.floor(
          (this.high.videoDom.videoWidth / this.high.videoDom.videoHeight) * HEIGHT_MAX
        )
        if (newWidth > 0) {
          newHeight = HEIGHT_MAX
        } else {
          newWidth = 0
          newHeight = 0
        }
      }
      this.logger.log(
        `High resize ${this.high.width}x${this.high.height}=>${this.high.videoDom.videoWidth}x${this.high.videoDom.videoHeight}` +
          `, low: ${this.width}x${this.height}=>${newWidth}x${newHeight}`
      )
      this.high.width = this.high.videoDom.videoWidth
      this.high.height = this.high.videoDom.videoHeight
      this.width = newWidth
      this.height = newHeight
      this.canvas.width = this.width
      this.canvas.height = this.height
    }
  }
  destroy() {
    if (this.timer) {
      getRTCTimer().clearInterval(this.timer)
      this.timer = null
    }
    this.track?.stop()
    this.stream = null
  }
  drawOneFrame() {
    if (!this.context) {
      return
    }
    this._correctSize()
    if (!this.track) {
      this.logger.error(`无法获取小流 Track`)
    } else if (this.track.readyState !== 'live') {
      this.logger.error(`小流 Track 已停止`)
    } else if (this.high.track?.enabled === false) {
      if (this.lastState === 'frame') {
        this.logger.log(`track处在mute状态`)
        this.lastState = 'black'
        this.context.fillStyle = 'black'
        this.context.fillRect(0, 0, this.width, this.height)
      }
    } else if (this.high.videoDom.paused) {
      if (this.lastState === 'frame') {
        this.logger.log(`track处在 Paused 状态`)
        this.lastState = 'paused'
      }
    } else if (this.high.track?.readyState === 'live') {
      if (this.lastState !== 'frame') {
        this.logger.log(`开始画小流`)
        this.lastState = 'frame'
      }
      this.context.drawImage(this.high.videoDom, 0, 0, this.width, this.height)
      this.lastDrawAt = Date.now()
    } else {
      if (this.lastState === 'frame') {
        this.logger.log(`track失效，清除小流`)
        this.lastState = 'clear'
        this.context.clearRect(0, 0, this.width, this.height)
      }
    }
  }
  private _bindTrack(newTrack: MediaStreamTrack | null) {
    if (this.high.track !== newTrack) {
      if (this.high.track) {
        this.high.stream.removeTrack(this.high.track)
      }
      if (newTrack) {
        this.high.stream.addTrack(newTrack)
      }
      this.high.track = newTrack
      this.high.videoDom.srcObject = this.high.stream
      this.high.videoDom.play().catch((e) => {
        // ignore
      })
    }
  }
  bindSender(sender: RTCRtpSender | null) {
    this.high.sender = sender
    if (sender) {
      this._bindTrack(sender.track)
    } else {
      this._bindTrack(null)
    }
  }
}
