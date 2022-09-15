// AudioPipeline 组织了音频前处理流程。

import { StageBase } from './stages/StageBase'
import { AudioLevelNode } from './AudioLevelNode'
import { AudioMixingOptions, ILogger } from '../../types'
import { NeAudioNode } from './NeAudioNode'
import { getMediaStreamSourceNode } from './getMediaStreamSourceNode'
import { StageInputVolume } from './stages/StageInputVolume'
import { StageAIProcessing } from './stages/StageAIProcessing/StageAIProcessing'
import { StageDelay } from './stages/StageDelay'
import { AudioMix } from './mixins/AudioMix'

export interface AudioPipelineInput {
  track: MediaStreamTrack | null
  node: NeAudioNode<MediaStreamAudioSourceNode> | null
  label: string
}

export interface AudioPipelineOptions {
  context: AudioContext
  logger: ILogger
  outputStream: MediaStream
}

let audioPipelineCnt = 0

export class AudioPipeline {
  id = ++audioPipelineCnt
  context: AudioContext
  inputs: {
    local: AudioPipelineInput
    remote: AudioPipelineInput
  } = {
    local: { track: null, node: null, label: '' },
    remote: { track: null, node: null, label: '' }
  }

  audioLevelNode: AudioLevelNode | null = null

  stageInputVolume: StageInputVolume

  stageAIProcessing: StageAIProcessing

  stageDelay: StageDelay

  // stages：从麦克风/前处理开始的一步一步串行处理。例如调节音量、AI降噪、延迟等
  // 每一个Stages的对象都会初始化并处于Disabled状态（以保留Stages数组中的顺序）
  stages: StageBase[] = []

  // mixins: 混音，直接与Stages输出混合，如伴音、音效等
  mixins: {
    [mixinId: number]: AudioMix
  } = {}
  output: {
    track: MediaStreamTrack | null
    stream: MediaStream
    destination: NeAudioNode<MediaStreamAudioDestinationNode> | null
    /**
     * directOutput指output.track是否直接等于某一个 input。
     * 音频前处理开启再关闭后很可能会出现有destination、但track不来自于destination的情况
     */
    directOutput: boolean
  } = {
    track: null,
    stream: new MediaStream(),
    destination: null,
    directOutput: true
  }
  logger: ILogger
  constructor(options: AudioPipelineOptions) {
    this.context = options.context

    this.logger = options.logger.getChild(() => {
      let tag = 'AudioPipeline#' + this.id
      if (this.inputs.local) {
        tag += ' LOCAL'
        if (this.inputs.local.track === this.output.track) {
          tag += `[${this.inputs.local.label}]`
        }
      }
      if (this.inputs.remote) {
        tag += ' REMOTE'
        if (this.inputs.remote.track === this.output.track) {
          tag += `[${this.inputs.remote.label}]`
        }
      }
      let mixInfo = ''
      for (let i in this.mixins) {
        if (this.output.destination && this.mixins[i].node.isConnectedTo(this.output.destination)) {
          mixInfo += ` m${i}`
        }
      }
      if (mixInfo) {
        tag += ' ' + mixInfo
      }
      for (let i in this.stages) {
        if (this.stages[i].enabled) {
          tag += '/' + this.stages[i].type
        }
      }
      return tag
    })

    this.stageInputVolume = new StageInputVolume(this.context)
    this.stageAIProcessing = new StageAIProcessing(this.context, this.logger)
    this.stageDelay = new StageDelay(this.context)
    this.stages = [this.stageInputVolume, this.stageAIProcessing, this.stageDelay]

    this.output.stream = options.outputStream

    this.logger.log(`Audio Pipeline Init`)
  }
  getMixin(index: number) {
    if (!this.mixins[index]) {
      this.mixins[index] = new AudioMix(this)
    }
    return this.mixins[index]
  }
  getEnabledStages() {
    return this.stages.filter((stage) => {
      return stage.enabled
    })
  }
  setInput(type: 'local' | 'remote', track: MediaStreamTrack | null, label: string) {
    this.inputs[type].track = track
    this.updateConnection()
  }
  getInputVolume() {
    return this.stageInputVolume.volume
  }
  setInputVolume(volume: number) {
    this.stageInputVolume.setVolume(volume)
    if (this.stageInputVolume.isTransparent()) {
      if (this.stageInputVolume.enabled) {
        this.stageInputVolume.enabled = false
        this.updateConnection()
      }
    } else {
      if (!this.stageInputVolume.enabled) {
        this.stageInputVolume.enabled = true
        this.updateConnection()
      }
    }
  }
  setDelay(delayTime: number) {
    this.stageDelay.setDelay(delayTime)
    if (this.stageDelay.isTransparent()) {
      if (this.stageDelay.enabled) {
        this.stageDelay.enabled = false
        this.updateConnection()
      }
    } else {
      if (!this.stageDelay.enabled) {
        this.stageDelay.enabled = true
        this.updateConnection()
      }
    }
  }
  getAudioLevel() {
    if (!this.audioLevelNode) {
      this.initAudioLevelNode()
      this.updateConnection()
    }
    return this.audioLevelNode?.getAudioLevel()
  }
  initAudioLevelNode() {
    if (this.audioLevelNode) {
      this.logger.log(`initAudioLevelNode: audioLevelNode Already Inited`)
    } else {
      this.audioLevelNode = new AudioLevelNode({
        logger: this.logger,
        context: this.context
      })
      this.updateConnection()
    }
  }

