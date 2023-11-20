import { NERTC_VIDEO_QUALITY, VIDEO_FRAME_RATE } from '../constant/videoQuality'
import { ReportParamEnableEarback } from '../interfaces/ApiReportParam'
import { alerter } from '../module/alerter'
import { AudioLevel } from '../module/audioLevel'
import { MediaHelper } from '../module/media'
import { getParameters } from '../module/parameters'
import { Play } from '../module/play'
import { Record } from '../module/record'
import VideoPostProcess from '../module/video-post-processing'
import AdvancedBeauty from '../module/video-post-processing/advanced-beauty'
import BasicBeauty from '../module/video-post-processing/basic-beauty'
import VirtualBackground from '../module/video-post-processing/virtual-background'
import AudioEffects from '../module/audio-pipeline/stages/StageAIProcessing/AudioEffects'
import AIholwing from '../module/audio-pipeline/stages/StageAIProcessing/AIhowling'
import { loadPlugin } from '../plugin'
import {
  VideoPluginType,
  AudioPluginType,
  audioPlugins,
  videoPlugins,
  PluginConfigList
} from '../plugin/plugin-list'
import { BackGroundOptions } from '../plugin/segmentation/src/types'
import { checkValidEnum, isNumber } from '../util/param'
import {
  AudioEffectOptions,
  AudioMixingOptions,
  AudioProcessingOptions,
  BeautyEffectOptions,
  Client,
  Client as IClient,
  GetCurrentFrameDataOptions,
  GetStreamConstraints,
  LocalStreamOptions,
  MediaRecordingOptions,
  MediaTypeList,
  MediaTypeShort,
  NERtcCanvasWatermarkConfig,
  NERtcEncoderWatermarkConfig,
  PluginOptions,
  RenderMode,
  ScreenProfileOptions,
  SnapshotBase64Options,
  SnapshotOptions,
  StreamPlayOptions,
  VideoProfileOptions
} from '../types'
import { ILogger } from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import { emptyStreamWith, watchTrack } from '../util/gum'
import { isExistOptions } from '../util/param'
import { applyResolution } from '../util/rtcUtil/applyResolution'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { RTCEventEmitter } from '../util/rtcUtil/RTCEventEmitter'
import { makePrintable } from '../util/rtcUtil/utils'
import { getAudioContext } from '../module/webAudio'
import { StageAIProcessing } from '../module/audio-pipeline/stages/StageAIProcessing/StageAIProcessing'
import { webassemblySupported } from '../util/wasmDetect'
import { AudioProfile, AudioProfileTypes } from '../constant/audioProfile'

/**
 *  请使用 {@link NERTC.createStream} 通过NERTC.createStream创建
 *  @class
 *  @name Stream
 */
let localStreamCnt = 0

export interface LocalStreamOpenOptions {
  type: 'audio' | 'video' | 'screen' | 'screenAudio'
  deviceId?: string
  sourceId?: string
  facingMode?: string
  screenAudio?: boolean
  audioSource?: MediaStreamTrack
  videoSource?: MediaStreamTrack
  screenAudioSource?: MediaStreamTrack
  screenVideoSource?: MediaStreamTrack
  enableMediaPub?: boolean
}

export interface LocalStreamCloseOptions {
  type: MediaTypeShort | 'screenAudio' | 'all'
}

/**
 *  @method stream类构造函数
 *  @memberOf Stream
 *  @param {Object} options 配置参数
 *  @param {String} [options.audio] 是否从麦克风采集音频
 *  @param {String} [options.uid] 用户uid
 *  @param {String} [options.microphoneId] 麦克风设备 deviceId，通过 getMicrophones() 获取
 *  @param {Object} [options.video] 是否从摄像头采集视频
 *  @param {String} [options.cameraId] 摄像头设备 deviceId，通过 getCameras() 获取
 *  @param {Object} [options.screen] 是否采集屏幕分享流
 *  @param {Object} [options.audioProcessing] 是否开启/关闭音频处理接口（3A接口)
 ##### 注意：
 音频处理接口取决于浏览器支持情况。目前Safari不支持AGC及ANS设置。
 + `AEC`: 是否开启声学回声消除。默认为 true。
    + `true`：开启声学回声消除。
    + `false`：关闭声学回声消除。
 + `AGC`: 是否开启自动增益控制。默认为 true。
    + `true`：开启自动增益控制。
    + `false`：关闭自动增益控制。
 + `ANS`: 是否开启自动噪声抑制。默认为 true。
    + `true`：开启自动噪声抑制。
    + `false`：关闭自动噪声抑制。
 *  @param {String} [options.sourceId] 屏幕共享的数据源Id（electron用户可以自己获取）
 *  @param {String} [options.facingMode] 指定使用前置/后置摄像头来采集视频
   在移动设备上，可以设置该参数选择使用前置或后置摄像头：
   + "user"：前置摄像头
   + "environment"：后置摄像头
 *  @param {MeidaTrack} [options.audioSource] 自定义的音频的track
 *  @param {MeidaTrack} [options.videoSource] 自定义的视频的track
 *  @returns {Stream}
 */
class LocalStream extends RTCEventEmitter {
  public streamID: number | string
  public stringStreamID: string
  public audio: boolean
  public microphoneId: string
  public cameraId: string
  public sourceId: string
  public facingMode: string
  public video: boolean
  public screen: boolean
  public screenAudio: boolean
  public client: Client
  private audioSource: MediaStreamTrack | null
  private videoSource: MediaStreamTrack | null
  private screenVideoSource: MediaStreamTrack | null
  private screenAudioSource: MediaStreamTrack | null
  public mediaHelper: MediaHelper
  // 美颜相关实例对象
  private safariVideoSizeChange = false
  private videoPostProcess: VideoPostProcess
  private basicBeauty: BasicBeauty
  private virtualBackground: VirtualBackground
  private advancedBeauty: AdvancedBeauty
  private _segmentProcessor: VirtualBackground | null
  private _advancedBeautyProcessor: AdvancedBeauty | null = null
  // 音频处理相关实例对象
  private _audioAffectsProcessor: AudioEffects | null = null
  private _aiHowlingProcessor: AIholwing | null = null
  //用于缓存音视频预处理的预设配置
  private pluginConfigList: PluginConfigList = {
    howlingCallback: null
  }

  private lastEffects: any
  private lastFilter: any
  private videoPostProcessTags = {
    isBeautyTrack: false,
    isBodySegmentTrack: false,
    isAdvBeautyTrack: false
  }
  private replaceTags = {
    videoPost: false,
    waterMark: false,
    isMuted: false
  }

  _play: Play
  private _record: Record | null
  public audioLevelHelper: AudioLevel | null = null
  public audioLevelHelperSlave: AudioLevel | null = null
  public audioProfile: AudioProfileTypes
  private _cameraTrack: MediaStreamTrack | null
  private _transformedTrack: MediaStreamTrack | null
  __v_skip = getParameters().enableVSkip
  public videoProfile: {
    frameRate: number
    resolution: number
  } = {
    frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL, //15
    resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p // 640*480
  }
  public screenProfile: {
    frameRate: number
    resolution: number
  } = {
    frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5, //5
    resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p // 1920*1080
  }
  private state: 'UNINIT' | 'INITING' | 'INITED' = 'UNINIT'
  public videoView: HTMLElement | null | undefined | String = null
  public screenView: HTMLElement | null | undefined | String = null
  public renderMode: {
    local: {
      video: RenderMode | {}
      screen: RenderMode | {}
    }
  } = { local: { video: {}, screen: {} } }
  private inSwitchDevice: {
    audio: boolean
    video: boolean
  } = {
    audio: false,
    video: false
  }
  public pubStatus: {
    audio: { audio: boolean }
    audioSlave: { audio: boolean }
    video: { video: boolean }
    screen: { screen: boolean }
  } = {
    audio: { audio: false },
    audioSlave: { audio: false },
    video: { video: false },
    screen: { screen: false }
  }
  public muteStatus: {
    // localStream只有send
    // remoteStream的send表示发送端的mute状态，recv表示接收端的mute状态
    audio: { send: boolean }
    audioSlave: { send: boolean }
    video: { send: boolean }
    screen: { send: boolean }
  } = {
    audio: { send: false },
    audioSlave: { send: false },
    video: { send: false },
    screen: { send: false }
  }
  public readonly isRemote: false = false
  public active = true
  public logger: ILogger
  public localStreamId: number
  public destroyed = false
  private canvasWatermarkOptions: NERtcCanvasWatermarkConfig | null = null
  private encoderWatermarkOptions: NERtcEncoderWatermarkConfig | null = null
  private supportWasm = true
  private supportAIAudioEffects = true
  private supportHowling = true
  private canEnableAIAudioEffects = true
  constraintSettings: {
    [mediaType in MediaTypeShort]: AudioProcessingOptions
  } = {
    // 暂时没有用到video/screen
    audio: {},
    audioSlave: {},
    video: {},
    screen: {}
  }

  constructor(options: LocalStreamOptions) {
    super()
    this.localStreamId = localStreamCnt++
    this.logger = options.client.adapterRef.logger.getChild(() => {
      // logger要写在constructor里，方便绑定闭包传递
      let tag = this.localStreamId ? `local${this.localStreamId}` : `localStream`
      if (this.mediaHelper) {
        let avsState = ''
        if (this.mediaHelper.audio.micTrack) {
          avsState += 'm'
        }
        if (this.mediaHelper.video.cameraTrack) {
          avsState += 'c'
        }
        if (this.mediaHelper.screen.screenVideoTrack) {
          avsState += 's'
        }
        if (this.mediaHelper.screenAudio.screenAudioTrack) {
          // screenAudio的标记位为t，即s的下一个字母
          avsState += 't'
        }
        if (avsState) {
          tag += ' ' + avsState
        }
      }
      if (this.state !== 'INITED') {
        tag += ' ' + this.state
      }
      if (
        this.state === 'INITED' &&
        this.client &&
        this.client.adapterRef.localStream?.localStreamId !== this.localStreamId
      ) {
        tag += ' DETACHED'
      }
      if (this.destroyed) {
        tag += ' DESTROYED'
      }
      return tag
    })
    if (!options.uid) {
      // 允许不填uid
      options.uid = `local_${this.localStreamId}`
    } else if (typeof options.uid === 'string') {
      this.logger.log('createStream: uid是string类型')
      options.client.adapterRef.channelInfo.uidType = 'string'
      if (!/^[1-9]\d*$/.test(options.uid)) {
        this.logger.log('join(): uid不是数字字符串格式')
        throw new RtcError({
          code: ErrorCode.JOIN_UID_TYPE_ERROR,
          message: 'createStream: uid不是数字字符串格式'
        })
      }
    } else if (typeof options.uid === 'number') {
      this.logger.log('createStream: uid是number类型')
      options.client.adapterRef.channelInfo.uidType = 'number'
      if (options.uid > Number.MAX_SAFE_INTEGER) {
        throw new RtcError({
          code: ErrorCode.STREAM_UID_ERROR,
          message: 'Number 类型的 uid 最大值是 2^53 - 1， 请输入正确的参数'
        })
      }
    } else {
      this.logger.error('createStream: uid参数格式非法')
      throw new RtcError({
        code: ErrorCode.STREAM_UID_ERROR,
        message: 'createStream: uid参数格式非法'
      })
    }
    this._reset()
    this.streamID = options.uid
    this.stringStreamID = this.streamID.toString()
    this.audio = options.audio
    if (options.audioProcessing) {
      this.constraintSettings.audio = Object.assign({}, options.audioProcessing)
    }
    this.microphoneId = options.microphoneId || ''
    this.cameraId = options.cameraId || ''
    this.video = options.video || false
    this.screen = options.screen || false
    this.screenAudio = options.screenAudio || false
    this.sourceId = options.sourceId || ''
    this.facingMode = options.facingMode || ''
    this.client = options.client
    this.audioSource = options.audioSource || null
    this.videoSource = options.videoSource || null
    this.screenAudioSource = options.screenAudioSource || null
    this.screenVideoSource = options.screenVideoSource || null
    this._segmentProcessor = null
    this._cameraTrack = null
    this._transformedTrack = null
    this.mediaHelper = new MediaHelper({
      stream: this
    })
    this._play = new Play({
      stream: this
    })
    this._record = new Record({
      logger: this.logger,
      client: this.client
    })
    if (this.client._params && this.client._params.mode === 'live') {
      this.audioProfile = 'music_standard'
    } else {
      this.audioProfile = 'speech_low_quality'
    }

    if (getParameters().enableAlerter !== 'never') {
      alerter.watchLocalStream(this)
    }

    this.logger.log(
      `创建本地Stream: `,
      JSON.stringify({
        streamID: this.stringStreamID,
        audio: options.audio,
        video: options.video
      })
    )
    this.client.apiFrequencyControl({
      name: 'createLocalStream',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        videoProfile: this.videoProfile,
        audio: this.audio,
        audioProfile: this.audioProfile,
        video: this.video,
        screen: this.screen,
        screenProfile: this.screenProfile
      }
    })

    this.supportWasm = webassemblySupported()
    this.videoPostProcess = new VideoPostProcess(this.logger)
    this.basicBeauty = new BasicBeauty(this.videoPostProcess)
    this.virtualBackground = new VirtualBackground(this.videoPostProcess)
    this.advancedBeauty = new AdvancedBeauty(this.videoPostProcess)

    if (env.IS_ANY_SAFARI) {
      this.videoPostProcess.on('safariVideoSizeChange', () => {
        this.safariVideoSizeChange = true
        this.loseContext()
      })
    }

    // 处理 webgl 上下文丢失
    this.videoPostProcess.on('contextLost', () => {
      this.suspendVideoPostProcess()
      if (!this.safariVideoSizeChange) {
        this.emit('video-post-context-lost')
      } else {
        setTimeout(() => {
          this.restoreContext()
        }, 0)
      }
    })

    // 处理 webgl 上下文恢复
    this.videoPostProcess.on('contextRestored', (success) => {
      this.resumeVideoPostProcess()
      if (!this.safariVideoSizeChange) {
        this.emit('video-post-context-restored', success)
        this.logger.log('webgl context restored, try to reinitialize webgl pipeline.')
      } else {
        this.safariVideoSizeChange = false
      }
    })

    // 对外抛出基础美颜加载完成事件
    // failUrls[] 返回失败的资源路径
    this.videoPostProcess.on('beautyResComplete', (failUrls: string[]) => {
      this.emit('basic-beauty-res-complete', failUrls)
    })
    this.videoPostProcess.on('advBeautyResComplete', (failUrls: string[]) => {
      this.emit('adv-beauty-res-complete', failUrls)
    })

    this.videoPostProcess.on('taskSwitch', (isOn) => {
      this.replaceTags.videoPost = isOn
      this.replaceCanvas()
      if (isOn && env.IS_ANY_SAFARI) {
        const safariVersion = parseFloat(env.SAFARI_VERSION || '0')
        if (safariVersion < 15.4) {
          this.logger.warn(
            'It is detected that you are using safari and the version is lower than 15.4. ' +
              'For a better experience, it is recommended to use version 15.4 and above.'
          )
        }
        if (safariVersion === 15.3) {
          this.logger.warn(
            'In the current version of Safari, enabling video post-processing related functions will cause memory leaks ' +
              '(Safari kernel bug: capturing video streams from WebGL will cause memory leaks).'
          )
        }
        if (safariVersion === 15.0) {
          this.logger.warn(
            'In the current version of Safari, enabling video post-processing related functions will cause the page to crash ' +
              '(Safari kernel bug: WebGL rendering WebCam will cause the page to crash).'
          )
        }
      }
    })

