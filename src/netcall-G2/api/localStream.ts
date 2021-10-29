
import { EventEmitter } from "eventemitter3";
import {
  VIDEO_QUALITY,
  VIDEO_FRAME_RATE,
  NERTC_VIDEO_QUALITY,
} from "../constant/videoQuality";
import {Play} from '../module/play'
import {Record} from '../module/record'
import {
  AudioMixingOptions,
  AudioProcessingOptions,
  Client,
  MediaRecordingOptions,
  NERtcCanvasWatermarkConfig,
  MediaTypeShort,
  RenderMode,
  ScreenProfileOptions,
  SnapshotOptions,
  LocalStreamOptions, StreamPlayOptions,
  VideoProfileOptions,
  AudioEffectOptions
} from "../types";
import {MediaHelper} from "../module/media";
import {checkExists, isExistOptions, checkValidInteger} from "../util/param";

import {
  ReportParamEnableEarback,
  ReportParamSetExternalAudioRender,
  ReportParamSwitchCamera
} from "../interfaces/ApiReportParam";
import {AuidoMixingState} from "../constant/state";
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';
import BigNumber from 'bignumber.js'
import {ILogger} from "../types";
import { isHttpProtocol } from '../util/rtcUtil/rtcSupport'

/**
 *  请使用 {@link NERTC.createStream} 通过NERTC.createStream创建
 *  @class
 *  @name Stream
 */

let localStreamCnt = 0;

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
class LocalStream extends EventEmitter {
  public streamID:number|string;
  public stringStreamID:string;
  public audio: boolean;
  public audioProcessing: AudioProcessingOptions|null;
  public microphoneId:string;
  public cameraId: string;
  public sourceId: string;
  public facingMode: string;
  public video: boolean;
  public screen: boolean;
  public screenAudio: boolean;
  public client: Client;
  private audioSource: MediaStreamTrack|null;
  private videoSource:MediaStreamTrack|null;
  public mediaHelper:MediaHelper;
  _play: Play|null;
  private _record: Record|null;
  public audioProfile:string;
  public videoProfile: {
    frameRate: number;
    videoBW: number;
    resolution: number;
  } = {
    frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL, //15
    videoBW: 500,
    resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p // 640*480
  };
  public screenProfile:{
    frameRate: number;
    videoBW: number;
    resolution: number;
  } = {
    frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5, //5
    videoBW: 1000,
    resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p // 1920*1080
  };
  private state:"UNINIT"|"INITING"|"INITED" = "UNINIT";
  public videoView:HTMLElement|null|undefined|String = null;
  public screenView:HTMLElement|null|undefined|String = null;
  public renderMode: {
    local: {
      video: RenderMode|{},
      screen: RenderMode|{},
    },
  } = { local: {video: {}, screen: {}},};
  private inSwitchDevice: boolean = false;
  public pubStatus: {
    audio: {audio: boolean},
    video: {video: boolean},
    screen: {screen: boolean},
  } = {audio: {audio: false}, video: {video: false}, screen: {screen: false}};
  public muteStatus: {
    // localStream只有send
    // remoteStream的send表示发送端的mute状态，recv表示接收端的mute状态
    audioSend: boolean;
    videoSend: boolean;
    screenSend: boolean;
  } = {audioSend: false, videoSend: false, screenSend: false};
  public isRemote: false = false;
  private audioPlay_: boolean = false;
  private videoPlay_: boolean = false;
  private screenPlay_: boolean = false;
  public active:boolean = true;
  public logger:ILogger;
  public localStreamId: number;
  
