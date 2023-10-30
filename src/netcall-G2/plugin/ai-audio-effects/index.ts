import webworkify from 'webworkify-webpack'
import { ILogger } from '../../types'
import { EventEmitter } from 'eventemitter3'
import { modelOptions } from './src/types'

class AIAudioEffects extends EventEmitter {
  private audioEffectsWorker: any
  private _audioEffectsWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private processCallback!: (result: Float32Array) => void
  private isLoaded = false
  private _enableAIDenoise = false
  private _enableAudioEffect = false

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
    this.logger.log('AIAudioEffects create')
    this.audioEffectsWorker = webworkify(require.resolve('./src/audioEffects-worker.js'))
    this.addEventListener()

    this.audioEffectsWorker.postMessage({
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
    this._enableAIDenoise = enable
    this.audioEffectsWorker.postMessage({
      type: 'setState',
      option: {
        type: 'AIDenoise',
        enable
      }
    })
  }

  set enableAudioEffect(enable: boolean) {
    this._enableAudioEffect = enable
    this.audioEffectsWorker.postMessage({
      type: 'setState',
      option: {
        type: 'AudioEffect',
        enable
      }
    })
  }

  get enableAIDenoise() {
    return this._enableAIDenoise
  }

  get enableAudioEffect() {
    return this._enableAudioEffect
  }

  addEventListener() {
    //@ts-ignore
    this.audioEffectsWorker.addEventListener('message', (e) => {
      let data = e.data
      const type = data.type
      switch (type) {
        case 'created':
          this.emit('effects-load')
          this.isLoaded = true
          break
        case 'audioData':
          this.processCallback(data.audioData)
          break
        case 'destroyed':
          if (this._audioEffectsWorkerDestroying) {
            this.logger.log('AudioEffectsWorkers destroyed')
            this._audioEffectsWorkerDestroying = false
            this.audioEffectsWorker.terminate()
            this.audioEffectsWorker = null
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

  setAudioEffect(type: number, value: number) {
    console.warn('setAudioEffect', type, value)
    this.audioEffectsWorker.postMessage({
      type: 'effect',
      effect: {
        type,
        value
      }
    })
  }

  destroy() {
    this.logger.log('Audio Effects destroy')
    if (this.audioEffectsWorker && !this._audioEffectsWorkerDestroying) {
      this._audioEffectsWorkerDestroying = true
      this.audioEffectsWorker.postMessage({ type: 'destroy' })
    }
  }

  process(audioData: any[], callback: (result: Float32Array) => void) {
    this.processCallback = callback

    this.audioEffectsWorker &&
      this.audioEffectsWorker.postMessage({
        type: 'process',
        frame: audioData
      })
  }
}

export default AIAudioEffects
