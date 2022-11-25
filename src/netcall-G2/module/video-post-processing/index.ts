import { EventEmitter } from 'eventemitter3'

import { VideoPluginType } from '../../plugin/plugin-list'
import { ILogger } from '../../types'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import workerTimer from '../../util/rtcUtil/webWorkerTimer'
import { Filters } from './filter'

type TaskType = 'BasicBeauty' | 'VirtualBackground' | 'AdvancedBeauty'

/**
 * 视频后期处理核心类，负责：
 * 1、背景替换、高级美颜 wasm 插件的管理；
 * 2、异步渲染任务队列的维护与管理
 */
export default class VideoPostProcess extends EventEmitter {
  // 插件模块
  private pluginModules: {
    VirtualBackground: {
      process: (
        imgData: Uint8Array,
        width: number,
        height: number,
        callback: (result: ImageData) => void,
        forceGC?: boolean
      ) => void
      destroy: () => void
    } | null
    AdvancedBeauty: {
      process: (
        imgData: Uint8Array,
        width: number,
        height: number,
        callback: (result: number[]) => void,
        forceGC?: boolean
      ) => void
      destroy: () => void
    } | null
  } = {
    VirtualBackground: null,
    AdvancedBeauty: null
  }

  // 注入插件
  registerPlugin(key: VideoPluginType, plugin: any) {
    this.pluginModules[key] = plugin
  }
  // 获取插件
  getPlugin(key: VideoPluginType) {
    return this.pluginModules[key]
  }
  // 移除插件
  unregisterPlugin(key: VideoPluginType) {
    this.pluginModules[key] = null
  }

  // 是否被销毁
  private isAlive = true
  // 初始化视频滤镜管线
  filters: Filters | null = null
  // 视频源
  video: HTMLVideoElement | null = null
  // 帧率
  private frameRate = 15
  // 定时器 id
  private timerId = -1

  // 异步并行任务队列
  private taskSet = new Set<TaskType>()
  private taskSnapshot = new Set<TaskType>()
  private readyTaskSet = new Set<TaskType>(['BasicBeauty'])
  private sourceMap: Uint8Array | null = null
  private maskData: ImageData | null = null
  private advBeautyData: number[] | Int16Array = []

  // 后处理 track
  sourceTrack: MediaStreamTrack | null = null
  private trackInstance: MediaStreamTrack | null = null
  logger: ILogger
  private videoSizeTag = ''

  constructor(logger: ILogger) {
    super()
    this.logger = logger
    try {
      this.filters = new Filters()
      const canvas = this.filters.canvas
      canvas.addEventListener(
        'webglcontextlost',
        (e) => {
          e.preventDefault()
          this.emit('contextLost')
        },
        false
      )
      canvas.addEventListener(
        'webglcontextrestored',
        (e) => {
          e.preventDefault()
          let success = true
          this.filters = this.filters?.clone() || null
          if (!this.filters) {
            success = false
          }
          this.emit('contextRestored', success)
        },
        false
      )
    } catch (error) {}
  }

  /**
   * 0: webgl 不支持
   * 1: 上下文丢失
   * 2: 可用
   */
  get availableCode() {
    if (!this.isAlive) return -1
    if (!this.filters) return 0
    if (!this.filters.gl) return 0
    return this.filters.gl.isContextLost() ? 1 : 2
  }

  /**
   * 根据状态码，输出错误提示信息
   */
  get glErrorTip() {
    switch (this.availableCode) {
      case -1:
        return 'localStream is already destroyed.'
      case 0:
        return 'the current environment does not support webgl.'
      case 1:
        return 'webgl context has been lost.'
    }
    return ''
  }

  private get taskReady() {
    for (const task of this.taskSnapshot) {
      if (!this.readyTaskSet.has(task)) {
        return false
      }
    }
    return true
  }

  private addTask(task: TaskType) {
    if (!this.taskSet.has(task)) {
      this.taskSet.add(task)
      this.logger.log(`task ${task} is added.`)
      // 新任务入列，马上渲染一次
      this.update()
      if (this.taskSet.size === 1) {
        this.updateTimer()
        this.emit('taskSwitch', true)
      }
    }
  }

