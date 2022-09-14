import { StageBase, StageTypes } from './StageBase'
import { NeAudioNode } from '../NeAudioNode'

export class StageInputVolume extends StageBase {
  type: StageTypes = 'stageInputVolume'
  node: NeAudioNode<GainNode> | null = null
  volume = 1

  constructor(audioContext: AudioContext) {
    super(audioContext)
  }
  async init() {
    if (this.state === 'UNINIT') {
      this.node = new NeAudioNode('gain', this.context.createGain())
      this.state = 'INITED'
    }
  }

  isTransparent(): boolean {
    if (Math.abs(this.volume - 1) < 0.01) {
      return true
    } else {
      return false
    }
  }

  setVolume(volume: number) {
    if (this.state === 'UNINIT') {
      this.init()
    }
    if (this.node) {
      if (
        volume <= this.node.audioNode.gain.maxValue &&
        volume >= this.node.audioNode.gain.minValue
      ) {
        this.node.audioNode.gain.value = volume
        this.volume = volume
      }
    }
  }
}
