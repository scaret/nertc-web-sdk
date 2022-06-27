// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务

import {Client} from "../api/client";
import {loglevels} from "../util/log/logger";
import {LocalStream} from "../api/localStream";
import {ProducerCodecOptions} from "./3rd/mediasoup-client/Producer";

interface IParameters{

  // 存储了所有通过SDK的MediaStreamTrack，包括SDK开启的、外部输入的、小流等
  tracks: {
    audio: (MediaStreamTrack|null)[],
    video: (MediaStreamTrack|null)[],
  },

  shimVideoOrientation: "never"|"ios151"|"allsafari",
  
  // ios15.1上行直接通过摄像头发送H264会导致页面崩溃，需要在canvas绘制后传输  
  shimCanvas: "never"|"ios151"|"always",

  // 存储了通过createClient创建的客户端
  clients: Client[];
  
  // 存储了通过createStream创建的客户端
  localStreams: LocalStream[],
  
  // debugG2
  debugG2: boolean,
  
  // 是否开启UI提示
  enableAlerter: "never"|"nolistener"|"always",
  
  // 主流开开启小流时的视频采集参数
  videoLowDefaultConstraints: MediaTrackConstraints,
  // 辅流开开启小流时的视频采集参数
  screenLowDefaultConstraints: MediaTrackConstraints,
  
  // 播放时如果遇到自动播放问题，是否显示video控件的默认控制选项
  controlOnPaused: boolean,

  // 恢复播放时，是否隐藏video控件的默认控制选项
  hideControlOnResume: boolean,

  // 覆盖声网的设备枚举
  forceListenDeviceChange: boolean,
  
  // 最大PeerConnection重连次数
  maxTransportRebuildCnt: number,

  // 整个页面打印在console里的最低logLevel等级
  logLevel: loglevels,
  
  // mediasoup中的编码选项
  codecOptions: {
    audio: ProducerCodecOptions,
    video: {
      high: ProducerCodecOptions,
      low: ProducerCodecOptions,
    },
    screen: {
      high: ProducerCodecOptions,
      low: ProducerCodecOptions,
    },
  },
  // 屏幕共享时是否跳转到被共享页面
  screenFocus: boolean,
  // 是否允许localStream啥都不开
  allowEmptyMedia: boolean,
  // leave时是否销毁localStream
  keepLocalstreamOnLeave: boolean,
  // Join行为重试时的第一次退避时间
  joinFirstTimeout: number,
  // Join行为允许的最大尝试次数
  joinMaxRetry: number,
  // 重连行为允许的第一次退避时间
  reconnectionFirstTimeout: number,
  // 重连行为允许的最大尝试次数（每个服务器）
  reconnectionMaxRetry: number,
  // 页面卸载时是否自动调用leave
  leaveOnUnload: boolean,
  // 信任 window.ononline 和 window.onoffline回调
  trustOnOnline: boolean,
  // 部分浏览器加载编解码器需要时间。如果浏览器不支持H264，则等待多少毫秒
  h264Wait: number,
  // 编码水印字体
  encoderWatermarkFontFamily: string;
  // 编码水印最大数量
  encoderWatermarkLimit: number;
  // 强行开启encodedInsertableStreams
  forceEncodedInsertableStreams: boolean,
  // 强行将向服务端上报的customEncryption flag设为false
  forceCustomEncryptionOff: boolean,
  // 检测H264接收端时必须为High
  h264StrictHigh: boolean,
  // 允许TCP
  enableTcpCandidate: boolean,
  // 允许UDP
  enableUdpCandidate: boolean,
  // 最大事件循环卡顿提示次数
  maxEventLoopLagWarning: number,
  // 兼容模式下怎么决定用哪个声道
  audioInputcompatMode: "left"|"right"|"auto",
  // 主链路无响应多久后启用备用链路
  fireBackupDelay: number,
  // 修补Safari本地canvas track无法播放的问题
  shimLocalCanvas: "safari"|"all"|"never"
}

let parameters:IParameters = {
  tracks: {
    audio: [],
    video: [],
  },
  shimVideoOrientation: "never",
  shimCanvas: "ios151",
  clients: [],
  localStreams: [],
  debugG2: false,
  enableAlerter: "never",
  videoLowDefaultConstraints: {width: {max: 320}, height: {max: 180}},
  screenLowDefaultConstraints: {width: {max: 320}, height: {max: 180}},
  controlOnPaused: true,
  hideControlOnResume: true,
  maxTransportRebuildCnt: Number.MAX_SAFE_INTEGER,
  logLevel: loglevels.INFO,
  forceListenDeviceChange: true,
  codecOptions: {
    audio: {
      opusStereo: true,
      opusDtx: true
    },
    video: {
      high: {
        videoGoogleStartBitrate: 1000,
      },
      low: {
        videoGoogleStartBitrate: 500,
      },
    },
    screen: {
      high: {
        videoGoogleStartBitrate: 2000,
      },
      low: {
        videoGoogleStartBitrate: 500,
      },
    },
  },
  screenFocus: true,
  allowEmptyMedia: false,
  keepLocalstreamOnLeave: false,
  joinFirstTimeout: 2000,
  joinMaxRetry: 3,
  reconnectionFirstTimeout: 2000,
  reconnectionMaxRetry: 3,
  leaveOnUnload: true,
  trustOnOnline: false,
  h264Wait: 1000,
  encoderWatermarkLimit: 1,
  encoderWatermarkFontFamily: "Verdana",
  forceEncodedInsertableStreams: false,
  forceCustomEncryptionOff: false,
  h264StrictHigh: false,
  enableTcpCandidate: true,
  enableUdpCandidate: true,
  maxEventLoopLagWarning: 3,
  audioInputcompatMode: "auto",
  fireBackupDelay: 5000,
  shimLocalCanvas: "safari",
}

try{
  if (location.search && typeof URLSearchParams === "function"){
    const searchParams = new URLSearchParams(location.search)

    let key:keyof typeof parameters
    for(key in parameters){
      const builtinValue = parameters[key]
      const searchStr = searchParams.get(key)
      if (searchStr){
        let queryValue:number|string|boolean|null = null
        if (typeof builtinValue === "string"){
          queryValue = searchStr
        } else if (typeof builtinValue === "boolean"){
          if (searchStr === "true" || searchStr === "false"){
            queryValue = (searchStr === "true")
          }
        } else if (typeof builtinValue === "number"){
          queryValue = Number(searchStr)
          if (Number(searchStr) > Number.MIN_SAFE_INTEGER){
            queryValue = Number(searchStr)
          }
        }
        if (queryValue !== null && builtinValue !== queryValue){
          console.warn(`NERTC 通过URL改变了私有化变量：${key}:`, builtinValue, "=>",  queryValue)
          // @ts-ignore
          parameters[key] = queryValue
        }
      }
    }
  }  
}catch(e){
  // console.error(e)
}




// 注意：getParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
export const getParameters = ()=>{
  return parameters
}
