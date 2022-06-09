import { EventEmitter } from "eventemitter3";
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import {DeviceQueryData, ILogger, Timer} from "../types";
import {Logger} from "../util/webrtcLogger";
import {getParameters} from "./parameters";

export interface DeviceInfo {
  deviceId: string;
  label: string;
  groupId?: string;
}

class DeviceManager extends EventEmitter {
  private deviceChangeDetectionTimer: Timer|null = null;
  public deviceInited = false;
  public hasPerm: {
    audioIn: boolean;
    video: boolean;
    audioOut: boolean;
  } = {audioIn: false, video: false, audioOut: false};
  public deviceHistory :{
    audioIn: DeviceInfo[],
    video: DeviceInfo[],
    audioOut: DeviceInfo[],
  } = {audioIn: [], video: [], audioOut: []};
  private logger: ILogger;
  private handleDeviceChange: ()=>any
  private userGestureUI: HTMLElement|null = null
  public onUserGestureNeeded: ((e: Error)=>any)|null = null
  
  constructor() {
    super();
    this.logger = new Logger({
      tagGen: ()=>{
        let tag = `Device m${this.deviceHistory.audioIn.length}c${this.deviceHistory.video.length}s${this.deviceHistory.audioOut.length}`;
        return tag
      }
    });
    this.handleDeviceChange = this.detectDeviceChange.bind(this);
    this.onUserGestureNeeded = this.defaultHandleUserGestureNeeded.bind(this)
  }
  async getDevices (options: {
    audioinput?: boolean,
    videoinput?: boolean,
    audiooutput?: boolean,
    requestPerm?: boolean,
    groupId?: boolean,
    noFillLabel?: boolean,
  }) {
    if (!navigator.mediaDevices) {
      this.logger.error(`navigator.mediaDevices is ${navigator.mediaDevices}`)
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT,
        message: 'mediaDevices is not support in your browser',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices'
      })
    }else if (!navigator.mediaDevices.enumerateDevices){
      this.logger.error(`navigator.mediaDevices is ${navigator.mediaDevices.enumerateDevices}`)
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT,
        message: 'enumerateDevices is not support in your browser',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices'
      })
    }
    let result:{video: DeviceInfo[], audioIn: DeviceInfo[], audioOut: DeviceInfo[]} = {
      video: [],
      audioIn: [],
      audioOut: []
    };
    let devices = await navigator.mediaDevices.enumerateDevices();
    let mediaStream:MediaStream|null = null;
    if (options.requestPerm){
      // 如果设备列表出现label为空，则说明没有获取音视频权限。
      const requestAudioPerm = devices.find((device)=>{
        return options.audioinput && device.kind == "audioinput" && !device.label;
      })
      const requestVideoPerm = devices.find((device)=>{
        return options.videoinput && device.kind == "videoinput" && !device.label;
      })
      if (requestAudioPerm || requestVideoPerm){
        try{
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: requestAudioPerm,
            video: requestVideoPerm,
          })
        }catch(e){
          this.logger.error(e.name, e.message, e.stack);
        }
      }
    }
    devices = await navigator.mediaDevices.enumerateDevices();
    let compatAudioInputList:string[] = []
    try{
      compatAudioInputList = JSON.parse(localStorage.getItem("compatAudioInputList") || "[]")
    }catch(e){
    }
    devices.forEach(function (device) {
      if (options.videoinput && device.kind === 'videoinput') {
        let deviceInfo:DeviceInfo = {
          deviceId: device.deviceId,
          label: device.label || (options.noFillLabel ? device.label : 'camera ' + (result.video.length + 1))
        }
        if (options.groupId){
          deviceInfo.groupId = device.groupId
        }
        result.video.push(deviceInfo)
      } else if (options.audioinput && device.kind === 'audioinput') {
        let deviceInfo:DeviceInfo = {
          deviceId: device.deviceId,
          label: device.label || (options.noFillLabel ? device.label : 'microphone ' + (result.audioIn.length + 1)),
        }
        if (options.groupId){
          deviceInfo.groupId = device.groupId
        }
        result.audioIn.push(deviceInfo)
        
        if (device.label && compatAudioInputList.indexOf(device.label) !== -1){
          const compatDeviceInfo = Object.assign({}, deviceInfo)
          compatDeviceInfo.deviceId += "?compat=left"
          compatDeviceInfo.label = `【兼容模式】${compatDeviceInfo.label}`
          result.audioIn.push(compatDeviceInfo)
        }
      } else if (options.audiooutput && device.kind === 'audiooutput') {
        let deviceInfo:DeviceInfo = {
          deviceId: device.deviceId,
          label: device.label || (options.noFillLabel ? device.label : 'speaker ' + (result.audioOut.length + 1)),
        }
        if (options.groupId){
          deviceInfo.groupId = device.groupId
        }
        result.audioOut.push(deviceInfo)
      }
      if (mediaStream){
        // 回收设备权限
        mediaStream.getTracks().forEach(track=>{
          track.stop()
        })
      }
    })
    return result
  }
  
  async getCameras (requestPerm?: boolean) {
    const result = await this.getDevices({
      videoinput: true,
      requestPerm,
    })
    if (result) {
      return result['video']
    } else {
      return []
    }
  }

  async getMicrophones (requestPerm?: boolean) {
    const result = await this.getDevices({
      audioinput: true,
      requestPerm,
    })
    if (result) {
      return result['audioIn']
    } else {
      return []
    }
  }

  async getSpeakers (requestPerm?: boolean) {
    const result = await this.getDevices({
      audioinput: true,
      audiooutput: true,
      requestPerm,
    })
    if (result) {
      return result['audioOut']
    } else {
      return []
    }
  }
  
  async detectDeviceChange(){
    let triggers = {
      // recording-device-changed
      audioIn: {
        added: [] as DeviceInfo[],
        changed: [] as DeviceInfo[],
        removed: [] as DeviceInfo[],
      },
      // camera-changed
      video: {
        added: [] as DeviceInfo[],
        changed: [] as DeviceInfo[],
        removed: [] as DeviceInfo[],
      },
      audioOut: {
        // playout-device-changed
        added: [] as DeviceInfo[],
        changed: [] as DeviceInfo[],
        removed: [] as DeviceInfo[],
      },
    }
    const newDeviceRecords = await this.getDevices({
      audioinput: true,
      audiooutput: true,
      videoinput: true,
      requestPerm: false,
      groupId: true,
      noFillLabel: true,
    });
    const deviceTypes:("audioIn"|"video"|"audioOut")[] = ["audioIn", "video", "audioOut"]
    deviceTypes.forEach((deviceType)=>{
      if (!this.deviceInited){
        // 初始化
        this.deviceHistory[deviceType] = newDeviceRecords[deviceType]
      }else{
        const firstPermDevice = newDeviceRecords[deviceType].find((newDevice)=>{
          return newDevice.deviceId && newDevice.label
        })
        if (!firstPermDevice){
          // 没有权限，只能看到空label的设备
          this.deviceHistory[deviceType] = newDeviceRecords[deviceType]
        }else if (!this.hasPerm[deviceType]){
          // 第一次侦测到有设备枚举权限
          this.hasPerm[deviceType] = true
          this.deviceHistory[deviceType] = newDeviceRecords[deviceType]
          if (deviceType === "audioIn"){
            this.logger.log(`麦克风设备：${firstPermDevice.deviceId}【${firstPermDevice.label}】`)
            this.emit(`recording-device-init`)
          }else if (deviceType === "video"){
            this.logger.log(`摄像头设备：【${newDeviceRecords[deviceType].map(device=>device.label).join("】【")}】`)
            this.emit(`camera-init`)
          }else if (deviceType === "audioOut"){
            this.logger.log(`扬声器设备：${firstPermDevice.deviceId}【${firstPermDevice.label}】`)
            this.emit(`playout-device-init`)
          }
        }else{
          newDeviceRecords[deviceType].forEach((newDevice)=>{
            // new & modified
            const oldDevice = this.deviceHistory[deviceType].find((oldDevice)=>{
              return oldDevice.deviceId === newDevice.deviceId || (oldDevice.deviceId === "" && newDevice.deviceId === "default")
            });
            if (!oldDevice){
              this.logger.log(`检测到设备新增：${deviceType}: deviceId ${newDevice.deviceId} 【${newDevice.label}】`)
              triggers[deviceType].added.push(newDevice);
            }
            else if (oldDevice.label !== newDevice.label || oldDevice.groupId !== newDevice.groupId){
              let info = `检测到设备改变：${deviceType}: deviceId ${newDevice.deviceId}`;
              if (oldDevice.label !== newDevice.label){
                info += `【Label ${oldDevice.label} => ${newDevice.label}】`;
              }else{
                info += ` Label ${newDevice.label}`;
              }
              if (oldDevice.groupId !== newDevice.groupId){
                info += `【groupId changed】`;
              }
              this.logger.log(info)
              triggers[deviceType].changed.push(newDevice);
            }
          })
          this.deviceHistory[deviceType].forEach((oldDevice)=>{
            // deleted
            const newDevice = newDeviceRecords[deviceType].find(newDevice=>{
              return oldDevice.deviceId === newDevice.deviceId || (oldDevice.deviceId === "" && newDevice.deviceId === "default")
            });
            if (!newDevice){
              this.logger.log(`检测到设备拔出：${deviceType}: deviceId ${oldDevice.deviceId} 【${oldDevice.label}】`)
              triggers[deviceType].removed.push(oldDevice);
            }
          })
          this.deviceHistory[deviceType] = newDeviceRecords[deviceType];
          triggers[deviceType].added.forEach((device)=>{
            if (deviceType === "audioIn"){
              // 对齐声网
              this.emit(`recording-device-changed`, {device, state: "ACTIVE"})
            }else if (deviceType === "video"){
              this.emit(`camera-changed`, {device, state: "ACTIVE"})
            }else if (deviceType === "audioOut"){
              this.emit(`playout-device-changed`, {device, state: "ACTIVE"})
            }
          })
          triggers[deviceType].changed.forEach((device)=>{
            if (deviceType === "audioIn"){
              // 对齐声网
              this.emit(`recording-device-changed`, {device, state: "CHANGED"})
            }else if (deviceType === "video"){
              this.emit(`camera-changed`, {device, state: "CHANGED"})
            }else if (deviceType === "audioOut"){
              this.emit(`playout-device-changed`, {device, state: "CHANGED"})
            }
          })
          triggers[deviceType].removed.forEach((device)=>{
            if (deviceType === "audioIn"){
              // 对齐声网
              this.emit(`recording-device-changed`, {device, state: "INACTIVE"})
            }else if (deviceType === "video"){
              this.emit(`camera-changed`, {device, state: "INACTIVE"})
            }else if (deviceType === "audioOut"){
              this.emit(`playout-device-changed`, {device, state: "INACTIVE"})
            }
          })
        }
      }
    })
    if(!this.deviceInited){
      this.deviceInited = true;
      if (!newDeviceRecords.audioIn.length){
        this.logger.error("未侦测到可用麦克风")
      }
      if (!newDeviceRecords.video.length){
        this.logger.error("未侦测到可用摄像头")
      }
    }
  }
  
  async startDeviceChangeDetection(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
      this.logger.warn(`当前环境不支持设备枚举`)
      return;
    }
    
    if (this.deviceChangeDetectionTimer){
      clearInterval(this.deviceChangeDetectionTimer);
    }
    // 如果第一次更新设备列表错误，则直接退出
    await this.handleDeviceChange();
    if (navigator.mediaDevices.ondevicechange){
      if (navigator.mediaDevices.ondevicechange === this.handleDeviceChange){
        // continue
      }else if(getParameters().forceListenDeviceChange){
        navigator.mediaDevices.ondevicechange = this.handleDeviceChange;
      }else{
        this.logger.warn(`系统设备枚举回调已被占用，设备枚举实效性将受到影响`)
      }
    }else{
      navigator.mediaDevices.ondevicechange = this.handleDeviceChange;
    }
    this.deviceChangeDetectionTimer = setInterval(this.handleDeviceChange, 1000);
  }

  stopDeviceChangeDetection(){
    this.logger.log("停止监听浏览器设备变化");
    if (this.deviceChangeDetectionTimer){
      clearInterval(this.deviceChangeDetectionTimer);
      this.deviceChangeDetectionTimer = null;
    }
    if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange){
      navigator.mediaDevices.ondevicechange = null;
    }
    this.deviceInited = false;
    this.deviceHistory.audioIn = [];
    this.deviceHistory.audioOut = [];
    this.deviceHistory.video = [];
    this.hasPerm.audioIn = false;
    this.hasPerm.video = false;
    this.hasPerm.audioOut = false;
  }

  defaultHandleUserGestureNeeded(e: {name: string, message: string}){
    if (!this.userGestureUI){
      this.userGestureUI = document.createElement("div")
      this.userGestureUI.style.fontSize = "20px";
      this.userGestureUI.style.position = "fixed";
      this.userGestureUI.style.background = "yellow";
      this.userGestureUI.style.margin = "auto";
      this.userGestureUI.style.width = "100%";
      this.userGestureUI.style.zIndex = "9999";
      this.userGestureUI.style.top = "0";
      this.userGestureUI.onclick = ()=>{
        if (this.userGestureUI){
          this.userGestureUI.parentNode?.removeChild(this.userGestureUI)
        }
        this.emit("user-gesture-fired")
      }
    }
    this.userGestureUI.style.display = "block";
    this.userGestureUI.innerHTML = `由于浏览器限制，该操作需手势触发。<br/>点击此处以继续<br/>详细信息：${e.name}<br/>${e.message}`
    document.body.appendChild(this.userGestureUI)
  }
  
  parseDeviceId(deviceIdQueryString:string){
    const questionIndex = deviceIdQueryString.indexOf("?")
    if (questionIndex > -1){
      const data:DeviceQueryData = {
        deviceId: deviceIdQueryString.slice(0, questionIndex)
      }
      const query = deviceIdQueryString.slice(questionIndex + 1)
      const vars = query.split('&');
      for (let i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        data[pair[0]] = pair[1]
      }
      return data
    }else{
      return {
        deviceId: deviceIdQueryString
      }
    }
  }
  
  stringifyDeviceId(deviceQueryData: DeviceQueryData){
    let query = ""
    for (let key in deviceQueryData){
      if (key !== "deviceId"){
        if (query) {
          query += `&`
        }else{
          query += `?`
        }
        query += `${key}=${deviceQueryData[key]}`
      }
    }
    return `${deviceQueryData.deviceId}${query}`
  }

  clean() {
    
  }
}

const Device = new DeviceManager()

export {Device}
