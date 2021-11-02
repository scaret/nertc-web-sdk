
import { Base } from './base'
import {AddTaskOptions, ClientOptions, MediaPriorityOptions, JoinOptions, LocalVideoStats, MediaTypeShort, RTMPTask, Client as IClient} from "../types";
import {LocalStream} from "./localStream";
import {checkExists, checkValidInteger, checkValidString} from "../util/param";
import {
  ReportParamEnableEncryption,
  ReportParamGetConnectionState,
  ReportParamSetChannelProfile,
  ReportParamSetClientRole
} from "../interfaces/ApiReportParam";
import {EncryptionMode, EncryptionModes, encryptionModeToInt} from "../module/encryption";
import { logController } from '../util/log/upload'
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';
import { SDK_VERSION, BUILD } from "../Config";
import {STREAM_TYPE} from "../constant/videoQuality";
import {RemoteStream} from "./remoteStream";
import {Device} from "../module/device";
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
  constructor (options:ClientOptions) {
    super(options)

    /**
     * 页面卸载时销毁
     * 火狐使用pagehide 触发时发现websocket已经断开 导致不能发送登出信令 对端表现为刷新端没有退出
     * 注意：移动端safair不识别beforeunload事件
     */
      window.addEventListener('pagehide', () => {
        this.logger.log('离开页面之前，离开房间')
        this.leave()
      })
      
    //typescript constructor requirement
    this._roleInfo = {
      userRole: 0, // 0:主播，1：观众
      audienceList: {}, // Workaround，用于处理仍然收到的观众端消息
    };
    this._init(options)
    this.logger.info(`NERTC ${SDK_VERSION} ${BUILD}: 客户端创建成功。`);
    
  }
  
  safeEmit (eventName:string, ...args: any[]){
    // 对客户抛出的事件请使用这个函数
    try{
      this.emit(eventName, ...args);
    }catch(e){
      this.logger.error(`Error on event ${eventName}: ${e.name} ${e.message}`, e.stack);
    }
  }
  
  // 初始化nrtc
  _init (options:ClientOptions) {
    this.initWebSocket();
    // let checkSum = sha1(`${wsParams.PROD}${wsParams.timestamp}${SDK_VERSION}${wsParams.platform}${wsParams.sdktype}${wsParams.deviceId}${wsParams.salt}`);
    // let url = `${wsParams.wsURL}?deviceId=${wsParams.deviceId}&isTest=${wsParams.PROD}&sdkVer=${SDK_VERSION}&sdktype=${wsParams.sdktype}&timestamp=${wsParams.timestamp}&platform=${wsParams.platform}&checkSum=${checkSum}`;
    // (<any>window).wsTransport = new WSTransport({
    //   url: url,
    //   adapterRef: this.adapterRef
    // });
    // (<any>window).wsTransport.init();
    const { appkey = '', token } = options
    if (!appkey) {
      this.logger.error('Client: init error: 请传入appkey')
      // this.logStorage.log('log','Client: init error: 请传入appkey')
      throw new RtcError({code: ErrorCode.INVALID_PARAMETER, message:'请传入appkey'})
    }
    this._params.appkey = appkey
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
    return this.adapterRef.channelInfo || {}
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
    if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
      this.logger.error('setLocalMediaPriority: 请在加入房间前调用')
      return 'INVALID_OPERATION'
    }
    /*if (options === undefined) {
      this.adapterRef.userPriority = undefined
      return
    }*/
    const {priority = 100, preemtiveMode = false} = options
    if(typeof priority !== 'number' || isNaN(priority)){
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
    this.logger.log('加入频道, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
      return Promise.reject(
        new RtcError({
          code: ErrorCode.REPEAT_JOIN,
          message: 'repeatedly join'
        })
      )
    }
    if(!options.channelName){
      throw new RtcError({code: ErrorCode.INVALID_PARAMETER, message:'请填写房间名称'})
    }
    if (typeof options.uid === 'string') {
      this.logger.log('uid是string类型')
      this.adapterRef.channelInfo.uidType = 'string'
      //options.uid = new BigNumber(options.uid)
    } else if (typeof options.uid === 'number') {
      this.logger.log('uid是number类型')
      this.adapterRef.channelInfo.uidType = 'number'
      if(options.uid > Number.MAX_SAFE_INTEGER){
        throw new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'uid is exceeds the scope of Number'
        })
      }
    } else {
      this.logger.error('uid参数格式非法')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'uid is invalid'
        })
      )
    }

    this.adapterRef.connectState.curState = 'CONNECTING'
    this.adapterRef.connectState.prevState = 'DISCONNECTED'
    this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
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
        roomServer: options.neRtcServerAddresses.roomServer || ''
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
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: 'meetings error'
      })
    }
    return this.adapterRef._meetings.joinChannel(this._params.JoinChannelRequestParam4WebRTC2);
  }

  /**
   * 离开频道
   * @function leave
   * @memberOf Client#
   * @param {Void}
   * @return {null}
   */
  async leave () {
    this.logger.log('离开频道')
    if (this.adapterRef.channelStatus !== 'join' && this.adapterRef.channelStatus !== 'connectioning') {
      this.logger.log(' 状态: ', this.adapterRef.channelStatus)
      //return Promise.reject('ERR_REPEAT_LEAVE')
    }
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTING'
    this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
    this.setEndSessionTime()
    if (this.adapterRef._meetings) {
      this.adapterRef._meetings.leaveChannel()
    }
    // invoke uploadLog() if uploadLogEnabled is true
    // if(Number(sessionStorage.getItem('uploadLogEnabled'))) {
    //   this.upLoadParam = {
    //     uploadAppkey: this.adapterRef.channelInfo.appkey,
    //     uploadUid: this.adapterRef.channelInfo.uid,
    //     uploadCid: this.adapterRef.channelInfo.cid
    //   }
    //   setTimeout(this.startUpload, 3000, this.upLoadParam);
    // }

  }

  // startUpload(upLoadParam:any) {
  //   logController.startUploadLog(upLoadParam);
  // }


  async leaveRts () {
    this.logger.log('离开频道')
    if (this.adapterRef.channelStatus !== 'join' && this.adapterRef.channelStatus !== 'connectioning') {
      this.logger.log(' 状态: ', this.adapterRef.channelStatus)
      //return Promise.reject('ERR_REPEAT_LEAVE')
    }
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTING'
    this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
    this.setEndSessionTime()
    if (this.adapterRef._meetings) {
      this.adapterRef._meetings.leaveChannel()
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
    let reason = ''
    if (this.adapterRef.connectState.curState !== 'CONNECTED') {
      this.logger.error('publish: 当前不在频道中，可能是没有加入频道或者是网络波动导致暂时断开连接')
      reason = 'INVALID_OPERATION'
    } else if (!stream || (!stream.audio && !stream.video && !stream.screen && !stream.screenAudio)) {
      this.logger.error('publish: 传入的 stream 格式非法，没有媒体数据')
      reason = 'INVALID_LOCAL_STREAM'
    } else if (this._roleInfo.userRole === 1) {
      this.logger.error(`publish：观众禁止Publish，请先使用setClientRole设为主播`);
      reason = 'INVALID_OPERATION'
    }
    const param = JSON.stringify({
      videoProfile: stream.videoProfile,
      audio: stream.audio,
      screenAudio: stream.screenAudio,
      audioProfile: stream.audioProfile,
      cameraId: stream.cameraId,
      microphoneId: stream.microphoneId,
      pubStatus: stream.pubStatus,
      renderMode: stream.renderMode,
      screen: stream.screen,
      screenProfile: stream.screenProfile,
      reason
    }, null, ' ')
    if (reason) {
      this.apiFrequencyControl({
        name: 'publish',
        code: -1,
        param
      })
      if(reason === 'INVALID_OPERATION') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'invalid operation'
          })
        )
      }else if(reason === 'INVALID_LOCAL_STREAM') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_LOCALSTREAM,
            message: 'no localStream'
          })
        )
      }
    }
    
    try {
      if (!this.adapterRef._mediasoup){
        throw new RtcError({
          code: ErrorCode.NO_MEDIASERVER,
          message: 'media server error 4'
        })
      }
      this.bindLocalStream(stream)
      await this.adapterRef._mediasoup.createProduce(stream, "all");
      this.apiFrequencyControl({
        name: 'publish',
        code: 0,
        param
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:publish' ,e.name, e.message, e.stack, ...arguments);
      this.apiFrequencyControl({
        name: 'publish',
        code: -1,
        param
      })
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
    let reason = ''
    if (this.adapterRef.connectState.curState !== 'CONNECTED') {
      this.logger.error('publish: 当前不在频道中，可能是没有加入频道或者是网络波动导致暂时断开连接')
      reason = 'INVALID_OPERATION'
    }
    const param = JSON.stringify({
      videoProfile: stream && stream.videoProfile,
      audio: stream && stream.audio,
      audioProfile: stream && stream.audioProfile,
      cameraId: stream && stream.cameraId,
      microphoneId: stream && stream.microphoneId,
      pubStatus: stream && stream.pubStatus,
      renderMode: stream && stream.renderMode,
      screen: stream && stream.screen,
      screenProfile: stream && stream.screenProfile,
      reason
    }, null, ' ')
    if (reason) {
      this.apiFrequencyControl({
        name: 'publish',
        code: -1,
        param
      })
      if(reason === 'INVALID_OPERATION') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'invalid operation'
          })
        )
      }else if (reason === 'INVALID_LOCAL_STREAM') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_LOCALSTREAM,
            message: 'no localStream'
          })
        )
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
      this.apiFrequencyControl({
        name: 'unpublish',
        code: 0,
        param: JSON.stringify({
          videoProfile: stream && stream.videoProfile,
          audio: stream && stream.audio,
          audioProfile: stream && stream.audioProfile,
          cameraId: stream && stream.cameraId,
          microphoneId: stream && stream.microphoneId,
          pubStatus: stream && stream.pubStatus,
          renderMode: stream && stream.renderMode,
          screen: stream && stream.screen,
          screenProfile: stream && stream.screenProfile
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:unpublish' ,e, ...arguments);
      this.apiFrequencyControl({
        name: 'unpublish',
        code: -1,
        param: JSON.stringify({
          reason: e,
          videoProfile: stream && stream.videoProfile,
          audio: stream && stream.audio,
          audioProfile: stream && stream.audioProfile,
          cameraId: stream && stream.cameraId,
          microphoneId: stream && stream.microphoneId,
          pubStatus: stream && stream.pubStatus,
          renderMode: stream && stream.renderMode,
          screen: stream && stream.screen,
          screenProfile: stream && stream.screenProfile
        }, null, ' ')
      })
    }
  }

  /**
   * 订阅远端音视频流
   * @method subscribe
   * @memberOf Client#
   * @param {Stream} Stream类型
   * @returns {Promise}  
   */
  async subscribe (stream:RemoteStream) {
    return this.subscribeRts(stream) 
  }

  async subscribeRts (stream:RemoteStream) {
    checkExists({tag: 'client.subscribe:stream', value: stream});
    this.logger.log(`subscribe() [订阅远端: ${stream.stringStreamID}]`)
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
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.audio.consumerId);
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
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId);
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
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.screen.consumerId);
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
          audio: stream.audio,
          subStatus: stream.subStatus,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
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
          reason: e,
          audio: stream.audio,
          subStatus: stream.subStatus,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
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
    return this.unsubscribeRts(stream)
  }

  async unsubscribeRts (stream:RemoteStream) {
    checkExists({tag: 'client.unsubscribe:stream', value: stream});
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
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.audio.consumerId);
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
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId);
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
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.screen.consumerId);
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
          reason: '',
          audio: stream.audio,
          subStatus: stream.subStatus,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:unsubscribe' ,e.name, e.message, e, ...arguments);
      this.apiFrequencyControl({
        name: 'unsubscribe',
        code: -1,
        param: JSON.stringify({
          reason: e,
          audio: stream.audio,
          subStatus: stream.subStatus,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
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
          highOrLow: highOrLow,
          uid: stream.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:setRemoteVideoStreamType' ,e.name, e.message, e, ...arguments);
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        code: -1,
        param: JSON.stringify({
          reason: e,
          highOrLow: highOrLow,
          uid: stream.stringStreamID
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
        param: JSON.stringify({
          highOrLow: highOrLow,
          uid: stream.stringStreamID
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('API调用失败：Client:setRemoteStreamType' ,e, ...arguments);
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        code: -1,
        param: JSON.stringify({
          reason: e,
          highOrLow: highOrLow,
          uid: stream.stringStreamID
        }, null, ' ')
      })
    }
  }

  enableAudioVolumeIndicator () {
    this.logger.log('开启双流模式')
  }

  enableDualStream (dualStreamSetting: {video: boolean; screen: boolean} = {video: true, screen: false}) {
    this.adapterRef.channelInfo.videoLow = dualStreamSetting.video;
    this.adapterRef.channelInfo.screenLow = dualStreamSetting.screen;
    this.logger.log('开启双流模式')
  }

  disableDualStream () {
    this.logger.log('关闭双流模式')
    this.adapterRef.channelInfo.videoLow = false;
    this.adapterRef.channelInfo.screenLow = false;
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
      param: JSON.stringify(param, null, ' ')
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
    localStream.client = <IClient>this;
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
    let reason;
    this.logger.log('设置房间模型, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.connectState.curState !== "DISCONNECTED") {
      this.logger.warn('已经在频道中')
      reason = 'INVALID_OPERATION'
    }else{
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
    const param:ReportParamSetChannelProfile = {
      reason,
      channelProfile: (options.mode === "live" ? 1 : 0)
    };
    this.apiFrequencyControl({
      name: 'setChannelProfile',
      code: reason ? -1 : 0,
      param: JSON.stringify(param, null, ' ')
    })
    if (reason){
      throw new RtcError({
        code: ErrorCode.INVALID_OPERATION,
        message: 'invalid operation'
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
  addTasks (options:AddTaskOptions) {
    if (this._roleInfo.userRole === 1) {
      this.logger.error(`addTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'audience is not allowed to operate task'
        })
      );
    }
    this.logger.log('增加互动直播推流任务, options: ', JSON.stringify(options))
    if (!this.adapterRef._meetings){
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: 'meetings error'
      })
    }
    return this.adapterRef._meetings.addTasks(options)
  }

  /**
   * 删除互动直播推流任务
   * @function deleteTasks
   * @memberOf Client#
   * @param {Object} options
   * @param {Array} [options.taskId] 该推流任务的id要求唯一
   * @return {Promise}
   */
  deleteTasks (options:{taskIds: string[]}) {
    if (this._roleInfo.userRole === 1) {
      this.logger.error(`deleteTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'audience is not allowed to operate task'
        })
      );
    }
    this.logger.log('删除互动直播推流任务, options: ', options)
    if (!this.adapterRef._meetings){
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: 'meetings error'
      })
    }
    return this.adapterRef._meetings.deleteTasks(options)
  }

  /**
   * 更新互动直播推流任务
   * @function updateTasks
   * @memberOf Client#
   * @param {Object} options
   * @param {Array} [options.rtmpTasks] 推流任务
   * @return {Promise}
   */
  updateTasks (options : {rtmpTasks: RTMPTask[]}) {
    if (this._roleInfo.userRole === 1) {
      this.logger.error(`updateTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'audience is not allowed to operate task'
        })
      );
    }
    this.logger.log('更新互动直播推流任务, options: ', options)
    if (!this.adapterRef._meetings){
      throw new RtcError({
        code: ErrorCode.NO_MEETINGS,
        message: 'meetings error'
      })
    }
    return this.adapterRef._meetings.updateTasks(options)
  }

  setEncryptionMode(encryptionMode: EncryptionMode){
    checkValidInteger({
      tag: 'Valid encryptionModes are: ' + Object.keys(EncryptionModes).join(','),
      value: encryptionModeToInt(encryptionMode),
    })
    this.logger.log('设置加密模式：', encryptionMode);
    this.adapterRef.encryption.setEncryptionMode(encryptionMode);
    const param:ReportParamEnableEncryption = {
      enable: encryptionMode !== "none",
      mode: encryptionModeToInt(encryptionMode)
    };
    this.apiFrequencyControl({
      name: 'enableEncryption',
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
