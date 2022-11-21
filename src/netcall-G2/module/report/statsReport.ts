import { EventEmitter } from 'eventemitter3'

import { SDK_VERSION } from '../../Config'
import { AdapterRef, SDKRef, StatsReportOptions } from '../../types'
import raf from '../../util/rtcUtil/raf'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import { generateUUID } from '../../util/rtcUtil/utils'
import WSTransport from '../../util/wsTransport'
import { FormativeStatsReport } from './formativeStatsReport'
import { GetStats } from './getStats'
import { getParameters } from '../parameters'
const sha1 = require('js-sha1')

const wsURL = 'wss://statistic.live.126.net/lps-websocket/websocket/collect'
const DEV = 1 // 测试
const PROD = 0 // 线上

const platform = 'web'
const sdktype = 'webrtc'
const timestamp = new Date().getTime()
const salt = '40f5a1a1871e46089e1e5139a779dd77'
class StatsReport extends EventEmitter {
  private sdkRef: SDKRef
  private adapterRef: AdapterRef
  private appKey: string
  private isReport: boolean
  private stats: GetStats | null
  private heartbeat_: any
  private wsTransport_: any
  private prevStats_: any
  public formativeStatsReport: FormativeStatsReport | null
  public isStartGetStats: boolean

  constructor(options: StatsReportOptions) {
    super()
    this._reset()

    // 设置传入参数
    this.heartbeat_ = -1
    this.wsTransport_ = null
    this.sdkRef = options.sdkRef
    this.adapterRef = options.adapterRef
    this.isReport = options.isReport
    this.prevStats_ = {}
    this.appKey =
      this.adapterRef.instance._params.appkey ||
      (this.adapterRef.channelInfo && this.adapterRef.channelInfo.appKey) ||
      ''
    this.isStartGetStats = false

    // 初始化stats数据统计
    this.stats = new GetStats({
      adapterRef: this.adapterRef,
      interval: 1000
    })
    this.stats.on('stats', (data, time) => {
      //this.adapterRef.logger.log(time,'object',data, time);
      this.formativeStatsReport && this.formativeStatsReport.update(data, time)
    })

    this.formativeStatsReport = new FormativeStatsReport({
      adapterRef: this.adapterRef,
      sdkRef: this.sdkRef,
      appkey: this.appKey
    })
  }

  _reset() {
    if (this.stats) {
      this.stats.destroy()
    }
    this.stats = null

    if (this.formativeStatsReport) {
      this.formativeStatsReport.destroy()
    }
    this.formativeStatsReport = null

    this.stopHeartbeat()
  }

  stop() {
    this.stats && this.stats.stop()
    this.formativeStatsReport && this.formativeStatsReport.stop()
  }

  statsStart() {
    if (this.formativeStatsReport) {
      this.isStartGetStats = true
      this.formativeStatsReport.start()
    }
  }

  start() {
    let deviceId = generateUUID()
    let checkSum = sha1(`${PROD}${timestamp}${SDK_VERSION}${platform}${sdktype}${deviceId}${salt}`)
    //console.log('start: ', this.adapterRef.instance._params.neRtcServerAddresses)
    let url = `${
      this.adapterRef.instance._params.neRtcServerAddresses.statisticsWebSocketServer || wsURL
    }?deviceId=${deviceId}&isTest=${PROD}&sdkVer=${SDK_VERSION}&sdktype=${sdktype}&timestamp=${timestamp}&platform=${platform}&checkSum=${checkSum}`
    let win: any = window
    this.wsTransport_ = win.wsTransport = new WSTransport({
      url: url,
      adapterRef: this.adapterRef
    })
    this.wsTransport_.init()
  }

  startHeartbeat() {
    if (this.heartbeat_ === -1) {
      this.adapterRef.logger.log('startHeartbeat...')
      this.heartbeat_ = raf.setInterval(
        this.doHeartbeat.bind(this),
        getParameters().doHeartbeatInterval
      )
    }
  }

  stopHeartbeat() {
    if (this.heartbeat_ !== -1) {
      // this.adapterRef.logger.log('stopHeartbeat...');
      raf.clearInterval(this.heartbeat_)
      this.heartbeat_ = -1
    }
  }

  async doHeartbeat() {
    try {
      if (this.isStartGetStats) {
        // 数据上报部分
        let data = await this.stats?.getAllStats()
        console.error('上报 data--->', data)
        // console.error('data: ', JSON.stringify(data))
        // let reportData = this.calculateReport(data)
        // console.warn('data--->', reportData)
        // 每 2s 上报一次
        if (!env.IS_ELECTRON && this.isReport) {
          // Electron 上报的数据和 Chrome 不同，暂时不上报，后续需要再进行单独处理
          this.wsTransport_.sendPB(data)
        }
      }
    } catch (error) {
      // console.warn('doHeartBeat failed')
      this.adapterRef.logger.log('doHeartbeat: ', error)
    }
  }

  destroy() {
    this.stop()
    this._reset()
    if (this.isReport) {
      this.wsTransport_ && this.wsTransport_.close()
    }
  }
}

export { StatsReport }
