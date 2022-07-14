const global = self;

class mHumanSegmenter {
    mHumanSegmenter = null;
    isProcessing = false;
    buffer = [];
    buffer_length = 1;
    width = 0;
    height = 0;
    initMem = false;
    inputPtr = null;
    outputPtr = null;

    init(binary) {
        global.Module = {
            wasmBinary: binary,
            onRuntimeInitialized: () => {
                console.log('Module onRuntimeInitialized')
                this.mHumanSegmenter = new global.Module.SegmentModule();
                this.handleInitFinished();
            }
        }
        require('../lib/nn_segment_normal_test.js');
        this.alphaToImageData([1,2,3,4])
    }

    async process(frame) {
        this.isProcessing = true;
        if (!this.initMem || frame.width !== this.width || frame.height !== this.height) {
            if (this.inputPtr != null) {
                Module._free(this.inputPtr);
                this.inputPtr = null;
            }
            if (this.outputPtr != null) {
                Module._free(this.outputPtr);
                this.outputPtr = null;
            }
            this.inputPtr = global.Module._malloc(frame.data.length);
            this.outputPtr = global.Module._malloc(frame.data.length);

            this.initMem = true;
            this.width = frame.width;
            this.height = frame.height;
        }
        Module.HEAPU8.set(frame.data, this.inputPtr);
        this.mHumanSegmenter.process(this.inputPtr, this.outputPtr, this.width, this.height);
        const result = Module.HEAPU8.subarray(this.outputPtr, this.outputPtr + 256*256);
        
        const segment_mask = this.alphaToImageData(result);
        
        this.handleMaskData(segment_mask, frame);
        this.isProcessing = false;
        if (this.buffer.length) {
            const buffer = this.buffer.shift();
            this.process(buffer);
        }
    }

    alphaToImageData(data) {
        const imageData = new Uint8ClampedArray(data.length * 4);
        for(let i =0; i < data.length; i++) {
            imageData[i * 4 + 3] = data[i];
        }
        return imageData;
    }

    destroy() {
        this.mHumanSegmenter = null;
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

    handleMaskData = (segment_mask) => {
        global.postMessage({
            type: 'mask',
            maskData: segment_mask,
        }, [segment_mask.buffer])
    }
}

const segmenterWorker = function () {
    let segmenter = new mHumanSegmenter();

    global.onmessage = function (event) {
        const data = event.data
        const { type, option } = data

        switch (type) {
            case 'init':
                segmenter.init(option.wasmBinary);
                break;
            case 'process':
                if (segmenter.isProcessing) {
                    if (segmenter.buffer.length >= segmenter.buffer_length) {
                        //console.log('processing, skip this frame');
                        segmenter.buffer.shift();
                        segmenter.buffer.push(data.frame);
                        return;
                    } else {
                        segmenter.buffer.push(data.frame);
                    }
                } else {
                    segmenter.process(data.frame);
                }
                break;
            case 'destroy':
                if (segmenter) {
                    segmenter.destroy();
                    segmenter = null;
                }
                global.postMessage({ type: 'destroyed' });
                break;
            default:
                break;
        }
    }

};

export default segmenterWorker;