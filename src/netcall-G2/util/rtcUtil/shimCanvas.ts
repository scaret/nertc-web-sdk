import { getParameters } from '../../module/parameters'
import { RTCCanvas } from './rtcCanvas'
import * as env from './rtcEnvironment'

export function canShimCanvas() {
  let result = false
  if (getParameters().shimCanvas === 'never') {
    result = false
  } else if (getParameters().shimCanvas === 'always') {
    result = true
  } else if (getParameters().shimCanvas === 'ios151') {
    if (env.IS_IOS && navigator.userAgent.indexOf(' OS 15_1') > -1) {
      return true
    } else {
      return false
    }
  }
  return result
}

export function shimCanvas(trackInput: MediaStreamTrack) {
  let rtcCanvas = new RTCCanvas('canvas')
  const videoElem = document.createElement('video')
  let canvasElem = rtcCanvas._canvas

  let settings = trackInput.getSettings()
  let frameRate = settings.frameRate || 15
  let ctx = rtcCanvas._ctx

  // 新建一个videoElem
  const ms = new MediaStream([trackInput])
  videoElem.srcObject = ms
  videoElem.setAttribute('playsinline', 'playsinline')
  videoElem.setAttribute('muted', 'muted')
  videoElem.setAttribute('autoplay', 'autoplay')
  videoElem.className = 'nertc-ios-shim'
  videoElem.style.display = 'none'
  videoElem.onresize = () => {
    if (videoElem.videoWidth && videoElem.videoHeight) {
      rtcCanvas.setSize(videoElem.videoWidth, videoElem.videoHeight)
    }
  }
  if (ctx) {
    // @ts-ignore
    const stream = canvasElem.captureStream(frameRate)
    const canvasTrack = stream.getVideoTracks()[0]
    Object.defineProperty(canvasTrack, 'enabled', {
      get() {
        return trackInput.enabled
      },
      set(enabled: boolean) {
        console.warn('Delegate cameraTrack enabled', enabled)
        trackInput.enabled = enabled
      }
    })
    const timer = setInterval(() => {
      if (videoElem.paused) {
        console.log('play')
        videoElem.play()
      } else if (canvasTrack.readyState === 'ended') {
        if (trackInput.readyState === 'live') {
          console.warn('canvasTrack已停止，回收videoTrack中')
          trackInput.stop()
        }
        clearInterval(timer)
        document.body.removeChild(videoElem)
      } else {
        ctx.drawImage(videoElem, 0, 0)
      }
    }, 1000 / frameRate)
    document.body.appendChild(videoElem)
    rtcCanvas.destroy()
    return canvasTrack
  } else {
    throw new Error('Ctx not supported')
  }
}