  private hasWorkingMixin() {
    for (let key in this.mixins) {
      if (this.mixins[key].mixAudioConf.state === 'MIX_PLAYING') {
        return true
      }
    }
    return false
  }

  /**
   * 检查并连接 inputs/stages/mixins
   */
  updateConnection() {
    const inputInfo = this.getInputsInfo()
    let audioLevelConnectNode: NeAudioNode<any> | null = null
    switch (inputInfo.cnt) {
      case 0:
        // 如果没有 input,则无输出
        this.output.directOutput = true
        if (this.output.stream.getTracks().length) {
          this.output.stream.getTracks().forEach((track) => {
            this.output.stream.removeTrack(track)
          })
          this.logger.log('updateConnection:NoInput')
          this.output.stream.dispatchEvent(new Event('neTrackUpdated'))
          this.output.track = null
        }
        if (this.audioLevelNode) {
          this.audioLevelNode.disconnectFromAll()
        }
        break
      case 1:
        // 如果只有一个 input ，且无音频前处理与混音，则直接输出
        if (!this.getEnabledStages().length && !this.hasWorkingMixin()) {
          this.output.directOutput = true
          if (inputInfo.singleInput?.track) {
            this.output.track = inputInfo.singleInput.track
            if (this.output.stream.getTracks()[0] !== this.output.track) {
              this.output.stream.getTracks().forEach((track) => {
                this.output.stream.removeTrack(track)
              })
              this.output.stream.addTrack(this.output.track)
              this.logger.log(`updateConnection: DIRECT`, this.output.track.label)
              this.output.stream.dispatchEvent(new Event('neTrackUpdated'))
            }

            if (this.audioLevelNode) {
              inputInfo.singleInput.node = getMediaStreamSourceNode(
                this.context,
                inputInfo.singleInput.track,
                inputInfo.singleInput === this.inputs.remote
              )
              audioLevelConnectNode = inputInfo.singleInput.node
            }
          }
          if (inputInfo.singleInput?.node) {
            // 如果需要getAudioLevel，后面会连回来的
            inputInfo.singleInput.node.disconnectToAll()
          }
        } else {
          // 只有一个Input，且有stages/mixins
          if (!this.output.destination) {
            this.logger.log(`updateConnection: Creating output destination`)
            this.output.destination = new NeAudioNode(
              'destination',
              this.context.createMediaStreamDestination()
            )
          }
          this.output.track = this.output.destination.audioNode.stream.getTracks()[0]
          if (this.output.stream.getTracks()[0] !== this.output.track) {
            this.output.stream.getTracks().forEach((track) => {
              this.logger.log(
                `updateConnection: Updating output track ${track.label} => ${this.output.track?.label}`
              )
              this.output.stream.removeTrack(track)
            })
            this.output.stream.addTrack(this.output.track)
            this.output.stream.dispatchEvent(new Event('neTrackUpdated'))
          }

          let replace = false
          for (let mixinId in this.mixins) {
            const mixin = this.mixins[mixinId]
            if (mixin.mixAudioConf.state === 'MIX_PLAYING') {
              if (mixin.mixAudioConf.replace) {
                replace = true
              }
              if (!mixin.node.isConnectedTo(this.output.destination)) {
                this.logger.log(`connect ${mixinId} to destination`)
                mixin.node.connect(this.output.destination)
              }
            } else {
              if (mixin.node.isConnectedTo(this.output.destination)) {
                mixin.node.disconnect(this.output.destination)
              }
            }
          }
          // 从后向前连接
          if (this.stages) {
            let nextStageNode: NeAudioNode<any> = this.output.destination
            for (let i = this.stages.length - 1; i >= 0; i--) {
              const currentStage = this.stages[i]
              if (currentStage.enabled && currentStage.node) {
                if (!audioLevelConnectNode) {
                  audioLevelConnectNode = currentStage.node
                }
                if (replace && nextStageNode === this.output.destination) {
                  if (currentStage.node.isConnectedTo(nextStageNode)) {
                    currentStage.node.disconnect(nextStageNode)
                  }
                } else if (!currentStage.node.isConnectedTo(nextStageNode)) {
                  currentStage.node.disconnectToAll()
                  currentStage.node.connect(nextStageNode)
                }
                nextStageNode = currentStage.node
              } else if (!currentStage.enabled) {
                currentStage.node?.disconnectToAll()
                currentStage.node?.disconnectFromAll()
              }
            }
            if (inputInfo.singleInput) {
              if (inputInfo.singleInput.track) {
                inputInfo.singleInput.node = getMediaStreamSourceNode(
                  this.context,
                  inputInfo.singleInput.track,
                  inputInfo.singleInput === this.inputs.remote
                )
              }
              if (replace && nextStageNode === this.output.destination) {
                if (inputInfo.singleInput.node?.isConnectedTo(nextStageNode)) {
                  inputInfo.singleInput.node?.disconnect(nextStageNode)
                }
              } else if (
                inputInfo.singleInput.node &&
                !inputInfo.singleInput.node.isConnectedTo(nextStageNode)
              ) {
                // 把input接到stage上
                inputInfo.singleInput.node.disconnectToAll()
                inputInfo.singleInput.node.connect(nextStageNode)
              }
            }
          }
        }
      case 2:
      // TODO
      default:
      // TODO
    }
    if (this.audioLevelNode && audioLevelConnectNode) {
      if (!audioLevelConnectNode.isConnectedTo(this.audioLevelNode)) {
        this.audioLevelNode.disconnectFromAll()
        audioLevelConnectNode.connect(this.audioLevelNode)
      }
    }
  }
  getInputsInfo() {
    let cnt = 0
    let input: AudioPipelineInput | null = null
    if (this.inputs.local.track) {
      cnt++
      input = this.inputs.local
    }
    if (this.inputs.remote.track) {
      cnt++
      input = this.inputs.remote
    }
    return {
      cnt: cnt,
      singleInput: cnt === 1 ? input : null
    }
  }
  async enableAIdenoise(enable = true) {
    this.logger.log(`Enabling AI Denoise`, enable)
    this.stageAIProcessing.enabled = enable
    if (this.stageAIProcessing.state === 'UNINIT') {
      await this.stageAIProcessing.init()
    }
    this.updateConnection()
  }
}
