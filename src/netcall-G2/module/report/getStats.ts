/*
 getStats适配器
 */
import { EventEmitter } from "eventemitter3";
import * as bowser from "bowser";
import {AdapterRef, MediaTypeShort} from "../../types";

class GetStats extends EventEmitter{  
  private adapterRef:AdapterRef|null;
  private interval:number;
  private timer:ReturnType<typeof setInterval>|null;
  private times:number;
  private browser:'chrome'|'safari'|'firefox';
  private KeyTransform:{K:{[key:string]:number},T:{[key:string]:number}};
  constructor(options: {adapterRef:AdapterRef, interval: number}) {
    super()
    this.adapterRef = options.adapterRef;
    this.interval = options.interval || 1000
    this.timer = null
    //workaround for TS2564
    this.times = 0;
    this.browser = 'chrome';
    this.KeyTransform = {
      K: { // 单位需要换算为k的字段
        googAvailableSendBandwidth: 1,
        googTargetEncBitrate: 1,
        googActualEncBitrate: 1,
        googRetransmitBitrate: 1,
        googTransmitBitrate: 1
      },
      T: { // 需要换算为S的字段
        //googCaptureStartNtpTimeMs: 1
      }
    }
    this._reset()
  }

  _reset () {
    this.times = 0
    this.timer && clearInterval(this.timer)
    this.timer = null
    this.browser = 'chrome'
    const ua = navigator.userAgent;
    const temp = bowser.getParser(ua);
    if (temp.satisfies({ chrome: '>=72', chromium: '>=72' })) {
      this.browser = 'chrome'
    } else if (temp.satisfies({ safari: '>=12.0' })){
      this.browser = 'safari'
    } else if (temp.satisfies({ firefox: '>60' })){
      this.browser = 'firefox'
    } 
    
    this.KeyTransform = {
      K: { // 单位需要换算为k的字段
        googAvailableSendBandwidth: 1,
        googTargetEncBitrate: 1,
        googActualEncBitrate: 1,
        googRetransmitBitrate: 1,
        googTransmitBitrate: 1
      },
      T: { // 需要换算为S的字段
        //googCaptureStartNtpTimeMs: 1
      }
    }
  }

  start () {
    if(this.timer) return
    this.timer = setInterval(this.getAllStats.bind(this), this.interval)
  }

  async getAllStats () {
    let localPc = this.adapterRef && this.adapterRef._mediasoup && this.adapterRef._mediasoup._sendTransport && this.adapterRef._mediasoup._sendTransport._handler._pc
    let remotePc = this.adapterRef && this.adapterRef._mediasoup && this.adapterRef._mediasoup._recvTransport && this.adapterRef._mediasoup._recvTransport._handler._pc

    if (!localPc && !remotePc) {
      return
    }

    let result = {
      local: localPc ? await this.getLocalStats(localPc) : null,
      remote: remotePc ? await this.getRemoteStats(remotePc): null,
    };

    this.times = (this.times || 0) + 1
    this.emit('stats', result, this.times)
  }

  async getLocalStats (pc:RTCPeerConnection) {
    if (!pc || /(failed|closed|new)/gi.test(pc.iceConnectionState)) {
      return {}
    }
    return await this[this.browser](pc, 'send')
  }

  async getRemoteStats (pc:RTCPeerConnection) {
    if (!pc || /(failed|closed|new)/gi.test(pc.iceConnectionState)) {
      return {}
    }
    return await this[this.browser](pc, 'recv')
  }


