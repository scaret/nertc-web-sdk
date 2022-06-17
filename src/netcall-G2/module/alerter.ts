import {Client} from "../types";
import {LocalStream} from "../api/localStream";
import {systemChecker} from "../util/checkSystemRequirements";
import {IS_CHROME} from "../util/rtcUtil/rtcEnvironment";
import * as env from "../util/rtcUtil/rtcEnvironment";
import {getParameters} from "./parameters";
import {RemoteStream} from "../api/remoteStream";
import {getAudioContext} from "./webAudio";
import {RTCEventEmitter} from "../util/rtcUtil/RTCEventEmitter";

interface AlertOptions{
  resume: boolean
}

class Alerter extends RTCEventEmitter{
  elem: HTMLDivElement|null = null
  
  alert(innerHTML: string, options?: AlertOptions){
    if (!options){
      options = {
        resume: false
      }
    }
    if (!this.elem){
      this.elem = document.createElement("div")
      this.elem.style.fontSize = "20px";
      this.elem.style.position = "fixed";
      this.elem.style.background = "yellow";
      this.elem.style.margin = "auto";
      this.elem.style.width = "100%";
      this.elem.style.zIndex = "9999";
      this.elem.style.top = "0";
      this.elem.addEventListener('click', ()=>{
        if (this.elem?.parentNode){
          this.elem.parentNode.removeChild(this.elem)
        }
        this.safeEmit("@user-gesture-fired")
      })
    }
    this.elem.style.display = "block";
    this.elem.innerHTML = innerHTML
    document.body.appendChild(this.elem)
    if (options.resume){
      this.elem.addEventListener("click", resumeAllMedia, {once: true})
    }
  }
  watchClient(client: Client){
    client.addListener('@pairing-join-start', ()=>{
      if ((getParameters().debugG2 && systemChecker.checkCnt === 0) || getParameters().enableAlerter === "always"){
        const MIN_CHROME_VERSION = 72
        if (env.IS_CHROME && (env.IS_MAC || env.IS_WIN) && env.CHROME_MAJOR_VERSION && env.CHROME_MAJOR_VERSION < MIN_CHROME_VERSION){
          let innerHTML = `您当前正在使用的Chrome浏览器版本为${env.CHROME_MAJOR_VERSION}, 不在NERTC的支持范围。请更新您的浏览器。`
          + `<br/>您看到这条提示是因为您未调用 NERTC.checkSystemRequirements()，并且浏览器版本过低。`
          this.alert(innerHTML)
        }
      }
    })
    
    client.addListener('@connection-state-change', evt=>{
      if (evt.curState === "DISCONNECTING" && evt.prevState === "CONNECTING"){
        if (
          (getParameters().debugG2 && client._events && !client._events["connection-state-change"] && !client._events["SOCKET_ERROR"])
          || getParameters().enableAlerter === "always"
        ){
          let innerHTML = `由于网络原因，您当前已经退出房间。`
            + `<br/>您看到这条提示是因为您未监听 connection-state-change 或 SOCKET_ERROR 事件，并且加入房间后意外退出了房间。`
          this.alert(innerHTML)
        }
      }
    })
  }
  watchLocalStream(localStream: LocalStream){
    localStream.on('@notAllowedError', evt=>{
      if (
        (getParameters().debugG2 && !localStream._events["notAllowedError"])
        || getParameters().enableAlerter === "always"
      ){
        let innerHTML = `音频播放需要手势触发。`
          + `<br/>您看到这条提示是因为您未监听 notAllowedError 事件，并且遇到了浏览器自动播放策略问题。`
        this.alert(innerHTML, {resume: true})
      }
    })
  }
  
  watchRemoteStream(remoteStream: RemoteStream){
    remoteStream.on('@notAllowedError', evt=>{
      if (
        (getParameters().debugG2 && !remoteStream._events["notAllowedError"])
        || getParameters().enableAlerter === "always"
      ){
        let innerHTML = `音频播放需要手势触发。`
          + `<br/>您看到这条提示是因为您未监听 notAllowedError 事件，并且遇到了浏览器自动播放策略问题。`
        this.alert(innerHTML, {resume: true})
      }
    })
  }
}

function resumeAllMedia(){
  const clients = getParameters().clients
  for (let i = 0; i < clients.length; i++){
    const client = clients[i]
    if (client.destroyed){
      continue
    }
    for (let id in client.adapterRef.remoteStreamMap){
      const remoteStream = client.adapterRef.remoteStreamMap[id]
      if (remoteStream._play?.audioDom?.paused){
        remoteStream.logger.warn(`尝试恢复音频播放`)
        remoteStream._play.audioDom.play()
      }
      if (remoteStream._play?.videoDom?.paused){
        remoteStream.logger.warn(`尝试恢复视频播放`)
        remoteStream._play.videoDom.play()
      }
      if (remoteStream._play?.screenDom?.paused){
        remoteStream.logger.warn(`尝试恢复屏幕共享播放`)
        remoteStream._play.screenDom.play()
      }
    }
  }
  const localStreams = getParameters().localStreams
  for (let i = 0; i < localStreams.length; i++){
    const localStream = localStreams[i]
    if (localStream.destroyed){
      continue
    }
    if (localStream._play?.audioDom?.paused){
      localStream.logger.warn(`尝试恢复音频播放`)
      localStream._play.audioDom.play()
    }
    if (localStream._play?.videoDom?.paused){
      localStream.logger.warn(`尝试恢复视频播放`)
      localStream._play.videoDom.play()
    }
    if (localStream._play?.screenDom?.paused){
      localStream.logger.warn(`尝试恢复屏幕共享播放`)
      localStream._play.screenDom.play()
    }
  }
  const audioContext = getAudioContext()
  if (audioContext?.state === "suspended"){
    if (clients[0]){
      clients[0].logger.warn(`尝试恢复 AudioContext`)
    }
    audioContext.resume()
  }
}

export const alerter = new Alerter()
