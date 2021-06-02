//Common Configs
const SDK_VERSION = "4.4.0";// WEBPACK_STRING_REPLACE_VERSION -don't delete the comment
const ENGINE_VERSION = "4.4.0.0";
const BUILD = ""; // WEBPACK_STRING_REPLACE_BUILD -don't delete the comment

export interface IConfig{
  checkSumUrl:string;
  createChannelUrl:string;
  getChannelInfoUrl:string;
  roomsTaskUrl:string;
}

//Env Specific configs
import {Config} from "./config.development";// WEBPACK_STRING_REPLACE_ENV -don't delete the comment

const checkSumUrl = Config.checkSumUrl;
const createChannelUrl = Config.createChannelUrl;
const getChannelInfoUrl = Config.getChannelInfoUrl;
const roomsTaskUrl = Config.roomsTaskUrl;

export {
  SDK_VERSION,
  ENGINE_VERSION,
  BUILD,
  
  checkSumUrl,
  createChannelUrl,
  getChannelInfoUrl,
  roomsTaskUrl,
  
};
