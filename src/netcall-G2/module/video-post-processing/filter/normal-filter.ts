import { createAttributeBuffer } from '../gl-utils/buffer-attribute'
import { createFrameBuffer } from '../gl-utils/framebuffer'
import { Program } from '../gl-utils/program'
import { Renderer } from '../gl-utils/renderer'
import { createTexture } from '../gl-utils/texture'
import { baseTextureShader } from '../shaders/base-texture-shader.glsl'
import { Filter } from './filter'

export class NormalFilter extends Filter {
  protected _srcMap: ReturnType<typeof createTexture> = null
  constructor(
    renderer: Renderer,
    map: ReturnType<typeof createTexture>,
    posBuffer: ReturnType<typeof createAttributeBuffer>,
    uvBuffer: ReturnType<typeof createAttributeBuffer>
  ) {
    super(renderer, map, posBuffer, uvBuffer)
    this.initProgram()
  }

  private initProgram() {
    const gl = this.renderer.gl!
    let size = this.renderer.getSize()
    const imgDataProgram = new Program(gl)
    imgDataProgram.setShader(baseTextureShader.vShader, 'VERTEX')
    imgDataProgram.setShader(baseTextureShader.yFlipFShader, 'FRAGMENT')
    imgDataProgram.setAttributeBuffer(this.posBuffer)
    imgDataProgram.setAttributeBuffer(this.uvBuffer)
    const imgDataFramebuffer = createFrameBuffer(gl, size.width, size.height)!
    imgDataProgram.setUniform('map', this._srcMap)
    this.programs.imgData = imgDataProgram
    this.framebuffers.imgData = imgDataFramebuffer

    const program = new Program(gl)
    program.setShader(baseTextureShader.vShader, 'VERTEX')
    program.setShader(baseTextureShader.fShader, 'FRAGMENT')
    program.setAttributeBuffer(this.posBuffer)
    program.setAttributeBuffer(this.uvBuffer)
    program.setUniform('map', this._map)
    this.programs.main = program
  }

  private pixels: Uint8Array | null = null
  getImageData(srcMap: ReturnType<typeof createTexture>) {
    if (srcMap !== this._srcMap) {
      this._srcMap = srcMap
      this.programs.imgData.setUniform('map', this._srcMap)
    }
    if (this._srcMap) {
      this._srcMap.refresh()
    }
    const renderer = this.renderer
    const { width, height } = renderer.getSize()
    const gl = renderer.gl!
    this.framebuffers.imgData.bind()
    renderer.render(this.programs.imgData)
    if (!this.pixels || this.pixels.length !== width * height * 4) {
      this.pixels = new Uint8Array(width * height * 4)
    }
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels)
    this.framebuffers.imgData.bind(true)
    return this.pixels
  }

  get map() {
    return this._map
  }
  set map(map: ReturnType<typeof createTexture>) {
    if (this._map !== map) {
      this._map = map
      this.programs.main.setUniform('map', this._map)
    }
  }

  updateSize() {
    const size = this.renderer.getSize()
    const framebuffer = this.framebuffers.imgData
    if (framebuffer) {
      framebuffer.targetTexture.opts.width = size.width
      framebuffer.targetTexture.opts.height = size.height
      framebuffer.targetTexture.refresh()
    }
  }

  render() {
    const renderer = this.renderer
    const { width, height } = renderer.getSize()
    const gl = renderer.gl!

    renderer.setViewport(0, 0, width, height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    renderer.render(this.programs.main)
  }
}
