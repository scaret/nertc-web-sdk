import { ILogger } from '../../types';
import { Logger } from '../../util/webrtcLogger';
import VideoPostProcess from '.';
import { AdvBeautyFilter } from './filter/adv-beauty-filter';
import { EventEmitter } from "eventemitter3";

const logger: ILogger = new Logger({
    tagGen: () => {
        return 'AdvancedBeauty';
    }
});

export default class AdvancedBeauty extends EventEmitter{
    private videPostProcess: VideoPostProcess;

    constructor(videPostProcess: VideoPostProcess){
        super();
        this.videPostProcess = videPostProcess;
    }

    private get advancedBeautyProcess(){
        return this.videPostProcess.getPlugin('AdvancedBeauty') as any;
    }

    init(decFaceSize?: number) {
        this.advancedBeautyProcess.on('facePoints-load', () => {
            this.emit('facePoints-load');
            this.advancedBeautyProcess.setFaceSize(Math.min(5, Math.max(1, decFaceSize || 1)));
        });
        this.advancedBeautyProcess.init();
    }

    destroy() {
        this.advancedBeautyProcess.removeAllListeners(); 
        this.advancedBeautyProcess.destroy();
    }

    /**
     * 开启、关闭高级美颜
     * isEnable 为 true 时， track 必须赋值
     */
    setTrack(isEnable: boolean, track?: MediaStreamTrack){
        return new Promise((resolve, reject)=>{
            this.videPostProcess.setTaskAndTrack('AdvancedBeauty', isEnable, track)
            .then((track)=>{
                if(!isEnable){
                    this.videPostProcess.filters.advBeauty.setAdvData([] as any);
                }
                resolve(track);
            })
            .catch((err)=>{
                reject(err);
            })
        })
    }

    setAdvEffect: AdvBeautyFilter['setAdvEffect'] = (...args) => {
        logger.log(`set adv beauty effect：[${args[0]}, ${args[1]}]`);
        this.videPostProcess.filters.advBeauty.setAdvEffect(...args);
    };

    presetAdvEffect: AdvBeautyFilter['presetAdvEffect'] = (...args) => {
        this.videPostProcess.filters.advBeauty.presetAdvEffect(...args);
    }

    get isEnable() {
        return this.videPostProcess.hasTask('AdvancedBeauty');
    }
}