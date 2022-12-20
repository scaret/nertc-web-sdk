import { AudioMixingOptions, ILogger } from '../../../types'
import RtcError from '../../../util/error/rtcError'
import ErrorCode from '../../../util/error/errorCode'
import { MIXING_STATES } from '../../../constant/state'
import { NeAudioNode } from '../NeAudioNode'
import { AudioPipeline } from '../AudioPipeline'
import { RTCEventEmitter } from '../../../util/rtcUtil/RTCEventEmitter'
import { ajax } from '../../../util/ajax'

export interface StartAudioMixingOptions {
  audioFilePath: string
  buffer: AudioBuffer
  replace: boolean
  cycle: number
  playStartTime: number
  volume?: number
  auidoMixingEnd: (() => void) | null
  loopback: boolean
}

export class AudioMix extends RTCEventEmitter {
  pipeline: AudioPipeline
  /**
   * AudioMix是否连接到AudioPipeline不是由自己决定的，而是由AudioPipeline通过updateConnection决定的
   */
  node: NeAudioNode<GainNode>
  logger: ILogger
  public mixAudioConf: {
    audioFilePath: string
    buffer: AudioBuffer | null
    cachedBuffers: {
      [filePath: string]: AudioBuffer
    }
    state: MIXING_STATES
    audioSource: NeAudioNode<AudioBufferSourceNode> | null
    /**
     * 伴音的音量
     */
    gainFilter: NeAudioNode<GainNode>
    replace: boolean
    loopback: boolean
    cycle: number
    /**
     * 暂停时的时间戳
     */
    pauseTime: number
    /**
     * 开始的时间戳
     */
    startTime: number
    totalTime: number
    volume: number
    /**
     * 录音文件开始播放时的秒数
     */
    playStartTime: number
    /**
     * 通过setAudioMixingPlayTime设置的秒数
     */
    setPlayStartTime: number
    auidoMixingEnd: ((evt: Event) => void) | null
  }
  private context: AudioContext

  constructor(pipeline: AudioPipeline) {
    super()
    this.pipeline = pipeline
    this.context = pipeline.context

    const gainNode = new NeAudioNode('AudioMixingGain', this.context.createGain())
    this.node = gainNode

    this.mixAudioConf = {
      audioFilePath: '',
      state: 'MIX_UNSTART',
      buffer: null,
      cachedBuffers: {},
      audioSource: null,
      gainFilter: gainNode,
      replace: false,
      loopback: false,
      cycle: 0,
      pauseTime: 0,
      startTime: 0,
      totalTime: 0,
      volume: 1,
      playStartTime: 0,
      setPlayStartTime: 0,
      auidoMixingEnd: null
    }

    this.logger = pipeline.logger.getChild(() => {
      const tag = `AudioMix ${this.mixAudioConf.state}`
      return tag
    })
  }

  async startAudioMixing(options: StartAudioMixingOptions) {
    if (!options?.audioFilePath) {
      this.logger.error(`startAudioMixing:未指定伴音文件`)
    } else {
      this.logger.log(`即将开始伴音:`, JSON.stringify(options, null, ' '))
    }
    Object.assign(this.mixAudioConf, options)
    // if (
    //   this.mixAudioConf.audioSource &&
    //   this.mixAudioConf.state === "MIX_PLAYING"
    // ) {
    //   this.logger.log('startAudioMixing: 当前已经开启伴音，先关闭之前的伴音')
    //   this.stopAudioMixing()
    // }

    if (this.mixAudioConf.audioFilePath) {
      if (this.mixAudioConf.cachedBuffers[this.mixAudioConf.audioFilePath]) {
        this.mixAudioConf.buffer = this.mixAudioConf.cachedBuffers[this.mixAudioConf.audioFilePath]
        this.logger.log(`即将从缓存播放伴音`, this.mixAudioConf.audioFilePath)
        return this.startMix()
      } else {
        this.logger.log('即将加载云端音乐', this.mixAudioConf.audioFilePath)
        this.mixAudioConf.state = 'MIX_STARTING'
        const buffer = await this.loadAudioBuffer(this.mixAudioConf.audioFilePath)
        if (this.mixAudioConf.state === 'MIX_STARTING') {
          this.mixAudioConf.buffer = buffer
          return this.startMix()
        } else {
          this.logger.warn(`startAudioMixing: 播放行为被覆盖`)
        }
      }
    }
  }

