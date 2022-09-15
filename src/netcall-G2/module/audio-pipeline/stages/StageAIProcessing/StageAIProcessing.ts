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
  constructor(context: AudioContext, logger: ILogger) {
    super(context)
    this.logger = logger
  }
  async init() {
    this.state = 'INITING'
    if (!this.audioWorkletAgent) {
      this.audioWorkletAgent = new AudioWorkletAgent({
        logger: this.logger,
        context: this.context
      })
      this.node = this.audioWorkletAgent.node as unknown as NeAudioNode<AudioWorkletNode>
      this.audioWorkletAgent.init()
      this.audioWorkletAgent.on('rawinputs', (evt) => {
        if (this.enabled) {
          if (this.AIDenoise && this.AIDenoise.load) {
            this.AIDenoise!.process(evt.inputs[0], (data) => {
              // console.log('noise data', evt.inputs[0])
              //  console.log(data[0])
              if (data.length) {
                evt.inputs[0] = data
              }
              this.audioWorkletAgent!.outputData(evt.inputs[0])
            })
          }
        } else {
          this.audioWorkletAgent!.outputData(evt.inputs[0])
        }
      })
    }

    //AI降噪
    this.AIDenoise = new AIDenoise({})
    this.AIDenoise.on('plugin-load', () => {
      console.warn(' this.AIDenoise load ')
      this.AIDenoise?.init()
    })
    this.state = 'INITED'
  }
}
