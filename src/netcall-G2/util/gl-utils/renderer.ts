import { Program } from './program';

type GlOpts = {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    alpha?: boolean;
    antialias?: boolean;
    depth?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
    stencil?: boolean;
};

export class Renderer {
    private _canvas: HTMLCanvasElement;
    private _gl: WebGLRenderingContext | null = null;
    private _pixelRatio = 1;
    private _viewport = { x: 0, y: 0, width: 512, height: 512 };

    constructor(opts?: GlOpts) {
        const {
            canvas = document.createElement('canvas'),
            width = 512,
            height = 512,
            ...ctxOpts
        } = {
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            ...opts
        };
        this._canvas = canvas;
        this._gl = canvas.getContext(
            'webgl',
            ctxOpts
        ) as WebGLRenderingContext | null;
        const size = this.setSize(width, height);
        this.setViewport(0, 0, size.width, size.height);

        if (!this._gl) {
            console.error(
                'The current runtime environment does not support webgl.'
            );
        }
    }

    get canvas() {
        return this._canvas;
    }

    get gl() {
        return this._gl;
    }

    getPixelRatio() {
        return this._pixelRatio ?? 1;
    }

    setPixelRatio(pixelRatio: number) {
        const curPR = this.getPixelRatio();
        if (curPR === pixelRatio) return;
        const size = this.getSize();
        size.width /= curPR;
        size.height /= curPR;
        this._pixelRatio = pixelRatio;
        this.setSize(size.width, size.height);
    }

    getSize() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    setSize(width: number, height: number, updateStyle = false) {
        const canvas = this.canvas;
        const pixelRatio = this.getPixelRatio();
        canvas.width = width * pixelRatio;
        if (updateStyle) canvas.style.width = width + 'px';
        canvas.height = height * pixelRatio;
        if (updateStyle) canvas.style.height = height + 'px';
        return this.getSize();
    }

    getViewport() {
        return this._viewport;
    }

    setViewport(x: number, y: number, width: number, height: number) {
        this._viewport = { x, y, width, height };
        this.gl?.viewport(x, y, width, height);
    }

    resize(
        width: number,
        height: number,
        pixelRatio?: number,
        viewport?: { x: number; y: number; width: number; height: number }
    ) {
        const size = this.setSize(width, height);
        if (pixelRatio) this.setPixelRatio(pixelRatio);
        if (viewport) {
            this.setViewport(
                viewport.x,
                viewport.y,
                viewport.width,
                viewport.height
            );
        } else {
            this.setViewport(0, 0, size.width, size.height);
        }
    }

    render(program: Program) {
        const gl = this.gl!;
        gl.enable(gl.CULL_FACE);
        program?.render();
    }
}
