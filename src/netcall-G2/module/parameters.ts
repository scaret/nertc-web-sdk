// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务

import {Client} from "../api/client";
import {loglevels} from "../util/log/logger";
import {LocalStream} from "../api/localStream";
import {ProducerCodecOptions} from "./3rd/mediasoup-client/Producer";

interface IParameters{

  tracks: {
    audio: (MediaStreamTrack|null)[],
    video: (MediaStreamTrack|null)[],
  },
  // 储存了通过createClient创建的客户端
  shimVideoOrientation: "never"|"ios151"|"allsafari",
  shimCanvas: "never"|"ios151"|"always",
  clients: Client[];
  
  // 存储了通过createStream创建的客户端
  localStreams: LocalStream[],
  
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
  videoLowDefaultConstraints: {width: {max: 320}, height: {max: 180}},
  screenLowDefaultConstraints: {width: {max: 320}, height: {max: 180}},
  controlOnPaused: true,
  hideControlOnResume: true,
  maxTransportRebuildCnt: 50,
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
  shimLocalCanvas: "safari",
}

// 注意：getParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
export const getParameters = ()=>{
  return parameters
}
