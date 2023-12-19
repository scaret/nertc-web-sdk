//Common Configs
const SDK_VERSION = '5.5.11' // WEBPACK_STRING_REPLACE_VERSION -don't delete the comment
const ENGINE_VERSION = '5.5.11'
const BUILD = '' // WEBPACK_STRING_REPLACE_BUILD -don't delete the comment

export interface IConfig {
  lbsUrl: string
  checkSumUrl: string
  createChannelUrl: string
  getChannelInfoUrl: string
  roomsTaskUrl: string
  getCloudProxyInfoUrl: string
}

//Env Specific configs
import { Config, ENV, LBS_REGION_CONFIG, TAGS_TO_MAIN_DOMAIN } from './config.production' // WEBPACK_STRING_REPLACE_ENV -don't delete the comment

const checkSumUrl = Config.checkSumUrl
const createChannelUrl = Config.createChannelUrl
const getChannelInfoUrl = Config.getChannelInfoUrl
const roomsTaskUrl = Config.roomsTaskUrl
const getCloudProxyInfoUrl = Config.getCloudProxyInfoUrl
const lbsUrl = Config.lbsUrl

export {
  BUILD,
  checkSumUrl,
  createChannelUrl,
  ENGINE_VERSION,
  ENV,
  getChannelInfoUrl,
  getCloudProxyInfoUrl,
  LBS_REGION_CONFIG,
  TAGS_TO_MAIN_DOMAIN,
  lbsUrl,
  roomsTaskUrl,
  SDK_VERSION
}
