import {Logger} from "../types";

async function getStream (constraint:MediaStreamConstraints, logger:Logger = console) {
    
  logger.log('getLocalStream constraint:', JSON.stringify(constraint))
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    logger.log('获取到媒体流: ', stream.id)
    const tracks = stream.getTracks();
    tracks.forEach((track)=>{
      logger.log('获取到的设备类型: ', track.kind, track.label, track.id, JSON.stringify(track.getSettings()))
    });
    return stream
  } catch(e) {
    logger.error('媒体设备获取失败: ', e.name, e.message)
    /*const stream = await navigator.mediaDevices.getUserMedia({audio: true})
    logger.log('重新获取到媒体流: ', stream.id)*/
    return Promise.reject(e)
  }
}

function getScreenStream (constraint:MediaStreamConstraints, logger:Logger = console) {
  logger.log('getScreenStream constraint:', JSON.stringify(constraint, null, ' '))
  //@ts-ignore
  const getDisplayMedia = navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia
  //@ts-ignore
  const p = navigator.mediaDevices.getDisplayMedia(constraint);
  p.then((stream:MediaStream)=>{
    logger.log('获取到屏幕共享流: ', stream.id)
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
