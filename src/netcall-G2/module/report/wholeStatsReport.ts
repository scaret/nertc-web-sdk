/**
 * 上报完整的getStats数据
 */
import { ajax } from "../../util/ajax";
import {platform} from "../../util/platform";
import { SDK_VERSION } from '../../Config/index'
import {
  WholeStatsReportOptions,
  AdapterRef,
  WholeStatsReportStartOptions,
} from "../../types";
import * as pako from 'pako';
// @ts-ignore
import * as gzip from 'gzip-js';

let url = 'https://statistic.live.126.net/webrtc/stat'

/**
 *  @param {Object} options 配置参数
 */
class WholeStatsReport {
  private adapterRef:AdapterRef;
  private infos:{
    data: {[key:string]: any};
    appkey: string;
    cid?: string;
    uid?: string;
    ver: string;
    platform: string;
    browser: string;
    sdk_ver: string;
    interval: number;
    time: number;
  };
  
  constructor (option:WholeStatsReportOptions) {
    const { appkey, adapterRef } = option
    this.adapterRef = adapterRef
    this.infos = this.init(appkey)
    this.resetStatus()
  }

  resetStatus () {}

  init (appkey: string) {
    this.infos = {
      interval: 9,
      ver: "2",
      platform:
        tool.convertPlatform(platform.os.family) + '-' + platform.os.version,
      browser: platform.name + '-' + platform.version,
      sdk_ver: SDK_VERSION,
      uid: "0",
      cid: "0",
      appkey,
      time: Date.now(),
      data: {}
    }
    return this.infos;
  }

  // 数据上报一次，清空一次
  clear () {
    this.infos.data = {}
  }

  /**
   * 开启上报时初始化一些固定值
   * @param {string} obj.appkey appkey
   * @param {string} obj.cid cid
   * @param {string} obj.uid uid
   */
  start (obj:WholeStatsReportStartOptions = {}) {
    this.infos.appkey = obj.appkey || this.infos.appkey
    this.infos.cid = obj.cid
    this.infos.uid = obj.uid
  }

  stop () {
    this.send()
    this.clear()
  }

  update (data: any) {
    this.infos.data[`stat_${Date.now()}`] = data
    
    if (Object.keys(this.infos.data).length >= this.infos.interval) {
      this.send()
    }
  }

  send () {
    if(!this.adapterRef.report) return
    // 空数据保护
    if (Object.keys(this.infos.data).length === 0) return
    this.infos.uid = this.adapterRef.channelInfo.uid
    this.infos.cid = this.adapterRef.channelInfo.cid
    this.infos.time = Date.now()
    //this.adapterRef.logger.log('url: ', url)
    if (this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer) {
      //url = url.replace("statistic.live.126.net", this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer);
      url = this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer
      this.adapterRef.logger.log('私有化配置的 reportUrl: ', url)
    }

    // compress report data
    // pako.gzip(params) 默认返回一个 Uint8Array 对象
    let params = pako.gzip(JSON.stringify(this.infos))
    ajax({ 
      type: 'post', 
      url, 
      data: new Blob([params]), 
      header: {
        'Content-Encoding': 'gzip',
        sdktype: 'nrtc',
        appkey: this.infos.appkey,
        platform: 'web',
        sdkver: SDK_VERSION
      } 
    }).then(data => {
        this.clear()
      })
      .catch(err => {
        this.adapterRef.logger.log('wholeStatsReport send error: ', err)
        this.clear()
      })
  }
  destroy () {
    this.stop()
  }
}

// 数据转换工具
let tool = {
  convertNetwork (txt:string) {
    let map:{[index: string]:any} = {
      wlan: 'wifi',
      lan: 'ethernet'
    }
    return map[txt] || 'unknown'
  },
  convertPlatform (txt: string) {
    let win = /Windows/i
    let mac = /OS X/i
    let result
    result = (win.test(txt) && 'Win') || txt
    result = (mac.test(result) && 'Mac') || result
    return result
  }
}

export {
  WholeStatsReport
}