  constructor (options:LocalStreamOptions) {
    super()
    this.localStreamId = localStreamCnt++;
    this.logger = options.client.adapterRef.logger.getChild(()=>{
      // logger要写在constructor里，方便绑定闭包传递
      let tag = (this.localStreamId ? `local${this.localStreamId}` : `localStream`);
      if (this.mediaHelper){
        let avsState = "";
        if (this.mediaHelper.micTrack){
          avsState += "m";
        }
        if (this.mediaHelper.cameraTrack){
          avsState += "c";
        }
        if (this.mediaHelper.screenTrack){
          avsState += "s";
        }
        if (this.mediaHelper.screenAudioTrack){
          // screenAudio的标记位为t，即s的下一个字母
          avsState += "t";
        }
        if (avsState){
          tag += " " + avsState
        }
      }
      if (this.state !== "INITED"){
        tag += " " + this.state
      }
      if (this.state === "INITED" && this.client && this.client.adapterRef.localStream !== this){
        tag += " DETACHED";
      }
      return tag
    })
    if(!options.uid){
      // 允许不填uid
      options.uid = `local_${this.localStreamId}`;
    }
    else if (typeof options.uid === 'string' || BigNumber.isBigNumber(options.uid)) {
      this.logger.log('uid是string类型')
      options.client.adapterRef.channelInfo.uidType = 'string'
    } else if (typeof options.uid === 'number') {
      this.logger.log('uid是number类型')
      options.client.adapterRef.channelInfo.uidType = 'number'
      if(options.uid > Number.MAX_SAFE_INTEGER){
        throw new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'uid is exceeds the scope of Number'
        })
      }
    } else {
      this.logger.error('uid参数格式非法')
      throw new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'uid is invalid'
      })
    }
    this._reset()
    this.streamID = options.uid
    this.stringStreamID = this.streamID.toString()
    this.audio = options.audio
    this.audioProcessing = options.audioProcessing||null
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
    this.mediaHelper = new MediaHelper({
      adapterRef: this.client.adapterRef,
      uid: options.uid,
      stream: this,
    });
    this._play = new Play({
      stream: this,
    })
    this._record = new Record({
      logger: this.logger,
      adapterRef: this.client.adapterRef,
      uid: this.client.adapterRef.channelInfo.uidType === 'string' ? this.stringStreamID : this.streamID,
      media: this.mediaHelper
    })
    if (this.client._params && this.client._params.mode === 'live') {
      this.audioProfile = 'music_standard'
    }else{
      this.audioProfile = 'speech_low_quality'
    }
    
    this.logger.log(`创建 本地 Stream: `, JSON.stringify({
      streamID: this.stringStreamID,
      audio: options.audio,
      video: options.video,
    }))
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
    this.streamID = ''
    this.stringStreamID = ''
    this.state = "UNINIT";
    this.videoProfile = {
      frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL, //15
      videoBW: 500,
      resolution: NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p // 640*480
    }
    this.audioProfile = 'speech_low_quality'
    this.screenProfile = {
      frameRate: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5, //5
      videoBW: 1000,
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
    this.renderMode = {local: {video: {}, screen: {}}}
    this.inSwitchDevice = false
    this.pubStatus = {
      audio: {
        audio: false,
      },
      video: {
        video: false,
      },
      screen: {
        screen: false,
      }
    }

    this.muteStatus = {
      audioSend: false,
      videoSend: false,
      screenSend: false,
    }
    this.renderMode = {
      local: {video: {}, screen: {}}
    }
    if (this.mediaHelper) {
      this.mediaHelper.destroy()
    }
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
    this.logger.log('获取音视频流 ID: ', this.streamID)
    if (this.client.adapterRef.channelInfo.uidType === 'string') {
      return this.stringStreamID
    }
    return this.streamID 
  }
  /**
   *  获取音视频流的连接数据
   *  @method getStats
   *  @memberOf Stream
   *  @return object
   */

  async getStats() {
    let localPc = this.client.adapterRef && this.client.adapterRef._mediasoup && this.client.adapterRef._mediasoup._sendTransport && this.client.adapterRef._mediasoup._sendTransport._handler._pc;
    this.logger.log(`获取音视频连接数据, uid: ${this.stringStreamID}`);
    if (localPc) {
      const stats = {
        accessDelay: "0",
        audioSendBytes: "0",
        audioSendPackets: "0",
        audioSendPacketsLost: "0",
        videoSendBytes: "0",
        videoSendFrameRate: "0",
        videoSendPackets: "0",
        videoSendPacketsLost: "0",
        videoSendResolutionHeight: "0",
        videoSendResolutionWidth: "0"
      };
      try {
        const results = await localPc.getStats();
        results.forEach((item:any) => {
          if (item.type === 'outbound-rtp') {
            if (item.mediaType === 'video') {
              stats.videoSendBytes = item.bytesSent.toString();
              stats.videoSendPackets = item.packetsSent.toString();
              stats.videoSendFrameRate = item.framesPerSecond.toString();
            } else if (item.mediaType === 'audio') {
              stats.audioSendBytes = item.bytesSent.toString();
              stats.audioSendPackets = item.packetsSent.toString();
            }
          } else if (item.type === 'candidate-pair') {
            if (typeof item.currentRoundTripTime === 'number') {
              stats.accessDelay = (item.currentRoundTripTime * 1000).toString();
            }
          } else if (item.type === 'track') {
            if (typeof item.frameWidth !== 'undefined') {
              stats.videoSendResolutionWidth = item.frameWidth.toString();
              stats.videoSendResolutionHeight = item.frameHeight.toString();
            }
          } else if (item.type === 'remote-inbound-rtp') {
            if (item.kind === 'audio') {
              stats.audioSendPacketsLost = item.packetsLost.toString();
            } else if (item.kind === 'video') {
              stats.videoSendPacketsLost = item.packetsLost.toString();
            }
          }
        });
      } catch (error) {
        this.logger.error('failed to get localStats', error.name, error.message);
      }
      return stats;
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
    if(!!isHttpProtocol()){
      this.logger.warn('The current protocol is HTTP')
    }
    this.state = "INITING"
    this.logger.log('初始化音视频流对象')
    this.client.adapterRef.localStream = this
    //设置分辨率和码率
    this.client.adapterRef.channelInfo.sessionConfig.maxVideoQuality = NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p
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
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper'
        })
      }
      if (this.audio){
        await this.mediaHelper.getStream({
          audio: this.audio,
          audioDeviceId: this.microphoneId,
          audioSource: this.audioSource
        })
      }
    } catch (e) {
      this.logger.log('打开mic失败: ', e.name, e.message)
      this.audio = false
      if (e.message
        // 为什么这样写：
        // Safari和ios的提示是：The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
        // Chrome的提示是：Permission Denied. Permission Denied by system
        && e.message.indexOf('ermission') > -1
        && e.message.indexOf('denied') > -1 ) {
        this.client.safeEmit('accessDenied', 'audio')
      } else if (e.message && e.message.indexOf('not found') > -1) {
        this.client.safeEmit('notFound', 'audio')
      } else {
        this.client.safeEmit('deviceError', 'audio')
      }
      this.emit('device-error', {type: 'audio', error: e});
    }

    try {
      if (!this.mediaHelper){
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper'
        })
      }
      if (this.video){
        await this.mediaHelper.getStream({
          video: this.video,
          videoSource: this.videoSource,
          videoDeviceId: this.cameraId,
        })
      }
    } catch (e) {
      this.logger.log('打开camera失败: ', e.name, e.message)
      this.video = false
      if (e.message
        // 为什么这样写：
        // Safari和ios的提示是：The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
        // Chrome的提示是：Permission Denied. Permission Denied by system
        && e.message.indexOf('ermission') > -1
        && e.message.indexOf('denied') > -1 ) {
        this.client.safeEmit('accessDenied', 'video')
      } else if (e.message && e.message.indexOf('not found') > -1) {
        this.client.safeEmit('notFound', 'video')
      } else if (e.message && e.message.indexOf('not start video source') > -1) {
        this.client.safeEmit('beOccupied', 'video')
      } else {
        this.client.safeEmit('deviceError', 'video')
      }
      this.emit('device-error', {type: 'video', error: e});
    }

    try {
      if (!this.mediaHelper){
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper'
        })
      }
      if (this.screen){
        await this.mediaHelper.getStream({
          sourceId: this.sourceId,
          facingMode: this.facingMode,
          screen: this.screen,
          screenAudio: this.screenAudio,
        })
      }
    } catch (e) {
      this.logger.log('打开屏幕共享失败: ', e.name, e.message)
      this.screen = true
      if (e.message
        // 为什么这样写：
        // Safari和ios的提示是：The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
        // Chrome的提示是：Permission Denied. Permission Denied by system
        && e.message.indexOf('ermission') > -1
        && e.message.indexOf('denied') > -1
      ) {
        this.client.safeEmit('accessDenied', 'screen')
      }else if (e.message && e.message.indexOf('not found') > -1) {
        this.client.safeEmit('notFound', 'screen')
      } else if (e.message && e.message.indexOf('not start video source') > -1) {
        this.client.safeEmit('beOccupied', 'screen')
      } else {
        this.client.safeEmit('deviceError', 'screen')
      }
      this.emit('device-error', {type: 'screen', error: e});
    }
    this.state = "INITED"
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
  async play (view:HTMLElement|String|null|undefined, playOptions:StreamPlayOptions = {}) {
    if (!isExistOptions({tag: 'Stream.playOptions.audio', value: playOptions.audio}).result){
      playOptions.audio = false;
    }
    if (playOptions.audio && !playOptions.audioType){
      playOptions.audioType = "mixing";
    }
    if (!isExistOptions({tag: 'Stream.playOptions.video', value: playOptions.video}).result){
      playOptions.video = true;
    }
    if (!isExistOptions({tag: 'Stream.playOptions.screen', value: playOptions.screen}).result){
      playOptions.screen = true;
    }
    
    this.logger.log(`uid ${this.stringStreamID} Stream.play::`, JSON.stringify(playOptions))
    if(playOptions.audio && this._play && this.mediaHelper && this.mediaHelper.micStream){
      this.logger.log(`uid ${this.stringStreamID} 开始播放本地音频: `, playOptions.audioType);
      if (playOptions.audioType === "voice"){
        this._play.playAudioStream(this.mediaHelper.micStream, playOptions.muted)
        this.audioPlay_ = true;
      }else if (playOptions.audioType === "music"){
        this._play.playAudioStream(this.mediaHelper.musicStream, playOptions.muted)
        this.audioPlay_ = true;
      }else if (playOptions.audioType === "mixing"){
        this._play.playAudioStream(this.mediaHelper.audioStream, playOptions.muted)
        this.audioPlay_ = true;
      }
    }

    if (typeof view === "string") {
      view = document.getElementById(view)
    }

    if (view){
      if (playOptions.video){
        this.videoView = view;
        if(this._play && this.mediaHelper && this.mediaHelper.videoStream && this.mediaHelper.videoStream.getVideoTracks().length){
          this.logger.log(`uid ${this.stringStreamID} 开始启动视频播放 主流 本地`);
          try{
            //@ts-ignore
            await this._play.playVideoStream(this.mediaHelper.videoStream, view)
            if ("width" in this.renderMode.local.video){
              this._play.setVideoRender(this.renderMode.local.video)
            }
            this.videoPlay_ = true;
          }catch(error) {
            // let ErrorMessage = 'NotAllowedError: videoplay is not allowed in current browser, please refer to https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082' 
            // throw new RtcError({
            //   code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
            //   message: ErrorMessage
            // })
            this.videoPlay_ = false;
            this.client.emit('notAllowedError', error)
            this.client.emit('NotAllowedError', error) // 兼容临时版本客户
          }
        }  
      }
      if (playOptions.screen){
        this.screenView = view;
        if(this._play && this.mediaHelper && this.mediaHelper.screenStream && this.mediaHelper.screenStream.getVideoTracks().length){
          this.logger.log(`uid ${this.stringStreamID} 开始启动视频播放 辅流 本地`);
          try{
            //@ts-ignore
            await this._play.playScreenStream(this.mediaHelper.screenStream, view)
            if ("width" in this.renderMode.local.screen){
              this._play.setScreenRender(this.renderMode.local.screen)
            }
            this.screenPlay_ = false;
          }catch(error){
            this.screenPlay_ = false;
            this.client.emit('notAllowedError', error)
            this.client.emit('NotAllowedError', error) // 兼容临时版本客户
          }
        }
      }
    }
    if (playOptions.audio){
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
   * 恢复播放音视频流
   * @function resume
   * @memberOf Stream#
   * @return {Promise}
   */
  async resume() {
    if(this._play){
      await this._play.resume();
      if (this._play.audioDom && !this._play.audioDom.paused){
        this.audioPlay_ = true;
      }
      if (this._play.videoDom && !this._play.videoDom.paused){
        this.videoPlay_ = true;
      }
      if (this._play.screenDom && !this._play.screenDom.paused){
        this.screenPlay_ = true;
      }
    }

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
      this.logger.warn('setLocalRenderMode 参数错误')
      this.client.apiFrequencyControl({
        name: 'setLocalRenderMode',
        code: -1,
        param: JSON.stringify(options, null, ' ')
      })
      return 'INVALID_ARGUMENTS'
    }
    this.logger.log(`uid ${this.stringStreamID} 设置本地视频播放窗口大小: `, mediaType || "video+screen", JSON.stringify(options))
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
   * 停止播放音视频流
   * @function stop
   * @memberOf Stream#
   * @return {Void}
   */
  stop (type?:MediaTypeShort) {
    this.logger.log(`uid ${this.stringStreamID} Stream.stop: 停止播放 ${type || "音视频流"}`)
    if(!this._play) return
    if (type === 'audio') {
      this._play.stopPlayAudioStream()
      this.audioPlay_ = false;
    } else if (type === 'video') {
      this._play.stopPlayVideoStream()
      this.videoPlay_ = false;
    } else if (type === 'screen') {
      this._play.stopPlayScreenStream()
      this.screenPlay_ = false;
    } else {
      if(this._play.audioDom){
        this._play.stopPlayAudioStream()
        this.audioPlay_ = false;
      } if (this._play.videoDom){
        this._play.stopPlayVideoStream()
        this.videoPlay_ = false;
      } if (this._play.screenDom){
        this._play.stopPlayScreenStream()
        this.screenPlay_ = false;
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
      this.logger.warn('isPlaying: unknown type')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.UNKNOWN_TYPE,
          message: 'unknown type'
        })
      )
    }
    this.logger.log(`检查${this.stringStreamID}的${type}播放状态: ${isPlaying}`)
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
   * @param {String }  options.facingMode 指定使用前置/后置摄像头来采集视频
   在移动设备上，可以设置该参数选择使用前置或后置摄像头：
   + "user"：前置摄像头
   + "environment"：后置摄像头
   * @returns {Promise}
   */
  async open (options:{type: MediaTypeShort, deviceId?: string, sourceId?: string, facingMode?: string, screenAudio?: boolean}) {
    let {type, deviceId, sourceId, facingMode} = options
    if (this.client._roleInfo.userRole === 1) {
      const reason = `观众不允许打开设备`;
      this.logger.error(reason);
      this.client.apiFrequencyControl({
        name: 'open',
        code: -1,
        param: JSON.stringify({
          reason: reason,
          type
        }, null, ' ')
      });
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'audience is not allowed to open'
        })
      );
    }
    
    try {
      switch(type) {
        case 'audio': 
          this.logger.log('开启mic设备')
          if (this.mediaHelper.micTrack){
            this.logger.warn('请先关闭麦克风')
            this.client.apiFrequencyControl({
              name: 'open',
              code: -1,
              param: JSON.stringify({
                reason: '请先关闭麦克风',
                type
              }, null, ' ')
            })
            return Promise.reject(
              new RtcError({
                code: ErrorCode.INVALID_OPERATION,
                message: 'please close mic first'
              })
            )
          }
          this.audio = true
          if(this.mediaHelper){
            if (this.mediaHelper.webAudio){
              if (
                // 情况1：启用了本地采集音量
                this.mediaHelper.webAudio.getGainMin() !== 1
                // 情况2：启用了混音
                || this.mediaHelper.webAudio.mixAudioConf.state !== AuidoMixingState.UNSTART
                // 情况3：启用了屏幕共享音频
                || this.mediaHelper.screenAudioTrack
              ){
                  this.mediaHelper.enableAudioRouting(); 
                }
            }
            const constraint = {audio: true, audioDeviceId: deviceId};
            await this.mediaHelper.getStream(constraint);
            if (this.client.adapterRef && this.client.adapterRef.connectState.curState === "CONNECTED"){
              this.logger.log('Stream.open:开始发布', constraint);
              await this.client.publish(this)
            }else{
              this.logger.log('Stream.open:client不在频道中，无需发布。', constraint);
            }
          }
          break
        case 'video':
        case 'screen':
          this.logger.log(`开启${type === 'video' ? 'camera' : 'screen'}设备`)
          if (this[type]) {
            if (type === "video"){
              this.logger.warn('请先关闭摄像头')
              this.client.apiFrequencyControl({
                name: 'open',
                code: -1,
                param: JSON.stringify({
                  reason: '请先关闭摄像头',
                  type
                }, null, ' ')
              })
              return Promise.reject(
                new RtcError({
                  code: ErrorCode.INVALID_OPERATION,
                  message: 'please close video first'
                })
              )
            }else{
              this.logger.warn('请先关闭屏幕共享')
              this.client.apiFrequencyControl({
                name: 'open',
                code: -1,
                param: JSON.stringify({
                  reason: '请先关闭屏幕共享',
                  type
                }, null, ' ')
              })
              return Promise.reject(
                new RtcError({
                  code: ErrorCode.INVALID_OPERATION,
                  message: 'please close screen-sharing first'
                })
              )
            }
          }
          if (options.screenAudio && this.mediaHelper.screenAudioTrack){
            this.logger.warn('请先关闭屏幕共享音频')
            this.client.apiFrequencyControl({
              name: 'open',
              code: -1,
              param: JSON.stringify({
                reason: '请先关闭屏幕共享音频',
                type
              }, null, ' ')
            })
            return Promise.reject(
              new RtcError({
                code: ErrorCode.INVALID_OPERATION,
                message: 'please close screenAudio first'
              })
            )
          }
          this[type] = true
          const constraint:any = {
            videoDeviceId: deviceId,
            sourceId,
            facingMode
          }
          constraint[type] = true
          if (type === "screen" && options.screenAudio){
            constraint.screenAudio = true
            this.screenAudio = true
          }
          await this.mediaHelper.getStream(constraint);
          if (this.client.adapterRef && this.client.adapterRef.connectState.curState === "CONNECTED"){
            this.logger.log('Stream.open:开始发布', constraint);
            await this.client.publish(this)
          }else{
            this.logger.log('Stream.open:client不在频道中，无需发布。', constraint);
          }
          break
        default:
          this.logger.error('非法参数')
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
        if (type === "screen" && options.screenAudio){
          this.screenAudio = false
        }
      }
      this.logger.log(`${type} 开启失败: `, e.name, e.message)
      this.client.apiFrequencyControl({
        name: 'open',
        code: -1,
        param: JSON.stringify({
          reason: e.message,
          type
        }, null, ' ')
      })

      if (e.message
        // 为什么这样写：
        // Safari和ios的提示是：The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
        // Chrome的提示是：Permission Denied. Permission Denied by system
        && e.message.indexOf('ermission') > -1
        && e.message.indexOf('denied') > -1 ) {
        this.client.safeEmit('accessDenied', type)
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_ALLOWED,
            message: e.message
          })
        )
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
  async close (options?: { type:MediaTypeShort|"screenAudio"}) {
    let type = options ? options.type : 'all'
    let reason = null
    switch(type) {
      case 'audio': 
        this.logger.log('关闭mic设备')
        if (!this.audio) {
          this.logger.log('没有开启过麦克风')
          reason = 'NOT_OPEN_MIC_YET'
          break
        }
        this.audio = false
        if (this.mediaHelper){
          this.mediaHelper.stopStream('audio')
        }else{
          throw new RtcError({
            code: ErrorCode.NO_MEDIAHELPER,
            message: 'no media helper'
          })
        }
        if (this.client.adapterRef && this.client.adapterRef._mediasoup){
          if (this.mediaHelper.micTrack || this.mediaHelper.screenAudioTrack){
            this.logger.log('Stream.close:关闭音频，保留发布：', type);
          }else{
            this.logger.log('Stream.close:停止发布音频');
            await this.client.adapterRef._mediasoup.destroyProduce('audio');
          }
        }else{
          this.logger.log('Stream.close:未发布音频，无需停止发布');
        }
        break
      case 'screenAudio':
        this.logger.log('关闭屏幕共享音频')
        if (!this.screenAudio) {
          this.logger.log('没有开启过屏幕共享音频')
          reason = 'NOT_OPEN_SCREENAUDIO_YET'
          break
        }
        this.screenAudio = false
        if (this.mediaHelper){
          this.mediaHelper.stopStream('screenAudio')
        }else{
          throw new RtcError({
            code: ErrorCode.NO_MEDIAHELPER,
            message: 'no media helper'
          })
        }
        if (this.client.adapterRef && this.client.adapterRef._mediasoup){
          if (this.mediaHelper.micTrack || this.mediaHelper.screenAudioTrack){
            this.logger.log('Stream.close:关闭音频，保留发布：', type);
          }else{
            this.logger.log('Stream.close:停止发布音频');
            await this.client.adapterRef._mediasoup.destroyProduce('audio');
          }
        }else{
          this.logger.log('Stream.close:未发布音频，无需停止发布');
        }
        break
      case 'video':
        this.logger.log('关闭camera设备')
        if (!this.video) {
          this.logger.log('没有开启过摄像头')
          reason = 'NOT_OPEN_CAMERA_YET'
          break
        }
        this.video = false
        if (this.mediaHelper){
          this.mediaHelper.stopStream('video')
        }else{
          throw new RtcError({
            code: ErrorCode.NO_MEDIAHELPER,
            message: 'no media helper'
          })
        }
        if (!this._play){
          throw new RtcError({
            code: ErrorCode.NO_PLAY,
            message: 'no play'
          })
        }
        this._play.stopPlayVideoStream()
        if (!this.client.adapterRef._mediasoup){
          this.logger.log('Stream.close:未发布视频，无需停止发布');
        }else{
          this.logger.log('Stream.close:停止发布视频');
          await this.client.adapterRef._mediasoup.destroyProduce('video');
        }
        break
      case 'screen':
        this.logger.log('关闭屏幕共享')
        if (!this.screen) {
          this.logger.log('没有开启过屏幕共享')
          reason = 'NOT_OPEN_SCREEN_YET'
          break
        }
        this.screen = false
        if (!this.mediaHelper){
          throw new RtcError({
            code: ErrorCode.NO_MEDIAHELPER,
            message: 'no media helper'
          })
        }
        this.mediaHelper.stopStream('screen')
        if (!this._play){
          throw new RtcError({
            code: ErrorCode.NO_PLAY,
            message: 'no play'
          })
        }
        this._play.stopPlayScreenStream()
        if (!this.client.adapterRef._mediasoup){
          this.logger.log('Stream.close:未发布辅流，无需停止发布');
        }else{
          this.logger.log('Stream.close:停止发布辅流');
          await this.client.adapterRef._mediasoup.destroyProduce('screen');
        }
        break
      case 'all':
        this.logger.log(`Stream.close:关闭所有设备：audio ${this.audio}, video ${this.video}, screen ${this.screen}, screenAudio ${this.screenAudio}`);
        this.audio && await this.close({type: "audio"});
        this.video && await this.close({type: "video"});
        this.screen && await this.close({type: "screen"});
        this.screenAudio && await this.close({type: "screenAudio"});
        this.logger.log(`Stream.close:关闭所有设备成功：audio ${this.audio}, video ${this.video}, screen ${this.screen}, screenAudio ${this.screenAudio}`);
        break;
      default:
        this.logger.log('不能识别type')
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
        if(reason === 'NOT_OPEN_MIC_YET') {
          return Promise.reject(
            new RtcError({
              code: ErrorCode.INVALID_OPERATION,
              message: 'mic is not open'
            })
          )
        }else if(reason === 'NOT_OPEN_CAMERA_YET'){
          return Promise.reject(
            new RtcError({
              code: ErrorCode.INVALID_OPERATION,
              message: 'camera is not open'
            })
          )
        }else if(reason === 'NOT_OPEN_SCREEN_YET'){
          return Promise.reject(
            new RtcError({
              code: ErrorCode.INVALID_OPERATION,
              message: 'screen-sharing si not open'
            })
          )
        }else if(reason === 'INVALID_ARGUMENTS'){
          return Promise.reject(
            new RtcError({
              code: ErrorCode.INVALID_OPERATION,
              message: 'unknown type'
            })
          )
        }
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
    this.logger.log('启用音频轨道: ', this.stringStreamID)
    try {
      if (!this.client.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 15'
        })
      }
      
      // unmuteLocalAudio1: unmute Mediasoup
      await this.client.adapterRef._mediasoup.unmuteAudio()
      // unmuteLocalAudio2: unmute发送track
      const tracks = this.mediaHelper && this.mediaHelper.audioStream.getAudioTracks();
      if (tracks && tracks.length) {
        tracks.forEach((track)=>{
          track.enabled = true;
        })
      }
      // unmuteLocalAudio3. unmute设备
      if (this.mediaHelper.micTrack){
        this.mediaHelper.micTrack.enabled = true;
      }
      // unmuteLocalAudio4. 混音的gainNode设为0（使getAudioLevel恢复）
      if (this.mediaHelper.webAudio && this.mediaHelper.webAudio.gainFilter){
        this.mediaHelper.webAudio.gainFilter.gain.value = 1;
      }
      this.muteStatus.audioSend = false;
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: 0,
        param: JSON.stringify({
          streamID: this.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Stream:unmuteAudio' ,e.name, e.message, e);
      this.client.apiFrequencyControl({
        name: 'unmuteAudio',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
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
    this.logger.log('禁用音频轨道: ', this.stringStreamID)

    try {
      if (!this.client.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 16'
        })
      }
      // muteLocalAudio1: mute mediasoup
      await this.client.adapterRef._mediasoup.muteAudio()
      // muteLocalAudio2: mute发送的track
      const tracks = this.mediaHelper && this.mediaHelper.audioStream.getAudioTracks();
      if (tracks && tracks.length) {
        tracks.forEach((track)=>{
          track.enabled = false;
        })
      }
      // muteLocalAudio3: mute麦克风设备track
      if (this.mediaHelper.micTrack){
        this.mediaHelper.micTrack.enabled = false;
      }
      // muteLocalAudio4: 混音的gainNode设为0（使getAudioLevel为0）
      if (this.mediaHelper.webAudio && this.mediaHelper.webAudio.gainFilter){
        this.mediaHelper.webAudio.gainFilter.gain.value = 0;
      }
      this.muteStatus.audioSend = true
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: 0,
        param: JSON.stringify({
          streamID: this.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Stream:muteAudio' ,e.name, e.message, e);
      this.client.apiFrequencyControl({
        name: 'muteAudio',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
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
    if (this.audio && this.mediaHelper && this.mediaHelper.micStream){
      return true;
    }else{
      return false;
    }
  }

  /**
   * 当前从麦克风中采集的音量
   * @function getAudioLevel
   * @memberOf Stream#
   * @return {volume}
   */
  getAudioLevel () {
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('设置音频属性: ', profile)
    this.audioProfile = profile
    this.client.apiFrequencyControl({
      name: 'setAudioProfile',
      code: 0,
      param: JSON.stringify({profile}, null, '')
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
      this.logger.log('volume 为 0 - 100 的整数')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume < 0) {
      volume = 0
    } else if (volume > 100) {
      volume = 255
    } else {
      volume = volume * 2.55
    }
    this.logger.log(`调节${this.stringStreamID}的音量大小: ${volume}`)

    if (this.audio) {
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      this._play.setPlayVolume(volume)
    } else {
      this.logger.log(`没有音频流，请检查是否有发布过音频`)
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
  setCaptureVolume (volume:number, audioType?: "microphone"|"screenAudio") {
    let reason = null
    if (!Number.isInteger(volume)) {
      this.logger.log('volume 为 0 - 100 的整数')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume < 0) {
      volume = 0
    } else if (volume > 100) {
      volume = 100
    } 
    this.logger.log(`调节${this.stringStreamID}的音量大小: ${volume}`)

    if (!this.mediaHelper.audioRoutingEnabled){
      this.mediaHelper.enableAudioRouting();
    }
    this.mediaHelper.setGain(volume / 100, audioType)
    
    if (reason) {
      this.client.apiFrequencyControl({
        name: 'setCaptureVolume',
        code: -1,
        param: JSON.stringify({
          volume,
          audioType,
          reason
        }, null, ' ')
      })
      return reason
    }
    this.client.apiFrequencyControl({
      name: 'setCaptureVolume',
      code: 0,
      param: JSON.stringify({
        audioType,
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
        this.logger.error('设置输出设备失败', e.name, e.message);
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
    this.logger.log(`切换媒体输入设备: ${type}, deviceId: ${deviceId}`)
    let constraint = {}
    if (this.inSwitchDevice) {
      this.logger.log(`正在切换中，重复`)
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'switching...'
        })
      )
    } else {
      this.inSwitchDevice = true
    }
    if (type === 'audio') {
      if (deviceId === this.microphoneId) {
        this.logger.log(`切换相同的麦克风设备，不处理`)
        this.inSwitchDevice = false
        return Promise.resolve()
      } else if(!this.hasAudio()) {
        this.logger.log(`当前没有开启音频输入设备，无法切换`)
        this.inSwitchDevice = false
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'no audio input device'
          })
        )
      } else if(this.audioSource) {
        this.logger.log(`自定义音频输入不支持，无法切换`)
        this.inSwitchDevice = false
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'cannot switch user-defined audio input'
          })
        )
      }
      //constraint = {...this.mediaHelper.audioConstraint, ...{audio: {deviceId: {exact: deviceId}}}}
      if (!this.mediaHelper){
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper'
        })
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
        this.logger.log(`切换相同的摄像头设备，不处理`)
        this.inSwitchDevice = false
        return Promise.resolve()
      } else if(!this.hasVideo()) {
        this.logger.log(`当前没有开启视频输入设备，无法切换`)
        this.inSwitchDevice = false
        this.client.apiFrequencyControl({
          name: 'switchCamera',
          code: -1,
          param: JSON.stringify({reason: 'INVALID_OPERATION'} as ReportParamSwitchCamera, null, ' ')
        })
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'no video input device'
          })
        )
      } else if(this.videoSource) {
        this.logger.log(`自定义视频输入不支持，无法切换`)
        this.inSwitchDevice = false
        this.client.apiFrequencyControl({
          name: 'switchCamera',
          code: -1,
          param: JSON.stringify({reason: 'INVALID_OPERATION'} as ReportParamSwitchCamera, null, ' ')
        })
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'cannot switch user-defined video input'
          })
        )
      }
      //constraint = {...this.mediaHelper.videoConstraint, ...{video: {deviceId: {exact: deviceId}}}}
      if (!this.mediaHelper){
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper'
        })
      }
      if(this.mediaHelper.videoConstraint && this.mediaHelper.videoConstraint.video){
        this.mediaHelper.videoConstraint.video.deviceId = {exact: deviceId}
        constraint = this.mediaHelper.videoConstraint
      }
      this.cameraId = deviceId
    } else {
      this.logger.log(`unknown type`)
      this.inSwitchDevice = false
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'unknown type'
        })
      )
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
      this.logger.error('API调用失败：Stream:switchDevice' ,e.name, e.message, e);
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
    this.logger.log(`启用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (!this.client.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 17'
        })
      }
      this.client.adapterRef._mediasoup.unmuteVideo()
      // local unmute
      this.muteStatus.videoSend = false
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: 0,
        param: JSON.stringify({
          streamID: this.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Stream:unmuteVideo' ,e.name, e.message, e);
      this.client.apiFrequencyControl({
        name: 'unmuteVideo',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
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
    this.logger.log(`禁用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (!this.client.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 18'
        })
      }
      // local mute
      await this.client.adapterRef._mediasoup.muteVideo()
      this.muteStatus.videoSend = true
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: 0,
        param: JSON.stringify({
          streamID: this.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Stream:muteVideo' ,e.name, e.message, e);
      this.client.apiFrequencyControl({
        name: 'muteVideo',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
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
    this.logger.log(`启用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (!this.client.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 19'
        })
      }
      this.client.adapterRef._mediasoup.unmuteScreen()
      // local unmute
      this.muteStatus.screenSend = false
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: 0,
        param: JSON.stringify({
          streamID: this.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Stream:unmuteScreen' ,e.name, e.message, e);
      this.client.apiFrequencyControl({
        name: 'unmuteScreen',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
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
    this.logger.log(`禁用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (!this.client.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 20'
        })
      }
      // local mute
      await this.client.adapterRef._mediasoup.muteScreen()
      this.muteStatus.screenSend = true
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: 0,
        param: JSON.stringify({
          streamID: this.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Stream:muteScreen' ,e, ...arguments);
      this.client.apiFrequencyControl({
        name: 'muteScreen',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
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
    this.logger.log('获取视频 flag')
    if (this.video && this.mediaHelper && this.mediaHelper.videoStream){
      return true;
    }else{
      return false;
    }
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
  setVideoProfile (options:VideoProfileOptions) {
    this.logger.log('设置视频属性: ', JSON.stringify(options, null, ' '))
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
    this.logger.log('自定义视频编码配置')
  }

  setBeautyEffectOptions () {
    this.logger.log('设置美颜效果选项')
  }

  hasScreen () {
    if (this.screen && this.mediaHelper && this.mediaHelper.screenStream){
      return true
    }else{
      return false
    }
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
  setScreenProfile (profile: ScreenProfileOptions) {
    this.logger.log('设置屏幕共享中的屏幕属性: ', profile)
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
          throw new RtcError({
            code: ErrorCode.UNKNOWN_TYPE,
            message: '`Unknown media type ${mediaTypeShort}`'
          })
        }
        const parameters = (sender.getParameters() as RTCRtpSendParameters);
        if (!parameters) {
          this.logger.error("No Parameter");
          return;
        }
        if (parameters.encodings && parameters.encodings.length) {
          parameters.encodings[0].maxBitrate = maxbitrate;
        }else{
          this.logger.warn('Stream.adjustResolution: 无encodings选项', parameters)
        }
        this.logger.warn('设置video 码率: ', parameters)
        sender.setParameters(parameters)
          .then(() => {
            this.logger.log('设置video 码率成功')
          })
          .catch((e:any) => {
            this.logger.error('设置video 码率失败: ', e)
          });
        this.client.apiFrequencyControl({
          name: 'adjustResolution',
          code: 0,
          param: JSON.stringify(parameters, null, 2)
        })
      }
    }
  }

  getVideoBW(){
    if (!this.videoProfile){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'no this.videoProfile'
      })
    }
    if(this.videoProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_180p) {
      return 300 * 1000
    } else if (this.videoProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p) {
      return 800 * 1000
    } else if (this.videoProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_720p) {
      return 1200 * 1000
    } else if (this.videoProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p) {
      return 1500 * 1000
    } return 0
  }
  
  getScreenBW(){
    if (!this.screenProfile){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'no this.screenProfile'
      })
    }
    if(this.screenProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_180p) {
      return 300 * 1000
    } else if (this.screenProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p) {
      return 800 * 1000
    } else if (this.screenProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_720p) {
      return 1200 * 1000
    } else if (this.screenProfile.resolution == NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p) {
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
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      await this._play.takeSnapshot(options, this.streamID);
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: 0,
        param: JSON.stringify(options, null, ' ')
      })
    } else {
      this.logger.log(`没有视频流，请检查是否有 发布 过视频`)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
          reason: `没有视频流，请检查是否有 发布 过视频`
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
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
        streams.push(this.mediaHelper.audioStream);
        if (this.client.adapterRef.remoteStreamMap){
          for (var uid in this.client.adapterRef.remoteStreamMap){
            const remoteStream = this.client.adapterRef.remoteStreamMap[uid];
            if (remoteStream.mediaHelper && remoteStream.mediaHelper.audioStream){
              streams.push(remoteStream.mediaHelper.audioStream);
            }
          }
        }
    }
    if (streams.length === 0) {
      this.logger.log('没有没发现要录制的媒体流')
      return 
    }
    if (!this._record || !this.streamID || !streams){
      throw new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'startMediaRecording: invalid parameter'
      })
    }
    return this._record && this._record.start({
      uid: this.client.adapterRef.channelInfo.uidType === 'string' ? this.stringStreamID : this.streamID,
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
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: 'no record'
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
  playMediaRecording (options:{recordId: string; view: HTMLElement}) {
    if (!this._record){
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: 'no record'
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
  listMediaRecording () {
    let list = []
    if (!this._record){
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: 'no record'
      })
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
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: 'no record'
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
  downloadMediaRecording (options: {recordId: string}) {
    if (!this._record){
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: 'no record'
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
  startAudioMixing (options:AudioMixingOptions) {
    this.logger.log('开始伴音')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('停止伴音')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('暂停伴音')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('恢复伴音')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('调节伴音音量:', volume)
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('获取伴音总时长')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
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
    this.logger.log('设置伴音音频文件的播放位置:', playStartTime)
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
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
   async playEffect (options:AudioEffectOptions) {
    this.logger.log('开始播放音效: ', JSON.stringify(options, null, ' '))
    if (!this.mediaHelper) {
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.playEffect(options) 
  }

  /**
   * 停止播放指定音效文件
   * @function stopEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   */
  async stopEffect (soundId: number) {
    this.logger.log('停止播放音效: ', soundId)
    if (!this.mediaHelper) {
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.stopEffect(soundId) 
  }

  /**
   * 暂停播放指定音效文件
   * @function pauseEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   */
   async pauseEffect (soundId: number) {
    this.logger.log('暂停播放音效：', soundId)
    if (!this.mediaHelper) {
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.pauseEffect(soundId) 
  }

  /**
   * 恢复播放指定音效文件
   * @function resumeEffect
   * @memberOf Stream#
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   */
   async resumeEffect (soundId: number) {
    this.logger.log('恢复播放音效文件: ', soundId)
    if (!this.mediaHelper) {
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
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
   async setVolumeOfEffect (soundId: number, volume: number) {
    this.logger.log(`调节 ${soundId} 音效文件音量为: ${volume}`)
    if (!this.mediaHelper) {
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
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
   async preloadEffect (soundId: number, filePath: string) {
    this.logger.log(`预加载 ${soundId} 音效文件地址: ${filePath}`)
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
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
   async unloadEffect (soundId: number) {
    this.logger.log(`释放指定音效文件 ${soundId}`)
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
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
   getEffectsVolume () {
    this.logger.log('获取所有音效文件播放音量')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.getEffectsVolume() 
  }

  /**
   * 设置所有音效文件播放音量
   * @function setEffectsVolume
   * @memberOf Stream#
   * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认 100 为原始文件音量。
   * @return {void}
   */
   setEffectsVolume (volume: number) {
    this.logger.log('设置所有音效文件播放音量:', volume)
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.setEffectsVolume(volume) 
  }

  /**
   * 停止播放所有音效文件
   * @function stopAllEffects
   * @memberOf Stream#
   * @return {Promise}
   */
   async stopAllEffects () {
    this.logger.log('停止播放所有音效文件')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.stopAllEffects() 
  }

  /**
   * 暂停播放所有音效文件
   * @function pauseAllEffects
   * @memberOf Stream#
   * @return {Promise}
   */
   async pauseAllEffects () {
    this.logger.log('暂停播放所有音效文件')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.pauseAllEffects() 
  }

  /**
   * 恢复播放所有音效文件
   * @function resumeAllEffects
   * @memberOf Stream#
   * @return {Promise}
   */
   async resumeAllEffects () {
    this.logger.log('恢复播放所有音效文件')
    if (!this.mediaHelper){
      throw new RtcError({
        code: ErrorCode.NO_MEDIAHELPER,
        message: 'no media helper'
      })
    }
    return this.mediaHelper.resumeAllEffects() 
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
        this.logger.error("setCanvasWatermarkConfigs：播放器未初始化", options.mediaType);
        return;
      }

      const LIMITS = {
        TEXT: 10,
        TIMESTAMP: 1,
        IMAGE: 4,
      };
      if (options.textWatermarks && options.textWatermarks.length > LIMITS.TEXT){
        this.logger.error(`目前的文字水印数量：${options.textWatermarks.length}。允许的数量：${LIMITS.TEXT}`);
          throw new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: 'watermark exceeds limit'
          })
      }
      if (options.imageWatermarks && options.imageWatermarks.length > LIMITS.IMAGE){
        this.logger.error(`目前的图片水印数量：${options.imageWatermarks.length}。允许的数量：${LIMITS.IMAGE}`);
        throw new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'watermark exceeds limit'
        })
      }
      watermarkControl.checkWatermarkParams(options);
      watermarkControl.updateWatermarks(options);

      this.client.apiFrequencyControl({
        name: 'setCanvasWatermarkConfigs',
        code: 0,
        param: JSON.stringify(options, null, 2)
      })
    }else{
      this.logger.error("setCanvasWatermarkConfigs：播放器未初始化");
    }

  };
  
  getMuteStatus (mediaType: MediaTypeShort){
    if (mediaType === "audio"){
      return {
        muted: this.muteStatus.audioSend,
      }
    } else if (mediaType === "video"){
      return {
        muted: this.muteStatus.videoSend,
      }
    } else {
      return {
        muted: this.muteStatus.screenSend,
      }
    }
  }
  
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
    this.logger.log(`uid ${this.stringStreamID} 销毁 Stream 实例`)
    this.stop()
    this._reset()
  }
}

export { LocalStream }

/* eslint prefer-promise-reject-errors: 0 */
