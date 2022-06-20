
import { Base } from './base'
import {
  AddTaskOptions,
  ClientOptions,
  MediaPriorityOptions,
  JoinOptions,
  LocalVideoStats,
  MediaTypeShort,
  RTMPTask,
  Client as IClient,
  SpatialInitOptions, 
  MediaSubStatus,
  ClientMediaRecordingOptions,
  ClientRecordConfig
} from "../types";
import {LocalStream} from "./localStream";
import {checkExists, checkValidBoolean, checkValidInteger, checkValidString} from "../util/param";
import {
  ReportParamEnableEncryption,
  ReportParamGetConnectionState,
  ReportParamSetChannelProfile,
  ReportParamSetClientRole
} from "../interfaces/ApiReportParam";
import {EncryptionMode, EncryptionModes, encryptionModeToInt} from "../module/encryption";
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';
import { SDK_VERSION, BUILD } from "../Config";
import {STREAM_TYPE} from "../constant/videoQuality";
import {RemoteStream} from "./remoteStream";
import {Device} from "../module/device";
import {OperationQueue} from "../util/OperationQueue";
import {SpatialManager} from "./spatialManager";
import {getAudioContext} from "../module/webAudio";
import {getParameters} from "../module/parameters";
import {FormatMedia} from "../module/formatMedia"
import {Record} from '../module/record'
import * as env from '../util/rtcUtil/rtcEnvironment';
import {lbsManager} from "../module/LBSManager";
import {alerter} from "../module/alerter";
const BigNumber = require("bignumber.js");

/**
 *  请使用 {@link WEBRTC2.createClient} 通过WEBRTC2.createClient创建 Client对象，client对象指通话中的本地或远程用户，提供云信sdk的核心功能。
 *  @class
 *  @name Client
 */


/**
 *  Client类构造函数
 *  @method constructor
 *  @memberOf Client
 *  @param {Object} options 配置参数
 *  @param {String} [options.appkey] 实例的应用ID
 *  @param {Boolean} [options.debug=false] 是否开启debug模式，默认不开启，debug模式下浏览器会打印log日志
 *  @return {Client}
 */
class Client extends Base {
  public _roleInfo: { userRole: number; audienceList: {} };
  public upLoadParam:any;
  public destroyed: boolean = false;
  public operationQueue: OperationQueue;
  private onJoinFinish: (() => void)|null = null;
  public spatialManager : SpatialManager|null = null;
  private handlePageUnload: (evt?: any) => void;
  private handleOnOnlineOffline: (evt?: any) => void;
  constructor (options:ClientOptions) {
    super(options)
    this.apiFrequencyControl({
      name: 'createClient',
      code: 0,
      param: {
        clientUid: '',
        debug: options.debug
      }
    })

    this.operationQueue = new OperationQueue(this.logger)
    /**
     * 页面卸载时销毁
     * 火狐使用pagehide 触发时发现websocket已经断开 导致不能发送登出信令 对端表现为刷新端没有退出
     * 注意：移动端safair不识别beforeunload事件
     */
    this.handlePageUnload = (evt?: any) => {
      if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
        this.logger.warn(`收到 ${evt?.type} 事件，当前状态：${this.adapterRef.channelStatus}，即将离开房间`);
        this.leave()
      }
    }
    this.handleOnOnlineOffline = (evt?: any) =>{
      // 测试功能：重连依赖 window.ononline 和 window.onoffline 事件，更快发现断开和连上
      if (evt?.type === "online"){
        if (this.adapterRef.connectState.curState === "CONNECTING"){
          //正在重连
          this.logger.warn("侦测到网络恢复，恢复重连过程");
          this.resumeReconnection()
        }else{
          this.logger.warn("侦测到网络恢复");
        }
      }else if (evt?.type === "offline"){
        if (this.adapterRef.connectState.curState === "CONNECTED"){
          //还没发现网络断开 / 正在重连
          this.logger.warn("侦测到网络断开，主动断开连接");
          this.pauseReconnection()
          this.adapterRef._mediasoup?._sendTransport?.close()
          this.adapterRef._mediasoup?._recvTransport?.close()
          this.adapterRef.channelStatus = "connectioning"
          this.adapterRef._signalling?._reconnection()
        }else{
          this.logger.warn("侦测到网络断开");
        }
      }
    }
    
    if (getParameters().leaveOnUnload){
      window.addEventListener('pagehide', this.handlePageUnload)
      window.addEventListener('beforeunload', this.handlePageUnload)
    }
    if (getParameters().trustOnOnline){
      window.addEventListener('online', this.handleOnOnlineOffline)
      window.addEventListener('offline', this.handleOnOnlineOffline)
    }
      
