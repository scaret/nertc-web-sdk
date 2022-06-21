import { ajax } from "../../util/ajax";
import  md5 = require('md5');
import {BUILD, SDK_VERSION} from '../../Config'
import {
  AdapterRef,
  DataEvent,
  LoginEvent,
  ReloginEvent,
  LogoutEvent,
  RecvFirstFrameEvent,
  DisconnectEvent,
  DeviceAbnormalEvent,
  RecvFirstPackageEvent,
  FirstPacketSentEvent,
  FunctionEvent,
  CommonEvent,
  HeartbeatEvent, APIEventItem, RequestLBSEvent,
} from "../../types";
import {USER_AGENT} from "../../util/rtcUtil/rtcEnvironment";

let reportUrl = "https://statistic.live.126.net/statics/report/common/form";

export interface DataReportOptions {
  wssServer?: string;
  adapterRef: AdapterRef;
  sdkRef?: object;
}

class DataReport {
  private configs:DataReportOptions;
  private adapterRef: AdapterRef;
  private cid:string;
  private uid:number|string;
  private time:number;
  private common: CommonEvent;
  private eventKeys: string[];
  private eventMap: {
    [prop: string]: DataEvent;
  }
  private api: APIEventItem[];
  private heartbeat: HeartbeatEvent | null;
  private networkChange?: DataEvent;
  /**
   * @constructor  CommonDataReport
   * @param {Object} options
   * @param {Object} options.sdkRef
   * @param {Object} options.adapterRef
   */
  constructor(options: DataReportOptions) {
    this.configs = options || {};
    const adapterRef = options.adapterRef;
    const sdkRef = options.sdkRef || {};
    this.adapterRef = adapterRef;
    let instance = adapterRef.instance;
    let channelInfo = adapterRef.channelInfo || {};
    let { sessionConfig = {} } = channelInfo
    this.cid = channelInfo.cid || channelInfo.channelId || 0;
    this.uid = channelInfo.uid || 0;
    let appKeyWebrtc2 = instance._params && instance._params.appkey
    const appKey = appKeyWebrtc2;
    this.time = channelInfo.clientNtpTime - channelInfo.T4
    this.common = {
      name: 'common',
      ver: "2.0",
      sdk_type: "nrtc2",
      session_id: this.adapterRef.deviceId,
      app_key: appKey
    };
    this.eventKeys = [];
    this.eventMap = {};
    this.api = [];
    this.heartbeat = null;
  }
  addEvent(eventName:string, event: DataEvent) {
    if (this.eventKeys.indexOf(eventName) == -1) {
      this.eventKeys.push(eventName);
    }
    if (event.time){
      event.time = event.time + this.time;
    }else{
      this.adapterRef.logger.warn(`addEvent:事件${eventName}没有time属性。使用当前时间戳`);
      event.time = Date.now();
    }
    this.eventMap[eventName] = event;
    return this;
  }
  updateCommon(commonEvent:CommonEvent) {
    Object.assign(this.common, commonEvent);
    return this;
  }
  
  /**
   * heartbeat定时上报
   * @param {Object} options
   * @param {String} options.uid    通话用户UID 3.3.0 是
   * @param {String} options.cid    通话时CID  3.3.0 是
   * @param {JSONObject} options.sys   通话时CID  3.3.0 是
   * @param {JSONArray} options.tx   上行通话质量数据 3.3.0 是
   * @param {JSONArray} options.rx   描述信息 3.3.0 是
   */
  setHeartbeat(heartbeatEvent: HeartbeatEvent) {
    this.heartbeat = heartbeatEvent;

    //api 上报借助心跳包活
    // 通过heatbeat上报，优先上报apiEvents中的事件
    const apiEventKeys = Object.keys(this.adapterRef.apiEvent);
    const apiEventsKeys = Object.keys(this.adapterRef.apiEvents);
    const eventNames = apiEventKeys.concat(apiEventsKeys.filter((eventName)=> !apiEventKeys.includes(eventName)));
    
    let api:APIEventItem[] = [];
    for (let i in eventNames) {
      const eventName = eventNames[i];
      if (this.adapterRef.apiEvents[eventName] && this.adapterRef.apiEvents[eventName].length){
        api = api.concat(this.adapterRef.apiEvents[eventName]);
        this.adapterRef.apiEvents[eventName] = [];
      }else if (this.adapterRef.apiEvent[eventName] && this.adapterRef.apiEvent[eventName].length){
        api = api.concat(this.adapterRef.apiEvent[eventName]);
        this.adapterRef.apiEvent[eventName] = [];
      }
    }
    this.api = this.api.concat(api);
    return this;
  }

  /**
   * networkChange事件
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.time long  切换时间点,NTP时间（断网case需要等待网络重连后再上报） 3.4.0 是
   */
  setNetworkChange(networkChangeEvent: DataEvent) {
    this.addEvent("networkChange", networkChangeEvent);
    return this;
  }

