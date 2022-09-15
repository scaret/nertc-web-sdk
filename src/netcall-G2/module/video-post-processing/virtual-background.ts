import { EventEmitter } from 'eventemitter3'

import { BackGroundOptions } from '../../plugin/segmentation/src/types'
import VideoPostProcess from '.'
import { loadImage } from './gl-utils/texture'

export default class VirtualBackground extends EventEmitter {
  private videPostProcess: VideoPostProcess

  constructor(videPostProcess: VideoPostProcess) {
    super()
    this.videPostProcess = videPostProcess
  }

  private bgOption: BackGroundOptions = { type: 'color', color: '#e7ad3c' }
  private get segmentProcess() {
    const plugin = this.videPostProcess.getPlugin('VirtualBackground')
    return plugin as any
  }

  init() {
    this.segmentProcess.on('segment-load', () => {
      this.emit('segment-load')
    })
    this.segmentProcess.init()
  }

  destroy() {
    this.segmentProcess.removeAllListeners()
    this.segmentProcess.destroy()
  }

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

  //-------------------------------------------------以下是测试代码,同时也是对外暴漏的接口-------------------------------------------------
  setBackGround(bk: HTMLImageElement | HTMLVideoElement | string | null) {
    this.videPostProcess.filters?.virtualBackground.setBackground(bk)
  }

  setBlurIntensity(intensity: number) {
    this.videPostProcess.filters?.virtualBackground.setBlurIntensity(intensity)
  }

  get isEnable() {
    return this.videPostProcess.hasTask('VirtualBackground')
  }

  set emptyFrame(isEmptyFrame: boolean) {
    this.videPostProcess.filters!.virtualBackground.emptyFrame = isEmptyFrame
  }
}
