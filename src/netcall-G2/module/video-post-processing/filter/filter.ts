import { EventEmitter } from 'eventemitter3'
import { createAttributeBuffer } from '../gl-utils/buffer-attribute'
import { createFrameBuffer } from '../gl-utils/framebuffer'
import { Program } from '../gl-utils/program'
import { Renderer } from '../gl-utils/renderer'
import { createTexture } from '../gl-utils/texture'

/** 后期处理各 filter 的父类 */
export class Filter extends EventEmitter {
  protected renderer: Renderer
  protected _map: ReturnType<typeof createTexture>
  protected posBuffer: ReturnType<typeof createAttributeBuffer>
  protected uvBuffer: ReturnType<typeof createAttributeBuffer>
  /** 存储当前 filter 涉及到的着色器程序 */
  programs: { [key: string]: Program } = {}

  /** 存储当前 filter 渲染过程中产生的图像缓存（中间结果） */
  framebuffers: {
    [key: string]: NonNullable<ReturnType<typeof createFrameBuffer>>
  } = {}

  constructor(
    renderer: Renderer,
    map: ReturnType<typeof createTexture>,
    posBuffer: ReturnType<typeof createAttributeBuffer>,
    uvBuffer: ReturnType<typeof createAttributeBuffer>
  ) {
    super()
    this.renderer = renderer
    this._map = map
    this.posBuffer = posBuffer
    this.uvBuffer = uvBuffer
  }

  /**
   * 当前 filter 的输入源
   */
  get map() {
    return this._map
  }
  set map(map: ReturnType<typeof createTexture>) {}

  /**
   * 当前 filter 的最终结果
   */
  get output() {
    return this._map
  }

  /**
   * 渲染尺寸更改时会调用该方法，进而确保渲染结果的正确
   */
  updateSize() {}

  /**
   * 轮到当前 filter 渲染时会调用该方法
   */
  render() {}

  /**
   * 当前 filter 被销毁时会调用该方法，释放跟 GPU 相关的各类资源
   */
  destroy(clearBuffer = true) {
    this.removeAllListeners()
    const gl = this.renderer.gl
    const framebuffers = this.framebuffers
    const programs = this.programs

    for (const key in framebuffers) {
      const framebuffer = framebuffers[key]
      framebuffer.bind(true)
      gl?.deleteTexture(framebuffer.targetTexture.glTexture)
      gl?.deleteFramebuffer(framebuffer.framebuffer)
    }
    for (const key in programs) {
      const program = programs[key]
      program.destroy(clearBuffer)
    }
  }
}
