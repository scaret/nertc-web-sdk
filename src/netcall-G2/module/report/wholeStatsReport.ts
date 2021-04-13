/**
 * 上报完整的getStats数据
 */
import { ajax } from "../../util/ajax";
import {platform} from "../../util/platform";
const SDK_VERSION = require('../../../../package.json').webrtcG2Version
import {
  WholeStatsReportOptions,
  AdapterRef,
  WholeStatsReportStartOptions,
} from "../../types";

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
      interval: 30,
      ver: "2",
      platform:
        tool.convertPlatform(platform.os.family) + '-' + platform.os.version,
      browser: platform.name + '-' + platform.version,
      sdk_ver: SDK_VERSION || '3.6.0',
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
    //console.log('send stats data', this.infos)
    ajax({ 
      type: 'post', 
      url, 
      data: this.infos,
      header: {
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