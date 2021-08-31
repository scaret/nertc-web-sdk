import { EventEmitter } from "eventemitter3";
import {Meeting} from '../module/meeting'
import {MediaHelper} from '../module/media'
import {Signalling} from '../module/signalling'
import {Mediasoup} from '../module/mediasoup'
import {RTSTransport} from '../module/rtsTransport'
import {StatsReport} from '../module/report/statsReport'
import {DataReport} from '../module/report/dataReport'
import {Logger} from "../util/webrtcLogger";
import {
  AdapterRef,
  APIFrequencyControlOptions, NeRtcServerAddresses,
  ClientOptions, JoinChannelRequestParam4WebRTC2,
  LiveConfig, MediaTypeShort, RecordConfig
} from "../types";
import {Stream} from "./stream";
import {MediaCapability} from "../module/mediaCapability";
import {getSupportedCodecs} from "../util/rtcUtil/codec";
import {Encryption} from "../module/encryption";
import { logController } from "../util/log/upload";
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';

/**
 * 基础框架
 */
class Base extends EventEmitter {
  public _params: {
    mode: "rtc" | "live";
    appkey: string;
    token?: string;
    JoinChannelRequestParam4WebRTC2?: JoinChannelRequestParam4WebRTC2
    neRtcServerAddresses?: NeRtcServerAddresses
  }
  public adapterRef:AdapterRef;
  private sdkRef: any;
  public logStorage: any;
  constructor(options:ClientOptions) {
    super();
    this._params = {
      appkey: "",
      mode: 'rtc'
    };
    //typescript成员初始化
    this.adapterRef = {// adapter对象内部成员与方法挂载的引用
      channelInfo: {
        sessionConfig: {}
      },
      //webrtc G2 API上报频控
      apiEvent: {},
      apiEvents: {},
      requestId: {},
      logController: logController,
      //@ts-ignore
      instance: this,
      report: true
    };
  
    this.adapterRef.mediaCapability = new MediaCapability(this.adapterRef);
    this.adapterRef.encryption = new Encryption(this.adapterRef),
    this._reset();
    this.adapterRef.logger = new Logger({
      adapterRef: this.adapterRef,
      debug: options.debug,
      prefix: "WEBRTC"
    });
    //@ts-ignore
    window.debugG2 = options.debug ? true : false
    this.adapterRef.testConf = {}; //内部测试配置
    this.sdkRef = options.ref;
    if (options.report === undefined) {
      this.adapterRef.report = true
    } else {
      this.adapterRef.report = options.report
    }
  }

  _reset() {
    this.sdkRef = null; // SDK对象的this指针
    this.adapterRef = {// adapter对象内部成员与方法挂载的引用
      channelInfo: {
        sessionConfig: {}
      },
      userPriority: {
        priority: 100, 
        preemtiveMode: false
      },
      //webrtc G2 API上报频控
      apiEvent: {},
      apiEvents: {},
      requestId: {},
      //@ts-ignore
      instance: this,
      logger: console,
      _enableRts: false //rts是否启动的标志位
    };
    this.adapterRef.mediaCapability = new MediaCapability(this.adapterRef);
    this.adapterRef.encryption = new Encryption(this.adapterRef);
    
    this._resetState(); // 内部状态对象
    this._destroyModule();
  }

  _getSupportedCodecs(){
    return getSupportedCodecs(...arguments);
  }

  initMode() {
    if (!this.adapterRef._meetings) {
      this.adapterRef._meetings = new Meeting({
        sdkRef: this.sdkRef,
        adapterRef: this.adapterRef
      })
    }
    if (!this.adapterRef._signalling) {
      this.adapterRef._signalling = new Signalling({
        sdkRef: this.sdkRef,
        adapterRef: this.adapterRef
      })
    }

    if (!this.adapterRef._mediasoup) {
      this.adapterRef._mediasoup = new Mediasoup({
        sdkRef: this.sdkRef,
        adapterRef: this.adapterRef
      })
    }

    // 原始以及处理过的 stats 数据上报
    if (!this.adapterRef._statsReport) {
      this.adapterRef._statsReport = new StatsReport({
        sdkRef: this.sdkRef,
        adapterRef: this.adapterRef
      })
    }
  }

