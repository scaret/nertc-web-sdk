import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture } from '../gl-utils/texture';
import { createFrameBuffer } from '../gl-utils/framebuffer';
import { advBeautyWireShader } from '../shaders/adv-beauty/adv-beauty-wire-shader.glsl';
import { advBeautyShader } from '../shaders/adv-beauty/adv-beauty-shader.glsl';
import { Filter } from './filter';
import { Vector2, preHandle, handlers, HandleKey } from './adv-beauty-math';

const advBtyFaceMesh = {
    genFaceOutline(keyPoints: Int16Array) {
        const extraPts = [
            0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32
        ];
        const startIndex = 106;
        const p43 = Vector2.getVec(keyPoints, 43);
        for (let i = 0; i < 17; i++) {
            const idx = extraPts[i];
            const pStart = Vector2.getVec(keyPoints, idx);
            const pExt = Vector2.add(
                p43,
                Vector2.scale(Vector2.sub(pStart, p43), 1.3)
            );
            const eIdx = (startIndex + i) * 2;
            keyPoints[eIdx] = pExt.value[0] >> 0;
            keyPoints[eIdx + 1] = pExt.value[1] >> 0;
        }
    }
};

export class AdvBeautyFilter extends Filter {
    // 调试参数，是否打开线框显示
    private isShowWire = false;

