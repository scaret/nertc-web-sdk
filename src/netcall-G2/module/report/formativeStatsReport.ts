import {
  AdapterRef,
  FormativeStatsReportOptions,
  PacketLostData,
  DownVideoItem,
  DownAudioItem,
  UpVideoItem,
  UpAudioItem,
  AudioRtxInfo,
  VideoRtxInfo,
} from "../../types"
import {
  DataReport,
} from "./dataReport";
import {platform} from "../../util/platform";
import RtcError from '../../util/error/rtcError';
import ErrorCode  from '../../util/error/errorCode';
import * as env from '../../util/rtcUtil/rtcEnvironment';

let url = 'https://statistic.live.126.net/statistic/realtime/sdkinfo'
type UIDTYPE = number | string;
/**
 *  @param {Object} options 配置参数
 */
class FormativeStatsReport {
  private adapterRef:AdapterRef;
  private webrtcStats: string[];
  private publicIP: string;
  public LocalAudioEnable: boolean;
  public localVideoEnable: boolean;
  public localScreenEnable: boolean;
  private _audioLevel: {uid:number|string, level: number}[];
  private infos: {
    cid?: number;
    uid?: number|string;
    ver?: number;
    device?: number;
    isp?: number;
    net?: string;
    platform?: string;
    browser?: string;
    sdk_ver?: string;
    appkey?: string;
    interval: number;
    samples?: number;
    time?: number;
    qos_algorithm?: number;
    fec_algorithm?: number;
    qos_scene?: number;
    qos_strategy?: number;
  };
  private infos2: {[key: string]: any};
  private paramSecond: {
    upAudioCache: any,
    upVideoCache: any,
    upScreenCache: any,
    downAudioCache: any,
    downVideoCache: any,
    downScreenCache: any,
  };
  public firstData: {
    recvFirstData: {[uid in UIDTYPE]: {
      recvFirstAudioFrame: boolean;
      recvFirstVideoFrame: boolean;
      recvFirstScreenFrame: boolean;
      recvFirstAudioPackage: boolean;
      recvFirstVideoPackage: boolean;
      recvFirstScreenPackage: boolean;
      videoTotalPlayDuration: number;
      screenTotalPlayDuration: number;
    }}
    sendFirstAudioPackage: boolean;
    sendFirstVideoPackage: boolean;
    sendFirstScreenPackage: boolean;
  }
  private network: string;
  
  constructor (options : FormativeStatsReportOptions) {
    this._reset()
    this.adapterRef = options.adapterRef
    this.webrtcStats = []
    this.publicIP = ''
    this._audioLevel = [];
    // to pass typescript initializer check
    this.infos = {
      interval: 0,
    };
    this.infos2 = {};
    this.paramSecond = {
      upAudioCache: {},
      upVideoCache: {},
      upScreenCache: {},
      downAudioCache: {},
      downVideoCache: {},
      downScreenCache: {},
    };
    this.firstData = {
      recvFirstData: {},
      sendFirstAudioPackage: false,
      sendFirstVideoPackage: false,
      sendFirstScreenPackage: false,
    };
    this.network = "";
    this.LocalAudioEnable = false;
    this.localVideoEnable = false;
    this.localScreenEnable = false;
    this.init(this.adapterRef.channelInfo.appkey)
    this.resetStatus()
  }

  _reset () {
    this._audioLevel = []
    this.infos = {interval: 0}
  }

  init (appkey: string) {
    // 版本号，暂时写死1
    this.infos = {
      ver: 2,
      device: -1,
      isp: -1,
      platform:
        tool.convertPlatform(platform.os.family) + '-' + platform.os.version + '- webrtc',
      browser: platform.name + '-' + platform.version,
      sdk_ver: '3.6.0',
      appkey: appkey,
      // 上报时间间隔
      interval: 60,
      // 采样点数
      samples: 30,
      // 发送的时候再加时间戳
      time: Date.now(),
      // QoS算法选择 1：老的，2：新开发的。通过json字段拿到，设置到网络层，用于灰度上线
      qos_algorithm: -1,
      // FEC算法选择 1：老的，2：新开发的。通过json字段拿到，设置到网络层，用于灰度上线
      fec_algorithm: -1,
      // QoS场景，例如：桌面白板、运动camera、静止camera，具体场景待定
      qos_scene: -1,
      // QoS策略模式，例如：流畅优先、清晰优先
      qos_strategy: -1
    };
    return this.infos;
  }

  resetStatus () {
    this.infos = Object.assign(this.infos, {
      uid: null,
      cid: null,
      push_url: null,
      turn_ip: null,
      proxy_ip: null,
      meeting: false,
      live: false
    })
    this.firstData = {
      recvFirstData: {},
      sendFirstAudioPackage: false,
      sendFirstVideoPackage: false,
      sendFirstScreenPackage: false,
    }
    if (this._audioLevel) {
      this._audioLevel.length = 0
    }
    this.clearInfoData()
  }

  // 开启上报时初始化一些固定值
  initInfoData (uid?: number|string) {
    let tmp = {
      uid,
      cid: (this.adapterRef.channelInfo.cid) || 0,
      push_url: '',
      turn_ip: (this.adapterRef && this.adapterRef.channelInfo.wssArr && this.adapterRef.channelInfo.wssArr[0]) || '',
      proxy_ip: (this.adapterRef && this.adapterRef.channelInfo.wssArr && this.adapterRef.channelInfo.wssArr[0]) || '',
      meeting: true,
      live: (this.adapterRef.channelInfo && this.adapterRef.channelInfo.sessionConfig.liveEnable) || false,
      // 通话状态: 直连、中转
      p2p: false,
      // 注册网络运营商: 46001 中国联通
      isp: -1,
      // 网络类型: 2g、3g、4g、wifi等
      net: -1,
      // 频道加入状态码
      connect_state: 200,
      // 信令通信时长: 调用加入频道 -> IM信令成功加入后计算时差
      signalling_time:
        ((this.adapterRef.channelInfo && this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime) || 0) -
        ((this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startJoinTime) || 0),
      // 频道加入时长: 收到IM信令 -> 网络层登录成功后计算时差
      connect_time:
        ((this.adapterRef.channelInfo && this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.joinedSuccessedTime) || 0) -
        ((this.adapterRef.channelInfo && this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime) || 0)
    }
    this.infos = Object.assign(this.infos, tmp)
  }

  // 数据上报一次，清空一次
  clearInfoData () {
    this.infos2 = {
      rx2:[],
      tx2:[{
        v_fps: [], // 视频发送帧率
        v_res: [], // 客户端发送图像分辨率-宽度、高度wxh  e.g."640x480"
        v_plis: [], // plisReceived
        v_rtt: [], // 延迟
        v_simulcast: [], //多流
        v_bw_kbps:[], //视频发送评估带宽
        v_tar_kbps:[], //视频发送目标码率 
        v_rel_kbps:[], //视频实际发送码率 

        v_tx_kbps:[], //transmitBitrate 
        v_retx_kbps:[], //retransmitBitrate 
        v_delay:[], //bucketDelay 
        
        //辅流
        s_fps: [], // 视频发送帧率
        s_res: [], // 客户端发送图像分辨率-宽度、高度wxh  e.g."640x480"
        s_plis: [], // plisReceived
        s_rtt: [], // 延迟
        s_simulcast: [], //多流
        s_bw_kbps:[], //视频发送评估带宽
        s_tar_kbps:[], //视频发送目标码率 
        s_rel_kbps:[], //视频实际发送码率

        s_tx_kbps:[], //transmitBitrate 
        s_retx_kbps:[], //retransmitBitrate 
        s_delay:[], //bucketDelay 
        
        a_cap_volume: [], // 客户端采集的声音声量，int16
        a_rtt: [] //音频时延
      }],
      sys: {
        cpu_total: [], //cpu使用百分比
        cpu_idle: [], //cpu闲置百分比  
        mem_total: [], //内存总量 
        mem_workingSet: [], //内存使用量 
        mem_load: [] //内存使用百分比 
      }
    }
  }

