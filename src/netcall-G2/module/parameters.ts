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

  // 弱网情况下是保流畅还是保画质 https://webrtc.github.io/samples/src/content/capture/video-contenthint/
  contentHint: {
    video: "motion"|"detail",
    screen: "motion"|"detail",
  },
  
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
  contentHint: {
    video: "motion",
    screen: "detail",
  },
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
