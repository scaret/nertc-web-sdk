
import { EventEmitter } from "eventemitter3";
import {
  VIDEO_QUALITY,
  VIDEO_FRAME_RATE,
  WEBRTC2_VIDEO_QUALITY
} from "../constant/videoQuality";
import {Play} from '../module/play'
import {Record} from '../module/record'
import {
  AdapterRef, AudioMixingOptions,
  AudioProcessingOptions,
  Client,
  MediaRecordingOptions,
  NERtcCanvasWatermarkConfig,
  MediaTypeShort,
  PubStatus,
  RenderMode,
  ScreenProfileOptions,
  SnapshotOptions,
  StreamOptions, StreamPlayOptions,
  SubscribeConfig,
  SubscribeOptions,
  VideoProfileOptions,
} from "../types";
import {MediaHelper} from "../module/media";
import {checkExists, isExistOptions} from "../util/param";
import {
  ReportParamEnableEarback,
  ReportParamSetExternalAudioRender,
  ReportParamSubscribeRemoteSubStreamVideo,
  ReportParamSwitchCamera
} from "../interfaces/ApiReportParam";

/**
 *  请使用 {@link WEBRTC2.createStream} 通过WEBRTC2.createStream创建
 *  @class
 *  @name Stream
 */

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
 *  @param {MeidaTrack} [options.audioSource] 自定义的音频的track
 *  @param {MeidaTrack} [options.videoSource] 自定义的视频的track
 *  @returns {Stream}  
 */
class Stream extends EventEmitter {
  public streamID:number|null;
  public audio: boolean;
  public audioProcessing: AudioProcessingOptions|null;
  public microphoneId:string;
  public cameraId: string;
  public sourceId: string;
  public video: boolean;
  public screen: boolean;
  private client: Client;
  private audioSource: MediaStreamTrack|null;
  private videoSource:MediaStreamTrack|null;
  public mediaHelper:MediaHelper|null;
  _play: Play|null;
  private _record: Record|null;
  public audioProfile:string;
  public videoProfile: {
    frameRate: number;
    videoBW: number;
    resolution: number;
  }|null;
  public screenProfile:{
    frameRate: number;
    videoBW: number;
    resolution: number;
  }|null;
  private inited:boolean;
  public videoView:HTMLElement|null;
  public screenView:HTMLElement|null;
  public renderMode: {
    local: {
      video: RenderMode|{},
      screen: RenderMode|{},
    },
    remote:{
      video: RenderMode|{},
      screen: RenderMode|{},
    }
  };
  private consumerId: string|null;
  private producerId: string|null;
  private inSwitchDevice: boolean;
  public pubStatus:PubStatus;
  subConf: SubscribeConfig;
  public subStatus: { audio: boolean; video: boolean; screen: boolean };
  public muteStatus: {
    // localStream只有send
    // remoteStream的send表示发送端的mute状态，recv表示接收端的mute状态
    audioSend: boolean;
    videoSend: boolean;
    screenSend: boolean;
    audioRecv: boolean;
    videoRecv: boolean;
    screenRecv: boolean;
  };
  private isRemote: boolean;
  
  constructor (options:StreamOptions) {
    super()
    
    if(typeof options.uid !== 'number' || isNaN(options.uid)){
      throw new Error('uid 非 number类型')
    }
    if(options.uid > Number.MAX_SAFE_INTEGER){
      throw new Error('uid 超出 number精度')
    }

    // init for ts rule
    this.isRemote = options.isRemote;
    this.videoProfile = null;
    this.screenProfile = null;
    this.inited = false;
    this.videoView = null;
    this.screenView = null;
    this.renderMode = {
      local: {video: {}, screen: {}}, 
      remote: {video: {}, screen: {}}
    };
    this.consumerId = null;
    this.producerId = null;
    this.inSwitchDevice = false;
    this.pubStatus = {
      audio: {
        audio: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false,
      },
      video: {
        video: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false,
      },
      screen: {
        screen: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false,
      }
    }
    this.subConf = {
      audio: true,
      video: true,
      screen: true,
      highOrLow: 1,
      resolution: 0
    }
    this.subStatus = {
      audio: false,
      video: false,
      screen: false,
    }
    this.muteStatus = {
      audioSend: false,
      videoSend: false,
      screenSend: false,
      audioRecv: false,
      videoRecv: false,
      screenRecv: false,
    }
    this.renderMode = {
      local: {video: {}, screen: {}},
      remote: {video: {}, screen: {}}
    }
    
    this._reset()
    this.streamID = options.uid
    this.audio = options.audio
    this.audioProcessing = options.audioProcessing||null
    this.microphoneId = options.microphoneId || ''
    this.cameraId = options.cameraId || ''
    this.video = options.video || false
    this.screen = options.screen || false
    this.sourceId = options.sourceId || ''
    this.client = options.client
    this.audioSource = options.audioSource || null
    this.videoSource = options.videoSource || null
    this.mediaHelper = this.client.getMediaHlperByUid(this.streamID)
    this._play = new Play({
      sdkRef: this.client,
      adapterRef: this.client.adapterRef,
      uid: options.uid
    })
    this._record = new Record({
      sdkRef: this.client,
      adapterRef: this.client.adapterRef,
      uid: options.uid,
      media: this.mediaHelper
    })
    if (this.client._params && this.client._params.mode === 'live') {
      this.audioProfile = 'music_standard'
    }else{
      this.audioProfile = 'speech_low_quality'
    }
    
    this.client.adapterRef.logger.log('创建Stream: %s', JSON.stringify({
      streamID: options.uid,
      audio: options.audio,
      video: options.video,
    }, null, ' '))
    this.client.apiFrequencyControl({
      name: 'createStream',
      code: 0,
      param: JSON.stringify({
        videoProfile: this.videoProfile,
        audio: this.audio,
        audioProfile: this.audioProfile,
        video: this.video,
        cameraId: this.cameraId,
        microphoneId: this.microphoneId,
        screen: this.screen,
        screenProfile: this.screenProfile
      }, null, ' ')
    })
  }

