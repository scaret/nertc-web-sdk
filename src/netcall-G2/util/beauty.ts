//@ts-nocheck
import * as env from './rtcUtil/rtcEnvironment';
import { BeautyEffectOptions } from './../types';
import { ILogger } from './../types';
import { Logger } from './webrtcLogger';
import { Filters } from './filter';
import workerTimer from '../util/rtcUtil/webWorkerTimer';

const logger: ILogger = new Logger({
    tagGen: () => {
        return 'Beauty';
    }
});

let frameRate: any;
let videoElem: any;
let requestId: any = null;

// 初始化视频滤镜管线
const filters = new Filters();
// 配置美颜lut
function startLut() {
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
}


export function setBeautyFilter(filterName: string|null, intensity?: number) {
    //TODO: filterName为空时，取消滤镜
    let lutIntensity;
    // intensity 不填写就是默认值
    if(intensity && typeof intensity !== 'number'){
        logger.warn('滤镜参数格式错误:', intensity);
    }
    if(typeof intensity === 'number'){
        if(1 < intensity || intensity < 0){
            logger.warn('滤镜参数越界:', intensity);
        }else {
            lutIntensity = intensity;
        }
    }else {
        if(filterName && !intensity){
            lutIntensity = filters.lut.lutImgs[filterName].intensity;
        }
    }
    // if(filterName && !intensity){
    //     lutIntensity = filters.lut.lutImgs[filterName].intensity;
    // }
    logger.log('设置滤镜:', filterName, lutIntensity);
    filters.lut.setlut(filterName, lutIntensity);
}

export function startBeauty(params: boolean, effects?: BeautyEffectOptions) {
    if (!params) {
        logger.warn('请先开启美颜功能');
        return;
    }

    // 根据设置的美颜参数来选择美颜着色器，并设置value
    let brightnessValue, rednessValue, smoothnessValue;
    brightnessValue = effects!.brightnessLevel || 0;
    rednessValue = effects!.rednessLevel || 0;
    smoothnessValue = effects!.smoothnessLevel || 0;
    logger.log('设置美颜参数:', effects);

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

// 开始渲染
const update = () => {
    filters.update();
    // requestAnimationFrame(update);
    requestId = workerTimer.setTimeout(() => {
        update();
    }, 1000 / frameRate);
    // requestId = setTimeout(update(), 1000 / frameRate);
    // console.warn('webworker ',Date());
};

export function transformTrack(track: MediaStreamTrack) {
    logger.log("beauty track transform");
    startLut();
    const constraint = track.getConstraints();
    const settings = track.getSettings();
    frameRate = settings.frameRate || 30;
    videoElem = document.createElement('video');
    const newStream = new MediaStream([track]);
    videoElem.srcObject = newStream;
    if(settings){
        videoElem.width = settings.width;
        videoElem.height = settings.height;
        filters.setSize(videoElem.width, videoElem.height);
    }
    (<any>window).oscillatorRunning = true;

    // document.body.appendChild(videoElem);
    
    if (env.IS_ANY_SAFARI) {
        videoElem.style.visibility = 'hidden';
        // safari在使用canvas.captureStream获取webgl渲染后的视频流，在本地播放时可能出现红屏或黑屏
        
        filters.canvas.style.height = '100%';
        filters.canvas.style.width = 'auto';
        filters.canvas.setAttribute('id', 'beautyCanvas');
        filters.canvas.style.position = 'absolute';
        filters.canvas.style.left = '50%';
        filters.canvas.style.top = '50%';
        filters.canvas.style.transform = 'translate(-50%,-50%)';
        // safari在开启美颜后，本地<video>切换成<canvas>
        document.getElementsByClassName('nertc-video-container-local')[0].appendChild(filters.canvas);
        
        // safari 13.1 浏览器 需要<video> 和 <canvas> 在可视区域才能正常播放
        if(env.SAFARI_MAJOR_VERSION < 14){
            videoElem.style.height = '0px';
            videoElem.style.width = '0px';
            document.body.appendChild(videoElem);
        }
    }

    videoElem.onloadedmetadata = () => {
        videoElem
            .play()
            .then(() => {
                const { width: width, height: height } = videoElem;
                // 将视频塞给滤镜
                filters.mapSource = videoElem;

                // 指定视频之后需要同步尺寸
                filters.setSize(width, height);

                if (env.IS_ANY_SAFARI) {
                    filters.canvas.style.height = height;
                    filters.canvas.style.width = width;
                }
                update();
            })
            .catch((err) => {
                logger.error('video element play error', err);
            });
    };

    videoElem.onresize = () => {
        if (videoElem.width && videoElem.height) {
            // filters.canvas.width = videoElem.videoWidth;
            // filters.canvas.height = videoElem.videoHeight;

            if (env.IS_ANY_SAFARI) {
                filters.canvas.style.height = videoElem.height;
                filters.canvas.style.width = videoElem.width;
            }
            filters.setSize(videoElem.width, videoElem.height);
        }
    };

    //@ts-ignore
    const stream = filters.canvas.captureStream(frameRate);
    const glTrack = stream.getVideoTracks()[0];
    return glTrack;
}

export function closeBeauty() {
    //关闭美颜计时器
    logger.warn('关闭美颜');
    (<any>window).oscillatorRunning = false;
    // console.log('oscillatorRunning ', oscillatorRunning);
    if(requestId != null){
        workerTimer.clearTimeout(requestId);
        // clearTimeout(requestId);
        requestId = null;
    }
    
    if (filters.canvas) {
        filters.canvas.remove();
        videoElem.remove();
    }
    // filters.destroy();
}

export function destroyBeauty() {
    //关闭美颜计时器
    logger.warn('销毁美颜');
    (<any>window).oscillatorRunning = false;
    // console.log('oscillatorRunning ', oscillatorRunning);
    filters.destroy();
}
