const global = self

class AudioEffect {
  rnnoise = null
  isProcessing = false
  buffer = []
  buffer_length = 1
  initMem = false
  inLeftPtr = null
  outLeftPtr = null
  inRightPtr = null
  outRightPtr = null
  buffer_size = 128
  inArrayPtr = null
  outArrayPtr = null

  aeInterface = null
  EQArrayPtr = null

  init(binary) {
    global.Module = {
      wasmBinary: binary,
      onRuntimeInitialized: () => {
        this.handleInitFinished()
        this.aeInterface = Module._CreateNEAudioEffect()
        Module._SetPara(this.aeInterface, 48000, 2, 128)
        Module._UpdateEffect(this.aeInterface, 0, 0)
      },
      onAbort: (msg) => {
        global.postMessage({ type: 'error', message: '' + msg })
      }
    }
    require('../lib/audio_effect.js')
  }

  async process(frame) {
    this.isProcessing = true
    if (!this.initMem) {
      this.inLeftPtr = Module._audio_effects_malloc(this.buffer_size * 2)
      this.inRightPtr = Module._audio_effects_malloc(this.buffer_size * 2)
      this.inArrayPtr = Module._audio_effects_malloc(2)
      Module.HEAP32.set([this.inLeftPtr, this.inRightPtr], this.inArrayPtr >> 2) //单位长度需要和第一个参数元素数据长度对应，第二个参数需要转化为内存地址

      this.outLeftPtr = Module._audio_effects_malloc(this.buffer_size * 2)
      this.outRightPtr = Module._audio_effects_malloc(this.buffer_size * 2)
      this.outArrayPtr = Module._audio_effects_malloc(2)
      Module.HEAP32.set([this.outLeftPtr, this.outRightPtr], this.outArrayPtr >> 2)

      this.EQArrayPtr = Module._audio_effects_malloc(this.buffer_size * 4)

      this.initMem = true
    }

    let leftData = Int16Array.from(frame[0], (x) => x * 32767),
      rightData = Int16Array.from(frame[1], (x) => x * 32767)
    let result = []

    Module.HEAP16.set(leftData, this.inLeftPtr >> 1)
    Module.HEAP16.set(rightData, this.inRightPtr >> 1)
    const hasResult = Module._Process(this.aeInterface, this.inArrayPtr, 2, 128, this.outArrayPtr)
    if (hasResult) {
      result.push(
        Float32Array.from(
          Module.HEAP16.subarray(this.outLeftPtr >> 1, (this.outLeftPtr >> 1) + this.buffer_size),
          (x) => x / 32768
        )
      )
      result.push(
        new Float32Array(
          Module.HEAP16.subarray(this.outRightPtr >> 1, (this.outRightPtr >> 1) + this.buffer_size)
        )
      )
      this.handleAudioData(result)
    } else {
      //console.warn('_rnnoise_process_frame 无返回值')
    }
    this.isProcessing = false
    if (this.buffer.length) {
      const buffer = this.buffer.shift()
      this.process(buffer)
    }
  }

  setEffect(type, value) {
    if (this.aeInterface) {
      console.warn('setEffect', type, value)
      switch (type) {
        case 0:
        case 1:
          Module._UpdateEffect(this.aeInterface, type, value)
          break
        case 'Pitch':
          Module._setLocalPitch(this.aeInterface, value)
          break
        case 'EQ':
          Module.HEAP32.set(new Int32Array(value), this.EQArrayPtr >> 2)
          Module._SetEQGain(this.aeInterface, this.EQArrayPtr)
          break
      }
    }
  }

  destroy() {
    this.rnnoise = null
    this.buffer.length = 0
    if (this.inLeftPtr != null) {
      Module._audio_effects_free(this.inLeftPtr)
      this.inLeftPtr = null
      Module._audio_effects_free(this.inRightPtr)
      this.inRightPtr = null
      Module._audio_effects_free(this.outLeftPtr)
      this.outLeftPtr = null
      Module._audio_effects_free(this.outRightPtr)
      this.outRightPtr = null
      Module._audio_effects_free(this.inArrayPtr)
      this.inArrayPtr = null
      Module._audio_effects_free(this.outArrayPtr)
      this.outArrayPtr = null
    }
  }

  handleInitFinished() {
    global.postMessage({
      type: 'created'
    })
  }

  handleAudioData = (data) => {
    global.postMessage({
      type: 'audioData',
      audioData: data
    })
  }
}

const denoiseWorker = function () {
  let denoiser = new AudioEffect()

  global.onmessage = function (event) {
    const data = event.data
    const { type, option } = data

    switch (type) {
      case 'init':
        denoiser.init(option.wasmBinary)
        break
      case 'process':
        if (denoiser.isProcessing) {
          if (denoiser.buffer.length >= denoiser.buffer_length) {
            denoiser.buffer.shift()
            denoiser.buffer.push(data.frame)
            return
          } else {
            denoiser.buffer.push(data.frame)
          }
        } else {
          denoiser.process(data.frame)
        }
        break
      case 'effect':
        const effect = data.effect
        denoiser.setEffect(effect.type, effect.value)
        break
      case 'destroy':
        if (denoiser) {
          denoiser.destroy()
          denoiser = null
        }
        global.postMessage({ type: 'destroyed' })
        break
      default:
        break
    }
  }
}

export default denoiseWorker
