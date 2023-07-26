import { EventEmitter } from 'eventemitter3'

import { RemoteStream } from '../api/remoteStream'
import { ENGINE_VERSION } from '../Config/index'
import { SignalJoinRes } from '../interfaces/SignalProtocols'
import {
  AdapterRef,
  ILogger,
  MaskUserSetting,
  MediaTypeList,
  MediaTypeShort,
  NetStatusItem,
  SignalingConnectionConfig,
  SignallingOptions,
  Timer
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import { parseBase64 } from '../util/crypto-ts/base64'
import { emptyStreamWith } from '../util/gum'
import { getBrowserInfo, getOSInfo } from '../util/rtcUtil/rtcPlatform'
import { Consumer } from './3rd/mediasoup-client/Consumer'
import { Peer, ProtooNotification } from './3rd/protoo-client'
import { encryptionModeToInt } from './encryption'
import { getParameters } from './parameters'
import { RTSTransport } from './rtsTransport'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { SimpleBig } from '../util/json-big/SimpleBig'
const protooClient = require('./3rd/protoo-client/')

let signallingCnt = 0

class Signalling extends EventEmitter {
  private adapterRef: AdapterRef
  signallingId = signallingCnt++
  private _reconnectionTimer: Timer | null = null
  public _protoo: Peer | null = null
  private _url: string | null = null
  private _resolve: ((data: any) => void) | null = null
  private _reject: ((data: any) => void) | null = null
  private consumers: { [consumerId: string]: Consumer } = {}
  private keepAliveTimer: Timer | null = null
  public browserDevice: String
  private logger: ILogger
  private _reconnectionTimeout: number = 30 * 1000
  private joinTimestamps: number[] = []
  public reconnectionControl: {
    current: SignalingConnectionConfig | null
    next: SignalingConnectionConfig | null
    copynext: SignalingConnectionConfig | null //这里实时存储备份一下next的重连参数，在ice断开重连时用到
  } = {
    current: null,
    next: null,
    copynext: null
  }
  public autoMask: {
    timer: Timer | null
    data: MaskUserSetting[]
  } = {
    timer: null,
    data: []
  }

  constructor(options: SignallingOptions) {
    super()
    this.logger = options.logger.getChild(() => {
      let tag = 'signal'
      if (this.signallingId) {
        tag += this.signallingId
      }
      if (!this._protoo) {
        tag += ' PROTOO_UNINIT'
      } else {
        if (this._protoo.id) {
          tag += '#' + this._protoo.id + '_' + this._protoo._transport?.wsid
        }
        if (!this._protoo.connected) {
          tag += '!connected'
        }
      }
      if (options.adapterRef._signalling?.signallingId !== this.signallingId) {
        tag += ' DETACHED'
      }
      return tag
    })
    this._reset()
    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.browserDevice =
      getOSInfo().osName +
      '-' +
      getBrowserInfo().browserName +
      '-' +
      getBrowserInfo().browserVersion
  }

  async _reset() {
    if (this._reconnectionTimer) {
      clearTimeout(this._reconnectionTimer)
    }
    this._reconnectionTimer = null
    this._destroyProtoo()
    this.reconnectionControl.current = null
    this.reconnectionControl.next = null
    this.reconnectionControl.copynext = null
    this._reconnectionTimeout = 30 * 1000
    this._resolve = null
    this._reject = null
  }

  //isReconnect: 当前是否在重连连接websocket
  //isReconnectMeeting： 是否是websocket链接成功之后，发生的断开重连
  //sdk的重连策略：http://doc.hz.netease.com/pages/editpage.action?pageId=332806101
  init(isReconnect: boolean, isReconnectMeeting: boolean) {
    if (this._reconnectionTimer) return Promise.resolve()

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      if (!isReconnect) {
        this._resolve = resolve
      }
      if (!isReconnect) {
        this._reject = reject
      }

      let connConfig: SignalingConnectionConfig = this.reconnectionControl.next || {
        timeout: isReconnectMeeting
          ? getParameters().reconnectionFirstTimeout
          : getParameters().joinFirstTimeout,
        url: this.adapterRef.channelInfo.wssArr[0],
        serverIndex: 0,
        times: isReconnectMeeting ? 1 : 0,
        isJoinRetry: isReconnect,
        isReconnection: isReconnectMeeting,
        isLastTry: false
      }
      connConfig.isJoinRetry = isReconnect
      connConfig.isReconnection = isReconnectMeeting
      if (
        isReconnectMeeting &&
        this.adapterRef.signalProbeManager.online !== 'unknown' &&
        this.adapterRef.signalProbeManager.getActiveServerCount().cnt === 0
      ) {
        const timeout = 10000
        this.logger.warn(`目前所有服务端不在线，判断为网络断开。等待服务端起上线或 ${timeout}ms`)
        const reason = await this.adapterRef.signalProbeManager.waitForServerActive(timeout)
        if (this.adapterRef._signalling?.signallingId !== this.signallingId) {
          // 此时已退出房间
          return
        } else {
          this.logger.warn(`恢复重连过程。reason:${reason}`)
        }
      }
      for (let i = 0; i < 6; i++) {
        // 最多跳过六次，或遇到当前服务器的最后一次重试
        const serverState = this.adapterRef.signalProbeManager.getServerState(connConfig.url)
        if (!serverState || connConfig.isLastTry) {
          // 目前的服务器不在探测范围，或当前服务器是最后一次重试
          break
        } else if (this.adapterRef.signalProbeManager.getActiveServerCount().cnt > 0) {
          if (!serverState.active) {
            // 有可用的服务器、并且当前服务器不可用
            this.logger.error(
              `重连跳过：当前服务器不可用：${connConfig.url} ${connConfig.serverIndex + 1}/${
                this.adapterRef.channelInfo.wssArr.length
              } ${connConfig.timeout}ms`
            )
            connConfig = this._getNextConnConfig(connConfig)
          } else if (serverState.ping.rtt * 2 > connConfig.timeout) {
            // 有可用的服务器、并且当前服务器rtt不符合条件
            // 实际上至少需要4倍的rtt时间（http 1.1 Upgrade 3rtt，Join消息 1rtt），但这里保守起见仅设置2倍rtt
            this.logger.warn(
              `重连跳过：当前服务器rtt过长：${connConfig.url} ${connConfig.serverIndex + 1}/${
                this.adapterRef.channelInfo.wssArr.length
              } timeout: ${connConfig.timeout}ms, rtt x2: ${serverState.ping.rtt}x2=${
                serverState.ping.rtt * 2
              }ms`
            )
            connConfig = this._getNextConnConfig(connConfig)
          } else {
            // 就用当前服务器
            break
          }
        }
      }

      this.adapterRef.channelInfo.wssArrIndex = connConfig.serverIndex
      if (isReconnect) {
        if (isReconnectMeeting) {
          // 重连期间
          this.adapterRef.logger.error(
            `Signalling 开始尝试第 ${connConfig.serverIndex + 1}/${
              this.adapterRef.channelInfo.wssArr.length
            } 台服务器的第 ${connConfig.times}/${
              getParameters().reconnectionMaxRetry
            } 次重连，退避时间：${connConfig.timeout}毫秒，服务器地址：${connConfig.url}`
          )
        } else {
          // join期间
          this.adapterRef.logger.error(
            `Join: 正在尝试第 ${connConfig.serverIndex + 1}/${
              this.adapterRef.channelInfo.wssArr.length
            } 台服务器的第 ${connConfig.times}/${getParameters().joinMaxRetry} 次重连，退避时间：${
              connConfig.timeout
            }毫秒，服务器地址：${connConfig.url}`
          )
        }
      } else {
        // 第一次join
        this.adapterRef.logger.log(
          `Join: 正在尝试第 ${connConfig.serverIndex + 1} / ${
            this.adapterRef.channelInfo.wssArr.length
          } 个服务器的第 ${connConfig.times} / ${getParameters().joinMaxRetry} 次连接`
        )
      }
      this.reconnectionControl.current = connConfig
      this.reconnectionControl.next = null

      this._init(connConfig.url)

      //开始安排下一次重连的设置
      let nextConnConfig = this._getNextConnConfig(connConfig)
      this.reconnectionControl.next = this.reconnectionControl.copynext = nextConnConfig
      if (this._reconnectionTimer) {
        clearTimeout(this._reconnectionTimer)
      }

      this._reconnectionTimer = setTimeout(() => {
        if (this._reconnectionTimer) {
          clearTimeout(this._reconnectionTimer)
        }
        this._reconnectionTimer = null
        if (this.adapterRef._signalling?.signallingId !== this.signallingId) {
          // 此时已退出房间
          return
        }
        this._destroyProtoo()
        if (isReconnectMeeting) {
          this.adapterRef.instance.safeEmit('@pairing-websocket-reconnection-error')
          this._reconnection()
        } else {
          this._connection()
        }
      }, nextConnConfig.timeout)
    })
  }

  _getNextConnConfig(current: SignalingConnectionConfig): SignalingConnectionConfig {
    let nextConnConfig = Object.assign({}, current)
    if (!current.times) {
      nextConnConfig.times = 1
      nextConnConfig.serverIndex = 1 //首次重连的场景下，next记录下个websocket服务器地址，不记录第一个
    } else {
      nextConnConfig.serverIndex++
    }
    if (nextConnConfig.serverIndex >= this.adapterRef.channelInfo.wssArr.length) {
      nextConnConfig.times++
      nextConnConfig.serverIndex = 0
    }
    if (current.isJoinRetry) {
      nextConnConfig.timeout = getParameters().joinFirstTimeout + (nextConnConfig.times - 1) * 2000
    } else if (current.isReconnection) {
      nextConnConfig.timeout =
        getParameters().reconnectionFirstTimeout + (nextConnConfig.times - 1) * 2000
    }
    nextConnConfig.isJoinRetry = current.isJoinRetry
    nextConnConfig.isReconnection = current.isReconnection
    if (nextConnConfig.isJoinRetry && nextConnConfig.times >= getParameters().joinMaxRetry) {
      nextConnConfig.isLastTry = true
    }
    if (
      nextConnConfig.isReconnection &&
      nextConnConfig.times >= getParameters().reconnectionMaxRetry
    ) {
      nextConnConfig.isLastTry = true
    }
    nextConnConfig.url = this.adapterRef.channelInfo.wssArr[nextConnConfig.serverIndex]
    return nextConnConfig
  }

  async _connection() {
    // _connection指的是join期间的重试
    this._destroyProtoo()
    const prevConfig = this.reconnectionControl.current
    const connConfig = this.reconnectionControl.next
    if (!connConfig) {
      // 不应该走到这里
      this.adapterRef.logger.error('Join结束')
      return
    }
    if (!prevConfig || connConfig.times <= getParameters().joinMaxRetry) {
      this.init(true, false)
    } else {
      this.adapterRef.logger.error(`join() 所有的服务器地址都连接失败, 主动离开房间`)
      this.adapterRef.instance.apiEventReport('setStreamException', {
        name: 'socketError',
        value: `signalling server connection failed(timeout)`
      })
      this.adapterRef.channelInfo.wssArrIndex = 0
      this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
        ErrorCode.SIGNAL_CONNECTION_DISCONNECTED
      this.adapterRef.instance.leave()
      this.adapterRef.instance.safeEmit('error', 'SOCKET_ERROR')
      this._reject &&
        this._reject(
          new RtcError({
            code: ErrorCode.NETWORK_ERROR,
            message: 'join() 所有的服务器地址都连接失败'
          })
        )
    }
  }

  async _reconnection() {
    /*if (this.adapterRef.channelStatus === 'connectioning') {
      return
    }*/
    if (this._reconnectionTimer) return
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'CONNECTING'
    this.adapterRef.connectState.reconnect = true //增加是否在重来的标志位
    if (this.adapterRef.connectState.prevState !== this.adapterRef.connectState.curState) {
      this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)
    }
    this.adapterRef.instance.safeEmit('@pairing-websocket-reconnection-start')
    this._destroyProtoo()

    if (this.adapterRef.connectState.prevState === 'CONNECTED') {
      // 更新上下行状态为unknown，因为此时服务端无法下发上下行状态
      this.adapterRef.netStatusList.forEach((netStatus) => {
        netStatus.uplinkNetworkQuality = 0
        netStatus.downlinkNetworkQuality = 0
      })
      this.adapterRef.instance.safeEmit('network-quality', this.adapterRef.netStatusList)
    }

    for (let uid in this.adapterRef.remoteStreamMap) {
      const remoteStream = this.adapterRef.remoteStreamMap[uid]
      if (remoteStream._play) {
        this.logger.warn('Destroy Remote Player', uid)
        remoteStream._play.destroy()
      }
    }

    if (
      this.reconnectionControl.next &&
      this.reconnectionControl.next.times > getParameters().reconnectionMaxRetry
    ) {
      this.adapterRef.instance.safeEmit('@pairing-websocket-reconnection-skip')
      this.adapterRef.logger.error('所有的服务器地址都连接失败, 主动离开房间')
      this.adapterRef.instance.apiEventReport('setStreamException', {
        name: 'socketError',
        value: `signalling server reconnection failed(timeout)`
      })
      this.adapterRef.channelInfo.wssArrIndex = 0
      this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
        ErrorCode.SIGNAL_CONNECTION_DISCONNECTED
      this.adapterRef.instance.leave()
      this.adapterRef.instance.safeEmit('error', 'SOCKET_ERROR')
    } else {
      this.init(true, true)
    }
  }

  _init(url: string) {
    if (url.indexOf('?') === -1) {
      url += '?'
    }
    this.logger.log('Signalling: init url=', url)
    this.adapterRef.channelInfo._protooUrl = url
    this._url = `${url.indexOf('://') === -1 ? 'wss://' : ''}${url}&cid=${
      this.adapterRef.channelInfo.cid
    }&uid=${this.adapterRef.channelInfo.uid}&deviceid=${this.adapterRef.deviceId}`
    this.logger.log('连接的url: ', this._url)

    const protooTransport = new protooClient.WebSocketTransport(this._url, {
      retry: {
        retries: 0,
        factor: 2,
        minTimeout: 1 * 1000,
        maxTimeout: 2 * 1000,
        forever: false,
        maxRetryTime: 2000
      }
    })
    const _protoo = new protooClient.Peer(protooTransport)
    this._protoo = _protoo
    _protoo.signalling = this
    this.adapterRef.state.signalEstablishTime = Date.now()
    this._bindEvent()
  }

  _bindEvent() {
    this._protoo?.on('failed', this._handleFailed.bind(this))
    this._protoo?.on('close', this._handleClose.bind(this))
    this._protoo?.on('open', this.join.bind(this, this._protoo))
    this._protoo?.on('notification', this._handleMessage.bind(this, this._protoo))
    this._protoo?.on('disconnected', this._handleDisconnected.bind(this, this._protoo))
  }

  //原来叫_unbindEvent
  _destroyProtoo() {
    if (this._protoo) {
      this.logger.debug(`信令通道#${this._protoo.id}_${this._protoo._transport?.wsid} 被主动关闭。`)
      this._protoo.removeAllListeners()
      try {
        if (this._protoo) {
          this._protoo.close()
        }
      } catch (e) {}
      this._protoo = null
    }
  }

  async _handleMessage(_protoo: Peer, notification: ProtooNotification) {
    /*this.logger.log(
      'proto "notification" event [method:%s, data:%o]',
      notification.method, notification.data);*/
    if (_protoo && this._isProtooDetached(_protoo)) {
      return
    }
    switch (notification.method) {
      case 'OnPeerJoin': {
        const { requestId, externData } = notification.data
        this.logger.log('收到OnPeerJoin成员加入消息 uid =', externData.uid)
        /*if (typeof externData.uid === 'string') {
          this.logger.log('对端uid是string类型')
          this.adapterRef.channelInfo.uidType = 'string'
        } else if (typeof externData.uid === 'number') {
          this.logger.log('对端uid是number类型')
          this.adapterRef.channelInfo.uidType = 'string'
          if(externData.uid > Number.MAX_SAFE_INTEGER){
            this.logger.log('对端uid超出number精度')
            externData.uid = new BigNumber(externData.uid)
            externData.uid = externData.uid.toString()
          }
        }*/
        let uid = externData.uid
        if (this.adapterRef.channelInfo.uidType === 'string') {
          uid = uid.toString()
        }

        let remoteStream = this.adapterRef.remoteStreamMap[uid]
        if (!remoteStream) {
          remoteStream = new RemoteStream({
            uid,
            audio: false,
            audioSlave: false,
            video: false,
            screen: false,
            client: this.adapterRef.instance,
            platformType: externData.platformType
          })
          this.adapterRef.remoteStreamMap[uid] = remoteStream
          this.adapterRef.memberMap[uid] = uid
        } else {
          remoteStream.active = true
        }
        this.adapterRef.instance._roleInfo.audienceList[uid] = false
        this.adapterRef.instance.safeEmit('peer-online', { uid })
        if (externData.customData) {
          this.adapterRef.instance.safeEmit('custom-data', {
            uid,
            customData: externData.customData
          })
        }
        break
      }
      case 'OnPeerLeave': {
        const { requestId, externData } = notification.data
        this.logger.log('OnPeerLeave externData =', externData)
        if (externData.userList) {
          externData.userList.forEach((item: any) => {
            let uid = item.uid
            if (this.adapterRef.channelInfo.uidType === 'string') {
              uid = uid.toString()
            }
            this.adapterRef._mediasoup?.removeUselessConsumeRequest(uid, 'all')
            this.adapterRef.instance.clearMember(uid)
            this.adapterRef.instance.removeSsrc(uid)
            delete this.adapterRef.instance._roleInfo.audienceList[uid]
          })
        }
        break
      }
      case 'OnNewProducer': {
        const { requestId, externData } = notification.data
        this.logger.log(
          '收到OnNewProducer发布消息 externData =',
          JSON.stringify(externData.producerInfo)
        )
        let { uid, producerId, mediaType, mute, simulcastEnable } = externData.producerInfo
        if (this.adapterRef.channelInfo.uidType === 'string') {
          uid = uid.toString()
        }
        let mediaTypeShort: MediaTypeShort
        switch (mediaType) {
          case 'video':
            mediaTypeShort = 'video'
            break
          case 'screenShare':
            mediaTypeShort = 'screen'
            break
          case 'audio':
            mediaTypeShort = 'audio'
            break
          case 'subAudio':
            mediaTypeShort = 'audioSlave'
            break
          default:
            this.logger.warn(`OnNewProducer 不支持的媒体类型:${mediaType}, uid ${uid}`)
            return
        }
        let remoteStream = this.adapterRef.remoteStreamMap[uid]
        if (!remoteStream) {
          remoteStream = new RemoteStream({
            uid,
            audio: mediaTypeShort === 'audio',
            audioSlave: mediaTypeShort === 'audioSlave',
            video: mediaTypeShort === 'video',
            screen: mediaTypeShort === 'screen',
            client: this.adapterRef.instance,
            platformType: externData.platformType
          })
          this.adapterRef.remoteStreamMap[uid] = remoteStream
          this.adapterRef.memberMap[uid] = uid
        } else {
          remoteStream.active = true
        }
        remoteStream.muteStatus[mediaTypeShort].send = externData.producerInfo.mute
        if (remoteStream.pubStatus[mediaTypeShort].consumerId) {
          this.adapterRef._mediasoup?.destroyConsumer(
            remoteStream.pubStatus[mediaTypeShort].consumerId,
            remoteStream,
            mediaTypeShort
          )
          //remoteStream.pubStatus[mediaTypeShort].consumerId = '';
        } else {
          this.adapterRef._mediasoup?.removeUselessConsumeRequest(uid, mediaType)
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
          this.adapterRef.instance.emit('rts-stream-added', {
            stream: remoteStream,
            kind: mediaType
          })
        } else {
          this.adapterRef.instance.safeEmit('stream-added', {
            stream: remoteStream,
            mediaType: mediaTypeShort
          })
        }
        if (mute) {
          if (mediaTypeShort === 'audioSlave') {
            this.adapterRef.instance.safeEmit('mute-audio-slave', { uid: remoteStream.getId() })
          } else {
            this.adapterRef.instance.safeEmit(`mute-${mediaTypeShort}`, {
              uid: remoteStream.getId()
            })
          }
        }
        break
      }
      case 'OnProducerClose': {
        const { requestId, code, errMsg, externData } = notification.data
        let { uid, producerId, mediaType, cid } = externData
        if (this.adapterRef.channelInfo.uidType === 'string') {
          uid = uid.toString()
        }
        let remoteStream = this.adapterRef.remoteStreamMap[uid]
        if (remoteStream) {
          this.logger.log(
            `收到OnProducerClose消息 code = ${code}, errMsg = ${errMsg}, uid = ${uid}, mediaType = ${mediaType}, producerId: ${producerId}`
          )
        } else {
          this.logger.warn(
            `收到OnProducerClose消息，但是当前没有该Producer： code = ${code}, errMsg = ${errMsg}, uid = ${uid}, mediaType = ${mediaType}, producerId: ${producerId}`
          )
          return
        }
        let mediaTypeShort: MediaTypeShort
        switch (mediaType) {
          case 'video':
            mediaTypeShort = 'video'
            break
          case 'screenShare':
            mediaTypeShort = 'screen'
            break
          case 'audio':
            mediaTypeShort = 'audio'
            break
          case 'subAudio':
            mediaTypeShort = 'audioSlave'
            break
          default:
            this.logger.warn(`OnProducerClose 不支持的媒体类型 ${mediaType} ${uid}`)
            return
        }

        if (remoteStream.pubStatus[mediaTypeShort].producerId !== producerId) {
          this.logger.log('该 producerId 已经无效，不处理')
          return
        }

        this.adapterRef._mediasoup?.removeUselessConsumeRequest(uid, mediaType)
        if (remoteStream.pubStatus[mediaTypeShort].consumerId) {
          this.adapterRef._mediasoup?.destroyConsumer(
            remoteStream.pubStatus[mediaTypeShort].consumerId,
            remoteStream,
            mediaTypeShort
          )
          remoteStream.pubStatus[mediaTypeShort].consumerId = ''
        }
        this.adapterRef.instance.removeSsrc(uid, mediaTypeShort)
        remoteStream.subStatus[mediaTypeShort] = false
        //@ts-ignore
        remoteStream.pubStatus[mediaTypeShort][mediaTypeShort] = false
        remoteStream[mediaTypeShort] = false
        remoteStream.pubStatus[mediaTypeShort].consumerId = ''
        remoteStream.pubStatus[mediaTypeShort].producerId = ''
        if (mediaTypeShort === 'audio') {
          remoteStream.mediaHelper.audio.micTrack = null
          emptyStreamWith(remoteStream.mediaHelper.audio.audioStream, null)
        } else if (mediaTypeShort === 'audioSlave') {
          remoteStream.mediaHelper.screenAudio.screenAudioTrack = null
          emptyStreamWith(remoteStream.mediaHelper.screenAudio.screenAudioStream, null)
        } else if (mediaTypeShort === 'video') {
          remoteStream.mediaHelper.video.cameraTrack = null
          emptyStreamWith(remoteStream.mediaHelper.video.videoStream, null)
        } else if (mediaTypeShort === 'screen') {
          remoteStream.mediaHelper.screen.screenVideoTrack = null
          emptyStreamWith(remoteStream.mediaHelper.screen.screenVideoStream, null)
        }

        if (this.adapterRef._enableRts) {
          this.adapterRef.instance.emit('rts-stream-removed', { stream: remoteStream })
        } else {
          this.adapterRef.instance.safeEmit('stream-removed', {
            stream: remoteStream,
            mediaType: mediaTypeShort
          })
        }
        break
      }
      case 'OnConsumerClose': {
        const { requestId, code, errMsg, consumerId, producerId } = notification.data
        this.logger.log(
          `chence OnConsumerClose code = ${code} errMsg = ${errMsg} producerId = ${producerId}`
        )
        const consumer = this.consumers[consumerId]
        if (!consumer) break
        consumer.close()
        break
      }
      case 'consumerPaused': {
        const { consumerId } = notification.data
        const consumer = this.consumers[consumerId]
        if (!consumer) break

        // TODO fixme
        // @ts-ignore
        // this.adapterRef.instance.safeEmit('stream-removed', {stream: remoteStream})
        break
      }
      case 'consumerResumed': {
        break
      }
      case 'consumerScore': {
        break
      }
      case 'OnTransportClose': {
        const { requestId, code, errMsg, transportId } = notification.data
        this.logger.warn(
          `chence OnTransportClose: code = ${code}, errMsg = ${errMsg}, transportId = ${transportId}`
        )
        if (
          this.adapterRef._mediasoup?._sendTransport ||
          this.adapterRef._mediasoup?._recvTransport
        ) {
          this.logger.warn('服务器媒体进程crash，上行媒体和下行媒体同时重连')
          this.adapterRef.channelStatus = 'connectioning'
          this.adapterRef.instance.apiEventReport('setDisconnect', {
            reason: 'OnTransportClose',
            ext: '' //扩展可选
          })
          this._reconnection()
        } else {
          this.logger.warn('服务器发送了错误信息')
        }
        break
      }
      // case 'OnConsumerClose': {
      //   const { requestId, code, errMsg, consumerId, producerId } = notification.data
      //   this.logger.warn(
      //     `chence OnConsumerClose: code = ${code}, errMsg = ${errMsg} consumerId = ${consumerId}, producerId = ${producerId}`
      //   )
      //   if (!this.adapterRef._mediasoup) {
      //     throw new RtcError({
      //       code: ErrorCode.MEDIA_SERVER_ERROR,
      //       message: 'media server error 24'
      //     })
      //   }
      //   if (this.adapterRef._mediasoup._recvTransport) {
      //     this.logger.warn('下行媒体同时重连')
      //     this.adapterRef.channelStatus = 'connectioning'
      //     this.adapterRef.instance.apiEventReport('setDisconnect', {
      //       reason: 'OnConsumerClose',
      //       ext: '' //扩展可选
      //     })
      //     this._reconnection()
      //   } else {
      //     this.logger.warn('服务器发送了错误信息')
      //   }
      //   break
      // }
      case 'OnSignalRestart': {
        const { requestId, code, errMsg } = notification.data
        this.logger.warn(`chence OnSignalRestart code = ${code} errMsg = ${errMsg}`)
        this.logger.warn('服务器信令进程crash，重连')
        this.adapterRef.instance.apiEventReport('setDisconnect', {
          reason: 'OnSignalRestart',
          ext: '' //扩展可选
        })
        if (this._protoo?.connected && this.adapterRef.connectState.curState === 'CONNECTED') {
          //sdk内部已经在重连中，不主动执行
        } else {
          this._reconnection()
        }

        break
      }
      case 'OnPermKeyTimeout': {
        this.adapterRef.instance.safeEmit('permkey-will-expire')
        break
      }
      case 'OnPeerClose': {
        //相同UID另外一个连接登录, 这个连接被迫退出
        this.logger.warn(`相同UID在其他地方登录，您被踢出房间`)
        this.adapterRef.instance.safeEmit('uid-duplicate')
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
          ErrorCode.UID_DUPLICATE
        this.adapterRef.instance.leave()
        break
      }
      case 'OnKickOff': {
        let { msg, reason } = notification.data.externData
        this._handleKickedNotify(reason)
        break
      }
      case 'OnUserData': {
        let { type, data } = notification.data.externData
        //console.warn('收到userData通知: ', notification.data.externData)
        if (type === 'StreamStatus') {
          this._handleStreamStatusNotify(data)
        } else if (type === 'NetStatus') {
          this._handleNetStatusNotify(data)
        } else if (type === 'Mute') {
          this.logger.log('mute变更: ', JSON.stringify(data, null, ''))
          this._handleMuteNotify(data)
        } else if (type === 'UserRole') {
          this.logger.log('UserRole变更: ', JSON.stringify(data, null, ''))
          this._handleUserRoleNotify(notification.data.externData)
        } else if (type === 'RtmpTaskStatus') {
          this.logger.log('RtmpTaskStatus变更: ', JSON.stringify(data, null, ''))
          this.adapterRef.instance.safeEmit('rtmp-state', data)
        } else if (type === 'AutoMaskUid') {
          const userData = data as MaskUserSetting
          this.logger.log(`收到打码通知：`, userData.maskUid, '时长', userData.duration, '秒')
          if (userData.maskUid && userData.duration) {
            userData.targetEndMs = Date.now() + userData.duration * 1000
            this.autoMask.data.push(userData)
            this.updateMaskStatus()
          }
        } else if (type === 'MediaCapability') {
          this.logger.warn('MediaCapability房间能力变更: ', JSON.stringify(data, null, ''))
          this.adapterRef.mediaCapability.parseRoom(data)
          this.adapterRef.instance.safeEmit('@mediaCapabilityChange')
          if (
            this.adapterRef._mediasoup &&
            this.adapterRef.mediaCapability.room.videoCodecType &&
            this.adapterRef.localStream
          ) {
            //@ts-ignore
            const targetCodecVideo = this.adapterRef.mediaCapability.getCodecSend(
              'video',
              //@ts-ignore
              this.adapterRef._mediasoup._sendTransport.handler._sendingRtpParametersByKind['video']
            )
            //@ts-ignore
            const targetCodecScreen = this.adapterRef.mediaCapability.getCodecSend(
              'screen',
              //@ts-ignore
              this.adapterRef._mediasoup._sendTransport.handler._sendingRtpParametersByKind['video']
            )
            const switchVideoCodec =
              this.adapterRef._mediasoup._webcamProducerCodec &&
              this.adapterRef._mediasoup._webcamProducerCodec !== targetCodecVideo.codecName
            if (switchVideoCodec) {
              this.logger.warn(
                `将视频的Codec切走：`,
                this.adapterRef._mediasoup._webcamProducerCodec,
                '=>',
                targetCodecVideo.codecName
              )
            }
            const switchScreenCodec =
              this.adapterRef._mediasoup._screenProducerCodec &&
              this.adapterRef._mediasoup._screenProducerCodec !== targetCodecVideo.codecName
            if (switchScreenCodec) {
              this.logger.error(
                `将辅流的Codec切走：`,
                this.adapterRef._mediasoup._screenProducerCodec,
                '=>',
                targetCodecScreen.codecName
              )
            }
            if (switchVideoCodec || switchScreenCodec) {
              // TODO 目前不知道如何在不重新协商的情况下直接切换Codec
              //  Workaround: 主动触发一次重连，导致重新建立RTC连接。
              // @ts-ignore
              if (this._protoo && this._protoo._transport && this._protoo._transport._ws) {
                // @ts-ignore
                this._protoo._transport._ws.close()
              }
            } else {
              this.logger.log(
                `Codec保持不动。video:`,
                this.adapterRef._mediasoup._webcamProducerCodec,
                `, screen:`,
                this.adapterRef._mediasoup._screenProducerCodec
              )
            }
          }
        } else if (type === 'Ability') {
          this._handleAbility(notification.data.externData.data)
        } else if (type === 'ChangeRight') {
          // 服务器禁用音频/视频: 1 禁用   2 取消禁用  0 无需处理
          let uid = data.uid
          let audioDuration, videoDuration
          if (data.audioRight === 1) {
            this.adapterRef.isAudioBanned = true
            this.adapterRef.instance.safeEmit('audioVideoBanned', {
              uid,
              mediaType: 'audio',
              state: true,
              duration: data.audioDuration
            })
          } else if (data.audioRight === 2) {
            this.adapterRef.isAudioBanned = false
            this.adapterRef.instance.safeEmit('audioVideoBanned', {
              uid,
              mediaType: 'audio',
              state: false,
              duration: data.audioDuration
            })
          }

          if (data.videoRight === 1) {
            this.adapterRef.isVideoBanned = true
            this.adapterRef.instance.safeEmit('audioVideoBanned', {
              uid,
              mediaType: 'video',
              state: true,
              duration: data.videoDuration
            })
          } else if (data.videoRight === 2) {
            this.adapterRef.isVideoBanned = false
            this.adapterRef.instance.safeEmit('audioVideoBanned', {
              uid,
              mediaType: 'video',
              state: false,
              duration: data.videoDuration
            })
          }

          if (this.adapterRef.isAudioBanned && this.adapterRef.isVideoBanned) {
            this.adapterRef.instance.apiEventReport('setAudioVideoBanned', {
              name: 'set_mediaRightChange',
              oper: '1',
              isAudioBanned: true,
              isVideoBanned: true
            })
          }

          if (!this.adapterRef.isAudioBanned && this.adapterRef.isVideoBanned) {
            this.adapterRef.instance.apiEventReport('setAudioVideoBanned', {
              name: 'set_mediaRightChange',
              oper: '1',
              isAudioBanned: false,
              isVideoBanned: true
            })
          }

          if (this.adapterRef.isAudioBanned && !this.adapterRef.isVideoBanned) {
            this.adapterRef.instance.apiEventReport('setAudioVideoBanned', {
              name: 'set_mediaRightChange',
              oper: '1',
              isAudioBanned: true,
              isVideoBanned: false
            })
          }

          if (!this.adapterRef.isAudioBanned && !this.adapterRef.isVideoBanned) {
            this.adapterRef.instance.apiEventReport('setAudioVideoBanned', {
              name: 'set_mediaRightChange',
              oper: '1',
              isAudioBanned: false,
              isVideoBanned: false
            })
          }

          if (!this.adapterRef.localStream) {
            return
          }
        } else {
          this.logger.error(`收到OnUserData通知消息 type = ${type}, data: `, data)
        }
      }
    }
  }

  _handleFailed() {
    this.logger.log('Signalling:_handleFailed')
  }

  _handleClose() {}

  _isProtooDetached(_protoo: Peer) {
    if (!this._protoo) {
      this.logger.warn(`Protoo is destroyed: ${_protoo.id}`)
      return true
    } else if (this._protoo.id !== _protoo.id) {
      this.logger.warn(`Protoo is detached: ${_protoo.id} => ${this._protoo.id}`)
      return true
    } else if (this.adapterRef._signalling?.signallingId !== this.signallingId) {
      this.logger.warn(
        `Protoo.signaling is detached: ${this._protoo.id} => ${this.adapterRef._signalling?._protoo?.id}`
      )
      return true
    } else {
      return false
    }
  }

  _handleDisconnected(_protoo: Peer) {
    this.logger.log('Signalling:_handleDisconnected')
    if (
      this._reconnectionTimer &&
      (this.adapterRef.channelStatus === 'connectioning' ||
        this.adapterRef.channelStatus === 'join')
    ) {
      if (_protoo.closed) {
        this.logger.warn(
          `信令通道#${_protoo.id}_${_protoo._transport?.wsid} 在建立过程中被关闭。当前正在重连中，等待下次重连过程。`
        )
      } else {
        this.logger.warn(
          `信令通道#${_protoo.id}_${_protoo._transport?.wsid} 在建立过程中被关闭。信令通道会自动重试。连接地址：${_protoo._transport?._url}`
        )
      }
    } else {
      this.logger.warn(
        `信令通道#${_protoo.id}_${_protoo._transport?.wsid} 收到关闭信号，即将开始重连过程。`
      )
      this.adapterRef.channelStatus = 'connectioning'
      this._reconnection()
    }
    this.adapterRef.instance.apiEventReport('setDisconnect', {
      reason: 'websocketDisconnect', //ws中断
      ext: '' //扩展可选
    })
  }

  async join(_protoo: Peer) {
    if (_protoo && this._isProtooDetached(_protoo)) {
      return
    }

    this.joinTimestamps.push(Date.now())
    if (this.joinTimestamps.length > 4) {
      this.joinTimestamps.shift()
    }
    if (this.joinTimestamps.length >= 4 && this.joinTimestamps[3] - this.joinTimestamps[0] < 1000) {
      this.logger.error(`signaling.join: 在1秒以内连续发生了4次Join事件，异常退出。`)
      return
    }

    this.adapterRef.state.signalOpenTime = Date.now()
    this.adapterRef.state.signalWebsocketOpenRtt =
      this.adapterRef.state.signalOpenTime - this.adapterRef.state.signalEstablishTime
    let gmEnable //加密标识
    if (!this.adapterRef.encryption.encryptionSecret) {
      gmEnable = false
    } else if (this.adapterRef.encryption.encryptionMode === 'none') {
      gmEnable = false
    } else {
      gmEnable = true
    }

    const requestData = {
      method: 'Join',
      permKeySecret: this.adapterRef.channelInfo.permKey,
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      supportStdRed: true,
      supportTurn: !this.adapterRef.proxyServer.enable,
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
          name: getBrowserInfo().browserName,
          version: `${getBrowserInfo().browserVersion}`
        },
        customData: this.adapterRef.channelInfo.customData || '',
        gmEnable: gmEnable,
        gmMode: encryptionModeToInt(this.adapterRef.encryption.encryptionMode),
        gmKey: this.adapterRef.encryption.encryptionSecret,
        customEncryption: getParameters().forceCustomEncryptionOff
          ? false
          : this.adapterRef.encryption.encodedInsertableStreams,
        userPriority: this.adapterRef.userPriority
      }
    }

    if (this.adapterRef._signalling?.signallingId === this.signallingId) {
      this.logger.log('Signalling: socket连接成功，开始发送Join请求')
      //join之前，清除之前可能存在的request
      this._protoo?.clear()
    } else {
      // 此时虽然收到了websocket open事件，但用户或者我们可能已经调用了leave，
      return
    }

    try {
      let response = null
      let thisProtoo = this._protoo
      try {
        const start = Date.now()
        const joinPromise = this._protoo?.request('Join', requestData)
        //为了不阻塞Join流程，信令探测服务在Join消息发出后再启动
        if (!this.adapterRef.signalProbeManager.worker && getParameters().signalProbeEnabled) {
          this.adapterRef.signalProbeManager.start(this.adapterRef.channelInfo.wssArr)
        }
        response = (await joinPromise) as SignalJoinRes
        this.adapterRef.state.signalJoinResTime = Date.now()
        this.adapterRef.state.signalJoinMsgRtt = this.adapterRef.state.signalJoinResTime - start
      } catch (e: any) {
        if (thisProtoo !== this._protoo) {
          this.logger.warn(`Login 过期的信令通道消息：【${e.name}】`, e.message)
          return
        } else {
          this.logger.warn('Login request error: ', e.message)
          throw new RtcError({
            code: ErrorCode.LOGIN_REQUEST_ERROR,
            message: e.message
          })
        }
      }
      if (this._isProtooDetached(_protoo)) {
        return
      }
      //this.logger.log('Signalling:Join请求 收到ack -> ', JSON.stringify(response, (k, v)=>{return k === "edgeRtpCapabilities" ? null : v;}));
      this.logger.log('Signalling:Join请求收到response')

      if (response.code != 200) {
        let errMsg = 'Unknown Error'
        if (response.externData) {
          errMsg = response.externData.errMsg
        } else if (response.errMsg) {
          errMsg = response.errMsg
        }
        this.logger.error(`Signalling: 加入房间失败, code = ${response.code}, reason = ${errMsg}`)
        this.adapterRef.instance.safeEmit('@pairing-websocket-reconnection-error')
        this._joinFailed(response.code, errMsg)
        return
      }
      let uid = this.adapterRef.channelInfo.uid
      if (response.PermKey) {
        this.adapterRef.permKeyInfo = response.PermKey
      }
      // 服务器禁用音视频: 1 禁用   0 和 2 取消禁用
      if (response.externData.audioRight === 1) {
        this.adapterRef.isAudioBanned = true
        this.adapterRef.instance.safeEmit('audioVideoBanned', {
          uid,
          mediaType: 'audio',
          state: true
        })
      } else {
        this.adapterRef.isAudioBanned = false
      }

      if (response.externData.videoRight === 1) {
        this.adapterRef.isVideoBanned = true
        this.adapterRef.isAudioBanned = true
        this.adapterRef.instance.safeEmit('audioVideoBanned', {
          uid,
          mediaType: 'audio',
          state: true
        })
      } else {
        this.adapterRef.isVideoBanned = false
      }

      this.adapterRef.instance.apiEventReport('setAudioVideoBanned', {
        name: 'set_mediaRightChange',
        oper: '1',
        isAudioBanned: !!this.adapterRef.isAudioBanned,
        isVideoBanned: !!this.adapterRef.isVideoBanned
      })

      if (this.adapterRef.isAudioBanned && this.adapterRef.isVideoBanned) {
        this.logger.warn('服务器禁止发送音频流')
      }

      if (this._reconnectionTimer) {
        clearTimeout(this._reconnectionTimer)
        this._reconnectionTimer = null
      }

      this.reconnectionControl.next = null
      this.logger.log('Signalling: 加入房间成功')
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'CONNECTED'

      if (getParameters().forceBWE === 'no') {
        if (response.preferRemb) {
          this.logger.log('服务端配置bwe：上行使用remb')
          this.adapterRef.preferRemb = true
        } else {
          this.logger.log('服务端配置bwe：上行使用transport-cc')
          this.adapterRef.preferRemb = false
        }
      } else if (
        (this.adapterRef.preferRemb || response.preferRemb) &&
        getParameters().forceBWE === 'transport-cc'
      ) {
        this.logger.warn(
          `强行使用transport-cc。忽略服务端配置bwe：preferRemb: ${response.preferRemb}`
        )
        this.adapterRef.preferRemb = false
      } else if (getParameters().forceBWE === 'remb') {
        this.logger.warn(`强行使用REMB。忽略服务端配置bwe：preferRemb: ${response.preferRemb}`)
        this.adapterRef.preferRemb = true
      }

      this.adapterRef.audioAsl.enabled = response.supportWebAsl ? 'yes' : 'no'
      this.adapterRef.audioAsl.aslActiveNum = response.aslActiveNum
      if (response.supportWebAsl) {
        if (response.aslActiveNum) {
          this.logger.log(`aslActiveNum数量： ${response.aslActiveNum}`)
        } else {
          this.logger.warn(`服务端支持ASL但没有返回ASL数量`)
        }
      } else {
        this.logger.log(`服务端未开启ASL`)
      }
      this.adapterRef.instance.safeEmit('aslStatus', {
        enabled: !!response.supportWebAsl,
        aslActiveNum: response.aslActiveNum
      })

      if (this.adapterRef.channelStatus === 'connectioning') {
        this.adapterRef.connectState.reconnect = true
        this.logger.log('Signalling: 重连成功, 清除之前的媒体的通道')
        this.adapterRef.channelStatus = 'join'
        this.adapterRef.instance.apiEventReport('setRelogin', {
          a_record: this.adapterRef.channelInfo.sessionConfig.recordAudio,
          v_record: this.adapterRef.channelInfo.sessionConfig.recordVideo,
          record_type: this.adapterRef.channelInfo.sessionConfig.recordType,
          host_speaker: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,
          permKey: this.adapterRef.channelInfo.permKey,
          result: 0,
          reason: 1,
          server_ip: this.adapterRef.channelInfo._protooUrl
        })

        this.adapterRef.instance.resetChannel()
        if (!this.adapterRef._mediasoup) {
          throw new RtcError({
            code: ErrorCode.UNKNOWN_TYPE_ERROR,
            message: 'signalling_join: 媒体服务异常 1'
          })
        }
        this.adapterRef._mediasoup._edgeRtpCapabilities = response.edgeRtpCapabilities
        this.adapterRef.mediaCapability.parseRoom(response.externData.roomCapability)
        this.adapterRef.instance.safeEmit('@mediaCapabilityChange')
        await this.adapterRef._mediasoup.init()

        if (this.adapterRef.localStream) {
          if (
            this.adapterRef.localStream.audio ||
            this.adapterRef.localStream.video ||
            this.adapterRef.localStream.screen ||
            this.adapterRef.localStream.screenAudio ||
            getParameters().allowEmptyMedia ||
            //@ts-ignore
            this.adapterRef.localStream.audioSlave
          ) {
            this.logger.log(
              `重连成功，重新publish本端流: audio ${this.adapterRef.localStream.hasAudio()}, video ${this.adapterRef.localStream.hasVideo()}, screen ${this.adapterRef.localStream.hasScreen()}, audioSlave ${this.adapterRef.localStream.hasAudioSlave()}`
            )
            this.adapterRef.instance.doPublish(this.adapterRef.localStream)
          } else {
            this.logger.log(`重连成功，当前没有媒体流，无需发布`)
          }
        } else {
          this.logger.log('重连成功，当前在未发布状态，无需发布')
        }
      } else {
        this.adapterRef.connectState.reconnect = false
        const webrtc2Param = this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2
        const currentTime = Date.now()
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.joinedSuccessedTime =
          currentTime
        this.adapterRef.instance.apiEventReport('setLogin', {
          a_record: this.adapterRef.channelInfo.sessionConfig.recordAudio,
          v_record: this.adapterRef.channelInfo.sessionConfig.recordVideo,
          record_type: this.adapterRef.channelInfo.sessionConfig.recordType,
          host_speaker: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,
          permKey: this.adapterRef.channelInfo.permKey,
          result: 0,
          server_ip: this.adapterRef.channelInfo._protooUrl,
          signalling_rtt: this.adapterRef.state.signalJoinMsgRtt, // joinchannel 耗时
          signalling_time: webrtc2Param.startWssTime - webrtc2Param.startJoinTime, // getchannleinfo 耗时
          time_elapsed: currentTime - webrtc2Param.startJoinTime, // 总耗时
          model: this.browserDevice
        })
        if (!this.adapterRef._mediasoup) {
          throw new RtcError({
            code: ErrorCode.UNKNOWN_TYPE_ERROR,
            message: 'signalling_join: 媒体服务异常 2'
          })
        }
        this.adapterRef._mediasoup._edgeRtpCapabilities = response.edgeRtpCapabilities
        this.adapterRef.mediaCapability.parseRoom(response.externData.roomCapability)
        this.adapterRef.instance.safeEmit('@mediaCapabilityChange')
        await this.adapterRef._mediasoup.init()
      }

      this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)
      if (this.adapterRef._enableRts) {
        await this.createRTSTransport()
        this.adapterRef.instance.emit('connected')
      }
      this.logger.log(
        `Signalling: 查看房间其他人的发布信息: ${JSON.stringify(response.externData.userList)}`
      )
      const eventsAfterJoinRes: { eventName: string; eventData: any }[] = []
      if (
        response.externData !== undefined &&
        response.externData.userList &&
        response.externData.userList.length
      ) {
        //兼容喜欢把箭头函数transpile成ES5的客户
        let that = this
        for (const peer of response.externData.userList) {
          let uid = peer.uid
          if (this.adapterRef.channelInfo.uidType === 'string') {
            uid = uid.toString()
          }
          let remoteStream = this.adapterRef.remoteStreamMap[uid]
          if (!remoteStream) {
            remoteStream = new RemoteStream({
              uid: uid,
              audio: false,
              audioSlave: false,
              video: false,
              screen: false,
              client: this.adapterRef.instance,
              platformType: peer.platformType
            })
            this.adapterRef.remoteStreamMap[uid] = remoteStream
            this.adapterRef.memberMap[uid] = '' + uid
            eventsAfterJoinRes.push({
              eventName: 'peer-online',
              eventData: { uid }
            })
          } else {
            remoteStream.active = true
            this.adapterRef.memberMap[uid] = '' + uid
            eventsAfterJoinRes.push({
              eventName: 'peer-online',
              eventData: { uid }
            })
          }
          if (peer.customData) {
            eventsAfterJoinRes.push({
              eventName: 'custom-data',
              eventData: { uid, customData: peer.customData }
            })
          }

          if (peer.producerInfoList) {
            for (const peoducerInfo of peer.producerInfoList) {
              const { mediaType, producerId, mute, simulcastEnable } = peoducerInfo
              let mediaTypeShort: MediaTypeShort
              switch (mediaType) {
                case 'video':
                  mediaTypeShort = 'video'
                  break
                case 'screenShare':
                  mediaTypeShort = 'screen'
                  break
                case 'audio':
                  mediaTypeShort = 'audio'
                  break
                case 'subAudio':
                  mediaTypeShort = 'audioSlave'
                  break
                default:
                  this.logger.warn(`join: 不支持的媒体类型 ${mediaType} ${uid}`)
                  continue
              }
              remoteStream[mediaTypeShort] = true
              //@ts-ignore
              remoteStream['pubStatus'][mediaTypeShort][mediaTypeShort] = true
              remoteStream['pubStatus'][mediaTypeShort]['producerId'] = producerId
              remoteStream['pubStatus'][mediaTypeShort]['mute'] = mute
              remoteStream['muteStatus'][mediaTypeShort].send = mute
              remoteStream['pubStatus'][mediaTypeShort]['simulcastEnable'] = simulcastEnable

              that.logger.log(
                `Signalling: 通知 ${remoteStream.getId()} 发布信息: ${JSON.stringify(
                  remoteStream.pubStatus,
                  null,
                  ''
                )}`
              )
              if (that.adapterRef._enableRts && that.adapterRef._rtsTransport) {
                eventsAfterJoinRes.push({
                  eventName: 'rts-stream-added',
                  eventData: {
                    stream: remoteStream,
                    kind: mediaTypeShort
                  }
                })
              } else if (
                remoteStream.pubStatus.audio.audio ||
                remoteStream.pubStatus.video.video ||
                remoteStream.pubStatus.screen.screen ||
                remoteStream.pubStatus.audioSlave.audioSlave
              ) {
                eventsAfterJoinRes.push({
                  eventName: 'stream-added',
                  eventData: {
                    stream: remoteStream,
                    mediaType: mediaTypeShort
                  }
                })
              }

              if (mute) {
                if (mediaTypeShort === 'audioSlave') {
                  eventsAfterJoinRes.push({
                    eventName: `mute-audio-slave`,
                    eventData: {
                      uid: remoteStream.getId()
                    }
                  })
                } else {
                  eventsAfterJoinRes.push({
                    eventName: `mute-${mediaTypeShort}`,
                    eventData: {
                      uid: remoteStream.getId()
                    }
                  })
                }
              }
            }
          }
        }
        for (let uid in this.adapterRef.remoteStreamMap) {
          let remoteStream = this.adapterRef.remoteStreamMap[uid]
          if (!remoteStream.active) {
            this.logger.warn(`重连期间远端流停止发布：${uid}`)
            delete this.adapterRef.remoteStreamMap[uid]
          }
        }
      }

      const instance = this.adapterRef.instance
      setTimeout(() => {
        // join response中的事件应该延迟到join发生后再抛出
        for (let i = 0; i < eventsAfterJoinRes.length; i++) {
          const eventName = eventsAfterJoinRes[i].eventName
          const eventData = eventsAfterJoinRes[i].eventData
          if (instance) {
            if (eventName === 'stream-added') {
              if (eventData.mediaType === 'audio') {
                if (
                  instance.adapterRef.state.signalAudioAddedTime <
                  instance.adapterRef.state.signalOpenTime
                ) {
                  instance.adapterRef.state.signalAudioAddedTime = Date.now()
                }
              } else if (eventData.mediaType === 'video') {
                if (
                  instance.adapterRef.state.signalVideoAddedTime <
                  instance.adapterRef.state.signalOpenTime
                ) {
                  instance.adapterRef.state.signalVideoAddedTime = Date.now()
                }
              }
            }
            instance.safeEmit(eventName, eventData)
          }
        }
      }, 0)

      this.adapterRef.state.signalJoinSuccessTime = Date.now()
      if (this._resolve) {
        this.logger.log('加入房间成功, 反馈通知')
        this._resolve(response)
        this._resolve = null
        this._reject = null
      } else {
        // 重连成功
        this.adapterRef.instance.safeEmit('@pairing-websocket-reconnection-success')
      }
      this.doSendKeepAliveTask()
    } catch (e: any) {
      this.logger.error('Signalling: 登录流程内部错误: ', e.message)
      //尽可能将try actch 捕捉的异常上报
      this._joinFailed(-1, e.message || 'LOGIN_ERROR')
    }
  }

  _joinFailed(reasonCode: string | undefined | number, errMsg: string) {
    this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
    this.adapterRef.connectState.curState = 'DISCONNECTED'
    this.adapterRef.connectState.reconnect = false
    this.adapterRef.channelStatus = 'init'
    this.adapterRef.instance.safeEmit('connection-state-change', this.adapterRef.connectState)

    if (reasonCode === 4009) {
      this.adapterRef.instance.safeEmit('crypt-error', {
        cryptType: this.adapterRef.encryption.encryptionMode
      })
    }

    //上报login事件
    const currentTime = Date.now()
    const webrtc2Param = this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2
    this.adapterRef.instance.apiEventReport('setLogin', {
      a_record: this.adapterRef.channelInfo.sessionConfig.recordAudio,
      v_record: this.adapterRef.channelInfo.sessionConfig.recordVideo,
      record_type: this.adapterRef.channelInfo.sessionConfig.recordType,
      host_speaker: this.adapterRef.channelInfo.sessionConfig.isHostSpeaker,
      permKey: this.adapterRef.channelInfo.permKey,
      result: reasonCode,
      server_ip: this.adapterRef.channelInfo._protooUrl,
      signalling_rtt: this.adapterRef.state.signalJoinMsgRtt, // joinchannel 耗时
      signalling_time: webrtc2Param.startWssTime - webrtc2Param.startJoinTime, // getchannleinfo 耗时
      time_elapsed: currentTime - webrtc2Param.startJoinTime, // 总耗时
      model: this.browserDevice,
      desc: errMsg || '' //websdk使用desc字段描述错误内容
    })

    //重连时的login失败，执行else的内容
    if (this._reject) {
      this.logger.error('加入房间失败, 反馈通知')
      this._reject(
        //server返回的错误码由extraCode反馈
        new RtcError({
          code: ErrorCode.SERVER_AUTH_ERROR,
          extraCode: reasonCode,
          message: errMsg || 'join failed'
        })
      )

      this._resolve = null
      this._reject = null
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer)
        this.keepAliveTimer = null
      }
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.instance.stopSession()
    } else {
      switch (errMsg) {
        case 'room not found':
          this.logger.error(
            '网络重连时，加入房间失败，主动离开。重连失败原因：',
            errMsg,
            '，这通常是因为房间内其他人都已离开，房间关闭引起的'
          )
          break
        default:
          this.logger.error('网络重连时，加入房间失败，主动离开。重连失败原因：', errMsg)
      }
      this.adapterRef.instance.safeEmit('error', 'RELOGIN_ERROR')
      this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
        ErrorCode.LOGIN_FAILED
      this.adapterRef.instance.leave()
    }
  }

  doSendKeepAliveTask() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    let isSendingKeepAlive = false
    this.keepAliveTimer = setInterval(async () => {
      if (!isSendingKeepAlive) {
        // 上一个保活包没返回的情况下，下一个包没必要发
        // 因为tcp是顺序发送的，上一个包没到，下一个包不可能到
        isSendingKeepAlive = true
        await this.doSendKeepAlive()
        isSendingKeepAlive = false
      }
    }, 6 * 1000)
  }

  async doSendKeepAlive() {
    if (!this._protoo?.connected) return
    const transportId = `#${this._protoo.id}_${this._protoo._transport?.wsid}`
    const start = Date.now()
    try {
      const response = await this._protoo.request('Heartbeat')
    } catch (e: any) {
      this.logger.error(`信令包保活失败, reason: ${e.message}, ${Date.now() - start}ms`)
    }
  }

  async createRTSTransport() {
    this.logger.log(`createRTSTransport()`)
    if (!this._protoo) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: 'createRTSTransport: _protoo 未找到'
      })
    } else if (!this._url) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: 'createRTSTransport: _url 未找到'
      })
    }

    try {
      const response = await this._protoo.request('CreateWsTrasnport')
      this.logger.warn('CreateWsTrasnport response: ', JSON.stringify(response, null, ''))
      const { code, errMsg, transportId, wsPort = '6666' } = response
      if (code == 200) {
        if (this.adapterRef._rtsTransport) {
          this.logger.log('CreateWsTrasnport: 需要更新')
          this.adapterRef._rtsTransport.destroy()
        }
        this.logger.log('CreateWsTrasnport: 开始创建')
        //url = `wss://${url}&cid=${this.adapterRef.channelInfo.cid}&uid=${this.adapterRef.channelInfo.uid}`
        this.adapterRef._rtsTransport = new RTSTransport({
          url: this._url.replace(/:\d+/, `:${wsPort}`) + `&transportId=${transportId}`,
          transportId,
          port: wsPort,
          adapterRef: this.adapterRef
        })
      } else {
        this.logger.error(`createWsTrasnport failed, code: ${code}, reason: ${errMsg}`)
      }
    } catch (e: any) {
      this.logger.error('createRTSTransport failed:', e.name, e.message)
      throw e
    }
  }

  async rtsRequestKeyFrame(consumerId: string) {
    this.logger.log(`rtsRequestKeyFrame(): `, consumerId)
    if (!this._protoo) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: 'rtsRequestKeyFrame: _protoo 未找到'
      })
    } else if (!consumerId) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: 'rtsRequestKeyFrame: consumerId 未找到'
      })
    }
    try {
      const response = await this._protoo.request('RequestKeyFrame', { consumerId })
      this.logger.warn('rtsRequestKeyFrame response: ', response)
      let { code, errMsg } = response
      if (code == 200) {
        this.logger.log('RTS 关键帧请求完成')
      } else {
        this.logger.error(`RTS 关键帧请求失败, code: ${code}, reason: ${errMsg}`)
      }
    } catch (e) {
      this.logger.error('rtsRequestKeyFrame failed:', e)
      throw e
    }
  }

  async updatePermKey(permKey: string) {
    this.logger.log('updatePermKey newwork isConnect: ', this._protoo?.connected)
    if (!this._protoo || !this._protoo.connected) return

    const response = await this._protoo.request('PermKeyUpdate', {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      permKeySecret: permKey
    })
    if (response.code !== 200) {
      new RtcError({
        code: ErrorCode.UPDATE_PERMKEY_ERROR,
        extraCode: response.code,
        message: 'update permkey 认证错误'
      })
    } else {
      this.adapterRef.permKeyInfo = response.PermKey
    }
  }

  updateMaskStatus() {
    let now = Date.now()
    for (let i = this.autoMask.data.length - 1; i >= 0; i--) {
      let userData = this.autoMask.data[i]
      if (now >= userData.targetEndMs) {
        const localUid = this.adapterRef.channelInfo.uid
        if (localUid === userData.maskUid && this.adapterRef.localStream) {
          this.logger.log('updateMaskStatus 本地用户去除打码', userData.maskUid)
          this.adapterRef.localStream._play?.disableMask()
        } else {
          const remoteStream = this.adapterRef.remoteStreamMap[userData.maskUid]
          if (remoteStream) {
            if (remoteStream._play?.mask.enabled) {
              this.logger.log('updateMaskStatus 远端用户去除打码', userData.maskUid)
              remoteStream._play.disableMask()
            }
          } else {
            // 该用户已离开频道
          }
        }
        // 去除过期消息
        this.autoMask.data.splice(i, 1)
      }
    }

    let nextTs = Number.MAX_SAFE_INTEGER
    for (let i = 0; i < this.autoMask.data.length; i++) {
      let userData = this.autoMask.data[i]
      nextTs = Math.min(nextTs, userData.targetEndMs)
      const localUid = this.adapterRef.channelInfo.uid
      if (localUid == userData.maskUid && this.adapterRef.localStream) {
        this.logger.log('updateMaskStatus 本地用户增加打码', userData.maskUid)
        this.adapterRef.localStream._play?.enableMask()
      } else {
        const remoteStream = this.adapterRef.remoteStreamMap[userData.maskUid]
        if (remoteStream) {
          if (remoteStream._play && !remoteStream._play.mask.enabled) {
            this.logger.log(
              'updateMaskStatus 远端用户增加打码',
              userData.maskUid,
              '打码时长',
              userData.duration,
              '秒'
            )
            remoteStream._play.enableMask()
          }
        } else {
          this.logger.log(
            'updateMaskStatus 远端用户不在频道中',
            userData.maskUid,
            '打码时长',
            userData.duration,
            '秒'
          )
        }
      }
    }
    if (this.autoMask.timer) {
      clearTimeout(this.autoMask.timer)
    }
    this.autoMask.timer = setTimeout(() => {
      this.updateMaskStatus()
    }, nextTs - now)
  }

  async doSendLogout() {
    this.logger.log('doSendLogout() begin')
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    if (!this._protoo || !this._protoo.connected) return

    let producerData = {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      externData: {
        reason: 0
      }
    }
    this._protoo.notify('Leave', producerData)
    this.logger.log('doSendLogout() success')
  }

  _handleStreamStatusNotify(data: any) {}

  _handleNetStatusNotify(data: { netStatusList: string }) {
    const netStatusList = data.netStatusList
    //this.logger.warn('_handleNetStatusNotify: _userNetStatusUpdateEvent 网络状态: %s', netStatusList)
    const base64 = parseBase64(netStatusList)
    let str = base64.toString()
    //let str = '02001a080000000000000003001b08000000000000000200'
    let networkQuality: NetStatusItem[] = []
    let count = str.substr(2, 2) + str.substr(0, 2)
    count = parseInt(count, 16)
    str = str.substr(4)
    for (let i = 0; i < count; i++) {
      let uidString = str.substr(0, 16)
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
        uid:
          this.adapterRef.channelInfo.uidType === 'string'
            ? SimpleBig.fromHex(uidString).toString()
            : parseInt(uidString, 16),
        //uid: parseInt(uidString, 16),
        downlinkNetworkQuality: parseInt(serverToClientNetStatusString, 16),
        uplinkNetworkQuality: parseInt(clientToServerNetStatusString, 16),
        receiveTs: Date.now()
      }
      networkQuality.push(item)
      str = str.substr(22 + extLen)
    }
    function reverse(str: string) {
      let stack = []
      for (var len = str.length, i = len; i >= 1; i = i - 2) {
        stack.push(str[i - 2], str[i - 1])
      }
      return stack.join('')
    }
    let isExit = true
    let newList: NetStatusItem[] = []
    //this.logger.log('服务器下发的网络状态通知: %o', networkQuality)
    networkQuality = networkQuality.filter((item) => {
      return item.uid != 0
    })
    this.adapterRef.netStatusList.map((statusItem) => {
      isExit = true
      networkQuality.map((qualityItem) => {
        if (statusItem.uid == qualityItem.uid || qualityItem.uid == 0) {
          isExit = false
        }
      })
      if (isExit) {
        newList.push(statusItem)
      }
    })
    let result = newList.concat(networkQuality)
    result = result.filter((item) => {
      // https://jira.netease.com/browse/NRTCG2-6269
      return this.adapterRef.memberMap[item.uid] || item.uid == this.adapterRef.channelInfo.uid
    })
    this.adapterRef.netStatusList = result
    this.adapterRef.instance.safeEmit('network-quality', this.adapterRef.netStatusList)
  }

  _handleMuteNotify(data: { producerId: string; mute: boolean }) {
    const producerId = data.producerId
    const mute = data.mute
    Object.values(this.adapterRef.remoteStreamMap).forEach((stream) => {
      MediaTypeList.forEach((mediaTypeShort) => {
        if (stream.pubStatus[mediaTypeShort].producerId === producerId) {
          stream.muteStatus[mediaTypeShort].send = mute
          if (mute) {
            if (mediaTypeShort === 'audioSlave') {
              this.adapterRef.instance.safeEmit('mute-audio-slave', { uid: stream.getId() })
            } else {
              this.adapterRef.instance.safeEmit(`mute-${mediaTypeShort}`, { uid: stream.getId() })
            }
          } else {
            if (mediaTypeShort === 'audioSlave') {
              this.adapterRef.instance.safeEmit('unmute-audio-slave', { uid: stream.getId() })
            } else {
              this.adapterRef.instance.safeEmit(`unmute-${mediaTypeShort}`, { uid: stream.getId() })
            }
          }
        }
      })
    })
  }

  _handleUserRoleNotify(externData: any) {
    let uid = externData.uid
    if (this.adapterRef.channelInfo.uidType === 'string') {
      uid = uid.toString()
    }
    const userRole = externData.data && externData.data.userRole
    this.logger.warn(`用户${uid}角色变为${userRole ? '观众' : '主播'}`)
    if (uid && userRole === 1) {
      //主播变为观众，照抄 onPeerLeave 逻辑
      this.adapterRef.instance.clearMember(uid)
      this.adapterRef.instance.removeSsrc(uid)
      this.adapterRef.instance._roleInfo.audienceList[uid] = true
    }
    if (uid && userRole === 0) {
      //观众变为主播，照抄 onPeerJoin 逻辑
      this.adapterRef.instance.safeEmit('peer-online', { uid: uid })
      let remoteStream = this.adapterRef.remoteStreamMap[uid]
      if (!remoteStream) {
        remoteStream = new RemoteStream({
          uid,
          audio: false,
          audioSlave: false,
          video: false,
          screen: false,
          client: this.adapterRef.instance,
          platformType: externData.platformType
        })
        this.adapterRef.remoteStreamMap[uid] = remoteStream
        this.adapterRef.memberMap[uid] = uid
      } else {
        remoteStream.active = true
      }
      this.adapterRef.instance._roleInfo.audienceList[uid] = false
    }
  }

  _handleAbility(data: { code: number; msg: string }) {
    this.adapterRef.instance.safeEmit('warning', {
      code: data.code,
      msg: data.msg
    })
  }

  _handleKickedNotify(reason: number, uid = this.adapterRef.channelInfo.uid) {
    if (this.adapterRef.channelInfo.uidType === 'string') {
      uid = uid.toString()
    }

    if (reason == 1) {
      this.logger.warn('房间被关闭')
      this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
        ErrorCode.CHANNEL_CLOSED
      this.adapterRef.instance.leave()
      this.adapterRef.instance.safeEmit('channel-closed', {})
    } else if (reason == 2) {
      this.logger.warn(`${uid}被踢出房间`)
      if (uid.toString() == this.adapterRef.channelInfo.uid.toString()) {
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
          ErrorCode.CLIENT_BANNED
        this.adapterRef.instance.leave()
      }
      this.adapterRef.instance.safeEmit('client-banned', {
        uid
      })
    } else if (reason == 5) {
      this.logger.warn(`${uid} permKey 超时被踢出房间`)
      if (uid.toString() == this.adapterRef.channelInfo.uid.toString()) {
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
          ErrorCode.PERMKEY_TIMEOUT
        this.adapterRef.instance.leave()
      }
      this.adapterRef.instance.safeEmit('permkey-timeout', {
        uid
      })
    }
  }

  destroy() {
    this.logger.log('清除 Signalling')
    this._destroyProtoo()
    this._reset()
  }
}

export { Signalling }
