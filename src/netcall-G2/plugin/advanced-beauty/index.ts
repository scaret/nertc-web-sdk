import { modelOptions } from './src/types';
import webworkify from 'webworkify-webpack';
import { EventEmitter } from "eventemitter3";
import { Logger } from '../../util/webrtcLogger';
import { ILogger } from '../../types';

class AdvancedBeauty extends EventEmitter { 
    private modelParam: modelOptions;
    private width: number = 0;
    private height: number = 0;
    private advancedBeautyWorker: any;
    private _advancedBeautyWorkerDestroying: boolean = false;
    private logger: ILogger;
    private wasmBinary: Uint8Array = new Uint8Array();
    private onFaceDataCallback!: (result: ImageData) => void;

    constructor(options: modelOptions) {
        super();
        this.modelParam = options; //'normal'      
        this.logger = new Logger({
            tagGen: () => {
                return 'AdvancedBeauty'
            }
        });
        
        this.preload(this.modelParam);
    }

    async preload(options: modelOptions) {
        await fetch(options.wasmUrl).then(response =>
            response.arrayBuffer()
        ).then(bytes => {
            this.wasmBinary = new Uint8Array(bytes) 
            this.emit('plugin-load')
        })
    }

    init() {
        this.logger.log('advancedBeauty create')
        this.advancedBeautyWorker = webworkify(require.resolve('./src/beauty-worker.js'));
        this.addEventListener();
       
        this.advancedBeautyWorker.postMessage({
            type: 'init',
            option: {
                wasmBinary: this.wasmBinary
            }
        })
    }

    addEventListener() {
        //@ts-ignore
        this.advancedBeautyWorker.addEventListener('message', (e) => {
            let data = e.data;
            const type = data.type;
            switch (type) {
                case 'created':
                    this.emit('facePoints-load');
                    break;
                case 'facePoints':
                    this.onFaceDataCallback(data.faceData);
                    break;
                case 'destroyed':
                    if (this._advancedBeautyWorkerDestroying) {
                        this.logger.log('advancedBeautyWorker destroyed')
                        this._advancedBeautyWorkerDestroying = false;
                        this.advancedBeautyWorker.terminate();
                        this.advancedBeautyWorker = null;
                    }
                    break;
            }
        });
    }

    destroy() {
        this.logger.log('advancedBeautyation destroy');    
        if (this.advancedBeautyWorker && !this._advancedBeautyWorkerDestroying) {
            this._advancedBeautyWorkerDestroying = true;
            this.advancedBeautyWorker.postMessage({ type: 'destroy' });
        }
    }

    process(imageData: Uint8Array, width: number, height: number,  callback: (result: ImageData) => void) {
        this.width = width;
        this.height = height;
        this.onFaceDataCallback = callback;
        this.advancedBeautyWorker && this.advancedBeautyWorker.postMessage({
            type: 'process',
            frame: imageData,
            width,
            height
        }, [imageData.buffer])
    }

    setFaceSize(decFaceSize: number){
        this.advancedBeautyWorker.postMessage({
            type: 'faceSize',
            option: {
                faceSize: decFaceSize
            }
        })
    }
}

export default AdvancedBeauty;