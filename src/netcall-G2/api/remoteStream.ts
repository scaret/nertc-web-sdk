import { STREAM_TYPE, STREAM_TYPE_REV } from '../constant/videoQuality'
import { ReportParamSubscribeRemoteSubStreamVideo } from '../interfaces/ApiReportParam'
import { alerter } from '../module/alerter'
import { AudioLevel } from '../module/audioLevel'
import { MediaHelper } from '../module/media'
import { getParameters } from '../module/parameters'
import { Play } from '../module/play'
import { Record } from '../module/record'
import {
  Client,
  GetCurrentFrameDataOptions,
  ILogger,
  MediaRecordingOptions,
  MediaTypeList,
  MediaTypeListAudio,
  MediaTypeListVideo,
  MediaTypeShort,
  NERtcCanvasWatermarkConfig,
  PlatformType,
  PlatformTypeMap,
  PubStatus,
  RemoteStreamOptions,
  RenderMode,
  SnapshotBase64Options,
  SnapshotOptions,
  StreamPlayOptions,
  SubscribeConfig,
  SubscribeOptions
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import { isExistOptions } from '../util/param'
import { RTCEventEmitter } from '../util/rtcUtil/RTCEventEmitter'
import { getAudioContext, tryResumeAudioContext } from '../module/webAudio'

let remoteStreamCnt = 0

class RemoteStream extends RTCEventEmitter {
  public readonly streamID: number | string
  public readonly stringStreamID: string
  public audio: boolean
  public audioSlave: boolean
  public video: boolean
  public screen: boolean
  public client: Client
  public mediaHelper: MediaHelper
  _play: Play
  public audioLevelHelper: AudioLevel | null = null
  private _record: Record | null
  public videoView: HTMLElement | null | undefined | String
  public screenView: HTMLElement | null | undefined | String
  public renderMode: {
    remote: {
      video: RenderMode | {}
      screen: RenderMode | {}
    }
  }
  private consumerId: string | null
  private producerId: string | null
  public platformType: PlatformType = PlatformType.unknown
  public readonly isRemote = true
  __v_skip = getParameters().enableVSkip
  public pubStatus: PubStatus = {
    audio: {
      audio: false,
      producerId: '',
      consumerId: '',
      consumerStatus: 'init',
      stopconsumerStatus: 'init',
      mute: false,
      simulcastEnable: false
    },
    audioSlave: {
      audioSlave: false,
      producerId: '',
      consumerId: '',
      consumerStatus: 'init',
      stopconsumerStatus: 'init',
      mute: false,
      simulcastEnable: false
    },
    video: {
      video: false,
      producerId: '',
      consumerId: '',
      consumerStatus: 'init',
      stopconsumerStatus: 'init',
      mute: false,
      simulcastEnable: false
    },
    screen: {
      screen: false,
      producerId: '',
      consumerId: '',
      consumerStatus: 'init',
      stopconsumerStatus: 'init',
      mute: false,
      simulcastEnable: false
    }
  }
  subConf: SubscribeConfig
  public subStatus: {
    audio: boolean
    audioSlave: boolean
    video: boolean
    screen: boolean
  } = {
    audio: false,
    audioSlave: false,
    video: false,
    screen: false
  }
  public muteStatus: {
    // localStream只有send
    // remoteStream的send表示发送端的mute状态，recv表示接收端的mute状态
    audio: { send: boolean; recv: boolean }
    audioSlave: { send: boolean; recv: boolean }
    video: { send: boolean; recv: boolean }
    screen: { send: boolean; recv: boolean }
  } = {
    audio: { send: false, recv: false },
    audioSlave: { send: false, recv: false },
    video: { send: false, recv: false },
    screen: { send: false, recv: false }
  }
  public active = true
  public destroyed = false
  public logger: ILogger
  remoteStreamId: number
  public spatialPosition: { x: number; y: number } = { x: 0, y: 0 }
  constructor(options: RemoteStreamOptions) {
    super()
    this.remoteStreamId = remoteStreamCnt++
    this.streamID = options.uid
    this.stringStreamID = this.streamID.toString()
    this.platformType = options.platformType
    this.logger = options.client.adapterRef.logger.getChild(() => {
      let tag = `remote#${this.stringStreamID}`
      if (PlatformTypeMap[this.platformType]) {
        tag += ' ' + PlatformTypeMap[this.platformType]
      }
      tag += this.remoteStreamId
      if (this.pubStatus.audio.consumerId) {
        tag += 'M'
      } else if (this.pubStatus.audio.producerId) {
        tag += 'm'
      }
      if (this.pubStatus.video.consumerId) {
        tag += 'C'
      } else if (this.pubStatus.video.producerId) {
        tag += 'c'
      }
      if (this.pubStatus.screen.consumerId) {
        tag += 'S'
      } else if (this.pubStatus.screen.producerId) {
        tag += 's'
      }
      if (
        options.client.adapterRef.remoteStreamMap[this.streamID]?.remoteStreamId !==
        this.remoteStreamId
      ) {
        tag += ' DETACHED'
      }
      return tag
    })

    if (typeof options.uid === 'string') {
      options.client.adapterRef.channelInfo.uidType = 'string'
    } else if (typeof options.uid === 'number') {
      options.client.adapterRef.channelInfo.uidType = 'number'
      if (options.uid > Number.MAX_SAFE_INTEGER) {
        this.logger.error('remoteSteram: uid超出number类型精度')
        throw new RtcError({
          code: ErrorCode.STREAM_UID_ERROR,
          message: 'Number 类型的 uid 最大值是 2^53 - 1， 请输入正确的参数'
        })
      }
    } else {
      this.logger.error('remoteSteram: uid参数格式非法')
      throw new RtcError({
        code: ErrorCode.STREAM_UID_ERROR,
        message: 'remoteSteram: uid参数格式非法'
      })
    }
    this.videoView = null
    this.screenView = null
    this.renderMode = {
      remote: { video: {}, screen: {} }
    }
    this.consumerId = null
    this.producerId = null
    this.subConf = {
      audio: true,
      audioSlave: true,
      video: true,
      screen: true,
      highOrLow: {
        video: STREAM_TYPE.HIGH,
        screen: STREAM_TYPE.HIGH
      }
    }
    this.renderMode = {
      remote: { video: {}, screen: {} }
    }

    this._reset()
    this.streamID = options.uid
    this.stringStreamID = this.streamID.toString()
    this.audio = options.audio
    this.audioSlave = options.audioSlave || false
    this.video = options.video || false
    this.screen = options.screen || false
    this.client = options.client
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

    if (getParameters().enableAlerter !== 'never') {
      alerter.watchRemoteStream(this)
    }
    this.client.apiFrequencyControl({
      name: 'createRemoteStream',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: true,
        clientUid: this.client.adapterRef.channelInfo.uid || ''
      }
    })
  }

  _reset() {
    // 即使remoteStream销毁了，也不要删除streamId属性，这样用户能够通过getId知道谁销毁了
    // this.streamID = ''
    // this.stringStreamID = ''
    this.audio = false
    this.audioSlave = false
    this.video = false
    this.screen = false
    this.videoView = null
    this.screenView = null
    this.renderMode = { remote: { video: {}, screen: {} } }
    this.consumerId = null
    this.producerId = null
    this.pubStatus = {
      audio: {
        audio: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false
      },
      audioSlave: {
        audioSlave: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false
      },
      video: {
        video: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false
      },
      screen: {
        screen: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false
      }
    }
    this.subConf = {
      audio: true,
      audioSlave: true,
      video: true,
      screen: true,
      highOrLow: {
        video: STREAM_TYPE.HIGH,
        screen: STREAM_TYPE.HIGH
      }
    }
    this.subStatus = {
      audio: false,
      audioSlave: false,
      video: false,
      screen: false
    }
    this.muteStatus = {
      audio: { send: false, recv: false },
      audioSlave: { send: false, recv: false },
      video: { send: false, recv: false },
      screen: { send: false, recv: false }
    }
    this.renderMode = {
      remote: { video: {}, screen: {} }
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
  }

  get Play() {
    return this._play
  }

  get Record() {
    return this._record
  }

  getId() {
    if (this.client.adapterRef.channelInfo.uidType === 'string') {
      return this.stringStreamID
    } else {
      return this.streamID
    }
  }

  /**
   * doSetSubscribeConfig可能会被 remoteStream.setSubscribeConfig 以及 client.subscribe调用
   */
  doSetSubscribeConfig(conf: SubscribeOptions) {
    const formerSubConf = Object.assign({}, this.subConf)
    formerSubConf.highOrLow = Object.assign({}, this.subConf.highOrLow)

    for (let mediaType of MediaTypeListAudio) {
      const sub = conf[mediaType]
      if (typeof sub === 'boolean') {
        this.subConf[mediaType] = sub
      }
    }
    for (let mediaType of MediaTypeListVideo) {
      const sub = conf[mediaType]
      if (conf.highOrLow) {
        this.subConf.highOrLow[mediaType] = conf.highOrLow
      }
      if (sub === 'high' || sub === 'low') {
        this.subConf[mediaType] = true
        this.subConf.highOrLow[mediaType] = STREAM_TYPE[sub === 'high' ? 'HIGH' : 'LOW']
      } else if (typeof sub === 'boolean') {
        this.subConf[mediaType] = sub
      }
    }
    if (this.pubStatus.audio.audio && this.subConf.audio) {
      this.subConf.audio = true
      this.audio = true
    } else {
      this.subConf.audio = false
    }

    if (this.pubStatus.audioSlave.audioSlave && this.subConf.audioSlave) {
      this.subConf.audioSlave = true
      this.audioSlave = true
    } else {
      this.subConf.audioSlave = false
    }

    if (this.pubStatus.video.video && this.subConf.video) {
      this.subConf.video = true
      this.video = true
    } else {
      this.subConf.video = false
    }

    if (this.pubStatus.screen.screen && this.subConf.screen) {
      this.subConf.screen = true
      this.screen = true
    } else {
      this.subConf.screen = false
    }

    // 打印setSubscribeConfig前后状态
    let info = 'doSetSubscribeConfig'
    let changed = false
    for (let mediaType of MediaTypeList) {
      info += ` ${mediaType}:${formerSubConf[mediaType]}`
      if (formerSubConf[mediaType] !== this.subConf[mediaType]) {
        info += '=>' + this.subConf[mediaType]
        changed = true
      }
      if (mediaType === 'video' || mediaType === 'screen') {
        info += ' ' + STREAM_TYPE_REV[formerSubConf.highOrLow[mediaType]]
        if (formerSubConf.highOrLow[mediaType] !== this.subConf.highOrLow[mediaType]) {
          info += '=>' + STREAM_TYPE_REV[this.subConf.highOrLow[mediaType]]
          changed = true
        }
      }
    }
    if (!changed) {
      info += `【Unchanged】`
    }
    this.logger.log(info)
  }

  /**
   * 设置视频订阅的参数。
   * @method setSubscribeConfig
   * @memberOf Stream#
   * @param {Object} options 配置参数
   * @param {Boolean} [options.audio] 是否订阅音频
   * @param {Boolean} [options.video] 是否订阅视频
   * @param {Number} [options.highOrLow] : 0是小流，1是大流
   * @returns {Null}
   */
  setSubscribeConfig(conf: SubscribeOptions) {
    this.logger.log(
      `setSubscribeConfig() 设置 ${this.stringStreamID} 订阅规则：${JSON.stringify(conf)}`
    )
    this.doSetSubscribeConfig(conf)
    this.logger.log(
      `setSubscribeConfig() 设置 ${this.stringStreamID} 订阅规则结果：${JSON.stringify(
        this.subConf
      )}`
    )
    this.client.apiFrequencyControl({
      name: 'setSubscribeConfig',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: true,
        conf: {
          ...this.subConf
        }
      }
    })
    if (this.pubStatus.screen.screen) {
      const param: ReportParamSubscribeRemoteSubStreamVideo = {
        uid:
          this.client.adapterRef.channelInfo.uidType === 'string'
            ? this.stringStreamID
            : this.streamID,
        subscribe: this.subConf.screen
      }
      this.client.apiFrequencyControl({
        name: 'subscribeRemoteSubStreamVideo',
        code: 0,
        param: JSON.stringify(param, null, ' ')
      })
    }
  }

  getAudioStream() {
    this.client.apiFrequencyControl({
      name: 'getAudioStream',
      code: 0,
      param: JSON.stringify({ isRemote: true, streamID: this.getId() }, null, ' ')
    })
    return this.mediaHelper.audio.audioStream
  }

  /**
   * 获取音频轨道
   * @function getAudioTrack
   * @memberOf STREAM#
   * @return {MediaStreamTrack}
   */
  getAudioTrack() {
    return this.mediaHelper.audio.audioStream.getAudioTracks()[0] || null
  }

  /**
   * 获取视频轨道
   * @function getVideoTrack
   * @memberOf STREAM#
   * @return {MediaStreamTrack}
   */
  getVideoTrack() {
    return this.mediaHelper.video.videoStream.getVideoTracks()[0] || null
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
      this.logger.warn(`play() remoteStream ${this.getId()} 播放视频没有指定div标签`)
      throw new RtcError({
        code: ErrorCode.STREAM_PLAY_ARGUMENT_ERROR,
        message: 'play() 播放视频没有指定div标签'
      })
    }
    if (!isExistOptions({ tag: 'Stream.playOptions.audio', value: playOptions.audio }).result) {
      playOptions.audio = true
    }
    if (
      !isExistOptions({ tag: 'Stream.playOptions.audioSlave', value: playOptions.audioSlave })
        .result
    ) {
      playOptions.audioSlave = true
    }
    if (!isExistOptions({ tag: 'Stream.playOptions.video', value: playOptions.video }).result) {
      playOptions.video = true
    }
    if (!isExistOptions({ tag: 'Stream.playOptions.screen', value: playOptions.screen }).result) {
      playOptions.screen = true
    }

    this.logger.log(
      `play() uid ${this.stringStreamID} 播放, playOptions:${JSON.stringify(playOptions)}`
    )
    if (playOptions.audio && this._play && this.mediaHelper.audio.audioStream.getTracks().length) {
      if (this.client.spatialManager) {
        this.logger.log(`[play] 启用了空间音频，跳过本地音频播放。`)
      } else {
        this.logger.log(`[play] uid ${this.stringStreamID} 开始播放远端音频`)
        try {
          await this._play.playAudioStream(
            'audio',
            this.mediaHelper.audio.audioStream,
            playOptions.muted
          )
        } catch (error) {
          this.client.emit('notAllowedError', error)
          this.client.emit('NotAllowedError', error) // 兼容旧版本
          this.safeEmit('notAllowedError', error)
        }
      }
    }

    if (
      playOptions.audioSlave &&
      this._play &&
      this.mediaHelper.screenAudio.screenAudioStream.getTracks().length
    ) {
      if (this.client.spatialManager) {
        this.logger.log(`[play] 启用了空间音频，跳过本地音频辅流播放。`)
      } else {
        this.logger.log(`[play] uid ${this.stringStreamID} 开始播放远端音频辅流`)
        try {
          await this._play.playAudioStream(
            'audioSlave',
            this.mediaHelper.screenAudio.screenAudioStream,
            playOptions.muted
          )
        } catch (error) {
          this.client.emit('notAllowedError', error)
          this.client.emit('NotAllowedError', error) // 兼容旧版本
          this.safeEmit('notAllowedError', error)
        }
      }
    }

    let view: HTMLElement | null
    if (typeof viewInput === 'string') {
      view = document.getElementById(viewInput)
    } else if (viewInput) {
      view = viewInput as HTMLElement
    } else {
      view = null
    }

    if (view) {
      if (playOptions.video) {
        this.videoView = view
        if (this._play && this.mediaHelper.video.videoStream.getVideoTracks().length) {
          this.logger.log(`[play] uid ${this.stringStreamID} 开始启动视频播放 主流 远端`)
          try {
            let end = 'remote'
            await this._play.playVideoStream('video', this.mediaHelper.video.renderStream, view)
            if ('width' in this.renderMode.remote.video) {
              this._play.setRender('video', this.renderMode.remote.video)
            }
          } catch (error) {
            this.client.emit('notAllowedError', error)
            this.client.emit('NotAllowedError', error) // 兼容旧版本
            this.safeEmit('notAllowedError', error)
          }
        }
      }
      if (playOptions.screen) {
        this.screenView = view
        if (
          this._play &&
          this.mediaHelper &&
          this.mediaHelper.screen.screenVideoStream.getVideoTracks().length
        ) {
          this.logger.log(`[play] uid ${this.stringStreamID} 开始启动视频播放 辅流 远端`)
          try {
            await this._play.playVideoStream('screen', this.mediaHelper.screen.renderStream, view)
            if ('width' in this.renderMode.remote.screen) {
              this._play.setRender('screen', this.renderMode.remote.screen)
            }
          } catch (error) {
            this.client.emit('notAllowedError', error)
            this.client.emit('NotAllowedError', error) // 兼容旧版本
            this.safeEmit('notAllowedError', error)
          }
        }
      }
    }

    this.client.apiFrequencyControl({
      name: 'play',
      code: 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          playOptions: playOptions,
          isRemote: true
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
    if (tryResumeAudioContext()) {
      this.logger.log(`正在尝试恢复AudioContext自动播放受限`)
    }

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
          isRemote: true
        },
        null,
        ' '
      )
    })
  }

  /**
   * 设置对端视频画面大小
   * @function setRemoteRenderMode
   * @memberOf Stream#
   * @param {Object} options 配置对象
   * @param {Number }  options.width 宽度
   * @param {Number }  options.height 高度
   * @param {Boolean }  options.cut 是否裁剪
   * @returns {Void}
   */
  setRemoteRenderMode(options: RenderMode, mediaType?: MediaTypeShort) {
    if (!options || !Number.isInteger(options.width) || !Number.isInteger(options.width)) {
      this.logger.warn('setRemoteRenderMode 参数宽高错误')
      this.client.apiFrequencyControl({
        name: 'setRemoteRenderMode',
        code: -1,
        param: {
          streamID: this.stringStreamID,
          isRemote: true,
          mediaType,
          ...options
        }
      })
      throw new RtcError({
        code: ErrorCode.STREAM_RENDER_ARGUMENT_ERROR,
        message: 'setLocalRenderMode() 参数宽高错误'
      })
    }
    if (!this.client || !this._play) {
      return
    }
    this.logger.log(
      `uid ${this.stringStreamID} 设置远端视频播放窗口大小: `,
      mediaType || 'video+screen',
      JSON.stringify(options)
    )
    // mediaType不填则都设
    if (!mediaType || mediaType === 'video') {
      if (this._play) {
        this._play.setRender('video', options)
      }
      this.renderMode.remote.video = options
    }
    if (!mediaType || mediaType === 'screen') {
      this.renderMode.remote.screen = options
      if (this._play) {
        this._play.setRender('screen', options)
      }
    }
    this.client.apiFrequencyControl({
      name: 'setRemoteRenderMode',
      code: 0,
      param: {
        ...options,
        mediaType,
        isRemote: true,
        streamID: this.stringStreamID
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
    this.logger.log(`stop() uid ${this.stringStreamID}, 停止播放 ${type || '音视频流'}`)
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
          isRemote: true,
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
          isRemote: true,
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
   * 启用音频轨道
   * @function unmuteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteAudio() {
    let errcode, message
    if (!this.muteStatus.audio.recv) {
      errcode = ErrorCode.STREAM_NOT_MUTE_AUDIO_YET
      message = 'remoteStream.unmuteAudio: 当前没有mute音频, 不支持unmute'
    }
    if (this._play.audio.dom && this.mediaHelper.audio.audioStream?.active) {
    } else {
      errcode = ErrorCode.STREAM_UNMUTE_AUDIO_WITHOUT_STREAM
      message = 'remoteStream.unmuteAudio: 没有音频流, 无法执行unmute操作'
    }
    this.client.apiFrequencyControl({
      name: 'unmuteAudio',
      code: errcode ? -1 : 0,
      param: JSON.stringify(
        {
          streamID: this.stringStreamID,
          isRemote: true,
          reason: message || ''
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
    try {
      this.logger.log('unmuteAudio() 启用音频轨道: ', this.stringStreamID)
      this.muteStatus.audio.recv = false
      this.mediaHelper.audio.audioStream.getAudioTracks().length &&
        (this.mediaHelper.audio.audioStream.getAudioTracks()[0].enabled = true)
      this._play.playAudioStream('audio', this.mediaHelper.audio.audioStream, false)
    } catch (e: any) {
      this.logger.error('unmuteAudio() 异常: ', e.name, e.message)
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: true,
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
   * @function muteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteAudio() {
    this.logger.log('禁用音频轨道: ', this.stringStreamID)
    if (this._play?.audio?.dom?.srcObject && this.mediaHelper?.audio?.audioStream?.active) {
    } else {
      this.logger.log('muteAudio() 之前没有播放过音频, 不支持unmute: ', this.stringStreamID)
      throw new RtcError({
        code: ErrorCode.STREAM_MUTE_AUDIO_ERROR,
        message: 'remoteStream.muteAudio: 之前没有播放过音频, 不支持muteAudio'
      })
    }
    try {
      this.muteStatus.audio.recv = true
      if (this.mediaHelper.audio.audioStream.getAudioTracks().length) {
        this.mediaHelper.audio.audioStream.getAudioTracks()[0].enabled = false
      }
      this._play.stopPlayStream('audio')
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: true
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('API调用失败: Stream:muteAudio', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: true,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 启用音频辅流轨道
   */
  async unmuteAudioSlave() {
    let errcode, message
    if (!this.muteStatus.audioSlave.recv) {
      errcode = ErrorCode.STREAM_NOT_MUTE_AUDIO_SLAVE_YET
      message = 'remoteStream.unmuteAudioSlave: 当前没有mute音频辅流, 不支持unmute'
    }
    if (this._play.audioSlave.dom && this.mediaHelper.screenAudio.screenAudioStream?.active) {
    } else {
      errcode = ErrorCode.STREAM_UNMUTE_AUDIO_SLAVE_WITHOUT_STREAM
      message = 'remoteStream.unmuteAudioSlave: 没有音频辅流, 无法执行unmute操作'
    }
    this.client.apiFrequencyControl({
      name: 'unmuteAudioSlave',
      code: errcode ? -1 : 0,
      param: JSON.stringify(
        {
          isRemote: true,
          streamID: this.stringStreamID,
          reason: message || ''
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
    try {
      this.logger.log('unmuteAudioSlave() 启用音频辅流轨道: ', this.stringStreamID)
      this.muteStatus.audioSlave.recv = false
      this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks().length &&
        (this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks()[0].enabled = true)
      this._play.playAudioStream(
        'audioSlave',
        this.mediaHelper.screenAudio.screenAudioStream,
        false
      )
    } catch (e: any) {
      this.logger.error('Stream:unmuteAudioSlave 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'unmuteAudioSlave',
        code: -1,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID,
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
  async muteAudioSlave() {
    if (
      this._play?.audioSlave?.dom?.srcObject &&
      this.mediaHelper?.screenAudio?.screenAudioStream?.active
    ) {
    } else {
      this.logger.error(
        'muteAudioSlave() 之前没有播放过音频辅流, 不支持unmute: ',
        this.stringStreamID
      )
      throw new RtcError({
        code: ErrorCode.STREAM_MUTE_AUDIO_SLAVE_ERROR,
        message: 'remoteStream.muteAudioSlave: 之前没有播放过音频辅流, 不支持mute'
      })
    }
    try {
      this.logger.log('muteAudioSlave() 禁用音频辅流轨道: ', this.stringStreamID)
      this.muteStatus.audioSlave.recv = true
      if (this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks().length) {
        this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks()[0].enabled = false
      }
      this._play.stopPlayStream('audioSlave')
      this.client.apiFrequencyControl({
        name: 'muteAudioSlave',
        code: 0,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('Stream:muteAudioSlave 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'muteAudioSlave',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: true,
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
    return this.mediaHelper.audio.audioStream.getAudioTracks().length > 0
  }

  hasAudioSlave() {
    return this.mediaHelper.screenAudio.screenAudioStream.getAudioTracks().length > 0
  }

  getAudioLevel(mediaType: 'audio' | 'audioSlave' = 'audio') {
    const pipeline = this.mediaHelper.getOrCreateAudioPipeline(mediaType)
    if (!pipeline) {
      //this.logger.error(`当前环境不支持AudioContext`)
      return 0
    } else {
      let normalizedAudioLevel = 0
      if (!pipeline.audioLevelNode) {
        const context = getAudioContext()
        if (!context || !context.audioWorklet || !context.audioWorklet.addModule) {
          // 为不支持getAudioLevel的环境做出提示
          // 由于getAudioLevle是高频调用API，所以仅在第一次调用时抛出错误事件
          this.logger.error(`getAudioLevel is not supported in this browser`)
          this.client.safeEmit('error', 'AUDIOLEVEL_NOT_SUPPORTED')
          // 这里不return
        }
        if (context?.state === 'suspended') {
          const error = new RtcError({
            code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
            url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082',
            message: 'playVideoStream: 浏览器自动播放受限: AudioContext is Suspended'
          })
          this.client.safeEmit('notAllowedError', error)
          this.safeEmit('notAllowedError', error)
        } else {
          this.client.apiFrequencyControl({
            name: 'getAudioLevel',
            code: 0,
            param: {
              mediaType: mediaType,
              isRemote: true,
              streamID: this.stringStreamID
            }
          })
        }
      }
      const result = pipeline.getAudioLevel()
      if (!result) {
        this.logger.log(`getAudioLevel() 正在加载音频模块`)
        normalizedAudioLevel = 0
      } else {
        normalizedAudioLevel = result.volume
      }
      switch (getParameters().audioLevelFittingAlgorithm) {
        case 'classic':
          return normalizedAudioLevel
        case 'linear':
          return Math.max(
            0,
            Math.min(
              100,
              getParameters().audioLevelRatioRemote * Math.round(normalizedAudioLevel * 200)
            )
          )
        case 'log2':
          return Math.max(
            0,
            Math.min(
              100,
              getParameters().audioLevelRatioRemote *
                Math.round(8.5 * Math.log2(normalizedAudioLevel) + 94)
            )
          )
      }
    }
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
    if (this.audio && this._play && this._play.audio && this._play.audio.dom) {
    } else {
      message = 'setAudioVolume() 没有音频流，请检查是否有订阅播放过音频'
      errcode = ErrorCode.SET_AUDIO_VOLUME_ERROR
    }
    this.client.apiFrequencyControl({
      name: 'setAudioVolume',
      code: errcode ? -1 : 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: true,
        // 历史问题：volume上报会*2.55
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
    this.logger.log(
      `setAudioVolume() 调节${this.stringStreamID}的音量大小: ${
        volume * 2.55
      } (normalized: ${normalizedVolume})`
    )
    this._play?.setPlayVolume('audio', normalizedVolume)
  }

  setAudioSlaveVolume(volume = 100) {
    let errcode, message
    if (!Number.isInteger(volume)) {
      errcode = ErrorCode.SET_AUDIO_VOLUME_ARGUMENTS_ERROR
      message = 'setAudioSlaveVolume() volume 应该为 0 - 100 的整数'
    } else if (volume < 0) {
      volume = 0
    } else if (volume > 100) {
      volume = 100
    }
    const normalizedVolume = volume / 100

    if (this.audio && this._play && this._play.audioSlave && this._play.audioSlave.dom) {
    } else {
      message = 'setAudioSlaveVolume() 没有音频流，请检查是否有订阅播放过音频辅流'
      errcode = ErrorCode.SET_AUDIO_VOLUME_ERROR
    }
    this.client.apiFrequencyControl({
      name: 'setAudioSlaveVolume',
      code: errcode ? -1 : 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: true,
        volume: volume * 2.55,
        normalizedVolume,
        reason: message || ''
      }
    })
    if (errcode) {
      this.logger.error(message)
      throw new RtcError({
        code: errcode,
        message
      })
    }

    this.logger.log(
      `setAudioSlaveVolume() 调节${this.stringStreamID}的音量大小: ${
        volume * 2.55
      } (normalized: ${normalizedVolume})`
    )
    this._play?.setPlayVolume('audioSlave', normalizedVolume)
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
          isRemote: true
        },
        null,
        ' '
      )
    })
  }

  /**
   * 启用视频轨道
   * @function unmuteVideo
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteVideo() {
    let errcode, message
    if (!this.muteStatus.video.recv) {
      errcode = ErrorCode.STREAM_NOT_MUTE_VIDEO_YET
      message = 'remoteStream.unmuteVideo: 当前没有mute视频, 不支持unmute'
    }
    if (this.mediaHelper.video.cameraTrack) {
    } else {
      errcode = ErrorCode.STREAM_UNMUTE_VIDEO_WITHOUT_STREAM
      message = 'remoteStream.unmuteVideo: 没有视频流, 无法执行unmute操作'
    }
    this.client.apiFrequencyControl({
      name: 'unmuteVideo',
      code: errcode ? -1 : 0,
      param: JSON.stringify(
        {
          isRemote: true,
          streamID: this.stringStreamID,
          reason: message || ''
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

    try {
      this.logger.log(`unmuteVideo() 启用 ${this.stringStreamID} 的视频轨道`)
      this.muteStatus.video.recv = false
      if (this.mediaHelper && this.mediaHelper.video.cameraTrack) {
        this.mediaHelper.video.cameraTrack.enabled = true
      }
    } catch (e: any) {
      this.logger.error('API调用失败：Stream:unmuteVideo', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: -1,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID,
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
    if (this._play?.video?.dom?.srcObject && this.mediaHelper?.video?.cameraTrack) {
    } else {
      this.logger.log('muteVideo() 之前没有播放过视频, 不支持unmute: ', this.stringStreamID)
      throw new RtcError({
        code: ErrorCode.STREAM_MUTE_VIDEO_ERROR,
        message: 'remoteStream.muteVideo: 之前没有播放过视频, 不支持mute'
      })
    }
    try {
      this.logger.log(`muteVideo() 禁用 ${this.stringStreamID} 的视频轨道`)
      this.muteStatus.video.recv = true
      if (this.mediaHelper && this.mediaHelper.video.cameraTrack) {
        this.mediaHelper.video.cameraTrack.enabled = false
      }
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: 0,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: true
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('API调用失败：Stream:muteVideo', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: -1,
        param: JSON.stringify(
          {
            streamID: this.stringStreamID,
            isRemote: true,
            reason: e.message
          },
          null,
          ' '
        )
      })
    }
  }

  /**
   * 启用视频轨道
   * @function unmuteScreen
   * @memberOf Stream#
   * @return {Promise}
   */

  async unmuteScreen() {
    let errcode, message
    if (!this.muteStatus.screen.recv) {
      errcode = ErrorCode.STREAM_NOT_MUTE_SCREEN_YET
      message = 'remoteStream.unmuteScreen: 当前没有mute屏幕共享, 不支持unmute'
    }
    if (this.mediaHelper.screen.screenVideoTrack) {
    } else {
      errcode = ErrorCode.STREAM_UNMUTE_SCREEN_WITHOUT_STREAM
      message = 'remoteStream.unmuteScreen: 没有屏幕共享流, 无法执行unmute操作'
    }
    this.client.apiFrequencyControl({
      name: 'unmuteScreen',
      code: errcode ? -1 : 0,
      param: JSON.stringify(
        {
          isRemote: true,
          streamID: this.stringStreamID,
          reason: message || ''
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

    try {
      this.logger.log(`unmuteScreen() 启用 ${this.stringStreamID} 的屏幕共享轨道`)
      this.muteStatus.screen.recv = false
      if (this.mediaHelper && this.mediaHelper.screen.screenVideoTrack) {
        this.mediaHelper.screen.screenVideoTrack.enabled = true
      }
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: 0,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('unmuteScreen() 异常: ', e.name, e.message, e)
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: -1,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID,
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
    if (this._play?.screen?.dom?.srcObject && this.mediaHelper?.screen.screenVideoTrack) {
    } else {
      this.logger.log('muteScreen() 之前没有播放过屏幕共享, 不支持unmute: ', this.stringStreamID)
      throw new RtcError({
        code: ErrorCode.STREAM_MUTE_SCREEN_ERROR,
        message: 'remoteStream.muteScreen: 之前没有播放过屏幕共享, 不支持mute'
      })
    }
    try {
      this.logger.log(`muteScreen() 禁用 ${this.stringStreamID} 的屏幕共享轨道`)
      if (this.mediaHelper && this.mediaHelper.screen.screenVideoTrack) {
        this.mediaHelper.screen.screenVideoTrack.enabled = false
      }
      this.muteStatus.screen.recv = true
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: 0,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('muteScreen() 异常: ', e, ...arguments)
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: -1,
        param: JSON.stringify(
          {
            isRemote: true,
            streamID: this.stringStreamID,
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
    this.logger.log('获取视频 flag')
    this.mediaHelper.video.videoStream.getVideoTracks().length > 0
  }

  hasScreen() {
    this.mediaHelper.screen.screenVideoStream.getVideoTracks().length > 0
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
      await this._play.takeSnapshot(options, 'download', this.streamID)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: 0,
        param: {
          ...options,
          streamID: this.stringStreamID,
          isRemote: true
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
            isRemote: true,
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
          isRemote: true,
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
            isRemote: true,
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
        streams.push(this.mediaHelper.audio.audioStream)
        break
    }
    if (streams.length === 0) {
      this.logger.log('未发现要录制的媒体流')
      return
    }
    if (!this._record || !this.streamID || !streams) {
      throw new RtcError({
        code: ErrorCode.RECORDING_ERROR,
        message: 'remoteStream_startMediaRecording: 开始录制时参数异常'
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
        message: 'remoteStream.stopMediaRecording: 录制未开始'
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
        message: 'remoteStream.playMediaRecording: 录制未开始'
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
        message: 'remoteStream.listMediaRecording: 录制未开始'
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
        message: 'remoteStream.cleanMediaRecording: 录制未开始'
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
        message: 'remoteStream.downloadMediaRecording: 录制未开始'
      })
    }
    return this._record.download()
  }

  clearRemotePubStatus() {
    for (let mediaType of MediaTypeList) {
      this[mediaType] = false
      //@ts-ignore
      this.pubStatus[mediaType][mediaType] = false
      this.pubStatus[mediaType].producerId = ''
      this.pubStatus[mediaType].consumerId = ''

      this.pubStatus[mediaType].consumerStatus = 'init'
      this.pubStatus[mediaType].stopconsumerStatus = 'init'
    }
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

      const param = Object.assign({ uid: this.stringStreamID }, options)
      this.client.apiFrequencyControl({
        name: 'setRemoteCanvasWatermarkConfigs',
        code: 0,
        param: {
          isRemote: true,
          streamID: this.stringStreamID,
          mediaType: options.mediaType
        }
      })
    } else {
      this.logger.error('setCanvasWatermarkConfigs：播放器未初始化')
    }
  }

  getMuteStatus(mediaType: MediaTypeShort) {
    if (MediaTypeList.indexOf(mediaType) > -1) {
      return {
        send: this.muteStatus[mediaType].send,
        recv: this.muteStatus[mediaType].recv,
        muted: this.muteStatus[mediaType].send || this.muteStatus[mediaType].recv
      }
    } else {
      const e = new Error(`getMuteStatus Invalid Media ${mediaType}`)
      throw e
    }
  }

  getAdapterRef() {
    if (
      this.client.adapterRef.remoteStreamMap[this.streamID]?.remoteStreamId === this.remoteStreamId
    ) {
      return this.client.adapterRef
    } else {
      return null
    }
  }

  //获取原始dom对象 video主流 screen辅流
  getNativeDom(type: 'screen' | 'video') {
    const enable = this[type]
    const dom = this._play[type]?.dom
    if (!enable || !dom) {
      this.logger.warn(`No remote ${type}`)
    }
    return dom
  }

  /**
   *  销毁实例
   *  @method destroy
   *  @memberOf Stream#
   *  @param {Void}
   */
  destroy() {
    if (!this.client) return
    this.client.apiFrequencyControl({
      name: 'destroy',
      code: 0,
      param: {
        streamID: this.stringStreamID,
        isRemote: true
      }
    })
    this.logger.log(`uid ${this.stringStreamID} 销毁 Stream 实例`)
    this.stop()
    this._reset()
  }
}

export { RemoteStream }

/* eslint prefer-promise-reject-errors: 0 */
