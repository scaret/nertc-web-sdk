// 记得运行npm run dev:worker

import type { Timer } from '../../types'

// @ts-ignore
const thisWorker = self as Worker

class SignalProbeWorker {
  // ping的间隔
  pingInterval: number
  // 从ping发起的时间算起，多少毫秒没有收到response,则把active置为false
  maxRtt: number
  // 从ping发起的时间算起，多少毫秒没有收到response，则主动断开连接
  wsTimeout: number
  // WS如果连不上，重连的间隔
  reconnectionInterval: number
  timer: Timer
  signalProbers: {
    [wsUrl: string]: SignalProber
  }
  constructor(options: SignalIPCInitConfig) {
    this.signalProbers = {}
    this.pingInterval = options.pingInterval
    this.maxRtt = options.maxRtt
    this.wsTimeout = options.wsTimeout
    this.reconnectionInterval = options.reconnectionInterval
    for (let wsUrl in options.signalStates) {
      if (options.signalStates[wsUrl]) {
        this.signalProbers[wsUrl] = new SignalProber(this, options.signalStates[wsUrl])
      } else {
        this.error(`Unrecognized ${wsUrl} ${options.signalStates}`)
      }
    }
    this.timer = setInterval(() => {
      this.sync()
    }, 1000)
  }
  sync() {
    const now = Date.now()
    const signalStates: SignalStates = {}
    for (let wsUrl in this.signalProbers) {
      const signalState = this.signalProbers[wsUrl].signalState
      if (signalState.ping.rtt === -1) {
        signalState.active = false
      } else if (signalState.ping.recvIndex < signalState.ping.sendIndex) {
        // 如果当前没有收到pong，则拉长rtt
        signalState.ping.rtt = Math.max(signalState.ping.rtt, now - signalState.ping.lastSentAt)
      }
      signalStates[wsUrl] = signalState
    }
    thisWorker.postMessage({
      cmd: 'sync',
      data: signalStates
    } as SignalIPCMessage)
  }
  log(str: string) {
    thisWorker.postMessage({
      cmd: 'log',
      data: str
    } as SignalIPCMessage)
  }
  error(str: string) {
    thisWorker.postMessage({
      cmd: 'error',
      data: str
    } as SignalIPCMessage)
  }
  handleDebugMessage(msg: SignalIPCMessage) {
    if (msg.data.type === 'closeWs') {
      for (let wsUrl in this.signalProbers) {
        const signalProber = this.signalProbers[wsUrl]
        if (signalProber.signalState.index === msg.data.index) {
          this.error(`Closing #${msg.data.index} ${signalProber.wsUrl}`)
          signalProber.ws?.close()
        }
      }
    }
    if (msg.data.type === 'doNotSendPing') {
      for (let wsUrl in this.signalProbers) {
        const signalProber = this.signalProbers[wsUrl]
        if (signalProber.signalState.index === msg.data.index) {
          signalProber.debug.doNotSendPing = !!msg.data.value
          signalProber.log(`doNotSendPing: ${JSON.stringify(msg.data)}`)
        }
      }
    }
  }
  handleOnlineMessage(msg: SignalIPCMessage) {
    this.log(`收到在线事件，探测服务发起重连`)
    for (let wsUrl in this.signalProbers) {
      const signalProber = this.signalProbers[wsUrl]
      signalProber.init()
    }
  }
}

let signalProbeWorker: SignalProbeWorker | null = null

thisWorker.postMessage({
  cmd: 'ohayo'
} as SignalIPCMessage)

thisWorker.onmessage = (evt: MessageEvent) => {
  const msg = evt.data as SignalIPCMessage
  if (msg.cmd === 'init') {
    if (signalProbeWorker) {
      signalProbeWorker.error(`Already Inited`)
      return
    }
    const initConfig: SignalIPCInitConfig = msg.data
    signalProbeWorker = new SignalProbeWorker(initConfig)
  } else if (msg.cmd === 'debug') {
    signalProbeWorker?.handleDebugMessage(msg)
  } else if (msg.cmd === 'onOnline') {
    signalProbeWorker?.handleOnlineMessage(msg)
  } else {
    signalProbeWorker?.log(`Invalid message ${JSON.stringify(msg)}`)
    return
  }
}

/**
 * SignalProber指的是对单一WebSocket
 */
