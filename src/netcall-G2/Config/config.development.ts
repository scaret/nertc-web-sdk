import { BUILD, IConfig, SDK_VERSION } from './index'
import { LBS_REGION_CONFIG_TYPES } from '../types'

console.log(`You are Running RTC SDK in development mode. Version ${SDK_VERSION} Build ${BUILD}`)

export const Config: IConfig = {
  lbsUrl: 'https://wecan-lbs-qa.netease.im/api/v1/web_domains',
  checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
  // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
  createChannelUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver-greytest.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: 'https://ap-qa-jd.netease.im/v1/g2/getCloudProxyInfo'
}

export const LBS_REGION_CONFIG: LBS_REGION_CONFIG_TYPES = {
  GLOBAL: {
    lbs: ['wecan-lbs-qa.netease.im', 'vcloud-sentry.netease.im'],
    nrtc: ['webtest.netease.im', 'vcloud-quictest.netease.im'],
    call: ['roomserver-greytest.netease.im', 'nrtc-yidun-qa.netease.im'],
    tracking: ['statistic.live.126.net', 'apm.yunxinhi.com']
  }
}

// 需要改变默认域名的情况下，更改LBS_REGION_CONFIG就可以了。不要动TAGS_TO_MAIN_DOMAIN。
export const TAGS_TO_MAIN_DOMAIN = {
  lbs: 'wecan-lbs-qa.netease.im',
  nrtc: 'webtest.netease.im',
  call: 'roomserver-greytest.netease.im',
  tracking: 'statistic.live.126.net'
}

export const ENV = 'development'
