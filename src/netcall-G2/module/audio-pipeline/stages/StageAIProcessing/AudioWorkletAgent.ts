import { EventEmitter } from 'eventemitter3'
import { ILogger } from '../../../../types'
import { getAudioContext } from './../../../webAudio'
import { getBlobUrl } from '../../../blobs/getBlobUrl'
import { NeAudioNode, NeAudioNodeNullable } from '../../NeAudioNode'

let AudioWorkletState: 'NOTREADY' | 'LOADING' | 'READY' = 'NOTREADY'
let AudioWorkletReady: Promise<void> | null = null

export interface AudioWorkletAgentOptions {
  logger: ILogger
  context: AudioContext
}

export class AudioWorkletAgent extends EventEmitter {
  logger: ILogger
  outputCnt = 0
  inputCnt = 0
  node = new NeAudioNodeNullable<AudioWorkletNode>('AudioWorkletAgent', null)
  support: {
    context: AudioContext
    audioWorkletNode?: AudioWorkletNode
  }
  constructor(options: AudioWorkletAgentOptions) {
    super()
    this.logger = options.logger.getChild(() => {
      let tag = `AudioWorkletAgent`
      if (AudioWorkletState !== 'READY') {
        tag += ' ' + AudioWorkletState
      }
      // const delay = (this.inputCnt - this.outputCnt) * 10
      // tag += ' Delay' + delay + 'ms'
      return tag
    })
    const context = options.context

    this.support = {
      context: context
    }

    // setInterval(() => {
    //   this.logger.log(`outputCnt`, this.outputCnt, `inputCnt`, this.inputCnt)
    // }, 10000)
  }

  async init() {
    if (this.support.audioWorkletNode) {
      this.logger.error(`Already Inited`)
      return
    }
    if (!this.support.context.audioWorklet) {
      this.logger.error(`该环境不支持音频处理`)
      return
    }
    if (!AudioWorkletReady) {
      AudioWorkletState = 'LOADING'
      this.logger.log(`正在载入 audioWorkletAgentProcessor 模块`)
      AudioWorkletReady = this.support.context.audioWorklet.addModule(
        getBlobUrl('audioWorkletAgentProcessor')
      )
      await AudioWorkletReady
      AudioWorkletState = 'READY'
      this.logger.log(`载入 audioWorkletAgentProcessor 模块成功`)
    } else if (AudioWorkletState === 'LOADING') {
      await AudioWorkletReady
    }
    this.support.audioWorkletNode = new AudioWorkletNode(
      this.support.context,
      'audioWorkletAgentProcessor'
    )
    this.node.updateNode(this.support.audioWorkletNode)
    this.bindProcessorEvents()
  }

  outputData(data: Float32Array[][]) {
    if (!this.support.audioWorkletNode) {
      throw new Error(`Destroyed`)
    }
    this.inputCnt++
    this.support.audioWorkletNode.port.postMessage({
      type: 'outputData',
      data: data
    })
  }

  bindProcessorEvents() {
    this.removeAllListeners('rawinputs')
    this.support.audioWorkletNode!.port.onmessage = (event) => {
      this.emit('processor-message', event)
      if (event.data.type === 'rawinputs') {
        this.handleTypeRawInputs(event)
      } else {
        console.error('Unknown message', event)
      }
    }
  }
  handleTypeRawInputs(event: MessageEvent) {
    this.outputCnt++
    this.emit('rawinputs', event.data)
  }
}
