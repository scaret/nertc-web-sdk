import { EventEmitter } from 'eventemitter3'
import {WholeStatsReport} from './wholeStatsReport'
import {GetStats} from './getStats'
import {FormativeStatsReport} from './formativeStatsReport'
import {
  AdapterRef,
  SDKRef,
  StatsReportOptions
} from "../../types";

class StatsReport extends EventEmitter {
  private sdkRef: SDKRef;
  private adapterRef:AdapterRef;
  private appKey: string;
  private stats: GetStats|null;
  private wholeStatsReport: WholeStatsReport|null;
  public formativeStatsReport: FormativeStatsReport|null;
  
  constructor (options:StatsReportOptions) {
    super()
    this._reset()

    // 设置传入参数
    this.sdkRef = options.sdkRef
    this.adapterRef = options.adapterRef
    this.appKey = this.adapterRef.instance._params.appkey || (this.adapterRef.channelInfo && this.adapterRef.channelInfo.appKey) || ''

    // 初始化stats数据统计 
    this.stats = new GetStats({
      adapterRef: this.adapterRef,
      interval: 1000
    })
    this.stats.on('stats', (data, time) => {
      //this.adapterRef.logger.log(time,'object',data, time);

      if (time % 2 === 0) { // 两秒上报一次
        this.wholeStatsReport && this.wholeStatsReport.update(data)
      }
      this.formativeStatsReport && this.formativeStatsReport.update(data, time)
    })

    this.formativeStatsReport = new FormativeStatsReport({
      adapterRef: this.adapterRef,
      sdkRef: this.sdkRef,
      appkey: this.appKey
    })

    this.wholeStatsReport = new WholeStatsReport({
      appkey: this.appKey,
      adapterRef: this.adapterRef
    })
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
    
    if (this.wholeStatsReport) {
      this.wholeStatsReport.destroy()
    }
    this.wholeStatsReport = null
  }

  stop () {
    this.stats && this.stats.stop()
    this.formativeStatsReport && this.formativeStatsReport.stop()
    this.wholeStatsReport && this.wholeStatsReport.stop()
  }

  start () {
    this.stats && this.stats.start()
    if (this.wholeStatsReport) {
      this.wholeStatsReport.start()
    }
    if (this.formativeStatsReport) {
      this.formativeStatsReport.start()
    }
  }

  // 异常情况时单独上报一次
  uploadFormatDataStatsOnce (data:any) {
    if (!this.formativeStatsReport) return
    this.formativeStatsReport.updateOnce()
  }

  destroy () {
    this.stop()
    this._reset()
  }
}

export {
  StatsReport
}