  /*
    chrome浏览器getStats适配器
  */
  async chrome (pc:RTCPeerConnection, direction: string) {

    const nonStandardStats = () => {
      return new Promise((resolve, reject) => {
        // 由于Chrome为callback形式的getStats使用了非标准化的接口，故不遵守TypeScript定义
        // @ts-ignore
        pc.getStats(res => {
          let result:{[key:string]:any} = {};
          const results = res.result();
          // @ts-ignore
          results.forEach(function(res) {
            const item:any = {};
            res.names().forEach(function(name:string) {
              item[name] = res.stat(name);
            });
            item.id = res.id;
            item.type = res.type;
            item.timestamp = res.timestamp;
            result[item.id] = item;
          });

          //console.log('!!!原始:', result)
          // @ts-ignore
          pc.lastStats = pc.lastStats || {};
          //针对非标准话的getStats进行格式化处理
          result = this.formatChromeNonStandardStats(pc, result, direction);
          resolve(result)
        });
      });
    }

    const standardizedStats = async () => {
      if(!pc.getTransceivers) return {}

      let result = {};
      const transceivers = pc.getTransceivers()

      for (let i = 0; i < transceivers.length; i++) {
        let getStats = null
        let report = null
        const item = transceivers[i]
        if(item.direction === 'sendonly') {
          if (item.sender && item.sender.getStats) {
            report = await item.sender.getStats()
            report = this.formatChromeStandardizedStats(report, direction)
            Object.assign(result, report)
          }
        } else if(item.direction === 'recvonly') {
          if (item.receiver && item.receiver.getStats) {
            report = await item.receiver.getStats()
            report = this.formatChromeStandardizedStats(report, direction)
            Object.assign(result, report)
          }
        }
      }

      return result;
    }

    const nonStandardResult = await nonStandardStats()
    const standardizedResult = await standardizedStats()
    return Object.assign(nonStandardResult, standardizedResult)
  }

  //转换非标准getStats格式
  async formatChromeNonStandardStats (pc:RTCPeerConnection, stats:{[key:string]:any}, direction:string) {
    const tmp:any = {};
    Object.values(stats).forEach(item => {
      // 过滤googleTrack
      if (direction === "recv" && !(/^ssrc_/i.test(item.id))) {
        return tmp;
      }
      if (direction === "send" && !(/^(bweforvideo|Conn-0-1-0|ssrc_)/i.test(item.id))) {
        return tmp;
      }

      // 普通换算
      if (item.id === 'bweforvideo') {
        item = this.formatData(item);
      }

      const reg =
        direction === "send" ? /ssrc_(\d+)_send/i : /ssrc_(\d+)_recv/i;
      const res = reg.exec(item.id);
      const id = item.id;
      tmp[id] = item;
      if (!res || !res[1]) return tmp;
      const ssrc = res[1]
      if (!this.adapterRef){
        console.error("getStats行为没有client关联")
        return;
      }
      const targetUid = this.adapterRef.instance.getUidAndKindBySsrc(ssrc).uid
      if(!targetUid && direction === 'recv') return tmp;
      const mediaTypeShort:MediaTypeShort = item.googContentType === "screen" ? "screen" : "video";
      item.id = `ssrc_${this.adapterRef.channelInfo.uid}_${direction}_${
        direction === 'recv' ? targetUid : 0
      }_${item.mediaType === "video" ? mediaTypeShort : item.mediaType}`;

      item = this.computeData(pc, item);
      if (item.googInterframeDelayMax == -1) {
        item.googInterframeDelayMax = 0;
      }

      tmp[item.id] = item;
      delete tmp[id];
    });
    return tmp;
  }

