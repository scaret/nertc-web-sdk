import { EventEmitter } from 'eventemitter3'
import { StageAIProcessing } from './StageAIProcessing'

/** AI降噪控制类，对外提供调用接口 */
export default class AIholwing extends EventEmitter {
  private stageAIProcessing: StageAIProcessing

  constructor(stageAIProcessing: StageAIProcessing) {
    super()
    this.stageAIProcessing = stageAIProcessing
  }

  /** 获取AI推理模块实例 */
  private get howlingProcess() {
    const plugin = this.stageAIProcessing.getPlugin('AIhowling')
    return plugin as any
  }

  /**
   * 初始化变声美声推理模块
   *
   */
  init() {
    this.howlingProcess.on('aihowling-load', () => {
      this.emit('aihowling-load')
    })
    this.howlingProcess.init()
  }

  setHowlingCallback(callback: (flag: boolean) => void) {
    this.howlingProcess.setHowlingCallback(callback)
  }

  /**
   * 销毁AI降噪推理模块
   */
  destroy() {
    this.howlingProcess.removeAllListeners()
    this.howlingProcess.destroy()
  }
}
