import { EventEmitter } from 'eventemitter3'
import * as protobuf from 'protobufjs/light' // test 专用
// import * as protobuf from './proto/protobuf-js/light' // product 专用

import { getReconnectionTimeout } from '../util/rtcUtil/utils'
import heartbeatStats = require('../util/proto/heartbeatStats')
import { URLSetting } from '../module/LBSManager'
import { AdapterRef, ILogger } from '../types'

const PING_PONG_INTERVAL = 10000
const PING_TIMEOUT = 10000
let uintPing = new Uint8Array(1)
uintPing[0] = 10
const PING = uintPing
const PONG = 11
export default class WSTransport {
  private url_: string
  private socket_: WebSocket | null
  private isConnected_: boolean
  private isConnecting_: boolean
  private pingPongTimeoutId_: any
  private pingTimeoutId_: any
  private reconnectionTimer_: any
  private reconnectionCount_: number
  private emitter_: any
  private adapterRef: AdapterRef
  private logger: ILogger
  private lastLogTime = 0
  private cachedLogs: { time: number; data: Object }[] = []
  private textEncoder = new TextEncoder()
  private urlSetting?: URLSetting

  constructor(options: any) {
    this.url_ = options.url
    this.socket_ = null
    this.isConnected_ = false
    this.isConnecting_ = false
    this.pingPongTimeoutId_ = -1
    this.pingTimeoutId_ = -1
    this.reconnectionTimer_ = -1
    this.reconnectionCount_ = 0
    this.emitter_ = new EventEmitter()
    this.adapterRef = options.adapterRef
    this.logger = this.adapterRef.logger.getChild(() => {
      let tag = 'wsTransport'
      return tag
    })
  }
  init() {
    this.logger.log(`connect to url: ${this.url_}`)
    this.socket_ = new WebSocket(this.url_)
    this.bindSocket(this.socket_)
  }
  bindSocket(socket: any) {
    socket.onopen = this.onopen.bind(this)
    socket.onclose = this.onclose.bind(this)
    socket.onerror = this.onerror.bind(this)
    socket.onmessage = this.onmessage.bind(this)
  }

  unbindSocket(socket: any) {
    socket.onopen = () => {}
    socket.onclose = () => {}
    socket.onerror = () => {}
    socket.onmessage = () => {}
  }

  onopen(event: any) {
    if (this.isConnected_) return
    this.isConnected_ = true
    this.isConnecting_ = false
    const url = event.target.url
    this.logger.log(`websocket[${url}] is connected`)
    if (this.urlSetting) {
      this.logger.debug(
        `markFinish success seqId:${this.urlSetting.seqId} source:${this.urlSetting.item.source}  url:${url}`
      )
      delete this.urlSetting
    }
    this.startPingPong()
  }

  onclose(event: any) {
    const url = event.target.url
    const isInUse = event.target === this.socket_
    this.logger.log(`websocket[${url} InUse: ${isInUse}] is closed with code: ${event.code}`)
    // only handle the close event for the socket in use
    if (this.socket_ && event.target === this.socket_) {
      this.isConnected_ = false
      // 1000 is considered as normal close
      if (event.wasClean && event.code === 1000) {
        this.close()
      } else {
        this.logger.warn(`onclose code:${event.code} reason:${event.reason}`)
        this.socket_.onclose = () => {}
        // 4001 indicates that we want reconnect with new WebSocket
        this.socket_.close(4001)
        this.socket_ = null
        // 非正常关闭 需要重连
        this.reconnect()
      }
    } else {
      // 收到的onclose事件并不是当前的socket的事件。忽略该事件
    }
  }

  onerror(event: any) {
    const url = event.target.url
    this.logger.warn(`websocket[${url}] error observed`)
    if (this.urlSetting) {
      this.logger.debug(
        `markFinish fail seqId:${this.urlSetting.seqId} source:${this.urlSetting.item.source}  url:${url}`
      )
      delete this.urlSetting
    }
    if (!this.isConnected_) {
      // WS connection failed at the first time
      this.reconnect()
    } else if (event.target === this.socket_) {
      this.isConnected_ = false
      this.socket_ = null
      this.reconnect()
    }

    this.isConnecting_ = false
    this.isConnected_ = false
  }

  onmessage(event: any) {
    if (!this.isConnected_) return // close was requested.
    if (event && event.data) {
      let data = JSON.parse(event.data)
      data.action === 11 && this.emit(PONG, event)
      this.clearReconnectionTimer()
    }
  }

  isConnected() {
    return this.isConnected_
  }

  // send pb
  sendPB(data: any) {
    if (this.isConnected_) {
      const sendMessage = this.createPBMessage(data)
      // console.log('sendMessage--->', sendMessage);
      if (this.socket_?.readyState === 1) {
        this.socket_.send(sendMessage)
      }
    }
  }

  sendPing(data: any) {
    if (this.isConnected_) {
      if (this.socket_?.readyState === 1) {
        this.socket_.send(data)
      }
    }
  }

