import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture } from '../gl-utils/texture';
import { createFrameBuffer } from '../gl-utils/framebuffer';

export class Filter {
    protected renderer: Renderer;
    protected _map: ReturnType<typeof createTexture>;
    protected posBuffer: ReturnType<typeof createAttributeBuffer>;
    protected uvBuffer: ReturnType<typeof createAttributeBuffer>;
    programs: { [key: string]: Program } = {};
    framebuffers: {
        [key: string]: NonNullable<ReturnType<typeof createFrameBuffer>>;
    } = {};

    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        this.renderer = renderer;
        this._map = map;
        this.posBuffer = posBuffer;
        this.uvBuffer = uvBuffer;
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {}

    get output() {
        return this._map;
    }

    updateSize() {}

    render() {}

    destroy(clearBuffer = true) {
        const gl = this.renderer.gl;
        const framebuffers = this.framebuffers;
        const programs = this.programs;

        for (const key in framebuffers) {
            const framebuffer = framebuffers[key];
            framebuffer.bind(true);
            gl?.deleteTexture(framebuffer.targetTexture.glTexture);
            gl?.deleteFramebuffer(framebuffer.framebuffer);
        }
        for (const key in programs) {
            const program = programs[key];
            program.destroy(clearBuffer);
        }
    }
}
