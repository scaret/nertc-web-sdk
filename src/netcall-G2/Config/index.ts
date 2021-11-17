//Common Configs
const SDK_VERSION = "4.5.1";// WEBPACK_STRING_REPLACE_VERSION -don't delete the comment
const ENGINE_VERSION = "4.5.1.0";
const BUILD = ""; // WEBPACK_STRING_REPLACE_BUILD -don't delete the comment

export interface IConfig{
  checkSumUrl:string;
  createChannelUrl:string;
  getChannelInfoUrl:string;
  roomsTaskUrl:string;
}

//Env Specific configs
import {Config, ENV} from "./config.development";// WEBPACK_STRING_REPLACE_ENV -don't delete the comment

const checkSumUrl = Config.checkSumUrl;
const createChannelUrl = Config.createChannelUrl;
const getChannelInfoUrl = Config.getChannelInfoUrl;
const roomsTaskUrl = Config.roomsTaskUrl;

export {
  SDK_VERSION,
  ENGINE_VERSION,
  BUILD,
  ENV,
  
  checkSumUrl,
  createChannelUrl,
  getChannelInfoUrl,
  roomsTaskUrl,
  
};
