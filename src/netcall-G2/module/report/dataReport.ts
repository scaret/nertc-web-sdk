import { ajax } from '../../util/ajax'
import md5 = require('md5')
import { BUILD, SDK_VERSION } from '../../Config'
import {
  AdapterRef,
  APIEventItem,
  AudioVideoBannedEvent,
  StreamExceptionEvent,
  CommonEvent,
  DataEvent,
  DeviceAbnormalEvent,
  DisconnectEvent,
  FirstPacketSentEvent,
  FunctionEvent,
  HeartbeatEvent,
  LoginEvent,
  LogoutEvent,
  RecvFirstFrameEvent,
  RecvFirstPackageEvent,
  ReloginEvent,
  RequestLBSEvent,
  UserCustomEvent
} from '../../types'
import { USER_AGENT } from '../../util/rtcUtil/rtcEnvironment'
import { processManager } from '../processManager'

let reportUrl = 'https://statistic.live.126.net/statics/report/common/form'

export interface DataReportOptions {
  wssServer?: string
  adapterRef: AdapterRef
  sdkRef?: object
}

class DataReport {
  private configs: DataReportOptions
  private adapterRef: AdapterRef
  private cid: string
  private uid: number | string
  private time: number
  private common: CommonEvent
  private eventKeys: string[]
  private eventMap: {
    [prop: string]: DataEvent
  }
  private api: APIEventItem[]
  private heartbeat: HeartbeatEvent | null
  private networkChange?: DataEvent
  /**
   * @constructor  CommonDataReport
   * @param {Object} options
   * @param {Object} options.sdkRef
   * @param {Object} options.adapterRef
   */
  constructor(options: DataReportOptions) {
    this.configs = options || {}
    const adapterRef = options.adapterRef
    const sdkRef = options.sdkRef || {}
    this.adapterRef = adapterRef
    let instance = adapterRef.instance
    let channelInfo = adapterRef.channelInfo || {}
    let { sessionConfig = {} } = channelInfo
    this.cid = channelInfo.cid || channelInfo.channelId || 0
    this.uid = channelInfo.uid || 0
    let appKeyWebrtc2 = instance._params && instance._params.appkey
    const appKey = appKeyWebrtc2
    this.time = channelInfo.clientNtpTime - channelInfo.T4
    this.common = {
      name: 'common',
      ver: '2.0',
      sdk_type: 'nrtc2',
      session_id: this.adapterRef.deviceId,
      app_key: appKey
    }
    this.eventKeys = []
    this.eventMap = {}
    this.api = []
    this.heartbeat = null
  }
  addEvent(eventName: string, event: DataEvent) {
    if (this.eventKeys.indexOf(eventName) == -1) {
      this.eventKeys.push(eventName)
    }
    if (event.time) {
      event.time = event.time + this.time
    } else {
      this.adapterRef.logger.warn(`addEvent:事件${eventName}没有time属性。使用当前时间戳`)
      event.time = Date.now()
    }
    this.eventMap[eventName] = event
    return this
  }
  updateCommon(commonEvent: CommonEvent) {
    Object.assign(this.common, commonEvent)
    return this
  }

  //事件上报文档：http://doc.hz.netease.com/pages/editpage.action?pageId=330162004

  /**
   * heartbeat定时上报
   * api 上报借助心跳包活(文档：http://doc.hz.netease.com/pages/viewpage.action?pageId=330161811)
   * 通过heatbeat上报，优先上报apiEvents中的事件
   */
  setHeartbeat(heartbeatEvent: HeartbeatEvent) {
    this.heartbeat = heartbeatEvent
    const apiEventKeys = Object.keys(this.adapterRef.apiEvent)
    const apiEventsKeys = Object.keys(this.adapterRef.apiEvents)
    const eventNames = apiEventKeys.concat(
      apiEventsKeys.filter((eventName) => !apiEventKeys.includes(eventName))
    )

    let api: APIEventItem[] = []
    for (let i in eventNames) {
      const eventName = eventNames[i]
      if (this.adapterRef.apiEvents[eventName] && this.adapterRef.apiEvents[eventName].length) {
        api = api.concat(this.adapterRef.apiEvents[eventName])
        this.adapterRef.apiEvents[eventName] = []
      } else if (
        this.adapterRef.apiEvent[eventName] &&
        this.adapterRef.apiEvent[eventName].length
      ) {
        api = api.concat(this.adapterRef.apiEvent[eventName])
        this.adapterRef.apiEvent[eventName] = []
      }
    }
    this.api = this.api.concat(api)
    return this
  }

