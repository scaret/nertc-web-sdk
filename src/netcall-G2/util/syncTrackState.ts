import {ILogger} from "../types";
import {Logger} from "./webrtcLogger";

const logger:ILogger = new Logger({
  tagGen: ()=>{
    return "syncTrackState"
  }
});

const trackList:{srcTrack: MediaStreamTrack, destTrack: MediaStreamTrack}[] = []

let timer = setInterval(()=>{
  for (let pairId = trackList.length - 1; pairId>=0; pairId--){
    const srcTrack = trackList[pairId].srcTrack
    const destTrack = trackList[pairId].destTrack
    if (srcTrack.readyState === "ended"){
      if (destTrack.readyState === "live"){
        logger.log(`同步MediaStreamTrack关闭状态。【${srcTrack.label}】=>【${destTrack.label}】`)
        destTrack.stop()
      }
      trackList.splice(pairId, 1)
    }
    if (destTrack.readyState === "ended"){
      if (srcTrack.readyState === "live"){
        logger.warn(`同步MediaStreamTrack关闭状态。【${destTrack.label}】=>【${srcTrack.label}】`)
        srcTrack.stop()
      }
      trackList.splice(pairId, 1)
    }
  }
}, 1000)

export function syncTrackState(srcTrack: MediaStreamTrack, destTrack: MediaStreamTrack){
  trackList.push({srcTrack, destTrack})
}
