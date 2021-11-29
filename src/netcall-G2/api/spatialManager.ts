// https://xie.infoq.cn/article/9f4f2fab8d9c6427b099b358d
import {Client, ILogger, MediaTypeShort, SpatialInitOptions} from "../types";
import {RemoteStream} from "./remoteStream";
import {LocalStream} from "./localStream";
import * as stream from "stream";
import {Device} from "../module/device";

export interface PannerManagerOptions{
  client: Client;
  context: AudioContext;
  options: SpatialInitOptions;
}

export class SpatialManager {
  client: Client;
  context: AudioContext;
  destination: MediaStreamAudioDestinationNode;
  elem: HTMLAudioElement = document.createElement("audio");
  fakeElem: HTMLAudioElement = document.createElement("audio");
  data: {
    [uid:string]: {
      audioNodes?: {
        source: AudioNode,
        gainNode: GainNode,
        pannerNode: PannerNode,
      }
      position: {
        x: number,
        y: number,
      }
    }
  } = {}
  private logger: ILogger;
  private options: SpatialInitOptions;
  
  constructor(options: PannerManagerOptions) {
    this.context = options.context;
    this.client = options.client;
    this.options = options.options;
    this.logger = options.client.adapterRef.logger.getChild(()=>{
      const tag = "spatial";
      return tag;
    })
    
    try{
      this.destination = new MediaStreamAudioDestinationNode(this.context);
    }catch(e){
      if (e.name === "TypeError"){
        this.destination = this.context.createMediaStreamDestination();
      }else{
        throw e;
      }
    }
    this.elem.setAttribute("playsinline", "playsinline");
    this.elem.setAttribute("autoplay", "autoplay");
    this.elem.className = "nertc-panner-manager";
    this.elem.srcObject = this.destination.stream;
    
    this.fakeElem.muted = true
    this.fakeElem.volume = 0
    this.fakeElem.autoplay = true
    this.fakeElem.controls = true
    // this.context.listener.positionX.value = 1;
    // this.context.listener.positionY.value = 0;
    // this.context.listener.positionZ.value = 0;
  }
  
  getUserData(uid: string|number){
    const stringUid = "" + uid;
    if ("" + parseInt(stringUid) !== stringUid){
      this.logger.warn("getUserData:异常的uid：", uid);
    }
    let remote = this.data[stringUid];
    if (!remote){
      remote = {
        position: {
          x: 0,
          y: 0,
        }
      }
      this.data[stringUid] = remote
    }
    return remote
  }
  
  shouldSubscribe(uid: string|number) : boolean{
    const remote = this.getUserData(uid);
    // 给定一个uid，判断是否应该订阅
    if (Math.abs(remote.position.x) <= 64 && Math.abs(remote.position.y) <= 64){
      // 64x64以内subscribe
      return true;
    }else{
      return false;
    }
  }

