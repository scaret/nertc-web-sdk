import * as env from '../../util/rtcUtil/rtcEnvironment';
import { EventEmitter } from "eventemitter3";
import { ILogger } from '../../types';
import { PluginType } from '../../plugin/plugin-list';
import { Logger } from '../../util/webrtcLogger';
import { Filters } from './filter';
import workerTimer from '../../util/rtcUtil/webWorkerTimer';

// 日志
const logger: ILogger = new Logger({
    tagGen: () => {
        return 'VideoPostProcess';
    }
});

/** 将视频转换为 ImageData 的类*/
class VideoToImageData {
    private canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D | null;
    constructor() {
        this.canvas = document.createElement('canvas');
        this._ctx = this.canvas.getContext('2d')!;
        logger.info('video to imageData is ready.');
    }

    private get ctx(){
        if(!this._ctx){
            logger.error(`ImageData context is null.`);
        }
        return this._ctx!;
    }

    getImageData(video: HTMLVideoElement | null){
        return new Promise((resolve, reject)=>{
            if(!video){
                reject('video is null.');
            }
            if('readyState' in video!){
                if(video.readyState < 2){
                    logger.warn('media source not ready');
                    setTimeout(() => {
                        this.getImageData(video)
                            .then((imageData)=>{
                                resolve(imageData);
                            }).catch((err)=>{
                                reject(err);
                            })
                    }, 0);
                }else{
                    const {videoWidth, videoHeight} = video;
                    this.canvas.width = videoWidth;
                    this.canvas.height = videoHeight;
                    this.ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
                    const imageData = this.ctx.getImageData(0, 0, videoWidth, videoHeight);
                    resolve(imageData);
                }
            }else{
                reject('invalid video.');
            }
        })
    }
}

type TaskType = 'BasicBeauty' | 'VirtualBackground' | 'AdvancedBeauty';
export default class VideoPostProcess extends EventEmitter {
    // 插件模块
    private pluginModules:{
        VirtualBackground:{
            process:(
                    imgData: ImageData, width: number, height:number, 
                    callback: (result: ImageData) => void
                ) => void;
            destroy:() => void;
        } | null;
        AdvancedBeauty:{
            process:(
                    imgData: ImageData, width: number, height:number, 
                    callback:(result: number[]) => void
                ) => void;
            destroy:() => void
        } | null
    } = {
        VirtualBackground: null,
        AdvancedBeauty: null
    }

    // 注入插件
    registerPlugin(key: PluginType, plugin: any){
        this.pluginModules[key] = plugin;
    }
    // 获取插件
    getPlugin(key: PluginType){
        return this.pluginModules[key];
    }
    // 移除插件
    unregisterPlugin(key: PluginType){
        this.pluginModules[key] = null;
    }

    // 初始化视频滤镜管线
    filters: Filters = new Filters();
    // 初始化 image data 转换
    private videoToImageData: VideoToImageData | null = new VideoToImageData();
    // 视频源
    video: HTMLVideoElement | null = null;
    // 帧率
    private frameRate = 15;
    // 帧缓存
    private frameCache: ImageData | null = null;
    // 定时器 id
    private timerId:number = -1;

    // 异步并行任务队列
    private taskSet = new Set<TaskType>();
    private taskSnapshot = new Set<TaskType>();
    private readyTaskSet = new Set<TaskType>(['BasicBeauty']);
    // 任务参数
    private sourceMap: ImageData | null = null;
    private maskData: ImageData | null = null;
    private advBeautyData: number[] | Int16Array = [];

    // 后处理 track
    private sourceTrack: MediaStreamTrack | null = null;
    private trackInstance: MediaStreamTrack | null = null;

    private get taskReady(){
        for(const task of this.taskSnapshot){
            if(!this.readyTaskSet.has(task)){
                return false;
            }
        }
        return true;
    }

    private addTask(task: TaskType){
        if(!this.taskSet.has(task)){
            this.taskSet.add(task);
            logger.info(`task ${task} is added.`);
            // 新任务入列，马上渲染一次
            this.update();
            if(this.taskSet.size === 1){
                this.updateTimer();
                this.emit('taskSwitch', true);
            }
        }
    }

    private removeTask(task: TaskType){
        this.taskSet.delete(task);
        logger.info(`task ${task} is removed.`);
        if(this.taskSet.size === 0){
            workerTimer.clearTimeout(this.timerId);
            this.timerId = -1;
            this.sourceMap = null;
            this.frameCache = null;
            this.emit('taskSwitch', false);
        }
        // 新任务移除，马上渲染一次
        this.update();
        this.taskSnapshot.delete(task);
    }

    hasTask(task: TaskType){
        return this.taskSet.has(task);
    }

