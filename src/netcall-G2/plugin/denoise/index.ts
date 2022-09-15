import webworkify from 'webworkify-webpack'
import { Logger } from '../../util/webrtcLogger'
import { ILogger } from '../../types'
import { RTCEventEmitter } from '../../util/rtcUtil/RTCEventEmitter'

class AIDenoise extends RTCEventEmitter {
  private deoniseWorker: any
  private _deoniseWorkerDestroying = false
  private logger: ILogger
  private wasmBinary: Uint8Array = new Uint8Array()
  private denoiseCallback!: (result: Float32Array) => void
  private modelParam: any
  private isLoaded = false
  constructor(options: any) {
    super()
    this.modelParam = options //'normal'
    this.logger = new Logger({
      tagGen: () => {
        return 'AIDenoise'
      }
    })
    this.modelParam.wasmUrl =
      'https://yx-web-nosdn.netease.im/sdk-release/ai_denoise.wasm?time=' + Date.now()
    this.isLoaded = false
    this.preload(this.modelParam)
  }

  async preload(options: any) {
    await fetch(options.wasmUrl)
      .then((response) => response.arrayBuffer())
      .then((bytes) => {
        this.wasmBinary = new Uint8Array(bytes)
        this.emit('plugin-load')
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
    this.logger.log('segmentation destroy')
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
