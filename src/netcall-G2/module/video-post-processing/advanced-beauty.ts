import VideoPostProcess from '.';
import { AdvBeautyFilter, resSet } from './filter/adv-beauty-filter';
import { EventEmitter } from "eventemitter3";

export default class AdvancedBeauty extends EventEmitter{
    private videPostProcess: VideoPostProcess;

    constructor(videPostProcess: VideoPostProcess){
        super();
        this.videPostProcess = videPostProcess;
    }

    private get advancedBeautyProcess(){
        const plugin = this.videPostProcess.getPlugin('AdvancedBeauty') as any;
        if (!plugin) {
            this.logger.error('Can not get AdvancedBeauty plugin')
        }
        return plugin;
    }

    init(decFaceSize?: number) {
        if(this.videPostProcess && !this.videPostProcess.filters) return;
        this.advancedBeautyProcess.on('facePoints-load', () => {
            this.emit('facePoints-load');
            this.advancedBeautyProcess.setFaceSize(Math.min(5, Math.max(1, decFaceSize || 1)));
        });
        this.advancedBeautyProcess.init();
    }

    destroy() {
        if(this.videPostProcess && !this.videPostProcess.filters) return;
        this.advancedBeautyProcess.removeAllListeners(); 
        this.advancedBeautyProcess.destroy();
    }

    private get logger(){
        return this.videPostProcess.logger;
    }
    /**
     * 开启、关闭高级美颜
     * isEnable 为 true 时， track 必须赋值
     */
    setTrack(isEnable: boolean, track?: MediaStreamTrack){
        if(isEnable){
            AdvancedBeauty.configStaticRes(resSet);
        }
        return new Promise((resolve, reject)=>{
            this.videPostProcess.setTaskAndTrack('AdvancedBeauty', isEnable, track)
            .then((track)=>{
                if(!isEnable){
                    this.videPostProcess.filters?.advBeauty.setAdvData([] as any);
                }
                resolve(track);
            })
            .catch((err)=>{
                reject(err);
            })
        })
    }

    setAdvEffect: AdvBeautyFilter['setAdvEffect'] = (...args) => {
        if(this.videPostProcess && !this.videPostProcess.filters) return;
        this.logger.log(`set advbeauty effect：[${args[0]}, ${args[1]}]`);
        this.videPostProcess.filters?.advBeauty.setAdvEffect(...args);
    };

    presetAdvEffect: AdvBeautyFilter['presetAdvEffect'] = (...args) => {
        if(this.videPostProcess && !this.videPostProcess.filters) return;
        this.logger.log(`preset advbeauty effect：${JSON.stringify(args[0])}`);
        this.videPostProcess.filters?.advBeauty.presetAdvEffect(...args);
    }

    get isEnable() {
        return this.videPostProcess.hasTask('AdvancedBeauty');
    }

    // 配置静态资源地址
    static configStaticRes: typeof AdvBeautyFilter.configStaticRes = (resConfig)=>{
        AdvBeautyFilter.configStaticRes(resConfig);
    } 
}