    //typescript constructor requirement
    this._roleInfo = {
      userRole: 0, // 0:主播，1：观众
      audienceList: {}, // Workaround，用于处理仍然收到的观众端消息
    };
    this._init(options)
    this.logger.info(`NERTC ${SDK_VERSION} ${BUILD}: 客户端创建成功。`);
    this.on('@connection-state-change', (evt)=>{
      if (evt.prevState === "CONNECTED"){
        if (this.recordManager.record?._status.isRecording && this.recordManager.record?._status.state === 'started'){
          this.logger.log("自动停止客户端录制功能")
          this.recordManager.record.download()
        }
      }
      if (evt.curState === "CONNECTED" && evt.prevState === "CONNECTING"){
        if (evt.reconnect){
          lbsManager.startUpdate(this._params.appkey, "reconnect")
        }
      }
    })
  }
  
  // 初始化nrtc
  _init (options:ClientOptions) {
    this.initWebSocket();
    const { appkey = '', token } = options
    if (!appkey) {
      this.logger.error('Client: init error: 请传入appkey')
      throw new RtcError({code: ErrorCode.INVALID_PARAMETER, message:'请传入appkey'})
    }
    this._params.appkey = appkey
    
    // 为什么需要在Client._init时读取本地配置而不是在SDK加载时读取：
    // 因为一部分客户加载了SDK后不一定会发起会话，这种情况下没有必要读取localStorage。
    const localConfig = lbsManager.loadLocalConfig(appkey, "clientInit")
    if (localConfig.config){
      // 载入LBS本地配置成功
      const expireTime = localConfig.config.ts + localConfig.config.config.ttl * 1000 - Date.now()
      if (expireTime < localConfig.config.config.preloadTimeSec * 1000){
        this.logger.log(`LBS在 ${Math.floor(expireTime / 1000)} 秒后过期。preloadTimeSec: ${localConfig.config.config.preloadTimeSec}。发起异步刷新请求`)
        lbsManager.startUpdate(appkey, "renew")
      }
    }else{
      // 载入本地配置失败，发起远程请求
      lbsManager.startUpdate(appkey, localConfig.reason)
    }
    
    this._params.token = token
    this._roleInfo = {
      userRole: 0, // 0:主播，1：观众
      audienceList: {}, // Workaround，用于处理仍然收到的观众端消息
    };
    if (!Device.deviceInited){
      Device.startDeviceChangeDetection();
    }
    Device.on('recording-device-changed', (evt)=>{
      if (!this.destroyed){
        this.safeEmit("recording-device-changed", evt);
      }
    })
    Device.on('camera-changed', (evt)=>{
      if (!this.destroyed){
        this.safeEmit("camera-changed", evt);
      }
    })
    Device.on('playout-device-changed', (evt)=>{
      if (!this.destroyed){
        this.safeEmit("playout-device-changed", evt);
      }
    })
    
    const handleJoinFinish = ()=>{
      // 表示又用户调用的api层面的加入成功/失败，不算重连之类的。
      if (this.onJoinFinish){
        this.onJoinFinish()
        this.onJoinFinish = null
      }else{
        this.logger.debug('孤立的join完成回调')
      }
    }
    this.addListener('@pairing-join-success', handleJoinFinish);
    this.addListener('@pairing-join-error', handleJoinFinish);
    
    if (getParameters().enableAlerter !== "never"){
      alerter.watchClient(this.adapterRef.instance)
    }
  }

  getUid() {
    return this.adapterRef.channelInfo && this.adapterRef.channelInfo.uid
  }

  /**
   *  获取当前通话信息
   *  @method getChannelInfo
   *  @memberOf Client
   *  @return {Objec}
   */
  getChannelInfo() {
    this.apiFrequencyControl({
      name: 'getChannelInfo',
      code: 0,
      param: {
        clientUid: this.adapterRef.channelInfo.uid || '',
      }
    })
    return this.adapterRef.channelInfo || {}
  }

  
  startProxyServer(type?: number) {
    let reason = null
    this.adapterRef.logger.log('startProxyServer, type: ', type)
    if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
      this.adapterRef.logger.error('startProxyServer: 请在加入房间前调用')
      reason = 'INVALID_OPERATION'
    }
    this.apiFrequencyControl({
      name: 'startProxyServer',
      code: reason ? -1 : 0,
      param: {
        clientUid: this.adapterRef.channelInfo.uid || '',
        reason
      }
    })
    if(reason) {
      throw new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'startProxyServer: 请在加入房间前调用'
      })
    }
    this.adapterRef.proxyServer.enable = true
    type ? this.adapterRef.proxyServer.type = type : null
  }

  stopProxyServer() {
    this.adapterRef.logger.log('stopProxyServer')
    if(this.adapterRef.proxyServer){
      this.adapterRef.proxyServer.enable = false
    }
    this.apiFrequencyControl({
      name: 'stopProxyServer',
      code: 0,
      param: {
        clientUid: this.adapterRef.channelInfo.uid || '',
        reason: ''
      }
    })
  }

  /**
   * 设置媒体优先级
   * @function setLocalMediaPriority
   * @description
   设置用户自身媒体流优先级，如果某个用户的优先级设为高，那么这个用户的媒体流的优先级就会高于其他用户，弱网下会优先保证接收高优先级用户流的质量。
   ##### 注意：
   preemtiveMode如果是true，可以抢占其他人的优先级，被抢占的人的媒体优先级变为普通优先级，目前抢占者退出其他人的优先级也无法恢复。推荐一个音视频房间中只有一个高优先级的用户调用该接口。
   * @memberOf Client#
   * @param {Object} options
   * @param {Number} options.priority 优先级, 目前支持50或100两个值，其中50为高优先级，100位普通优先级，默认100
   * @param {Boolean} options.preemtiveMode  是否为抢占模式，默认false
   * @return {null}
   */

  setLocalMediaPriority (options: MediaPriorityOptions) {
    this.logger.log('setLocalMediaPriority, options: ', JSON.stringify(options))
    let reason = null
    if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
      this.logger.error('setLocalMediaPriority: 请在加入房间前调用')
      reason = 'setLocalMediaPriority: 请在加入房间前调用'
    }

    const {priority = 100, preemtiveMode = false} = options
    if(typeof priority !== 'number' || isNaN(priority)){
      reason = 'setLocalMediaPriority: priority is not Number'
    }

    this.apiFrequencyControl({
      name: 'setLocalMediaPriority',
      code: 0,
      param: {
        clientUid: this.adapterRef.channelInfo.uid || '',
        priority,
        preemtiveMode,
        reason: ''
      }
    })

    if (reason) {
      throw new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'setLocalMediaPriority: priority is not Number'
      })
    }
    this.adapterRef.userPriority = options
  }



  /**
   * 加入频道
   * @function join
   * @memberOf Client#
   * @param {Object} options
   * @param {String} options.channel 频道名称
   * @param {Number|String} options.uid  用户唯一标识（整数，建议五位数以上）
   * @param {Object} [options.joinChannelLiveConfig] 加入房间互动直播相关参数
   * @param {Boolean} [options.joinChannelLiveConfig.liveEnable]  是否旁路直播
   * @param {Object} [options.joinChannelRecordConfig] 加入房间录制相关参数
   * @param {Boolean} [options.joinChannelRecordConfig.isHostSpeaker]  是否是主讲人
   * @param {Boolean} [options.joinChannelRecordConfig.recordAudio]  是否开启音频实时音录制，0不需要，1需要（默认0）
   * @param {Boolean} [options.joinChannelRecordConfig.recordVideo]  是否开启视频实时音录制，0不需要，1需要（默认0）
   * @param {Number} [options.joinChannelRecordConfig.recordType]  录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
   * @param {Object} [options.neRtcServerAddresses] 私有化服务器地址对象
   * @param {String} [options.neRtcServerAddresses.channelServer]  获取通道信息服务器
   * @param {String} [options.neRtcServerAddresses.statisticsServer]  统计上报服务器
   * @param {String} [options.neRtcServerAddresses.roomServer]  roomServer服务器
   * @return {Promise}
   */
  async join (options: JoinOptions) {
    this.logger.log('join() 加入频道, options: ', JSON.stringify(options, null, ' '))
    try {
      if (!options.channelName || options.channelName === '') { 
        throw new RtcError({code: ErrorCode.INVALID_PARAMETER, message:'join: 请填写房间名称'})
      }
      if (options.joinChannelRecordConfig) {
        checkValidBoolean({
          tag: "joinOptions.joinChannelRecordConfig.recordAudio should be boolean",
          value: options.joinChannelRecordConfig.recordAudio,
        })
        checkValidBoolean({
          tag: "joinOptions.joinChannelRecordConfig.recordVideo should be boolean",
          value: options.joinChannelRecordConfig.recordVideo,
        })
      }

      if (typeof options.uid === 'string') {
        this.logger.log('uid是string类型')
        this.adapterRef.channelInfo.uidType = 'string'
      } else if (typeof options.uid === 'number') {
        this.logger.log('uid是number类型')
        this.adapterRef.channelInfo.uidType = 'number'
        if(options.uid > Number.MAX_SAFE_INTEGER){
          throw new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: 'join: uid is exceeds the scope of Number'
          })
        }
      } else {
        this.logger.error('uid参数格式非法')
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: 'join: uid is invalid'
          })
        )
      }

      // join行为排队
      this.onJoinFinish = await this.operationQueue.enqueue({
        caller: this as IClient,
        method: "join",
        options,
      })
      this.safeEmit('@pairing-join-start')
      if(!this.adapterRef._statsReport){
        this.initWebSocket();
      }
      if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
        this.safeEmit('@pairing-join-error')
        return Promise.reject(
          new RtcError({
            code: ErrorCode.REPEAT_JOIN,
            message: 'repeatedly join'
          })
        )
      }
      //正式开始join行为
      this.adapterRef.connectState.curState = 'CONNECTING'
      this.adapterRef.connectState.prevState = 'DISCONNECTED'
      this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
      if (options.spatial){
        this.initSpatialManager(options.spatial)
      }
      if (options.token){
        this._params.token = options.token;
      }
      this._params.JoinChannelRequestParam4WebRTC2 = {
        startJoinTime: Date.now(),
        appkey: this._params.appkey,
        userRole: this._roleInfo.userRole,
        channelName: options.channelName,
        wssArr: options.wssArr,
        uid: options.uid,
        token: this._params.token,
        joinChannelLiveConfig: options.joinChannelLiveConfig || {liveEnable: false},
        joinChannelRecordConfig: options.joinChannelRecordConfig || {
          recordAudio: false, // 是否开启音频实时音录制，0不需要，1需要（默认0）
          recordVideo: false, // 是否开启视频实时音录制，0不需要，1需要（默认0）
          recordType: 0, // 录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
          isHostSpeaker: false // 主讲人
        },
      }
      if(options.neRtcServerAddresses){
        this._params.neRtcServerAddresses = {
          channelServer: options.neRtcServerAddresses.channelServer || '',
          statisticsServer: options.neRtcServerAddresses.statisticsServer || '',
          roomServer: options.neRtcServerAddresses.roomServer || '',
          webSocketProxyServer: options.neRtcServerAddresses.webSocketProxyServer || '',
          mediaProxyServer: options.neRtcServerAddresses.mediaProxyServer || ''
        }
      }
      
      this.setStartSessionTime()
      this.initMode()
      if (!this.adapterRef.mediaCapability.supportedCodecRecv || !this.adapterRef.mediaCapability.supportedCodecSend){
        try{
          await this.adapterRef.mediaCapability.detect();
        }catch(e){
          this.logger.error('Failed to detect mediaCapability', e.name, e.message);
        }
      }
      if (!this.adapterRef._meetings){
        this.safeEmit('@pairing-join-error')
        throw new RtcError({
          code: ErrorCode.NO_MEETINGS,
          message: 'meetings error'
        })
      }
      const joinResult = await this.adapterRef._meetings.joinChannel(this._params.JoinChannelRequestParam4WebRTC2)
      this.safeEmit('@pairing-join-success')
      this.apiFrequencyControl({
        name: 'join',
        code: 0,
        param: {
          ...options
        }
      })
      return joinResult
    } catch (e){
      this.safeEmit('@pairing-join-error')
      this.apiFrequencyControl({
        name: 'join',
        code: -1,
        param: {
          ...options,
          reason: e && e.message
        }
      })
      throw e;
    }
  }

  /**
   * 离开频道
   * @function leave
   * @memberOf Client#
   * @param {Void}
   * @return {null}
   */
  async leave () {
    const onLeaveFinish = await this.operationQueue.enqueue({
      caller: this as IClient,
      method: 'leave',
      options: null,
    })
    this.logger.log('leave() 离开频道')
    if (this.adapterRef.channelStatus !== 'join' && this.adapterRef.channelStatus !== 'connectioning') {
      this.logger.log('房间状态: ', this.adapterRef.channelStatus)
      //return Promise.reject('ERR_REPEAT_LEAVE')
    }
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTING'
    this.adapterRef.connectState.reconnect = false
    this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
    this.setEndSessionTime()
    if (this.adapterRef._meetings) {
      this.adapterRef._meetings.leaveChannel().then(onLeaveFinish)
    }else{
      onLeaveFinish()
    }
    this.apiFrequencyControl({
      name: 'leave',
      code: 0,
      param: {
        clientUid: this.getUid()
      }
    })

  }

  async leaveRts () {
    this.logger.log('离开频道')
    if (this.adapterRef.channelStatus !== 'join' && this.adapterRef.channelStatus !== 'connectioning') {
      this.logger.log(' 状态: ', this.adapterRef.channelStatus)
    }
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTING'
    this.adapterRef.connectState.reconnect = false
    this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
    this.setEndSessionTime()
    if (this.adapterRef._meetings) {
      this.adapterRef._meetings.leaveChannel()
    }
  }

  enableCustomTransform(enable?: boolean){
    let errMsg: string = ""
    if (this.adapterRef.connectState.curState !== 'DISCONNECTED'){
      errMsg = 'enableCustomTransform必须在加入频道前调用'
    // @ts-ignore
    }else if (typeof window.TransformStream !== "function") {
      errMsg = '浏览器不支持自定义加解密: 未找到TransformStream'
    }
    // @ts-ignore
    else if (typeof window.RTCRtpReceiver?.prototype.createEncodedStreams !== "function"){
      errMsg = '浏览器不支持自定义加解密: 未找到createEncodedStreams'
    }else if (this.adapterRef.encryption.encryptionMode !== "none"){
      errMsg = '自定义加密功能与国密加密功能不兼容'
    }
    if (errMsg){
      this.logger.error(errMsg);
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT,
        message: errMsg
      })
    }else{
      if (enable === false){
        this.adapterRef.encryption.encodedInsertableStreams = false
        this.logger.log('已关闭自定义加解密')
      }else{
        this.adapterRef.encryption.encodedInsertableStreams = true
        this.logger.log('已开启自定义加解密')
      }
      this.apiFrequencyControl({
        name: 'enableCustomTransform',
        code: 0,
        param: JSON.stringify({enable})
      })
    }
  }

  /**
   * 发布视频
   * @method publish
   * @memberOf Client#
   * @param {Stream} Stream类型
   * @returns {Promise}
   */
  async publish (stream:LocalStream) {
    checkExists({tag: 'client.publish:stream', value: stream});
    await this.doPublish(stream);
  }

  async doPublish (stream:LocalStream) {
    const hookPublishFinish = await this.operationQueue.enqueue({
      caller: this as IClient,
      method: 'publish',
      options: stream,
    })
    let reason = ''
    const onPublishFinish = ()=>{
      hookPublishFinish()
      const param: any = {
        reason,
        pubStatus: stream.pubStatus
      };
      if (stream.mediaHelper.video.cameraTrack || stream.mediaHelper.video.videoSource){
        param.webcamProducerCodec = this.adapterRef._mediasoup?._webcamProducerCodec
      }
      if (stream.mediaHelper.screen.screenVideoTrack || stream.mediaHelper.screen.screenVideoSource){
        param.screenProducerCodec = this.adapterRef._mediasoup?._screenProducerCodec
      }
      this.apiFrequencyControl({
        name: 'publish',
        code: reason ? -1 : 0,
        param: JSON.stringify(param)
      })
      this.apiFrequencyControl({
        name: '_trackSettings',
        code: 0,
        param: JSON.stringify(stream.mediaHelper.getTrackSettings())
      })
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    if (!stream || (!stream.audio && !stream.video && !stream.screen && !stream.screenAudio)) {
      if(stream && getParameters().allowEmptyMedia){
        this.logger.log('publish: 当前模式允许发布没有媒体流的localStream')
      }else{
        this.logger.error('publish: 传入的 stream 格式非法，没有媒体数据')
        reason = 'INVALID_LOCAL_STREAM'
      }
    } else if (this._roleInfo.userRole === 1) {
      this.logger.error(`publish：观众禁止Publish，请先使用setClientRole设为主播`);
      reason = 'INVALID_OPERATION'
    } else if (this.adapterRef.connectState.curState === 'CONNECTING') {
      this.logger.error('publish: 当前正在连接，将在连接成功后发布媒体流')
      reason = 'PUBLISH_ON_CONNECTING'
      this.bindLocalStream(stream)
    }
    else if (this.adapterRef.connectState.curState !== 'CONNECTED') {
      this.logger.error('publish: 当前不在频道中，可能是没有加入频道或者是网络波动导致暂时断开连接')
      reason = 'INVALID_OPERATION'
    }
    if (reason) {
      if(reason === 'INVALID_OPERATION') {
        onPublishFinish()
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'invalid operation'
          })
        )
      }else if(reason === 'INVALID_LOCAL_STREAM') {
        onPublishFinish()
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_LOCALSTREAM,
            message: 'no localStream'
          })
        )
      }else{
        onPublishFinish()
        return
      }
    }
    
    try {
      if (!this.adapterRef._mediasoup) {
        onPublishFinish()
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 4'
        })
      }
      this.bindLocalStream(stream)
      await this.adapterRef._mediasoup.createProduce(stream, "all");
      onPublishFinish()
    } catch (e) {
      this.logger.error('API调用失败：Client:publish' ,e.name, e.message, e.stack, ...arguments);
      reason = e.message
      onPublishFinish()
    }
  }

  /**
   * 取消发布本地音视频流
   * @method unpublish
   * @memberOf Client#
   * @param {Stream} Stream类型
   * @returns {Promise}  
   */
  async unpublish (stream?:LocalStream) {
    checkExists({tag: 'client.unpublish:stream', value: stream});
    const onUnpublishFinish = await this.operationQueue.enqueue({
      caller: this as IClient,
      method: 'unpublish',
      options: null,
    })
    let reason = ''
    if (this.adapterRef.connectState.curState === 'CONNECTING') {
      this.logger.error('unpublish: 当前正在连接，连接成功后将不再发送媒体流')
      reason = 'UNPUBLISH_ON_CONNECTING'
      this.adapterRef.localStream = null
    }
    else if (this.adapterRef.connectState.curState !== 'CONNECTED') {
      this.logger.error('unpublish: 当前不在频道中，可能是没有加入频道或者是网络波动导致暂时断开连接')
      reason = 'INVALID_OPERATION'
    }
    const param = JSON.stringify({
      pubStatus: stream && stream.pubStatus,
      reason
    }, null, ' ')
    if (reason) {
      this.apiFrequencyControl({
        name: 'unpublish',
        code: -1,
        param: {
          clientUid: this.getUid(),
          pubStatus: stream && stream.pubStatus,
          reason
        }
      })
      if(reason === 'INVALID_OPERATION') {
        onUnpublishFinish()
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'invalid operation'
          })
        )
      }else if (reason === 'INVALID_LOCAL_STREAM') {
        onUnpublishFinish()
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_LOCALSTREAM,
            message: 'no localStream'
          })
        )
      }else{
        onUnpublishFinish()
        return
      }
    }

    this.logger.log(`开始取消发布本地流`)
    try {
      if (!this.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 5'
        })
      }
      await this.adapterRef._mediasoup.destroyProduce('audio');
      await this.adapterRef._mediasoup.destroyProduce('video');
      await this.adapterRef._mediasoup.destroyProduce('screen');
      this.adapterRef.localStream = null;
      this.apiFrequencyControl({
        name: 'unpublish',
        code: 0,
        param: JSON.stringify({
          pubStatus: stream && stream.pubStatus
        }, null, ' ')
      })
      onUnpublishFinish()
    } catch (e) {
      this.logger.error('API调用失败：Client:unpublish' ,e, ...arguments);
      onUnpublishFinish()
      this.apiFrequencyControl({
        name: 'unpublish',
        code: -1,
        param: JSON.stringify({
          reason: e.message,
          pubStatus: stream && stream.pubStatus
        }, null, ' ')
      })
    }
  }

  getSubStatus(stream: RemoteStream, mediaType: MediaTypeShort|"all"){
    let result:MediaSubStatus = {status: "unsubscribed", subscribable: false};
    if (mediaType === "all"){
      const info = [
        this.getSubStatus(stream, "audio"),
        this.getSubStatus(stream, "video"),
        this.getSubStatus(stream,"screen"),
      ];
      if (info.find(status => status.status === "unsubscribing")){
        result.status = "unsubscribing"
      }
      else if (info.find(status => status.status === "subscribing")){
        result.status = "subscribing"
      }
      if (info.find(status => status.status === "subscribed")){
        result.status = "subscribed"
      }
      if (result.status === "subscribed" || result.status === "unsubscribed"){
        if (info.find(status => status.subscribable)){
          result.subscribable = true
        }
      }
    }
    else if (stream.pubStatus[mediaType].stopconsumerStatus === "start"){
      result.status = "unsubscribing"
    }else if (stream.pubStatus[mediaType].consumerStatus === "start"){
      result.status = "subscribing"
    }else if (stream.pubStatus[mediaType].consumerId) {
      result.status = "subscribed"
    }else{
      // 可订阅 = 未订阅+有远端+订阅设置打开
      if (result.status === "unsubscribed" && stream.pubStatus[mediaType].producerId && stream.subConf[mediaType]){
        result.subscribable = true
      }
    }
    return result
  }
  
  /**
   * 订阅远端音视频流
   * @method subscribe
   * @memberOf Client#
   * @param {Stream} Stream类型
   * @returns {Promise}  
   */
  async subscribe (stream:RemoteStream) {
    if (this.spatialManager){
      this.logger.warn(`subscribe() 已开启空间音频，跳过用户订阅步骤`);
    }else{
      checkExists({tag: 'client.subscribe:stream', value: stream});
      this.logger.log(`subscribe() [订阅远端: ${stream.stringStreamID}]`)
      return this.doSubscribe(stream)
    }
  }

  async doSubscribe (stream:RemoteStream) {
    const uid = stream.getId()
    if (!uid) {
      throw new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'No uid'
      })
    }
    if (!this.adapterRef._mediasoup) {
      throw new RtcError({
        code: ErrorCode.NO_MEDIASERVER,
        message: 'media server error 6'
      })
    }
    try {
      if (stream.subConf.audio) {
        // 应该订阅音频
        if (stream.pubStatus.audio.audio && !stream.pubStatus.audio.consumerId) {
          if (stream.pubStatus.audio.consumerStatus !== 'start') {
            this.logger.log(`subscribe() [开始订阅 ${stream.getId()} 音频流]`)
            stream.pubStatus.audio.consumerStatus = 'start'
            await this.adapterRef._mediasoup.createConsumer(uid, 'audio', 'audio', stream.pubStatus.audio.producerId);
            stream.pubStatus.audio.consumerStatus = 'end'
            this.logger.log(`subscribe() [订阅 ${stream.getId()} 音频流完成]`)
          }
        }
      } else {
        // 不应该订阅音频
        if (stream.pubStatus.audio.consumerId && stream.pubStatus.audio.stopconsumerStatus !== 'start'){
          this.logger.log('开始取消订阅音频流')
          stream.pubStatus.audio.stopconsumerStatus = 'start'
          if (!this.adapterRef._mediasoup){
            throw new RtcError({
              code: ErrorCode.NO_MEDIASERVER,
              message: 'media server error 7'
            })
          }
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.audio.consumerId, stream, 'audio');
          this.adapterRef.instance.removeSsrc(stream.getId(), 'audio')
          stream.pubStatus.audio.consumerId = '';
          stream.stop('audio')
          stream.pubStatus.audio.stopconsumerStatus = 'end'
          stream.subStatus.audio = false
          const uid = stream.getId()
          if(uid){
            delete this.adapterRef.remoteAudioStats[uid];
            const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
            if (data) {
              data.recvFirstAudioFrame = false
              data.recvFirstAudioPackage = false
            }
          }
          this.logger.log('取消订阅音频流完成')
        }
      }

      if (stream.subConf.video) {
        // 应该订阅视频
        if (stream.pubStatus.video.video && !stream.pubStatus.video.consumerId) {
          this.logger.log('应该订阅视频 stream.pubStatus.video.consumerStatus: ', stream.pubStatus.video.consumerStatus)
          if (stream.pubStatus.video.consumerStatus !== 'start') {
            this.logger.log(`subscribe() [开始订阅 ${stream.getId()} 视频流]`)
            stream.pubStatus.video.consumerStatus = 'start'
            // preferredSpatialLayer是从小到大的，即0是小流，1是大流
            // API层面与声网和Native对齐，即0是大流，1是小流
            let preferredSpatialLayer;
            if (stream.subConf.highOrLow.video === STREAM_TYPE.LOW){
              preferredSpatialLayer = 0;
            }else{
              preferredSpatialLayer = 1;
            }
            await this.adapterRef._mediasoup.createConsumer(uid, 'video', 'video', stream.pubStatus.video.producerId, preferredSpatialLayer);
            stream.pubStatus.video.consumerStatus = 'end'
            this.logger.log(`subscribe() [订阅 ${stream.getId()} 视频流完成]`)
          } else {
            this.logger.log('stream.pubStatus.video.consumerStatus: ', JSON.stringify(stream.pubStatus.video.consumerStatus))
          }
        } else {
          this.logger.log('stream.pubStatus.video: ', JSON.stringify(stream.pubStatus.video))
        }
      } else {
        // 不应该订阅视频
        if (stream.pubStatus.video.consumerId && stream.pubStatus.video.stopconsumerStatus !== 'start') {
          this.logger.log('开始取消订阅视频流')
          stream.pubStatus.video.stopconsumerStatus = 'start'
          if (!this.adapterRef._mediasoup){
            throw new RtcError({
              code: ErrorCode.NO_MEDIASERVER,
              message: 'media server error 8'
            })
          }
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId, stream, 'video');
          this.adapterRef.instance.removeSsrc(stream.getId(), 'video')
          stream.pubStatus.video.consumerId = '';
          stream.stop('video')
          stream.pubStatus.video.stopconsumerStatus = 'end'
          stream.subStatus.video = false
          const uid = stream.getId()
          if(uid){
            delete this.adapterRef.remoteVideoStats[uid];
            const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
            if (data) {
              data.recvFirstVideoFrame = false
              data.recvFirstVideoPackage = false
              data.videoTotalPlayDuration = 0
            }
          }
          this.logger.log('取消订阅视频流完成')
        }
      }
      if (stream.subConf.screen) {
        // 应该订阅辅流
        if (stream.pubStatus.screen.screen && !stream.pubStatus.screen.consumerId){
          if (stream.pubStatus.screen.consumerStatus !== 'start') {
            this.logger.log(`subscribe() [开始订阅 ${stream.getId()} 辅流]`)
            stream.pubStatus.screen.consumerStatus = 'start'
            // preferredSpatialLayer是从小到大的，即0是小流，1是大流
            // API层面与声网和Native对齐，即0是大流，1是小流
            let preferredSpatialLayer;
            if (stream.subConf.highOrLow.screen === STREAM_TYPE.LOW){
              preferredSpatialLayer = 0;
            }else{
              preferredSpatialLayer = 1;
            }
            await this.adapterRef._mediasoup.createConsumer(uid, 'video', 'screenShare', stream.pubStatus.screen.producerId, preferredSpatialLayer);
            stream.pubStatus.screen.consumerStatus = 'end'
            this.logger.log(`subscribe() [订阅 ${stream.getId()} 辅流完成]`)
          }
        }
      } else {
        // 不应该订阅辅流
        if (stream.pubStatus.screen.consumerId && stream.pubStatus.screen.stopconsumerStatus !== 'start') {
          this.logger.log('开始取消订阅辅流')
          stream.pubStatus.screen.stopconsumerStatus = 'start'
          if (!this.adapterRef._mediasoup){
            throw new RtcError({
              code: ErrorCode.NO_MEDIASERVER,
              message: 'media server error 9'
            })
          }
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.screen.consumerId, stream, 'screen');
          this.adapterRef.instance.removeSsrc(stream.getId(), 'screen')
          stream.pubStatus.screen.consumerId = '';
          stream.stop('screen')
          stream.pubStatus.screen.stopconsumerStatus = 'end'
          stream.subStatus.screen = false
          const uid = stream.getId()
          if(uid){
            delete this.adapterRef.remoteScreenStats[uid];
            const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
            if (data) {
              data.recvFirstScreenFrame = false
              data.recvFirstScreenPackage = false
              data.screenTotalPlayDuration = 0
            }
          }
          this.logger.log('取消订阅辅助流完成')
        }
      }
      this.apiFrequencyControl({
        name: 'subscribe',
        code: 0,
        param: JSON.stringify({
          reason: '',
          subStatus: stream.subStatus,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus
        }, null, ' ')
      })
    } catch (e) {
      if (e === "resetConsumeRequestStatus") {
        this.logger.warn(`API调用被打断：Client:subscribe`, e);
        return;
      }
      this.logger.error(`API调用失败：Client:subscribe`, e, e.name, e.message, ...arguments);
      this.apiFrequencyControl({
        name: 'subscribe',
        code: -1,
        param: JSON.stringify({
          reason: e.message,
          subStatus: stream.subStatus,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus
        }, null, ' ')
      })
    }
  }

  /**
   * 取消订阅远端音视频流
   * @method unsubscribe
   * @memberOf Client#
   * @param {Stream} Stream类型
   * @returns {Promise}  
   */
  async unsubscribe (stream:RemoteStream) {
    checkExists({tag: 'client.unsubscribe:stream', value: stream});
    return this.doUnsubscribe(stream)
  }

  async doUnsubscribe (stream:RemoteStream) {
    this.logger.log('取消订阅远端音视频流: ', stream)
    try {
      if (stream.pubStatus.audio.consumerId && stream.pubStatus.audio.stopconsumerStatus !== 'start') {
        this.logger.log('开始取消订阅音频流')
        stream.pubStatus.audio.stopconsumerStatus = 'start'
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASERVER,
            message: 'media server error 10'
          })
        }
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.audio.consumerId, stream, 'audio');
        this.adapterRef.instance.removeSsrc(stream.getId(), 'audio')
        stream.pubStatus.audio.consumerId = '';
        stream.stop('audio')
        stream.pubStatus.audio.stopconsumerStatus = 'end'
        stream.subStatus.audio = false
        const uid = stream.getId()
        if(uid){
          delete this.adapterRef.remoteAudioStats[uid];
          const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
          if (data) {
            data.recvFirstAudioFrame = false
            data.recvFirstAudioPackage = false
          }
        }
        this.logger.log('取消订阅音频流完成')
      }

      if (stream.pubStatus.video.consumerId && stream.pubStatus.video.stopconsumerStatus !== 'start'){
        this.logger.log('开始取消订阅视频流')
        stream.pubStatus.video.stopconsumerStatus = 'start'
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASERVER,
            message: 'media server error 11'
          })
        }
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId, stream, 'video');
        this.adapterRef.instance.removeSsrc(stream.getId(), 'video')
        stream.pubStatus.video.consumerId = '';
        stream.stop('video')
        stream.pubStatus.video.stopconsumerStatus = 'end'
        stream.subStatus.video = false
        const uid = stream.getId()
        if(uid){
          delete this.adapterRef.remoteVideoStats[uid];
          const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
          if (data) {
            data.recvFirstVideoFrame = false
            data.recvFirstVideoPackage = false
            data.videoTotalPlayDuration = 0
          }
        }
        this.logger.log('取消订阅视频流完成')
      }

      if (stream.pubStatus.screen.consumerId && stream.pubStatus.screen.stopconsumerStatus !== 'start'){
        this.logger.log('开始取消订阅辅流')
        stream.pubStatus.screen.stopconsumerStatus = 'start'
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASERVER,
            message: 'media server error 12'
          })
        }
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.screen.consumerId, stream, 'screen');
        this.adapterRef.instance.removeSsrc(stream.getId(), 'screen')
        stream.pubStatus.screen.consumerId = '';
        stream.stop('screen')
        stream.pubStatus.screen.stopconsumerStatus = 'end'
        stream.subStatus.screen = false
        const uid = stream.getId()
        if(uid){
          delete this.adapterRef.remoteScreenStats[uid];
          const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
          if (data) {
            data.recvFirstScreenFrame = false
            data.recvFirstScreenPackage = false
            data.screenTotalPlayDuration = 0
          }
        }
        this.logger.log('取消订阅辅助流完成')
      }
      
      this.apiFrequencyControl({
        name: 'unsubscribe',
        code: 0,
        param: JSON.stringify({
          clientUid: this.getUid(),
          streamId: stream.stringStreamID,
          reason: '',
          subStatus: stream.subStatus,
          subConf: stream.subConf
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:unsubscribe' ,e.name, e.message, e, ...arguments);
      this.apiFrequencyControl({
        name: 'unsubscribe',
        code: -1,
        param: JSON.stringify({
          clientUid: this.getUid(),
          streamId: stream.stringStreamID,
          reason: e.message,
          subStatus: stream.subStatus,
          subConf: stream.subConf
        }, null, ' ')
      })
    }
  }

  /**
   * 中途更新订阅的视频分辨率。
   * @method setRemoteVideoStreamType
   * @memberOf Client#
   * @param {Stream} stream 参数
   * @param {Number} highOrLow: 0是大流，1是小流
   * @returns {Promise}  
  */
  async setRemoteVideoStreamType (stream:RemoteStream, highOrLow:number) {
    this.logger.log(`uid ${stream.getId()} 订阅成员的${highOrLow ? '小' : '大'}流`, highOrLow)

    try {
      if (!this.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 13'
        })
      }
      const streamId = stream.getId();
      if (!streamId){
        throw new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'No stream Id'
        })
      }
      await this.adapterRef._mediasoup.setConsumerPreferredLayer(stream, highOrLow ? 0 : 1, "video");
      stream.subConf.highOrLow.video = highOrLow;
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        param: JSON.stringify({
          clientUid: this.getUid(),
          streamId: stream.stringStreamID,
          highOrLow: highOrLow
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:setRemoteVideoStreamType' ,e.name, e.message, e, ...arguments);
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        code: -1,
        param: JSON.stringify({
          clientUid: this.getUid(),
          streamId: stream.stringStreamID,
          reason: e.message,
          highOrLow: highOrLow
        }, null, ' ')
      })
    }
  }
  
  /**
   * 中途更新订阅的音视频流分辨率。
   * @method setRemoteStreamType
   * @memberOf Client#
   * @param {Stream} stream 参数
   * @param {Number} highOrLow: 0是大流，1是小流
   * @returns {Promise}
   */
  async setRemoteStreamType (stream:RemoteStream, highOrLow:number, mediaType: "video"|"screen") {
    this.logger.log(`setRemoteStreamType: 订阅${stream.getId()}成员的${highOrLow ? '小' : '大'}流`, mediaType, highOrLow)
    try {
      if (!this.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 27'
        })
      }
      const streamId = stream.getId();
      if (!streamId){
        throw new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'No stream Id'
        })
      }
      await this.adapterRef._mediasoup.setConsumerPreferredLayer(stream, highOrLow ? 0 : 1, mediaType);
      stream.subConf.highOrLow[mediaType] = highOrLow;
      this.apiFrequencyControl({
        name: 'setRemoteStreamType',
        code: 0,
        param: {
          highOrLow,
          mediaType,
          clientUid: this.getUid(),
          streamID: stream.stringStreamID
        }
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:setRemoteStreamType' ,e, ...arguments);
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        code: -1,
        param: JSON.stringify({
          reason: e.message,
          highOrLow,
          mediaType,
          streamID: stream.stringStreamID
        }, null, ' ')
      })
    }
  }

  enableAudioVolumeIndicator () {
    this.logger.log('开启音量提醒')
  }

  enableDualStream (dualStreamSetting: {video: boolean; screen: boolean} = {video: true, screen: false}) {
    this.adapterRef.channelInfo.videoLow = dualStreamSetting.video;
    this.adapterRef.channelInfo.screenLow = dualStreamSetting.screen;
    this.logger.log('开启双流模式')
    this.apiFrequencyControl({
      name: 'enableDualStream',
      code: 0,
      param: {
        clientUid: this.adapterRef.channelInfo.uid || '',
        video: dualStreamSetting.video,
        screen: dualStreamSetting.screen,
        reason: ''
      }
    })
  }

  disableDualStream (dualStreamSetting: {video: boolean; screen: boolean} = {video: false, screen: false}) {
    this.logger.log('关闭双流模式')
    this.adapterRef.channelInfo.videoLow = false;
    this.adapterRef.channelInfo.screenLow = false;
    this.apiFrequencyControl({
      name: 'disableDualStream',
      code: 0,
      param: {
        clientUid: this.adapterRef.channelInfo.uid || '',
        video: dualStreamSetting.video,
        screen: dualStreamSetting.screen,
        reason: ''
      }
    })
  }
  
  /**
   * 设置用户频道角色
   * @function setClientRole
   * @fires Client#client-role-changed
   * @description
   设置用户角色。默认情况下用户以主播角色加入房间。
   在加入房间前，用户可以调用本接口设置本端模式为观众或主播模式。在加入房间后，用户可以通过本接口切换用户模式。
   用户角色支持设置为主播（`host`）或观众(`audience`)，主播和观众的权限不同：
   + 主播：可以操作摄像头等音视频设备、发布流、配置互动直播推流任务、上下线对房间内其他用户可见。
   + 观众：观众只能接收音视频流，不支持操作音视频设备、配置互动直播推流任务、上下线不通知其他用户。
   ##### 注意：
   可以在加入房间之前或者之后设置。
   ##### 相关回调：
   如果您在加入房间后调用该方法切换用户角色，调用成功后，会触发以下回调：
   + 主播切换为观众，本地触发`client-role-changed`回调，远端触发`peer-offline`回调
   + 观众切换为主播，本地触发`client-role-changed`回调，远端触发`peer-online`回调
   * @memberOf Client#
   * @param {String} role
   用户角色。可设置为：
   + `host`：直播模式中的主播，可以发布和接收音视频流。如果用户之前已经发布了音频或视频，切换到主播时会自动恢复发布音频或视频流。
   + `audience`: 直播模式中的观众，只能接收音视频流。主播模式切换到观众模式后，会自动停止发送音视频流。
   * @return {Promise}
   */
  /**
   client-role-changed
   * @event Client#client-role-changed
   * @type {object}
   * @property {'host'|'audience'} role - 变化后的角色
   * @description 本地用户角色发生了变化
   */

  async setClientRole(role:string) {
    let userRole;
    let reason;
    if (role === "host" || role === "broadcaster") {
      // broadcaster为云信Native叫法。这里做了兼容，以host为准。
      // http://doc.hz.netease.com/pages/viewpage.action?pageId=267631447
      userRole = 0;
    } else if (role === "audience") {
      userRole = 1;
    } else {
      this.logger.error(`setClientRole: 无法识别的角色：${role}`);
      reason = `INVALID_OPERATION`;
      userRole = -1
    }
    
    if (!reason){
      const localUser = this.adapterRef.channelInfo ? this.adapterRef.channelInfo.uid || "" : "";
      if (userRole === this._roleInfo.userRole) {
        this.logger.warn(`setClientRole: 用户${localUser}的角色已经是${role}了`);
      }else{
        switch (this.adapterRef.connectState.curState) {
          case "CONNECTED":
            if (userRole === 1 && this.adapterRef.localStream && this.isPublished(this.adapterRef.localStream)) {
              // 主播变为观众时会自动Unpublish所有流
              this.logger.info(`setClientRole：主播 ${localUser}将设为观众，自动Unpublish中`);
              await this.unpublish(this.adapterRef.localStream);
            }
            if (!this.adapterRef._mediasoup){
              throw new RtcError({
                code: ErrorCode.NO_MEDIASERVER,
                message: 'media server error 14'
              })
            }
            await this.adapterRef._mediasoup.updateUserRole(userRole);
            if (this._roleInfo.userRole !== userRole) {
              this._roleInfo.userRole = userRole;
              this.logger.info(`setClientRole：本地用户${localUser} 设置角色为 ${role}`);
              this.safeEmit('client-role-changed', {role: role});
            }
            break;
          case "DISCONNECTED":
            if (this._roleInfo.userRole !== userRole) {
              this._roleInfo.userRole = userRole;
              this.logger.info(`setClientRole：本地用户${localUser}设置角色为 ${role}`);
              this.safeEmit('client-role-changed', {role: role});
            }
            break;
          default:
            this.logger.error(`setClientRole: 本地用户${localUser}当前不在频道中，可能是网络波动导致暂时断开连接`);
            reason = 'USER_NOT_IN_CHANNEL';
        }
      }
    }
    const param:ReportParamSetClientRole = {
      reason,
      role: userRole
    };
    this.apiFrequencyControl({
      name: 'setClientRole',
      code: reason ? -1 : 0,
      param: {
        role,
        reason
      }
    })
    if (reason){
      if(reason === 'INVALID_OPERATION') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'invalid operation'
          })
        )
      }else if (reason === 'USER_NOT_IN_CHANNEL') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_LOCALSTREAM,
            message: 'user not in channel'
          })
        )
      }
    }
  }

  /**
   * 绑定localStream对象。多次绑定无副作用
   */
  bindLocalStream(localStream: LocalStream){
    this.adapterRef.localStream = localStream
    localStream.client = this as IClient;
    const uid = this.getUid();
    if (localStream.streamID !== uid){
      this.logger.warn('localStream更换streamID', localStream.streamID, '=>', uid);
      localStream.streamID = uid;
      localStream.stringStreamID = uid.toString();
    }
  }

  /**
   * 获取连接状态
   * @function getConnectionState
   * @description
   主动获取网络连接状态。
   推荐用于以下场景：
   + 在 App 异常重启时，可以调用本接口主动获取当前客户端与服务器的连接状态，以做到本地与服务器状态的对齐。
   + 在实时音视频通话等业务场景中，主动获取房间的网络连接状态，以此完成上层业务逻辑。
   
   SDK 与服务器的连接状态，共有以下 4 种：
   + `DISCONNECTED`：网络连接断开。
   该状态表示 SDK 处于：
     + 调用`Client.join`加入房间前的初始化阶段。
     + 调用`Client.leave`离开房间之后。
   + `CONNECTING`：建立网络连接中。
   该状态表示 SDK 处于：
     + 调用`Client.join`之后正在与指定房间建立连接。
     + 通话过程中，连接中断自动重连。
   + `CONNECTED`：已连接。
   该状态表示用户已经成功加入房间，可以在房间内发布或订阅媒体流。
     + `DISCONNECTING`：正在断开连接。
     + 在调用 `Client.leave` 的时候为此状态。
   * @memberOf Client#
   * @returns {String}
   */
  getConnectionState () {
    this.apiFrequencyControl({
      name: 'getConnectionState',
      code: 0,
      param: JSON.stringify({} as ReportParamGetConnectionState, null, ' ')
    })
    return this.adapterRef.connectState.curState;
  }

  /**
   * 获取系统电量
   * @function getSystemStats
   * @memberOf Client#
   * @return {Promise}
   */
  getSystemStats(){
    //@ts-ignore
    if (!navigator.getBattery) {
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_SUPPORTED_YET,
          message: 'navigator.getBattery is not support in your browser',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery'
        })
      )
    }
    return new Promise((resolve, reject) =>{
      //@ts-ignore
      navigator.getBattery().then(function(battery) {
        resolve(battery.level * 100)
      });
    })
  }

  /**
   * 获取与会话的连接状况统计数据
   * @function getSessionStats
   * @memberOf Client#
   * @return {Promise}
   */
  getSessionStats(){
    return new Promise((resolve, reject) =>{
      this.adapterRef.sessionStats.Duration = (Date.now() - this.adapterRef.state.startSessionTime)/1000
      this.adapterRef.sessionStats.UserCount =  Object.keys(this.adapterRef.memberMap).length + 1
      resolve(this.adapterRef.sessionStats)
    })
  }

  /**
   * 获取与网关的连接状况统计数据
   * @function getTransportStats
   * @memberOf Client#
   * @return {Promise}
   */
  getTransportStats(){
    return new Promise((resolve, reject) =>{
      resolve(this.adapterRef.transportStats)
    })
  }

  /**
   * 获取本地发布流的音频统计数据
   * @function getLocalAudioStats
   * @memberOf Client#
   * @return {Promise}
   */
  getLocalAudioStats(){
    return new Promise((resolve, reject) =>{
      resolve(this.adapterRef.localAudioStats)
    })
  }

 /**
   * 获取本地发布流的音频统计数据
   * @function getLocalVideoStats
   * @memberOf Client#
   * @return {Promise}
   */
  getLocalVideoStats(mediaType?: MediaTypeShort){
    let data:any = [];
    if (!mediaType || mediaType === "video"){
      data = data.concat(this.adapterRef.localVideoStats);
    }
    if (!mediaType || mediaType === "screen"){
      data = data.concat(this.adapterRef.localScreenStats);
    }
    return Promise.resolve(data);
  }

  /**
   * 获取远端订阅流的音频统计数据
   * @function getRemoteAudioStats
   * @memberOf Client#
   * @return {Promise}
   */
  getRemoteAudioStats(){
    return new Promise((resolve, reject) =>{
      resolve(this.adapterRef.remoteAudioStats)
    })
  }

  /**
   * 获取远端订阅流的视频统计数据
   * @function getRemoteVideoStats
   * @memberOf Client#
   * @return {Promise}
   */
  getRemoteVideoStats(mediaType?: MediaTypeShort){
    let data:any = {};
    if (!mediaType || mediaType === "screen"){
      data = Object.assign(data ,this.adapterRef.remoteScreenStats)
    }
    if (!mediaType || mediaType === "video"){
      data = Object.assign(data ,this.adapterRef.remoteVideoStats)
    }
    return Promise.resolve(data);
  }

  /**
   * 设置房间模型
   * @function setChannelProfile
   * @memberOf Client#
   * @param {Object} options
   * @param {Object} [options.mode] 房间属性，"rtc": 通信场景，"live": 直播场景
   * @return {null}
   */
  setChannelProfile(options:{mode: 'rtc'|'live'}) {
    let reason = null;
    this.logger.log('setChannelProfile, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.connectState.curState !== "DISCONNECTED") {
      this.logger.warn('setChannelProfile: 请在加入房间前调用')
      reason = 'setChannelProfile: 请在加入房间前调用'
    } else {
      const mode = options.mode || 'rtc';
      if (this.adapterRef.localStream) {
        if (mode === 'live'){
          this.adapterRef.localStream.audioProfile = 'music_standard'
        }else if (mode === 'rtc'){
          this.adapterRef.localStream.audioProfile = 'speech_low_quality'
        }
      }
      this._params.mode = mode  
    }
    this.apiFrequencyControl({
      name: 'setChannelProfile',
      code: reason ? -1 : 0,
      param: {
        mode: options.mode,
        reason
      }
    })
    if (reason){
      throw new RtcError({
        code: ErrorCode.INVALID_OPERATION,
        message: reason
      })
    }
  }

  /**
   * 增加互动直播推流任务
   * @function addTasks
   * @memberOf Client#
   * @param {Object} options 推流任务列表
   * @param {Array} [options.rtmpTasks] 推流任务
   * @return {Promise}
   */
  async addTasks (options:AddTaskOptions) {
    this.logger.log('addTasks() 增加互动直播推流任务, options: ', JSON.stringify(options))
    let reason = null
    if (this._roleInfo.userRole === 1) {
      this.logger.error(`addTasks: 观众不允许进行直播推流操作`);
      reason = 'addTasks: 观众不允许进行直播推流操作'
    }
    if (!this.adapterRef._meetings) {
      reason = 'addTasks: 加入房间后进行直播推流操作'
    }

    if (reason) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'addTasks',
        code: -1,
        param: {
          clientUid: this.getUid(),
          reason
        }
      })
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: reason
      })
    }

    try {
        await this.adapterRef._meetings?.addTasks(options)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'addTasks',
          code: 0,
          param: {
            clientUid: this.getUid()
          }
        })
    } catch (e) {
        this.adapterRef.instance.apiFrequencyControl({
        name: 'addTasks',
        code: -1,
        param: {
          clientUid: this.getUid(),
          reason: e.message
        }
      })
      throw e
    }
  }

  /**
   * 删除互动直播推流任务
   * @function deleteTasks
   * @memberOf Client#
   * @param {Object} options
   * @param {Array} [options.taskId] 该推流任务的id要求唯一
   * @return {Promise}
   */
  async deleteTasks (options:{taskIds: string[]}) {
    this.logger.log('deleteTasks() 删除互动直播推流任务, options: ', options)
    let reason = null
    if (this._roleInfo.userRole === 1) {
      reason = 'deleteTasks: 观众不允许进行直播推流操作'
    }
    if (!this.adapterRef._meetings){
      reason = 'deleteTasks: 加入房间后进行直播推流操作'
    }
    if (reason) {
      this.logger.error(reason);
      this.adapterRef.instance.apiFrequencyControl({
        name: 'deleteTasks',
        code: -1,
        param: {
          clientUid: this.getUid(),
          reason
        }
      })
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: reason
      })
    }

    try {
        await this.adapterRef._meetings?.deleteTasks(options)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'deleteTasks',
          code: 0,
          param: {
            clientUid: this.getUid()
          }
        })
    } catch (e) {
        this.adapterRef.instance.apiFrequencyControl({
        name: 'deleteTasks',
        code: -1,
        param: {
          clientUid: this.getUid(),
          reason: e.message
        }
      })
      throw e
    }
  }

  /**
   * 更新互动直播推流任务
   * @function updateTasks
   * @memberOf Client#
   * @param {Object} options
   * @param {Array} [options.rtmpTasks] 推流任务
   * @return {Promise}
   */
  async updateTasks (options : {rtmpTasks: RTMPTask[]}) {
    this.logger.log('updateTasks() 更新互动直播推流任务, options: ', options)
    let reason = null
    if (this._roleInfo.userRole === 1) {
      reason = 'updateTasks: 观众不允许进行直播推流操作'
    }
    if (!this.adapterRef._meetings){
      reason = 'updateTasks: 加入房间后进行直播推流操作'
    }
    if (reason) {
      this.logger.error(reason);
      this.adapterRef.instance.apiFrequencyControl({
        name: 'updateTasks',
        code: -1,
        param: {
          clientUid: this.getUid(),
          reason
        }
      })
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: reason
      })
    }

    try {
        await this.adapterRef._meetings?.updateTasks(options)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'updateTasks',
          code: 0,
          param: {
            clientUid: this.getUid()
          }
        })
    } catch (e) {
        this.adapterRef.instance.apiFrequencyControl({
        name: 'updateTasks',
        code: -1,
        param: {
          clientUid: this.getUid(),
          reason: e.message
        }
      })
      throw e
    }
  }

  setEncryptionMode(encryptionMode: EncryptionMode){
    checkValidInteger({
      tag: 'Valid encryptionModes are: ' + Object.keys(EncryptionModes).join(','),
      value: encryptionModeToInt(encryptionMode),
    })
    if (this.adapterRef.encryption.encodedInsertableStreams){
      const errMsg = '自定义加密功能与国密加密功能不兼容'
      this.logger.error(errMsg);
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT,
        message: errMsg
      })
    }
    this.logger.log('设置加密模式：', encryptionMode);
    this.adapterRef.encryption.setEncryptionMode(encryptionMode);
    const param:ReportParamEnableEncryption = {
      enable: encryptionMode !== "none",
      mode: encryptionModeToInt(encryptionMode)
    };
    this.apiFrequencyControl({
      name: 'setEncryptionMode',
      code: 0,
      param: JSON.stringify(param, null, ' ')
    })
  }

  setEncryptionSecret(encryptionSecret: string){
    switch (this.adapterRef.encryption.encryptionMode){
      case "none":
        throw new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'Client.setEncryptionSecret: please set encryptionMode first'
        })
      case "sm4-128-ecb":
        checkValidString({
          tag: 'client.setEncryptionSecret:encryptionSecret',
          value:encryptionSecret,
          min:1,
          max:128
        });
    }
    this.logger.log('设置加密密钥');
    this.adapterRef.encryption.setEncryptionSecret(encryptionSecret);
    this.apiFrequencyControl({
      name: 'setEncryptionSecret',
      code: 0,
      param: JSON.stringify({
        encryptionSecret
      }, null, ' ')
    })
  }
  
  async pauseReconnection(){
    this.logger.log("pauseReconnection：下一次重连行为会被暂停，直到调用resumeReconnection()方法")
    const info = await new Promise(resolve=>{
      if (this.adapterRef._signalling){
        this.adapterRef._signalling.reconnectionControl.pausers.push(resolve)
      }
    })
    this.logger.log(`pauseReconnection：重连已被暂停：${JSON.stringify(info)}`)
    return info;
  }
  
  async resumeReconnection(){
    if (this.adapterRef._signalling) {
      if (this.adapterRef._signalling.reconnectionControl.blocker) {
        this.logger.log("resumeReconnection：即将恢复重连过程")
        this.adapterRef._signalling.reconnectionControl.blocker()
        this.adapterRef._signalling.reconnectionControl.pausers.forEach((resolve)=>resolve({reason: "reconnection-resume"}))
        this.adapterRef._signalling.reconnectionControl.pausers = []
      } else if (this.adapterRef._signalling.reconnectionControl.pausers.length) {
        this.logger.log("resumeReconnection：取消之前的 pauseReconnection 操作。")
        this.adapterRef._signalling.reconnectionControl.pausers.forEach((resolve)=>resolve({reason: "cancelled"}))
        this.adapterRef._signalling.reconnectionControl.pausers = []
      } else {
        this.logger.warn("resumeReconnection：未发现pauseReconnection操作")
      }
      const info = await new Promise((resolve)=>{
        this.adapterRef._signalling?.reconnectionControl.resumers.push(resolve)
      })
      this.logger.log(`resumeReconnection：恢复重连成功${JSON.stringify(info)}`)
      return info
    }
  }
  
  refreshRemoteEvents(){
    // 供网易会议使用
    // 将频道内的peer-online/stream-added/mute消息重新发一遍
    for (let uid in this.adapterRef.remoteStreamMap){
      const remoteStream = this.adapterRef.remoteStreamMap[uid]
      this.logger.warn('refreshRemoteEvents peer-online', uid)
      this.safeEmit('peer-online', {uid: uid})
      const MediaTypeList:MediaTypeShort[] = ["audio", "video", "screen"];
      MediaTypeList.forEach((mediaTypeShort)=>{
        if (remoteStream.pubStatus[mediaTypeShort].producerId){
          this.logger.warn('refreshRemoteEvents stream-added', uid, mediaTypeShort)
          this.safeEmit('stream-added', {stream: remoteStream, mediaType: mediaTypeShort})
          if (remoteStream.muteStatus[mediaTypeShort].send){
            this.logger.warn(`refreshRemoteEvents mute-${mediaTypeShort}`, uid, mediaTypeShort)
            this.safeEmit(`mute-${mediaTypeShort}`, {uid: remoteStream.getId()})
          }
        }
      })
    }
  }

  initSpatialManager(options: SpatialInitOptions) {
    if (!this.spatialManager){
      const context = getAudioContext();
      if (!context) {
        this.logger.error("当前环境不支持WebAudio");
        return;
      }
      this.spatialManager = new SpatialManager({
        client: this as IClient,
        options,
        context
      })
    }
    this.spatialManager.init()
    this.spatialManager.play()
  }

  syncUserList() {
    // 提供给智慧树客户 获取远端用户列表
    return this.adapterRef.memberMap;
  }


  /**
   * ************************ 客户端录制相关 *****************************
   */
  
  updateRecordingAudioStream() {
    if (!this.recordManager || !this.recordManager.formatMedia || !this.recordManager.formatMedia.destination) {
      return
    }
    this.logger.log('updateRecordingAudioStream() [更新录制的音频]')
    const audioStreams = []
    if (this.adapterRef.remoteStreamMap) {
      for (var uid in this.adapterRef.remoteStreamMap){
        const remoteStream = this.adapterRef.remoteStreamMap[uid];
        audioStreams.push(remoteStream.mediaHelper.audio.audioStream);
      }
    }
    if(this.adapterRef.localStream){
      audioStreams.push(this.adapterRef.localStream.mediaHelper.audio.audioStream);
    }
    this.recordManager.formatMedia.updateStream(audioStreams)
  }

  /**
   * 开始录制
   * @function startMediaRecording
   * @memberOf Stream#
   * @param {Object} param 参数对象
   * @param {String} param.recordConfig 录制设置的参数
   * @param {recorder} param.recorder ['local': 录制自己，'all': 录制本地和远端]
   * @returns {Promise} 包含recordId值，用于下载等操作
   */
  async startMediaRecording (options: ClientMediaRecordingOptions) {
    const {recorder, recordConfig} = options

    if (!this.recordManager.record) {
      this.recordManager.record = new Record({
        logger: this.logger,
        client: this.adapterRef.instance,
      })
      this.recordManager.record.on('media-recording-stopped', (evt)=>{
        this.safeEmit('@media-recording-stopped')
      })
    }
    if (!this.recordManager.formatMedia) {
      this.recordManager.formatMedia = new FormatMedia({
        adapterRef: this.adapterRef
      })
    }
    const audioStreams = []
    if(this.adapterRef.localStream){
      audioStreams.push(this.adapterRef.localStream.mediaHelper.audio.audioStream);
    }
    
    if (recorder === 'all' && this.adapterRef.remoteStreamMap) {
      for (var uid in this.adapterRef.remoteStreamMap){
        const remoteStream = this.adapterRef.remoteStreamMap[uid];
        audioStreams.push(remoteStream.mediaHelper.audio.audioStream);
      }
    }
    
    const audioStream = await this.recordManager.formatMedia.formatAudio(audioStreams)
    const videoStream = await this.recordManager.formatMedia.formatVideo(recorder, recordConfig)

    const streams = []
    streams.push(audioStream, videoStream)
    if (streams.length === 0) {
      this.logger.log('没有没发现要录制的媒体流')
      return 
    }

    return this.recordManager.record.start({
      uid: '',
      type: recordConfig?.recordType || 'video',
      recordName: recordConfig?.recordName,
      reset: true,
      stream: streams
    })


  }
  /**
   * 结束视频录制
   */
  stopMediaRecording (options: {recordId?: string}) {
    if (!this.recordManager.record){
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: '操作非法：没有开始录制'
      })
    }
    //FIXME
    return this.recordManager.record.stop({})
  }

  /**
   * 清除录制的音视频
   */
  cleanMediaRecording () {
    if (!this.recordManager.record){
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: '操作非法：没有开始录制'
      })
    }
    return this.recordManager.record.clean()
  }
  /**
   * 下载录制的音视频
   */
  downloadMediaRecording () {
    if (!this.recordManager.record){
      throw new RtcError({
        code: ErrorCode.NO_RECORD,
        message: '操作非法：没有开始录制'
      })
    }
    return this.recordManager.record.download()
  }




  /**
   *  销毁实例
   *  @method destroy
   *  @memberOf Client
   *  @param {Void}
   */
  destroy () {
    this.logger && this.logger.warn('清除 Client 实例中')
    this._reset();
    this.destroyed = true;
    this.logger && this.logger.warn('已清除 Client 实例')
  }
}

export { Client }

/* eslint prefer-promise-reject-errors: 0 */
