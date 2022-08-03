import { modelOptions } from './src/types';
import webworkify from 'webworkify-webpack';
import { EventEmitter } from "eventemitter3";
import { Logger } from '../../util/webrtcLogger';
import { ILogger } from '../../types';

class Segmentation extends EventEmitter { 
    private modelParam: modelOptions;
    private width: number = 0;
    private height: number = 0;
    private segmentWorker: any;
    private _segmentWorkerDestroying: boolean = false;
    private logger: ILogger;
    private wasmBinary: Uint8Array = new Uint8Array();
    private onMaskDataCallback!: (result: ImageData) => void;

    constructor(options: modelOptions) {
        super();
        this.modelParam = options; //'normal'   
        this.logger = new Logger({
            tagGen: () => {
                return 'Segment'
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
        this.logger.log('segmenter create')
        this.segmentWorker = webworkify(require.resolve('./src/segmenter-worker.js'));
        this.addEventListener();
       
        this.segmentWorker.postMessage({
            type: 'init',
            option: {
                wasmBinary: this.wasmBinary
            }
        })
    }

    addEventListener() {
        //@ts-ignore
        this.segmentWorker.addEventListener('message', (e) => {
            let data = e.data;
            const type = data.type;
            switch (type) {
                case 'created':
                    this.emit('segment-load');
                    break;
                case 'mask':
                    const newImageData = new ImageData(data.maskData, 256, 256);
                    this.onMaskDataCallback(newImageData);
                    break;
                case 'destroyed':
                    if (this._segmentWorkerDestroying) {
                        this.logger.log('segmentWorker destroyed')
                        this._segmentWorkerDestroying = false;
                        this.segmentWorker.terminate();
                        this.segmentWorker = null;
                    }
                    break;
            }
        });
    }

    destroy() {
        this.logger.log('segmentation destroy');    
        if (this.segmentWorker && !this._segmentWorkerDestroying) {
            this._segmentWorkerDestroying = true;
            this.segmentWorker.postMessage({ type: 'destroy' });
        }
    }

    process(imageData: ImageData, width: number, height: number,  callback: (result: ImageData) => void) {
        this.width = width;
        this.height = height;
        this.onMaskDataCallback = callback;
        this.segmentWorker && this.segmentWorker.postMessage({
            type: 'process',
            frame: imageData
        })
    }
}

export default Segmentation;