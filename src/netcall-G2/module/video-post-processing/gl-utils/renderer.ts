import { Program } from './program'
import { getWebGLContext } from '../../browser-api/getCanvasContext'

/**
 * 渲染器设置项
 * 具体含义参照如下链接
 * https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/getContext
 */
type GlOpts = {
  canvas?: HTMLCanvasElement
  width?: number
  height?: number
  alpha?: boolean
  antialias?: boolean
  depth?: boolean
  powerPreference?: WebGLPowerPreference
  premultipliedAlpha?: boolean
  preserveDrawingBuffer?: boolean
  stencil?: boolean
}

/** webgl 渲染器 */
export class Renderer {
  private _canvas: HTMLCanvasElement
  private _gl: WebGLRenderingContext | null = null
  private _pixelRatio = 1
  private _viewport = { x: 0, y: 0, width: 640, height: 480 }

  constructor(opts?: GlOpts) {
    const {
      canvas = document.createElement('canvas'),
      width = 640,
      height = 480,
      ...ctxOpts
    } = {
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      ...opts
    }
    this._canvas = canvas
    this._gl = getWebGLContext(canvas, ctxOpts) as WebGLRenderingContext | null
    const size = this.setSize(width, height)
    this.setViewport(0, 0, size.width, size.height)

    if (!this._gl) {
      console.error('The current runtime environment does not support webgl.')
    }
  }

  /**
   * @returns {HTMLCanvasElement}
   */
  get canvas() {
    return this._canvas
  }

  /**
   * @returns {WebGLRenderingContext}
   */
  get gl() {
    return this._gl
  }

  /**
   * 获取当前画布的像素比参数
   * @returns {number}
   */
  getPixelRatio() {
    return this._pixelRatio ?? 1
  }

  /**
   * 设置当前画布的像素比参数
   */
  setPixelRatio(pixelRatio: number) {
    const curPR = this.getPixelRatio()
    if (curPR === pixelRatio) return
    const size = this.getSize()
    size.width /= curPR
    size.height /= curPR
    this._pixelRatio = pixelRatio
    this.setSize(size.width, size.height)
  }

  /**
   * 获取实际渲染尺寸
   * @returns {{width: number, height: number}}
   */
  getSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    }
  }

  /**
   * 设置渲染尺寸
   * @param {number} width
   * @param {number} height
   * @param {boolean} updateStyle=false
   * @returns {{width: number, height: number}}
   */
  setSize(width: number, height: number, updateStyle = false) {
    const canvas = this.canvas
    const pixelRatio = this.getPixelRatio()
    canvas.width = width * pixelRatio
    if (updateStyle) canvas.style.width = width + 'px'
    canvas.height = height * pixelRatio
    if (updateStyle) canvas.style.height = height + 'px'
    return this.getSize()
  }

  /**
   * 获取渲染视口参数
   * @returns {{x:number, y: number, width:number, height: number}}
   */
  getViewport() {
    return this._viewport
  }

  /**
   * 设置渲染视口参数
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  setViewport(x: number, y: number, width: number, height: number) {
    this._viewport = { x, y, width, height }
    this.gl?.viewport(x, y, width, height)
  }

  /**
   * 重设与渲染尺寸有关的参数
   * @param {number} width
   * @param {number} height
   * @param {number} pixelRatio
   * @param {{x:number, y: number, width:number, height: number}} viewport
   */
  resize(
    width: number,
    height: number,
    pixelRatio?: number,
    viewport?: { x: number; y: number; width: number; height: number }
  ) {
    const size = this.setSize(width, height)
    if (pixelRatio) this.setPixelRatio(pixelRatio)
    if (viewport) {
      this.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
    } else {
      this.setViewport(0, 0, size.width, size.height)
    }
  }

  /**
   * 渲染对应的 WebglProgram
   * @param {Program} program
   */
  render(program: Program) {
    const gl = this.gl!
    gl.enable(gl.CULL_FACE)
    program?.render()
  }
}
