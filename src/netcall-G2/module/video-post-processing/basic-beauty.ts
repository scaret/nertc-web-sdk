import { BeautyEffectOptions } from '../../types'
import VideoPostProcess from '.'

type BasicResType = {
  beauty?: {
    whiten: string
    redden: string
  }
  filters?: {
    [key: string]: {
      src: string
      intensity?: number
    }
  }
}

const resSet: BasicResType = {
  beauty: {
    whiten: 'https://yx-web-nosdn.netease.im/common/cab8e4f0696d3d8e29ee10d6dccc1204/meibai.png',
    redden: 'https://yx-web-nosdn.netease.im/common/c614e2af82da88807067926d7ff3be3d/hongrun.png'
  },
  filters: {
    ziran: {
      //自然
      src: 'https://yx-web-nosdn.netease.im/common/c89328281947fceabdc71d5fa08b2345/ziran.png',
      intensity: 1
    },
    baixi: {
      //白皙
      src: 'https://yx-web-nosdn.netease.im/common/3a22a55384b0bd5b07fca3509bfc981a/baixi.png',
      intensity: 0.5
    },
    fennen: {
      //粉嫩
      src: 'https://yx-web-nosdn.netease.im/common/db5befdae1f46dad2e5a6d702bad19ea/fennen.png',
      intensity: 0.5
    },
    weimei: {
      //唯美
      src: 'https://yx-web-nosdn.netease.im/common/cf8bfec70d7998bb0033757276c6559a/weimei.png',
      intensity: 0.5
    },
    langman: {
      //浪漫
      src: 'https://yx-web-nosdn.netease.im/common/1c50a14532bfa3ad503a82ddd13f0ec8/langman.png',
      intensity: 0.5
    },
    rixi: {
      //日系
      src: 'https://yx-web-nosdn.netease.im/common/c414819383913b5db0d9b686276e3d57/rixi.png',
      intensity: 0.5
    },
    landiao: {
      //蓝调
      src: 'https://yx-web-nosdn.netease.im/common/4c77522852dc14448603be21abc571c8/landiao.png',
      intensity: 0.5
    },
    qingliang: {
      //清凉
      src: 'https://yx-web-nosdn.netease.im/common/1150e94f831d24148239001588a7ca7d/qingliang.png',
      intensity: 0.5
    },
    huaijiu: {
      //怀旧
      src: 'https://yx-web-nosdn.netease.im/common/6a38caeab164d1b5cc086391d6a11a74/huaijiu.png',
      intensity: 0.5
    },
    qingcheng: {
      //青橙
      src: 'https://yx-web-nosdn.netease.im/common/3b3332c5ae4306312b6f3c4c552a464a/qingcheng.png',
      intensity: 1
    },
    wuhou: {
      //午后
      src: 'https://yx-web-nosdn.netease.im/common/200fc7a12177774f4eb23f55d72643ee/wuhou.png',
      intensity: 1
    },
    zhigan: {
      //质感
      src: 'https://yx-web-nosdn.netease.im/common/848bd44506cf8e10ecabf564e3d74809/zhigan.png',
      intensity: 1
    },
    mopian: {
      //默片
      src: 'https://yx-web-nosdn.netease.im/common/c454efa119520f0793ce51327951ed0a/mopian.png',
      intensity: 1
    },
    dianying: {
      //电影
      src: 'https://yx-web-nosdn.netease.im/common/3a6a22adad29c5844fc829f4f889a79f/dianying.png',
      intensity: 1
    },
    heibai: {
      //黑白
      src: 'https://yx-web-nosdn.netease.im/common/941270f2948218ea19f2d79db5e7d349/heibai.png',
      intensity: 1
    }
  }
}

const instances: Set<BasicBeauty> = new Set<BasicBeauty>()

export default class BasicBeauty {
  private videPostProcess: VideoPostProcess

  constructor(videPostProcess: VideoPostProcess) {
    this.videPostProcess = videPostProcess
    // 上下文丢失时，将对应参数进行初始化
    this.videPostProcess.on('contextLost', () => {
      this.lutLoaded = false
    })
    instances.add(this)
  }

  // 配置美颜lut
  private lutLoaded = false
  private startLut() {
    if (this.lutLoaded) {
      return
    }
    const filters = this.videPostProcess.filters
    if (!filters) return
    let queueLen = 2
    const failUrls: string[] = []
    const checkComplete = () => {
      queueLen -= 1
      if (queueLen <= 0) {
        this.videPostProcess.emit('beautyResComplete', failUrls)
      }
    }

    // 加载基础美颜资源
    filters.beauty.setLutsSrc(resSet.beauty!, (_failUrls) => {
      failUrls.push(..._failUrls)
      checkComplete()
    })

    // 配置滤镜 luts
    filters.lut.setLutsSrc(resSet.filters!, (_failUrls) => {
      failUrls.push(..._failUrls)
      checkComplete()
    })
    this.lutLoaded = true
  }

  /**
   * 设置滤镜
   * @param {string|null} filterName
   * @param {number} intensity
   * @returns {any}
   */
  setFilter(filterName: string | null, intensity?: number) {
    this.videPostProcess.filters?.lut.setlut(filterName, intensity)
  }

  /**
   * 开启、关闭美颜
   * isEnable 为 true 时， track 必须赋值
   */
  setBeauty(isEnable: boolean, track?: MediaStreamTrack) {
    if (isEnable) {
      this.startLut()
    }
    return new Promise((resolve, reject) => {
      this.videPostProcess
        .setTaskAndTrack('BasicBeauty', isEnable, track)
        .then((track) => {
          if (!isEnable) {
            const filters = this.videPostProcess.filters
            if (!filters) return
            filters.beauty.whiten = 0
            filters.beauty.redden = 0
            filters.beauty.smooth = 0
            filters.lut.setlut(null)
          }
          resolve(track)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }
  /**
   * 设置美颜参数
   */
  setBeautyOptions(effects: BeautyEffectOptions) {
    const filters = this.videPostProcess.filters
    if (filters) {
      if ('smoothnessLevel' in effects) {
        filters.beauty.smooth = effects.smoothnessLevel
      }
      if ('brightnessLevel' in effects) {
        filters.beauty.whiten = effects.brightnessLevel
      }
      if ('rednessLevel' in effects) {
        filters.beauty.redden = effects.rednessLevel
      }
    }
  }

  get isEnable() {
    return this.videPostProcess.hasTask('BasicBeauty')
  }

  // 配置静态资源地址
  static configStaticRes(resConfig: BasicResType) {
    let isUpdate = false
    if (resConfig.beauty) {
      resSet.beauty = { ...resConfig.beauty }
      isUpdate = true
    }
    if (resConfig.filters) {
      resSet.filters = { ...resConfig.filters }
      isUpdate = true
    }
    if (isUpdate) {
      instances.forEach((instance) => {
        try {
          instance.lutLoaded = false
          instance.startLut()
        } catch (error) {}
      })
    }
  }
}
