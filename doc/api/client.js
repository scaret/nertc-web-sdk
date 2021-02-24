/**
 * 请使用 {@link WebRTC2#createClient} 创建 Client对象。
 */
class Client extends Base {
  // 初始化nrtc
  _init (options) {
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
   *  @memberOf Client#
   *  @return {Object}
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
  async join (options = {}) {
    this.adapterRef.logger.log('加入频道, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.channelStatus === 'join' || this.adapterRef.channelStatus === 'connectioning') {
      return Promise.reject('ERR_REPEAT_JOIN')
    }
    if(typeof options.uid !== 'number' && isNaN(options.uid)){
      throw new Error('uid 非 number类型')
    }
    if(options.uid > Number.MAX_SAFE_INTEGER){
      throw new Error('uid 超出 number精度')
    }
    this.adapterRef.connectState.curState = 'CONNECTING'
    this.adapterRef.connectState.prevState = 'DISCONNECTED'
    this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
    this._params.JoinChannelRequestParam4WebRTC2 = {
      joinChannelLiveConfig: {},
      joinChannelRecordConfig: {
        recordAudio: false, // 是否开启音频实时音录制，0不需要，1需要（默认0）
        recordVideo: false, // 是否开启视频实时音录制，0不需要，1需要（默认0）
        recordType: 0, // 录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
        isHostSpeaker: false // 主讲人
      }
    }
    this._params.JoinChannelRequestParam4WebRTC2.startJoinTime = Date.now()
    Object.assign(this._params.JoinChannelRequestParam4WebRTC2, options)
    this.setStartSessionTime()
    this.initMode()
    return this.adapterRef._meetings.joinChannel(Object.assign(
      this._params.JoinChannelRequestParam4WebRTC2, {
        userRole: this._roleInfo.userRole,
        appkey: this._params.appkey
      })
    )
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
   * @param {Stream} localStream
   * @returns {Promise}
   */
  async publish (stream) {
    let reason = ''
    if(!stream) stream = {}
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
   * @param {Stream} localStream
   * @returns {Promise}
   */
  async unpublish (stream={}, type=null) {
    let reason = ''
    if(!stream) stream = {}
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
   * @param {Stream} remoteStream
   * @returns {Promise}
   */
  async subscribe (stream) {
    this.adapterRef.logger.log(`订阅远端 ${stream.streamID} 音视频流`)
    const uid = stream.getId()
    try {
      if (stream.subConf.audio && stream.pubStatus.audio.audio) {
        if (stream.pubStatus.audio.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 音频流', stream.getId())
          stream.pubStatus.audio.consumerStatus = 'start'
          await this.adapterRef._mediasoup.createConsumer(uid, 'audio', stream.pubStatus.audio.producerId);
          stream.pubStatus.audio.consumerStatus = 'end'
          this.adapterRef.logger.log('订阅 %s 音频流完成', stream.getId())
        }
      }
      if (stream.subConf.video && stream.pubStatus.video.video) {
        if (stream.pubStatus.audio.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 视频流', stream.getId())
          stream.pubStatus.video.consumerStatus = 'start'
          const preferredSpatialLayer = stream.pubStatus.video.simulcastEnable ? stream.subConf.highOrLow : 0
          await this.adapterRef._mediasoup.createConsumer(uid, 'video', stream.pubStatus.video.producerId, preferredSpatialLayer);
          stream.pubStatus.video.consumerStatus = 'end'
          this.adapterRef.logger.log('订阅 %s 视频流完成', stream.getId())
        }
      }
      this.apiFrequencyControl({
        name: 'subscribe',
        code: 0,
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
   * @param {Stream} remoteStream
   * @returns {Promise}
   */
  async unsubscribe (stream) {
    this.adapterRef.logger.log('取消订阅远端音视频流: ', stream)
    try {
      if (stream.subConf.video) {
        if (stream.pubStatus.audio.stopconsumerStatus !== 'start'){
          this.adapterRef.logger.error('开始取消订阅音频流')
          stream.pubStatus.audio.stopconsumerStatus = 'start'
          await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.audio.consumerId);
          this.adapterRef.instance.removeSsrc(stream.getId(), 'audio')
          stream.pubStatus.audio.consumerId = '';
          stream.stop('audio')
          stream.pubStatus.audio.stopconsumerStatus = 'end'
          stream.subStatus.audio = false
          this.adapterRef.logger.error('取消订阅音频流完成')
        }
      }
      if (stream.pubStatus.audio.stopconsumerStatus !== 'start'){
        this.adapterRef.logger.error('开始取消订阅视频流')
        stream.pubStatus.video.stopconsumerStatus = 'start'
        await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId);
        this.adapterRef.instance.removeSsrc(stream.getId(), 'video')
        stream.pubStatus.video.consumerId = '';
        stream.stop('video')
        stream.pubStatus.video.stopconsumerStatus = 'end'
        stream.subStatus.video = false
        this.adapterRef.logger.error('取消订阅视频流完成')
      }
      this.apiFrequencyControl({
        name: 'unsubscribe',
        code: 0,
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
  async setRemoteVideoStreamType (stream, highOrLow) {
    this.adapterRef.logger.log(`订阅${stream.getId()}成员的${highOrLow ? '大' : '小'}流`)

    try {
      await this.adapterRef._mediasoup.destroyConsumer(stream.pubStatus.video.consumerId);
      stream.pubStatus.video.consumerId = '';
      if (stream.subConf.video) {
        if (stream.pubStatus.audio.consumerStatus !== 'start') {
          this.adapterRef.logger.log('开始订阅 %s 视频流', stream.getId())
          stream.pubStatus.video.consumerStatus = 'start'
          stream.subConf.highOrLow = highOrLow
          const preferredSpatialLayer = stream.pubStatus.video.simulcastEnable ? stream.subConf.highOrLow : 0
          await this.adapterRef._mediasoup.createConsumer(stream.getId(), 'video', stream.pubStatus.video.producerId, preferredSpatialLayer);
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
  async setClientRole(role) {
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
    if (!navigator.getBattery) {
      return Promise.reject('NOT_SUPPORTED_YET')
    }
    return new Promise((resolve, reject) =>{
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
      this.adapterRef.sessionStats.UserCount =  this.adapterRef.memberMap.size + 1
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
  setChannelProfile(options = {}) {
    this.adapterRef.logger.log('设置房间模型, options: ', JSON.stringify(options, null, ' '))
    if (this.adapterRef.signalInited) {
      this.adapterRef.logger.warn('已经在频道中')
      return 'INVALID_OPERATION'
    }

    const {mode = 'rtc'} = options
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
   * @param {RTMPTask[]} options.rtmpTasks 推流任务
   * @return {Promise}
   */
  addTasks (options = []) {
    if (this._roleInfo.userRole === 1) {
      this.adapterRef.logger.error(`addTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    this.adapterRef.logger.log('增加互动直播推流任务, options: ', options)
    return this.adapterRef._meetings.addTasks(options)
  }

  /**
   * 删除互动直播推流任务
   * @function deleteTasks
   * @memberOf Client#
   * @param {Object} options
   * @param {string[]} [options.taskIds] 该推流任务的id
   * @return {Promise}
   */
  deleteTasks (options = {}) {
    if (this._roleInfo.userRole === 1) {
      this.adapterRef.logger.error(`deleteTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    this.adapterRef.logger.log('删除互动直播推流任务, options: ', options)
    return this.adapterRef._meetings.deleteTasks(options)
  }

  /**
   * 更新互动直播推流任务
   * @function updateTasks
   * @memberOf Client#
   * @param {Object} options
   * @param {RTMPTask[]} options.rtmpTasks 推流任务
   * @return {Promise}
   */
  updateTasks (options = {}) {
    if (this._roleInfo.userRole === 1) {
      this.adapterRef.logger.error(`updateTasks: 观众不允许进行直播推流操作`);
      return Promise.reject(`INVALID_OPERATION`);
    }
    this.adapterRef.logger.log('更新互动直播推流任务, options: ', options)
    return this.adapterRef._meetings.updateTasks(options)
  }

  /**
   *  销毁实例
   *  @method destroy
   *  @memberOf Client#
   *  @param {Void}
   */
  destroy () {
    //this.adapterRef.logger.warn('清除 Client 实例')
  }
}

/**
 * @typedef {Object} RTMPTask 一个推流任务
 * @property {string} taskId - 自定义的推流任务ID。请保证此ID唯一。字母数字下划线组成的64位以内的字符串
 * @property {string} streamUrl - 流地址，例如`rtmp://test.url`。此处的推流地址可设置为网易云信直播产品中服务端API创建频道的返回参数pushUrl。
 * @property {boolean} [record] - 旁路推流是否需要进行音视频录制。
 * @property {object} [layout] - 互动直播中的布局相关参数。详细参数说明请参考layout。布局参数的配置方式及典型配置示例请参考旁路推流画面布局。
 * @property {object} layout.canvas - 用于设置混流视频的整体画布属性。
 * @property {number} layout.canvas.width - 整体画布的宽度，单位为 px。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} layout.canvas.height - 整体画布的宽度，单位为 px。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} [layout.canvas.color] - 画面背景颜色，格式为 256 ✖ 256 ✖ R + 256 ✖ G + B的和。请将对应 RGB 的值分别带入此公式计算即可。若未设置，则默认为0。
 * @property {object} [users[]] - 用于设置混流视频中每个参与者对应的画面属性。
 * @property {number} users[].uid - 将指定uid对应用户的视频流拉入直播。如果添加多个 users，则 uid 不能重复。
 * @property {number} users[].x - 通过 x 和 y 指定画布坐标中的一个点，该点将作为用户图像的左上角。x 参数用于设置画布的横轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} users[].y - 通过 x 和 y 指定画布坐标中的一个点，该点将作为用户图像的左上角。y 参数用于设置画布的纵轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} users[].width - 该用户图像在画布中的宽度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} users[].height - 该用户图像在画布中的高度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} [users[].adaption]
 * 用于设置占位图片和指定区域的适应属性。可设置为：
 * * 0：适应图片。即保证视频内容全部显示，未覆盖区域默认填充背景色
 * * 1：适应区域。即保证所有区域被填满，视频超出部分会被裁剪。
 *
 * 若未设置，则默认为1。
 *
 * @property {boolean} [users[].pushAudio]
 * 是否在直播中混流该用户的对应音频流。可设置为：
 * * true：在直播中混流该用户的对应音频流。
 * * false：在直播中将该用户设置为静音。
 *
 * 若未设置，默认为 true。
 *
 * @property {boolean} [users[].pushVideo] - 是否在直播中向观看者播放该用户的对应视频流。可设置为：
 * * true：在直播中播放该用户的视频流。
 * * false：在直播中不播放该用户的视频流。
 *
 * 若未设置，则默认为 true。
 *
 * @property {Object} [images[]] - 用于设置混流视频中占位图片属性。若参数 users 指定的用户未上线，会在其对应的区域展示占位图片。
 * @property {string} images[].url - 占位图片的URL。
 * @property {number} images[].x - 通过 x 和 y 指定画布坐标中的一个点，该点将作为占位图片的左上角。x 参数用于设置画布的横轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} images[].y - 通过 x 和 y 指定画布坐标中的一个点，该点将作为占位图片的左上角。y 参数用于设置画布的纵轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} images[].width - 该占位图片在画布中的宽度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} images[].height - 该占位图片在画布中的高度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
 * @property {number} images[].adaption
 * 用于设置占位图片和指定区域的适应属性。可设置为：
 * * 0：适应图片。即保证视频内容全部显示，未覆盖区域默认填充背景色
 * * 1：适应区域。即保证所有区域被填满，视频超出部分会被裁剪。
 *
 * 若未设置，则默认为 1。
 *
 * @property {object} [config] 其他设置
 * @property {boolean} [config.singleVideoNoTrans] - 单视频直推不转码。开启后推流服务器会透传用户的视频编码，不再对视频做转码。
 * @property {object} [config.audioParam] 音频参数
 * @property {number} [config.audioParam.bitRate] - 自定义音频比特率。取值范围为 10～192。语音场景建议64以上，音乐场景建议128。
 *
 */

/**
 stream-added
 * @event Client#stream-added
 * @type {object}
 * @property {Stream} stream - 新增的远端流
 * @description 远端用户发布了一个流的通知。
 * 收到远端流之后，可通过 {@link Client#subscribe} 订阅远端流。
 */

/**
 stream-removed
 * @event Client#stream-removed
 * @type {object}
 * @property {Stream} stream - 远端流
 * @description 该事件表示指定远端流被移除了
 */

/**
 stream-subscribed
 * @event Client#stream-subscribed
 * @type {object}
 * @property {Stream} stream - 新订阅远端流
 * @description 订阅远端流成功的通知。
 * 订阅远端流成功后，可通过 {@link Stream#setRemoteRenderMode} 设置远端渲染宽高等属性，通过 {@link Stream#play} 播放远端流。
 */

/**
 active-speaker
 * @event Client#active-speaker
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件会返回当前频道内声音最大的用户的uid。
 *
 */

/**
 peer-online
 * @event Client#peer-online
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示有主播加入房间
 *
 */

/**
 peer-leave
 * @event Client#peer-leave
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示有主播离开房间
 */

/**
 mute-audio
 * @event Client#mute-audio
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示指定主播将麦克风静音
 */

/**
 unmute-audio
 * @event Client#unmute-audio
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示指定主播将麦克风取消静音
 */

/**
 mute-video
 * @event Client#mute-video
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示指定主播将视频静音
 */

/**
 unmute-video
 * @event Client#unmute-video
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示指定主播将视频取消静音
 */

/**
 unmute-video
 * @event Client#client-banned
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示指定主播被踢出房间
 */

/**
 unmute-video
 * @event Client#client-banned
 * @type {object}
 * @property {number} uid - 主播uid
 * @description 该事件表示指定主播被踢出房间
 */

/**
 stopScreenSharing
 * @event Client#stopScreenSharing
 * @type {object}
 * @description 该事件表示本地的屏幕共享停止了
 */
export { Client }

/* eslint prefer-promise-reject-errors: 0 */
