import { EventEmitter } from 'eventemitter3'
import {GetStats} from './getStats'
import {FormativeStatsReport} from './formativeStatsReport'
import raf from '../../util/rtcUtil/raf'
import WSTransport from "../../util/wsTransport"
import * as env from '../../util/rtcUtil/rtcEnvironment';
import {
  AdapterRef,
  SDKRef,
  StatsReportOptions
} from "../../types";
// import { platform } from "../../util/platform";
import { SDK_VERSION } from '../../Config'
import { randomId } from '../../util/rtcUtil/utilsId';
import isEmpty from "../../util/rtcUtil/isEmpty";
const sha1 =  require('js-sha1');

const wsURL = 'wss://statistic.live.126.net/lps-websocket/websocket/collect';
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
  private prevStats_: any;
  public formativeStatsReport: FormativeStatsReport|null;
  
  constructor (options:StatsReportOptions) {
    super()
    this._reset()

    // 设置传入参数
    this.heartbeat_ = -1
    this.wsTransport_ = null
    this.sdkRef = options.sdkRef
    this.adapterRef = options.adapterRef
    this.prevStats_ = {}
    this.appKey = this.adapterRef.instance._params.appkey || (this.adapterRef.channelInfo && this.adapterRef.channelInfo.appKey) || ''

    // 初始化stats数据统计 
    this.stats = new GetStats({
      adapterRef: this.adapterRef,
      interval: 1000
    })
    this.stats.on('stats', (data, time) => {
      // this.adapterRef.logger.log(time,'object',data, time);

      this.formativeStatsReport && this.formativeStatsReport.update(data, time)
      
    })

    this.formativeStatsReport = new FormativeStatsReport({
      adapterRef: this.adapterRef,
      sdkRef: this.sdkRef,
      appkey: this.appKey
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

    this.stopHeartbeat();
  }

  stop () {
    this.stats && this.stats.stop()
    this.formativeStatsReport && this.formativeStatsReport.stop()
  }

  start () {
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
      let reportData = this.calculateReport(data);
      // console.log('data--->', reportData)
      this.wsTransport_.sendPB(reportData);
    } catch (error) {
      // this.adapterRef.logger.error('getStats失败：' , error);
      console.log(error);
    }
    
    
  }

  calculateReport(result:any) {
    
    
    if(env.IS_CHROME){
      // chrome 浏览器 正在通话中，远端加入其他音频、视频或屏幕分享流
      let la = result.local.audio_ssrc ? result.local.audio_ssrc : [],
        lv = result.local.video_ssrc ? result.local.video_ssrc : [],
        ra = result.remote.audio_ssrc ? result.remote.audio_ssrc : [],
        rv = result.remote.video_ssrc ? result.remote.video_ssrc : [],
        rs = result.remote.screen_ssrc ? result.remote.screen_ssrc : [];

      if(!isEmpty(this.prevStats_)) {
        var pla = this.prevStats_.local.audio_ssrc ? this.prevStats_.local.audio_ssrc : [],
          plv = this.prevStats_.local.video_ssrc ? this.prevStats_.local.video_ssrc : [],
          pra = this.prevStats_.remote.audio_ssrc ? this.prevStats_.remote.audio_ssrc : [],
          prv = this.prevStats_.remote.video_ssrc ? this.prevStats_.remote.video_ssrc : [],
          prs = this.prevStats_.remote.screen_ssrc ? this.prevStats_.remote.screen_ssrc : [];
      }
    

      if(isEmpty(this.prevStats_) || (la.length !== pla.length) || (lv.length !== plv.length) || (ra.length !== pra.length) || (rv.length !== prv.length) || (rs.length !== prs.length) ) {
        this.prevStats_ = result;
        if(Object.keys(this.prevStats_.local).length){
          this.prevStats_.local.audio_ssrc[0].bytesSentPerSecond = this.prevStats_.local.audio_ssrc[0].bytesSent;
          this.prevStats_.local.video_ssrc[0].bytesSentPerSecond = this.prevStats_.local.video_ssrc[0].bytesSent;
          this.prevStats_.local.video_ssrc[0].framesEncodedPerSecond = this.prevStats_.local.video_ssrc[0].framesEncoded;
        }
        for(let item in this.prevStats_.remote){
          if(item.indexOf('ssrc') > -1) {
            for(let i = 0; i < this.prevStats_.remote[item].length; i++){
              this.prevStats_.remote[item][i].bytesReceivedPerSecond = this.prevStats_.remote[item][i].bytesReceived;
              if(this.prevStats_.remote[item][i].mediaType === 'video') {
                this.prevStats_.remote[item][i].framesDecodedPerSecond = this.prevStats_.remote[item][i].framesDecoded;
              }
            }
          }
        }
      }else {
        let local = result.local;
        let prevLocal = this.prevStats_.local;
        let remote = result.remote;
        let prevRemote = this.prevStats_.remote;
        if(Object.keys(local).length){
          local.audio_ssrc[0].bytesSentPerSecond = (local.audio_ssrc[0].bytesSent - 0 - prevLocal.audio_ssrc[0].bytesSent)/2;
          local.video_ssrc[0].bytesSentPerSecond = (local.video_ssrc[0].bytesSent - 0 - prevLocal.video_ssrc[0].bytesSent)/2;
          local.video_ssrc[0].framesEncodedPerSecond = (local.video_ssrc[0].framesEncoded - 0 - prevLocal.video_ssrc[0].framesEncoded)/2;
        }
        for(let item in remote){
          if(item.indexOf('ssrc') > -1) {
            for(let i = 0; i < remote[item].length; i++){
              remote[item][i].bytesReceivedPerSecond = (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived)/2;
              if(this.prevStats_.remote[item][i].mediaType === 'video') {
                remote[item][i].framesDecodedPerSecond = (remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)/2;
              }
            }
          }
        }
      }
    }else if(env.IS_SAFARI) {
      // safari 浏览器
    let sla = result.local.audio_outbound_rtp ? result.local.audio_outbound_rtp : [],
      slv = result.local.video_outbound_rtp ? result.local.video_outbound_rtp : [],
      sra = result.remote.audio_inbound_rtp ? result.remote.audio_inbound_rtp : [],
      srv = result.remote.video_inbound_rtp ? result.remote.video_inbound_rtp : [];

    if(!isEmpty(this.prevStats_)) {
      var spla = this.prevStats_.local.audio_outbound_rtp ? this.prevStats_.local.audio_outbound_rtp : [],
        splv = this.prevStats_.local.video_outbound_rtp ? this.prevStats_.local.video_outbound_rtp : [],
        spra = this.prevStats_.remote.audio_inbound_rtp ? this.prevStats_.remote.audio_inbound_rtp : [],
        sprv = this.prevStats_.remote.video_inbound_rtp ? this.prevStats_.remote.video_inbound_rtp : [];
    }

      if(isEmpty(this.prevStats_) || (sla.length !== spla.length) || (slv.length !== splv.length) || (sra.length !== spra.length) || (srv.length !== sprv.length) ) {
        this.prevStats_ = result;
        if(Object.keys(this.prevStats_.local).length){
          this.prevStats_.local.audio_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.audio_outbound_rtp[0].bytesSent;
          this.prevStats_.local.video_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.video_outbound_rtp[0].bytesSent;
          this.prevStats_.local.video_outbound_rtp[0].framesEncodedPerSecond = this.prevStats_.local.video_outbound_rtp[0].framesEncoded;
        }
        for(let item in this.prevStats_.remote){
          if(item.indexOf('inbound_rtp') > -1) {
            for(let i = 0; i < this.prevStats_.remote[item].length; i++){
              this.prevStats_.remote[item][i].bytesReceivedPerSecond = this.prevStats_.remote[item][i].bytesReceived;
              if(this.prevStats_.remote[item][i].mediaType === 'video') {
                this.prevStats_.remote[item][i].framesDecodedPerSecond = this.prevStats_.remote[item][i].framesDecoded;
              }
            }
          }
        }
      }else {
        let local = result.local;
        let prevLocal = this.prevStats_.local;
        let remote = result.remote;
        let prevRemote = this.prevStats_.remote;
        if(Object.keys(local).length){
          local.audio_outbound_rtp[0].bytesSentPerSecond = (local.audio_outbound_rtp[0].bytesSent - 0 - prevLocal.audio_outbound_rtp[0].bytesSent)/2;
          local.video_outbound_rtp[0].bytesSentPerSecond = (local.video_outbound_rtp[0].bytesSent - 0 - prevLocal.video_outbound_rtp[0].bytesSent)/2;
          local.video_outbound_rtp[0].framesEncodedPerSecond = (local.video_outbound_rtp[0].framesEncoded - 0 - prevLocal.video_outbound_rtp[0].framesEncoded)/2;
        }
        for(let item in remote){
          if(item.indexOf('inbound_rtp') > -1) {
            for(let i = 0; i < remote[item].length; i++){
              remote[item][i].bytesReceivedPerSecond = (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived)/2;
              if(this.prevStats_.remote[item][i].mediaType === 'video') {
                remote[item][i].framesDecodedPerSecond = (remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)/2;
              }
            }
          }
        }
      }

    }
    
    this.prevStats_ = result;
    return this.prevStats_;
  }

  destroy () {
    this.stop()
    this._reset()
    this.wsTransport_ && this.wsTransport_.close();
  }
}

export {
  StatsReport
}