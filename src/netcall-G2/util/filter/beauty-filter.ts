//@ts-nocheck
import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../gl-utils/texture';
import { createFrameBuffer } from '../gl-utils/framebuffer';
import { typedArray } from './typed-array';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';
import { beautyBlurShader } from '../shaders/beauty/blur.glsl';
import { beautyHighPassShader } from '../shaders/beauty/highpass.glsl';
import { beautyShader } from '../shaders/beauty/beauty.glsl';
import { lutShader } from '../shaders/lut-shader.glsl';

export class BeautyFilter {
    private renderer: Renderer;
    private _map: ReturnType<typeof createTexture>;
    private whitenMap: ReturnType<typeof createTexture>;
    private reddenMap: ReturnType<typeof createTexture>;
    private _smooth = 0;
    private _whiten = 0;
    private _redden = 0;
    private programs: {
        blurX: Program;
        blurY: Program;
        highPass: Program;
        hBlurX: Program;
        hBlurY: Program;
        beauty: Program;
        whiten: Program;
        redden: Program;
    };
    private framebuffers: {
        blurX: NonNullable<ReturnType<typeof createFrameBuffer>>;
        blurY: NonNullable<ReturnType<typeof createFrameBuffer>>;
        highPass: NonNullable<ReturnType<typeof createFrameBuffer>>;
        hBlurX: NonNullable<ReturnType<typeof createFrameBuffer>>;
        hBlurY: NonNullable<ReturnType<typeof createFrameBuffer>>;
        beauty: NonNullable<ReturnType<typeof createFrameBuffer>>;
        whiten: NonNullable<ReturnType<typeof createFrameBuffer>>;
        redden: NonNullable<ReturnType<typeof createFrameBuffer>>;
    };

    constructor(renderer: Renderer, map: ReturnType<typeof createTexture>) {
        this.renderer = renderer;
        this._map = map;

        this.whitenMap = createTexture(renderer.gl!, null, { flipY: false });
        this.reddenMap = createTexture(renderer.gl!, null, { flipY: false });

        const { programs, framebuffers } = this.initProgramsBuffers();
        this.programs = programs;
        this.framebuffers = framebuffers;
        this.initUniforms();
    }

