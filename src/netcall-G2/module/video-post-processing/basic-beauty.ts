import { BeautyEffectOptions } from '../../types';
import { ILogger } from '../../types';
import { Logger } from '../../util/webrtcLogger';
import VideoPostProcess from '.';

const logger: ILogger = new Logger({
    tagGen: () => {
        return 'Beauty';
    }
});

export default class BasicBeauty {
    private videPostProcess: VideoPostProcess;

    constructor(videPostProcess: VideoPostProcess){
        this.videPostProcess = videPostProcess;
    }

    // 配置美颜lut
    private lutLoaded = false;
    private startLut() {
        const filters = this.videPostProcess.filters;
        filters.beauty.setLutsSrc({
            whiten: 'https://yx-web-nosdn.netease.im/common/cab8e4f0696d3d8e29ee10d6dccc1204/meibai.png',
            redden: 'https://yx-web-nosdn.netease.im/common/c614e2af82da88807067926d7ff3be3d/hongrun.png'
        });
        // 配置滤镜 luts
        filters.lut.setLutsSrc({
            ziran: {
                //自然
                src: 'https://yx-web-nosdn.netease.im/common/c89328281947fceabdc71d5fa08b2345/ziran.png',
                intensity: 1
            },
            baixi: {
                //白皙
                src: 'https://yx-web-nosdn.netease.im/common/3a22a55384b0bd5b07fca3509bfc981a/baixi.png',
                intensity: 0.5
            },
            fennen: {
                //粉嫩
                src: 'https://yx-web-nosdn.netease.im/common/db5befdae1f46dad2e5a6d702bad19ea/fennen.png',
                intensity: 0.5
            },
            weimei: {
                //唯美
                src: 'https://yx-web-nosdn.netease.im/common/cf8bfec70d7998bb0033757276c6559a/weimei.png',
                intensity: 0.5
            },
            langman: {
                //浪漫
                src: 'https://yx-web-nosdn.netease.im/common/1c50a14532bfa3ad503a82ddd13f0ec8/langman.png',
                intensity: 0.5
            },
            rixi: {
                //日系
                src: 'https://yx-web-nosdn.netease.im/common/c414819383913b5db0d9b686276e3d57/rixi.png',
                intensity: 0.5
            },
            landiao: {
                //蓝调
                src: 'https://yx-web-nosdn.netease.im/common/4c77522852dc14448603be21abc571c8/landiao.png',
                intensity: 0.5
            },
            qingliang: {
                //清凉
                src: 'https://yx-web-nosdn.netease.im/common/1150e94f831d24148239001588a7ca7d/qingliang.png',
                intensity: 0.5
            },
            huaijiu: {
                //怀旧
                src: 'https://yx-web-nosdn.netease.im/common/6a38caeab164d1b5cc086391d6a11a74/huaijiu.png',
                intensity: 0.5
            },
            qingcheng: {
                //青橙
                src: 'https://yx-web-nosdn.netease.im/common/3b3332c5ae4306312b6f3c4c552a464a/qingcheng.png',
                intensity: 1
            },
            wuhou: {
                //午后
                src: 'https://yx-web-nosdn.netease.im/common/200fc7a12177774f4eb23f55d72643ee/wuhou.png',
                intensity: 1
            },
            zhigan: {
                //质感
                src: 'https://yx-web-nosdn.netease.im/common/848bd44506cf8e10ecabf564e3d74809/zhigan.png',
                intensity: 1
            },
            mopian: {
                //默片
                src: 'https://yx-web-nosdn.netease.im/common/c454efa119520f0793ce51327951ed0a/mopian.png',
                intensity: 1
            },
            dianying: {
                //电影
                src: 'https://yx-web-nosdn.netease.im/common/3a6a22adad29c5844fc829f4f889a79f/dianying.png',
                intensity: 1
            },
            heibai: {
                //黑白
                src: 'https://yx-web-nosdn.netease.im/common/941270f2948218ea19f2d79db5e7d349/heibai.png',
                intensity: 1
            }
        });
        this.lutLoaded = true;
    }

    /**
     * 设置滤镜
     * @param {string|null} filterName
     * @param {number} intensity
     * @returns {any}
     */
    setFilter(filterName: string | null, intensity?: number) {
        if(!this.isEnable){
            return logger.log('请先开启美颜功能');
        }
        if(intensity !== undefined){
            if(typeof intensity !== 'number'){
                logger.warn('滤镜参数格式错误:', intensity);
            }
            if(1 < intensity || intensity < 0){
                logger.warn('滤镜参数越界:', intensity);
            }
        }
        this.videPostProcess.filters.lut.setlut(filterName, intensity);
    }

    /**
     * 开启、关闭美颜
     * isEnable 为 true 时， track 必须赋值
     */
    setBeauty(isEnable: boolean, track?: MediaStreamTrack){
        if(isEnable && !this.lutLoaded){
            this.startLut();
        }
        return new Promise((resolve, reject)=>{
            this.videPostProcess.setTaskAndTrack('BasicBeauty', isEnable, track)
            .then((track)=>{
                if(!isEnable){
                    const filters = this.videPostProcess.filters;
                    filters.beauty.whiten = 0;
                    filters.beauty.redden = 0;
                    filters.beauty.smooth = 0;
                    filters.lut.setlut(null);
                }
                resolve(track);
            })
            .catch((err)=>{
                reject(err);
            })
        })
    }
    /**
     * 设置美颜参数
     */
    setBeautyOptions(effects: BeautyEffectOptions) {
        if(!this.isEnable){
            return logger.log('请先开启美颜功能');
        }
        // 根据设置的美颜参数来选择美颜着色器，并设置value
        let brightnessValue, rednessValue, smoothnessValue;
        brightnessValue = effects.brightnessLevel || 0;
        rednessValue = effects.rednessLevel || 0;
        smoothnessValue = effects.smoothnessLevel || 0;

        logger.log('设置美颜参数:', effects);
        const filters = this.videPostProcess.filters;
        if (effects.brightnessLevel !== undefined && typeof brightnessValue === 'number') {
            if(0 <= brightnessValue &&  brightnessValue <= 1){
                filters.beauty.whiten = brightnessValue;
            }else {
                logger.warn('美颜参数越界:', brightnessValue);
            }
        }
        if (effects.rednessLevel !== undefined && typeof rednessValue === 'number') {
            if(0 <= rednessValue && rednessValue <= 1){
                filters.beauty.redden = rednessValue;
            }else {
                logger.warn('美颜参数越界:', rednessValue);
            }
        }
        if (effects.smoothnessLevel !== undefined && typeof smoothnessValue === 'number') {
            if(0 <= smoothnessValue && smoothnessValue <= 1){
                filters.beauty.smooth = smoothnessValue;
            }else {
                logger.warn('美颜参数越界:', smoothnessValue);
            }
        }
    }

    get isEnable() {
        return this.videPostProcess.hasTask('BasicBeauty');
    }
}