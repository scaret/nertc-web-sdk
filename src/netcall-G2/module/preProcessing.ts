import {MediaHelper} from "./media";
import {PreProcessingConfig} from "../types";
import {emptyStreamWith} from "../util/gum";
import {getRTCTimer} from "../util/RTCTimer";

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
    const canvasElem = document.createElement("canvas")
    const canvasCtx = canvasElem.getContext("2d")
    if (!canvasCtx){
      throw new Error("无法创建canvasCtx 2d")
    }
    // @ts-ignore
    const canvasStream:MediaStream = canvasElem.captureStream()
    videoElem.onresize = ()=>{
      canvasElem.width = videoElem.videoWidth
      canvasElem.height = videoElem.videoHeight
      videoElem.play()
    }
    const canvasTrack = canvasStream.getVideoTracks()[0]
    preProcessing = {
      canvasTrack,
      canvasCtx,
      videoTrack: null,
      videoElem,
      canvasElem,
      handlers: [{
        name: "copy",
        func: preProcessingCopy,
      }],
      timer: null,
    }
    mediaHelper[mediaType].preProcessing = preProcessing
    // @ts-ignore
    preProcessing.handlers.push(mediaHelper.stream._play?.watermark[mediaType].encoderControl.handler)
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
    mediaHelper.logger.error(`enablePreProcessing：当前没有视频输入 ${mediaType}`)
    return
  }
  preProcessing.videoTrack = videoTrack
  preProcessing.videoElem.srcObject = new MediaStream([videoTrack])

  // 3. 处理上行发送
  let sender, senderLow
  if (!mediaHelper.stream.isRemote){
    sender = mediaHelper.stream.getSender(mediaType, "high")
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
  if (preProcessing.timer){
    clearInterval(preProcessing.timer)
  }
  const interval = Math.floor(1000 / fps)
  preProcessing.timer = getRTCTimer().setInterval(()=>{
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
        for (let handler of preProcessing.handlers){
          handler.func(mediaHelper, mediaType, preProcessing)
        }
      }else{
        // 要是没有前处理流程，默认就使用复制
        preProcessingCopy(mediaHelper, mediaType, preProcessing)
        // preProcessingPureColor(mediaHelper, mediaType, preProcessing)
      }
    }
  }, interval)
  mediaHelper[mediaType].preProcessingEnabled = true
}

// 当没有前处理勾子时，前处理可关闭
export async function canDisablePreProcessing(mediaHelper: MediaHelper, mediaType: "video"|"screen"){
  const preProcessing = mediaHelper[mediaType].preProcessing
  if (preProcessing?.timer && preProcessing.handlers.length === 0){
    return true
  }else{
    return false
  }
}

export async function disablePreProcessing(mediaHelper: MediaHelper, mediaType: "video"|"screen" = "video", keepFlag: boolean = false){
  mediaHelper.logger.log(`disablePreProcessing ${mediaType}`)

  const preProcessing = mediaHelper[mediaType].preProcessing
  if (!preProcessing) {
    mediaHelper.logger.warn(`disablePreProcessing ${mediaType}:当前没有前处理配置`)
    return
  }

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
    sender = mediaHelper.stream.getSender(mediaType, "high")
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