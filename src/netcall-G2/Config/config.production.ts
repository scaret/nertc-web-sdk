import {IConfig, SDK_VERSION, BUILD} from "./index";

const Config:IConfig = {
  checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
  // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
  createChannelUrl: 'https://nrtc.netease.im/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver.netease.im/v2/sdk/rooms/'
}

export {
  Config
}