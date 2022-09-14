import webworkify from 'webworkify-webpack'
import { EventEmitter } from 'eventemitter3'
import { Logger } from '../../util/webrtcLogger'
import { ILogger } from '../../types'
import { modelOptions } from './src/types'

class AIDenoise extends EventEmitter {
  private modelParam: modelOptions
  private deoniseWorker: any
  private _deoniseWorkerDestroying: boolean = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private maxOutBufferSize: number = 10
  private outputsBuffer: Array<Array<Array<Float32Array>>> = new Array(0)

  constructor(options: modelOptions) {
    super()
    this.modelParam = options //'normal'
    this.logger = new Logger({
      tagGen: () => {
        return 'AIDenoise'
      }
    })
    //this.modelParam.wasmUrl = 'https://yx-web-nosdn.netease.im/sdk-release/ai_denoise.wasm?time=' + Date.now();
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
    this.logger.log('AIDenoise create')
    this.deoniseWorker = webworkify(require.resolve('./src/denoise-worker.js'))
    this.addEventListener()

    this.deoniseWorker.postMessage({
      type: 'init',
      option: {
        wasmBinary: this.wasmBinary
      }
    })
  }

  addEventListener() {
    //@ts-ignore
    this.deoniseWorker.addEventListener('message', (e) => {
      let data = e.data
      const type = data.type
      switch (type) {
        case 'created':
          this.emit('denoise-load')
          break
        case 'audioData':
          this.outputsBuffer.push(data.audioData)
          //缓存过大时丢帧处理
          if (this.outputsBuffer.length > this.maxOutBufferSize) {
            this.outputsBuffer.shift()
          }
          break
        case 'destroyed':
          if (this._deoniseWorkerDestroying) {
            this.logger.log('AIDenoiseworker destroyed')
            this._deoniseWorkerDestroying = false
            this.deoniseWorker.terminate()
            this.deoniseWorker = null
          }
          break
      }
    })
  }

  destroy() {
    this.logger.log('segmentation destroy')
    if (this.deoniseWorker && !this._deoniseWorkerDestroying) {
      this._deoniseWorkerDestroying = true
      this.deoniseWorker.postMessage({ type: 'destroy' })
    }
  }

  process(
    inputs: Array<Array<Array<Float32Array>>>,
    outputs: Array<Array<Array<Float32Array>>>,
    parameters: any
  ) {
    this.deoniseWorker.postMessage({
      type: 'process',
      frame: inputs[0]
    })
    const firstItem = this.outputsBuffer.shift()
    if (firstItem) {
      outputs[0] = firstItem
    } else {
      //todo 不存在out时返回纯0还是in ？
    }
    return true
  }
}

export default AIDenoise
