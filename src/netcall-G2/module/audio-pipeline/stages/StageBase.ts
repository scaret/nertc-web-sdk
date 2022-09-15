import { NeAudioNode } from '../NeAudioNode'

export type StageTypes =
  | 'stageChannelSelector'
  | 'stageInputVolume'
  | 'stageAIProcessing'
  | 'stageDelay'

export abstract class StageBase {
  abstract type: StageTypes
  /**
   * enabled变量是AudioPipeline用于记录该Stage是否已经连入的标志位。Stage本身不要操作这个值。
   */
  enabled: boolean = false // eslint-disable-line  @typescript-eslint/no-inferrable-types
  node: NeAudioNode<any> | null = null
  protected context: AudioContext
  state: 'UNINIT' | 'INITING' | 'INITED' = 'UNINIT'
  abstract init(): Promise<void>
  constructor(context: AudioContext) {
    this.context = context
  }
  // isTransparent代表了有无此Stage没有本质区别。
  // 例如Delay为0、音量为1
  isTransparent() {
    return false
  }
}
