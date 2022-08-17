import { createAttributeBuffer } from '../../gl-utils/buffer-attribute'
import { createFrameBuffer } from '../../gl-utils/framebuffer'
import { Program } from '../../gl-utils/program'
import { Renderer } from '../../gl-utils/renderer'
import { createTexture, loadImage } from '../../gl-utils/texture'
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl'
import { lutShader } from '../../shaders/lut-shader.glsl'
import { sciShader } from '../../shaders/sci-shader'
import { StyledFilter } from './styled-filter'

const instances = new Set<SciStyled>()
let sciImg: HTMLImageElement | null = null
loadImage(
  'https://yx-web-nosdn.netease.im/common/3ca954d195d272f1652891837d0c8ba7/kehuan.png',
  (img) => {
    sciImg = img
    instances.forEach((instance) => {
      instance.sciMap!.source = img
      instance.sciMap!.refresh()
    })
  }
)
export class SciStyled extends StyledFilter {
  sciMap: ReturnType<typeof createTexture> = null
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

    this.sciMap = createTexture(gl, sciImg, { flipY: false })

    const sciProgram = new Program(gl)
    sciProgram.setShader(baseTextureShader.vShader, 'VERTEX')
    sciProgram.setShader(lutShader.fShader, 'FRAGMENT')
    sciProgram.setAttributeBuffer(this.posBuffer)
    sciProgram.setAttributeBuffer(this.uvBuffer)
    const sciFrameBuffer = createFrameBuffer(gl, size.width, size.height)!
    sciProgram.setUniform('map', this.map)
    sciProgram.setUniform('lut', this.sciMap)
    sciProgram.setUniform('intensity', 0.5)
    this.programs.sci = sciProgram
    this.framebuffers.sci = sciFrameBuffer

    const program = new Program(gl)
    program.setShader(baseTextureShader.vShader, 'VERTEX')
    program.setShader(sciShader.fShader, 'FRAGMENT')
    program.setAttributeBuffer(this.posBuffer)
    program.setAttributeBuffer(this.uvBuffer)
    const framebuffer = createFrameBuffer(gl, size.width, size.height)!
    program.setUniform('map', this.framebuffers.sci.targetTexture)
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
    this.programs.sci?.setUniform('intensity', this.intensity * 0.5 + 0.5)
    this.programs.main?.setUniform('intensity', this.intensity)
  }

  get map() {
    return this._map
  }
  set map(map: ReturnType<typeof createTexture>) {
    if (this._map !== map) {
      this._map = map
      this.programs.sci?.setUniform('map', map)
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
    this.framebuffers.sci.bind()
    this.renderer.render(this.programs.sci)
    this.framebuffers.main.bind()
    this.renderer.render(this.programs.main)
  }

  destroy(clearBuffer = true) {
    super.destroy(clearBuffer)
    const gl = this.renderer.gl
    gl?.deleteTexture(this.sciMap!.glTexture)
    instances.delete(this)
  }
}
