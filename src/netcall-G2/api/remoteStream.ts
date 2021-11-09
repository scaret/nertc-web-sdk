import {EventEmitter} from "eventemitter3";
import {STREAM_TYPE} from "../constant/videoQuality";
import {Play} from '../module/play'
import {Record} from '../module/record'
import {
  Client,
  ILogger,
  MediaRecordingOptions,
  MediaTypeShort,
  NERtcCanvasWatermarkConfig,
  PlatformType, PlatformTypeMap,
  PubStatus,
  RemoteStreamOptions,
  RenderMode,
  SnapshotOptions,
  StreamPlayOptions,
  SubscribeConfig,
  SubscribeOptions,
} from "../types";
import {MediaHelper} from "../module/media";
import {isExistOptions} from "../util/param";

import {
  ReportParamSetExternalAudioRender,
  ReportParamSubscribeRemoteSubStreamVideo,
} from "../interfaces/ApiReportParam";
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import BigNumber from 'bignumber.js'

let remoteStreamCnt = 0;

class RemoteStream extends EventEmitter {
  public streamID:number|string;
  public stringStreamID:string;
  public audio: boolean;
  public video: boolean;
  public screen: boolean;
  public client: Client;
  public mediaHelper:MediaHelper;
  _play: Play|null;
  private _record: Record|null;
  public videoView:HTMLElement|null|undefined|String;
  public screenView:HTMLElement|null|undefined|String;
  public renderMode: {
    remote:{
      video: RenderMode|{},
      screen: RenderMode|{},
    }
  };
  private consumerId: string|null;
  private producerId: string|null;
  public platformType: PlatformType = PlatformType.unknown;
  public pubStatus:PubStatus = {
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
  };
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
  public isRemote: true = true;
  private audioPlay_: boolean;
  private videoPlay_: boolean;
  private screenPlay_: boolean;
  public active:boolean = true;
  public logger: ILogger;
  remoteStreamId : number;
  constructor (options:RemoteStreamOptions) {
    super()
    this.remoteStreamId = remoteStreamCnt++;
    this.streamID = options.uid
    this.stringStreamID = this.streamID.toString()
    this.platformType = options.platformType;
    this.logger = options.client.adapterRef.logger.getChild(()=>{
      let tag = `remote#${this.stringStreamID}`;
      if (PlatformTypeMap[this.platformType]){
        tag += " " + PlatformTypeMap[this.platformType]
      }
      tag += this.remoteStreamId
      if (this.pubStatus.audio.consumerId){
        tag += "M";
      }else if (this.pubStatus.audio.producerId){
        tag += "m";
      }
      if (this.pubStatus.video.consumerId){
        tag += "C";
      }else if (this.pubStatus.video.producerId){
        tag += "c";
      }
      if (this.pubStatus.screen.consumerId){
        tag += "S";
      }else if (this.pubStatus.screen.producerId){
        tag += "s";
      }
      if (options.client.adapterRef.remoteStreamMap[this.streamID] !== this){
        tag += " DETACHED"
      }
      return tag
    })

    if (typeof options.uid === 'string' || BigNumber.isBigNumber(options.uid)) {
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
    this.videoView = null;
    this.screenView = null;
    this.renderMode = {
      remote: {video: {}, screen: {}}
    };
    this.consumerId = null;
    this.producerId = null;
    this.audioPlay_ = false;
    this.videoPlay_ = false;
    this.screenPlay_ = false;
    this.subConf = {
      audio: true,
      video: true,
      screen: true,
      highOrLow: {
        video: STREAM_TYPE.HIGH,
        screen: STREAM_TYPE.HIGH,
      },
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
      remote: {video: {}, screen: {}}
    }
    
    this._reset()
    this.streamID = options.uid
    this.stringStreamID = this.streamID.toString()
    this.audio = options.audio
    this.video = options.video || false
    this.screen = options.screen || false
    this.client = options.client
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
    
    this.logger.log(`创建远端Stream: `, JSON.stringify({
      streamID: this.stringStreamID,
      audio: options.audio,
      video: options.video,
    }))
    this.client.apiFrequencyControl({
      name: 'createStream',
      code: 0,
      param: JSON.stringify({
        audio: this.audio,
        video: this.video,
        screen: this.screen,
      }, null, ' ')
    })
  }

  _reset () {
    this.streamID = ''
    this.stringStreamID = ''
    this.audio = false
    this.video = false
    this.screen = false
    this.videoView = null
    this.screenView = null
    this.renderMode = {remote: {video: {}, screen: {}}}
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
      highOrLow: {
        video: STREAM_TYPE.HIGH,
        screen: STREAM_TYPE.HIGH,
      },
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
      remote: {video: {}, screen: {}}
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
 
  getId () {
    this.logger.log('获取音视频流 ID: ', this.streamID)
    if (this.client.adapterRef.channelInfo.uidType === 'string') {
      return this.stringStreamID
    }
    return this.streamID 
  }

  async getStats() {
    let remotePc = this.client.adapterRef && this.client.adapterRef._mediasoup && this.client.adapterRef._mediasoup._recvTransport && this.client.adapterRef._mediasoup._recvTransport._handler._pc;
    this.logger.log(`获取音视频连接数据, uid: ${this.stringStreamID}`);
    if(remotePc){
      const stats = {
        accessDelay: "0",
        audioReceiveBytes: "0",
        // audioReceiveDelay: "0",
        audioReceivePackets: "0",
        audioReceivePacketsLost: "0",
        endToEndDelay: "0",
        videoReceiveBytes: "0",
        videoReceiveDecodeFrameRate: "0",
        // videoReceiveDelay: "0",
        videoReceiveFrameRate: "0",
        videoReceivePackets: "0",
        videoReceivePacketsLost: "0",
        videoReceiveResolutionHeight: "0",
        videoReceiveResolutionWidth: "0"
      };
      try {
        const results = await remotePc.getStats();
        results.forEach((item:any) => {
          if (item.type === 'inbound-rtp') {
            if (item.mediaType === 'video') {
              stats.videoReceiveBytes = item.bytesReceived.toString();
              stats.videoReceivePackets = item.packetsReceived.toString();
              stats.videoReceivePacketsLost = item.packetsLost.toString();
              stats.videoReceiveFrameRate = item.framesPerSecond.toString();
              stats.videoReceiveDecodeFrameRate = item.framesPerSecond.toString();
            } else if (item.mediaType === 'audio') {
              stats.audioReceiveBytes = item.bytesReceived.toString();
              stats.audioReceivePackets = item.packetsReceived.toString();
              stats.audioReceivePacketsLost = item.packetsLost.toString();
            }
          } else if (item.type === 'candidate-pair') {
            if (typeof item.currentRoundTripTime === 'number') {
              stats.accessDelay = (item.currentRoundTripTime * 1000).toString();
            }
            if (typeof item.totalRoundTripTime === 'number') {
              stats.endToEndDelay = 
              Math.round(item.totalRoundTripTime * 100).toString();
            }
          } else if (item.type === 'track') {
            if (typeof item.frameWidth !== 'undefined') {
              stats.videoReceiveResolutionWidth = item.frameWidth.toString();
              stats.videoReceiveResolutionHeight = item.frameHeight.toString();
            }
          } 
        });
      } catch (error) {
        this.logger.error('failed to get remoteStats', error.name, error.message);
      }
      return stats;
    }
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
    this.logger.log('设置订阅规则：', JSON.stringify(conf))
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
      this.subConf.highOrLow.video = conf.highOrLow;
      this.subConf.highOrLow.screen = conf.highOrLow;
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

    this.logger.log('订阅规则：', JSON.stringify(this.subConf))
    this.client.apiFrequencyControl({
      name: 'setSubscribeConfig',
      code: 0,
      param: JSON.stringify(conf, null, ' ')
    })
    if (this.pubStatus.screen.screen){
      const param:ReportParamSubscribeRemoteSubStreamVideo = {
        uid: this.client.adapterRef.channelInfo.uidType === 'string' ? this.stringStreamID : this.streamID,
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
      playOptions.audio = true;
    }
    if (!isExistOptions({tag: 'Stream.playOptions.video', value: playOptions.video}).result){
      playOptions.video = true;
    }
    if (!isExistOptions({tag: 'Stream.playOptions.screen', value: playOptions.screen}).result){
      playOptions.screen = true;
    }
    
    this.logger.log(`uid ${this.stringStreamID} Stream.play::`, JSON.stringify(playOptions))
    if(playOptions.audio && this._play && this.mediaHelper && this.mediaHelper.audioStream.getTracks().length){
      this.logger.log(`uid ${this.stringStreamID} 开始播放远端音频`)
      try{
        await this._play.playAudioStream(this.mediaHelper.audioStream, playOptions.muted)
        this.audioPlay_ = true;
      }catch(error) {
        this.audioPlay_ = false;
        this.client.emit('notAllowedError', error)
        this.client.emit('NotAllowedError', error) // 兼容临时版本客户
      }
    }

    if (typeof view === "string") {
      view = document.getElementById(view)
    }

    if (view){
      if (playOptions.video){
        this.videoView = view;
        if(this._play && this.mediaHelper && this.mediaHelper.videoStream && this.mediaHelper.videoStream.getVideoTracks().length){
          this.logger.log(`uid ${this.stringStreamID} 开始启动视频播放 主流 远端`);
          try{
            //@ts-ignore
            await this._play.playVideoStream(this.mediaHelper.videoStream, view)
            if ("width" in this.renderMode.remote.video){
              this._play.setVideoRender(this.renderMode.remote.video)
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
          this.logger.log(`uid ${this.stringStreamID} 开始启动视频播放 辅流 远端`);
          try{
            //@ts-ignore
            await this._play.playScreenStream(this.mediaHelper.screenStream, view)
            if ("width" in this.renderMode.remote.screen){
              this._play.setScreenRender(this.renderMode.remote.screen)
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
      this.logger.warn('setRemoteRenderMode 参数错误')
      this.client.apiFrequencyControl({
        name: 'setRemoteRenderMode',
        code: -1,
        param: JSON.stringify(options, null, ' ')
      })
    }
    if (!this.client || !this._play) {
      return
    } 
    this.logger.log(`uid ${this.stringStreamID} 设置远端视频播放窗口大小: `, mediaType || "video+screen", JSON.stringify(options))
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
   * 启用音频轨道
   * @function unmuteAudio
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteAudio () {
    this.logger.log('启用音频轨道: ', this.stringStreamID)
    try {
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      if (!this.mediaHelper || !this.mediaHelper.audioStream){
        throw new RtcError({
          code: ErrorCode.NOT_FOUND,
          message: 'no audioStream'
        })
      }
      this.muteStatus.audioRecv = false;
      if (this.mediaHelper && this.mediaHelper.micTrack){
        this.mediaHelper.micTrack.enabled = true;
      }
      this._play.playAudioStream(this.mediaHelper.audioStream, true)
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
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      this.muteStatus.audioRecv = true
      if (this.mediaHelper && this.mediaHelper.micTrack){
        this.mediaHelper.micTrack.enabled = false;
      }
      this._play.stopPlayAudioStream()
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
   * 启用视频轨道
   * @function unmuteVideo
   * @memberOf Stream#
   * @return {Promise}
   */
  async unmuteVideo () {
    this.logger.log(`启用 ${this.stringStreamID} 的视频轨道`)
    try {
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      if (!this.mediaHelper || !this.mediaHelper.videoStream || !this.videoView){
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper or videoStream or this.view'
        })
      }

      this.muteStatus.videoRecv = false
      if (this.mediaHelper && this.mediaHelper.cameraTrack){
        this.mediaHelper.cameraTrack.enabled = true;
      }
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
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      this.muteStatus.videoRecv = true
      if (this.mediaHelper && this.mediaHelper.cameraTrack){
        this.mediaHelper.cameraTrack.enabled = false;
      }
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
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      if (!this.mediaHelper || !this.mediaHelper.screenStream || !this.screenView){
        throw new RtcError({
          code: ErrorCode.NO_MEDIAHELPER,
          message: 'no media helper or screenStream or this.view'
        })
      }
      this.muteStatus.screenRecv = false
      if (this.mediaHelper && this.mediaHelper.screenTrack){
        this.mediaHelper.screenTrack.enabled = true;
      }
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
      if (!this._play){
        throw new RtcError({
          code: ErrorCode.NO_PLAY,
          message: 'no play'
        })
      }
      if (this.mediaHelper && this.mediaHelper.screenTrack){
        this.mediaHelper.screenTrack.enabled = false;
      }
      this.muteStatus.screenRecv = true
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

  hasScreen () {
    if (this.screen && this.mediaHelper && this.mediaHelper.screenStream){
      return true
    }else{
      return false
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
      this.logger.log(`没有视频流，请检查是否有 订阅 过视频`)
      this.client.apiFrequencyControl({
        name: 'takeSnapshot',
        code: -1,
        param: JSON.stringify({
          streamID: this.stringStreamID,
          reason: `没有视频流，请检查是否有 订阅 过视频`
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
        this.mediaHelper.audioStream && streams.push(this.mediaHelper.audioStream)
        break;
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
  
   clearRemotePubStatus (){
     let mediaTypes:MediaTypeShort[] = ["audio", "video", "screen"];
     for (let mediaType of mediaTypes){
       this[mediaType] = false
       //@ts-ignore
       this.pubStatus[mediaType][mediaType] = false
       this.pubStatus[mediaType].producerId = ''
       this.pubStatus[mediaType].consumerId = ''
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
        send: this.muteStatus.audioSend,
        recv: this.muteStatus.audioRecv,
        muted: this.muteStatus.audioSend || this.muteStatus.audioRecv,
      };
    } else if (mediaType === "video"){
      return {
        send: this.muteStatus.videoSend,
        recv: this.muteStatus.videoRecv,
        muted: this.muteStatus.videoSend || this.muteStatus.videoRecv,
      };
    } else {
      return {
        send: this.muteStatus.screenSend,
        recv: this.muteStatus.screenRecv,
        muted: this.muteStatus.screenSend || this.muteStatus.screenRecv,
      };
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
        audio: this.audio,
        video: this.video,
        screen: this.screen,
      }, null, ' ')
    })
    this.logger.log(`uid ${this.stringStreamID} 销毁 Stream 实例`)
    this.stop()
    this._reset()
  }
}

export { RemoteStream }

/* eslint prefer-promise-reject-errors: 0 */