  /*
    停止混音
  */
  stopAudioMixing(releaseBuffers = false) {
    if (!this.mixAudioConf.audioSource) {
      this.logger.warn('stopAudioMixing:当前没有在混音')
    } else {
      this.logger.log('即将停止混音')
      this.mixAudioConf.audioSource.audioNode.onended = null
      this.mixAudioConf.audioSource.disconnect(this.mixAudioConf.gainFilter)
      this.mixAudioConf.audioSource.audioNode.stop()
      this.mixAudioConf.audioSource = null
    }
    this.mixAudioConf.startTime = 0
    this.mixAudioConf.pauseTime = 0
    this.mixAudioConf.playStartTime = 0
    if (releaseBuffers) {
      this.resetMixConf()
    }
    this.mixAudioConf.state = 'MIX_STOPED'
    this.pipeline.updateConnection()
    this.logger.log('混音已停止')
    return Promise.resolve()
  }

  /*
  暂停混音
*/
  pauseAudioMixing() {
    if (!this.mixAudioConf.audioSource) {
      this.logger.error('pauseAudioMixing:参数不够')
      return
    }
    this.logger.log('暂停混音')
    this.mixAudioConf.audioSource.audioNode.onended = null
    this.mixAudioConf.audioSource.disconnect(this.mixAudioConf.gainFilter)
    this.mixAudioConf.audioSource.audioNode.stop()
    this.mixAudioConf.audioSource.disconnectToAll()
    this.mixAudioConf.audioSource = null
    this.mixAudioConf.pauseTime = Date.now()
    this.mixAudioConf.state = 'MIX_PAUSED'
    let playedTime =
      (this.mixAudioConf.pauseTime - this.mixAudioConf.startTime) / 1000 +
      this.mixAudioConf.playStartTime
    this.logger.log('已经播放的时间: ', playedTime)
    if (playedTime > this.mixAudioConf.totalTime) {
      playedTime = playedTime % this.mixAudioConf.totalTime
    }
    this.logger.log('暂停位置:', playedTime)

    return Promise.resolve()
  }

  /*
    恢复混音
   */
  resumeAudioMixing() {
    // 计算上一次暂停时的播放圈数
    let playedTime =
      (this.mixAudioConf.pauseTime - this.mixAudioConf.startTime) / 1000 +
      this.mixAudioConf.playStartTime
    if (playedTime > this.mixAudioConf.totalTime) {
      this.logger.log(
        '播放过的圈数 playedCycle: ',
        Math.floor(playedTime / this.mixAudioConf.totalTime)
      )
      this.mixAudioConf.cycle =
        this.mixAudioConf.cycle - Math.floor(playedTime / this.mixAudioConf.totalTime)
    }
    let playStartTime
    if (this.mixAudioConf.setPlayStartTime) {
      this.logger.log('暂停期间，用户设置混音播放时间: ', this.mixAudioConf.setPlayStartTime)
      playStartTime = this.mixAudioConf.setPlayStartTime
      this.mixAudioConf.setPlayStartTime = 0
    } else {
      this.logger.log('恢复混音:', this.mixAudioConf)
      this.logger.log('已经播放的时间: ', playedTime)
      if (playedTime > this.mixAudioConf.totalTime) {
        playedTime = playedTime % this.mixAudioConf.totalTime
      }
      playStartTime = playedTime
    }
    this.logger.log('回复重置的时间点：', playStartTime)
    this.mixAudioConf.playStartTime = playStartTime
    return this.startMix()
  }

