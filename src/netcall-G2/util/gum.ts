import {ILogger} from "../types";
import {getParameters} from "../module/parameters";
import {Logger} from "./webrtcLogger";
import {Device} from "../module/device";
import {canShimCanvas, shimCanvas} from "./rtcUtil/shimCanvas";

const logger:ILogger = new Logger({
  tagGen: ()=>{
    return "GUM"
  }
});

async function getStream (constraint:MediaStreamConstraints, logger:ILogger) {
  logger.log('getLocalStream constraint:', JSON.stringify(constraint))
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    logger.log('获取到媒体流: ', stream.id)
    const tracks = stream.getTracks();
    tracks.forEach((track)=>{
      watchTrack(track);
      if (track.kind === "video"){
        // @ts-ignore
        track.contentHint = getParameters().contentHint.video;
        if (canShimCanvas()){
          logger.warn("使用canvas track取代videoTrack", track.label);
          const canvasTrack = shimCanvas(track);
          watchTrack(canvasTrack);
          stream.removeTrack(track)
          stream.addTrack(canvasTrack);
        }
      }
    });
    return stream
  } catch(e) {
    logger.error('媒体设备获取失败: ', e.name, e.message)
    /*const stream = await navigator.mediaDevices.getUserMedia({audio: true})
    logger.log('重新获取到媒体流: ', stream.id)*/
    return Promise.reject(e)
  }
}

async function getScreenStream (constraint:MediaStreamConstraints, logger:ILogger) {
  logger.log('getScreenStream constraint:', JSON.stringify(constraint, null, ' '))
  //@ts-ignore
  const getDisplayMedia = navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia
  // STARTOF handleDisplayMedia
  const handleDisplayMedia = (stream:MediaStream)=>{
    logger.log('获取到屏幕共享流: ', stream.id)
    const tracks = stream.getTracks();
    tracks.forEach((track)=>{
      watchTrack(track);
      if (track.kind === "video"){
        // @ts-ignore
        track.contentHint = getParameters().contentHint.screen;
        if (getParameters().screenFocus){
          // @ts-ignore
          if (track.focus){
            logger.log("屏幕共享不跳转到被共享页面")
            // @ts-ignore
            track.focus("no-focus-change");
          }else{
            logger.warn("当前浏览器不支持屏幕共享跳转控制")
          }
        }
      }
    });
    return Promise.resolve(stream)
  }
  // ENDOF handleDisplayMedia
  
  
  let mediaStream:MediaStream;
  try{
    //@ts-ignore
    mediaStream = await navigator.mediaDevices.getDisplayMedia(constraint);
  }catch(e){
    if (e?.message?.indexOf("user gesture") > -1 && Device.onUserGestureNeeded){
      logger.warn("荧幕共享获取中断，需要手势触发。")
      Device.onUserGestureNeeded(e);
      try{
        mediaStream = await new Promise((resolve, reject)=> {
          Device.once('user-gesture-fired', () => {
            // @ts-ignore
            navigator.mediaDevices.getDisplayMedia(constraint).then(resolve).catch(reject);
          })
        })
      }catch(e){
        logger.error('第二次屏幕共享获取失败: ', e.name, e.message)
        throw e
      }
    }else{
      logger.error('屏幕共享获取失败: ', e.name, e.message)
      throw e;
    }
  }
  handleDisplayMedia(mediaStream);
  return mediaStream
}

export function watchTrack(track: MediaStreamTrack|null){
  if (track){
    if (track.readyState === "ended"){
      logger.error("注意：输入的track已经停止：", track);
    }
    if (track.kind === "audio"){
      const globalAudioTracks = getParameters().tracks.audio;
      logger.log(`获取到的设备类型: AUDIOTRACK#${globalAudioTracks.length}`, track.kind, track.label, track.id, JSON.stringify(track.getSettings()))
      const t = globalAudioTracks.findIndex((historyTrack)=>{
        return track === historyTrack;
      })
      if (t > -1){
        logger.warn(`注意：AUDIOTRACK#${globalAudioTracks.length} 与 AUDIOTRACK#${t} 相同`);
        globalAudioTracks.push(null);
      }else{
        globalAudioTracks.push(track);
      }
    }
    else{
      const globalVideoTracks = getParameters().tracks.video;
      logger.log(`获取到的设备类型: VIDEOTRACK#${globalVideoTracks.length}`, track.kind, track.label, track.id, JSON.stringify(track.getSettings()))
      const t = globalVideoTracks.findIndex((historyTrack)=>{
        return track === historyTrack;
      })
      if (t > -1){
        logger.warn(`注意：AUDIOTRACK#${globalVideoTracks.length} 与 VIDEOTRACK#${t} 相同`);
        globalVideoTracks.push(null);
      }else{
        globalVideoTracks.push(track);
      }
    }
  }
}

function emptyStreamWith(stream:MediaStream, withTrack: MediaStreamTrack|null){
  let sameTrack = false;
  stream.getTracks().forEach((track)=>{
    if (track !== withTrack){
      stream.removeTrack(track);
    }else{
      sameTrack = true;
    }
  })
  if (!sameTrack && withTrack){
    stream.addTrack(withTrack);
  }
}

export {
  emptyStreamWith,
  getStream,
  getScreenStream
}
