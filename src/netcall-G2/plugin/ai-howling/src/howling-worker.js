const global = self

class Howling {
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

  howling = null

  init(binary) {
    global.Module = {
      noInitialRun: true,
      wasmBinary: binary,
      onRuntimeInitialized: () => {
        this.howling = Module._CreateAiHowling()
        Module._SetNum(this.howling, 16);
        Module._SetThreshold(this.howling, 0.5);
        Module._SetPostThreshold(this.howling, 1);
        Module._Enable(this.howling, true);
        const callbackPtr =  Module.addFunction(this.handleHasHowling, 'vi')
        Module._RegisterAiHowlingCallback(this.howling, callbackPtr)
        this.handleInitFinished()
      },
      onAbort: (msg) => {
        global.postMessage({ type: 'error', message: '' + msg })
      }
    }
    require('../lib/audio_aihowling.js')
  }

  process(frame) {
    this.isProcessing = true
    if (!this.initMem) {
      this.inLeftPtr = Module._aihowling_Malloc(this.buffer_size * 2)
      this.inRightPtr = Module._aihowling_Malloc(this.buffer_size * 2)
      this.inArrayPtr = Module._aihowling_Malloc(2)
      Module.HEAP32.set([this.inLeftPtr, this.inRightPtr], this.inArrayPtr >> 2)
      this.initMem = true
    }

    let leftData, rightData
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
    Module._Processing_Frame(this.howling, this.inArrayPtr, 2)
    this.isProcessing = false
    if (this.buffer.length) {
      const buffer = this.buffer.shift()
      this.process(buffer)
    }
  }

  destroy() {
    this.buffer.length = 0
    if (this.inLeftPtr != null) {
      Module._aihowling_Free(this.inLeftPtr)
      this.inLeftPtr = null
      Module._aihowling_Free(this.inRightPtr)
      this.outRightPtr = null
      Module._aihowling_Free(this.inArrayPtr)
      this.inArrayPtr = null
    }
    this.howling = null
    this.initMem = false
  }

  handleInitFinished() {
    global.postMessage({
      type: 'created'
    })
  }

  handleHasHowling = (result) => {
    global.postMessage({
      type: 'howlingState',
      result
    })
  }
}

const howlingWorker = function () {
  let howlingProcess = new Howling()

  global.onmessage = function (event) {
    const data = event.data
    const { type, option } = data

    switch (type) {
      case 'init':
        howlingProcess.init(option.wasmBinary)
        break
      case 'process':
        if (howlingProcess.isProcessing) {
          if (howlingProcess.buffer.length >= howlingProcess.buffer_length) {
            howlingProcess.buffer.shift()
            howlingProcess.buffer.push(data.frame)
          } else {
            howlingProcess.buffer.push(data.frame)
          }
        } else {
          howlingProcess.process(data.frame)
        }
        break
      case 'destroy':
        if (howlingProcess) {
            howlingProcess.destroy()
            howlingProcess = null
        }
        global.postMessage({ type: 'destroyed' })
        break
      default:
        break
    }
  }
}

export default howlingWorker