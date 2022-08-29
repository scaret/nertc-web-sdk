import { BUILD, IConfig, SDK_VERSION } from './index'

console.log(`You are Running RTC SDK in test mode. Version ${SDK_VERSION} Build ${BUILD}`)

export const Config: IConfig = {
  lbsUrl: 'https://wecan-lbs-qa.netease.im/api/v1/web_domains',
  checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
  // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
  createChannelUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver-greytest.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: 'https://ap-qa-jd.netease.im/v1/g2/getCloudProxyInfo'
}

export const LBS_BUILD_CONFIG: {
  [tag: string]: [string, string]
} = {
  lbs: ['wecan-lbs-qa.netease.im', 'vcloud-sentry.netease.im'],
  nrtc: ['webtest.netease.im', 'vcloud-quictest.netease.im'],
  call: ['roomserver-greytest.netease.im', 'nrtc-yidun-qa.netease.im'],
  tracking: ['statistic.live.126.net', 'apm.yunxinhi.com']
}

export const ENV = 'test'
