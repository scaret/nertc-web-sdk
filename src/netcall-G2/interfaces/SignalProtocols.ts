// 信令通道协议
// 部分对象定义在这里是因为对象结构是被信令通道协议决定的。

import { PlatformType } from '../types'

export interface SignalGetChannelInfoResponse {
  code: number
  cname: string
  source: number
  time: {
    t1: number
    t2: number
    t3: number
  }
  ips: {
    uid: number
    hostname: string[]
    webrtc: string
    turnaddrs: string[][]
    signalproxy: string[]
    webrtcarray: string[]
    wechatapparray: string[]
    token: string
    grey: boolean
    config: {
      net: {
        record: boolean
        dtunnel: boolean
        p2p: boolean
      }
    }
    // 来自代码
    relayaddrs: any
    relaytoken: any
  }
  cid: number
  token: string
  // 来自代码
  config: any
  desc?: string
}

export interface SignalResBase {
  code: number
  errMsg: string
  requestId: string
}

export enum SignalChannelMode {
  CHANNEL_MODE_P2P = 1,
  CHANNEL_MODE_MEETING = 2,
  CHANNEL_MODE_1V1 = 3
}

export interface SignalRoomCapability {
  mediaCapabilitySet: string
  version: number
}
const VideoCodecStr2Int = {
  H264: 0,
  H265: 1,
  VP8: 2,
  NEVC: 3
}
const VideoCodecInt2Str = {
  0: 'H264',
  1: 'H265',
  2: 'VP8',
  3: 'NEVC'
}
export { VideoCodecInt2Str, VideoCodecStr2Int }

export interface SignalJoinRes extends SignalResBase {
  aslActiveNum: number
  supportWebAsl?: boolean
  appid: string
  mode: SignalChannelMode
  edgeMode: number
  joinOrder: number
  enableRtmp: boolean
  enableAudioRecord: boolean
  enableVideoRecord: boolean
  callbackNetStatus: boolean
  externData: {
    code: number
    errMsg: string
    uid: number | string
    cid: number
    appid: string
    record: boolean
    audioRight: number
    videoRight: number
    roomCapability: SignalRoomCapability
    userList: {
      uid: number | string
      userName: string
      role: string
      record: boolean
      rtpCapabilities: any
      hostName: string
      platformType: PlatformType
      customData: string
      producerInfoList: {
        producerId: string
        mediaType: string
        mute: boolean
        simulcastEnable: boolean
        spatialLayerCount: number
        profile: number
        subStream?: boolean
        externalVideo?: boolean
      }[]
    }[]
  }
  edgeRtpCapabilities: {
    codecs: any[]
    headerExtensions: any[]
  }
  supportRandomIceUfrag?: boolean
}
