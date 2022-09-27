import webworkify from 'webworkify-webpack'
import { ILogger } from '../../types'
import { EventEmitter } from 'eventemitter3'
import { modelOptions } from './src/types'

class AIDenoise extends EventEmitter {
  private deoniseWorker: any
  private _deoniseWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private denoiseCallback!: (result: Float32Array) => void
  private isLoaded = false

  constructor(options: modelOptions) {
    super()
    this.logger = options.adapterRef.logger.getChild(() => {
      return 'AIDenoise'
    })

    this.isLoaded = false
    this.preload(options)
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

  get load() {
    return this.isLoaded
  }

  addEventListener() {
    //@ts-ignore
    this.deoniseWorker.addEventListener('message', (e) => {
      let data = e.data
      const type = data.type
      switch (type) {
        case 'created':
          this.emit('denoise-load')
          this.isLoaded = true
          break
        case 'audioData':
          this.denoiseCallback(data.audioData)
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
    this.logger.log('AIDenoise destroy')
    if (this.deoniseWorker && !this._deoniseWorkerDestroying) {
      this._deoniseWorkerDestroying = true
      this.deoniseWorker.postMessage({ type: 'destroy' })
    }
  }

  process(noiseData: any[], callback: (result: Float32Array) => void) {
    this.denoiseCallback = callback
    if (!this.load) {
      return
    }
    this.deoniseWorker.postMessage({
      type: 'process',
      frame: noiseData
    })
  }
}

export default AIDenoise
