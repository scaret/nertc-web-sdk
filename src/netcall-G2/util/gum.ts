import {ILogger} from "../types";
import {getParameters} from "../module/parameters";

async function getStream (constraint:MediaStreamConstraints, logger:ILogger) {
  logger.log('getLocalStream constraint:', JSON.stringify(constraint))
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    logger.log('获取到媒体流: ', stream.id)
    const tracks = stream.getTracks();
    tracks.forEach((track)=>{
      getParameters().mediaTracks.push(track);
      logger.log(`获取到的设备类型: TRACK#${getParameters().mediaTracks.length - 1}`, track.kind, track.label, track.id, JSON.stringify(track.getSettings()))
    });
    return stream
  } catch(e) {
    logger.error('媒体设备获取失败: ', e.name, e.message)
    /*const stream = await navigator.mediaDevices.getUserMedia({audio: true})
    logger.log('重新获取到媒体流: ', stream.id)*/
    return Promise.reject(e)
  }
}

function getScreenStream (constraint:MediaStreamConstraints, logger:ILogger) {
  logger.log('getScreenStream constraint:', JSON.stringify(constraint, null, ' '))
  //@ts-ignore
  const getDisplayMedia = navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia
  //@ts-ignore
  const p = navigator.mediaDevices.getDisplayMedia(constraint);
  p.then((stream:MediaStream)=>{
    logger.log('获取到屏幕共享流: ', stream.id)
    const tracks = stream.getTracks();
    tracks.forEach((track)=>{
      getParameters().mediaTracks.push(track);
      logger.log(`获取到的屏幕共享设备类型: TRACK#${getParameters().mediaTracks.length - 1}`, track.kind, track.label, track.id, JSON.stringify(track.getSettings()))
      if (track.kind === "video" && getParameters().screenFocus){
        // @ts-ignore
        if (track.focus){
          logger.log("屏幕共享不跳转到被共享页面")
          // @ts-ignore
          track.focus("no-focus-change");
        }else{
          logger.warn("当前浏览器不支持屏幕共享跳转控制")
        }
      }
    });
    return Promise.resolve(stream)
  }).catch((e:DOMException)=>{
    logger.error('屏幕共享获取失败: ', e.name, e.message)
  });
  return p;
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
