//Common Configs
const SDK_VERSION = "4.6.20";// WEBPACK_STRING_REPLACE_VERSION -don't delete the comment
const ENGINE_VERSION = "4.6.20.0";
const BUILD = ""; // WEBPACK_STRING_REPLACE_BUILD -don't delete the comment

export interface IConfig{
  lbsUrl: string;
  checkSumUrl:string;
  createChannelUrl:string;
  getChannelInfoUrl:string;
  roomsTaskUrl:string;
  getCloudProxyInfoUrl: string; 
}

//Env Specific configs
import {Config, ENV, LBS_BUILD_CONFIG} from "./config.development";// WEBPACK_STRING_REPLACE_ENV -don't delete the comment

const checkSumUrl = Config.checkSumUrl;
const createChannelUrl = Config.createChannelUrl;
const getChannelInfoUrl = Config.getChannelInfoUrl;
const roomsTaskUrl = Config.roomsTaskUrl;
const getCloudProxyInfoUrl = Config.getCloudProxyInfoUrl;
const lbsUrl = Config.lbsUrl

export {
  SDK_VERSION,
  ENGINE_VERSION,
  BUILD,
  ENV,
  LBS_BUILD_CONFIG,
  
  checkSumUrl,
  createChannelUrl,
  getChannelInfoUrl,
  roomsTaskUrl,
  getCloudProxyInfoUrl,
  lbsUrl,
};
