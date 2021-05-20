import { EventEmitter } from 'eventemitter3'
import * as mediasoupClient from './3rd/mediasoup-client/'
import {
  AdapterRef,
  MediasoupManagerOptions, MediaType, MediaTypeShort,
  ProduceConsumeInfo, ProducerAppData,
  SDKRef,
  Timer, VideoCodecType
} from "../types";
import {Consumer, Device, Producer, Transport} from "./3rd/mediasoup-client/types";
import {Peer} from "./3rd/protoo-client";
import {Stream} from "../api/stream";
import {waitForEvent} from "../util/waitForEvent";

class Mediasoup extends EventEmitter {
  private adapterRef:AdapterRef;
  private sdkRef:SDKRef;
  private _consumers: {[consumerId: string]: Consumer}|null;
  private _timeout: number;
  public _edgeRtpCapabilities: any|null;
  private _mediasoupDevice:Device|null;
  private _sendTransportIceParameters:null;
  private _recvTransportIceParameters:null;
  public _micProducer:Producer|null;
  private _micProducerId:string|null;
  public _webcamProducer:Producer|null;
  private _webcamProducerId:string|null;
  public _screenProducer:Producer|null;
  private _screenProducerId:string|null;
  public _webcamProducerCodec: VideoCodecType|null;
  public _screenProducerCodec: VideoCodecType|null;
  public _sendTransport:Transport|null;
  public _recvTransport:Transport|null;
  private _sendTransportTimeoutTimer:Timer|null;
  private _recvTransportTimeoutTimer:Timer|null;
  public _eventQueue: ProduceConsumeInfo[];
  public _protoo: Peer|null;
  // senderEncodingParameter。会复用上次的senderEncodingParameter
  private senderEncodingParameter: {
    ssrcList: number[]
    audio: {ssrc: number, dtx: boolean}|null,
    video: {ssrc: number, rtx: {ssrc: number}}|null,
    screen: {ssrc: number, rtx: {ssrc: number}}|null,
  }
  private _tempRecv :{
    audioRtpParameters: any,
    videoRtpParameters: any,
    iceCandidates: any,
    dtlsParameters: any,
    iceParameters: any,
    probeSSrc: number
  };
  private _probeSSrc?: string;
  public unsupportedProducers: string[];
  constructor (options:MediasoupManagerOptions) {
    super()
    this._timeout = 30 * 1000
    this._edgeRtpCapabilities = null
    this._mediasoupDevice = null

    this._sendTransportIceParameters = null
    this._recvTransportIceParameters = null
    this._micProducer = null
    this._micProducerId = null
    this._webcamProducer = null
    this._webcamProducerId = null
    this._screenProducer = null
    this._screenProducerId = null
    this._webcamProducerCodec = null
    this._screenProducerCodec = null
    this._consumers = null
    this._sendTransport = null
    this._recvTransport = null
    this._sendTransportTimeoutTimer = null
    this._recvTransportTimeoutTimer = null
    this._protoo = null

    //this.adapterRef = null
    //this.sdkRef = null
    this._eventQueue = []
    this.senderEncodingParameter = {
      ssrcList: [],
      audio: null,
      video: null,
      screen: null,
    }
    this.unsupportedProducers = [];
    this._tempRecv = {
      audioRtpParameters: null,
      videoRtpParameters: null,
      iceCandidates: null,
      dtlsParameters: null,
      iceParameters: null,
      probeSSrc: 0
    }
    
    this._reset()
    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
  }

  get consumers () {
    return this._consumers
  }

  _reset() {
    this._timeout = 30 * 1000
    this._edgeRtpCapabilities = null
    this._mediasoupDevice = null
    
    this._sendTransportIceParameters = null
    this._recvTransportIceParameters = null
    this._micProducer = null
    this._micProducerId = null
    this._webcamProducer = null
    this._webcamProducerId = null
    this._screenProducer = null
    this._screenProducerId = null
    this._consumers = null

    if (this._sendTransportTimeoutTimer) {
      clearTimeout(this._sendTransportTimeoutTimer)
    }
    this._sendTransportTimeoutTimer = null
    if (this._recvTransportTimeoutTimer) {
      clearTimeout(this._recvTransportTimeoutTimer)
    }
    this._recvTransportTimeoutTimer = null
    
    if (this._sendTransport) {
      this._sendTransport.close();
    }
    this._sendTransport = null
    if (this._recvTransport) {
      this._recvTransport.close();
    }
    this._recvTransport = null
    
    //this.adapterRef = null
    //this.sdkRef = null
    this.resetConsumeRequestStatus();
    this._tempRecv = {
      audioRtpParameters: null,
      videoRtpParameters: null,
      iceCandidates: null,
      dtlsParameters: null,
      iceParameters: null,
      probeSSrc: 0
    }
  }

