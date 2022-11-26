import { EventEmitter } from 'eventemitter3'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { AdapterRef, ClientRecordConfig, FormatMediaOptions, ILogger, Timer } from '../types'
import { get2DContext } from './browser-api/getCanvasContext'

/*
  该模块主要的功能是混音和混流
 */
class FormatMedia extends EventEmitter {
  private audioContext: AudioContext | null
  public destination: MediaStreamAudioDestinationNode | null
  private audioStreams: AudioNode[]
  private canvas: HTMLCanvasElement | null
  private canvasContext: CanvasRenderingContext2D | null
  private canvasTimer: Timer | null
  private logger: ILogger
  private adapterRef: AdapterRef
  constructor(options: FormatMediaOptions) {
    super()
    this.adapterRef = options.adapterRef
    this.logger = options.adapterRef.logger
    this.audioContext = null
    this.destination = null
    this.audioStreams = []
    this.canvas = null
    this.canvasContext = null
    this.canvasTimer = null
  }

  //混音（webAudio）
  async formatAudio(streams: MediaStream[]) {
    this.logger.log('formatAudio() [混音: ]', streams)

    try {
      if (!this.audioContext) {
        this.audioContext = new window.AudioContext()
      }
      this.destination = this.audioContext.createMediaStreamDestination()
      await this.initAudioIn(streams)
      return this.destination.stream
    } catch (e: any) {
      this.logger.error('媒体设备获取失败: ', e.name, e.message)
      // return Promise.reject(e)
      let enMessage = `formatAudio: get media device error: ${e.name}`,
        zhMessage = `formatAudio: 媒体设备获取失败: ${e.name}`,
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      return Promise.reject(
        new RtcError({
          code: ErrorCode.FORMAT_AUDIO_ERROR,
          message,
          advice
        })
      )
    }
  }

  initAudioIn(streams: MediaStream[]) {
    if (!this.audioContext || !this.destination) {
      this.logger.error('initAudioIn:参数不够')
      return
    }

    for (var i = 0; i < streams.length; i++) {
      const audioTrack = streams[i].getAudioTracks()[0]
      if (audioTrack?.readyState !== 'live') {
        continue
      }
      const audioSource = this.audioContext.createMediaStreamSource(streams[i])
      audioSource.connect(this.destination)
      this.audioStreams.push(audioSource)
    }

    this.logger.log(`initAudioIn() [初始化音频 state: ${this.audioContext.state}]`)
    if (this.audioContext.state !== 'running') {
      this.audioContext
        .resume()
        .then(() => {
          if (this.audioContext) {
            this.logger.log(
              `initAudioIn(): [audioContext 状态变更成功 state: ${this.audioContext.state}]`
            )
          }
        })
        .catch((error) => {
          this.logger.warn(
            `initAudioIn(): [audioContext 状态变更发生错误, errorName: ${error.name}, erroMessage: ${error.message}]`
          )
          if (this.audioContext) {
            this.audioContext.resume()
          }
        })
    }
  }

  async updateStream(streams: MediaStream[]) {
    this.logger.log('updateStream() [更新混频的音频数据: ]', streams)
    this.audioStreams.forEach((audioSource) => {
      audioSource.disconnect(0)
    })
    this.audioStreams.length = 0
    this.initAudioIn(streams)
  }

  stopFormatAudio() {
    this.logger.log('stopFormatAudio() [结束混音]')
    this.audioStreams.forEach((audioSource) => {
      audioSource.disconnect(0)
    })

    if (this.audioContext) {
      this.audioContext.close()
    }
    this.audioContext = null
    this.destination = null
  }

