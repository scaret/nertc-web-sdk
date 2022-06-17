import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../gl-utils/texture';
import { createFrameBuffer } from '../gl-utils/framebuffer';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';
import { lutShader } from '../shaders/lut-shader.glsl';
import { Filter } from './filter';

export class LutFilter extends Filter {
    private lutMap: ReturnType<typeof createTexture>;
    private lutImgs: {
        [key: string]: {
            img: HTMLImageElement | null;
            intensity: number;
        };
    } = {};
    private curLutName: string | null = null;

    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, uvBuffer);
        this.lutMap = createTexture(renderer.gl!, null, { flipY: false });
        const { program, framebuffer } = this.initProgramBuffer();
        this.programs.main = program;
        this.framebuffers.main = framebuffer;
    }

    private initProgramBuffer() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(lutShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);

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
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.main.setUniform('map', this._map);
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
            this.lutImgs[key] = {
                img: null,
                intensity: 0
            };
            loadImage(src, (img) => {
                this.lutImgs[key] = {
                    img,
                    intensity
                };
                if (key === this.curLutName) {
                    this.setlut(key);
                }
            });
        }
    }

    get output() {
        if (this.intensity) {
            return this.framebuffers.main.targetTexture;
        }
        return super.output;
    }

    updateSize() {
        const size = this.renderer.getSize();
        const framebuffer = this.framebuffers.main;
        framebuffer.targetTexture.opts.width = size.width;
        framebuffer.targetTexture.opts.height = size.height;
        framebuffer.targetTexture.refresh();
    }

    setlut(name: string | null, intensity?: number) {
        if (name !== this.curLutName) {
            this.curLutName = name;
            const curLut = this.getLutImg(this.curLutName);
            if (curLut) {
                this.lutMap!.source = curLut.img;
                this.lutMap!.refresh();
            }
        }
        intensity = intensity ?? this.intensity;
        this.intensity = intensity;
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
            this.programs.main.setUniform('intensity', 0);
            return;
        }
        curLut.intensity = intensity;
        this.programs.main.setUniform('intensity', this.intensity);
    }

    render() {
        if (this.intensity) {
            this.framebuffers.main.bind();
            this.renderer.render(this.programs.main);
        }
    }

    destroy() {
        super.destroy();
        this.renderer.gl?.deleteTexture(this.lutMap!.glTexture);
    }
}
