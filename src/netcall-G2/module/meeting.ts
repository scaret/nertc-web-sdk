import { EventEmitter } from 'eventemitter3'
import { getChannelInfoUrl, getCloudProxyInfoUrl, roomsTaskUrl, SDK_VERSION } from '../Config'
const md5 = require('md5')
import { SignalGetChannelInfoResponse } from '../interfaces/SignalProtocols'
import {
  AdapterRef,
  AddTaskOptions,
  ILogger,
  MeetingJoinChannelOptions,
  MeetingOptions,
  RTMPTask,
  SDKRef
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { JSONBigParse, JSONBigStringify } from '../util/json-big'
import { SimpleBig } from '../util/json-big/SimpleBig'

/**
 * 会控相关
 */
class Meeting extends EventEmitter {
  private sdkRef: SDKRef
  private adapterRef: AdapterRef
  private logger: ILogger
  private info: {
    // 目前仅用于日志打印
    turn: boolean
    relay: boolean
    forward: boolean
    secure: boolean
  } = {
    turn: true,
    relay: false,
    forward: false,
    secure: true
  }
  constructor(options: MeetingOptions) {
    super()

    this._reset()

    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
    this.logger = options.adapterRef.logger.getChild(() => {
      let tag = 'meeting'
      if (!this.info.secure) {
        tag += ' INSECURE'
      }
      if (this.info.forward) {
        tag += ' FORWARD'
      }
      if (!this.info.turn) {
        tag += ' NOTURN'
      }
      if (options.adapterRef.instance?._params?.neRtcServerAddresses?.channelServer) {
        tag += ' PRIVATE'
      }
      return tag
    })
  }

  _reset() {}

  async getCloudProxyInfo(options: MeetingJoinChannelOptions) {
    const { appkey, channelName, uid, token = '' } = options

    this.adapterRef.logger.log('getCloudProxyInfo() url: ', getCloudProxyInfoUrl)
    let url = getCloudProxyInfoUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.cloudProxyServer) {
      url = this.adapterRef.instance._params.neRtcServerAddresses.cloudProxyServer
      this.adapterRef.logger.log('getCloudProxyInfo() 私有化配置cloudProxyServer: ', url)
    }
    //@ts-ignore
    let curtime = Date.parse(new Date()) / 1000
    const md5str = appkey + '.' + uid + '.' + curtime
    try {
      const data = (await this.adapterRef.lbsManager.ajax({
        url,
        type: 'POST',
        header: {
          'Session-Id': this.adapterRef.deviceId || ''
        },
        data: {
          uid: new SimpleBig(uid),
          appkey,
          channelName,
          secureType: token ? '1' : '2', // 安全认证类型：1:安全、2:非安全
          osType: '4', // 系统类型：1:ios、2:aos、3:pc、4:web
          version: SDK_VERSION + '.0' || '1.0.0',
          curtime: `${curtime}`,
          // @ts-ignore
          checksum: md5(appkey + '.' + uid + '.' + curtime),
          proxy: '1', // 是否需要申请云代理服务，0代表不需要，1代表需要
          needIPV6: '0' //是否需要ipv6，0不需要，1需要
        }
      })) as any

      this.adapterRef.logger.log(
        'getCloudProxyInfo() 获取到云代理服务相关信息: ',
        JSONBigStringify(data, null, ' ')
      )
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
        const { wsProxyArray, mediaProxyArray, mediaProxyToken, cname, curTime } = data
        if (this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer) {
          this.adapterRef.logger.warn(
            'getCloudProxyInfo() webSocketProxyServer: ',
            this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer
          )
          this.adapterRef.proxyServer.wsProxyArray = [
            this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer
          ]
        } else {
          this.adapterRef.proxyServer.wsProxyArray = wsProxyArray
        }

        if (this.adapterRef.instance._params.neRtcServerAddresses.mediaProxyServer) {
          this.adapterRef.logger.warn(
            'getCloudProxyInfo() mediaProxyServer:',
            this.adapterRef.instance._params.neRtcServerAddresses.mediaProxyServer
          )
          this.adapterRef.proxyServer.mediaProxyArray = [
            this.adapterRef.instance._params.neRtcServerAddresses.mediaProxyServer
          ]
          this.adapterRef.proxyServer.mediaProxyToken = 'netease'
          this.adapterRef.proxyServer.credential = 'netease'
        } else {
          this.adapterRef.proxyServer.mediaProxyArray = mediaProxyArray
          this.adapterRef.proxyServer.mediaProxyToken = mediaProxyToken
          this.adapterRef.proxyServer.credential = uid + '/' + curTime
        }
      } else {
        this.adapterRef.logger.log('getCloudProxyInfo() 云代理服务相关信息获取失败, 回滚')
      }
    } catch (e: any) {
      this.adapterRef.logger.log('getCloudProxyInfo() 网络请求异常:', e.name, e.message, e)
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.connectState.reconnect = false
      this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)
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
        code: ErrorCode.NETWORK_REQUEST_ERROR,
        message: e.message
      })
    }
  }

  /**
   * 多人通话：加入房间
   * 参数 appkey, channelName, uid
   */
  async joinChannel(options: MeetingJoinChannelOptions) {
    try {
      //执行云代理流程
      if (this.adapterRef.proxyServer.enable) {
        await this.getCloudProxyInfo(options)
      }
    } catch (e) {
      throw e
    }

    const {
      appkey,
      channelName,
      uid,
      wssArr = null,
      sessionMode = 'meeting',
      joinChannelRecordConfig,
      joinChannelLiveConfig,
      token = '',
      permKey = '',
      getChanneInfoResponse
    } = options

    let T1 = Date.now()
    let curtime = +new Date()
    let url = getChannelInfoUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.channelServer) {
      url = this.adapterRef.instance._params.neRtcServerAddresses.channelServer
      this.logger.log('jion() 私有化配置的 getChannelInfoUrl: ', url)
    }
    Object.assign(this.adapterRef.channelInfo, {
      uid,
      sessionMode,
      appkey
    })
    try {
      let data = getChanneInfoResponse
      if (!data) {
        this.adapterRef.state.getChannelInfoRtt = 0
        data = (await this.adapterRef.lbsManager.ajax({
          url, //'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action'
          type: 'POST',
          contentType: 'application/x-www-form-urlencoded',
          header: {
            'Session-Id': this.adapterRef.deviceId || ''
          },
          data: {
            uid: new SimpleBig(uid),
            appkey,
            // https://docs.popo.netease.com/lingxi/9ed5efb9f11a4e3091efbf4837079ad3?header=false#edit
            // since 5.5.0
            platformType: 16,
            permKeySecret: permKey,
            channelName,
            secureType: token ? '1' : '2', // 安全认证类型：1:安全、2:非安全
            osType: '4', // 系统类型：1:ios、2:aos、3:pc、4:web
            mode: 2, // 接口字段和信令字段不一致(3.5.0版本开始只保留会议模式)
            netType: '0', // 先填0吧 微信接口又是异步的 1:2G、2:3G、3:4G、4:wifi、5:有线、0:未知
            version: SDK_VERSION + '.0' || '1.0.0',
            curtime,
            // @ts-ignore
            checksum: token ? token : md5(appkey + '.' + uid + '.' + curtime),
            webrtc: 1, // 是否与其它端互通
            nrtcg2: 1,
            t1: T1 // 是一个毫秒级的时间戳，若填了这个，服务器会返回t1（客户端请求时间戳）、t2（服务器接收时间戳）、t3（服务器返回时间戳）
          }
        })) as SignalGetChannelInfoResponse
        this.adapterRef.state.getChannelInfoTime = Date.now()
        if (!this.adapterRef.state.getChannelInfoRtt) {
          this.adapterRef.state.getChannelInfoRtt =
            this.adapterRef.state.getChannelInfoTime - curtime
        }
      }
      let isUidExisted = uid == '0' || (uid != '0' && !uid) ? false : true

      this.info.secure = !!token
      if (typeof data === 'string') {
        // 兼容mockjs
        this.logger.warn(`join() 返回值类型为string，应为object。尝试进行强制类型转换。`, data)
        data = JSONBigParse(data)
      } else {
        this.logger.log('join() 获取到房间信息:', JSONBigStringify(data, null, ' '))
      }
      if (data.code === 200) {
        this.adapterRef.channelStatus = 'join'
        const { ips, time } = data
        if (!ips || !ips.uid) {
          this.logger.warn('join 加入频道时服务端未返回uid')
        }
        const maxVideoQuality = (data.config && data.config.quality_level_limit) || 16
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime = Date.now()

        let websocketUrl = ips.webrtcarray && ips.webrtcarray.length && ips.webrtcarray[0]
        if (websocketUrl && this.adapterRef.proxyServer.wsProxyArray) {
          const serverIp = ips.turnaddrs && ips.turnaddrs.length && ips.turnaddrs[0][0]
          //@ts-ignore
          let port = serverIp.split(':').length > 1 ? serverIp.split(':')[1] : ''
          let serverurl = websocketUrl.split('/').length > 1 ? websocketUrl.split('/')[1] : ''
          if (this.adapterRef.instance._params.neRtcServerAddresses.webSocketProxyServer) {
            port = serverurl.split(':')[1]
          }

          if (serverurl && port) {
            //@ts-ignore
            this.adapterRef.proxyServer.wsProxyArray = this.adapterRef.proxyServer.wsProxyArray.map(
              (wsProxy) => {
                return wsProxy + '/' + serverurl.split(':')[0] + ':' + port
              }
            )
          } else {
            this.adapterRef.logger.log(
              `join 云代理无法获取到代理信息, serverurl: ${serverurl}, port: ${port}`
            )
          }
        }

        Object.assign(
          this.adapterRef.channelInfo,
          {
            cid: +data.cid,
            permKey,
            token: data.token,
            turnToken: ips.token,
            channelName,
            wssArr:
              wssArr ||
              (this.adapterRef.proxyServer.enable && this.adapterRef.proxyServer.wsProxyArray) ||
              ips.webrtcarray ||
              [], //优先启用云代理的地址
            // 中继使用 服务器返回以下2个字段则需要走中继
            relayaddrs: this.adapterRef.proxyServer.mediaProxyArray || ips.relayaddrs || null,
            relaytoken: this.adapterRef.proxyServer.mediaProxyToken || ips.relaytoken || null,
            wssArrIndex: 0,
            maxVideoQuality,
            netDetect: false
          },
          {
            uid: isUidExisted ? uid : ips.uid,
            sessionMode,
            appkey
          }
        )
        options.uid = options.uid ? options.uid : this.adapterRef.channelInfo.uid

        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.token = data.token
        this.adapterRef.channelInfo.T4 = Date.now()
        let rtt = this.adapterRef.channelInfo.T4 - time.t1 - (time.t3 - time.t2)
        this.adapterRef.channelInfo.clientNtpTime = time.t3 + Math.round(rtt / 2)
        this.adapterRef.instance.setSessionConfig(
          Object.assign(
            {
              maxVideoQuality
            },
            joinChannelLiveConfig,
            joinChannelRecordConfig
          )
        )
        this.info.relay = ips.relayaddrs && ips.relayaddrs.length > 0
        this.info.turn = ips.turnaddrs && ips.turnaddrs.length > 0
        // 会话建立
        return this.adapterRef.instance.startSession()
      } else {
        let errorMessage = `join() 服务器不允许加入房间, code ${data.code}`
        if (data.desc) {
          errorMessage = data.desc
        } else if (data.code === 4003) {
          errorMessage = `房间人数超过最大值。`
        }
        this.logger.error(errorMessage)
        this.adapterRef.channelStatus = 'leave'
        this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
        this.adapterRef.connectState.curState = 'DISCONNECTED'
        this.adapterRef.connectState.reconnect = false
        this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)
        //上报login失败事件
        this.adapterRef.instance.apiEventReport('setLogin', {
          a_record: joinChannelRecordConfig.recordAudio,
          v_record: joinChannelRecordConfig.recordVideo,
          record_type: joinChannelRecordConfig.recordType,
          host_speaker: joinChannelRecordConfig.isHostSpeaker,
          result: data.code,
          permKey: this.adapterRef.channelInfo.permKey,
          serverIp:
            data.ips && data.ips.turnaddrs && data.ips.turnaddrs.length && data.ips.turnaddrs[0],
          desc: errorMessage //websdk使用desc字段描述错误内容
        })
        return Promise.reject(
          new RtcError({
            code: ErrorCode.SERVER_AUTH_ERROR,
            extraCode: data.code,
            message: errorMessage
          })
        )
      }
    } catch (e: any) {
      this.logger.log('joing() 获取到房间信息错误:', e.name, e.message)
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.connectState.reconnect = false
      this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)
      //上报login失败事件
      this.adapterRef.instance.apiEventReport('setLogin', {
        a_record: joinChannelRecordConfig.recordAudio,
        v_record: joinChannelRecordConfig.recordVideo,
        record_type: joinChannelRecordConfig.recordType,
        host_speaker: joinChannelRecordConfig.isHostSpeaker,
        result: -1,
        desc: `join() 内部错误: ${e.name}, ${e.message}`,
        serverIp: ''
      })
      throw new RtcError({
        code: (e.getCode && e.getCode()) || ErrorCode.JOIN_FAILED,
        message: (e.getCode && e.getMessage()) || `join() 内部错误: ${e.name}, ${e.message}`
      })
    }
  }

  /**
   * 多人通话：离开房间
   */
  leaveChannel() {
    if (!this.adapterRef._signalling) {
      return Promise.resolve()
    }
    return this.adapterRef._signalling.doSendLogout().then(() => {
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.connectState.reconnect = false
      this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)
      return this.adapterRef.instance.stopSession()
    })
  }

  //添加推流任务
  async addTasks(options: AddTaskOptions) {
    const { rtmpTasks = [] } = options
    let url = roomsTaskUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.roomServer) {
      url = this.adapterRef.instance._params.neRtcServerAddresses.roomServer
      if (url.substr(-1) !== '/') {
        url += '/'
      }
      this.logger.log('addTasks() 私有化配置的 roomsTaskUrl: ', url)
    }
    url = `${url}${this.adapterRef.channelInfo.cid}/tasks`

    for (let i = 0; i < rtmpTasks.length; i++) {
      rtmpTasks[i].hostUid = new SimpleBig(this.adapterRef.channelInfo.uid) //.toString()
      rtmpTasks[i].version = 1
      this.logger.log('addTasks() rtmpTask: ', JSONBigStringify(rtmpTasks[i]))
      const layout = rtmpTasks[i].layout
      layout.users.forEach((user) => {
        if (typeof user.uid === 'string') {
          user.uid = new SimpleBig(user.uid)
        }
      })
      try {
        const data: any = await this.adapterRef.lbsManager.ajax({
          url,
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken,
            'Session-Id': this.adapterRef.deviceId || ''
          },
          data: {
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: rtmpTasks[i].hostUid,
            layout: layout,
            config: rtmpTasks[i].config,
            extraInfo: rtmpTasks[i].extraInfo || ''
          }
        })
        if (data.code === 200) {
          this.logger.log(`addTasks() 添加第 ${i} 个推流任务完成`)
        } else {
          this.logger.error(`addTasks() 添加第 ${i} 个推流任务失败: `, data)
          return Promise.reject(
            new RtcError({
              code: ErrorCode.ADD_TASK_FAILED_ERROR,
              extraCode: data.code,
              message: `addTasks() 添加推流任务失败: ${data.code}`
            })
          )
        }
      } catch (e: any) {
        this.logger.error('addTasks: ', e.name, e.message)
        return Promise.reject(
          new RtcError({
            code: ErrorCode.ADD_TASK_FAILED_ERROR,
            message: `addTasks() 内部错误: $e.message}`
          })
        )
      }
    }
  }

  //删除推流任务
  async deleteTasks(options: { taskIds: string[] }) {
    const { taskIds = [] } = options
    let url = roomsTaskUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.roomServer) {
      //url = roomsTaskUrl.replace(/[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/, this.adapterRef.instance._params.neRtcServerAddresses.roomServer)
      url = this.adapterRef.instance._params.neRtcServerAddresses.roomServer
      if (url.substr(-1) !== '/') {
        url += '/'
      }
      this.logger.log('deleteTasks() 私有化配置的 roomsTaskUrl: ', url)
    }

    url = `${url}${this.adapterRef.channelInfo.cid}/tasks/delete`
    for (let i = 0; i < taskIds.length; i++) {
      this.logger.log('deleteTasks() taskId: ', taskIds[i])
      try {
        const data: any = await this.adapterRef.lbsManager.ajax({
          url,
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken,
            'Session-Id': this.adapterRef.deviceId || ''
          },
          data: {
            taskId: taskIds[i]
          }
        })
        if (data.code === 200) {
          this.logger.log('删除推流任务完成')
          return Promise.resolve()
        } else {
          this.logger.log('删除推流任务请求失败:', JSONBigStringify(data))
          return Promise.reject(
            new RtcError({
              code: ErrorCode.DELETE_TASK_FAILED_ERROR,
              extraCode: data.code,
              message: `deleteTasks() 删除推流任务失败: ${data.code}`
            })
          )
        }
      } catch (e: any) {
        this.logger.error('deleteTasks发生错误: ', e.name, e.message)
        return Promise.reject(
          new RtcError({
            code: ErrorCode.DELETE_TASK_FAILED_ERROR,
            message: `deleteTasks() 内部错误: $e.message}`
          })
        )
      }
    }
    return
  }

  //更新推流任务
  async updateTasks(options: { rtmpTasks: RTMPTask[] }) {
    const { rtmpTasks = [] } = options
    let url = roomsTaskUrl
    if (this.adapterRef.instance._params.neRtcServerAddresses.roomServer) {
      url = this.adapterRef.instance._params.neRtcServerAddresses.roomServer
      if (url.substr(-1) !== '/') {
        url += '/'
      }
      this.logger.log('updateTasks() 私有化配置的 roomsTaskUrl: ', url)
    }
    url = `${url}${this.adapterRef.channelInfo.cid}/task/update`

    for (let i = 0; i < rtmpTasks.length; i++) {
      const layout = rtmpTasks[i].layout
      layout.users.forEach((user) => {
        if (typeof user.uid === 'string') {
          user.uid = new SimpleBig(user.uid)
        }
      })
      try {
        const data: any = await this.adapterRef.lbsManager.ajax({
          url,
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken,
            'Session-Id': this.adapterRef.deviceId || ''
          },
          data: {
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: new SimpleBig(this.adapterRef.channelInfo.uid),
            layout: layout,
            config: rtmpTasks[i].config
          }
        })
        if (data.code === 200) {
          this.logger.log('updateTasks() 更新推流任务完成')
          return Promise.resolve()
        } else {
          this.logger.log('() 更新推流任务失败：', JSONBigStringify(data))
          return Promise.reject(
            new RtcError({
              code: ErrorCode.UPDATE_TASKS_FAILED_ERROR,
              extraCode: data.code,
              message: `updateTasks() 更新推流任务失败: ${data.code}`
            })
          )
        }
      } catch (e: any) {
        this.logger.error('updateTasks 发生错误: ', e.name, e.message)
        return Promise.reject(
          new RtcError({
            code: ErrorCode.UPDATE_TASKS_FAILED_ERROR,
            message: `updateTasks() 内部错误: $e.message}`
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
