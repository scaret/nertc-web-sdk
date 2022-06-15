import {IConfig, SDK_VERSION, BUILD} from "./index";

console.log(`You are Running RTC SDK in development mode. Version ${SDK_VERSION} Build ${BUILD}`)

export const Config:IConfig = {
  lbsUrl: "https://wecan-lbs-qa.netease.im/api/v1/web_domains",
  checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
  // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
  createChannelUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver-greytest.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: 'https://ap-qa-jd.netease.im/v1/g2/getCloudProxyInfo'
}

export const LBS_BUILD_CONFIG: {
  [mainDomain: string]: [string, string] 
} = {
  "wecan-lbs-qa.netease.im": [
    "wecan-lbs-qa.netease.im",
    "wecan-lbs-qa2.netease.im",
  ],
  "webtest.netease.im": [
    "webtest.netease.im",
    "vcloud-quictest.netease.im",
  ],
  "roomserver-greytest.netease.im": [
    "roomserver-greytest.netease.im",
    "nrtc-yidun-qa.netease.im",
  ],
  "statistic.live.126.net": [
    "statistic.live.126.net",
    "apm.yunxinhi.com"
  ]
}

export const ENV = "development";
