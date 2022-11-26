import { EventEmitter } from 'eventemitter3'

import { BackGroundOptions } from '../../plugin/segmentation/src/types'
import VideoPostProcess from '.'
import { loadImage } from './gl-utils/texture'

/** 虚拟背景控制类，对外提供调用接口 */
export default class VirtualBackground extends EventEmitter {
  private videPostProcess: VideoPostProcess

  constructor(videPostProcess: VideoPostProcess) {
    super()
    this.videPostProcess = videPostProcess
  }

  /** 默认背景设置 */
  private bgOption: BackGroundOptions = { type: 'color', color: '#e7ad3c' }
  /** 获取虚拟背景推理模块实例 */
  private get segmentProcess() {
    const plugin = this.videPostProcess.getPlugin('VirtualBackground')
    return plugin as any
  }

  /**
   * 初始化虚拟背景推理模块
   * @param {number} decFaceSize? 最大人脸数
   */
  init() {
    this.segmentProcess.on('segment-load', () => {
      this.emit('segment-load')
    })
    this.segmentProcess.init()
  }

  /**
   * 销毁高级美颜推理模块
   */
  destroy() {
    this.segmentProcess.removeAllListeners()
    this.segmentProcess.destroy()
  }

  /** 设置虚拟背景 */
  setVirtualBackGround(option: BackGroundOptions) {
    this.bgOption = option
    const { type } = option
    switch (type) {
      case 'image':
        const { source } = option
        if (typeof source == 'object') {
          this.setBackGround(source)
        } else if (typeof source == 'string') {
          if (source.includes('data:image')) {
            const img = new Image()
            img.onload = () => {
              this.setBackGround(img)
            }
            img.src = source
          } else if (source.includes('http')) {
            loadImage(source, (img) => {
              this.setBackGround(img)
            })
          } else {
            //其他形式的图片源数据都走img加载
            const img = new Image()
            img.onload = () => {
              this.setBackGround(img)
            }
            img.src = source
          }
        }
        break
      case 'color':
        this.setBackGround(option.color as string)
        break
      case 'blur':
        this.setBlurIntensity(<number>option.level / 10)
        break
    }
  }

  /**
   * 开启、关闭背景替换
   * isEnable 为 true 时， track 必须赋值
   */
  setTrack(isEnable: boolean, track?: MediaStreamTrack) {
    return new Promise((resolve, reject) => {
      this.videPostProcess
        .setTaskAndTrack('VirtualBackground', isEnable, track)
        .then((track) => {
          if (!isEnable) {
            this.videPostProcess.filters?.virtualBackground.setMaskMap(null)
          }
          resolve(track)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  /** 设置背景图片、颜色 */
  setBackGround(bk: HTMLImageElement | HTMLVideoElement | string | null) {
    this.videPostProcess.filters?.virtualBackground.setBackground(bk)
  }

  /** 设置背景虚化 */
  setBlurIntensity(intensity: number) {
    this.videPostProcess.filters?.virtualBackground.setBlurIntensity(intensity)
  }

  get isEnable() {
    return this.videPostProcess.hasTask('VirtualBackground')
  }

  /** 用黑帧替换虚拟背景渲染结果 */
  set emptyFrame(isEmptyFrame: boolean) {
    this.videPostProcess.filters!.virtualBackground.emptyFrame = isEmptyFrame
  }
}
