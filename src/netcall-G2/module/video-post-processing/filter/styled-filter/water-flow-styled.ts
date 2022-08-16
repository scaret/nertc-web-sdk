import { createAttributeBuffer } from '../../gl-utils/buffer-attribute'
import { createFrameBuffer } from '../../gl-utils/framebuffer'
import { Program } from '../../gl-utils/program'
import { Renderer } from '../../gl-utils/renderer'
import { createTexture, loadImage } from '../../gl-utils/texture'
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl'
import { waterFlowShader } from '../../shaders/water-flow-shader.glsl'
import { StyledFilter } from './styled-filter'

const instances = new Set<WaterFlowStyled>()
let waterImg: HTMLImageElement | null = null
loadImage(
  'https://yx-web-nosdn.netease.im/common/e7ea13cd337a076e246d9119d2eda3ee/dirty-map.png',
  (img) => {
    waterImg = img
    instances.forEach((instance) => {
      instance.waterFlowMap!.source = img
      instance.waterFlowMap!.refresh()
    })
  }
)
export class WaterFlowStyled extends StyledFilter {
  waterFlowMap: ReturnType<typeof createTexture> = null
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

    this.waterFlowMap = createTexture(gl, waterImg, {
      wrapS: 'repeat',
      wrapT: 'repeat'
    })

    const program = new Program(gl)
    program.setShader(baseTextureShader.vShader, 'VERTEX')
    program.setShader(waterFlowShader.fShader, 'FRAGMENT')
    program.setAttributeBuffer(this.posBuffer)
    program.setAttributeBuffer(this.uvBuffer)
    const framebuffer = createFrameBuffer(gl, size.width, size.height)!
    program.setUniform('map', this.map)
    program.setUniform('flowMap', this.waterFlowMap)
    program.setUniform('time', 0)
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
    this.programs.main?.setUniform('intensity', this.intensity)
  }

  get map() {
    return this._map
  }
  set map(map: ReturnType<typeof createTexture>) {
    if (this._map !== map) {
      this._map = map
      this.programs.main?.setUniform('map', map)
    }
  }

  get output() {
    return this.framebuffers.main.targetTexture
  }

  updateSize() {
    const size = this.renderer.getSize()
    const framebuffer = this.framebuffers.main
    if (framebuffer) {
      framebuffer.targetTexture.opts.width = size.width
      framebuffer.targetTexture.opts.height = size.height
      framebuffer.targetTexture.refresh()
    }
  }

  render() {
    this.framebuffers.main.bind()
    this.renderer.render(this.programs.main)
  }

  destroy(clearBuffer = true) {
    super.destroy(clearBuffer)
    const gl = this.renderer.gl
    gl?.deleteTexture(this.waterFlowMap!.glTexture)
    instances.delete(this)
  }
}