  async updatePosition(uid: string|number, position: {x: number, y: number}){
    // 只要有uid就可以更新，可以先于remoteStream到达
    const remote = this.getUserData(uid);
    const remoteStream = this.client.adapterRef.remoteStreamMap[uid];
    if (!remoteStream){
      this.logger.log(`updatePosition: 更新未到的stream: ${uid} ( ${position.x}, ${position.y})`);
      remote.position.x = position.x
      remote.position.y = position.y
    }else{
      if (this.shouldSubscribe(uid)) {
        if (this.client.getSubStatus(remoteStream) === "subscribing"){
          // 界内+订阅中，仅更新位置
          if (remote.position.x === position.x && remote.position.y === position.y){
            return;
          }
          this.logger.log(`[订阅中 ${uid}]更新remoteStream位置: (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          if (remote.audioNodes) {
            remote.audioNodes.pannerNode.positionX.value = position.x;
            remote.audioNodes.pannerNode.positionY.value = position.y;
          }
        }else if (this.client.getSubStatus(remoteStream) === "unsubscribing"){
          // 界内+取消订阅中，仅更新位置
          if (remote.position.x === position.x && remote.position.y === position.y){
            return;
          }
          this.logger.log(`[取消订阅中 ${uid}]更新remoteStream位置: (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          if (remote.audioNodes) {
            remote.audioNodes.pannerNode.positionX.value = position.x;
            remote.audioNodes.pannerNode.positionY.value = position.y;
          }
        }else if (this.client.getSubStatus(remoteStream) === "subscribed"){
          // 界内+已订阅，仅更新位置
          if (remote.position.x === position.x && remote.position.y === position.y){
            return;
          }
          this.logger.log(`[已订阅 ${uid}]更新remoteStream位置: (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          if (remote.audioNodes) {
            remote.audioNodes.pannerNode.positionX.value = position.x;
            remote.audioNodes.pannerNode.positionY.value = position.y;
          }
        }else{
          // 界内+未订阅，订阅
          this.logger.log(`[未订阅 ${uid}]remoteStream位置界内，订阅: (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          await this.client.doSubscribe(remoteStream);
          this.updatePosition(uid, remote.position)
        }
      }else{
        if (this.client.getSubStatus(remoteStream) === "subscribing"){
          // 界外+订阅中，仅更新位置
          if (remote.position.x === position.x && remote.position.y === position.y){
            return;
          }
          this.logger.log(`[订阅中 ${uid}]更新remoteStream位置:  (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          if (remote.audioNodes) {
            remote.audioNodes.pannerNode.positionX.value = position.x;
            remote.audioNodes.pannerNode.positionY.value = position.y;
          }
        } else if (this.client.getSubStatus(remoteStream) === "unsubscribing"){
          // 界外+取消订阅中，仅更新位置
          if (remote.position.x === position.x && remote.position.y === position.y){
            return;
          }
          this.logger.log(`[取消订阅中 ${uid}]更新remoteStream位置:  (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          if (remote.audioNodes) {
            remote.audioNodes.pannerNode.positionX.value = position.x;
            remote.audioNodes.pannerNode.positionY.value = position.y;
          }
        }else if (this.client.getSubStatus(remoteStream) === "subscribed"){
          // 界外+已订阅，取消订阅
          this.logger.log(`[已订阅 ${uid}]remoteStream位置出界，取消订阅:  (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          await this.client.doUnsubscribe(remoteStream);
          this.updatePosition(uid, remote.position)
        }else{
          // 界外+未订阅，仅更新位置
          this.logger.log(`[未订阅 ${uid}]更新remoteStream位置: (${remote.position.x}, ${remote.position.y}) => (${position.x}, ${position.y})`);
          remote.position.x = position.x
          remote.position.y = position.y
          if (remote.audioNodes) {
            remote.audioNodes.pannerNode.positionX.value = position.x;
            remote.audioNodes.pannerNode.positionY.value = position.y;
          }
        }
      }
    }
  }
  init(){
    this.client.on("stream-added", (evt: { stream: RemoteStream, mediaType: MediaTypeShort })=>{
      const remote = this.getUserData(evt.stream.getId());
      evt.stream.setSubscribeConfig(this.options.subConfig);
      this.updatePosition(evt.stream.getId(), remote.position)
    })
    this.client.on("stream-unsubscribed", (evt: { stream: RemoteStream, mediaType: MediaTypeShort })=>{
      const remote = this.getUserData(evt.stream.getId());
      this.updatePosition(evt.stream.getId(), remote.position)
    })
    this.client.on("stream-subscribed", async (evt: {stream: RemoteStream, mediaType: MediaTypeShort})=>{
      this.logger.log("Subscribed to", evt.stream.streamID, evt.mediaType);
      const remote = this.getUserData(evt.stream.getId());
      if (evt.mediaType === "audio"){
        if (remote.audioNodes){
          remote.audioNodes.pannerNode.disconnect()
          remote.audioNodes.source.disconnect()
          remote.audioNodes.gainNode.disconnect()
        }
        remote.audioNodes = {
          source: this.context.createMediaStreamSource(evt.stream.mediaHelper.audio.audioStream),
          gainNode: this.context.createGain(),
          pannerNode: new PannerNode(this.context, {
            panningModel: "HRTF",  // 音频空间化算法模型
            distanceModel: "linear",  // 远离时的音量衰减算法
            rolloffFactor: 1,  // 衰减速度
            coneInnerAngle: 360, // 声音 360 度扩散
            positionX: remote.position.x,
            positionY: remote.position.y,
            positionZ: 0,
            maxDistance: 100,
          })
        }
        remote.audioNodes.source.connect(remote.audioNodes.gainNode)
        remote.audioNodes.gainNode.connect(remote.audioNodes.pannerNode)
        remote.audioNodes.pannerNode.connect(this.destination)
        this.fakeElem.srcObject = evt.stream.mediaHelper.audio.audioStream;
        this.fakeElem.play().catch((e)=>{
          if (Device.onUserGestureNeeded){
            Device.onUserGestureNeeded(e);
            Device.once('user-gesture-fired', ()=>{
              this.fakeElem.play()
            })
          }
        });
        this.logger.log("Connected", evt.stream.getId, evt.stream.mediaHelper.audio.audioStream.getAudioTracks()[0])
      }
      this.updatePosition(evt.stream.getId(), remote.position)
    });
  }
  play(){
    console.error("play")
    this.elem.controls = true;
    document.body.appendChild(this.elem);
    document.body.appendChild(this.fakeElem);
    if (this.context.state === "suspended"){
      if (Device.onUserGestureNeeded){
        Device.onUserGestureNeeded(new Error("恢复AudioContext"));
        Device.once('user-gesture-fired', ()=>{
          this.context.resume()
        })
      }
    }
    this.elem.play().catch((e)=>{
      if (Device.onUserGestureNeeded){
        Device.onUserGestureNeeded(e);
        Device.once('user-gesture-fired', ()=>{
          this.elem.play()
        })
      }
    });
  }
}