  _destroyModule () {
    if(this.adapterRef._meetings){
      this.adapterRef._meetings.destroy()
      this.adapterRef._meetings = null
    }

    if(this.adapterRef._signalling){
      this.adapterRef._signalling.destroy()
      this.adapterRef._signalling = null
    }

    if (this.adapterRef._rtsTransport) {
      this.adapterRef._rtsTransport.destroy()
      this.adapterRef._rtsTransport = null
    }

    if(this.adapterRef._mediasoup){
      this.adapterRef._mediasoup.destroy()
      this.adapterRef._mediasoup = null
    }

    if (this.adapterRef._statsReport) {
      this.adapterRef._statsReport.destroy()
      this.adapterRef._statsReport = null
    }
  }

  _resetState() {
    this._params.neRtcServerAddresses = {}
    this.adapterRef.channelStatus = 'init'
    this.adapterRef.connectState = {
      prevState: 'DISCONNECTED',
      curState: 'DISCONNECTED'
    }
    this.adapterRef.networkQuality = {};
    this.adapterRef.localStream = null;
    this.adapterRef.memberMap = {};
    this.adapterRef.remoteStreamMap = {};
    this.adapterRef.netStatusList = [];
    if (this.adapterRef.netStatusTimer) {
      clearInterval(this.adapterRef.netStatusTimer)
      this.adapterRef.netStatusTimer = null
    }

    this.adapterRef.uid2SscrList = {}

    // 状态类变量
    this.adapterRef.state = {
      lastDeviceStatus: {
        // 暂存上次用户打开的设备类型(供重连使用)
        audio: {
          type: null,
          device: null
        },
        video: {
          type: null,
          device: null
        },
      },
      audioDeviceHasOpened: false, // 是否启用了麦克风
      videoDeviceHasOpened: false, // 是否启用了摄像头
      chromeScreenShareOpened: false, // 是否启用了屏幕共享
      startSessionTime: 0, // 通话开始时间
      endSessionTime: 0, // 通话时间结束
      startPubVideoTime: 0, // 视频发布开始时间
      startPubScreenTime: 0, //屏幕共享发布开始时间
    };

    Object.assign(this.adapterRef, {
      transportStats: {   //peerConnection状态
        NetworkType: 'unknown',
        OutgoingAvailableBandwidth: 0,
        txRtt: 0,
        rxRtt: 0
      },
      sessionStats: {
        Duration: 0,
        RecvBitrate: 0,
        RecvBytes: 0,
        SendBitrate: 0,
        SendBytes: 0,
        UserCount: 0
      },
      localAudioStats: [],
      localVideoStats: [],
      localScreenStats: [],
      remoteAudioStats: {},
      remoteVideoStats: {},
      remoteScreenStats: {},
    })
  }

  setSessionConfig(sessionConfig = {}) {
    if (!this.adapterRef.channelInfo) {
      this.adapterRef.channelInfo = {};
    }

    if (!this.adapterRef.channelInfo.sessionConfig) {
      this.adapterRef.channelInfo.sessionConfig = {};
    }

    this.adapterRef.channelInfo.sessionConfig = Object.assign(
      this.adapterRef.channelInfo.sessionConfig,
      sessionConfig
    );
  }

  // 重连专用状态清理方法
  resetChannel() {
    this.adapterRef.networkQuality = {};
    this.adapterRef.netStatusList = [];
    for (let uid in this.adapterRef.remoteStreamMap){
      const stream = this.adapterRef.remoteStreamMap[uid];
      stream.destroy();
    }
    this.adapterRef.remoteStreamMap = {}
    this.adapterRef.memberMap = {}
    this.adapterRef.uid2SscrList = {}
    if(this.adapterRef._mediasoup){
      this.adapterRef._mediasoup.destroy()
    }
  }

