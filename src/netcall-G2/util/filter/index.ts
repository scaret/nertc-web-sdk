import { Renderer } from '../gl-utils/renderer';
import { BeautyFilter } from './beauty-filter';
import { NormalFilter } from './normal-filter';
import { LutFilter } from './lut-filter';
import { createTexture } from '../gl-utils/texture';
import { ILogger } from '../../types';
import { Logger } from '../webrtcLogger';

const logger: ILogger = new Logger({
    tagGen: () => {
        return 'Filter';
    }
});


export class Filters {
    private _renderer: Renderer;
    private map: ReturnType<typeof createTexture>;
    private _alive = true;
    beauty: BeautyFilter;
    lut: LutFilter;
    normal: NormalFilter;

    constructor() {
        this._renderer = new Renderer();
        this.map = createTexture(this._renderer.gl!, null);
        this.beauty = new BeautyFilter(this._renderer, this.map);
        this.lut = new LutFilter(this._renderer, this.map);
        this.normal = new NormalFilter(this._renderer, this.map);
    }

    private get filters() {
        return [this.beauty, this.lut, this.normal];
    }

    get canvas() {
        return this._renderer.canvas;
    }

    set mapSource(source: TexImageSource | null) {
        if (source && 'readyState' in source) {
            if (source.readyState < 2) {
                logger.warn('media source not ready');
                setTimeout(() => {
                    this.mapSource = source;
                }, 0);
                return;
            }
        }
        const map = this.map;
        if (map) {
            map.source = source;
            map.refresh();
        }
    }

    get isAlive() {
        return this._alive;
    }

    setSize(width: number, height: number) {
        this._renderer.setSize(width, height);
        this.filters.forEach((filter) => {
            if ((filter as any).updateSize) {
                (filter as any).updateSize();
            }
        });
    }

    render() {
        const filters = this.filters;
        filters[0].map = this.map;
        filters[0].render();
        for (let i = 1; i < filters.length; i++) {
            filters[i].map = filters[i - 1].output;
            filters[i].render();
        }
    }

    update() {
        if (this._alive) {
            this.map?.refresh();
            this.render();
        }
    }

    destroy() {
        this._alive = false;
        const gl = this._renderer.gl;
        this.filters.forEach((filter) => {
            filter.destroy();
        });
        gl?.deleteTexture(this.map!.glTexture);
    }
}