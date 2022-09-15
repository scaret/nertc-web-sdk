import { createAttributeBuffer } from '../gl-utils/buffer-attribute'
import { createFrameBuffer } from '../gl-utils/framebuffer'
import { Program } from '../gl-utils/program'
import { Renderer } from '../gl-utils/renderer'
import { createTexture, retryLoadImage } from '../gl-utils/texture'
import { baseTextureShader } from '../shaders/base-texture-shader.glsl'
import { beautyShader } from '../shaders/beauty/beauty.glsl'
import { beautyBlurShader } from '../shaders/beauty/blur.glsl'
import { beautyHighPassShader } from '../shaders/beauty/highpass.glsl'
import { lutShader } from '../shaders/lut-shader.glsl'
import { Filter } from './filter'

const loadedImg: { [key: string]: HTMLImageElement } = {}
export class BeautyFilter extends Filter {
  private whitenMap: ReturnType<typeof createTexture>
  private reddenMap: ReturnType<typeof createTexture>
  private _smooth = 0
  private _whiten = 0
  private _redden = 0
  private _faceMask: ReturnType<typeof createTexture> | null = null
  private _featureParas = {
    forehead: 0,
    eyeRim: 0,
    noseLine: 0
  }
  private featureEnable = false

  constructor(
    renderer: Renderer,
    map: ReturnType<typeof createTexture>,
    posBuffer: ReturnType<typeof createAttributeBuffer>,
    uvBuffer: ReturnType<typeof createAttributeBuffer>
  ) {
    super(renderer, map, posBuffer, uvBuffer)

    this.whitenMap = createTexture(renderer.gl!, null, { flipY: false })
    this.reddenMap = createTexture(renderer.gl!, null, { flipY: false })

    const { programs, framebuffers } = this.initProgramsBuffers()
    this.programs = programs
    this.framebuffers = framebuffers
    this.initUniforms()
  }

  private initProgramsBuffers() {
    const gl = this.renderer.gl!
    const size = this.renderer.getSize()
    const programs: { [key: string]: Program } = {}
    const framebuffers: {
      [key: string]: NonNullable<ReturnType<typeof createFrameBuffer>>
    } = {}
    const opts = {
      blurX: {
        vShader: beautyBlurShader.vShader,
        fShader: beautyBlurShader.fShader,
        size: { width: size.width >> 1, height: size.height >> 1 }
      },
      blurY: {
        vShader: beautyBlurShader.vShader,
        fShader: beautyBlurShader.fShader,
        size: { width: size.width >> 1, height: size.height >> 1 }
      },
      highPass: {
        vShader: baseTextureShader.vShader,
        fShader: beautyHighPassShader.fShader,
        size
      },
      hBlurX: {
        vShader: beautyBlurShader.vShader,
        fShader: beautyBlurShader.fShader,
        size
      },
      hBlurY: {
        vShader: beautyBlurShader.vShader,
        fShader: beautyBlurShader.fShader,
        size
      },
      beauty: {
        vShader: baseTextureShader.vShader,
        fShader: beautyShader.fShader,
        size
      },
      whiten: {
        vShader: baseTextureShader.vShader,
        fShader: lutShader.fShader,
        size
      },
      redden: {
        vShader: baseTextureShader.vShader,
        fShader: lutShader.fShader,
        size
      }
    }

    for (const key in opts) {
      const { vShader, fShader, size } = (opts as any)[key]
      // program
      const program = new Program(gl)
      program.setShader(vShader, 'VERTEX')
      program.setShader(fShader, 'FRAGMENT')
      program.setAttributeBuffer(this.posBuffer)
      program.setAttributeBuffer(this.uvBuffer)
      programs[key] = program

      // frameBuffer
      const frameBuffer = createFrameBuffer(gl, size.width, size.height)!
      framebuffers[key] = frameBuffer
    }

    return {
      programs: programs,
      framebuffers: framebuffers
    }
  }

