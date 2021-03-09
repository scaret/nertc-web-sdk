
import { Base } from './base'
import {AddTaskOptions, ClientOptions, JoinOptions, RTMPTask} from "../types";
import {Stream} from "./stream";
import {checkExists} from "../util/param";

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
  constructor (options:ClientOptions) {
    super(options)

    /**
     * 页面卸载时销毁
     * 火狐使用pagehide 触发时发现websocket已经断开 导致不能发送登出信令 对端表现为刷新端没有退出
     * 注意：移动端safair不识别beforeunload事件
     */
      window.addEventListener('pagehide', () => {
        this.adapterRef.logger.log('离开页面之前，离开房间')
        this.leave()
      })
    //typescript constructor requirement
    this._roleInfo = {
      userRole: 0, // 0:主播，1：观众
      audienceList: {}, // Workaround，用于处理仍然收到的观众端消息
    };
    this._init(options)
  }
  // 初始化nrtc
  _init (options:ClientOptions) {
    const { appkey = '' } = options
    if (!appkey) {
      this.adapterRef.logger.error('Client: init error: 请传入appkey')
      throw new Error('请传入appkey')
    }
    this._params.appkey = appkey
    this._roleInfo = {
      userRole: 0, // 0:主播，1：观众
      audienceList: {}, // Workaround，用于处理仍然收到的观众端消息
    };
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
   * 加入频道
   * @function join
   * @memberOf Client#
   * @param {Object} options
   * @param {String} options.channel 频道名称
   * @param {Number} options.uid  用户唯一标识（整数，建议五位数以上）
   * @param {Object} [options.joinChannelLiveConfig] 加入房间互动直播相关参数
   * @param {Boolean} [options.joinChannelLiveConfig.liveEnable]  是否旁路直播
   * @param {Object} [options.joinChannelRecordConfig] 加入房间录制相关参数
   * @param {Boolean} [options.joinChannelRecordConfig.isHostSpeaker]  是否是主讲人
   * @param {Boolean} [options.joinChannelRecordConfig.recordAudio]  是否开启音频实时音录制，0不需要，1需要（默认0）
   * @param {Boolean} [options.joinChannelRecordConfig.recordVideo]  是否开启视频实时音录制，0不需要，1需要（默认0）
   * @param {Number} [options.joinChannelRecordConfig.recordType]  录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
   * @return {Promise}
   */
  async join (options: JoinOptions) {
    this.adapterRef.logger.log('加入频道, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
      return Promise.reject('ERR_REPEAT_JOIN')
    }
    if(typeof options.uid !== 'number' || isNaN(options.uid)){
      throw new Error('uid 非 number类型')
    }
    if(options.uid > Number.MAX_SAFE_INTEGER){
      throw new Error('uid 超出 number精度')
    }

    this.adapterRef.connectState.curState = 'CONNECTING'
    this.adapterRef.connectState.prevState = 'DISCONNECTED'
    this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
    this._params.JoinChannelRequestParam4WebRTC2 = {
      startJoinTime: Date.now(),
      appkey: this._params.appkey,
      userRole: this._roleInfo.userRole,
      channelName: options.channelName,
      wssArr: options.wssArr,
      uid: options.uid,
      token: options.token,
      joinChannelLiveConfig: options.joinChannelLiveConfig || {liveEnable: false},
      joinChannelRecordConfig: options.joinChannelRecordConfig || {
        recordAudio: false, // 是否开启音频实时音录制，0不需要，1需要（默认0）
        recordVideo: false, // 是否开启视频实时音录制，0不需要，1需要（默认0）
        recordType: 0, // 录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
        isHostSpeaker: false // 主讲人
      },
    }
    this.setStartSessionTime()
    this.initMode()
    if (!this.adapterRef._meetings){
      throw new Error('No this.adapterRef._meetings');
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
    this.adapterRef.logger.log('离开频道')
    if (this.adapterRef.channelStatus !== 'join' && this.adapterRef.channelStatus !== 'connectioning') {
      this.adapterRef.logger.log(' 状态: ', this.adapterRef.channelStatus)
      //return Promise.reject('ERR_REPEAT_LEAVE')
    }
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTING'
    this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
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
  async publish (stream:Stream) {
    checkExists({tag: 'client.publish:stream', value: stream});
    let reason = ''
    if (this.adapterRef.connectState.curState !== 'CONNECTED') {
      this.adapterRef.logger.error('publish: 当前不在频道中，可能是没有加入频道或者是网络波动导致暂时断开连接')
      reason = 'INVALID_OPERATION'
    } else if (!stream || (!stream.audio && !stream.video && !stream.screen)) {
      this.adapterRef.logger.error('publish: 传入的 stream 格式非法，没有媒体数据')
      reason = 'INVALID_LOCAL_STREAM'
    } else if (this._roleInfo.userRole === 1) {
      this.adapterRef.logger.error(`publish：观众禁止Publish，请先使用setClientRole设为主播`);
      reason = 'INVALID_OPERATION'
    }
    const param = JSON.stringify({
      videoProfile: stream.videoProfile,
      audio: stream.audio,
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
      return Promise.reject(reason)
    }
    
    try {
      if (!this.adapterRef._mediasoup){
        throw new Error('No this.adapterRef._mediasoup');
      }
      await this.adapterRef._mediasoup.createProduce(stream);
      this.apiFrequencyControl({
        name: 'publish',
        code: 0,
        param
      })
    } catch (e) {
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
  async unpublish (stream:Stream, type=null) {
    checkExists({tag: 'client.unpublish:stream', value: stream});
    let reason = ''
    if (this.adapterRef.connectState.curState !== 'CONNECTED') {
      this.adapterRef.logger.error('publish: 当前不在频道中，可能是没有加入频道或者是网络波动导致暂时断开连接')
      reason = 'INVALID_OPERATION'
    } else if (!this.isPublished(stream)) {
      this.adapterRef.logger.error('指定的 stream 还没有发布')
      reason = 'INVALID_LOCAL_STREAM'
    } 
    const param = JSON.stringify({
      videoProfile: stream.videoProfile,
      audio: stream.audio,
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
      return Promise.reject(reason)
    }

    this.adapterRef.logger.log(`开始取消发布本地 ${type ? type : '音视频'} 流`)
    try {
      if (!this.adapterRef._mediasoup){
        throw new Error('No this.adapterRef._mediasoup');
      }
      await this.adapterRef._mediasoup.destroyProduce('audio');
      await this.adapterRef._mediasoup.destroyProduce('video');
      this.apiFrequencyControl({
        name: 'unpublish',
        code: 0,
        param: JSON.stringify({
          videoProfile: stream.videoProfile,
          audio: stream.audio,
          audioProfile: stream.audioProfile,
          cameraId: stream.cameraId,
          microphoneId: stream.microphoneId,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
          screenProfile: stream.screenProfile
        }, null, ' ')
      })
    } catch (e) {
      this.apiFrequencyControl({
        name: 'unpublish',
        code: -1,
        param: JSON.stringify({
          reason: e,
          videoProfile: stream.videoProfile,
          audio: stream.audio,
          audioProfile: stream.audioProfile,
          cameraId: stream.cameraId,
          microphoneId: stream.microphoneId,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
          screenProfile: stream.screenProfile
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
  async subscribe (stream:Stream) {
    checkExists({tag: 'client.subscribe:stream', value: stream});
    this.adapterRef.logger.log(`订阅远端 ${stream.streamID} 音视频流`)
    const uid = stream.getId()
    if (!uid){
      throw new Error('No uid');
    }
    if (!this.adapterRef._mediasoup){
      throw new Error('No this.adapterRef._mediasoup');
    }
    try {
      if (stream.subConf.audio && stream.pubStatus.audio.audio) {
        if (stream.pubStatus.audio.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 音频流', stream.getId())
          stream.pubStatus.audio.consumerStatus = 'start'
          await this.adapterRef._mediasoup.createConsumer(uid, 'audio', 'audio', stream.pubStatus.audio.producerId);
          stream.pubStatus.audio.consumerStatus = 'end'
          this.adapterRef.logger.log('订阅 %s 音频流完成', stream.getId())
        }
      }
      if (stream.subConf.video && stream.pubStatus.video.video) {
        if (stream.pubStatus.audio.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 视频流', stream.getId())
          stream.pubStatus.video.consumerStatus = 'start'
          const preferredSpatialLayer = stream.pubStatus.video.simulcastEnable ? stream.subConf.highOrLow : 0
          await this.adapterRef._mediasoup.createConsumer(uid, 'video', 'video', stream.pubStatus.video.producerId, preferredSpatialLayer);
          stream.pubStatus.video.consumerStatus = 'end'
          this.adapterRef.logger.log('订阅 %s 视频流完成', stream.getId())
        }
      }
      if (stream.subConf.screen && stream.pubStatus.screen.screen) {
        if (stream.pubStatus.screen.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 视频辅流', stream.getId())
          stream.pubStatus.screen.consumerStatus = 'start'
          const preferredSpatialLayer = stream.pubStatus.screen.simulcastEnable ? stream.subConf.highOrLow : 0
          await this.adapterRef._mediasoup.createConsumer(uid, 'video', 'screenShare', stream.pubStatus.screen.producerId, preferredSpatialLayer);
          stream.pubStatus.screen.consumerStatus = 'end'
          this.adapterRef.logger.log('订阅 %s 视频辅流完成', stream.getId())
        }
      }
      this.apiFrequencyControl({
        name: 'subscribe',
        code: 0,
        param: JSON.stringify({
          reason: '',
          videoProfile: stream.videoProfile,
          audio: stream.audio,
          audioProfile: stream.audioProfile,
          cameraId: stream.cameraId,
          subStatus: stream.subStatus,
          microphoneId: stream.microphoneId,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
          screenProfile: stream.screenProfile
        }, null, ' ')
      })
    } catch (e) {
      this.apiFrequencyControl({
        name: 'subscribe',
        code: -1,
        param: JSON.stringify({
          reason: e,
          videoProfile: stream.videoProfile,
          audio: stream.audio,
          audioProfile: stream.audioProfile,
          cameraId: stream.cameraId,
          subStatus: stream.subStatus,
          microphoneId: stream.microphoneId,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
          screenProfile: stream.screenProfile
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
  async unsubscribe (stream:Stream) {
    checkExists({tag: 'client.unsubscribe:stream', value: stream});
    this.adapterRef.logger.log('取消订阅远端音视频流: ', stream)
    try {
      if (stream.subConf.video) {                                 
        if (stream.pubStatus.audio.stopconsumerStatus !== 'start'){
          this.adapterRef.logger.log('开始取消订阅音频流')
          stream.pubStatus.audio.stopconsumerStatus = 'start'
          if (!this.adapterRef._mediasoup){
            throw new Error('No this.adapterRef._mediasoup');
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
          
          this.adapterRef.logger.log('取消订阅音频流完成')
        }
      } 
      if (stream.pubStatus.video.stopconsumerStatus !== 'start'){
        this.adapterRef.logger.log('开始取消订阅视频流')
        stream.pubStatus.video.stopconsumerStatus = 'start'
        if (!this.adapterRef._mediasoup){
          throw new Error('No this.adapterRef._mediasoup');
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
        
        this.adapterRef.logger.log('取消订阅视频流完成')
      }
      this.apiFrequencyControl({
        name: 'unsubscribe',
        code: 0,
        param: JSON.stringify({
          reason: '',
          videoProfile: stream.videoProfile,
          audio: stream.audio,
          audioProfile: stream.audioProfile,
          cameraId: stream.cameraId,
          subStatus: stream.subStatus,
          microphoneId: stream.microphoneId,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
          screenProfile: stream.screenProfile
        }, null, ' ')
      })
    } catch (e) {
      this.apiFrequencyControl({
        name: 'unsubscribe',
        code: -1,
        param: JSON.stringify({
          reason: e,
          videoProfile: stream.videoProfile,
          audio: stream.audio,
          audioProfile: stream.audioProfile,
          cameraId: stream.cameraId,
          subStatus: stream.subStatus,
          microphoneId: stream.microphoneId,
          subConf: stream.subConf,
          pubStatus: stream.pubStatus,
          renderMode: stream.renderMode,
          screen: stream.screen,
          screenProfile: stream.screenProfile
        }, null, ' ')
      })
    }
  }

  /**
   * 中途更新订阅的视频分辨率。
   * @method setRemoteVideoStreamType
   * @memberOf Client#
   * @param {Stream} stream 参数
   * @param {Number} highOrLow: 0是小流，1是大流
   * @returns {Promise}  
  */
  async setRemoteVideoStreamType (stream:Stream, highOrLow:number) {
    this.adapterRef.logger.log(`订阅${stream.getId()}成员的${highOrLow ? '大' : '小'}流`)

    try {
      if (!this.adapterRef._mediasoup){
        throw new Error('No this.adapterRef._mediasoup');
      }
      const streamId = stream.getId();
      if (!streamId){
        throw new Error('No stream Id');
      }
      await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId);
      stream.pubStatus.video.consumerId = '';
      if (stream.subConf.video) {
        if (stream.pubStatus.audio.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 视频流', stream.getId())
          stream.pubStatus.video.consumerStatus = 'start'
          stream.subConf.highOrLow = highOrLow
          const preferredSpatialLayer = stream.pubStatus.video.simulcastEnable ? stream.subConf.highOrLow : 0
          await this.adapterRef._mediasoup.createConsumer(streamId, 'video', 'video', stream.pubStatus.video.producerId, preferredSpatialLayer);
          stream.pubStatus.video.consumerStatus = 'end'
          this.adapterRef.logger.log('订阅 %s 视频流完成', stream.getId())
        }
      }
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        param: JSON.stringify({
          highOrLow: highOrLow,
          uid: stream.streamID
        }, null, ' ')
      })
    } catch (e) {
      this.apiFrequencyControl({
        name: 'setRemoteVideoStreamType',
        code: -1,
        param: JSON.stringify({
          reason: e,
          highOrLow: highOrLow,
          uid: stream.streamID
        }, null, ' ')
      })
    }
  }

  enableAudioVolumeIndicator () {
    this.adapterRef.logger.log('关闭双流模式')
  }

  enableDualStream () {
    this.adapterRef.logger.log('开启双流模式')
  }

  disableDualStream () {
    this.adapterRef.logger.log('关闭双流模式')
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
    if (role === "host" || role === "broadcaster") {
      // broadcaster为云信Native叫法。这里做了兼容，以host为准。
      // http://doc.hz.netease.com/pages/viewpage.action?pageId=267631447
      userRole = 0;
    } else if (role === "audience") {
      userRole = 1;
    } else {
      this.adapterRef.logger.error(`setClientRole: 无法识别的角色：${role}`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    
    const localUser = this.adapterRef.channelInfo ? this.adapterRef.channelInfo.uid || "" : "";
    if (userRole === this._roleInfo.userRole) {
      this.adapterRef.logger.warn(`setClientRole: 用户${localUser}的角色已经是${role}了`);
      return;
    }
    switch (this.adapterRef.connectState.curState) {
      case "CONNECTED":
        if (userRole === 1 && this.adapterRef.localStream && this.isPublished(this.adapterRef.localStream)) {
          // 主播变为观众时会自动Unpublish所有流
          this.adapterRef.logger.info(`setClientRole：主播 ${localUser}将设为观众，自动Unpublish中`);
          await this.unpublish(this.adapterRef.localStream);
        }
        if (!this.adapterRef._mediasoup){
          throw new Error('No this.adapterRef._mediasoup');
        }
        await this.adapterRef._mediasoup.updateUserRole(userRole);
        if (this._roleInfo.userRole !== userRole) {
          this._roleInfo.userRole = userRole;
          this.adapterRef.logger.info(`setClientRole：本地用户${localUser} 设置角色为 ${role}`);
          this.emit('client-role-changed', {role: role});
        }
        break;
      case "DISCONNECTED":
        if (this._roleInfo.userRole !== userRole) {
          this._roleInfo.userRole = userRole;
          this.adapterRef.logger.info(`setClientRole：本地用户${localUser}设置角色为 ${role}`);
          this.emit('client-role-changed', {role: role});
        }
        break;
      default:
        this.adapterRef.logger.error(`setClientRole: 本地用户${localUser}当前不在频道中，可能是网络波动导致暂时断开连接`);
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
      return Promise.reject('NOT_SUPPORTED_YET')
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
  getLocalVideoStats(){
    return new Promise((resolve, reject) =>{
      resolve(this.adapterRef.localVideoStats)
    })
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
  getRemoteVideoStats(){
    return new Promise((resolve, reject) =>{
      resolve(this.adapterRef.remoteVideoStats)
    })
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
    this.adapterRef.logger.log('设置房间模型, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.signalInited) {
      this.adapterRef.logger.warn('已经在频道中')
      return 'INVALID_OPERATION'
    }

    const mode = options.mode || 'rtc';
    if (mode == 'live') {
      if (this.adapterRef.localStream) {
        this.adapterRef.localStream.audioProfile = 'music_standard'
      }
    }
    this._params.mode = mode
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
      this.adapterRef.logger.error(`addTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    this.adapterRef.logger.log('增加互动直播推流任务, options: ', options)
    if (!this.adapterRef._meetings){
      throw new Error('No this.adapterRef._meetings');
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
      this.adapterRef.logger.error(`deleteTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    this.adapterRef.logger.log('删除互动直播推流任务, options: ', options)
    if (!this.adapterRef._meetings){
      throw new Error('No this.adapterRef._meetings');
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
      this.adapterRef.logger.error(`updateTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    this.adapterRef.logger.log('更新互动直播推流任务, options: ', options)
    if (!this.adapterRef._meetings){
      throw new Error('No this.adapterRef._meetings');
    }
    return this.adapterRef._meetings.updateTasks(options)
  }

  /**
   *  销毁实例
   *  @method destroy
   *  @memberOf Client
   *  @param {Void}
   */
  destroy () {
    //this.adapterRef.logger.warn('清除 Client 实例')
  }
}

export { Client }

/* eslint prefer-promise-reject-errors: 0 */