  /*
    设置混音音量
  */
  setAudioMixingVolume(volume: number) {
    if (volume <= 255 && volume >= 0) {
      const gainValue = volume / 255
      this.logger.log(
        `setAudioMixingVolume ${this.mixAudioConf.gainFilter.audioNode.gain.value} => ${gainValue}`
      )
      this.mixAudioConf.gainFilter.audioNode.gain.value = volume / 255
      this.mixAudioConf.volume = this.mixAudioConf.gainFilter.audioNode.gain.value
    } else {
      this.logger.error(`setAudioMixingVolume: volume不在0~255范围内：`, volume)
    }
  }

  /*
    获取混音文件的播放位置
  */
  getAudioMixingPlayedTime() {
    //this.logger.log('获取混音文件的播放位置: ', this.mixAudioConf)
    let currentTime = Date.now()
    if (this.mixAudioConf.state == 'MIX_PAUSED' && this.mixAudioConf.pauseTime) {
      this.logger.log('当前是暂停状态')
      currentTime = this.mixAudioConf.pauseTime
    }
    let playedTime =
      (currentTime - this.mixAudioConf.startTime) / 1000 + this.mixAudioConf.playStartTime
    //this.logger.log('已经播放的时间: ', playedTime)
    if (playedTime > this.mixAudioConf.totalTime) {
      playedTime = playedTime % this.mixAudioConf.totalTime
    }
    //this.logger.log("当前播放进度:", playedTime)

    return { playedTime: playedTime }
  }

  /*
      获取混音文件时长
  */
  getAudioMixingTotalTime() {
    return { totalTime: this.mixAudioConf.totalTime }
  }

  /**
   * startMix是实际开始混音的执行函数。上层通过 startAudioMixing/resumeAudioMixing/playEffect等调用
   *
   * @param options
   * @private
   */
  private startMix() {
    this.logger.log('startMix: ', this.mixAudioConf)
    if (!this.mixAudioConf.buffer) {
      this.logger.error(`startMix: 缺少 mixAudioConf.buffer`)
      return
    }
    if (this.mixAudioConf.audioSource) {
      this.mixAudioConf.audioSource.disconnectToAll()
    }
    this.mixAudioConf.audioSource = new NeAudioNode(
      'AudioMixBufferSource',
      this.pipeline.context.createBufferSource()
    )
    this.mixAudioConf.audioSource.audioNode.buffer = this.mixAudioConf.buffer
    this.mixAudioConf.audioSource.connect(this.mixAudioConf.gainFilter)

    this.mixAudioConf.audioSource.audioNode.onended = (event) => {
      this.audioEnd(event)
    }
    this.mixAudioConf.totalTime = this.mixAudioConf.buffer.duration
    if (
      this.mixAudioConf.playStartTime < 0 ||
      this.mixAudioConf.playStartTime >= this.mixAudioConf.totalTime
    ) {
      this.mixAudioConf.playStartTime = 0
    }
    this.logger.log('设置音量:', this.mixAudioConf.volume)
    this.mixAudioConf.gainFilter.audioNode.gain.value = this.mixAudioConf.volume
    if (this.mixAudioConf.loopback && this.mixAudioConf.cycle > 1) {
      this.mixAudioConf.audioSource.audioNode.loop = this.mixAudioConf.loopback
      const totalTime =
        this.mixAudioConf.cycle * this.mixAudioConf.totalTime - this.mixAudioConf.playStartTime
      this.logger.log('循环播放: options.playStartTime: ', this.mixAudioConf.playStartTime)
      this.logger.log('循环播放: totalTime: ', totalTime)
      this.mixAudioConf.audioSource.audioNode.start(
        0,
        this.mixAudioConf.playStartTime,
        totalTime - 1
      )
    } else if (this.mixAudioConf.loopback && this.mixAudioConf.cycle == 1) {
      this.mixAudioConf.audioSource.audioNode.loop = false
      this.mixAudioConf.audioSource.audioNode.start(0, this.mixAudioConf.playStartTime)
    } else {
      this.logger.log('无限循环播放 loop: ', this.mixAudioConf.loopback)
      this.mixAudioConf.audioSource.audioNode.loop = this.mixAudioConf.loopback
      this.mixAudioConf.audioSource.audioNode.start(0, this.mixAudioConf.playStartTime)
    }
    this.mixAudioConf.state = 'MIX_PLAYING'
    this.mixAudioConf.startTime = Date.now()
    this.pipeline.updateConnection()
    return Promise.resolve()
  }