  //转换标准getStats格式
  formatChromeStandardizedStats(report:RTCStatsReport, direction:string, uid = 0) {
    let result: { [key:string]:any } = {}
    report.forEach(report => {
      if( report.type == 'inbound-rtp' && this.adapterRef && this.adapterRef.instance) {
        uid = this.adapterRef.instance.getUidAndKindBySsrc(report.ssrc).uid
        return
      }
    })

    //无用的信息
    if(!uid && direction.indexOf('recv') > -1 ) return

    report.forEach(report => {
      if( 
        report.type == 'local-candidate'
        || report.type == 'remote-candidate'
        || report.type == 'track' 
        || report.type == 'outbound-rtp' 
        || report.type == 'remote-inbound-rtp' 
        || report.type == 'candidate-pair' 
        || report.type == 'media-source' 
        || report.type == 'inbound-rtp' 
        || report.type == 'transport' 
        // ||report.type == 'codec'
        ) {
        result[`${report.type}_${this.adapterRef && this.adapterRef.channelInfo.uid}_${direction}_${uid}`] = report
      }
    })
    return result
  }

  
  /*
   safari浏览器getStats适配器
  */
  async safari (pc:RTCPeerConnection, direction:string) {
    const nonStandardStats = async () => {
      const stats = await pc.getStats()
      //@ts-ignore
      pc.lastStats = pc.lastStats || {};
      const result = this.formatSafariNonStandardStats(pc, stats, direction);
      return result
    }

    const standardizedStats = async () => {
      if(!pc.getTransceivers) return {}

      let result = {};
      const transceivers = pc.getTransceivers()

      for (let i = 0; i < transceivers.length; i++) {
        let getStats = null
        let stats = null
        const item = transceivers[i]
        if(item.direction === 'sendonly') {
          if (item.sender && item.sender.getStats) {
            stats = await item.sender.getStats()
            if (stats) {
              stats = this.formatSafariStandardizedStats(stats, direction) || {}
              Object.assign(result, stats)
            }
          }
        } else if(item.direction === 'recvonly') {
          if (item.receiver && item.receiver.getStats) {
            stats = await item.receiver.getStats()
            if (stats) {
              stats = this.formatSafariStandardizedStats(stats, direction) || {}
              Object.assign(result, stats)
            }
          }
        }
      }

      return result;
    }

    const nonStandardResult = await nonStandardStats()
    //当前Safari标准实现的getStats和非标准的一致，先忽略
    //const standardizedResult = await standardizedStats()
    //return Object.assign(nonStandardResult, standardizedResult)
    return nonStandardResult
  }

  formatSafariNonStandardStats (pc:RTCPeerConnection, stats:{[key:string]:any}, direction:string) {
    let result:{[key:string]:any} = {}
    let ssrc = 0
    let uid = 0
    stats.forEach((item:any) => {
      if( item.type == 'outbound-rtp' || item.type == 'inbound-rtp' ) {
        uid = this.adapterRef ? this.adapterRef.instance.getUidAndKindBySsrc(item.ssrc).uid: uid
        ssrc = item.ssrc
        return
      }
    })

    stats.forEach((item:any)=>{
      if (item.type == 'track') {
        if(item.framesSent || item.framesReceived) {
          item.ssrc = ssrc
          item = this.computeData(pc, item)
          result[`video_${item.type}_${this.adapterRef && this.adapterRef.channelInfo.uid}_${direction}_${uid}`] = item
        } else {
          result[`audio_${item.type}_${this.adapterRef && this.adapterRef.channelInfo.uid}_${direction}_${uid}`] = item
        }
      } else if (item.type == 'outbound-rtp' || item.type == 'inbound-rtp') {
        item = this.computeData(pc, item)
        result[`${item.mediaType}_${item.type}_${this.adapterRef && this.adapterRef.channelInfo.uid}_${direction}_${uid}`] = item
      }
    })
    return result;
  }


  formatSafariStandardizedStats (report:any, direction:string) {
    let result:{[key:string]:any} = {}
    let uid = 0;
    report.forEach((report:any) => {
      if( report.type == 'inbound-rtp') {
        uid = this.adapterRef ? this.adapterRef.instance.getUidAndKindBySsrc(report.ssrc).uid: uid;
      }
    })

    report.forEach((report:any) => {
      if( 
        report.type == 'local-candidate'
        || report.type == 'remote-candidate'
        || report.type == 'track' 
        || report.type == 'outbound-rtp' 
        || report.type == 'remote-inbound-rtp' 
        || report.type == 'candidate-pair' 
        || report.type == 'media-source' 
        || report.type == 'inbound-rtp' 
        || report.type == 'transport' 
        // ||report.type == 'codec'
        ) {
        result[`${report.type}_${this.adapterRef && this.adapterRef.channelInfo.uid}_${direction}_${uid}`] = report
      }
    })
    return result
  }

