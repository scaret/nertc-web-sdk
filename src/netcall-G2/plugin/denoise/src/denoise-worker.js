const global = self;

class denoise {
    rnnoise = null;
    isProcessing = false;
    buffer = [];
    buffer_length = 1;
    initMem = false;
    inLeftPtr = null;
    outLeftPtr = null;
    inRightPtr = null;
    outRightPtr = null;
    buffer_size = 128;
    inArrayPtr = null;
    outArrayPtr = null;

    init(binary) {
        global.Module = {
            wasmBinary: binary,
            onRuntimeInitialized: () => {
                this.rnnoise = global.Module._rnnoise_create();
                this.handleInitFinished();
            }
        }
        require('../lib/ai_denoise.js');
    }

    async process(frame) {
        this.isProcessing = true;
        if (!this.initMem) {
            this.inLeftPtr = Module._rnnoise_Malloc(this.buffer_size * 4);     
            this.inRightPtr = Module._rnnoise_Malloc(this.buffer_size * 4);
            this.outLeftPtr = Module._rnnoise_Malloc(this.buffer_size * 4);
            this.outRightPtr = Module._rnnoise_Malloc(this.buffer_size * 4);
            this.inArrayPtr = Module._rnnoise_Malloc(2);
            this.outArrayPtr = Module._rnnoise_Malloc(2);
          //  Module.HEAPF32.set([this.inLeftPtr, this.inRightPtr], this.inArrayPtr >> 2);         
           console.log(Module)
           Module.HEAP32.set([this.inLeftPtr , this.inRightPtr], this.inArrayPtr >> 2);     
           Module.HEAP32.set([this.outLeftPtr, this.outRightPtr], this.outArrayPtr >> 2);    
           //Module.HEAPF32.set([0, 0], this.outArrayPtr >> 2);

            console.log(this.rnnoise, this.inLeftPtr, this.inRightPtr, this.outLeftPtr, this.outRightPtr,this.inArrayPtr, this.outArrayPtr, Module.HEAPF32.subarray(this.inArrayPtr >> 2, (this.inArrayPtr >> 2) + 2))
            console.log(Module.HEAPF32.subarray(this.outArrayPtr >> 2, (this.outArrayPtr >> 2) + 2))

          console.log('in0:', this.inLeftPtr, ' in1:', this.inRightPtr, ' in', this.inArrayPtr,' inArray:', new Float32Array(Module.HEAPF32.subarray((this.inArrayPtr >> 2) - 0, (this.inArrayPtr >> 2) + 2)))

            this.initMem = true;
        }
       
        let leftData = new Float32Array(frame[0]),
            rightData = new Float32Array(frame[1]);
        let result = [];

       Module.HEAPF32.set(leftData, this.inLeftPtr >> 2);
       Module.HEAPF32.set(rightData, this.inRightPtr >> 2);
       let t1 = performance.now();
    //  console.log('in right', rightData)
        if(Module._rnnoise_process_frame(this.rnnoise, this.outArrayPtr, this.inArrayPtr, 2)){
         // console.log(Module.HEAP32.subarray(this.outLeftPtr , (this.outLeftPtr ) + this.buffer_size))
           result.push(new Float32Array(Module.HEAPF32.subarray(this.outLeftPtr >> 2, (this.outLeftPtr >> 2) + this.buffer_size)));
           result.push(new Float32Array(Module.HEAPF32.subarray(this.outRightPtr >> 2, (this.outRightPtr >> 2) + this.buffer_size)));
      //    console.log('out right', result[1])
           this.handleAudioData(result);
        } else {
            //_rnnoise_process_frame返回值为null时表示无数据返回，此时返回空数组
            console.warn('_rnnoise_process_frame 无返回值')
            // result.push(new Float32Array());
            // result.push(new Float32Array());
        }
        let time =  performance.now() - t1;
        if(time > 2) {
         // console.log('process', time, ' ms')
        }
       
        this.isProcessing = false;
        if (this.buffer.length) {
            const buffer = this.buffer.shift();
            this.process(buffer);
        }
    }

    destroy() {
        this.rnnoise = null;
        this.buffer.length = 0;
        if (this.inLeftPtr != null) {
            Module._free(this.inLeftPtr);
            this.inLeftPtr = null;
        }
        if (this.outLeftPtr != null) {
            Module._free(this.outLeftPtr);
            this.outLeftPtr = null;
        }
    }

    handleInitFinished() {
        global.postMessage({
            type: 'created',
        })
    }

    handleAudioData = (data) => {
        global.postMessage({
            type: 'audioData',
            audioData: data,
        })
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