  async init() {
    this.adapterRef.logger.log('初始化 devices、transport')
    if (!this._mediasoupDevice) {
      this._mediasoupDevice = new mediasoupClient.Device();
      if (this._mediasoupDevice){
        await this._mediasoupDevice.load( {routerRtpCapabilities: this._edgeRtpCapabilities});
      }
    }
    let iceServers = [];
    let iceTransportPolicy:RTCIceTransportPolicy = 'all';

    if (this.adapterRef.channelInfo.relaytoken && this.adapterRef.channelInfo.relayaddrs) {
      this.adapterRef.channelInfo.relayaddrs.forEach( (item: string) => {
        iceServers.push({
          urls: 'turn:' + item, // + '?transport=udp',
          credential: this.adapterRef.channelInfo.uid + '/' + this.adapterRef.channelInfo.cid,
          username: this.adapterRef.channelInfo.relaytoken
        })
      })
      iceTransportPolicy = 'relay'
    }
    if (this.adapterRef.testConf.turnAddr) {
      iceServers.length = 0
      iceServers.push({
        urls: this.adapterRef.testConf.turnAddr, //'turn:' + item + '?transport=udp',
        credential: this.adapterRef.channelInfo.uid + '/' + this.adapterRef.channelInfo.cid,
        username: this.adapterRef.testConf.relaytoken || '123456'
      })
      iceTransportPolicy = 'relay'
    }
    if (!this._sendTransport && this._mediasoupDevice) {
      this._sendTransport = this._mediasoupDevice.createSendTransport({
        id            : this.adapterRef.channelInfo.uid,
        iceParameters      : undefined,
        iceCandidates      : undefined,
        dtlsParameters      : undefined,
        sctpParameters      : undefined,
        iceServers,
        iceTransportPolicy,
        proprietaryConstraints   : {
          optional: [ { googDscp: true }, { googIPv6: false } ]
        },
        appData: {
          cid: this.adapterRef.channelInfo.cid,
          uid: this.adapterRef.channelInfo.uid
        }
      })
      this.senderEncodingParameter = {
        ssrcList: [],
        audio: null,
        video: null,
        screen: null,
      };
      this._sendTransport.on('connectionstatechange', this._sendTransportConnectionstatechange.bind(this, this._sendTransport))
    }
    
    if (!this._recvTransport) {
      const _recvTransport = this._mediasoupDevice.createRecvTransport({
        id: this.adapterRef.channelInfo.uid,
        iceParameters: undefined,
        iceCandidates: undefined,
        dtlsParameters: undefined,
        sctpParameters: undefined,
        iceServers,
        iceTransportPolicy,
        proprietaryConstraints: {
          optional: [ { googDscp: true } ]
        },
        appData: {
          cid: this.adapterRef.channelInfo.cid,
          uid: this.adapterRef.channelInfo.uid
        }
      });
      this._recvTransport = _recvTransport;
      _recvTransport.on('connectionstatechange', this._recvTransportConnectionstatechange.bind(this, _recvTransport))
    }
    this.emit('transportReady');
  }

