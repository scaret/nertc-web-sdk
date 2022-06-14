import {IConfig, SDK_VERSION, BUILD} from "./index";
import {urlManager} from "../util/URLManager";

console.log(`You are Running RTC SDK in test mode. Version ${SDK_VERSION} Build ${BUILD}`)

const Config:IConfig = {
  checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
  // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
  createChannelUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver-greytest.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: ''
}


// getchannelinfo房间加入
urlManager.addUrlBackup([
  "webtest.netease.im",
  "vcloud-quictest.netease.im",
])

// 互动直播任务设置
urlManager.addUrlBackup([
  "roomserver-greytest.netease.im",
  "nrtc-yidun-qa.netease.im",
])

// 日志上传和数据上报
urlManager.addUrlBackup([
  "statistic.live.126.net",
  "apm.yunxinhi.com"
])

const ENV = "test";

export {
  ENV,
  Config
}