  start () {

    this.infos.appkey = this.adapterRef.channelInfo.appkey

    this.infos.cid = this.adapterRef.channelInfo.cid
    this.infos.uid = this.adapterRef.channelInfo.uid
    // 需要每秒计算的值
    this.clearSecond()
    this.initInfoData(this.infos.uid)
  }

  stop () {
    this.send()
    this.resetStatus()
  }

  // 需要每秒计算的值
  clearSecond () {
    this.paramSecond = {
      upAudioCache: {},
      upVideoCache: {},
      upScreenCache: {},
      downAudioCache: {},
      downVideoCache: {},
      downScreenCache: {},
    }
  }

  getPacketLossRate(prev:PacketLostData, next:PacketLostData, isSend=false) {
    if (!prev || !next) {
      return 0
    }
    let prevLost = parseInt(prev.packetsLost) || 0
    let nextLost = parseInt(next.packetsLost) || 0
    if (nextLost <= prevLost) {
      return 0
    }
    let prevPacket = isSend ? prev.packetsSent : prev.packetsReceived
    let nextPacket = isSend ? next.packetsSent : next.packetsReceived
    let prevRecv = parseInt(prevPacket || "") || 0
    let nextRecv = parseInt(nextPacket || "") || 0
    if (nextRecv <= prevRecv) {
      return 0
    }
    let lostRate = isSend ? parseFloat(((nextLost - prevLost) / (nextRecv - prevRecv) * 100).toFixed(1)) : parseFloat(((nextLost - prevLost) / ((nextLost - prevLost) + (nextRecv - prevRecv)) * 100).toFixed(1))
    return lostRate
  }

