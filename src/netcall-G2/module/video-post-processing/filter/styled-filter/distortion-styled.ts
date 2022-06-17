import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { TVDistortionShader } from '../../shaders/tv-distortion-shader.glsl';
import { lutShader } from '../../shaders/lut-shader.glsl';

let instance: DistortionStyled | null = null;
let oldFilmImg: HTMLImageElement | null = null;
loadImage(
    'https://yx-web-nosdn.netease.im/common/6a38caeab164d1b5cc086391d6a11a74/huaijiu.png',
    (img) => {
        oldFilmImg = img;
        if (instance) {
            instance.oldFilmLut!.source = img;
            instance.oldFilmLut!.refresh();
        }
    }
);
export class DistortionStyled extends StyledFilter {
    oldFilmLut: ReturnType<typeof createTexture> = null;
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

    private initStyled() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();

        this.oldFilmLut = createTexture(gl, oldFilmImg, { flipY: false });

        const tvProgram = new Program(gl);
        tvProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        tvProgram.setShader(TVDistortionShader.fShader, 'FRAGMENT');
        tvProgram.setAttributeBuffer(this.posBuffer);
        tvProgram.setAttributeBuffer(this.uvBuffer);
        const tvFramebuffer = createFrameBuffer(gl, size.width, size.height)!;
        tvProgram.setUniform('map', this.map);
        tvProgram.setUniform('time', 0);
        this.programs.tv = tvProgram;
        this.framebuffers.tv = tvFramebuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(lutShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const frameBuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', tvFramebuffer.targetTexture);
        program.setUniform('lut', this.oldFilmLut);
        program.setUniform('intensity', 0.5);
        this.programs.main = program;
        this.framebuffers.main = frameBuffer;
    }

    get time() {
        return super.time;
    }
    set time(time: number) {
        super.time = time;
        this.programs.tv?.setUniform('time', this.time);
    }

    get intensity() {
        return super.intensity;
    }
    set intensity(intensity: number) {
        super.intensity = intensity;
        this.programs.tv?.setUniform('intensity', this.intensity);
        this.programs.main?.setUniform('intensity', (this.intensity + 1) * 0.5);
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.tv?.setUniform('map', map);
        }
    }

    get output() {
        return this.framebuffers.main.targetTexture;
    }

    updateSize() {
        const size = this.renderer.getSize();
        this.programs.tv?.setUniform('size', [size.width, size.height]);
        for (const key in this.framebuffers) {
            const framebuffer = this.framebuffers[key];
            if (framebuffer) {
                framebuffer.targetTexture.opts.width = size.width;
                framebuffer.targetTexture.opts.height = size.height;
                framebuffer.targetTexture.refresh();
            }
        }
    }

    render() {
        this.framebuffers.tv.bind();
        this.renderer.render(this.programs.tv);
        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }

    destroy(clearBuffer = true) {
        super.destroy(clearBuffer);
        const gl = this.renderer.gl;
        gl?.deleteTexture(this.oldFilmLut!.glTexture);
        instance = null;
    }
}