  startSession() {
    this.adapterRef.logger.log('开始音视频会话')
    let { wssArr, cid } = this.adapterRef.channelInfo
    if (!wssArr || wssArr.length === 0) {
      this.adapterRef.logger.error('没有找到服务器地址')
      this.adapterRef.channelStatus = 'leave'
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NO_SERVER_ADDRESS,
          message: 'no server address'
        })
      )
    }

    if (!cid) {
      this.adapterRef.logger.error('服务器没有分配cid')
      this.adapterRef.channelStatus = 'leave'
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'no cid'
        })
      )
    }
    this.adapterRef.logger.log('开始连接服务器: %s, url: %o', this.adapterRef.channelInfo.wssArrIndex, wssArr)
    if (this.adapterRef.channelInfo.wssArrIndex >= wssArr.length) {
      this.adapterRef.logger.error('所有的服务器地址都连接失败')
      this.adapterRef.channelInfo.wssArrIndex = 0
      this.adapterRef.channelStatus = 'leave'
      return Promise.reject(
        new RtcError({
          code: ErrorCode.SOCKET_ERROR,
          message: 'socket error'
        })
      )
    }
    const url = wssArr[this.adapterRef.channelInfo.wssArrIndex]
    if (!this.adapterRef._signalling){
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NO_SIGNALLING,
          message: 'signalling error'
        })
      )
    }
    const p =  this.adapterRef._signalling.init(url).then(()=>{
      //将连接成功的url放置到列表的首部，方便后续的重连逻辑
      const connectUrl = wssArr[this.adapterRef.channelInfo.wssArrIndex]
      wssArr.splice(this.adapterRef.channelInfo.wssArrIndex, 1)
      wssArr.unshift(connectUrl)
      this.adapterRef.channelInfo.wssArrIndex = 0
      if (!this.adapterRef._statsReport){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_STATS,
            message: 'no stats'
          })
        )
      }
      this.adapterRef._statsReport.start()
      this.adapterRef._statsReport.startHeartbeat()
      return Promise.resolve()
    });
    p.catch(e => {
      this.adapterRef.logger.warn('startSession error: ', e)
      if (e === 'timeout') {
        this.adapterRef.channelInfo.wssArrIndex++
        return this.startSession()
      } else {
        this.adapterRef.channelStatus = 'leave'
        return Promise.reject(e)
      }
    })
    return p;
  }

  stopSession() {
    this.adapterRef.logger.log('开始清除音视频会话')
    this._destroyModule();
    this.adapterRef.localStream && this.adapterRef.localStream.destroy()
    Object.values(this.adapterRef.remoteStreamMap).forEach(stream => {
      stream.destroy()
    })
    this.adapterRef.remoteStreamMap = {}
    this.adapterRef.memberMap = {}
    this.adapterRef.uid2SscrList = {}
    this._resetState(); // 内部状态对象
  }

  async clearMember(uid: number | string) {
    this.adapterRef.logger.log('%s 离开房间', uid);
    const remotStream = this.adapterRef.remoteStreamMap[uid];
    if (remotStream) {
      if (remotStream.pubStatus.audio) {
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASOUP,
            message: 'media server error 1'
          })
        }
        this.adapterRef._mediasoup.destroyConsumer(remotStream.pubStatus.audio.consumerId)
      }
      if (remotStream.pubStatus.video) {
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASOUP,
            message: 'media server error 2'
          })
        }
        this.adapterRef._mediasoup.destroyConsumer(remotStream.pubStatus.video.consumerId)
      }
      remotStream.destroy();
      delete this.adapterRef.remoteStreamMap[uid];
      delete this.adapterRef.memberMap[uid];
      delete this.adapterRef.remoteAudioStats[uid];
      delete this.adapterRef.remoteVideoStats[uid];
      delete this.adapterRef.remoteScreenStats[uid];
      const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData
      if (data && data[uid]) {
        delete data[uid]
      }
    }
    this.adapterRef.netStatusList = this.adapterRef.netStatusList.filter((item, index, list)=>{
      return item.uid !== uid
    })
    this.adapterRef.logger.log('%s 离开房间 通知用户', uid);
    console.log('_enableRts: ', this.adapterRef._enableRts)
    if (this.adapterRef._enableRts) {
      this.adapterRef.instance.emit('rts-peer-leave', {uid});
    } else {
      this.adapterRef.instance.emit('peer-leave', {uid});
    }
  }

  // 设置通话开始时间
  setStartSessionTime() {
    this.adapterRef.state.startSessionTime = Date.now();
  }

  // 设置通话结束时间
  setEndSessionTime() {
    if (!this.adapterRef.state.startSessionTime) {
      this.adapterRef.logger.log(
        "AbstractAdapter: setEndSessionTime: startSessionTime为空"
      );
      return;
    }
    this.adapterRef.state.endSessionTime = Date.now();
    const sessionDuration =
      this.adapterRef.state.endSessionTime -
      this.adapterRef.state.startSessionTime;
    this.emit('sessionDuration', sessionDuration);
    this.adapterRef.state.startSessionTime = 0;
    this.adapterRef.state.endSessionTime = 0;
  }

  //重新建立下行连接
  async reBuildRecvTransport() {
    this.adapterRef.logger.warn('下行通道异常，重新建立')
    if (!this.adapterRef._mediasoup){
      throw new RtcError({
        code: ErrorCode.NO_MEDIASOUP,
        message: 'media server error 3'
      })
    }
    this.adapterRef._mediasoup.init()
    this.adapterRef.logger.log('下行通道异常, remoteStreamMap', this.adapterRef.remoteStreamMap)
    this.adapterRef.logger.log('this._eventQueue: ', this.adapterRef._mediasoup._eventQueue)
    for (const streamId in this.adapterRef.remoteStreamMap) {
      const stream = this.adapterRef.remoteStreamMap[streamId];
      stream.pubStatus.audio.consumerStatus = 'init'
      stream.pubStatus.video.consumerStatus = 'init'
      stream.pubStatus.screen.consumerStatus = 'init'
      stream.pubStatus.audio.consumerId = ""
      stream.pubStatus.video.consumerId = ""
      stream.pubStatus.screen.consumerId = ""
      this.adapterRef.logger.log('重连逻辑订阅 start：', stream.stringStreamID)
      try {
        //@ts-ignore
        await this.subscribe(stream)
      } catch (e) {
        this.adapterRef.logger.log('重连逻辑订阅 error: ', e, e.name, e.message)
        break
      }
      
      this.adapterRef.logger.log('重连逻辑订阅 over: ', stream.stringStreamID)
    }
  }

  async rtsRequestKeyFrame(stream:Stream) {
    this.adapterRef.logger.log('请求关键帧: ', stream.pubStatus.video.consumerId)
    if (this.adapterRef._signalling) {
      await this.adapterRef._signalling.rtsRequestKeyFrame(stream.pubStatus.video.consumerId);
    }
  }


  /**************************业务类工具******************************/

  //G2 API事件上报频率控制
  apiFrequencyControl(options: APIFrequencyControlOptions) {
    const {name, code, param} = options;
    if(!name) return
    if (!this.adapterRef.apiEvent[name]) {
      this.adapterRef.apiEvent[name] = []
      this.adapterRef.apiEvents[name] = []
      this.adapterRef.requestId[name] = 0
    }
    let time = this.adapterRef.channelInfo.clientNtpTime - this.adapterRef.channelInfo.T4;
    if (!(time > 0)){
      time = 0;
    }
    let length = this.adapterRef.apiEvent[name].length
    if (length < 10) {
      this.adapterRef.apiEvent[name].push({
        cid: this.adapterRef.channelInfo && this.adapterRef.channelInfo.cid,
        uid: this.adapterRef.channelInfo && this.adapterRef.channelInfo.uid,
        code: code,
        name,
        time: Date.now() + time,
        param,
        request_id: this.adapterRef.requestId[name]++
      })
    } else {
      if (!this.adapterRef.apiEvent || !this.adapterRef.apiEvent[name] || !this.adapterRef.apiEvent[name].length){
        throw new RtcError({
          code: ErrorCode.NOT_FOUND,
          message: `No apiEvent Named ${name}`
        })
      }
      if (!this.adapterRef.apiEvent[name][0].time){
        throw new RtcError({
          code: ErrorCode.NOT_FOUND,
          message: 'Invalid time for '
        })
      }
      if ((Date.now() - this.adapterRef.apiEvent[name][0].time) < 10000) {
        this.adapterRef.requestId[name]++
      } else {
        this.adapterRef.apiEvents[name] = this.adapterRef.apiEvents[name].concat(this.adapterRef.apiEvent[name])
        this.adapterRef.apiEvent[name] = [];
      }
    }
  }
  
  //G2 事件上报
  apiEventReport(func: string, value: any){
    if(!this.adapterRef.report) return
    if (!func) return
    let datareport = new DataReport({
      adapterRef: this.adapterRef,
      sdkRef: this.sdkRef
    })
    //@ts-ignore
    datareport[func](Object.assign({
      uid: '' + this.adapterRef.channelInfo.uid,
      cid: '' + this.adapterRef.channelInfo.cid,
      time: Date.now()
    }, value))
    datareport.send()
  }

  /*** 用户成员uid和ssrc对应的list ***/
  getUidAndKindBySsrc(ssrc:number) {
    for (let i in this.adapterRef.uid2SscrList) {
      if(this.adapterRef.uid2SscrList[i].audio.ssrc == ssrc){
        return {uid: i, kind: 'audio'}
      } else if(this.adapterRef.uid2SscrList[i].video && this.adapterRef.uid2SscrList[i].video.ssrc == ssrc){
        return {uid: i, kind: 'video'}
      } else if(this.adapterRef.uid2SscrList[i].screen && this.adapterRef.uid2SscrList[i].screen.ssrc == ssrc){
        return {uid: i, kind: 'screen'}
      }
    }
    return {uid: 0, kind: ''}
  }

  getSsrcByUidAndKind (uid:number|string, kind:MediaTypeShort) {
    return this.adapterRef.uid2SscrList[uid] && this.adapterRef.uid2SscrList[uid][kind]
  }

  addSsrc(uid:number|string, kind:MediaTypeShort, ssrc:number) {
    if (!this.adapterRef.uid2SscrList[uid]) {
      this.adapterRef.uid2SscrList[uid] = {
        audio: {ssrc: 0},
        video: {ssrc: 0},
        screen: {ssrc: 0},
      };
    }
    if (!this.adapterRef.uid2SscrList[uid][kind]) {
      this.adapterRef.uid2SscrList[uid][kind] = {ssrc: ssrc};
    } else {
      this.adapterRef.uid2SscrList[uid][kind].ssrc = ssrc
    }
  }

  removeSsrc(uid:number|string, kind?:MediaTypeShort) {
    if(this.adapterRef.uid2SscrList[uid]){
      if (kind) {
        if(this.adapterRef.uid2SscrList[uid][kind]){
          this.adapterRef.uid2SscrList[uid][kind].ssrc = 0
        }
      } else {
        delete this.adapterRef.uid2SscrList[uid];
      }
    }
  }
  
  isPublished(stream: Stream){
    return stream && ((stream.audio && stream.pubStatus.audio.audio) || (stream.video && stream.pubStatus.video.video) || (stream.screen && stream.pubStatus.screen.screen))
  }

  isSubscribe(stream: Stream){
    return stream && (stream.subStatus.audio || stream.subStatus.video)
  }

  getPeer(sendOrRecv:string){
    if (!this.adapterRef._mediasoup) { 
      return null
    } else if (sendOrRecv=='send') {
      return this.adapterRef._mediasoup._sendTransport && this.adapterRef._mediasoup._sendTransport.handler._pc
    } else if (sendOrRecv=='recv') {
      return this.adapterRef._mediasoup._recvTransport && this.adapterRef._mediasoup._recvTransport.handler._pc
    } else {
      return null
    }
  }

  destroy() {
    this.adapterRef.logger.log("base: destroy!");
    this._reset();
  }
}

export { Base };

/* eslint no-undef: "error" */
/* eslint prefer-promise-reject-errors: 0 */
/* eslint eqeqeq: 0 */
