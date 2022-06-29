import {MediaHelper} from "./media";
import {PreProcessingConfig, PreProcessingHistoryInfo} from "../types";
import {emptyStreamWith} from "../util/gum";
import {getRTCTimer} from "../util/RTCTimer";
import {RTCCanvas} from "../util/rtcUtil/rtcCanvas";

export async function enablePreProcessing (mediaHelper: MediaHelper, mediaType: "video"|"screen" = "video", fps?: number){
  if (!fps){
    fps = mediaHelper[mediaType].captureConfig.high.frameRate
  }
  let preProcessing = mediaHelper[mediaType].preProcessing
  
  // 1.初始化预处理环境
  if (!preProcessing){
    mediaHelper.logger.log(`enablePreProcessing:初始化 mediaType ${mediaType}`)
    const videoElem = document.createElement("video")
    // document.body.appendChild(videoElem)
    let rtcCanvas = new RTCCanvas('canvas')
    let canvasElem = rtcCanvas._canvas
    let canvasCtx = rtcCanvas._ctx
    if (!canvasCtx){
      throw new Error("无法创建canvasCtx 2d")
    }
    // @ts-ignore
    const canvasStream:MediaStream = canvasElem.captureStream()
    videoElem.onresize = ()=>{
      rtcCanvas.setSize(videoElem.videoWidth, videoElem.videoHeight)
      videoElem.play()
    }
    const canvasTrack = canvasStream.getVideoTracks()[0]
    preProcessing = {
      canvasTrack,
      canvasCtx,
      videoTrack: null,
      videoElem,
      //@ts-ignore
      canvasElem,
      handlers: [
        {
          name: "syncState",
          enabled: true,
          func: preProcessingSyncState
        },
        {
          name: "copy",
          enabled: true,
          func: preProcessingCopy,
        },
        {
          //镜像插件前处理预留位置
          name: "mirror",
          enabled: false,
          func: ()=>{}
        },
        mediaHelper.stream._play?.watermark[mediaType].encoderControl.handler
      ],
      history: [],
      timer: null,
    }
    mediaHelper[mediaType].preProcessing = preProcessing
  }
  if(!preProcessing){
    return;
  }
  
  // 2. 为防止之前曾经调用过enablePreProcessing，须重新连接一遍
  let videoTrack:MediaStreamTrack|null;
  let oldTrackLow: MediaStreamTrack|null;
  if (mediaType === "video"){
    videoTrack = mediaHelper.video.cameraTrack || mediaHelper.video.videoSource;
    oldTrackLow = mediaHelper.video.videoTrackLow
    emptyStreamWith(mediaHelper.video.videoStream, preProcessing.canvasTrack)
  }else{
    videoTrack = mediaHelper.screen.screenVideoTrack || mediaHelper.screen.screenVideoSource;
    oldTrackLow = mediaHelper.video.videoTrackLow
    emptyStreamWith(mediaHelper.screen.screenVideoStream, preProcessing.canvasTrack)
  }
  if (!videoTrack){
    mediaHelper.logger.warn(`enablePreProcessing：当前没有视频输入 ${mediaType}`)
    preProcessing.videoElem.srcObject = new MediaStream([])
  }else{
    preProcessing.videoElem.srcObject = new MediaStream([videoTrack])
  }
  preProcessing.videoTrack = videoTrack

  // 3. 处理上行发送
  let sender, senderLow
  if (!mediaHelper.stream.isRemote){
    //@ts-ignore
    sender = mediaHelper.stream.getSender(mediaType, "high")
    //@ts-ignore
    senderLow = mediaHelper.stream.getSender(mediaType, "low")
  }
  if (sender){
    sender.replaceTrack(preProcessing.canvasTrack)
    mediaHelper.logger.log(`enablePreProcessing ${mediaType} 成功替换上行`)
  }
  if (senderLow && oldTrackLow){
    const newTrackLow = await mediaHelper.createTrackLow(mediaType)
    if (newTrackLow){
      senderLow.replaceTrack(newTrackLow);
      oldTrackLow.stop()
      mediaHelper.logger.log(`enablePreProcessing ${mediaType} 成功替换上行小流`)
    }
  }
  
  // 4. 处理具体的前处理钩子
  const drawFrame = async ()=>{
    if (preProcessing){
      if (preProcessing.videoElem.videoWidth && preProcessing.videoElem.videoHeight){
        if (
          preProcessing.videoElem.videoWidth !== preProcessing.canvasElem.width ||
          preProcessing.videoElem.videoHeight !== preProcessing.canvasElem.height
        ){
          mediaHelper.logger.warn(`前处理宽高变化 ${mediaType} ${preProcessing.canvasElem.width}x${preProcessing.canvasElem.height} => ${preProcessing.videoElem.videoWidth}x${preProcessing.videoElem.videoHeight}`)
          preProcessing.canvasElem.width = preProcessing.videoElem.videoWidth
          preProcessing.canvasElem.height = preProcessing.videoElem.videoHeight
        }
      }
      if (preProcessing.handlers.length){
        const startTs = Date.now()
        const handlerTs = []
        for (let handler of preProcessing.handlers){
          if (handler && handler.enabled){
            const spentStart = startTs
            await handler.func(mediaHelper, mediaType, preProcessing)
            const spent = Date.now() - spentStart
            handlerTs.push({
              name: handler.name,
              spent
            })
          }
        }
        const endTs = Date.now()
        let i = 0;
        for (; i < preProcessing.history.length; i++){
          if (endTs - preProcessing.history[i].endTs > 5000){
            continue
          }else{
            break
          }
        }
        preProcessing.history.splice(0, i)
        preProcessing.history.push({startTs, endTs, handlerTs})
      }else{
        // 要是没有前处理流程，默认就使用复制
        preProcessingCopy(mediaHelper, mediaType, preProcessing)
        // preProcessingPureColor(mediaHelper, mediaType, preProcessing)
      }
    }
  }
  if (preProcessing.timer){
    clearInterval(preProcessing.timer)
  }
  const interval = Math.floor(1000 / fps)
  try{
    drawFrame()
  }catch(e){
    mediaHelper.logger.error(`drawFrame`, e.name, e.message, e.stack)
  }
  preProcessing.timer = getRTCTimer().setInterval(drawFrame, interval)
  mediaHelper[mediaType].preProcessingEnabled = true
}

