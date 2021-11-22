// https://bugs.webkit.org/show_bug.cgi?id=232006
import {RtcSystem} from "./rtcSystem";
import {getParameters} from "../../module/parameters";

const marker = "a=extmap:4 ";

export function canShimVideoOrientation(offer: {sdp: string}, answer: {sdp: string}){
  if (getParameters().shimVideoOrientation === "never"){
    return false;
  }else if (getParameters().shimVideoOrientation === "ios151"){
    if (RtcSystem.ios()){
      if (RtcSystem.browser?.ua === "safari"){
        const uiVersion = parseFloat(RtcSystem.browser?.UIVersion)
        if (uiVersion < 15.1) {
          // 对明确的15.1以下不做更改
          return false
        }
      }
      else if (RtcSystem.browser?.ua === "weixin"){
        if (!navigator.userAgent.match(/OS 15_[1-9]/)){
          // 对微信的15.1以下不做更改
          return false
        }
      }else{
        //对无法识别的浏览器不做更改
        return false
      }
    }else{
      return false
    }
  }
  if (answer.sdp.indexOf("H264") === -1 || answer.sdp.indexOf("m=video") === -1){
    return false;
  }
  const videoOrientationMatch = offer.sdp.match(/\r\n(.*3gpp\:video-orientation.*)\r\n/);
  if (videoOrientationMatch && offer.sdp.indexOf(marker) > -1 && answer.sdp.indexOf(videoOrientationMatch[1]) === -1){
    return true
  }else{
    return false
  }
}

export function shimVideoOrientation(offer: {sdp: string}, answer: {sdp: string}){
  if (answer.sdp.indexOf("H264") === -1 || answer.sdp.indexOf("m=video") === -1){
    return;
  }
  const videoOrientationMatch = offer.sdp.match(/\r\n(.*3gpp\:video-orientation.*)\r\n/);
  if (videoOrientationMatch && offer.sdp.indexOf(marker) > -1 && answer.sdp.indexOf(videoOrientationMatch[1]) === -1){
    const videoOrientation = videoOrientationMatch[1];
    console.log(`shimVideoOrientation for ${RtcSystem.browser.ua} ${RtcSystem.browser?.UIVersion} ${videoOrientation}`);
    answer.sdp = answer.sdp.split(marker).join(videoOrientation + "\r\n" + marker)
  }else{
    console.error("Failed to shimVideoOrientation", videoOrientationMatch, offer.sdp.indexOf(marker), videoOrientationMatch && answer.sdp.indexOf(videoOrientationMatch[1]))
  }
}