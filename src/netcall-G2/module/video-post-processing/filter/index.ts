import { createAttributeBuffer } from '../gl-utils/buffer-attribute'
import { Renderer } from '../gl-utils/renderer'
import { createTexture } from '../gl-utils/texture'
import { AdvBeautyFilter } from './adv-beauty-filter'
import { BeautyFilter } from './beauty-filter'
// import { StyledFilters } from './styled-filter';
import { LutFilter } from './lut-filter'
import { NormalFilter } from './normal-filter'
import { typedArray } from './typed-array'
import { VirtualBackFilter } from './virtual-back-filter'

/** 视频后期处理管线构建与管理 */
export class Filters {
  private _renderer: Renderer
  private map: ReturnType<typeof createTexture>
  private _alive = true
  private time = -1
  private lastTimer = performance.now()
  beauty: BeautyFilter
  advBeauty: AdvBeautyFilter
  lut: LutFilter
  // styled: StyledFilters;
  normal: NormalFilter
  virtualBackground: VirtualBackFilter
  webglLostContext: {
    loseContext: () => void
    restoreContext: () => void
  } | null = null

  constructor(canvas?: HTMLCanvasElement) {
    this._renderer = new Renderer({ canvas, antialias: true })
    this.map = createTexture(this._renderer.gl!, null)
    const gl = this._renderer.gl!
    this.webglLostContext = gl.getExtension('WEBGL_lose_context')
    const {
      posArray,
      uvArray,
      advBeautyIndicesArray,
      advBeautyPosArray,
      advBeautyZindexArray,
      advFaceMaskUVArray,
      advEyeTeethPosArray,
      advEyeTeethIndicesArray,
      advEyeTeethZindexArray,
      advEyeTeethUVArray
    } = typedArray

    const posBuffer = createAttributeBuffer(gl, 'position', posArray, 2)
    const uvBuffer = createAttributeBuffer(gl, 'uv', uvArray, 2)

    const advBeautyPosBuffer = createAttributeBuffer(gl, 'position', advBeautyPosArray, 2)
    const advBeautyZindexBuffer = createAttributeBuffer(gl, 'zIndex', advBeautyZindexArray, 1)
    const advBeautyIndicesBuffer = createAttributeBuffer(
      gl,
      'indices',
      advBeautyIndicesArray,
      1,
      'ELEMENT_ARRAY_BUFFER'
    )
    const advFaceMaskUVBuffer = createAttributeBuffer(gl, 'uv', advFaceMaskUVArray, 2)
    const advEyeTeethPosBuffer = createAttributeBuffer(gl, 'tPosition', advEyeTeethPosArray, 2)
    const advEyeTeethIndicesBuffer = createAttributeBuffer(
      gl,
      'indices',
      advEyeTeethIndicesArray,
      1,
      'ELEMENT_ARRAY_BUFFER'
    )
    const advEyeTeethZindexBuffer = createAttributeBuffer(gl, 'zIndex', advEyeTeethZindexArray, 1)
    const advEyeTeethUVBuffer = createAttributeBuffer(gl, 'uv', advEyeTeethUVArray, 2)

    this.advBeauty = new AdvBeautyFilter(
      this._renderer,
      this.map,
      advBeautyPosBuffer,
      advBeautyZindexBuffer,
      advBeautyIndicesBuffer,
      advFaceMaskUVBuffer,
      posBuffer,
      uvBuffer,
      advEyeTeethPosBuffer,
      advEyeTeethIndicesBuffer,
      advEyeTeethZindexBuffer,
      advEyeTeethUVBuffer
    )
    this.beauty = new BeautyFilter(this._renderer, this.map, posBuffer, uvBuffer)
    // this.styled = new StyledFilters(
    //     this._renderer,
    //     this.map,
    //     posBuffer,
    //     uvBuffer
    // );
    this.lut = new LutFilter(this._renderer, this.map, posBuffer, uvBuffer)
    this.normal = new NormalFilter(this._renderer, this.map, posBuffer, uvBuffer)
    this.virtualBackground = new VirtualBackFilter(this._renderer, this.map, posBuffer, uvBuffer)
  }

  /** 从已有参数重新创建后期处理管线，用以丢失上下文后对管线进行恢复 */
  clone() {
    try {
      const filters = new Filters(this._renderer.canvas)
      filters.mapSource = this.srcMap?.source || null
      this.advBeauty.remove()
      filters.advBeauty.presetAdvEffect({ ...this.advBeauty.params })
      const vbInfo = this.virtualBackground.lastSetInfo
      if (vbInfo.type === 'bk') {
        filters.virtualBackground.setBackground(vbInfo.value)
      } else if (vbInfo.type === 'blur') {
        filters.virtualBackground.setBlurIntensity(vbInfo.value)
      }
      return filters
    } catch (error) {
      return null
    }
  }

  /**
   * 返回视频后期处理管线内部涉及到的以下子渲染过程（为了确保输出结果的正确，子任务顺序有严格要求）
   * 1、高级美颜
   * 2、基础美颜
   * 3、滤镜
   * 4、虚拟背景
   * 5、合成
   */
  private get filters() {
    return [
      this.advBeauty,
      this.beauty,
      /*this.styled,*/ this.lut,
      this.virtualBackground,
      this.normal
    ]
  }

  /**
   * 返回视频处理的 canvas
   * @returns {HTMLCanvasElement}
   */
  get canvas() {
    return this._renderer.canvas
  }

  /**
   * 返回 webgl 渲染上下文
   */
  get gl() {
    return this._renderer.gl
  }

  /** 设置输入源 */
  get srcMap() {
    return this.map
  }

  /**
   * 设置视频源
   * @param {TexImageSource|null} source
   */
  set mapSource(source: TexImageSource | null) {
    const map = this.map
    if (map) {
      map.source = source
      map.refresh()
    }
  }

  /**
   * 判断是否可用
   * @returns {boolean}
   */
  get isAlive() {
    return this._alive
  }

  /**
   * 设置渲染尺寸
   * @param {number} width
   * @param {number} height
   * @returns {any}
   */
  setSize(width: number, height: number) {
    this._renderer.setSize(width, height)
    this.filters.forEach((filter) => {
      filter.updateSize()
    })
  }

  /**
   * 渲染整个管线
   */
  render() {
    const filters = this.filters
    filters[0].map = this.map
    filters[0].render()
    // face mask 传递
    ;(<BeautyFilter>filters[1]).faceMask = (<AdvBeautyFilter>filters[0]).faceMask
    ;(<BeautyFilter>filters[1]).featureParas = (<AdvBeautyFilter>filters[0]).featureParas
    for (let i = 1; i < filters.length; i++) {
      filters[i].map = filters[i - 1].output
      filters[i].render()
    }
  }

  /**
   * 循环渲染整个管线
   */
  update(updateMapSource = true) {
    if (this._alive) {
      if (this.time < 0) {
        this.time = 0
        this.lastTimer = performance.now()
      } else {
        const now = performance.now()
        const dur = Math.min(now - this.lastTimer, 100)
        this.lastTimer = now
        this.time += dur / 1000
        // this.styled.time = this.time;
      }
      if (updateMapSource) {
        this.map?.refresh()
      }
      this.render()
    }
  }

  /**
   * 释放视频处理资源占用
   * 释放后将彻底删除
   */
  destroy() {
    this._alive = false
    this.time = -1
    const gl = this._renderer.gl
    this.filters.forEach((filter) => {
      filter.destroy()
    })
    gl?.deleteTexture(this.map!.glTexture)
  }
}
