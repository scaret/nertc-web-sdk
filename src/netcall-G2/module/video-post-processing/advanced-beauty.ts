import { EventEmitter } from 'eventemitter3'

import VideoPostProcess from '.'
import { AdvBeautyFilter, resSet } from './filter/adv-beauty-filter'

/** 高级美颜控制类，对外提供调用接口 */
export default class AdvancedBeauty extends EventEmitter {
  private videPostProcess: VideoPostProcess

  constructor(videPostProcess: VideoPostProcess) {
    super()
    this.videPostProcess = videPostProcess
    this.videPostProcess.filters?.advBeauty.on('advBeautyResComplete', (failUrls) => {
      this.videPostProcess.emit('advBeautyResComplete', failUrls)
    })
  }

  /** 获取高级美颜推理模块实例 */
  private get advancedBeautyProcess() {
    const plugin = this.videPostProcess.getPlugin('AdvancedBeauty') as any
    if (!plugin) {
      this.logger.error('Can not get AdvancedBeauty plugin')
    }
    return plugin
  }

  /**
   * 初始化高级美颜推理模块
   * @param {number} decFaceSize? 最大人脸数
   */
  init(decFaceSize?: number) {
    if (this.videPostProcess.availableCode < 1) return
    this.advancedBeautyProcess.on('facePoints-load', () => {
      this.emit('facePoints-load')
      this.advancedBeautyProcess.setFaceSize(Math.min(5, Math.max(1, decFaceSize || 1)))
    })
    this.advancedBeautyProcess.init()
  }

  /**
   * 销毁高级美颜推理模块
   */
  destroy() {
    if (this.videPostProcess.availableCode < 1) return
    this.advancedBeautyProcess.removeAllListeners()
    this.advancedBeautyProcess.destroy()
  }

  private get logger() {
    return this.videPostProcess.logger
  }

  /**
   * 开启、关闭高级美颜
   * isEnable 为 true 时， track 必须赋值
   */
  setTrack(isEnable: boolean, track?: MediaStreamTrack) {
    if (isEnable) {
      AdvancedBeauty.configStaticRes(resSet, this.videPostProcess.filters?.advBeauty)
    }
    return new Promise((resolve, reject) => {
      this.videPostProcess
        .setTaskAndTrack('AdvancedBeauty', isEnable, track)
        .then((track) => {
          if (!isEnable) {
            this.videPostProcess.filters?.advBeauty.setAdvData([] as any)
          }
          resolve(track)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  /**
   * 设置高级美颜项
   */
  setAdvEffect: AdvBeautyFilter['setAdvEffect'] = (...args) => {
    if (this.videPostProcess.availableCode < 1) return
    this.logger.log(`set advbeauty effect：[${args[0]}, ${args[1]}]`)
    this.videPostProcess.filters?.advBeauty.setAdvEffect(...args)
  }

  /**
   * 预设高级美颜项
   */
  presetAdvEffect: AdvBeautyFilter['presetAdvEffect'] = (...args) => {
    if (this.videPostProcess.availableCode < 1) return
    this.logger.log(`preset advbeauty effect：${JSON.stringify(args[0])}`)
    this.videPostProcess.filters?.advBeauty.presetAdvEffect(...args)
  }

  get isEnable() {
    return this.videPostProcess.hasTask('AdvancedBeauty')
  }

  /** 配置静态资源地址 */
  static configStaticRes: typeof AdvBeautyFilter.configStaticRes = (resConfig, sender) => {
    AdvBeautyFilter.configStaticRes(resConfig, sender)
  }
}