  async firefox (pc:RTCPeerConnection) {

  }

  // 普通换算
  formatData(data:any) {
    Object.keys(data).map(key => {
      // 换算为K
      if (this.KeyTransform.K[key]) {
        data[key] = (data[key] / 1024).toFixed(2);
        //console.log(`KeyTransform.K ${key}`, data[key])
      }
      // 换算为T
      if (this.KeyTransform.T[key]) {
        data[key] = (data[key] / 1024 / 1024).toFixed(2);
        //console.log(`KeyTransform.T ${key}`, data[key])
      }
    });
    return data;
  }

  // 计算一些数据，码率、每秒中发送、接收包数、丢包率
  computeData(pc:RTCPeerConnection, item:any) {
    const param = {
      pc,
      ssrcKey: item.ssrc,
      currentItem: item
    };
    // 进行数据计算
    if (item.bytesSent) {
      item["bitsSentPerSecond"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "bytesSent" })
      );
    }

    if (item.packetsSent) {
      item["packetsSentPerSecond"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "packetsSent" })
      );
    }

    if (item.bytesReceived) {
      item["bitsReceivedPerSecond"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "bytesReceived" })
      );
    }

    if (item.packetsReceived) {
      item["packetsReceivedPerSecond"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "packetsReceived" })
      );
    }

    if (item.packetsSent && item.packetsLost) {
      item["sendPacketLoss"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "packetsSent", secondKey: "packetsLost" })
      );
    }

    if (item.packetsReceived && item.packetsLost) {
      item["recvPacketLoss"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "packetsReceived", secondKey: "packetsLost" })
      );
    }

    if (item.framesSent) {
      item["frameRateSent"] = this.getLastStats(
        Object.assign({}, param, { firstKey: "framesSent" })
      );
    }

    return item;
  }

  // 码率、丢包率的具体计算
  getLastStats(option:any = {}) {
    const { pc, ssrcKey, firstKey, secondKey = null, currentItem } = option;
    //console.log('getLastStats ssrcKey: ', ssrcKey)
    let firstGap = 0;
    let secondGap = 0;
    if (!pc.lastStats[ssrcKey] || !pc.lastStats[ssrcKey][firstKey]) {
      if (!pc.lastStats[ssrcKey]) {
        pc.lastStats[ssrcKey] = {};
      }
      firstGap = currentItem[firstKey];
      secondKey ? secondGap = currentItem[secondKey] : null
    } else if (currentItem[firstKey] - pc.lastStats[ssrcKey][firstKey] > 0) {
      firstGap = currentItem[firstKey] - pc.lastStats[ssrcKey][firstKey];
      secondKey ? secondGap = currentItem[secondKey] - pc.lastStats[ssrcKey][secondKey] : null
    } else {
      return firstGap
    } 

    if (/bytes/gi.test(firstKey)) {
      //当前的检测周期是1s
      firstGap = Math.round(firstGap * 8 /1000) 
    } else if (secondKey) {
      if (firstKey.indexOf('send') > -1) {
        firstGap = Math.floor(secondGap / firstGap * 10000)/100;
      } else {
        firstGap = (secondGap / ( secondGap + secondGap) * 10000)/100;
      }
    } else {
      firstGap = firstGap
    }

    // 设置上一次的值
    pc.lastStats[ssrcKey][firstKey] = currentItem[firstKey];
    secondKey ? pc.lastStats[ssrcKey][secondKey] = currentItem[secondKey] : null;
    return firstGap;
  }

  stop() {
    this._reset()
  }

  destroy () {
    this._reset()
  }
}

export {
  GetStats
}