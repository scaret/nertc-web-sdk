import webworkify from 'webworkify-webpack'
import { ILogger } from '../../types'
import { EventEmitter } from 'eventemitter3'
import { modelOptions } from './src/types'

class AIholwing extends EventEmitter {
  private howlingWorker: any
  private _howlingWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private processCallback!: (result: Float32Array) => void
  private isLoaded = false

  constructor(options: modelOptions) {
    super()
    this.logger = options.adapterRef.logger.getChild(() => {
      return 'AIholwing'
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
    this.logger.log('AIholwing create')
    this.howlingWorker = webworkify(require.resolve('./src/howling-worker.js'))
    this.addEventListener()

    this.howlingWorker.postMessage({
      type: 'init',
      option: {
        wasmBinary: this.wasmBinary
      }
    })
  }

  setHowlingCallback(callback: (result: Float32Array) => void) {
    this.processCallback = callback
    console.warn('this.processCallback', this.processCallback)
  }

  get load() {
    return this.isLoaded
  }

  addEventListener() {
    //@ts-ignore
    this.howlingWorker.addEventListener('message', (e) => {
      let data = e.data
      const type = data.type
      switch (type) {
        case 'created':
          this.emit('aihowling-load')
          this.isLoaded = true
          break
        case 'hasHowling':
          //console.warn('data.result', data.result, this.processCallback)
          if (typeof this.processCallback == 'function') {
            this.processCallback(data.result)
          }
          break
        case 'destroyed':
          if (this._howlingWorkerDestroying) {
            this.logger.log('AIhowlingWorker destroyed')
            this._howlingWorkerDestroying = false
            this.howlingWorker.terminate()
            this.howlingWorker = null
            this.isLoaded = false
          }
          break
        case 'error':
          this.emit('error', data.message)
          break
        default:
          break
      }
    })
  }

  destroy() {
    this.logger.log('AI howling destroy')
    if (this.howlingWorker && !this._howlingWorkerDestroying) {
      this._howlingWorkerDestroying = true
      this.howlingWorker.postMessage({ type: 'destroy' })
    }
  }

  process(audioData: any[], callback: (result: Float32Array) => void) {
    //this.processCallback = callback

    this.howlingWorker &&
      this.howlingWorker.postMessage({
        type: 'process',
        frame: audioData
      })
  }
}

export default AIholwing