class SignalProber {
  signalState: SignalState
  wsUrl: string
  ws: WebSocket | null
  pingTimer: Timer
  signalProbeWorker: SignalProbeWorker
  debug: {
    doNotSendPing: boolean
  } = { doNotSendPing: false }
  constructor(signalProbeWorker: SignalProbeWorker, signalState: SignalState) {
    this.signalProbeWorker = signalProbeWorker
    this.signalState = signalState
    const wsPart = signalState.wsUrl.split(/\/\?|\?/)
    this.wsUrl = `wss://${wsPart[0]}/nertc/private/ping${wsPart[1] ? '?' + wsPart[1] : ''}`
    this.pingTimer = setInterval(this.checkState.bind(this), 100)
    this.ws = null
    this.init()
  }
  init() {
    if (this.ws) {
      this.ws.close()
    }
    this.ws = new WebSocket(this.wsUrl)
    this.ws.onmessage = this.handleWsMessage.bind(this, this.ws)
    this.ws.onopen = this.handleWsOpen.bind(this, this.ws)
    this.ws.onclose = this.checkState.bind(this)
    this.ws.onerror = this.checkState.bind(this)
    this.signalState.connect.startCnt++
    this.signalState.connect.initAt = Date.now()
    this.signalState.connect.connectAt = -1
    this.signalState.ping.sendIndex = 0
    this.signalState.ping.recvIndex = 0
  }
  private getTag() {
    return `[signalProber #${this.signalState.index} rtt${this.signalState.ping.rtt}ms ${this.signalState.connect.successCnt}_${this.signalState.connect.failCnt}]`
  }
  log(str: string) {
    this.signalProbeWorker.log(`${this.getTag()}${str}`)
  }
  error(str: string) {
    this.signalProbeWorker.error(`${this.getTag()}${str}`)
  }
  checkState() {
    const now = Date.now()
    if (this.ws) {
      // this.error(`this.ws.readyState ${this.ws.readyState} ${this.signalState.ping.sendIndex}`)
      if (this.ws.readyState === WebSocket.OPEN) {
        if (this.signalState.ping.sendIndex === this.signalState.ping.recvIndex) {
          // 在正常连接中的情况，向主线程同步状态
          if (now - this.signalState.ping.lastSentAt > this.signalProbeWorker.pingInterval) {
            const msg = '' + now
            if (!this.debug.doNotSendPing) {
              this.ws.send(msg)
            }
            this.signalState.ping.lastSentAt = now
            this.signalState.ping.lastSentMsg = msg
            this.signalState.ping.sendIndex++
          }
        } else {
          if (now - this.signalState.ping.lastSentAt > this.signalProbeWorker.maxRtt) {
            // 连接未断开，但RTT已超时，记为服务器下线
            this.signalState.active = false
            this.signalState.ping.rtt = -1
          }
          if (now - this.signalState.ping.lastSentAt > this.signalProbeWorker.wsTimeout) {
            // 连接未断开，但RTT已严重超时。主动断开连接
            this.log(
              `timeout: ${now - this.signalState.ping.lastSentAt}ms. Connect cnt:${
                this.signalState.connect.startCnt
              } ${this.wsUrl}`
            )
            this.ws.close()
            this.ws = null
            this.init()
          }
        }
      } else if (this.ws.readyState === WebSocket.CONNECTING) {
        // 正在连接中，不做处理
      } else if (
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING
      ) {
        // this.log(`${JSON.stringify(this.signalState, null, 2)}`)
        if (this.signalState.connect.connectAt === -1 || this.signalState.ping.recvIndex === 0) {
          // 未连上过，销毁当前WebSocket
          this.ws = null
          this.signalState.connect.failCnt++
          this.signalState.connect.failCntFromLastSuccess++
          if (this.signalState.connect.failCnt <= 3) {
            this.log(
              `[checkState]WebSocket Failed count:${
                this.signalState.connect.failCntFromLastSuccess
              }. Next try: ${this.getBackoffTime()}ms`
            )
          }
        } else {
          if (this.signalState.active) {
            // 连接已断开，记为服务端下线
            this.log(`[checkState]WebSocket CLOSED. Next try: ${this.getBackoffTime()}ms`)
            this.signalState.active = false
            this.signalState.ping.rtt = -1
            this.ws = null
            this.signalProbeWorker.sync()
          }
        }
      }
    } else {
      if (now - this.signalState.connect.initAt > this.getBackoffTime()) {
        // 当前没有WebSocket，连接断开后已到重连时间，发起重连
        this.init()
      } else {
        // 当前没有WebSocket，未到重连时间
      }
    }
  }
  getBackoffTime() {
    // 重连退避时间
    return (
      this.signalProbeWorker.reconnectionInterval * this.signalState.connect.failCntFromLastSuccess
    )
  }
  handleWsOpen(ws: WebSocket, evt: any) {
    // WebSocket光OPEN不记为连接成功。收到pong才连接成功
    const data = evt.data
    if (this.ws !== ws) {
      this.error(`Detached ws open ${JSON.stringify(data)}`)
      return
    } else {
      const now = Date.now()
      this.signalState.connect.connectAt = now

      if (this.signalState.connect.failCnt <= 3) {
        this.log(
          `open ${this.signalState.connect.connectAt - this.signalState.connect.initAt}ms ${
            this.signalState.wsUrl
          } => ${this.wsUrl}`
        )
      }
      this.checkState()
    }
  }
  handleWsMessage(ws: WebSocket, evt: any) {
    const data = evt.data
    if (this.ws !== ws) {
      this.error(`Detached ws message ${JSON.stringify(data)}`)
      return
    }
    if (this.signalState.ping.lastSentMsg !== data) {
      if (this.signalState.connect.failCnt <= 3) {
        this.error(`Unrecognized message ${JSON.stringify(data)}`)
      }
      return
    }
    //收到了pong
    const now = Date.now()
    this.signalState.ping.recvIndex++
    this.signalState.ping.rtt = now - this.signalState.ping.lastSentAt
    if (this.signalState.ping.recvIndex === 1) {
      this.signalState.connect.successCnt++
      this.signalState.connect.failCntFromLastSuccess = 0
    }
    if (this.signalState.ping.rtt > this.signalProbeWorker.maxRtt) {
      this.signalState.ping.rtt = -1
      this.signalState.active = false
    } else if (this.signalState.ping.rtt > 0) {
      this.signalState.active = true
    }
  }
}
