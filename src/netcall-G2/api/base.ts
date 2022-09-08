/* eslint-disable no-undef */
import { Encryption } from '../module/encryption'
import { FormatMedia } from '../module/formatMedia'
import { MediaCapability } from '../module/mediaCapability'
import { Mediasoup } from '../module/mediasoup'
import { Meeting } from '../module/meeting'
import { getParameters } from '../module/parameters'
import { Record } from '../module/record'
import { DataReport } from '../module/report/dataReport'
import { StatsReport } from '../module/report/statsReport'
import { Signalling } from '../module/signalling'
import {
  AdapterRef,
  APIFrequencyControlOptions,
  ClientOptions,
  ILogger,
  JoinChannelRequestParam4WebRTC2,
  MediaTypeShort,
  NeRtcServerAddresses,
  Timer
} from '../types'
import { Client as ICLient } from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import logger, { loglevels } from '../util/log/logger'
import { getSupportedCodecs } from '../util/rtcUtil/codec'
import { Logger } from '../util/webrtcLogger'
import { LocalStream } from './localStream'
import { RemoteStream } from './remoteStream'
import md5 = require('md5')
import { LBSManager } from '../module/LBSManager'
import { RTCEventEmitter } from '../util/rtcUtil/RTCEventEmitter'
import * as env from '../util/rtcUtil/rtcEnvironment'
let clientCnt = 0

/**
 * 基础框架
 */
class Base extends RTCEventEmitter {
  public _params: {
    mode: 'rtc' | 'live'
    appkey: string
    token?: string
    JoinChannelRequestParam4WebRTC2?: JoinChannelRequestParam4WebRTC2
    neRtcServerAddresses?: NeRtcServerAddresses
  }
  public recordManager: {
    record: Record | null
    formatMedia: FormatMedia | null
  }
  public adapterRef: AdapterRef
  private sdkRef: any
  public logStorage: any
  public transportRebuildCnt = 0
  public clientId: number
  public logger: ILogger
  private timeLast: number = Date.now()
  constructor(options: ClientOptions) {
    super()
    this._params = {
      appkey: '',
      mode: 'rtc'
    }
    this.clientId = clientCnt++
    // @ts-ignore typescript成员初始化
    this.adapterRef = {
      // adapter对象内部成员与方法挂载的引用
      datareportCache: [],
      channelInfo: {
        sessionConfig: {}
      },
      //webrtc G2 API上报频控
      apiEvent: {},
      apiEvents: {},
      requestId: {},
      instance: this as unknown as ICLient,
      deviceId: ''
    }

    if (options.debug === true) {
      logger.setLogLevel(loglevels.DEBUG)
    } else if (options.debug === false) {
      if (getParameters().logLevel <= loglevels.WARNING) {
        logger.setLogLevel(loglevels.WARNING)
      }
    }
    this.logger = new Logger({
      tagGen: () => {
        let tag = 'client' + (this.clientId || '')
        //@ts-ignore
        const client: Client = this
        const uid = client.getUid()
        if (uid) {
          tag += '#' + uid
        }
        if (this.adapterRef.connectState.curState !== 'CONNECTED') {
          tag += ' ' + this.adapterRef.connectState.curState
        }
        if (client.destroyed) {
          tag += ' DESTROYED'
        }
        return tag
      }
    })
    this.adapterRef.logger = this.logger
    this.recordManager = {
      record: null,
      formatMedia: null
    }
    this._reset()
    this.adapterRef.encryption = new Encryption(this.adapterRef)

    if (options.debug) {
      getParameters().debugG2 = true
    }
    this.adapterRef.testConf = {} //内部测试配置
    this.sdkRef = options.ref
  }

  _reset() {
    this.sdkRef = null // SDK对象的this指针
    this.adapterRef = {
      // adapter对象内部成员与方法挂载的引用
      datareportCache: [],
      audioAsl: {
        enabled: 'unknown',
        aslActiveNum: -1
      },
      channelInfo: {
        sessionConfig: {}
      },
      userPriority: {
        priority: 100,
        preemtiveMode: false
      },
      proxyServer: {
        enable: false,
        type: 3
      },
      //webrtc G2 API上报频控
      apiEvent: {},
      apiEvents: {},
      requestId: {},
      //@ts-ignore
      instance: this,
      logger: this.logger,
      _enableRts: false //rts是否启动的标志位
    }
    this.adapterRef.mediaCapability = new MediaCapability(this.adapterRef)
    this.adapterRef.encryption = new Encryption(this.adapterRef)

    this._resetState() // 内部状态对象
    this.adapterRef.lbsManager = new LBSManager(this as unknown as ICLient)
    this._destroyModule()
  }

