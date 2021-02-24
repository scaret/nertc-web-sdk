var util = require('./index.js')
var device = {}

device.init = function () {
    // var key = 'nim_web_sdk_deviceId';
    // var deviceId = ls.get(key);
    // if (!deviceId) {
    //     deviceId = util.guid();
    //     ls.set(key, deviceId)
    // }
    // device.deviceId = deviceId;
  device.deviceId = util.guid()
}

device.init()

// 客户端id对应表
device.clientTypeMap = {
  1: 'Android',
  2: 'iOS',
  4: 'PC',
  8: 'WindowsPhone',
  16: 'Web',
  32: 'Server',
  64: 'Mac'
}

device.db = {
  open () {}
}

device.rnfs = null

module.exports = device
