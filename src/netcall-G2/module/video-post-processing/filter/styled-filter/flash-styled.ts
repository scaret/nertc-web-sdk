import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { flashShader } from '../../shaders/flash-shader.glsl';

export class FlashStyled extends StyledFilter {
    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, uvBuffer);
        this.initStyled();
    }

    private initStyled() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(flashShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const framebuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', this.map);
        program.setUniform('time', 0);
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
        this.programs.main?.setUniform('intensity', this.intensity);
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.main?.setUniform('map', map);
        }
    }

    get output() {
        return this.framebuffers.main.targetTexture;
    }

    updateSize() {
        const size = this.renderer.getSize();
        const framebuffer = this.framebuffers.main;
        if (framebuffer) {
            framebuffer.targetTexture.opts.width = size.width;
            framebuffer.targetTexture.opts.height = size.height;
            framebuffer.targetTexture.refresh();
        }
    }

    render() {
        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }
}
