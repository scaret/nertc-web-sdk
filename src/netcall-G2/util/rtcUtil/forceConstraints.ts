import { getParameters } from '../../module/parameters'
import { ILogger } from '../../types'

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
