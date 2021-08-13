import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
// 设备状态监听对应的各种操作

let devicesCache = []
let timer = null

export interface DeviceInfo {
  deviceId: string;
  label: string
}
/*navigator.mediaDevices.ondevicechange = function (event) {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  // 考虑拔掉外接摄像头会触发两次devicechange,一次是video，一次是audio的情况，
  // 定时器500ms,合并成一次deviceStatus事件
  let preDevices = Object.assign({}, devicesCache)
  timer = setTimeout(() => {
    timer = null
    // 更新设备列表
    that.getDevices(true)
      .then(() => {
        that.emit('deviceStatus', devicesCache)
        that.filterDeviceChange(devicesCache, preDevices)
      })
      .catch(() => {})
  }, 500)
}*/

const Device = {
  async getDevices (options: {
    audioinput?: boolean,
    videoinput?: boolean,
    audiooutput?: boolean,
    requestPerm?: boolean,
  }) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT,
        message: 'mediaDevices is not support in your browser',
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
          console.error(e);
        }
      }
    }
    devices = await navigator.mediaDevices.enumerateDevices();
    devicesCache = devices
    devices.forEach(function (device) {
      if (options.videoinput && device.kind === 'videoinput') {
        result.video.push({
          deviceId: device.deviceId,
          label: device.label
            ? device.label
            : 'camera ' + (result.video.length + 1)
        })
      } else if (options.audioinput && device.kind === 'audioinput') {
        result.audioIn.push({
          deviceId: device.deviceId,
          label: device.label
            ? device.label
            : 'microphone ' + (result.audioIn.length + 1)
        })
      } else if (options.audiooutput && device.kind === 'audiooutput') {
        result.audioOut.push({
          deviceId: device.deviceId,
          label: device.label
            ? device.label
            : 'speaker ' + (result.audioOut.length + 1)
        })
      }
      if (mediaStream){
        // 回收设备权限
        mediaStream.getTracks().forEach(track=>{
          track.stop()
        })
      }
    })
    return result
  },

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
  },

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
  },

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
  },

  clean() {

  }
}

export {Device}
