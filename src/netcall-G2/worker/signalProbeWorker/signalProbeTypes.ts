interface SignalState {
  index: number
  wsUrl: string
  active: boolean
  connect: SignalConnectState
  ping: SignalPingState
}

interface SignalStates {
  [url: string]: SignalState
}

interface SignalIPCMessage {
  cmd: 'ohayo' | 'init' | 'log' | 'error' | 'sync' | 'debug' | 'onOnline'
  data: any
}

interface SignalIPCInitConfig {
  signalStates: SignalStates
  // ping的间隔
  pingInterval: number
  // 从ping发起的时间算起，多少毫秒没有收到response,则把active置为false
  maxRtt: number
  // 从ping发起的时间算起，多少毫秒没有收到response，则主动断开连接
  wsTimeout: number
  // WS如果连不上，重连的间隔
  reconnectionInterval: number
}

interface SignalConnectState {
  startCnt: number
  successCnt: number
  failCnt: number
  failCntFromLastSuccess: number
  initAt: number
  connectAt: number
}

interface SignalPingState {
  sendIndex: number
  recvIndex: number
  lastSentAt: number
  lastSentMsg: string
  rtt: number
}

interface SignalProbeState {
  index: 0
  url: string
  alive: boolean
  rtt: number
}
