import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../gl-utils/texture';
import { createFrameBuffer } from '../gl-utils/framebuffer';
import { typedArray } from './typed-array';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';
import { lutShader } from '../shaders/lut-shader.glsl';

export class LutFilter {
    private renderer: Renderer;
    private _map: ReturnType<typeof createTexture>;
    private lutMap: ReturnType<typeof createTexture>;
    private lutImgs: {
        [key: string]: {
            img: HTMLImageElement;
            intensity: number;
        };
    } = {};
    private curLutName: string | null = null;
    private program: Program;
    private framebuffer: NonNullable<ReturnType<typeof createFrameBuffer>>;

    constructor(renderer: Renderer, map: ReturnType<typeof createTexture>) {
        this.renderer = renderer;
        this._map = map;
        this.lutMap = createTexture(renderer.gl!, null, { flipY: false });
        const { program, framebuffer } = this.initProgramBuffer();
        this.program = program;
        this.framebuffer = framebuffer;
    }

    private initProgramBuffer() {
        const gl = this.renderer.gl!;
        const { posArray, uvArray } = typedArray;
        const size = this.renderer.getSize();

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(lutShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(
            createAttributeBuffer(gl, 'position', posArray, 2)
        );
        program.setAttributeBuffer(createAttributeBuffer(gl, 'uv', uvArray, 2));

        const framebuffer = createFrameBuffer(gl, size.width, size.height)!;

        program.setUniform('map', this.map);
        program.setUniform('lut', this.lutMap);
        program.setUniform('intensity', 0.0);

        return { program, framebuffer };
    }

    private getLutImg(name: string | null) {
        if (!name) return null;
        return this.lutImgs[name] ?? null;
    }

    get map() {
        return this._map;
    }
    //@ts-ignore
    set map(map: typeof this._map) {
        if (this._map !== map) {
            this._map = map;
            this.program.setUniform('map', this._map);
        }
    }

    setLutsSrc(opts: {
        [key: string]: {
            src: string;
            intensity?: number;
        };
    }) {
        for (const key in opts) {
            const { src, intensity = 0.5 } = opts[key];
            loadImage(src, (img) => {
                this.lutImgs[key] = {
                    img,
                    intensity
                };
            });
        }
    }

    get output() {
        if (this.intensity) {
            return this.framebuffer.targetTexture;
        }
        return this.map;
    }

    updateSize() {
        const size = this.renderer.getSize();
        this.framebuffer.targetTexture.opts.width = size.width;
        this.framebuffer.targetTexture.opts.height = size.height;
        this.framebuffer.targetTexture.refresh();
    }

    setlut(name: string | null, intensity?: number) {
        // if (name !== this.curLutName) {
            this.curLutName = name;
            const curLut = this.getLutImg(this.curLutName);
            if (curLut) {
                this.lutMap!.source = curLut.img;
                this.lutMap!.refresh();
            }
            intensity = intensity ?? this.intensity;
            this.intensity = intensity;
        // }
    }

    get intensity() {
        const curLut = this.getLutImg(this.curLutName);
        if (!curLut) {
            return 0;
        }
        return curLut.intensity;
    }

    set intensity(intensity: number) {
        const curLut = this.getLutImg(this.curLutName);
        if (!curLut) {
            this.program.setUniform('intensity', 0);
            return;
        }
        curLut.intensity = intensity;
        this.program.setUniform('intensity', this.intensity);
    }

    render() {
        if (this.intensity) {
            this.framebuffer.bind();
            this.renderer.render(this.program);
        }
    }

    destroy() {
        const gl = this.renderer.gl;
        gl?.deleteFramebuffer(this.framebuffer.framebuffer);
        this.program.destroy();
        gl?.deleteTexture(this.lutMap!.glTexture);
    }
}