  private removeTask(task: TaskType) {
    this.taskSet.delete(task)
    this.logger.log(`task ${task} is removed.`)
    if (this.taskSet.size === 0) {
      workerTimer.clearTimeout(this.timerId)
      this.timerId = -1
      this.sourceMap = null
      this.trackInstance?.stop()
      this.trackInstance = null
      this.emit('taskSwitch', false)
    }
    // 新任务移除，马上渲染一次
    this.update()
    this.taskSnapshot.delete(task)
  }

  hasTask(task: TaskType) {
    return this.taskSet.has(task)
  }

  get hasAnyTask() {
    return this.taskSet.size > 0
  }

  // 用以抛出事件，修复在 safari 下动态更改分辨率画面拉伸的问题
  private videoSizeChange(width: number, height: number) {
    if (!env.IS_ANY_SAFARI) return
    if (this.filters) {
      const st = `${width}-${height}`
      if (this.videoSizeTag !== st) {
        this.videoSizeTag = st
        this.emit('safariVideoSizeChange')
      }
    }
  }

  /**
   * 创建 videoPostProcess track
   * @param {MediaStreamTrack} track
   * @returns {Promise<number>} resolve 参数返回 canvas 预渲染时间间隔，减缓帧抖动
   */
  private createTrack(track: MediaStreamTrack) {
    return new Promise((resolve, reject) => {
      if (this.trackInstance && this.trackInstance === track) {
        this.logger.log('VideoPostProcess track transform unnecessary')
        return resolve(0)
      }
      this.logger.log('VideoPostProcess track transform')

      const settings = track.getSettings()
      this.frameRate = settings.frameRate || 15
      if (this.frameRate > 30) {
        this.logger.warn(
          'In chrome, webgl drawing video which framerate greater than 30fps may cause memory leak.'
        )
        this.frameRate = 30
      }

      // 从 canvas 获取 track
      this.sourceTrack = track

      // 抓新流时需要释放之前的流，否则会导致抓流泄露
      if (this.trackInstance) {
        this.trackInstance.stop()
        this.trackInstance = null
      }
      if (settings.width && settings.height) {
        this.filters?.setSize(settings.width, settings.height)
        if (!this.videoSizeTag) {
          this.videoSizeTag = `${settings.width}-${settings.height}`
        }
      }
      const stream = (<any>this.filters?.canvas).captureStream(this.frameRate)
      this.trackInstance = stream.getVideoTracks()[0]

      // 初始化 video，以供管线获取 imageData
      this.video = this.video || document.createElement('video')
      const newStream = new MediaStream([this.sourceTrack])
      this.video.srcObject = newStream

      const resizeHandler = (video: HTMLVideoElement) => {
        const { videoWidth: width, videoHeight: height } = video!
        this.filters?.setSize(width, height)
        this.videoSizeChange(width, height)
      }

      this.video.onloadedmetadata = () => {
        this.video!.play()
          .then(() => {
            this.filters!.mapSource = this.video
            resizeHandler(this.video!)
            resolve(0)
          })
          .catch((err) => {
            reject(err)
          })
      }
      this.video.onresize = () => {
        resizeHandler(this.video!)
      }
    })
  }
  private get track() {
    // 任务队列不为空
    if (this.taskSet.size) {
      this.logger.log('return video post procss track.')
      return this.trackInstance
    }
    // 任务队列为空
    this.logger.log('return origin track.')
    return this.sourceTrack
  }

  private frameCount = [0, 0]

