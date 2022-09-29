import { ILogger } from '../types'
import { getAutoplayVideo } from '../util/getAutoplayVideo'
import { getRTCTimer } from '../util/RTCTimer'
import { watchTrack } from '../util/gum'
import { getParameters } from './parameters'
import { get2DContext } from './browser-api/getCanvasContext'
import { isCanvasBlank } from '../util/isCanvasBlank'
import { IS_IOS } from '../util/rtcUtil/rtcEnvironment'

export interface VideoTrackLowOptions {
  logger: ILogger
  mediaType: string
}

declare global {
  interface HTMLCanvasElement {
    captureStream?(frameRate?: number): MediaStream
  }
}

type STATES = 'frame' | 'clear' | 'black' | 'paused'

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
  private lastState: STATES = 'clear'

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
  private sender: RTCRtpSender | null = null
  private emptyTrackInfo: {
    track: MediaStreamTrack | null
    count: number
    visible: 'yes' | 'no' | 'unknown'
  } = {
    track: null,
    count: 0,
    visible: 'unknown'
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
    if (this.high.track?.enabled === true && this.track?.enabled === false) {
      this.logger.log(`恢复小流mute状态`)
      this.track.enabled = true
    }
    if (!this.track) {
      this.logger.error(`无法获取小流 Track`)
    } else if (this.track.readyState !== 'live') {
      this.logger.error(`小流 Track 已停止`)
    } else if (this.high.track?.enabled === false) {
      if (this.lastState === 'frame' || this.lastState === 'clear') {
        this.logger.log(`track处在mute状态`)
        let newState: STATES = 'black'
        this.logger.log(`小流状态变更 ${this.lastState} => ${newState}`)
        this.lastState = newState
        this.context.fillRect(0, 0, this.width, this.height)
      }
    } else if (this.high.videoDom.paused) {
      if (this.lastState === 'frame' || this.lastState === 'clear') {
        let newState: STATES = 'paused'
        this.logger.log(`小流状态变更 ${this.lastState} => ${newState}`)
        this.lastState = newState
        this.high.videoDom.play().catch((e) => {
          // this.logger.error(`播放失败，小流可能无法展示`, e)
        })
      }
      if (getParameters().videoLowCheckCanvasBlank === 'all') {
        this._checkCanvasBlank()
      } else if (IS_IOS && getParameters().videoLowCheckCanvasBlank === 'ios') {
        this._checkCanvasBlank()
      }
    } else if (this.high.track?.readyState === 'live') {
      if (this.lastState !== 'frame') {
        let newState: STATES = 'frame'
        this.logger.log(`小流状态变更 ${this.lastState} => ${newState}`)
        this.lastState = newState
      }
      this.context.drawImage(this.high.videoDom, 0, 0, this.width, this.height)
      this.lastDrawAt = Date.now()
      if (getParameters().videoLowCheckCanvasBlank === 'all') {
        this._checkCanvasBlank()
      } else if (IS_IOS && getParameters().videoLowCheckCanvasBlank === 'ios') {
        this._checkCanvasBlank()
      }
    } else {
      if (this.lastState === 'frame') {
        let newState: STATES = 'clear'
        this.logger.log(`小流状态变更 ${this.lastState} => ${newState}`)
        this.lastState = newState
        this.context.clearRect(0, 0, this.width, this.height)
      }
    }
  }

  /**
   * IOS无法将CanvasCaptureMediaStreamTrack再画到Canvas
   */
  _checkCanvasBlank() {
    if (this.high.sender?.track && this.sender?.track) {
      if (this.high.sender.track !== this.emptyTrackInfo.track) {
        this.emptyTrackInfo = {
          track: this.high.sender.track,
          count: 0,
          visible: 'unknown'
        }
      }
      if (this.emptyTrackInfo.visible === 'unknown') {
        if (this.high.videoDom.paused || this.high.videoDom.readyState !== 4) {
          this.emptyTrackInfo.count++
        } else {
          const isBlank = isCanvasBlank(this.canvas)
          if (isBlank) {
            this.emptyTrackInfo.count++
          } else {
            this.emptyTrackInfo.visible = 'yes'
            this.logger.log(`_checkCanvasBlank: 小流画面可见`, this.emptyTrackInfo.count)
            if (this.sender.track !== this.track) {
              this.logger.warn(`小流切换至低分辨率模式`)
              this.sender.replaceTrack(this.track)
            }
          }
        }
        if (this.emptyTrackInfo.count > 30) {
          this.emptyTrackInfo.visible = 'no'
          if (this.sender.track !== this.high.sender.track) {
            this.logger.warn(`_checkCanvasBlank: 小流两秒内无画面，小流切换至相同分辨率模式`)
            this.sender.replaceTrack(this.high.sender.track)
          } else {
            this.logger.warn(`_checkCanvasBlank: 小流两秒内无画面，继续使用相同分辨率模式`)
          }
        }
      }
    }
  }

  /**
   * 这个函数每次画帧时都会调用，但大多时候没有行为
   */
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
      if (this.sender) {
        if (this.emptyTrackInfo.visible === 'no') {
          this.logger.warn(`小流正在使用相同分辨率模式`)
          this.sender.replaceTrack(newTrack)
        } else if (this.sender.track !== this.track) {
          this.logger.warn(`小流正在使用低分辨率模式`)
          this.sender.replaceTrack(this.track)
        }
      }
    }
  }
  bindSender(senderHigh: RTCRtpSender | null, senderLow: RTCRtpSender | null) {
    this.high.sender = senderHigh
    this.sender = senderLow
    if (senderHigh) {
      this._bindTrack(senderHigh.track)
    } else {
      this._bindTrack(null)
    }
  }
}