  _reset () {
    this.streamID = null
    this.inited = false
    this.videoProfile = {
      frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL, //15
      videoBW: 500,
      resolution: WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_480p // 640*480
    }
    this.audioProfile = 'speech_low_quality'
    this.screenProfile = {
      frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5, //5
      videoBW: 1000,
      resolution: WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_1080p // 1920*1080
    }
    this.audio = false
    this.microphoneId = ''
    this.video = false
    this.cameraId = ''
    this.screen = false
    this.sourceId = ''
    this.videoView = null
    this.screenView = null
    this.renderMode = {local: {video: {}, screen: {}}, remote: {video: {}, screen: {}}}
    this.consumerId = null
    this.producerId = null
    this.inSwitchDevice = false
    this.pubStatus = {
      audio: {
        audio: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false,
      },
      video: {
        video: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false,
      },
      screen: {
        screen: false,
        producerId: '',
        consumerId: '',
        consumerStatus: 'init',
        stopconsumerStatus: 'init',
        mute: false,
        simulcastEnable: false,
      }
    }
    this.subConf = {
      audio: true,
      video: true,
      screen: true,
      highOrLow: 1,
      resolution: 0
    }
    this.subStatus = {
      audio: false,
      video: false,
      screen: false,
    }
    this.muteStatus = {
      audioSend: false,
      videoSend: false,
      screenSend: false,
      audioRecv: false,
      videoRecv: false,
      screenRecv: false,
    }
    this.renderMode = {
      local: {video: {}, screen: {}},
      remote: {video: {}, screen: {}}
    }
    if (this.mediaHelper) {
      this.mediaHelper.destroy()
    }
    this.mediaHelper = null
    if (this._play) {
      this._play.destroy()
    }
    this._play = null
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
 
  /**
   *  获取音视频流 ID
   *  @method getId
   *  @memberOf Stream
   *  @return number
   */
  getId () {
    //this.client.adapterRef.logger.log('获取音视频流 ID: ', this.streamID)
    return this.streamID
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
  setSubscribeConfig (conf:SubscribeOptions) {
    this.client.adapterRef.logger.log('设置订阅规则：%o ', JSON.stringify(conf, null, ' '))
    if (typeof conf.audio === "boolean"){
      this.subConf.audio = conf.audio;
    }
    if (typeof conf.video === "boolean"){
      this.subConf.video = conf.video;
    }
    if (typeof conf.screen === "boolean"){
      this.subConf.screen = conf.screen;
    }
    if (typeof conf.highOrLow === "number"){
      this.subConf.highOrLow = conf.highOrLow;
    }
    
    if (this.pubStatus.audio.audio && this.subConf.audio) {
      this.subConf.audio = true
      this.audio = true
    } else {
      this.subConf.audio = false
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

    this.client.adapterRef.logger.log('订阅规则：%o ', JSON.stringify(this.subConf, null, ' '))
    this.client.apiFrequencyControl({
      name: 'setSubscribeConfig',
      code: 0,
      param: JSON.stringify(conf, null, ' ')
    })
    if (this.pubStatus.screen.screen){
      const param:ReportParamSubscribeRemoteSubStreamVideo = {
        uid: this.streamID,
        subscribe: this.subConf.screen
      }
      this.client.apiFrequencyControl({
        name: 'subscribeRemoteSubStreamVideo',
        code: 0,
        param: JSON.stringify(param, null, ' ')
      })
    }
  }

  getAudioStream(){
    if (this.mediaHelper){
      this.client.apiFrequencyControl({
        name: 'setExternalAudioRender',
        code: 0,
        param: JSON.stringify({} as ReportParamSetExternalAudioRender, null, ' ')
      })
      return this.mediaHelper.audioStream;
    }else{
      return null;
    }
  }
  
  /**
   * 初始化音视频流对象
   * @memberOf Stream#
   * @function init
   * @return {Promise}
   */
  async init () {
    this.client.adapterRef.logger.log('初始化音视频流对象')
    this.inited = true
    this.client.adapterRef.localStream = this
    //设置分辨率和码率
    this.client.adapterRef.channelInfo.sessionConfig.maxVideoQuality = WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_1080p
    if (this.videoProfile){
      this.client.adapterRef.channelInfo.sessionConfig.videoQuality = this.videoProfile.resolution
      this.client.adapterRef.channelInfo.sessionConfig.videoFrameRate = this.videoProfile.frameRate
    }
    this.client.apiFrequencyControl({
      name: 'init',
      code: 0,
      param: JSON.stringify({
        videoProfile: this.videoProfile,
        audio: this.audio,
        audioProfile: this.audioProfile,
        audioProcessing: this.audioProcessing,
        video: this.video,
        cameraId: this.cameraId,
        microphoneId: this.microphoneId,
        screen: this.screen,
        sourceId: this.sourceId,
        screenProfile: this.screenProfile
      }, null, ' ')
    })
    
    try {
      if (!this.mediaHelper){
        throw new Error('No MediaHelper');
      }
      if (this.audio){
        await this.mediaHelper.getStream({
          audio: this.audio,
          audioDeviceId: this.microphoneId,
          audioSource: this.audioSource
        })
      }
    } catch (e) {
      this.client.adapterRef.logger.log('打开mic失败: ', e)
      this.audio = false
      if (e.message && e.message.indexOf('Permission denied') > -1) {
        this.client.emit('accessDenied', 'audio')
      } else if (e.message && e.message.indexOf('not found') > -1) {
        this.client.emit('notFound', 'audio')
      } else {
        this.client.emit('deviceError', 'audio')
      }
    }

    try {
      if (!this.mediaHelper){
        throw new Error('No Media Helper');
      }
      if (this.video){
        await this.mediaHelper.getStream({
          video: this.video,
          videoSource: this.videoSource,
          videoDeviceId: this.cameraId,
        })
      }
    } catch (e) {
      this.client.adapterRef.logger.log('打开camera失败: ', e)
      this.video = false
      if (e.message && e.message.indexOf('Permission denied') > -1) {
        this.client.emit('accessDenied', 'video')
      } else if (e.message && e.message.indexOf('not found') > -1) {
        this.client.emit('notFound', 'video')
      } else if (e.message && e.message.indexOf('not start video source') > -1) {
        this.client.emit('beOccupied', 'video')
      } else {
        this.client.emit('deviceError', 'video')
      }
    }

    try {
      if (!this.mediaHelper){
        throw new Error('No Media Helper');
      }
      if (this.screen){
        await this.mediaHelper.getStream({
          screen: this.screen
        })
      }
    } catch (e) {
      this.client.adapterRef.logger.log('打开屏幕共享失败: ', e)
      // this.video = false
      // if (e.message && e.message.indexOf('Permission denied') > -1) {
      //   this.client.emit('accessDenied', 'video')
      // } else if (e.message && e.message.indexOf('not found') > -1) {
      //   this.client.emit('notFound', 'video')
      // } else if (e.message && e.message.indexOf('not start video source') > -1) {
      //   this.client.emit('beOccupied', 'video')
      // } else {
      //   this.client.emit('deviceError', 'video')
      // }
    }
  }
  
  /**
   * 获取音频轨道
   * @function getAudioTrack
   * @memberOf STREAM#
   * @return {MediaStreamTrack}
   */
  getAudioTrack () {
    if (this.mediaHelper){
      return this.mediaHelper.micTrack || this.mediaHelper.audioSource || null;
    }else{
      return null;
    }
  }

  /**
   * 获取视频轨道
   * @function getVideoTrack
   * @memberOf STREAM#
   * @return {MediaStreamTrack}
   */
  getVideoTrack () {
    if (this.mediaHelper){
      return this.mediaHelper.cameraTrack || this.mediaHelper.screenTrack || this.mediaHelper.videoSource;
    }
  }

  /**
   * 播放音视频流
   * @function play
   * @memberOf Stream#
   * @param {div} view div标签，播放画面的dom容器节点
   * @return {Promise}
   */
  async play (view:HTMLElement|null|undefined, playOptions:StreamPlayOptions = {}) {
    if (!isExistOptions({tag: 'Stream.playOptions.audio', value: playOptions.audio}).result){
      playOptions.audio = this.isRemote;
    }
    if (playOptions.audio && !this.isRemote && !playOptions.audioType){
      playOptions.audioType = "mixing";
    }
    if (!isExistOptions({tag: 'Stream.playOptions.video', value: playOptions.video}).result){
      playOptions.video = true;
    }
    if (!isExistOptions({tag: 'Stream.playOptions.screen', value: playOptions.screen}).result){
      playOptions.screen = true;
    }
    
    this.client.adapterRef.logger.log('音视频播放: ', this.streamID, playOptions)
    if (this.isRemote){
      if(playOptions.audio && this._play && this.mediaHelper && this.mediaHelper.audioStream){
        this.client.adapterRef.logger.log('开始播放远端音频: ', this.streamID)
        this._play.playAudioStream(this.mediaHelper.audioStream)
      }
    }else{
      if(playOptions.audio && this._play && this.mediaHelper && this.mediaHelper.micStream){
        this.client.adapterRef.logger.log('开始播放本地音频: ',this.streamID, playOptions.audioType);
        if (playOptions.audioType === "voice"){
          this._play.playAudioStream(this.mediaHelper.micStream)
        }else if (playOptions.audioType === "music"){
          this._play.playAudioStream(this.mediaHelper.musicStream)
        }else if (playOptions.audioType === "mixing"){
          this._play.playAudioStream(this.mediaHelper.audioStream)
        }
      }
    }

    if (view){
      if (playOptions.video){
        this.videoView = view;
        if(this._play && this.mediaHelper && this.mediaHelper.videoStream && this.mediaHelper.videoStream.getVideoTracks().length){
          this.client.adapterRef.logger.log('开始播放视频: ', this.streamID)
          this._play.playVideoStream(this.mediaHelper.videoStream, view)
        }  
      }
      if (playOptions.screen){
        this.screenView = view;
        if(this._play && this.mediaHelper && this.mediaHelper.screenStream && this.mediaHelper.screenStream.getVideoTracks().length){
          this.client.adapterRef.logger.log('开始播放辅流: ', this.streamID)
          this._play.playScreenStream(this.mediaHelper.screenStream, view)
        }
      }
    }
    if (!this.isRemote && playOptions.audio){
      const param:ReportParamEnableEarback = {
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
      param: JSON.stringify({
        playOptions:playOptions,
        audio: this.audio,
        video: this.video,
        screen: this.screen,
        renderMode: this.renderMode
      }, null, ' ')
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
  setLocalRenderMode (options: RenderMode, mediaType?: MediaTypeShort) {
    if (!options || !(options.width - 0) || !(options.height - 0)) {
      this.client.adapterRef.logger.warn('setLocalRenderMode 参数错误')
      this.client.apiFrequencyControl({
        name: 'setLocalRenderMode',
        code: -1,
        param: JSON.stringify(options, null, ' ')
      })
      return 'INVALID_ARGUMENTS'
    }
    this.client.adapterRef.logger.log('设置本地视频播放窗口大小: ', JSON.stringify(options, null, ' '), mediaType)
    // mediaType不填则都设
    if (!mediaType || mediaType === "video"){
      if (this._play){
        this._play.setVideoRender(options)
      }
      this.renderMode.local.video = options;
    }
    if (!mediaType || mediaType === "screen"){
      this.renderMode.local.screen = options;
      if (this._play){
        this._play.setScreenRender(options)
      }
    }
    this.client.apiFrequencyControl({
      name: 'setLocalRenderMode',
      code: 0,
      param: JSON.stringify(options, null, ' ')
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
  setRemoteRenderMode (options:RenderMode, mediaType?:MediaTypeShort) {
    if (!options || !(options.width - 0) || !(options.height - 0)) {
      this.client.adapterRef.logger.warn('setRemoteRenderMode 参数错误')
      this.client.apiFrequencyControl({
        name: 'setRemoteRenderMode',
        code: -1,
        param: JSON.stringify(options, null, ' ')
      })
    }
    if (!this.client || !this._play) {
      return
    } 
    this.client.adapterRef.logger.log('设对端视频播放窗口大小: ', JSON.stringify(options, null, ' '))
    // mediaType不填则都设
    if (!mediaType || mediaType === "video"){
      if (this._play){
        this._play.setVideoRender(options)
      }
      this.renderMode.remote.video = options;
    }
    if (!mediaType || mediaType === "screen"){
      this.renderMode.remote.screen = options;
      if (this._play){
        this._play.setScreenRender(options)
      }
    }
    this.client.apiFrequencyControl({
      name: 'setRemoteRenderMode',
      code: 0,
      param: JSON.stringify(options, null, ' ')
    })
  }

  /**
   * 停止播放音视频流
   * @function stop
   * @memberOf Stream#
   * @return {Void}
   */
  stop (type?:MediaTypeShort) {
    this.client.adapterRef.logger.log('停止播放 %s 音视频流', this.streamID)
    if(!this._play) return
    if (type === 'audio') {
      this._play.stopPlayAudioStream()
    } else if (type === 'video') {
      this._play.stopPlayVideoStream()
    } else if (type === 'screen') {
      this._play.stopPlayScreenStream()
    } else {
      if(!this.audio){
        this._play.stopPlayAudioStream()
      } if (!this.video){
        this._play.stopPlayVideoStream()
      } if (!this.screen){
        this._play.stopPlayScreenStream()
      }
    }
    this.client.apiFrequencyControl({
      name: 'stop',
      code: 0,
      param: JSON.stringify({
        audio: this.audio,
        video: this.video,
        screen: this.screen,
        renderMode: this.renderMode
      }, null, ' ')
    })
  }

  /**
   * 返回音视频流当前是否在播放状态
   * @function isPlaying
   * @memberOf Stream#
   * @param {string} type 查看的媒体类型： audio/video
   * @returns {Promise}
   */
  async isPlaying (type:MediaTypeShort) {
    let isPlaying = false
    if (!this._play) {

    } else if (type === 'audio') {
      isPlaying = await this._play.isPlayAudioStream()
    } else if (type === 'video') {
      isPlaying = await this._play.isPlayVideoStream()
    }else if (type === 'screen') {
      isPlaying = await this._play.isPlayScreenStream()
    } else {
      this.client.adapterRef.logger.warn('isPlaying: unknown type')
      return Promise.reject('unknownType')
    }
    this.client.adapterRef.logger.log(`检查${this.streamID}的${type}播放状态: ${isPlaying}`)
    return isPlaying
  }

  /**
   * 打开音视频输入设备，如麦克风、摄像头、屏幕共享,并且发布出去
   * @function open
   * @memberOf Stream#
   * @param {Object} options 配置对象
   * @param {String }  options.type 媒体设备: audio/video/screen
   * @param {String }  options.deviceId 指定要开启的设备ID，通过getDevices接口获取到设备列表
   * @param {String }  options.sourceId 屏幕共享的数据源Id（electron用户可以自己获取）
   * @returns {Promise}
   */
  async open (options:{type: MediaTypeShort, deviceId?: string, sourceId?: string}) {
    let {type, deviceId, sourceId} = options
    if (this.client._roleInfo.userRole === 1) {
      const reason = `观众不允许打开设备`;
      this.client.adapterRef.logger.error(reason);
      this.client.apiFrequencyControl({
        name: 'open',
        code: -1,
        param: JSON.stringify({
          reason: reason,
          type
        }, null, ' ')
      });
      return Promise.reject(`INVALID_OPERATION`);
    }
    
    try {
      switch(type) {
        case 'audio': 
          this.client.adapterRef.logger.log('开启mic设备')
          this.audio = true
          if(this.mediaHelper){
            await this.mediaHelper.getStream({audio: true, audioDeviceId: deviceId})
            await this.client.publish(this)
          }
          break
        case 'video':
        case 'screen':
          this.client.adapterRef.logger.log(`开启${type === 'video' ? 'camera' : 'screen'}设备`)
          if (this[type]) {
            this.client.adapterRef.logger.log('请先关闭摄像头或者屏幕共享')
            this.client.apiFrequencyControl({
              name: 'open',
              code: -1,
              param: JSON.stringify({
                reason: '请先关闭摄像头或者屏幕共享',
                type
              }, null, ' ')
            })
            return Promise.reject('CLOSE_VIDEO_OR_SCREEN_FIRST')
          }
          this[type] = true
          const constraint:any = {
            videoDeviceId: deviceId,
            sourceId
          }
          constraint[type] = true
          if (this.mediaHelper){
            await this.mediaHelper.getStream(constraint)
            await this.client.publish(this)
          }
          break
        default:
          this.client.adapterRef.logger.error('非法参数')
      }
      this.client.apiFrequencyControl({
        name: 'open',
        code: 0,
        param: JSON.stringify({
          type
        }, null, ' ')
      })
    } catch (e) {
      if (["audio", "video", "screen"].indexOf(type) > -1){
        //@ts-ignore
        this[type] = false
      }
      this.client.adapterRef.logger.log(`${type} 开启失败: `, e.message)
      this.client.apiFrequencyControl({
        name: 'open',
        code: -1,
        param: JSON.stringify({
          reason: e.message,
          type
        }, null, ' ')
      })

      if (e.message && e.message.indexOf('Permission denied') > -1) {
        this.client.emit('accessDenied', type)
        return Promise.reject('NotAllowedError')
      } else {
        return Promise.reject(e)
      }
    }
  }

  /**
   * 关闭音视频输入设备，如麦克风、摄像头、屏幕共享，并且停止发布
   * @function close
   * @memberOf Stream#
   * @param {Object} options 配置对象
   * @param {String }  options.type 媒体设备: audio/video/screen
   * @returns {Promise}
   */
  async close (options: { type:MediaTypeShort}) {
    let {type} = options
    let reason = null
    switch(type) {
      case 'audio': 
        this.client.adapterRef.logger.log('关闭mic设备')
        if (!this.audio) {
          this.client.adapterRef.logger.log('没有开启过麦克风')
          reason = 'NOT_OPEN_MIC_YET'
          break
        }
        this.audio = false
        if (this.mediaHelper){
          this.mediaHelper.stopStream('audio')
        }else{
          throw new Error('No Media Helper')
        }
        if (this.client.adapterRef && this.client.adapterRef._mediasoup){
          await this.client.adapterRef._mediasoup.destroyProduce('audio');
        }else{
          throw new Error('No Media Soup');
        }
        break
      case 'video':
        this.client.adapterRef.logger.log('关闭camera设备')
        if (!this.video) {
          this.client.adapterRef.logger.log('没有开启过摄像头')
          reason = 'NOT_OPEN_CAMERA_YET'
          break
        }
        this.video = false
        if (this.mediaHelper){
          this.mediaHelper.stopStream('video')
        }else{
          throw new Error("No mediaHelper");
        }
        if (!this._play){
          throw new Error('No this._play');
        }
        this._play.stopPlayVideoStream()
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        await this.client.adapterRef._mediasoup.destroyProduce('video');
        break
      case 'screen':
        this.client.adapterRef.logger.log('关闭屏幕共享')
        if (!this.screen) {
          this.client.adapterRef.logger.log('没有开启过屏幕共享')
          reason = 'NOT_OPEN_SCREEN_YET'
          break
        }
        this.screen = false
        if (!this.mediaHelper){
          throw new Error('No mediaHelper');
        }
        this.mediaHelper.stopStream('screen')
        if (!this._play){
          throw new Error('No this._play');
        }
        this._play.stopPlayScreenStream()
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        await this.client.adapterRef._mediasoup.destroyProduce('screen');
        break
      default:
        this.client.adapterRef.logger.log('不能识别type')
        reason = 'INVALID_ARGUMENTS'
      if (reason) {
        this.client.apiFrequencyControl({
          name: 'close',
          code: -1,
          param: JSON.stringify({
            reason,
            audio: this.audio,
            video: this.video,
            screen: this.screen,
          }, null, ' ')
        })
        return Promise.reject(reason)
      } else {
        this.client.apiFrequencyControl({
          name: 'close',
          code: 0,
          param: JSON.stringify({
            reason,
            audio: this.audio,
            video: this.video,
            screen: this.screen,
          }, null, ' ')
        })
        return
      }
    }
  }

  /**
   * 启用音频轨道
   * @function unmuteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteAudio () {
    this.client.adapterRef.logger.log('启用音频轨道: ', this.streamID)
    try {
      if (this.streamID == this.client.adapterRef.channelInfo.uid) {
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
          // localstream unmute
        await this.client.adapterRef._mediasoup.unmuteAudio()
        this.muteStatus.audioSend = false;
      } else {
        if (!this._play){
          throw new Error('No _play');
        }
        if (!this.mediaHelper || !this.mediaHelper.audioStream){
          throw new Error('No audioStream');
        }
        this.muteStatus.audioRecv = false;
        if (this.mediaHelper && this.mediaHelper.micTrack){
          this.mediaHelper.micTrack.enabled = true;
        }
        this._play.playAudioStream(this.mediaHelper.audioStream)
      }
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: 0,
        param: JSON.stringify({
          streamID: this.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:unmuteAudio' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: e
        }, null, ' ')
      })
    }
  }

  /**
   * 禁用音频轨道
   * @function muteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteAudio () {
    this.client.adapterRef.logger.log('禁用音频轨道: ', this.streamID)

    try {
      if (this.streamID == this.client.adapterRef.channelInfo.uid) {
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        await this.client.adapterRef._mediasoup.muteAudio()
        // localStream mute
        this.muteStatus.audioSend = true
      } else {
        if (!this._play){
          throw new Error('No _play');
        }
        this.muteStatus.audioRecv = true
        if (this.mediaHelper && this.mediaHelper.micTrack){
          this.mediaHelper.micTrack.enabled = false;
        }
        this._play.stopPlayAudioStream()
      }
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: 0,
        param: JSON.stringify({
          streamID: this.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:muteAudio' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: e
        }, null, ' ')
      })
    }
  }

  /**
   * 当前Stream是否有音频
   * @function hasAudio
   * @memberOf Stream#
   * @return {Boolean}
   */
  hasAudio () {
    return this.audio && this.mediaHelper && this.mediaHelper.audioStream
  }

  /**
   * 当前从麦克风中采集的音量
   * @function getAudioLevel
   * @memberOf Stream#
   * @return {volume}
   */
  getAudioLevel () {
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.getGain()
  }

  /**
   * 设置音频属性
   * @function setAudioProfile
   * @memberOf Stream#
   * @param {String} profile 要设置的音频的属性：speech_low_quality（表示16 kHz 采样率，单声道，编码码率约 24 Kbps）、speech_standard'（表示32 kHz 采样率，单声道，编码码率约 24 Kbps）、music_standard（表示48 kHz 采样率，单声道，编码码率约 40 Kbps）、standard_stereo（表达48 kHz 采样率，双声道，编码码率约 64 Kbps）、high_quality（表示48 kHz 采样率，单声道， 编码码率约 128 Kbps）、high_quality_stereo（表示48 kHz 采样率，双声道，编码码率约 192 Kbps）                                                                                            
   * @return {Void}
   */
  setAudioProfile (profile:string) {
    this.client.adapterRef.logger.log('设置音频属性: ', profile)
    this.audioProfile = profile
    this.client.apiFrequencyControl({
      name: 'setAudioProfile',
      code: 0,
      param: `${profile}`
    })
  }

  /**
   * 设置音频播放的音量。
   * @function setAudioVolume
   * @memberOf Stream#
   * @param {Number} volume 要设置的远端音频的播放音量，范围为 0（静音）到 100（声音最大）
   * @return {Promise}
   */
  setAudioVolume (volume = 100) {
    let reason = null
    if (!Number.isInteger(volume)) {
      this.client.adapterRef.logger.log('volume 为 0 - 100 的整数')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume < 0) {
      volume = 0
    } else if (volume > 100) {
      volume = 255
    } else {
      volume = volume * 2.55
    }
    this.client.adapterRef.logger.log(`调节${this.streamID}的音量大小: ${volume}`)

    if (this.audio) {
      if (!this._play){
        throw new Error('No _play');
      }
      this._play.setPlayVolume(volume)
    } else {
      this.client.adapterRef.logger.log(`没有音频流，请检查是否有发布过音频`)
      reason = 'INVALID_OPERATION'
    }
    if (reason) {
      this.client.apiFrequencyControl({
        name: 'setAudioVolume',
        code: -1,
        param: JSON.stringify({
          volume,
          reason
        }, null, ' ')
      })
      return reason
    }
    this.client.apiFrequencyControl({
      name: 'setAudioVolume',
      code: 0,
      param: JSON.stringify({
        volume
      }, null, ' ')
    })
  }

  /**
   * 设置麦克风采集的音量。
   * @function setCaptureVolume
   * @memberOf Stream#
   * @param {Number} volume 要设置的麦克风采集音量。，范围为 0（静音）到 100（声音最大）
   * @return {Void}
   */
  setCaptureVolume (volume:number) {
    let reason = null
    if (!Number.isInteger(volume)) {
      this.client.adapterRef.logger.log('volume 为 0 - 100 的整数')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume < 0) {
      volume = 0
    } else if (volume > 100) {
      volume = 100
    } 
    this.client.adapterRef.logger.log(`调节${this.streamID}的音量大小: ${volume}`)

    if (this.audio) {
      if (!this.mediaHelper){
        throw new Error('No MediaHelper');
      }
      this.mediaHelper.setGain(volume / 100)
    } else {
      this.client.adapterRef.logger.log(`没有音频流，请检查是否有发布过音频`)
      reason = 'INVALID_OPERATION'
    }
    if (reason) {
      this.client.apiFrequencyControl({
        name: 'setCaptureVolume',
        code: -1,
        param: JSON.stringify({
          volume,
          reason
        }, null, ' ')
      })
      return reason
    }
    this.client.apiFrequencyControl({
      name: 'setCaptureVolume',
      code: 0,
      param: JSON.stringify({
        volume
      }, null, ' ')
    })
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
  async setAudioOutput (deviceId:string, callback: (err:any)=>void) {
    if (this._play) {
      try {
        await this._play.setAudioOutput(deviceId);
      } catch (e) {
        if (callback) {
          setTimeout(() => {
            callback(e);
          }, 0);
        }
        this.client.adapterRef.logger.error('设置输出设备失败');
        throw e;
      }
      if (callback) {
        setTimeout(callback, 0);
      }
    }
  };

  /**
   * 切换媒体输入设备，已经发布的流，切换后不用重新发流
   * @function switchDevice
   * @memberOf Stream#
   * @param {String} type 设备的类型，"audio": 音频输入设备，"video": 视频输入设备
   * @param {String} deviceId 设备的 ID,可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
   * @return {Promise}
   */
  async switchDevice (type:string, deviceId:string) {
    this.client.adapterRef.logger.log(`切换媒体输入设备: ${type}, deviceId: ${deviceId}`)
    let constraint = {}
    if (this.inSwitchDevice) {
      this.client.adapterRef.logger.log(`正在切换中，重复`)
      return Promise.reject('INVALID_OPERATION')
    } else {
      this.inSwitchDevice = true
    }
    if (type === 'audio') {
      if (deviceId === this.microphoneId) {
        this.client.adapterRef.logger.log(`切换相同的麦克风设备，不处理`)
        this.inSwitchDevice = false
        return Promise.resolve()
      } else if(!this.hasAudio()) {
        this.client.adapterRef.logger.log(`当前没有开启音频输入设备，无法切换`)
        this.inSwitchDevice = false
        return Promise.reject('INVALID_OPERATION')
      } else if(this.audioSource) {
        this.client.adapterRef.logger.log(`自定义音频输入不支持，无法切换`)
        this.inSwitchDevice = false
        return Promise.reject('INVALID_OPERATION')
      }
      //constraint = {...this.mediaHelper.audioConstraint, ...{audio: {deviceId: {exact: deviceId}}}}
      if (!this.mediaHelper){
        throw new Error('No MediaHelper');
      }
      if(this.mediaHelper.audioConstraint && this.mediaHelper.audioConstraint.audio){
        this.mediaHelper.audioConstraint.audio.deviceId = {exact: deviceId}
      } else if(this.mediaHelper.audioConstraint){
        this.mediaHelper.audioConstraint.audio = {}
        this.mediaHelper.audioConstraint.audio.deviceId = {exact: deviceId}
      } else {
        this.mediaHelper.audioConstraint = { audio: {deviceId: {exact: deviceId}}}
      }
      constraint = this.mediaHelper.audioConstraint
      this.microphoneId = deviceId
    } else if (type === 'video') {
      if (deviceId === this.cameraId) {
        this.client.adapterRef.logger.log(`切换相同的摄像头设备，不处理`)
        this.inSwitchDevice = false
        return Promise.resolve()
      } else if(!this.hasVideo()) {
        this.client.adapterRef.logger.log(`当前没有开启视频输入设备，无法切换`)
        this.inSwitchDevice = false
        this.client.apiFrequencyControl({
          name: 'switchCamera',
          code: -1,
          param: JSON.stringify({reason: 'INVALID_OPERATION'} as ReportParamSwitchCamera, null, ' ')
        })
        return Promise.reject('INVALID_OPERATION')
      } else if(this.videoSource) {
        this.client.adapterRef.logger.log(`自定义视频输入不支持，无法切换`)
        this.inSwitchDevice = false
        this.client.apiFrequencyControl({
          name: 'switchCamera',
          code: -1,
          param: JSON.stringify({reason: 'INVALID_OPERATION'} as ReportParamSwitchCamera, null, ' ')
        })
        return Promise.reject('INVALID_OPERATION')
      }
      //constraint = {...this.mediaHelper.videoConstraint, ...{video: {deviceId: {exact: deviceId}}}}
      if (!this.mediaHelper){
        throw new Error('No MediaHelper');
      }
      if(this.mediaHelper.videoConstraint && this.mediaHelper.videoConstraint.video){
        this.mediaHelper.videoConstraint.video.deviceId = {exact: deviceId}
        constraint = this.mediaHelper.videoConstraint
      }
      this.cameraId = deviceId
    } else {
      this.client.adapterRef.logger.log(`unknown type`)
      this.inSwitchDevice = false
      return Promise.reject('INVALID_OPERATION')
    }
    try {
      await this.mediaHelper.getSecondStream(constraint)
      this.inSwitchDevice = false
      if (type === "video"){
        this.client.apiFrequencyControl({
          name: 'switchCamera',
          code: 0,
          param: JSON.stringify({} as ReportParamSwitchCamera, null, ' ')
        })
      }
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:switchDevice' ,e, ...arguments);
      this.inSwitchDevice = false
      if (type === "video"){
        this.client.apiFrequencyControl({
          name: 'switchCamera',
          code: -1,
          param: JSON.stringify({reason: e.message || e.name}, null, ' ')
        })
      }
      return Promise.reject(e)
    }
    
  }

  /**
   * 启用视频轨道
   * @function unmuteVideo
   * @memberOf Stream#
   * @return {Promise}
   */
  
  async unmuteVideo () {
    this.client.adapterRef.logger.log(`启用 ${this.streamID} 的视频轨道`)
    try {
      if (this.streamID == this.client.adapterRef.channelInfo.uid) {
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        this.client.adapterRef._mediasoup.unmuteVideo()
        // local unmute
        this.muteStatus.videoSend = false
      } else {
        if (!this._play){
          throw new Error('No _play');
        }
        if (!this.mediaHelper || !this.mediaHelper.videoStream || !this.videoView){
          throw new Error('No mediaHelper or videoStream or this.view');
        }

        this.muteStatus.videoRecv = false
        if (this.mediaHelper && this.mediaHelper.cameraTrack){
          this.mediaHelper.cameraTrack.enabled = true;
        }
        this._play.playVideoStream(this.mediaHelper.videoStream, this.videoView)
        if ("width" in this.renderMode.remote.video){
          this._play.setVideoRender(this.renderMode.remote.video)
        }
      }
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: 0,
        param: JSON.stringify({
          streamID: this.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:unmuteVideo' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: e
        }, null, ' ')
      })
    }
  }

  /**
   * 禁用视频轨道
   * @function muteVideo
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteVideo () {
    this.client.adapterRef.logger.log(`禁用 ${this.streamID} 的视频轨道`)
    try {
      if (this.streamID == this.client.adapterRef.channelInfo.uid) {
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        // local mute
        await this.client.adapterRef._mediasoup.muteVideo()
        this.muteStatus.videoSend = true
      } else {
        if (!this._play){
          throw new Error('No _play');
        }
        this.muteStatus.videoRecv = true
        if (this.mediaHelper && this.mediaHelper.cameraTrack){
          this.mediaHelper.cameraTrack.enabled = false;
        }
        this._play.stopPlayVideoStream()
      }
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: 0,
        param: JSON.stringify({
          streamID: this.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:muteVideo' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: e
        }, null, ' ')
      })
    }
  }

  /**
   * 启用视频轨道
   * @function unmuteScreen
   * @memberOf Stream#
   * @return {Promise}
   */
  
  async unmuteScreen () {
    this.client.adapterRef.logger.log(`启用 ${this.streamID} 的视频轨道`)
    try {
      if (this.streamID == this.client.adapterRef.channelInfo.uid) {
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        this.client.adapterRef._mediasoup.unmuteScreen()
        // local unmute
        this.muteStatus.screenSend = false
      } else {
        if (!this._play){
          throw new Error('No _play');
        }
        if (!this.mediaHelper || !this.mediaHelper.screenStream || !this.screenView){
          throw new Error('No mediaHelper or screenStream or this.view');
        }
        this.muteStatus.screenRecv = false
        if (this.mediaHelper && this.mediaHelper.screenTrack){
          this.mediaHelper.screenTrack.enabled = true;
        }
        this._play.playScreenStream(this.mediaHelper.screenStream, this.screenView)
        if ("width" in this.renderMode.remote.screen){
          this._play.setScreenRender(this.renderMode.remote.screen)
        }
      }
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: 0,
        param: JSON.stringify({
          streamID: this.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:unmuteScreen' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: e
        }, null, ' ')
      })
    }
  }

  /**
   * 禁用视频轨道
   * @function muteScreen
   * @memberOf Stream#
   * @return {Promise}
   */
  async muteScreen () {
    this.client.adapterRef.logger.log(`禁用 ${this.streamID} 的视频轨道`)
    try {
      if (this.streamID == this.client.adapterRef.channelInfo.uid) {
        if (!this.client.adapterRef._mediasoup){
          throw new Error('No _mediasoup');
        }
        // local mute
        await this.client.adapterRef._mediasoup.muteScreen()
        this.muteStatus.screenSend = true
      } else {
        if (!this._play){
          throw new Error('No _play');
        }
        if (this.mediaHelper && this.mediaHelper.screenTrack){
          this.mediaHelper.screenTrack.enabled = false;
        }
        this._play.stopPlayScreenStream()
        this.muteStatus.screenRecv = true
      }
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: 0,
        param: JSON.stringify({
          streamID: this.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.client.adapterRef.logger.error('API调用失败：Stream:muteScreen' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: e
        }, null, ' ')
      })
    }
  }

  /**
   * 获取视频 flag
   * @function hasVideo
   * @return {Boolean}
   */
  hasVideo () {
    this.client.adapterRef.logger.log('获取视频 flag')
    return this.video && this.mediaHelper && this.mediaHelper.videoStream
  }

   /**
   * 设置视频属性。
   * @method setVideoProfile
   * @memberOf Stream#
   * @param {Object} options 配置参数
   * @param {Number} [options.resolution] 设置本端视频分辨率：WebRTC2.VIDEO_QUALITY_180p、WebRTC2.VIDEO_QUALITY_480p、WebRTC2.VIDEO_QUALITY_720p、WebRTC2.VIDEO_QUALITY_1080p
   * @param {Number} [options.frameRate] 设置本端视频帧率：WebRTC2.CHAT_VIDEO_FRAME_RATE_5、WebRTC2.CHAT_VIDEO_FRAME_RATE_10、WebRTC2.CHAT_VIDEO_FRAME_RATE_15、WebRTC2.CHAT_VIDEO_FRAME_RATE_20、WebRTC2.CHAT_VIDEO_FRAME_RATE_25
   * @returns {Null}  
  */
  setVideoProfile (options:VideoProfileOptions) {
    this.client.adapterRef.logger.log('设置视频属性: ', JSON.stringify(options, null, ' '))
    if (!this.videoProfile){
      throw new Error('No videoProfile');
    }
    Object.assign(this.videoProfile, options)
    this.client.adapterRef.channelInfo.sessionConfig.maxVideoQuality = VIDEO_QUALITY.CHAT_VIDEO_QUALITY_1080P
    this.client.adapterRef.channelInfo.sessionConfig.videoQuality = this.videoProfile.resolution
    this.client.adapterRef.channelInfo.sessionConfig.videoFrameRate = this.videoProfile.frameRate
    this.client.apiFrequencyControl({
      name: 'setVideoProfile',
      code: 0,
      param: JSON.stringify(options, null, ' ')
    })
  }


  setVideoEncoderConfiguration () {
    this.client.adapterRef.logger.log('自定义视频编码配置')
  }

  setBeautyEffectOptions () {
    this.client.adapterRef.logger.log('设置美颜效果选项')
  }

  hasScreen () {
    return this.screen && this.mediaHelper && this.mediaHelper.screenStream
  }

  /**
   * 设置屏幕共享属性。
   * @method setScreenProfile
   * @memberOf Stream#
   * @param {Object} options 配置参数
   * @param {String} [options.resolution] 设置本端屏幕共享分辨率：WebRTC2.VIDEO_QUALITY_480p、WebRTC2.VIDEO_QUALITY_720p、WebRTC2.VIDEO_QUALITY_1080p
   * @param {String} [options.frameRate] 设置本端视频帧率：WebRTC2.CHAT_VIDEO_FRAME_RATE_5、WebRTC2.CHAT_VIDEO_FRAME_RATE_10、WebRTC2.CHAT_VIDEO_FRAME_RATE_15、WebRTC2.CHAT_VIDEO_FRAME_RATE_20、WebRTC2.CHAT_VIDEO_FRAME_RATE_25
   * @returns {Void}  
  */
  setScreenProfile (profile: ScreenProfileOptions) {
    this.client.adapterRef.logger.log('设置屏幕共享中的屏幕属性: ', profile)
    Object.assign(this.screenProfile, profile)
    this.client.adapterRef.channelInfo.sessionConfig.screenQuality = profile
    this.client.apiFrequencyControl({
      name: 'setScreenProfile',
      code: 0,
      param: JSON.stringify(profile, null, 2)
    })
  }


  adjustResolution (mediaTypeShort: MediaTypeShort) {

    if ( 'RTCRtpSender' in window && 'setParameters' in window.RTCRtpSender.prototype) {
      const peer = this.client.adapterRef._mediasoup && this.client.adapterRef._mediasoup._sendTransport && this.client.adapterRef._mediasoup._sendTransport.handler._pc
      if (peer){
        let sender, maxbitrate;
        if (mediaTypeShort === "video"){
          sender = peer.videoSender;
          maxbitrate = this.getVideoBW();
        }else if (mediaTypeShort === "screen"){
          sender = peer.screenSender;
          maxbitrate = this.getScreenBW();
        }
        if (!maxbitrate){
          return;
        }
        if (!sender){
          throw new Error(`Unknown media type ${mediaTypeShort}`);
        }
        const parameters = sender.getParameters();
        if (!parameters) {
          console.error("No Parameter");
          return;
        }
        if (!parameters.encodings) {
          parameters.encodings = [{}];
        }
        parameters.encodings[0].maxBitrate = maxbitrate;
        //this.client.adapterRef.logger.warn('设置video 码率: ', parameters)
        sender.setParameters(parameters)
          .then(() => {
            //this.client.adapterRef.logger.log('设置video 码率成功')
          })
          .catch((e:any) => {
            this.client.adapterRef.logger.error('设置video 码率失败: ', e)
          });
      }
    }
  }

  getVideoBW(){
    if (!this.videoProfile){
      throw new Error('No this.videoProfile');
    }
    if(this.videoProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_180p) {
      return 300 * 1000
    } else if (this.videoProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_480p) {
      return 800 * 1000
    } else if (this.videoProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_720p) {
      return 1200 * 1000
    } else if (this.videoProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_1080p) {
      return 1500 * 1000
    } return 0
  }
  
  getScreenBW(){
    if (!this.screenProfile){
      throw new Error('No this.screenProfile');
    }
    if(this.screenProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_180p) {
      return 300 * 1000
    } else if (this.screenProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_480p) {
      return 800 * 1000
    } else if (this.screenProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_720p) {
      return 1200 * 1000
    } else if (this.screenProfile.resolution == WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_1080p) {
      return 1500 * 1000
    } return 0
  }
  /**
   * 截取指定用户的视频画面(文件保存在浏览器默认路径)
   * @function takeSnapshot
   * @memberOf Stream#
   * @param  {Object} options  配置参数
   * @param  {String} options.name 截取的图片的保存名称(默认是uid-1的格式名称)
   * @returns {Promise} 
   */
  async takeSnapshot (options: SnapshotOptions) {
    if (this.video || this.screen) {
      if (!this._play){
        throw new Error('No _play');
      }
      await this._play.takeSnapshot(options)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: 0,
        param: JSON.stringify(options, null, ' ')
      })
    } else {
      this.client.adapterRef.logger.log(`没有视频流，请检查是否有 ${this.inited ? '发布' : '订阅'} 过视频`)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: -1,
        param: JSON.stringify({
          streamID: this.streamID,
          reason: `没有视频流，请检查是否有 ${this.inited ? '发布' : '订阅'} 过视频`
        }, null, ' ')
      })
      return 'INVALID_OPERATION'
    }
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
  async startMediaRecording (options: MediaRecordingOptions) {
    const streams = []
    if (this.client.adapterRef.channelInfo.uid === this.streamID) { // 录制自己
      if (!this.mediaHelper){
        throw new Error('No MediaHelper');
      }
      switch (options.type) {
        case 'screen':
          this.mediaHelper.screenStream && streams.push(this.mediaHelper.screenStream)
          this.mediaHelper.audioStream && streams.push(this.mediaHelper.audioStream)
          break;
        case 'camera':
        case 'video':
          this.mediaHelper.videoStream && streams.push(this.mediaHelper.videoStream)
          this.mediaHelper.audioStream && streams.push(this.mediaHelper.audioStream)
          break
        case 'audio':
          // 音频则为混音
          const mediaHelpers = this.client.adapterRef.mediaHelpers
          Object.values(mediaHelpers).forEach((item) => {
            if (item.audioStream) {
              streams.push(item.audioStream)
            }
          })
      }
    } else { // 录制别人
      if (!this.mediaHelper){
        throw new Error('No MediaHelper');
      }
      switch (options.type) {
        case 'screen':
          this.mediaHelper.screenStream && streams.push(this.mediaHelper.screenStream)
          this.mediaHelper.audioStream && streams.push(this.mediaHelper.audioStream)
          break;
        case 'camera':
        case 'video':
          this.mediaHelper.videoStream && streams.push(this.mediaHelper.videoStream)
          this.mediaHelper.audioStream && streams.push(this.mediaHelper.audioStream)
          break
        case 'audio':
          this.mediaHelper.audioStream && streams.push(this.mediaHelper.audioStream)
          break;
      }
    }
    if (streams.length === 0) {
      this.client.adapterRef.logger.log('没有没发现要录制的媒体流')
      return 
    }
    if (!this._record || !this.streamID || !streams){
      throw new Error('startMediaRecording: 参数错误');
    }
    return this._record && this._record.start({
      uid: this.streamID,
      type: options.type,
      reset: options.reset,
      stream: streams
    })
  }
  /**
   * 结束视频录制
   * @function stopMediaRecording
   * @memberOf Stream#
   * @param {Object} options 参数对象
   * @param {String} options.recordId 录制id，可以通过listMediaRecording接口获取
   * @returns {Promise}
   */
  stopMediaRecording (options: {recordId?: string}) {
    if (!this._record){
      throw new Error('No this._record');
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
  playMediaRecording (options:{recordId: string; view: HTMLElement}) {
    if (!this._record){
      throw new Error('No this._record');
    }
    return this._record.play(options.view)
  }
  /**
   * 枚举录制的音视频
   * @function listMediaRecording
   * @memberOf Stream#
   * @returns {Array}
   */
  listMediaRecording () {
    let list = []
    if (!this._record){
      throw new Error('No this._record');
    }
    const recordStatus = this._record.getRecordStatus();
    if (recordStatus.status !== "init") {
      list.push(recordStatus);
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
  cleanMediaRecording (options: {recordId: string}) {
    if (!this._record){
      throw new Error('No this._record');
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
  downloadMediaRecording (options: {recordId: string}) {
    if (!this._record){
      throw new Error('No this._record');
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
  startAudioMixing (options:AudioMixingOptions) {
    this.client.adapterRef.logger.log('开始伴音')
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.startAudioMixing(options) 
  }

  /**
   * 停止播放伴奏
   * @function stopAudioMixing
   * @memberOf Stream#
   * @return {Promise}
   */
  stopAudioMixing () {
    this.client.adapterRef.logger.log('停止伴音')
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.stopAudioMixing() 
  }

  /**
   * 暂停播放伴奏
   * @function pauseAudioMixing
   * @memberOf Stream#
   * @return {Promise}
   */
  pauseAudioMixing () {
    this.client.adapterRef.logger.log('暂停伴音')
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.pauseAudioMixing() 
  }

  /**
   * 恢复播放伴奏
   * @function resumeAudioMixing
   * @memberOf Stream#
   * @return {Promise}
   */
  resumeAudioMixing () {
    this.client.adapterRef.logger.log('恢复伴音')
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.resumeAudioMixing() 
  }


  /**
   * 调节伴奏音量
   * @function adjustAudioMixingVolume
   * @memberOf Stream#
   * @return {Promise}
   */
  adjustAudioMixingVolume (volume:number) {
    this.client.adapterRef.logger.log('调节伴音音量: %s', volume)
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.setAudioMixingVolume(volume) 
  }

  /**
   * 获取伴奏时长
   * @function getAudioMixingDuration
   * @memberOf Stream#
   * @return {Object}
   */
  getAudioMixingDuration () {
    this.client.adapterRef.logger.log('获取伴音总时长')
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.getAudioMixingTotalTime() 
  }


  /**
   * 获取伴奏播放进度
   * @function getAudioMixingCurrentPosition
   * @memberOf Stream#
   * @memberOf Stream#
   * @return {Object}
   */
  getAudioMixingCurrentPosition () {
    //this.client.adapterRef.logger.log('获取伴音播放进度')
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.getAudioMixingPlayedTime() 
  }

  /**
   * 设置伴奏音频文件的播放位置。可以根据实际情况播放文件，而不是非得从头到尾播放一个文件,单位为ms
   * @function setAudioMixingPosition
   * @memberOf Stream#
   * @param {Number} playStartTime 伴音播放的位置
   * @return {Promise}
   */
  setAudioMixingPosition (playStartTime: number) {
    this.client.adapterRef.logger.log('设置伴音音频文件的播放位置: %s', playStartTime)
    if (!this.mediaHelper){
      throw new Error('No MediaHelper');
    }
    return this.mediaHelper.setAudioMixingPlayTime(playStartTime) 
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

  setCanvasWatermarkConfigs (options: NERtcCanvasWatermarkConfig){
    if (this._play && this._play._watermarkControl){
      let watermarkControl = null;
      if (!options.mediaType || options.mediaType === "video"){
        if (this._play._watermarkControl){
          watermarkControl = this._play._watermarkControl;
        }
      }
      else if (options.mediaType === "screen"){
        if (this._play._watermarkControlScreen){
          watermarkControl = this._play._watermarkControlScreen;
        }
      }
      if (!watermarkControl){
        this.client.adapterRef.logger.error("setCanvasWatermarkConfigs：播放器未初始化", options.mediaType);
        return;
      }

      const LIMITS = {
        TEXT: 10,
        TIMESTAMP: 1,
        IMAGE: 4,
      };
      if (options.textWatermarks && options.textWatermarks.length > LIMITS.TEXT){
        this.client.adapterRef.logger.error(`目前的文字水印数量：${options.textWatermarks.length}。允许的数量：${LIMITS.TEXT}`);
          throw new Error('WATERMARK_EXCEEDS_LIMIT');
      }
      if (options.imageWatermarks && options.imageWatermarks.length > LIMITS.IMAGE){
        this.client.adapterRef.logger.error(`目前的图片水印数量：${options.imageWatermarks.length}。允许的数量：${LIMITS.IMAGE}`);
        throw new Error('WATERMARK_EXCEEDS_LIMIT');
      }
      watermarkControl.checkWatermarkParams(options);
      watermarkControl.updateWatermarks(options);
    }else{
      this.client.adapterRef.logger.error("setCanvasWatermarkConfigs：播放器未初始化");
    }
  };
  /**
   *  销毁实例
   *  @method destroy
   *  @memberOf Stream#
   *  @param {Void}
   */
  destroy () {
    if(!this.client) return
    this.client.apiFrequencyControl({
      name: 'destroy',
      code: 0,
      param: JSON.stringify({
        videoProfile: this.videoProfile,
        audio: this.audio,
        audioProcessing: this.audioProcessing,
        audioProfile: this.audioProfile,
        video: this.video,
        cameraId: this.cameraId,
        microphoneId: this.microphoneId,
        screen: this.screen,
        screenProfile: this.screenProfile
      }, null, ' ')
    })
    this.client.adapterRef.logger.log('销毁 Stream 实例: ', this.streamID)
    this.stop()
    this._reset()
  }
}

export { Stream }

/* eslint prefer-promise-reject-errors: 0 */