  /** 任务队列循环渲染 */
  update = (updateFrameCount = true) => {
    if (this.availableCode < 2) return
    if (env.IS_ANY_SAFARI && document.visibilityState === 'hidden') {
      return
    }
    const filters = this.filters!
    if (!this.taskSet.size) {
      if (filters) {
        return filters.update(false)
      } else {
        // 任务队列为空, 且 filters 已被销毁，但 timer 没停止，兼容此类错误
        return workerTimer.clearTimeout(this.timerId)
      }
    }

    if (updateFrameCount) {
      this.frameCount[0] += 1
    }

    if (this.taskReady) {
      let needImgData = false
      let needCopy = false
      // 设置虚拟背景参数
      if (this.taskSet.has('VirtualBackground')) {
        filters.virtualBackground.setMaskMap(this.maskData)
        this.maskData = null
        needImgData = true
        needCopy = true
      }
      // 设置高级美颜参数
      if (this.taskSet.has('AdvancedBeauty')) {
        filters.advBeauty.setAdvData(this.advBeautyData as Int16Array)
        this.advBeautyData = []
        needImgData = true
      } else {
        needCopy = false
      }

      // 新的任务处理
      this.taskSnapshot = new Set(this.taskSet)
      this.readyTaskSet.clear()
      this.readyTaskSet.add('BasicBeauty')

      this.frameCount[1] = this.frameCount[0]
      if (needImgData) {
        filters.update(false)
        // 获取下一帧原图的 imageData
        this.sourceMap = filters.normal.getImageData(filters.srcMap)
      } else {
        filters.update(true)
      }
      // 虚拟背景任务
      if (this.taskSet.has('VirtualBackground')) {
        // 获取对应插件
        const plugin = this.pluginModules.VirtualBackground

        if (plugin) {
          const { width, height } = filters.canvas
          // 屏蔽空帧
          if (width > 16 && height > 16) {
            // 背景替换推理
            plugin.process(
              needCopy ? this.sourceMap!.slice() : this.sourceMap!,
              width,
              height,
              (result) => {
                const len = (result.data || result).length
                this.maskData = this.taskSet.has('VirtualBackground')
                  ? len > 0
                    ? result
                    : null
                  : null
                this.readyTaskSet.add('VirtualBackground')
                if (this.frameCount[1] < this.frameCount[0]) {
                  this.updateTimer()
                  this.update(false)
                }
              },
              env.IS_CHROME && (env.CHROME_MAJOR_VERSION || 0) >= 104
            )
          } else {
            this.readyTaskSet.add('VirtualBackground')
          }
        }
      }
      // 高级美颜任务
      if (this.taskSet.has('AdvancedBeauty')) {
        const plugin = this.pluginModules.AdvancedBeauty

        if (plugin) {
          const { width, height } = filters.canvas
          // 高级美颜推理
          plugin.process(
            this.sourceMap!,
            width,
            height,
            (result) => {
              this.advBeautyData = this.taskSet.has('AdvancedBeauty') ? result : []
              this.readyTaskSet.add('AdvancedBeauty')
              if (this.frameCount[1] < this.frameCount[0]) {
                this.updateTimer()
                this.update(false)
              }
            },
            env.IS_CHROME && (env.CHROME_MAJOR_VERSION || 0) >= 104
          )
        }
      }
    }
  }

  private updateTimer() {
    workerTimer.clearTimeout(this.timerId)
    this.timerId = workerTimer.setTimeout(
      () => {
        this.updateTimer()
        this.update()
      },
      1000 / (this.frameRate * 1.1),
      null
    )
  }

  /** 添加/移除渲染任务，并根据渲染任务情况返回对应 track */
  setTaskAndTrack = (task: TaskType, isEnable: boolean, track?: MediaStreamTrack) => {
    return new Promise((resolve, reject) => {
      if (this.availableCode < 1) {
        return reject(this.glErrorTip)
      }
      if (isEnable) {
        if (this.hasTask(task)) {
          return resolve(this.track!)
        }
        // 创建 track，track创建是异步的
        this.createTrack(track!)
          .then((time) => {
            // 加入任务队列
            this.addTask(task)
            setTimeout(() => {
              resolve(this.track!)
            }, time as number)
          })
          .catch((err) => {
            reject(err)
          })
      } else {
        if (!this.hasTask(task)) {
          return resolve(this.track!)
        }
        // 从任务队列移除
        this.removeTask(task)
        resolve(this.track!)
      }
    })
  }

  destroy() {
    this.isAlive = false
    workerTimer.clearTimeout(this.timerId)
    this.removeAllListeners()
    this.taskSet.clear()
    this.readyTaskSet.clear()
    this.taskSnapshot.clear()
    this.sourceTrack?.stop()
    this.sourceTrack = null
    this.trackInstance?.stop()
    this.trackInstance = null
    this.video = null
    this.filters?.destroy()
    ;(<any>this.filters) = null
    this.sourceMap = null
    this.maskData = null
    ;(<any>this.advBeautyData) = null
    ;(<any>this.pluginModules) = null
    this.frameCount = [0, 0]
  }
}
