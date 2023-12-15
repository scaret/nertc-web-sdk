/**
 * 到媒体服务器的信令通道侦测服务
 */
import { getBlobUrl } from '../blobs/getBlobUrl'
import { AdapterRef, ILogger, Timer } from '../../types'
import { getParameters } from '../parameters'

export class SignalProbeManager {
  adapterRef: AdapterRef
  worker: Worker | null = null
  signalStates: SignalStates = {}
  private logger: ILogger
  online: 'yes' | 'no' | 'unknown' = 'unknown'
  serverActiveWaiters: {
    res: (value: unknown) => any
    resolved: boolean
    timer: Timer
  }[] = []
  constructor(adapterRef: AdapterRef) {
    this.adapterRef = adapterRef
    this.logger = this.adapterRef.instance.logger.getChild(() => {
      return `SignalProbe online:${this.online}`
    })
  }
  start(wssArr: string[]) {
    this.signalStates = {}
    this.online = 'unknown'
    wssArr.forEach((wsUrl, index) => {
      this.signalStates[wsUrl] = {
        index,
        wsUrl,
        active: false,
        connect: {
          startCnt: 0,
          successCnt: 0,
          failCnt: 0,
          failCntFromLastSuccess: 0,
          initAt: -1,
          connectAt: -1
        },
        ping: {
          sendIndex: 0,
          recvIndex: 0,
          lastSentAt: -1,
          lastSentMsg: '',
          rtt: -1
        }
      }
    })
    this.logger.log('start', this.signalStates)
    if (this.worker) {
      this.worker.terminate()
    }
    try {
      const workerUrl = getBlobUrl('signalProbeWorker')
      const worker = new Worker(workerUrl)
      this.worker = worker
      worker.onmessage = (evt: any) => {
        this.processWorkerMessage(evt)
      }
    } catch (e) {
      this.logger.warn('Failed to start SignalProbeManager:', e.name, e.message)
    }
  }
  stop() {
    this.worker?.terminate()
    this.worker = null
    this.signalStates = {}
    this.online = 'unknown'
  }
  getServerState(wsUrl: string) {
    return this.signalStates[wsUrl] || null
  }
  getActiveServerCount() {
    let cnt = 0
    let total = 0
    let code = 0
    for (let wsUrl in this.signalStates) {
      total++
      if (this.signalStates[wsUrl].ping.rtt > 0) {
        cnt++
      } else {
        code++
      }
    }
    if (cnt === 0) {
      code = -1
    }
    return { cnt, total, code }
  }

  /**
   * 等待，直到探测服务报告有服务端上线
   */
  waitForServerActive(timeout = 10000): Promise<any> {
    const p = new Promise((res) => {
      const waiter = {
        res,
        resolved: false,
        timer: setTimeout(() => {
          if (!waiter.resolved) {
            waiter.resolved = true
            this.clearWaiters()
            res('timeout')
          }
        }, timeout)
      }
      this.serverActiveWaiters.push(waiter)
    })
    return p
  }
  processWorkerMessage(evt: any) {
    if (!this.worker || !evt.data) {
      return
    }
    const msg = evt.data as SignalIPCMessage
    switch (msg.cmd) {
      case 'ohayo':
        try {
          const signalStates = JSON.parse(JSON.stringify(this.signalStates))
          const data: SignalIPCInitConfig = {
            signalStates,
            pingInterval: 2000,
            reconnectionInterval: 10000,
            maxRtt: getParameters().joinFirstTimeout + 4000,
            wsTimeout: getParameters().joinFirstTimeout + 8000
          }
          const signalMsg: SignalIPCMessage = {
            cmd: 'init',
            data
          }
          this.worker.postMessage(signalMsg)
        } catch (e) {
          this.logger.warn(`无法启动通道探测：`, e)
        }
        break
      case 'sync':
        this.processCmdSync(msg.data)
        break
      case 'log':
        this.logger.log(msg.data)
        break
      case 'error':
        this.logger.error(msg.data)
        break
      default:
        this.logger.error(`msg`, msg)
    }
  }
  private clearWaiters() {
    this.serverActiveWaiters = this.serverActiveWaiters.filter((waiter) => {
      return !waiter.resolved
    })
  }
  processCmdSync(signalStates: SignalStates) {
    const signalStatesHistory = this.signalStates
    this.signalStates = signalStates
    let hasServerStateChange = false
    for (let wsUrl in signalStatesHistory) {
      const signalStateHistory = signalStatesHistory[wsUrl]
      const signalStateNew = signalStates[wsUrl]
      if (!signalStateHistory || !signalStateNew) {
        this.logger.warn(`[sync]Unrecognized signal`, wsUrl, signalStateHistory, signalStateNew)
        continue
      }
      if (signalStateHistory.active && !signalStateNew.active) {
        hasServerStateChange = true
        if (this.online !== 'no' && this.getActiveServerCount().cnt === 0) {
          this.online = 'no'
          this.logger.error(`所有服务端的ping均在下线状态，请检查网络`)
        }
        this.logger.warn(`[sync]Turns into inactive: ${signalStateNew.wsUrl}`, signalStateNew)
      } else if (!signalStateHistory.active && signalStateNew.active) {
        hasServerStateChange = true
        if (this.getActiveServerCount().cnt === 1 && this.online !== 'unknown') {
          this.logger.warn(`已有服务端上线，网络恢复`)
        }
        this.online = 'yes'
        this.logger.log(
          `[sync]Turns into active. RTT: ${signalStateNew.ping.rtt}ms. ${signalStateNew.wsUrl}`
        )
      }
    }
    if (hasServerStateChange) {
      const data: any = {
        name: 'onPingStateChange',
        code: this.getActiveServerCount().code,
        param: {
          online: this.online
        }
      }
      for (let wsUrl in this.signalStates) {
        const signalState = this.signalStates[wsUrl]
        if (signalState) {
          data.param[wsUrl] = {
            active: signalState.active,
            rtt: signalState.ping.rtt,
            successCnt: signalState.connect.successCnt,
            failCnt: signalState.connect.failCnt
          }
        }
      }
      this.adapterRef.instance.apiFrequencyControl(data)
    }
    if (this.serverActiveWaiters.length && this.getActiveServerCount().cnt > 0) {
      this.serverActiveWaiters.forEach((waiter) => {
        if (!waiter.resolved) {
          waiter.resolved = true
          this.clearWaiters()
          clearTimeout(waiter.timer)
          waiter.res('active')
        }
      })
    }
  }
}
