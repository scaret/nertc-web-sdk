/**
 * 音频的音量计算模块
 */
import { ILogger } from '../../types'
import { getBlobUrl } from '../blobs/getBlobUrl'
import { NeAudioNode, NeAudioNodeNullable } from './NeAudioNode'

let AudioWorkletState: 'NOTREADY' | 'LOADING' | 'READY' = 'NOTREADY'
let AudioWorkletReady: Promise<void> | null = null

interface ChannelVolume {
  volume: number
  history: {
    sec: number
    sum: number
  }[]
}

interface AudioLevelNodeOptions {
  context: AudioContext
  logger: ILogger
}

function smoothVolume(x: number) {
  return x
  // const y = Math.min((x * 10) / 3, 1)
  // return Math.floor(y * 1000) / 1000
}

export class AudioLevelNode extends NeAudioNodeNullable<AudioWorkletNode> {
  private volume = 0
  private volumeTs = Date.now()
  // 没有左右声道就是null
  public left: ChannelVolume | null = null
  public right: ChannelVolume | null = null
  public channelState: 'mono' | 'leftLoud' | 'rightLoud' | 'balance' = 'balance'
  private stateChangeCnt = 0
  logger: ILogger
  context: AudioContext

  constructor(options: AudioLevelNodeOptions) {
    super('AudioLevelNode', null)
    this.context = options.context
    this.logger = options.logger.getChild(() => {
      let tag = `AudioLevelNode#${this.id}`
      if (AudioWorkletState !== 'READY') {
        tag += ' ' + AudioWorkletState
      } else {
        tag += ' ' + this.channelState
      }
      if (this.stateChangeCnt) {
        tag += ' change' + this.stateChangeCnt
      }
      return tag
    })
    this.initAudioWorklet()
  }

  async initAudioWorklet() {
    this.logger.log('AudioLevelNode initAudioWorklet')

    if (!this.context.audioWorklet) {
      this.logger.error(`该环境不支持音频处理`)
      return
    }
    if (!AudioWorkletReady) {
      AudioWorkletState = 'LOADING'
      this.logger.log(`正在载入音量模块`)
      AudioWorkletReady = this.context.audioWorklet.addModule(getBlobUrl('volumeProcessor'))
      await AudioWorkletReady
      AudioWorkletState = 'READY'
      this.logger.log(`载入音量模块成功`)
    } else if (AudioWorkletState === 'LOADING') {
      await AudioWorkletReady
    }
    const audioWorkletNode = new AudioWorkletNode(this.context, 'vumeter')
    this.audioNode = audioWorkletNode
    this.connectedFrom.forEach((node) => {
      node.connect(this)
    })
    this.connectedTo.forEach((node) => {
      // 并不会有 connectedTo，但出于完整性还是连一下
      this.connect(node)
    })
    audioWorkletNode.port.onmessage = (event) => {
      const ts = Date.now()
      const sec = Math.floor(ts)

      this.volume = smoothVolume(event.data.volume)
      this.volumeTs = ts

      //左声道
      if (event.data.left > -1) {
        if (!this.left) {
          this.left = {
            volume: 0,
            history: []
          }
        }
        //按秒记录历史音量总和，仅记录2秒
        if (!this.left.history.length || this.left.history[0].sec !== sec) {
          this.left.history.unshift({
            sec,
            sum: 0
          })
        }
        this.left.volume = smoothVolume(event.data.left)
        this.left.history[0].sum += event.data.left
        if (this.left.history.length > 2) {
          this.left.history.pop()
        }
      } else {
        const prevState = this.channelState
        this.channelState = 'mono'
        if (prevState !== this.channelState) {
          this.stateChangeCnt++
          if (this.stateChangeCnt < 20) {
            this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
          }
          this.emit('channel-state-change', {
            state: this.channelState,
            prev: prevState
          })
        }
      }

      // 右声道
      if (event.data.right > -1) {
        if (!this.right) {
          this.right = {
            volume: 0,
            history: []
          }
        }
        //按秒记录历史音量总和，仅记录2秒
        if (!this.right.history.length || this.right.history[0].sec !== sec) {
          this.right.history.unshift({
            sec,
            sum: 0
          })
        }
        this.right.volume = smoothVolume(event.data.right)
        this.right.history[0].sum += event.data.right
        if (this.right.history.length > 2) {
          this.right.history.pop()
        }
      }

      if (this.left?.history[1] && this.right?.history[1]) {
        if (this.left.history[1].sum > 4 * this.right.history[1].sum) {
          const prevState = this.channelState
          this.channelState = 'leftLoud'
          if (prevState !== this.channelState) {
            this.stateChangeCnt++
            if (this.stateChangeCnt < 20) {
              this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
            }
            this.emit('channel-state-change', {
              state: this.channelState,
              prev: prevState
            })
          }
        } else if (this.right.history[1].sum > 4 * this.left.history[1].sum) {
          const prevState = this.channelState
          this.channelState = 'rightLoud'
          if (prevState !== this.channelState) {
            this.stateChangeCnt++
            if (this.stateChangeCnt < 20) {
              this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
            }
            this.emit('channel-state-change', {
              state: this.channelState,
              prev: prevState
            })
          }
        } else {
          if (
            this.left.history[1].sum > this.right.history[1].sum &&
            this.channelState !== 'leftLoud'
          ) {
            const prevState = this.channelState
            this.channelState = 'balance'
            if (prevState !== this.channelState) {
              this.stateChangeCnt++
              if (this.stateChangeCnt < 20) {
                this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
              }
              this.emit('channel-state-change', {
                state: this.channelState,
                prev: prevState
              })
            }
          }
          if (
            this.right.history[1].sum > this.left.history[1].sum &&
            this.channelState !== 'rightLoud'
          ) {
            const prevState = this.channelState
            this.channelState = 'balance'
            if (prevState !== this.channelState) {
              this.stateChangeCnt++
              if (this.stateChangeCnt < 20) {
                this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
              }
              this.emit('channel-state-change', {
                state: this.channelState,
                prev: prevState
              })
            }
          }
        }
      }
    }
  }

  getAudioLevel() {
    const now = Date.now()
    if (now - this.volumeTs > 1000) {
      return { volume: 0 }
    } else {
      return {
        volume: this.volume,
        left: this.left?.volume,
        right: this.right?.volume
      }
    }
  }
}
