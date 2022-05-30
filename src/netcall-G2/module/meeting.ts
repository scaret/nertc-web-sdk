import { EventEmitter } from 'eventemitter3'
import { ajax } from '../util/ajax'
import {getCloudProxyInfoUrl, getChannelInfoUrl, SDK_VERSION, roomsTaskUrl} from '../Config'
const md5 = require('md5');
import {
  AdapterRef, AddTaskOptions, ILogger,
  MeetingJoinChannelOptions,
  MeetingOptions, RTMPTask,
  SDKRef
} from "../types";
import BigNumber from 'bignumber.js'
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import {SignalGetChannelInfoResponse} from "../interfaces/SignalProtocols";

/**
 * 会控相关
 */
class Meeting extends EventEmitter {
  private sdkRef:SDKRef;
  private adapterRef:AdapterRef;
  private logger: ILogger;
  private info: { // 目前仅用于日志打印
    turn: boolean;
    relay: boolean;
    forward: boolean;
    secure: boolean;
  } = {
    turn: true,
    relay: false,
    forward: false,
    secure: true,
  }
  constructor (options: MeetingOptions) {
    super()

    this._reset()

    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
    this.logger = options.adapterRef.logger.getChild(()=>{
      let tag = "meeting";
      if (!this.info.secure){
        tag += " INSECURE";
      }
      if (this.info.forward){
        tag += " FORWARD"
      }
      if (!this.info.turn){
        tag += " NOTURN"
      }
      if (options.adapterRef.instance?._params?.neRtcServerAddresses?.channelServer){
        tag += " PRIVATE"
      }
      if (options.adapterRef._meetings !== this){
        tag += " DETACHED"
      }
      return tag
    })
  }

  _reset () {
    // this.adapterRef = null // adapter层的成员属性与方法引用
    // this.sdkRef = null // SDK 实例指针
  }