  _getSupportedCodecs() {
    return getSupportedCodecs(...arguments)
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
        adapterRef: this.adapterRef,
        logger: this.logger
      })
    }

    if (!this.adapterRef._mediasoup) {
      this.adapterRef._mediasoup = new Mediasoup({
        adapterRef: this.adapterRef,
        logger: this.logger
      })
    }

    // 原始以及处理过的 stats 数据上报
    if (!this.adapterRef._statsReport) {
      this.adapterRef._statsReport = new StatsReport({
        sdkRef: this.sdkRef,
        adapterRef: this.adapterRef
      })
      this.adapterRef._statsReport.start()
      this.adapterRef._statsReport.startHeartbeat()
    }
  }

  _destroyModule() {
    if (this.adapterRef._meetings) {
      this.adapterRef._meetings.destroy()
      this.adapterRef._meetings = null
    }

    if (this.adapterRef._signalling) {
      this.adapterRef._signalling.destroy()
      this.adapterRef._signalling = null
    }

    if (this.adapterRef._rtsTransport) {
      this.adapterRef._rtsTransport.destroy()
      this.adapterRef._rtsTransport = null
    }

    if (this.adapterRef._mediasoup) {
      this.adapterRef._mediasoup.destroy()
      this.adapterRef._mediasoup = null
    }

    if (this.adapterRef._statsReport) {
      this.adapterRef._statsReport.destroy()
      this.adapterRef._statsReport = null
    }

    if (this.recordManager.formatMedia) {
      this.recordManager.formatMedia.destroy()
      this.recordManager.formatMedia = null
    }

    if (this.recordManager.record) {
      this.recordManager.record.destroy()
      this.recordManager.record = null
    }
  }

  _resetState() {
    this._params.neRtcServerAddresses = {}
    this.adapterRef.channelStatus = 'init'
    this.adapterRef.connectState = {
      prevState: 'DISCONNECTED',
      curState: 'DISCONNECTED',
      reconnect: false
    }
    this.adapterRef.networkQuality = {}
    this.adapterRef.localStream = null
    this.adapterRef.memberMap = {}
    this.adapterRef.remoteStreamMap = {}
    this.adapterRef.netStatusList = []
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
        }
      },
      audioDeviceHasOpened: false, // 是否启用了麦克风
      videoDeviceHasOpened: false, // 是否启用了摄像头
      chromeScreenShareOpened: false, // 是否启用了屏幕共享
      startSessionTime: 0, // 通话开始时间
      endSessionTime: 0, // 通话时间结束
      startPubVideoTime: 0, // 视频发布开始时间
      startPubScreenTime: 0 //屏幕共享发布开始时间
    }

    Object.assign(this.adapterRef, {
      transportStats: {
        //peerConnection状态
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
      localAudioSlaveStats: [],
      localVideoStats: [],
      localScreenStats: [],
      remoteAudioStats: {},
      remoteAudioSlaveStats: {},
      remoteVideoStats: {},
      remoteScreenStats: {}
    })
  }

  setSessionConfig(sessionConfig = {}) {
    if (!this.adapterRef.channelInfo) {
      this.adapterRef.channelInfo = {}
    }

    if (!this.adapterRef.channelInfo.sessionConfig) {
      this.adapterRef.channelInfo.sessionConfig = {}
    }

    this.adapterRef.channelInfo.sessionConfig = Object.assign(
      this.adapterRef.channelInfo.sessionConfig,
      sessionConfig
    )
  }

  // 重连专用状态清理方法
  resetChannel() {
    this.adapterRef.networkQuality = {}
    this.adapterRef.netStatusList = []
    for (let uid in this.adapterRef.remoteStreamMap) {
      const stream = this.adapterRef.remoteStreamMap[uid]
      if (stream.active) {
        stream.active = false
        stream.stop()
        stream.clearRemotePubStatus()
        this.adapterRef.instance.safeEmit('peer-leave', { uid })
      }
    }
    this.adapterRef.memberMap = {}
    this.adapterRef.uid2SscrList = {}
    if (this.adapterRef._mediasoup) {
      this.adapterRef._mediasoup.destroy()
    }
  }

  async startSession(retry = 0) {
    if (retry === 0) {
      this.logger.log(`开始音视频会话`)
    } else {
      this.logger.log(`开始音视频会话：第${retry}次`)
    }
    let { wssArr, cid } = this.adapterRef.channelInfo
    if (!wssArr || wssArr.length === 0) {
      this.logger.error(`没有找到服务器地址: ${JSON.stringify(this.adapterRef.channelInfo)}`)
      this.adapterRef.channelStatus = 'leave'
      let enMessage = `startSession: server address is not found: ${JSON.stringify(
          this.adapterRef.channelInfo
        )}`,
        zhMessage = `startSession: 没有找到服务器地址: ${JSON.stringify(
          this.adapterRef.channelInfo
        )}`,
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.UNKNOWN,
        message,
        advice
      })
    }

    if (!cid) {
      this.logger.error('服务器没有分配cid')
      this.adapterRef.channelStatus = 'leave'
      let enMessage = 'startSession: no cid assigned by server',
        zhMessage = 'startSession: 服务器没有分配cid',
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.UNKNOWN,
        message,
        advice
      })
    }
    this.logger.log(
      `开始连接服务器: ${this.adapterRef.channelInfo.wssArrIndex}, url: ${
        wssArr[this.adapterRef.channelInfo.wssArrIndex]
      }`
    )
    if (this.adapterRef.channelInfo.wssArrIndex >= wssArr.length) {
      this.logger.error('所有的服务器地址都连接失败')
      this.adapterRef.channelInfo.wssArrIndex = 0
      this.adapterRef.channelStatus = 'leave'
      let enMessage = 'startSession: All server addresses failed to connect',
        zhMessage = 'startSession: 所有的服务器地址都连接失败',
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NETWORK_ERROR,
        message,
        advice
      })
    }
    let url = wssArr[this.adapterRef.channelInfo.wssArrIndex]
    if (!this.adapterRef._signalling) {
      let enMessage = 'startSession: signalling server error',
        zhMessage = 'startSession: 信令服务器异常',
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.SIGNALLING_SERVER_ERROR,
        message,
        advice
      })
    }
    try {
      await this.adapterRef._signalling.init(false, false)
    } catch (e) {
      this.adapterRef.channelStatus = 'leave'
      throw e
    }
    //将连接成功的url放置到列表的首部，方便后续的重连逻辑
    const connectUrl = wssArr[this.adapterRef.channelInfo.wssArrIndex]
    wssArr.splice(this.adapterRef.channelInfo.wssArrIndex, 1)
    wssArr.unshift(connectUrl)
    this.adapterRef.channelInfo.wssArrIndex = 0

    // 开始上报format数据
    if (!this.adapterRef._statsReport) {
      let enMessage = 'startSession: no format stats',
        zhMessage = 'startSession: 没有 format 数据',
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.NO_STATS_ERROR,
        message,
        advice
      })
    }
    this.adapterRef._statsReport.statsStart()
  }

  stopSession() {
    this.logger.log('开始清除音视频会话')
    this._destroyModule()
    const localStreams = getParameters().localStreams.filter((stream) => {
      return stream.client === (this as unknown as ICLient) && !stream.destroyed
    })
    if (localStreams.length) {
      if (getParameters().keepLocalstreamOnLeave) {
        this.logger.log('当前模式下离开频道不会销毁localStream')
      } else {
        this.logger.log(`即将销毁${localStreams.length}个localStream`)
        localStreams.forEach((stream) => {
          stream.destroy()
        })
      }
    }
    Object.values(this.adapterRef.remoteStreamMap).forEach((stream) => {
      stream.destroy()
    })
    this.adapterRef.remoteStreamMap = {}
    this.adapterRef.memberMap = {}
    this.adapterRef.uid2SscrList = {}
    this._resetState() // 内部状态对象
  }

  async clearMember(uid: number | string) {
    this.logger.log(`${uid}离开房间`)
    const remotStream = this.adapterRef.remoteStreamMap[uid]
    if (remotStream?.active) {
      const mediaTypeList: MediaTypeShort[] = ['audio', 'video', 'screen', 'audioSlave']
      for (let mediaType of mediaTypeList) {
        if (remotStream.pubStatus[mediaType].producerId) {
          this.adapterRef.instance.safeEmit('stream-removed', {
            stream: remotStream,
            mediaType: mediaType,
            reason: 'onPeerLeave'
          })
        }
      }
      // 为什么需要先移除remoteStream再destroyConsumer：因为可能会先收到onPeerLeave再收到onProducerClose，在destroyConsumer期间产生竞争。
      delete this.adapterRef.remoteStreamMap[uid]
      delete this.adapterRef.memberMap[uid]
      delete this.adapterRef.remoteAudioStats[uid]
      delete this.adapterRef.remoteAudioSlaveStats[uid]
      delete this.adapterRef.remoteVideoStats[uid]
      delete this.adapterRef.remoteScreenStats[uid]
      for (let mediaType of mediaTypeList) {
        if (remotStream.pubStatus[mediaType].consumerId) {
          await this.adapterRef._mediasoup?.destroyConsumer(
            remotStream.pubStatus[mediaType].consumerId,
            remotStream,
            mediaType
          )
        }
      }
      remotStream.active = false
      remotStream.destroy()
      const data =
        this.adapterRef._statsReport &&
        this.adapterRef._statsReport.formativeStatsReport &&
        this.adapterRef._statsReport.formativeStatsReport.firstData.recvFirstData
      if (data && data[uid]) {
        delete data[uid]
      }
    }
    this.adapterRef.netStatusList = this.adapterRef.netStatusList.filter((item, index, list) => {
      return item.uid !== uid
    })
    this.logger.log(`${uid} 离开房间 通知用户`)
    if (this.adapterRef._enableRts) {
      this.adapterRef.instance.emit('rts-peer-leave', { uid })
    } else {
      this.adapterRef.instance.safeEmit('peer-leave', { uid })
    }
  }

  // 设置通话开始时间
  setStartSessionTime() {
    this.adapterRef.state.startSessionTime = Date.now()
    this.adapterRef.deviceId = md5(
      this.adapterRef.channelInfo.cid +
        ':' +
        this.adapterRef.channelInfo.uid +
        ':' +
        this.adapterRef.state.startSessionTime
    )
  }

  // 设置通话结束时间
  setEndSessionTime() {
    if (!this.adapterRef.state.startSessionTime) {
      this.logger.log('AbstractAdapter: setEndSessionTime: startSessionTime为空')
      return
    }
    this.adapterRef.state.endSessionTime = Date.now()
    const sessionDuration =
      this.adapterRef.state.endSessionTime - this.adapterRef.state.startSessionTime
    this.adapterRef.instance.safeEmit('@sessionDuration', sessionDuration)
    this.adapterRef.state.startSessionTime = 0
    this.adapterRef.state.endSessionTime = 0
  }

  //重新建立下行连接
  async reBuildRecvTransport() {
    this.transportRebuildCnt++
    if (this.transportRebuildCnt >= getParameters().maxTransportRebuildCnt) {
      this.logger.error(`reBuildRecvTransport 达到最大重连次数：${this.transportRebuildCnt}`)
      return
    }
    this.logger.warn(`下行通道异常，重新建立 #${this.transportRebuildCnt}`)
    if (!this.adapterRef._mediasoup) {
      let enMessage = 'reBuildRecvTransport:  media server error',
        zhMessage = 'reBuildRecvTransport: 媒体服务异常',
        enAdvice = 'Please contact CommsEase technical support',
        zhAdvice = '请联系云信技术支持'
      let message = env.IS_ZH ? zhMessage : enMessage,
        advice = env.IS_ZH ? zhAdvice : enAdvice
      throw new RtcError({
        code: ErrorCode.MEDIA_SERVER_ERROR,
        message,
        advice
      })
    }
    this.adapterRef.instance.safeEmit('@pairing-reBuildRecvTransport-start')
    if (this.adapterRef._mediasoup._recvTransport) {
      this.adapterRef._mediasoup._recvTransport.close()
      this.adapterRef._mediasoup.getIceStatus('recv')
      this.adapterRef._mediasoup._recvTransport = null
    }
    this.adapterRef._mediasoup.init()
    this.logger.log('下行通道异常, remoteStreamMap', Object.keys(this.adapterRef.remoteStreamMap))
    this.logger.log('this._eventQueue: ', this.adapterRef._mediasoup._eventQueue)
    let hasError = false
    for (const streamId in this.adapterRef.remoteStreamMap) {
      const stream = this.adapterRef.remoteStreamMap[streamId]
      if (!stream) {
        continue
      }
      stream.pubStatus.audio.consumerStatus = 'init'
      stream.pubStatus.video.consumerStatus = 'init'
      stream.pubStatus.screen.consumerStatus = 'init'
      stream.pubStatus.audio.consumerId = ''
      stream.pubStatus.video.consumerId = ''
      stream.pubStatus.screen.consumerId = ''
      this.logger.log('重连逻辑订阅 start：', stream.stringStreamID)
      try {
        await (this as unknown as ICLient).doSubscribe(stream)
      } catch (e: any) {
        this.logger.error('重连逻辑订阅 error: ', e, e.name, e.message)
        hasError = true
        this.adapterRef.instance.safeEmit('@pairing-reBuildRecvTransport-error')
        break
      }
      this.logger.log('重连逻辑订阅 over: ', stream.stringStreamID)
    }
    if (!hasError) {
      this.adapterRef.instance.safeEmit('@pairing-reBuildRecvTransport-success')
    }
  }

  async rtsRequestKeyFrame(stream: RemoteStream) {
    this.logger.log('请求关键帧: ', stream.pubStatus.video.consumerId)
    if (this.adapterRef._signalling) {
      await this.adapterRef._signalling.rtsRequestKeyFrame(stream.pubStatus.video.consumerId)
    }
  }

  /**************************业务类工具******************************/

  //G2 API事件上报频率控制
  apiFrequencyControl(options: APIFrequencyControlOptions) {
    const { name, code, param } = options
    if (!name) return
    if (!this.adapterRef.apiEvent[name]) {
      this.adapterRef.apiEvent[name] = []
      this.adapterRef.apiEvents[name] = []
      this.adapterRef.requestId[name] = 0
    }
    let time = this.adapterRef.channelInfo.clientNtpTime - this.adapterRef.channelInfo.T4
    if (!(time > 0)) {
      time = 0
    }
    let timeNow = Date.now() + time
    if (timeNow <= this.timeLast) {
      // 时序
      timeNow = this.timeLast + 1
    }
    this.timeLast = timeNow
    let length = this.adapterRef.apiEvent[name].length
    if (length < 10) {
      this.adapterRef.apiEvent[name].push({
        cid: this.adapterRef.channelInfo && this.adapterRef.channelInfo.cid,
        uid: this.adapterRef.channelInfo && this.adapterRef.channelInfo.uid,
        code: code,
        name,
        time: timeNow,
        param,
        request_id: this.adapterRef.requestId[name]++
      })
    } else {
      if (
        !this.adapterRef.apiEvent ||
        !this.adapterRef.apiEvent[name] ||
        !this.adapterRef.apiEvent[name].length
      ) {
        let enMessage = `apiFrequencyControl: no apiEvent named ${name}`,
          zhMessage = `apiFrequencyControl: 未找到 name 为 ${name} 的 apiEvent`,
          enAdvice = 'Please contact CommsEase technical support',
          zhAdvice = '请联系云信技术支持'
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.EVENT_UPLOAD_ERROR,
          message,
          advice
        })
      }
      if (!this.adapterRef.apiEvent[name][0].time) {
        let enMessage = `apiFrequencyControl: invalid time`,
          zhMessage = `apiFrequencyControl: 无效的 time`,
          enAdvice = 'Please contact CommsEase technical support',
          zhAdvice = '请联系云信技术支持'
        let message = env.IS_ZH ? zhMessage : enMessage,
          advice = env.IS_ZH ? zhAdvice : enAdvice
        throw new RtcError({
          code: ErrorCode.EVENT_UPLOAD_ERROR,
          message,
          advice
        })
      }
      if (Date.now() - this.adapterRef.apiEvent[name][0].time < 10000) {
        this.adapterRef.requestId[name]++
      } else {
        this.adapterRef.apiEvents[name] = this.adapterRef.apiEvents[name].concat(
          this.adapterRef.apiEvent[name]
        )
        this.adapterRef.apiEvent[name] = []
      }
    }
  }

  //G2 事件上报
  apiEventReport(func: string, value: any) {
    if (!func) return
    let datareport = new DataReport({
      adapterRef: this.adapterRef,
      sdkRef: this.sdkRef
    })
    //@ts-ignore
    datareport[func](
      Object.assign(
        {
          uid: '' + this.adapterRef.channelInfo.uid,
          cid: '' + this.adapterRef.channelInfo.cid,
          time: Date.now()
        },
        value
      )
    )
    if (this.adapterRef.channelInfo.cid && this.adapterRef.channelInfo.uid) {
      datareport.send()
    } else {
      // 没有cid/uid不要上报
      this.adapterRef.datareportCache.push({ func, datareport })
      if (this.adapterRef.datareportCache.length > 20) {
        this.adapterRef.datareportCache.shift()
      }
    }
  }

  /*** 用户成员uid和ssrc对应的list ***/
  // 不支持 firefox
  getUidAndKindBySsrc(ssrc: number) {
    // 发送端
    const mediaTypeList: MediaTypeShort[] = ['audio', 'video', 'screen', 'audioSlave']
    const streamTypeList: ('high' | 'low')[] = ['high', 'low']
    for (let mediaType of mediaTypeList) {
      for (let streamType of streamTypeList) {
        if (
          this.adapterRef._mediasoup?.senderEncodingParameter[mediaType][streamType]?.ssrc === ssrc
        ) {
          return {
            uid: 0,
            kind: mediaType,
            streamType: streamType
          }
        }
      }
    }
    // 接收端是没有大小流的，统一填写大流
    for (let i in this.adapterRef.uid2SscrList) {
      if (this.adapterRef.uid2SscrList[i].audio.ssrc == ssrc) {
        return { uid: i, kind: 'audio', streamType: 'high' }
      } else if (this.adapterRef.uid2SscrList[i].audioSlave.ssrc == ssrc) {
        return { uid: i, kind: 'audioSlave', streamType: 'high' }
      } else if (
        this.adapterRef.uid2SscrList[i].video &&
        this.adapterRef.uid2SscrList[i].video.ssrc == ssrc
      ) {
        return { uid: i, kind: 'video', streamType: 'high' }
      } else if (
        this.adapterRef.uid2SscrList[i].screen &&
        this.adapterRef.uid2SscrList[i].screen.ssrc == ssrc
      ) {
        return { uid: i, kind: 'screen', streamType: 'high' }
      }
    }
    return { uid: 0, kind: '', streamType: 'high' }
  }

  getSsrcByUidAndKind(uid: number | string, kind: MediaTypeShort) {
    return this.adapterRef.uid2SscrList[uid] && this.adapterRef.uid2SscrList[uid][kind]
  }

  addSsrc(uid: number | string, kind: MediaTypeShort, ssrc: number) {
    if (!this.adapterRef.uid2SscrList[uid]) {
      this.adapterRef.uid2SscrList[uid] = {
        audio: { ssrc: 0 },
        audioSlave: { ssrc: 0 },
        video: { ssrc: 0 },
        screen: { ssrc: 0 }
      }
    }
    if (!this.adapterRef.uid2SscrList[uid][kind]) {
      this.adapterRef.uid2SscrList[uid][kind] = { ssrc: ssrc }
    } else {
      this.adapterRef.uid2SscrList[uid][kind].ssrc = ssrc
    }
  }

  removeSsrc(uid: number | string, kind?: MediaTypeShort) {
    if (this.adapterRef.uid2SscrList[uid]) {
      if (kind) {
        if (this.adapterRef.uid2SscrList[uid][kind]) {
          this.adapterRef.uid2SscrList[uid][kind].ssrc = 0
        }
      } else {
        delete this.adapterRef.uid2SscrList[uid]
      }
    }
  }

  isPublished(stream: LocalStream) {
    return (
      stream &&
      this.adapterRef.localStream === stream &&
      ((stream.audio && stream.pubStatus.audio.audio) ||
        (stream.video && stream.pubStatus.video.video) ||
        (stream.screen && stream.pubStatus.screen.screen))
    )
  }

  getPeer(sendOrRecv: string) {
    if (!this.adapterRef._mediasoup) {
      return null
    } else if (sendOrRecv == 'send') {
      return (
        this.adapterRef._mediasoup._sendTransport &&
        this.adapterRef._mediasoup._sendTransport.handler._pc
      )
    } else if (sendOrRecv == 'recv') {
      return (
        this.adapterRef._mediasoup._recvTransport &&
        this.adapterRef._mediasoup._recvTransport.handler._pc
      )
    } else {
      return null
    }
  }

  destroy() {
    this.logger.log('base: destroy!')
    this._reset()
  }
}

export { Base }

/* eslint no-undef: "error" */
/* eslint prefer-promise-reject-errors: 0 */
/* eslint eqeqeq: 0 */