  /**
   * 通话开始log事件
   * @param {Object} options
   * @param {String} options.uid	String	通话用户UID	3.4.0	是
   * @param {String} options.cid	String	通话时CID	3.4.0	是
   * @param {String} options.sdk_ver  String  sdk版本  3.4.0 是
   * @param {String} options.platform  String  系统平台  3.4.0 是
   * @param {String} options.meeting_mode	int	1:会议模式 0:点对点模式 3.4.0 是
   * @param {boolean} options.a_record	bool	是否打开音频录制	3.4.0	是
   * @param {boolean} options.v_record	bool	是否打开视频录制	3.4.0	是
   * @param {int} options.record_type	int	录制模式 0-混单 1-只混 2-只单	3.4.0	是
   * @param {boolean} options.host_speaker	bool	是否为录制主讲人	3.4.0	是
   * @param {String} options.server_ip	String	 媒体服务地址 wertc: webrtc 服务器ip g1: 中转服务器ip 3.4.0	是
   * @param {int} options.result	int	0:成功;-1:超时;-2:认证失败	3.4.0	是
   * @param {int}  options.time long	登入时间点,NTP时间	3.4.0	是
   * @param {int}  options.signal_time_elapsed long  join过程中，完成与dispatch server之间的信令交互所花费的总时长(单位为 毫秒) 3.4.0 是
   * @param {int}  options.time_elapsed long  join 成功所花费的总时长(单位为 毫秒) 3.4.0 是
   * @param {String}  options.model String 浏览器版本号 3.4.0 是
   */
  setLogin (loginEvent:LoginEvent){
  
  // {uid, cid, sdk_ver=SDK_VERSION, platform='Web', app_key=this.common.app_key, meeting_mode=1, a_record, v_record, record_type, host_speaker, server_ip, result, time, signal_time_elapsed, time_elapsed}) {
    loginEvent.sdk_ver = loginEvent.sdk_ver || SDK_VERSION;
    loginEvent.platform = loginEvent.platform || 'Web';
    loginEvent.app_key = loginEvent.app_key || this.common.app_key;
    loginEvent.meeting_mode = loginEvent.meeting_mode || 1;
    loginEvent.model = loginEvent.model;
    loginEvent.build = BUILD;
    loginEvent.supported_codec_send = this.adapterRef.mediaCapability.supportedCodecSend?.join(",");
    loginEvent.supported_codec_recv = this.adapterRef.mediaCapability.supportedCodecRecv?.join(",");
    loginEvent.preferred_codec_send = this.adapterRef.mediaCapability.preferredCodecSend.video?.join(",");
    loginEvent.extra_info = JSON.stringify({
      userAgent: USER_AGENT
    })
    loginEvent.lbs_addrs = this.adapterRef.lbsManager.getReportField("nrtc")
    this.addEvent("login", loginEvent);
  }

  /**
   * 断网重连的重新log事件
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.platform  String  系统平台  3.4.0 是
   * @param {String} options.meeting_mode int 1:会议模式 0:点对点模式 3.4.0 是
   * @param {boolean} options.a_record  bool  是否打开音频录制  3.4.0 是
   * @param {boolean} options.v_record  bool  是否打开视频录制  3.4.0 是
   * @param {int} options.record_type int 录制模式 0-混单 1-只混 2-只单 3.4.0 是
   * @param {boolean} options.host_speaker  bool  是否为录制主讲人  3.4.0 是
   * @param {String} options.server_ip  String   媒体服务地址 wertc: webrtc 服务器ip g1: 中转服务器ip 3.4.0 是
   * @param {int} options.result  int 0:成功;-1:超时;-2:认证失败  3.4.0 是
   * @param {int}  options.time long  登入时间点,NTP时间 3.4.0 是
   * 
   */
  setRelogin (reloginEvent: ReloginEvent) {
    this.addEvent("relogin", reloginEvent);
  }

  /**
   * 通过结束事件
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.time String  结束时间 3.4.0 是
   * @param {String} options.reason String  登出的原因 0：正常leave，30204：媒体连接断开，30205：信令连接断开，30206：服务器踢掉，30207：房间已关闭 3.4.0 是
   */
  setLogout (logoutEvent: LogoutEvent) {
    this.addEvent("logout", logoutEvent);
  }

  /**
   * 描述设备使用情况，比如“打开成功”，“设备占用”，“设备异常”，"没有权限" “mute/unmute”等等。
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.ip  String  ip地址  3.4.0 是
   * @param {String} options.time String  触发时间 3.4.0 是
   */
  deviceAbnormal (deviceAbnormal: DeviceAbnormalEvent) {
    this.addEvent("deviceAbnormal", deviceAbnormal);
  }

