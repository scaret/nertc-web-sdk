import { getParameters } from '../../module/parameters'
import { GUMAudioConstraints, ILogger } from '../../types'

export function patchScreenConstraints(constraints: MediaStreamConstraints, logger: ILogger) {
  if (getParameters().screenFocus !== 'default') {
    // Chrome功能，屏幕共享时是否跳转到被共享页面
    try {
      // @ts-ignore
      if (typeof CaptureController !== 'undefined') {
        // @ts-ignore
        const controller = new CaptureController()
        controller.setFocusBehavior(getParameters().screenFocus)
        // @ts-ignore
        constraints.controller = controller
        logger.log('屏幕共享跳转控制：' + getParameters().screenFocus)
      } else {
        logger.log('当前浏览器不支持屏幕共享跳转控制:' + getParameters().screenFocus)
      }
    } catch (e) {
      // console.error(e)
    }
  }
  if (getParameters().screenDisplaySurface !== 'default' && constraints.video) {
    // @ts-ignore
    constraints.video.displaySurface = getParameters().screenDisplaySurface
  }
  if (getParameters().screenSurfaceSwitching !== 'default') {
    // @ts-ignore
    constraints.surfaceSwitching = getParameters().screenSurfaceSwitching
  }
}

export function forceAudioConstraints(constraints: GUMAudioConstraints) {
  if (getParameters().forceAEC !== 'no') {
    constraints.echoCancellation = getParameters().forceAEC === 'on'
    constraints.googEchoCancellation = getParameters().forceAEC === 'on'
    constraints.googEchoCancellation2 = getParameters().forceAEC === 'on'
  }
  if (getParameters().forceANS !== 'no') {
    constraints.noiseSuppression = getParameters().forceANS === 'on'
    constraints.googNoiseSuppression = getParameters().forceANS === 'on'
    constraints.googNoiseSuppression2 = getParameters().forceANS === 'on'
  }
  if (getParameters().forceAGC !== 'no') {
    constraints.autoGainControl = getParameters().forceAGC === 'on'
    constraints.googAutoGainControl = getParameters().forceAGC === 'on'
    constraints.googAutoGainControl2 = getParameters().forceAGC === 'on'
  }
  if (getParameters().forceChannelCount !== -1) {
    constraints.channelCount = getParameters().forceChannelCount
  }
  if (getParameters().forceSampleRate !== -1) {
    // @ts-ignore
    constraints.sampleRate = getParameters().forceSampleRate
  }
  if (getParameters().forceLatency !== -1) {
    // @ts-ignore
    constraints.latency = getParameters().forceLatency
  }
}