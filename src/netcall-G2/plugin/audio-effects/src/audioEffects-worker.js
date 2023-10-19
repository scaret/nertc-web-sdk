
const global = self

class AIDenoise {
  rnnoise = null
  inArrayPtr = null
  outArrayPtr = null
  enabled = true

  constructor() {
    //创建实例
    this.rnnoise = Module._rnnoise_create();
  }

  init( inArrayPtr, outArrayPtr) {
    this.inArrayPtr = inArrayPtr
    this.outArrayPtr = outArrayPtr
  }

  process() {
    const hasResult = Module._rnnoise_process_frame(this.rnnoise, this.outArrayPtr, this.inArrayPtr, 2)
    return hasResult
  }

  set enable(value) {
    this.enabled = value
  }

  get enable() {
    return this.enabled
  }

}

class AudioEffect {
  aeInterface = null
  initMem = false
  inArrayPtr = null
  outArrayPtr = null
  EQArrayPtr = null
  ReverbPtr = null
  enabled = false

  constructor() {
    //创建实例
    this.aeInterface = Module._CreateNEAudioEffect()
    Module._SetPara(this.aeInterface, 48000, 2, 128)
    Module._UpdateEffect(this.aeInterface, 0, 0)
  }

  init(inArrayPtr, outArrayPtr) {
    this.inArrayPtr = inArrayPtr
    this.outArrayPtr = outArrayPtr
    this.EQArrayPtr = Module._audio_effects_malloc(128 * 4)

    this.ReverbPtr = Module._audio_effects_malloc(6 * 4)
  }

  process() {
    const hasResult = Module._Process(this.aeInterface, this.inArrayPtr, 2, 128, this.outArrayPtr)
    return hasResult
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
        case 'Reverb':
          const reverbArray =  new Array()
          reverbArray.push(value.wetGain)
          reverbArray.push(value.dryGain)
          reverbArray.push(value.damping)
          reverbArray.push(value.roomSize)
          reverbArray.push(value.decayTime)
          reverbArray.push(value.preDelay)
          Module.HEAPF32.set(reverbArray, this.ReverbPtr >> 2)
          Module._SetLocalVoiceReverbParam(this.aeInterface, this.ReverbPtr)
          break
      }
    }
  }

  set enable(value) {
    this.enabled = value
  }

  get enable() {
    return this.enabled
  }

  destroy() {
    if(this.aeInterface) {
      Module._DeleteNEAudioEffect(this.aeInterface)
      this.aeInterface = null
    }
  }
}


class AudioEffects {
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

  AIDenoise = null
  AudioEffect = null


  init(binary) {
    global.Module = {
      wasmBinary: binary,
      onRuntimeInitialized: () => {
        console.warn('onRuntimeInitialized' , Module)
        this.AIDenoise = new AIDenoise()
        this.AudioEffect = new AudioEffect()
        this.malloc();
        this.AIDenoise.init(this.inArrayPtr, this.outArrayPtr)
        this.AudioEffect.init(this.inArrayPtr, this.outArrayPtr)
        this.initMem = true

        this.handleInitFinished()
      },
      onAbort: (msg) => {
        global.postMessage({ type: 'error', message: '' + msg })
      }
    }
    require('../lib/audio_effects_and_denoise.js')
  }

  malloc() {
     this.inLeftPtr = Module._audio_effects_malloc(this.buffer_size * 2)
     this.inRightPtr = Module._audio_effects_malloc(this.buffer_size * 2)
     this.inArrayPtr = Module._audio_effects_malloc(2)
     Module.HEAP32.set([this.inLeftPtr, this.inRightPtr], this.inArrayPtr >> 2) //单位长度需要和第一个参数元素数据长度对应，第二个参数需要转化为内存地址

     this.outLeftPtr = Module._audio_effects_malloc(this.buffer_size * 2)
     this.outRightPtr = Module._audio_effects_malloc(this.buffer_size * 2)
     this.outArrayPtr = Module._audio_effects_malloc(2)
     Module.HEAP32.set([this.outLeftPtr, this.outRightPtr], this.outArrayPtr >> 2)
  }


  async process(frame) {
    if (!this.initMem) {
      console.warn('process initMem')
      this.handleAudioData(frame)
      return
    }

    let leftData = Int16Array.from(frame[0], (x) => x * 32767),
    rightData = Int16Array.from(frame[1], (x) => x * 32767)
    let result = []

    Module.HEAP16.set(leftData, this.inLeftPtr >> 1)
    Module.HEAP16.set(rightData, this.inRightPtr >> 1)
    if(this.AIDenoise.enable) {
      this.AIDenoise.process(frame)
    }
    if(this.AudioEffect.enable) {
      this.AudioEffect.process(frame)
    }
    result.push(
      Float32Array.from(
        Module.HEAP16.subarray(this.outLeftPtr >> 1, (this.outLeftPtr >> 1) + this.buffer_size),
        (x) => x / 32768
      )
    )
    result.push(
      Float32Array.from(
        Module.HEAP16.subarray(this.outRightPtr >> 1, (this.outRightPtr >> 1) + this.buffer_size),
        (x) => x / 32768
      )
    )
    this.handleAudioData(result)

    if (this.buffer.length) {
      const buffer = this.buffer.shift()
      this.process(buffer)
    }
  }

  destroy() {
    console.warn('destroy')
    this.buffer.length = 0
    if (this.initMem) {
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

      this.initMem = false
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
  let audioEffects = new AudioEffects()

  global.onmessage = function (event) {
    const data = event.data
    const { type, option } = data

    switch (type) {
      case 'init':
        audioEffects.init(option.wasmBinary)
        break
      case 'process':
        if(audioEffects.buffer.length == 0) {
          audioEffects.process(data.frame)
        } else {
          audioEffects.buffer.push(data.frame)
          if(audioEffects.buffer.length > audioEffects.buffer_length) {
            audioEffects.buffer.shift()
          }
        }
        break
      case 'effect':
        console.warn('effect', data.effect)
        const effect = data.effect
        audioEffects.AudioEffect.setEffect(effect.type, effect.value)
        break
      case 'setState':
        console.warn('setState', option)
        if(option.type === 'AIDenoise') {
          audioEffects.AIDenoise.enable = option.enable
        }
        if(option.type === 'AudioEffect') {
          audioEffects.AudioEffect.enable = option.enable
        }
        break
      case 'destroy':
        if (audioEffects) {
          audioEffects.destroy()
          audioEffects = null
        }
        global.postMessage({ type: 'destroyed' })
        break
      default:
        break
    }
  }
}

export default denoiseWorker
