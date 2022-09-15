import { StageBase, StageTypes } from './StageBase'
import { NeAudioNode } from '../NeAudioNode'
import { getBlobUrl } from '../../blobs/getBlobUrl'

function getAIBlobUrl() {
  return getBlobUrl('audioAIProcessor')
}

let AudioWorkletState: 'NOTREADY' | 'LOADING' | 'READY' = 'NOTREADY'
let AudioWorkletReady: Promise<void> | null = null

export class StageAIProcessing extends StageBase {
  type: StageTypes = 'stageAIProcessing'
  node: NeAudioNode<AudioWorkletNode> | null = null
  async init() {
    if (this.state === 'UNINIT') {
      this.state = 'INITING'
      if (!AudioWorkletReady) {
        AudioWorkletState = 'LOADING'
        console.log(`正在载入音量模块`)
        AudioWorkletReady = this.context.audioWorklet.addModule(getBlobUrl('audioAIProcessor'))
        await AudioWorkletReady
        AudioWorkletState = 'READY'
        console.log(`载入音量模块成功`)
      } else if (AudioWorkletState === 'LOADING') {
        await AudioWorkletReady
      }
      const audioWorkletNode = new AudioWorkletNode(this.context, 'audioAIProcessor')
      this.node = new NeAudioNode('audioAIProcessor', audioWorkletNode)
      this.state = 'INITED'
    }
  }
}