  /**
   * networkChange事件
   */
  setNetworkChange(networkChangeEvent: DataEvent) {
    this.addEvent('networkChange', networkChangeEvent)
    return this
  }

  /**
   * 通话开始log事件
   */
  setLogin(loginEvent: LoginEvent) {
    // {uid, cid, sdk_ver=SDK_VERSION, platform='Web', app_key=this.common.app_key, meeting_mode=1, a_record, v_record, record_type, host_speaker, server_ip, result, time, signal_time_elapsed, time_elapsed}) {
    loginEvent.sdk_ver = loginEvent.sdk_ver || SDK_VERSION
    loginEvent.platform = loginEvent.platform || 'Web'
    loginEvent.app_key = loginEvent.app_key || this.common.app_key
    loginEvent.meeting_mode = loginEvent.meeting_mode || 1
    loginEvent.model = loginEvent.model
    loginEvent.build = BUILD
    loginEvent.supported_codec_send = this.adapterRef.mediaCapability.supportedCodecSend?.join(',')
    loginEvent.supported_codec_recv = this.adapterRef.mediaCapability.supportedCodecRecv?.join(',')
    loginEvent.preferred_codec_send =
      this.adapterRef.mediaCapability.preferredCodecSend.video?.join(',')
    loginEvent.extra_info = JSON.stringify({
      proc: processManager.processId,
      page: processManager.pageId,
      brow: processManager.browserId,
      userAgent: USER_AGENT
    })
    loginEvent.lbs_addrs = this.adapterRef.lbsManager.getReportField('nrtc')
    this.addEvent('login', loginEvent)
  }

  /**
   * 重连的重新log事件
   *
   */
  setRelogin(reloginEvent: ReloginEvent) {
    this.addEvent('relogin', reloginEvent)
  }

  /**
   * 通过结束事件
   * PAGE_UNLOAD: 30000, //浏览器刷新
    LOGIN_FAILED: 30001, //登录失败，sdk内部错误
    MEDIA_CONNECTION_DISCONNECTED: 30204, //媒体通道连接失败
    SIGNAL_CONNECTION_DISCONNECTED: 30205, //信令通道连接失败
    CLIENT_BANNED: 30206, //客户端被踢
    CHANNEL_CLOSED: 30207, //房间被关闭
    UID_DUPLICATE: 30209, //uid重复
    PERMKEY_TIMEOUT: 30902, // permkey高级权限token超时
   */
  setLogout(logoutEvent: LogoutEvent) {
    this.addEvent('logout', logoutEvent)
  }

  /**
   * 描述设备使用情况，比如“打开成功”，“设备占用”，“设备异常”，"没有权限" “mute/unmute”等等。
   */
  deviceAbnormal(deviceAbnormal: DeviceAbnormalEvent) {
    this.addEvent('deviceAbnormal', deviceAbnormal)
  }

  /**
   * 异常断开通知
   * sendPeerIceFailed
   * recvPeerIceFailed
   * consumeRequestTimeout
   * OnTransportClose
   * OnSignalRestart
   * websocketDisconnect
   *
   */
  setDisconnect(disconnect: DisconnectEvent) {
    this.addEvent('disconnect', disconnect)
  }

  /**
   * 第一个收到后解码数据包
   */
  setRecvFirstFrame(recvFirstFrameEvent: RecvFirstFrameEvent) {
    this.addEvent('recvFirstFrame', recvFirstFrameEvent)
  }

  /**
   * 发送的第一个媒体包
   */
  setSendFirstPackage(firstPacketSent: FirstPacketSentEvent) {
    this.addEvent('firstPacketSent', firstPacketSent)
  }