  //混频（canvas）
  async formatVideo(recorder?: 'local' | 'all', recordConfig?: ClientRecordConfig) {
    this.logger.log('formatVideo() 混频 recorder: ', recorder, 'recordConfig: ', recordConfig)
    let recordVideoWidth = 640
    let recordVideoHeight = 360
    const recordVideoFrame = recordConfig?.recordVideoFrame || 15

    switch (recordConfig?.recordVideoQuality) {
      case 360:
        recordVideoWidth = 640
        recordVideoHeight = 360
        break
      case 480:
        recordVideoWidth = 640
        recordVideoHeight = 480
        break
      case 720:
        recordVideoWidth = 1280
        recordVideoHeight = 720
        break
      default:
        break
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.canvasContext = get2DContext(this.canvas)
    }
    this.canvas.width = recordVideoWidth
    this.canvas.height = recordVideoHeight
    if (this.canvasTimer) {
      clearInterval(this.canvasTimer)
      this.canvasTimer = null
    }

    const helfWidth = Math.floor(recordVideoWidth / 2)
    const helfHeigth = Math.floor(recordVideoHeight / 2)
    const oneThirdWidht = Math.floor(recordVideoWidth / 3)
    const oneThirdHeight = Math.floor(recordVideoHeight / 3)

    if (this.canvasContext) {
      this.canvasContext.fillStyle = 'black'
      this.canvasContext.fillRect(0, 0, recordVideoWidth, recordVideoHeight)
    }
    if (this.canvasTimer) {
      clearInterval(this.canvasTimer)
    }
    this.canvasTimer = setInterval(() => {
      if (this.canvasContext) {
        this.canvasContext.fillStyle = 'black'
        this.canvasContext.fillRect(0, 0, recordVideoWidth, recordVideoHeight)
      }

      let videoDoms = []
      if (recordConfig?.recordType === 'video') {
        if (this.adapterRef.localStream?._play.video.dom) {
          videoDoms.push(this.adapterRef.localStream._play.video.dom)
        } else {
          videoDoms.push(document.createElement('video'))
        }
        if (this.adapterRef.localStream?._play.screen.dom) {
          videoDoms.push(this.adapterRef.localStream?._play.screen.dom)
        }

        if (recorder === 'all' && this.adapterRef.remoteStreamMap) {
          for (var uid in this.adapterRef.remoteStreamMap) {
            const remoteStream = this.adapterRef.remoteStreamMap[uid]
            if (remoteStream._play.video.dom) {
              videoDoms.push(remoteStream._play.video.dom)
            }
            if (remoteStream._play.screen.dom) {
              videoDoms.push(remoteStream._play.screen.dom)
            }
          }
        }
      }

      if (videoDoms.length > 9) {
        videoDoms = videoDoms.filter((video) => {
          return video.readyState === 4
        })
      }
      switch (videoDoms.length) {
        case 0:
          break
        case 1:
          this.drawSingleVideo(videoDoms[0], 0, 0, recordVideoWidth, recordVideoHeight)
          break
        case 2:
          this.drawSingleVideo(videoDoms[0], 0, 0, helfWidth, recordVideoHeight)
          this.drawSingleVideo(videoDoms[1], helfWidth, 0, helfWidth, recordVideoHeight)
          break
        case 3:
        case 4:
          this.drawSingleVideo(videoDoms[0], 0, 0, helfWidth, helfHeigth)
          this.drawSingleVideo(videoDoms[1], helfWidth, 0, helfWidth, helfHeigth)
          this.drawSingleVideo(videoDoms[2], 0, helfHeigth, helfWidth, helfHeigth)
          this.drawSingleVideo(videoDoms[3], helfWidth, helfHeigth, helfWidth, helfHeigth)
          break
        default:
          this.drawSingleVideo(videoDoms[0], 0, 0, oneThirdWidht, oneThirdHeight)
          this.drawSingleVideo(videoDoms[1], oneThirdWidht, 0, oneThirdWidht, oneThirdHeight)
          this.drawSingleVideo(videoDoms[2], oneThirdWidht * 2, 0, oneThirdWidht, oneThirdHeight)
          this.drawSingleVideo(videoDoms[3], 0, oneThirdHeight, oneThirdWidht, oneThirdHeight)
          this.drawSingleVideo(
            videoDoms[4],
            oneThirdWidht,
            oneThirdHeight,
            oneThirdWidht,
            oneThirdHeight
          )
          this.drawSingleVideo(
            videoDoms[5],
            oneThirdWidht * 2,
            oneThirdHeight,
            oneThirdWidht,
            oneThirdHeight
          )
          this.drawSingleVideo(videoDoms[6], 0, oneThirdHeight * 2, oneThirdWidht, oneThirdHeight)
          this.drawSingleVideo(
            videoDoms[7],
            oneThirdWidht,
            oneThirdHeight * 2,
            oneThirdWidht,
            oneThirdHeight
          )
          this.drawSingleVideo(
            videoDoms[8],
            oneThirdWidht * 2,
            oneThirdHeight * 2,
            oneThirdWidht,
            oneThirdHeight
          )
          break
      }
    }, Math.floor(1000 / recordVideoFrame))
    //@ts-ignore
    //captureStream(recordVideoFrame) 该方式在 drawImage 模式下设置帧率无效（如果未设置frameRate，则每次画布更改时都会捕获一个新帧，所以通过定时器采集来实现帧率设置的问题）【https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/captureStream】
    return this.canvas.captureStream()
  }

  drawSingleVideo(
    videoDom: HTMLVideoElement | undefined,
    containerLeft: number,
    containerTop: number,
    containerWidth: number,
    containerHeight: number
  ) {
    if (!videoDom) {
      return
    }
    // 不要拉伸，留出黑边。
    const zoomRatio = Math.min(
      containerWidth / videoDom.videoWidth,
      containerHeight / videoDom.videoHeight
    )
    let targetWidth = videoDom.videoWidth * zoomRatio
    let targetHeight = videoDom.videoHeight * zoomRatio
    let targetLeft = containerLeft + (containerWidth - targetWidth) / 2
    let targetTop = containerTop + (containerHeight - targetHeight) / 2
    this.canvasContext?.drawImage(videoDom, targetLeft, targetTop, targetWidth, targetHeight)
  }

  async stopFormatVideo() {
    this.logger.log('stopFormatAudio() [结束混频]')
    if (this.canvasTimer) {
      clearInterval(this.canvasTimer)
      this.canvasTimer = null
    }
    this.canvasContext = this.canvas = null
  }

  destroy() {
    this.logger.log('destroy()')
    this.stopFormatAudio()
    this.stopFormatVideo()
  }
}

export { FormatMedia }
