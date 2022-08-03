import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { magnifierShader } from '../../shaders/magnifier-shader.glsl';

export class MagnifierStyled extends StyledFilter {
    private _pos: [number, number] = [0, 0];
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
        program.setShader(magnifierShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const framebuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', this.map);
        program.setUniform('size', [size.width, size.height]);
        program.setUniform('pos', this.position);
        this.programs.main = program;
        this.framebuffers.main = framebuffer;
    }

    get intensity() {
        return super.intensity;
    }
    set intensity(intensity: number) {
        super.intensity = intensity;
        this.programs.main?.setUniform('intensity', this.intensity);
    }

    get position() {
        return this._pos;
    }
    set position(pos: [number, number]) {
        this._pos = [
            Math.min(1.0, Math.max(0.0, pos[0])),
            Math.min(1.0, Math.max(0.0, pos[1]))
        ];
        this.programs.main?.setUniform('pos', this.position);
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
        this.programs.main.setUniform('size', [size.width, size.height]);
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
