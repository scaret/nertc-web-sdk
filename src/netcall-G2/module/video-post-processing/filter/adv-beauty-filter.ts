import { Renderer } from '../gl-utils/renderer';
import { Program } from '../gl-utils/program';
import { createAttributeBuffer } from '../gl-utils/buffer-attribute';
import { createTexture, retryLoadImage } from '../gl-utils/texture';
import { createFrameBuffer } from '../gl-utils/framebuffer';
import { baseTextureShader } from '../shaders/base-texture-shader.glsl';
import { advBeautyWireShader } from '../shaders/adv-beauty/adv-beauty-wire-shader.glsl';
import { advBeautyShader } from '../shaders/adv-beauty/adv-beauty-shader.glsl';
import { advBeautyEyeShader } from '../shaders/adv-beauty/adv-beauty-eye-shader.glsl';
import { advFaceMaskShader } from '../shaders/adv-beauty/adv-facemask-shader.glsl';
import { Filter } from './filter';
import { Vector2, preHandle, handlers, HandleKey, Matrix3x3 } from './adv-beauty-math';

type AdvBeautyResType = {
    faceMask?: string,
    eyeTeethMask?: string,
    teethWhiten?: string
}

export const resSet = {
    faceMask:'https://yx-web-nosdn.netease.im/common/c4e1b30c74ae5dad6e605ec332775b14/facemask.png',
    eyeTeethMask:'https://yx-web-nosdn.netease.im/common/655421269305cac5c1e48d62f0fac8de/eye-teeth-mask-02.png',
    teethWhiten:'https://yx-web-nosdn.netease.im/common/ca8a6b0be3427ead9b19bcf9ae1245a8/teath.png'
}

