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
    return true
  }
}

export const systemChecker = new SystemChecker()

export function checkSystemRequirements() {
  return systemChecker.checkSystemRequirements()
}
