import { getParameters } from '../parameters'

export function get2DContext(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings
) {
  if (getParameters().disable2dContext) {
    return null
  } else {
    return canvas.getContext('2d', options)
  }
}

export function getWebGLContext(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
  if (getParameters().disableWebGLContext) {
    return null
  } else {
    return canvas.getContext('webgl', options)
  }
}
