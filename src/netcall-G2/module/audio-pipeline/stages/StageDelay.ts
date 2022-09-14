import { StageBase, StageTypes } from './StageBase'
import { NeAudioNode } from '../NeAudioNode'

export class StageDelay extends StageBase {
  type: StageTypes = 'stageDelay'
  node: NeAudioNode<DelayNode> | null = null
  delayTime = 1

  constructor(audioContext: AudioContext) {
    super(audioContext)
  }
  async init() {
    if (this.state === 'UNINIT') {
      this.node = new NeAudioNode('delay', this.context.createDelay(10))
      this.state = 'INITED'
      this.node.audioNode.delayTime.value = this.delayTime
    }
  }

  isTransparent(): boolean {
    if (this.delayTime < 0.01) {
      return true
    } else {
      return false
    }
  }

  setDelay(delayTime: number) {
    if (this.state === 'UNINIT') {
      this.init()
    }
    if (this.node) {
      this.delayTime = delayTime
      this.node.audioNode.delayTime.value = delayTime
    }
  }
}
