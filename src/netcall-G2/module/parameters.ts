// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务

import {Client} from "../api/client";
import {loglevels} from "../util/log/logger";
import {LocalStream} from "../api/localStream";
import {ProducerCodecOptions} from "./3rd/mediasoup-client/Producer";

interface IParameters{
  
  mediaTracks: MediaStreamTrack[],
  // 储存了通过createClient创建的客户端
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
}

let parameters:IParameters = {
  mediaTracks: [],
  clients: [],
  localStreams: [],
  videoLowDefaultConstraints: {width: 160},
  screenLowDefaultConstraints: {width: 160},
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
  screenFocus: false,
}

// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
const getParameters = ()=>{
  return parameters
}

// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
const setParameters = (params: IParameters)=>{
  Object.assign(parameters, params);
}

export {
  getParameters,
  setParameters,
}
