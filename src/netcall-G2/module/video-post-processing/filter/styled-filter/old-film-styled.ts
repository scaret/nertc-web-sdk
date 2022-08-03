import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { oldFilmShader } from '../../shaders/old-film-shader.glsl';
import { lutShader } from '../../shaders/lut-shader.glsl';

const instances = new Set<OldFilmStyled>();
let dirtyImg: HTMLImageElement | null = null;
let oldFilmImg: HTMLImageElement | null = null;
loadImage(
    'https://yx-web-nosdn.netease.im/common/e7ea13cd337a076e246d9119d2eda3ee/dirty-map.png',
    (img) => {
        dirtyImg = img;
        instances.forEach((instance)=>{
            instance.dirtyMap!.source = img;
            instance.dirtyMap!.refresh();
        })
    }
);
loadImage(
    'https://yx-web-nosdn.netease.im/common/6a38caeab164d1b5cc086391d6a11a74/huaijiu.png',
    (img) => {
        oldFilmImg = img;
        instances.forEach((instance)=>{
            instance.oldFilmLut!.source = img;
            instance.oldFilmLut!.refresh();
        })
    }
);
export class OldFilmStyled extends StyledFilter {
    dirtyMap: ReturnType<typeof createTexture> = null;
    oldFilmLut: ReturnType<typeof createTexture> = null;

    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, uvBuffer);
        instances.add(this);
        this.initStyled();
    }

    private initStyled() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();

        this.dirtyMap = createTexture(gl, dirtyImg, {
            wrapS: 'repeat',
            wrapT: 'repeat'
        });
        this.oldFilmLut = createTexture(gl, oldFilmImg, { flipY: false });

        const oldProgram = new Program(gl);
        oldProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        oldProgram.setShader(oldFilmShader.fShader, 'FRAGMENT');
        oldProgram.setAttributeBuffer(this.posBuffer);
        oldProgram.setAttributeBuffer(this.uvBuffer);
        const oldFramebuffer = createFrameBuffer(gl, size.width, size.height)!;
        oldProgram.setUniform('map', this.map);
        oldProgram.setUniform('dirtMap', this.dirtyMap);
        oldProgram.setUniform('time', this.time);
        oldProgram.setUniform('size', [size.width, size.height]);
        oldProgram.setUniform('intensity', 0.0);
        this.programs.old = oldProgram;
        this.framebuffers.old = oldFramebuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(lutShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const frameBuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', oldFramebuffer.targetTexture);
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
        this.programs.old?.setUniform('time', this.time);
    }

    get intensity() {
        return super.intensity;
    }
    set intensity(intensity: number) {
        super.intensity = intensity;
        this.programs.old?.setUniform('intensity', this.intensity);
        this.programs.main?.setUniform('intensity', (this.intensity + 1) * 0.5);
    }

    get map() {
        return this._map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            this.programs.old?.setUniform('map', map);
        }
    }

    get output() {
        return this.framebuffers.main.targetTexture;
    }

    updateSize() {
        const size = this.renderer.getSize();
        this.programs.old?.setUniform('size', [size.width, size.height]);
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
        this.framebuffers.old.bind();
        this.renderer.render(this.programs.old);
        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }

    destroy(clearBuffer = true) {
        super.destroy(clearBuffer);
        const gl = this.renderer.gl;
        gl?.deleteTexture(this.dirtyMap!.glTexture);
        gl?.deleteTexture(this.oldFilmLut!.glTexture);
        instances.delete(this);
    }
}
