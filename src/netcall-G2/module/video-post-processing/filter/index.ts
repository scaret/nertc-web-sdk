import { Renderer } from '../gl-utils/renderer';
import { typedArray } from './typed-array';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { BeautyFilter } from './beauty-filter';
import { NormalFilter } from './normal-filter';
// import { StyledFilters } from './styled-filter';
import { LutFilter } from './lut-filter';
import { AdvBeautyFilter } from './adv-beauty-filter';
import { VirtualBackFilter } from './virtual-back-filter';
import { createTexture } from '../gl-utils/texture';

/** 视频处理全流程管理 */
export class Filters {
    private _renderer: Renderer;
    private map: ReturnType<typeof createTexture>;
    private _alive = true;
    private time = -1;
    private lastTimer = performance.now();
    beauty: BeautyFilter;
    advBeauty: AdvBeautyFilter;
    lut: LutFilter;
    // styled: StyledFilters;
    normal: NormalFilter;
    virtualBackground: VirtualBackFilter;

    constructor() {
        this._renderer = new Renderer({antialias: true});
        this.map = createTexture(this._renderer.gl!, null);
        const gl = this._renderer.gl!;

        const { 
            posArray,
            uvArray, 
            advBeautyIndicesArray,
            advBeautyPosArray,
            advBeautyZindexArray
         } = typedArray;

        const posBuffer = createAttributeBuffer(gl, 'position', posArray, 2);
        const uvBuffer = createAttributeBuffer(gl, 'uv', uvArray, 2);

        const advBeautyPosBuffer = createAttributeBuffer(
            gl,
            'position',
            advBeautyPosArray,
            2
        );
        const advBeautyZindexBuffer = createAttributeBuffer(
            gl,
            'zIndex',
            advBeautyZindexArray,
            1
        );
        const advBeautyIndicesBuffer = createAttributeBuffer(
            gl,
            'indices',
            advBeautyIndicesArray,
            1,
            'ELEMENT_ARRAY_BUFFER'
        );

        this.advBeauty = new AdvBeautyFilter(
            this._renderer,
            this.map,
            advBeautyPosBuffer,
            advBeautyZindexBuffer,
            advBeautyIndicesBuffer
        );
        this.beauty = new BeautyFilter(
            this._renderer,
            this.map,
            posBuffer,
            uvBuffer
        );
        // this.styled = new StyledFilters(
        //     this._renderer,
        //     this.map,
        //     posBuffer,
        //     uvBuffer
        // );
        this.lut = new LutFilter(this._renderer, this.map, posBuffer, uvBuffer);
        this.normal = new NormalFilter(
            this._renderer,
            this.map,
            posBuffer,
            uvBuffer
        );
        this.virtualBackground = new VirtualBackFilter(
            this._renderer, 
            this.map, 
            posBuffer, 
            uvBuffer
        );
    }

    private get filters() {
        return [this.advBeauty, this.beauty, /*this.styled,*/ this.lut, this.virtualBackground, this.normal];
    }

    /**
     * 返回视频处理的 canvas
     * @returns {HTMLCanvasElement}
     */
    get canvas() {
        return this._renderer.canvas;
    }

    /**
     * 设置视频源
     * @param {TexImageSource|null} source
     */
    set mapSource(source: TexImageSource | null) {
        const map = this.map;
        if (map) {
            map.source = source;
            map.refresh();
        }
    }

    /**
     * 判断是否可用
     * @returns {boolean}
     */
    get isAlive() {
        return this._alive;
    }

    /**
     * 设置渲染尺寸
     * @param {number} width
     * @param {number} height
     * @returns {any}
     */
    setSize(width: number, height: number) {
        this._renderer.setSize(width, height);
        this.filters.forEach((filter) => {
            filter.updateSize();
        });
    }

    /**
     * 渲染流程
     */
    render() {
        const filters = this.filters;
        filters[0].map = this.map;
        filters[0].render();
        for (let i = 1; i < filters.length; i++) {
            filters[i].map = filters[i - 1].output;
            filters[i].render();
        }
    }

    /**
     * 循环处理
     */
    update(updateMapSource = true) {
        if (this._alive) {
            if (this.time < 0) {
                this.time = 0;
                this.lastTimer = performance.now();
            } else {
                const now = performance.now();
                const dur = Math.min(now - this.lastTimer, 100);
                this.lastTimer = now;
                this.time += dur / 1000;
                // this.styled.time = this.time;
            }
            if(updateMapSource){
                this.map?.refresh();
            }
            this.render();
        }
    }

    /**
     * 释放视频处理资源占用
     * 释放后将彻底删除
     */
    destroy() {
        this._alive = false;
        this.time = -1;
        const gl = this._renderer.gl;
        this.filters.forEach((filter) => {
            filter.destroy();
        });
        gl?.deleteTexture(this.map!.glTexture);
    }
}