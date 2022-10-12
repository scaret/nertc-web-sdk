import { EventEmitter } from 'eventemitter3'

import { LocalStream } from '../api/localStream'
import { RemoteStream } from '../api/remoteStream'
import {
  GetCurrentFrameDataOptions,
  ILogger,
  PlayOptions,
  RenderMode,
  SnapshotBase64Options,
  SnapshotOptions
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { RTCCanvas } from '../util/rtcUtil/rtcCanvas'
import { getDomInfo } from '../util/rtcUtil/utils'
import { getParameters } from './parameters'
import {
  CanvasWatermarkControl,
  createCanvasWatermarkControl
} from './watermark/CanvasWatermarkControl'
import {
  createEncoderWatermarkControl,
  EncoderWatermarkControl
} from './watermark/EncoderWatermarkControl'
import { playMedia } from '../util/playMedia'
import { get2DContext } from './browser-api/getCanvasContext'

class Play extends EventEmitter {
  private volume: number | null
  private audioSlaveVolume: number | null
  private index: number
  private audioSinkId: string
  private videoRenderMode: RenderMode
  //实际就是Stream.renderMode.screen
  private screenRenderMode: RenderMode
  private videoSize: { width: number; height: number } = { width: 0, height: 0 }
  private screenSize: { width: number; height: number } = { width: 0, height: 0 }
  public videoDom: HTMLVideoElement | null
  public screenDom: HTMLVideoElement | null
  public audioDom: HTMLAudioElement | null
  public audioSlaveDom: HTMLAudioElement | null
  public videoContainerDom: HTMLElement | null
  public screenContainerDom: HTMLElement | null
  public videoView: HTMLElement | null
  public screenView: HTMLElement | null

  public watermark: {
    video: {
      canvasControl: CanvasWatermarkControl
      encoderControl: EncoderWatermarkControl
    }
    screen: {
      canvasControl: CanvasWatermarkControl
      encoderControl: EncoderWatermarkControl
    }
  }
  public mask: {
    enabled: boolean
  } = {
    enabled: false
  }

  private stream: LocalStream | RemoteStream
  private logger: ILogger
  private frameData: {
    // 有canvas而无context，表示获取Context失败，之后不再尝试获取Context
    canvas: HTMLCanvasElement | null
    context: CanvasRenderingContext2D | null
  } = {
    canvas: null,
    context: null
  }
  constructor(options: PlayOptions) {
    super()
    this._reset()
    // 设置对象引用
    this.stream = options.stream
    this.logger = options.stream.logger.getChild(() => {
      let tag = 'player'
      if (this.audioDom?.paused) {
        tag += ' audio_paused'
      }

      if (this.audioSlaveDom?.paused) {
        tag += ' audioSlave_paused'
      }

      if (this.stream._play !== this) {
        tag += ' DETACHED'
      }
      return tag
    })
    this.videoDom = null
    this.screenDom = null
    this.audioDom = null
    this.audioSlaveDom = null
    this.videoContainerDom = null
    this.screenContainerDom = null
    this.videoView = null
    this.screenView = null
    this.volume = null
    this.audioSlaveVolume = null
    this.index = 0
    this.videoRenderMode = {
      width: 0,
      height: 0,
      cut: false
    }
    this.screenRenderMode = {
      width: 0,
      height: 0,
      cut: false
    }
    this.audioSinkId = ''
    this.watermark = {
      video: {
        canvasControl: createCanvasWatermarkControl(this.logger),
        encoderControl: createEncoderWatermarkControl(this.logger)
      },
      screen: {
        canvasControl: createCanvasWatermarkControl(this.logger),
        encoderControl: createEncoderWatermarkControl(this.logger)
      }
    }
  }

  get getVideoDom() {
    return this.videoContainerDom
  }

  _reset() {
    this.videoDom = null
    this.screenDom = null
    this.videoContainerDom = null
    this.screenContainerDom = null
    this.videoView = null
    this.screenView = null
    this.audioDom = null
    this.audioSlaveDom = null
    this.volume = null
    this.index = 0
    this.videoRenderMode = {
      // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0,
      cut: false
    }
    this.screenRenderMode = {
      // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0,
      cut: false
    }
  }

  _initNodeVideo(end: string) {
    this._initVideoContainer(end)
    this._initVideo()
    if (this.videoDom) {
      if (this.videoContainerDom) {
        if (this.videoContainerDom == this.videoDom.parentNode) {
          this.logger.log('[Play] initVideoNode: 节点已挂载，请勿重复挂载')
          return
        } else {
          this.videoContainerDom.appendChild(this.videoDom)
          this.logger.log('[Play] initVideoNode')
        }
      }
    }
  }

  _initNodeScreen() {
    this._initScreenContainer()
    this._initScreen()
    if (this.screenDom) {
      if (this.screenContainerDom) {
        if (this.screenContainerDom == this.screenDom.parentNode) {
          this.logger.log('[Play] initscreenNode: 节点已挂载，请勿重复挂载')
          return
        } else {
          this.screenContainerDom.appendChild(this.screenDom)
          this.logger.log(
            '[Play] initscreenNode, screenContainerDom: ',
            this.screenContainerDom.outerHTML
          )
        }
      }
    }
  }

  _initVideoContainer(end: string) {
    if (!this.videoView) return
    if (!this.videoContainerDom) {
      this.videoContainerDom = document.createElement('div')
      if (end === 'local') {
        this.videoContainerDom.className = 'nertc-video-container-local'
      } else {
        this.videoContainerDom.className = 'nertc-video-container-remote'
      }
      // 样式
      this.videoContainerDom.style.overflow = 'hidden'
      this.videoContainerDom.style.position = 'relative'
      this.videoContainerDom.style.width = `${this.videoView.clientWidth}px`
      this.videoContainerDom.style.height = `${this.videoView.clientHeight}px`
      this.videoContainerDom.style.display = 'inline-block'
    }
  }

  _initScreenContainer() {
    if (!this.screenContainerDom) {
      this.screenContainerDom = document.createElement('div')
      this.screenContainerDom.className = 'nertc-screen-container'
      // 样式
      this.screenContainerDom.style.overflow = 'hidden'
      this.screenContainerDom.style.position = 'relative'
      this.screenContainerDom.style.width = `${this.screenRenderMode.width}px`
      this.screenContainerDom.style.height = `${this.screenRenderMode.height}px`
      this.screenContainerDom.style.display = 'inline-block'
    }
  }

  _initVideo() {
    if (!this.videoDom) {
      this.videoDom = document.createElement('video')
      // 样式
      this.videoDom.style.position = 'absolute'
      this.videoDom.style.left = '50%'
      this.videoDom.style.top = '50%'
      this.videoDom.style.transform = 'translate(-50%,-50%)'
      //this.videoDom.style.objectFit = 'cover'
      // 设置属性
      this.videoDom.setAttribute('x-webkit-airplay', 'x-webkit-airplay')
      this.videoDom.setAttribute('playsinline', 'playsinline')
      this.videoDom.setAttribute('webkit-playsinline', 'webkit-playsinline')
      this.videoDom.preload = 'auto'
      this.videoDom.dataset['uid'] = '' + this.stream.getId()
      this.videoDom.autoplay = true
      this.videoDom.muted = true
      this.videoSize.width = 0
      this.videoSize.height = 0
      this.videoDom.addEventListener('resize', (evt) => {
        // 在resize的时候重新setVideoRender，需注意：
        // 1. 回调后可能已经stop/play过了，所以需要比较事件的target是不是videoDom
        // 2. 即使无宽高变化也可能回调多次，所以需要记录上一次的宽高
        if (!this.videoDom || this.videoDom !== evt.target) {
          return
        }
        const width = this.videoDom.videoWidth
        const height = this.videoDom.videoHeight

        if (width !== this.videoSize.width || height !== this.videoSize.height) {
          this.logger.log(
            `[Play] 主流视频分辨率发生变化：${this.videoSize.width}x${
              this.videoSize.height
            } => ${width}x${height}。当前父节点：${getDomInfo(this.videoView)}`
          )
          if (
            (width > height && this.videoSize.width > this.videoSize.height) ||
            (width < height && this.videoSize.width < this.videoSize.height)
          ) {
            // 未改变视频方向
          } else {
            this.setVideoRender()
          }
          this.videoSize.width = width
          this.videoSize.height = height
        }
      })
      if (getParameters()['controlOnPaused']) {
        this.videoDom.addEventListener('pause', this.showControlIfVideoPause.bind(this))
        this.videoDom.addEventListener('play', this.handleVideoScreenPlay.bind(this))
        this.videoDom.addEventListener('click', this.handleVideoScreenClick.bind(this))
      }
    }
  }

  showControlIfVideoPause() {
    if (this.videoDom && this.videoDom.paused) {
      this.logger.log('[Play] 可能遇到了播放问题', 'video')
    }
    if (this.screenDom && this.screenDom.paused) {
      this.logger.log('[Play] 可能遇到了播放问题', 'screen')
    }
  }

  handleVideoScreenClick() {
    if (this.audioDom && this.audioDom.paused) {
      this.logger.log('[Play] 侦测到视频点击，尝试恢复音频播放')
      this.audioDom.play()
    }

    if (this.audioSlaveDom && this.audioSlaveDom.paused) {
      this.logger.log('[Play] 侦测到视频点击，尝试恢复音频辅流播放')
      this.audioSlaveDom.play()
    }
  }

  handleVideoScreenPlay() {
    if (this.videoDom && !this.videoDom.paused) {
      this.logger.log('[Play] 侦测到视频播放')
    }
    if (this.screenDom && !this.screenDom.paused) {
      this.logger.log('[Play] 侦测到辅流播放')
    }
  }

  _initScreen() {
    if (!this.screenDom) {
      this.screenDom = document.createElement('video')
      // 样式
      this.screenDom.style.position = 'absolute'
      this.screenDom.style.left = '50%'
      this.screenDom.style.top = '50%'
      this.screenDom.style.transform = 'translate(-50%,-50%)'

      // 设置属性
      this.screenDom.setAttribute('x-webkit-airplay', 'x-webkit-airplay')
      this.screenDom.setAttribute('playsinline', 'playsinline')
      this.screenDom.setAttribute('webkit-playsinline', 'webkit-playsinline')
      this.screenDom.preload = 'auto'
      this.screenDom.dataset['uid'] = '' + this.stream.getId()
      this.screenDom.autoplay = true
      this.screenDom.muted = true
      this.screenSize.width = 0
      this.screenSize.height = 0
      this.screenDom.addEventListener('resize', (evt) => {
        // 在resize的时候重新setScreenRender，需注意：
        // 1. 回调后可能已经stop/play过了，所以需要比较事件的target是不是screenDom
        // 2. 即使无宽高变化也可能回调多次，所以需要记录上一次的宽高
        if (!this.screenDom || this.screenDom !== evt.target) {
          return
        }
        const width = this.screenDom.videoWidth
        const height = this.screenDom.videoHeight

        if (width !== this.screenSize.width || height !== this.screenSize.height) {
          this.logger.log(
            `[Play] 辅流视频分辨率发生变化：${this.screenSize.width}x${this.screenSize.height} => ${width}x${height}`
          )
          if (
            (width > height && this.screenSize.width > this.screenSize.height) ||
            (width < height && this.screenSize.width < this.screenSize.height)
          ) {
            // 未改变视频方向
          } else {
            this.setScreenRender()
          }
          this.screenSize.width = width
          this.screenSize.height = height
        }
      })
      if (getParameters()['controlOnPaused']) {
        this.screenDom.addEventListener('pause', this.showControlIfVideoPause.bind(this))
        this.screenDom.addEventListener('play', this.handleVideoScreenPlay.bind(this))
        this.screenDom.addEventListener('click', this.handleVideoScreenClick.bind(this))
      }
    }
  }

  _removeUselessDom() {
    if (!this.videoView) return
    const length = this.videoView.children.length
    for (var i = length - 1; i >= 0; i--) {
      if (this.videoView.children[i].outerHTML.indexOf('data-uid=')) {
        this.logger.log('[Play] 删除多余的节点: ', this.videoView.children[i].outerHTML)
        this.videoView.removeChild(this.videoView.children[i])
      }
    }
  }

  _mountVideoToDom() {
    if (this.videoContainerDom) {
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.logger.log('[Play] mountVideoToDom: 节点已挂载，请勿重复挂载')
        return
      }
      /*if (this.videoView && this.videoView.children) {
        this.logger.log('出现多余的dom节点')
        this._removeUselessDom()
      }*/
      this.logger.log('[Play] mountVideoToDom')
      if (this.videoView) {
        this.videoView.appendChild(this.videoContainerDom)
        this.logger.log(`[Play] 视频主流dom节点挂载成功。父节点：${getDomInfo(this.videoView)}`)
        if (this.watermark.video.canvasControl.watermarks.length) {
          this.watermark.video.canvasControl.start(this.videoContainerDom)
        } else {
          this.watermark.video.canvasControl.div = this.videoContainerDom
        }
      }
    }
  }

  _mountScreenToDom() {
    if (this.screenContainerDom) {
      if (this.screenView == this.screenContainerDom.parentNode) {
        this.logger.log('[Play] mountScreenToDom: 节点已挂载，请勿重复挂载')
        return
      }
      this.logger.log(
        '[Play] mountScreenToDom: screenContainerDom: ',
        this.screenContainerDom.outerHTML
      )
      if (this.screenView) {
        this.screenView.appendChild(this.screenContainerDom)
        this.logger.log(`[Play] 视频辅流dom节点挂载成功。父节点：${getDomInfo(this.screenView)}`)
        if (this.watermark.screen.canvasControl.watermarks.length) {
          this.watermark.screen.canvasControl.start(this.screenContainerDom)
        } else {
          this.watermark.screen.canvasControl.div = this.screenContainerDom
        }
      }
    }
  }

  async resume() {
    const mediaIsPaused = {
      audio: this.audioDom && this.audioDom.paused,
      audioSlave: this.audioSlaveDom && this.audioSlaveDom.paused,
      video: this.videoDom && this.videoDom.paused,
      screen: this.screenDom && this.screenDom.paused
    }
    const promises = []
    if (this.audioDom && this.audioDom.paused) {
      promises.push(this.audioDom.play())
    }
    if (this.audioSlaveDom && this.audioSlaveDom.paused) {
      promises.push(this.audioSlaveDom.play())
    }
    if (this.videoDom && this.videoDom.paused) {
      promises.push(this.videoDom.play())
    }
    if (this.screenDom && this.screenDom.paused) {
      promises.push(this.screenDom.play())
    }
    try {
      // 为什么这么写：因为同时触发play
      await Promise.all(promises)
    } catch (error: any) {
      this.logger.error(`[Resume] 恢复播放 出现问题:`, error.name, error.message)
      if (error.name === 'notAllowedError' || error.name === 'NotAllowedError') {
        // 兼容临时版本客户
        let enMessage = `resume: ${error.message}`,
          zhMessage = `resume: 浏览器自动播放受限: ${error.name}`,
          enAdvice = 'Please refer to the suggested link for processing --> ',
          zhAdvice = '请参考提示的链接进行处理 --> '
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082',
          message,
          advice
        })
      }
    }
    if (mediaIsPaused.audio) {
      this.logger.log(
        `[Resume] 恢复播放音频${this.audioDom && !this.audioDom.paused ? '成功' : '失败'}`
      )
    }
    if (mediaIsPaused.audioSlave) {
      this.logger.log(
        `[Resume] 恢复播放音辅流${
          this.audioSlaveDom && !this.audioSlaveDom.paused ? '成功' : '失败'
        }`
      )
    }
    if (mediaIsPaused.video) {
      this.logger.log(
        `[Resume] 恢复播放视频${this.videoDom && !this.videoDom.paused ? '成功' : '失败'}`
      )
    }
    if (mediaIsPaused.screen) {
      this.logger.log(
        `[Resume] 恢复播放辅流${this.screenDom && !this.screenDom.paused ? '成功' : '失败'}`
      )
    }
  }

  async playAudioStream(stream: MediaStream, ismuted?: boolean) {
    if (!stream) return
    if (!this.audioDom) {
      this.audioDom = document.createElement('audio')
    }
    if (!ismuted) {
      this.audioDom.muted = false
    } else {
      this.audioDom.muted = true
    }

    this.audioDom.srcObject = stream
    if (this.audioSinkId && stream.getAudioTracks().length) {
      try {
        this.logger.log(`[Play] 音频尝试使用输出设备`, this.audioSinkId)
        await (this.audioDom as any).setSinkId(this.audioSinkId)
        this.logger.log(`[Play] 音频使用输出设备成功`, this.audioSinkId)
      } catch (e: any) {
        this.logger.error('[Play] 音频输出设备切换失败', e.name, e.message, e)
      }
    }
    if (!stream.active) return
    const isPlaying = await this.isPlayAudioStream()
    if (isPlaying) {
      this.logger.log(`[Play] 音频播放正常`)
    }
    try {
      this.audioDom.muted = false
      await playMedia(this.audioDom, getParameters().playMediaTimeout)
      this.logger.log(
        `[Play] 播放音频完成，当前播放状态:`,
        this.audioDom && this.audioDom.played && this.audioDom.played.length
      )
      this.stream.client.updateRecordingAudioStream()
    } catch (error: any) {
      this.logger.warn('[Play] 播放音频出现问题: ', error.name, error.message, error)

      if (error.name === 'notAllowedError' || error.name === 'NotAllowedError') {
        // 兼容临时版本客户
        let enMessage = `playAudioStream: ${error.message}`,
          zhMessage = `playAudioStream: 浏览器自动播放受限: ${error.name}`,
          enAdvice = 'Please refer to the suggested link for processing --> ',
          zhAdvice = '请参考提示的链接进行处理 --> '
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082',
          message,
          advice
        })
      }
    }
  }

  async playAudioSlaveStream(stream: MediaStream, ismuted?: boolean) {
    if (!stream) return
    if (!this.audioSlaveDom) {
      this.audioSlaveDom = document.createElement('audio')
    }
    if (!ismuted) {
      this.audioSlaveDom.muted = false
    } else {
      this.audioSlaveDom.muted = true
    }

    this.audioSlaveDom.srcObject = stream
    if (this.audioSinkId && stream.getAudioTracks().length) {
      try {
        this.logger.log(`[Play] 音频辅流尝试使用输出设备`, this.audioSinkId)
        await (this.audioDom as any).setSinkId(this.audioSinkId)
        this.logger.log(`[Play] 音频辅流使用输出设备成功`, this.audioSinkId)
      } catch (e: any) {
        this.logger.error('[Play] 音频辅流输出设备切换失败', e.name, e.message, e)
      }
    }
    if (!stream.active) return
    const isPlaying = await this.isPlayAudioSlaveStream()
    if (isPlaying) {
      this.logger.log(`[Play] 音频辅流播放正常`)
    }
    try {
      this.audioSlaveDom.muted = false
      await playMedia(this.audioSlaveDom, getParameters().playMediaTimeout)
      this.logger.log(
        `[Play] 播放音频完成，当前播放状态:`,
        this.audioSlaveDom && this.audioSlaveDom.played && this.audioSlaveDom.played.length
      )
    } catch (error: any) {
      this.logger.warn('[Play] 播放音频出现问题: ', error.name, error.message, error)

      if (error.name === 'notAllowedError' || error.name === 'NotAllowedError') {
        // 兼容临时版本客户
        let enMessage = `playAudioSlaveStream: ${error.message}`,
          zhMessage = `playAudioSlaveStream: 浏览器自动播放受限: ${error.name}`,
          enAdvice = 'Please refer to the suggested link for processing --> ',
          zhAdvice = '请参考提示的链接进行处理 --> '
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082',
          message,
          advice
        })
      }
    }
  }

  async stopPlayAudioStream() {
    if (this.audioDom) {
      this.audioDom.muted = true
      this.audioDom.srcObject = null
    }
  }

  async stopPlayAudioSlaveStream() {
    if (this.audioSlaveDom) {
      this.audioSlaveDom.muted = true
      this.audioSlaveDom.srcObject = null
    }
  }

  setPlayVolume(volume: number) {
    this.volume = volume
    if (!this.audioDom) return
    this.audioDom.volume = volume / 255
  }

  setPlayAudioSlaveVolume(volume: number) {
    this.audioSlaveVolume = volume
    if (!this.audioSlaveDom) return
    this.audioSlaveDom.volume = volume / 255
  }

  async isPlayAudioStream(musthasDom = true) {
    const getTimeRanges = async (time: number) => {
      if (time) {
        await new Promise((resolve) => {
          setTimeout(resolve, time)
        })
      }
      if (!this.audioDom) {
        return 0
      } else {
        let length = this.audioDom.played.length
        if (length >= 1) {
          return this.audioDom.played.end(length - 1)
        } else {
          return 0
        }
      }
    }
    if (!this.audioDom?.srcObject || this.audioDom.paused) {
      return false
    }
    const firstTimeRanges = await getTimeRanges(0)
    if (!firstTimeRanges) {
      return false
    }
    //this.logger.log('firstTimeRanges: ', firstTimeRanges)
    const secondTimeRanges = await getTimeRanges(500)
    if (!secondTimeRanges) {
      return false
    }
    //this.logger.log('secondTimeRanges: ', secondTimeRanges)
    return secondTimeRanges > firstTimeRanges
  }

  async isPlayAudioSlaveStream(musthasDom = true) {
    const getTimeRanges = async (time: number) => {
      if (time) {
        await new Promise((resolve) => {
          setTimeout(resolve, time)
        })
      }
      if (!this.audioSlaveDom) {
        return 0
      } else {
        let length = this.audioSlaveDom.played.length
        if (length >= 1) {
          return this.audioSlaveDom.played.end(length - 1)
        } else {
          return 0
        }
      }
    }
    if (!this.audioSlaveDom || !this.audioSlaveDom.srcObject) {
      if (musthasDom) {
        return false
      } else {
        return true
      }
    }
    const firstTimeRanges = await getTimeRanges(0)
    if (!firstTimeRanges) {
      return false
    }
    //this.logger.log('firstTimeRanges: ', firstTimeRanges)
    const secondTimeRanges = await getTimeRanges(500)
    if (!secondTimeRanges) {
      return false
    }
    //this.logger.log('secondTimeRanges: ', secondTimeRanges)
    return secondTimeRanges > firstTimeRanges
  }

  async isPlayVideoStream() {
    const getVideoFrames = async (time: number) => {
      if (time) {
        await new Promise((resolve) => {
          setTimeout(resolve, time)
        })
      }
      const playbackQuality = this.videoDom?.getVideoPlaybackQuality()
      if (playbackQuality) {
        return playbackQuality.totalVideoFrames
      } else {
        return 0
      }
    }
    if (!this.videoDom?.srcObject || this.videoDom.paused) {
      return false
    }
    const firstTotalVideoFrames = await getVideoFrames(0)
    if (!firstTotalVideoFrames) {
      return false
    }
    const interval = 50
    for (let i = 0; i < 3000; i += interval) {
      const secondTotalVideoFrames = await getVideoFrames(interval)
      if (secondTotalVideoFrames > firstTotalVideoFrames) {
        return true
      }
    }
    return false
  }

  async isPlayScreenStream() {
    const getScreenFrames = async (time: number) => {
      if (time) {
        await new Promise((resolve) => {
          setTimeout(resolve, time)
        })
      }
      const playbackQuality = this.screenDom?.getVideoPlaybackQuality()
      if (playbackQuality) {
        return playbackQuality.totalVideoFrames
      } else {
        return 0
      }
    }
    if (!this.screenDom?.srcObject || this.screenDom.paused) {
      return false
    }
    const firstTotalVideoFrames = await getScreenFrames(0)
    if (!firstTotalVideoFrames) {
      return false
    }
    const interval = 50
    for (let i = 0; i < 3000; i += interval) {
      const secondTotalVideoFrames = await getScreenFrames(interval)
      if (secondTotalVideoFrames > firstTotalVideoFrames) {
        return true
      }
    }
    return false
  }

  async isPlayStreamError(mediaType?: string) {
    let dom = null
    switch (mediaType) {
      case 'audio':
        return this.isPlayAudioStream()
      case 'video':
        return this.isPlayVideoStream()
      case 'screen':
        return this.isPlayScreenStream()
      default:
        return true
    }
  }

  async playVideoStream(stream: MediaStream, view: HTMLElement, end: string) {
    if (!stream || !view) return
    if (this.videoDom?.srcObject === stream) {
      this.logger.log(`[Play] playVideoStream：跳过重复的播放请求`)
      return
    }
    this.videoView = view
    this._initNodeVideo(end)
    this._mountVideoToDom()
    if (!this.videoDom) {
      this.logger.error(`[Play] 没有视频源`)
      return
    }
    if (this.mask.enabled) {
      this.enableMask()
    }
    try {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        this.logger.log(
          `[Play] 开始加载主流播放视频源：视频参数 "${videoTrack.label}",enabled ${
            videoTrack.enabled
          } , ${JSON.stringify(videoTrack.getSettings())}`
        )
      } else {
        this.logger.error(`[Play] 加载主流播放视频源失败：没有视频源`)
      }
      this.videoDom.srcObject = stream
      await playMedia(this.videoDom, getParameters().playMediaTimeout)
      this.logger.log(
        `[Play] 成功加载主流播放视频源：当前视频实际分辨率${this.videoDom?.videoWidth}x${this.videoDom?.videoHeight}，显示宽高${this.videoDom?.offsetWidth}x${this.videoDom?.offsetHeight}`
      )
      if (this.videoDom?.paused && getParameters()['controlOnPaused']) {
        //给微信的Workaround。微信会play()执行成功但不播放
        this.showControlIfVideoPause()
      }
    } catch (error: any) {
      this.logger.warn('[Play] 播放视频出现问题:', error.name, error.message, error)

      if (error.name === 'notAllowedError' || error.name === 'NotAllowedError') {
        // 兼容临时版本客户
        let enMessage = `playVideoStream: ${error.message}`,
          zhMessage = `playVideoStream: 浏览器自动播放受限: ${error.name}`,
          enAdvice = 'Please refer to the suggested link for processing --> ',
          zhAdvice = '请参考提示的链接进行处理 --> '
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082',
          message,
          advice
        })
      }
    }
  }

  async playScreenStream(stream: MediaStream, view: HTMLElement) {
    if (!stream || !view) return
    if (this.screenDom?.srcObject === stream) {
      this.logger.log(`[Play] playScreenStream：跳过重复的播放请求`)
      return
    }
    this.logger.log(`[Play] 播放辅流视频, id: ${stream.id}, active state: ${stream.active}`)
    this.screenView = view
    this._initNodeScreen()
    this._mountScreenToDom()
    if (!this.screenDom) {
      this.logger.error(`[Play] 辅流没有视频源`)
      return
    }
    if (this.mask.enabled) {
      this.enableMask()
    }
    try {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        this.logger.log(
          `[Play] 开始加载辅流播放视频源：视频参数 "${videoTrack.label}",enabled ${
            videoTrack.enabled
          } , ${JSON.stringify(videoTrack.getSettings())}`
        )
      } else {
        this.logger.error(`[Play] 加载主流播放视频源失败：没有视频源`)
      }
      this.screenDom.srcObject = stream
      await playMedia(this.screenDom, getParameters().playMediaTimeout)
      this.logger.log(
        `[Play] 成功加载辅流播放视频源：当前视频实际分辨率${this.screenDom?.videoWidth}x${this.screenDom?.videoHeight}，显示宽高${this.screenDom?.offsetWidth}x${this.screenDom?.offsetHeight}`
      )
      if (this.screenDom?.paused && getParameters()['controlOnPaused']) {
        //给微信的Workaround。微信会play()执行成功但不播放
        this.showControlIfVideoPause()
      }
    } catch (error: any) {
      this.logger.warn('[Play] 播放辅流出现问题:', error.name, error.message, error)
      if (error.name === 'notAllowedError' || error.name === 'NotAllowedError') {
        // 兼容临时版本客户
        let enMessage = `playScreenStream: ${error.message}`,
          zhMessage = `playScreenStream: 浏览器自动播放受限: ${error.name}`,
          enAdvice = 'Please refer to the suggested link for processing --> ',
          zhAdvice = '请参考提示的链接进行处理 --> '
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082',
          message,
          advice
        })
      }
    }
  }

  async stopPlayVideoStream() {
    this.logger.log(`stopPlayVideoStream 停止播发视频`)
    if (this.videoContainerDom && this.videoDom) {
      if (this.videoContainerDom == this.videoDom.parentNode) {
        this.logger.log(`清除 videoDom`)
        this.videoContainerDom.removeChild(this.videoDom)
      } else if (this.videoContainerDom.lastChild) {
        this.logger.log(`videoContainerDom 删除子节点`)
        this.videoContainerDom.removeChild(this.videoContainerDom.lastChild)
      }
      try {
        this.videoDom.remove()
        this.videoDom.srcObject = null
        this.videoDom = null
      } catch (e) {
        this.logger.log('stopPlayVideoStream e: ', e)
      }
    }
    if (this.videoView && this.videoContainerDom) {
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.logger.log('清除 videoContainerDom')
        this.videoView.removeChild(this.videoContainerDom)
      } else if (this.videoView.lastChild) {
        this.logger.log('videoView 删除子节点')
        this.videoView.removeChild(this.videoView.lastChild)
        this.videoView.innerHTML = ''
      }
      this.videoContainerDom = null
      this.videoView = null
    }
  }

  async stopPlayScreenStream() {
    this.logger.log(`stopPlayScreenStream: 停止播发屏幕共享`)
    if (this.screenContainerDom && this.screenDom) {
      this.screenContainerDom.removeChild(this.screenDom)
      try {
        this.screenDom.remove()
        this.screenDom.srcObject = null
        this.screenDom = null
      } catch (e: any) {
        this.logger.log(`stopPlayScreenStream: 停止播发屏幕共享`, e.name, e.message)
      }
    }
    if (this.screenView && this.screenContainerDom) {
      this.screenView.removeChild(this.screenContainerDom)
      this.screenContainerDom = null
      this.screenView = null
    }
  }

  /**
   * @param options 可以不填，用上一次的设置来resize
   */
  setVideoRender(options?: RenderMode) {
    if (!this.videoDom) return
    if (options) {
      this.logger.log(`[Play] setVideoRender() options: ${JSON.stringify(options)}`)
      this.videoRenderMode = Object.assign({}, options)
    } else {
      options = this.videoRenderMode
      this.logger.log(
        `[Play] setVideoRender() existing videoRenderMode: ${JSON.stringify(options)}`
      )
    }
    // 设置外部容器
    if (this.videoContainerDom) {
      this.videoContainerDom.style.width = `${options.width}px`
      this.videoContainerDom.style.height = `${options.height}px`
    } else {
      this.logger.warn('[Play] 未找到videoContainerDom')
    }
    // 是否裁剪
    if (!options.cut) {
      this.videoDom.style.height = '100%'
      this.videoDom.style.width = '100%'
      return
    }
    // 计算宽高比后设置video宽高
    let videoDomRatio = this.videoDom.videoWidth / this.videoDom.videoHeight // 计算视频原始宽高得出的ratio
    let optionsRatio = options.width / options.height
    if (videoDomRatio > optionsRatio) {
      // 宽度填满但是高度填不满 => 填充高度，宽度自适应
      this.videoDom.style.width = 'auto'
      this.videoDom.style.height = '100%'
    } else {
      // 宽度不够但是高度填满 => 填充宽度，高度自适应
      this.videoDom.style.width = '100%'
      this.videoDom.style.height = 'auto'
    }
  }

  setScreenRender(options?: RenderMode) {
    if (!this.screenDom) return
    if (options) {
      this.logger.log('[Play] setScreenRender() options: ', JSON.stringify(options, null, ' '))
      this.screenRenderMode = Object.assign({}, options)
    } else {
      options = this.screenRenderMode
      this.logger.log(
        `[Play] setScreenRender() existing screenRenderMode: ${JSON.stringify(options)}`
      )
    }
    this.screenRenderMode = options
    // 设置外部容器
    if (this.screenContainerDom) {
      this.screenContainerDom.style.width = `${options.width}px`
      this.screenContainerDom.style.height = `${options.height}px`
    } else {
      this.logger.warn('[Play] 未找到screenContainerDom')
    }
    // 是否裁剪
    if (!options.cut) {
      this.screenDom.style.height = '100%'
      this.screenDom.style.width = '100%'
      return
    }
    // 计算宽高比后设置screen宽高
    let screenDomRatio = this.screenDom.videoWidth / this.screenDom.videoHeight // 计算视频原始宽高得出的ratio
    let optionsRatio = options.width / options.height
    if (screenDomRatio > optionsRatio) {
      // 宽度填满但是高度填不满 => 填充高度，宽度自适应
      this.screenDom.style.width = 'auto'
      this.screenDom.style.height = '100%'
    } else {
      // 宽度不够但是高度填满 => 填充宽度，高度自适应
      this.screenDom.style.width = '100%'
      this.screenDom.style.height = 'auto'
    }
  }

  async setAudioOutput(audioSinkId: string) {
    this.audioSinkId = audioSinkId
    if (
      this.audioDom?.srcObject &&
      (this.audioDom?.srcObject as MediaStream).getAudioTracks().length
    ) {
      await (this.audioDom as any).setSinkId(audioSinkId)
      this.logger.log('[Play] setAudioOutput() 设置通话音频输出设备成功')
    }

    if (
      this.audioSlaveDom?.srcObject &&
      (this.audioSlaveDom?.srcObject as MediaStream).getAudioTracks().length
    ) {
      await (this.audioSlaveDom as any).setSinkId(audioSinkId)
      this.logger.log('[Play] setAudioOutput() 设置通话音频辅流输出设备成功')
    }
  }

  /**
   * 视频截图功能
   */
  async takeSnapshot(options: SnapshotOptions, streamId?: string | number) {
    if (this.mask.enabled) {
      this.logger.error(`takeSnapshot: 目前在打码状态`)
      return null
    }
    let snapshotVideo = (!options.mediaType && this.videoDom) || options.mediaType === 'video'
    let snapshotScreen = (!options.mediaType && this.screenDom) || options.mediaType === 'screen'

    let rtcCanvas = new RTCCanvas('canvas')
    let canvas = rtcCanvas._canvas
    let ctx = rtcCanvas._ctx
    if (!ctx) {
      let enMessage = 'takeSnapshot: context of canvas is not found',
        zhMessage = 'takeSnapshot: 未找到 canvas 中的 context',
        enAdvice = 'The latest version of the Chrome browser is recommended',
        zhAdvice = '建议使用最新版的 Chrome 浏览器'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NOT_FOUND_ERROR,
        message,
        advice
      })
    }
    if (!canvas) {
      let enMessage = 'takeSnapshot: canvas is not found',
        zhMessage = 'takeSnapshot: 未找到 canvas',
        enAdvice = 'The latest version of the Chrome browser is recommended',
        zhAdvice = '建议使用最新版的 Chrome 浏览器'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NOT_FOUND_ERROR,
        message,
        advice
      })
    }

    // video
    if (snapshotVideo) {
      const name = options.name || (streamId || this.stream.getId()) + '-' + this.index++
      ctx.fillStyle = '#ffffff'
      if (!this.videoDom) {
        let enMessage = 'takeSnapshot: videoDom is not found',
          zhMessage = 'takeSnapshot: 未找到 videoDom',
          enAdvice = 'Please contact CommsEase technical support',
          zhAdvice = '请联系云信技术支持'
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.NOT_FOUND_ERROR,
          message,
          advice
        })
      }
      ctx.fillRect(0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight)
      rtcCanvas.setSize(this.videoDom.videoWidth, this.videoDom.videoHeight)
      ctx.drawImage(
        this.videoDom,
        0,
        0,
        this.videoDom.videoWidth,
        this.videoDom.videoHeight,
        0,
        0,
        this.videoDom.videoWidth,
        this.videoDom.videoHeight
      )
      const fileUrl = await new Promise((resolve, reject) => {
        canvas!.toBlob((blob) => {
          this.logger.log('takeSnapshot, 获取到截图的blob: ', blob)
          //@ts-ignore
          let url = URL.createObjectURL(blob)
          this.logger.log('截图的url: ', url)
          let a = document.createElement('a')
          document.body.appendChild(a)
          a.style.display = 'none'
          a.href = url
          a.download = name + '.png'
          a.click()
          window.URL.revokeObjectURL(url)
          resolve(name + '.png')
        })
      })

      if (!snapshotScreen) {
        rtcCanvas.destroy()
        return fileUrl
      }
    }
    // screen
    if (snapshotScreen) {
      const name = options.name || (streamId || this.stream.getId()) + '-' + this.index++
      ctx.fillStyle = '#ffffff'
      if (!this.screenDom) {
        let enMessage = 'takeSnapshot: screenDom is not found',
          zhMessage = 'takeSnapshot: 未找到 screenDom',
          enAdvice = 'Please contact CommsEase technical support',
          zhAdvice = '请联系云信技术支持'
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.NOT_FOUND_ERROR,
          message,
          advice
        })
      }
      ctx.fillRect(0, 0, this.screenDom.videoWidth, this.screenDom.videoHeight)
      rtcCanvas.setSize(this.screenDom.videoWidth, this.screenDom.videoHeight)
      ctx.drawImage(
        this.screenDom,
        0,
        0,
        this.screenDom.videoWidth,
        this.screenDom.videoHeight,
        0,
        0,
        this.screenDom.videoWidth,
        this.screenDom.videoHeight
      )
      const fileUrl = await new Promise((resolve, reject) => {
        canvas!.toBlob((blob) => {
          this.logger.log('takeSnapshot, 获取到截图的blob: ', blob)
          //@ts-ignore
          let url = URL.createObjectURL(blob)
          this.logger.log('截图的url: ', url)
          let a = document.createElement('a')
          document.body.appendChild(a)
          a.style.display = 'none'
          a.href = url
          a.download = name + '.png'
          a.click()
          window.URL.revokeObjectURL(url)
          resolve(name + '.png')
        })
      })
      rtcCanvas.destroy()
      return fileUrl
    }
  }

  /**
   * 视频截图生成base64
   */
  takeSnapshotBase64(options: SnapshotBase64Options) {
    if (this.mask.enabled) {
      this.logger.error(`takeSnapshot: 目前在打码状态`)
      return null
    }
    let snapshotVideo = (!options.mediaType && this.videoDom) || options.mediaType === 'video'
    let snapshotScreen = (!options.mediaType && this.screenDom) || options.mediaType === 'screen'
    let rtcCanvas = new RTCCanvas('canvas')
    let canvas = rtcCanvas._canvas
    let ctx = rtcCanvas._ctx
    if (!ctx) {
      let enMessage = 'takeSnapshotBase64: context of canvas is not found',
        zhMessage = 'takeSnapshotBase64: 未找到 canvas 中的 context',
        enAdvice = 'The latest version of the Chrome browser is recommended',
        zhAdvice = '建议使用最新版的 Chrome 浏览器'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NOT_FOUND_ERROR,
        message,
        advice
      })
    }
    if (!canvas) {
      let enMessage = 'takeSnapshotBase64: canvas is not found',
        zhMessage = 'takeSnapshotBase64: 未找到 canvas',
        enAdvice = 'The latest version of the Chrome browser is recommended',
        zhAdvice = '建议使用最新版的 Chrome 浏览器'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NOT_FOUND_ERROR,
        message,
        advice
      })
    }
    // video
    if (snapshotVideo) {
      ctx.fillStyle = '#ffffff'
      if (!this.videoDom) {
        let enMessage = 'takeSnapshotBase64: videoDom is not found',
          zhMessage = 'takeSnapshotBase64: 未找到 videoDom',
          enAdvice = 'Please contact CommsEase technical support',
          zhAdvice = '请联系云信技术支持'
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.NOT_FOUND_ERROR,
          message,
          advice
        })
      }
      ctx.fillRect(0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight)
      rtcCanvas.setSize(this.videoDom.videoWidth, this.videoDom.videoHeight)
      ctx.drawImage(
        this.videoDom,
        0,
        0,
        this.videoDom.videoWidth,
        this.videoDom.videoHeight,
        0,
        0,
        this.videoDom.videoWidth,
        this.videoDom.videoHeight
      )
      const fileUrl = this.getBase64Image(canvas)
      if (!snapshotScreen) {
        rtcCanvas.destroy()
        return fileUrl
      }
    }
    // screen
    if (snapshotScreen) {
      ctx.fillStyle = '#ffffff'
      if (!this.screenDom) {
        let enMessage = 'takeSnapshotBase64: screenDom is not found',
          zhMessage = 'takeSnapshotBase64: 未找到 screenDom',
          enAdvice = 'Please contact CommsEase technical support',
          zhAdvice = '请联系云信技术支持'
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.NOT_FOUND_ERROR,
          message,
          advice
        })
      }
      ctx.fillRect(0, 0, this.screenDom.videoWidth, this.screenDom.videoHeight)
      rtcCanvas.setSize(this.screenDom.videoWidth, this.screenDom.videoHeight)
      ctx.drawImage(
        this.screenDom,
        0,
        0,
        this.screenDom.videoWidth,
        this.screenDom.videoHeight,
        0,
        0,
        this.screenDom.videoWidth,
        this.screenDom.videoHeight
      )
      const fileUrl = this.getBase64Image(canvas)
      rtcCanvas.destroy()
      return fileUrl
    }
  }

  _initFrameDataCanvas(): CanvasRenderingContext2D | null {
    if (!this.frameData.canvas) {
      this.logger.log(`正在初始化 frameData.canvas`)
      this.frameData.canvas = document.createElement('canvas')
      this.frameData.context = get2DContext(this.frameData.canvas, {
        // @ts-ignore
        willReadFrequently: true
      })
    }
    return this.frameData.context
  }

  getCurrentFrameData(options: GetCurrentFrameDataOptions) {
    if (this.mask.enabled) {
      this.logger.error(`getCurrentFrameData: 当前在打码状态`)
      return null
    }
    let videoDom: HTMLVideoElement | null
    if (!options.mediaType || options.mediaType === 'video') {
      videoDom = this.videoDom
    } else {
      videoDom = this.screenDom
    }
    if (!videoDom) {
      this.logger.error('getCurrentFrameData: Playing Video is not found')
      return null
    }
    if (videoDom.paused) {
      this.logger.warn(`getCurrentFrameData: 目前数据源不在播放状态，截图结果可能不是最新。`)
    }
    if (!this.frameData.canvas) {
      this._initFrameDataCanvas()
    }
    const canvas = this.frameData.canvas
    const ctx = this.frameData.context
    if (!ctx) {
      let enMessage = 'getCurrentFrameData: context of canvas is not found',
        zhMessage = 'getCurrentFrameData: 未找到 canvas 中的 context',
        enAdvice = 'The latest version of the Chrome browser is recommended',
        zhAdvice = '建议使用最新版的 Chrome 浏览器'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NOT_FOUND_ERROR,
        message,
        advice
      })
    }
    if (!canvas) {
      let enMessage = 'getCurrentFrameData: canvas is not found',
        zhMessage = 'getCurrentFrameData: 未找到 canvas',
        enAdvice = 'The latest version of the Chrome browser is recommended',
        zhAdvice = '建议使用最新版的 Chrome 浏览器'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NOT_FOUND_ERROR,
        message,
        advice
      })
    }
    const videoWidth = videoDom.videoWidth
    const videoHeight = videoDom.videoHeight
    if (!videoWidth || !videoHeight) {
      return null
    }
    let width
    let height
    if (options.width && options.width > 0) {
      if (options.height && options.height > 0) {
        width = options.width
        height = options.height
      } else {
        width = options.width
        height = Math.floor((options.width / videoWidth) * videoHeight)
      }
    } else {
      if (options.height && options.height > 0) {
        height = options.height
        width = Math.floor((options.height / videoHeight) * videoWidth)
      } else {
        width = videoWidth
        height = videoHeight
      }
    }

    if (canvas.width !== width) {
      canvas.width = width
    }
    if (canvas.height !== height) {
      canvas.height = height
    }
    ctx.drawImage(videoDom, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    return imageData
  }

  getBase64Image(canvas: HTMLCanvasElement) {
    //传入canvas图片
    let dataURL = canvas.toDataURL('image/', 1)
    return dataURL
  }

  enableMask() {
    this.mask.enabled = true
    if (this.videoDom) {
      this.videoDom.style.filter = 'blur(20px)'
    }
    // if (this.screenDom){
    //   this.screenDom.style.filter = "blur(20px)"
    // }
  }

  disableMask() {
    this.mask.enabled = false
    if (this.videoDom) {
      this.videoDom.style.filter = ''
    }
    if (this.screenDom) {
      this.screenDom.style.filter = ''
    }
  }

  destroy() {
    this.stopPlayAudioStream()
    this.stopPlayVideoStream()
    this.stopPlayScreenStream()
    this._reset()
  }
}

export { Play }