  async getCloudProxyInfo (options:MeetingJoinChannelOptions) {
    const {
      appkey,
      channelName,
      uid,
      token = ''
    } = options

    this.adapterRef.logger.log('getCloudProxyInfoUrl: ', getCloudProxyInfoUrl)
    let url = getCloudProxyInfoUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.cloudProxyServer) {
      url = this.adapterRef.instance._params.neRtcServerAddresses.cloudProxyServer
      this.adapterRef.logger.log('私有化配置的 cloudProxyServer: ', url)
    }
    let requestUid = uid
    if (this.adapterRef.channelInfo.uidType === 'string') {
      requestUid = new BigNumber(requestUid)
    }
    //@ts-ignore
    let curtime = Date.parse(new Date())/1000
    const md5str = appkey + "." + uid + "." + curtime
    try{
      const data = await ajax({
        url,
        type: 'POST',
        //contentType: 'application/x-www-form-urlencoded',
        data: {
          uid: requestUid,
          appkey,
          channelName,
          secureType: token ? '1' : '2', // 安全认证类型：1:安全、2:非安全
          osType: '4', // 系统类型：1:ios、2:aos、3:pc、4:web
          version: SDK_VERSION + '.0' || '1.0.0',
          curtime: `${curtime}`,
          // @ts-ignore
          checksum: md5(appkey + "." + uid + "." + curtime),
          proxy: '1', // 是否需要申请云代理服务，0代表不需要，1代表需要
          needIPV6: '0' //是否需要ipv6，0不需要，1需要
        }
      }) as any;

      this.adapterRef.logger.log('获取到云代理服务相关信息:', JSON.stringify(data))
      this.adapterRef.instance.apiFrequencyControl({
        name: 'setCloudProxyInfo',
        code: data.code === 200 ? 0 : -1,
        param: {
          channelName,
          uid,
          appkey,
          token,
          reason: data.code
        }
      })
      if (data.code === 200) {
        this.adapterRef.channelStatus = 'join'
        const { wsProxyArray, mediaProxyArray, mediaProxyToken, cname, curTime, uid } = data
        if (this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer) {
          this.adapterRef.logger.warn('获取到云代理私有化 webSocketProxyServer:', this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer)
          this.adapterRef.proxyServer.wsProxyArray = [this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer]
        } else {
          this.adapterRef.proxyServer.wsProxyArray = wsProxyArray
        }
        
        if (this.adapterRef.instance._params.neRtcServerAddresses.mediaProxyServer) {
          this.adapterRef.logger.warn('获取到云代理私有化 mediaProxyServer:', this.adapterRef.instance._params.neRtcServerAddresses.mediaProxyServer)
          this.adapterRef.proxyServer.mediaProxyArray = [this.adapterRef.instance._params.neRtcServerAddresses.mediaProxyServer]
          this.adapterRef.proxyServer.mediaProxyToken = 'netease'
          this.adapterRef.proxyServer.credential = 'netease'
        } else {
          this.adapterRef.proxyServer.mediaProxyArray = mediaProxyArray
          this.adapterRef.proxyServer.mediaProxyToken = mediaProxyToken
          this.adapterRef.proxyServer.credential = uid + '/' + curTime
        }
      } else {
        this.adapterRef.logger.log('获取到云代理服务相关信息, 回退')

        /*this.adapterRef.channelStatus = 'leave'
        this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
        this.adapterRef.connectState.curState = 'DISCONNECTED'
        this.adapterRef.connectState.reconnect = false
        this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
        return Promise.reject(`code: ${data.code}, reason: ${data.desc}`)*/
      }
    } catch(e:any) {
      this.adapterRef.logger.log('获取到云代理服务相关信息发生错误:', e.name, e.message, e)
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.connectState.reconnect = false
      this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
      //上报getCloudProxyInfo失败事件
      this.adapterRef.instance.apiFrequencyControl({
        name: 'startProxyServer',
        code: -1,
        param: {
          ...options,
          reason: e.message
        }
      })
      throw new RtcError({
        code: ErrorCode.PROXY_SERVER_ERROR,
        message: 'getCloudProxyInfo: ' + e.message
      })
    }
  }

  /**
   * 多人通话：加入房间
   * 参数 appkey, channelName, uid
   */
  async joinChannel (options:MeetingJoinChannelOptions) {
    try {
      //执行云代理流程
      if(this.adapterRef.proxyServer.enable){
        await this.getCloudProxyInfo(options);
      }
    } catch (e) {
      throw e;
    }

    const {
      appkey,
      channelName,
      uid,
      wssArr = null,
      sessionMode = 'meeting',
      joinChannelRecordConfig,
      joinChannelLiveConfig,
      token = ''
    } = options

    let T1 = Date.now()
    let curtime = +new Date()
    let url = getChannelInfoUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.channelServer) {
      url = this.adapterRef.instance._params.neRtcServerAddresses.channelServer
      this.logger.log('私有化配置的 getChannelInfoUrl: ', url)
    }
    let requestUid = uid
    if (this.adapterRef.channelInfo.uidType === 'string') {
      requestUid = new BigNumber(requestUid)
    }
    Object.assign(this.adapterRef.channelInfo, {
      uid,
      sessionMode,
      appkey
    })
    try{
      let data = await ajax({
        url, //'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action'
        type: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        header: {
          'X-Forwarded-For': this.adapterRef.testConf.ForwardedAddr || ''
        },
        data: {
          uid: requestUid,
          appkey,
          channelName,
          secureType: token ? '1' : '2', // 安全认证类型：1:安全、2:非安全
          osType: '4', // 系统类型：1:ios、2:aos、3:pc、4:web
          mode: 2, // 接口字段和信令字段不一致(3.5.0版本开始只保留会议模式)
          netType: '0', // 先填0吧 微信接口又是异步的 1:2G、2:3G、3:4G、4:wifi、5:有线、0:未知
          version: SDK_VERSION + '.0' || '1.0.0',
          curtime,
          // @ts-ignore
          checksum: token ? token : md5(appkey + "." + uid + "." + curtime),
          webrtc: 1, // 是否与其它端互通
          nrtcg2: 1,
          t1: T1 // 是一个毫秒级的时间戳，若填了这个，服务器会返回t1（客户端请求时间戳）、t2（服务器接收时间戳）、t3（服务器返回时间戳）
        }
      }) as SignalGetChannelInfoResponse;
      let isUidExisted = (uid == '0' || (uid != '0' && !Boolean(uid))) ? false : true;

      this.info.secure = !!token;
      this.info.forward = !!this.adapterRef.testConf.ForwardedAddr
      if (typeof data === "string"){
        // 兼容mockjs
        this.logger.warn(`join 返回值类型为string，应为object。尝试进行强制类型转换。`, data)
        data = JSON.parse(data)
      }else{
        this.logger.log('join 获取到房间信息:', JSON.stringify(data, null, ' '))
      }
      if (data.code === 200) {
        this.adapterRef.channelStatus = 'join'
        const { ips, time } = data
        if (!ips || !ips.uid) {
          this.logger.warn('join 加入频道时服务端未返回uid');
        }
        const maxVideoQuality = (data.config && data.config.quality_level_limit) || 16
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime = Date.now()

        let websocketUrl = ips.webrtcarray && ips.webrtcarray.length && ips.webrtcarray[0]
        if (websocketUrl && this.adapterRef.proxyServer.wsProxyArray) {
          const serverIp =  ips.turnaddrs && ips.turnaddrs.length && ips.turnaddrs[0][0]
          //@ts-ignore
          let port = serverIp.split(':').length > 1 ? serverIp.split(':')[1] : ''
          let serverurl = websocketUrl.split('/').length > 1 ? websocketUrl.split('/')[1] : ''
          if(this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer){
            port = serverurl.split(':')[1]
          }

          if (serverurl && port) {
            //@ts-ignore
            this.adapterRef.proxyServer.wsProxyArray = this.adapterRef.proxyServer.wsProxyArray.map( wsProxy => {
              return wsProxy + '/' + serverurl.split(':')[0] + ':' + port
            })
          } else {
            this.adapterRef.logger.log(`join 云代理无法获取到代理信息, serverurl: ${serverurl}, port: ${port}`);
          }
        }

        Object.assign(this.adapterRef.channelInfo, {
          cid: +data.cid,
          token: data.token,
          turnToken: ips.token,
          channelName,
          wssArr: wssArr || this.adapterRef.proxyServer.wsProxyArray || ips.webrtcarray || [], //优先启用云代理的地址
          // 中继使用 服务器返回以下2个字段则需要走中继
          relayaddrs: this.adapterRef.proxyServer.mediaProxyArray || ips.relayaddrs || null,
          relaytoken: this.adapterRef.proxyServer.mediaProxyToken || ips.relaytoken || null,
          wssArrIndex: 0,
          maxVideoQuality,
          netDetect: false,
          
        }, {
          uid: isUidExisted ? uid : ips.uid,
          sessionMode,
          appkey
        })
        options.uid = options.uid ? options.uid : this.adapterRef.channelInfo.uid
       
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.token = data.token
        this.adapterRef.channelInfo.T4 = Date.now()
        let rtt = (this.adapterRef.channelInfo.T4 - time.t1) - (time.t3 - time.t2)
        this.adapterRef.channelInfo.clientNtpTime = time.t3 + Math.round(rtt / 2)
        this.adapterRef.instance.setSessionConfig(Object.assign({
          maxVideoQuality
        }, joinChannelLiveConfig, joinChannelRecordConfig))
        this.info.relay = ips.relayaddrs && ips.relayaddrs.length > 0
        this.info.turn = ips.turnaddrs && ips.turnaddrs.length > 0
        // 会话建立
        return this.adapterRef.instance.startSession()
      } else {
        const errorMessage = data.desc && data.desc !== '' ? `join: ${data.desc}` : `join: 服务器不允许加入房间, code ${data.code}` 
        this.logger.warn(errorMessage);
        this.adapterRef.channelStatus = 'leave'
        this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
        this.adapterRef.connectState.curState = 'DISCONNECTED'
        this.adapterRef.connectState.reconnect = false
        this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
        //上报login失败事件
        this.adapterRef.instance.apiEventReport('setLogin', {
          a_record: joinChannelRecordConfig.recordAudio,
          v_record: joinChannelRecordConfig.recordVideo,
          record_type: joinChannelRecordConfig.recordType,
          host_speaker: joinChannelRecordConfig.isHostSpeaker,
          result: data.code,
          serverIp: data.ips && data.ips.turnaddrs && data.ips.turnaddrs.length && data.ips.turnaddrs[0]
        })
        return Promise.reject(
          new RtcError({
            code: data.code || ErrorCode.NO_SERVER_ADDRESS,
            message: errorMessage
          })
        )
      }
    } catch(e) {
      this.logger.log('joing 获取到房间信息错误:', e.name, e.message)
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.connectState.reconnect = false
      this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
      //上报login失败事件
      this.adapterRef.instance.apiEventReport('setLogin', {
        a_record: joinChannelRecordConfig.recordAudio,
        v_record: joinChannelRecordConfig.recordVideo,
        record_type: joinChannelRecordConfig.recordType,
        host_speaker: joinChannelRecordConfig.isHostSpeaker,
        result: `join() 语法错误: ${e.message}`,
        serverIp: ''
      })
      throw new RtcError({
        code: ErrorCode.UNKNOWN,
        message: `join() 异常: ${e.message}`
      })
    }
  }

  /**
   * 多人通话：离开房间
   */
  leaveChannel () {
    this.adapterRef.instance.apiEventReport('setLogout', {
      reason: this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason || 0
    })
    if (!this.adapterRef._signalling){
      throw new RtcError({
        code: ErrorCode.NO_SIGNALLING,
        message: 'No _signalling'
      })
    }
    return this.adapterRef._signalling.doSendLogout().then(()=>{
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.connectState.reconnect = false
      this.adapterRef.instance.safeEmit("connection-state-change", this.adapterRef.connectState);
      return this.adapterRef.instance.stopSession()
    })
    
  }

  //添加推流任务
  async addTasks (options:AddTaskOptions) {
    const {
      rtmpTasks = []
    } = options
    let reason = null
    if (!this.adapterRef.channelInfo.cid) {
      reason = 'addTasks: 请在加入房间后进行直播推流操作'
    } else if (!rtmpTasks || !Array.isArray(rtmpTasks) || !rtmpTasks.length){
      reason = 'addTasks: 参数格式错误，rtmpTasks为空，或者该数组长度为空'
    }
    if (reason) {
      this.logger.error(reason)
      throw new RtcError({
        code: ErrorCode.INVALID_OPERATION,
        message: reason
      })
    }
    let url = roomsTaskUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.roomServer) {
      //url = roomsTaskUrl.replace(/[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/, this.adapterRef.instance._params.neRtcServerAddresses.roomServer)
      url = this.adapterRef.instance._params.neRtcServerAddresses.roomServer
      this.logger.log('私有化配置的 roomsTaskUrl: ', url)
    }
    url = `${url}${this.adapterRef.channelInfo.cid}/tasks`
    let requestUid = this.adapterRef.channelInfo.uid
    if (this.adapterRef.channelInfo.uidType === 'string') {
      requestUid = new BigNumber(requestUid)
    }

    for (let i=0; i < rtmpTasks.length; i++) {
      rtmpTasks[i].hostUid = requestUid
      rtmpTasks[i].version = 1
      this.logger.log('rtmpTask: ', JSON.stringify(rtmpTasks[i]))
      const layout = rtmpTasks[i].layout
      layout.users.forEach(user=>{
        if (typeof user.uid === 'string') {
          user.uid = new BigNumber(user.uid)
        }
      }) 
      try {
        const data:any = await ajax({
          url, 
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken
          },
          data: {
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: rtmpTasks[i].hostUid,
            layout: layout,
            config: rtmpTasks[i].config,
            extraInfo: rtmpTasks[i].extraInfo,
          }
        })
        if (data.code === 200) {
          this.logger.log('添加推流任务完成')
        } else {
          this.logger.error('添加推流任务失败: ', data)
          return Promise.reject(
            new RtcError({
              code: ErrorCode.ADD_TASK_FAILED,
              message: 'addTasks: 服务器反馈错误码 ' + data.code
            })
          )
        }
      } catch (e) {
        this.logger.error('addTasks: ', e.name, e.message)
        return Promise.reject(
          new RtcError({
            code: ErrorCode.ADD_TASK_FAILED,
            message: 'addTasks: 异常 ' + e.name + ', ' + e.message
          })
        )
      }
    } 
  }

  //删除推流任务
  async deleteTasks (options:{taskIds:string[]}) {
    const {
      taskIds = []
    } = options
    if (!this.adapterRef.channelInfo.cid) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'deleteTasks',
        code: -1,
        param: JSON.stringify({
          error: '请先加入房间',
          version: 1,
          taskId: taskIds.length ? taskIds[0] : ''
        }, null, ' ')
      })
      this.logger.error('请先加入房间')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'please join room first'
        })
      )
    } else if (!taskIds || !Array.isArray(taskIds) || !taskIds.length){
      this.logger.error('删除推流任务失败: 参数格式错误，taskIds为空，或者该数组长度为空')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'invalid parameter'
        })
      )
    }
    
    let url = roomsTaskUrl
    this.logger.log('roomsTaskUrl: ', roomsTaskUrl)
    if (this.adapterRef.instance._params.neRtcServerAddresses.roomServer) {
      //url = roomsTaskUrl.replace(/[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/, this.adapterRef.instance._params.neRtcServerAddresses.roomServer)
      url = this.adapterRef.instance._params.neRtcServerAddresses.roomServer
      this.logger.log('私有化配置的 roomsTaskUrl: ', url)
    }

    url = `${url}${this.adapterRef.channelInfo.cid}/tasks/delete`
    for (let i=0; i < taskIds.length; i++) {
      this.logger.log('deleteTasks: ', taskIds[i])
      try {
        const data:any = await ajax({
          url, 
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken
          },
          data: {
            taskId: taskIds[i]
          }
        })
        if (data.code === 200) {
          this.logger.log('删除推流任务完成')
          this.adapterRef.instance.apiFrequencyControl({
            name: 'deleteTasks',
            code: 0,
            param: JSON.stringify({
              taskId: taskIds[i]
            }, null, ' ')
          })
          return Promise.resolve()
        } else {
          this.logger.log('删除推流任务请求失败:', JSON.stringify(data))
          this.adapterRef.instance.apiFrequencyControl({
            name: 'deleteTasks',
            code: data.code,
            param: JSON.stringify({
              taskId: taskIds[i]
            }, null, ' ')
          })
          return Promise.reject(
            new RtcError({
              code: ErrorCode.DELETE_TASK_FAILED,
              message: 'delete task failed'
            })
          )
        }
      } catch (e) {
        this.logger.error('deleteTasks发生错误: ', e.name, e.message, e)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'deleteTasks',
          code: -1,
          param: JSON.stringify({
            error: 'code error',
            taskId: taskIds[i]
          }, null, ' ')
        })
        return Promise.reject(
          new RtcError({
            code: ErrorCode.DELETE_TASK_FAILED,
            message: 'delete task failed'
          })
        )
      }
    }
    return
  }

  //更新推流任务
  async updateTasks (options:{rtmpTasks: RTMPTask[]}) {
    const {
      // appkey,
      // channelName,
      // uid,
      // sessionMode,
      rtmpTasks = []
    } = options
    if (!this.adapterRef.channelInfo.cid) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'updateTasks',
        code: -1,
        param: JSON.stringify({
          error: '请先加入房间',
          version: 1,
          taskId: rtmpTasks.length ? rtmpTasks[0].taskId : ''
        }, null, ' ')
      })
      this.logger.error('请先加入房间')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'please join room first'
        })
      )
    } else if (!rtmpTasks || !Array.isArray(rtmpTasks) || !rtmpTasks.length){
      this.logger.error('更新推流任务失败: 参数格式错误，rtmpTasks为空，或者该数组长度为空')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'invalid parameter'
        })
      )
    }

    let url = roomsTaskUrl
    this.logger.log('roomsTaskUrl: ', roomsTaskUrl)
    if (this.adapterRef.instance._params.neRtcServerAddresses.roomServer) {
      //url = roomsTaskUrl.replace(/[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/, this.adapterRef.instance._params.neRtcServerAddresses.roomServer)
      url = this.adapterRef.instance._params.neRtcServerAddresses.roomServer
      this.logger.log('私有化配置的 roomsTaskUrl: ', url)
    }
    url = `${url}${this.adapterRef.channelInfo.cid}/task/update`
    let requestUid = this.adapterRef.channelInfo.uid
    if (this.adapterRef.channelInfo.uidType === 'string') {
      requestUid = new BigNumber(requestUid)
    }

    for (let i = 0; i < rtmpTasks.length; i++) {
      const layout = rtmpTasks[i].layout
      layout.users.forEach(user=>{
        if (typeof user.uid === 'string') {
          user.uid = new BigNumber(user.uid)
        }
      }) 
      try {
        const data:any = await ajax({
          url, 
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken
          },
          data: {
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: requestUid,
            layout: layout,
            config: rtmpTasks[i].config,
          }
        })
        if (data.code === 200) {
          this.logger.log('更新推流任务完成')
          this.adapterRef.instance.apiFrequencyControl({
            name: 'updateTasks',
            code: 0,
            param: JSON.stringify({
              version: 1,
              taskId: rtmpTasks[i].taskId,
              streamUrl: rtmpTasks[i].streamUrl,
              record: rtmpTasks[i].record,
              hostUid: parseInt(rtmpTasks[i].hostUid),
              layout: rtmpTasks[i].layout,
              config: rtmpTasks[i].config,
            }, null, ' ')
          })
          return Promise.resolve()
        } else {
          this.logger.log('更新推流任务失败：', JSON.stringify(data))
          this.adapterRef.instance.apiFrequencyControl({
            name: 'updateTasks',
            code: data.code,
            param: JSON.stringify({
              version: 1,
              taskId: rtmpTasks[i].taskId,
              streamUrl: rtmpTasks[i].streamUrl,
              record: rtmpTasks[i].record,
              hostUid: parseInt(rtmpTasks[i].hostUid),
              layout: rtmpTasks[i].layout,
              config: rtmpTasks[i].config,
            }, null, ' ')
          })
          return Promise.reject(
            new RtcError({
              code: ErrorCode.UPDATE_TASKS_FAILED,
              message: 'update task failed'
            })
          )
        }
      } catch (e) {
        this.logger.error('updateTasks 发生错误: ', e.name, e.message, e)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'updateTasks',
          code: -1,
          param: JSON.stringify({
            error: 'code error',
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: parseInt(rtmpTasks[i].hostUid),
            layout: rtmpTasks[i].layout,
            config: rtmpTasks[i].config,
          }, null, ' ')
        })
        return Promise.reject(
          new RtcError({
            code: ErrorCode.UPDATE_TASKS_FAILED,
            message: 'update task failed'
          })
        )
      }
    }
  }

  destroy() {
    this.logger.log('清除 meeting')
    this._reset()
  }
}

export { Meeting }
