const global = self;

class mHumanSegmenter {
    mHumanSegmenter = null;
    buffer = [];
    buffer_length = 1;
    width = 0;
    height = 0;
    initMem = false;
    inputPtr = null;
    outputPtr = null;
    outputArrayBuffer = new ArrayBuffer(256*256*4);
    frameArrayBuffer = new ArrayBuffer(1920*1080 * 4)
    segment_mask = new ImageData(256,256);

    init(binary) {
        global.Module = {
            wasmBinary: binary,
            onRuntimeInitialized: () => {
                console.log('Module onRuntimeInitialized')
                this.mHumanSegmenter = new global.Module.SegmentModule();
                this.handleInitFinished();
            }
        }
        require('../lib/ne_segment_normal.js');
    }

    async process(frame, width, height) {
        if (!this.initMem || frame.width !== this.width || frame.height !== this.height) {
            if (this.inputPtr != null) {
                Module._free(this.inputPtr);
                this.inputPtr = null;
            }
            if (this.outputPtr != null) {
                Module._free(this.outputPtr);
                this.outputPtr = null;
            }
            this.inputPtr = global.Module._malloc(frame.length);
            this.outputPtr = global.Module._malloc(frame.length);

            this.initMem = true;
            this.width = width;
            this.height = height;
        }
     
        Module.HEAPU8.set(frame, this.inputPtr);
        this.mHumanSegmenter.process(this.inputPtr, this.outputPtr, this.width, this.height);
        let result = Module.HEAPU8.subarray(this.outputPtr, this.outputPtr + 256 * 256);
        this.segment_mask.data.set(this.alphaToImageData(result))
        this.handleMaskData(this.segment_mask);
    }

    alphaToImageData(data) {
        const imageData = new Uint8ClampedArray(this.outputArrayBuffer);
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
        })
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
                let frame = new Uint8Array(segmenter.frameArrayBuffer);
                frame.set(data.frame, 0);
                segmenter.process(frame, data.width, data.height); 
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