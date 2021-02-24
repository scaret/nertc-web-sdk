// created by @HenrikJoreteg
// updated by hzzouhuan
// https://github.com/HenrikJoreteg/webrtcsupport

import { Device } from '../../module/device'
import { RtcSystem } from './rtcSystem'
import {platform} from "../platform";

// var version

// 1. getUserMedia
//console.warn(' RtcSystem.browser.ua: ', RtcSystem.browser)
//console.warn('RtcSystem.ios: ', RtcSystem.ios())
var getUserMedia = null
if (RtcSystem.ios() && RtcSystem.browser.ua === 'weixin') {
  //console.warn('是ios端 微信')
} else {
  getUserMedia = (navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia ||
  (navigator.mediaDevices && navigator.mediaDevices.getUserMedia))
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
  window.webkitRTCPeerConnection ||
  (window as any).mozRTCPeerConnection)

// 4. RTCDataChannel
var RTCDataChannel = (window.RTCDataChannel =
  window.RTCDataChannel || (window as any).DataChannel)

// 5. RTCSessionDescription 暂时未用到
// var RTCSessionDescription = (window.RTCSessionDescription =
//   window.RTCSessionDescription || window.mozRTCSessionDescription)

// 6. RTCIceCandidate 暂时未用到
// var RTCIceCandidate = (window.RTCIceCandidate =
//   window.RTCIceCandidate || window.mozRTCIceCandidate)

// 7. MediaStream
var MediaStream = (window.MediaStream =
  window.MediaStream || (window as any).webkitMediaStream)

// 8. video play type
function supportsVideoType (type: string) {
  let video

  // Allow user to create shortcuts, i.e. just "webm"
  let formats: {[index: string]:string} = {
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
    RTCDataChannel &&
    RTCPeerConnection.prototype &&
    RTCPeerConnection.prototype.createDataChannel
  ),
  WebAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
  MediaStream: !!MediaStream
}

function getVersion () {
  let prefix = platform && platform.name
  let version = platform && platform.version
  //console.log('platform', platform)
  //version = version && version.match(/(\d|\.)+/)[0]
  version = version && version.match(/\d+/)[0]
  return {
    prefix,
    version
  }
}

const RtcSupport =  {
  checkWebRtc() {
    return base
  },
  checkWebAudio () {
    return {
      WebAudio: base.WebAudio,
      MediaStream: base.MediaStream
    }
  },
  checkCompatibility () {
    let result = Object.assign(getVersion(), {
      system:
        platform &&
        platform.os.family + ' ' + platform.os.version,
      browser: platform && platform.name,
      version: platform && platform.version
    })

    // 当前屏幕共享写死false
    var screenSharing = false
    // window.location.protocol === 'https:' &&
    // ((/Chrome/gi.test(prefix) && parseInt(version) >= 54) ||
    //   (/Firefox/gi.test(prefix) && parseInt(version) >= 50))

    return new Promise(function (resolve, reject) {
      ;(async () => {
        const tmp:{[index: string]:any} = Object.assign(result, base, {
          ScreenSharing: !!screenSharing
        })
        const devices = await Device.getDevices().catch(e => {
          return resolve(tmp)
        })
        tmp.MicrophoneList = (devices && devices.audioIn) || []
        tmp.CameraList = (devices && devices.video) || []
        tmp.Microphone =
          (devices && devices.audioIn && devices.audioIn.length > 0) || false
        tmp.Camera =
          (devices && devices.video && devices.video.length > 0) || false
        return resolve(tmp)
      })()
    })
  },
  checkVersion () {
    return getVersion()
  }
}

export {
  RtcSupport
}