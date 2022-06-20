import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { hackerShader } from '../../shaders/hacker-shader.glsl';
import { lutShader } from '../../shaders/lut-shader.glsl';

let instance: HackerStyled | null = null;
let hackerImg: HTMLImageElement | null = null;
let textImg: HTMLImageElement | null = null;
let rndImg: HTMLImageElement | null = null;
loadImage(
    'https://yx-web-nosdn.netease.im/common/aa92803e508487ec33a1be75459e46e7/haike.png',
    (img) => {
        hackerImg = img;
        if (instance) {
            instance.hackerMap!.source = img;
            instance.hackerMap!.refresh();
        }
    }
);
loadImage(
    'https://yx-web-nosdn.netease.im/common/b249f4d3024c9fc4533e199d1c78c158/text.png',
    (img) => {
        textImg = img;
        if (instance) {
            instance.textMap!.source = img;
            instance.textMap!.refresh();
        }
    }
);
loadImage(
    'https://yx-web-nosdn.netease.im/common/11f09edad695dfabf71e6961b7e78afd/rnd.png',
    (img) => {
        rndImg = img;
        if (instance) {
            instance.rndMap!.source = img;
            instance.rndMap!.refresh();
        }
    }
);
export class HackerStyled extends StyledFilter {
    hackerMap: ReturnType<typeof createTexture> = null;
    textMap: ReturnType<typeof createTexture> = null;
    rndMap: ReturnType<typeof createTexture> = null;
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

        this.hackerMap = createTexture(gl, hackerImg, { flipY: false });
        this.textMap = createTexture(gl, textImg, {
            wrapS: 'repeat',
            wrapT: 'repeat'
        });
        this.rndMap = createTexture(gl, rndImg);

        const hackerProgram = new Program(gl);
        hackerProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        hackerProgram.setShader(lutShader.fShader, 'FRAGMENT');
        hackerProgram.setAttributeBuffer(this.posBuffer);
        hackerProgram.setAttributeBuffer(this.uvBuffer);
        const hackerFrameBuffer = createFrameBuffer(
            gl,
            size.width,
            size.height
        )!;
        hackerProgram.setUniform('map', this.map);
        hackerProgram.setUniform('lut', this.hackerMap);
        hackerProgram.setUniform('intensity', 0.5);
        this.programs.hacker = hackerProgram;
        this.framebuffers.hacker = hackerFrameBuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(hackerShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const framebuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', this.framebuffers.hacker.targetTexture);
        program.setUniform('textMap', this.textMap);
        program.setUniform('rndMap', this.rndMap);
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
        this.programs.hacker?.setUniform(
            'intensity',
            this.intensity * 0.5 + 0.5
        );
        this.programs.main?.setUniform('intensity', this.intensity);
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.hacker?.setUniform('map', map);
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
        this.framebuffers.hacker.bind();
        this.renderer.render(this.programs.hacker);
        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }

    destroy(clearBuffer = true) {
        super.destroy(clearBuffer);
        const gl = this.renderer.gl;
        gl?.deleteTexture(this.hackerMap!.glTexture);
        gl?.deleteTexture(this.textMap!.glTexture);
        gl?.deleteTexture(this.rndMap!.glTexture);
        instance = null;
    }
}
