import {IConfig, SDK_VERSION, BUILD} from "./index";
import {urlManager} from "../util/URLManager";

const Config:IConfig = {
  checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
  // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
  createChannelUrl: 'https://nrtc.netease.im/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: 'https://ap-prd-jd.netease.im/v1/g2/getCloudProxyInfo'
}

// getchannelinfo房间加入
urlManager.addUrlBackup([
  "nrtc.netease.im",
  "wecan-gw.yunxinvcloud.com",
])

// 互动直播任务设置
urlManager.addUrlBackup([
  "roomserver.netease.im",
  "wecan-sdk.yunxinvcloud.com",
])

// 日志上传和数据上报
urlManager.addUrlBackup([
  "statistic.live.126.net",
  "apm.yunxinhi.com"
])

const ENV = "production";

export {
  ENV,
  Config
}