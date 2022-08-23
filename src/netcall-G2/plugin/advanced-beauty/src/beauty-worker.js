const global = self;

class mHumanSegmenter {
    mHumanSegmenter = null;
    width = 0;
    height = 0;
    initMem = false;
    inputPtr = null;
    max_face_size = 1;
    keyPointSize = 0;
    outputArrayBuffer = null;

    async init(binary) {
        global.Module = {
            wasmBinary: binary,
            onRuntimeInitialized: () => {
                console.log('Module onRuntimeInitialized')
                this.mHumanSegmenter = new global.Module.FaceKeyPointModule();
                    this.mHumanSegmenter.setMaxFaceSize(this.max_face_size);
                    this.keyPointSize = this.mHumanSegmenter.getKeyPointSize();
                    this.handleInitFinished();
            }
        }   
        require('../lib/ne_face_points.js');
    }

    async process(frame, width, height) {
      try {
        if (!this.initMem || width !== this.width || height !== this.height) {
            if (this.inputPtr != null) {
                Module._free(this.inputPtr);
                this.inputPtr = null;
            }
            this.inputPtr = Module._malloc(frame.length);
            this.initMem = true;
            this.width = width;
            this.height = height;
        }
        Module.HEAPU8.set(frame, this.inputPtr);
        this.mHumanSegmenter.process(this.inputPtr, this.width, this.height);
        const faceData = this.getFacePoints();
        this.handleFacePointsData(faceData);
      } catch (e) {
        console.error(e)
        this.handleFacePointsData(new Uint16Array());
      }
    }

    getFaceBox(box, threshold, smooth) {

    }

    getFacePoints() {
        let det_face_size = this.mHumanSegmenter.getDetFaceSize(); //返回实际检测到的人脸数量
        let pointsArrayBuffer = new Int16Array(this.outputArrayBuffer, 0, det_face_size * this.keyPointSize * 2);
        for (let i = 0; i < det_face_size; i++) {
            let mResult = this.mHumanSegmenter.getFaceResult(i);
            //this.getFaceBox(mResult.box, mResult.threshold, mResult.smooth)
            for (let j = 0; j < this.keyPointSize; j++) {
                pointsArrayBuffer[i * this.keyPointSize * 2 + j * 2] = mResult.points.get(j * 2);
                pointsArrayBuffer[i * this.keyPointSize * 2  + j * 2 + 1] = mResult.points.get(j * 2 + 1);
            }
        }
        return pointsArrayBuffer;
    }

    destroy() {
        this.mHumanSegmenter = null;
        if (this.inputPtr != null) {
            Module._free(this.inputPtr);
            this.inputPtr = null;
        }
    }

    handleInitFinished() {
        global.postMessage({
            type: 'created',
        })
    }

    handleFacePointsData = (facePoints) => {
        global.postMessage({
            type: 'facePoints',
            faceData: facePoints
        })
    }

    setFaceSize(faceSize){
        this.mHumanSegmenter.setMaxFaceSize(faceSize);
        this.outputArrayBuffer = new ArrayBuffer(faceSize * this.keyPointSize * 2 * 2) 
    }
}

function force_gc() {
    // 强制 GC
    try{
        new WebAssembly.Memory({initial: 128})
    }catch(e){
        console.error('gc error', e);
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
                segmenter.process(data.frame, data.width, data.height);
                if(data.forceGC){
                    force_gc();
                }
                break;
            case 'destroy':
                if (segmenter) {
                    segmenter.destroy();
                    segmenter = null;
                }
                global.postMessage({ type: 'destroyed' });
                break;
            case 'faceSize':
                if(segmenter){
                    segmenter.setFaceSize(option.faceSize);
                }
                break;
            default:
                break;
        }
    }
};

export default segmenterWorker;