    if (env.IS_ANY_SAFARI && env.SAFARI_MAJOR_VERSION! < 15) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.replaceTags.videoPost) {
          this.logger.warn(
            'In the current version of Safari, the page with the video post-processing function is restored from the background, ' +
              'the sending frame rate will slowly return to the normal frame rate from a lower value.'
          )
        }
      })
    }

    this.mediaHelper.on('preProcessChange', (info) => {
      if (info.mediaType === 'video') {
        this.replaceTags.waterMark = info.isOn
        this.replaceCanvas()
      }
    })
  }

  getAdapterRef() {
    // 仅当localStream在发布时才会返回adapterRef
    if (this.client.adapterRef.localStream?.localStreamId === this.localStreamId) {
      return this.client.adapterRef
    } else {
      return null
    }
  }

  _reset() {
    this.streamID = ''
    this.stringStreamID = ''
    this.state = 'UNINIT'
    this.videoProfile = {
      frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL, //15
      resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p // 640*480
    }
    this.audioProfile = 'speech_low_quality'
    this.screenProfile = {
      frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5, //5
      resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p // 1920*1080
    }
    this.audio = false
    this.microphoneId = ''
    this.video = false
    this.cameraId = ''
    this.screen = false
    this.screenAudio = false
    this.sourceId = ''
    this.facingMode = ''
    this.videoView = null
    this.screenView = null
    this.renderMode = { local: { video: {}, screen: {} } }
    this.inSwitchDevice = {
      audio: false,
      video: false
    }
    this.pubStatus = {
      audio: {
        audio: false
      },
      audioSlave: {
        audio: false
      },
      video: {
        video: false
      },
      screen: {
        screen: false
      }
    }

    this.muteStatus = {
      audio: { send: false },
      audioSlave: { send: false },
      video: { send: false },
      screen: { send: false }
    }
    this.renderMode = {
      local: { video: {}, screen: {} }
    }
    if (this.mediaHelper) {
      this.mediaHelper.destroy()
    }
    if (this._play) {
      this._play.destroy()
    }
    if (this._record) {
      this._record.destroy()
    }
    this._record = null
    if (this.audioLevelHelper) {
      this.audioLevelHelper.destroy()
    }
    this.audioLevelHelper = null
    if (this.audioLevelHelperSlave) {
      this.audioLevelHelperSlave.destroy()
    }
    this.audioLevelHelperSlave = null
  }

  get segmentProcessor() {
    return this._segmentProcessor
  }

  get Play() {
    return this._play
  }

  get Record() {
    return this._record
  }

  /**
   *  获取音视频流 ID
   *  @method getId
   *  @memberOf Stream
   *  @return number
   */
  getId() {
    if (this.client.adapterRef.channelInfo.uidType === 'string') {
      return this.stringStreamID
    }
    return this.streamID
  }

  getAudioStream() {
    if (this.mediaHelper) {
      this.client.apiFrequencyControl({
        name: 'getAudioStream',
        code: 0,
        param: JSON.stringify({ streamID: this.getId() }, null, ' ')
      })
      return this.mediaHelper.audio.audioStream
    } else {
      return null
    }
  }

  /**
   * 初始化音视频流对象
   * @memberOf Stream#
   * @function init
   * @return {Promise}
   */
  async init() {
    // localStream.init行为排队
    const hookInitFinished = await this.client.operationQueue.enqueue({
      caller: this,
      method: 'init',
      options: null
    })
    const onInitFinished = () => {
      hookInitFinished()
      const apiEventDataInit: any = {
        audio: this.audio,
        video: this.video,
        screen: this.screen,
        screenAudio: this.screenAudio
      }
      if (this.audio || this.screenAudio) {
        apiEventDataInit.audioProfile = this.audioProfile
        apiEventDataInit.audioProcessing = this.constraintSettings.audio
        apiEventDataInit.audioSlaveProcessing = this.constraintSettings.audioSlave
      }
      if (this.video) {
        apiEventDataInit.videoProfile = this.mediaHelper.video.captureConfig.high
        apiEventDataInit.videoEncoder = this.mediaHelper.video.encoderConfig.high
      }
      if (this.screen) {
        apiEventDataInit.screenProfile = this.mediaHelper.screen.captureConfig.high
        apiEventDataInit.screenEncoder = this.mediaHelper.screen.encoderConfig.high
      }
      this.initVideoPostProcess()

      this.client.apiFrequencyControl({
        name: 'init',
        code: 0,
        param: {
          streamID: this.stringStreamID,
          ...apiEventDataInit
        }
      })
      this.client.apiFrequencyControl({
        name: '_trackSettings',
        code: 0,
        param: JSON.stringify(this.mediaHelper.getTrackSettings())
      })
    }

    let initErr: any = null

    this.state = 'INITING'
    this.logger.log('init() 初始化音视频流对象')
    //设置分辨率和码率
    this.client.adapterRef.channelInfo.sessionConfig.maxVideoQuality =
      NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p
    if (this.videoProfile) {
      this.client.adapterRef.channelInfo.sessionConfig.videoQuality = this.videoProfile.resolution
      this.client.adapterRef.channelInfo.sessionConfig.videoFrameRate = this.videoProfile.frameRate
    }

    try {
      if (this.audio) {
        await this.mediaHelper.getStream({
          audio: this.audio,
          audioDeviceId: this.microphoneId,
          audioSource: this.audioSource
        })
      }
    } catch (e: any) {
      this.logger.log(`init() 打开mic失败: ${e.message}`)
      initErr = e
      this.audio = false
    }

    try {
      if (this.video) {
        await this.mediaHelper.getStream({
          video: this.video,
          videoSource: this.videoSource,
          videoDeviceId: this.cameraId,
          facingMode: this.facingMode
        })
        if (this.mediaHelper.video.preProcessingEnabled) {
          this.mediaHelper.enablePreProcessing('video')
        }
      }
    } catch (e: any) {
      this.logger.log(`init() 打开camera失败: ${e.message}`)
      initErr = e
      this.video = false
    }

    try {
      if (this.screen) {
        const constraints = {
          sourceId: this.sourceId,
          screen: this.screen,
          screenVideoSource: this.screenVideoSource,
          screenAudio: this.screenAudio,
          screenAudioSource: this.screenAudioSource
        }
        await this.mediaHelper.getStream(constraints)
        if (this.mediaHelper.screen.preProcessingEnabled) {
          this.mediaHelper.enablePreProcessing('screen')
        }
      }
    } catch (e: any) {
      this.logger.log(`init() 打开screen失败: ${e.message}`)
      initErr = e
      // 屏幕共享音频需要和屏幕共享一起授权，所以必须一起getStream。但init失败也不一定说明screen和screenAudio同时为false
      // 例如，辅流请求授权屏幕共享，辅流音频是自定义的情况，授权失败也不会影响辅流音频
      this.screen = this.mediaHelper.screen.screenVideoStream.getVideoTracks().length > 0
      this.screenAudio = this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks().length > 0
    }

    if (this.audio || this.video || this.screen || this.screenAudio) {
      this.state = 'INITED'
    } else if (initErr) {
      this.state = 'UNINIT'
      this.logger.error('localStream.init失败:', initErr.name, initErr.message, initErr)
      onInitFinished()
      throw initErr
    } else {
      if (getParameters().allowEmptyMedia) {
        this.logger.log('init() 当前模式下localStream允许初始化时无任何音视频')
        this.state = 'INITED'
      } else {
        this.state = 'UNINIT'
        this.logger.warn('init() localStream不允许初始化时无任何音视频')
        onInitFinished()
        throw new RtcError({
          code: ErrorCode.STREAM_PROFILE_ERROR,
          message: 'init() localStream不允许初始化时无任何音视频'
        })
      }
    }
    onInitFinished()
  }

  initVideoPostProcess() {
    this.videoPostProcess?.init()
  }

  /**
   * 获取音频轨道
   * @function getAudioTrack
   * @memberOf STREAM#
   * @return {MediaStreamTrack}
   */
  getAudioTrack(mediaType: 'audio' | 'audioSlave' = 'audio') {
    if (this.mediaHelper) {
      if (mediaType === 'audio') {
        return this.mediaHelper.getAudioInputTracks()[0]
      } else if (mediaType === 'audioSlave') {
        return this.mediaHelper.getAudioSlaveInputTracks()[0]
      } else {
        return null
      }
    }
  }

  /**
   * 获取视频轨道
   * @function getVideoTrack
   * @memberOf STREAM#
   * @return {MediaStreamTrack}
   */
  getVideoTrack(mediaType: 'video' | 'screen' = 'video') {
    if (this.mediaHelper) {
      if (mediaType === 'video') {
        return this.mediaHelper.video.cameraTrack || this.mediaHelper.video.videoSource
      } else if (mediaType === 'screen') {
        return this.mediaHelper.screen.screenVideoTrack || this.mediaHelper.screen.screenVideoSource
      } else {
        return null
      }
    }
  }

  getScreenTrack() {
    return this.mediaHelper.screen.screenVideoStream.getVideoTracks()[0] || null
  }

  getAudioSlaveTrack() {
    return this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks()[0] || null
  }

  /**
   * 播放音视频流
   * @function play
   * @memberOf Stream#
   * @param {div} view div标签，播放画面的dom容器节点
   * @return {Promise}
   */
  async play(
    viewInput: HTMLElement | String | null | undefined,
    playOptions: StreamPlayOptions = {}
  ) {
    if ((playOptions.video || playOptions.screen) && !viewInput) {
      this.logger.warn(`play() localStream ${this.getId()} 播放视频没有指定div标签`)
      throw new RtcError({
        code: ErrorCode.STREAM_PLAY_ARGUMENT_ERROR,
        message: 'play() 播放视频没有指定div标签'
      })
    }
    if (!isExistOptions({ tag: 'Stream.playOptions.audio', value: playOptions.audio }).result) {
      playOptions.audio = false
    }
    if (playOptions.audio && !playOptions.audioType) {
      playOptions.audioType = 'mixing'
    }
    if (!isExistOptions({ tag: 'Stream.playOptions.video', value: playOptions.video }).result) {
      playOptions.video = true
    }
    if (!isExistOptions({ tag: 'Stream.playOptions.screen', value: playOptions.screen }).result) {
      playOptions.screen = true
    }

    this.logger.log(
      `play() uid: ${this.stringStreamID}, playOptions: ${JSON.stringify(playOptions)}`
    )
    if (playOptions.audio && this._play && this.mediaHelper.getAudioInputTracks().length > 0) {
      this.logger.log(`play() uid ${this.stringStreamID} 开始播放本地音频: `, playOptions.audioType)
      if (playOptions.audioType === 'voice') {
        this._play.playAudioStream('audio', this.mediaHelper.audio.micStream, playOptions.muted)
      } else if (playOptions.audioType === 'music') {
        this._play.playAudioStream('audio', this.mediaHelper.audio.musicStream, playOptions.muted)
      } else if (playOptions.audioType === 'mixing') {
        this._play.playAudioStream('audio', this.mediaHelper.audio.audioStream, playOptions.muted)
      }
    }

    let view: HTMLElement | null = null
    if (typeof viewInput === 'string') {
      view = document.getElementById(viewInput)
    } else if (viewInput) {
      view = viewInput as HTMLElement
    }

    if (view) {
      if (playOptions.video) {
        this.videoView = view
        if (this._play && this.mediaHelper.video.videoStream.getVideoTracks().length) {
          this.logger.log(`play() uid ${this.stringStreamID} 开始启动视频播放 主流 本地`)
          try {
            await this._play.playVideoStream('video', this.mediaHelper.video.renderStream, view)
            if ('width' in this.renderMode.local.video) {
              this._play.setRender('video', this.renderMode.local.video)
            }
          } catch (error) {
            this.logger.log('play() 视频播放异常: ', error)
            throw error
          }
          // 重新开启视频后期处理
          await this.resumeVideoPostProcess()
        }
      }
      if (playOptions.screen) {
        this.screenView = view
        if (this._play && this.mediaHelper.screen.screenVideoStream.getVideoTracks().length) {
          this.logger.log(`play() uid ${this.stringStreamID} 开始启动视频播放 辅流 本地`)
          try {
            await this._play.playVideoStream('screen', this.mediaHelper.screen.renderStream, view)
            if ('width' in this.renderMode.local.screen) {
              this._play.setRender('screen', this.renderMode.local.screen)
            }
          } catch (error) {
            this.logger.log('play() 屏幕共享播放异常: ', error)
            throw error
          }
        }
      }
    }
    if (playOptions.audio) {
      const param: ReportParamEnableEarback = {
        enable: true
      }
      this.client.apiFrequencyControl({
        name: 'enableEarback',
        code: 0,
        param: JSON.stringify(param, null, ' ')
      })
    }

    this.client.apiFrequencyControl({
      name: 'play',
      code: 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          playOptions: playOptions,
          isRemote: false
        },
        null,
        ' '
      )
    })
  }

  /**
   * 恢复播放音视频流
   * @function resume
   * @memberOf Stream#
   * @return {Promise}
   */
  async resume() {
    if (this._play) {
      this.logger.log('resume() uid: ', this.stringStreamID)
      await this._play.resume()
    }
    this.client.apiFrequencyControl({
      name: 'resume',
      code: 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          isRemote: false
        },
        null,
        ' '
      )
    })
  }

  /**
   * 设置本端视频画面大小
   * @function setLocalRenderMode
   * @memberOf Stream#
   * @param {Object} options 配置对象
   * @param {Number }  options.width 宽度
   * @param {Number }  options.height 高度
   * @param {Boolean }  options.cut 是否裁剪
   * @returns {Void}
   */
  setLocalRenderMode(options: RenderMode, mediaType?: MediaTypeShort) {
    if (
      !options ||
      !isNumber(options.width) ||
      !isNumber(options.height) ||
      options.width < 0 ||
      options.height < 0
    ) {
      this.logger.warn('setLocalRenderMode() 参数宽高错误')
      this.client.apiFrequencyControl({
        name: 'setLocalRenderMode',
        code: -1,
        param: {
          streamID: this.stringStreamID,
          mediaType,
          ...options
        }
      })
      throw new RtcError({
        code: ErrorCode.STREAM_RENDER_ARGUMENT_ERROR,
        message: 'setLocalRenderMode() 参数宽高错误'
      })
    }
    this.logger.log(
      `setLocalRenderMode() uid ${this.stringStreamID} 设置本地视频播放窗口大小: `,
      mediaType || 'video+screen',
      JSON.stringify(options)
    )
    // mediaType不填则都设
    if (!mediaType || mediaType === 'video') {
      if (this._play) {
        this._play.setRender('video', options)
      }
      this.renderMode.local.video = options
      this.replaceCanvas()
    }
    if (!mediaType || mediaType === 'screen') {
      this.renderMode.local.screen = options
      if (this._play) {
        this._play.setRender('screen', options)
      }
    }
    this.client.apiFrequencyControl({
      name: 'setLocalRenderMode',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        mediaType,
        ...options
      }
    })
  }

  /**
   * 停止播放音视频流
   * @function stop
   * @memberOf Stream#
   * @return {Void}
   */
  stop(type?: MediaTypeShort) {
    this.logger.log(`stop() uid ${this.stringStreamID} 停止播放 ${type || '音视频流'}`)
    if (!this._play) return
    MediaTypeList.forEach((mediaType) => {
      if (!type || mediaType === type) {
        this._play.stopPlayStream(mediaType)
      }
    })
    this.client.apiFrequencyControl({
      name: 'stop',
      code: 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          isRemote: false,
          audio: this.audio,
          video: this.video,
          screen: this.screen,
          type
        },
        null,
        ' '
      )
    })
  }

  /**
   * 返回音视频流当前是否在播放状态
   * @function isPlaying
   * @memberOf Stream#
   * @param {string} type 查看的媒体类型： audio/video
   * @returns {Promise}
   */
  isPlaying(type: MediaTypeShort) {
    let isPlaying = false
    if (!this._play) {
    } else if (MediaTypeList.indexOf(type) > -1) {
      return this._play.isPlaying(type)
    } else {
      this.logger.warn('isPlaying() unknown type')
      throw new RtcError({
        code: ErrorCode.STREAM_ISPLAYING_ARGUMENT_ERROR,
        message: 'isPlaying() type 参数类型非法'
      })
    }
    this.client.apiFrequencyControl({
      name: 'isPlaying',
      code: 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          isRemote: false,
          type
        },
        null,
        ' '
      )
    })
    this.logger.log(`检查${this.stringStreamID}的${type}播放状态: ${isPlaying}`)
    return isPlaying
  }

  canPlay(mediaType: MediaTypeShort) {
    if (MediaTypeList.indexOf(mediaType) === -1) {
      return null
    } else {
      return this._play.canPlay(mediaType)
    }
  }

  /**
   * 打开音视频输入设备，如麦克风、摄像头、屏幕共享,并且发布出去
   * @function open
   * @memberOf Stream#
   * @param {Object} options 配置对象
   * @param {String }  options.type 媒体设备: audio/video/screen
   * @param {String }  options.deviceId 指定要开启的设备ID，通过getDevices接口获取到设备列表
   * @param {String }  options.sourceId 屏幕共享的数据源Id（electron用户可以自己获取）
   * @param {String }  options.facingMode 指定使用前置/后置摄像头来采集视频
   在移动设备上，可以设置该参数选择使用前置或后置摄像头：
   + "user"：前置摄像头
   + "environment"：后置摄像头
   * @returns {Promise}
   */
  async open(options: LocalStreamOpenOptions) {
    let {
      type,
      deviceId,
      sourceId,
      facingMode,
      screenAudio,
      audioSource,
      videoSource,
      screenAudioSource,
      screenVideoSource,
      enableMediaPub
    } = options

    let isPublish = typeof enableMediaPub === 'boolean' && enableMediaPub === false ? false : true

    const hookOpenFinished = await this.client.operationQueue.enqueue({
      caller: this,
      method: 'open',
      options: options
    })
    const onOpenFinished = (data: { code: number; param: {} }) => {
      hookOpenFinished()
      const param = makePrintable(Object.assign({}, options, data.param), 1)
      this.client.apiFrequencyControl({
        name: 'open',
        code: data.code,
        param: {
          streamID: this.stringStreamID,
          ...param
        }
      })
      this.client.apiFrequencyControl({
        name: '_trackSettings',
        code: data.code,
        param: JSON.stringify(this.mediaHelper.getTrackSettings())
      })
    }

    try {
      if (!this.getAdapterRef()) {
        this.logger.log('open(): 绑定 localStream ', type)
        this.client.bindLocalStream(this)
      }
      switch (type) {
        case 'audio':
          this.logger.log(`open(): 开启 ${audioSource ? audioSource.label : 'mic设备'}`)
          if (this.mediaHelper.audio.micTrack || this.mediaHelper.audio.audioSource) {
            this.logger.warn('open(): 请先关闭麦克风')
            onOpenFinished({
              code: -1,
              param: {
                reason: '重复打开麦克风',
                type
              }
            })
            return Promise.reject(
              new RtcError({
                code: ErrorCode.REPEAT_OPEN_MIC_ERROR,
                message: 'open() 重复打开麦克风'
              })
            )
          }
          this.audio = true
          if (this.mediaHelper) {
            const constraint = { audio: true, audioDeviceId: deviceId, audioSource }
            await this.mediaHelper.getStream(constraint)
            if (this.audioLevelHelper && this.mediaHelper.audio.audioStream) {
              this.audioLevelHelper.updateStream(this.mediaHelper.audio.audioStream)
            }
            if (deviceId) {
              this.microphoneId = deviceId
            }
            this.audioSource = audioSource || null
            if (this.client.adapterRef.connectState.curState !== 'CONNECTED') {
              this.logger.log('Stream.open:client不在频道中，无需发布。', constraint)
            } else if (isPublish) {
              this.logger.log('Stream.open:开始发布', constraint)
              await this.client.adapterRef._mediasoup?.createProduce(this, 'audio')
            }
          }
          break
        case 'screenAudio':
          if (!screenAudioSource) {
            this.logger.warn(`open(): 不允许单独开启屏幕共享音频功能。`)
            return
          }
          this.logger.log(`open(): 开启自定义屏幕共享音频 ${screenAudioSource.label}`)
          if (
            this.mediaHelper.screenAudio.screenAudioTrack ||
            this.mediaHelper.screenAudio.screenAudioSource
          ) {
            this.logger.warn('请先关闭屏幕共享音频')
            onOpenFinished({
              code: -1,
              param: {
                reason: '请先关闭屏幕共享音频',
                type
              }
            })
            return Promise.reject(
              new RtcError({
                code: ErrorCode.REPEAT_OPEN_AUDIO_SLAVE_ERROR,
                message: 'open() 重复打开屏幕共享音频'
              })
            )
          }
          this.screenAudio = true
          if (this.mediaHelper) {
            const constraint = { screenAudio: true, screenAudioSource }
            await this.mediaHelper.getStream(constraint)
            if (this.audioLevelHelperSlave && this.mediaHelper.screenAudio.screenAudioStream) {
              this.audioLevelHelperSlave.updateStream(
                this.mediaHelper.screenAudio.screenAudioStream
              )
            }
            if (this.client.adapterRef.connectState.curState !== 'CONNECTED') {
              this.logger.log('Stream.open:client不在频道中，无需发布。', constraint)
            } else if (isPublish) {
              this.logger.log('Stream.open:开始发布', constraint)
              await this.client.adapterRef._mediasoup?.createProduce(this, 'audioSlave')
            }
          }
          break
        case 'video':
        case 'screen':
          this.logger.log(`开启${type === 'video' ? 'camera' : 'screen'}设备`)
          if (this[type]) {
            const isVideo = type === 'video'
            this.logger.warn(`open() 请先关闭${isVideo ? '摄像头' : '屏幕共享'}`)
            this.client.apiFrequencyControl({
              name: 'open',
              code: -1,
              param: JSON.stringify(
                {
                  reason: `open() 重复打开${isVideo ? '摄像头' : '屏幕共享'}`,
                  type
                },
                null,
                ' '
              )
            })
            onOpenFinished({
              code: -1,
              param: {
                reason: `open() 重复打开${isVideo ? '摄像头' : '屏幕共享'}`,
                type
              }
            })
            return Promise.reject(
              new RtcError({
                code: isVideo
                  ? ErrorCode.REPEAT_OPEN_CAMERA_ERROR
                  : ErrorCode.REPEAT_OPEN_SCREEN_ERROR,
                message: `open() 重复打开${isVideo ? '摄像头' : '屏幕共享'}`
              })
            )
          }
          if (
            options.screenAudio &&
            (this.mediaHelper.screenAudio.screenAudioTrack ||
              this.mediaHelper.screenAudio.screenAudioSource)
          ) {
            this.logger.warn('open() 重复开启屏幕共享音频')
            onOpenFinished({
              code: -1,
              param: {
                reason: 'open() 重复开启屏幕共享音频',
                type
              }
            })
            return Promise.reject(
              new RtcError({
                code: ErrorCode.REPEAT_OPEN_AUDIO_SLAVE_ERROR,
                message: 'open() 重复开启屏幕共享音频'
              })
            )
          }
          this[type] = true
          const constraint: GetStreamConstraints = {
            videoDeviceId: deviceId,
            sourceId,
            videoSource,
            screenAudioSource,
            screenVideoSource,
            facingMode
          }
          constraint[type] = true
          if (type === 'screen' && options.screenAudio) {
            constraint.screenAudio = true
            this.screenAudio = true
          }
          await this.mediaHelper.getStream(constraint)
          this.videoSource = videoSource || null
          if (
            this.screenAudio &&
            this.audioLevelHelperSlave &&
            this.mediaHelper.screenAudio.screenAudioStream
          ) {
            this.audioLevelHelperSlave.updateStream(this.mediaHelper.screenAudio.screenAudioStream)
          }
          if (type === 'video' && this.mediaHelper.video.preProcessingEnabled) {
            this.mediaHelper.enablePreProcessing('video')
          }
          if (type === 'screen' && this.mediaHelper.screen.preProcessingEnabled) {
            this.mediaHelper.enablePreProcessing('screen')
          }
          if (deviceId) {
            if (type === 'video') {
              this.cameraId = deviceId
            }
          }

          if (this.client.adapterRef.connectState.curState !== 'CONNECTED') {
            this.logger.log('Stream.open:client不在频道中, 无需发布。', constraint)
          } else if (isPublish) {
            this.logger.log('Stream.open:开始发布', constraint)
            await this.client.adapterRef._mediasoup?.createProduce(this, type)
            if (options.screenAudio) {
              await this.client.adapterRef._mediasoup?.createProduce(this, 'audioSlave')
            }
          }
          break
        default:
          this.logger.warn('open() 非法参数')
          throw new RtcError({
            code: ErrorCode.STREAM_OPTN_NO_TYPE_ERROR,
            message: 'open() type 参数类型非法'
          })
      }
      onOpenFinished({
        code: 0,
        param: {
          type
        }
      })
    } catch (e: any) {
      if (['audio', 'video', 'screen'].indexOf(type) > -1) {
        this[type] = false
        if (type === 'screen' && options.screenAudio) {
          this.screenAudio = false
        }
      }
      this.logger.log(`${type} 开启失败: `, e.name, e.message)
      onOpenFinished({
        code: -1,
        param: {
          type,
          reason: e.message
        }
      })

      throw new RtcError({
        code: e.code || ErrorCode.MEDIA_DEVICE_ERROR,
        message: `${e.name} ${e.message}`
      })
    }
  }

  /**
   * 切换自定义辅流和屏幕共享流
   * @function switchScreenStream
   * @memberOf Stream#
   * @param {Object} option
   * @param {String} type  辅流类型，"screen": 屏幕共享，"custom": 自定义辅流
   * @param {MeidaTrack} option.screenVideoSource  自定义辅流的 screenTrack
   * @param {Boolean} option.screenAudio 是否开启屏幕共享声音
   * @return {Promise}
   */
  async switchScreenStream(option: { screenVideoSource: MediaStreamTrack | null }) {
    let newTrack: MediaStreamTrack | null = null
    let external = false
    let replaceResult: any = null
    let reason = ''
    if (option.screenVideoSource?.kind === 'video') {
      newTrack = option.screenVideoSource
      external = true
    } else {
      let screenSourceStream = await this.mediaHelper.getScreenSource({
        screen: this.screen
      })
      newTrack = screenSourceStream.getVideoTracks()[0]
    }
    if (newTrack) {
      replaceResult = await this.replaceTrack({
        mediaType: 'screen',
        track: newTrack,
        external
      })
      if (replaceResult) {
        this.client.adapterRef.logger.log(
          `switchScreenStream: 已从 ${replaceResult.external ? '自定义辅流' : '屏幕共享'} 切换到 ${
            external ? '自定义辅流' : '屏幕共享'
          }`
        )
        if (!replaceResult.external) {
          replaceResult.oldTrack.stop()
        }
      } else {
        reason = '当前没有screen流'
        this.client.adapterRef.logger.error(
          `switchScreenStream: 无法切换到${external ? '自定义辅流' : '屏幕共享'}: ${reason}`
        )
      }
    } else {
      reason = '无法获得新的screenVideoTrack'
      this.client.adapterRef.logger.error(`switchScreenStream: `, reason)
    }
    this.client.adapterRef.instance.apiEventReport('setFunction', {
      name: 'switch_to_custom_screen',
      oper: '1',
      param: reason || 'success'
    })
    this.client.apiFrequencyControl({
      name: 'switchScreenStream',
      code: reason ? -1 : 0,
      param: JSON.stringify(
        {
          external,
          reason
        },
        null,
        ' '
      )
    })
  }

  /**
   * 关闭音视频输入设备，如麦克风、摄像头、屏幕共享，并且停止发布
   * @function close
   * @memberOf Stream#
   * @param {Object} options 配置对象
   * @param {String }  options.type 媒体设备: audio/video/screen
   * @returns {Promise}
   */
  async close(options?: LocalStreamCloseOptions) {
    if (!options) {
      options = { type: 'all' }
    }
    const onCloseFinished = await this.client.operationQueue.enqueue({
      caller: this,
      method: 'close',
      options: options
    })
    let type = options.type
    let reason, message
    switch (type) {
      case 'audio':
        this.logger.log('close() 关闭mic设备')
        if (!this.audio) {
          reason = ErrorCode.STREAM_CLOSE_AUDIO_ERROR
          message = 'close() 没有开启过麦克风'
          break
        }
        this.audio = false
        this.mediaHelper.stopStream('audio')
        if (this.getAdapterRef()) {
          if (this.mediaHelper.getAudioInputTracks().length > 0) {
            this.logger.log('close() 关闭音频，保留发布：', type)
          } else {
            this.logger.log('close() 停止发布音频')
            await this.client.adapterRef._mediasoup?.destroyProduce('audio')
          }
        } else {
          this.logger.log('close() 未发布音频，无需停止发布')
        }
        this.audioSource = null
        break
      case 'screenAudio':
        this.logger.log('close() 关闭屏幕共享音频')
        if (!this.screenAudio) {
          reason = ErrorCode.STREAM_CLOSE_AUDIO_SLAVE_ERROR
          message = 'close() 没有开启过屏幕共享音频'
          break
        }
        this.screenAudio = false
        this.mediaHelper.stopStream('screenAudio')
        if (this.getAdapterRef()) {
          this.logger.log('close() 停止发布音频辅流')
          await this.client.adapterRef._mediasoup?.destroyProduce('audioSlave')
        } else {
          this.logger.log('close() 未发布音频，无需停止发布')
        }
        break
      case 'video':
        this.logger.log('close() 关闭camera设备')
        if (!this.video) {
          reason = ErrorCode.STREAM_CLOSE_CAMERA_ERROR
          message = 'close() 没有开启过摄像头'
          break
        }
        await this.suspendVideoPostProcess()
        // 释放当前 track
        if (this._transformedTrack && this._cameraTrack) {
          this._cameraTrack.stop()
          this._cameraTrack = null
        }
        if (this._transformedTrack) {
          this._transformedTrack.stop()
          this._transformedTrack = null
        }
        this.video = false
        this.mediaHelper.stopStream('video')
        if (this.mediaHelper.video.preProcessingEnabled) {
          //把预处理停了，但是保留flag以待下次开启
          this.mediaHelper.disablePreProcessing('video', true)
        }
        this?._play.stopPlayStream('video')
        if (!this.getAdapterRef()) {
          this.logger.log('close() 未发布视频，无需停止发布')
        } else {
          this.logger.log('close() 停止发布视频')
          await this.client.adapterRef._mediasoup?.destroyProduce('video')
        }
        // mute 状态下，关闭摄像头需要将相关标志位初始化
        if (this.replaceTags.isMuted) {
          this.replaceTags.isMuted = false
          this.virtualBackground.emptyFrame = false
        }
        this.videoSource = null
        break
      case 'screen':
        this.logger.log('close() 关闭屏幕共享')
        if (!this.screen) {
          reason = ErrorCode.STREAM_CLOSE_SCREEN_ERROR
          message = 'close() 没有开启过屏幕共享'
          break
        }
        this.screen = false
        if (this.mediaHelper.screen.preProcessingEnabled) {
          //把预处理停了，但是保留flag以待下次开启
          this.mediaHelper.disablePreProcessing('screen', true)
        }
        this.mediaHelper.stopStream('screen')
        this?._play.stopPlayStream('screen')
        if (!this.getAdapterRef()) {
          this.logger.log('Stream.close: 未发布辅流，无需停止发布')
        } else {
          this.logger.log('Stream.close: 停止发布辅流')
          await this.client.adapterRef._mediasoup?.destroyProduce('screen')
        }
        break
      case 'all':
        this.logger.log(
          `Stream.close:关闭所有设备: audio ${this.audio}, video ${this.video}, screen ${this.screen}, screenAudio ${this.screenAudio}`
        )
        this.audio && (await this.close({ type: 'audio' }))
        this.video && (await this.close({ type: 'video' }))
        this.screen && (await this.close({ type: 'screen' }))
        this.screenAudio && (await this.close({ type: 'screenAudio' }))
        this.logger.log(
          `Stream.close:关闭所有设备成功: audio ${this.audio}, video ${this.video}, screen ${this.screen}, screenAudio ${this.screenAudio}`
        )
        break
      default:
        reason = ErrorCode.STREAM_CLOSE_ARGUMENT_ERROR
        message = 'close() Unknown Type'
    }
    if (reason) {
      this.logger.error(message)
      this.client.apiFrequencyControl({
        name: 'close',
        code: -1,
        param: JSON.stringify(
          {
            reason: message,
            streamID: this.stringStreamID,
            audio: this.audio,
            video: this.video,
            screen: this.screen,
            type: options.type
          },
          null,
          ' '
        )
      })
      onCloseFinished()
      throw new RtcError({
        code: reason,
        message
      })
    } else {
      onCloseFinished()
      this.client.apiFrequencyControl({
        name: 'close',
        code: 0,
        param: JSON.stringify(
          {
            reason,
            streamID: this.stringStreamID,
            audio: this.audio,
            video: this.video,
            screen: this.screen,
            screenAudio: this.screenAudio,
            type: options.type
          },
          null,
          ' '
        )
      })
      return
    }
  }

  /**
   * 启用音频轨道
   * @function unmuteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteAudio() {
    this.logger.log('unmuteAudio() 启用音频轨道: ', this.stringStreamID)
    try {
      if (this.getAdapterRef()) {
        // unmuteLocalAudio1: unmute Mediasoup
        await this.client.adapterRef._mediasoup?.unmuteAudio()
      }
      // unmuteLocalAudio2: unmute发送track
      const tracks = this.mediaHelper.audio.audioStream.getAudioTracks()
      if (tracks && tracks.length) {
        tracks.forEach((track) => {
          track.enabled = true
        })
      }
      // unmuteLocalAudio3. unmute设备
      this.mediaHelper.getAudioInputTracks().forEach((track) => {
        track.enabled = true
      })

      // unmuteLocalAudio4. 混音的gainNode设为0（使getAudioLevel恢复）
      if (this.mediaHelper.audio.webAudio?.gainFilter) {
        this.mediaHelper.audio.webAudio.gainFilter.gain.value = 1
      }
      this.muteStatus.audio.send = false
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('unmuteAudio() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 禁用音频轨道
   * @function muteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteAudio() {
    this.logger.log('muteAudio() 禁用音频轨道: ', this.stringStreamID)

    try {
      // muteLocalAudio1: mute mediasoup
      if (this.getAdapterRef()) {
        await this.client.adapterRef._mediasoup?.muteAudio()
      }
      // muteLocalAudio2: mute发送的track
      const tracks = this.mediaHelper.audio.audioStream.getAudioTracks()
      if (tracks && tracks.length) {
        tracks.forEach((track) => {
          track.enabled = false
        })
      }
      // muteLocalAudio3: mute麦克风设备track
      this.mediaHelper.getAudioInputTracks().forEach((track) => {
        track.enabled = false
      })
      // muteLocalAudio4: 混音的gainNode设为0（使getAudioLevel为0）
      if (this.mediaHelper.audio.webAudio?.gainFilter) {
        this.mediaHelper.audio.webAudio.gainFilter.gain.value = 0
      }
      this.muteStatus.audio.send = true
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('muteAudio() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 启用音频轨道
   * @function unmuteAudioSlave
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteAudioSlave() {
    this.logger.log('unmuteAudioSlave() 启用音频辅流轨道: ', this.stringStreamID)
    try {
      if (this.getAdapterRef()) {
        // unmuteLocalAudio1: unmute Mediasoup
        await this.client.adapterRef._mediasoup?.unmuteAudioSlave()
      }
      // unmuteLocalAudio2: unmute发送track
      const tracks = this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks()
      if (tracks && tracks.length) {
        tracks.forEach((track) => {
          track.enabled = true
        })
      }

      this.muteStatus.audioSlave.send = false
      this.client.apiFrequencyControl({
        name: 'unmuteAudioSlave',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('unmuteAudioSlave() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'unmuteAudioSlave',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            reason: e
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 禁用音频轨道
   * @function muteAudioSlave
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteAudioSlave() {
    this.logger.log('muteAudioSlave() 禁用音频辅流轨道: ', this.stringStreamID)

    try {
      // muteLocalAudio1: mute mediasoup
      if (this.getAdapterRef()) {
        await this.client.adapterRef._mediasoup?.muteAudioSlave()
      }
      // muteLocalAudio2: mute发送的track
      const tracks = this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks()
      if (tracks && tracks.length) {
        tracks.forEach((track) => {
          track.enabled = false
        })
      }
      this.muteStatus.audioSlave.send = true
      this.client.apiFrequencyControl({
        name: 'muteAudioSlave',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('muteAudioSlave() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'muteAudioSlave',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            reason: e
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 当前Stream是否有音频
   * @function hasAudio
   * @memberOf Stream#
   * @return {Boolean}
   */
  hasAudio() {
    return this.mediaHelper.getAudioInputTracks().length > 0
  }

  /**
   * 当前Stream是否有音频
   * @function hasAudioSlave
   * @memberOf Stream#
   * @return {Boolean}
   */
  hasAudioSlave() {
    return this.mediaHelper.getAudioSlaveInputTracks().length > 0
  }

  /**
   * 当前从麦克风中采集的音量
   * @function getAudioLevel
   * @memberOf Stream#
   * @return {volume}
   */
  getAudioLevel(mediaType: 'audio' | 'audioSlave' = 'audio') {
    let normalizedAudioLevel = 0
    if (mediaType === 'audio') {
      if (!this.audioLevelHelper && this.mediaHelper.audio.audioStream.getAudioTracks().length) {
        // 为不支持getAudioLevel的环境做出提示
        // 由于getAudioLevle是高频调用API，所以仅在第一次调用时抛出错误事件
        const context = getAudioContext()
        if (!context || !context.audioWorklet || !context.audioWorklet.addModule) {
          this.logger.error(`getAudioLevel is not supported in this browser`)
          this.client.safeEmit('error', 'AUDIOLEVEL_NOT_SUPPORTED')
        }
        this.audioLevelHelper = new AudioLevel({
          stream: this.mediaHelper.audio.audioStream,
          logger: this.logger
        })
      }
      normalizedAudioLevel = this.audioLevelHelper?.getAudioLevel() || normalizedAudioLevel
    } else {
      if (
        !this.audioLevelHelperSlave &&
        this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks().length
      ) {
        this.audioLevelHelperSlave = new AudioLevel({
          stream: this.mediaHelper.screenAudio.screenAudioStream,
          logger: this.logger
        })
      }
      normalizedAudioLevel = this.audioLevelHelperSlave?.getAudioLevel() || normalizedAudioLevel
    }
    switch (getParameters().audioLevelFittingAlgorithm) {
      case 'classic':
        return normalizedAudioLevel
      case 'linear':
        return Math.max(0, Math.min(100, Math.round(normalizedAudioLevel * 200)))
      case 'log2':
        return Math.max(
          0,
          Math.min(100, Math.round(8.638 * Math.log2(normalizedAudioLevel) + 97.244))
        )
    }
  }

  /**
   * 当前从麦克风中采集的音量
   * @function getAudioLevel
   * @memberOf Stream#
   * @return {volume}
   */
  getAudioSlaveLevel() {
    return this.mediaHelper.getGain()
  }

  /**
   * 设置音频属性
   * @function setAudioProfile
   * @memberOf Stream#
   * @param {String} profile 要设置的音频的属性：speech_low_quality（表示16 kHz 采样率，单声道，编码码率约 24 Kbps）、speech_standard'（表示32 kHz 采样率，单声道，编码码率约 24 Kbps）、music_standard（表示48 kHz 采样率，单声道，编码码率约 40 Kbps）、standard_stereo（表达48 kHz 采样率，双声道，编码码率约 64 Kbps）、high_quality（表示48 kHz 采样率，单声道， 编码码率约 128 Kbps）、high_quality_stereo（表示48 kHz 采样率，双声道，编码码率约 192 Kbps）
   * @return {Void}
   */
  setAudioProfile(profile: AudioProfileTypes) {
    checkValidEnum({
      tag: 'LocalStream.setAudioProfile',
      value: profile,
      enums: AudioProfile
    })
    this.logger.log('setAudioProfile() 设置音频属性: ', profile)
    this.audioProfile = profile
    this.client.apiFrequencyControl({
      name: 'setAudioProfile',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        profile
      }
    })
  }

  setAudioProcessing(mediaType: 'audio' | 'audioSlave', constraintInput: AudioProcessingOptions) {
    checkValidEnum({
      tag: 'LocalStream.setAudioProcessing',
      value: mediaType,
      enums: MediaTypeList
    })
    const prevConstraint = this.constraintSettings[mediaType]
    const constraint = Object.assign({}, prevConstraint, constraintInput)
    this.constraintSettings[mediaType] = constraint

    this.logger.log(
      `setAudioProcessing ${mediaType} ` +
        `${JSON.stringify(prevConstraint)} => ${JSON.stringify(constraint)}`
    )
    if (
      (mediaType === 'audio' && this.mediaHelper.getAudioInputTracks().length) ||
      (mediaType === 'audioSlave' &&
        this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks().length)
    ) {
      this.logger.warn(`setAudioProcessing：当前已有开启音频。3A开关设置仅在重启音频后生效`)
      this.client.apiFrequencyControl({
        name: 'setAudioProcessing',
        code: -1,
        param: JSON.stringify(constraintInput)
      })
    } else {
      this.client.apiFrequencyControl({
        name: 'setAudioProcessing',
        code: 0,
        param: JSON.stringify(constraintInput)
      })
    }
    return this.mediaHelper.getAudioConstraints(mediaType)
  }

  /**
   * 设置音频播放的音量。
   * @function setAudioVolume
   * @memberOf Stream#
   * @param {Number} volume 要设置的远端音频的播放音量，范围为 0（静音）到 100（声音最大）
   * @return {Promise}
   */
  setAudioVolume(volume = 100) {
    let errcode, message
    if (!Number.isInteger(volume) || volume < 0 || volume > 100) {
      errcode = ErrorCode.SET_AUDIO_VOLUME_ARGUMENTS_ERROR
      message = 'setAudioVolume() volume 应该为 0 - 100 的整数'
    }

    const normalizedVolume = volume / 100
    this.logger.log(
      `setAudioVolume() 调节${this.stringStreamID}的音量大小: ${
        volume * 2.55
      } (normalized: ${normalizedVolume})`
    )

    if (this.audio) {
      this._play?.setPlayVolume('audio', normalizedVolume)
    } else {
      message = 'setAudioVolume() 没有音频流，请检查是否有发布过音频'
      errcode = ErrorCode.SET_AUDIO_VOLUME_ERROR
    }
    this.client.apiFrequencyControl({
      name: 'setAudioVolume',
      code: errcode ? -1 : 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: false,
        // 历史问题：上报会上报一个0-255的值。新版请多参考normalized值
        volume: volume * 2.55,
        normalizedVolume,
        reason: message
      }
    })
    if (errcode) {
      this.logger.error(message)
      throw new RtcError({
        code: errcode,
        message
      })
    }
  }

  /**
   * 设置麦克风采集的音量。
   * @function setCaptureVolume
   * @memberOf Stream#
   * @param {Number} volume 要设置的麦克风采集音量。，范围为 0（静音）到 100（声音最大）
   * @return {Void}
   */
  setCaptureVolume(volume: number, audioType?: 'microphone' | 'screenAudio') {
    let errcode, message
    if (!Number.isInteger(volume)) {
      errcode = ErrorCode.SET_CAPTURE_VOLUME_ARGUMENTS_ERROR
      message = 'setCaptureVolume() volume 应该为 0 - 100 的整数'
    } else if (volume < 0 || volume > 100) {
      errcode = ErrorCode.STREAM_SET_CAPTURE_VOLUME_ARGUMENT_ERROR
      message = 'setCaptureVolume() volume 应该为 0 - 100 的整数'
    }
    this.client.apiFrequencyControl({
      name: 'setCaptureVolume',
      code: errcode ? -1 : 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          audioType,
          volume
        },
        null,
        ' '
      )
    })
    if (errcode) {
      this.logger.error(message)
      throw new RtcError({
        code: errcode,
        message
      })
    }
    this.logger.log(`setCaptureVolume() 调节${this.stringStreamID}的音量大小: ${volume}`)
    if (!this.mediaHelper.audio.audioRoutingEnabled) {
      this.mediaHelper.enableAudioRouting()
    }
    this.mediaHelper.setGain(volume / 100, audioType)
  }

  /**
   * 设置音频输出设备，
   * @function setAudioOutput
   * @memberOf Stream#
   * @description 可以在麦克风和扬声器之间切换。在播放订阅流之前或之后都可以调用该方法。
   * 目前只有 Chrome 49 以上的浏览器支持该方法。
   * @param deviceId 设备的 ID,可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
   * @return {Promise}
   */
  async setAudioOutput(deviceId: string, callback: (err: any) => void) {
    if (this._play) {
      try {
        await this._play.setAudioOutput(deviceId)
      } catch (e: any) {
        if (callback) {
          setTimeout(() => {
            callback(e)
          }, 0)
        }
        this.logger.error('设置输出设备失败', e.name, e.message)
        throw new RtcError({
          code: ErrorCode.SET_AUDIO_OUTPUT_ERROR,
          message: e.message || '系统内部错误'
        })
      }
      if (callback) {
        setTimeout(callback, 0)
      }
    }
    this.client.apiFrequencyControl({
      name: 'setAudioOutput',
      code: 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          deviceId,
          isRemote: false
        },
        null,
        ' '
      )
    })
  }

  /**
   * 切换媒体输入设备，已经发布的流，切换后不用重新发流
   * @function switchDevice
   * @memberOf Stream#
   * @param {String} type 设备的类型，"audio": 音频输入设备，"video": 视频输入设备
   * @param {String} deviceId 设备的 ID,可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
   * @return {Promise}
   */
  async switchDevice(type: 'audio' | 'video', deviceId: string) {
    this.logger.log(`switchDevice() 切换媒体输入设备: ${type}, deviceId: ${deviceId}`)
    let constraint = {}
    let errcode, message
    if (this.inSwitchDevice[type]) {
      message = `switchDevice() 正在切换中, 重复切换 ${type}`
      errcode = ErrorCode.SWITCH_DEVICE_REPEAT_ERROR
    } else {
      this.inSwitchDevice[type] = true
    }
    if (type === 'audio') {
      const micTrack = this.mediaHelper.audio.micTrack
      let micId
      if ('getSettings' in MediaStreamTrack.prototype) {
        micId = micTrack?.getSettings().deviceId
      } else {
        //@ts-ignore
        micId = micTrack?.getConstraints()?.deviceId?.exact
      }
      if (micTrack?.readyState === 'live' && micId === deviceId) {
        this.logger.warn(`switchDevice() 切换相同的麦克风设备，不处理`)
        return
      } else if (!this.hasAudio()) {
        message = `switchDevice() 当前没有开启音频输入设备，无法切换`
        errcode = ErrorCode.SWITCH_DEVICE_NO_MIC_ERROR
      } else if (this.audioSource) {
        message = `switchDevice() 自定义音频输入不支持，无法切换`
        errcode = ErrorCode.SWITCH_DEVICE_NO_SUPPORT_AUDIO
      }
      if (errcode) {
        this.logger.error(message)
        this.inSwitchDevice[type] = false
        this.client.apiFrequencyControl({
          name: 'switchDevice',
          code: -1,
          param: {
            reason: message,
            type,
            deviceId,
            streamID: this.stringStreamID
          }
        })
        throw new RtcError({
          code: errcode,
          message
        })
      }

      if (this.mediaHelper.audio.micConstraint && this.mediaHelper.audio.micConstraint.audio) {
        this.mediaHelper.audio.micConstraint.audio.deviceId = { exact: deviceId }
      } else if (this.mediaHelper.audio.micConstraint) {
        this.mediaHelper.audio.micConstraint.audio = {}
        this.mediaHelper.audio.micConstraint.audio.deviceId = { exact: deviceId }
      } else {
        this.mediaHelper.audio.micConstraint = { audio: { deviceId: { exact: deviceId } } }
      }
      constraint = this.mediaHelper.audio.micConstraint
      this.microphoneId = deviceId
    } else if (type === 'video') {
      const cameraTrack = this.mediaHelper.video.cameraTrack
      // 关闭视频后期处理
      await this.suspendVideoPostProcess()

      //关闭美颜track, 切换后的回调中再重新开启美颜
      if (this._transformedTrack) {
        this._transformedTrack.stop()
        this._transformedTrack = null
      }
      let camId
      if ('getSettings' in MediaStreamTrack.prototype) {
        camId = cameraTrack?.getSettings().deviceId
      } else {
        //@ts-ignore
        camId = cameraTrack?.getConstraints()?.deviceId?.exact
      }
      if (cameraTrack?.readyState === 'live' && camId === deviceId) {
        this.logger.log('switchDevice() 切换相同的摄像头设备，不处理')
        this.inSwitchDevice[type] = false
        return
      } else if (!this.hasVideo()) {
        message = `switchDevice() 当前没有开启视频输入设备，无法切换`
        errcode = ErrorCode.SWITCH_DEVICE_NO_CAMERA_ERROR
      } else if (this.videoSource) {
        message = `switchDevice() 自定义视频输入不支持切换`
        errcode = ErrorCode.SWITCH_DEVICE_NO_SUPPORT_VIDEO
      }
      if (errcode) {
        this.logger.error(message)
        this.inSwitchDevice[type] = false
        this.client.apiFrequencyControl({
          name: 'switchDevice',
          code: -1,
          param: {
            reason: message,
            type,
            deviceId,
            streamID: this.stringStreamID
          }
        })
        return Promise.reject(
          new RtcError({
            code: errcode,
            message
          })
        )
      }
      if (
        this.mediaHelper.video.cameraConstraint &&
        this.mediaHelper.video.cameraConstraint.video
      ) {
        this.mediaHelper.video.cameraConstraint.video.deviceId = { exact: deviceId }
        constraint = this.mediaHelper.video.cameraConstraint
      }
      this.cameraId = deviceId
      // mute 状态下，切换摄像头需要将相关标志位初始化
      if (this.replaceTags.isMuted) {
        this.replaceTags.isMuted = false
        this.virtualBackground.emptyFrame = false
      }
    } else {
      this.logger.error(`switchDevice() type参数错误: ${type}`)
      return Promise.reject(
        new RtcError({
          code: ErrorCode.SWITCH_DEVICE_REPEAT_ARGUMENTS_ERROR,
          message: `switchDevice() type参数错误: ${type}`
        })
      )
    }
    try {
      const preProcessingEnabled = this.mediaHelper.video.preProcessingEnabled
      if (preProcessingEnabled) {
        this.mediaHelper.disablePreProcessing('video')
      }
      await this.mediaHelper.getSecondStream(constraint)
      this.inSwitchDevice[type] = false
      if (preProcessingEnabled) {
        this.mediaHelper.enablePreProcessing('video')
      }
      if (type === 'video') {
        await this.resumeVideoPostProcess()
      }
      if (type === 'audio' && this.audioLevelHelper) {
        this.audioLevelHelper.updateStream(this.mediaHelper.audio.audioStream)
      }
      this.client.apiFrequencyControl({
        name: 'switchDevice',
        code: 0,
        param: {
          type,
          deviceId,
          streamID: this.stringStreamID
        }
      })
      this.client.apiFrequencyControl({
        name: '_trackSettings',
        code: 0,
        param: JSON.stringify(this.mediaHelper.getTrackSettings())
      })
      this._play.resume()
    } catch (e: any) {
      this.logger.error('switchDevice() 异常：', e.name, e.message, e)
      this.inSwitchDevice[type] = false
      this.client.apiFrequencyControl({
        name: 'switchDevice',
        code: -1,
        param: {
          reason: e.message,
          type,
          deviceId,
          streamID: this.stringStreamID
        }
      })
      this.client.apiFrequencyControl({
        name: '_trackSettings',
        code: 0,
        param: JSON.stringify(this.mediaHelper.getTrackSettings())
      })
      throw new RtcError({
        code: e.code || ErrorCode.UNKNOWN_TYPE_ERROR,
        message: e.message || e.name
      })
    }
  }

  /**
   * 启用视频轨道
   * @function unmuteVideo
   * @memberOf Stream#
   * @return {Promise}
   */

  async unmuteVideo() {
    this.logger.log(`unmuteVideo() 启用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (this.virtualBackground) {
        this.virtualBackground.emptyFrame = false
      }
      if (this.getAdapterRef()) {
        this.client.adapterRef._mediasoup?.unmuteVideo()
      }
      if (this.mediaHelper.video.videoSource) {
        this.mediaHelper.video.videoSource.enabled = true
      }
      if (this.mediaHelper.video.cameraTrack) {
        this.mediaHelper.video.cameraTrack.enabled = true
      }
      // 避免在 mute 状态下，开启美颜功能，导致原始track被禁用后无法重新开启的问题
      if (this.videoPostProcess.sourceTrack) {
        this.videoPostProcess.sourceTrack.enabled = true
      }
      if (env.IS_SAFARI) {
        const videoDom = this._play?.video.containerDom
        if (videoDom) {
          videoDom.style.backgroundColor = ''
        }
      }
      this.muteStatus.video.send = false
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false
          },
          null,
          ' '
        )
      })
      this.replaceTags.isMuted = false
    } catch (e: any) {
      this.logger.error('unmuteVideo() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 禁用视频轨道
   * @function muteVideo
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteVideo() {
    this.logger.log(`muteVideo() 禁用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (this.virtualBackground) {
        this.virtualBackground.emptyFrame = true
      }
      if (env.IS_SAFARI) {
        const videoDom = this._play?.video.dom
        if (videoDom) {
          videoDom.style.backgroundColor = 'black'
        }
      }
      if (this.getAdapterRef()) {
        await this.client.adapterRef._mediasoup?.muteVideo()
      }
      if (this.mediaHelper.video.videoSource) {
        this.mediaHelper.video.videoSource.enabled = false
      }
      if (this.mediaHelper.video.cameraTrack) {
        this.mediaHelper.video.cameraTrack.enabled = false
      }
      if (this.videoPostProcess.sourceTrack) {
        this.videoPostProcess.sourceTrack.enabled = false
      }
      this.muteStatus.video.send = true
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false
          },
          null,
          ' '
        )
      })
      this.replaceTags.isMuted = true
    } catch (e: any) {
      this.logger.error('muteVideo() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            reason: e.message
          },
          null,
          ' '
        )
      })
      this.replaceTags.isMuted = false
    }
  }

  /**
   * 启用视频轨道
   * @function unmuteScreen
   * @memberOf Stream#
   * @return {Promise}
   */

  async unmuteScreen() {
    this.logger.log(`unmuteScreen() 启用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (this.getAdapterRef()) {
        this.client.adapterRef._mediasoup?.unmuteScreen()
      }
      if (this.mediaHelper.screen.screenVideoTrack) {
        this.mediaHelper.screen.screenVideoTrack.enabled = true
      }
      if (this.mediaHelper.screen.screenVideoSource) {
        this.mediaHelper.screen.screenVideoSource.enabled = true
      }
      // local unmute
      this.muteStatus.screen.send = false
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('unmuteScreen() 异常: ', e.name, e.message)
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 禁用视频轨道
   * @function muteScreen
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteScreen() {
    this.logger.log(`muteScreen() 禁用 ${this.stringStreamID} 的辅流轨道`)
    try {
      // local mute
      if (this.getAdapterRef()) {
        await this.client.adapterRef._mediasoup?.muteScreen()
      }
      if (this.mediaHelper.screen.screenVideoSource) {
        this.mediaHelper.screen.screenVideoSource.enabled = false
      }
      if (this.mediaHelper.screen.screenVideoTrack) {
        this.mediaHelper.screen.screenVideoTrack.enabled = false
      }
      this.muteStatus.screen.send = true
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('muteScreen() ', e.message)
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 获取视频 flag
   * @function hasVideo
   * @return {Boolean}
   */
  hasVideo() {
    this.logger.log('hasVideo()')
    return this.mediaHelper.video.videoStream.getVideoTracks().length > 0
  }

  /**
   * 设置视频属性。
   * @method setVideoProfile
   * @memberOf Stream#
   * @param {Object} options 配置参数
   * @param {Number} [options.resolution] 设置本端视频分辨率：NERTC.VIDEO_QUALITY_180p、NERTC.VIDEO_QUALITY_480p、NERTC.VIDEO_QUALITY_720p、NERTC.VIDEO_QUALITY_1080p
   * @param {Number} [options.frameRate] 设置本端视频帧率：NERTC.CHAT_VIDEO_FRAME_RATE_5、NERTC.CHAT_VIDEO_FRAME_RATE_10、NERTC.CHAT_VIDEO_FRAME_RATE_15、NERTC.CHAT_VIDEO_FRAME_RATE_20、NERTC.CHAT_VIDEO_FRAME_RATE_25
   * @returns {Null}
   */
  async setVideoProfile(options: VideoProfileOptions) {
    if (options.resolution > -1) {
      this.videoProfile.resolution = options.resolution
    }
    if (options.frameRate > -1) {
      this.videoProfile.frameRate = options.frameRate
    }
    this.mediaHelper.video.captureConfig.high = this.mediaHelper.convert(this.videoProfile)
    this.mediaHelper.video.encoderConfig.high.maxBitrate =
      this.getVideoBW(this.videoProfile) || this.mediaHelper.video.encoderConfig.high.maxBitrate
    this.logger.log(
      `setVideoProfile() options: ${JSON.stringify(options)}, 视频采集参数: ${JSON.stringify(
        this.mediaHelper.video.captureConfig.high
      )}, 编码参数: ${JSON.stringify(this.mediaHelper.video.encoderConfig.high)}`
    )
    this.client.adapterRef.channelInfo.sessionConfig.maxVideoQuality =
      NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p
    this.client.adapterRef.channelInfo.sessionConfig.videoQuality = this.videoProfile.resolution
    this.client.adapterRef.channelInfo.sessionConfig.videoFrameRate = this.videoProfile.frameRate
    let cameraTrack = this.mediaHelper.video.cameraTrack
    if (this.videoPostProcess.hasAnyTask) {
      this.logger.log(`setVideoProfile() 侦测到美颜在开启状态`)
      cameraTrack = this.videoPostProcess.sourceTrack
    }

    if (cameraTrack) {
      try {
        this.logger.log(`setVideoProfile() 尝试动态修改分辨率【${cameraTrack.label}】`)
        await applyResolution({
          track: cameraTrack,
          targetWidth: this.mediaHelper.video.captureConfig.high.width,
          targetHeight: this.mediaHelper.video.captureConfig.high.height,
          keepAspectRatio: getParameters().keepAspectRatio,
          logger: this.logger
        })
        let settings
        // chrome 59+ 以上才支持 getSettings
        if (cameraTrack && 'getSettings' in MediaStreamTrack.prototype) {
          settings = cameraTrack.getSettings()
        } else {
          settings = cameraTrack.getConstraints()
        }
        if (settings.width && settings.height) {
          this.mediaHelper.video.cameraConstraint.video.width = settings.width
          this.mediaHelper.video.cameraConstraint.video.height = settings.height
        }
      } catch (e: any) {
        this.logger.error(`setVideoProfile() 无法设置动态分辨率:`, e.name, e.message)
      }
    }
    const sender = this.getSender('video', 'high')
    if (sender) {
      const parameters: RTCRtpParameters = sender.getParameters()
      // @ts-ignore
      const encodings: RTCRtpEncodingParameters = parameters.encodings && parameters.encodings[0]
      if (encodings?.maxBitrate !== this.mediaHelper.video.encoderConfig.high.maxBitrate) {
        this.logger.log(
          `setVideoProfile() 调整上行码率 ${encodings.maxBitrate} => ${this.mediaHelper.video.encoderConfig.high.maxBitrate}`
        )
        encodings.maxBitrate = this.mediaHelper.video.encoderConfig.high.maxBitrate
        try {
          sender.setParameters(parameters)
        } catch (e: any) {
          this.logger.warn(`setVideoProfile() 无法调整上行码率: `, e.name, e.message)
        }
      }
    }
    this.client.apiFrequencyControl({
      name: 'setVideoProfile',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        ...options
      }
    })
    this.replaceCanvas()
  }

  //编码策略
  setVideoEncoderConfiguration(options: {
    mediaType: 'video' | 'screen'
    streamType: 'high' | 'low'
    maxBitrate: number
    contentHint?: '' | 'motion' | 'detail'
  }) {
    options.mediaType = options.mediaType || 'video'
    options.streamType = options.streamType || 'high'
    this.logger.log('setVideoEncoderConfiguration() 自定义视频编码配置: ', options)
    if (!this.mediaHelper[options.mediaType].encoderConfig[options.streamType]) {
      this.logger.warn(
        'setVideoEncoderConfiguration() 无法识别的媒体类型：',
        options.mediaType,
        options.streamType
      )
    } else {
      if (options.maxBitrate) {
        const maxBitrate = options.maxBitrate * 1000
        this.logger.log(
          `setVideoEncoderConfiguration() 设置maxBitrate ${options.mediaType} ${
            options.streamType
          } ${
            this.mediaHelper[options.mediaType].encoderConfig[options.streamType].maxBitrate
          } => ${maxBitrate}`
        )
        this.mediaHelper[options.mediaType].encoderConfig[options.streamType].maxBitrate =
          maxBitrate
      } else {
        this.logger.log(
          'setVideoEncoderConfiguration:未设定maxBitrate。保留目前的值: ',
          options.mediaType,
          options.streamType,
          this.mediaHelper[options.mediaType].encoderConfig[options.streamType].maxBitrate
        )
      }
      if (typeof options.contentHint === 'string') {
        this.logger.log(
          `setVideoEncoderConfiguration: 应用 contentHint ${options.mediaType} ${
            options.streamType
          } ${
            this.mediaHelper[options.mediaType].encoderConfig[options.streamType].contentHint
          } => ${options.contentHint}`
        )
        this.mediaHelper[options.mediaType].encoderConfig[options.streamType].contentHint =
          options.contentHint
      } else {
        this.logger.log(
          'setVideoEncoderConfiguration: 未设定 contentHint。保留目前的值：',
          options.mediaType,
          options.streamType,
          this.mediaHelper[options.mediaType].encoderConfig[options.streamType].contentHint
        )
      }
    }
    if (this.getSender(options.mediaType, options.streamType)) {
      // 如果当前正在发送，则直接应用最新码率
      this.applyEncoderConfig(options.mediaType, options.streamType)
    }
    this.client.apiFrequencyControl({
      name: 'setVideoEncoderConfiguration',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        options
      }
    })
  }

  async replaceTrack(options: {
    mediaType: 'video' | 'screen'
    track: MediaStreamTrack
    external: boolean
  }) {
    let oldTrack
    let external = false // 被替换的流是否是外部流
    let preProcessingEnabled = false
    let preProcessingMediaType: 'video' | 'screen' = 'video'
    if (options.mediaType === 'screen') {
      preProcessingEnabled = this.mediaHelper.screen.preProcessingEnabled
      preProcessingMediaType = options.mediaType
      if (preProcessingEnabled) {
        this.mediaHelper.disablePreProcessing('screen')
      }
      if (this.mediaHelper.screen.screenVideoTrack) {
        oldTrack = this.mediaHelper.screen.screenVideoTrack
        this.mediaHelper.screen.screenVideoTrack = null
      } else if (this.mediaHelper.screen.screenVideoSource) {
        external = true
        oldTrack = this.mediaHelper.screen.screenVideoSource
        this.mediaHelper.screen.screenVideoSource = null
      }
      if (oldTrack) {
        if (options.external) {
          this.mediaHelper.screen.screenVideoSource = options.track
        } else {
          this.mediaHelper.screen.screenVideoTrack = options.track
        }
        emptyStreamWith(this.mediaHelper.screen.screenVideoStream, options.track)
        emptyStreamWith(this.mediaHelper.screen.renderStream, options.track)
        if (
          this.mediaHelper.screen.screenVideoStream.getVideoTracks().length &&
          typeof this.mediaHelper.screen.encoderConfig.high.contentHint === 'string' &&
          // @ts-ignore
          this.mediaHelper.screen.screenVideoStream.getVideoTracks()[0].contentHint !==
            this.mediaHelper.screen.encoderConfig.high.contentHint
        ) {
          this.logger.log(
            `应用 contentHint screen high`,
            this.mediaHelper.screen.encoderConfig.high.contentHint
          )
          // @ts-ignore
          this.mediaHelper.screen.screenVideoStream.getVideoTracks()[0].contentHint =
            this.mediaHelper.screen.encoderConfig.high.contentHint
        }
      }
    } else if (options.mediaType === 'video') {
      const preProcessingEnabled = this.mediaHelper.video.preProcessingEnabled
      preProcessingMediaType = options.mediaType
      if (preProcessingEnabled) {
        this.mediaHelper.disablePreProcessing('video')
      }
      if (this.mediaHelper.video.cameraTrack) {
        oldTrack = this.mediaHelper.video.cameraTrack
        this.mediaHelper.video.cameraTrack = null
      } else if (this.mediaHelper.video.videoSource) {
        external = true
        oldTrack = this.mediaHelper.video.videoSource
        this.mediaHelper.video.videoSource = null
      }
      if (oldTrack) {
        if (options.external) {
          this.mediaHelper.video.videoSource = options.track
        } else {
          this.mediaHelper.video.cameraTrack = options.track
        }
        emptyStreamWith(this.mediaHelper.video.videoStream, options.track)
        emptyStreamWith(this.mediaHelper.video.renderStream, options.track)
        if (
          this.mediaHelper.video.videoStream.getVideoTracks().length &&
          typeof this.mediaHelper.video.encoderConfig.high.contentHint === 'string' &&
          // @ts-ignore
          this.mediaHelper.video.videoStream.getVideoTracks()[0].contentHint !==
            this.mediaHelper.video.encoderConfig.high.contentHint
        ) {
          this.logger.log(
            `replaceTrack() 应用 contentHint video high`,
            this.mediaHelper.video.encoderConfig.high.contentHint
          )
          // @ts-ignore
          this.mediaHelper.video.videoStream.getVideoTracks()[0].contentHint =
            this.mediaHelper.video.encoderConfig.high.contentHint
        }
        if (this.mediaHelper.video.preProcessingEnabled) {
          this.mediaHelper.enablePreProcessing('video')
        }
      }
    }
    if (oldTrack) {
      this.logger.log(
        `replaceTrack ${options.mediaType}【external: ${external} ${oldTrack.label}】=>【external: ${options.external} ${options.track.label}】`
      )
      watchTrack(options.track)
      this.mediaHelper.listenToTrackEnded(options.track)
    } else {
      this.logger.error(`replaceTrack() ${options.mediaType} 当前没有可替换的流`)
      return null
    }
    if (preProcessingEnabled) {
      this.mediaHelper.enablePreProcessing(preProcessingMediaType)
    } else {
      const sender = this.getSender(options.mediaType, 'high')
      if (sender) {
        sender.replaceTrack(options.track)
        this.logger.log(`replaceTrack() ${options.mediaType} 成功替换上行`)
      }
    }
    if (this.replaceTags.isMuted) {
      if (this.mediaHelper.video.cameraTrack) {
        this.mediaHelper.video.cameraTrack.enabled = false
      }
    }

    return {
      oldTrack,
      external
    }
  }

  hasScreen() {
    return this.mediaHelper.screen.screenVideoStream.getVideoTracks().length > 0
  }

  /**
   * 设置屏幕共享属性。
   * @method setScreenProfile
   * @memberOf Stream#
   * @param {Object} options 配置参数
   * @param {String} [options.resolution] 设置本端屏幕共享分辨率：NERTC.VIDEO_QUALITY_480p、NERTC.VIDEO_QUALITY_720p、NERTC.VIDEO_QUALITY_1080p
   * @param {String} [options.frameRate] 设置本端视频帧率：NERTC.CHAT_VIDEO_FRAME_RATE_5、NERTC.CHAT_VIDEO_FRAME_RATE_10、NERTC.CHAT_VIDEO_FRAME_RATE_15、NERTC.CHAT_VIDEO_FRAME_RATE_20、NERTC.CHAT_VIDEO_FRAME_RATE_25
   * @returns {Void}
   */
  setScreenProfile(profile: ScreenProfileOptions) {
    if (profile.frameRate > -1) {
      this.screenProfile.frameRate = profile.frameRate
    }
    if (profile.resolution > -1) {
      this.screenProfile.resolution = profile.resolution
    }
    this.mediaHelper.screen.captureConfig.high = this.mediaHelper.convert(this.screenProfile)
    this.mediaHelper.screen.encoderConfig.high.maxBitrate = this.getVideoBW(this.screenProfile)
    this.logger.log(
      `setScreenProfile() profile: ${JSON.stringify(profile)}, 屏幕共享采集参数: ${JSON.stringify(
        this.mediaHelper.screen.captureConfig.high
      )}, 编码参数: ${JSON.stringify(this.mediaHelper.screen.encoderConfig.high)}`
    )
    this.client.adapterRef.channelInfo.sessionConfig.screenQuality = profile
    if (this.mediaHelper.screen.screenVideoTrack) {
      applyResolution({
        track: this.mediaHelper.screen.screenVideoTrack,
        targetWidth: this.mediaHelper.screen.captureConfig.high.width,
        targetHeight: this.mediaHelper.screen.captureConfig.high.height,
        keepAspectRatio: getParameters().keepAspectRatio,
        logger: this.logger
      })
    }

    const sender = this.getSender('screen', 'high')
    if (sender) {
      const parameters: RTCRtpParameters = sender.getParameters()
      // @ts-ignore
      const encodings: RTCRtpEncodingParameters = parameters.encodings && parameters.encodings[0]
      if (encodings?.maxBitrate !== this.mediaHelper.screen.encoderConfig.high.maxBitrate) {
        this.logger.log(
          `setScreenProfile() 调整上行码率 ${encodings.maxBitrate} => ${this.mediaHelper.screen.encoderConfig.high.maxBitrate}`
        )
        encodings.maxBitrate = this.mediaHelper.screen.encoderConfig.high.maxBitrate
        try {
          sender.setParameters(parameters)
        } catch (e: any) {
          this.logger.error(`setScreenProfile() 无法调整上行码率`, e.name, e.message)
        }
      }
    }

    this.client.apiFrequencyControl({
      name: 'setScreenProfile',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        ...profile
      }
    })
  }

  getSender(mediaTypeShort: MediaTypeShort, streamType: 'high' | 'low') {
    const peer = this.getAdapterRef()?._mediasoup?._sendTransport?.handler._pc
    let sender = null
    if (peer) {
      if (mediaTypeShort === 'audio') {
        sender = streamType === 'high' ? peer.audioSender : null
      }
      if (mediaTypeShort === 'video') {
        sender = streamType === 'high' ? peer.videoSender : peer.videoSenderLow
      } else if (mediaTypeShort === 'screen') {
        sender = streamType === 'high' ? peer.screenSender : peer.screenSenderLow
      } else if (mediaTypeShort === 'audioSlave') {
        sender = peer.audioSlaveSender
      }
    }
    return sender || null
  }

  applyEncoderConfig(mediaTypeShort: 'video' | 'screen', streamType: 'high' | 'low') {
    let maxBitrate = this.mediaHelper[mediaTypeShort].encoderConfig[streamType].maxBitrate
    if (!maxBitrate) {
      return
    }
    let sender = this.getSender(mediaTypeShort, streamType)
    if (!sender) {
      this.logger.error(
        'localStream.applyEncoderConfig: cannot find sender for ',
        mediaTypeShort,
        streamType
      )
      return
    }
    let contentHint = this.mediaHelper[mediaTypeShort].encoderConfig[streamType].contentHint
    if (
      typeof contentHint === 'string' &&
      sender.track &&
      // @ts-ignore
      sender.track.contentHint !== contentHint
    ) {
      this.logger.log(
        // @ts-ignore
        `applyEncoderConfig 应用 contentHint：${mediaTypeShort} ${streamType} ${sender.track.contentHint} => ${contentHint}`
      )
      // @ts-ignore
      sender.track.contentHint = contentHint
    }
    const parameters = sender.getParameters() as RTCRtpSendParameters
    let maxBitrateHistory: number | undefined = undefined
    if (!parameters.encodings || !parameters.encodings.length) {
      parameters.encodings = [{ maxBitrate }] as RTCRtpEncodingParameters[]
    } else {
      maxBitrateHistory = parameters.encodings[0].maxBitrate
      parameters.encodings[0].maxBitrate = maxBitrate
    }
    sender
      .setParameters(parameters)
      .then(() => {
        this.logger.log(
          `最大编码码率：${mediaTypeShort} ${streamType} ${
            maxBitrateHistory ? maxBitrateHistory + '=>' : ''
          }${maxBitrate}`
        )
      })
      .catch((e: any) => {
        this.logger.error(
          `应用最大编码码率失败：${mediaTypeShort} ${streamType} ${maxBitrate}`,
          parameters,
          e.name,
          e.message
        )
      })
  }

  getVideoBW(profile: VideoProfileOptions) {
    //码表参考：https://docs.popo.netease.com/lingxi/a120b338ea194ec296e12251bc523efa
    if (profile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_180p) {
      if (profile.frameRate <= VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15) {
        return 140 * 1000
      } else {
        return 220 * 1000
      }
    } else if (profile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p) {
      if (profile.frameRate <= VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15) {
        return 500 * 1000
      } else {
        return 750 * 1000
      }
    } else if (profile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_720p) {
      if (profile.frameRate <= VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15) {
        return 1130 * 1000
      } else {
        return 1710 * 1000
      }
    } else if (profile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p) {
      if (profile.frameRate <= VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15) {
        return 2080 * 1000
      } else {
        return 3150 * 1000
      }
    } else {
      this.logger.warn(`发现不支持的 NERTC_VIDEO_QUALITY ${profile.resolution}`)
      return 800 * 1000
    }
  }

  /**
   * 截取指定用户的视频画面(文件保存在浏览器默认路径)
   * @function takeSnapshot
   * @memberOf Stream#
   * @param  {Object} options  配置参数
   * @param  {String} options.name 截取的图片的保存名称(默认是uid-1的格式名称)
   * @returns {Promise}
   */
  async takeSnapshot(options: SnapshotOptions) {
    let errcode, message
    const isVideoPlaying = this.video && this._play?.video?.dom
    const isScreenPlaying = this.screen && this.Play?.screen?.dom
    if (isVideoPlaying || isScreenPlaying) {
      this.logger.log(`takeSnapshot() options: ${JSON.stringify(options)}`)
      await this._play.takeSnapshot(options, 'download', this.streamID)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: 0,
        param: {
          streamID: this.stringStreamID,
          isRemote: false,
          ...options
        }
      })
    } else {
      message = 'takeSnapshot(): 没有视频流, 请检查视频是否正在播放'
      errcode = ErrorCode.STREAM_TAKE_SNAPSHOT_ERROR
    }

    if (errcode) {
      this.logger.error(message)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            ...options,
            reason: message
          },
          null,
          ' '
        )
      })
      throw new RtcError({
        code: errcode,
        message
      })
    }
  }

  /**
   * 截取指定用户的视频画面并生成 base64
   * @function takeSnapshotBase64
   * @memberOf Stream#
   * @param  {Object} options  配置参数
   * @returns {string}
   */
  takeSnapshotBase64(options: SnapshotBase64Options) {
    let errcode, message
    const isVideoPlaying = this.video && this._play?.video?.dom
    const isScreenPlaying = this.screen && this.Play?.screen?.dom
    if (isVideoPlaying || isScreenPlaying) {
      let base64Url = this._play.takeSnapshot(options, 'base64')
      this.client.apiFrequencyControl({
        name: 'takeSnapshotBase64',
        code: 0,
        param: {
          streamID: this.stringStreamID,
          isRemote: false,
          ...options
        }
      })
      return base64Url
    } else {
      message = 'takeSnapshotBase64(): 没有视频流, 请检查视频是否正在播放'
      errcode = ErrorCode.STREAM_TAKE_SNAPSHOT_ERROR
    }

    if (errcode) {
      this.logger.error(message)
      this.client.apiFrequencyControl({
        name: 'takeSnapshotBase64',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: false,
            ...options,
            reason: message
          },
          null,
          ' '
        )
      })
      throw new RtcError({
        code: errcode,
        message
      })
    }
  }

  getCurrentFrameData(options: GetCurrentFrameDataOptions = { mediaType: 'video' }) {
    let imageData = this._play.getCurrentFrameData(options)
    return imageData
  }
  /**
   * ************************ 客户端录制相关 *****************************
   */
  /**
   * 开启单人视频录制
   * @function startMediaRecording
   * @memberOf Stream#
   * @param {Object} param 参数对象
   * @param {String} param.type 如果是自己流录制，'audio','video'或'screen'
   * @param {Boolean} param.reset 如果之前的录制视频未下载，是否重置，默认false
   * @returns {Promise} 包含recordId值，用于下载等操作
   */
  async startMediaRecording(options: MediaRecordingOptions) {
    const streams = []
    switch (options.type) {
      case 'screen':
        streams.push(this.mediaHelper.screen.screenVideoStream)
        streams.push(this.mediaHelper.audio.audioStream)
        break
      case 'camera':
      case 'video':
        streams.push(this.mediaHelper.video.videoStream)
        streams.push(this.mediaHelper.audio.audioStream)
        break
      case 'audio':
        // 音频则为混音
        streams.push(this.mediaHelper.audio.audioStream)
        if (this.client.adapterRef.remoteStreamMap) {
          for (var uid in this.client.adapterRef.remoteStreamMap) {
            const remoteStream = this.client.adapterRef.remoteStreamMap[uid]
            streams.push(remoteStream.mediaHelper.audio.audioStream)
          }
        }
    }
    if (streams.length === 0) {
      this.logger.log('未发现要录制的媒体流')
      return
    }
    if (!this._record || !this.streamID || !streams) {
      throw new RtcError({
        code: ErrorCode.RECORDING_ERROR,
        message: 'localStream_startMediaRecording: 开始录制时参数异常'
      })
    }
    return (
      this._record &&
      this._record.start({
        uid:
          this.client.adapterRef.channelInfo.uidType === 'string'
            ? this.stringStreamID
            : this.streamID,
        type: options.type,
        reset: options.reset,
        stream: streams
      })
    )
  }
  /**
   * 结束视频录制
   * @function stopMediaRecording
   * @memberOf Stream#
   * @param {Object} options 参数对象
   * @param {String} options.recordId 录制id，可以通过listMediaRecording接口获取
   * @returns {Promise}
   */
  stopMediaRecording(options: { recordId?: string }) {
    if (!this._record || !this._record.recoder) {
      throw new RtcError({
        code: ErrorCode.RECORDING_NOT_START_ERROR,
        message: 'localStream.stopMediaRecording: 录制未开始'
      })
    }
    //FIXME
    return this._record.stop({})
  }

  /**
   * 播放视频录制
   * @function playMediaRecording
   * @memberOf Stream#
   * @param {Object} options 参数对象
   * @param {String} options.recordId 录制id，可以通过listMediaRecording接口获取
   * @param {Element} options.view 音频或者视频画面待渲染的DOM节点，如div、span等非流媒体节点
   * @returns {Promise}
   */
  playMediaRecording(options: { recordId: string; view: HTMLElement }) {
    if (!this._record || !this._record.recoder) {
      throw new RtcError({
        code: ErrorCode.RECORDING_NOT_START_ERROR,
        message: 'localStream.playMediaRecording: 录制未开始'
      })
    }
    return this._record.play(options.view)
  }
  /**
   * 枚举录制的音视频
   * @function listMediaRecording
   * @memberOf Stream#
   * @returns {Array}
   */
  listMediaRecording() {
    let list = []
    if (!this._record || !this._record.recoder) {
      throw new RtcError({
        code: ErrorCode.RECORDING_NOT_START_ERROR,
        message: 'localStream.listMediaRecording: 录制未开始'
      })
    }
    const recordStatus = this._record.getRecordStatus()
    if (recordStatus.status !== 'init') {
      list.push(recordStatus)
    }
    return list
  }
  /**
   * 清除录制的音视频
   * @function cleanMediaRecording
   * @memberOf Stream#
   * @param {Object} options 参数对象
   * @param {String} options.recordId 录制id，可以通过listMediaRecording接口获取
   * @returns {Promise}
   */
  cleanMediaRecording(options: { recordId: string }) {
    if (!this._record || !this._record.recoder) {
      throw new RtcError({
        code: ErrorCode.RECORDING_NOT_START_ERROR,
        message: 'localStream.cleanMediaRecording: 录制未开始'
      })
    }
    return this._record.clean()
  }
  /**
   * 下载录制的音视频
   * @function downloadMediaRecording
   * @memberOf Stream#
   * @param {Object} param 参数对象
   * @param {Object} options 参数对象
   * @param {String} options.recordId 录制id，可以通过listMediaRecording接口获取
   * @returns {Promise}
   */
  downloadMediaRecording(options: { recordId: string }) {
    if (!this._record || !this._record.recoder) {
      throw new RtcError({
        code: ErrorCode.RECORDING_NOT_START_ERROR,
        message: 'localStream.downloadMediaRecording: 录制未开始'
      })
    }
    return this._record.download()
  }

  /**
   * ************************ 云端伴音相关 *****************************
   */

  /**
   * 云端音乐文件和本地麦克风声音混合；需要在启动麦克风之后使用
   * @function startAudioMixing
   * @memberOf Stream#
   * @param {Object} options 参数对象
   * @param {String} options.audioFilePath 必须，云端音频文件路径
   * @param {String} options.loopback 可选，是否循环播放，缺省为false，表示播放一次就结束（这里如果是false，则cycle参数不生效）
   * @param {String} options.replace 可选，是否替换麦克风采集的音频数据，缺省为false
   * @param {Number} options.cycle 可选，循环的次数，需要loopback参数置为true（如果想无限循环，cycle设置为0，loopback设置为true），缺省为0，如果loopback为true，表示无限循环，如果loopback为false，该参数不生效
   * @param {Number} options.playStartTime 可选，设置音频文件开始播放的位置，单位为 s。缺省设为 0，即从头开始播放
   * @param {Function} options.volume 可选，设置伴音文件的音量
   * @param {Function} options.auidoMixingEnd 可选，伴音文件播放完成的通知反馈（正常停止伴音或关掉通话获取其他原因停止伴音不会触发）
   * @returns {Promise}
   */
  startAudioMixing(options: AudioMixingOptions) {
    this.logger.log('startAudioMixing() 开始伴音')
    if (options.replace) {
      this.canEnableAIAudioEffects = false
    }
    if (options.auidoMixingEnd) {
      const that = this
      const auidoMixingEnd = options.auidoMixingEnd
      options.auidoMixingEnd = function () {
        that.canEnableAIAudioEffects = true
        auidoMixingEnd.apply(this, arguments as unknown as [])
      }
    }
    return this.mediaHelper.startAudioMixing(options)
  }

  /**
   * 停止播放伴奏
   * @function stopAudioMixing
   * @memberOf Stream#
   * @return {Promise}
   */
  stopAudioMixing() {
    this.logger.log('stopAudioMixing() 停止伴音')
    this.canEnableAIAudioEffects = true
    return this.mediaHelper.stopAudioMixing()
  }

  /**
   * 暂停播放伴奏
   * @function pauseAudioMixing
   * @memberOf Stream#
   * @return {Promise}
   */
  pauseAudioMixing() {
    this.logger.log('pauseAudioMixing() 暂停伴音')
    return this.mediaHelper.pauseAudioMixing()
  }

  /**
   * 恢复播放伴奏
   * @function resumeAudioMixing
   * @memberOf Stream#
   * @return {Promise}
   */
  resumeAudioMixing() {
    this.logger.log('resumeAudioMixing() 恢复伴音')
    return this.mediaHelper.resumeAudioMixing()
  }

  /**
   * 调节伴奏音量
   * @function adjustAudioMixingVolume
   * @memberOf Stream#
   * @return {Promise}
   */
  adjustAudioMixingVolume(volume: number) {
    this.logger.log('adjustAudioMixingVolume() 调节伴音音量: ', volume)
    return this.mediaHelper.setAudioMixingVolume(volume)
  }

  /**
   * 获取伴奏时长
   * @function getAudioMixingDuration
   * @memberOf Stream#
   * @return {Object}
   */
  getAudioMixingDuration() {
    this.logger.log('getAudioMixingDuration() 获取伴音总时长')
    return this.mediaHelper.getAudioMixingTotalTime()
  }

  /**
   * 获取伴奏播放进度
   * @function getAudioMixingCurrentPosition
   * @memberOf Stream#
   * @memberOf Stream#
   * @return {Object}
   */
  getAudioMixingCurrentPosition() {
    return this.mediaHelper.getAudioMixingPlayedTime()
  }

  /**
   * 设置伴奏音频文件的播放位置。可以根据实际情况播放文件，而不是非得从头到尾播放一个文件,单位为ms
   * @function setAudioMixingPosition
   * @memberOf Stream#
   * @param {Number} playStartTime 伴音播放的位置
   * @return {Promise}
   */
  setAudioMixingPosition(playStartTime: number) {
    this.logger.log('setAudioMixingPosition() 设置伴音音频文件的播放位置: ', playStartTime)
    return this.mediaHelper.setAudioMixingPlayTime(playStartTime)
  }

  /**
   * ************************ 音效功能相关 *****************************
   */

  /**
   * 播放指定音效文件
   * @function playEffect
   * * @description
   与 startAudioMixing 方法的区别是，该方法更适合播放较小的音效文件，且支持同时播放多个音效。
   ##### 注意：
   + 受浏览器策略影响，在 Chrome 70 及以上和 Safari 浏览器上，该方法必须由用户手势触发.
   + 请在频道内调用该方法，如果在频道外调用该方法可能会出现问题。
   * @memberOf Stream#
   * @param {Object} options 参数对象
   * @param {String} options.filePath 必须，指定在线音效文件的绝对路径(支持MP3，AAC 以及浏览器支持的其他音频格式。)
   * @param {Number} options.cycle 可选，指定音效文件循环播放的次数
   * ##### 注意：
   正整数，取值范围为 [1,10000]。默认值为 1，即播放 1 次。
   * @param {Number} options.soundId 指定音效的 ID。每个音效均有唯一的 ID。
   * ##### 注意：
    正整数，取值范围为 [1,10000]。
    如果你已通过 preloadEffect 将音效加载至内存，确保这里的 soundID 与 preloadEffect 设置的 soundID 相同。
   * @returns {Promise}
   */
  async playEffect(options: AudioEffectOptions) {
    this.logger.log('playEffect() 开始播放音效: ', JSON.stringify(options, null, ' '))
    return this.mediaHelper.playEffect(options)
  }

  /**
   * 停止播放指定音效文件
   * @function stopEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   */
  async stopEffect(soundId: number) {
    this.logger.log('stopEffect() 停止播放音效: ', soundId)
    return this.mediaHelper.stopEffect(soundId)
  }

  /**
   * 暂停播放指定音效文件
   * @function pauseEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   */
  async pauseEffect(soundId: number) {
    this.logger.log('pauseEffect() 暂停播放音效：', soundId)
    return this.mediaHelper.pauseEffect(soundId)
  }

  /**
   * 恢复播放指定音效文件
   * @function resumeEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   */
  async resumeEffect(soundId: number) {
    this.logger.log('resumeEffect() 恢复播放音效文件: ', soundId)
    return this.mediaHelper.resumeEffect(soundId)
  }

  /**
   * 调节指定音效文件的音量
   * @function setVolumeOfEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认 100 为原始文件音量。
   * @return {Promise}
   */
  async setVolumeOfEffect(soundId: number, volume: number) {
    this.logger.log(`setVolumeOfEffect() 调节 ${soundId} 音效文件音量为: ${volume}`)
    return this.mediaHelper.setVolumeOfEffect(soundId, volume)
  }

  /**
   * 预加载指定音效文件
   * 该方法缓存音效文件，以供快速播放。为保证通信畅通，请注意控制预加载音效文件的大小。
   * @function preloadEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @param {String} filePath 必须，指定在线音效文件的绝对路径(支持MP3，AAC 以及浏览器支持的其他音频格式。)
   * @return {Object}
   */
  async preloadEffect(soundId: number, filePath: string) {
    this.logger.log(`preloadEffect() 预加载 ${soundId} 音效文件地址: ${filePath}`)
    return this.mediaHelper.preloadEffect(soundId, filePath)
  }

  /**
   * 释放指定音效文件
   * 该方法从内存释放某个预加载的音效文件，以节省内存占用。
   * @function unloadEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Object}
   */
  async unloadEffect(soundId: number) {
    this.logger.log(`unloadEffect() 释放指定音效文件 ${soundId}`)
    return this.mediaHelper.unloadEffect(soundId)
  }

  /**
   * 获取所有音效文件播放音量
   * @function getEffectsVolume
   * @memberOf Stream#
   * @return Array<{ soundId: number; volume: number }>
   * 返回一个包含 soundId 和 volume 的数组。每个 soundId 对应一个 volume。
      + `soundId`: 为音效的 ID，正整数，取值范围为 [1,10000]。
      + `volume`: 为音量值，整数，范围为 [0,100]。
   */
  getEffectsVolume() {
    this.logger.log('getEffectsVolume() 获取所有音效文件播放音量')
    return this.mediaHelper.getEffectsVolume()
  }

  /**
   * 设置所有音效文件播放音量
   * @function setEffectsVolume
   * @memberOf Stream#
   * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认 100 为原始文件音量。
   * @return {void}
   */
  setEffectsVolume(volume: number) {
    this.logger.log('setEffectsVolume() 设置所有音效文件播放音量:', volume)
    return this.mediaHelper.setEffectsVolume(volume)
  }

  /**
   * 停止播放所有音效文件
   * @function stopAllEffects
   * @memberOf Stream#
   * @return {Promise}
   */
  async stopAllEffects() {
    this.logger.log('stopAllEffects() 停止播放所有音效文件')
    return this.mediaHelper.stopAllEffects()
  }

  /**
   * 暂停播放所有音效文件
   * @function pauseAllEffects
   * @memberOf Stream#
   * @return {Promise}
   */
  async pauseAllEffects() {
    this.logger.log('pauseAllEffects() 暂停播放所有音效文件')
    return this.mediaHelper.pauseAllEffects()
  }

  /**
   * 恢复播放所有音效文件
   * @function resumeAllEffects
   * @memberOf Stream#
   * @return {Promise}
   */
  async resumeAllEffects() {
    this.logger.log('resumeAllEffects() 恢复播放所有音效文件')
    return this.mediaHelper.resumeAllEffects()
  }

  /**
   * 获取音效文件时长
   * @function getAudioEffectsDuration
   * @memberOf Stream#
   * @return {Object}
   */
  getAudioEffectsDuration(options: AudioEffectOptions) {
    this.logger.log('getAudioEffectsDuration() 获取音效总时长')
    return this.mediaHelper.getAudioEffectsTotalTime(options)
  }

  /**
   * 获取音效文件播放进度
   * @function getAudioEffectsCurrentPosition
   * @memberOf Stream#
   * @memberOf Stream#
   * @return {Object}
   */
  getAudioEffectsCurrentPosition(options: AudioEffectOptions) {
    return this.mediaHelper.getAudioEffectsPlayedTime(options)
  }

  /**
   * 设置画布水印
   * @function setCanvasWatermarkConfigs
   * @memberOf Stream#
   * @param {NERtcCanvasWatermarkConfig} options 水印参数对象
   * @param {NERtcTextWatermarkConfig[]} options.textWatermarks 文字水印，最多支持10个
   * @param {NERtcTimestampWatermarkConfig} options.timestampWatermarks 时间戳水印
   * @param {NERtcImageWatermarkConfig[]} options.imageWatermarks 图片水印，最多支持4个
   * @returns {Promise} ，用于下载等操作
   */

  setCanvasWatermarkConfigs(options: NERtcCanvasWatermarkConfig) {
    if (this._play) {
      let watermarkControl =
        options.mediaType === 'screen'
          ? this._play.screen.canvasWatermark
          : this._play.video.canvasWatermark
      if (!watermarkControl) {
        this.logger.error('setCanvasWatermarkConfigs：播放器未初始化', options.mediaType)
        return
      }

      const LIMITS = {
        TEXT: 10,
        TIMESTAMP: 1,
        IMAGE: 4
      }
      if (options.textWatermarks && options.textWatermarks.length > LIMITS.TEXT) {
        this.logger.error(
          `目前的文字水印数量：${options.textWatermarks.length}。允许的数量：${LIMITS.TEXT}`
        )
        throw new RtcError({
          code: ErrorCode.WATERMARKS_EXCEEDED_ERROR,
          message: '最多可以设置 10 个文字水印'
        })
      }
      if (options.imageWatermarks && options.imageWatermarks.length > LIMITS.IMAGE) {
        this.logger.error(
          `目前的图片水印数量：${options.imageWatermarks.length}。允许的数量：${LIMITS.IMAGE}`
        )
        throw new RtcError({
          code: ErrorCode.WATERMARKS_EXCEEDED_ERROR,
          message: '最多可以设置 4 个图片水印'
        })
      }
      watermarkControl.checkWatermarkParams(options)
      watermarkControl.updateWatermarks(options)
      this.canvasWatermarkOptions = options

      this.client.apiFrequencyControl({
        name: 'setLocalCanvasWatermarkConfigs',
        code: 0,
        param: {
          streamID: this.stringStreamID,
          isRemote: false,
          mediaType: options.mediaType
        }
      })
    } else {
      this.logger.error('setCanvasWatermarkConfigs: 播放器未初始化')
    }
  }
  /**
   * 设置编码水印
   */
  setEncoderWatermarkConfigs(options: NERtcEncoderWatermarkConfig) {
    if (this._play && this._play) {
      const mediaType = options.mediaType || 'video'
      const watermarkControl = this._play[mediaType].encoderWatermark
      if (!watermarkControl) {
        this.logger.error('setEncoderWatermarkConfigs: 播放器未初始化', options.mediaType)
        return
      } else if (
        options.textWatermarks?.length ||
        options.timestampWatermarks ||
        options.imageWatermarks?.length
      ) {
        watermarkControl.handler.enabled = true
        if (!this.mediaHelper[mediaType].preProcessingEnabled) {
          this.mediaHelper.enablePreProcessing(mediaType)
        }
      } else {
        watermarkControl.handler.enabled = false
        if (this.mediaHelper.canDisablePreProcessing(mediaType)) {
          this.mediaHelper.disablePreProcessing(mediaType)
        }
      }

      const LIMITS = {
        TEXT: 10,
        TIMESTAMP: 1,
        IMAGE: 4
      }
      if (options.textWatermarks && options.textWatermarks.length > LIMITS.TEXT) {
        this.logger.error(
          `目前的文字水印数量：${options.textWatermarks.length}。允许的数量：${LIMITS.TEXT}`
        )
        throw new RtcError({
          code: ErrorCode.WATERMARKS_EXCEEDED_ERROR,
          message: '最多可以设置 10 个文字水印'
        })
      }
      if (options.imageWatermarks && options.imageWatermarks.length > LIMITS.IMAGE) {
        this.logger.error(
          `目前的图片水印数量：${options.imageWatermarks.length}。允许的数量：${LIMITS.IMAGE}`
        )
        throw new RtcError({
          code: ErrorCode.WATERMARKS_EXCEEDED_ERROR,
          message: '最多可以设置 4 个图片水印'
        })
      }
      watermarkControl.checkWatermarkParams(options)
      watermarkControl.updateWatermarks(options)
      this.encoderWatermarkOptions = options

      this.client.apiFrequencyControl({
        name: 'setEncoderWatermarkConfigs',
        code: 0,
        param: JSON.stringify(options, null, 2)
      })
    } else {
      this.logger.error('setEncoderWatermarkConfigs: 播放器未初始化')
    }
  }

  getMuteStatus(mediaType: MediaTypeShort) {
    if (MediaTypeList.indexOf(mediaType) > -1) {
      return {
        muted: this.muteStatus[mediaType].send
      }
    } else {
      const e = new Error(`getMuteStatus Invalid Media ${mediaType}`)
      throw e
    }
  }

  // 上报 webgl 不支持的错误函数
  private WebGLSupportError() {
    if (this.videoPostProcess.availableCode === 0) {
      throw new RtcError({
        code: ErrorCode.WEBGL_NOT_SUPPORT_ERROR,
        message: '当前环境不支持 WebGL'
      })
    }
  }

  // 配置基础美颜静态资源地址
  basicBeautyStaticRes: typeof BasicBeauty.configStaticRes = (config) => {
    this.logger.log('config basic beauty static resources.')
    this.WebGLSupportError()
    BasicBeauty.configStaticRes(config)
  }

  // 配置高级美颜静态资源地址
  advBeautyStaticRes: typeof AdvancedBeauty.configStaticRes = (config) => {
    this.logger.log('config advanced beauty static resources.')
    this.WebGLSupportError()
    AdvancedBeauty.configStaticRes(config)
  }
  /**
   * 设置美颜效果
   * @function setBeautyEffectOptions
   * @memberOf Stream#
   * @return
   */

  setBeautyEffectOptions(effects: BeautyEffectOptions) {
    this.logger.log('set basic beauty parameters:', effects)
    if (this.videoPostProcess.availableCode < 1) return
    if (!this.basicBeauty.isEnable) {
      this.logger.warn('basic beauty is not opened.')
    }
    for (const key in effects) {
      try {
        ;(<any>effects)[key] = Math.min(Math.max(parseFloat((<any>effects)[key] + ''), 0), 1)
      } catch (error: any) {
        ;(<any>effects)[key] = 0
        this.logger.error(`setBeautyEffectOptions:${error.message}`)
      }
    }
    this.lastEffects = { ...this.lastEffects, ...effects }
    this.basicBeauty.setBeautyOptions(effects)
  }

  /**
   * 开启美颜
   * @function setBeautyEffect
   * @memberOf Stream#
   * @return {Promise}
   */

  async setBeautyEffect(isStart: boolean, isAuto = false) {
    this.logger.log(`${isStart ? 'start' : 'close'} basic beauty.`)
    this.WebGLSupportError()
    if (isStart && this.videoPostProcess.availableCode < 2) {
      return this.logger.error(this.videoPostProcess.glErrorTip)
    }
    const basicBeauty = this.basicBeauty
    if (!isAuto) {
      if (isStart && basicBeauty.isEnable) {
        return this.logger.warn('basic beauty is already opened')
      }
      if (!isStart && !basicBeauty.isEnable) {
        return this.logger.warn('basic beauty is already closed')
      }
    }

    this.videoPostProcessTags.isBeautyTrack = isStart
    if (this.mediaHelper && this.mediaHelper.video.cameraTrack) {
      if (this.replaceTags.waterMark) {
        this.mediaHelper.disablePreProcessing('video', true)
      }
      this._cameraTrack = this.mediaHelper.video.cameraTrack

      let apiCode = 0
      try {
        this._transformedTrack = (await basicBeauty.setBeauty(
          isStart,
          this._cameraTrack
        )) as MediaStreamTrack
        // 替换 track
        await this.replacePluginTrack({
          mediaType: 'video',
          //@ts-ignore
          track: this._transformedTrack,
          external: false
        })
      } catch (error: any) {
        apiCode = -1
        this.logger.error(`setBeautyEffect:${error.message}`)
      }

      //重新开启水印
      if (this.mediaHelper.video.preProcessingEnabled) {
        this.mediaHelper.enablePreProcessing('video')
      }
      if (isStart && apiCode === 0) {
        let effects
        if (this.lastEffects) {
          effects = this.lastEffects
        } else {
          effects = {
            brightnessLevel: 0,
            rednessLevel: 0,
            smoothnessLevel: 0
          }
        }
        basicBeauty.setBeautyOptions(effects)
      }
      if (!isAuto) {
        this.client.apiFrequencyControl({
          name: 'setBeautyEffect',
          code: apiCode,
          param: {
            streamID: this.stringStreamID,
            isRemote: false,
            isEnable: isStart
          }
        })
      }
    } else {
      this.logger.log('setBeautyEffect:video track not ready.')
    }
  }

  /**
   *  添加滤镜
   *  @method setFilter
   *  @memberOf Stream#
   *  @param {Void}
   */
  setFilter(options: string | null, intensity?: number) {
    this.logger.log(`set beauty filter parameters:${JSON.stringify([options, intensity])}`)
    if (this.videoPostProcess.availableCode < 1) return
    if (!this.basicBeauty.isEnable) {
      this.logger.warn('basic beauty is not opened.')
    }
    try {
      if (intensity !== undefined) {
        intensity = Math.min(Math.max(parseFloat(intensity + ''), 0), 1)
      }
    } catch (error: any) {
      intensity = undefined
      this.logger.error(`setFilter:${error.message}`)
    }
    // intensity不填写就是默认值
    this.lastFilter = options
    this.basicBeauty.setFilter(options, intensity)
  }

  //打开背景分割
  async enableBodySegment() {
    this.logger.log('start virtual background.')
    this.WebGLSupportError()
    if (this.videoPostProcess.availableCode < 2) {
      return this.logger.error(this.videoPostProcess.glErrorTip)
    }
    if (!this.videoPostProcess.getPlugin('VirtualBackground')) {
      this.logger.error('virtual background plugin is not register.')
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_REGISTER,
        message: 'virtual background plugin is not register'
      })
    }
    if (this._segmentProcessor) {
      return this.logger.warn('virtual background is already opened.')
    }
    this._segmentProcessor = this.virtualBackground
    this._segmentProcessor.init()
    this._segmentProcessor.once('segment-load', async () => {
      let apiCode = 0
      try {
        await this._startBodySegment()
      } catch (error: any) {
        this._segmentProcessor?.destroy()
        this._segmentProcessor = null
        apiCode = -1
        this.logger.error(`enableBodySegment:${error.message}`)
      }
      this.client.apiFrequencyControl({
        name: 'enableBodySegment',
        code: apiCode,
        param: {
          streamID: this.stringStreamID
        }
      })
    })
    // 低版本兼容提示
    if (env.IS_ANY_SAFARI && parseFloat(env.SAFARI_VERSION || '0') < 15.0) {
      this.logger.warn(
        'In the current version of Safari, wasm has low execution efficiency, ' +
          'which will result in low frame rate when background-segmentation is enabled.'
      )
    }
  }

  //关闭背景分割
  async disableBodySegment() {
    this.logger.log('close virtual background.')
    this.WebGLSupportError()
    if (this._segmentProcessor) {
      let apiCode = 0
      try {
        await this._cancelBodySegment()
        this._segmentProcessor.destroy()
        this._segmentProcessor = null
      } catch (error: any) {
        apiCode = -1
        this.logger.error(`disableBodySegment:${error.message}`)
      }
      this.client.apiFrequencyControl({
        name: 'disableBodySegment',
        code: apiCode,
        param: {
          streamID: this.stringStreamID
        }
      })
    } else {
      this.logger.warn('virtual background is already closed.')
    }
  }

  async _startBodySegment() {
    if (this.videoPostProcess.availableCode < 2) return
    if (this._segmentProcessor) {
      await this.transformTrack(true, this._segmentProcessor)
      this.videoPostProcessTags.isBodySegmentTrack = true
    }
  }

  async _cancelBodySegment() {
    if (this.videoPostProcess.availableCode < 1) return
    if (this._segmentProcessor) {
      await this.transformTrack(false, this._segmentProcessor)
      this.videoPostProcessTags.isBodySegmentTrack = false
    }
  }

  // 设置背景
  setBackground(options: BackGroundOptions) {
    this.logger.log(`set virtual background parameters:${JSON.stringify(options)}`)
    if (this.videoPostProcess.availableCode < 1) return
    if (!this.virtualBackground.isEnable) {
      this.logger.warn('virtual background is not opened.')
    }
    this.virtualBackground.setVirtualBackGround(options)
  }
  // 兼容旧 API
  setBackGround(options: BackGroundOptions) {
    this.setBackground(options)
  }

  // 开启高级美颜
  async enableAdvancedBeauty(faceSize?: number) {
    this.logger.log('start advanced beauty.')
    this.WebGLSupportError()
    if (this.videoPostProcess.availableCode < 2) {
      return this.logger.error(this.videoPostProcess.glErrorTip)
    }
    if (!this.videoPostProcess.getPlugin('AdvancedBeauty')) {
      this.logger.error('advanced beauty plugin is not register.')
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_REGISTER,
        message: 'advanced beauty plugin is not register'
      })
    }
    if (this._advancedBeautyProcessor) {
      return this.logger.warn('advanced beauty is already opened.')
    }
    this._advancedBeautyProcessor = this.advancedBeauty
    this._advancedBeautyProcessor.init(faceSize)
    this._advancedBeautyProcessor.once('facePoints-load', async () => {
      let apiCode = 0
      try {
        await this._startAdvancedBeauty()
      } catch (error: any) {
        this._advancedBeautyProcessor?.destroy()
        this._advancedBeautyProcessor = null
        apiCode = -1
        this.logger.error(`enableAdvancedBeauty:${error.message}`)
      }
      this.client.apiFrequencyControl({
        name: 'enableAdvancedBeauty',
        code: apiCode,
        param: {
          streamID: this.stringStreamID
        }
      })
    })
    // 低版本兼容提示
    if (env.IS_ANY_SAFARI && parseFloat(env.SAFARI_VERSION || '0') < 15.0) {
      this.logger.warn(
        'In the current version of Safari, wasm has low execution efficiency, ' +
          'which will result in low frame rate when advanced-beauty is enabled.'
      )
    }
  }
  // 关闭高级美颜
  async disableAdvancedBeauty() {
    this.logger.log('close advanced beauty.')
    this.WebGLSupportError()
    if (this._advancedBeautyProcessor) {
      let apiCode = 0
      try {
        await this._cancelAdvancedBeauty()
        this._advancedBeautyProcessor.destroy()
        this._advancedBeautyProcessor = null
      } catch (error: any) {
        apiCode = -1
        this.logger.error(`disableAdvancedBeauty:${error.message}`)
      }
      this.client.apiFrequencyControl({
        name: 'disableAdvancedBeauty',
        code: apiCode,
        param: {
          streamID: this.stringStreamID
        }
      })
    } else {
      this.logger.warn('advanced beauty is already closed.')
    }
  }

  async _startAdvancedBeauty() {
    if (this.videoPostProcess.availableCode < 2) return
    if (this._advancedBeautyProcessor) {
      await this.transformTrack(true, this._advancedBeautyProcessor)
      this.videoPostProcessTags.isAdvBeautyTrack = true
    }
  }

  async _cancelAdvancedBeauty() {
    if (this.videoPostProcess.availableCode < 1) return
    if (this._advancedBeautyProcessor) {
      await this.transformTrack(false, this._advancedBeautyProcessor)
      this.videoPostProcessTags.isAdvBeautyTrack = false
    }
  }

  // 设置高级美颜
  setAdvBeautyEffect: AdvancedBeauty['setAdvEffect'] = (...args) => {
    this.logger.log(`set advanced beauty parameters:${JSON.stringify(args)}`)
    if (this.videoPostProcess.availableCode < 1) return
    if (!this.advancedBeauty.isEnable) {
      this.logger.warn('advanced beauty is not opened.')
    }
    this.advancedBeauty.setAdvEffect(...args)
  }

  // 预设高级美颜参数
  presetAdvBeautyEffect: AdvancedBeauty['presetAdvEffect'] = (...args) => {
    this.logger.log(`preset advanced beauty parameters:${JSON.stringify(args)}`)
    if (this.videoPostProcess.availableCode < 1) return
    if (!this.advancedBeauty.isEnable) {
      this.logger.warn('advanced beauty is not opened.')
    }
    this.advancedBeauty.presetAdvEffect(...args)
  }

  //打开AI降噪
  async enableAIDenoise(): Promise<boolean> {
    if (!this.canEnableAIAudioEffects) {
      this.logger.error('请先关闭伴音功能')
      return false
    }
    if (!this.supportAIAudioEffects) {
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_SUPPORT,
        message: `Unsupport Plugin, Please check your plugin version`
      })
    }
    this.logger.log('start denoise.')
    let stageAIProcessing: StageAIProcessing
    if (this.mediaHelper.audio.stageAIProcessing) {
      stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    } else {
      // 4.6.25版本无法把完整的AudioPipeline移植到localStream，所以单独将AI降噪模块拿出来
      // 创建AI降噪模块
      const context = getAudioContext()
      if (!context) {
        this.logger.error(`当前环境不支持AudioContext`)
        return false
      } else {
        stageAIProcessing = new StageAIProcessing(context, this.logger)
        this.mediaHelper.audio.stageAIProcessing = stageAIProcessing
      }
    }
    if (!stageAIProcessing.getPlugin('AIAudioEffects')) {
      this.logger.error('AudioEffects plugin is not register.')
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_REGISTER,
        message: 'AudioEffects plugin is not register'
      })
    }

    if (stageAIProcessing.state === 'UNINIT') {
      await stageAIProcessing.init()
    }
    stageAIProcessing.enabled = true
    stageAIProcessing.enableAudioEffects = true
    if (this._audioAffectsProcessor) {
      if (this._audioAffectsProcessor.getState('AIDenoise')) {
        this.logger.warn('ai denoise is already opened.')
      } else {
        this._audioAffectsProcessor.setState('AIDenoise', true)
        this.emit('ai-denoise-enabled')
        this.client.apiFrequencyControl({
          name: 'enableAIDenoise',
          code: 0,
          param: {
            streamID: this.stringStreamID
          }
        })
      }
      return true
    } else {
      this._audioAffectsProcessor = new AudioEffects(stageAIProcessing)
      this._audioAffectsProcessor.init()
      this._audioAffectsProcessor.once('effects-load', async () => {
        this.logger.log('ai audio effects loaded')
        this._audioAffectsProcessor!.setState('AIDenoise', true)
        this.emit('ai-denoise-enabled')
        this.client.apiFrequencyControl({
          name: 'enableAIDenoise',
          code: 0,
          param: {
            streamID: this.stringStreamID
          }
        })
      })
    }

    if (!this.mediaHelper.audio.audioRoutingEnabled) {
      this.mediaHelper.enableAudioRouting()
    }
    this.mediaHelper.updateWebAudio()
    return true
  }

  //关闭AI降噪
  async disableAIDenoise(): Promise<boolean> {
    this.logger.log('close ai denoise.')
    const stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    if (!stageAIProcessing) {
      this.logger.warn('disableAIDenoise: audio process is not created')
      return true
    } else if (
      !this._audioAffectsProcessor ||
      !this._audioAffectsProcessor?.getState('AIDenoise')
    ) {
      this.logger.warn('denoise is already closed.')
      return true
    }

    this._audioAffectsProcessor.setState('AIDenoise', false)
    if (
      !this._audioAffectsProcessor.getState('AIDenoise') &&
      !this._audioAffectsProcessor.getState('AudioEffect')
    ) {
      this._audioAffectsProcessor.destroy()
      this._audioAffectsProcessor = null
      stageAIProcessing.enableAudioEffects = false
    }
    if (!stageAIProcessing.hasWorkingPlugin()) {
      stageAIProcessing.enabled = false
      this.mediaHelper.updateWebAudio()
      if (this.mediaHelper.canDisableAudioRouting()) {
        this.mediaHelper.disableAudioRouting()
      }
    }

    this.client.apiFrequencyControl({
      name: 'disableAIDenoise',
      code: 0,
      param: {
        streamID: this.stringStreamID
      }
    })
    return false
  }

  //打开美声变声
  async enableAudioEffect(): Promise<boolean> {
    if (!this.canEnableAIAudioEffects) {
      this.logger.error('请先关闭伴音功能')
      return false
    }
    if (!this.supportAIAudioEffects) {
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_SUPPORT,
        message: `Unsupport Plugin, Please check your plugin version`
      })
    }
    this.logger.log('start audio effect.')
    let stageAIProcessing: StageAIProcessing
    if (this.mediaHelper.audio.stageAIProcessing) {
      stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    } else {
      const context = getAudioContext()
      if (!context) {
        this.logger.error(`当前环境不支持AudioContext`)
        return false
      } else {
        stageAIProcessing = new StageAIProcessing(context, this.logger)
        this.mediaHelper.audio.stageAIProcessing = stageAIProcessing
      }
    }
    if (!stageAIProcessing.getPlugin('AIAudioEffects')) {
      this.logger.error('AudioEffects plugin is not register.')
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_REGISTER,
        message: 'ai audio effect plugin is not register'
      })
    }
    if (stageAIProcessing.state === 'UNINIT') {
      await stageAIProcessing.init()
    }
    stageAIProcessing.enabled = true
    stageAIProcessing.enableAudioEffects = true
    if (this._audioAffectsProcessor) {
      if (this._audioAffectsProcessor.getState('AudioEffect')) {
        this.logger.warn('audio effect is already opened.')
      } else {
        this._audioAffectsProcessor.setState('AudioEffect', true)
        this.emit('audio-effect-enabled')
        this.client.apiFrequencyControl({
          name: 'enableAudioEffect',
          code: 0,
          param: {
            streamID: this.stringStreamID
          }
        })
      }
      return true
    } else {
      this._audioAffectsProcessor = new AudioEffects(stageAIProcessing)
      this._audioAffectsProcessor.init()
      this._audioAffectsProcessor.once('effects-load', async () => {
        this.logger.log('ai audio effects loaded')
        this._audioAffectsProcessor!.setState('AudioEffect', true)
        this.emit('audio-effect-enabled')
        this.client.apiFrequencyControl({
          name: 'enableAudioEffect',
          code: 0,
          param: {
            streamID: this.stringStreamID
          }
        })
      })
    }
    if (!this.mediaHelper.audio.audioRoutingEnabled) {
      this.mediaHelper.enableAudioRouting()
    }
    this.mediaHelper.updateWebAudio()
    return true
  }

  async disableAudioEffect(): Promise<boolean> {
    this.logger.log('close audio effect.')
    const stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    if (!stageAIProcessing) {
      this.logger.warn('disableAudioEffect: audio process is not created')
      return true
    } else if (
      !this._audioAffectsProcessor ||
      !this._audioAffectsProcessor?.getState('AudioEffect')
    ) {
      this.logger.warn('ai audio effect is already closed.')
      return true
    }

    this._audioAffectsProcessor.setState('AudioEffect', false)
    if (
      !this._audioAffectsProcessor.getState('AIDenoise') &&
      !this._audioAffectsProcessor.getState('AudioEffect')
    ) {
      this._audioAffectsProcessor.destroy()
      this._audioAffectsProcessor = null
      stageAIProcessing.enableAudioEffects = false
    }
    if (!stageAIProcessing.hasWorkingPlugin()) {
      stageAIProcessing.enabled = false
      this.mediaHelper.updateWebAudio()
      if (this.mediaHelper.canDisableAudioRouting()) {
        this.mediaHelper.disableAudioRouting()
      }
    }

    this.client.apiFrequencyControl({
      name: 'disableAudioEffect',
      code: 0,
      param: {
        streamID: this.stringStreamID
      }
    })
    return true
  }

  setAudioEffect(type: number, value: number | Array<number>) {
    this.logger.log(`setAudioEffect:${type} `, JSON.stringify(value))
    if (this._audioAffectsProcessor && this._audioAffectsProcessor.getState('AudioEffect')) {
      this._audioAffectsProcessor.setAudioEffect(type, value)
      this.client.apiFrequencyControl({
        name: 'setAudioEffect',
        code: 0,
        param: {
          streamID: this.stringStreamID,
          type,
          value: JSON.stringify(value)
        }
      })
    } else {
      this.logger.warn('audio effect is not opened.')
    }
  }

  //打开啸叫检测
  async enableAIhowling(): Promise<boolean> {
    if (!this.canEnableAIAudioEffects) {
      this.logger.error('请先关闭伴音功能')
      return false
    }
    if (!this.supportHowling) {
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_SUPPORT,
        message: `Unsupport Plugin, Please check your plugin version`
      })
    }
    this.logger.log('start ai howling.')
    let stageAIProcessing: StageAIProcessing
    if (this.mediaHelper.audio.stageAIProcessing) {
      stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    } else {
      // 创建AI降噪模块
      const context = getAudioContext()
      if (!context) {
        this.logger.error(`当前环境不支持AudioContext`)
        return false
      } else {
        stageAIProcessing = new StageAIProcessing(context, this.logger)
        this.mediaHelper.audio.stageAIProcessing = stageAIProcessing
      }
    }
    if (!stageAIProcessing.getPlugin('AIhowling')) {
      this.logger.error('AIhowling plugin is not register.')
      throw new RtcError({
        code: ErrorCode.PLUGIN_NOT_REGISTER,
        message: 'aihowling plugin is not register'
      })
    }
    stageAIProcessing.enabled = true
    stageAIProcessing.enableAIhowling = true
    if (stageAIProcessing.state === 'UNINIT') {
      await stageAIProcessing.init()
    }
    if (this._aiHowlingProcessor) {
      this.logger.warn('ai howling is already opened.')
      return true
    } else {
      this._aiHowlingProcessor = new AIholwing(stageAIProcessing)
      this._aiHowlingProcessor.init()
      this._aiHowlingProcessor.once('aihowling-load', async () => {
        this.logger.log('ai howling loaded')
        if (this.pluginConfigList.howlingCallback) {
          this.onAudioHasHowling(this.pluginConfigList.howlingCallback)
          this.pluginConfigList.howlingCallback = null
        }
        this.emit('ai-howling-enabled')
      })
    }
    if (!this.mediaHelper.audio.audioRoutingEnabled) {
      this.mediaHelper.enableAudioRouting()
    }

    this.mediaHelper.updateWebAudio()
    this.client.apiFrequencyControl({
      name: 'enableAIhowling',
      code: 0,
      param: {
        streamID: this.stringStreamID
      }
    })
    return true
  }

  //关闭啸叫检测
  async disableAIhowling(): Promise<boolean> {
    this.logger.log('close ai howling.')
    const stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    if (!stageAIProcessing) {
      this.logger.warn('disableAIhowling: audio process is not created')
      return true
    } else if (!this._aiHowlingProcessor) {
      this.logger.warn('aihowling is already closed.')
      return true
    }

    stageAIProcessing.enableAIhowling = false

    this._aiHowlingProcessor.destroy()
    this._aiHowlingProcessor = null

    if (!stageAIProcessing.hasWorkingPlugin()) {
      stageAIProcessing.enabled = false
      this.mediaHelper.updateWebAudio()
      if (this.mediaHelper.canDisableAudioRouting()) {
        this.mediaHelper.disableAudioRouting()
      }
    }

    this.client.apiFrequencyControl({
      name: 'disableAIhowling',
      code: 0,
      param: {
        streamID: this.stringStreamID
      }
    })
    return true
  }

  onAudioHasHowling(callback: (hasHowling: boolean) => void) {
    this.logger.log('set onAudioHasHowling callback')
    if (this._aiHowlingProcessor) {
      this._aiHowlingProcessor.setHowlingCallback(callback)
      this.client.apiFrequencyControl({
        name: 'onAudioHasHowling',
        code: 0,
        param: {
          streamID: this.stringStreamID
        }
      })
    } else {
      this.pluginConfigList.howlingCallback = callback
    }
  }

  async replacePluginTrack(options: {
    mediaType: 'video' | 'screen'
    track: MediaStreamTrack
    external: boolean
  }) {
    if (this.videoPostProcess.availableCode < 1) return
    // replaceTrack不会主动关掉原来的track，包括大小流
    let oldTrack
    let external = false // 被替换的流是否是外部流

    if (options.mediaType === 'screen') {
      if (this.mediaHelper.screen.screenVideoTrack) {
        oldTrack = this.mediaHelper.screen.screenVideoTrack
        this.mediaHelper.screen.screenVideoTrack = null
      } else if (this.mediaHelper.screen.screenVideoSource) {
        external = true
        oldTrack = this.mediaHelper.screen.screenVideoSource
        this.mediaHelper.screen.screenVideoSource = null
      }
      if (oldTrack) {
        if (options.external) {
          this.mediaHelper.screen.screenVideoSource = options.track
        } else {
          this.mediaHelper.screen.screenVideoTrack = options.track
        }
        emptyStreamWith(this.mediaHelper.screen.screenVideoStream, options.track)
        emptyStreamWith(this.mediaHelper.screen.renderStream, options.track)
        if (
          this.mediaHelper.screen.screenVideoStream.getVideoTracks().length &&
          typeof this.mediaHelper.screen.encoderConfig.high.contentHint === 'string' &&
          // @ts-ignore
          this.mediaHelper.screen.screenVideoStream.getVideoTracks()[0].contentHint !==
            this.mediaHelper.screen.encoderConfig.high.contentHint
        ) {
          this.logger.log(
            `应用 contentHint screen high`,
            this.mediaHelper.screen.encoderConfig.high.contentHint
          )
          // @ts-ignore
          this.mediaHelper.screen.screenVideoStream.getVideoTracks()[0].contentHint =
            this.mediaHelper.screen.encoderConfig.high.contentHint
        }
      }
    } else if (options.mediaType === 'video') {
      if (this.mediaHelper.video.cameraTrack) {
        oldTrack = this.mediaHelper.video.cameraTrack
        this.mediaHelper.video.cameraTrack = null
      } else if (this.mediaHelper.video.videoSource) {
        external = true
        oldTrack = this.mediaHelper.video.videoSource
        this.mediaHelper.video.videoSource = null
      }
      if (oldTrack) {
        if (options.external) {
          this.mediaHelper.video.videoSource = options.track
        } else {
          this.mediaHelper.video.cameraTrack = options.track
        }
        emptyStreamWith(this.mediaHelper.video.videoStream, options.track)
        emptyStreamWith(this.mediaHelper.video.renderStream, options.track)
        if (
          this.mediaHelper.video.videoStream.getVideoTracks().length &&
          typeof this.mediaHelper.video.encoderConfig.high.contentHint === 'string' &&
          // @ts-ignore
          this.mediaHelper.video.videoStream.getVideoTracks()[0].contentHint !==
            this.mediaHelper.video.encoderConfig.high.contentHint
        ) {
          this.logger.log(
            `应用 contentHint video high`,
            this.mediaHelper.video.encoderConfig.high.contentHint
          )
          // @ts-ignore
          this.mediaHelper.video.videoStream.getVideoTracks()[0].contentHint =
            this.mediaHelper.video.encoderConfig.high.contentHint
        }
      }
    }
    if (oldTrack) {
      this.logger.log(
        `replaceTrack ${options.mediaType}【external: ${external} ${oldTrack.label}】=>【external: ${options.external} ${options.track.label}】`
      )
      watchTrack(options.track)
      this.mediaHelper.listenToTrackEnded(options.track)
    } else {
      this.logger.error(`replaceTrack ${options.mediaType} 当前没有可替换的流`)
      return null
    }

    const sender = this.getSender(options.mediaType, 'high')
    if (sender) {
      sender.replaceTrack(options.track)
      this.logger.log(`replaceTrack ${options.mediaType} 成功替换上行`)
    }
    if (this.replaceTags.isMuted) {
      if (this.mediaHelper.video.cameraTrack) {
        this.mediaHelper.video.cameraTrack.enabled = false
      }
    }
    return {
      oldTrack,
      external
    }
  }

  async transformTrack(enable: boolean, processor: VirtualBackground | AdvancedBeauty | null) {
    if (this.videoPostProcess.availableCode < 1) return
    if (!processor) {
      return
    }
    if (this.mediaHelper && this.mediaHelper.video.cameraTrack) {
      if (this.replaceTags.waterMark) {
        this.mediaHelper.disablePreProcessing('video', true)
      }
      this._cameraTrack = this.mediaHelper.video.cameraTrack
      let err: Error | null = null
      try {
        this._transformedTrack = (await processor.setTrack(
          enable,
          this._cameraTrack
        )) as MediaStreamTrack
        if (this._transformedTrack) {
          //替换 track
          await this.replacePluginTrack({
            mediaType: 'video',
            //@ts-ignore
            track: this._transformedTrack,
            external: false
          })
        }
      } catch (error: any) {
        err = error
      }
      //重新开启水印
      if (this.mediaHelper.video.preProcessingEnabled) {
        this.mediaHelper.enablePreProcessing('video')
      }
      if (err) {
        throw err
      }
    } else {
      this.logger.log('transformTrack:video track not ready.')
    }
  }

  /**
   * 注册插件
   * @param options
   */
  async registerPlugin(options: PluginOptions) {
    this.logger.log(`register plugin:${options.key}`)
    if (!this.supportWasm) {
      this.client.apiFrequencyControl({
        name: 'registerPlugin',
        code: -1,
        param: {
          streamID: this.stringStreamID,
          plugin: options.key,
          msg: 'unsupportWasm'
        }
      })
      throw new RtcError({
        code: ErrorCode.WEBGL_NOT_SUPPORT_ERROR,
        message: `该浏览器不支持WebAssembly，注册 ${options.key} 失败。`
      })
    }
    if (this.videoPostProcess.getPlugin(options.key as any)) {
      return this.logger.warn(`plugin ${options.key} already exists.`)
    }
    //防止在不注册AI降噪时创建AudioPipeline，这里写的麻烦一点
    // if (audioPlugins.indexOf(options.key) !== -1) {
    //   const pipeline = this.mediaHelper.getOrCreateAudioPipeline('audio')
    //   if (pipeline && pipeline.hasPlugin(options.key)) {
    //     return this.logger.warn(`plugin ${options.key} already exists.`)
    //   }
    // }
    const stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
    if (stageAIProcessing && stageAIProcessing.getPlugin(options.key as any)) {
      this.logger.warn(`plugin ${options.key} already exists.`)
      return false
    }
    let plugin: any = null
    options.adapterRef = this.client.adapterRef
    try {
      if (options.pluginUrl) {
        await loadPlugin(options.key as any, options.pluginUrl)
        plugin = eval(`new window.${options.key}(options)`)
      } else if (options.pluginObj) {
        plugin = new options.pluginObj(options)
      }
      if (plugin) {
        plugin.once('plugin-load', () => {
          this.logger.log(`plugin ${options.key} loaded`)
          if (videoPlugins.indexOf(options.key) !== -1) {
            this.WebGLSupportError()
            this.videoPostProcess.registerPlugin(options.key as any, plugin)
          } else if (audioPlugins.indexOf(options.key) !== -1) {
            // const pipeline = this.mediaHelper.getOrCreateAudioPipeline('audio')
            // if (!pipeline) {
            //   this.logger.error(`当前环境不支持AudioContext`)
            // } else {
            //   pipeline.registerPlugin(options.key, plugin, options.wasmUrl)
            // }
            let stageAIProcessing
            if (this.mediaHelper.audio.stageAIProcessing) {
              stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
            } else {
              // 4.6.25版本无法把完整的AudioPipeline移植到localStream，所以单独将AI降噪模块拿出来
              // 创建AI降噪模块
              const context = getAudioContext()
              if (!context) {
                this.logger.error(`当前环境不支持AudioContext`)
                return false
              } else {
                stageAIProcessing = new StageAIProcessing(context, this.logger)
                this.mediaHelper.audio.stageAIProcessing = stageAIProcessing
              }
            }
            if (options.key == 'AIAudioEffects') {
              this.supportAIAudioEffects = true
            }
            if (options.key == 'AIhowling') {
              this.supportHowling = true
            }
            stageAIProcessing.registerPlugin(options.key as any, plugin)
          } else {
            throw new Error(`unsupport plugin ${options.key}`)
          }

          this.emit('plugin-load', options.key)
          this.client.apiFrequencyControl({
            name: 'registerPlugin',
            code: 0,
            param: {
              streamID: this.stringStreamID,
              plugin: options.key
            }
          })
        })
        plugin.once('plugin-load-error', (msg: any) => {
          this.emit('plugin-load-error', {
            key: options.key,
            msg: `load ${options.wasmUrl} error.`
          })
          this.client.apiFrequencyControl({
            name: 'registerPlugin',
            code: -1,
            param: {
              streamID: this.stringStreamID,
              plugin: options.key,
              msg: `load ${options.wasmUrl} error.`
            }
          })
        })
        plugin.once('error', (message: string) => {
          if (options.key == 'AIAudioEffects') {
            this.supportAIAudioEffects = false
          }
          if (options.key == 'AIhowling') {
            this.supportHowling = false
          }
          this.unregisterPlugin(options.key)
          this.client.apiFrequencyControl({
            name: 'registerPlugin',
            code: -1,
            param: {
              streamID: this.stringStreamID,
              plugin: options.key,
              msg: `插件 ${options.key} 内部错误：${message}。`
            }
          })
        })
      } else {
        throw new RtcError({
          code: ErrorCode.PLUGIN_LOADED_ERROR,
          message: `unsupport plugin ${options.key}`
        })
      }
    } catch (e: any) {
      this.emit('plugin-load-error', {
        key: options.key,
        msg: e
      })
      this.client.apiFrequencyControl({
        name: 'registerPlugin',
        code: -1,
        param: {
          streamID: this.stringStreamID,
          plugin: options.key,
          msg: e
        }
      })
      throw new RtcError({
        code: ErrorCode.PLUGIN_LOADED_ERROR,
        message: e.message
      })
    }
  }

  async unregisterPlugin(key: string) {
    this.logger.log(`unRegister plugin:${key}`)
    if (audioPlugins.indexOf(key) !== -1) {
      if (key === 'AIAudioEffects') {
        if (this._audioAffectsProcessor?.getState('AIDenoise')) {
          this.disableAIDenoise()
        }
        if (this._audioAffectsProcessor?.getState('AudioEffect')) {
          this.disableAudioEffect()
        }
      }
      if (key === 'AIhowling') {
        this.disableAIhowling()
      }
      const stageAIProcessing = this.mediaHelper.audio.stageAIProcessing
      stageAIProcessing?.unregisterPlugin(key as AudioPluginType)
      if (!stageAIProcessing?.hasWorkingPlugin()) {
        this.mediaHelper.audio.stageAIProcessing = null
      }
    } else {
      this.WebGLSupportError()
      if (this.videoPostProcess) {
        if (key === 'VirtualBackground' && this._segmentProcessor) {
          await this.disableBodySegment()
        } else if (key === 'AdvancedBeauty' && this._advancedBeautyProcessor) {
          await this.disableAdvancedBeauty()
        }
        this.videoPostProcess.unregisterPlugin(key as VideoPluginType)
      }
    }

    this.client.apiFrequencyControl({
      name: 'unregisterPlugin',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        plugin: key
      }
    })
  }

  // 临时挂起视频后处理
  async suspendVideoPostProcess() {
    if (this.videoPostProcess.availableCode < 1) return
    const { isBeautyTrack, isBodySegmentTrack, isAdvBeautyTrack } = this.videoPostProcessTags
    if (isBeautyTrack) {
      await this.setBeautyEffect(false, true)
      this.videoPostProcessTags.isBeautyTrack = true
    }
    if (isBodySegmentTrack) {
      await this._cancelBodySegment()
      this.videoPostProcessTags.isBodySegmentTrack = true
    }
    if (isAdvBeautyTrack) {
      await this._cancelAdvancedBeauty()
      this.videoPostProcessTags.isAdvBeautyTrack = true
    }
  }

  // 恢复挂起的视频后处理
  async resumeVideoPostProcess() {
    if (this.videoPostProcess.availableCode < 1) return
    try {
      const { isBeautyTrack, isBodySegmentTrack, isAdvBeautyTrack } = this.videoPostProcessTags
      // 打开基础美颜
      if (isBeautyTrack) {
        await this.setBeautyEffect(true, true)
        if (this.lastEffects) {
          this.setBeautyEffectOptions(this.lastEffects)
        }
        if (this.lastFilter) {
          this.setFilter(this.lastFilter)
        }
      }
      // 打开背景分割
      if (isBodySegmentTrack) {
        await this._startBodySegment()
      }
      // 打开高级美颜
      if (isAdvBeautyTrack) {
        await this._startAdvancedBeauty()
      }
    } catch (error) {
      this.logger.log(`开启失败: ${error}`)
    }
  }

  // 兼容 safari 15.3 以下版本抓流红黑屏及其他问题
  private async replaceCanvas() {
    if (this.videoPostProcess.availableCode < 1) return
    if (!this._play) return
    if (!env.IS_ANY_SAFARI) return
    if (env.SAFARI_VERSION && parseFloat(env.SAFARI_VERSION) > 15.2) return
    const localVideoDom = this._play.video.dom
    const videoDom = this._play.video.containerDom
    if (localVideoDom && videoDom) {
      const filters = this.videoPostProcess.filters!
      const video = this.videoPostProcess.video

      const vppOn = this.replaceTags.videoPost
      const wmOn = this.replaceTags.waterMark
      if (vppOn) {
        const canvas = filters.canvas
        canvas.style.height = '0px'
        canvas.style.width = '0px'
        document.body.appendChild(canvas)
        // safari 13.1 浏览器 需要 <video> 和 <canvas> 在可视区域才能正常播放
        if (env.SAFARI_MAJOR_VERSION! < 14 && video) {
          video.style.height = '0px'
          video.style.width = '0px'
          document.body.appendChild(video)
        }

        if (!wmOn && filters.canvas.parentElement !== videoDom) {
          const canvas = filters.canvas

          localVideoDom.style.display = 'none'
          // safari在使用canvas.captureStream获取webgl渲染后的视频流，在本地播放时可能出现红屏或黑屏
          // filters.canvas.style.height = '100%';
          // filters.canvas.style.width = 'auto';
          canvas.style.position = 'absolute'
          // filters.canvas.style.left = '50%';
          // filters.canvas.style.top = '50%';
          // filters.canvas.style.transform = 'translate(-50%,-50%)';

          const rect = videoDom.getBoundingClientRect()
          const pr = rect.width / rect.height
          const cr = canvas.width / canvas.height
          const { width, height, cut } = this.renderMode.local.video as {
            width: number
            height: number
            cut: boolean
          }
          const vcr = width / height

          if (cut) {
            // 上下裁切
            if (vcr > cr) {
              canvas.style.width = `100%`
              canvas.style.left = '0px'
              const hRatio = rect.width / cr / rect.height
              canvas.style.height = `${hRatio * 100}%`
              canvas.style.top = `${-(hRatio - 1) * 50}%`
            } else {
              // 左右裁切
              canvas.style.height = `100%`
              canvas.style.top = '0px'
              const wRatio = (rect.height * cr) / rect.width
              canvas.style.width = `${wRatio * 100}%`
              canvas.style.left = `${-(wRatio - 1) * 50}%`
            }
          } else {
            // 左右留白
            if (pr > cr) {
              canvas.style.height = `100%`
              canvas.style.top = '0px'
              const wRatio = (rect.height * cr) / rect.width
              canvas.style.width = `${wRatio * 100}%`
              canvas.style.left = `${(1 - wRatio) * 50}%`
            } else {
              // 上下留白
              canvas.style.width = `100%`
              canvas.style.left = '0px'
              const hRatio = rect.width / cr / rect.height
              canvas.style.height = `${hRatio * 100}%`
              canvas.style.top = `${(1 - hRatio) * 50}%`
            }
          }

          // safari下，本地<video>切换成<canvas>
          videoDom.appendChild(filters.canvas)
        } else if (wmOn) {
          localVideoDom.style.display = ''
        }
      } else {
        localVideoDom.style.display = ''
        filters.canvas.parentNode?.removeChild(filters.canvas)
      }
    }
  }

  // 模拟 webgl 丢失上下文，不对外暴露，仅用于测试
  loseContext() {
    try {
      this.videoPostProcess.filters?.webglLostContext?.loseContext()
    } catch (error) {}
  }

  // 模拟 webgl 恢复上下文，不对外暴露，仅用于测试
  restoreContext() {
    try {
      this.videoPostProcess.filters?.webglLostContext?.restoreContext()
    } catch (error) {}
  }

  //获取原始dom对象 video主流 screen辅流
  getNativeDom(type: 'screen' | 'video') {
    const enable = this[type]
    const dom = this._play[type].dom
    if (!enable || !dom) {
      this.logger.warn(`No local ${type}`)
    }
    return dom
  }
  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   *  销毁实例
   *  @method destroy
   *  @memberOf Stream#
   *  @param {Void}
   */
  async destroy() {
    if (!this.client) return
    this.client.apiFrequencyControl({
      name: 'destroy',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: false
      }
    })
    this.logger.log(`uid ${this.stringStreamID} 销毁 Stream 实例`)
    this.stop()
    if (env.ANY_CHROME_MAJOR_VERSION && env.ANY_CHROME_MAJOR_VERSION < 62) {
      // chrome 62 以下版本，在函数执行 this.audio.micTrack.stop() 的过程中，会立刻抛出 trackended 事件，该问题系此系列版本内部时序异常导致。
      await this.delay(100)
    }
    this._reset()
    this.destroyed = true
    this.lastEffects = null
    this.lastFilter = null
    // 销毁虚拟背景 wasm 的 process
    if (this._segmentProcessor) {
      this._segmentProcessor.destroy()
      this._segmentProcessor = null
    }
    // 销毁高级美颜 wasm 的 process
    if (this._advancedBeautyProcessor) {
      this._advancedBeautyProcessor.destroy()
      this._advancedBeautyProcessor = null
    }
    // 销毁基础美颜, 释放当前track
    if (this._cameraTrack) {
      this._cameraTrack.stop()
      this._cameraTrack = null
    }
    if (this._transformedTrack) {
      this._transformedTrack.stop()
      this._transformedTrack = null
    }
    // 销毁美颜相关 webgl 管线
    this.videoPostProcess.destroy()
  }
}

export { LocalStream }

/* eslint prefer-promise-reject-errors: 0 */