const advBtyFaceMesh = {
    // 插值出额头部分的 facemesh
    genTopFace(keyPoints: Int16Array){
        const p49 = Vector2.getVec(keyPoints, 49);
        const p43 = Vector2.getVec(keyPoints, 43);

        let topNormal = Vector2.sub(p43, p49);
        let topLen = topNormal.length * 1.5;
        topNormal = Vector2.normalize(topNormal);
        const leftDir = Vector2.sub(Vector2.getVec(keyPoints, 0), p43);
        let leftLen = leftDir.length;
        const rightDir = Vector2.sub(Vector2.getVec(keyPoints, 32), p43);
        let rightLen = rightDir.length;

        const maxLen = Math.max(leftLen, rightLen);

        let lmiscut = leftLen / maxLen;
        let rmiscut = rightLen / maxLen;

        // 计算 116 点
        Vector2.setPoint(keyPoints, 116, Vector2.add(p43, Vector2.scale(topNormal, topLen)));

        // 计算左边点位
        let angle = Vector2.angle(leftDir, topNormal);
        let rotMat = Matrix3x3.rotate(angle/-6, 0, 0);
        let normal = topNormal;
        [110, 109, 108, 107, 106].forEach((index, idx)=>{
            normal = rotMat.multiplyVector(normal);
            const ratio = (idx+1)/7;
            const miscut = 1 * (1-ratio) + lmiscut * ratio;
            Vector2.setPoint(keyPoints, index, Vector2.add(p43, Vector2.scale(normal, topLen * miscut * (1.0-ratio) + leftLen*ratio )));
        })

        // 计算右边点位
        angle = Vector2.angle(rightDir, topNormal);
        rotMat = Matrix3x3.rotate(angle/6, 0, 0);
        normal = topNormal;
        [115, 114, 113, 112, 111].forEach((index, idx)=>{
            normal = rotMat.multiplyVector(normal);
            const ratio = (idx+1)/7;
            const miscut = 1 * (1-ratio) + rmiscut * ratio;
            Vector2.setPoint(keyPoints, index, Vector2.add(p43, Vector2.scale(normal, topLen * miscut * (1.0-ratio) + rightLen * ratio )));
        })
    },
    genFaceOutline(keyPoints: Int16Array) {
        const extraPts = [
            0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 
            106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116
        ];
        const startIndex = 117;
        const p43 = Vector2.getVec(keyPoints, 43);
        for (let i = 0; i < extraPts.length; i++) {
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

const instances = new Set<AdvBeautyFilter>();
let faceMaskImg: HTMLImageElement | null = null;
let eyeTeethMaskImg: HTMLImageElement | null = null;
let whiteTeethLutImg: HTMLImageElement | null = null;
export class AdvBeautyFilter extends Filter {
    // 调试参数，是否打开线框显示
    private isShowWire = false;

    faceMaskMap: ReturnType<typeof createTexture>;
    eyeTeethMaskMap: ReturnType<typeof createTexture>;
    whiteTeethLutMap: ReturnType<typeof createTexture>;

    private advData: Int16Array | null = null;
    private wirePosBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private targetPosBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private zIndexBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private indicesBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private faceMaskUVBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private planePosBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private planeUVBuffer: ReturnType<typeof createAttributeBuffer> = null;
    private advEyeTeethPosBuffer:ReturnType<typeof createAttributeBuffer> = null;
    private advEyeTeethIndicesBuffer:ReturnType<typeof createAttributeBuffer> = null;
    private advEyeTeethZindexBuffer:ReturnType<typeof createAttributeBuffer> = null;
    private advEyeTeethUVBuffer:ReturnType<typeof createAttributeBuffer> = null;

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
        'vShapedFace':0,
        'minifyFace':0,
        'whitenTeeth':0,
        'brightenEye':0
    }
    private params:{[key in HandleKey]: number};

    constructor(
        renderer: Renderer,
        map: ReturnType<typeof createTexture>,
        posBuffer: ReturnType<typeof createAttributeBuffer>,
        zIndexBuffer: ReturnType<typeof createAttributeBuffer>,
        indicesBuffer: ReturnType<typeof createAttributeBuffer>,
        faceMaskUVBuffer: ReturnType<typeof createAttributeBuffer>,
        planePosBuffer: ReturnType<typeof createAttributeBuffer>,
        planeUVBuffer: ReturnType<typeof createAttributeBuffer>,
        advEyeTeethPosBuffer:ReturnType<typeof createAttributeBuffer>,
        advEyeTeethIndicesBuffer:ReturnType<typeof createAttributeBuffer>,
        advEyeTeethZindexBuffer:ReturnType<typeof createAttributeBuffer>,
        advEyeTeethUVBuffer:ReturnType<typeof createAttributeBuffer>
    ) {
        super(renderer, map, posBuffer, null);
        instances.add(this);

        this.faceMaskMap = createTexture(this.renderer.gl!, faceMaskImg);
        this.eyeTeethMaskMap = createTexture(this.renderer.gl!, eyeTeethMaskImg);
        this.whiteTeethLutMap = createTexture(this.renderer.gl!, whiteTeethLutImg, { flipY: false });

        this.params = {...this.defParams};

        advBtyFaceMesh.genTopFace(this.posBuffer!.typedArray as Int16Array);
        advBtyFaceMesh.genFaceOutline(
            this.posBuffer!.typedArray as Int16Array
        );

        this.targetPosBuffer = createAttributeBuffer(this.renderer.gl!, 'tPosition', this.posBuffer!.typedArray!.slice(0), 2);
        this.zIndexBuffer = zIndexBuffer;
        this.indicesBuffer = indicesBuffer;
        this.faceMaskUVBuffer = faceMaskUVBuffer;
        this.planePosBuffer = planePosBuffer;
        this.planeUVBuffer = planeUVBuffer;
        this.advEyeTeethPosBuffer = advEyeTeethPosBuffer;
        this.advEyeTeethIndicesBuffer = advEyeTeethIndicesBuffer;
        this.advEyeTeethZindexBuffer = advEyeTeethZindexBuffer;
        this.advEyeTeethUVBuffer = advEyeTeethUVBuffer;

        this.setWirePosBuffer();
        this.initProgramBuffer();

        // 以下代码用以输出 mask uv 贴图 及 uv 坐标信息
        // 不用时注释，但请勿删除
        // window.addEventListener('keydown', (e)=>{
        //     if(e.key === 'Escape'){
        //         // 输出 uv 贴图
        //         const imgURL = this.renderer.canvas.toDataURL("image/png");
        //         const dlLink = document.createElement('a');
        //         dlLink.download = 'uv';
        //         dlLink.href = imgURL;
        //         dlLink.dataset.downloadurl = ["image/png", dlLink.download, dlLink.href].join(':');
        //         document.body.appendChild(dlLink);
        //         dlLink.click();
        //         document.body.removeChild(dlLink);
        //         // 输出 uv 坐标
        //         const uvs:number[] = [];
        //         const posData = this.posBuffer!.typedArray!;
        //         posData.forEach((pos: number, idx: number)=>{
        //             if(idx%2===0){
        //                 // x uv计算
        //                 uvs.push(pos/512);
        //             }else{
        //                 // y uv计算
        //                 uvs.push(1.0 - pos / 512);
        //             }
        //         })
        //         console.log(JSON.stringify(uvs));
        //     }
        // })
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
        const miniSize = {
            width: size.width >> 2,
            height: size.height >> 2
        };
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

        // 面部变形
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
        
        if(this.isShowWire){
            morphProgram.setUniform('wireMap', wireFramebuffer!.targetTexture);
        }
        morphProgram.setUniform('showWire', this.isShowWire ? 1.0 : 0.0);
        morphProgram.setUniform('map', this.map);
        morphProgram.setUniform('teethLut', this.whiteTeethLutMap);
        morphProgram.setUniform('teethIntensity', 0.0);
        morphProgram.setUniform('eyeIntensity', 0.0);
        morphProgram.setIndices(this.indicesBuffer);
        this.programs.morph = morphProgram;
        this.framebuffers.morph = morphFramebuffer;

        // 脸部遮罩
        const faceMaskProgram = new Program(gl, () => {
            gl.drawElements(
                gl.TRIANGLES,
                this.indicesBuffer!.count,
                gl.UNSIGNED_SHORT,
                0
            );
        });
        faceMaskProgram.setShader(advFaceMaskShader.vShader, 'VERTEX');
        faceMaskProgram.setShader(baseTextureShader.fShader, 'FRAGMENT');
        faceMaskProgram.setAttributeBuffer(this.targetPosBuffer);
        faceMaskProgram.setAttributeBuffer(this.zIndexBuffer);
        faceMaskProgram.setAttributeBuffer(this.faceMaskUVBuffer);
        const faceMaskFramebuffer = createFrameBuffer(
            gl,
            miniSize.width,
            miniSize.height
        )!;
        faceMaskProgram.setUniform('size', [size.width, size.height]);
        faceMaskProgram.setUniform('map', this.faceMaskMap);
        faceMaskProgram.setIndices(this.indicesBuffer);
        this.programs.faceMask = faceMaskProgram;
        this.framebuffers.faceMask = faceMaskFramebuffer;

        // 眼睛牙齿遮罩
        const eyeTeethProgram = new Program(gl, () => {
            gl.drawElements(
                gl.TRIANGLES,
                this.advEyeTeethIndicesBuffer!.count,
                gl.UNSIGNED_SHORT,
                0
            );
        });
        eyeTeethProgram.setShader(advFaceMaskShader.vShader, 'VERTEX');
        eyeTeethProgram.setShader(baseTextureShader.fShader, 'FRAGMENT');
        eyeTeethProgram.setAttributeBuffer(this.advEyeTeethPosBuffer);
        eyeTeethProgram.setAttributeBuffer(this.advEyeTeethZindexBuffer);
        eyeTeethProgram.setAttributeBuffer(this.advEyeTeethUVBuffer);
        const eyeTeethFramebuffer = createFrameBuffer(
            gl,
            miniSize.width,
            miniSize.height
        )!;
        eyeTeethProgram.setUniform('size', [size.width, size.height]);
        eyeTeethProgram.setUniform('map', this.eyeTeethMaskMap);
        eyeTeethProgram.setIndices(this.advEyeTeethIndicesBuffer);
        this.programs.eyeTeeth = eyeTeethProgram;
        this.framebuffers.eyeTeeth = eyeTeethFramebuffer;

        morphProgram.setUniform('eyeTeethMaskMap', eyeTeethFramebuffer.targetTexture);

        for(let i=0; i<2; i++){
            // 大眼圆眼
            const eyeProgram = new Program(gl);
            eyeProgram.setShader(baseTextureShader.vShader, 'VERTEX');
            eyeProgram.setShader(advBeautyEyeShader.fShader,'FRAGMENT');
            eyeProgram.setAttributeBuffer(this.planePosBuffer);
            eyeProgram.setAttributeBuffer(this.planeUVBuffer);
            const eyeFramebuffer = createFrameBuffer(
                gl,
                size.width,
                size.height
            )!;
            eyeProgram.setUniform('map', i===0 ? morphFramebuffer.targetTexture : this.framebuffers.lEye.targetTexture);
            eyeProgram.setUniform('eyeCenter', [0, 0]);
            eyeProgram.setUniform('rdIntensity', 0);
            eyeProgram.setUniform('lgIntensity', 0);
            eyeProgram.setUniform('intensRatio', 0);
            eyeProgram.setUniform('range', 0);
            eyeProgram.setUniform('rdDir', [0, 0]);
            const eyeKey = ['lEye','rEye'][i];
            this.programs[eyeKey] = eyeProgram;
            this.framebuffers[eyeKey] = eyeFramebuffer;

            const faceMaskMergeProgram = new Program(gl);
            faceMaskMergeProgram.setShader(baseTextureShader.vShader, 'VERTEX');
            faceMaskMergeProgram.setShader(advFaceMaskShader.fShader, 'FRAGMENT');
            faceMaskMergeProgram.setAttributeBuffer(this.planePosBuffer);
            faceMaskMergeProgram.setAttributeBuffer(this.planeUVBuffer);
            const faceMaskMergeFramebuffer = createFrameBuffer(
                gl,
                miniSize.width,
                miniSize.height
            )!;
            faceMaskMergeProgram.setUniform('map', null);
            faceMaskMergeProgram.setUniform('maskMap', faceMaskFramebuffer.targetTexture);
            faceMaskMergeProgram.setUniform('index', i);
            this.programs[`faceMaskMerge${i}`] = faceMaskMergeProgram;
            this.framebuffers[`faceMaskMerge${i}`] = faceMaskMergeFramebuffer;
        }
    }

    get output() {
        if (this.advData) {
            // return this.faceMask;
            // return this.framebuffers.eyeTeeth.targetTexture;
            return this.framebuffers.rEye.targetTexture;
        }
        return super.output;
    }

    get faceMask(){
        if(this.advData){
            const faceNum = this.advData.length / 212 >> 0;
            return this.framebuffers[`faceMaskMerge${(faceNum-1)%2}`].targetTexture;
        }
        return null;
    }

    updateSize() {
        const size = this.renderer.getSize();
        const miniSize = {
            width: size.width >> 2,
            height: size.height >> 2
        };
        [
            'wire', 'morph', 'lEye', 'rEye', 'faceMask', 'faceMaskMerge0', 
            'faceMaskMerge1', 'eyeTeeth'
        ].forEach((key) => {
            if(['faceMaskMerge0', 'faceMaskMerge1', 'lEye', 'rEye'].indexOf(key) === -1){
                this.programs[key]?.setUniform('size', [size.width, size.height]);
            }

            const framebuffer = this.framebuffers[key];
            if(framebuffer){
                const _size: typeof size = [
                    'faceMask', 'faceMaskMerge0', 'faceMaskMerge1', 'eyeTeeth'
                ].indexOf(key) === -1 ? size : miniSize;
                framebuffer.targetTexture.opts.width = _size.width;
                framebuffer.targetTexture.opts.height = _size.height;
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
            if(key === 'whitenTeeth' && this.params[key as HandleKey]===0){
                this.programs.morph.setUniform('teethIntensity', 0);
            }else if(key === 'brightenEye'){
                this.programs.morph.setUniform('eyeIntensity', intensity);
            }else if(key === 'roundedEye'){
                this.programs.lEye.setUniform('rdIntensity', intensity);
                this.programs.rEye.setUniform('rdIntensity', intensity);
            }else if(key === 'enlargeEye'){
                this.programs.lEye.setUniform('lgIntensity', intensity);
                this.programs.rEye.setUniform('lgIntensity', intensity);
            }
        }else{
            for(const key in this.defParams){
                this.setAdvEffect(
                    key as HandleKey, 
                    this.defParams[key as HandleKey]
                );
            }
        }
    }

    presetAdvEffect(preset:{
        [key in HandleKey]?:number
    }){
        for(const key in this.defParams){
            if(key in preset){
                this.setAdvEffect(key as HandleKey, preset[key as HandleKey]);
            } else {
                this.setAdvEffect(key as HandleKey, this.defParams[key as HandleKey]);
            }
        }
    }

    private posToUV(pos: Vector2, width: number, height: number){
        return new Vector2(pos.x / width, 1.0 - pos.y / height);
    }

    render() {
        const advData = this.advData;
        if(advData){
            const renderer = this.renderer;
            const gl = renderer.gl!;
            const size = renderer.getSize();
            const miniSize = {
                width: size.width >> 2,
                height: size.height >> 2
            };
            const faceNum = advData.length / 212 >> 0;

            for(let i=0; i < faceNum; i++){
                const data = advData.slice(i * 212, (i+1) * 212);
                const idx = i%2;
                const morph = this.programs.morph;
                const faceMaskMerge = this.programs[`faceMaskMerge${idx}`];

                // 设置贴图
                morph.setUniform('map', i===0 ? this.map : this.framebuffers.rEye.targetTexture);

                // 设置点位
                morph.updateAttribute('position', (typedArray)=>{
                    (<Int16Array>typedArray).set(data, 0);
                    advBtyFaceMesh.genTopFace(<Int16Array>typedArray);
                    advBtyFaceMesh.genFaceOutline(<Int16Array>typedArray);
                });

                let eyeInfo: any = null;

                // 计算点位
                morph.updateAttribute('tPosition', (typedArray)=>{
                    const array = typedArray as Int16Array;
                    array.set(this.posBuffer!.typedArray!, 0);

                    // 进行美颜点位计算
                    preHandle(array);
                    for(const key in handlers){
                        const intensity = this.params[<HandleKey>key];
                        if(intensity!==this.defParams[<HandleKey>key]){
                            const res = handlers[<HandleKey>key]?.(array, intensity);
                            // 点位不准的情况下，先由客户端进行修正
                            if(key === 'whitenTeeth'){
                                morph.setUniform('teethIntensity', res);
                            }else if (key === 'roundedEye' || key === 'enlargeEye') {
                                eyeInfo = {
                                    ...res,
                                    posData: array
                                }
                            }
                        }
                    }
                })
                // 设置线框
                this.setWirePosBuffer();

                // 渲染线框
                if(this.isShowWire){
                    this.framebuffers.wire.bind();
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    this.renderer.render(this.programs.wire);
                }

                renderer.setViewport(0, 0, miniSize.width, miniSize.height);
                // 渲染遮罩
                this.framebuffers.faceMask.bind();
                this.renderer.render(this.programs.faceMask);

                // 合并遮罩
                faceMaskMerge.setUniform('index', i);
                faceMaskMerge.setUniform('map', this.framebuffers[`faceMaskMerge${idx===0 ? 1 : 0}`].targetTexture);
                this.framebuffers[`faceMaskMerge${idx}`].bind();
                this.renderer.render(faceMaskMerge);

                // 更新眼睛，牙齿点位
                this.programs.eyeTeeth.updateAttribute('tPosition', (typedArray)=>{
                    const array = typedArray as Int16Array;
                    const targetArray = this.targetPosBuffer!.typedArray!;
                    [
                        52, 53, 72, 54, 55, 56, 73, 57, 
                        61, 60, 75, 59, 58, 63, 76, 62, 
                        96, 97, 98, 99, 100, 101, 102, 103
                    ].forEach((idx, index)=>{
                        let i = index * 2;
                        let ti = idx * 2;
                        array[i] = targetArray[ti];
                        array[i + 1] = targetArray[ti + 1];
                    })
                })
                // 渲染眼睛，牙齿遮罩
                this.framebuffers.eyeTeeth.bind();
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                this.renderer.render(this.programs.eyeTeeth);

                renderer.setViewport(0, 0, size.width, size.height);
                // 渲染变形结果
                this.framebuffers.morph.bind();
                this.renderer.render(morph);

                // 设置眼睛效果参数
                if(eyeInfo){
                    const lEyeCenter = this.posToUV(eyeInfo.lEyeCenter, size.width, size.height);
                    const rEyeCenter = this.posToUV(eyeInfo.rEyeCenter, size.width, size.height);
                    const p52 = this.posToUV(Vector2.getVec(eyeInfo.posData, 52), size.width, size.height);
                    const p55 = this.posToUV(Vector2.getVec(eyeInfo.posData, 55), size.width, size.height);
                    let p72 = Vector2.getVec(eyeInfo.posData, 72);
                    let p73 = Vector2.getVec(eyeInfo.posData, 73);
                    const p58 = this.posToUV(Vector2.getVec(eyeInfo.posData, 58), size.width, size.height);
                    const p61 = this.posToUV(Vector2.getVec(eyeInfo.posData, 61), size.width, size.height);
                    let p75 = Vector2.getVec(eyeInfo.posData, 75);
                    let p76 = Vector2.getVec(eyeInfo.posData, 76);

                    const lDis2 = Math.min(1.0, Math.max(0.0, (Vector2.disPow2(p72, p73) - 4) / 4));
                    const rDis2 = Math.min(1.0, Math.max(0.0, (Vector2.disPow2(p75, p76) - 4) / 4));

                    p72 = this.posToUV(p72, size.width, size.height);
                    p73 = this.posToUV(p73, size.width, size.height);
                    p75 = this.posToUV(p75, size.width, size.height);
                    p76 = this.posToUV(p76, size.width, size.height);

                    // 左眼参数设置
                    this.programs.lEye.setUniform('eyeCenter', lEyeCenter.value);
                    this.programs.lEye.setUniform('range', Math.max(
                        Vector2.dis(lEyeCenter, p52),
                        Vector2.dis(lEyeCenter, p55)
                    ));
                    this.programs.lEye.setUniform('rdDir', Vector2.normalize(Vector2.sub(p72, p73)).value);
                    this.programs.lEye.setUniform('intensRatio', lDis2);

                    // 右眼参数设置
                    this.programs.rEye.setUniform('eyeCenter', rEyeCenter.value);
                    this.programs.rEye.setUniform('range', Math.max(
                        Vector2.dis(rEyeCenter, p58),
                        Vector2.dis(rEyeCenter, p61)
                    ));
                    this.programs.rEye.setUniform('rdDir', Vector2.normalize(Vector2.sub(p75, p76)).value);
                    this.programs.rEye.setUniform('intensRatio', rDis2);
                }

                // 渲染左眼
                this.framebuffers.lEye.bind();
                this.renderer.render(this.programs.lEye);
                // 渲染右眼
                this.framebuffers.rEye.bind();
                this.renderer.render(this.programs.rEye);
            }
        }
    }

    static configStaticRes(resConfig: AdvBeautyResType){
        if(resConfig.faceMask && !faceMaskImg){
            resSet.faceMask = resConfig.faceMask;
            retryLoadImage(resConfig.faceMask, 3, (img)=>{
                faceMaskImg = img;
                instances.forEach((instance)=>{
                    instance.faceMaskMap!.source = img;
                    instance.faceMaskMap!.refresh();
                })
            })
        }
        if(resConfig.eyeTeethMask && !eyeTeethMaskImg){
            resSet.eyeTeethMask = resConfig.eyeTeethMask;
            retryLoadImage(resSet.eyeTeethMask, 3, (img)=>{
                eyeTeethMaskImg = img;
                instances.forEach((instance)=>{
                    instance.eyeTeethMaskMap!.source = img;
                    instance.eyeTeethMaskMap!.refresh();
                })
            })
        }
        if(resConfig.teethWhiten && !whiteTeethLutImg){
            resSet.teethWhiten = resConfig.teethWhiten;
            retryLoadImage(resSet.teethWhiten, 3, (img)=>{
                whiteTeethLutImg = img;
                instances.forEach((instance)=>{
                    instance.whiteTeethLutMap!.source = img;
                    instance.whiteTeethLutMap!.refresh();
                })
            })
        }
    }

    destroy() {
        super.destroy();
        this.renderer.gl?.deleteTexture(this.faceMaskMap!.glTexture!);
        this.renderer.gl?.deleteTexture(this.eyeTeethMaskMap!.glTexture!);
        this.renderer.gl?.deleteTexture(this.whiteTeethLutMap!.glTexture);
        instances.delete(this);
    }
}