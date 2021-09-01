import { EventEmitter } from 'eventemitter3'
import { Stream } from '../api/stream'
import { RtcSystem } from '../util/rtcUtil/rtcSystem'
import BigNumber from 'bignumber.js'
import {ENGINE_VERSION} from '../Config/index'
import {
  AdapterRef, MediaTypeShort, NetStatusItem,
  SDKRef,
  SignallingOptions,
  Timer, VideoCodecType
} from "../types";
import {Peer, ProtooNotification} from "./3rd/protoo-client";
import {Consumer} from "./3rd/mediasoup-client/Consumer";
import {emptyStreamWith} from "../util/gum";
import {SignalJoinRes} from "../interfaces/SignalProtocols";
import {EncryptionModes, encryptionModeToInt} from "./encryption";
import {RTSTransport} from "./rtsTransport";
import { parseBase64 } from "../util/crypto-ts/base64";
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import {platform} from "../util/platform";
const protooClient = require('./3rd/protoo-client/')

class Signalling extends EventEmitter {
  private adapterRef: AdapterRef;
  private sdkRef:SDKRef;
  private _reconnectionTimer: Timer|null;
  public _protoo: Peer|null;
  private _times: number;
  private _url: string|null;
  private _timeOut: number;
  private _reconnectionTimeout: number;
  private _resolve: ((data:any)=>void)|null;
  private _reject: ((data:any)=>void)|null;
  private consumers: {[consumerId: string]: Consumer };
  private keepAliveTimer: Timer|null;
  private netStatusTimer: Timer|null;
  
  constructor (options: SignallingOptions) {
    super()
    // for typescript
    this._reconnectionTimer = null
    this._protoo = null
    this._times = 0
    this._url = null
    this._timeOut = 2 * 1000
    this._reconnectionTimeout = 30 * 1000
    this._resolve = null
    this._reject = null
    this.consumers = {}
    this.keepAliveTimer = null
    this.netStatusTimer = null
    this._reset()
    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
  }

  async _reset() {
    if (this._reconnectionTimer) {
      clearTimeout(this._reconnectionTimer)
    }
    this._reconnectionTimer = null
    if (this._protoo) {
      await this._protoo.close()
    }
    this._protoo = null
    this._times = 0
    this._timeOut = 2 * 1000
    this._reconnectionTimeout = 30 * 1000
    this._resolve = null
    this._reject = null
  }

  init(url:string, isReconnect:boolean=false, isReconnectMeeting:boolean=false) {
    if(this._reconnectionTimer) return Promise.resolve()
    
    return new Promise((resolve, reject) =>{
      if(!isReconnect) {
        this._resolve = resolve
      }
      if(!isReconnect){
        this._reject = reject
      }
      
      this._init(url)
      this._reconnectionTimer = setTimeout(()=>{
        this._reconnectionTimer = null
        if (isReconnectMeeting) {
          this._reconnection()
        } else {
          this._connection()
        }
      }, this._timeOut)
    })
  }

  async _connection() {
    this.adapterRef.logger.log('Signalling _connection, times: %o', this._times)
    this._unbindEvent()
    if (this._protoo) {
      await this._protoo.close()
      this._protoo = null
    }
    if(this._times < 3){
      this.adapterRef.logger.warn('Signalling 第%s次重连', ++this._times)
      this.init(this.adapterRef.channelInfo._protooUrl, true)
    } else {
      this.adapterRef.logger.warn('Signalling 3次重连结束')
      this._times = 0
      this._reject && this._reject('timeout')
    }
  }

  async _reconnection() {
    this.adapterRef.logger.log('Signalling _reconnection, times: %o', this._times)
    /*if (this.adapterRef.channelStatus === 'connectioning') {
      return
    }*/
    if (this._reconnectionTimer) return
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'CONNECTING'
    this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
    this._unbindEvent()
    if (this._protoo) {
      await this._protoo.close()
      this._protoo = null
    }
    for (let uid in this.adapterRef.remoteStreamMap){
      const remoteStream = this.adapterRef.remoteStreamMap[uid];
      if (remoteStream._play){
        this.adapterRef.logger.warn('Destroy Remote Player', uid);
        remoteStream._play.destroy();
      }
    }
    
    if(this._times < 3){
      this.adapterRef.logger.warn('Signalling 第%s次重连', ++this._times)
      this._timeOut = 2000 * this._times
      this.init(this.adapterRef.channelInfo._protooUrl, true, true)
    } else {
      this.adapterRef.logger.warn('Signalling  url: %s, 当前服务器地址重连结束, 尝试下一个服务器地址', this.adapterRef.channelInfo._protooUrl)
      if (++this.adapterRef.channelInfo.wssArrIndex >= this.adapterRef.channelInfo.wssArr.length) {
        this.adapterRef.logger.error('所有的服务器地址都连接失败, 主动离开房间')
        this.adapterRef.channelInfo.wssArrIndex = 0
        this.adapterRef.instance.leave()
        this.adapterRef.instance.emit('error', 'SOCKET_ERROR')
        return
      }
      const url = this.adapterRef.channelInfo.wssArr[this.adapterRef.channelInfo.wssArrIndex]
      this._timeOut = 2000
      this._times = 0
      this.adapterRef.logger.warn('Signalling 第%s次重连', ++this._times)
      this.init(url, true, true)
    }
  }

  _init(url:string) {
    this.adapterRef.logger.log('Signalling: init url=%o',  url)
    this.adapterRef.channelInfo._protooUrl = url
    this._url = `wss://${url}&cid=${this.adapterRef.channelInfo.cid}&uid=${this.adapterRef.channelInfo.uid}`
    this.adapterRef.logger.log('连接的url: ', this._url)
    const protooTransport = new protooClient.WebSocketTransport(this._url, {

      retry: {
        retries    : 0,
        factor     : 2,
        minTimeout : 1 * 1000,
        maxTimeout : 2 * 1000,
        forever    : false,
        maxRetryTime: 2000
      }
    });
    this._protoo = new protooClient.Peer(protooTransport);
    this._bindEvent()
  }

