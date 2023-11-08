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

  enableAudioEffects = false
  enableAIhowling = false
  private pluginModules: {
    AIAudioEffects: {
      load: false
      process: (input: any, callback: (output: any) => void) => void
      destroy: () => void
    } | null
    AIhowling: {
      load: false
      process: (input: any) => void
      destroy: () => void
    } | null
  } = { AIAudioEffects: null, AIhowling: null }

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

  hasWorkingPlugin() {
    this.logger.log('hasWorkingPlugin', this.enableAudioEffects || this.enableAIhowling)
    return this.enableAudioEffects || this.enableAIhowling
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
        if (this.enabled) {
          const howlingPlugin = this.pluginModules.AIhowling
          if (howlingPlugin?.load && this.enableAIhowling) {
            howlingPlugin.process(outputData)
          }
          const audioEffectsPlugin = this.pluginModules.AIAudioEffects
          if (audioEffectsPlugin?.load && this.enableAudioEffects) {
            audioEffectsPlugin.process(outputData, (data) => {
              if (data.length) {
                outputData = data
              }
              this.audioWorkletAgent!.outputData(outputData)
            })
          } else if (outputData.length) {
            this.audioWorkletAgent!.outputData(outputData)
          }
        }
      })
    }
    this.state = 'INITED'
  }

  unregisterPlugin(key: AudioPluginType) {
    this.pluginModules[key] = null
    if (!this.hasWorkingPlugin()) {
      this.state = 'UNINIT'
    }
  }
}
