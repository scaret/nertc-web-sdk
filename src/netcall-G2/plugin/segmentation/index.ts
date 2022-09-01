import { EventEmitter } from 'eventemitter3'
import webworkify from 'webworkify-webpack'

import { ILogger } from '../../types'
import { Logger } from '../../util/webrtcLogger'
import { modelOptions } from './src/types'

class Segmentation extends EventEmitter {
  private modelParam: modelOptions
  private segmentWorker: any
  private _segmentWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private onMaskDataCallback!: (result: ImageData) => void

  constructor(options: modelOptions) {
    super()
    this.modelParam = options //'normal'
    this.logger = new Logger({
      tagGen: () => {
        return 'Segment'
      }
    })
    this.preload(this.modelParam)
  }

  async preload(options: modelOptions) {
    await fetch(options.wasmUrl)
      .then((response) => {
        if (response.status == 200) {
          return response.arrayBuffer()
        } else {
          this.emit('plugin-load-error')
        }
      })
      .then((bytes) => {
        if (bytes) {
          this.wasmBinary = new Uint8Array(bytes)
          this.emit('plugin-load')
        }
      })
  }

  init() {
    this.logger.log('segmenter create')
    this.segmentWorker = webworkify(require.resolve('./src/segmenter-worker.js'))
    this.addEventListener()

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
      let data = e.data
      const type = data.type
      switch (type) {
        case 'created':
          this.emit('segment-load')
          break
        case 'mask':
          this.onMaskDataCallback(data.maskData)
          break
        case 'destroyed':
          if (this._segmentWorkerDestroying) {
            this.logger.log('segmentWorker destroyed')
            this._segmentWorkerDestroying = false
            this.segmentWorker.terminate()
            this.segmentWorker = null
          }
          break
        case 'error':
          this.emit('error', data.message)
      }
    })
  }

  destroy() {
    this.logger.log('segmentation destroy')
    if (this.segmentWorker && !this._segmentWorkerDestroying) {
      this._segmentWorkerDestroying = true
      this.segmentWorker.postMessage({ type: 'destroy' })
    }
  }

  process(
    imageData: Uint8Array,
    width: number,
    height: number,
    callback: (result: ImageData) => void,
    forceGC = false
  ) {
    this.onMaskDataCallback = callback
    this.segmentWorker &&
      this.segmentWorker.postMessage(
        {
          type: 'process',
          frame: imageData,
          width,
          height,
          forceGC
        },
        [imageData.buffer]
      )
  }
}

export default Segmentation
