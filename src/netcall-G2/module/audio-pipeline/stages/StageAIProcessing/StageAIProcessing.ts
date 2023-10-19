import { StageBase, StageTypes } from '../StageBase'
import { NeAudioNode } from '../../NeAudioNode'
import { ILogger } from '../../../../types'
import { AudioWorkletAgent } from './AudioWorkletAgent'
import { AudioPluginType } from '../../../../plugin/plugin-list'

export class StageAIProcessing extends StageBase {
  type: StageTypes = 'stageAIProcessing'
  node: NeAudioNode<AudioWorkletNode> | null = null
  logger: ILogger
  audioWorkletAgent: AudioWorkletAgent | null = null
  enableAIDenoise = false
  enableAudioEffect = false
  private pluginModules: {
    AIAudioEffects: {
      load: false
      process: (input: any, callback: (output: any) => void) => void
      destroy: () => void
    } | null
  } = { AIAudioEffects: null }

  constructor(context: AudioContext, logger: ILogger) {
    super(context)
    this.logger = logger
    this.enabled = false
  }

  registerPlugin(key: AudioPluginType, pluginObj: any) {
    this.pluginModules[key] = pluginObj
  }

  getPlugin(key: AudioPluginType) {
    return this.pluginModules[key]
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
        let outputData = evt.inputs[0]
        const plugin = this.pluginModules.AIAudioEffects
        if (this.enabled && outputData.length && plugin) {
          plugin.process(outputData, (data) => {
            if (data.length) {
              outputData = data
            }
            // console.warn('outputData', outputData[0], outputData[1])
            this.audioWorkletAgent!.outputData(outputData)
          })
        }
      })
    }

    this.state = 'INITED'
  }

  unregisterPlugin(key: AudioPluginType) {
    this.pluginModules[key] = null
    //需要修改
    if (!this.enableAIDenoise && !this.enableAudioEffect) {
      this.state = 'UNINIT'
    }
  }
}
