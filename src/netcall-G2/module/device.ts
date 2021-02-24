// 设备状态监听对应的各种操作

let devicesCache = []
let timer = null
// 文档见: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
  throw new Error('your browser not support get media devices, see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices')
}
navigator.mediaDevices.ondevicechange = function (event) {
  // TODO修复
  // if (timer) {
  //   clearTimeout(timer)
  //   timer = null
  // }
  // // 考虑拔掉外接摄像头会触发两次devicechange,一次是video，一次是audio的情况，
  // // 定时器500ms,合并成一次deviceStatus事件
  // let preDevices = Object.assign({}, devicesCache)
  // timer = setTimeout(() => {
  //   timer = null
  //   // 更新设备列表
  //   that.getDevices(true)
  //     .then(() => {
  //       that.emit('deviceStatus', devicesCache)
  //       that.filterDeviceChange(devicesCache, preDevices)
  //     })
  //     .catch(() => {})
  // }, 500)
}

export interface DeviceInfo {
  deviceId: string;
  label: string
}

const Device = {
  async getDevices () {

    let result:{video: DeviceInfo[], audioIn: DeviceInfo[], audioOut: DeviceInfo[]} = {
      video: [],
      audioIn: [],
      audioOut: []
    };
    await navigator.mediaDevices.enumerateDevices().then(function (devices) {
      if (devices.length === 0) {
        return
      }
      devicesCache = devices
      devices.forEach(function (device) {
        if (device.kind === 'videoinput') {
          result.video.push({
            deviceId: device.deviceId,
            label: device.label
              ? device.label
              : 'camera ' + (result.video.length + 1)
          })
        } else if (device.kind === 'audioinput') {
          result.audioIn.push({
            deviceId: device.deviceId,
            label: device.label
              ? device.label
              : 'microphone ' + (result.audioIn.length + 1)
          })
        } else if (device.kind === 'audiooutput') {
          result.audioOut.push({
            deviceId: device.deviceId,
            label: device.label
              ? device.label
              : 'speaker ' + (result.audioOut.length + 1)
          })
        }
      })
    })
    return result
  },

  async getCameras () {
    const result = await this.getDevices()
    if (result) {
      return result['video']
    } else {
      return []
    }
  },

  async getMicrophones () {
    const result = await this.getDevices()
    if (result) {
      return result['audioIn']
    } else {
      return []
    }
  },

  async getSpeakers () {
    const result = await this.getDevices()
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