  // sdk数据上报更新
  update (data:any, time: number) {
    data = Object.assign({}, data.local, data.remote)
    let upAudioList = []
    let upVideoList = []
    let upScreenList = []
    let downAudioList = []
    let downVideoList = []
    let downScreenList = []
    if (this.webrtcStats.length == 2) {
      this.webrtcStats.shift()
    }
    this.webrtcStats.push(data)
    let currentData = {
      send: {
        uid: 0,
        audio: {
          prevLost: 0,
          nextLost: 0,
          prevPacket: 0,
          nextPacket: 0,
          rtt: 0,
          jitter: 0
        }, 
        video: {
          prevLost: 0,
          nextLost: 0,
          prevPacket: 0,
          nextPacket: 0,
          rtt: 0,
          jitter: 0
        },
        screen: {
          prevLost: 0,
          nextLost: 0,
          prevPacket: 0,
          nextPacket: 0,
          rtt: 0,
          jitter: 0
        }
      },
      recv: {
        uid: 0,
        audio: {
          prevLost: 0,
          nextLost: 0,
          prevPacket: 0,
          nextPacket: 0,
          rtt: 0,
          jitter: 0
        }, 
        video: {
          prevLost: 0,
          nextLost: 0,
          prevPacket: 0,
          nextPacket: 0,
          rtt: 0,
          jitter: 0
        },
        screen: {
          prevLost: 0,
          nextLost: 0,
          prevPacket: 0,
          nextPacket: 0,
          rtt: 0,
          jitter: 0
        }
      }
    }

    let bytesReceived = 0, bytesSent = 0
    if (this._audioLevel) {
      this._audioLevel.length = 0
    }
    for (let i in data) {
      //let uid = parseInt(i.split('_')[3] || "");
      let uid;
      if(env.IS_SAFARI){
        uid = i.split('_')[5] || ""
      }else {
        uid = i.split('_')[3] || ""
      }
      
      if (uid === '0'){
        // send
        //uid = parseInt(i.split('_')[1] || "");
        uid = i.split('_')[1] || ""
      }
      /*if (!(uid - 0)){
        uid = 0;
      }*/
      if (i.indexOf('_send_') !== -1 && i.indexOf('_audio') !== -1) {
        if (!this.firstData.sendFirstAudioPackage && data[i].packetsSent > 0) {
          this.firstData.sendFirstAudioPackage = true
          this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
            media_type: 0
          })
        }
        if (this.paramSecond.upAudioCache[uid]) {
          currentData.send.audio.prevLost = this.paramSecond.upAudioCache[uid].packetsLost
          currentData.send.audio.prevPacket = this.paramSecond.upAudioCache[uid].packetsSent
          data[i].alr = this.getPacketLossRate(this.paramSecond.upAudioCache[uid], data[i], true)
          this.dispatchExceptionEventSendAudio(this.paramSecond.upAudioCache[uid], data[i], uid)
        } 
        bytesSent += parseInt(data[i].bytesSent) 
        this.paramSecond.upAudioCache[uid] = data[i]
        currentData.send.uid = this.adapterRef.channelInfo.uid
        currentData.send.audio.nextLost = data[i].packetsLost
        currentData.send.audio.nextPacket = data[i].packetsSent
        currentData.send.audio.rtt = currentData.recv.audio.rtt = data[i].googRtt
        currentData.send.audio.jitter = currentData.recv.audio.jitter = data[i].googJitterReceived || 0
        upAudioList.push(data[i])
      } else if (i.indexOf('_send_') !== -1 && i.indexOf('_video') !== -1) {
        if (!this.firstData.sendFirstVideoPackage && data[i].packetsSent > 0) {
          this.firstData.sendFirstVideoPackage = true
          this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
            media_type: 1
          })
        }
        if (this.paramSecond.upVideoCache[uid]) {
          currentData.send.video.prevLost = this.paramSecond.upVideoCache[uid].packetsLost
          currentData.send.video.prevPacket = this.paramSecond.upVideoCache[uid].packetsSent
          data[i].vlr = this.getPacketLossRate(this.paramSecond.upVideoCache[uid], data[i], true)
          this.dispatchExceptionEventSendVideo(this.paramSecond.upVideoCache[uid], data[i], uid)
        } 

        let stats = this.getLocalVideoFreezeStats(data[i], uid)
        data[i].freezeTime = stats.freezeTime
        data[i].totalFreezeTime = stats.totalFreezeTime

        Object.assign(data[i], data['bweforvideo']) //FIXME 多条视频流时BWE是针对所有视频的。
        bytesSent += parseInt(data[i].bytesSent) 
        this.paramSecond.upVideoCache[uid] = data[i]
        currentData.send.uid = this.adapterRef.channelInfo.uid
        currentData.send.video.nextLost = data[i].packetsLost
        currentData.send.video.nextPacket = data[i].packetsSent
        currentData.send.video.rtt = currentData.recv.video.rtt = data[i].googRtt
        currentData.send.video.jitter = currentData.recv.video.jitter = data[i].googJitterReceived || 0
        upVideoList.push(data[i])
      } else if (i.indexOf('_send_') !== -1 && i.indexOf('_screen') !== -1) {
        if (!this.firstData.sendFirstScreenPackage && data[i].packetsSent > 0) {
          this.firstData.sendFirstScreenPackage = true
          this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
            media_type: 2
          })
        }
        if (this.paramSecond.upScreenCache[uid]) {
          currentData.send.screen.prevLost = this.paramSecond.upScreenCache[uid].packetsLost
          currentData.send.screen.prevPacket = this.paramSecond.upScreenCache[uid].packetsSent
          data[i].vlr = this.getPacketLossRate(this.paramSecond.upScreenCache[uid], data[i], true)
          // this.dispatchExceptionEventSendScreen(this.paramSecond.upScreenCache[uid], data[i], uid)
        }

        let stats = this.getLocalScreenFreezeStats(data[i], uid)
        data[i].freezeTime = stats.freezeTime
        data[i].totalFreezeTime = stats.totalFreezeTime

        Object.assign(data[i], data['bweforvideo']) //FIXME 多条视频流时BWE是针对所有视频的。
        bytesSent += parseInt(data[i].bytesSent)
        this.paramSecond.upScreenCache[uid] = data[i]
        currentData.send.uid = this.adapterRef.channelInfo.uid
        currentData.send.screen.nextLost = data[i].packetsLost
        currentData.send.screen.nextPacket = data[i].packetsSent
        currentData.send.screen.rtt = currentData.recv.screen.rtt = data[i].googRtt
        currentData.send.screen.jitter = currentData.recv.screen.jitter = data[i].googJitterReceived || 0
        upScreenList.push(data[i])
      } else if (i.indexOf('_recv_') !== -1 && i.indexOf('_audio') !== -1) {
        if (!this.firstData.recvFirstData[uid]) {
          this.firstData.recvFirstData[uid] = {
            recvFirstAudioFrame: false,
            recvFirstVideoFrame: false,
            recvFirstScreenFrame: false,
            recvFirstAudioPackage: false,
            recvFirstVideoPackage: false,
            recvFirstScreenPackage: false,
            videoTotalPlayDuration: 0,
            screenTotalPlayDuration: 0,
          }
        }
        if (!this.firstData.recvFirstData[uid].recvFirstAudioFrame && parseInt(data[i].googDecodingNormal) > 0) {
          this.firstData.recvFirstData[uid].recvFirstAudioFrame = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 0,
            pull_uid: uid
          })
        }

        if (!this.firstData.recvFirstData[uid].recvFirstAudioPackage && parseInt(data[i].packetsReceived) > 0) {
          this.firstData.recvFirstData[uid].recvFirstAudioPackage = true
          this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
            media_type: 0,
            pull_uid: uid
          })
        }

        if (this.paramSecond.downAudioCache[uid]) {
          currentData.recv.audio.prevLost = this.paramSecond.downAudioCache[uid].packetsLost
          currentData.recv.audio.prevPacket = this.paramSecond.downAudioCache[uid].packetsReceived
          data[i].alr = this.getPacketLossRate(this.paramSecond.downAudioCache[uid], data[i])
        }
        let stats = this.getRemoteAudioFreezeStats(this.paramSecond.downAudioCache[uid], data[i], uid)
        data[i].freezeTime = stats.freezeTime
        data[i].totalFreezeTime = stats.totalFreezeTime
        bytesReceived += parseInt(data[i].bytesReceived) 
        this.dispatchExceptionEventRecvAudio(this.paramSecond.downAudioCache[uid], data[i], uid)
        this.paramSecond.downAudioCache[uid] = data[i]
        currentData.recv.uid = +uid
        currentData.recv.audio.nextLost = data[i].packetsLost
        currentData.recv.audio.nextPacket = data[i].packetsReceived
        downAudioList.push(data[i])
        let audioLevel:number = 0;
        if (data[i].audioOutputLevel >= 0){
          // Chrome， 0-32767
          audioLevel = data[i].audioOutputLevel;
        }else if (data[i].audioLevel >= 0){
          // Safari， 0-1，正好与Chrome呈线性关系
          audioLevel = Math.floor(data[i].audioLevel * 32768);
        }
        this._audioLevel.push({
          uid,
          level: +audioLevel || 0,
        })
      } else if (i.indexOf('_recv_') !== -1 && i.indexOf('_video') !== -1) {
        //主流
        if (!this.firstData.recvFirstData[uid]) {
          this.firstData.recvFirstData[uid] = {
            recvFirstAudioFrame: false,
            recvFirstVideoFrame: false,
            recvFirstScreenFrame: false,
            recvFirstAudioPackage: false,
            recvFirstVideoPackage: false,
            recvFirstScreenPackage: false,
            videoTotalPlayDuration: 0,
            screenTotalPlayDuration: 0,
          }
        }
        if (!this.firstData.recvFirstData[uid].recvFirstVideoFrame && data[i].framesDecoded > 0) {
          this.firstData.recvFirstData[uid].recvFirstVideoFrame = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 1,
            pull_uid: uid
          })
        } else if (data[i].framesDecoded > 0) {
          this.firstData.recvFirstData[uid].videoTotalPlayDuration++
        }

        if (!this.firstData.recvFirstData[uid].recvFirstVideoPackage && data[i].packetsReceived > 0) {
          this.firstData.recvFirstData[uid].recvFirstVideoPackage = true
          this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
            media_type: 1,
            pull_uid: uid
          })
        }

        if (this.paramSecond.downVideoCache[uid]) {
          currentData.recv.video.prevLost = this.paramSecond.downVideoCache[uid].packetsLost
          currentData.recv.video.prevPacket = this.paramSecond.downVideoCache[uid].packetsReceived
          data[i].vlr = this.getPacketLossRate(this.paramSecond.downVideoCache[uid], data[i])
        } 
        let stats = this.getRemoteVideoFreezeStats(this.paramSecond.downVideoCache[uid], data[i], uid)
        data[i].freezeTime = stats.freezeTime
        data[i].totalFreezeTime = stats.totalFreezeTime
        this.dispatchExceptionEventRecvVideo(this.paramSecond.downVideoCache[uid], data[i], uid)
        bytesReceived += parseInt(data[i].bytesReceived)
        this.paramSecond.downVideoCache[uid] = data[i]
        currentData.recv.uid = +uid
        currentData.recv.video.nextLost = data[i].packetsLost
        currentData.recv.video.nextPacket = data[i].packetsReceived
        downVideoList.push(data[i])
      } else if (i.indexOf('_recv_') !== -1 && i.indexOf('_screen') !== -1) {
        //辅流
        if (!this.firstData.recvFirstData[uid]) {
          this.firstData.recvFirstData[uid] = {
            recvFirstAudioFrame: false,
            recvFirstVideoFrame: false,
            recvFirstScreenFrame: false,
            recvFirstAudioPackage: false,
            recvFirstVideoPackage: false,
            recvFirstScreenPackage: false,
            videoTotalPlayDuration: 0,
            screenTotalPlayDuration: 0,
          }
        }
        if (!this.firstData.recvFirstData[uid].recvFirstScreenFrame && data[i].framesDecoded > 0) {
          this.firstData.recvFirstData[uid].recvFirstScreenFrame = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 2,
            pull_uid: uid
          })
        } else if (data[i].framesDecoded > 0) {
          this.firstData.recvFirstData[uid].screenTotalPlayDuration++
        }

        if (!this.firstData.recvFirstData[uid].recvFirstScreenPackage && data[i].packetsReceived > 0) {
          this.firstData.recvFirstData[uid].recvFirstScreenPackage = true
          this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
            media_type: 2,
            pull_uid: uid
          })
        }

        if (this.paramSecond.downScreenCache[uid]) {
          currentData.recv.screen.prevLost = this.paramSecond.downScreenCache[uid].packetsLost
          currentData.recv.screen.prevPacket = this.paramSecond.downScreenCache[uid].packetsReceived
          data[i].vlr = this.getPacketLossRate(this.paramSecond.downScreenCache[uid], data[i])
        }
        let stats = this.getRemoteScreenFreezeStats(this.paramSecond.downScreenCache[uid], data[i], uid)
        data[i].freezeTime = stats.freezeTime
        data[i].totalFreezeTime = stats.totalFreezeTime
        this.dispatchExceptionEventRecvScreen(this.paramSecond.downScreenCache[uid], data[i], uid)
        bytesReceived += parseInt(data[i].bytesReceived)
        this.paramSecond.downScreenCache[uid] = data[i]
        currentData.recv.uid = +uid
        currentData.recv.screen.nextLost = data[i].packetsLost
        currentData.recv.screen.nextPacket = data[i].packetsReceived
        downScreenList.push(data[i])
      }else if (i.indexOf('Conn-') !== -1) {
        this.publicIP = data[i] && data[i].googLocalAddress.match(/([0-9\.]+)/)[1]
        let rtt = data[i].googRtt == '0' ? '1' : data[i].googRtt 
        this.adapterRef.transportStats.txRtt = rtt
        this.adapterRef.transportStats.rxRtt = rtt
      } else if(i.indexOf('local-candidate') !== -1){
        if (data[i].networkType) {
          this.adapterRef.transportStats.NetworkType = data[i].networkType
        }
      } else if(i.indexOf('candidate-pair') !== -1 && i.indexOf('send') !== -1) {
        let suid = i.split('_')[1]
        if(suid == this.adapterRef.channelInfo.uid) {
          this.adapterRef.transportStats.OutgoingAvailableBandwidth = data[i].availableOutgoingBitrate  / 1000
        }
      } else {
        this.network = data[i] && data[i].network
      }
    }
    this.adapterRef.sessionStats.RecvBytes = bytesReceived
    this.adapterRef.sessionStats.SendBytes = bytesSent
    if (time === 1) {
      return
    }

    this._audioLevel.sort(tool.compare('level'))
    if (this._audioLevel.length > 0 && this._audioLevel[0].level > 0) {
      this.adapterRef.instance.emit('active-speaker', this._audioLevel[0])
    } 
    
    if (time % 2 === 0) {
      this.adapterRef.instance.emit('volume-indicator', this._audioLevel)
      // 更新上行信息
      this.updateTxMediaInfo(upAudioList, upVideoList, upScreenList);
      // 更新下行信息
      this.updateRxMediaInfo(downAudioList, downVideoList, downScreenList)
      let length = this.infos2.tx2 && this.infos2.tx2[0].v_res.length
      if ( length === this.infos.interval / 2) {
        this.send()
      }
    }
  }

  // 一次数据上报更新, 用于通话失败的情况
  updateOnce () {
    this.initInfoData()
    this.send()
  }

  // 组装下行的媒体信息
  updateRxMediaInfo (downAudioList: DownAudioItem[], downVideoList: DownVideoItem[], downScreenList: DownVideoItem[]) {
    let audio2:AudioRtxInfo = {
      uid: [],
      a_p_volume: [],
      a_d_nor: [],
      a_d_plc: [],
      a_d_plccng: [],
      a_stuck: [],
      a_bps: [],
      a_p_lost_r: [],
      a_delay: [],
      a_acc_r: []
    }

    let video2:VideoRtxInfo = {
      v_res: [],
      v_fps: [],
      v_plis: [],
      v_stuck: [],
      v_bw_kbps: [],
      v_bps: [],
      v_p_lost_r: [],
      v_dec_ms: [],
      v_delay: []
    }
    
    let screen2:VideoRtxInfo = {
      v_res: [],
      v_fps: [],
      v_plis: [],
      v_stuck: [],
      v_bw_kbps: [],
      v_bps: [],
      v_p_lost_r: [],
      v_dec_ms: [],
      v_delay: []
    }

    let RecvBitrate = 0

    downAudioList.map(item => {
      let uid='0';
      if (item.id) {
        uid = item.id.split('_')[3]
      }

      if (this.adapterRef.remoteAudioStats[uid]) {
        this.adapterRef.remoteAudioStats[uid] = {TotalFreezeTime: 0}
      }
      const remoteStream = this.adapterRef.remoteStreamMap[uid]
      this.adapterRef.remoteAudioStats[uid] = {
        CodecType: 'Opus',
        End2EndDelay: (parseInt(item.googCurrentDelayMs) || 0) + (parseInt(item.googJitterBufferMs) || 0),
        MuteState: (remoteStream && (remoteStream.muteStatus.audioSend || remoteStream.muteStatus.audioRecv)), //(remoteStream && remoteStream.audio) || (remoteStream && remoteStream.muteStatus.audio), 
        PacketLossRate: item.alr || 0,
        RecvBitrate: item.bitsReceivedPerSecond || 0,
        RecvLevel: parseInt(item.audioOutputLevel) || +item.audioLevel || 0,
        TotalFreezeTime: item.totalFreezeTime || 0,
        TotalPlayDuration: parseInt(item.totalSamplesDuration) || 0,
        TransportDelay: parseInt(item.googCurrentDelayMs) || 0
      }

      RecvBitrate = RecvBitrate + item.bitsReceivedPerSecond
      audio2.uid.push(uid)
      audio2.a_p_volume.push(+(item.audioOutputLevel || item.audioLevel) || 0)
      audio2.a_d_nor.push(parseInt(item.googDecodingNormal) || 0)
      audio2.a_d_plc.push(parseInt(item.googDecodingPLC) || 0)
      audio2.a_d_plccng.push(parseInt(item.googDecodingPLCCNG) || 0)
      audio2.a_stuck.push(item.freezeTime || 0) //音频stuck Duration
      audio2.a_bps.push(item.bitsReceivedPerSecond || 0)
      audio2.a_p_lost_r.push(item.alr || 0)
      audio2.a_delay.push(parseInt(item.googJitterBufferMs) || 0)
      audio2.a_acc_r.push(0) //音画同步率  
    })
    
    downVideoList.map(item => {
      // 格式： ssrc_359_recv_970_video
      let uid:number|string = '0';
      if (item.id) {
        uid = item.id.split('_')[3]
      }

      const remoteStream = this.adapterRef.remoteStreamMap[uid]
      if (this.adapterRef.remoteVideoStats[uid]) {
        this.adapterRef.remoteVideoStats[uid] = {TotalFreezeTime: 0};
      }

      const videoDom = remoteStream && remoteStream.Play && remoteStream.Play.videoDom
      this.adapterRef.remoteVideoStats[uid] = {
        LayerType: 1,
        CodecName: item.googCodecName,
        End2EndDelay: (parseInt(item.googCurrentDelayMs) || 0) + (parseInt(item.googJitterBufferMs) || 0) + (parseInt(item.googRenderDelayMs) || 0),
        MuteState: (remoteStream && (remoteStream.muteStatus.videoSend || remoteStream.muteStatus.videoRecv)), //(remoteStream && remoteStream.video) || (remoteStream && remoteStream.muteStatus.video),
        PacketLossRate: item.vlr || 0,
        RecvBitrate: item.bitsReceivedPerSecond || 0,
        RecvResolutionHeight: parseInt(item.googFrameHeightReceived) || 0,
        RecvResolutionWidth: parseInt(item.googFrameWidthReceived) || 0,
        RenderFrameRate: parseInt(item.googFrameRateOutput) || 0,
        RenderResolutionHeight: videoDom ? videoDom.videoHeight : 0,
        RenderResolutionWidth: videoDom ? videoDom.videoWidth : 0,
        TotalFreezeTime: item.totalFreezeTime || 0,
        TotalPlayDuration: (this.firstData.recvFirstData[uid] && this.firstData.recvFirstData[uid].videoTotalPlayDuration) || (videoDom && videoDom.played && videoDom.played.length ? videoDom.played.end(0) : 0),
        TransportDelay: parseInt(item.googCurrentDelayMs) || 0
      }

      RecvBitrate = RecvBitrate + item.bitsReceivedPerSecond
      video2.v_res.push((item.googFrameWidthReceived || 0) + 'x' + (item.googFrameHeightReceived || 0))
      video2.v_fps.push(parseInt(item.googFrameRateOutput))
      video2.v_plis.push(parseInt(item.googPlisSent))
      video2.v_stuck.push(item.freezeTime || 0)
      video2.v_bw_kbps.push(0)
      video2.v_bps.push(item.bitsReceivedPerSecond || 0)
      video2.v_p_lost_r.push(item.vlr || 0)
      video2.v_dec_ms.push(parseInt(item.googDecodeMs) || 0)
      video2.v_delay.push(parseInt(item.googJitterBufferMs))
    })

    //辅流-复制
    downScreenList.map(item => {
      // 格式： ssrc_359_recv_970_screen
      let uid = 0;
      if (item.id) {
        uid = +item.id.split('_')[3]
      }

      const remoteStream = this.adapterRef.remoteStreamMap[uid]
      if (this.adapterRef.remoteScreenStats[uid]) {
        this.adapterRef.remoteScreenStats[uid] = {TotalFreezeTime: 0};
      }

      const screenDom = remoteStream && remoteStream.Play && remoteStream.Play.screenDom
      this.adapterRef.remoteScreenStats[uid] = {
        LayerType: 2,
        CodecName: item.googCodecName,
        End2EndDelay: (parseInt(item.googCurrentDelayMs) || 0) + (parseInt(item.googJitterBufferMs) || 0) + (parseInt(item.googRenderDelayMs) || 0),
        MuteState: (remoteStream && (remoteStream.muteStatus.screenSend || remoteStream.muteStatus.screenRecv)), //(remoteStream && remoteStream.screen) || (remoteStream && remoteStream.muteStatus.screen),
        PacketLossRate: item.vlr || 0,
        RecvBitrate: item.bitsReceivedPerSecond || 0,
        RecvResolutionHeight: parseInt(item.googFrameHeightReceived) || 0,
        RecvResolutionWidth: parseInt(item.googFrameWidthReceived) || 0,
        RenderFrameRate: parseInt(item.googFrameRateOutput) || 0,
        RenderResolutionHeight: screenDom ? screenDom.videoHeight : 0,
        RenderResolutionWidth: screenDom ? screenDom.videoWidth : 0,
        TotalFreezeTime: item.totalFreezeTime || 0,
        TotalPlayDuration: (this.firstData.recvFirstData[uid] && this.firstData.recvFirstData[uid].screenTotalPlayDuration) || (screenDom && screenDom.played && screenDom.played.length ? screenDom.played.end(0) : 0),
        TransportDelay: parseInt(item.googCurrentDelayMs) || 0
      }

      RecvBitrate = RecvBitrate + item.bitsReceivedPerSecond
      screen2.v_res.push((item.googFrameWidthReceived || 0) + 'x' + (item.googFrameHeightReceived || 0))
      screen2.v_fps.push(parseInt(item.googFrameRateOutput))
      screen2.v_plis.push(parseInt(item.googPlisSent))
      screen2.v_stuck.push(item.freezeTime || 0)
      screen2.v_bw_kbps.push(0)
      screen2.v_bps.push(item.bitsReceivedPerSecond || 0)
      screen2.v_p_lost_r.push(item.vlr || 0)
      screen2.v_dec_ms.push(parseInt(item.googDecodeMs) || 0)
      screen2.v_delay.push(parseInt(item.googJitterBufferMs))
    })

    this.adapterRef.sessionStats.RecvBitrate = RecvBitrate
    this.infos2.rx2.push({
      uid: audio2.uid,
      a_p_volume: audio2.a_p_volume,
      a_d_nor: audio2.a_d_nor,
      a_d_plc: audio2.a_d_plc,
      a_d_plccng: audio2.a_d_plccng,
      a_stuck: audio2.a_stuck,
      a_bps: audio2.a_bps,
      a_p_lost_r: audio2.a_p_lost_r,
      a_delay: audio2.a_delay,
      a_acc_r: audio2.a_acc_r,
      v_res: video2.v_res,
      v_fps: video2.v_fps,
      v_plis: video2.v_plis,
      v_stuck: video2.v_stuck,
      v_bw_kbps: video2.v_bw_kbps,
      v_bps: video2.v_bps,
      v_p_lost_r: video2.v_p_lost_r,
      v_dec_ms: video2.v_dec_ms,
      v_delay: video2.v_delay,

      s_res: screen2.v_res,
      s_fps: screen2.v_fps,
      s_plis: screen2.v_plis,
      s_stuck: screen2.v_stuck,
      s_bw_kbps: screen2.v_bw_kbps,
      s_bps: screen2.v_bps,
      s_p_lost_r: screen2.v_p_lost_r,
      s_dec_ms: screen2.v_dec_ms,
      s_delay: screen2.v_delay,
    })
  }

  // 获取本地上行的媒体信息

  getLocalMediaStats (upAudioList: UpAudioItem[], upVideoList: UpVideoItem[], upScreenList: UpVideoItem[]) {
    let result = {
      a_lost: (upAudioList[0] && upAudioList[0].alr) || 0, // 音频丢包百分比
      v_lost: (upVideoList[0] && upVideoList[0].vlr) || 0, // 视频丢包百分比
      s_lost: (upScreenList[0] && upScreenList[0].vlr) || 0, // 辅流丢包百分比
      rtt: parseInt(upVideoList[0] && upVideoList[0].googRtt) || 0, // 延迟
      rtt_mdev: -1, // 时延抖动。
      set_v_fps: parseInt(this.adapterRef.channelInfo.sessionConfig.frameRate) || 0, // 视频设置帧率（用户设置）
      v_cap_fps: parseInt(upVideoList[0] && upVideoList[0].googFrameRateInput) || 0, //视频采集帧率
      s_cap_fps: parseInt(upScreenList[0] && upScreenList[0].googFrameRateInput) || 0, //辅流采集帧率
      qos_v_fps: parseInt(upVideoList[0] && upVideoList[0].googFrameRateInput) || 0, // 视频设置帧率（QoS设置）
      qos_s_fps: parseInt(upScreenList[0] && upScreenList[0].googFrameRateInput) || 0, // 辅流设置帧率（QoS设置）
      v_fps: parseInt(upVideoList[0] && upVideoList[0].googFrameRateSent) || 0, // 视频发送帧率
      s_fps: parseInt(upScreenList[0] && upScreenList[0].googFrameRateSent) || 0, // 辅流发送帧率
      set_v_quality: this.adapterRef.channelInfo.sessionConfig.videoQuality, // 客户端设置图像清晰度. 默认 0,低 1,中 2,高 3, 480P 4, 540P 5, 720P 6
      // 客户端发送图像分辨率-宽度、高度wxh e.g."640x480"
      real_v_res: ((upVideoList[0] && upVideoList[0].googFrameWidthSent) || 0) + 'x' + ((upVideoList[0] && upVideoList[0].googFrameHeightSent) || 0),
      real_s_res: ((upScreenList[0] && upScreenList[0].googFrameWidthSent) || 0) + 'x' + ((upScreenList[0] && upScreenList[0].googFrameHeightSent) || 0),
      real_v_kbps: parseFloat(upVideoList[0] && upVideoList[0].googActualEncBitrate) || 0, // 客户端视频SDK编码码率
      real_s_kbps: parseFloat(upScreenList[0] && upScreenList[0].googActualEncBitrate) || 0, // 客户端辅流SDK编码码率
      real_v_kbps_n: parseFloat(upVideoList[0] && upVideoList[0].googTransmitBitrate) || 0, // 客户端视频网络出口发送码率（含冗余包）
      real_s_kbps_n: parseFloat(upScreenList[0] && upScreenList[0].googTransmitBitrate) || 0, // 客户端辅流网络出口发送码率（含冗余包）
      real_a_kbps: -1, //客户端音频SDK编码码率
      real_a_kbps_n: upAudioList[0] ? upAudioList[0].bitsSentPerSecond : 0, // 客户端音频网络出口发送码率（含冗余包）
      set_v_kbps: -1, // 客户端视频设置码率
      qos_v_kbps: -1, // QoS设置视频码率
      a_volume: parseInt(upAudioList[0] && upAudioList[0].audioInputLevel) || 0, // 客户端发送声音声量，int16
      a_cap_volume: this.adapterRef.localStream && Math.round(parseFloat(this.adapterRef.localStream.getAudioLevel()) * 32768) || 0, // 客户端采集的声音声量，int16
      a_codec: (upAudioList[0] && upAudioList[0].googCodecName) || 'opus', // 音频编解码名称
      a_stream_ended: this.LocalAudioEnable || false, //发送的音频流是否正常
      a_ssrc: (upAudioList[0] && upAudioList[0].ssrc) || '', //音频流的ssrc
      v_codec: (upVideoList[0] && upVideoList[0].googCodecName) || 'h264', //视频编解码名称
      s_codec: (upScreenList[0] && upScreenList[0].googCodecName) || 'h264', //视频编解码名称
      v_stream_ended: this.localVideoEnable || false, //发送的视频流是否正常
      s_stream_ended: this.localScreenEnable || false, //发送的辅流是否正常
      v_ssrc: (upVideoList[0] && upVideoList[0].ssrc) || '', // 视频流的ssrc
      s_ssrc: (upScreenList[0] && upScreenList[0].ssrc) || '', // 视频流的ssrc
    }

    let SamplingRate = 48
    if (this.adapterRef.localStream && this.adapterRef.localStream.audioProfile == 'speech_low_quality') {
      SamplingRate = 16 
    } else if (this.adapterRef.localStream && this.adapterRef.localStream.audioProfile == 'speech_standard') {
      SamplingRate = 32
    } 

    this.adapterRef.sessionStats.SendBitrate = result.real_v_kbps_n + result.real_a_kbps_n
    if (!this.adapterRef.localStream){
      throw new RtcError({
        code: ErrorCode.NO_LOCALSTREAM,
        message: 'No localStream'
      })
    }
    this.adapterRef.localAudioStats[0] = {
      CodecType: 'Opus',
      MuteState: this.adapterRef.localStream.muteStatus.audioSend,
      RecordingLevel: result.a_volume,
      SamplingRate: SamplingRate,
      SendBitrate: result.real_a_kbps_n,
      SendLevel: result.a_volume
    }

    this.adapterRef.localVideoStats[0] = {
      LayerType: 1,
      CodecName: upVideoList[0] && upVideoList[0].googCodecName,
      CaptureFrameRate: result.v_cap_fps,
      CaptureResolutionHeight: parseInt(upVideoList[0] && upVideoList[0].googFrameHeightInput) || 0,
      CaptureResolutionWidth: parseInt(upVideoList[0] && upVideoList[0].googFrameWidthInput) || 0,
      EncodeDelay: parseInt(upVideoList[0] && upVideoList[0].googAvgEncodeMs) || 0,
      MuteState: this.adapterRef.localStream.muteStatus.videoSend,
      SendBitrate: result.real_v_kbps_n,
      SendFrameRate: result.v_fps,
      SendResolutionHeight: parseInt(upVideoList[0] && upVideoList[0].googFrameHeightSent) || 0,
      SendResolutionWidth: parseInt(upVideoList[0] && upVideoList[0].googFrameWidthSent) || 0,
      TargetSendBitrate: parseInt(upVideoList[0] && upVideoList[0].googTargetEncBitrate) || 0,
      TotalDuration: this.adapterRef.state.startPubVideoTime ? (Date.now() -  this.adapterRef.state.startPubVideoTime) / 1000 : 0,
      TotalFreezeTime: upVideoList[0] ? upVideoList[0].totalFreezeTime :0
    }
    
    this.adapterRef.localScreenStats[0] = {
      LayerType: 2,
      CodecName: upScreenList[0] && upScreenList[0].googCodecName,
      CaptureFrameRate: result.s_cap_fps,
      CaptureResolutionHeight: parseInt(upScreenList[0] && upScreenList[0].googFrameHeightInput) || 0,
      CaptureResolutionWidth: parseInt(upScreenList[0] && upScreenList[0].googFrameWidthInput) || 0,
      EncodeDelay: parseInt(upScreenList[0] && upScreenList[0].googAvgEncodeMs) || 0,
      MuteState: this.adapterRef.localStream.muteStatus.screenSend,
      SendBitrate: result.real_s_kbps_n,
      SendFrameRate: result.s_fps,
      SendResolutionHeight: parseInt(upScreenList[0] && upScreenList[0].googFrameHeightSent) || 0,
      SendResolutionWidth: parseInt(upScreenList[0] && upScreenList[0].googFrameWidthSent) || 0,
      TargetSendBitrate: parseInt(upScreenList[0] && upScreenList[0].googTargetEncBitrate) || 0,
      TotalDuration: this.adapterRef.state.startPubScreenTime ? (Date.now() -  this.adapterRef.state.startPubScreenTime) / 1000 : 0,
      TotalFreezeTime: upScreenList[0] ? upScreenList[0].totalFreezeTime :0
    }

    //G2的统计上报
    this.infos2.tx2[0].v_res.push(result.real_v_res)
    this.infos2.tx2[0].v_fps.push(result.v_fps)
    this.infos2.tx2[0].v_plis.push(upVideoList[0] && upVideoList[0].googPlisReceived) 
    this.infos2.tx2[0].v_rtt.push(result.rtt)
    this.infos2.tx2[0].v_simulcast.push(0)
    this.infos2.tx2[0].v_bw_kbps.push(upVideoList[0] && upVideoList[0].googAvailableSendBandwidth)
    this.infos2.tx2[0].v_tar_kbps.push(upVideoList[0] && upVideoList[0].googTargetEncBitrate)
    this.infos2.tx2[0].v_rel_kbps.push(upVideoList[0] && upVideoList[0].googActualEncBitrate)
    this.infos2.tx2[0].v_tx_kbps.push(upVideoList[0] && upVideoList[0].googTransmitBitrate)
    this.infos2.tx2[0].v_retx_kbps.push(upVideoList[0] && upVideoList[0].googRetransmitBitrate)
    this.infos2.tx2[0].v_delay.push(0)
    //辅流的统计上报
    this.infos2.tx2[0].s_res.push(result.real_s_res)
    this.infos2.tx2[0].s_fps.push(result.s_fps)
    this.infos2.tx2[0].s_plis.push(upScreenList[0] && upScreenList[0].googPlisReceived)
    this.infos2.tx2[0].s_rtt.push(result.rtt)
    this.infos2.tx2[0].s_simulcast.push(0)
    this.infos2.tx2[0].s_bw_kbps.push(upScreenList[0] && upScreenList[0].googAvailableSendBandwidth)
    this.infos2.tx2[0].s_tar_kbps.push(upScreenList[0] && upScreenList[0].googTargetEncBitrate)
    this.infos2.tx2[0].s_rel_kbps.push(upScreenList[0] && upScreenList[0].googActualEncBitrate)
    this.infos2.tx2[0].s_tx_kbps.push(upScreenList[0] && upScreenList[0].googTransmitBitrate)
    this.infos2.tx2[0].s_retx_kbps.push(upScreenList[0] && upScreenList[0].googRetransmitBitrate)
    this.infos2.tx2[0].s_delay.push(0)

    this.infos2.tx2[0].a_cap_volume.push(result.a_cap_volume)
    this.infos2.tx2[0].a_rtt.push(upAudioList[0] && upAudioList[0].googRtt)

    return result
  }

  // 组装上行的媒体信息
  updateTxMediaInfo (upAudioList:UpAudioItem[], upVideoList:UpVideoItem[], upScreenList:UpVideoItem[]) {
    if(!this.adapterRef.localStream) return
    let tmp = this.getLocalMediaStats(upAudioList, upVideoList, upScreenList)
    // 更新其他信息
    // @ts-ignore
    let systemNetworkType = ((navigator.connection || {}).type || 'unknown').toString().toLowerCase()
    this.infos.net = tool.convertNetwork(this.network || systemNetworkType)
  }

  dispatchExceptionEventSendAudio(prev: UpAudioItem, next: UpAudioItem, uid: number|string){
    if (!prev || !next) {
      return
    }
    /*this.adapterRef.logger.warn('当前节点 audio next.audioInputLevel: ', next.audioInputLevel)
     this.adapterRef.logger.warn('前一周期 audio prev.bytesSent: ', prev.bytesSent)
     this.adapterRef.logger.warn('当前节点 audio next.bytesSent: ', next.bytesSent)*/
    const muteStatus = this.adapterRef.localStream && this.adapterRef.localStream.muteStatus.audioSend
    const pubStatus = this.adapterRef.localStream && this.adapterRef.localStream.pubStatus.audio.audio
    if (muteStatus === true || pubStatus === false) {
      return
    }

    if (0 === parseInt(next.audioInputLevel)) {
      this.adapterRef.instance.emit('exception', {
        msg: 'AUDIO_INPUT_LEVEL_TOO_LOW',
        code: 2001,
        uid:uid,
      })
    }

    let audioSendBytesDelta = parseInt(next.bytesSent) - parseInt(prev.bytesSent)
    if (0 === audioSendBytesDelta) {
      this.adapterRef.instance.emit('exception', {
        msg: 'SEND_AUDIO_BITRATE_TOO_LOW',
        code: 2003,
        uid
      })
    }
  }

  dispatchExceptionEventSendVideo(prev: UpVideoItem, next: UpVideoItem, uid: number|string){
    if (!prev || !next) {
      return
    }
    const muteStatus = this.adapterRef.localStream && (this.adapterRef.localStream.muteStatus.videoSend || this.adapterRef.localStream.muteStatus.videoRecv)
    const pubStatus = this.adapterRef.localStream && this.adapterRef.localStream.pubStatus.video.video
    if (muteStatus === true || pubStatus === false) {
      return
    }
    /*this.adapterRef.logger.warn('前一周期 video next.googFrameRateSent: ', next.googFrameRateSent)
    this.adapterRef.logger.warn('当前节点 video next.googFrameRateInput: ', next.googFrameRateInput)
    this.adapterRef.logger.warn('前一周期 video prev.bytesSent: ', prev.bytesSent)
    this.adapterRef.logger.warn('当前节点 video next.bytesSent: ', next.bytesSent)*/
    if (parseInt(next.googFrameRateInput) > 5 && parseInt(next.googFrameRateSent) <= 1) {
      this.adapterRef.instance.emit('exception', {
        msg: 'FRAMERATE_SENT_TOO_LOW',
        code: 1002,
        uid
      })
    }
    let videoSendBytesDelta = parseInt(next.bytesSent) - parseInt(prev.bytesSent)
    if (videoSendBytesDelta === 0) {
      this.adapterRef.instance.emit('exception', {
        msg: 'FRAMERATE_VIDEO_BITRATE_TOO_LOW',
        code: 1003,
        uid
      })
    }
  }
  
  dispatchExceptionEventRecvAudio(prev: DownAudioItem, next: DownAudioItem, uid: number|string){
    if (!prev || !next) {
      return
    }
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const muteStatus = remoteStream && (remoteStream.muteStatus.audioSend || remoteStream.muteStatus.audioRecv)
    if (remoteStream && muteStatus) {
      return
    }
    /*this.adapterRef.logger.warn('前一周期 audio prev.bytesReceived: ', prev.bytesReceived)
    this.adapterRef.logger.warn('当前节点 audio next.bytesReceived: ', next.bytesReceived)
    this.adapterRef.logger.warn('前一周期 audio prev.googDecodingNormal: ', prev.googDecodingNormal)
    this.adapterRef.logger.warn('当前节点 audio next.googDecodingNormal: ', next.googDecodingNormal)
    this.adapterRef.logger.warn('当前节点 audio next.audioOutputLevel: ', next.audioOutputLevel)*/
    let audioRecvBytesDelta = parseInt(next.bytesReceived) - parseInt(prev.bytesReceived)
    let audioDecodingNormalDelta = parseInt(next.googDecodingNormal) - parseInt(prev.googDecodingNormal)

    if (audioRecvBytesDelta > 0 && audioDecodingNormalDelta === 0) {
      this.adapterRef.instance.emit('exception', {
        msg: 'RECV_AUDIO_DECODE_FAILED',
        code: 2005,
        uid
      })
    }
    if((audioRecvBytesDelta > 0 && audioDecodingNormalDelta > 0 && 0 === +(next.audioOutputLevel || next.audioLevel))) {
      const volume = remoteStream && remoteStream.Play && remoteStream.Play.audioDom && remoteStream.Play.audioDom.volume
      if (volume && volume > 0) {
        this.adapterRef.instance.emit('exception', {
          msg: 'AUDIO_OUTPUT_LEVEL_TOO_LOW',
          code: 2002,
          uid
        })
      }
    }
  }
  
  dispatchExceptionEventRecvVideo(prev: DownVideoItem, next: DownVideoItem, uid: number|string){
    if (!prev || !next) {
      return
    }
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const muteStatus = remoteStream && (remoteStream.muteStatus.videoSend || remoteStream.muteStatus.videoRecv)
    if (remoteStream && muteStatus) {
      return
    }
    /*this.adapterRef.logger.warn('前一周期 video prev.bytesReceived: ', prev.bytesReceived)
    this.adapterRef.logger.warn('当前节点 video next.bytesReceived: ', next.bytesReceived)
    this.adapterRef.logger.warn('当前节点 video next.googFrameRateDecoded: ', next.googFrameRateDecoded)*/
    let videoRecvBytesDelta = parseInt(next.bytesReceived) - parseInt(prev.bytesReceived)
    if (videoRecvBytesDelta > 0 && parseInt(next.googFrameRateDecoded) === 0) {
      this.adapterRef.instance.emit('exception', {
        msg: 'RECV_VIDEO_DECODE_FAILED',
        code: 1005,
        uid
      })
    }
  }
  
  dispatchExceptionEventRecvScreen(prev: DownVideoItem, next: DownVideoItem, uid: number|string){
    if (!prev || !next) {
      return
    }
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const muteStatus = remoteStream && (remoteStream.muteStatus.screenSend || remoteStream.muteStatus.screenSend)
    if (remoteStream && muteStatus) {
      return
    }
    /*this.adapterRef.logger.warn('前一周期 video prev.bytesReceived: ', prev.bytesReceived)
    this.adapterRef.logger.warn('当前节点 video next.bytesReceived: ', next.bytesReceived)
    this.adapterRef.logger.warn('当前节点 video next.googFrameRateDecoded: ', next.googFrameRateDecoded)*/
    let screenRecvBytesDelta = parseInt(next.bytesReceived) - parseInt(prev.bytesReceived)
    if (screenRecvBytesDelta > 0 && parseInt(next.googFrameRateDecoded) === 0) {
      this.adapterRef.instance.emit('exception', {
        msg: 'RECV_SCREEN_DECODE_FAILED',
        code: 1005,
        uid
      })
    }
  }

  getRemoteAudioFreezeStats(prev: DownAudioItem, next:DownAudioItem, uid:number|string) {
    let totalFreezeTime = 0
    if (!prev || !next) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let prevStuck = parseInt(prev.googDecodingPLC) + parseInt(prev.googDecodingCNG) + parseInt(prev.googDecodingPLCCNG)
    let prevNormal = parseInt(prev.googDecodingCTN)

    let nextStuck = parseInt(next.googDecodingPLC) + parseInt(next.googDecodingCNG) + parseInt(next.googDecodingPLCCNG)
    let nextNormal = parseInt(next.googDecodingCTN)
    if (nextNormal <= prevStuck) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let stuckRate = (nextStuck - prevStuck) / (nextNormal - prevNormal)
    
    if (stuckRate < 0.2) {
      return {
        totalFreezeTime: 0,
        freezeTime: 0
      }
    } else {
      if (this.adapterRef.remoteAudioStats && this.adapterRef.remoteAudioStats[uid]) {
        totalFreezeTime = this.adapterRef.remoteAudioStats[uid].TotalFreezeTime || 0
      }
      totalFreezeTime++
      return {
        totalFreezeTime,
        freezeTime: 2
      } 
    }
  }

  getLocalVideoFreezeStats(data:UpVideoItem, uid:number|string) {
    let totalFreezeTime = 0
    if (!data) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(data.googFrameRateInput)
    let i = parseInt(data.googFrameRateSent)
    if (n > 5 && i < 3) {
      if (this.adapterRef.localVideoStats && this.adapterRef.localVideoStats[0]) {
        totalFreezeTime = this.adapterRef.localVideoStats[0].TotalFreezeTime || 0
      }
      totalFreezeTime++
      return {
        totalFreezeTime,
        freezeTime: 2
      } 
    } else {
      return {
        totalFreezeTime,
        freezeTime: 0
      } 
    }
  }

  getLocalScreenFreezeStats(data:UpVideoItem, uid:number|string) {
    let totalFreezeTime = 0
    if (!data) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(data.googFrameRateInput)
    let i = parseInt(data.googFrameRateSent)
    if (n > 5 && i < 3) {
      if (this.adapterRef.localScreenStats && this.adapterRef.localScreenStats[0]) {
        totalFreezeTime = this.adapterRef.localScreenStats[0].TotalFreezeTime || 0
      }
      totalFreezeTime++
      return {
        totalFreezeTime,
        freezeTime: 2
      }
    } else {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }
  }

  getRemoteVideoFreezeStats(prev: DownVideoItem, next: DownVideoItem, uid:number|string) {
    let totalFreezeTime = 0
    if (!next) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(next.googFrameRateReceived)
    let i = parseInt(next.googFrameRateDecoded)
    if (n > 5 && n < 10 && i < 3 || n > 10 && n < 20 && i < 4 || n > 20 && i < 5) {
      if (this.adapterRef.remoteVideoStats && this.adapterRef.remoteVideoStats[uid]) {
        totalFreezeTime = this.adapterRef.remoteVideoStats[uid].TotalFreezeTime || 0
      }
      totalFreezeTime++
      return {
        totalFreezeTime,
        freezeTime: 2
      } 
    } else {
      return {
        totalFreezeTime,
        freezeTime: 0
      } 
    }
  }

  getRemoteScreenFreezeStats(prev: DownVideoItem, next: DownVideoItem, uid:number|string) {
    let totalFreezeTime = 0
    if (!next) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(next.googFrameRateReceived)
    let i = parseInt(next.googFrameRateDecoded)
    if (n > 5 && n < 10 && i < 3 || n > 10 && n < 20 && i < 4 || n > 20 && i < 5) {
      if (this.adapterRef.remoteScreenStats && this.adapterRef.remoteScreenStats[uid]) {
        totalFreezeTime = this.adapterRef.remoteScreenStats[uid].TotalFreezeTime || 0
      }
      totalFreezeTime++
      return {
        totalFreezeTime,
        freezeTime: 2
      }
    } else {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }
  }

  send () {
    if(!this.adapterRef.report) return
    if (!this.infos.uid || !this.infos.cid) return

      //上报G2的数据
      let datareport = new DataReport({
          adapterRef: this.adapterRef
        })
      datareport.setHeartbeat({
        name: 'setHeartbeat',
        uid: '' + this.adapterRef.channelInfo.uid,
        cid: '' + this.adapterRef.channelInfo.cid
      })
      datareport.send()
      this.clearInfoData()
      return
  }
  destroy () {
    this.resetStatus()
    this._reset()
  }
}

// 数据转换工具
let tool = {
  convertNetwork (txt: string) {
    let map:{[key:string]:string} = {
      wlan: 'wifi',
      lan: 'ethernet'
    }
    return map[txt] || 'unknown'
  },
  convertPlatform (txt:string) {
    let win = /Windows/i
    let mac = /OS X/i
    let result
    result = (win.test(txt) && 'Win') || txt
    result = (mac.test(result) && 'Mac') || result
    return result
  },
  compare(property:string){
    return function(a:any,b:any){
      var value1 = a[property];
      var value2 = b[property];
      if (value2 !== 0 && !value2){
        // 考虑NaN或无值的情况
        return -1;
      }else if (value1 !== 0 && !value1){
        return 1;
      }else{
        return value2 - value1;
      }
    }
  }
}

export {
  FormativeStatsReport
}