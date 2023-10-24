import { IConfig } from './index'
import { LBS_REGION_CONFIG_TYPES } from '../types'

export const Config: IConfig = {
  lbsUrl: 'https://wecan-lbs.netease.im/api/v1/web_domains',
  checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
  // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
  createChannelUrl: 'https://nrtc.netease.im/nrtc/createChannel.action',
  getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action',
  roomsTaskUrl: 'https://roomserver.netease.im/v2/sdk/rooms/',
  getCloudProxyInfoUrl: 'https://ap-prd-jd.netease.im/v1/g2/getCloudProxyInfo'
}

export const LBS_REGION_CONFIG: LBS_REGION_CONFIG_TYPES = {
  GLOBAL: {
    cloudProxy: ['ap-prd-jd.netease.im'],
    lbs: ['wecan-lbs.netease.im', 'wecan-lbs.yunxinvcloud.com'],
    nrtc: ['nrtc.netease.im', 'wecan-gw.yunxinvcloud.com'],
    call: ['roomserver.netease.im', 'wecan-sdk.yunxinvcloud.com'],
    tracking: ['statistic.live.126.net', 'apm.yunxinhi.com']
  },
  OVERSEAS: {
    cloudProxy: ['supervisor-overseas.yunxinvcloud.com'],
    lbs: ['lbs-overseas.yunxinvcloud.com'],
    nrtc: ['nrtc-overseas.yunxinvcloud.com'],
    call: ['call-overseas.yunxinvcloud.com'],
    tracking: ['statistic-overseas.yunxinfw.com']
  }
}

// 需要改变默认域名的情况下，更改LBS_REGION_CONFIG就可以了。不要动TAGS_TO_MAIN_DOMAIN。
export const TAGS_TO_MAIN_DOMAIN = {
  cloudProxy: 'ap-prd-jd.netease.im',
  lbs: 'wecan-lbs.netease.im',
  nrtc: 'nrtc.netease.im',
  call: 'roomserver.netease.im',
  tracking: 'statistic.live.126.net'
}

export const ENV = 'production'
