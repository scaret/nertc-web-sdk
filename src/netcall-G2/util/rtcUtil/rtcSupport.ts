// created by @HenrikJoreteg
// updated by hzzouhuan
// https://github.com/HenrikJoreteg/webrtcsupport

import { Device } from '../../module/device'
import { getSupportedCodecs } from './codec'
import * as env from './rtcEnvironment'
import { getBrowserInfo, getOSInfo } from './rtcPlatform'

// default check result
let checkResult = {
  result: false,
  detail: {
    isBrowserSupported: false,
    isWebRTCSupported: false,
    isMediaDevicesSupported: false,
    isH264EncodeSupported: false,
    isVp8EncodeSupported: false,
    isH264DecodeSupported: false,
    isVp8DecodeSupported: false
  }
}

// 1. getUserMedia
var getUserMedia = null
if (env.IS_IOS && env.IS_WECHAT) {
  //console.warn('是ios端 微信')
} else {
  getUserMedia = navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia ||
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

// 2. AudioContext
// @ts-ignore
var AudioContext = (window.AudioContext =
  window.AudioContext ||
  (window as any).webkitAudioContext ||
  (window as any).mozAudioContext ||
  (window as any).msAudioContext)

// 3. RTCPeerConnection
var RTCPeerConnection = (window.RTCPeerConnection =
  window.RTCPeerConnection ||
  //@ts-ignore
  window.webkitRTCPeerConnection ||
  (window as any).mozRTCPeerConnection)

// 5. RTCSessionDescription 暂时未用到
// var RTCSessionDescription = (window.RTCSessionDescription =
//   window.RTCSessionDescription || window.mozRTCSessionDescription)

// 6. RTCIceCandidate 暂时未用到
// var RTCIceCandidate = (window.RTCIceCandidate =
//   window.RTCIceCandidate || window.mozRTCIceCandidate)

// 7. MediaStream
var MediaStream = (window.MediaStream = window.MediaStream || (window as any).webkitMediaStream)

// 8. video play type
function supportsVideoType(type: string) {
  let video

  // Allow user to create shortcuts, i.e. just "webm"
  let formats: { [index: string]: string } = {
    ogg: 'video/ogg; codecs="theora"',
    h264: 'video/mp4; codecs="avc1.42E01E"',
    webm: 'video/webm; codecs="vp8, vorbis"',
    vp9: 'video/webm; codecs="vp9"',
    hls: 'application/x-mpegURL; codecs="avc1.42E01E"'
  }

  if (!video) {
    video = document.createElement('video')
  }

  return !!video.canPlayType(formats[type] || type)
}

const base = {
  WebRTC: !!RTCPeerConnection && !!MediaStream,
  RTCPeerConnection: !!RTCPeerConnection,
  Vp8: supportsVideoType('webm'),
  Vp9: supportsVideoType('vp9'),
  H264: supportsVideoType('h264'),
  GetUserMedia: !!getUserMedia && !!navigator.mediaDevices,
  DataChannel: !!(
    RTCPeerConnection &&
    typeof RTCDataChannel !== 'undefined' &&
    RTCPeerConnection.prototype &&
    RTCPeerConnection.prototype.createDataChannel
  ),
  WebAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
  MediaStream: !!MediaStream
}

function getVersion() {
  let prefix = getBrowserInfo().browserName
  let version = getBrowserInfo().browserVersion
  //version = version && version.match(/(\d|\.)+/)[0]
  //@ts-ignore
  version = version && version.match(/\d+/)[0]
  return {
    prefix,
    version
  }
}

const RtcSupport = {
  checkWebRtc() {
    return base
  },
  checkWebAudio() {
    return {
      WebAudio: base.WebAudio,
      MediaStream: base.MediaStream
    }
  },
  checkCompatibility() {
    let result = Object.assign(getVersion(), {
      system: getOSInfo().osName + ' ' + getOSInfo().osVersion,
      browser: getBrowserInfo().browserName,
      version: getBrowserInfo().browserVersion
    })

    // 当前屏幕共享写死false
    var screenSharing = false
    // window.location.protocol === 'https:' &&
    // ((/Chrome/gi.test(prefix) && parseInt(version) >= 54) ||
    //   (/Firefox/gi.test(prefix) && parseInt(version) >= 50))

    return new Promise(function (resolve, reject) {
      ;(async () => {
        const tmp: { [index: string]: any } = Object.assign(result, base, {
          ScreenSharing: !!screenSharing
        })
        const devices = await Device.getDevices({
          audiooutput: true,
          audioinput: true,
          videoinput: true,
          requestPerm: true
        }).catch((e) => {
          return resolve(tmp)
        })
        tmp.MicrophoneList = (devices && devices.audioIn) || []
        tmp.CameraList = (devices && devices.video) || []
        tmp.Microphone = (devices && devices.audioIn && devices.audioIn.length > 0) || false
        tmp.Camera = (devices && devices.video && devices.video.length > 0) || false
        return resolve(tmp)
      })()
    })
  },
  checkVersion() {
    return getVersion()
  }
}

export { RtcSupport }

export const isWebRTCSupported = function () {
  const apiList = ['RTCPeerConnection', 'webkitRTCPeerConnection', 'RTCIceGatherer']
  return apiList.filter((api) => api in window).length > 0
}

export const isMediaDevicesSupported = function () {
  if (!navigator.mediaDevices) {
    return false
  }
  const apiList = ['getUserMedia', 'enumerateDevices']
  return apiList.filter((api) => api in navigator.mediaDevices).length === apiList.length
}

export const isScreenShareSupport = function () {
  if (env.IS_ELECTRON) {
    return true
  } else {
    let mediaDevices = navigator.mediaDevices as any
    return !!(mediaDevices && mediaDevices.getDisplayMedia)
  }
}

// 支持 chrome 72+ 浏览器. 桌面版 safari 12+ 浏览器, 移动端 safari 13+ 浏览器. firefox 浏览器(M66+), edge浏览器(M80+), 微信内嵌网页、ios端 qq 浏览器、安卓 qq 浏览器(chrome 内核)
export const isBrowserSupported = function () {
  const MIN_FIREFOX_VERSION = 66
  const MIN_EDG_VERSION = 80
  const MIN_CHROME_VERSION = 72
  const MIN_MAC_SAFARI_VERSION = 12
  const MIN_IOS_SAFARI_VERSION = 13
  const MIN_IOS_WECHAT_VERSION = 6.5
  const MIN_IOS_WECHAT_PULL_PUSH_VERSION = 14.3

  if (env.IS_CHROME && (env.CHROME_MAJOR_VERSION as any) >= MIN_CHROME_VERSION) {
    return true
  } else if (env.IS_MAC_SAFARI && (env.SAFARI_MAJOR_VERSION as any) >= MIN_MAC_SAFARI_VERSION) {
    return true
  } else if (
    env.IS_IOS_SAFARI &&
    (env.SAFARI_MAJOR_VERSION as any) >= MIN_IOS_SAFARI_VERSION &&
    !env.IS_WECHAT
  ) {
    return true
  } else if (env.IS_EDG && (env.EDG_MAJOR_VERSION as any) >= MIN_EDG_VERSION) {
    return true
  } else if (env.IS_FIREFOX && (env.FIREFOX_MAJOR_VERSION as any) >= MIN_FIREFOX_VERSION) {
    return true
  } else if (env.IS_IOS && env.IS_MQQB) {
    // ios qq
    return true
  } else if (
    env.IS_IOS &&
    env.IOS_VERSION &&
    parseFloat(env.IOS_VERSION) >= MIN_IOS_WECHAT_PULL_PUSH_VERSION &&
    env.IS_WECHAT &&
    env.WECHAT_VERSION &&
    parseFloat(env.WECHAT_VERSION) >= MIN_IOS_WECHAT_VERSION
  ) {
    // ios 14.3+ && wechat 6.5+
    return true
  } else if (env.IS_ANDROID && (env.IS_TBS || env.IS_XWEB)) {
    // android wechat TBS & XWEB
    return true
  } else {
    return false
  }
}

// compatibility check
export const checkRTCCompatibility = async function () {
  // check cached result
  if (checkResult.result) {
    return checkResult
  }

  // TODO: check blacklists of browser
  const isBrowserSupport = isBrowserSupported()
  // check WebRTC Api
  const isWebRTCSupport = isWebRTCSupported()
  // check media api
  const isMediaDevicesSupport = isMediaDevicesSupported()
  // check encode
  const encode = (await getSupportedCodecs('send')) as any
  // check decode
  const decode = (await getSupportedCodecs('recv')) as any

  checkResult.detail.isBrowserSupported = isBrowserSupport
  checkResult.detail.isWebRTCSupported = isWebRTCSupport
  checkResult.detail.isMediaDevicesSupported = isMediaDevicesSupport
  checkResult.detail.isH264EncodeSupported = encode.video.indexOf('H264') > -1
  checkResult.detail.isVp8EncodeSupported = encode.video.indexOf('VP8') > -1
  checkResult.detail.isH264DecodeSupported = decode.video.indexOf('H264') > -1
  checkResult.detail.isVp8DecodeSupported = decode.video.indexOf('VP8') > -1

  checkResult.result =
    isBrowserSupport &&
    isWebRTCSupport &&
    isMediaDevicesSupport &&
    (checkResult.detail.isH264EncodeSupported || checkResult.detail.isVp8EncodeSupported) &&
    (checkResult.detail.isH264EncodeSupported || checkResult.detail.isVp8EncodeSupported)

  return checkResult
}
// 是否本地环境 file, localhost, ip 地址
const IS_LOCAL =
  location.protocol === 'file:' ||
  location.hostname === 'localhost' ||
  /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)

export const isHttpProtocol = function () {
  if (location.protocol === 'http:' && !IS_LOCAL) {
    return true
  }
  return false
}
