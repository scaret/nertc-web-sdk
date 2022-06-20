import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture } from '../gl-utils/texture';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';
import { Filter } from './filter';

export class NormalFilter extends Filter {
    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, uvBuffer);
        this.programs.main = this.initProgram();
    }

    private initProgram() {
        const gl = this.renderer.gl!;
        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(baseTextureShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        program.setUniform('map', this._map);
        return program;
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

    render() {
        const renderer = this.renderer;
        const { width, height } = renderer.getSize();
        const gl = renderer.gl!;

        renderer.setViewport(0, 0, width, height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        renderer.render(this.programs.main);
    }
}
