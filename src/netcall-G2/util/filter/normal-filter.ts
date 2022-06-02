//@ts-nocheck
import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture } from '../gl-utils/texture';
import { typedArray } from './typed-array';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';

export class NormalFilter {
    private renderer: Renderer;
    private _map: ReturnType<typeof createTexture>;
    private program: Program;

    constructor(renderer: Renderer, map: ReturnType<typeof createTexture>) {
        this.renderer = renderer;
        this._map = map;
        this.program = this.initProgram();
    }

    private initProgram() {
        const gl = this.renderer.gl!;
        const { posArray, uvArray } = typedArray;
        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(baseTextureShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(
            createAttributeBuffer(gl, 'position', posArray, 2)
        );
        program.setAttributeBuffer(createAttributeBuffer(gl, 'uv', uvArray, 2));
        program.setUniform('map', this._map);
        return program;
    }

    get map() {
        return this._map;
    }
    set map(map: typeof this._map) {
        if (this._map !== map) {
            this._map = map;
            this.program.setUniform('map', this._map);
        }
    }

    get output() {
        return null;
    }

    render() {
        const renderer = this.renderer;
        const { width, height } = renderer.getSize();
        const gl = renderer.gl!;

        renderer.setViewport(0, 0, width, height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        renderer.render(this.program);
    }

    destroy() {
        this.program.destroy();
    }
}
