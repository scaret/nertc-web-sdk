import { EventEmitter } from 'eventemitter3'

import { SDK_VERSION } from '../../Config'
import { AdapterRef, SDKRef, StatsReportOptions } from '../../types'
import raf from '../../util/rtcUtil/raf'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import WSTransport from '../../util/wsTransport'
import { GetStats } from './getStats'
import { getParameters } from '../parameters'
import { getBrowserInfo, getOSInfo } from '../../util/rtcUtil/rtcPlatform'
const sha1 = require('js-sha1')
import { DataReport } from './dataReport'

const wsURL = 'wss://statistic.live.126.net/lps-websocket/websocket/collect'
const DEV = 1 // 测试
const PROD = 0 // 线上

const platform = 'web'
const sdktype = 'webrtc'
const timestamp = Date.now()
const salt = '40f5a1a1871e46089e1e5139a779dd77'
class StatsReport extends EventEmitter {
  private sdkRef: SDKRef
  private adapterRef: AdapterRef
  private appKey: string
  private isReport: boolean
  public stats: GetStats | null
  private heartbeat_: any
  private wsTransport_: any
  private reportData: any

  constructor(options: StatsReportOptions) {
    super()
    this._reset()

    // 设置传入参数
    this.heartbeat_ = -1
    this.wsTransport_ = null
    this.sdkRef = options.sdkRef
    this.adapterRef = options.adapterRef
    this.isReport = options.isReport
    this.appKey =
      this.adapterRef.instance._params.appkey ||
      (this.adapterRef.channelInfo && this.adapterRef.channelInfo.appKey) ||
      ''
    this.reportData = {
      appkey: this.appKey,
      cid: this.adapterRef?.channelInfo.cid || 0,
      uid: `${this.adapterRef?.channelInfo.uid}` || '0',
      browser: getBrowserInfo().browserName,
      platform: getOSInfo().osName,
      timestamp: 0,
      local: {},
      remote: {}
    }
    // 初始化stats数据统计
    this.stats = new GetStats({
      adapterRef: this.adapterRef
    })
  }

  _reset() {
    if (this.stats) {
      this.stats.destroy()
    }
    this.stats = null
    this.stopHeartbeat()
  }

  stop() {
    this.stats && this.stats.stop()
  }

  start() {
    this.reportData.uid = `${this.adapterRef?.channelInfo.uid}` || '0'
    this.reportData.cid = this.adapterRef?.channelInfo.cid
    let deviceId = this.adapterRef?.deviceId
    let checkSum = sha1(`${PROD}${timestamp}${SDK_VERSION}${platform}${sdktype}${deviceId}${salt}`)
    //console.log('start: ', this.adapterRef.instance._params.neRtcServerAddresses)
    let url = `${
      this.adapterRef.instance._params.neRtcServerAddresses.statisticsWebSocketServer || wsURL
    }?deviceId=${deviceId}&isTest=${PROD}&sdkVer=${SDK_VERSION}&sdktype=${sdktype}&timestamp=${timestamp}&platform=${platform}&checkSum=${checkSum}`
    let win: any = window
    if (!getParameters().disableAllReports) {
      this.wsTransport_ = win.wsTransport = new WSTransport({
        url: url,
        adapterRef: this.adapterRef
      })
      this.wsTransport_.init()
      this.startHeartbeat()
    }
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
      // 数据上报部分
      let data: any = await this.stats?.getAllStats()
      //@ts-ignore
      //console.log('report data--->', data)
      if (this.isReport && data?.times % 2 === 0) {
        // Electron 上报的数据和 Chrome 不同，暂时不上报，后续需要再进行单独处理
        this.reportData.local = data?.local
        this.reportData.remote = data?.remote
        this.reportData.timestamp = new Date().getTime()
        this.wsTransport_.sendPB(this.reportData)
      }
      if (data?.times % 60 === 0) {
        this.sendDataReportHeartbeat()
      }
    } catch (e: any) {
      // console.warn('doHeartBeat failed')
      this.adapterRef.logger.warn('数据上报出现异常: ', e.message)
    }
  }

  sendDataReportHeartbeat() {
    //上报G2的数据
    let datareport = new DataReport({
      adapterRef: this.adapterRef
    })
    datareport.setHeartbeat({
      name: 'setHeartbeat',
      uid: `${this.adapterRef?.channelInfo.uid}` || '0',
      cid: '' + this.adapterRef.channelInfo.cid
    })
    datareport.send()
    return
  }

  destroy() {
    this.sendDataReportHeartbeat()
    this.stop()
    this._reset()
    if (this.isReport) {
      this.wsTransport_ && this.wsTransport_.close()
    }
  }
}

export { StatsReport }
