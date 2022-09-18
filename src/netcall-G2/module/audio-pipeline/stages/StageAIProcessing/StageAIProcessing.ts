import { StageBase, StageTypes } from '../StageBase'
import { NeAudioNode } from '../../NeAudioNode'
import { ILogger } from '../../../../types'
import { AudioWorkletAgent } from './AudioWorkletAgent'
import AIDenoise from '../../../../plugin/denoise'

export class StageAIProcessing extends StageBase {
  type: StageTypes = 'stageAIProcessing'
  node: NeAudioNode<AudioWorkletNode> | null = null
  logger: ILogger
  audioWorkletAgent: AudioWorkletAgent | null = null
  private AIDenoise: AIDenoise | null = null
  enableAIDenoise = true
  private pluginList: string[] = []

  constructor(context: AudioContext, logger: ILogger) {
    super(context)
    this.logger = logger
    this.enabled = false
  }

  hasPlugin(key: string) {
    return this.pluginList.indexOf(key) !== -1
  }

  registerPlugin(key: string, pluginObj: any, wasmUrl: string) {
    if (key === 'AIDenoise') {
      this.registerAIDenoisePlugin(pluginObj, wasmUrl)
      this.pluginList.push('AIDenoise')
    }
  }

  registerAIDenoisePlugin(plugin: AIDenoise, wasmUrl: string) {
    //AI降噪
    this.AIDenoise = plugin
  }

  async init() {
    this.state = 'INITING'
    if (!this.audioWorkletAgent) {
      this.audioWorkletAgent = new AudioWorkletAgent({
        logger: this.logger,
        context: this.context
      })
      this.node = this.audioWorkletAgent.node as unknown as NeAudioNode<AudioWorkletNode>
      await this.audioWorkletAgent.init()
      this.audioWorkletAgent.on('rawinputs', (evt) => {
        if (this.enabled) {
          if (this.AIDenoise && this.AIDenoise.load) {
            this.AIDenoise!.process(evt.inputs[0], (data) => {
              if (data.length) {
                evt.inputs[0] = data
              }
              this.audioWorkletAgent!.outputData(evt.inputs[0])
            })
          }
        } else if (evt.inputs[0] && evt.inputs[0].length) {
          this.audioWorkletAgent!.outputData(evt.inputs[0])
        }
      })
    }

    this.AIDenoise?.init()
    this.state = 'INITED'
  }

  unregisterAIDenoise() {
    this.AIDenoise = null
    this.state = 'UNINIT'
  }
}
