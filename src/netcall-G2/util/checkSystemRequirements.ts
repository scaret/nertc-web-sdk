class SystemChecker {
  checkCnt = 0
  checkSystemRequirements() {
    this.checkCnt++
    const PC =
      window.RTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      (window as any).webkitRTCPeerConnection
    if (!PC) {
      console.warn(`checkSystemRequirements: 没有 RTCPeerConnection 对象。`)
      return false
    } else {
      if (
        !PC.prototype.getSenders ||
        !PC.prototype.addTransceiver ||
        !PC.prototype.getTransceivers
      ) {
        // 支持58+ 版本
        if (!PC.prototype.addStream) {
          console.warn(`checkSystemRequirements: RTCPeerConnection不符合sdk要求`)
          return false
        }
      }
    }
    //getUserMedia对于拉流没有影响，不应该作为限制条件
    // let getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    // if (!getUserMedia) {
    //   console.warn(`checkSystemRequirements: 没有 getUserMedia 方法。请检查https是否启用。`)
    //   return false
    // }
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