  async sendLog(data: Object) {
    // 日志上报最多缓存 500 条日志，超过则丢弃
    // 有 cid 后才会上报（不然无法索引）
    // time 属性至少比上一条 +1 毫秒，这样 kibana 的日志排序才正确。
    const time = Math.max(this.lastLogTime + 1, Date.now())
    this.lastLogTime = time
    try {
      // @ts-ignore
      if (this.cachedLogs.length) {
        // @ts-ignore
        this.cachedLogs[this.cachedLogs.length - 1].data[0].replace('[NERTC', '[缓存][NERTC')
      }
    } catch (e) {
      // do noting
    }
    this.cachedLogs.push({
      time,
      data
    })
    if (this.cachedLogs.length > 500) {
      this.cachedLogs.shift()
    }
    if (this.isConnected_ && this.socket_?.readyState === 1 && this.adapterRef.channelInfo?.cid) {
      const cachedLogs = this.cachedLogs
      this.cachedLogs = []

      const batchSize = 50
      const totalBatches = Math.ceil(cachedLogs.length / batchSize)
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const end = start + batchSize
        const batch = cachedLogs.slice(start, end)
        // 为避免日志上报拥塞，这里使用同步机制半平滑过度上报数据
        await this.delay(100)
        this.sendBatch(batch)
      }
    }
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  sendBatch(cachedLogs: any) {
    // console.error('sendBatch: ', cachedLogs)
    for (let cachedlogParam of cachedLogs) {
      const param = Object.assign(
        {
          uid: this.adapterRef.channelInfo.uid,
          cid: this.adapterRef.channelInfo.cid
        },
        cachedlogParam
      )
      try {
        const view = this.textEncoder.encode(JSON.stringify(param))
        let headerArray = [5, 1, 1, 1, 2, 0, 0, 0]
        let logData = Uint8Array.from(headerArray.concat(Array.from(view)))
        this.socket_!.send(logData)
        // console.error('已发送： ', param)
      } catch (e) {
        // console.error("无法发送日志", paramSend.data);
      }
    }
  }

  createPBMessage(data: any) {
    // convert json data to protocol-buffer
    let root = protobuf.Root.fromJSON(heartbeatStats)
    let heartbeatMessage = root.lookupType('WebrtcStats')
    let message = heartbeatMessage.create(data)
    let buffer = heartbeatMessage.encode(message).finish()
    let headerArray = [4, 1, 1, 1, 3, 0, 0, 0] // 正式环境
    // let headerArray = [4,1,1,1,2,0,0,0];  // 测试环境
    //console.log('BP格式反解 msg: ', heartbeatMessage.decode(buffer))
    let newBuffer = Uint8Array.from(headerArray.concat(Array.from(buffer)))
    return newBuffer
  }

  async startPingPong() {
    try {
      if (this.pingPongTimeoutId_ !== -1) {
        return
      }
      await this.ping()
      this.pingPongTimeoutId_ = setTimeout(() => {
        this.pingPongTimeoutId_ = -1
        this.startPingPong()
      }, PING_PONG_INTERVAL)
    } catch (error) {
      this.logger.log('ping-pong failed, start reconnection')
      this.clearSocket()
      this.reconnect()
    }
  }

  stopPingPong() {
    this.logger.log('stop ping pong')
    clearTimeout(this.pingTimeoutId_)
    clearTimeout(this.pingPongTimeoutId_)
    this.pingTimeoutId_ = -1
    this.pingPongTimeoutId_ = -1
  }

  ping() {
    return new Promise<void>((resolve, reject) => {
      if (this.pingTimeoutId_ !== -1) {
        return resolve()
      }
      this.sendPing(PING)

      this.once(PONG, () => {
        clearTimeout(this.pingTimeoutId_)
        this.pingTimeoutId_ = -1
        resolve()
      })
      this.pingTimeoutId_ = setTimeout(() => {
        this.pingTimeoutId_ = -1
        reject()
      }, PING_TIMEOUT)
    })
  }

  reconnect() {
    if (this.isConnecting_ || this.reconnectionTimer_ !== -1) {
      this.logger.log('websocket is reconnecting')
      return
    }
    this.isConnecting_ = true
    this.reconnectionCount_++

    if (this.adapterRef.instance?._params?.neRtcServerAddresses?.channelServer) {
      this.logger.log(`WebSocket不启用备用线路：当前为私有化配置`)
      return
    } else {
      const urlSettings = this.adapterRef.lbsManager.getURLSettings(this.url_)
      const urlSetting = urlSettings[this.reconnectionCount_ % urlSettings.length]
      if (urlSetting.url !== this.url_) {
        this.logger.warn(
          `${urlSetting.seqId} WebSocket切换备用线路 ${this.url_} => ${urlSetting.url}`
        )
        this.url_ = urlSetting.url
        this.urlSetting = urlSetting
      }
    }

    this.socket_ = new WebSocket(this.url_)
    this.bindSocket(this.socket_)

    const RECONNECTION_TIMEOUT = getReconnectionTimeout(this.reconnectionCount_)
    this.reconnectionTimer_ = setTimeout(() => {
      this.isConnecting_ = false
      this.clearReconnectionTimer()

      this.socket_ && this.unbindSocket(this.socket_)
      this.socket_ = null

      this.reconnect()
    }, RECONNECTION_TIMEOUT)
  }

  clearReconnectionTimer() {
    if (this.reconnectionTimer_ !== -1) {
      clearTimeout(this.reconnectionTimer_)
      this.reconnectionTimer_ = -1
    }
  }

  once(event: any, handler: any, context?: any) {
    this.emitter_.once(event, handler, context)
  }

  emit(event: any, handler: any, context?: any) {
    this.emitter_.emit(event, handler, context)
  }

  clearSocket() {
    this.socket_ && this.unbindSocket(this.socket_)
    this.isConnected_ = false
    this.isConnecting_ = false
    this.socket_ = null
  }

  async close() {
    await this.delay(1000)
    this.logger.log('close websocket')
    this.clearReconnectionTimer()
    this.stopPingPong()
    this.socket_?.close()
    this.clearSocket()
  }
}
