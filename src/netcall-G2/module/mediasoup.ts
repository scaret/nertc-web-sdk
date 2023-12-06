import { EventEmitter } from 'eventemitter3'

import { LocalStream } from '../api/localStream'
import { RemoteStream } from '../api/remoteStream'
import { NeRTCPeerConnection } from '../interfaces/NeRTCPeerConnection'
import {
  AdapterRef,
  ILogger,
  MediasoupManagerOptions,
  MediaType,
  MediaTypeList,
  MediaTypeShort,
  ProduceConsumeInfo,
  RecvInfo,
  Timer,
  VideoCodecType
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { waitForEvent } from '../util/waitForEvent'
import * as mediasoupClient from './3rd/mediasoup-client/'
import {
  Consumer,
  Device,
  Producer,
  ProducerCodecOptions,
  Transport
} from './3rd/mediasoup-client/types'
import { Peer } from './3rd/protoo-client'
import { getParameters } from './parameters'
import { VideoTrackLow } from './videoTrackLow'
import { IS_SAFARI, SAFARI_MAJOR_VERSION, SAFARI_VERSION } from '../util/rtcUtil/rtcEnvironment'
import { JSONBigStringify } from '../util/json-big'
import { SimpleBig } from '../util/json-big/SimpleBig'
import { filterTransportCCFromRtpParameters } from '../util/rtcUtil/filterTransportCC'

let mediasoupCnt = 0
const recvMediaTransportMap = new Map([
  ['audio', ['_recvTransportMainAudio', '_recvTransportMainAudioTimeoutTimer']],
  ['video', ['_recvTransportMainVideo', '_recvTransportMainVideoTimeoutTimer']],
  ['audioSlave', ['_recvTransportSubAudioSlave', '_recvTransportSubAudioSlaveTimeoutTimer']],
  ['screen', ['_recvTransportSubScreen', '_recvTransportSubScreenTimeoutTimer']]
])

class Mediasoup extends EventEmitter {
  private adapterRef: AdapterRef
  private _consumers: { [consumerId: string]: any } = {}
  private _timeout: number = 60 * 1000
  public _edgeRtpCapabilities: any | null = null
  private _mediasoupDevice: Device | null = null
  private _sendTransportIceParameters = null
  private _recvTransportIceParameters = null
  public _audioSlaveProducer: Producer | null = null
  private _audioSlaveProducerId: string | null = null
  public _micProducer: Producer | null = null
  private _micProducerId: string | null = null
  public _webcamProducer: Producer | null = null
  private _webcamProducerId: string | null = null
  public _screenProducer: Producer | null = null
  private _screenProducerId: string | null = null
  public _webcamProducerCodec: VideoCodecType | null = null
  public _screenProducerCodec: VideoCodecType | null = null
  public _sendTransport: Transport | null = null
  public _recvTransport: Transport | null = null
  public _sendTransportTimeoutTimer: Timer | null = null
  public _recvTransportTimeoutTimer: Timer | null = null
  public _eventQueue: ProduceConsumeInfo[] = []
  public _eventQueueData: ProduceConsumeInfo[] = []
  public _protoo: Peer | null = null
  private mediasoupId = mediasoupCnt++
  private _usedUidMediaTypes: any = {}
  public consumerMap: Map<string | number, any> = new Map()
  // senderEncodingParameter。会复用上次的senderEncodingParameter
  public senderEncodingParameter: {
    ssrcList: number[]
    audio: {
      high: { ssrc: number; dtx: boolean } | null
      // 目前未使用low
      low: { ssrc: number; dtx: boolean } | null
    }
    audioSlave: {
      high: { ssrc: number; dtx: boolean } | null
      // 目前未使用low
      low: { ssrc: number; dtx: boolean } | null
    }
    video: {
      high: { ssrc: number; rtx: { ssrc: number } } | null
      low: { ssrc: number; rtx: { ssrc: number } } | null
    }
    screen: {
      high: { ssrc: number; rtx: { ssrc: number } } | null
      low: { ssrc: number; rtx: { ssrc: number } } | null
    }
  } = {
    ssrcList: [],
    audio: { high: null, low: null },
    audioSlave: { high: null, low: null },
    video: { high: null, low: null },
    screen: { high: null, low: null }
  }
  private _probeSSrc?: string
  public unsupportedProducers: {
    [producerId: string]: {
      pc?: NeRTCPeerConnection
      consumeRes: {
        producerId: string
        code: number
        uid: string | number
        mediaType: MediaTypeShort
        errMsg: string
      }
    }
  } = {}
  private logger: ILogger
  private loggerSend: ILogger
  private loggerRecv: ILogger
  public iceStatusHistory: {
    send: {
      promises: ((value: unknown) => void)[]
      status: {
        ts: number
        info: string
      }
    }
    recv: {
      promises: ((value: unknown) => void)[]
      status: {
        ts: number
        info: string
      }
    }
  } = {
    send: { promises: [], status: { ts: 0, info: '' } },
    recv: { promises: [], status: { ts: 0, info: '' } }
  }
  constructor(options: MediasoupManagerOptions) {
    super()
    this.adapterRef = options.adapterRef
    this.logger = options.logger
    this.loggerSend = options.logger.getChild(() => {
      let tag = 'MediaSend'
      if (!this._sendTransport) {
        tag += ' UNINIT'
      } else if (this._sendTransport._handler?._pc) {
        const pc = this._sendTransport._handler._pc
        if (pc.connectionState && pc.connectionState !== 'connected') {
          tag += ' ' + pc.connectionState
        }
        if (pc.signalingState !== 'stable') {
          tag += ' ' + pc.signalingState
        }
      } else {
        tag += ' NOTRANSPORT'
      }
      if (this.adapterRef._mediasoup?.mediasoupId !== this.mediasoupId) {
        tag += ' DETACHED'
      }
      return tag
    })
    this.loggerRecv = options.logger.getChild(() => {
      let tag = 'MediaRecv'
      if (!this._recvTransport) {
        tag += ' UNINIT'
      } else if (this._recvTransport._handler?._pc) {
        const pc = this._recvTransport._handler._pc
        if (pc.connectionState && pc.connectionState !== 'connected') {
          tag += ' ' + pc.connectionState
        }
        if (pc.signalingState !== 'stable') {
          tag += ' ' + pc.signalingState
        }
      } else {
        tag += ' NOTRANSPORT'
      }
      if (this.adapterRef._mediasoup?.mediasoupId !== this.mediasoupId) {
        tag += ' DETACHED'
      }
      return tag
    })
    this._reset()
    // 设置对象引用
  }

  get consumers() {
    return this._consumers
  }

  _reset() {
    this._edgeRtpCapabilities = null
    this._mediasoupDevice = null

    this._sendTransportIceParameters = null
    this._recvTransportIceParameters = null
    this._micProducer = null
    this._audioSlaveProducer = null
    this._micProducerId = null
    this._webcamProducer = null
    this._webcamProducerId = null
    this._screenProducer = null
    this._screenProducerId = null
    this._consumers = {}

    if (this._sendTransportTimeoutTimer) {
      clearTimeout(this._sendTransportTimeoutTimer)
    }
    this._sendTransportTimeoutTimer = null
    if (this._recvTransportTimeoutTimer) {
      clearTimeout(this._recvTransportTimeoutTimer)
    }
    this._recvTransportTimeoutTimer = null

    if (this._sendTransport) {
      this._sendTransport.close()
      this.getIceStatus('send')
    }
    this._sendTransport = null
    if (this._recvTransport) {
      this._recvTransport.close()
      this.getIceStatus('recv')
    }
    this._recvTransport = null

    this.resetConsumeRequestStatus()
  }

  async init() {
    this.logger.log('init() 初始化 devices、transport')
    if (!this._mediasoupDevice) {
      this._mediasoupDevice = new mediasoupClient.Device()
      if (this._mediasoupDevice) {
        await this._mediasoupDevice.load({ routerRtpCapabilities: this._edgeRtpCapabilities })
      }
    }
    let iceServers: RTCIceServer[] = []
    let iceTransportPolicy: RTCIceTransportPolicy = 'all'

    if (this.adapterRef.channelInfo.relaytoken && this.adapterRef.channelInfo.relayaddrs) {
      this.adapterRef.channelInfo.relayaddrs.forEach((item: string) => {
        iceServers.push(
          {
            urls: 'turn:' + item + '?transport=udp',
            credential:
              this.adapterRef.proxyServer.credential ||
              this.adapterRef.channelInfo.uid + '/' + this.adapterRef.channelInfo.cid,
            username: this.adapterRef.channelInfo.relaytoken
          },
          {
            urls: 'turn:' + item + '?transport=tcp',
            credential:
              this.adapterRef.proxyServer.credential ||
              this.adapterRef.channelInfo.uid + '/' + this.adapterRef.channelInfo.cid,
            username: this.adapterRef.channelInfo.relaytoken
          }
        )
      })
      //firefox浏览器在relay模式（存在bug）
      if (!env.IS_FIREFOX) {
        iceTransportPolicy = 'relay'
      }
    }

    if (iceServers.length) {
      this.logger.log(
        'iceTransportPolicy ',
        iceTransportPolicy,
        ' iceServers ',
        JSONBigStringify(iceServers)
      )
    }

    if (!this._sendTransport && this._mediasoupDevice) {
      this._sendTransport = this._mediasoupDevice.createSendTransport({
        id: this.adapterRef.channelInfo.uid,
        iceParameters: undefined,
        iceCandidates: undefined,
        dtlsParameters: undefined,
        sctpParameters: undefined,
        iceServers,
        appData: {
          cid: this.adapterRef.channelInfo.cid,
          uid: this.adapterRef.channelInfo.uid,
          encodedInsertableStreams: this.adapterRef.encryption.encodedInsertableStreams
        }
      })
      this.senderEncodingParameter = {
        ssrcList: [],
        audioSlave: { high: null, low: null },
        audio: { high: null, low: null },
        video: { high: null, low: null },
        screen: { high: null, low: null }
      }
      this._sendTransport.on(
        'connectionstatechange',
        this._sendTransportConnectionstatechange.bind(this, this._sendTransport)
      )
      this._sendTransport.handler._pc.addEventListener('iceconnectionstatechange', () => {
        this.getIceStatus('send')
      })
    }
    if (!(env.ANY_CHROME_MAJOR_VERSION && env.ANY_CHROME_MAJOR_VERSION < 69)) {
      if (!this._recvTransport && this._mediasoupDevice) {
        const _recvTransport = this._mediasoupDevice.createRecvTransport({
          id: this.adapterRef.channelInfo.uid,
          iceParameters: undefined,
          iceCandidates: undefined,
          dtlsParameters: undefined,
          sctpParameters: undefined,
          iceServers,
          iceTransportPolicy,
          appData: {
            cid: this.adapterRef.channelInfo.cid,
            uid: this.adapterRef.channelInfo.uid,
            encodedInsertableStreams: this.adapterRef.encryption.encodedInsertableStreams
          }
        })
        this._recvTransport = _recvTransport
        _recvTransport.on(
          'connectionstatechange',
          this._recvTransportConnectionstatechange.bind(this, _recvTransport)
        )
        _recvTransport.handler._pc.addEventListener('iceconnectionstatechange', () => {
          this.getIceStatus('recv')
        })
      }
    }
    const interval = 1000
    let timer = setInterval(() => {
      const now = Date.now()
      if (now - this.iceStatusHistory.send.status.ts > interval * 1.5) {
        this.getIceStatus('send')
      }
      if (now - this.iceStatusHistory.recv.status.ts > interval * 1.5) {
        this.getIceStatus('recv')
      }
      if (!this._mediasoupDevice) {
        // destroyed
        clearInterval(timer)
      }
    }, interval)
    this.emit('transportReady')
  }

  async _sendTransportConnectionstatechange(_sendTransport: Transport, connectionState: string) {
    if (!this._sendTransport || this._sendTransport.closed) {
      return
    }
    if (this._sendTransport.idx !== _sendTransport.idx) {
      this.loggerSend.warn(
        `_sendTransportConnectionstatechange：出现了_sendTransport绑定不一致的状况:` +
          `${_sendTransport.id}/${_sendTransport.idx}=>${this._sendTransport.id}/${this._sendTransport.idx}`
      )
      return
    }
    this.loggerSend.log(
      `send connection #${_sendTransport._handler._pc.pcid} state  changed to ${connectionState}`
    )
    this.emit('upstream-state-change', { connectionState })
    if (connectionState === 'failed') {
      try {
        if (this._sendTransport) {
          if (!this._sendTransportTimeoutTimer) {
            this._sendTransportTimeoutTimer = setTimeout(() => {
              this._reconnectTransportConnectTimeout()
            }, this._timeout)
          }
        }
        //直接执行信令层面的重连
        this._sendTransportConnectTimeout()
      } catch (e: any) {
        this.loggerSend.error('reconnectSendTransportConnect() | failed:', e.name, e.message)
      }
    } else if (connectionState === 'connected') {
      if (this._sendTransportTimeoutTimer) {
        clearTimeout(this._sendTransportTimeoutTimer)
        this._sendTransportTimeoutTimer = null
      }
    }
  }

  async _recvTransportConnectionstatechange(_recvTransport: Transport, connectionState: string) {
    if (!this._recvTransport || this._recvTransport.closed) {
      return
    }
    if (this._recvTransport.idx !== _recvTransport.idx) {
      this.loggerRecv.warn(
        `_recvTransportConnectionstatechange：出现了_recvTransport绑定不一致的状况:` +
          `${_recvTransport.id}/${_recvTransport.idx}=>${this._recvTransport.id}/${this._recvTransport.idx}`
      )
      return
    }
    this.loggerRecv.log(
      `recv connection ${_recvTransport._handler._pc.pcid} state changed to ${connectionState}`
    )
    this.emit('downstream-state-change', { connectionState })
    if (connectionState === 'failed') {
      try {
        if (this._recvTransport) {
          if (!this._recvTransportTimeoutTimer) {
            this._recvTransportTimeoutTimer = setTimeout(() => {
              this._reconnectTransportConnectTimeout()
            }, this._timeout)
          }
        }
      } catch (e: any) {
        this.loggerRecv.error('reconnectRecvTransportConnect() | failed:', e.name, e.message)
      }
      //直接执行信令层面的重连
      this._recvTransportConnectTimeout()
    } else if (connectionState === 'connected') {
      if (this._recvTransportTimeoutTimer) {
        clearTimeout(this._recvTransportTimeoutTimer)
        this._recvTransportTimeoutTimer = null
      }
    }
  }

  async _recvTransportConnectionstatechange69(
    _recvTransport: Transport,
    _recvTransportTimeoutTimer: any,
    connectionStateEvent: any
  ) {
    let connectionState = connectionStateEvent.target.iceConnectionState

    this.loggerRecv.log(
      `recv69 connection ${_recvTransport._handler._pc.pcid} state changed to ${connectionState}`
    )
    this.emit('downstream-state-change', { connectionState })
    if (connectionState === 'failed') {
      try {
        if (_recvTransport) {
          if (!_recvTransportTimeoutTimer) {
            _recvTransportTimeoutTimer = setTimeout(() => {
              this._reconnectTransportConnectTimeout()
            }, this._timeout)
          }
        }
      } catch (e: any) {
        this.loggerRecv.error('reconnectRecvTransportConnect() | failed:', e.name, e.message)
      }
      //直接执行信令层面的重连
      this._recvTransportConnectTimeout()
    } else if (connectionState === 'connected') {
      if (_recvTransportTimeoutTimer) {
        clearTimeout(_recvTransportTimeoutTimer)
        _recvTransportTimeoutTimer = null
      }
    }
  }

  async _sendTransportConnectTimeout() {
    this.loggerSend.warn('媒体上行传输通道连接失败')
    if (this.adapterRef._signalling) {
      if (this.adapterRef.connectState.curState === 'CONNECTED') {
        this.loggerSend.log('媒体上行传输通道连接失败，尝试整体重连')
        this.adapterRef.channelStatus = 'connectioning'
        this.adapterRef._signalling.reconnectionControl.next =
          this.adapterRef._signalling.reconnectionControl.copynext
        this.adapterRef.instance.apiEventReport('setDisconnect', {
          reason: 'sendPeerIceFailed',
          ext: '' //扩展可选
        })
        this.adapterRef._signalling._reconnection()
      } else {
        this.loggerRecv.warn('媒体上行传输通道建立失败, 此时sdk正在重连, 不用特殊处理')
        this.adapterRef.instance.apiEventReport('setStreamException', {
          name: 'pushStreamException',
          value: `send transport connection failed`
        })
      }
    }
  }

  async _recvTransportConnectTimeout() {
    this.loggerRecv.warn('媒体下行传输通道建立失败')
    if (this.adapterRef._signalling) {
      if (this.adapterRef.connectState.curState === 'CONNECTED') {
        this.loggerRecv.error('媒体下行传输通道连接失败，尝试整体重连')
        this.adapterRef.channelStatus = 'connectioning'
        this.adapterRef._signalling.reconnectionControl.next =
          this.adapterRef._signalling.reconnectionControl.copynext
        this.adapterRef.instance.apiEventReport('setDisconnect', {
          reason: 'recvPeerIceFailed',
          ext: '' //扩展可选
        })
        this.adapterRef._signalling._reconnection()
      } else {
        this.loggerRecv.warn('媒体下行传输通道建立失败，此时sdk正在重连，不用特殊处理')
        this.adapterRef.instance.apiEventReport('setStreamException', {
          name: 'pullStreamException',
          value: `receive transport connection failed`
        })
      }
    }
  }

  async _reconnectTransportConnectTimeout() {
    this.loggerRecv.error('媒体传输通道一直重连失败，主动退出房间')
    this.adapterRef.instance.safeEmit('error', 'MEDIA_TRANSPORT_DISCONNECT')
    this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason =
      ErrorCode.MEDIA_CONNECTION_DISCONNECTED
    this.adapterRef.instance.leave()
  }

  async createProduce(stream: LocalStream, mediaTypeInput: 'all' | MediaTypeShort) {
    stream.logger.log('发布音视频: ', stream.getId(), mediaTypeInput)
    if (!this._sendTransport) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: 'createProduce: 发送端 transport 未找到 1'
      })
    }

    // STARTOF produceCallback
    if (this._sendTransport.listenerCount('produce') === 0) {
      this._sendTransport.on(
        'produce',
        async ({ kind, rtpParameters, appData, localDtlsParameters, offer }, callback, errback) => {
          this.loggerSend.log(`produce 反馈 [kind= ${kind}, appData= ${JSONBigStringify(appData)}]`)
          if (!this._sendTransport) {
            //此时可能正在重连，或者已经离开房间，忽略该webrtc流程的内部反馈
            return
          }
          const mediaTypeShort: MediaTypeShort =
            appData.mediaType == 'screenShare' ? 'screen' : appData.mediaType
          let simulcastEnable = false
          if (mediaTypeShort === 'video' && this.adapterRef.channelInfo.videoLow) {
            simulcastEnable = true
          } else if (mediaTypeShort === 'screen' && this.adapterRef.channelInfo.screenLow) {
            simulcastEnable = true
          }
          const iceUfragRegLocal = offer.sdp.match(/a=ice-ufrag:([0-9a-zA-Z#=+-_\/\\\\]+)/)
          if (!iceUfragRegLocal) {
            this.adapterRef.logger.error('找不到 iceUfragRegLocal: ', offer.sdp)
          }
          try {
            if (this.adapterRef.preferRemb) {
              this.logger.log(`使用REMB作为带宽估计方式`)
              filterTransportCCFromRtpParameters(rtpParameters)
            }
            let producerData = {
              requestId: `${Math.ceil(Math.random() * 1e9)}`,
              kind: kind,
              rtpParameters: rtpParameters,
              iceUfrag: iceUfragRegLocal[1],
              externData: {
                producerInfo: {
                  mediaType: appData.mediaType === 'audioSlave' ? 'subAudio' : appData.mediaType, //信令协商的mediaType为: audio、subAudio、video、screenShare
                  subStream:
                    appData.mediaType === 'screenShare' || appData.mediaType === 'audioSlave',
                  simulcastEnable: simulcastEnable,
                  spatialLayerCount: simulcastEnable ? 2 : 1,
                  mute: stream.muteStatus[mediaTypeShort].send || false
                }
              },
              appData: {
                enableTcpCandidate: true
              },
              ...appData
            }
            // 辅流设计文档(http://doc.hz.netease.com/pages/viewpage.action?pageId=262212959)
            if (mediaTypeShort === 'screen') {
              producerData.deviceId = 'screen-share-default'
            } else if (mediaTypeShort === 'video') {
              if (stream.mediaHelper.video.videoSource) {
                producerData.deviceId = 'video-external-default'
              } else {
                producerData.deviceId = 'video-default'
              }
            }

            if (getParameters().revertSubstreamProduceType) {
              // 私有接口，乐播实验性需求：交换主辅流，以保证易盾和安全通正常工作
              switch (producerData.externData.producerInfo.mediaType) {
                case 'screenShare':
                  producerData.externData.producerInfo.mediaType = 'video'
                  producerData.externData.producerInfo.subStream = false
                  break
                case 'video':
                  producerData.externData.producerInfo.mediaType = 'screenShare'
                  producerData.externData.producerInfo.subStream = true
                  break
                case 'audio':
                  producerData.externData.producerInfo.mediaType = 'subAudio'
                  producerData.externData.producerInfo.subStream = true
                  break
                case 'subAudio':
                  producerData.externData.producerInfo.mediaType = 'audio'
                  producerData.externData.producerInfo.subStream = false
                  break
              }
            }

            let encoding, encodingLow, mLineIndex, mLineIndexLow
            // Chrome58+ 不使用原来的ssrc, 会重建新的ssrc
            if (
              env.ANY_CHROME_MAJOR_VERSION &&
              env.ANY_CHROME_MAJOR_VERSION >= 58 &&
              env.ANY_CHROME_MAJOR_VERSION < 69
            ) {
              encoding = rtpParameters.encodings[0]
            } else {
              // 1. 使用原有的encoding
              encoding = this.senderEncodingParameter[mediaTypeShort].high
              encodingLow = this.senderEncodingParameter[mediaTypeShort].low
              mLineIndex = offer.sdp.indexOf(appData.deviceId)
              mLineIndexLow = offer.sdp.indexOf(appData.deviceIdLow)
              if (!encoding) {
                if (rtpParameters.encodings) {
                  // 2. 使用rtpParameter中的值
                  encoding = rtpParameters.encodings[0]
                  if (
                    encoding &&
                    this.senderEncodingParameter.ssrcList.indexOf(encoding.ssrc) > -1
                  ) {
                    // 已被其他占据，丢弃
                    encoding = null
                  }
                  if (rtpParameters.encodings[1]) {
                    encodingLow = rtpParameters.encodings[1]
                    if (
                      encodingLow &&
                      this.senderEncodingParameter.ssrcList.indexOf(encodingLow.ssrc) > -1
                    ) {
                      // 已被其他占据，丢弃
                      encoding = null
                    }
                  }
                }
                if (!encoding && appData.deviceId && mLineIndex > -1) {
                  // 3. 在SDP中寻找ssrc-group字段匹配
                  let mLinePiece = offer.sdp.substring(mLineIndex)
                  const match = mLinePiece.match(/a=ssrc-group:FID (\d+) (\d+)/)
                  if (match) {
                    encoding = {
                      ssrc: parseInt(match[1]),
                      rtx: {
                        ssrc: parseInt(match[2])
                      }
                    }
                  }
                  if (
                    encoding &&
                    this.senderEncodingParameter.ssrcList.indexOf(encoding.ssrc) > -1
                  ) {
                    // 已被其他占据，丢弃
                    encoding = null
                  }
                  // 小流
                  if (!encodingLow && appData.deviceIdLow && mLineIndexLow > -1) {
                    let mLinePieceLow = offer.sdp.substring(mLineIndexLow)
                    const match = mLinePieceLow.match(/a=ssrc-group:FID (\d+) (\d+)/)
                    if (match) {
                      encodingLow = {
                        ssrc: parseInt(match[1]),
                        rtx: {
                          ssrc: parseInt(match[2])
                        }
                      }
                    }
                    if (
                      encodingLow &&
                      this.senderEncodingParameter.ssrcList.indexOf(encodingLow.ssrc) > -1
                    ) {
                      // 已被其他占据，丢弃
                      encodingLow = null
                    }
                  }
                }
                if (!encoding) {
                  this.loggerSend.log('使用sdp中第一个ssrc')
                  encoding = {
                    ssrc: parseInt(offer.sdp.match(/a=ssrc:(\d+)/)[1]), //历史遗留
                    dtx: false
                  }
                }
                this.senderEncodingParameter[mediaTypeShort].high = encoding
                this.senderEncodingParameter.ssrcList.push(encoding.ssrc)
                if (encodingLow) {
                  this.senderEncodingParameter[mediaTypeShort].low = encodingLow
                  this.senderEncodingParameter.ssrcList.push(encodingLow.ssrc)
                } else {
                  this.senderEncodingParameter[mediaTypeShort].low = null
                }
              }
              // 服务端协议：小流在前，大流在后
              rtpParameters.encodings = [this.senderEncodingParameter[mediaTypeShort].high]
              if (this.senderEncodingParameter[mediaTypeShort].low) {
                rtpParameters.encodings.unshift(this.senderEncodingParameter[mediaTypeShort].low)
              }
            }

            if (appData.mediaType === 'video' || appData.mediaType === 'screenShare') {
              producerData.mediaProfile = []
              if (encodingLow) {
                // 小流
                producerData.mediaProfile.push({
                  ssrc: encodingLow.ssrc,
                  res: '160*160',
                  fps: '1',
                  spatialLayer: 0,
                  maxBitrate: 100
                })
              }
              // 大流
              producerData.mediaProfile.push({
                ssrc: encoding.ssrc,
                res: '640*480',
                fps: '15',
                spatialLayer: producerData.mediaProfile.length,
                maxBitrate: 1000
              })
            }

            // 去除RED(http://jira.netease.com/browse/NRTCG2-16502)
            for (
              let codecId = producerData.rtpParameters.codecs.length - 1;
              codecId >= 0;
              codecId--
            ) {
              if (producerData.rtpParameters.codecs[codecId].mimeType === 'audio/red') {
                producerData.rtpParameters.codecs.splice(codecId, 1)
              }
            }

            if (localDtlsParameters === undefined) {
              producerData.transportId = this._sendTransport.id
            } else {
              producerData.dtlsParameters = localDtlsParameters
            }
            if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo) {
              throw new RtcError({
                code: ErrorCode.UNKNOWN_TYPE_ERROR,
                message: 'createProduce: _protoo 未找到'
              })
            }

            // 尝试只在信令中修改H264 Profile
            let rtpParametersSend = producerData.rtpParameters
            const codec = rtpParametersSend.codecs[0]
            if (
              getParameters().h264ProfileLevel &&
              getParameters().h264ProfileLevelSignal &&
              codec.mimeType === 'video/H264' &&
              codec.parameters &&
              codec.parameters['profile-level-id'] !== getParameters().h264ProfileLevelSignal
            ) {
              rtpParametersSend = JSON.parse(JSON.stringify(rtpParametersSend))
              this.logger.log(
                `信令消息修改profile-level-id, ${
                  rtpParametersSend.codecs[0].parameters['profile-level-id']
                } => ${getParameters().h264ProfileLevelSignal}`
              )
              // 这边修改的仅仅是信令消息，改为42e01f
              rtpParametersSend.codecs[0].parameters['profile-level-id'] =
                getParameters().h264ProfileLevelSignal
              producerData.rtpParameters = rtpParametersSend
            }
            let producerRes = await this.adapterRef._signalling._protoo.request(
              'Produce',
              producerData
            )
            const {
              code,
              transportId,
              iceParameters,
              iceCandidates,
              turnParameters,
              dtlsParameters,
              producerId,
              errMsg
            } = producerRes

            if (transportId !== undefined) {
              this._sendTransport._id = transportId
            }
            if (code === 200) {
              this.loggerSend.log(
                `produce请求反馈结果, code: ${code}, kind: ${kind}, producerId: ${producerId}`
              )
            } else {
              this.loggerSend.error(
                `produce请求反馈错误, code: ${code}, kind: ${kind}, producerId: ${producerId},  errMsg: ${errMsg}, 请求：${JSONBigStringify(
                  producerData
                )}, 返回：${JSONBigStringify(producerData)}`
              )
              //TO-DO:发布失败需要增加处理流程
            }
            if (turnParameters) {
              //服务器反馈turn server，sdk更新ice Server
              let iceServers = []
              iceServers.push(
                {
                  urls: 'turn:' + turnParameters.ip + ':' + turnParameters.port + '?transport=udp',
                  credential: turnParameters.password,
                  username: turnParameters.username
                },
                {
                  urls: 'turn:' + turnParameters.ip + ':' + turnParameters.port + '?transport=tcp',
                  credential: turnParameters.password,
                  username: turnParameters.username
                }
              )
              await this._sendTransport.updateIceServers({ iceServers })
            }

            let codecInfo = { codecParam: null, codecName: null }
            if (appData.mediaType === 'audio') {
              this._micProducerId = producerId
            } else if (appData.mediaType === 'audioSlave') {
              this._audioSlaveProducerId = producerId
            } else if (appData.mediaType === 'video') {
              this._webcamProducerId = producerId
              //@ts-ignore
              codecInfo = this.adapterRef.mediaCapability.getCodecSend(
                'video',
                //@ts-ignore
                this._sendTransport.handler._sendingRtpParametersByKind['video']
              )
              this._webcamProducerCodec = codecInfo.codecName
            } else if (appData.mediaType === 'screenShare') {
              this._screenProducerId = producerId
              //@ts-ignore
              codecInfo = this.adapterRef.mediaCapability.getCodecSend(
                'screen',
                //@ts-ignore
                this._sendTransport.handler._sendingRtpParametersByKind['video']
              )
              this._screenProducerCodec = codecInfo.codecName
            }
            if (iceParameters) {
              this._sendTransportIceParameters = iceParameters
            }
            if (!this.adapterRef.localStream) {
              throw new RtcError({
                code: ErrorCode.UNKNOWN_TYPE_ERROR,
                message: 'createProduce: 未找到 localStream'
              })
            }
            let codecOptions: ProducerCodecOptions[] = []
            if (appData.mediaType === 'audio' || appData.mediaType === 'audioSlave') {
              codecOptions.push(Object.assign({}, getParameters().codecOptions.audio))
            } else if (appData.mediaType === 'video') {
              if (rtpParameters.encodings.length >= 2) {
                const lowOption: ProducerCodecOptions = {}
                if (getParameters().videoLowStartBitrate) {
                  lowOption.videoGoogleStartBitrate = getParameters().videoLowStartBitrate
                }
                if (getParameters().videoLowMinBitrate) {
                  lowOption.videoGoogleMinBitrate = getParameters().videoLowMinBitrate
                }
                // 小流，需与Encodings顺序保持一致
                codecOptions.push(lowOption)
              }
              const highOption: ProducerCodecOptions = {}
              if (getParameters().videoHighStartBitrate) {
                highOption.videoGoogleStartBitrate = getParameters().videoHighStartBitrate
              }
              if (getParameters().videoHighMinBitrate) {
                highOption.videoGoogleMinBitrate = getParameters().videoHighMinBitrate
              }
              codecOptions.push(highOption)
            } else if (appData.mediaType === 'screenShare') {
              if (rtpParameters.encodings.length >= 2) {
                // 小流，需与Encodings顺序保持一致
                const lowOption: ProducerCodecOptions = {}
                if (getParameters().screenLowStartBitrate) {
                  lowOption.videoGoogleStartBitrate = getParameters().screenLowStartBitrate
                }
                if (getParameters().screenLowMinBitrate) {
                  lowOption.videoGoogleMinBitrate = getParameters().screenLowMinBitrate
                }
                // 小流，需与Encodings顺序保持一致
                codecOptions.push(lowOption)
              }
              const highOption: ProducerCodecOptions = {}
              if (getParameters().screenHighStartBitrate) {
                highOption.videoGoogleStartBitrate = getParameters().screenHighStartBitrate
              }
              if (getParameters().screenHighMinBitrate) {
                highOption.videoGoogleMinBitrate = getParameters().screenHighMinBitrate
              }
              codecOptions.push(highOption)
            }
            this.logger.log(
              `codecOptions for producer ${appData.mediaType}: ${JSONBigStringify(codecOptions)}`
            )
            let remoteIceCandidates = iceCandidates
            if (this.adapterRef.channelInfo.iceProtocol && iceCandidates) {
              this.logger.warn('Produce iceProtocol: ', this.adapterRef.channelInfo.iceProtocol)
              remoteIceCandidates = iceCandidates.filter((item: any) => {
                return item.protocol == this.adapterRef.channelInfo.iceProtocol
              })
            }
            //执行setRemoteDescription流程
            await this._sendTransport.fillRemoteRecvSdp({
              kind,
              appData,
              iceParameters,
              iceCandidates: remoteIceCandidates,
              dtlsParameters,
              sctpParameters: undefined,
              sendingRtpParameters: rtpParameters,
              codecOptions,
              offer,
              codec: codecInfo.codecParam,
              audioProfile: this.adapterRef.localStream.audioProfile
            })
            //设置视频的编码码率
            if (
              !(
                env.ANY_CHROME_MAJOR_VERSION &&
                env.ANY_CHROME_MAJOR_VERSION >= 58 &&
                env.ANY_CHROME_MAJOR_VERSION < 69
              )
            ) {
              if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
                this.adapterRef.localStream.applyEncoderConfig(mediaTypeShort, 'high')
                if (rtpParameters.encodings.length >= 2) {
                  this.adapterRef.localStream.applyEncoderConfig(mediaTypeShort, 'low')
                }
              }
            }

            callback({ id: producerId })
          } catch (error) {
            errback(error)
          }
        }
      )
    }
    // ENDOF produceCallback
    if (mediaTypeInput === 'audio' || mediaTypeInput === 'all') {
      if (this._micProducer) {
        this.loggerSend.log('音频已经publish，跳过')
      } else {
        const audioTrack = stream.mediaHelper.audio.audioStream.getAudioTracks()[0]
        if (audioTrack) {
          if (this.adapterRef.permKeyInfo?.pubAudioRight === false) {
            this.loggerSend.error('permKey权限控制，没有权利发布audio')
            this.adapterRef.instance.safeEmit('error', 'no-publish-audio-permission')
          } else if (audioTrack.readyState === 'ended') {
            this.loggerSend.error(`发布媒体流失败，轨道已关闭，请检查输入设备:audio`, audioTrack)
          } else {
            this.loggerSend.log('发布音频流 audioTrack: ', audioTrack.id, audioTrack.label)
            stream.pubStatus.audio.audio = true
            try {
              this._micProducer = await this._sendTransport.produce({
                track: audioTrack,
                trackLow: null,
                codecOptions: {
                  opusStereo: true,
                  opusDtx: true
                },
                appData: {
                  preferRemb: this.adapterRef.preferRemb,
                  deviceId: audioTrack.id,
                  deviceIdLow: null,
                  mediaType: 'audio'
                }
              })
            } catch (e) {
              this.loggerSend.error('produce audio error: ', e)
            }
            // this._micProducer = await this._sendTransport.produce({
            //   track: audioTrack,
            //   trackLow: null,
            //   codecOptions: {
            //     opusStereo: true,
            //     opusDtx: true
            //   },
            //   appData: {
            //     preferRemb: this.adapterRef.preferRemb,
            //     deviceId: audioTrack.id,
            //     deviceIdLow: null,
            //     mediaType: 'audio'
            //   }
            // })
            //@ts-ignore
            this.watchProducerState(this._micProducer, '_micProducer')
            if (this.adapterRef.encryption.encodedInsertableStreams) {
              //@ts-ignore
              if (this._micProducer._rtpSender) {
                //@ts-ignore
                this.enableSendTransform(this._micProducer._rtpSender, 'audio', 'high')
              }
            }
          }
        }
      }
    }

    if (mediaTypeInput === 'audioSlave' || mediaTypeInput === 'all') {
      if (this._audioSlaveProducer) {
        this.loggerSend.log('音频辅流已经publish，忽略')
      } else {
        const audioTrack = stream.mediaHelper.screenAudio.screenAudioStream.getAudioTracks()[0]
        if (audioTrack) {
          if (this.adapterRef.permKeyInfo?.pubAudioRight === false) {
            this.loggerSend.error('permKey权限控制，没有权利发布audio slave')
            this.adapterRef.instance.safeEmit('error', 'no-publish-audio-slave-permission')
          } else if (audioTrack.readyState === 'ended') {
            this.loggerSend.error(
              `发布媒体流失败，轨道已关闭，请检查输入设备:audioSlave`,
              audioTrack
            )
          } else {
            this.loggerSend.log('发布音频辅流 audioSlaveTrack: ', audioTrack.id, audioTrack.label)
            stream.pubStatus.audioSlave.audio = true
            this._audioSlaveProducer = await this._sendTransport.produce({
              track: audioTrack,
              trackLow: null,
              codecOptions: {
                opusStereo: true,
                opusDtx: true
              },
              appData: {
                preferRemb: this.adapterRef.preferRemb,
                deviceId: audioTrack.id,
                deviceIdLow: null,
                mediaType: 'audioSlave'
              }
            })
            this.watchProducerState(this._audioSlaveProducer, '_audioSlaveProducer')
          }
        }
      }
    }

    if (mediaTypeInput === 'video' || mediaTypeInput === 'all') {
      if (this._webcamProducer) {
        this.loggerSend.log('视频已经publish，跳过')
      } else if (stream.mediaHelper.video.videoStream.getVideoTracks().length) {
        const videoTrack = stream.mediaHelper.video.videoStream.getVideoTracks()[0]
        if (this.adapterRef.permKeyInfo?.pubVideoRight === false) {
          this.loggerSend.error('permKey权限控制，没有权利发布video')
          this.adapterRef.instance.safeEmit('error', 'no-publish-video-permission')
        } else if (videoTrack.readyState === 'ended') {
          this.loggerSend.error(`发布媒体流失败，轨道已关闭，请检查输入设备：video`, videoTrack)
        } else {
          let trackLow: MediaStreamTrack | null = null
          if (this.adapterRef.channelInfo.videoLow) {
            if (!stream.mediaHelper.video.low) {
              stream.mediaHelper.video.low = new VideoTrackLow({
                logger: this.logger,
                mediaType: 'video'
              })
            }
            if (stream.mediaHelper.video.low.track) {
              trackLow = stream.mediaHelper.video.low.track
              this.adapterRef.instance.safeEmit('track-low-init-success', { mediaType: 'video' })
            } else {
              this.adapterRef.instance.safeEmit('track-low-init-fail', { mediaType: 'video' })
            }
          } else {
            // 不发布小流。此处如果发现上次有小流，则取消绑定关系，但不回收。
            if (stream.mediaHelper.video.low) {
              stream.mediaHelper.video.low.bindSender(null, null)
            }
            this.senderEncodingParameter.video.low = null
          }
          this.loggerSend.log('发布视频 videoTrack: ', videoTrack.id, videoTrack.label)
          stream.pubStatus.video.video = true
          //@ts-ignore
          const codecInfo = this.adapterRef.mediaCapability.getCodecSend(
            'video',
            //@ts-ignore
            this._sendTransport.handler._sendingRtpParametersByKind['video']
          )
          this._webcamProducer = await this._sendTransport.produce({
            track: videoTrack,
            trackLow,
            codec: codecInfo.codecParam,
            codecOptions: {
              videoGoogleStartBitrate: 1000
            },
            appData: {
              preferRemb: this.adapterRef.preferRemb,
              deviceId: videoTrack.id,
              deviceIdLow: trackLow?.id || null,
              mediaType: 'video'
            }
          })
          if (this._webcamProducer._rtpSender && stream.mediaHelper.video.low) {
            stream.mediaHelper.video.low.bindSender(
              this._webcamProducer._rtpSender,
              this._webcamProducer._rtpSenderLow || null
            )
            if (IS_SAFARI && SAFARI_MAJOR_VERSION && SAFARI_MAJOR_VERSION < 14) {
              if (stream._play.video.dom?.srcObject) {
                this.logger.log(`尝试重置本地视图的SrcObject`)
                stream._play.video.dom.srcObject = stream._play.video.dom.srcObject
              }
            }
          }
          this.watchProducerState(this._webcamProducer, '_webcamProducer')
          if (this.adapterRef.encryption.encodedInsertableStreams) {
            if (this._webcamProducer._rtpSender) {
              this.enableSendTransform(this._webcamProducer._rtpSender, 'video', 'high')
            }
            if (this._webcamProducer._rtpSenderLow) {
              this.enableSendTransform(this._webcamProducer._rtpSenderLow, 'video', 'low')
            }
          }
          if (!this.adapterRef.state.startPubVideoTime) {
            this.adapterRef.state.startPubVideoTime = Date.now()
          }
        }
      }
    }

    if (mediaTypeInput === 'screen' || mediaTypeInput === 'all') {
      if (this._screenProducer) {
        this.loggerSend.log('屏幕共享已经publish，跳过')
      } else if (stream.mediaHelper.screen.screenVideoStream.getVideoTracks().length) {
        const screenTrack = stream.mediaHelper.screen.screenVideoStream.getVideoTracks()[0]

        if (this.adapterRef.permKeyInfo?.pubVideoRight === false) {
          this.loggerSend.error('permKey权限控制，没有权利发布screen')
          this.adapterRef.instance.safeEmit('error', 'no-publish-screen-permission')
        } else if (screenTrack.readyState === 'ended') {
          this.loggerSend.error(`发布媒体流失败，轨道已关闭，请检查输入设备:screen`, screenTrack)
        } else {
          let trackLow: MediaStreamTrack | null = null
          if (this.adapterRef.channelInfo.screenLow) {
            if (!stream.mediaHelper.screen.low) {
              stream.mediaHelper.screen.low = new VideoTrackLow({
                logger: stream.logger,
                mediaType: 'screen'
              })
            }
            if (stream.mediaHelper.screen.low.track) {
              trackLow = stream.mediaHelper.screen.low.track
              this.adapterRef.instance.safeEmit('track-low-init-success', { mediaType: 'screen' })
            } else {
              this.adapterRef.instance.safeEmit('track-low-init-fail', { mediaType: 'screen' })
            }
          } else {
            // 不发布小流。此处如果发现上次有小流，则取消小流绑定（但不回收）
            if (stream.mediaHelper.screen.low) {
              stream.mediaHelper.screen.low.bindSender(null, null)
            }
            this.senderEncodingParameter.screen.low = null
          }
          this.loggerSend.log('发布屏幕共享 screenTrack: ', screenTrack.id, screenTrack.label)
          stream.pubStatus.screen.screen = true
          //@ts-ignore
          const codecInfo = this.adapterRef.mediaCapability.getCodecSend(
            'screen',
            //@ts-ignore
            this._sendTransport.handler._sendingRtpParametersByKind['video']
          )
          this._screenProducer = await this._sendTransport.produce({
            track: screenTrack,
            trackLow,
            codec: codecInfo.codecParam,
            codecOptions: {
              videoGoogleStartBitrate: 1000
            },
            appData: {
              preferRemb: this.adapterRef.preferRemb,
              deviceId: screenTrack.id,
              deviceIdLow: trackLow?.id || null,
              mediaType: 'screenShare'
            }
          })
          if (this._screenProducer._rtpSender && stream.mediaHelper.screen.low) {
            stream.mediaHelper.screen.low.bindSender(
              this._screenProducer._rtpSender,
              this._screenProducer._rtpSenderLow || null
            )
          }
          this.watchProducerState(this._screenProducer, '_screenProducer')
          if (this.adapterRef.encryption.encodedInsertableStreams) {
            if (this._screenProducer._rtpSender) {
              this.enableSendTransform(this._screenProducer._rtpSender, 'screen', 'high')
            }
            if (this._screenProducer._rtpSenderLow) {
              this.enableSendTransform(this._screenProducer._rtpSenderLow, 'screen', 'low')
            }
          }
          if (!this.adapterRef.state.startPubScreenTime) {
            this.adapterRef.state.startPubScreenTime = Date.now()
          }
        }
      }
    }
  }

  enableSendTransform(sender: RTCRtpSender, mediaType: MediaTypeShort, streamType: 'high' | 'low') {
    const senderInfo = this._sendTransport?.send.find((r) => r.sender === sender)
    if (!senderInfo) {
      this.loggerRecv.error('enableSendTransform() 未找到匹配的Sender', mediaType, streamType)
    } else {
      if (!senderInfo.encodedStreams) {
        // @ts-ignore
        const encodedStreams = sender.createEncodedStreams()
        const transformStream = new TransformStream({
          transform: this.adapterRef.encryption.handleUpstreamTransform.bind(
            this.adapterRef.encryption,
            senderInfo
          )
        })
        encodedStreams.readable.pipeThrough(transformStream).pipeTo(encodedStreams.writable)
        senderInfo.encodedStreams = encodedStreams
        senderInfo.transformStream = transformStream
        this.loggerRecv.log(
          `发送端自定义加密，成功启动。 ${senderInfo.mediaType} ${senderInfo.streamType}`
        )
      } else {
        this.loggerRecv.log(
          `发送端自定义加密，复用之前的通道。 ${senderInfo.mediaType} ${senderInfo.streamType}`
        )
      }
    }
  }

  enableRecvTransform(receiver: RTCRtpReceiver, uid: string | number, mediaType: MediaTypeShort) {
    const receiverInfo = this._recvTransport?.recv.find((r) => r.receiver === receiver)
    if (!receiverInfo) {
      this.loggerRecv.error('enableRecvTransform() 未找到匹配的Receiver', uid, mediaType)
    } else {
      if (!receiverInfo.encodedStreams) {
        // @ts-ignore
        const encodedStreams = receiver.createEncodedStreams()
        const transformStream = new TransformStream({
          transform: this.adapterRef.encryption.handleDownstreamTransform.bind(
            this.adapterRef.encryption,
            receiverInfo
          )
        })
        encodedStreams.readable.pipeThrough(transformStream).pipeTo(encodedStreams.writable)
        receiverInfo.encodedStreams = encodedStreams
        receiverInfo.transformStream = transformStream
        this.loggerRecv.log(
          `接收端自定义解密，成功启动。uid:${receiverInfo.uid}, mediaType: ${receiverInfo.mediaType}`
        )
      } else {
        this.loggerRecv.log(
          `接收端自定义解密，复用之前的通道。uid:${receiverInfo.uid}, mediaType: ${receiverInfo.mediaType}`
        )
      }
    }
  }

  watchProducerState(producer: Producer, tag: string) {
    if (producer.rtpSender?.transport) {
      const senderTransport = producer.rtpSender.transport
      switch (senderTransport.state) {
        case 'failed':
          this.logger.error(`Producer state ${tag} ${senderTransport.state}`)
          break
        case 'connected':
        case 'new':
        case 'connecting':
        default:
          this.logger.log(`Producer state ${tag} ${senderTransport.state}`)
          producer.rtpSender.transport.addEventListener('statechange', () => {
            switch (senderTransport.state) {
              case 'failed':
                this.logger.error(`Producer state changed: ${tag} ${senderTransport.state}`)
                break
              case 'connected':
              case 'new':
              case 'connecting':
                this.logger.log(`Producer state changed: ${tag} ${senderTransport.state}`)
            }
          })
      }
    } else {
      this.logger.log(`Producer state: transport is null`)
    }
  }

  async destroyProduce(kind: MediaTypeShort) {
    let producer = null
    let producerId = null
    if (!this.adapterRef.localStream) {
      throw new RtcError({
        code: ErrorCode.LOCALSTREAM_NOT_FOUND_ERROR,
        message: `destroyProduce.${kind}: 未找到 localStream`
      })
    }
    if (kind === 'audio') {
      producer = this._micProducer
      producerId = this._micProducerId
      this._micProducer = this._micProducerId = null
      this.adapterRef.localStream.pubStatus.audio.audio = false
    } else if (kind === 'audioSlave') {
      producer = this._audioSlaveProducer
      producerId = this._audioSlaveProducerId
      this._audioSlaveProducer = this._audioSlaveProducerId = null
      this.adapterRef.localStream.pubStatus.audioSlave.audio = false
    } else if (kind === 'video') {
      producer = this._webcamProducer
      producerId = this._webcamProducerId
      this._webcamProducer = this._webcamProducerId = null
      this.adapterRef.localStream.pubStatus.video.video = false
    } else if (kind === 'screen') {
      producer = this._screenProducer
      producerId = this._screenProducerId
      this._screenProducer = this._screenProducerId = null
      this.adapterRef.localStream.pubStatus.screen.screen = false
    }

    try {
      this.loggerSend.log(`停止发布 destroyProduce ${kind} producerId=`, producerId)
      if (!producer) return
      producer.close()
      if (!this.adapterRef._signalling?._protoo) {
        this.logger.warn(`destroyProduce: 当前信令中断, 不发信令包`, kind, producerId)
      } else {
        this.adapterRef._signalling._protoo
          .request('CloseProducer', {
            requestId: `${Math.ceil(Math.random() * 1e9)}`,
            producerId
          })
          .catch((e) => {
            this.logger.error('CloseProducer Failed: ', e.name, e.message)
          })
      }
    } catch (error: any) {
      this.loggerSend.error('destroyProduce failed: ', error.name, error.message)
    }
  }

  async createConsumer(
    uid: number | string,
    kind: 'audio' | 'video',
    mediaType: MediaType,
    id: string,
    preferredSpatialLayer = 0
  ) {
    this.adapterRef.instance.safeEmit('@pairing-createConsumer-start')
    let isExist = false
    //重复调用的问题在这里兼容去重，不再通过consumerStatus
    this._eventQueue.forEach((item) => {
      if (item.id === id) {
        this.loggerRecv.log(
          `[subscribe] 已经在订阅任务队列中，忽略该次请求, uid: ${uid}, mediaType: ${mediaType}, producerId: ${id}`
        )
        isExist = true
        return
      }
    })
    if (isExist) {
      return
    }
    return new Promise((resolve, reject) => {
      this._eventQueue.push({ uid, kind, id, mediaType, preferredSpatialLayer, resolve, reject })

      if (this._eventQueue.length > 1) {
        this._eventQueueData = Object.assign([], this._eventQueue)
        return
      } else {
        this._createConsumer(this._eventQueue[0])
      }
    })
  }

  async createConsumer69(
    uid: number | string,
    stream: RemoteStream,
    subStatus: any,
    pubStatus: object
  ) {
    // 兼容 chrome69 之前的版本（chrome68 及以下只支持 planB）

    if (this.consumerMap.has(uid)) {
      if (
        subStatus.audio == this.consumerMap.get(uid).subStatus.audio &&
        subStatus.video == this.consumerMap.get(uid).subStatus.video &&
        subStatus.audioSlave == this.consumerMap.get(uid).subStatus.audioSlave &&
        subStatus.screen == this.consumerMap.get(uid).subStatus.screen
      ) {
        this.logger.info('createConsumer69() uid 已经存在')
        return
      } else {
        // 只需替换subStatus
        this.consumerMap.get(uid).subStatus = subStatus
      }
    } else {
      this.consumerMap.set(uid, { stream, subStatus, pubStatus })
    }

    // 遍历this.consumerMap，每个 item 生成两路pc，一路主流音视频，一路辅流音视频
    let iceServers: RTCIceServer[] = []
    let iceTransportPolicy: RTCIceTransportPolicy = 'all'

    if (this.adapterRef.channelInfo.relaytoken && this.adapterRef.channelInfo.relayaddrs) {
      this.adapterRef.channelInfo.relayaddrs.forEach((item: string) => {
        iceServers.push(
          {
            urls: 'turn:' + item + '?transport=udp',
            credential:
              this.adapterRef.proxyServer.credential ||
              this.adapterRef.channelInfo.uid + '/' + this.adapterRef.channelInfo.cid,
            username: this.adapterRef.channelInfo.relaytoken
          },
          {
            urls: 'turn:' + item + '?transport=tcp',
            credential:
              this.adapterRef.proxyServer.credential ||
              this.adapterRef.channelInfo.uid + '/' + this.adapterRef.channelInfo.cid,
            username: this.adapterRef.channelInfo.relaytoken
          }
        )
      })
      //firefox浏览器在relay模式（存在bug）
      if (!env.IS_FIREFOX) {
        iceTransportPolicy = 'relay'
      }
    }

    if (iceServers.length) {
      this.logger.log(
        'iceTransportPolicy ',
        iceTransportPolicy,
        ' iceServers ',
        JSONBigStringify(iceServers)
      )
    }

    if (this.consumerMap.size) {
      this.consumerMap.forEach((item, key) => {
        if (this._mediasoupDevice) {
          // 针对每个 mediaType 创建一个 recvTransport
          if (item.subStatus.audio && !item._recvTransportMainAudio) {
            item._recvTransportMainAudio = this._mediasoupDevice.createRecvTransport({
              id: `${key}_main_audio`,
              iceParameters: undefined,
              iceCandidates: undefined,
              dtlsParameters: undefined,
              sctpParameters: undefined,
              iceServers,
              iceTransportPolicy,
              appData: {
                cid: this.adapterRef.channelInfo.cid,
                // uid: this.adapterRef.channelInfo.uid,
                uid: key.toString(),
                encodedInsertableStreams: this.adapterRef.encryption.encodedInsertableStreams
              }
            })
            // chrome 72 版本开始支持 connectionstatechange 属性，因此 69 以下版本用 iceconnectionstatechange 属性实现 _recvTransportConnectionstatechange() 重连方法
            // item._recvTransportMainAudio.handler._pc.addEventListener(
            //   'iceconnectionstatechange',
            //   () => {
            //     this.getIceStatus('recv')
            //   }
            // )

            item._recvTransportMainAudioTimeoutTimer = null

            item._recvTransportMainAudio._handler._pc.addEventListener(
              'iceconnectionstatechange',
              this._recvTransportConnectionstatechange69.bind(
                this,
                item._recvTransportMainAudio,
                item._recvTransportMainAudioTimeoutTimer
              )
            )

            this._createConsumer69(
              key,
              'audio',
              'audio',
              item.pubStatus.audio.producerId,
              item._recvTransportMainAudio
            )
          }

          if (item.subStatus.video && !item._recvTransportMainVideo) {
            item._recvTransportMainVideo = this._mediasoupDevice.createRecvTransport({
              id: `${key}_main_video`,
              iceParameters: undefined,
              iceCandidates: undefined,
              dtlsParameters: undefined,
              sctpParameters: undefined,
              iceServers,
              iceTransportPolicy,
              appData: {
                cid: this.adapterRef.channelInfo.cid,
                // uid: this.adapterRef.channelInfo.uid,
                uid: key.toString(),
                encodedInsertableStreams: this.adapterRef.encryption.encodedInsertableStreams
              }
            })
            // item._recvTransportMainVideo.handler._pc.addEventListener(
            //   'iceconnectionstatechange',
            //   () => {
            //     this.getIceStatus('recv')
            //   }
            // )
            item._recvTransportMainVideoTimeoutTimer = null

            item._recvTransportMainVideo._handler._pc.addEventListener(
              'iceconnectionstatechange',
              this._recvTransportConnectionstatechange69.bind(
                this,
                item._recvTransportMainVideo,
                item._recvTransportMainVideoTimeoutTimer
              )
            )

            this._createConsumer69(
              key,
              'video',
              'video',
              item.pubStatus.video.producerId,
              item._recvTransportMainVideo
            )
          }

          if (item.subStatus.audioSlave && !item._recvTransportSubAudioSlave) {
            item._recvTransportSubAudioSlave = this._mediasoupDevice.createRecvTransport({
              // id: this.adapterRef.channelInfo.uid,
              id: `${key}_sub_audioSlave`,
              iceParameters: undefined,
              iceCandidates: undefined,
              dtlsParameters: undefined,
              sctpParameters: undefined,
              iceServers,
              iceTransportPolicy,
              appData: {
                cid: this.adapterRef.channelInfo.cid,
                // uid: this.adapterRef.channelInfo.uid,
                uid: key.toString(),
                encodedInsertableStreams: this.adapterRef.encryption.encodedInsertableStreams
              }
            })

            // item._recvTransportSubAudioSlave.handler._pc.addEventListener(
            //   'iceconnectionstatechange',
            //   () => {
            //     this.getIceStatus('recv')
            //   }
            // )

            item._recvTransportSubAudioSlaveTimeoutTimer = null

            item._recvTransportSubAudioSlave._handler._pc.addEventListener(
              'iceconnectionstatechange',
              this._recvTransportConnectionstatechange69.bind(
                this,
                item._recvTransportSubAudioSlave,
                item._recvTransportSubAudioSlaveTimeoutTimer
              )
            )

            this._createConsumer69(
              key,
              'audio',
              'audioSlave',
              item.pubStatus.audioSlave.producerId,
              item._recvTransportSubAudioSlave
            )
          }

          if (item.subStatus.screen && !item._recvTransportSubScreen) {
            item._recvTransportSubScreen = this._mediasoupDevice.createRecvTransport({
              // id: this.adapterRef.channelInfo.uid,
              id: `${key}_sub_screen`,
              iceParameters: undefined,
              iceCandidates: undefined,
              dtlsParameters: undefined,
              sctpParameters: undefined,
              iceServers,
              iceTransportPolicy,
              appData: {
                cid: this.adapterRef.channelInfo.cid,
                // uid: this.adapterRef.channelInfo.uid,
                uid: key.toString(),
                encodedInsertableStreams: this.adapterRef.encryption.encodedInsertableStreams
              }
            })

            // item._recvTransportSubScreen.handler._pc.addEventListener(
            //   'iceconnectionstatechange',
            //   () => {
            //     this.getIceStatus('recv')
            //   }
            // )

            item._recvTransportSubScreenTimeoutTimer = null

            item._recvTransportSubScreen._handler._pc.addEventListener(
              'iceconnectionstatechange',
              this._recvTransportConnectionstatechange69.bind(
                this,
                item._recvTransportSubScreen,
                item._recvTransportSubScreenTimeoutTimer
              )
            )

            this._createConsumer69(
              key,
              'video',
              'screen',
              item.pubStatus.screen.producerId,
              item._recvTransportSubScreen
            )
          }
        }
      })
    }
  }

  async setConsumerPreferredLayer(
    remoteStream: RemoteStream,
    layer: number,
    mediaType: MediaTypeShort
  ) {
    if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: 'setConsumerPreferredLayer: _protoo 未找到'
      })
    }
    this.loggerSend.log(
      'setConsumerPreferredLayer() [切换大小流]layer: ',
      layer,
      layer === 1 ? '大流' : '小流',
      mediaType
    )
    const result = await this.adapterRef._signalling._protoo.request('SetConsumerPreferredLayer', {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      uid: new SimpleBig(remoteStream.streamID),
      producerId: remoteStream.pubStatus[mediaType].producerId,
      consumerId: remoteStream.pubStatus[mediaType].consumerId,
      spatialLayer: layer
    })
    return result
  }

  async resetConsumeRequestStatus() {
    const queue = this._eventQueue
    this._eventQueue = []
    for (let i = 0; i < queue.length; i++) {
      const info: ProduceConsumeInfo = queue[i]
      this.loggerRecv.log(
        `resetConsumeRequestStatus：uid ${info.uid}, uid ${info.uid}, kind ${info.kind}, id ${info.id}`
      )
      info.reject('resetConsumeRequestStatus')
    }
  }

  removeUselessConsumeRequest(uid: number | string, mediaType: MediaType | 'all') {
    if (!uid) return
    //清除订阅队列中已经无用的订阅任务，直接忽略当前的订阅任务，因为已经在流程中了，无法终止，即使错误了内部会兼容掉（伪造M行）
    for (let i = this._eventQueue.length - 1; i >= 1; i--) {
      const info: ProduceConsumeInfo = this._eventQueue[i]
      if (
        info.uid.toString() === uid.toString() &&
        (info.mediaType === mediaType || mediaType === 'all')
      ) {
        this.loggerRecv.warn(
          `removeUselessConsumeRequest：uid ${info.uid}, mediaType ${info.mediaType}, id ${info.id}, i ${i}`
        )
        info.resolve(null)
        this._eventQueue.splice(i, 1)
      }
    }
  }

  // 返回值是个标记，以防_createConsumer某个分支忘记调用checkConsumerList
  checkConsumerList(info: ProduceConsumeInfo): 'checkConsumerList' {
    this._eventQueue.shift()
    info.resolve(null)
    this.loggerRecv.log('查看事件队列, _eventQueue: ', this._eventQueue.length)
    this._eventQueue.forEach((item) => {
      this.loggerRecv.log(
        `consumerList, uid: ${item.uid}, kind: ${item.kind}, mediaType: ${item.mediaType}, id: ${item.id}`
      )
    })
    if (this._eventQueue.length > 0) {
      this._createConsumer(this._eventQueue[0])
    }
    return 'checkConsumerList'
  }

  async _createConsumer(info: ProduceConsumeInfo): Promise<'checkConsumerList'> {
    const { uid, kind, mediaType, id, preferredSpatialLayer = 0 } = info
    const mediaTypeShort = mediaType === 'screenShare' ? 'screen' : mediaType
    if (mediaTypeShort === 'audio') {
      this.loggerRecv.log(`[Subscribe] 开始订阅 ${uid} 的 ${mediaTypeShort} 媒体: ${id}`)
    } else {
      this.loggerRecv.log(
        `[Subscribe] 开始订阅 ${uid} 的 ${mediaTypeShort} 媒体: ${id} preferredSpatialLayer: ${preferredSpatialLayer} 大小流: `,
        preferredSpatialLayer === 1 ? '大流' : '小流'
      )
    }

    if (!id) {
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-error')
      return this.checkConsumerList(info)
    } else if (this.unsupportedProducers[id]) {
      this.loggerRecv.warn(
        '[Subscribe] createConsumer: 跳过不支持的Producer',
        id,
        JSONBigStringify(this.unsupportedProducers[id])
      )
      return this.checkConsumerList(info)
    }

    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    //@ts-ignore
    if (
      !remoteStream ||
      //@ts-ignore
      !remoteStream.pubStatus[mediaTypeShort][mediaTypeShort] ||
      !remoteStream.pubStatus[mediaTypeShort].producerId
    ) {
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-skip')
      return this.checkConsumerList(info)
    }

    if (remoteStream['pubStatus'][mediaTypeShort]['consumerId']) {
      this.loggerRecv.log('[Subscribe] 已经订阅过')
      let isPlaying = true
      if (remoteStream.Play) {
        isPlaying = remoteStream._play.isPlaying(mediaTypeShort)
      }

      if (isPlaying) {
        this.loggerRecv.log('[Subscribe] 当前播放正常，直接返回')
        this.adapterRef.instance.safeEmit('@pairing-createConsumer-skip')
        return this.checkConsumerList(info)
      } else if (remoteStream.pubStatus[mediaTypeShort].stopconsumerStatus !== 'start') {
        this.loggerRecv.log('[Subscribe] 先停止之前的订阅')
        try {
          remoteStream.pubStatus[mediaTypeShort].stopconsumerStatus = 'start'
          if (!this.adapterRef._mediasoup) {
            return this.checkConsumerList(info)
          }
          await this.destroyConsumer(remoteStream.pubStatus.audio.consumerId, null, null)
          this.adapterRef.instance.removeSsrc(remoteStream.getId(), mediaTypeShort)
          remoteStream.pubStatus[mediaTypeShort].consumerId = ''
          remoteStream.stop(mediaTypeShort)
          remoteStream.pubStatus[mediaTypeShort].stopconsumerStatus = 'end'
        } catch (e: any) {
          this.loggerRecv.error('[Subscribe] 停止之前的订阅出现错误: ', e.name, e.message)
        }
      }
    }

    let codecOptions = null
    if (mediaTypeShort === 'audio' || mediaTypeShort === 'audioSlave') {
      codecOptions = {
        opusStereo: 1
      }
    }
    if (!this._mediasoupDevice || !this._mediasoupDevice.loaded) {
      this.loggerRecv.warn('[Subscribe] createConsumer：Waiting for Transport Ready')
      await waitForEvent(this, 'transportReady', 3000)
    }
    if (!this._recvTransport) {
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-error')
      info.resolve(null)
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `createConsumer: 接收端 transport 未找到`
      })
    }

    this.loggerRecv.log(
      `[Subscribe] prepareLocalSdp [kind: ${kind}, mediaTypeShort: ${mediaTypeShort}, uid: ${uid}]`
    )
    if (this._recvTransport.id === this.adapterRef.channelInfo.uid) {
      this.loggerRecv.log('[Subscribe] transporth还没有协商, 需要dtls消息')
      this._recvTransport._handler._transportReady = false
    }
    const prepareRes = await this._recvTransport.prepareLocalSdp(
      kind,
      this._edgeRtpCapabilities,
      uid
    )
    if (
      !this.adapterRef ||
      this.adapterRef.connectState.curState == 'DISCONNECTING' ||
      this.adapterRef.connectState.curState == 'DISCONNECTED'
    ) {
      this.checkConsumerList(info)
    }
    this.loggerRecv.log('[Subscribe] 获取本地sdp, mid =', prepareRes.mid)

    let { rtpCapabilities, offer } = prepareRes
    let mid: number | string | undefined = prepareRes.mid
    const localDtlsParameters = prepareRes.dtlsParameters

    if (typeof mid === 'number' && mid < 0) {
      mid = undefined
    } else {
      mid = `${mid}`
    }
    const iceUfragRegRemote = offer.sdp.match(/a=ice-ufrag:([0-9a-zA-Z=#+-_\/\\\\]+)/)
    if (!iceUfragRegRemote) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `_createConsumer: iceUfragRegRemote 为空`
      })
    }

    let data: any = {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      kind,
      rtpCapabilities,
      uid: new SimpleBig(uid),
      producerId: id,
      preferredSpatialLayer,
      mid,
      pause: false,
      iceUfrag: iceUfragRegRemote[1],
      // WebASL 1.0协议迷思：实际audioAslFlag对整个Transport生效。只有第一次Consume时的audioAslFlag有效，且覆盖整个Transport。Video也要带。
      audioAslFlag: this.adapterRef.audioAsl.enabled === 'yes' && getParameters().audioAslFlag,
      appData: {
        enableTcpCandidate: true
      }
    }

    if (localDtlsParameters === undefined) {
      data.transportId = this._recvTransport.id
    } else {
      data.dtlsParameters = localDtlsParameters
    }
    this.loggerRecv.log(
      `[Subscribe] 发送consume请求, uid: ${uid}, kind: ${kind}, mediaTypeShort: ${mediaTypeShort}, producerId: ${data.producerId}, transportId: ${data.transportId}, requestId: ${data.requestId}`
    )
    if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo) {
      info.resolve(null)
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `_createConsumer: _protoo 未找到`
      })
    }
    const _protoo = this.adapterRef._signalling._protoo
    let consumeRes: any = null
    try {
      consumeRes = await this.adapterRef._signalling._protoo.request('Consume', data)
    } catch (e: any) {
      if (
        e.message === 'request timeout' &&
        this.adapterRef._signalling._protoo.id === _protoo.id
      ) {
        this.logger.error(
          `[Subscribe] Consume消息Timeout, 尝试信令重连: ${e.name}/${e.message}, 当前的连接状态: ${this.adapterRef.connectState.curState}, 原始请求: `,
          JSONBigStringify(data)
        )
        this.adapterRef.channelStatus = 'connectioning'
        this.adapterRef.instance.apiEventReport('setDisconnect', {
          reason: 'consumeRequestTimeout',
          ext: '' //扩展可选
        })
        this.adapterRef._signalling._reconnection()
      } else {
        this.logger.error(
          `[Subscribe] Consume消息错误: ${e.name}/${e.message}, 当前的连接状态：${this.adapterRef.connectState.curState}, 原始请求：`,
          JSONBigStringify(data)
        )
      }
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `_createConsumer: Consume 消息错误:${e.message}`
      })
    }
    let {
      transportId,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      probeSSrc,
      rtpParameters,
      turnParameters,
      producerId,
      consumerId,
      code,
      errMsg
    } = consumeRes
    this.loggerRecv.log(
      `[Subscribe] consume反馈结果 code: ${code} uid: ${uid}, mid: ${
        rtpParameters && rtpParameters.mid
      }, kind: ${kind}, producerId: ${producerId}, consumerId: ${consumerId}, transportId: ${transportId}, requestId: ${
        consumeRes.requestId
      }, errMsg: ${errMsg}`
    )
    if (!this._recvTransport) {
      this.loggerRecv.error(`[Subscribe] transport undefined, 直接返回`)
      return this.checkConsumerList(info)
    }
    if (code !== 200) {
      //此时peer仅仅执行过addTransceiver和createOffer，没有localDescription和remoteDescription
      if (!this._recvTransport?._handler?.remoteSdp) {
        this._recvTransport.recoverLocalSdp(uid, '0', kind)
        this.loggerRecv.log('[Subscribe] consume, 此外没有remoteSdp, 忽略改次失败的consume')
        return this.checkConsumerList(info)
      }
    }

    // if (code === 200) {
    //   //this.loggerRecv.log(`[Subscribe] consume反馈结果: code: ${code} uid: ${uid}, mid: ${rtpParameters && rtpParameters.mid}, kind: ${kind}, producerId: ${producerId}, consumerId: ${consumerId}, transportId: ${transportId}, requestId: ${consumeRes.requestId}, errMsg: ${errMsg}`);
    // } else if (code === 601){
    //   //通过伪造M行的方式，当然第一次订阅就失败的话，由重连cover，这里就不再执行黑名单的逻辑了
    //   // 某些情况下的Producer换了个Transport之后是可以订阅的。这个时候需要拉黑的是Producer+Transport的组合
    //   // this.loggerRecv.error(`consume请求失败，将Producer+Transport拉入黑名单:  uid: ${uid}, mediaType: ${mediaTypeShort}, producerId ${data.producerId} transportId ${this._recvTransport._id} code: ${code}, errMsg: ${errMsg}`, consumeRes);
    //   // this.unsupportedProducers[data.producerId] = {
    //   //   pc: recvPC,
    //   //   consumeRes: {
    //   //     producerId: consumeRes.producerId,
    //   //     code: code,
    //   //     uid: uid,
    //   //     mediaType: mediaTypeShort,
    //   //     errMsg: errMsg,
    //   //   }
    //   // };
    //   // return this.checkConsumerList(info);
    // } else if (this._recvTransport?._handler._pc.remoteDescription === null){
    //   //通过伪造M行的方式，当然第一次订阅就失败的话，由重连cover，这里就不再执行黑名单的逻辑了，由于是首次订阅进行的重连，应该不影响用户体验
    //   // this.loggerRecv.error(`[Subscribe] consume请求失败，将Producer拉入黑名单:  uid: ${uid}, mediaType: ${mediaTypeShort}, producerId ${data.producerId} code: ${code}, errMsg: ${errMsg}`, consumeRes);
    //   // this.unsupportedProducers[data.producerId] = {
    //   //   producerId: consumeRes.producerId,
    //   //   code: code,
    //   //   uid: uid,
    //   //   mediaType: mediaTypeShort,
    //   //   errMsg: errMsg,
    //   // };
    //   // return this.checkConsumerList(info);
    //   //this.loggerRecv.log(`consume反馈结果: code: ${code} uid: ${uid}, mid: ${rtpParameters && rtpParameters.mid}, kind: ${kind}, producerId: ${producerId}, consumerId: ${consumerId}, transportId: ${transportId}, requestId: ${consumeRes.requestId}, errMsg: ${errMsg}`);
    // }

    // if (id != remoteStream.pubStatus[mediaTypeShort].producerId) {
    //   //这里不用关心，其实只要是producerId不一致，就会进入订阅队列
    //   this.loggerRecv.log('[Subscribe] 此前的订阅已经失效，重新订阅')
    //   this.adapterRef.instance.doSubscribe(remoteStream)
    // }
    if (turnParameters) {
      //服务器反馈turn server，sdk更新ice Server
      let iceServers = []
      iceServers.push(
        {
          urls: 'turn:' + turnParameters.ip + ':' + turnParameters.port + '?transport=udp',
          credential: turnParameters.password,
          username: turnParameters.username
        },
        {
          urls: 'turn:' + turnParameters.ip + ':' + turnParameters.port + '?transport=tcp',
          credential: turnParameters.password,
          username: turnParameters.username
        }
      )
      await this._recvTransport.updateIceServers({ iceServers })
    }
    const peerId = consumeRes.uid
    if (
      rtpParameters &&
      rtpParameters.encodings &&
      rtpParameters.encodings.length &&
      rtpParameters.encodings[0].ssrc
    ) {
      this.adapterRef.instance.addSsrc(uid, mediaTypeShort, rtpParameters.encodings[0].ssrc)
    }
    if (transportId !== undefined) {
      this._recvTransport._id = transportId
    }
    if (probeSSrc !== undefined) {
      this._probeSSrc = probeSSrc
    }
    if (iceParameters) {
      this._recvTransportIceParameters = iceParameters
    }

    if (rtpParameters && rtpParameters.mid != undefined) {
      rtpParameters.mid = rtpParameters.mid + ''
    }

    let remoteIceCandidates = iceCandidates
    if (this.adapterRef.channelInfo.iceProtocol && iceCandidates) {
      this.logger.warn('Consume iceProtocol: ', this.adapterRef.channelInfo.iceProtocol)
      remoteIceCandidates = iceCandidates.filter((item: any) => {
        return item.protocol == this.adapterRef.channelInfo.iceProtocol
      })
    }

    const consumer = await this._recvTransport.consume({
      id: consumerId || producerId || id, //服务器400的错误中，response是不反馈consumerId和producerId，这里使用本地保存的id
      producerId: producerId || id,
      kind,
      mediaType: mediaTypeShort,
      uid: uid || peerId,
      rtpParameters,
      codecOptions,
      appData: { peerId, remoteUid: uid, mid }, // Trick.
      offer,
      iceParameters,
      iceCandidates: remoteIceCandidates,
      dtlsParameters,
      sctpParameters: undefined,
      probeSSrc: this._probeSSrc
    })
    if (this.adapterRef.encryption.encodedInsertableStreams && consumer.rtpReceiver) {
      this.enableRecvTransform(consumer.rtpReceiver, uid, mediaTypeShort)
    }
    this._consumers[consumer.id] = consumer

    consumer.on('transportclose', () => {
      this._consumers && delete this._consumers[consumer.id]
    })

    this.loggerRecv.log('[Subscribe] 订阅consume完成 peerId =', peerId)
    this.adapterRef.instance.apiEventReport('setFunction', {
      name: `set_${mediaTypeShort}_sub`,
      oper: '1',
      value: JSONBigStringify(
        {
          remoteUid: uid,
          result: code,
          reason: errMsg || '',
          preferredSpatialLayer,
          consumerId: consumerId || '',
          producerId: producerId || id
        },
        null,
        ' '
      )
    })
    if (remoteStream && remoteStream['pubStatus'][mediaTypeShort]['producerId']) {
      remoteStream['subStatus'][mediaTypeShort] = true
      //@ts-ignore
      remoteStream['pubStatus'][mediaTypeShort][mediaTypeShort] = true
      remoteStream['pubStatus'][mediaTypeShort]['consumerId'] = consumerId
      remoteStream['pubStatus'][mediaTypeShort]['producerId'] = producerId
      if (remoteStream.getMuteStatus(mediaTypeShort).muted) {
        this.loggerRecv.log(
          `[Subscribe] 远端流处于mute状态：uid ${remoteStream.getId()}, ${mediaTypeShort}, ${JSONBigStringify(
            remoteStream.getMuteStatus(mediaTypeShort)
          )}`
        )
        const muteStatus = remoteStream.getMuteStatus(mediaTypeShort)
        if (muteStatus.send) {
          this.loggerRecv.log(
            `[Subscribe] 远端流把自己mute了：uid ${remoteStream.getId()}, ${mediaTypeShort}, ${JSONBigStringify(
              muteStatus
            )}`
          )
        }
        if (muteStatus.recv) {
          this.loggerRecv.log(
            `[Subscribe] 本端把远端流mute了：uid ${remoteStream.getId()}, ${mediaTypeShort}, ${JSONBigStringify(
              muteStatus
            )}`
          )
          consumer.track.enabled = false
        }
      } else {
        consumer.track.enabled = true
      }
      remoteStream.mediaHelper.updateStream(mediaTypeShort, consumer.track)
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-success')
      if (mediaTypeShort === 'audio') {
        if (
          this.adapterRef.state.signalAudioSubscribedTime < this.adapterRef.state.signalOpenTime
        ) {
          this.adapterRef.state.signalAudioSubscribedTime = Date.now()
        }
      } else if (mediaTypeShort === 'video') {
        if (
          this.adapterRef.state.signalVideoSubscribedTime < this.adapterRef.state.signalOpenTime
        ) {
          this.adapterRef.state.signalVideoSubscribedTime = Date.now()
        }
      }
      this.adapterRef.instance.safeEmit('stream-subscribed', {
        stream: remoteStream,
        mediaType: mediaTypeShort
      })
    } else {
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-error')
      this.loggerRecv.log(
        '[Subscribe] 该次consume状态错误: ',
        JSONBigStringify(remoteStream['pubStatus'], null, '')
      )
    }
    return this.checkConsumerList(info)
  }

  async _createConsumer69(
    uid: number | string,
    kind: 'video' | 'audio',
    mediaType: MediaTypeShort,
    id: string,
    transport69: mediasoupClient.types.Transport
  ) {
    // 传入的 info 参数为 每个 recvTransport

    // TODO: 远端用户退房之后，_usedUidMediaTypes 需要清除(内部监听stream-removed，然后清理map)
    let key = `${uid}_${mediaType}`
    if (this._usedUidMediaTypes[key]) {
      this.logger.info(`_createConsumer69 去重: `, key)
      return
    }
    this._usedUidMediaTypes[key] = true
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    let prepareRes = await transport69.prepareLocalSdp(kind, this._edgeRtpCapabilities, uid)

    this.loggerRecv.log('[Subscribe] 获取本地sdp, mid =', prepareRes.mid)

    let { rtpCapabilities, offer } = prepareRes
    let mid: number | string | undefined = prepareRes.mid
    const localDtlsParameters = prepareRes.dtlsParameters

    if (typeof mid === 'number' && mid < 0) {
      mid = undefined
    } else {
      mid = `${mid}`
    }
    const iceUfragRegRemote = offer.sdp.match(/a=ice-ufrag:([0-9a-zA-Z=#+-_\/\\\\]+)/)
    if (!iceUfragRegRemote) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `_createConsumer: iceUfragRegRemote 为空`
      })
    }
    let data: any = {
      requestId: `${Math.ceil(Math.random() * 1e9)}`,
      kind,
      rtpCapabilities,
      uid: new SimpleBig(uid),
      producerId: id,
      preferredSpatialLayer: 0,
      mid,
      pause: false,
      iceUfrag: iceUfragRegRemote[1],
      // WebASL 1.0协议迷思：实际audioAslFlag对整个Transport生效。只有第一次Consume时的audioAslFlag有效，且覆盖整个Transport。Video也要带。
      audioAslFlag: this.adapterRef.audioAsl.enabled === 'yes' && getParameters().audioAslFlag,
      appData: {
        enableTcpCandidate: true
      }
    }
    if (localDtlsParameters === undefined) {
      data.transportId = transport69.id
    } else {
      data.dtlsParameters = localDtlsParameters
    }
    this.loggerRecv.log(
      `[Subscribe] 发送consume请求, uid: ${uid}, kind: ${kind}, mediaTypeShort: ${mediaType}, producerId: ${data.producerId}, transportId: ${data.transportId}, requestId: ${data.requestId}`
    )
    if (!this.adapterRef._signalling || !this.adapterRef._signalling._protoo) {
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `_createConsumer: _protoo 未找到`
      })
    }
    const _protoo = this.adapterRef._signalling._protoo
    let consumeRes: any = null
    try {
      consumeRes = await this.adapterRef._signalling._protoo.request('Consume', data)
    } catch (e: any) {
      if (
        e.message === 'request timeout' &&
        this.adapterRef._signalling._protoo.id === _protoo.id
      ) {
        this.logger.error(
          `[Subscribe] Consume消息Timeout, 尝试信令重连: ${e.name}/${e.message}, 当前的连接状态: ${this.adapterRef.connectState.curState}, 原始请求: `,
          JSONBigStringify(data)
        )
        this.adapterRef.channelStatus = 'connectioning'
        this.adapterRef.instance.apiEventReport('setDisconnect', {
          reason: 'consumeRequestTimeout',
          ext: '' //扩展可选
        })
        this.adapterRef._signalling._reconnection()
      } else {
        this.logger.error(
          `[Subscribe] Consume消息错误: ${e.name}/${e.message}, 当前的连接状态：${this.adapterRef.connectState.curState}, 原始请求：`,
          JSONBigStringify(data)
        )
      }
      throw new RtcError({
        code: ErrorCode.UNKNOWN_TYPE_ERROR,
        message: `_createConsumer: Consume 消息错误:${e.message}`
      })
    }
    let {
      transportId,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      probeSSrc,
      rtpParameters,
      turnParameters,
      producerId,
      consumerId,
      code,
      errMsg
    } = consumeRes
    this.loggerRecv.log(
      `[Subscribe] consume反馈结果 code: ${code} uid: ${uid}, mid: ${
        rtpParameters && rtpParameters.mid
      }, kind: ${kind}, producerId: ${producerId}, consumerId: ${consumerId}, transportId: ${transportId}, requestId: ${
        consumeRes.requestId
      }, errMsg: ${errMsg}`
    )

    if (turnParameters) {
      //服务器反馈turn server，sdk更新ice Server
      let iceServers = []
      iceServers.push(
        {
          urls: 'turn:' + turnParameters.ip + ':' + turnParameters.port + '?transport=udp',
          credential: turnParameters.password,
          username: turnParameters.username
        },
        {
          urls: 'turn:' + turnParameters.ip + ':' + turnParameters.port + '?transport=tcp',
          credential: turnParameters.password,
          username: turnParameters.username
        }
      )
      await transport69.updateIceServers({ iceServers })
    }
    const peerId = consumeRes.uid

    if (
      rtpParameters &&
      rtpParameters.encodings &&
      rtpParameters.encodings.length &&
      rtpParameters.encodings[0].ssrc
    ) {
      this.adapterRef.instance.addSsrc(uid, mediaType, rtpParameters.encodings[0].ssrc)
    }
    if (transportId !== undefined) {
      transport69._id = transportId
    }
    if (probeSSrc !== undefined) {
      this._probeSSrc = probeSSrc
    }
    if (iceParameters) {
      this._recvTransportIceParameters = iceParameters
    }

    if (rtpParameters && rtpParameters.mid != undefined) {
      rtpParameters.mid = rtpParameters.mid + ''
    }

    let remoteIceCandidates = iceCandidates
    if (this.adapterRef.channelInfo.iceProtocol && iceCandidates) {
      this.logger.warn('Consume iceProtocol: ', this.adapterRef.channelInfo.iceProtocol)
      remoteIceCandidates = iceCandidates.filter((item: any) => {
        return item.protocol == this.adapterRef.channelInfo.iceProtocol
      })
    }

    let codecOptions = null
    if (mediaType === 'audio' || mediaType === 'audioSlave') {
      codecOptions = {
        opusStereo: 1
      }
    }

    const consumer = await transport69.consume({
      id: consumerId || producerId || id, //服务器400的错误中，response是不反馈consumerId和producerId，这里使用本地保存的id
      producerId: producerId || id,
      kind,
      mediaType: mediaType,
      uid: uid || peerId,
      rtpParameters,
      codecOptions,
      appData: { peerId, remoteUid: uid, mid }, // Trick.
      offer,
      iceParameters,
      iceCandidates: remoteIceCandidates,
      dtlsParameters,
      sctpParameters: undefined,
      probeSSrc: this._probeSSrc
    })

    this._consumers[consumer.id] = consumer

    consumer.on('transportclose', () => {
      this._consumers && delete this._consumers[consumer.id]
    })

    this.loggerRecv.log('[Subscribe] 订阅consume完成 peerId =', peerId)
    this.adapterRef.instance.apiEventReport('setFunction', {
      name: `set_${mediaType}_sub`,
      oper: '1',
      value: JSONBigStringify(
        {
          remoteUid: uid,
          result: code,
          reason: errMsg || '',
          preferredSpatialLayer: 0,
          consumerId: consumerId || '',
          producerId: producerId || id
        },
        null,
        ' '
      )
    })
    if (remoteStream && remoteStream['pubStatus'][mediaType]['producerId']) {
      remoteStream['subStatus'][mediaType] = true
      //@ts-ignore
      remoteStream['pubStatus'][mediaType][mediaType] = true
      remoteStream['pubStatus'][mediaType]['consumerId'] = consumerId
      remoteStream['pubStatus'][mediaType]['producerId'] = producerId
      if (remoteStream.getMuteStatus(mediaType).muted) {
        this.loggerRecv.log(
          `[Subscribe] 远端流处于mute状态：uid ${remoteStream.getId()}, ${mediaType}, ${JSONBigStringify(
            remoteStream.getMuteStatus(mediaType)
          )}`
        )
        const muteStatus = remoteStream.getMuteStatus(mediaType)
        if (muteStatus.send) {
          this.loggerRecv.log(
            `[Subscribe] 远端流把自己mute了：uid ${remoteStream.getId()}, ${mediaType}, ${JSONBigStringify(
              muteStatus
            )}`
          )
        }
        if (muteStatus.recv) {
          this.loggerRecv.log(
            `[Subscribe] 本端把远端流mute了：uid ${remoteStream.getId()}, ${mediaType}, ${JSONBigStringify(
              muteStatus
            )}`
          )
          consumer.track.enabled = false
        }
      } else {
        consumer.track.enabled = true
      }
      remoteStream.mediaHelper.updateStream(mediaType, consumer.track)
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-success')
      if (mediaType === 'audio') {
        if (
          this.adapterRef.state.signalAudioSubscribedTime < this.adapterRef.state.signalOpenTime
        ) {
          this.adapterRef.state.signalAudioSubscribedTime = Date.now()
        }
      } else if (mediaType === 'video') {
        if (
          this.adapterRef.state.signalVideoSubscribedTime < this.adapterRef.state.signalOpenTime
        ) {
          this.adapterRef.state.signalVideoSubscribedTime = Date.now()
        }
      }
      this.adapterRef.instance.safeEmit('stream-subscribed', {
        stream: remoteStream,
        mediaType: mediaType
      })
    } else {
      this.adapterRef.instance.safeEmit('@pairing-createConsumer-error')
      this.loggerRecv.log(
        '[Subscribe] 该次consume状态错误: ',
        JSONBigStringify(remoteStream['pubStatus'], null, '')
      )
    }
  }

  async destroyConsumer(
    consumerId: string,
    remoteStream: RemoteStream | null,
    mediaType: MediaTypeShort | null
  ) {
    if (!consumerId) return
    try {
      const consumer = this._consumers[consumerId]
      if (!consumer) {
        this.loggerRecv.log(
          '跳过停止订阅 destroyConsumer consumerId=',
          consumerId,
          remoteStream?.streamID
        )
        return
      } else {
        this.loggerRecv.log(
          '停止订阅 destroyConsumer consumerId=',
          consumerId,
          remoteStream?.streamID
        )
      }
      delete this._consumers[consumerId]
      if (env.ANY_CHROME_MAJOR_VERSION && env.ANY_CHROME_MAJOR_VERSION < 69) {
        // 同步 consumerMap 状态
        let streamID = remoteStream!.streamID.toString()
        this.consumerMap!.get(streamID).subStatus[mediaType!] = false

        // @ts-ignore
        this.consumerMap!.get(streamID)[recvMediaTransportMap.get(mediaType)[0]].close()

        // @ts-ignore
        this.consumerMap!.get(streamID)[recvMediaTransportMap.get(mediaType)[0]] = null
        // @ts-ignore
        let timeoutTimer = this.consumerMap!.get(streamID)[recvMediaTransportMap.get(mediaType)[1]]
        if (timeoutTimer) {
          clearTimeout(timeoutTimer)
        }
        timeoutTimer = null

        // 同步 _usedUidMediaTypes 状态
        let key = `${streamID}_${mediaType}`
        this._usedUidMediaTypes[key] = false
      }
      try {
        await this.adapterRef._signalling?._protoo?.request('CloseConsumer', {
          requestId: `${Math.ceil(Math.random() * 1e9)}`,
          consumerId,
          producerId: consumer.producerId
        })
        await consumer.close()
        if (remoteStream && mediaType) {
          this.adapterRef.instance.safeEmit('@stream-unsubscribed', {
            stream: remoteStream,
            mediaType
          })
        }
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: `set_${mediaType}_sub`,
          oper: '0',
          value: JSONBigStringify(
            {
              remoteUid: remoteStream?.stringStreamID,
              consumerId: consumerId || ''
            },
            null,
            ' '
          )
        })
      } catch (e: any) {
        this.logger.error('CloseConsumer失败', e.name, e.message, e)
      }
    } catch (error: any) {
      this.loggerRecv.error('destroyConsumer() | failed:', error.name, error.message, error.stack)
    }
  }

  async closeTransport(transport: Transport) {
    if (!transport || !transport.id) return
    try {
      this.logger.log(`closeTransport() [停止通道 transportId= ${transport.id}]`)
      const result = await this.adapterRef._signalling?._protoo?.request('CloseTransport', {
        requestId: `${Math.ceil(Math.random() * 1e9)}`,
        transportId: transport.id
      })
      this.logger.log(
        `closeTransport() [停止通道反馈结果 result=${JSONBigStringify(result, null, ' ')}]`
      )
      transport.close()
    } catch (error: any) {
      this.logger.error('closeTransport() | failed:', error.name, error.message)
    }
  }

  async muteAudio() {
    this.loggerSend.log('mute音频')
    this._micProducer?.pause()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._micProducer?.id,
            mute: true
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('muteAudio() | failed:', e.name, e.message, e)
    }
  }

  async unmuteAudio() {
    this.loggerSend.log('unmute音频')
    this._micProducer?.resume()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._micProducer?.id,
            mute: false
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('unmuteAudio() | failed: ', e.name, e.message)
      return Promise.reject(e)
    }
  }

  async muteAudioSlave() {
    this.loggerSend.log('mute音频辅流')
    this._audioSlaveProducer?.pause()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._audioSlaveProducer?.id,
            mute: true
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('muteAudioSlave() | failed:', e.name, e.message)
    }
  }

  async unmuteAudioSlave() {
    this.loggerSend.log('unmute音频辅流')
    this._audioSlaveProducer?.resume()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._audioSlaveProducer?.id,
            mute: false
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('unmuteAudioSlave() | failed: ', e.name, e.message)
      return Promise.reject(e)
    }
  }

  async muteVideo() {
    this.loggerSend.log('mute视频')
    this._webcamProducer?.pause()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._webcamProducer?.id,
            mute: true
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('muteVideo() | failed:', e.name, e.message)
    }
  }

  async unmuteVideo() {
    this.loggerSend.log('unmute视频')
    this._webcamProducer?.resume()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._webcamProducer?.id,
            mute: false
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('unmuteVideo() | failed:', e.name, e.message)
    }
  }

  async muteScreen() {
    this.loggerSend.log('mute屏幕共享')
    this._screenProducer?.pause()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._screenProducer?.id,
            mute: true
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('muteScreen() | failed: ', e.name, e.message)
    }
  }

  async unmuteScreen() {
    this.loggerSend.log('unmute屏幕共享')
    this._screenProducer?.resume()
    try {
      await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'Mute',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            producerId: this._screenProducer?.id,
            mute: false
          }
        }
      })
    } catch (e: any) {
      this.loggerSend.error('unmuteScreen() | failed:', e.name, e.message)
    }
  }

  async updateUserRole(userRole: number) {
    this.loggerSend.log(`updateUserRole() 更新用户角色为${userRole}`)
    try {
      const result = await this.adapterRef._signalling?._protoo?.request('SendUserData', {
        externData: {
          type: 'UserRole',
          cid: this.adapterRef.channelInfo.cid,
          uid: new SimpleBig(this.adapterRef.channelInfo.uid),
          data: {
            userRole: userRole
          }
        }
      })
      if (result !== 200) {
        this.logger.error(`UpdateUserRole:${result.errMsg}. Code: ${result.code}`)
      }
      return result
    } catch (e: any) {
      this.loggerSend.error('updateUserRole() failed:', e.name, e.message)
      throw e
    }
  }

  async getIceStatus(direction: 'send' | 'recv' = 'send') {
    const start = Date.now()
    const iceStatus: any = {
      ts: Date.now(),
      direction,
      iceConnectionState: 'uninit',
      info: '',
      stuckTime: -1,
      elapse: -1
    }
    let pc
    if (direction === 'send') {
      pc = this._sendTransport?._handler?._pc
    } else {
      pc = this._recvTransport?._handler?._pc
    }
    if (!pc) {
      iceStatus.info = 'no_pc_' + direction
    } else {
      iceStatus.info += '#' + pc.pcid

      iceStatus.iceConnectionState = pc.iceConnectionState
      iceStatus.info += '|iceConnectoinState ' + pc.iceConnectionState

      if (pc.iceStartedAt) {
        iceStatus.elapse = start - pc.iceStartedAt
      }
      if (this.iceStatusHistory[direction].promises[0]) {
        this.iceStatusHistory[direction].promises[0](null)
        this.iceStatusHistory[direction].promises = []
      }
      if (pc.iceConnectionState === 'checking') {
        if (!pc.iceStartedAt) {
          pc.iceStartedAt = start
        }
        await new Promise((res) => {
          this.iceStatusHistory[direction].promises = [res]
          // 如果checking状态少于3秒，则不上报
          setTimeout(res, 3000)
        })
        if (pc.iceConnectionState !== 'checking') {
          return iceStatus
        } else {
          iceStatus.elapse = Date.now() - pc.iceStartedAt
        }
      }
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (!pc.iceConnectedAt) {
          pc.iceConnectedAt = start
        }
        await new Promise((res) => {
          this.iceStatusHistory[direction].promises = [res]
          setTimeout(res, 100)
        })
      }

      let stats: RTCStatsReport | null = null
      try {
        // 由于getStats本身会产生卡顿，这里尽量只取一个track进行getStats，并计算卡顿时间
        let start = Date.now()
        let track = null
        if (direction === 'send') {
          let sender = pc.getSenders()[0]
          if (sender?.track) {
            track = sender.track
          }
        } else {
          let receiver = pc.getReceivers()[0]
          if (receiver?.track) {
            track = receiver.track
          }
        }
        let p = pc.getStats(track)
        iceStatus.stuckTime = Date.now() - start
        stats = await p
      } catch (e) {
        // do nothing
      }
      const statsArr: RTCStats[] = []
      const transports: RTCTransportStats[] = []
      let start2 = Date.now()
      stats &&
        stats.forEach((item, key) => {
          statsArr.push(item)
          if (item.type === 'transport') {
            transports.push(item)
          }
        })
      if (!transports.length) {
        iceStatus.info += '|no transport stats'
      }
      transports.forEach((transport) => {
        const candidatePair = statsArr.find((stats) => {
          return stats.id === transport.selectedCandidatePairId
        }) as RTCIceCandidatePairStats | null
        if (candidatePair) {
          const localCandidate = statsArr.find((stats) => {
            return stats.id === candidatePair.localCandidateId
          }) as any
          if (localCandidate) {
            iceStatus.info += `|local:${localCandidate.protocol} `
            iceStatus.info += `${localCandidate.address || 'NOADDRESS'}:${
              localCandidate.port || 'NOPORT'
            } ${localCandidate.candidateType} ${localCandidate.networkType || ''}`
            iceStatus.networkType = localCandidate.networkType
            iceStatus.protocol = localCandidate.protocol
            iceStatus.relayProtocol = localCandidate.relayProtocol
            iceStatus.ip = localCandidate.ip
            iceStatus.address = localCandidate.address

            if (this.adapterRef._statsReport?.stats?.chromeLegecy === 'unsupported') {
              this.adapterRef.transportStats.NetworkType = localCandidate.networkType
            }
          } else {
            iceStatus.info += `|无法找到localCandidate ${candidatePair.localCandidateId}`
          }
          const remoteCandidate = statsArr.find((stats) => {
            return stats.id === candidatePair.remoteCandidateId
          }) as any
          if (remoteCandidate) {
            iceStatus.info += `|remote:${remoteCandidate.protocol} `
            iceStatus.info += `${remoteCandidate.address || 'NOADDRESS'}:${
              remoteCandidate.port || 'NOPORT'
            } ${remoteCandidate.candidateType}`
          } else {
            iceStatus.info += `|无法找到remoteCandidate ${candidatePair.remoteCandidateId}`
          }
        } else {
          iceStatus.info += `无法找到candidatePair ${transport.selectedCandidatePairId}`
        }
      })
      iceStatus.stuckTime += Date.now() - start2
    }

    if (
      // 只上报差异
      this.iceStatusHistory[direction].status.info !== iceStatus.info &&
      // 不上报new
      iceStatus.iceConnectionState !== 'new' &&
      // 模块是否已经被销毁
      this._mediasoupDevice
    ) {
      const iceConnectionStateMap: any = {
        new: 1,
        checking: 2,
        connected: 3,
        completed: 4,
        failed: -1,
        disconnected: -2,
        closed: -3
      }
      const code = iceConnectionStateMap[iceStatus.iceConnectionState || 0] || 0
      if (code > 0) {
        this.adapterRef.logger.log('iceConnectionStateChanged', direction, iceStatus.info)
        if (code === iceConnectionStateMap.connected) {
          if (
            direction === 'recv' &&
            this.adapterRef.state.iceRecvConnectedTime < this.adapterRef.state.signalJoinResTime
          ) {
            this.adapterRef.state.iceRecvConnectedTime = Date.now()
          }
        }
      } else {
        this.adapterRef.logger.warn('iceConnectionStateChanged', direction, iceStatus.info)
      }
      this.adapterRef.instance.apiFrequencyControl({
        name: '_iceStateChange_' + direction,
        code,
        param: JSONBigStringify(iceStatus)
      })
      this.adapterRef.instance.safeEmit('@ice-change', iceStatus)
    }
    this.iceStatusHistory[direction].status = iceStatus

    return iceStatus
  }

  getReceivers(
    options: {
      uid?: number
      mediaType?: MediaTypeShort
    } = {}
  ) {
    const recvInfos: RecvInfo[] = []

    for (let uid in this.adapterRef.remoteStreamMap) {
      const remoteStream = this.adapterRef.remoteStreamMap[uid]
      if (options.uid && options.uid.toString() !== uid) {
        continue
      }
      MediaTypeList.forEach((mediaType) => {
        if (options.mediaType && options.mediaType !== mediaType) {
          return
        }
        if (!remoteStream.active || !remoteStream.pubStatus[mediaType].consumerId) {
          return
        }
        const consumer = this._consumers[remoteStream.pubStatus[mediaType].consumerId]
        if (consumer) {
          recvInfos.push({
            uid,
            mediaType,
            remoteStream,
            consumer
          })
        }
      })
    }
    return recvInfos
  }

  clearConsumerMap() {
    this.consumerMap.forEach((item, key) => {
      if (item._recvTransportMainAudio) {
        item._recvTransportMainAudio.close()
      }
      if (item._recvTransportMainVideo) {
        item._recvTransportMainVideo.close()
      }
      if (item._recvTransportSubAudioSlave) {
        item._recvTransportSubAudioSlave.close()
      }
      if (item._recvTransportSubScreen) {
        item._recvTransportSubScreen.close()
      }
      if (item._recvTransportMainAudioTimeoutTimer) {
        clearTimeout(item._recvTransportMainAudioTimeoutTimer)
        item._recvTransportMainAudioTimeoutTimer = null
      }
      if (item._recvTransportMainVideoTimeoutTimer) {
        clearTimeout(item._recvTransportMainVideoTimeoutTimer)
      }
      item._recvTransportMainVideoTimeoutTimer = null
      if (item._recvTransportSubAudioSlaveTimeoutTimer) {
        clearTimeout(item._recvTransportSubAudioSlaveTimeoutTimer)
      }
      item._recvTransportSubAudioSlaveTimeoutTimer = null
      if (item._recvTransportSubScreenTimeoutTimer) {
        clearTimeout(item._recvTransportSubScreenTimeoutTimer)
      }
      item._recvTransportSubScreenTimeoutTimer = null
    })
    this.consumerMap.clear()
  }

  destroy() {
    this.logger.log('清除 meidasoup')
    this._reset()

    if (env.ANY_CHROME_MAJOR_VERSION && env.ANY_CHROME_MAJOR_VERSION < 69) {
      this.clearConsumerMap()
    }
  }
}

export { Mediasoup }