    private initProgramsBuffers() {
        const gl = this.renderer.gl!;
        const { posArray, uvArray } = typedArray;
        const size = this.renderer.getSize();
        const programs: { [key: string]: Program } = {};
        const framebuffers: {
            [key: string]: NonNullable<ReturnType<typeof createFrameBuffer>>;
        } = {};
        const opts = {
            blurX: {
                vShader: beautyBlurShader.vShader,
                fShader: beautyBlurShader.fShader,
                size: { width: size.width >> 2, height: size.height >> 2 }
            },
            blurY: {
                vShader: beautyBlurShader.vShader,
                fShader: beautyBlurShader.fShader,
                size: { width: size.width >> 2, height: size.height >> 2 }
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
        };

        for (const key in opts) {
            const { vShader, fShader, size } = (opts as any)[key];
            // program
            const program = new Program(gl);
            program.setShader(vShader, 'VERTEX');
            program.setShader(fShader, 'FRAGMENT');
            program.setAttributeBuffer(
                createAttributeBuffer(gl, 'position', posArray, 2)
            );
            program.setAttributeBuffer(
                createAttributeBuffer(gl, 'uv', uvArray, 2)
            );
            programs[key] = program;

            // frameBuffer
            const frameBuffer = createFrameBuffer(gl, size.width, size.height)!;
            framebuffers[key] = frameBuffer;
        }

        return {
            programs: programs as typeof this.programs,
            framebuffers: framebuffers as typeof this.framebuffers
        };
    }

    private initUniforms() {
        const programs = this.programs;
        const framebuffers = this.framebuffers;
        const map = this.map;
        const { width, height } = this.renderer.getSize();
        const size = [width, height];
        const qSize = [width >> 2, height >> 2];

        programs['blurX'].setUniform('map', map);
        programs['blurX'].setUniform('size', qSize);

        programs['blurY'].setUniform(
            'map',
            framebuffers['blurX'].targetTexture
        );
        programs['blurY'].setUniform('size', qSize);
        programs['blurY'].setUniform('isVertical', 1.0);

        programs['highPass'].setUniform('map', map);
        programs['highPass'].setUniform(
            'blurMap',
            framebuffers['blurY'].targetTexture
        );

        programs['hBlurX'].setUniform(
            'map',
            framebuffers['highPass'].targetTexture
        );
        programs['hBlurX'].setUniform('size', size);

        programs['hBlurY'].setUniform(
            'map',
            framebuffers['hBlurX'].targetTexture
        );
        programs['hBlurY'].setUniform('size', size);
        programs['hBlurY'].setUniform('isVertical', 1.0);

        programs['beauty'].setUniform('size', size);
        programs['beauty'].setUniform('map', map);
        programs['beauty'].setUniform(
            'blurMap',
            framebuffers['blurY'].targetTexture
        );
        programs['beauty'].setUniform(
            'highPassMap',
            framebuffers['hBlurY'].targetTexture
        );
        programs['beauty'].setUniform('intensity', 0.0);

        programs['whiten'].setUniform('map', map);
        programs['whiten'].setUniform('lut', this.whitenMap);
        programs['whiten'].setUniform('intensity', 0.0);

        programs['redden'].setUniform('map', map);
        programs['redden'].setUniform('lut', this.reddenMap);
        programs['redden'].setUniform('intensity', 0.0);
    }

    get map() {
        return this._map;
    }
    set map(map: typeof this._map) {
        if (map !== this._map) {
            this._map = map;
            ['blurX', 'highPass', 'beauty'].forEach((key) => {
                (this.programs as any)[key].setUniform('map', this._map);
            });
        }
    }

    setLutsSrc(opts: { whiten?: string; redden?: string }) {
        const { whiten, redden } = opts;
        if (whiten) {
            loadImage(whiten, (img) => {
                this.whitenMap!.source = img;
                this.whitenMap!.refresh();
            });
        }
        if (redden) {
            loadImage(redden, (img) => {
                this.reddenMap!.source = img;
                this.reddenMap!.refresh();
            });
        }
    }

    get smooth() {
        return this._smooth;
    }
    set smooth(smooth: number) {
        if (this._smooth !== smooth) {
            if (smooth === 0) {
                this.programs['whiten'].setUniform('map', this.map);
                this.programs['redden'].setUniform(
                    'map',
                    this.whiten
                        ? this.framebuffers['whiten'].targetTexture
                        : this.map
                );
            } else if (this._smooth === 0) {
                this.programs['whiten'].setUniform(
                    'map',
                    this.framebuffers['beauty'].targetTexture
                );
                this.programs['redden'].setUniform(
                    'map',
                    this.whiten
                        ? this.framebuffers['whiten'].targetTexture
                        : this.framebuffers['beauty'].targetTexture
                );
            }
            this._smooth = smooth;
            this.programs['beauty'].setUniform('intensity', this._smooth);
        }
    }

    get whiten() {
        return this._whiten;
    }
    set whiten(whiten: number) {
        if (this._whiten !== whiten) {
            if (whiten === 0) {
                this.programs['redden'].setUniform(
                    'map',
                    this.smooth
                        ? this.framebuffers['beauty'].targetTexture
                        : this.map
                );
            } else if (this._whiten === 0) {
                this.programs['redden'].setUniform(
                    'map',
                    this.framebuffers['whiten'].targetTexture
                );
            }
            this._whiten = whiten;
            this.programs['whiten'].setUniform('intensity', this._whiten);
        }
    }

    get redden() {
        return this._redden;
    }
    set redden(redden: number) {
        if (this._redden !== redden) {
            this._redden = redden;
            this.programs['redden'].setUniform('intensity', this._redden);
        }
    }

    get output() {
        if (this.redden) {
            return this.framebuffers['redden'].targetTexture;
        }
        if (this.whiten) {
            return this.framebuffers['whiten'].targetTexture;
        }
        if (this.smooth) {
            return this.framebuffers['beauty'].targetTexture;
        }
        return this.map;
    }

    updateSize() {
        const rsize = this.renderer.getSize();
        const size = [rsize.width, rsize.height];
        const qSize = [rsize.width >> 2, rsize.height >> 2];
        ['blurX', 'blurY'].forEach((key) => {
            const frameBuffer = (this.framebuffers as any)[key];
            frameBuffer.targetTexture.opts.width = qSize[0];
            frameBuffer.targetTexture.opts.height = qSize[1];
            frameBuffer.targetTexture.refresh();
            const program = (this.programs as any)[key];
            program.setUniform('size', qSize);
        });
        ['highPass', 'hBlurX', 'hBlurY', 'beauty', 'whiten', 'redden'].forEach(
            (key) => {
                const frameBuffer = (this.framebuffers as any)[key];
                frameBuffer.targetTexture.opts.width = size[0];
                frameBuffer.targetTexture.opts.height = size[1];
                frameBuffer.targetTexture.refresh();
                if (['highPass', 'whiten', 'redden'].indexOf(key) < 0) {
                    const program = (this.programs as any)[key];
                    program.setUniform('size', size);
                }
            }
        );
    }

    render() {
        const renderer = this.renderer;
        const { width, height } = renderer.getSize();
        const programs = this.programs;
        const framebuffers = this.framebuffers;
        if (this.smooth) {
            renderer.setViewport(0, 0, width >> 2, height >> 2);
            // 原图缩小 4 倍模糊
            framebuffers['blurX'].bind();
            renderer.render(programs['blurX']);

            framebuffers['blurY'].bind();
            renderer.render(programs['blurY']);

            renderer.setViewport(0, 0, width, height);

            // highPass
            framebuffers['highPass'].bind();
            renderer.render(programs['highPass']);

            // highPass blur
            framebuffers['hBlurX'].bind();
            renderer.render(programs['hBlurX']);

            framebuffers['hBlurY'].bind();
            renderer.render(programs['hBlurY']);

            // 保变混合
            framebuffers['beauty'].bind();
            renderer.render(programs['beauty']);
        }
        if (this.whiten) {
            framebuffers['whiten'].bind();
            renderer.render(programs['whiten']);
        }
        if (this.redden) {
            framebuffers['redden'].bind();
            renderer.render(programs['redden']);
        }
    }

    destroy() {
        const gl = this.renderer.gl;
        for (const key in this.programs) {
            const framebuffer = (this.framebuffers as any)[key];
            gl?.deleteFramebuffer(framebuffer.frameBuffer ?? null);
            const program = (this.programs as any)[key];
            program.destroy();
        }
        gl?.deleteTexture(this.whitenMap!.glTexture);
        gl?.deleteTexture(this.reddenMap!.glTexture);
    }
}