  private initUniforms() {
    const programs = this.programs
    const framebuffers = this.framebuffers
    const map = this.map
    const { width, height } = this.renderer.getSize()
    const size = [width, height]
    const qSize = [width >> 1, height >> 1]

    programs['blurX'].setUniform('map', map)
    programs['blurX'].setUniform('size', qSize)

    programs['blurY'].setUniform('map', framebuffers['blurX'].targetTexture)
    programs['blurY'].setUniform('size', qSize)
    programs['blurY'].setUniform('isVertical', 1.0)

    programs['highPass'].setUniform('map', map)
    programs['highPass'].setUniform('blurMap', framebuffers['blurY'].targetTexture)

    programs['hBlurX'].setUniform('map', framebuffers['highPass'].targetTexture)
    programs['hBlurX'].setUniform('size', size)

    programs['hBlurY'].setUniform('map', framebuffers['hBlurX'].targetTexture)
    programs['hBlurY'].setUniform('size', size)
    programs['hBlurY'].setUniform('isVertical', 1.0)

    programs['beauty'].setUniform('size', size)
    programs['beauty'].setUniform('map', map)
    programs['beauty'].setUniform('blurMap', framebuffers['blurY'].targetTexture)
    programs['beauty'].setUniform('highPassMap', framebuffers['hBlurY'].targetTexture)
    programs['beauty'].setUniform('intensity', 0.0)
    const featureParas = this.featureParas
    for (const key in featureParas) {
      programs['beauty'].setUniform(
        `${key}Inten`,
        this._featureParas[key as keyof typeof featureParas]
      )
    }

    programs['whiten'].setUniform('map', map)
    programs['whiten'].setUniform('lut', this.whitenMap)
    programs['whiten'].setUniform('intensity', 0.0)

    programs['redden'].setUniform('map', map)
    programs['redden'].setUniform('lut', this.reddenMap)
    programs['redden'].setUniform('intensity', 0.0)
  }

  get map() {
    return super.map
  }
  set map(map: ReturnType<typeof createTexture>) {
    if (map !== this._map) {
      this._map = map
      ;['blurX', 'highPass', 'beauty'].forEach((key) => {
        ;(this.programs as any)[key].setUniform('map', this._map)
      })
      this.mapChange()
    }
  }

  setLutsSrc(opts: { whiten: string; redden: string }, onComplete?: (failUrls: string[]) => void) {
    const { whiten, redden } = opts
    let queueLen = 2
    const failUrls: string[] = []
    const checkComplete = () => {
      queueLen -= 1
      if (queueLen <= 0) {
        onComplete?.(failUrls)
      }
    }
    if (loadedImg.whiten) {
      this.whitenMap!.source = loadedImg.whiten
      this.whitenMap!.refresh()
      const whiten = this._whiten
      this._whiten = 0
      this.whiten = whiten
      checkComplete()
    } else {
      retryLoadImage(
        whiten,
        3,
        (img) => {
          loadedImg.whiten = img
          this.whitenMap!.source = img
          this.whitenMap!.refresh()
          const whiten = this._whiten
          this._whiten = 0
          this.whiten = whiten
          checkComplete()
        },
        () => {
          failUrls.push(whiten)
          checkComplete()
        }
      )
    }
    if (loadedImg.redden) {
      this.reddenMap!.source = loadedImg.redden
      this.reddenMap!.refresh()
      const redden = this._redden
      this._redden = 0
      this.redden = redden
      checkComplete()
    } else {
      retryLoadImage(
        redden,
        3,
        (img) => {
          loadedImg.redden = img
          this.reddenMap!.source = img
          this.reddenMap!.refresh()
          const redden = this._redden
          this._redden = 0
          this.redden = redden
          checkComplete()
        },
        () => {
          failUrls.push(redden)
          checkComplete()
        }
      )
    }
  }

  private get smoothOut() {
    return this.smooth || this.featureEnable ? this.framebuffers['beauty'].targetTexture : this.map
  }

  private get whitenOut() {
    return this.whiten ? this.framebuffers['whiten'].targetTexture : this.smoothOut
  }

  private mapChange() {
    this.programs['whiten'].setUniform('map', this.smoothOut)
    this.programs['redden'].setUniform('map', this.whitenOut)
  }

  get smooth() {
    return this._smooth
  }
  set smooth(smooth: number) {
    if (this._smooth !== smooth) {
      this._smooth = smooth
      this.programs['beauty'].setUniform('intensity', this._smooth)
      this.mapChange()
    }
  }