// 当没有前处理勾子时，前处理可关闭
export function canDisablePreProcessing(mediaHelper: MediaHelper, mediaType: "video"|"screen"){
  const preProcessing = mediaHelper[mediaType].preProcessing
  if (!preProcessing || !preProcessing.timer){
    return false
  }
  const extraHandlers = preProcessing.handlers.filter((handler)=>{
    return handler && handler.enabled && handler.name !== "syncState" && handler.name !== "copy"
  })
  return extraHandlers.length === 0
}

export async function disablePreProcessing(mediaHelper: MediaHelper, mediaType: "video"|"screen" = "video", keepFlag: boolean = false){
  mediaHelper.logger.log(`disablePreProcessing ${mediaType}`)

  const preProcessing = mediaHelper[mediaType].preProcessing
  if (!preProcessing) {
    mediaHelper.logger.warn(`disablePreProcessing ${mediaType}:当前没有前处理配置`)
    return
  }
  
  // 0. 去除最后一帧
  preProcessing.canvasCtx.clearRect(0, 0, preProcessing.canvasElem.width, preProcessing.canvasElem.height)

  // 1. 处理前处理钩子
  if (preProcessing?.timer){
    getRTCTimer().clearInterval(preProcessing.timer)
    preProcessing.timer = null
  }
  
  // 2. 处理本地videoTrack连接
  let videoTrack:MediaStreamTrack|null, oldTrackLow
  if (mediaType === "video"){
    videoTrack = mediaHelper.video.cameraTrack || mediaHelper.video.videoSource;
    oldTrackLow = mediaHelper.video.videoTrackLow
    emptyStreamWith(mediaHelper.video.videoStream, videoTrack)
  }else{
    videoTrack = mediaHelper.screen.screenVideoTrack || mediaHelper.screen.screenVideoSource;
    oldTrackLow = mediaHelper.screen.screenVideoTrackLow
    emptyStreamWith(mediaHelper.screen.screenVideoStream, videoTrack)
  }
  if (preProcessing.videoElem.srcObject){
    preProcessing.videoElem.srcObject = null
  }

  // 3. 处理上行发送
  let sender, senderLow
  if (!mediaHelper.stream.isRemote){
    //@ts-ignore
    sender = mediaHelper.stream.getSender(mediaType, "high")
    //@ts-ignore
    senderLow = mediaHelper.stream.getSender(mediaType, "low")
  }
  if (sender){
    if (videoTrack?.readyState === "live"){
      sender.replaceTrack(videoTrack)
      mediaHelper.logger.log(`disablePreProcessing ${mediaType} 成功替换上行为【${videoTrack.label}】`)
    }else{
      sender.replaceTrack(null)
      mediaHelper.logger.warn(`disablePreProcessing 删除上行`)
    }
  }
  if (senderLow && oldTrackLow){
    if (videoTrack?.readyState === "live"){
      const newTrackLow = await mediaHelper.createTrackLow(mediaType)
      if (newTrackLow){
        senderLow.replaceTrack(newTrackLow);
        oldTrackLow.stop()
        mediaHelper.logger.log(`disablePreProcessing ${mediaType} 成功替换上行小流`)
      }
    }else{
      senderLow.replaceTrack(null);
      mediaHelper.logger.warn(`disablePreProcessing 删除上行小流`)
    }
  }
  if (!keepFlag){
    mediaHelper[mediaType].preProcessingEnabled = false
  }
}

export function preProcessingSyncState(mediaHelper: MediaHelper, mediaType: "video"|"screen", config: PreProcessingConfig){
  if (config.videoTrack){
    if (config.videoTrack.enabled !== config.canvasTrack.enabled){
      mediaHelper.logger.log(`preProcessingCopy: 更改mute状态 ${mediaType} ${config.canvasTrack.enabled} => ${config.videoTrack.enabled}`)
      config.canvasTrack.enabled = config.videoTrack.enabled
    }
  }
}

export function preProcessingCopy(mediaHelper: MediaHelper, mediaType: "video"|"screen", config: PreProcessingConfig){
  if (config.videoTrack){
    if (config.videoTrack.enabled !== config.canvasTrack.enabled){
      mediaHelper.logger.log(`preProcessingCopy: 更改mute状态 ${mediaType} ${config.canvasTrack.enabled} => ${config.videoTrack.enabled}`)
      config.canvasTrack.enabled = config.videoTrack.enabled
    }
  }
  config.canvasCtx.drawImage(config.videoElem, 0, 0)
}

export function preProcessingPureColor(mediaHelper: MediaHelper, mediaType: "video"|"screen", config: PreProcessingConfig){
  config.canvasCtx.fillStyle = 'green';
  config.canvasCtx.fillRect(0, 0, config.canvasElem.width, config.canvasElem.height)
}