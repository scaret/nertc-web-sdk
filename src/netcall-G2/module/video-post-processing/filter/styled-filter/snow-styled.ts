import { createAttributeBuffer } from '../../gl-utils/buffer-attribute'
import { createFrameBuffer } from '../../gl-utils/framebuffer'
import { Program } from '../../gl-utils/program'
import { Renderer } from '../../gl-utils/renderer'
import { createTexture, loadImage } from '../../gl-utils/texture'
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl'
import { lutShader } from '../../shaders/lut-shader.glsl'
import { snowShader } from '../../shaders/snow-shader.glsl'
import { StyledFilter } from './styled-filter'

const instances = new Set<SnowStyled>()
let snowImg: HTMLImageElement | null = null
loadImage(
  'https://yx-web-nosdn.netease.im/common/09bf9341d5b50e3b10c49e0c55fd184e/snow.png',
  (img) => {
    snowImg = img
    instances.forEach((instance) => {
      instance.snowMap!.source = img
      instance.snowMap!.refresh()
    })
  }
)
export class SnowStyled extends StyledFilter {
  snowMap: ReturnType<typeof createTexture> = null
  constructor(
    renderer: Renderer,
    map: ReturnType<typeof createTexture>,
    posBuffer: ReturnType<typeof createAttributeBuffer>,
    uvBuffer: ReturnType<typeof createAttributeBuffer>
  ) {
    super(renderer, map, posBuffer, uvBuffer)
    instances.add(this)
    this.initStyled()
  }

  private initStyled() {
    const gl = this.renderer.gl!
    const size = this.renderer.getSize()

    this.snowMap = createTexture(gl, snowImg, { flipY: false })

    const snowProgram = new Program(gl)
    snowProgram.setShader(baseTextureShader.vShader, 'VERTEX')
    snowProgram.setShader(lutShader.fShader, 'FRAGMENT')
    snowProgram.setAttributeBuffer(this.posBuffer)
    snowProgram.setAttributeBuffer(this.uvBuffer)
    const snowFrameBuffer = createFrameBuffer(gl, size.width, size.height)!
    snowProgram.setUniform('map', this.map)
    snowProgram.setUniform('lut', this.snowMap)
    snowProgram.setUniform('intensity', 0.5)
    this.programs.snow = snowProgram
    this.framebuffers.snow = snowFrameBuffer

    const program = new Program(gl)
    program.setShader(baseTextureShader.vShader, 'VERTEX')
    program.setShader(snowShader.fShader, 'FRAGMENT')
    program.setAttributeBuffer(this.posBuffer)
    program.setAttributeBuffer(this.uvBuffer)
    const framebuffer = createFrameBuffer(gl, size.width, size.height)!
    program.setUniform('map', this.framebuffers.snow.targetTexture)
    program.setUniform('time', 0)
    program.setUniform('size', [size.width, size.height])
    this.programs.main = program
    this.framebuffers.main = framebuffer
  }

  get time() {
    return super.time
  }
  set time(time: number) {
    super.time = time
    this.programs.main?.setUniform('time', this.time)
  }

  get intensity() {
    return super.intensity
  }
  set intensity(intensity: number) {
    super.intensity = intensity
    this.programs.snow?.setUniform('intensity', this.intensity * 0.5 + 0.5)
    this.programs.main?.setUniform('intensity', this.intensity)
  }

  get map() {
    return this._map
  }
  set map(map: ReturnType<typeof createTexture>) {
    if (this._map !== map) {
      this._map = map
      this.programs.snow?.setUniform('map', map)
    }
  }

  get output() {
    return this.framebuffers.main.targetTexture
  }

  updateSize() {
    const size = this.renderer.getSize()
    this.programs.main.setUniform('size', [size.width, size.height])
    for (const key in this.framebuffers) {
      const framebuffer = this.framebuffers[key]
      if (framebuffer) {
        framebuffer.targetTexture.opts.width = size.width
        framebuffer.targetTexture.opts.height = size.height
        framebuffer.targetTexture.refresh()
      }
    }
  }

  render() {
    this.framebuffers.snow.bind()
    this.renderer.render(this.programs.snow)
    this.framebuffers.main.bind()
    this.renderer.render(this.programs.main)
  }

  destroy(clearBuffer = true) {
    super.destroy(clearBuffer)
    const gl = this.renderer.gl
    gl?.deleteTexture(this.snowMap!.glTexture)
    instances.delete(this)
  }
}
