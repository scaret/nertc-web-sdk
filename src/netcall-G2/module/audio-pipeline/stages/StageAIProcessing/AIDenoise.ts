import { EventEmitter } from 'eventemitter3'

import { StageAIProcessing } from './StageAIProcessing'

/** AI降噪控制类，对外提供调用接口 */
export default class AIDenoise extends EventEmitter {
  private stageAIProcessing: StageAIProcessing

  constructor(stageAIProcessing: StageAIProcessing) {
    super()
    this.stageAIProcessing = stageAIProcessing
  }

  /** 获取AI降噪推理模块实例 */
  private get denoiseProcess() {
    const plugin = this.stageAIProcessing.getPlugin('AIDenoise')
    return plugin as any
  }

  /**
   * 初始化AI降噪推理模块
   * @param {number} decFaceSize? 最大人脸数
   */
  init() {
    this.denoiseProcess.on('denoise-load', () => {
      this.emit('denoise-load')
    })
    this.denoiseProcess.init()
  }

  /**
   * 销毁AI降噪推理模块
   */
  destroy() {
    this.denoiseProcess.removeAllListeners()
    this.denoiseProcess.destroy()
  }

  get isEnable() {
    return this.stageAIProcessing.enableAIDenoise
  }

  set isEnable(enable: boolean) {
    if (this.stageAIProcessing) {
      this.stageAIProcessing.enableAIDenoise = enable
    }
  }
}
