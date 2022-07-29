import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture, toNthPower } from '../gl-utils/texture';
import { GlColor } from '../gl-utils/gl-color';
import { createFrameBuffer } from '../gl-utils/framebuffer';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';
import { mipMapBlurShader } from '../shaders/mip-map-blur.glsl';
import { virtualBackShader } from '../shaders/virtual-back-shader.glsl';
import { Filter } from './filter';

export class VirtualBackFilter extends Filter {
    // 源贴图
    private sourceMap: ReturnType<typeof createTexture>;
    // 遮罩贴图
    private maskMap: ReturnType<typeof createTexture>;
    // 背景颜色
    private bkColor: GlColor;
    // 背景贴图
    private bkMap: ReturnType<typeof createTexture>;
    // 背景模糊强度
    private intensity = 0.1;

    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        uvBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, uvBuffer);

        this.sourceMap = map;
        this.maskMap = createTexture(renderer.gl!, null);
        this.bkColor = new GlColor('#e7ad3c');
        this.bkMap = createTexture(renderer.gl!, null);

        this.initProgramBuffer();
    }

    private initProgramBuffer() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();
        const mipSize = [toNthPower(size.width), toNthPower(size.height)];

        const mipProgram = new Program(gl);
        mipProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        mipProgram.setShader(baseTextureShader.fShader, 'FRAGMENT');
        mipProgram.setAttributeBuffer(this.posBuffer);
        mipProgram.setAttributeBuffer(this.uvBuffer);
        const mipFramebuffer = createFrameBuffer(gl, mipSize[0], mipSize[1], true)!;
        mipProgram.setUniform('map', this.sourceMap);
        this.programs.mip = mipProgram;
        this.framebuffers.mip = mipFramebuffer;

        const blurProgram = new Program(gl);
        blurProgram.setShader(baseTextureShader.vShader, 'VERTEX');
        blurProgram.setShader(mipMapBlurShader.fShader, 'FRAGMENT');
        blurProgram.setAttributeBuffer(this.posBuffer);
        blurProgram.setAttributeBuffer(this.uvBuffer);
        const blurFramebuffer = createFrameBuffer(gl, size.width, size.height)!;
        blurProgram.setUniform('map', mipFramebuffer.targetTexture);
        blurProgram.setUniform('radius', Math.max(size.width, size.height)*0.25);
        blurProgram.setUniform('intensity', 0.1);
        this.programs.blur = blurProgram;
        this.framebuffers.blur = blurFramebuffer;

        const program = new Program(gl);
        program.setShader(baseTextureShader.vShader, 'VERTEX');
        program.setShader(virtualBackShader.fShader, 'FRAGMENT');
        program.setAttributeBuffer(this.posBuffer);
        program.setAttributeBuffer(this.uvBuffer);
        const framebuffer = createFrameBuffer(gl, size.width, size.height)!;
        program.setUniform('map', this.map);
        program.setUniform('maskMap', this.maskMap);
        program.setUniform('backColor', this.bkColor.value);
        program.setUniform('backMap', this.bkMap);
        program.setUniform('size',[size.width, size.height]);
        program.setUniform('bkSize',[0, 0]);
        program.setUniform('backType',0);
        program.setUniform('emptyFrame', 0);
        this.programs.main = program;
        this.framebuffers.main = framebuffer;
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

    set emptyFrame(isEmptyFrame: boolean){
        this.programs.main.setUniform('emptyFrame', isEmptyFrame ? 1 : 0);
    }

    setMaskMap(source: TexImageSource | null){
        const map = this.maskMap;
        if (map) {
            map.source = source;
            map.refresh();
        }
    }

    private setBkColor(color: string | null){
        this.bkColor.setValue(color || '#e7ad3c');
        this.programs.main.setUniform('backColor', this.bkColor.value);
    }

    private getBkInfo(){
        const map = this.bkMap;
        const source = map ? map.source : null;
        const info = {
            type: 'color',
            size:[0, 0]
        };
        if(source){
            if('videoWidth' in source){
                info.type = 'video';
                info.size = [source.videoWidth, source.videoHeight];
            }else if(source instanceof Image){
                info.type = 'image';
                info.size = [source.naturalWidth, source.naturalHeight];
            }
        }
        return info;
    }

    private setBkMap(source: HTMLVideoElement | HTMLImageElement | null){
        const map = this.bkMap;
        if (map) {
            if(source instanceof Image || source === null){
                map.source = source;
                map.refresh();
            }else{
                if('readyState' in source){
                    if(source.readyState < 2){
                        setTimeout(() => {
                            this.setBkMap(source);
                        }, 16.7);
                    }else{
                        map.source = source;
                        map.refresh();
                    }
                }
            }
        }
    }

    /**
     * 设置背景
     * @param {HTMLImageElement|HTMLVideoElement|string|null} source 背景元素
     */
    setBackground(source: HTMLImageElement | HTMLVideoElement | string | null){
        const type = typeof source;
        if(type === 'string' || source === null){
            this.setBkColor(source as string);
            this.setBkMap(null);
        }else if(type === 'object'){
            this.setBkColor(null);
            this.setBkMap(source as HTMLImageElement);
        }
        const info = this.getBkInfo();
        this.programs.main.setUniform('backType', info.type === 'color' ? 0 : 1);
        if(info.type !== 'color'){
            this.programs.main.setUniform('backMap', this.bkMap);
            this.programs.main.setUniform('bkSize', info.size);
        }
    }

    setBlurIntensity(intensity: number){
        const size = this.renderer.getSize();
        intensity = Math.max(0.1, Math.min(1.0, intensity));
        this.programs.blur.setUniform('intensity', intensity);
        this.programs.main.setUniform('backMap', this.framebuffers.blur.targetTexture);
        this.programs.main.setUniform('bkSize', [size.width, size.height]);
        this.programs.main.setUniform('backType', 1);
    }

    get output() {
        if (this.maskMap && this.maskMap.source) {
            return this.framebuffers.main.targetTexture;
        }
        return super.output;
    }

    updateSize() {
        const size = this.renderer.getSize();
        const mipSize = [toNthPower(size.width), toNthPower(size.height)];
        ['blur','main'].forEach((key)=>{
            const framebuffer = this.framebuffers[key];
            framebuffer.targetTexture.opts.width = size.width;
            framebuffer.targetTexture.opts.height = size.height;
            framebuffer.targetTexture.refresh();
        })
        const framebuffer = this.framebuffers.mip;
        framebuffer.targetTexture.opts.width = mipSize[0];
        framebuffer.targetTexture.opts.height = mipSize[1];
        framebuffer.targetTexture.refresh();
        this.programs.main.setUniform('size', [size.width, size.height]);
        this.programs.blur.setUniform('radius', Math.max(size.width, size.height)*0.25);
        if(this.programs.main.getUniform('backMap').value === framebuffer.targetTexture){
            this.programs.main.setUniform('bkSize', mipSize);
        }
    }

    render() {
        if(this.maskMap && this.maskMap.source){
            const renderer = this.renderer;
            if(this.programs.main.getUniform('backMap').value === this.framebuffers.blur.targetTexture){
                const size = renderer.getSize();
                const mip = this.framebuffers.mip.targetTexture
                renderer.setViewport(0, 0, mip.opts.width!, mip.opts.height!);
                this.framebuffers.mip.bind();
                this.programs.mip.render();
                this.framebuffers.mip.targetTexture.updateMipMap();

                renderer.setViewport(0, 0, size.width, size.height);
                this.framebuffers.blur.bind();
                this.programs.blur.render();
            }else{
                const info = this.getBkInfo();
                // 如果背景是视频，需每帧更新视频源
                if(info.type === 'video'){
                    this.bkMap?.refresh();
                }
            }
            this.framebuffers.main.bind();
            this.programs.main.render();
        }
    }

    destroy() {
        super.destroy();
        this.renderer.gl?.deleteTexture(this.maskMap!.glTexture);
        this.renderer.gl?.deleteTexture(this.bkMap!.glTexture);
    }
}