    private advData: Int16Array | null = null;
    private wirePosBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private targetPosBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private zIndexBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private indicesBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private defParams:{[key in HandleKey]: number} = {
        'enlargeEye':0,
        'roundedEye':0,
        'openCanthus':0,
        'eyeDistance':0.5,
        'eyeAngle':0.5,
        'shrinkNose':0,
        'lengthenNose':0.5,
        'shrinkMouth':0.5,
        'mouthCorners':0.5,
        'adjustPhiltrum': 0.5,
        'shrinkUnderjaw': 0,
        'shrinkCheekbone': 0,
        'lengthenJaw': 0.5,
        'narrowedFace':0,
        'shrinkFace':0,
        'vShapedFace':0.5,
        'minifyFace':0
    }
    private params:{[key in HandleKey]: number};

    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        zIndexBuffer: ReturnType<typeof createAttributeBuffer>,
        indicesBuffer: ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, null);
        this.params = {...this.defParams};
        advBtyFaceMesh.genFaceOutline(
            this.posBuffer!.typedArray as Int16Array
        );
        this.targetPosBuffer = createAttributeBuffer(this.renderer.gl!, 'tPosition', this.posBuffer!.typedArray!.slice(0), 2);
        this.zIndexBuffer = zIndexBuffer;
        this.indicesBuffer = indicesBuffer;
        this.setWirePosBuffer();
        this.initProgramBuffer();
    }

    private setWirePosBuffer() {
        if(!this.isShowWire) return;
        const existKeys = new Set();
        const wirePos: number[] = [];
        const indices = this.indicesBuffer!.typedArray!;
        const pos = this.posBuffer!.typedArray!;
        const genLine = (i1: number, i2: number) => {
            if (
                !existKeys.has(i1 + '-' + i2) &&
                !existKeys.has(i2 + '-' + i1)
            ) {
                existKeys.add(i1 + '-' + i2);
                const p1 = i1 * 2;
                const p2 = i2 * 2;
                wirePos.push(pos[p1], pos[p1 + 1], pos[p2], pos[p2 + 1]);
            }
        };
        for (let i = 0; i < (indices.length - 2) / 3; i++) {
            const j = i * 3;
            const i1 = indices[j];
            const i2 = indices[j + 1];
            const i3 = indices[j + 2];
            genLine(i1, i2);
            genLine(i2, i3);
            genLine(i3, i1);
        }
        if(this.wirePosBuffer){
            this.programs.wire.updateAttribute('position', (typedArray)=>{
                (<Int16Array>typedArray).set(wirePos, 0);
            });
        }else{
            this.wirePosBuffer = createAttributeBuffer(
                this.renderer.gl!,
                'position',
                new Int16Array(wirePos),
                2
            );
        }
    }

    private initProgramBuffer() {
        const gl = this.renderer.gl!;
        const size = this.renderer.getSize();

        let wireFramebuffer = null;
        if(this.isShowWire){
            const wireProgram = new Program(gl, () => {
                gl.drawArrays(gl.LINES, 0, this.wirePosBuffer?.count || 0);
            });
            wireProgram.setShader(advBeautyWireShader.vShader, 'VERTEX');
            wireProgram.setShader(advBeautyWireShader.fShader, 'FRAGMENT');
            wireProgram.setAttributeBuffer(this.wirePosBuffer);
            wireFramebuffer = createFrameBuffer(gl, size.width, size.height)!;
            wireProgram.setUniform('size', [size.width, size.height]);
            this.programs.wire = wireProgram;
            this.framebuffers.wire = wireFramebuffer;
        }

        for(let i=0; i<2; i++){
            const morphProgram = new Program(gl, () => {
                gl.drawElements(
                    gl.TRIANGLES,
                    this.indicesBuffer!.count,
                    gl.UNSIGNED_SHORT,
                    0
                );
            });
            morphProgram.setShader(advBeautyShader.vShader, 'VERTEX');
            morphProgram.setShader(advBeautyShader.fShader, 'FRAGMENT');
            morphProgram.setAttributeBuffer(this.posBuffer);
            morphProgram.setAttributeBuffer(this.targetPosBuffer);
            morphProgram.setAttributeBuffer(this.zIndexBuffer);
            const morphFramebuffer = createFrameBuffer(
                gl,
                size.width,
                size.height
            )!;
            morphProgram.setUniform('size', [size.width, size.height]);
            morphProgram.setUniform('map', i===0 ? this.map : this.framebuffers['morph0'].targetTexture);
            if(this.isShowWire){
                morphProgram.setUniform('wireMap', wireFramebuffer!.targetTexture);
            }
            morphProgram.setUniform('showWire', this.isShowWire ? 1.0 : 0.0);
            morphProgram.setIndices(this.indicesBuffer);
            this.programs[`morph${i}`] = morphProgram;
            this.framebuffers[`morph${i}`] = morphFramebuffer;
        }
    }

    get output() {
        if (this.advData) {
            const faceNum = this.advData.length / 212 >> 0;
            return this.framebuffers[`morph${(faceNum-1)%2}`].targetTexture;
        }
        return super.output;
    }

    updateSize() {
        const size = this.renderer.getSize();
        ['wire', 'morph0', 'morph1'].forEach((key) => {
            this.programs[key]?.setUniform('size', [size.width, size.height]);

            const framebuffer = this.framebuffers[key];
            if(framebuffer){
                framebuffer.targetTexture.opts.width = size.width;
                framebuffer.targetTexture.opts.height = size.height;
                framebuffer.targetTexture.refresh();
            }
        });
    }

    setAdvData(data: Int16Array){
        this.advData = data.length ? data : null;
    }

    setAdvEffect(key: HandleKey | 'reset', intensity?: number){
        if(key in this.params && typeof intensity === 'number'){
            this.params[key as HandleKey] = Math.min(1, Math.max(0, intensity));
        }else{
            this.params = {...this.defParams};
        }
    }

    render() {
        const advData = this.advData;
        if(advData){
            const renderer = this.renderer;
            const gl = renderer.gl!;
            const faceNum = advData.length / 212 >> 0;
            for(let i=0; i < faceNum; i++){
                const data = advData.slice(i * 212, (i+1) * 212);
                const idx = i%2;
                const morph = this.programs[`morph${idx}`];

                // 设置点位
                morph.updateAttribute('position', (typedArray)=>{
                    (<Int16Array>typedArray).set(data, 0);
                    advBtyFaceMesh.genFaceOutline(<Int16Array>typedArray);
                });

                // 计算点位
                morph.updateAttribute('tPosition', (typedArray)=>{
                    const array = typedArray as Int16Array;
                    array.set(this.posBuffer!.typedArray!, 0);

                    // 进行美颜点位计算
                    preHandle(array);
                    for(const key in handlers){
                        const intensity = this.params[<HandleKey>key];
                        if(intensity!==this.defParams[<HandleKey>key]){
                            handlers[<HandleKey>key](array, intensity);
                        }
                    }
                })
                this.setWirePosBuffer();

                // 渲染线框
                if(this.isShowWire){
                    this.framebuffers.wire.bind();
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    this.renderer.render(this.programs.wire);
                }

                // 渲染变形结果
                morph.setUniform('map', i < 1 ? this.map : this.framebuffers[`morph${idx===0 ? 1 : 0}`].targetTexture);
                this.framebuffers[`morph${idx}`].bind();
                this.renderer.render(morph);
            }
        }
    }

    destroy() {
        super.destroy();
    }
}