  _bindEvent() {
    if (!this._protoo){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'No this._protoo 1'
      })
    }
    this._protoo.on('open', this.join.bind(this))
    this._protoo.on('failed', this._handleFailed.bind(this))
    this._protoo.on('notification', this._handleMessage.bind(this))
    this._protoo.on('close', this._handleClose.bind(this))
    this._protoo.on('disconnected', this._handleDisconnected.bind(this))
  }

  _unbindEvent() {
    if(!this._protoo) return
    this._protoo.removeListener('open', this.join.bind(this))
    this._protoo.removeListener('failed', this._handleFailed.bind(this))
    this._protoo.removeListener('notification', this._handleMessage.bind(this))
    this._protoo.removeListener('close', this._handleClose.bind(this))
    this._protoo.removeListener('disconnected', this._handleDisconnected.bind(this))
  }

  async _handleMessage (notification:ProtooNotification) {
    /*this.adapterRef.logger.log(
      'proto "notification" event [method:%s, data:%o]',
      notification.method, notification.data);*/

    switch (notification.method) {
      case 'OnPeerJoin': {
        const { requestId, externData } = notification.data;
        this.adapterRef.logger.log('收到OnPeerJoin成员加入消息 uid = %o', externData.uid);
        /*if (typeof externData.uid === 'string') {
          this.adapterRef.logger.log('对端uid是string类型')
          this.adapterRef.channelInfo.uidType = 'string'
        } else if (typeof externData.uid === 'number') {
          this.adapterRef.logger.log('对端uid是number类型')
          this.adapterRef.channelInfo.uidType = 'string'
          if(externData.uid > Number.MAX_SAFE_INTEGER){
            this.adapterRef.logger.log('对端uid超出number精度')
            externData.uid = new BigNumber(externData.uid)
            externData.uid = externData.uid.toString()
          }
        }*/
        let uid = externData.uid
        if (this.adapterRef.channelInfo.uidType === 'string') {
          uid = new BigNumber(uid)
          uid = uid.toString()
        }

        let remoteStream = this.adapterRef.remoteStreamMap[uid]
        if (!remoteStream) {
          remoteStream = new Stream({
            isRemote: true,
            uid,
            audio: false,
            video: false,
            screen: false,
            client: this.adapterRef.instance,
          })
          this.adapterRef.remoteStreamMap[uid] = remoteStream
          this.adapterRef.memberMap[uid] = uid;
        }
        this.adapterRef.instance._roleInfo.audienceList[uid] = false;
        this.adapterRef.instance.emit('peer-online', {uid})
        break
      }
      case 'OnPeerLeave': {
        const { requestId, externData } = notification.data;
        this.adapterRef.logger.log('OnPeerLeave externData = %o', externData);
        if (externData.userList) {
          externData.userList.forEach((item:any) =>{
            let uid = item.uid
            if (this.adapterRef.channelInfo.uidType === 'string') {
              uid = new BigNumber(uid)
              uid = uid.toString()
            }
            this.adapterRef._mediasoup?.removeUselessConsumeRequest({uid})
            this.adapterRef.instance.clearMember(uid)
            this.adapterRef.instance.removeSsrc(uid)
            delete this.adapterRef.instance._roleInfo.audienceList[uid];
          })
        }
        break
      }
      case 'OnNewProducer': {
        const { requestId, externData } = notification.data;
        this.adapterRef.logger.log('收到OnNewProducer发布消息 externData = %o', JSON.stringify(externData.producerInfo, null, ' '))
        let {
          uid,
          producerId,
          mediaType,
          mute,
          simulcastEnable
        } = externData.producerInfo;
        if (this.adapterRef.channelInfo.uidType === 'string') {
          uid = new BigNumber(uid)
          uid = uid.toString()
        }
        let mediaTypeShort: MediaTypeShort;
        switch (mediaType){
          case "video":
            mediaTypeShort = 'video';
            break;
          case "screenShare":
            mediaTypeShort = 'screen';
            break;
          case "audio":
            mediaTypeShort = 'audio';
            break;
          default:
            throw new RtcError({
              code: ErrorCode.UNKNOWN_TYPE,
              message: `Unrecognized mediaType ${mediaType}`
            })
        }
        let remoteStream = this.adapterRef.remoteStreamMap[uid]
        if (!remoteStream) {
          remoteStream = new Stream({
            isRemote: true,
            uid,
            audio: mediaTypeShort === 'audio',
            video: mediaTypeShort === 'video',
            screen: mediaTypeShort === 'screen',
            client: this.adapterRef.instance,
          })
          this.adapterRef.remoteStreamMap[uid] = remoteStream
          this.adapterRef.memberMap[uid] = uid;
        }
        if (remoteStream.pubStatus[mediaTypeShort].consumerId){
          this.adapterRef._mediasoup?.destroyConsumer(remoteStream.pubStatus[mediaTypeShort].consumerId);
          //remoteStream.pubStatus[mediaTypeShort].consumerId = '';
        } else {
          this.adapterRef._mediasoup?.removeUselessConsumeRequest({producerId: remoteStream.pubStatus[mediaTypeShort].producerId})
        }

        remoteStream[mediaTypeShort] = true
        //@ts-ignore
        remoteStream.pubStatus[mediaTypeShort][mediaTypeShort] = true
        remoteStream.pubStatus[mediaTypeShort].producerId = producerId
        remoteStream.pubStatus[mediaTypeShort].mute = mute
        remoteStream.pubStatus[mediaTypeShort].simulcastEnable = simulcastEnable
        //旧的consumer已经失效了
        remoteStream.pubStatus[mediaTypeShort].consumerId = ''
        
        if (this.adapterRef._enableRts && this.adapterRef._rtsTransport) {
          this.adapterRef.instance.emit('rts-stream-added', {stream: remoteStream, kind: mediaType})
        } else {
          this.adapterRef.instance.emit('stream-added', {stream: remoteStream, 'mediaType': mediaTypeShort})
        }
        if (mute) {
          this.adapterRef.instance.emit(`mute-${mediaTypeShort}`, {uid})
        }
        break
      }
      case 'OnProducerClose': { 
        const { requestId, code, errMsg, externData } = notification.data;
        let {
          uid,
          producerId,
          mediaType,
          cid
        } = externData;
        if (this.adapterRef.channelInfo.uidType === 'string') {
          uid = new BigNumber(uid)
          uid = uid.toString()
        }
        this.adapterRef.logger.log('收到OnProducerClose消息 code = %d, errMsg = %s, uid = %s, mediaType = %s, producerId: %s', code, errMsg, uid, mediaType, producerId);
        let mediaTypeShort:MediaTypeShort;
        switch (mediaType){
          case "video":
            mediaTypeShort = 'video';
            break;
          case "screenShare":
            mediaTypeShort = 'screen';
            break;
          case "audio":
            mediaTypeShort = 'audio';
            break;
          default:
            throw new RtcError({
              code: ErrorCode.UNKNOWN_TYPE,
              message: `Unrecognized mediaType ${mediaType}`
            })
        }
        let remoteStream = this.adapterRef.remoteStreamMap[uid]
        if(!remoteStream) return
        
        if (remoteStream.pubStatus[mediaTypeShort].producerId !== producerId) {
          this.adapterRef.logger.log('该 producerId 已经无效，不处理')
          return
        }


        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASOUP,
            message: 'media server error 22'
          })
        }

        this.adapterRef._mediasoup.removeUselessConsumeRequest({producerId})
        if (remoteStream.pubStatus[mediaTypeShort].consumerId){
          this.adapterRef._mediasoup.destroyConsumer(remoteStream.pubStatus[mediaTypeShort].consumerId)
          remoteStream.pubStatus[mediaTypeShort].consumerId = '';
        }
        this.adapterRef.instance.removeSsrc(uid, mediaTypeShort)
        remoteStream.subStatus[mediaTypeShort] = false
        //@ts-ignore
        remoteStream.pubStatus[mediaTypeShort][mediaTypeShort] = false
        remoteStream[mediaTypeShort] = false
        remoteStream.pubStatus[mediaTypeShort].consumerId = ''
        remoteStream.pubStatus[mediaTypeShort].producerId = ''
        const data = this.adapterRef._statsReport && this.adapterRef._statsReport.formativeStatsReport && this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData[uid]
        if (mediaTypeShort === 'audio') {
          if (remoteStream.mediaHelper){
            remoteStream.mediaHelper.micTrack = null;
            emptyStreamWith(remoteStream.mediaHelper.audioStream, null);
          }
          delete this.adapterRef.remoteAudioStats[uid];
          if (data) {
            data.recvFirstAudioFrame = false
            data.recvFirstAudioPackage = false
          }
        } else if (mediaTypeShort === 'video') {
          if (remoteStream.mediaHelper){
            remoteStream.mediaHelper.cameraTrack = null;
            remoteStream.mediaHelper.videoStream = null;
          }
          delete this.adapterRef.remoteVideoStats[uid];
          if (data) {
            data.recvFirstVideoFrame = false
            data.recvFirstVideoPackage = false
            data.videoTotalPlayDuration = 0
          }
        }else if (mediaTypeShort === 'screen'){
          if (remoteStream.mediaHelper){
            remoteStream.mediaHelper.screenTrack = null;
            remoteStream.mediaHelper.screenStream = null;
          }
          delete this.adapterRef.remoteScreenStats[uid];
          if (data) {
            data.recvFirstScreenFrame = false
            data.recvFirstScreenPackage = false
            data.screenTotalPlayDuration = 0
          }
        }

        if (this.adapterRef._enableRts) {
          this.adapterRef.instance.emit('rts-stream-removed', {stream: remoteStream})
        } else {
          this.adapterRef.instance.emit('stream-removed', {stream: remoteStream, 'mediaType': mediaTypeShort})
        }
        break
      }
      case 'OnConsumerClose': {
        const { requestId, code, errMsg, consumerId, producerId } = notification.data;
          this.adapterRef.logger.log('chence OnConsumerClose code = %d errMsg = %s producerId = %s', 
            code, errMsg, producerId);
        const consumer = this.consumers[consumerId];
        if (!consumer)
            break;
          consumer.close();
        break
      }
      case 'consumerPaused': {
        const { consumerId } = notification.data;
        const consumer = this.consumers[consumerId];
        if(!consumer) break;

        // TODO fixme
        // @ts-ignore
        this.adapterRef.instance.emit('stream-removed', {stream: remoteStream})
        break
      }
      case 'consumerResumed': {
        break
      }
      case 'consumerScore': {
        break
      }
      case 'OnTransportClose': {
        const { requestId, code, errMsg, transportId } = notification.data;
          this.adapterRef.logger.warn('chence OnTransportClose: code = %d, errMsg = %s, transportId = %s', 
            code, errMsg, transportId);
          if (!this.adapterRef._mediasoup){
            throw new RtcError({
              code: ErrorCode.NO_MEDIASOUP,
              message: 'media server error 23'
            })
          }
          if (this.adapterRef._mediasoup._sendTransport 
            && (this.adapterRef._mediasoup._micProducer || this.adapterRef._mediasoup._webcamProducer)) {
            this.adapterRef.logger.warn('服务器媒体进程crash，上行媒体和下行媒体同时重连')
            this.adapterRef.channelStatus = 'connectioning'
            this.adapterRef.instance.apiEventReport('setDisconnect', {
              reason: 'OnTransportClose' 
            })
            this._reconnection()
          } else {
            this.adapterRef.logger.warn('服务器发送了错误信息')
          }
        break
      }
      case 'OnConsumerClose': {
        const { requestId, code, errMsg, consumerId, producerId } = notification.data;
          this.adapterRef.logger.warn('chence OnConsumerClose: code = %d, errMsg = %s consumerId = %s, producerId = %s', 
            code, errMsg, consumerId, producerId);
          if (!this.adapterRef._mediasoup){
            throw new RtcError({
              code: ErrorCode.NO_MEDIASOUP,
              message: 'media server error 24'
            })
          }
          if (this.adapterRef._mediasoup._recvTransport) {
            this.adapterRef.logger.warn('下行媒体同时重连')
            this.adapterRef.channelStatus = 'connectioning'
            this.adapterRef.instance.apiEventReport('setDisconnect', {
              reason: 'OnConsumerClose' 
            })
            this._reconnection()
          } else {
            this.adapterRef.logger.warn('服务器发送了错误信息')
          }
        break
      }
      case 'OnSignalRestart': {
        const { requestId, code, errMsg } = notification.data;
          this.adapterRef.logger.warn('chence OnSignalRestart code = %d errMsg = %s', 
            code, errMsg);
          this.adapterRef.logger.warn('服务器信令进程crash，重连')
          this.adapterRef.channelStatus = 'connectioning'
          this.adapterRef.instance.apiEventReport('setDisconnect', {
              reason: 'OnSignalRestart' 
            })
          if (!this._protoo){
            throw new RtcError({
              code: ErrorCode.NOT_FOUND,
              message: 'No this._protoo 2'
            })
          }
          this.adapterRef.logger.log('connected: ', this._protoo.connected)
          if (this._protoo.connected) {
            setTimeout(()=>{
              this.join() //OnSignalRestart会导致冲突，临时方案，3.9.0彻底解决
            }, 3 * 1000)
          } else {
            this._reconnection()
          }
          
        break
      }
      case 'activeSpeaker': {
        break
      }
      case 'OnKickOff': {
        let { msg, reason } = notification.data.externData;
        this._handleKickedNotify(reason)
        break
      }
      case 'OnUserData': {
        let { type, data, } = notification.data.externData;
        if (type === 'StreamStatus') {
          this._handleStreamStatusNotify(data)
        } else if (type === 'NetStatus') {
          this._handleNetStatusNotify(data)
        } else if (type === 'Mute') {
          this.adapterRef.logger.log('mute变更: ', JSON.stringify(data, null, ''))
          this._handleMuteNotify(data)
        } else if (type === 'UserRole') {
          this.adapterRef.logger.log('UserRole变更: ', JSON.stringify(data, null, ''))
          this._handleUserRoleNotify(notification.data.externData)
        } else if (type === 'RtmpTaskStatus') {
          this.adapterRef.logger.log('RtmpTaskStatus变更: ', JSON.stringify(data, null, ''))
          this.adapterRef.instance.emit('rtmp-state', data)
        } else if (type === 'MediaCapability') {
          this.adapterRef.logger.error('MediaCapability房间能力变更: ', JSON.stringify(data, null, ''))
          this.adapterRef.mediaCapability.parseRoom(data);
          this.adapterRef.instance.emit('mediaCapabilityChange');
          if (this.adapterRef._mediasoup && this.adapterRef.mediaCapability.room.videoCodecType && this.adapterRef.localStream){
            //@ts-ignore
            const targetCodecVideo = this.adapterRef.mediaCapability.getCodecSend("video", this.adapterRef._mediasoup._sendTransport.handler._sendingRtpParametersByKind["video"]);
            //@ts-ignore
            const targetCodecScreen = this.adapterRef.mediaCapability.getCodecSend("screen", this.adapterRef._mediasoup._sendTransport.handler._sendingRtpParametersByKind["video"]);
            const switchVideoCodec = this.adapterRef._mediasoup._webcamProducerCodec && this.adapterRef._mediasoup._webcamProducerCodec !== targetCodecVideo.codecName;
            if (switchVideoCodec){
              this.adapterRef.logger.error(`将视频的Codec切走：`, this.adapterRef._mediasoup._webcamProducerCodec, "=>", targetCodecVideo.codecName);
            }
            const switchScreenCodec = this.adapterRef._mediasoup._screenProducerCodec && this.adapterRef._mediasoup._screenProducerCodec !== targetCodecVideo.codecName;
            if (switchScreenCodec){
              this.adapterRef.logger.error(`将辅流的Codec切走：`, this.adapterRef._mediasoup._screenProducerCodec, "=>", targetCodecScreen.codecName);
            }
            if (switchVideoCodec || switchScreenCodec){
              // TODO 目前不知道如何在不重新协商的情况下直接切换Codec
              //  Workaround: 主动触发一次重连，导致重新建立RTC连接。
              // @ts-ignore
              if (this._protoo && this._protoo._transport && this._protoo._transport._ws){
                // @ts-ignore
                this._protoo._transport._ws.close()
              }
            }else{
              this.adapterRef.logger.log(`Codec保持不动。video:`, this.adapterRef._mediasoup._webcamProducerCodec, `, screen:`, this.adapterRef._mediasoup._screenProducerCodec);
            }
          }
        } else if (type === "Ability"){
          this._handleAbility(notification.data.externData.data);
        } else {
          this.adapterRef.logger.error('收到OnUserData通知消息 type = %s, data: %o', type, data)
        }
      }
    }
  }

  _handleFailed () {
    this.adapterRef.logger.log('Signalling:_handleFailed')
  }

  _handleClose () {
    
  }
  
  _handleDisconnected () {
    this.adapterRef.logger.log('Signalling:_handleDisconnected')
    this.adapterRef.logger.log('Signalling:_handleClose')
    this.adapterRef.channelStatus = 'connectioning'
    this.adapterRef.instance.apiEventReport('setDisconnect', {
      reason: '2' //ws中断
    })
    this._reconnection()
  }

  async join () {
    
    let gmEnable;
    if (!this.adapterRef.encryption.encryptionSecret){
      gmEnable = false;
    }else if (this.adapterRef.encryption.encryptionMode === "none" || this.adapterRef.encryption.encryptionMode === "encoded-transform-sm4-128-ecb"){
      gmEnable = false;
    }else{
      gmEnable = true;
    }
    
    const requestData = {
      method: 'Join',
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      externData: {
        userName: `${this.adapterRef.channelInfo.uid}`,
        token: this.adapterRef.channelInfo.token,
        cname: `${this.adapterRef.channelInfo.channelName}`,
        subType: 'select', 
        role: 'part', 
        version: '2.0', 
        sessionMode: 'meeting', 
        engineVersion: ENGINE_VERSION,
        userRole: this.adapterRef.instance._roleInfo.userRole, // 0:主播，1:观众
        userType: 3,
        platformType: 16, 
        rtmp: {      
          support: this.adapterRef.channelInfo.sessionConfig.liveEnable       
        },
        record: {   
          host: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,                  
          supportVideo: this.adapterRef.channelInfo.sessionConfig.recordVideo,
          supportAuido: this.adapterRef.channelInfo.sessionConfig.recordAudio,
          recordType: this.adapterRef.channelInfo.sessionConfig.recordType - 0      
        },
        mediaCapabilitySet: this.adapterRef.mediaCapability.stringify(),
        browser: {                       
          name: RtcSystem.browser.ua,       
          version: `${RtcSystem.browser.version}`
        },
        gmEnable: gmEnable,
        gmMode: encryptionModeToInt(this.adapterRef.encryption.encryptionMode),
        gmKey: this.adapterRef.encryption.encryptionSecret,
        userPriority: this.adapterRef.userPriority
      }
    }

    this.adapterRef.logger.log('Signalling: edge连接成功，加入房间 -> ', JSON.stringify(requestData, null, ''))
    
    this._times = 0
    if (!this._protoo){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'No this._protoo 3'
      })
    }

    try {
      const response = await this._protoo.request('Join', {
        requestId: requestData.requestId,
        externData: requestData.externData
      }) as SignalJoinRes;
      this.adapterRef.logger.log('Signalling:加入房间 ack ->  ', JSON.stringify(response, (k, v)=>{return k === "edgeRtpCapabilities" ? null : v;}));
      if (response.code != 200) {
        this.adapterRef.logger.error(
          'Signalling: 加入房间失败, reason = %s',
          response.errMsg
        )
        const errMsg = response.externData ? response.externData.errMsg : response.errMsg
        this._joinFailed(response.code, errMsg)
        return
      }

      if (this._reconnectionTimer) {
        clearTimeout(this._reconnectionTimer)
        this._reconnectionTimer = null
      }
      this.adapterRef.logger.log('Signalling:加入房间成功')
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'CONNECTED'
      this.adapterRef.channelStatus == 'join'
      
      if (this.adapterRef.channelStatus === 'connectioning') {
        this.adapterRef.logger.log('重连成功，清除之前的媒体的通道')
        this.adapterRef.instance.apiEventReport('setRelogin', {
          a_record: this.adapterRef.channelInfo.sessionConfig.recordAudio,
          v_record: this.adapterRef.channelInfo.sessionConfig.recordVideo,
          record_type: this.adapterRef.channelInfo.sessionConfig.recordType,
          host_speaker: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,
          result: 0,
          reason: 1,
          server_ip: this.adapterRef.channelInfo._protooUrl
        })

        this.adapterRef.instance.resetChannel()
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASOUP,
            message: 'media server error 25'
          })
        }
        this.adapterRef._mediasoup._edgeRtpCapabilities = response.edgeRtpCapabilities;
        this.adapterRef.mediaCapability.parseRoom(response.externData.roomCapability);
        this.adapterRef.instance.emit('mediaCapabilityChange');
        await this.adapterRef._mediasoup.init()
        if (this.adapterRef.localStream && this.adapterRef.instance.isPublished(this.adapterRef.localStream)) {
          this.adapterRef.logger.log('重连成功，重新publish本端流')
          this.adapterRef.instance.publish(this.adapterRef.localStream)
        } else {
          this.adapterRef.logger.log('重连成功')
        }
      } else {
        const webrtc2Param = this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2
        const currentTime = Date.now()
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.joinedSuccessedTime = currentTime
        this.adapterRef.instance.apiEventReport('setLogin', {
          a_record: this.adapterRef.channelInfo.sessionConfig.recordAudio,
          v_record: this.adapterRef.channelInfo.sessionConfig.recordVideo,
          record_type: this.adapterRef.channelInfo.sessionConfig.recordType,
          host_speaker: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,
          result: 0,
          server_ip: this.adapterRef.channelInfo._protooUrl,
          signal_time_elapsed: webrtc2Param.startWssTime - webrtc2Param.startJoinTime,
          time_elapsed: currentTime - webrtc2Param.startJoinTime,
          model: platform.name + '-' + platform.version
        })
        if (!this.adapterRef._mediasoup){
          throw new RtcError({
            code: ErrorCode.NO_MEDIASOUP,
            message: 'media server error 26'
          })
        }
        this.adapterRef._mediasoup._edgeRtpCapabilities = response.edgeRtpCapabilities;
        this.adapterRef.mediaCapability.parseRoom(response.externData.roomCapability);
        this.adapterRef.instance.emit('mediaCapabilityChange');
        await this.adapterRef._mediasoup.init()
      }
          
      this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
      if (this.adapterRef._enableRts) {
        await this.createRTSTransport()
        this.adapterRef.instance.emit('connected')
      }
      this.adapterRef.logger.log('加入房间成功, 查看房间其他人的发布信息: ', JSON.stringify(response.externData.userList))
      if (response.externData !== undefined && response.externData.userList && response.externData.userList.length) {
        for (const peer of response.externData.userList) {
          let uid = peer.uid
          if (this.adapterRef.channelInfo.uidType === 'string') {
            //@ts-ignore
            uid = new BigNumber(uid)
            uid = uid.toString()
          }
          let remoteStream = this.adapterRef.remoteStreamMap[uid]
          if (!remoteStream) {
            remoteStream = new Stream({
              isRemote: true,
              uid: uid,
              audio: false,
              video: false,
              screen: false,
              client: this.adapterRef.instance,
            })
            this.adapterRef.remoteStreamMap[uid] = remoteStream
            this.adapterRef.memberMap[uid] = "" + uid;
            this.adapterRef.instance.emit('peer-online', {uid})
          }
          if (peer.producerInfoList) {
            for (const peoducerInfo of peer.producerInfoList) {
              const { mediaType, producerId, mute, simulcastEnable } = peoducerInfo;
              let mediaTypeShort: MediaTypeShort;
              switch (mediaType){
                case "video":
                  mediaTypeShort = "video";
                  break;
                case "screenShare":
                  mediaTypeShort = "screen";
                  break;
                case "audio":
                  mediaTypeShort = "audio";
                  break;
                default:
                  throw new RtcError({
                    code: ErrorCode.UNKNOWN_TYPE,
                    message: `Unrecognized mediaType ${mediaType}`
                  })
              }
              remoteStream[mediaTypeShort] = true
              //@ts-ignore
              remoteStream['pubStatus'][mediaTypeShort][mediaTypeShort] = true
              remoteStream['pubStatus'][mediaTypeShort]['producerId'] = producerId
              remoteStream['pubStatus'][mediaTypeShort]['mute'] = mute
              remoteStream['pubStatus'][mediaTypeShort]['simulcastEnable'] = simulcastEnable
              
              setTimeout(()=>{
                // join response中的事件应该延迟到join发生后再抛出
                this.adapterRef.logger.log('通知房间成员发布信息: ', JSON.stringify(remoteStream.pubStatus, null, ''))
                if (this.adapterRef._enableRts && this.adapterRef._rtsTransport) {
                  this.adapterRef.instance.emit('rts-stream-added', {stream: remoteStream, kind: mediaTypeShort})
                } else if (remoteStream.pubStatus.audio.audio || remoteStream.pubStatus.video.video || remoteStream.pubStatus.screen.screen) {
                  this.adapterRef.instance.emit('stream-added', {stream: remoteStream, 'mediaType': mediaTypeShort})
                }
                if (mute) {
                  this.adapterRef.instance.emit(`mute-${mediaTypeShort}`, {uid: remoteStream.getId()})
                }
              }, 0);
            }
          } 
        }
      }
      if (this._resolve) {
        this.adapterRef.logger.log('加入房间成功, 反馈通知')
        this._resolve(response)
        this._resolve = null
      }
      this.doSendKeepAliveTask()
    } catch (e) {
      this.adapterRef.logger.error('join() 登录失败, ' + e.name + ': ' + e.message)
      this._joinFailed(-1, 'LOGIN_ERROR')
    }
  }

  _joinFailed (reasonCode:string|undefined|number, errMsg: string|undefined) {
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTED'
    this.adapterRef.channelStatus = 'init'
    this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);

    if (reasonCode === 4009){
      this.adapterRef.instance.emit("crypt-error", {cryptType: this.adapterRef.encryption.encryptionMode});
    }
    
    //上报login事件
    const currentTime = Date.now()
    const webrtc2Param = this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2
    this.adapterRef.instance.apiEventReport('setLogin', {
      a_record: this.adapterRef.channelInfo.sessionConfig.recordAudio,
      v_record: this.adapterRef.channelInfo.sessionConfig.recordVideo,
      record_type: this.adapterRef.channelInfo.sessionConfig.recordType,
      host_speaker: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,
      result: reasonCode,
      server_ip: this.adapterRef.channelInfo._protooUrl,
      signal_time_elapsed: webrtc2Param.startWssTime - webrtc2Param.startJoinTime,
      time_elapsed: currentTime - webrtc2Param.startJoinTime,
      model: platform.name + '-' + platform.version
    })

    //重连时的login失败，执行else的内容
    if (this._reject && this.adapterRef.channelStatus !== 'connectioning') {
      this.adapterRef.logger.error('加入房间失败, 反馈通知')
      this._reject(errMsg)
      this._reject = null
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer)
        this.keepAliveTimer = null
      }
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.instance.stopSession()
    } else {
      this.adapterRef.logger.error('网络重连时，加入房间失败，主动离开')
      this.adapterRef.instance.emit('error', 'RELOGIN_ERROR')
      this.adapterRef.instance.leave()
    }
  }

  doSendKeepAliveTask () {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    this.keepAliveTimer = setInterval(() => {
      this.doSendKeepAlive()
    }, 6 * 1000)
    if (this.netStatusTimer) {
      clearInterval(this.netStatusTimer)
      this.netStatusTimer = null
    }
    this.netStatusTimer = setInterval(()=>{
      this.adapterRef.instance.emit('network-quality', this.adapterRef.netStatusList)
    }, 2000)
  }

  async doSendKeepAlive () {
    if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'No _protoo 15'
      })
    }
    if(this.adapterRef._signalling._protoo.connected === false) return
    try {
      if (!this._protoo){
        throw new RtcError({
          code: ErrorCode.NOT_FOUND,
          message: 'No this._protoo 4'
        })
      }
      const response = await this._protoo.request('Heartbeat');
      //this.adapterRef.logger.log('包活信令回包: ', response)
    } catch (e) {
      this.adapterRef.logger.error('信令包活失败', e.name, e.message)
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer)
        this.keepAliveTimer = null
      }
      if (this.netStatusTimer) {
        clearInterval(this.netStatusTimer)
        this.netStatusTimer = null
      }
    }
  }

  async createRTSTransport() {
    this.adapterRef.logger.log(`createRTSTransport()`);
    if (!this._protoo) {
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'createRTSTransport: _protoo is null'
      })
    } else if (!this._url) {
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'createRTSTransport: _url is null'
      })
    }

    try {
      const response = await this._protoo.request('CreateWsTrasnport');
      this.adapterRef.logger.warn('CreateWsTrasnport response: ', JSON.stringify(response, null, ''))
      const { code, errMsg, transportId, wsPort='6666' } = response;
      if (code == 200) {
        /*if (this.adapterRef._rtsTransport && wsPort == this.adapterRef._rtsTransport._port) {
          this.adapterRef.logger.log('CreateWsTrasnport: 已经创建')
          return 
        } */
        if (this.adapterRef._rtsTransport) {
          this.adapterRef.logger.log('CreateWsTrasnport: 需要更新')
          this.adapterRef._rtsTransport.destroy()
        }
        this.adapterRef.logger.log('CreateWsTrasnport: 开始创建')
        //url = `wss://${url}&cid=${this.adapterRef.channelInfo.cid}&uid=${this.adapterRef.channelInfo.uid}`
        this.adapterRef._rtsTransport = new RTSTransport({
          url: this._url.replace(/:\d+/, `:${wsPort}`) + `&transportId=${transportId}`,
          transportId,
          port: wsPort,
          adapterRef: this.adapterRef
        })
      } else {
        this.adapterRef.logger.error(`createWsTrasnport failed, code: ${code}, reason: ${errMsg}`)
      }
    } catch (e) {
      this.adapterRef.logger.error('createRTSTransport failed: %o', e);
      throw e;
    }
  }

  async rtsRequestKeyFrame(consumerId: string) {
    this.adapterRef.logger.log(`rtsRequestKeyFrame(): `, consumerId);
    if (!this._protoo) {
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'rtsRequestKeyFrame: no _proto'
      })
    } else if (!consumerId) {
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'rtsRequestKeyFrame: no consumerId'
      })
    }
    try {
      const response = await this._protoo.request('RequestKeyFrame', {consumerId});
      this.adapterRef.logger.warn('rtsRequestKeyFrame response: ', response)
      let { code, errMsg } = response;
      if (code == 200) {
        this.adapterRef.logger.log('RTS 关键帧请求完成')
      } else {
        this.adapterRef.logger.error(`RTS 关键帧请求失败, code: ${code}, reason: ${errMsg}`)
      }
    } catch (e) {
      this.adapterRef.logger.error('rtsRequestKeyFrame failed: %o', e);
      throw e;
    }
  }



  async doSendLogout () {
    this.adapterRef.logger.log('doSendLogout begin')

    /*if (this.adapterRef._mediasoup) {
      this.adapterRef._mediasoup._sendTransport && this.adapterRef._mediasoup._sendTransport.close()
      this.adapterRef._mediasoup._recvTransport && this.adapterRef._mediasoup._recvTransport.close()
    }
    */
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    if (this.netStatusTimer) {
      clearInterval(this.netStatusTimer)
      this.netStatusTimer = null
    }
    if(!this._protoo || !this._protoo.connected) return

    let producerData = {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      externData: {
      reason: 0
      }
    };
    this._protoo.notify('Leave', producerData);
    this.adapterRef.logger.log('doSendLogout success')
  }

  _handleStreamStatusNotify(data:any) {

  }

  _handleNetStatusNotify(data: {netStatusList: string}) {
    const netStatusList = data.netStatusList;
    //this.adapterRef.logger.warn('_handleNetStatusNotify: _userNetStatusUpdateEvent 网络状态: %s', netStatusList)
    const base64 = parseBase64(netStatusList)
    let str = base64.toString()
    //let str = '02001a080000000000000003001b08000000000000000200'
    let networkQuality:NetStatusItem[] = []
    let count = str.substr(2, 2) + str.substr(0, 2)
    count = parseInt(count, 16)
    str = str.substr(4)
    for (let i = 0; i < count; i++) {
      let uidString = str.substr(0, 16);
      uidString = reverse(uidString)
      const serverToClientNetStatusString = str.substr(16, 2)
      const clientToServerNetStatusString = str.substr(18, 2)
      const ext = str.substr(20, 2)
      let extLen = 0
      let extContent = null
      if (ext != '00') {
        const tmp = str.substr(22, 2)
        extLen = parseInt(tmp, 16)
        extContent = str.substr(24, extLen)
        extLen++
      }
      //item.uid = parseInt(uidString, 16)
      const item = {
        uid: this.adapterRef.channelInfo.uidType === 'string' ? hex2int2String(uidString) : parseInt(uidString, 16),
        //uid: parseInt(uidString, 16),
        downlinkNetworkQuality: parseInt(serverToClientNetStatusString, 16),
        uplinkNetworkQuality: parseInt(clientToServerNetStatusString, 16),
      };
      networkQuality.push(item)
      str = str.substr(22 + extLen)
    }
    function reverse(str:string) {
      let stack = [] 
      for(var len = str.length, i = len; i >= 1; i = i-2){
        stack.push(str[i-2], str[i-1])
      }
      return stack.join('');  
    }

    function hex2int2String(hex:string) {
      const len = hex.length
      let a = new Array(len)
      let code;
      let value = new BigNumber(0)
      for (let i = 0; i < len; i++) {
          code = hex.charCodeAt(i);
          if (48<=code && code < 58) {
              code -= 48;
          } else {
              code = (code & 0xdf) - 65 + 10;
          }
          a[i] = code;
      }
      for(let i = 0; i < a.length; i++ ){
          const c = a[i]
          const x = multiply(value, 16)
          value = plus(x, c)
      }
      return value.toString()
    }

    function multiply(x: BigNumber, y:BigNumber|number) {
      if(x.toNumber() ==0) return x
      //x = new BigNumber(x)
      const z = x.multipliedBy(y)
      //@ts-ignore          
      BigNumber('7e+500').times(y)    // '1.26e+501'
      x.multipliedBy('-a', 16)  
      return z
    }

    function plus(x:BigNumber, y:BigNumber|number){
        //x = new BigNumber(x)
        y = x.plus(y)
        //@ts-ignore                  
        BigNumber(0.7).plus(x).plus(y)  
        x.plus('0.1', 8)
        return y 
    }
    let isExit = true
    let newList:NetStatusItem[] = []
    //this.adapterRef.logger.log('服务器下发的网络状态通知: %o', networkQuality)
    networkQuality = networkQuality.filter((item)=>{return item.uid != 0})
    this.adapterRef.netStatusList.map(statusItem => {
      isExit = true
      networkQuality.map(qualityItem => {
        if (statusItem.uid == qualityItem.uid || qualityItem.uid == 0) {
          isExit = false
        }
      })
      if (isExit) {
        newList.push(statusItem)
      }
    })
    let result = newList.concat(networkQuality)
    result = result.filter((item) => { return this.adapterRef.instance._roleInfo.audienceList[item.uid] !== true; }); // http://jira.netease.com/browse/NRTCG2-6269
    this.adapterRef.netStatusList = result
  }

  _handleMuteNotify (data: {producerId: string, mute: boolean}) {
    const producerId = data.producerId;
    const mute = data.mute;
    Object.values(this.adapterRef.remoteStreamMap).forEach(stream => {
      if (stream.pubStatus.audio.producerId === producerId) {
        stream.muteStatus.audioSend = mute
        if (mute) {
          this.adapterRef.instance.emit('mute-audio', {uid: stream.getId()})
        } else {
          this.adapterRef.instance.emit('unmute-audio', {uid: stream.getId()})
        }
      } else if (stream.pubStatus.video.producerId === producerId) {
        stream.muteStatus.videoSend = mute
        if (mute) {
          this.adapterRef.instance.emit('mute-video', {uid: stream.getId()})
        } else {
          this.adapterRef.instance.emit('unmute-video', {uid: stream.getId()})
        }
      } else if (stream.pubStatus.screen.producerId === producerId) {
        stream.muteStatus.screenSend = mute
        if (mute) {
          this.adapterRef.instance.emit('mute-screen', {uid: stream.getId()})
        } else {
          this.adapterRef.instance.emit('unmute-screen', {uid: stream.getId()})
        }
      }
    })
  }

  _handleUserRoleNotify (externData:any) {

    let uid = externData.uid
    if (this.adapterRef.channelInfo.uidType === 'string') {
      uid = new BigNumber(uid)
      uid = uid.toString()
    }
    const userRole = externData.data && externData.data.userRole;
    this.adapterRef.logger.warn(`用户${uid}角色变为${userRole ? "观众" : "主播"}`);
    if (uid && userRole === 1) {
      //主播变为观众，照抄 onPeerLeave 逻辑
      this.adapterRef.instance.clearMember(uid);
      this.adapterRef.instance.removeSsrc(uid);
      this.adapterRef.instance._roleInfo.audienceList[uid] = true;
    }
    if (uid && userRole === 0) {
      //观众变为主播，照抄 onPeerJoin 逻辑
      this.adapterRef.instance.emit('peer-online', {uid: uid})
      this.adapterRef.instance._roleInfo.audienceList[uid] = false;
    }
  }
  
  _handleAbility (data:{code:number, msg:string}){
    this.adapterRef.instance.emit('warning', {
      code: data.code,
      msg: data.msg
    })
  }
  
  _handleKickedNotify (reason:number, uid = this.adapterRef.channelInfo.uid) {
    if (this.adapterRef.channelInfo.uidType === 'string') {
      uid = new BigNumber(uid)
      uid = uid.toString()
    }

    if (reason == 1) {
      this.adapterRef.logger.warn('房间被关闭')
      this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason = 30207
      this.adapterRef.instance.leave()
      this.adapterRef.instance.emit('channel-closed', {
      })
    } else if (reason == 2) {
      this.adapterRef.logger.warn(`${uid}被提出房间`)
      if (uid.toString() == this.adapterRef.channelInfo.uid.toString()) {
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason = 30206
        this.adapterRef.instance.leave()
      }
      this.adapterRef.instance.emit('client-banned', {
        uid
      })
    }
  }

  destroy() {
    this.adapterRef.logger.log('清除 Signalling')
    this._unbindEvent()
    this._reset()
  }
}

export { Signalling }