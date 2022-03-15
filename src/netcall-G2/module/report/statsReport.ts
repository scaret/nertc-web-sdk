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
import { SDK_VERSION } from '../../Config'
import { generateUUID } from '../../util/rtcUtil/utilsId';
import isEmpty from "../../util/rtcUtil/isEmpty";
const sha1 =  require('js-sha1');

const wsURL = 'wss://statistic.live.126.net/lps-websocket/websocket/collect';
const DEV = 1; // 测试
const PROD = 0; // 线上
const deviceId = generateUUID();
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
  public isStartGetStats: boolean;
  
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
    this.isStartGetStats = false;

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

  statsStart() {
    if (this.formativeStatsReport) {
      this.isStartGetStats = true;
      this.formativeStatsReport.start()
    }
    
  }

  start () {
    
    let checkSum = sha1(`${PROD}${timestamp}${SDK_VERSION}${platform}${sdktype}${deviceId}${salt}`);
    let url = `${wsURL}?deviceId=${deviceId}&isTest=${PROD}&sdkVer=${SDK_VERSION}&sdktype=${sdktype}&timestamp=${timestamp}&platform=${platform}&checkSum=${checkSum}`;
    this.wsTransport_ = (<any>window).wsTransport = new WSTransport({
      url: url,
      adapterRef: this.adapterRef
    })
    this.wsTransport_.init();
  }

  startHeartbeat() {
    if (this.heartbeat_ === -1) {
      const heartbeatInterval = 2000;
      this.adapterRef.logger.log('startHeartbeat...');
      this.heartbeat_ = raf.setInterval(this.doHeartbeat.bind(this), heartbeatInterval);
    }
  }

  stopHeartbeat() {
    if (this.heartbeat_ !== -1) {
      // this.adapterRef.logger.log('stopHeartbeat...');
      raf.clearInterval(this.heartbeat_);
      this.heartbeat_ = -1;
    }
  }

  async doHeartbeat() {
    try {
      if(this.isStartGetStats) { // 数据上报部分
        let data = await this.stats?.getAllStats();
        let reportData = this.calculateReport(data);
        // console.log('data--->', reportData)
        this.wsTransport_.sendPB(reportData);
      }
    } catch (error) {
      this.adapterRef.logger.error('getStats失败：' , error);
    }
    
    
  }

  calculateReport(result:any) {
    
    if(env.IS_CHROME || env.IS_EDG){
      // chrome 浏览器 正在通话中，远端加入其他音频、视频或屏幕分享流
      let la = result.local.audio_ssrc ? result.local.audio_ssrc : [],
        lv = result.local.video_ssrc ? result.local.video_ssrc : [],
        ls = result.local.screen_ssrc ? result.local.screen_ssrc : [],
        ra = result.remote.audio_ssrc ? result.remote.audio_ssrc : [],
        rv = result.remote.video_ssrc ? result.remote.video_ssrc : [],
        rs = result.remote.screen_ssrc ? result.remote.screen_ssrc : [];

      if(!isEmpty(this.prevStats_)) {
        var pla = this.prevStats_.local.audio_ssrc ? this.prevStats_.local.audio_ssrc : [],
          plv = this.prevStats_.local.video_ssrc ? this.prevStats_.local.video_ssrc : [],
          pls = this.prevStats_.local.screen_ssrc ? this.prevStats_.local.screen_ssrc : [],
          pra = this.prevStats_.remote.audio_ssrc ? this.prevStats_.remote.audio_ssrc : [],
          prv = this.prevStats_.remote.video_ssrc ? this.prevStats_.remote.video_ssrc : [],
          prs = this.prevStats_.remote.screen_ssrc ? this.prevStats_.remote.screen_ssrc : [];
      }
    
      if(isEmpty(this.prevStats_) || (la.length !== pla.length) || (lv.length !== plv.length) || (ls.length !== pls.length) || (ra.length !== pra.length) || (rv.length !== prv.length) || (rs.length !== prs.length) ) {
        this.prevStats_ = result;
        if(Object.keys(this.prevStats_.local).length){
          this.prevStats_.local.audio_ssrc && (this.prevStats_.local.audio_ssrc[0].bytesSentPerSecond = this.prevStats_.local.audio_ssrc[0].bytesSent);
          this.prevStats_.local.video_ssrc && (this.prevStats_.local.video_ssrc[0].bytesSentPerSecond = this.prevStats_.local.video_ssrc[0].bytesSent);
          this.prevStats_.local.video_ssrc && (this.prevStats_.local.video_ssrc[0].framesEncodedPerSecond = this.prevStats_.local.video_ssrc[0].framesEncoded);
          this.prevStats_.local.screen_ssrc && (this.prevStats_.local.screen_ssrc[0].bytesSentPerSecond = this.prevStats_.local.screen_ssrc[0].bytesSent);
          this.prevStats_.local.screen_ssrc && (this.prevStats_.local.screen_ssrc[0].framesEncodedPerSecond = this.prevStats_.local.screen_ssrc[0].framesEncoded);
        }
        for(let item in this.prevStats_.remote){
          if(item.indexOf('ssrc') > -1) {
            for(let i = 0; i < this.prevStats_.remote[item].length; i++){
              this.prevStats_.remote[item][i].bytesReceivedPerSecond = this.prevStats_.remote[item][i].bytesReceived;
              this.prevStats_.remote[item][i].packetsLostPerSecond = this.prevStats_.remote[item][i].packetsLost;
              if(this.prevStats_.remote[item][i].mediaType === ('video' || 'screen')) {
                this.prevStats_.remote[item][i].framesDecodedPerSecond = Math.round(this.prevStats_.remote[item][i].framesDecoded);
              }
            }
          }
        }
      } else {
        let local = result.local;
        let prevLocal = this.prevStats_.local;
        let remote = result.remote;
        let prevRemote = this.prevStats_.remote;
        if(Object.keys(local).length){
          // 当local为0时， bytesSentPerSecond等都为0。
          if(local.audio_ssrc){
            if((local.audio_ssrc[0].bytesSent - 0) > 0 && (local.audio_ssrc[0].bytesSent - 0 - prevLocal.audio_ssrc[0].bytesSent) > 0){
              local.audio_ssrc[0].bytesSentPerSecond = (local.audio_ssrc[0].bytesSent - 0 - prevLocal.audio_ssrc[0].bytesSent)/2;
            }else {
              local.audio_ssrc[0].bytesSentPerSecond = 0;
            }
            
          }
          if(local.video_ssrc){
            if((local.video_ssrc[0].bytesSent - 0) > 0 && (local.video_ssrc[0].bytesSent - 0 - prevLocal.video_ssrc[0].bytesSent) > 0){
              local.video_ssrc[0].bytesSentPerSecond = (local.video_ssrc[0].bytesSent - 0 - prevLocal.video_ssrc[0].bytesSent)/2;
            }else {
              local.video_ssrc[0].bytesSentPerSecond = 0;
            }
            if((local.video_ssrc[0].framesEncoded - 0) > 0 && (local.video_ssrc[0].framesEncoded - 0 - prevLocal.video_ssrc[0].framesEncoded) > 0){
              local.video_ssrc[0].framesEncodedPerSecond = (local.video_ssrc[0].framesEncoded - 0 - prevLocal.video_ssrc[0].framesEncoded)/2;
            }else {
              local.video_ssrc[0].framesEncodedPerSecond = 0;
            }
          }
          if(local.screen_ssrc){
            if((local.screen_ssrc[0].bytesSent - 0) > 0 && (local.screen_ssrc[0].bytesSent - 0 - prevLocal.screen_ssrc[0].bytesSent) > 0){
              local.screen_ssrc[0].bytesSentPerSecond = (local.screen_ssrc[0].bytesSent - 0 - prevLocal.screen_ssrc[0].bytesSent)/2;
            }else {
              local.screen_ssrc[0].bytesSentPerSecond = 0;
            }
            if((local.screen_ssrc[0].framesEncoded - 0) > 0 && (local.screen_ssrc[0].framesEncoded - 0 - prevLocal.screen_ssrc[0].framesEncoded) > 0){
              local.screen_ssrc[0].framesEncodedPerSecond = (local.screen_ssrc[0].framesEncoded - 0 - prevLocal.screen_ssrc[0].framesEncoded)/2;
            }else {
              local.screen_ssrc[0].framesEncodedPerSecond = 0;
            }
          }
        }
        for(let item in remote){
          if(item.indexOf('ssrc') > -1) {
            for(let i = 0; i < remote[item].length; i++){
              if((remote[item][i].bytesReceived - 0) > 0 && (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived) > 0){
                remote[item][i].bytesReceivedPerSecond = (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived)/2;
              }else {
                remote[item][i].bytesReceivedPerSecond = 0;
              }
              if((remote[item][i].packetsLost - 0) > 0 && (remote[item][i].packetsLost - 0 - prevRemote[item][i].packetsLost) > 0){
                remote[item][i].packetsLostPerSecond = (remote[item][i].packetsLost - 0 - prevRemote[item][i].packetsLost)/2;
              }else {
                remote[item][i].packetsLostPerSecond = 0;
              }
              if(this.prevStats_.remote[item][i].mediaType === ('video' || 'screen')) {
                if((remote[item][i].framesDecoded - 0) > 0 && Math.round((remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)/2) > 0){
                  remote[item][i].framesDecodedPerSecond = Math.round((remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)/2);
                }else {
                  remote[item][i].framesDecodedPerSecond = 0;
                }
              }
            }
          }
        }
      }
    } else if (env.IS_SAFARI) {
      // safari 浏览器
    let sla = result.local.audio_outbound_rtp ? result.local.audio_outbound_rtp : [],
      slv = result.local.video_outbound_rtp ? result.local.video_outbound_rtp : [],
      // safari 13 部分数据在 video_track 中
      slvt = result.local.video_track ? result.local.video_track : [],
      sra = result.remote.audio_inbound_rtp ? result.remote.audio_inbound_rtp : [],
      srv = result.remote.video_inbound_rtp ? result.remote.video_inbound_rtp : [],
      srvt = result.remote.video_track ? result.remote.video_track : [];

    if (!isEmpty(this.prevStats_)) {
      var spla = this.prevStats_.local.audio_outbound_rtp ? this.prevStats_.local.audio_outbound_rtp : [],
        splv = this.prevStats_.local.video_outbound_rtp ? this.prevStats_.local.video_outbound_rtp : [],
        splvt = this.prevStats_.local.video_track ? this.prevStats_.local.video_track : [],
        spra = this.prevStats_.remote.audio_inbound_rtp ? this.prevStats_.remote.audio_inbound_rtp : [],
        sprv = this.prevStats_.remote.video_inbound_rtp ? this.prevStats_.remote.video_inbound_rtp : [],
        sprvt = this.prevStats_.remote.video_track ? this.prevStats_.remote.video_track : [];
    }

      if(isEmpty(this.prevStats_) || (sla.length !== spla.length) || (slv.length !== splv.length) || (slvt.length !== splvt.length) || (sra.length !== spra.length) || (srv.length !== sprv.length) || (srvt.length !== sprvt.length) ) {
        this.prevStats_ = result;
        if(Object.keys(this.prevStats_.local).length){
          this.prevStats_.local.audio_outbound_rtp && (this.prevStats_.local.audio_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.audio_outbound_rtp[0].bytesSent);
          this.prevStats_.local.video_outbound_rtp && (this.prevStats_.local.video_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.video_outbound_rtp[0].bytesSent);
          this.prevStats_.local.video_outbound_rtp && (this.prevStats_.local.video_outbound_rtp[0].framesEncodedPerSecond = this.prevStats_.local.video_outbound_rtp[0].framesEncoded);
          // safari 13 的 framesPerSecond 需要计算
          this.prevStats_.local.video_track && (this.prevStats_.local.video_track[0].framesSentPerSecond = this.prevStats_.local.video_track[0].framesSent);

        }
        for(let item in this.prevStats_.remote){
          if(item.indexOf('inbound_rtp') > -1) {
            for(let i = 0; i < this.prevStats_.remote[item].length; i++){
              this.prevStats_.remote[item][i].bytesReceivedPerSecond = this.prevStats_.remote[item][i].bytesReceived;
              this.prevStats_.remote[item][i].packetsLostPerSecond = this.prevStats_.remote[item][i].packetsLost;
              if(this.prevStats_.remote[item][i].mediaType === 'video') {
                this.prevStats_.remote[item][i].framesDecodedPerSecond = Math.round(this.prevStats_.remote[item][i].framesDecoded);
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
          // 当local为0时， bytesSentPerSecond等都为0。
          if(local.audio_outbound_rtp){
            if((local.audio_outbound_rtp[0].bytesSent - 0) > 0 && (local.audio_outbound_rtp[0].bytesSent - 0 - prevLocal.audio_outbound_rtp[0].bytesSent) > 0){
              local.audio_outbound_rtp[0].bytesSentPerSecond = (local.audio_outbound_rtp[0].bytesSent - 0 - prevLocal.audio_outbound_rtp[0].bytesSent)/2;
            }else {
              local.audio_outbound_rtp[0].bytesSentPerSecond = 0;
            }
          }
          if(local.video_outbound_rtp){
            if((local.video_outbound_rtp[0].bytesSent - 0) > 0 && (local.video_outbound_rtp[0].bytesSent - 0 - prevLocal.video_outbound_rtp[0].bytesSent) > 0){
              local.video_outbound_rtp[0].bytesSentPerSecond = (local.video_outbound_rtp[0].bytesSent - 0 - prevLocal.video_outbound_rtp[0].bytesSent)/2;
            }else {
              local.video_outbound_rtp[0].bytesSentPerSecond = 0;
            }
            if((local.video_outbound_rtp[0].framesEncoded - 0) > 0 && (local.video_outbound_rtp[0].framesEncoded - 0 - prevLocal.video_outbound_rtp[0].framesEncoded) > 0){
              local.video_outbound_rtp[0].framesEncodedPerSecond = (local.video_outbound_rtp[0].framesEncoded - 0 - prevLocal.video_outbound_rtp[0].framesEncoded)/2;
            }else {
              local.video_outbound_rtp[0].framesEncodedPerSecond = 0;
            }
          }
          // safari 13 的 framesPerSecond 需要计算
          if(local.video_track){
            if((local.video_track[0].framesSent - 0) > 0 && Math.round((local.video_track[0].framesSent - 0 - prevLocal.video_track[0].framesSent)) > 0){
              local.video_track[0].framesSentPerSecond = Math.round((local.video_track[0].framesSent - 0 - prevLocal.video_track[0].framesSent)/2);
            }else {
              local.video_track[0].framesSentPerSecond = 0;
            }
          }
        }
        for(let item in remote){
          if(item.indexOf('inbound_rtp') > -1) {
            for(let i = 0; i < remote[item].length; i++){
              if((remote[item][i].bytesReceived - 0) > 0 && (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived) > 0) {
                remote[item][i].bytesReceivedPerSecond = (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived)/2;
              }else {
                remote[item][i].bytesReceivedPerSecond = 0;
              }
              if((remote[item][i].packetsLost - 0) > 0 && (remote[item][i].packetsLost - 0 - prevRemote[item][i].packetsLost) > 0) {
                remote[item][i].packetsLostPerSecond = (remote[item][i].packetsLost - 0 - prevRemote[item][i].packetsLost)/2;
              }
              if(this.prevStats_.remote[item][i].mediaType === 'video') {
                if((remote[item][i].framesDecoded - 0) > 0 && Math.round((remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)) > 0){
                  remote[item][i].framesDecodedPerSecond = Math.round((remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)/2);
                }
              }
            }
          }
        }
      }

    }else if(env.IS_FIREFOX) {
      // firefox 浏览器正在通话中，远端加入其他音频、视频或屏幕分享流
      let la = result.local.audio_outbound_rtp ? result.local.audio_outbound_rtp : [],
        lv = result.local.video_outbound_rtp ? result.local.video_outbound_rtp : [],
        ls = result.local.screen_outbound_rtp ? result.local.screen_outbound_rtp : [],
        ra = result.remote.audio_inbound_rtp ? result.remote.audio_inbound_rtp : [],
        rv = result.remote.video_inbound_rtp ? result.remote.video_inbound_rtp : [],
        rs = result.remote.screen_inbound_rtp ? result.remote.screen_inbound_rtp : [];

      if(!isEmpty(this.prevStats_)) {
        var pla = this.prevStats_.local.audio_outbound_rtp ? this.prevStats_.local.audio_outbound_rtp : [],
          plv = this.prevStats_.local.video_outbound_rtp ? this.prevStats_.local.video_outbound_rtp : [],
          pls = this.prevStats_.local.screen_outbound_rtp ? this.prevStats_.local.screen_outbound_rtp : [],
          pra = this.prevStats_.remote.audio_inbound_rtp ? this.prevStats_.remote.audio_inbound_rtp : [],
          prv = this.prevStats_.remote.video_inbound_rtp ? this.prevStats_.remote.video_inbound_rtp : [],
          prs = this.prevStats_.remote.screen_inbound_rtp ? this.prevStats_.remote.screen_inbound_rtp : [];
      }
    
      if(isEmpty(this.prevStats_) || (la.length !== pla.length) || (lv.length !== plv.length) || (ls.length !== pls.length) || (ra.length !== pra.length) || (rv.length !== prv.length) || (rs.length !== prs.length) ) {
        this.prevStats_ = result;
        if(Object.keys(this.prevStats_.local).length){
          this.prevStats_.local.audio_outbound_rtp && (this.prevStats_.local.audio_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.audio_outbound_rtp[0].bytesSent);
          this.prevStats_.local.audio_outbound_rtp && (this.prevStats_.local.audio_outbound_rtp[0].packetsSentPerSecond = this.prevStats_.local.audio_outbound_rtp[0].packetsSent);
          this.prevStats_.local.video_outbound_rtp && (this.prevStats_.local.video_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.video_outbound_rtp[0].bytesSent);
          this.prevStats_.local.video_outbound_rtp && (this.prevStats_.local.video_outbound_rtp[0].framesEncodedPerSecond = this.prevStats_.local.video_outbound_rtp[0].framesEncoded);
          this.prevStats_.local.video_outbound_rtp && (this.prevStats_.local.video_outbound_rtp[0].packetsSentPerSecond = this.prevStats_.local.video_outbound_rtp[0].packetsSent);
          this.prevStats_.local.screen_outbound_rtp && (this.prevStats_.local.screen_outbound_rtp[0].bytesSentPerSecond = this.prevStats_.local.screen_outbound_rtp[0].bytesSent);
          this.prevStats_.local.screen_outbound_rtp && (this.prevStats_.local.screen_outbound_rtp[0].framesEncodedPerSecond = this.prevStats_.local.screen_outbound_rtp[0].framesEncoded);
          this.prevStats_.local.screen_outbound_rtp && (this.prevStats_.local.screen_outbound_rtp[0].packetsSentPerSecond = this.prevStats_.local.screen_outbound_rtp[0].packetsSent);
        }
        for(let item in this.prevStats_.remote){
          if(item.indexOf('_inbound_rtp') > -1) {
            for(let i = 0; i < this.prevStats_.remote[item].length; i++){
              this.prevStats_.remote[item][i].bytesReceivedPerSecond = this.prevStats_.remote[item][i].bytesReceived;
              this.prevStats_.remote[item][i].packetsLostPerSecond = this.prevStats_.remote[item][i].packetsLost;
              this.prevStats_.remote[item][i].packetsReceivedPerSecond = this.prevStats_.remote[item][i].packetsReceived;
              this.prevStats_.remote[item][i].recvPacketLoss = this.prevStats_.remote[item][i].packetsLost/this.prevStats_.remote[item][i].packetsReceived;
              if(this.prevStats_.remote[item][i].mediaType === 'video' || this.prevStats_.remote[item][i].mediaType === 'screen') {
                this.prevStats_.remote[item][i].framesDecodedPerSecond = Math.round(this.prevStats_.remote[item][i].framesDecoded);
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
          // 当local为0时， bytesSentPerSecond等都为0。
          if(local.audio_outbound_rtp) {
            if((local.audio_outbound_rtp[0].bytesSent - 0) > 0 && (local.audio_outbound_rtp[0].bytesSent - 0 - prevLocal.audio_outbound_rtp[0].bytesSent) > 0){
              local.audio_outbound_rtp[0].bytesSentPerSecond = (local.audio_outbound_rtp[0].bytesSent - 0 - prevLocal.audio_outbound_rtp[0].bytesSent)/2;
            }else {
              local.audio_outbound_rtp[0].bytesSentPerSecond = 0;
            }
            if((local.audio_outbound_rtp[0].packetsSent - 0) > 0 && (local.audio_outbound_rtp[0].packetsSent - 0 - prevLocal.audio_outbound_rtp[0].packetsSent) > 0){
              local.audio_outbound_rtp[0].packetsSentPerSecond = (local.audio_outbound_rtp[0].packetsSent - 0 - prevLocal.audio_outbound_rtp[0].packetsSent)/2;
            }else {
              local.audio_outbound_rtp[0].packetsSentPerSecond = 0;
            }
          }
          if(local.video_outbound_rtp){
            if((local.video_outbound_rtp[0].bytesSent - 0) > 0 && (local.video_outbound_rtp[0].bytesSent - 0 - prevLocal.video_outbound_rtp[0].bytesSent) > 0) {
              local.video_outbound_rtp[0].bytesSentPerSecond = (local.video_outbound_rtp[0].bytesSent - 0 - prevLocal.video_outbound_rtp[0].bytesSent)/2;
            }else {
              local.video_outbound_rtp[0].bytesSentPerSecond = 0;
            }
            if((local.video_outbound_rtp[0].framesEncoded - 0) > 0 && (local.video_outbound_rtp[0].framesEncoded - 0 - prevLocal.video_outbound_rtp[0].framesEncoded) > 0) {
              local.video_outbound_rtp[0].framesEncodedPerSecond = (local.video_outbound_rtp[0].framesEncoded - 0 - prevLocal.video_outbound_rtp[0].framesEncoded)/2;
            }else {
              local.video_outbound_rtp[0].framesEncodedPerSecond = 0;
            }
            if((local.video_outbound_rtp[0].packetsSent - 0) > 0 && (local.video_outbound_rtp[0].packetsSent - 0 - prevLocal.video_outbound_rtp[0].packetsSent) > 0) {
              local.video_outbound_rtp[0].packetsSentPerSecond = (local.video_outbound_rtp[0].packetsSent - 0 - prevLocal.video_outbound_rtp[0].packetsSent)/2;
            }else {
              local.video_outbound_rtp[0].packetsSentPerSecond = 0;
            }
          }
          if(local.screen_outbound_rtp){
            if((local.screen_outbound_rtp[0].bytesSent - 0) > 0 && (local.screen_outbound_rtp[0].bytesSent - 0 - prevLocal.screen_outbound_rtp[0].bytesSent) > 0) {
              local.screen_outbound_rtp[0].bytesSentPerSecond = (local.screen_outbound_rtp[0].bytesSent - 0 - prevLocal.screen_outbound_rtp[0].bytesSent)/2;
            }else {
              local.screen_outbound_rtp[0].bytesSentPerSecond = 0;
            }
            if((local.screen_outbound_rtp[0].framesEncoded - 0) > 0 && (local.screen_outbound_rtp[0].framesEncoded - 0 - prevLocal.screen_outbound_rtp[0].framesEncoded) > 0) {
              local.screen_outbound_rtp[0].framesEncodedPerSecond = (local.screen_outbound_rtp[0].framesEncoded - 0 - prevLocal.screen_outbound_rtp[0].framesEncoded)/2;
            }else {
              local.screen_outbound_rtp[0].framesEncodedPerSecond = 0;
            }
            if((local.screen_outbound_rtp[0].packetsSent - 0) > 0 && (local.screen_outbound_rtp[0].packetsSent - 0 - prevLocal.screen_outbound_rtp[0].packetsSent) > 0) {
              local.screen_outbound_rtp[0].packetsSentPerSecond = (local.screen_outbound_rtp[0].packetsSent - 0 - prevLocal.screen_outbound_rtp[0].packetsSent)/2;
            }else {
              local.screen_outbound_rtp[0].packetsSentPerSecond = 0;
            }
          }
        }
        for(let item in remote){
          if(item.indexOf('_inbound_rtp') > -1) {
            for(let i = 0; i < remote[item].length; i++){
              if((remote[item][i].bytesReceived - 0) > 0 && (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived) > 0) {
                remote[item][i].bytesReceivedPerSecond = (remote[item][i].bytesReceived - 0 - prevRemote[item][i].bytesReceived)/2;
              }else {
                remote[item][i].bytesReceivedPerSecond = 0;
              }
              if((remote[item][i].packetsLost - 0) > 0 && (remote[item][i].packetsLost - 0 - prevRemote[item][i].packetsLost) > 0) {
                remote[item][i].packetsLostPerSecond = (remote[item][i].packetsLost - 0 - prevRemote[item][i].packetsLost)/2;
              }else {
                remote[item][i].packetsLostPerSecond = 0;
              }
              if((remote[item][i].packetsReceived - 0) > 0 && (remote[item][i].packetsReceived - 0 - prevRemote[item][i].packetsReceived) > 0) {
                remote[item][i].packetsReceivedPerSecond = (remote[item][i].packetsReceived - 0 - prevRemote[item][i].packetsReceived)/2;
              }else {
                remote[item][i].packetsReceivedPerSecond = 0;
              }
              if((remote[item][i].packetsLost/remote[item][i].packetsReceived - 0) > 0 && ((remote[item][i].packetsLost/remote[item][i].packetsReceived - 0 - prevRemote[item][i].packetsLost/prevRemote[item][i].packetsReceived) > 0)) {
                remote[item][i].recvPacketLoss = (remote[item][i].packetsLost/remote[item][i].packetsReceived - 0 - prevRemote[item][i].packetsLost/prevRemote[item][i].packetsReceived)/2;
              }else {
                remote[item][i].recvPacketLoss = 0;
              }
              if(this.prevStats_.remote[item][i].mediaType === 'video' || this.prevStats_.remote[item][i].mediaType ===  'screen') {
                if((remote[item][i].framesDecoded - 0) > 0 && Math.round((remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)) > 0){
                  remote[item][i].framesDecodedPerSecond = Math.round((remote[item][i].framesDecoded - 0 - prevRemote[item][i].framesDecoded)/2);
                }else {
                  remote[item][i].framesDecodedPerSecond = 0;
                }
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