  /**
   * 异常断开通知
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.reason  String  失败原因  3.4.0 是
   * @param {String} options.time String  触发时间 3.4.0 是
   */
  setDisconnect (disconnect: DisconnectEvent) {
    this.addEvent("disconnect", disconnect);
  }

  /**
   * 第一个收到后解码数据包
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.pull_uid  String  对端用户  3.4.0 是
   * @param {String} options.time String  触发时间 3.4.0 是
   * @param {int} options.media_type Int  0 音频, 1 视频 3.4.0 是
   */
  setRecvFirstFrame (recvFirstFrameEvent: RecvFirstFrameEvent) {
    this.addEvent("recvFirstFrame", recvFirstFrameEvent);
  }

  /**
   * 发送的第一个媒体包
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.time String  触发时间 3.4.0 是
   * @param {int} options.media_type Int  0 音频, 1 视频 3.4.0 是
   */
  setSendFirstPackage (firstPacketSent:FirstPacketSentEvent) {
    this.addEvent("firstPacketSent", firstPacketSent);
  }

  /**
   * 收到对端的第一个媒体包
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.pull_uid  String  对端用户  3.4.0 是
   * @param {String} options.time String  触发时间 3.4.0 是
   * @param {int} options.media_type Int  0 音频, 1 视频 3.4.0 是
   */
  setRecvFirstPackage (recvFirstPackageEvent: RecvFirstPackageEvent) {
    this.addEvent("recvFirstPackage", recvFirstPackageEvent);
  }
  
  /**
   * 异常断开通知
   * @param {Object} options
   * @param {String} options.uid  String  通话用户UID 3.4.0 是
   * @param {String} options.cid  String  通话时CID  3.4.0 是
   * @param {String} options.oper  String  操作，例如：打开、关闭  3.4.0 是
   * @param {String} options.value  String  详见各功能点的具体说明  3.4.0 是
   * @param {String} options.time String  触发时间 3.4.0 是
   */
  setFunction  (functionEvent:FunctionEvent) {
    this.addEvent("function", functionEvent);
  }

  setRequestLbs (requestLbsEvent: RequestLBSEvent){
    this.addEvent("requestLBS", requestLbsEvent);
  }

  reset() {
    this.eventKeys = []
    this.api = []
    this.heartbeat = null
  }
  send(eventKeys?: string[]) {
    let data: {
      common: CommonEvent;
      heartbeat?: HeartbeatEvent;
      event? :{
        [prop: string]: APIEventItem[];
      };
    } = {
      common: this.common
    };
    if (!eventKeys) {
      eventKeys = this.eventKeys;
    }
    if (this.heartbeat)  {
      data.heartbeat = this.heartbeat
      if (this.api.length) {
        this.api.forEach((evt)=>{
          if (!evt.uid) {
            evt.uid = this.adapterRef.channelInfo && this.adapterRef.channelInfo.uid
          }
          if (!evt.cid) {
            evt.cid = this.adapterRef.channelInfo && this.adapterRef.channelInfo.cid
          }
          if (evt.param && typeof evt.param === 'object') {
            //@ts-ignore
            if (evt.param.clientUid !== undefined) {
              //@ts-ignore
              evt.param.clientUid = evt.uid
            }
          }
        });
        data.event = {apiEvent: this.api};
        this.api = [];
      }
    }

    if (eventKeys) {
      if (eventKeys.length) {
        let cnt = 0;
        let ret:any = {};
        for (let i = eventKeys.length - 1; i >= 0; i--){
          const key = eventKeys[i];
          if (this.eventMap[key]){
            cnt++;
            ret[key] = this.eventMap[key];
            delete this.eventMap[key];
            eventKeys.splice(i, 1);
          }
        }
        if (cnt){
          data.event = ret;
        }
      }
    }
     else if(!this.heartbeat){
      return this;
    }

    //this.adapterRef.logger.log('reportUrl: ', reportUrl)
    if (this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer) {
      //reportUrl = reportUrl.replace("statistic.live.126.net", this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer);
      reportUrl = this.adapterRef.instance._params.neRtcServerAddresses.statisticsServer
      //this.adapterRef.logger.log('私有化配置的 reportUrl: ', reportUrl)
    }
    this.adapterRef.lbsManager.ajax({
      type: "post", 
      url: reportUrl, 
      data: data, 
      header: {
        sdktype: this.common.sdk_type,
        appkey: this.common.app_key,
        platform: 'web',
        sdkver:SDK_VERSION
      } 
    }).then(data => {
        if (eventKeys === this.eventKeys) {
          this.reset();
        }
      })
      .catch(err => {
        this.adapterRef.logger.log("dataReport, send error: ", err.name, err.message, err);
        this.reset();
      });

    return this;
  }
}

export {
  DataReport
}