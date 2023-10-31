import webworkify from 'webworkify-webpack'
import { ILogger } from '../../types'
import { EventEmitter } from 'eventemitter3'
import { modelOptions } from './src/types'

interface ReverbObjType {
  wetGain: number
  dryGain: number
  damping: number
  roomSize: number
  decayTime: number
  preDelay: number
}

type ReverbType = keyof ReverbObjType

function getDecimalPlaces(number: number) {
  let decimalPlaces = 0
  const decimalPart = number.toString().split('.')[1]
  if (decimalPart) {
    decimalPlaces = decimalPart.length
  }
  return decimalPlaces
}

function isOutLimit(number: number, min: number, max: number, step: number) {
  let outLimit = false
  if (
    isNaN(number) ||
    number < min ||
    number > max ||
    getDecimalPlaces(number) > getDecimalPlaces(step)
  ) {
    outLimit = true
  }
  return outLimit
}

class AIAudioEffects extends EventEmitter {
  private audioEffectsWorker: any
  private _audioEffectsWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private processCallback!: (result: Float32Array) => void
  private isLoaded = false
  private _enableAIDenoise = false
  private _enableAudioEffect = false
  private limit = {
    Pitch: {
      min: 0.5,
      max: 2,
      step: 0.1
    },
    EQ: {
      min: -15,
      max: 15,
      step: 1
    },
    Reverb: {
      wetGain: {
        min: 0,
        max: 1,
        step: 0.1
      },
      dryGain: {
        min: 0,
        max: 1,
        step: 0.1
      },
      damping: {
        min: 0,
        max: 1,
        step: 0.1
      },
      roomSize: {
        min: 0.1,
        max: 2,
        step: 0.1
      },
      decayTime: {
        min: 0,
        max: 20,
        step: 0.1
      },
      preDelay: {
        min: 0,
        max: 1,
        step: 0.1
      }
    }
  }

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

  setAudioEffect(type: number | string, value: number | Array<number> | ReverbObjType) {
    console.warn('setAudioEffect', type, value)
    let outLimit = false
    switch (type) {
      case 0:
        if (typeof value !== 'number' || value < 0 || value > 8) {
          outLimit = true
        }
        break
      case 1:
        if (typeof value !== 'number' || value < 0 || value > 11) {
          outLimit = true
        }
        break
      case 'Pitch':
        outLimit = isOutLimit(
          value as number,
          this.limit.Pitch.min,
          this.limit.Pitch.max,
          this.limit.Pitch.step
        )
        break
      case 'EQ':
        if (Array.isArray(value)) {
          if (value.length !== 10) {
            outLimit = true
          }
          for (let i = 0; i < value.length; i++) {
            if (isOutLimit(value[i], this.limit.EQ.min, this.limit.EQ.max, this.limit.EQ.step)) {
              outLimit = true
              break
            }
          }
        } else {
          outLimit = true
        }
        break
      case 'Reverb':
        if (typeof value === 'object' && !Array.isArray(value)) {
          for (const key in value) {
            if (value.hasOwnProperty(key)) {
              const element = value[key as ReverbType]
              if (
                isOutLimit(
                  element,
                  this.limit.Reverb[key as ReverbType].min,
                  this.limit.Reverb[key as ReverbType].max,
                  this.limit.Reverb[key as ReverbType].step
                )
              ) {
                outLimit = true
                break
              }
            } else {
              outLimit = true
            }
          }
        } else {
          outLimit = true
        }
        break
      default:
        outLimit = true
        break
    }
    if (outLimit) {
      this.logger.error('setAudioEffect outLimit:', type, value)
    } else {
      this.audioEffectsWorker.postMessage({
        type: 'effect',
        effect: {
          type,
          value
        }
      })
    }
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
