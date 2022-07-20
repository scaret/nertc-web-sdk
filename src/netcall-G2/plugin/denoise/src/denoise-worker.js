const global = self;

class denoise {
    rnnoise = null;
    isProcessing = false;
    buffer = [];
    buffer_length = 1;
    initMem = false;
    inputPtr = null;
    outputPtr = null;
    buffer_size = 128;

    init(binary) {
        global.Module = {
            wasmBinary: binary,
            onRuntimeInitialized: () => {
                console.log('Module onRuntimeInitialized')
                this.rnnoise = global.Module._rnnoise_create();
                this.handleInitFinished();
            }
        }
        require('../lib/ai_denoise.js');
    }

    async process(frame) {
       //暂时*32767
       let i ;       
       console.log('frame', frame)
        this.isProcessing = true;
        if (!this.initMem) {
            this.inputPtr = Module._rnnoise_Malloc(this.buffer_size * 4);
            this.outputPtr = Module._rnnoise_Malloc(this.buffer_size * 4);
            this.initMem = true;
        }
        let data = new Float32Array(frame);
        let result = null;
        Module.HEAPF32.set(data, this.inputPtr >> 2);      
        if(Module._rnnoise_process_frame(this.rnnoise, this.outputPtr, this.inputPtr)){
            result = new Float32Array(Module.HEAPF32.subarray(this.outputPtr >> 2, (this.outputPtr >> 2) + this.buffer_size));
        } else {
            //_rnnoise_process_frame返回值为null时表示无数据返回，此时返回空数组
            console.warn('_rnnoise_process_frame 无返回值')
            result = new Float32Array();
        }
        console.log('result', result)  
        this.handleAudioData(result);
        this.isProcessing = false;
        if (this.buffer.length) {
            const buffer = this.buffer.shift();
            this.process(buffer);
        }
    }

    destroy() {
        this.rnnoise = null;
        this.buffer.length = 0;
        if (this.inputPtr != null) {
            Module._free(this.inputPtr);
            this.inputPtr = null;
        }
        if (this.outputPtr != null) {
            Module._free(this.outputPtr);
            this.outputPtr = null;
        }
    }

    handleInitFinished() {
        global.postMessage({
            type: 'created',
        })
    }

    handleAudioData = (data) => {
       // console.log('handleAudioData', data)
        global.postMessage({
            type: 'audioData',
            audioData: data,
        }, [data.buffer])
    }
}

const denoiseWorker = function () {
    let denoiser = new denoise();

    global.onmessage = function (event) {
        const data = event.data
        const { type, option } = data

        switch (type) {
            case 'init':
                denoiser.init(option.wasmBinary);
                break;
            case 'process':
                if (denoiser.isProcessing) {
                    if (denoiser.buffer.length >= denoiser.buffer_length) {
                        //console.log('processing, skip this frame');
                        denoiser.buffer.shift();
                        denoiser.buffer.push(data.frame);
                        return;
                    } else {
                        denoiser.buffer.push(data.frame);
                    }
                } else {
                    denoiser.process(data.frame);
                }
                break;
            case 'destroy':
                if (denoiser) {
                    denoiser.destroy();
                    denoiser = null;
                }
                global.postMessage({ type: 'destroyed' });
                break;
            default:
                break;
        }
    }

};

export default denoiseWorker;