  /**
   * 收到对端的第一个媒体包
   */
  setRecvFirstPackage(recvFirstPackageEvent: RecvFirstPackageEvent) {
    this.addEvent('recvFirstPackage', recvFirstPackageEvent)
  }

  /**
   * http://doc.hz.netease.com/pages/viewpage.action?pageId=330162004#id-%E4%BA%8B%E4%BB%B6%E4%B8%8A%E6%8A%A5-4.9%E9%80%BB%E8%BE%91function%E4%B8%8A%E6%8A%A5%EF%BC%88G2%E5%AE%A2%E6%88%B7%E7%AB%AF--function%EF%BC%89
   * 逻辑function上报：set_camera、set_mic、pub_second_audio、set_screen
   * set_video_sub、set_audio_sub、set_udioSlave_sub、set_screen_sub
   * set_auido_play、set_audioSlave_play、set_video_play、set_screen_play
   */
  setFunction(functionEvent: FunctionEvent) {
    this.addEvent('function', functionEvent)
  }

  setRequestLbs(requestLbsEvent: RequestLBSEvent) {
    this.addEvent('requestLBS', requestLbsEvent)
  }

  setAudioVideoBanned(audioVideoBannedEvent: AudioVideoBannedEvent) {
    this.addEvent('audioVideoBanned', audioVideoBannedEvent)
  }

  setStreamException(streamExceptionEvent: StreamExceptionEvent) {
    this.addEvent('streamException', streamExceptionEvent)
  }

  setUserCustomEvent(functionEvent: UserCustomEvent) {
    this.addEvent('userCustomEvent', functionEvent)
  }

  reset() {
    this.eventKeys = []
    this.api = []
    this.heartbeat = null
  }
  send(eventKeys?: string[]) {
    let data: {
      common: CommonEvent
      heartbeat?: HeartbeatEvent
      event?: {
        [prop: string]: APIEventItem[]
      }
    } = {
      common: this.common
    }
    if (!eventKeys) {
      eventKeys = this.eventKeys
    }
    if (this.heartbeat) {
      data.heartbeat = this.heartbeat
      if (this.api.length) {
        this.api.forEach((evt) => {
          if (!evt.uid) {
            evt.uid = this.adapterRef.channelInfo && this.adapterRef.channelInfo.uid
          }
          if (!evt.cid) {
            evt.cid = this.adapterRef.channelInfo && this.adapterRef.channelInfo.cid
          }
          if (evt.param && typeof evt.param === 'object') {
            //@ts-ignore
            if (evt.param.clientUid !== undefined) {
              //@ts-ignore
              evt.param.clientUid = evt.uid
            }
          }
        })
        data.event = { apiEvent: this.api }
        this.api = []
      }
    }

    if (eventKeys) {
      if (eventKeys.length) {
        let cnt = 0
        let ret: any = {}
        for (let i = eventKeys.length - 1; i >= 0; i--) {
          const key = eventKeys[i]
          if (this.eventMap[key]) {
            cnt++
            ret[key] = this.eventMap[key]
            delete this.eventMap[key]
            eventKeys.splice(i, 1)
          }
        }
        if (cnt) {
          data.event = ret
        }
      }
    } else if (!this.heartbeat) {
      return this
    }

    //this.adapterRef.logger.log('reportUrl: ', reportUrl)
    if (this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer) {
      //reportUrl = reportUrl.replace("statistic.live.126.net", this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer);
      reportUrl = this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer
      //this.adapterRef.logger.log('私有化配置的 reportUrl: ', reportUrl)
    }
    this.adapterRef.lbsManager
      .ajax({
        type: 'post',
        url: reportUrl,
        data: data,
        header: {
          sdktype: this.common.sdk_type,
          appkey: this.common.app_key,
          platform: 'web',
          sdkver: SDK_VERSION
        }
      })
      .then((data) => {
        if (eventKeys === this.eventKeys) {
          this.reset()
        }
      })
      .catch((err) => {
        this.adapterRef.logger.log('dataReport, send error: ', err.name, err.message, err)
        this.reset()
      })

    return this
  }
}

export { DataReport }
