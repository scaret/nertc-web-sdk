import { EventEmitter } from 'eventemitter3'

import { StageAIProcessing } from './StageAIProcessing'

/** AI降噪控制类，对外提供调用接口 */
export default class AudioEffect extends EventEmitter {
  private stageAIProcessing: StageAIProcessing

  constructor(stageAIProcessing: StageAIProcessing) {
    super()
    this.stageAIProcessing = stageAIProcessing
  }

  /** 获取AI推理模块实例 */
  private get audioEffectProcess() {
    const plugin = this.stageAIProcessing.getPlugin('AudioEffect')
    return plugin as any
  }

  /**
   * 初始化变声美声推理模块
   *
   */
  init() {
    this.audioEffectProcess.on('effect-load', () => {
      this.emit('effect-load')
    })
    this.audioEffectProcess.init()
  }

  setAudioEffect(type: number, value: number) {
    this.audioEffectProcess.setAudioEffect(type, value)
  }

  /**
   * 销毁AI降噪推理模块
   */
  destroy() {
    this.audioEffectProcess.removeAllListeners()
    this.audioEffectProcess.destroy()
  }

  get isEnable() {
    return this.stageAIProcessing.enableAudioEffect
  }

  set isEnable(enable: boolean) {
    if (this.stageAIProcessing) {
      this.stageAIProcessing.enableAudioEffect = enable
    }
  }
}
