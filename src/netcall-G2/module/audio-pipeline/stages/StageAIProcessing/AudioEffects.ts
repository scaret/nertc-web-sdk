import { EventEmitter } from 'eventemitter3'

import { StageAIProcessing } from './StageAIProcessing'

type EffectType = 'AIDenoise' | 'AudioEffect'

/** AI降噪控制类，对外提供调用接口 */
export default class AudioEffect extends EventEmitter {
  private stageAIProcessing: StageAIProcessing

  constructor(stageAIProcessing: StageAIProcessing) {
    super()
    this.stageAIProcessing = stageAIProcessing
  }

  /** 获取AI推理模块实例 */
  private get audioEffectProcess() {
    const plugin = this.stageAIProcessing.getPlugin('AIAudioEffects')
    return plugin as any
  }

  /**
   * 初始化变声美声推理模块
   *
   */
  init() {
    this.audioEffectProcess.on('effects-load', () => {
      this.emit('effects-load')
    })
    this.audioEffectProcess.init()
  }

  setAudioEffect(type: number, value: number | Array<number>) {
    this.audioEffectProcess.setAudioEffect(type, value)
  }

  /**
   * 销毁AI降噪推理模块
   */
  destroy() {
    this.audioEffectProcess.removeAllListeners()
    this.audioEffectProcess.destroy()
  }

  setState(key: EffectType, enable: boolean) {
    if (key === 'AIDenoise') {
      this.audioEffectProcess.enableAIDenoise = enable
    } else if (key === 'AudioEffect') {
      this.audioEffectProcess.enableAudioEffect = enable
    }
  }

  getState(key: EffectType) {
    if (key === 'AIDenoise') {
      return this.audioEffectProcess.enableAIDenoise
    } else if (key === 'AudioEffect') {
      return this.audioEffectProcess.enableAudioEffect
    }
  }
}
