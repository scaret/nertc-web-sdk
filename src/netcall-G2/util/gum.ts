import {GUMConstaints, ILogger, NeMediaStreamTrack} from "../types";
import {getParameters} from "../module/parameters";
import {Logger} from "./webrtcLogger";
import {Device} from "../module/device";
import {canShimCanvas, shimCanvas} from "./rtcUtil/shimCanvas";
import {getAudioContext} from "../module/webAudio";
import {syncTrackState} from "./syncTrackState";
import {AudioLevel} from "../module/audioLevel";
import {compatAudioInputList} from "../module/compatAudioInputList";

const logger:ILogger = new Logger({
  tagGen: ()=>{
    return "GUM"
  }
});


async function getStream (constraint:GUMConstaints, logger:ILogger) {
  if (constraint.audio){
    if (!constraint.audio.deviceId){
      const defaultDevice = Device.deviceHistory.audioIn.find((deviceInfo)=>{
        return deviceInfo.deviceId === "default"
      })
      if (defaultDevice){
        logger.log(`getStream：音频使用默认设备${defaultDevice.label}`)
        constraint.audio.deviceId = {exact: defaultDevice.deviceId}
      }
    }
    if (compatAudioInputList.enabled){
      logger.log(`兼容模式：constraint强制将channelCount设为2，echoCancellation设为false`)
      constraint.audio.channelCount = 2
      constraint.audio.echoCancellation = false
    }
    console.error(`音频采集强制设为采样率16k，关闭噪声抑制`)
    constraint.audio.sampleRate = 16000
    constraint.audio.noiseSuppression = false
  }
  logger.log('getLocalStream constraint:', JSON.stringify(constraint))
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    logger.log('获取到媒体流: ', stream.id)
    const tracks = stream.getTracks();
    for (let trackId = 0; trackId < tracks.length; trackId++){
      const track = tracks[trackId]
      watchTrack(track);
      if (track.kind === "video"){
        if (canShimCanvas()){
          logger.warn("使用canvas track取代videoTrack", track.label);
          const canvasTrack = shimCanvas(track);
          watchTrack(canvasTrack);
          stream.removeTrack(track)
          stream.addTrack(canvasTrack);
        }
      }else if (track.kind === "audio"){
        if (compatAudioInputList.enabled){
          const settings = track.getSettings? track.getSettings() : {}
          if (settings.channelCount && settings.channelCount >= 2 ){
            logger.log(`该设备支持兼容模式：${track.label}`, settings)
          }else{
            logger.warn(`该设备为单声道设备，强行开启兼容模式(右声道无声)：${track.label}`, settings)
          }
          const context = getAudioContext()
          if (context){
            const channelSplitter = context.createChannelSplitter(2)
            const destination = context.createMediaStreamDestination()
            const sourceStream = new MediaStream([track])
            const source = context.createMediaStreamSource(sourceStream)
            const audioLevelHelper = new AudioLevel({
              stream: sourceStream,
              logger: logger,
              sourceNode: source,
            })
            let output = 0 // 0:左， 1：右
            if (getParameters().audioInputcompatMode === "left"){
              logger.log(`兼容模式：仅使用左声道`)
              output = 0
            }else if (getParameters().audioInputcompatMode === "right"){
              logger.log(`兼容模式：仅使用右声道`)
              output = 1
            }else if (getParameters().audioInputcompatMode === "auto"){
              logger.log(`兼容模式：在左右声道间根据音量切换`)
              audioLevelHelper.on('channel-state-change', (evt)=>{
                if (evt.state === "leftLoud" && output === 1){
                  logger.log(`兼容模式切换至左声道：`, track.label)
                  channelSplitter.disconnect(destination)
                  channelSplitter.connect(destination, 0)
                  output = 0
                }else if (evt.state === "rightLoud" && output === 0){
                  logger.log(`兼容模式切换至右声道：`, track.label)
                  channelSplitter.disconnect(destination)
                  channelSplitter.connect(destination, 1)
                  output = 1
                }
              })
            }
            source.connect(channelSplitter)
            channelSplitter.connect(destination, output)
            const destTrack = destination.stream.getTracks()[0]
            watchTrack(destTrack)
            compatAudioInputList.compatTracks.push(({
              source: track,
              dest: destTrack,
            }))
            syncTrackState(track, destTrack)
            stream.removeTrack(track)
            stream.addTrack(destTrack)
            logger.log(`getStream：启用兼容模式成功`)
          }
        }
      }
    }
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
        if (getParameters().screenFocus){
          // @ts-ignore
          if (track.focus){
            logger.log("屏幕共享不跳转到被共享页面")
            // @ts-ignore
            track.focus("no-focus-change");
          }else{
            logger.log("当前浏览器不支持屏幕共享跳转控制")
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

//监测track状态
let lastWatchTs = Date.now()
const interval = 1000
let warningCnt = 0
const trackWatcher = ()=>{
  const videoTracks = getParameters().tracks.video as (NeMediaStreamTrack|null)[]
  const audioTracks = getParameters().tracks.audio as (NeMediaStreamTrack|null)[]
  const now = Date.now()
  if (now - lastWatchTs > 5000 && warningCnt < getParameters().maxEventLoopLagWarning){
    
    let text = `侦测到主线程事件循环从卡死中恢复。卡顿时间：${ now - lastWatchTs - interval }毫秒。`
    text += "这可能是由于页面切往后台、设备休眠、频繁的dom操作、阻塞性代码引起的。"
    text +=`当前页面页面是否隐藏：${document.hidden}，可见性：${document.visibilityState}，网络状态：${navigator.onLine}。`
    warningCnt += 1
    if (warningCnt === getParameters().maxEventLoopLagWarning){
      text += `今后不再提示。`
    }
    logger.warn(text)
  }
  lastWatchTs = now
  videoTracks.forEach((track, i)=>{
    if (track && !track.endedAt && track.readyState === "ended"){
      logger.log(`VIDEOTRACK#${i} 已停止：【${track.label}】`)
      track.endedAt = now
      const evt = new CustomEvent("neTrackEnded")
      track.dispatchEvent(evt)
    }
  })
  audioTracks.forEach((track, i)=>{
    if (track && !track.endedAt && track.readyState === "ended"){
      logger.log(`AUDIOTRACK#${i} 已停止：【${track.label}】`)
      track.endedAt = now
      const evt = new CustomEvent("neTrackEnded")
      track.dispatchEvent(evt)
    }
  })
}

setInterval(trackWatcher, interval)

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
        track.addEventListener('ended', trackWatcher)
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
        track.addEventListener('ended', trackWatcher)
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
      if (stream.onremovetrack){
        // @ts-ignore
        stream.onremovetrack({track})
      }
    }else{
      sameTrack = true;
    }
  })
  if (!sameTrack && withTrack){
    stream.addTrack(withTrack);
    if (stream.onaddtrack){
      // @ts-ignore
      stream.onaddtrack({track: withTrack})
    }
  }
}

export {
  emptyStreamWith,
  getStream,
  getScreenStream
}