  async _sendTransportConnectionstatechange (_sendTransport:Transport, connectionState:string) {
    if (this._sendTransport !== _sendTransport){
      this.adapterRef.logger.error('_sendTransportConnectionstatechange：出现了_sendTransport绑定不一致的状况。');
      return;
    }
    this.adapterRef.logger.log('send connection state changed to %s', connectionState);
    if (connectionState === 'failed') {
      try {
        if (this._sendTransport) {
          if (!this._sendTransportTimeoutTimer) {
            this._sendTransportTimeoutTimer = setTimeout(()=>{
              this._sendTransportConnectTimeout()
            }, this._timeout)
          }
          
          let iceParameters = null
          if (this._protoo && this._protoo.connected) {
            if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
              throw new Error('No _protoo');
            }
            iceParameters = await this.adapterRef._signalling._protoo.request('restartIce', { transportId: this._sendTransport.id });
          } else {
            iceParameters = this._sendTransportIceParameters
          }
          await this._sendTransport.restartIce({ iceParameters });
        }
      } catch (e){
        this.adapterRef.logger.error('restartIce() | failed:%o', e);
      }
    } else if (connectionState === 'connected') {
      if (this._sendTransportTimeoutTimer) {
        clearTimeout(this._sendTransportTimeoutTimer)
        this._sendTransportTimeoutTimer = null
      }
    }
  }

  async _recvTransportConnectionstatechange (_recvTransport:Transport, connectionState:string) {
    if (this._recvTransport !== _recvTransport){
      this.adapterRef.logger.error('_recvTransportConnectionstatechange：出现了_recvTransport绑定不一致的状况。');
      return;
    }
    this.adapterRef.logger.warn('recv connection state changed to %s', connectionState);
    if (connectionState === 'failed') {
      try {
        if (this._recvTransport) {
          if (!this._recvTransportTimeoutTimer) {
            this._recvTransportTimeoutTimer = setTimeout(()=>{
              this._recvTransportConnectTimeout()
            }, this._timeout)
          }
          let iceParameters = null
          if (this._protoo && this._protoo.connected) {
            iceParameters = await this._protoo.request('restartIce', { transportId: this._recvTransport.id });
          } else {
            iceParameters = this._recvTransportIceParameters
          }
          await this._recvTransport.restartIce({ iceParameters });
        }
      } catch (e){
        this.adapterRef.logger.error('restartIce() | failed:%o', e);
      }
    } else if (connectionState === 'connected') {
      if (this._recvTransportTimeoutTimer) {
        clearTimeout(this._recvTransportTimeoutTimer)
        this._recvTransportTimeoutTimer = null
      }
    }
  }

  async _sendTransportConnectTimeout(){
    this.adapterRef.logger.warn('媒体上行传输通道连接失败')
    
    if(this.adapterRef._signalling && this.adapterRef.connectState.curState !== 'DISCONNECTING' && this.adapterRef.connectState.curState !== 'DISCONNECTED'){
      this.adapterRef.logger.log('媒体上行传输通道连接失败，尝试整体重连')
      this.adapterRef.channelStatus = 'connectioning'
      this.adapterRef._signalling._reconnection()
    } else {
      this.adapterRef.logger.error('媒体上行传输通道建立失败，抛错错误')
      this.adapterRef.instance.emit('error', 'SOCKET_ERROR')
      this.adapterRef.instance.leave()
    }
  }

  async _recvTransportConnectTimeout(){
    this.adapterRef.logger.warn('媒体下行传输通道建立失败')
    if(this.adapterRef._signalling && this.adapterRef.connectState.curState !== 'DISCONNECTING' && this.adapterRef.connectState.curState !== 'DISCONNECTED'){
      this.adapterRef.logger.log('媒体上行传输通道连接失败，尝试整体重连')
      this.adapterRef.channelStatus = 'connectioning'
      this.adapterRef._signalling._reconnection()
    } else {
      this.adapterRef.logger.error('媒体下行传输通道建立失败，抛错错误')
      this.adapterRef.instance.emit('error', 'SOCKET_ERROR')
      this.adapterRef.instance.leave()
    }
  }

  async createProduce (stream:Stream) {
    this.adapterRef.logger.log('发布音视频: ', stream.getId())
    //this._sendTransport.removeListener()
    if (!this._sendTransport){
      throw new Error('NO_SEND_TRANSPORT');
    }
    if(!this._sendTransport._events['produce']) {
      this._sendTransport.on(
        'produce', async ({ kind, rtpParameters, appData, localDtlsParameters, offer }, callback, errback) => {
        this.adapterRef.logger.log('produce 反馈 [kind= %s, appData= %o]',kind, JSON.stringify(appData, null, ' '));
        if (!this._sendTransport){
          throw new Error('NO_SEND_TRANSPORT');
        }
        const mediaTypeShort:MediaTypeShort = (appData.mediaType == "screenShare") ? "screen" : appData.mediaType;
        const iceUfragReg = offer.sdp.match(/a=ice-ufrag:([0-9a-zA-Z#=+-_\/\\\\]+)/)
        try {
          let producerData = {
            requestId     :  `${Math.ceil(Math.random() * 1e9)}`,
            kind       :  kind,
            rtpParameters   :  rtpParameters,
            iceUfrag : iceUfragReg.length ? iceUfragReg[1] : `${this.adapterRef.channelInfo.cid}#${this.adapterRef.channelInfo.uid}#send`,
            //transportId: '',
            //mediaProfile: [{'ssrc':123, 'res':"320*240", 'fps':30, 'spatialLayer':0, 'maxBitrate':1000}],
            externData    : {
              producerInfo  : {
                mediaType   : appData.mediaType,
                subStream  : appData.mediaType === 'screenShare',
                simulcastEnable  :false,
                mute: false, //  false
                spatialLayer: 0, //0:low 1:high
                temporalLayer: '' 
              }
            },
            ...appData
          };

          // 1. 使用原有的encoding
          let encoding = this.senderEncodingParameter[mediaTypeShort];
          let mLineIndex = offer.sdp.indexOf(producerData.deviceId);
          if (!encoding){
            if (rtpParameters.encodings){
              // 2. 使用rtpParameter中的值
              encoding = rtpParameters.encodings[0];
              if (encoding && this.senderEncodingParameter.ssrcList.indexOf(encoding.ssrc) > -1){
                // 已被其他占据，丢弃
                encoding = null;
              }
            }
            if (!encoding && producerData.deviceId && mLineIndex > -1){
              // 3. 在SDP中寻找ssrc-group字段匹配
              let mLinePiece = offer.sdp.substring(mLineIndex);
              const match = mLinePiece.match(/a=ssrc-group:FID (\d+) (\d+)/);
              if (match){
                encoding = {
                  ssrc: parseInt(match[1]),
                  rtx: {
                    ssrc: parseInt(match[2])
                  }
                };
              }
              if (encoding && this.senderEncodingParameter.ssrcList.indexOf(encoding.ssrc) > -1){
                // 已被其他占据，丢弃
                encoding = null;
              }
            }
            if (!encoding){
              this.adapterRef.logger.log('使用sdp中第一个ssrc');
              encoding = {
                ssrc: parseInt(offer.sdp.match(/a=ssrc:(\d+)/)[1]),//历史遗留
                dtx: false,
              }
            }
            //@ts-ignore
            this.senderEncodingParameter[mediaTypeShort] = encoding;
            this.senderEncodingParameter.ssrcList.push(encoding.ssrc);
          }
          if (rtpParameters.encodings && rtpParameters.encodings[0]) {
            rtpParameters.encodings[0].ssrc = encoding.ssrc;
            // @ts-ignore
            if (rtpParameters.encodings[0].rtx && encoding.rtx && encoding.rtx) {
              // @ts-ignore
              rtpParameters.encodings[0].rtx.ssrc = encoding.rtx.ssrc;
            }
          }
          if (appData.mediaType === 'video') {
            producerData.mediaProfile = [{
              ssrc: encoding.ssrc,
              res: '640*480',
              fps: '15',
              spatialLayer: 0,
              maxBitrate: 1000
            }]
          }
          if (appData.mediaType === 'screenShare') {
            producerData.mediaProfile = [{
              ssrc: encoding.ssrc,
              res: '640*480',
              fps: '15',
              spatialLayer: 0,
              maxBitrate: 1000
            }]
          }

          if (localDtlsParameters === undefined){
            producerData.transportId = this._sendTransport.id;
          } else {
            producerData.dtlsParameters = localDtlsParameters;
          }
          if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
            throw new Error('No _protoo');
          }
          const { transportId, iceParameters, iceCandidates, dtlsParameters, producerId } = 
            await this.adapterRef._signalling._protoo.request('Produce', producerData);

          if (transportId !== undefined) {
            this._sendTransport.id = transportId;
          }
          this.adapterRef.logger.log('produce请求反馈结果, kind: %s, producerId: %s', kind, producerId)
          let codecInfo = {codecParam: null, codecName: null};
          if (appData.mediaType === 'audio') {
            this._micProducerId = producerId
          } else if (appData.mediaType === 'video') {
            this._webcamProducerId = producerId
            //@ts-ignore
            codecInfo = this.adapterRef.mediaCapability.getCodecSend("video", this._sendTransport.handler._sendingRtpParametersByKind["video"]);
            this._webcamProducerCodec = codecInfo.codecName;
          } else if (appData.mediaType === 'screenShare') {
            this._screenProducerId = producerId
            //@ts-ignore
            codecInfo = this.adapterRef.mediaCapability.getCodecSend("screen", this._sendTransport.handler._sendingRtpParametersByKind["video"]);
            this._screenProducerCodec = codecInfo.codecName;
          }
          if (iceParameters) {
            this._sendTransportIceParameters = iceParameters
          }
          if (!this.adapterRef.localStream){
            throw new Error('No this.adapterRef.localStream');
          }
          this._sendTransport.fillRemoteRecvSdp({
            kind,
            appData,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters: undefined,
            sendingRtpParameters: rtpParameters,
            codecOptions: kind === 'audio' ? {
                opusStereo: 1,
                opusDtx: 1
              } : {
                videoGoogleStartBitrate: 1000
              },
            offer,
            codec: codecInfo.codecParam,
            audioProfile: this.adapterRef.localStream.audioProfile
          });

          if (kind === 'video') {
            this.adapterRef.localStream.adjustResolution(mediaTypeShort)
          }
          callback({ id: producerId });
        } catch (error) {
          errback(error);
        }
      });
    }

    if (stream.mediaHelper && stream.mediaHelper.audioStream && this._micProducer) {
      this.adapterRef.logger.log('音频已经publish，重复操作')
    } else if(stream.mediaHelper && stream.mediaHelper.audioStream) {
      const audioTrack = stream.mediaHelper.audioStream.getAudioTracks()[0]
      if (audioTrack){
        this.adapterRef.logger.log('发布 audioTrack: ', audioTrack.id)
        stream.pubStatus.audio.audio = true
        this._micProducer = await this._sendTransport.produce({
          track: audioTrack,
          codecOptions:{
            opusStereo: 1,
            opusDtx: 1
          },
          appData: {deviceId: audioTrack.id, mediaType: 'audio'} as ProducerAppData
        });
        this._micProducer.on('trackended', notify => {
          //停止的原因可能是设备拔出、取消授权等
          this.adapterRef.logger.warn('音频轨道已停止')
          this.adapterRef.instance.emit('audioTrackEnded')
        })
      }
    }

    if (stream.mediaHelper && stream.mediaHelper.videoStream && this._webcamProducer) {
      this.adapterRef.logger.log('视频已经publish，重复操作')
    } else if (stream.mediaHelper && stream.mediaHelper.videoStream) {
      const videoTrack = stream.mediaHelper.videoStream.getVideoTracks()[0]
      this.adapterRef.logger.log('发布 videoTrack: ', videoTrack.id)
      stream.pubStatus.video.video = true
      //@ts-ignore
      const codecInfo = this.adapterRef.mediaCapability.getCodecSend("video", this._sendTransport.handler._sendingRtpParametersByKind["video"]);
      this._webcamProducer = await this._sendTransport.produce({
        track: videoTrack,
        codec: codecInfo.codecParam,
        codecOptions:{
          videoGoogleStartBitrate: 1000
        },
        appData: {deviceId: videoTrack.id, mediaType: 'video'} as ProducerAppData
      });
      this._webcamProducer.on('trackended', notify => {
        //停止的原因可能是设备拔出、取消授权等
        this.adapterRef.logger.warn('视频轨道已停止')
        this.adapterRef.instance.emit('videoTrackEnded')
      })
      if (!this.adapterRef.state.startPubVideoTime) {
        this.adapterRef.state.startPubVideoTime = Date.now()
      }
    }

    if (stream.mediaHelper && stream.mediaHelper.screenStream && this._screenProducer) {
      this.adapterRef.logger.log('屏幕共享已经publish，重复操作')
    } else if(stream.mediaHelper && stream.mediaHelper.screenStream) {
      const screenTrack = stream.mediaHelper.screenStream.getVideoTracks()[0]
      this.adapterRef.logger.log('发布 screenTrack: ', screenTrack.id)
      stream.pubStatus.screen.screen = true
      //@ts-ignore
      const codecInfo = this.adapterRef.mediaCapability.getCodecSend("screen", this._sendTransport.handler._sendingRtpParametersByKind["video"]);
      this._screenProducer = await this._sendTransport.produce({
        track: screenTrack,
        codec: codecInfo.codecParam,
        codecOptions:{
          videoGoogleStartBitrate: 1000
        },
        appData: {deviceId: screenTrack.id, mediaType: 'screenShare'} as ProducerAppData
      });
      this._screenProducer.on('trackended', notify => {
        this.adapterRef.logger.warn('屏幕共享已停止')
        this.adapterRef.instance.emit('stopScreenSharing')
      })
      if (!this.adapterRef.state.startPubScreenTime) {
        this.adapterRef.state.startPubScreenTime = Date.now()
      }
    }
  }

  async destroyProduce (kind:MediaTypeShort) {
    let producer = null
    let producerId = null
    if (kind === 'audio') {
      producer = this._micProducer
      producerId = this._micProducerId
      this._micProducer = this._micProducerId = null
      if (!this.adapterRef.localStream){
        throw new Error('No this.adapterRef.localStream');
      }
      this.adapterRef.localStream.pubStatus.audio.audio = false
    } else if (kind === 'video') {
      producer = this._webcamProducer
      producerId = this._webcamProducerId
      this._webcamProducer = this._webcamProducerId = null
      if (!this.adapterRef.localStream){
        throw new Error('No this.adapterRef.localStream');
      }
      this.adapterRef.localStream.pubStatus.video.video = false
    } else if (kind === 'screen') {
      producer = this._screenProducer
      producerId = this._screenProducerId
      this._screenProducer = this._screenProducerId = null
      if (!this.adapterRef.localStream){
        throw new Error('No this.adapterRef.localStream');
      }
      this.adapterRef.localStream.pubStatus.screen.screen = false
    }

    try {
      this.adapterRef.logger.warn(`停止发布 destroyProduce ${kind} producerId=%o`, producerId);
      if(!producer) return
      await producer.close();
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'CloseProducer', { 
          requestId: `${Math.ceil(Math.random() * 1e9)}`, 
          producerId
        });
    } catch (error) {
      this.adapterRef.logger.error('_destroyConsumer() | failed:%o', error);
    }
  }

  async createConsumer(uid:number, kind:'audio'|'video',mediaType: MediaType, id:string, preferredSpatialLayer:number = 0){
    return new Promise((resolve, reject)=>{
      this._eventQueue.push({uid, kind, id, mediaType, preferredSpatialLayer, resolve, reject});
      if (this._eventQueue.length > 1) {
        return
      } else {
        this._createConsumer(this._eventQueue[0])
      }
    })
  }

  async resetConsumeRequestStatus(){
    const queue = this._eventQueue;
    this._eventQueue = [];
    for (let i = 0; i < queue.length; i++){
      const info:ProduceConsumeInfo = queue[i];
      this.adapterRef.logger.log(`resetConsumeRequestStatus：uid ${info.uid}, uid ${info.uid}, kind ${info.kind}, id ${info.id}`)
      info.reject('resetConsumeRequestStatus');
    }
  }

  removeUselessConsumeRequest( options: {producerId?: string, uid?: number}) {
    const {producerId, uid} = options
    if(!producerId || !uid) return
    console.log('options: ', options)
    this.adapterRef.logger.log(`removeUselessConsumeRequest：producerId ${producerId}, uid ${uid}`)
    for (let i = 0; i < this._eventQueue.length; i++){
      const info:ProduceConsumeInfo = this._eventQueue[i];
      this.adapterRef.logger.log(`removeUselessConsumeRequest：uid ${info.uid}, uid ${info.uid}, kind ${info.kind}, id ${info.id}`)
      if (info.id === producerId || info.uid === uid) {
        this._eventQueue.splice(i, 1)
        i++
      }
    }
  }


  checkConsumerList (info:ProduceConsumeInfo) {
    this._eventQueue.shift()
    info.resolve(null);
    if (this._eventQueue.length > 0) {
      this._createConsumer(this._eventQueue[0])
      return;
    }
  }

  async _createConsumer(info:ProduceConsumeInfo) {
    const {uid, kind, mediaType, id, preferredSpatialLayer = 0} = info;
    const mediaTypeShort = (mediaType === 'screenShare' ? 'screen' : mediaType);
    this.adapterRef.logger.log('开始订阅 %s 的 %s 媒体: %s 大小流: ', uid, mediaTypeShort, id, preferredSpatialLayer)

    if (!id) {
      return this.checkConsumerList(info)
    } /*else if (this.unsupportedProducers.indexOf(id) > -1){
      this.adapterRef.logger.warn("跳过不支持的Producer", id)
      return
    }*/

    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    if (!remoteStream) {
      //this._eventQueue = this._eventQueue.filter((item)=>{item.uid != uid })
      return this.checkConsumerList(info)
    }

    if (remoteStream['pubStatus'][mediaTypeShort]['consumerId']) {
      this.adapterRef.logger.log('已经订阅过')
      let isPlaying = true
      if (remoteStream.Play) {
        isPlaying = await remoteStream.Play.isPlayStreamError(mediaTypeShort)
      }

      if (isPlaying) {
        this.adapterRef.logger.log('当前播放正常，直接返回')
        return this.checkConsumerList(info)
      } else if (remoteStream.pubStatus[mediaTypeShort].stopconsumerStatus !== 'start') {
        this.adapterRef.logger.log('先停止之前的订阅')
        try {
          remoteStream.pubStatus[mediaTypeShort].stopconsumerStatus = 'start'
          if (!this.adapterRef._mediasoup){
            throw new Error('No this.adapterRef._mediasoup');
          }
          await this.destroyConsumer(remoteStream.pubStatus.audio.consumerId);
          this.adapterRef.instance.removeSsrc(remoteStream.getId(), mediaTypeShort)
          remoteStream.pubStatus[mediaTypeShort].consumerId = '';
          remoteStream.stop(mediaTypeShort)
          remoteStream.pubStatus[mediaTypeShort].stopconsumerStatus = 'end'
        } catch (e) {
          this.adapterRef.logger.error('停止之前的订阅出现错误: ', e)
        }
        this.adapterRef.logger.log('停止之前的订阅完成')
      }
    }

    let codecOptions = null;
    if (mediaTypeShort === 'audio') {
      codecOptions = {
        opusStereo: 1
      }
    }
    if (!this._mediasoupDevice || !this._mediasoupDevice.loaded){
      this.adapterRef.logger.error('createConsumer：Waiting for Transport Ready');
      await waitForEvent(this, 'transportReady', 5000);
    }
    if (!this._recvTransport){
      info.resolve(null);
      throw new Error('NO_RECV_TRANSPORT');
    }
    this.adapterRef.logger.log(`prepareLocalSdp [kind: ${kind}, uid: ${uid}]`);
    const prepareRes = 
      await this._recvTransport.prepareLocalSdp(kind, this._edgeRtpCapabilities, uid);
    if(!this.adapterRef || this.adapterRef.connectState.curState == 'DISCONNECTING' || this.adapterRef.connectState.curState == 'DISCONNECTED') return
    this.adapterRef.logger.log('获取本地sdp，mid = %o', prepareRes.mid);
    let { rtpCapabilities, offer, iceUfragReg, } = prepareRes;
    let mid:number|undefined = prepareRes.mid;
    const localDtlsParameters = prepareRes.dtlsParameters;

    if (mid < 0) {
      mid = undefined
    }
    /*const iceUfragReg = offer.sdp.match(/a=ice-ufrag:([0-9a-zA-Z=#+-_\/\\\\]+)/)
    if (!iceUfragReg){
      throw new Error("iceUfragReg is null");
    }*/
    let data:any = {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      kind,
      rtpCapabilities,
      uid,
      producerId: id,
      preferredSpatialLayer,
      mid,
      pause: false,
      iceUfrag: /*iceUfragReg.length ? iceUfragReg[1] : */`${this.adapterRef.channelInfo.cid}#${this.adapterRef.channelInfo.uid}#recv`,
    };
    
    this.adapterRef.instance.apiEventReport('setFunction', {
      name: 'set_video_sub',
      oper: '1',
      value: preferredSpatialLayer
    })
    if (localDtlsParameters === undefined)
      data.transportId = this._recvTransport.id;
    else
      data.dtlsParameters = localDtlsParameters;
    this.adapterRef.logger.log(`发送consume请求, uid: ${uid}, kind: ${kind}, producerId: ${data.producerId}, transportId: ${data.transportId}, requestId: ${data.requestId}`);
    if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
      info.resolve(null);
      throw new Error('No _protoo');
    }
    const consumeRes = await this.adapterRef._signalling._protoo.request('Consume', data);
    let { transportId, iceParameters, iceCandidates, dtlsParameters, probeSSrc, rtpParameters, producerId, consumerId, code, errMsg } = consumeRes;
    this.adapterRef.logger.log(`consume反馈结果: code: ${code} uid: ${uid}, kind: ${kind}, producerId: ${producerId}, consumerId: ${consumerId}, transportId: ${transportId}, requestId: ${consumeRes.requestId}, errMsg: ${errMsg}`);
    try {
      const peerId = consumeRes.uid
      let isFake = false

      if (code !== 200 || !this.adapterRef.remoteStreamMap[uid]) {
        //@ts-ignore
        if (!remoteStream[kind] || !remoteStream.pubStatus[kind][kind] || !remoteStream.pubStatus[kind].producerId) {
          this.adapterRef.logger.log(`${uid} 的 ${kind} 的媒体已经停止发布了，直接返回`)
          await this._recvTransport.recoverLocalSdp(uid, mid, kind)
          //return this.checkConsumerList(info)
        }
        return this.checkConsumerList(info)
        /*this.adapterRef.logger.warn('订阅 %s 的 %s 媒体失败, errcode: %s, reason: %s ，做容错处理: 重新建立下行连接', uid, kind, code, errMsg)
        if (this._recvTransport) {
          await this.closeTransport(this._recvTransport);
        }
        // if(this.adapterRef.connectState.curState == 'DISCONNECTING' || this.adapterRef.connectState.curState == 'DISCONNECTED'){
        //   return
        // }

        if (code === 800) {
          // FIXME：当无法接收一个Producer时，应该回退而不是重建整个下行链路。
          this.adapterRef.logger.error('800错误：无法建立连接。将Producer拉入黑名单：', consumeRes.producerId);
          this.unsupportedProducers.push(consumeRes.producerId);
        }
        this._recvTransport = null
        this.resetConsumeRequestStatus()
        this.adapterRef.instance.reBuildRecvTransport()
        return*/
      } 

      if (rtpParameters && rtpParameters.encodings && rtpParameters.encodings.length && rtpParameters.encodings[0].ssrc) {
        this.adapterRef.instance.addSsrc(uid, mediaTypeShort, rtpParameters.encodings[0].ssrc)
      }
      if (transportId !== undefined) {
        this._recvTransport.id = transportId;
      }

      if (probeSSrc !== undefined) {
        this._probeSSrc = probeSSrc;
      }
      if (iceParameters) {
        this._recvTransportIceParameters = iceParameters
        this._tempRecv.iceParameters = iceParameters
      } 
      dtlsParameters ? this._tempRecv.dtlsParameters = dtlsParameters : null
      iceCandidates ? this._tempRecv.iceCandidates = iceCandidates : null
      //@ts-ignore
      rtpParameters ? this._tempRecv[`${mediaTypeShort}RtpParameters`] = rtpParameters : null
      
      let appData = {};
      if(rtpParameters.mid != undefined) {
        rtpParameters.mid = rtpParameters.mid + '' 
      }
      
      const consumer = await this._recvTransport.consume({
        id: consumerId,
        producerId,
        kind,
        rtpParameters,
        codecOptions,
        appData: { ...appData, peerId, remoteUid: uid }, // Trick.
        offer,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters: undefined,
        probeSSrc: isFake ? 0 : this._probeSSrc
      });
      if(!this._consumers) {
        this._consumers = {}
      }
      this._consumers[consumer.id] = consumer;

      consumer.on('transportclose', () => {
        this._consumers && delete this._consumers[consumer.id];
      });
      this.adapterRef.logger.log('订阅consume完成 peerId = %s', peerId);
      if (remoteStream && remoteStream['pubStatus'][mediaTypeShort]['producerId']) {
        remoteStream['subStatus'][mediaTypeShort] = true
        //@ts-ignore
        remoteStream['pubStatus'][mediaTypeShort][mediaTypeShort] = true
        remoteStream['pubStatus'][mediaTypeShort]['consumerId'] = consumerId
        remoteStream['pubStatus'][mediaTypeShort]['producerId'] = producerId
        if (!remoteStream.mediaHelper){
          throw new Error('No remoteStream.mediaHelper');
        }
        remoteStream.mediaHelper.updateStream(mediaTypeShort, consumer.track)
        this.adapterRef.instance.emit('stream-subscribed', {stream: remoteStream, 'mediaType': mediaTypeShort})
      } else {
        this.adapterRef.logger.log('该次consume状态错误： ', JSON.stringify(remoteStream['pubStatus'], null, ''))
      }

      this.adapterRef.logger.log('查看事件队列, _eventQueue: ', this._eventQueue.length)
      this._eventQueue.forEach(item => {
        this.adapterRef.logger.log(`consumerList, uid: ${item.uid}, kind: ${item.kind}, id: ${item.id}`)
      })
      return this.checkConsumerList(info)
    } catch (error) {
      this.adapterRef && this.adapterRef.logger.error('"newConsumer" request failed:%o', error.name, error.message);
      this.adapterRef.logger.error('订阅 %s 的 %s 媒体失败，做容错处理: 重新建立下行连接', uid, kind)
      this.resetConsumeRequestStatus()
      if (this._recvTransport) {
        await this.closeTransport(this._recvTransport);
      }
      this._recvTransport = null
      this.adapterRef.instance.reBuildRecvTransport()
    }
  }

  async destroyConsumer (consumerId:string) {
    if(!consumerId) return
    try {
      this.adapterRef.logger.log('停止订阅 destroyConsumer consumerId=%o', consumerId);
      if (!this._consumers){
        throw new Error('No _consumers');
      }
      const consumer = this._consumers[consumerId];
      if(!consumer) return
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      this.adapterRef._signalling._protoo.request(
        'CloseConsumer', { 
          requestId: `${Math.ceil(Math.random() * 1e9)}`, 
          consumerId, 
          producerId: consumer.producerId,
        });
      consumer.close();
      delete this._consumers[consumerId];
    } catch (error) {
      this.adapterRef.logger.error('destroyConsumer() | failed:%o', error.name, error.message, error.stack);
    }
  }

  async closeTransport (transport:Transport) {
    if(!transport || !transport.id) return
    try {
      this.adapterRef.logger.log('closeTransport() [停止通道 transportId=%o ]', transport.id);
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      const result = await this.adapterRef._signalling._protoo.request(
        'CloseTransport', { 
          requestId: `${Math.ceil(Math.random() * 1e9)}`, 
          transportId: transport.id,
        });
      this.adapterRef.logger.log('closeTransport() [停止通道反馈结果 result=%s ]', JSON.stringify(result, null, ' '));
      transport.close();
    } catch (error) {
      this.adapterRef.logger.error('closeTransport() | failed:%o', error);
    }
  }


  async muteAudio(){
    this.adapterRef.logger.log('mute音频')
    if (!this._micProducer){
      throw new Error('No _micProducer');
    }
    this._micProducer.pause();
    try{
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', {
          externData: {
            'type': 'Mute',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              producerId: this._micProducer.id,
              mute: true 
            }
          } 
        });
    } catch (e) {
      this.adapterRef.logger.error('muteMic() | failed: %o', e);
    }
  }

  async unmuteAudio(){
    this.adapterRef.logger.log('resume音频')
    if (!this._micProducer){
      throw new Error('No _micProducer');
    }
    this._micProducer.resume();
    try{
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', { 
          externData: {
            type: 'Mute',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              producerId: this._micProducer.id,
              mute: false 
            }
          } 
        });
    } catch (e) {
      this.adapterRef.logger.error('muteMic() | failed: %o', e);
      return Promise.reject(e)
    }
  }

  async muteVideo(){
    this.adapterRef.logger.log('mute视频')
    if (!this._webcamProducer){
      throw new Error('No _webcamProducer');
    }
    this._webcamProducer.pause();
    try {
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', { 
          externData: {
            'type': 'Mute',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              producerId: this._webcamProducer.id,
              mute: true 
            }
          } 
        });
    } catch (e) {
      this.adapterRef.logger.error('muteMic() | failed: %o', e);
    }
  }

  async unmuteVideo(){
    this.adapterRef.logger.log('resume视频')
    if (!this._webcamProducer){
      throw new Error('No _webcamProducer');
    }
    this._webcamProducer.resume();
    try{
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', { 
          externData: {
            'type': 'Mute',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              producerId: this._webcamProducer.id,
              mute: false 
            }
          } 
        });
    } catch (e) {
      this.adapterRef.logger.error('muteMic() | failed: %o', e);
    }
  }
  
  async muteScreen(){
    this.adapterRef.logger.log('mute视频')
    if (!this._screenProducer){
      throw new Error('No _screenProducer');
    }
    this._screenProducer.pause();
    try {
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', {
          externData: {
            'type': 'Mute',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              producerId: this._screenProducer.id,
              mute: true
            }
          }
        });
    } catch (e) {
      this.adapterRef.logger.error('muteScreen() | failed: %o', e);
    }
  }

  async unmuteScreen(){
    this.adapterRef.logger.log('resume视频')
    if (!this._screenProducer){
      throw new Error('No _screenProducer');
    }
    this._screenProducer.resume();
    try{
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', {
          externData: {
            'type': 'Mute',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              producerId: this._screenProducer.id,
              mute: false
            }
          }
        });
    } catch (e) {
      this.adapterRef.logger.error('muteMic() | failed: %o', e);
    }
  }
  
  async updateUserRole(userRole:number) {
    this.adapterRef.logger.log(`updateUserRole:更新用户角色为${userRole}`);
    try {
      if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo){
        throw new Error('No _protoo');
      }
      await this.adapterRef._signalling._protoo.request(
        'SendUserData', {
          externData: {
            'type': 'UserRole',
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid - 0,
            data: {
              userRole: userRole
            }
          }
        });
    } catch (e) {
      this.adapterRef.logger.error('updateUserRole failed: %o', e);
      throw e;
    }
  }

  destroy() {
    this.adapterRef.logger.log('清除 meidasoup')
    this._reset()
  }
}

export { Mediasoup }
