import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { lutShader } from '../../shaders/lut-shader.glsl';
import { fireShader } from '../../shaders/fire-shader.glsl';

let instance: FireStyled | null = null;
let fireImg: HTMLImageElement | null = null;
let warmImg: HTMLImageElement | null = null;
loadImage(
    'https://yx-web-nosdn.netease.im/common/7809a2b1951cff7a2dacec82434e0ef3/fire-mask.png',
    (img) => {
        fireImg = img;
        if (instance) {
            instance.fireMap!.source = img;
            instance.fireMap!.refresh();
        }
    }
);
loadImage(
    'https://yx-web-nosdn.netease.im/common/3b3332c5ae4306312b6f3c4c552a464a/qingcheng.png',
    (img) => {
        warmImg = img;
        if (instance) {
            instance.fireMap!.source = img;
            instance.fireMap!.refresh();
        }
    }
);
export class FireStyled extends StyledFilter {
    fireMap: ReturnType<typeof createTexture> = null;
    warmMap: ReturnType<typeof createTexture> = null;
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

        this.fireMap = createTexture(gl, fireImg, {
            wrapS: 'repeat',
            wrapT: 'repeat'
        });
        this.warmMap = createTexture(gl, warmImg, { flipY: false });

        const warmProgram = new Program(gl);
        warmProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        warmProgram.setShader(lutShader.fShader, 'FRAGMENT');
        warmProgram.setAttributeBuffer(this.posBuffer);
        warmProgram.setAttributeBuffer(this.uvBuffer);
        const warmFrameBuffer = createFrameBuffer(gl, size.width, size.height)!;
        warmProgram.setUniform('map', this.map);
        warmProgram.setUniform('lut', this.warmMap);
        warmProgram.setUniform('intensity', 0.5);
        this.programs.warm = warmProgram;
        this.framebuffers.warm = warmFrameBuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(fireShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const framebuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', warmFrameBuffer.targetTexture);
        program.setUniform('fireMap', this.fireMap);
        program.setUniform('time', 0);
        program.setUniform('size', [size.width, size.height]);
        this.programs.main = program;
        this.framebuffers.main = framebuffer;
    }

    get time() {
        return super.time;
    }
    set time(time: number) {
        super.time = time;
        this.programs.main?.setUniform('time', this.time);
    }

    get intensity() {
        return super.intensity;
    }
    set intensity(intensity: number) {
        super.intensity = intensity;
        this.programs.warm?.setUniform('intensity', this.intensity * 0.5 + 0.5);
        this.programs.main?.setUniform('intensity', this.intensity);
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.warm?.setUniform('map', map);
        }
    }

    get output() {
        return this.framebuffers.main.targetTexture;
    }

    updateSize() {
        const size = this.renderer.getSize();
        this.programs.main.setUniform('size', [size.width, size.height]);
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
        this.framebuffers.warm.bind();
        this.renderer.render(this.programs.warm);
        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }

    destroy(clearBuffer = true) {
        super.destroy(clearBuffer);
        const gl = this.renderer.gl;
        gl?.deleteTexture(this.warmMap!.glTexture);
        gl?.deleteTexture(this.fireMap!.glTexture);
        instance = null;
    }
}
