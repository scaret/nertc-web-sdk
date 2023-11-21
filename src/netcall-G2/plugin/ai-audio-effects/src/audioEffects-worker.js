
const global = self

class AIDenoise {
  rnnoise = null
  inArrayPtr = null
  outArrayPtr = null
  enabled = false

  constructor() {
    //创建实例
    this.rnnoise = Module._rnnoise_create()
  }

  init(inArrayPtr, outArrayPtr) {
    this.inArrayPtr = inArrayPtr
    this.outArrayPtr = outArrayPtr
  }

  process() {
    const hasResult = Module._rnnoise_process_frame(this.rnnoise, this.outArrayPtr, this.inArrayPtr, 2)
    return hasResult
  }

  set enable(value) {
    this.enabled = value
    Module._rnnoise_enable(this.rnnoise, value - 0)
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
    if(!value) {
      Module._UpdateEffect(this.aeInterface, 0, 0)
    }
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


class AudioProcess {
  isProcessing = false
  buffer = []
  buffer_length = 1
  initMem = false
  buffer_size = 128
  inLeftPtr = null
  outLeftPtr = null
  inRightPtr = null
  outRightPtr = null
  tempLeftPtr = null
  tempRightPtr = null
  inArrayPtr = null
  outArrayPtr = null
  tempArrayPtr = null

  aeInterface = null
  EQArrayPtr = null

  AIDenoise = null
  AudioEffect = null


  init(binary) {
    global.Module = {
      wasmBinary: binary,
      onRuntimeInitialized: () => {
        this.AIDenoise = new AIDenoise()
        this.AudioEffect = new AudioEffect()
        this.malloc();
        this.AIDenoise.init(this.inArrayPtr, this.tempArrayPtr)
        this.AudioEffect.init(this.tempArrayPtr, this.outArrayPtr)
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

     this.tempLeftPtr = Module._audio_effects_malloc(this.buffer_size * 2)
     this.tempRightPtr = Module._audio_effects_malloc(this.buffer_size * 2)
     this.tempArrayPtr = Module._audio_effects_malloc(2)
     Module.HEAP32.set([this.tempLeftPtr, this.tempRightPtr], this.tempArrayPtr >> 2)
  }


  process(frame) {
    if (!this.initMem) {
      console.warn('waiting wasm init')
      this.handleAudioData(frame)
      return
    }
    this.isProcessing = true

    let leftData = null, rightData = null;
    let result = []
    if(frame.length == 2) {
      leftData = Int16Array.from(frame[0], (x) => x * 32767)
      rightData = Int16Array.from(frame[1], (x) => x * 32767)
    } else if (frame.length == 1) {
      leftData = Int16Array.from(frame[0], (x) => x * 32767)
      rightData = Int16Array.from(frame[0], (x) => x * 32767)
    } else {
      //console.warn('音频源数据异常，长度-', frame.length)
      this.buffer = []
      this.isProcessing = false
      return;
    }
    Module.HEAP16.set(leftData, this.inLeftPtr >> 1)
    Module.HEAP16.set(rightData, this.inRightPtr >> 1)
    this.AIDenoise.process()
    this.AudioEffect.process()

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
    this.isProcessing = false
    if (this.buffer.length) {
      const buffer = this.buffer.shift()
      this.process(buffer)
    }
  }

  destroy() {
    console.warn('ai audio effetcts worker destroy')
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

const worker = function () {
  let audioProcess = new AudioProcess()

  global.onmessage = function (event) {
    const data = event.data
    const { type, option } = data

    switch (type) {
      case 'init':
        audioProcess.init(option.wasmBinary)
        break
      case 'process':
        if (audioProcess.isProcessing) {
          if (audioProcess.buffer.length >= audioProcess.buffer_length) {
            audioProcess.buffer.shift()
            audioProcess.buffer.push(data.frame)
          } else {
            audioProcess.buffer.push(data.frame)
          }
        } else {
          audioProcess.process(data.frame)
        }
        break
      case 'effect':
        const effect = data.effect
        audioProcess.AudioEffect.setEffect(effect.type, effect.value)
        break
      case 'setState':
        if(option.type === 'AIDenoise') {
          audioProcess.AIDenoise.enable = option.enable
        }
        if(option.type === 'AudioEffect') {
          audioProcess.AudioEffect.enable = option.enable
        }
        break
      case 'destroy':
        if (audioProcess) {
          audioProcess.destroy()
          audioProcess = null
        }
        global.postMessage({ type: 'destroyed' })
        break
      default:
        break
    }
  }
}

export default worker
