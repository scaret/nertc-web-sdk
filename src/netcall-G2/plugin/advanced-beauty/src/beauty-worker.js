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
    max_face_size = 1;
    keyPointSize = 0;

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

    async process(frame) {
        this.isProcessing = true;
        if (!this.initMem || frame.width !== this.width || frame.height !== this.height) {
            if (this.inputPtr != null) {
                Module._free(this.inputPtr);
                this.inputPtr = null;
            }
            this.inputPtr = global.Module._malloc(frame.data.length);
            this.initMem = true;
            this.width = frame.width;
            this.height = frame.height;
        }
        Module.HEAPU8.set(frame.data, this.inputPtr);
        this.mHumanSegmenter.process(this.inputPtr, this.width, this.height);

        let det_face_size = this.mHumanSegmenter.getDetFaceSize(); //返回实际检测到的人脸数量
        let pointsArrayBuffer = new Int16Array(det_face_size * this.keyPointSize * 2);
        for (var i = 0; i < det_face_size; i++) {
            var mResult = this.mHumanSegmenter.getFaceResult(i);
            //this.getFaceBox(mResult.box, mResult.threshold, mResult.smooth)
            let points = this.getFacePoints(mResult.points);
            pointsArrayBuffer.set(points, this.keyPointSize * 2 * i);
        }
        this.handleFacePointsData(pointsArrayBuffer, frame);
        this.isProcessing = false;

        if (this.buffer.length) {
            const buffer = this.buffer.shift();
            this.process(buffer);
        }
    }

    getFaceBox(box, threshold, smooth) {

    }

    getFacePoints(points) {
        let array = new Int16Array(this.keyPointSize * 2);
        for (let j = 0; j < this.keyPointSize; ++j) {
            let x = points.get(j * 2 + 0);
            let y = points.get(j * 2 + 1);
            array[j * 2 + 0] = x;
            array[j * 2 + 1] = y;
        }
        return array;
    }

    destroy() {
        this.mHumanSegmenter = null;
        this.buffer.length = 0;
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

    handleFacePointsData = (facePoints, frame) => {
        global.postMessage({
            type: 'facePoints',
            faceData: facePoints,
            imageData: frame
        }, [facePoints.buffer, frame.data.buffer])
    }

    setFaceSize(faceSize){
        this.mHumanSegmenter.setMaxFaceSize(faceSize);
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