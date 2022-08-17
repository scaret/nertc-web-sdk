import { BUILD, IConfig, SDK_VERSION } from './index'

export const Config: IConfig = {
  lbsUrl: 'https://wecan-lbs.netease.im/api/v1/web_domains',
  checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
  // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
  createChannelUrl: 'https://nrtc.netease.im/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: 'https://ap-prd-jd.netease.im/v1/g2/getCloudProxyInfo'
}

export const LBS_BUILD_CONFIG: {
  [tag: string]: [string, string]
} = {
  lbs: ['wecan-lbs.netease.im', 'wecan-lbs.yunxinvcloud.com'],
  nrtc: ['nrtc.netease.im', 'wecan-gw.yunxinvcloud.com'],
  call: ['roomserver.netease.im', 'wecan-sdk.yunxinvcloud.com'],
  tracking: ['statistic.live.126.net', 'apm.yunxinhi.com']
}

export const ENV = 'production'
