import { isBrowserSupported } from './rtcUtil/rtcSupport'

class SystemChecker {
  checkCnt = 0
  checkSystemRequirements() {
    this.checkCnt++
    let PC =
      window.RTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      (window as any).webkitRTCPeerConnection
    if (!PC) {
      console.warn(`checkSystemRequirements: 没有 RTCPeerConnection 对象。`)
      return false
    }
    let getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    if (!getUserMedia) {
      console.warn(`checkSystemRequirements: 没有 getUserMedia 方法。请检查https是否启用。`)
      return false
    }
    if (!window.WebSocket) {
      console.warn(`checkSystemRequirements: 没有 WebSocket 对象。`)
      return false
    }
    if (!isBrowserSupported()) {
      console.warn(
        `checkSystemRequirements: 不支持的浏览器。当前的 UserAgent为 ${navigator.userAgent}`
      )
      return false
    }
    return true
  }
}

export const systemChecker = new SystemChecker()

export function checkSystemRequirements() {
  return systemChecker.checkSystemRequirements()
}
