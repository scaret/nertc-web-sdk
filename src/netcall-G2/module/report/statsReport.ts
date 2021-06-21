import { EventEmitter } from 'eventemitter3'
import {WholeStatsReport} from './wholeStatsReport'
import {GetStats} from './getStats'
import {FormativeStatsReport} from './formativeStatsReport'
import raf from '../../util/rtcUtil/raf'
import WSTransport from "../../util/wsTransport"
import {
  AdapterRef,
  SDKRef,
  StatsReportOptions
} from "../../types";
// import { platform } from "../../util/platform";
import { SDK_VERSION } from '../../Config'
import { randomId } from '../../util/rtcUtil/utilsId';
const sha1 =  require('js-sha1');

const wsURL = 'wss://statistic-dev.live.126.net/lps-websocket/websocket/collect';
const DEV = 1; // 测试
const PROD = 0; // 线上
const deviceId = randomId();
const platform = 'web';
const sdktype = 'webrtc';
const timestamp = new Date().getTime();
const salt = '40f5a1a1871e46089e1e5139a779dd77';
class StatsReport extends EventEmitter {
  private sdkRef: SDKRef;
  private adapterRef:AdapterRef;
  private appKey: string;
  private stats: GetStats|null;
  private heartbeat_: any;
  private wsTransport_:any;
  // private wholeStatsReport: WholeStatsReport|null;
  public formativeStatsReport: FormativeStatsReport|null;
  
  constructor (options:StatsReportOptions) {
    super()
    this._reset()

    // 设置传入参数
    this.heartbeat_ = -1
    this.wsTransport_ = null
    this.sdkRef = options.sdkRef
    this.adapterRef = options.adapterRef
    this.appKey = this.adapterRef.instance._params.appkey || (this.adapterRef.channelInfo && this.adapterRef.channelInfo.appKey) || ''

    // 初始化stats数据统计 
    this.stats = new GetStats({
      adapterRef: this.adapterRef
    })
    this.stats.on('stats', (data, time) => {
      // this.adapterRef.logger.log(time,'object',data, time);
      // if (time % 2 === 0) { // 两秒上报一次
      //   this.wholeStatsReport && this.wholeStatsReport.update(data)
      // }
      this.formativeStatsReport && this.formativeStatsReport.update(data, time)
    })

    this.formativeStatsReport = new FormativeStatsReport({
      adapterRef: this.adapterRef,
      sdkRef: this.sdkRef,
      appkey: this.appKey
    })

    // this.wholeStatsReport = new WholeStatsReport({
    //   appkey: this.appKey,
    //   adapterRef: this.adapterRef
    // })
  }

  _reset () {
    if (this.stats) {
      this.stats.destroy()
    }
    this.stats = null

    if (this.formativeStatsReport) {
      this.formativeStatsReport.destroy()
    }
    this.formativeStatsReport = null
    
    // if (this.wholeStatsReport) {
    //   this.wholeStatsReport.destroy()
    // }
    // this.wholeStatsReport = null
    this.stopHeartbeat();
  }

  stop () {
    this.stats && this.stats.stop()
    this.formativeStatsReport && this.formativeStatsReport.stop()
    // this.wholeStatsReport && this.wholeStatsReport.stop()
  }

  start () {
    this.stats && this.stats.start()
    // if (this.wholeStatsReport) {
    //   this.wholeStatsReport.start()
    // }
    if (this.formativeStatsReport) {
      this.formativeStatsReport.start()
    }
    let checkSum = sha1(`${PROD}${timestamp}${SDK_VERSION}${platform}${sdktype}${deviceId}${salt}`);
    let url = `${wsURL}?deviceId=${deviceId}&isTest=${PROD}&sdkVer=${SDK_VERSION}&sdktype=${sdktype}&timestamp=${timestamp}&platform=${platform}&checkSum=${checkSum}`;
    this.wsTransport_ = new WSTransport({
      url: url,      
    })
    this.wsTransport_.init();
  }

  // 异常情况时单独上报一次
  // uploadFormatDataStatsOnce (data:any) {
  //   if (!this.formativeStatsReport) return
  //   this.formativeStatsReport.updateOnce()
  // }

  startHeartbeat() {
    if (this.heartbeat_ === -1) {
      const heartbeatInterval = 2000;
      console.log('startHeartbeat...');
      this.heartbeat_ = raf.setInterval(this.doHeartbeat.bind(this), heartbeatInterval);
    }
  }

  stopHeartbeat() {
    if (this.heartbeat_ !== -1) {
      console.log('stopHeartbeat');
      raf.clearInterval(this.heartbeat_);
      this.heartbeat_ = -1;
    }
  }

  async doHeartbeat() {
    try {
      let data = await this.stats?.getAllStats();
      this.wsTransport_.sendPB(data);
    } catch (error) {
      // this.adapterRef.logger.error('getStats失败：' , error);
      console.log(error);
    }
    
    
  }

  destroy () {
    this.stop()
    this._reset()
    this.wsTransport_.close();
  }
}

export {
  StatsReport
}