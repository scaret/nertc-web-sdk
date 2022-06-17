import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture, loadImage, toNthPower } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { smoothShader } from '../../shaders/smooth-shader.glsl';
import { flatShader } from '../../shaders/flat-shader.glsl';
import { lutShader } from '../../shaders/lut-shader.glsl';

let instance: FlatStyled | null = null;
let lutImg: HTMLImageElement | null = null;
loadImage(
    'https://yx-web-nosdn.netease.im/common/cf8bfec70d7998bb0033757276c6559a/weimei.png',
    (img) => {
        lutImg = img;
        if (instance) {
            instance.lutMap!.source = img;
            instance.lutMap!.refresh();
        }
    }
);
export class FlatStyled extends StyledFilter {
    lutMap: ReturnType<typeof createTexture> = null;
    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, uvBuffer);
        this.initStyled();
        instance = this;
    }
    private smCount = 1;
    private initStyled() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();

        this.lutMap = createTexture(gl, lutImg, { flipY: false });

        const smSize = [size.width, size.height];
        for (let i = 0; i < this.smCount; i++) {
            const smProgram = new Program(gl);
            smProgram.setShader(baseTextureShader.vShader, 'VERTEX');
            smProgram.setShader(smoothShader.fShader, 'FRAGMENT');
            smProgram.setAttributeBuffer(this.posBuffer);
            smProgram.setAttributeBuffer(this.uvBuffer);
            const smFramebuffer = createFrameBuffer(gl, smSize[0], smSize[1])!;
            smProgram.setUniform(
                'map',
                i === 0
                    ? this.map
                    : this.framebuffers[`sm${i - 1}`].targetTexture
            );
            smProgram.setUniform('size', smSize);
            smProgram.setUniform('intensity', 0.0);
            this.programs[`sm${i}`] = smProgram;
            this.framebuffers[`sm${i}`] = smFramebuffer;
        }

        const mipProgram = new Program(gl);
        const mipSize = [toNthPower(size.width), toNthPower(size.height)];
        mipProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        mipProgram.setShader(baseTextureShader.fShader, 'FRAGMENT');
        mipProgram.setAttributeBuffer(this.posBuffer);
        mipProgram.setAttributeBuffer(this.uvBuffer);
        const mipFramebuffer = createFrameBuffer(
            gl,
            mipSize[0],
            mipSize[1],
            true
        )!;
        mipProgram.setUniform(
            'map',
            this.framebuffers[`sm${this.smCount - 1}`].targetTexture
        );
        this.programs.mip = mipProgram;
        this.framebuffers.mip = mipFramebuffer;

        const flatProgram = new Program(gl);
        flatProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        flatProgram.setShader(flatShader.fShader, 'FRAGMENT');
        flatProgram.setAttributeBuffer(this.posBuffer);
        flatProgram.setAttributeBuffer(this.uvBuffer);
        const flatFramebuffer = createFrameBuffer(gl, size.width, size.height)!;
        flatProgram.setUniform('mipMap', mipFramebuffer.targetTexture);
        flatProgram.setUniform(
            'map',
            this.framebuffers[`sm${this.smCount - 1}`].targetTexture
        );
        flatProgram.setUniform('minSize', Math.min(...mipSize));
        this.programs.flat = flatProgram;
        this.framebuffers.flat = flatFramebuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(lutShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const frameBuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', flatFramebuffer.targetTexture);
        program.setUniform('lut', this.lutMap);
        program.setUniform('intensity', 0.5);
        this.programs.main = program;
        this.framebuffers.main = frameBuffer;
    }

    get intensity() {
        return super.intensity;
    }
    set intensity(intensity: number) {
        super.intensity = intensity;
        for (let i = 0; i < this.smCount; i++) {
            this.programs[`sm${i}`]?.setUniform('intensity', intensity);
        }
        this.programs.flat?.setUniform('intensity', intensity);
        this.programs.main?.setUniform('intensity', (intensity + 1.0) * 0.5);
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.sm0?.setUniform('map', map);
        }
    }

    get output() {
        return this.framebuffers.main.targetTexture;
    }

    updateSize() {
        const size = this.renderer.getSize();

        for (let i = 0; i < this.smCount; i++) {
            this.programs[`sm${i}`]?.setUniform('size', [
                size.width,
                size.height
            ]);
            const framebuffer = this.framebuffers[`sm${i}`];
            if (framebuffer) {
                framebuffer.targetTexture.opts.width = size.width;
                framebuffer.targetTexture.opts.height = size.height;
                framebuffer.targetTexture.refresh();
            }
        }
        const framebuffer = this.framebuffers.mip;
        if (framebuffer) {
            const mipSize = [toNthPower(size.width), toNthPower(size.height)];
            framebuffer.targetTexture.opts.width = mipSize[0];
            framebuffer.targetTexture.opts.height = mipSize[1];
            framebuffer.targetTexture.refresh();
            this.programs.mip.setUniform('minSize', Math.min(...mipSize));
        }
        ['flat', 'main'].forEach((key) => {
            const framebuffer = this.framebuffers[key];
            if (framebuffer) {
                framebuffer.targetTexture.opts.width = size.width;
                framebuffer.targetTexture.opts.height = size.height;
                framebuffer.targetTexture.refresh();
            }
        });
    }

    render() {
        const size = this.renderer.getSize();

        for (let i = 0; i < this.smCount; i++) {
            this.framebuffers[`sm${i}`].bind();
            this.renderer.render(this.programs[`sm${i}`]);
        }

        this.renderer.setViewport(
            0,
            0,
            this.framebuffers.mip.targetTexture.opts.width!,
            this.framebuffers.mip.targetTexture.opts.height!
        );
        this.framebuffers.mip.bind();
        this.renderer.render(this.programs.mip);
        this.framebuffers.mip.targetTexture.updateMipMap();

        this.renderer.setViewport(0, 0, size.width, size.height);

        this.framebuffers.flat.bind();
        this.renderer.render(this.programs.flat);

        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }

    destroy(clearBuffer = true) {
        super.destroy(clearBuffer);
        const gl = this.renderer.gl;
        gl?.deleteTexture(this.lutMap!.glTexture);
        instance = null;
    }
}