    /**
     * 创建 videoPostProcess track
     * @param {MediaStreamTrack} track
     * @returns {Promise<number>} resolve 参数返回 canvas 预渲染时间间隔，减缓帧抖动
     */
    private createTrack(track: MediaStreamTrack){
        return new Promise((resolve, reject)=>{
            if(this.trackInstance && this.trackInstance === track){
                logger.log("VideoPostProcess track transform unnecessary");
                return resolve(0);
            }
            logger.log("VideoPostProcess track transform");

            const settings = track.getSettings();
            this.frameRate = settings.frameRate || 15;
            
            // 从 canvas 获取 track
            this.sourceTrack = track;

            // 抓新流时需要释放之前的流，否则会导致抓流泄露
            if(this.trackInstance){
                this.trackInstance.stop();
            }
            const stream = (<any>this.filters.canvas).captureStream(this.frameRate);
            this.trackInstance = stream.getVideoTracks()[0];

            // 初始化 video，以供管线获取 imageData
            this.video = this.video || document.createElement('video');
            const newStream = new MediaStream([this.sourceTrack]);
            this.video.srcObject = newStream;

            const resizeHandler = (video: HTMLVideoElement)=>{
                const { videoWidth: width, videoHeight: height } = video!;
                if (env.IS_ANY_SAFARI) {
                    this.filters.canvas.style.height = width + '';
                    this.filters.canvas.style.width = height + '';
                }
                this.filters.setSize(width, height);
            }

            this.video.onloadedmetadata = () => {
                this.video!.play()
                    .then(() => {
                        resizeHandler(this.video!);
                        resolve(2000/this.frameRate);
                    })
                    .catch((err) => {
                        logger.error('video element play error', err);
                        reject(err);
                    });
            };
            this.video.onresize = () => {resizeHandler(this.video!)};
        })
    }
    private get track(){
        // 任务队列不为空
        if(this.taskSet.size){
            logger.log('返回 video post procss track.');
            return this.trackInstance;
        }
        // 任务队列为空
        logger.log('返回原始 track.');
        return this.sourceTrack;
    }
    
    // task render loop
    update = async () => {
        if(!this.taskSet.size){
            if( this.filters ){
                return this.filters.update(false);
            } else {
                 // 任务队列为空, 且 filters 已被销毁，但 timer 没停止，兼容此类错误
                return workerTimer.clearTimeout(this.timerId);
            }
        }
    
        // 帧缓存
        this.frameCache = (await this.videoToImageData!.getImageData(this.video)) as ImageData;
        
        if(this.frameCache){
            if(this.taskReady){
                // 原图上传
                this.filters.mapSource = this.sourceMap ?? this.frameCache;
                // 设置虚拟背景参数
                if(this.taskSet.has('VirtualBackground')){
                    this.filters.virtualBackground.setMaskMap(this.maskData);
                    this.maskData = null;
                }
                // 设置高级美颜参数
                if(this.taskSet.has('AdvancedBeauty')){
                    this.filters.advBeauty.setAdvData(this.advBeautyData as Int16Array);
                    this.advBeautyData = [];
                }
    
                // 新的任务处理
                this.taskSnapshot = new Set(this.taskSet);
                this.readyTaskSet.clear();
                this.readyTaskSet.add('BasicBeauty');
    
                // 取出当前帧
                this.sourceMap = this.frameCache;
                // 虚拟背景任务
                if(this.taskSet.has('VirtualBackground')){
                    // 获取对应插件
                    const plugin = this.pluginModules.VirtualBackground;
    
                    if(!plugin){
                        logger.error('VirtualBackground plugin is null.');
                    }else{
                        const {width, height} = this.filters.canvas;
                        // 背景替换推理
                        plugin.process(this.sourceMap, width, height, (result)=>{
                            this.maskData = this.taskSet.has('VirtualBackground') ? result : null;
                            this.readyTaskSet.add('VirtualBackground');
                        });
                    }
                }
                // 高级美颜任务
                if(this.taskSet.has('AdvancedBeauty')){
                    const plugin = this.pluginModules.AdvancedBeauty;
    
                    if(!plugin){
                        logger.error('AdvancedBeauty plugin is null.');
                    }else{
                        const {width, height} = this.filters.canvas;
                        // 高级美颜推理
                        plugin.process(this.sourceMap, width, height, (result)=>{
                            this.advBeautyData = this.taskSet.has('AdvancedBeauty') ? result : [];
                            this.readyTaskSet.add('AdvancedBeauty');
                        });
                    }
                }
            }
        }
        this.filters.update(false);
    };

    private updateTimer(){
        let that = this;
        workerTimer.setTimeout(function updateFunc() {
            that.update();
            workerTimer.clearTimeout(that.timerId);
            that.timerId = workerTimer.setTimeout(updateFunc, that.frameRate, null)
        }, 1000/this.frameRate, null)
    }

    setTaskAndTrack = (task: TaskType, isEnable: boolean, track?: MediaStreamTrack)=>{
        return new Promise((resolve, reject)=>{
            if(isEnable){
                if(this.hasTask(task)){
                    logger.log(`${task}已经开启`);
                    return resolve(this.track!);
                }
                // 创建 track，track创建是异步的
                this.createTrack(track!)
                    .then((time)=>{
                        // 加入任务队列
                        this.addTask(task);
                        setTimeout(() => {
                            resolve(this.track!);
                        }, time as number);
                    })
                    .catch((err)=>{
                        logger.error('create track error.');
                        reject(err);
                    })
            }else{
                if(!this.hasTask(task)){
                    logger.log(`${task}已经关闭`);
                    return resolve(this.track!); 
                }
                // 从任务队列移除
                this.removeTask(task);
                resolve(this.track!);
            }
        })
    }

    destroy(){
        this.taskSet.clear();
        workerTimer.clearTimeout(this.timerId);
        this.videoToImageData = null;
        this.sourceTrack = null;
        this.trackInstance?.stop();
        this.trackInstance = null;
        this.filters.destroy();
        (<any>this.filters) = null;
        this.sourceMap = null;
        this.maskData = null;
        (<any>this.advBeautyData) = null;
        this.frameCache = null;
        (<any>this.pluginModules) = null;
        logger.log('videoPostProcess destroyed');
    }
}