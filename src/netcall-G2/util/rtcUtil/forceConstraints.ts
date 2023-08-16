import { getParameters } from '../../module/parameters'
import { AudioProcessingConstraintKeys, GUMAudioConstraints, ILogger } from '../../types'
import ErrorCode from '../../util/error/errorCode'
import RtcError from '../../util/error/rtcError'

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
  if (getParameters().screenPreferCurrentTab) {
    // @ts-ignore
    constraints.preferCurrentTab = getParameters().screenPreferCurrentTab
  }
  if (getParameters().screenSelfBrowserSurface !== 'default') {
    // @ts-ignore
    constraints.selfBrowserSurface = getParameters().screenSelfBrowserSurface
  }
  // @ts-ignore
  if (constraints.preferCurrentTab && constraints.selfBrowserSurface === 'exclude') {
    logger.log(
      `屏幕共享参数 preferCurrentTab: true 和 selfBrowserSurface: 'exclude' 互斥，不能同时存在`
    )
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER_ERROR,
      message: `screenShare: preferCurrentTab: true 和 selfBrowserSurface: 'exclude' 互斥，不能同时存在`
    })
  }
}
export function set3AConstraint(constraints: any, key: AudioProcessingConstraintKeys, value: any) {
  if (constraints && typeof value === 'boolean') {
    switch (key) {
      case 'AEC':
        constraints.echoCancellation = value
        constraints.googEchoCancellation = value
        constraints.googEchoCancellation2 = value
        break
      case 'ANS':
        constraints.noiseSuppression = value
        constraints.googNoiseSuppression = value
        constraints.googNoiseSuppression2 = value
        break
      case 'AGC':
        constraints.autoGainControl = value
        constraints.googAutoGainControl = value
        constraints.googAutoGainControl2 = value
    }
  }
}

export function forceAudioConstraints(constraints: GUMAudioConstraints) {
  if (getParameters().forceAEC !== 'no') {
    set3AConstraint(constraints, 'AEC', getParameters().forceAEC === 'on')
  }
  if (getParameters().forceANS !== 'no') {
    set3AConstraint(constraints, 'ANS', getParameters().forceANS === 'on')
  }
  if (getParameters().forceAGC !== 'no') {
    set3AConstraint(constraints, 'AGC', getParameters().forceAGC === 'on')
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
