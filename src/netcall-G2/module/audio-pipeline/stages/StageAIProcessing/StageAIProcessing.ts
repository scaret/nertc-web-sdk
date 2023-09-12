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
    AIDenoise: {
      load: false
      process: (input: any, callback: (output: any) => void) => void
      destroy: () => void
    } | null
    AudioEffect: {
      load: false
      process: (input: any, callback: (output: any) => void) => void
      destroy: () => void
    } | null
  } = { AIDenoise: null, AudioEffect: null }

  constructor(context: AudioContext, logger: ILogger) {
    super(context)
    this.logger = logger
    this.enabled = false

    this.init()
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
        if (this.enabled && outputData.length) {
          //AI降噪
          if (this.enableAIDenoise) {
            const plugin = this.pluginModules.AIDenoise

            if (plugin) {
              plugin.process(outputData, (data) => {
                if (data.length) {
                  outputData = data
                }
                this.audioWorkletAgent!.outputData(outputData)
              })
            }
          }
          //变声
          if (this.enableAudioEffect) {
            const plugin = this.pluginModules.AudioEffect
            if (plugin) {
              plugin.process(outputData, (data) => {
                if (data.length) {
                  outputData = data
                } else {
                  console.warn('AudioEffect process error')
                }
                this.audioWorkletAgent!.outputData(outputData)
              })
            }
          }
        }
      })
    }

    this.state = 'INITED'
  }

  unregisterPlugin(key: AudioPluginType) {
    this.pluginModules[key] = null
    //需要修改
    this.state = 'UNINIT'
  }
}