  audioEnd(event: Event) {
    if (this.mixAudioConf.state !== 'MIX_PLAYING') {
      this.logger.error('audioEnd:状态不对')
      return
    } else if (
      this.mixAudioConf.audioSource &&
      this.mixAudioConf.audioSource.audioNode.loop &&
      this.mixAudioConf.cycle <= 0
    ) {
      this.logger.log('无限循环时，伴音播放完成event: ', event)
      return
    } else {
      this.logger.log('伴音播放完成: ', this.mixAudioConf)
      if (this.mixAudioConf.audioSource) {
        this.mixAudioConf.audioSource.audioNode.onended = null
      }
      if (this.mixAudioConf.auidoMixingEnd) {
        this.mixAudioConf.auidoMixingEnd(event)
        this.mixAudioConf.auidoMixingEnd = null
      }
      this.resetMixConf()
      this.pipeline.updateConnection()
      return Promise.resolve()
    }
  }

  async loadAudioBuffer(filePath: string) {
    if (this.mixAudioConf.cachedBuffers[filePath]) {
      this.logger.warn(
        `loadAudioBuffer: 该文件已有缓存，长度：${this.mixAudioConf.cachedBuffers[filePath].duration} 秒。即将更新该文件地址：${filePath}`
      )
    } else {
      this.logger.warn(`loadAudioBuffer: 开始加载文件。地址：${filePath}`)
    }
    let data: ArrayBuffer
    try {
      data = (await ajax({
        url: filePath,
        type: 'GET',
        dataType: 'arraybuffer'
      })) as ArrayBuffer
    } catch (error) {
      this.logger.error('loadAudioBuffer 加载云端音乐失败: ', error)
      throw error
    }
    this.logger.log(`loadAudioBuffer 文件下载成功。大小：${Math.floor(data.byteLength / 1024)} KB`)
    let buffer: AudioBuffer
    try {
      buffer = await this.pipeline.context.decodeAudioData(data as ArrayBuffer)
    } catch (error) {
      this.logger.log('loadAudioBuffer 解码失败:', error)
      throw error
    }
    this.logger.log(`loadAudioBuffer 解码成功。长度：${buffer.duration} 秒。`)
    this.mixAudioConf.cachedBuffers[filePath] = buffer
    return buffer
  }

  resetMixConf() {
    if (this.mixAudioConf.audioSource) {
      this.mixAudioConf.audioSource.disconnect(this.mixAudioConf.gainFilter)
      this.mixAudioConf.audioSource = null
    }
    this.mixAudioConf.audioFilePath = ''
    this.mixAudioConf.buffer = null
    this.mixAudioConf.state = 'MIX_UNSTART'
    this.mixAudioConf.replace = false
    this.mixAudioConf.cycle = 0
    this.mixAudioConf.pauseTime = 0
    this.mixAudioConf.startTime = 0
    this.mixAudioConf.totalTime = 0
    this.mixAudioConf.volume = 1
    this.mixAudioConf.playStartTime = 0
    this.mixAudioConf.setPlayStartTime = 0
    this.mixAudioConf.auidoMixingEnd = null
    this.emit('audioFilePlaybackCompleted')
  }
}
