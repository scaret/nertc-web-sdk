import { EventEmitter } from 'eventemitter3'

import { LocalStream } from '../api/localStream'
import { RemoteStream } from '../api/remoteStream'
import {
  AudioPlaySettings,
  GetCurrentFrameDataOptions,
  ILogger,
  MediaTypeList,
  MediaTypeListAudio,
  MediaTypeShort,
  PlayOptions,
  RenderMode,
  SnapshotBase64Options,
  SnapshotOptions,
  VideoPlaySettings
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
import * as stream from 'stream'

class Play extends EventEmitter {
  private snapshotIndex = 0
  sinkId: string | null = null
  public audio: AudioPlaySettings = {
    volume: null,
    dom: null
  }
  public audioSlave: AudioPlaySettings = {
    volume: null,
    dom: null
  }
  public video: VideoPlaySettings
  public screen: VideoPlaySettings
  public mask: {
    enabled: boolean
  } = {
    enabled: false
  }

  private stream: LocalStream | RemoteStream
  private logger: ILogger

  constructor(options: PlayOptions) {
    super()
    // 设置对象引用
    this.stream = options.stream
    this.logger = options.stream.logger.getChild(() => {
      let tag = 'player'
      if (this.audio.dom?.paused) {
        tag += ' audio_paused'
      }

      if (this.audioSlave.dom?.paused) {
        tag += ' audioSlave_paused'
      }

      if (this.stream._play !== this) {
        tag += ' DETACHED'
      }
      return tag
    })

    this.video = {
      dom: null,
      containerDom: null,
      view: null,
      size: { width: 0, height: 0 },
      canvasWatermark: createCanvasWatermarkControl(this.logger),
      encoderWatermark: createEncoderWatermarkControl(this.logger),
      frameData: {
        // 有canvas而无context，表示获取Context失败，之后不再尝试获取Context
        canvas: null,
        context: null
      },
      renderMode: {
        width: 0,
        height: 0,
        cut: false
      }
    }

    this.screen = {
      dom: null,
      containerDom: null,
      view: null,
      size: { width: 0, height: 0 },
      canvasWatermark: createCanvasWatermarkControl(this.logger),
      encoderWatermark: createEncoderWatermarkControl(this.logger),
      frameData: {
        // 有canvas而无context，表示获取Context失败，之后不再尝试获取Context
        canvas: null,
        context: null
      },
      renderMode: {
        width: 0,
        height: 0,
        cut: false
      }
    }
  }

  _initDomAndView(mediaType: 'video' | 'screen') {
    // 之前的init行为由 _initNodeVideo / _initVideoContainer / _initVideo / _mountVideoToDom 组成，但其实根本没有必要，因为这些function总是在被顺序调用

    // 第一步： 创建videoDom的父节点（即4.6.25之前的_initVideoContainer）
    const mediaSettings = this[mediaType]
    if (!mediaSettings.view) return
    if (!mediaSettings.containerDom) {
      const containerDom = document.createElement('div')
      mediaSettings.containerDom = containerDom
      mediaSettings.containerDom.className = `nertc-${mediaType}-container nertc-${mediaType}-container-${
        this.stream.isRemote ? 'remote' : 'local'
      }`
      containerDom.style.overflow = 'hidden'
      containerDom.style.position = 'relative'
      containerDom.style.width = `${mediaSettings.view.clientWidth}px`
      containerDom.style.height = `${mediaSettings.view.clientHeight}px`
      containerDom.style.display = 'inline-block'
    }

    // 第二步：创建videoDom本身（即原来的_initVideo）
    if (!mediaSettings.dom) {
      const videoDom = document.createElement('video')
      mediaSettings.dom = videoDom
      // 样式
      videoDom.style.position = 'absolute'
      videoDom.style.left = '50%'
      videoDom.style.top = '50%'
      videoDom.style.transform = 'translate(-50%,-50%)'
      //videoDom.style.objectFit = 'cover'
      // 设置属性
      videoDom.setAttribute('x-webkit-airplay', 'x-webkit-airplay')
      videoDom.setAttribute('playsinline', 'playsinline')
      videoDom.setAttribute('webkit-playsinline', 'webkit-playsinline')
      videoDom.preload = 'auto'
      videoDom.dataset['uid'] = '' + this.stream.getId()
      videoDom.autoplay = true
      videoDom.muted = true
      mediaSettings.size.width = 0
      mediaSettings.size.height = 0
      if (getParameters()['controlOnPaused']) {
        videoDom.addEventListener('pause', this.showControlIfVideoPause.bind(this))
        videoDom.addEventListener('play', this.handleVideoScreenPlay.bind(this))
        videoDom.addEventListener('click', this.handleVideoScreenClick.bind(this))
      }
      videoDom.addEventListener('resize', (evt) => {
        // 在resize的时候重新setVideoRender，需注意：
        // 1. 回调后可能已经stop/play过了，所以需要比较事件的target是不是videoDom
        // 2. 即使无宽高变化也可能回调多次，所以需要记录上一次的宽高
        if (
          !this[mediaType].dom ||
          this[mediaType].dom !== videoDom ||
          this[mediaType].dom !== evt.target
        ) {
          return
        }
        const width = videoDom.videoWidth
        const height = videoDom.videoHeight

        if (width > 2 && height > 2 && this.stream.isRemote) {
          if (
            this.stream.client.adapterRef.state.videoResizeTime <
            this.stream.client.adapterRef.state.signalJoinSuccessTime
          ) {
            // 视频首帧
            this.stream.client.adapterRef.state.videoResizeTime = Date.now()
          }
        }

        if (width !== mediaSettings.size.width || height !== mediaSettings.size.height) {
          this.logger.log(
            `[Play] 主流视频分辨率发生变化：${mediaSettings.size.width}x${
              mediaSettings.size.height
            } => ${width}x${height}。当前父节点：${getDomInfo(mediaSettings.view)}`
          )
          if (
            (width > height && mediaSettings.size.width > mediaSettings.size.height) ||
            (width < height && mediaSettings.size.width < mediaSettings.size.height)
          ) {
            // 未改变视频方向
          } else {
            this.setRender(mediaType)
          }
          mediaSettings.size.width = width
          mediaSettings.size.height = height
        }
      })
    }

    // 第三步：连接videoDom节点和它的container父节点（原来的_initNodeVideo）
    if (mediaSettings.containerDom == mediaSettings.dom.parentNode) {
      this.logger.log('[Play] initVideoNode: 节点已挂载，请勿重复挂载')
    } else {
      mediaSettings.containerDom.appendChild(mediaSettings.dom)
      this.logger.log(`[Play] initVideoNode ${mediaType}`)
    }

    // 第四步：连接container和它的view父节点（原来的 _mountVideoToDom）
    if (mediaSettings.view == mediaSettings.containerDom.parentNode) {
      this.logger.log('[Play] mountVideoToDom: 节点已挂载，请勿重复挂载')
    } else {
      this.logger.log('[Play] mountVideoToDom')
      mediaSettings.view.appendChild(mediaSettings.containerDom)
      this.logger.log(`[Play] 视频主流dom节点挂载成功。父节点：${getDomInfo(mediaSettings.view)}`)
      if (mediaSettings.canvasWatermark.watermarks.length) {
        mediaSettings.canvasWatermark.start(mediaSettings.containerDom)
      } else {
        mediaSettings.canvasWatermark.div = mediaSettings.containerDom
      }
    }
  }

  showControlIfVideoPause() {
    MediaTypeList.forEach((mediaType) => {
      const dom = this[mediaType].dom
      if (dom?.paused) {
        this.logger.log('[Play] 可能遇到了播放问题', mediaType)
      }
    })
  }

  handleVideoScreenClick() {
    MediaTypeList.forEach((mediaType) => {
      const dom = this[mediaType].dom
      if (dom?.paused) {
        this.logger.log(`[Play] 侦测到视频点击，尝试恢复播放:${mediaType}`)
        dom.play()
      }
    })
  }

  handleVideoScreenPlay() {
    MediaTypeList.forEach((mediaType) => {
      const dom = this[mediaType].dom
      if (dom?.paused === false) {
        this.logger.log(`[Play] 侦测到播放: ${mediaType}`)
      }
    })
  }

  async resume() {
    const promises: Promise<any>[] = []
    MediaTypeList.forEach((mediaType) => {
      const dom = this[mediaType].dom
      if (dom?.paused) {
        const p = dom.play()
        promises.push(p)
        p.then(() => {
          this.logger.log(`[Resume] 恢复播放: ${mediaType} 成功`)
        })
        p.catch((error) => {
          this.logger.error(`[Resume] 恢复播放 ${mediaType} 出现问题:`, error.name, error.message)
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
        })
      }
    })
    try {
      // 为什么这么写：因为同时触发play
      await Promise.all(promises)
    } catch (error: any) {
      // fallthrough
    }
  }

  async playAudioStream(mediaType: 'audio' | 'audioSlave', stream: MediaStream, ismuted?: boolean) {
    const mediaSettings = this[mediaType]
    if (!mediaSettings.dom) {
      mediaSettings.dom = document.createElement('audio')
    }
    const dom = mediaSettings.dom
    if (typeof ismuted === 'boolean') {
      dom.muted = ismuted
    } else {
      dom.muted = false
    }
    dom.srcObject = stream

    if (this.sinkId) {
      this.logger.log(`[Play ${mediaType}] 音频尝试使用输出设备`, this.sinkId)
      try {
        // @ts-ignore
        await dom.setSinkId(this.sinkId)
        this.logger.log(`[Play] ${mediaType} 音频使用输出设备成功`, this.sinkId)
      } catch (e: any) {
        this.logger.error('[Play] 音频输出设备切换失败', e.name, e.message, e)
      }
    }

    try {
      await playMedia(dom, getParameters().playMediaTimeout)
      this.logger.log(`[Play] 播放音频完成，当前播放状态:`, dom.played && dom.played.length)
      this.stream.client.updateRecordingAudioStream()
    } catch (error: any) {
      this.logger.warn(`[Play ${mediaType}] 播放音频出现问题: `, error.name, error.message, error)
      if (error.name === 'notAllowedError' || error.name === 'NotAllowedError') {
        // 兼容临时版本客户
        let enMessage = `playStream ${mediaType}: ${error.message}`,
          zhMessage = `playStream ${mediaType}: 浏览器自动播放受限: ${error.name}`,
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

  setPlayVolume(mediaType: 'audio' | 'audioSlave', volume: number) {
    const mediaSetting = this[mediaType]
    mediaSetting.volume = volume
    if (mediaSetting.dom) {
      mediaSetting.dom.volume = volume / 255
    }
  }

  isPlaying(mediaType: MediaTypeShort) {
    let dom = this[mediaType].dom
    if (!dom) {
      return false
    } else if (!dom.srcObject) {
      return false
    } else if (dom.paused) {
      return false
    } else if (dom.readyState !== 4) {
      return false
    } else {
      let track = (dom.srcObject as MediaStream).getTracks()[0]
      if (!track) {
        return false
      } else if (!track.enabled) {
        return false
      } else if (track.muted) {
        return false
      }
      if (mediaType === 'audio' || mediaType === 'audioSlave') {
        if (dom.muted) {
          return false
        } else if (dom.volume === 0) {
          return false
        }
      }
    }
    return true
  }

  canPlay(mediaType: MediaTypeShort) {
    // 注意：canPlay的部分功能超过了渲染模块的职责。但因为不想扩大stream.ts体积，所以暂时放在这里。
    const ret = {
      result: false,
      reason: ''
    }
    const track = this.stream.mediaHelper.getTrackByMediaType(mediaType)
    const dom = this[mediaType].dom
    if (!track) {
      if (this.stream.isRemote) {
        if (!this.stream.pubStatus[mediaType].producerId) {
          ret.reason = 'NOT_PUBLISHED'
        } else if (!this.stream.pubStatus[mediaType].consumerId) {
          ret.reason = 'NOT_SUBSCRIBED'
        } else if (this.stream.pubStatus[mediaType].consumerStatus !== 'end') {
          ret.reason = 'CONSUME_' + this.stream.pubStatus[mediaType].consumerStatus
        } else {
          ret.reason = 'INVALID_STATE'
        }
      } else {
        ret.reason = 'NOT_OPENED'
      }
    } else if (track.readyState === 'ended') {
      ret.reason = 'ENDED'
    } else if (track.muted || !track.enabled) {
      ret.reason = 'MUTED'
    } else if (dom) {
      if (!dom.srcObject) {
        // 播放过，又停止了
        ret.result = true
      } else if (dom.paused) {
        if (track.kind === 'audio') {
          // 音频的paused状态是可以播放的
          ret.result = true
        } else {
          ret.reason = 'PAUSED'
        }
      } else {
        ret.reason = 'PLAYING'
      }
    } else {
      // 有track没dom，可以判定为可播放
      ret.result = true
    }
    return ret
  }

  async playVideoStream(mediaType: 'video' | 'screen', stream: MediaStream, view: HTMLElement) {
    const mediaSetting = this[mediaType]
    if (mediaSetting.dom?.srcObject === stream) {
      this.logger.log(`[Play ${mediaType}] playVideoStream: 跳过重复的播放请求`)
      return
    }
    mediaSetting.view = view
    this._initDomAndView(mediaType)
    if (this.mask.enabled) {
      this.enableMask()
    }
    try {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        this.logger.log(
          `[Play] 开始加载 ${mediaType} 播放视频源：视频参数 "${videoTrack.label}",enabled ${
            videoTrack.enabled
          } , ${JSON.stringify(videoTrack.getSettings())}`
        )
      } else {
        this.logger.error(`[Play ${mediaType}] 加载播放视频源失败：没有视频源`)
      }
      const dom = mediaSetting.dom
      if (!dom) return
      dom.srcObject = stream
      if (
        this.stream.isRemote &&
        this.stream.client.adapterRef.state.domVideoAppendTime <
          this.stream.client.adapterRef.state.signalJoinSuccessTime
      ) {
        this.stream.client.adapterRef.state.domVideoAppendTime = Date.now()
      }
      await playMedia(dom, getParameters().playMediaTimeout)
      this.logger.log(
        `[Play] 成功加载主流播放视频源：当前视频实际分辨率${dom.videoWidth}x${dom.videoHeight}，显示宽高${dom.offsetWidth}x${dom.offsetHeight}`
      )
      if (dom.paused && getParameters()['controlOnPaused']) {
        //给微信的Workaround。微信会play()执行成功但不播放
        this.showControlIfVideoPause()
      }
    } catch (error: any) {
      this.logger.warn(`[Play ${mediaType}] 播放视频出现问题:`, error.name, error.message, error)

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

  async stopPlayStream(mediaType: MediaTypeShort) {
    if (mediaType === 'audio' || mediaType === 'audioSlave') {
      this._stopPlayAudioStream(mediaType)
    } else if (mediaType === 'video' || mediaType === 'screen') {
      this._stopPlayVideoStream(mediaType)
    }
  }

  private async _stopPlayAudioStream(mediaType: 'audio' | 'audioSlave') {
    const dom = this[mediaType].dom
    if (dom) {
      dom.muted = true
      dom.srcObject = null
    }
  }

  private async _stopPlayVideoStream(mediaType: 'video' | 'screen') {
    this.logger.log(`stopPlayVideoStream 停止播放 ${mediaType}`)
    const view = this[mediaType].view
    const containerDom = this[mediaType].containerDom
    const dom = this[mediaType].dom
    if (containerDom && dom) {
      if (containerDom === dom.parentNode) {
        this.logger.log(`清除 ${mediaType} dom`)
        containerDom.removeChild(dom)
      } else if (containerDom.lastChild) {
        this.logger.log(`videoContainerDom 删除子节点`)
        containerDom.removeChild(containerDom.lastChild)
      }
      try {
        dom.remove()
        dom.srcObject = null
        this[mediaType].dom = null
      } catch (e) {
        this.logger.log('stopPlayVideoStream e: ', e)
      }
    }
    if (view && containerDom) {
      if (view == containerDom.parentNode) {
        this.logger.log(`清除 ${mediaType} containerDom`)
        view.removeChild(containerDom)
      } else if (view.lastChild) {
        this.logger.log(`${mediaType} View 删除子节点`)
        view.removeChild(view.lastChild)
        view.innerHTML = ''
      }
      this[mediaType].containerDom = null
      this[mediaType].view = null
    }
  }

  /**
   * @param options 可以不填，用上一次的设置来resize
   */
  setRender(mediaType: 'video' | 'screen', options?: RenderMode) {
    const mediaSetting = this[mediaType]
    const containerDom = mediaSetting.containerDom
    const dom = mediaSetting.dom
    if (options) {
      this.logger.log(`[Play ${mediaType}] setRender() options: ${JSON.stringify(options)}`)
      mediaSetting.renderMode = Object.assign({}, options)
    } else {
      options = mediaSetting.renderMode
      this.logger.log(
        `[Play] setVideoRender() existing videoRenderMode: ${JSON.stringify(options)}`
      )
    }
    if (!containerDom || !dom) {
      return
    }
    // 设置外部容器
    containerDom.style.width = `${options.width}px`
    containerDom.style.height = `${options.height}px`
    // 是否裁剪
    if (!options.cut) {
      dom.style.height = '100%'
      dom.style.width = '100%'
      return
    }
    // 计算宽高比后设置video宽高
    let videoDomRatio = dom.videoWidth / dom.videoHeight // 计算视频原始宽高得出的ratio
    let optionsRatio = options.width / options.height
    if (videoDomRatio > optionsRatio) {
      // 宽度填满但是高度填不满 => 填充高度，宽度自适应
      dom.style.width = 'auto'
      dom.style.height = '100%'
    } else {
      // 宽度不够但是高度填满 => 填充宽度，高度自适应
      dom.style.width = '100%'
      dom.style.height = 'auto'
    }
  }

  async setAudioOutput(audioSinkId: string) {
    this.sinkId = audioSinkId
    for (let mediaType of MediaTypeListAudio) {
      const dom = this[mediaType].dom
      if (dom?.srcObject) {
        const stream = dom.srcObject as MediaStream
        if (stream.getAudioTracks().length) {
          await (dom as any).setSinkId(audioSinkId)
          this.logger.log('[Play] setAudioOutput() 设置通话音频输出设备成功')
        }
      }
    }
  }

  /**
   * 视频截图功能
   */
  async takeSnapshot(
    options: SnapshotOptions,
    returnType: 'download' | 'base64',
    streamId?: string | number
  ) {
    if (this.mask.enabled) {
      this.logger.warn(`takeSnapshot: 目前在打码状态`)
      return null
    }

    let rtcCanvas = new RTCCanvas('canvas')
    let canvas = rtcCanvas._canvas
    let ctx = rtcCanvas._ctx
    if (!ctx || !canvas) {
      this.logger.error(`takeSnapshot() 浏览器环境不支持`)
      throw new RtcError({
        code: ErrorCode.SWITCH_DEVICE_NO_CAMERA_ERROR,
        message: 'takeSnapshot() 浏览器环境不支持'
      })
    }

    const mediaTypeList: ('video' | 'screen')[] = ['video', 'screen']
    let fileUrl = ''
    for (let mediaType of mediaTypeList) {
      let snapshotMedia =
        (!options.mediaType && this[mediaType].dom) || options.mediaType === mediaType

      // video
      if (snapshotMedia) {
        const name = options.name || (streamId || this.stream.getId()) + '-' + this.snapshotIndex++
        ctx.fillStyle = '#ffffff'
        const dom = this[mediaType].dom
        if (!dom) {
          return
        }
        ctx.fillRect(0, 0, dom.videoWidth, dom.videoHeight)
        rtcCanvas.setSize(dom.videoWidth, dom.videoHeight)
        ctx.drawImage(
          dom,
          0,
          0,
          dom.videoWidth,
          dom.videoHeight,
          0,
          0,
          dom.videoWidth,
          dom.videoHeight
        )
        if (returnType === 'download') {
          fileUrl = await new Promise((resolve, reject) => {
            canvas!.toBlob((blob) => {
              this.logger.log('takeSnapshot() 获取到截图的blob: ', blob)
              //@ts-ignore
              let url = URL.createObjectURL(blob)
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
        } else if (returnType === 'base64') {
          fileUrl = this.getBase64Image(canvas)
        }
      }
    }
    rtcCanvas.destroy()
    return fileUrl
  }

  _initFrameDataCanvas(mediaType: 'video' | 'screen'): CanvasRenderingContext2D | null {
    const frameData = this[mediaType].frameData
    if (!frameData.canvas) {
      this.logger.log(`正在初始化 frameData.canvas ${mediaType}`)
      frameData.canvas = document.createElement('canvas')
      frameData.context = get2DContext(frameData.canvas, {
        // @ts-ignore
        willReadFrequently: true
      })
    }
    return frameData.context
  }

  getCurrentFrameData(options: GetCurrentFrameDataOptions) {
    if (this.mask.enabled) {
      this.logger.error(`getCurrentFrameData: 当前在打码状态`)
      return null
    }
    let frameData, dom
    let mediaType: 'video' | 'screen'
    if (!options.mediaType || options.mediaType === 'video') {
      mediaType = 'video'
    } else {
      mediaType = 'screen'
    }
    dom = this[mediaType].dom
    frameData = this[mediaType].frameData
    if (!dom) {
      this.logger.error('getCurrentFrameData: Playing Video is not found')
      return null
    }
    if (dom.paused) {
      this.logger.warn(`getCurrentFrameData: 目前数据源不在播放状态，截图结果可能不是最新。`)
    }
    if (!frameData.canvas) {
      this._initFrameDataCanvas(mediaType)
    }
    const canvas = frameData.canvas
    const ctx = frameData.context
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
    const videoWidth = dom.videoWidth
    const videoHeight = dom.videoHeight
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
    ctx.drawImage(dom, 0, 0, width, height)
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
    if (this.video.dom) {
      this.video.dom.style.filter = 'blur(20px)'
    }
    // if (this.screenDom){
    //   this.screenDom.style.filter = "blur(20px)"
    // }
  }

  disableMask() {
    this.mask.enabled = false
    if (this.video.dom) {
      this.video.dom.style.filter = ''
    }
    if (this.screen.dom) {
      this.screen.dom.style.filter = ''
    }
  }

  destroy() {
    MediaTypeList.forEach((mediaType) => {
      this.stopPlayStream(mediaType)
    })
  }
}

export { Play }