  get whiten() {
    return this._whiten
  }
  set whiten(whiten: number) {
    if (this._whiten !== whiten) {
      this._whiten = whiten
      this.programs['whiten'].setUniform(
        'intensity',
        this.whitenMap && this.whitenMap.source ? this._whiten : 0
      )
      this.mapChange()
    }
  }

  get redden() {
    return this._redden
  }
  set redden(redden: number) {
    if (this._redden !== redden) {
      this._redden = redden
      this.programs['redden'].setUniform(
        'intensity',
        this.reddenMap && this.reddenMap.source ? this._redden : 0
      )
    }
  }

  set faceMask(mask: ReturnType<typeof createTexture> | null) {
    if (this._faceMask !== mask) {
      this.programs['beauty'].setUniform('maskMap', mask)
      this.programs['beauty'].setUniform('hasMask', mask ? 1 : 0)
      this._faceMask = mask
    }
  }

  set featureParas(params: { forehead: number; eyeRim: number; noseLine: number }) {
    let sum = 0
    for (const key in params) {
      const value = params[key as keyof typeof params]
      sum += value
      if (this._featureParas[key as keyof typeof params] !== value) {
        this.programs.beauty.setUniform(`${key}Inten`, value)
        this._featureParas[key as keyof typeof params] = value
      }
    }
    this.featureEnable = sum > 0 ? true : false
    this.mapChange()
  }

  get output() {
    if (this.redden) {
      return this.framebuffers['redden'].targetTexture
    }
    if (this.whiten) {
      return this.framebuffers['whiten'].targetTexture
    }
    if (this.smooth || this.featureEnable) {
      return this.framebuffers['beauty'].targetTexture
    }
    return super.output
  }

  updateSize() {
    const rsize = this.renderer.getSize()
    const size = [rsize.width, rsize.height]
    const qSize = [rsize.width >> 1, rsize.height >> 1]
    ;['blurX', 'blurY'].forEach((key) => {
      const frameBuffer = (this.framebuffers as any)[key]
      frameBuffer.targetTexture.opts.width = qSize[0]
      frameBuffer.targetTexture.opts.height = qSize[1]
      frameBuffer.targetTexture.refresh()
      const program = (this.programs as any)[key]
      program.setUniform('size', qSize)
    })
    ;['highPass', 'hBlurX', 'hBlurY', 'beauty', 'whiten', 'redden'].forEach((key) => {
      const frameBuffer = (this.framebuffers as any)[key]
      frameBuffer.targetTexture.opts.width = size[0]
      frameBuffer.targetTexture.opts.height = size[1]
      frameBuffer.targetTexture.refresh()
      if (['highPass', 'whiten', 'redden'].indexOf(key) < 0) {
        const program = (this.programs as any)[key]
        program.setUniform('size', size)
      }
    })
  }

  render() {
    const renderer = this.renderer
    const { width, height } = renderer.getSize()
    const programs = this.programs
    const framebuffers = this.framebuffers
    if (this.smooth || this.featureEnable) {
      renderer.setViewport(0, 0, width >> 1, height >> 1)
      // 原图缩小 4 倍模糊
      framebuffers['blurX'].bind()
      renderer.render(programs['blurX'])

      framebuffers['blurY'].bind()
      renderer.render(programs['blurY'])

      renderer.setViewport(0, 0, width, height)

      // highPass
      framebuffers['highPass'].bind()
      renderer.render(programs['highPass'])

      // highPass blur
      framebuffers['hBlurX'].bind()
      renderer.render(programs['hBlurX'])

      framebuffers['hBlurY'].bind()
      renderer.render(programs['hBlurY'])

      // 保边混合
      framebuffers['beauty'].bind()
      renderer.render(programs['beauty'])
    }
    if (this.whiten) {
      framebuffers['whiten'].bind()
      renderer.render(programs['whiten'])
    }
    if (this.redden) {
      framebuffers['redden'].bind()
      renderer.render(programs['redden'])
    }
  }

  destroy() {
    super.destroy()
    const gl = this.renderer.gl
    gl?.deleteTexture(this.whitenMap!.glTexture)
    gl?.deleteTexture(this.reddenMap!.glTexture)
  }
}
