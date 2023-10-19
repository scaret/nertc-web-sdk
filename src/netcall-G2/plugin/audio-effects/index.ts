import webworkify from 'webworkify-webpack'
import { ILogger } from '../../types'
import { EventEmitter } from 'eventemitter3'
import { modelOptions } from './src/types'

class AIAudioEffects extends EventEmitter {
  private deoniseWorker: any
  private _deoniseWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private processCallback!: (result: Float32Array) => void
  private isLoaded = false

  constructor(options: modelOptions) {
    super()
    this.logger = options.adapterRef.logger.getChild(() => {
      return 'AIAudioEffects'
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
    this.logger.log('AudioEffects create')
    this.deoniseWorker = webworkify(require.resolve('./src/AudioEffects-worker.js'))
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

  set enableAIDenoise(enable: boolean) {
    this.deoniseWorker.postMessage({
      type: 'setState',
      option: {
        type: 'AIDenoise',
        enable
      }
    })
  }

  set enableAudioEffect(enable: boolean) {
    this.deoniseWorker.postMessage({
      type: 'setState',
      option: {
        type: 'AudioEffect',
        enable
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
          console.warn('created')
          this.emit('effects-load')
          this.isLoaded = true
          break
        case 'audioData':
          this.processCallback(data.audioData)
          break
        case 'destroyed':
          if (this._deoniseWorkerDestroying) {
            this.logger.log('AudioEffectsWorkers destroyed')
            this._deoniseWorkerDestroying = false
            this.deoniseWorker.terminate()
            this.deoniseWorker = null
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

  setAudioEffect(type: number, value: number) {
    console.warn('setAudioEffect', type, value)
    this.deoniseWorker.postMessage({
      type: 'effect',
      effect: {
        type,
        value
      }
    })
  }

  destroy() {
    this.logger.log('Audio Effects destroy')
    if (this.deoniseWorker && !this._deoniseWorkerDestroying) {
      this._deoniseWorkerDestroying = true
      this.deoniseWorker.postMessage({ type: 'destroy' })
    }
  }

  process(noiseData: any[], callback: (result: Float32Array) => void) {
    this.processCallback = callback

    //console.warn('load', this.load)
    this.deoniseWorker &&
      this.deoniseWorker.postMessage({
        type: 'process',
        frame: noiseData
      })
  }
}

export default AIAudioEffects
