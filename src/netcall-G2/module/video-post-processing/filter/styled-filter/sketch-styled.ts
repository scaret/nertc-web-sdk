import { Renderer } from '../../gl-utils/renderer';
import { Program } from '../../gl-utils/program';
import { createAttributeBuffer } from '../../gl-utils/buffer-attribute';
import { createTexture, loadImage } from '../../gl-utils/texture';
import { createFrameBuffer } from '../../gl-utils/framebuffer';
import { StyledFilter } from './styled-filter';
import { baseTextureShader } from '../../shaders/base-texture-shader.glsl';
import { smoothShader } from '../../shaders/smooth-shader.glsl';
import { edgeShader } from '../../shaders/edge-shader.glsl';
import { sketchShader } from '../../shaders/sketch-shader.glsl';

const instances = new Set<SketchStyled>();
let gridImg: HTMLImageElement | null = null;
let pencilImg: HTMLImageElement | null = null;
loadImage(
    'https://yx-web-nosdn.netease.im/common/082a02e2398adef11f6e3c9b2b7f5d88/grid.png',
    (img) => {
        gridImg = img;
        instances.forEach((instance)=>{
            instance.gridMap!.source = img;
            instance.gridMap!.refresh();
        })
    }
);
loadImage(
    'https://yx-web-nosdn.netease.im/common/f1ad16a8efb5fa87b2068fe446a794d0/pencil-stroke.png',
    (img) => {
        pencilImg = img;
        instances.forEach((instance)=>{
            instance.pencilMap!.source = img;
            instance.pencilMap!.refresh();
        })
    }
);

export class SketchStyled extends StyledFilter {
    gridMap: ReturnType<typeof createTexture> = null;
    pencilMap: ReturnType<typeof createTexture> = null;
    private smCount = 1;

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

        this.gridMap = createTexture(gl, gridImg, {
            wrapS: 'repeat',
            wrapT: 'repeat'
        });
        this.pencilMap = createTexture(gl, pencilImg, {
            wrapS: 'repeat',
            wrapT: 'repeat'
        });

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

        const edgeProgram = new Program(gl);
        edgeProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        edgeProgram.setShader(edgeShader.fShader, 'FRAGMENT');
        edgeProgram.setAttributeBuffer(this.posBuffer);
        edgeProgram.setAttributeBuffer(this.uvBuffer);
        const edgeFramebuffer = createFrameBuffer(gl, size.width, size.height)!;
        edgeProgram.setUniform('map', this.framebuffers[`sm0`].targetTexture);
        edgeProgram.setUniform('size', smSize);
        this.programs.edge = edgeProgram;
        this.framebuffers.edge = edgeFramebuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(sketchShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const frameBuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('gridMap', this.gridMap);
        program.setUniform('pencilMap', this.pencilMap);
        program.setUniform('edgeMap', edgeFramebuffer.targetTexture);
        program.setUniform('size', smSize);
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
        this.programs.edge?.setUniform('intensity', intensity);
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
        const smSize = [size.width, size.height];
        for (const key in this.programs) {
            this.programs[key]?.setUniform('size', smSize);
            const framebuffer = this.framebuffers[key];
            if (framebuffer) {
                framebuffer.targetTexture.opts.width = smSize[0];
                framebuffer.targetTexture.opts.height = smSize[1];
                framebuffer.targetTexture.refresh();
            }
        }
    }

    render() {
        for (let i = 0; i < this.smCount; i++) {
            this.framebuffers[`sm${i}`].bind();
            this.renderer.render(this.programs[`sm${i}`]);
        }

        this.framebuffers.edge.bind();
        this.renderer.render(this.programs.edge);

        this.framebuffers.main.bind();
        this.renderer.render(this.programs.main);
    }

    destroy(clearBuffer = true) {
        super.destroy(clearBuffer);
        const gl = this.renderer.gl;
        gl?.deleteTexture(this.pencilMap!.glTexture);
        instances.delete(this);
    }
}
