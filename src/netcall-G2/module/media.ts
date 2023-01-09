import { EventEmitter } from 'eventemitter3'

import { LocalStream } from '../api/localStream'
import { RemoteStream } from '../api/remoteStream'
import { AuidoMixingState } from '../constant/state'
import { NERTC_VIDEO_QUALITY_ENUM, VIDEO_FRAME_RATE_ENUM } from '../constant/videoQuality'
import {
  AudioEffectOptions,
  AudioMixingOptions,
  EncodingParameters,
  GetStreamConstraints,
  GUMAudioConstraints,
  GUMConstaints,
  ILogger,
  MediaHelperOptions,
  MediaTypeAudio,
  MediaTypeShort,
  MixAudioConf,
  PreProcessingConfig,
  PreProcessingHandlerName
} from '../types'
import { ajax } from '../util/ajax'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import * as GUM from '../util/gum'
import { emptyStreamWith, watchTrack } from '../util/gum'
import { checkExists, checkValidInteger, isExistOptions } from '../util/param'
import { pcCloneTrack } from '../util/pcCloneTrack'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { Logger } from './3rd/mediasoup-client/Logger'
import { compatAudioInputList } from './compatAudioInputList'
import { Device } from './device'
import { getParameters } from './parameters'
import {
  canDisablePreProcessing,
  disablePreProcessing,
  enablePreProcessing,
  preProcessingCopy
} from './preProcessing'
import { getAudioContext, WebAudio } from './webAudio'
import { VideoTrackLow } from './videoTrackLow'
import { AudioPipeline } from './audio-pipeline/AudioPipeline'
import { StageAIProcessing } from './audio-pipeline/stages/StageAIProcessing/StageAIProcessing'
class MediaHelper extends EventEmitter {
  stream: LocalStream | RemoteStream
  public audio: {
    //****************** 以下为音频主流 ***************************************
    // stream对localStream而言是PeerConnection发送的MediaStream，
    // 对remoteStream而言是包含了接收的MediaStream
    // 无论是否有audio，audioStream总是存在，且始终是同一个对象。
    // 对localStream而言：
    // 1: 当audioRoutingEnabled == true 时，audioStream包含AudioDestinationNode
    // 2: 当audioRoutingEnabled == false 时，audioStream包含getUserMedia的输出
    readonly audioStream: MediaStream
    // musicStream指没有人声的混音音乐
    readonly musicStream: MediaStream
    // micStream指麦克风输入
    readonly micStream: MediaStream
    // audioSourceStream指自定义音频输入
    readonly audioSourceStream: MediaStream
    // 音频前处理模块。
    pipeline: AudioPipeline | null
    audioSource: MediaStreamTrack | null
    micTrack: MediaStreamTrack | null
    // Chrome为default设备做音频切换的时候，已有的track的label不会更新
    deviceInfo: {
      mic: { compatAudio: boolean; label: string; groupId?: string; deviceId?: string }
    }

    webAudio: WebAudio | null
    micConstraint: { audio: MediaTrackConstraints } | null
    mixAudioConf: MixAudioConf
    stageAIProcessing: StageAIProcessing | null
    audioRoutingEnabled: boolean
  } = {
    audioStream: new MediaStream(),
    audioSourceStream: new MediaStream(),
    musicStream: new MediaStream(),
    micStream: new MediaStream(),
    pipeline: null,
    audioSource: null,
    micTrack: null,
    // Chrome为default设备做音频切换的时候，已有的track的label不会更新
    deviceInfo: { mic: { compatAudio: false, label: '' } },
    webAudio: null,
    micConstraint: null,
    mixAudioConf: {
      index: 0,
      audioBuffer: {}, //云端音频buffer数组
      sounds: {}
    },
    stageAIProcessing: null,
    audioRoutingEnabled: false
  }
  public video: {
    // videoStream中的track可能是：
    // 1. cameraTrack/videoSource
    // 2. 被前处理的canvasTrack
    readonly videoStream: MediaStream
    // renderStream是本地渲染用的、video标签的srcObject。其中的Track可能是
    // 1. 大多数情况下与videoStream内用于发送的track一样
    // 2. 由于Safari的CanvasCaptureMediaStreamTrack的本地播放问题，Safari开启前处理时是个remoteTrack https://bugs.webkit.org/show_bug.cgi?id=181663
    renderStream: MediaStream
    // videoTrackLow可能是cameraTrack或者videoSource的小流
    low: VideoTrackLow | null
    cameraTrack: MediaStreamTrack | null
    cameraConstraint: { video: MediaTrackConstraints }
    videoSource: MediaStreamTrack | null
    preProcessingEnabled: boolean
    preProcessing: PreProcessingConfig | null
    captureConfig: { high: { width: number; height: number; frameRate: number } }
    encoderConfig: { high: EncodingParameters; low: EncodingParameters }
  } = {
    videoStream: new MediaStream(),
    renderStream: new MediaStream(),
    low: null,
    cameraTrack: null,
    cameraConstraint: { video: {} },
    videoSource: null,
    preProcessingEnabled: false,
    preProcessing: null,
    captureConfig: { high: { width: 640, height: 480, frameRate: 15 } },
    encoderConfig: {
      high: { maxBitrate: 800000, contentHint: null },
      low: { maxBitrate: 100000, contentHint: 'motion' }
    }
  }
  public screen: {
    // screenVideoStream中的track可能是:
    // 1. screenVideoTrack或者screenVideoSource
    // 2. 前处理后的canvasTrack
    readonly screenVideoStream: MediaStream
    // renderStream是本地渲染用的、video标签的srcObject。其中的Track可能是
    // 1. 大多数情况下与videoStream内用于发送的track一样
    // 2. 由于Safari的CanvasCaptureMediaStreamTrack的本地播放问题，Safari开启前处理时是个remoteTrack https://bugs.webkit.org/show_bug.cgi?id=181663
    renderStream: MediaStream
    low: VideoTrackLow | null
    screenVideoTrack: MediaStreamTrack | null
    screenVideoSource: MediaStreamTrack | null
    preProcessingEnabled: boolean
    preProcessing: PreProcessingConfig | null
    captureConfig: { high: { width: number; height: number; frameRate: number } }
    encoderConfig: { high: EncodingParameters; low: EncodingParameters }
  } = {
    screenVideoStream: new MediaStream(),
    renderStream: new MediaStream(),
    low: null,
    screenVideoTrack: null,
    screenVideoSource: null,
    preProcessingEnabled: false,
    preProcessing: null,
    captureConfig: { high: { width: 1920, height: 1080, frameRate: 5 } },
    encoderConfig: {
      high: { maxBitrate: 1500000, contentHint: null },
      low: { maxBitrate: 200000, contentHint: 'motion' }
    }
  }
  public screenAudio: {
    readonly screenAudioStream: MediaStream
    screenAudioTrack: MediaStreamTrack | null
    screenAudioSource: MediaStreamTrack | null
    pipeline: AudioPipeline | null
  } = {
    screenAudioStream: new MediaStream(),
    screenAudioTrack: null,
    screenAudioSource: null,
    pipeline: null
  }
  logger: ILogger

  constructor(options: MediaHelperOptions) {
    super()
    // 设置对象引用
    this.stream = options.stream
    this.logger = options.stream.logger.getChild(() => {
      let tag = 'mediaHelper'
      if (this.audio.audioRoutingEnabled) {
        tag += ' WebAudio'
      }
      if (this.audio.webAudio) {
        if (this.audio.webAudio.context) {
          if (this.audio.webAudio.context.state !== 'running') {
            tag += ' ' + this.audio.webAudio.context.state
          }
        }
        if (this.audio.webAudio.mixAudioConf.state !== AuidoMixingState.UNSTART) {
          tag += ' ' + this.audio.webAudio?.mixAudioConf.state
        }
      }

      if (this.stream.mediaHelper !== this) {
        tag += 'DETACHED'
      }
      return tag
    })

    this.bindRenderStream()

    Device.on('recording-device-changed', (evt) => {
      if (this.audio.micTrack) {
        if (this.audio.deviceInfo.mic.deviceId === evt.device.deviceId) {
          if (evt.state === 'INACTIVE') {
            this.logger.error('当前使用的麦克风设备被移除，需重新启用设备', evt.device)
            this.stream.emit('recording-device-changed', evt)
          } else {
            let device = Device.deviceHistory.audioIn.find((d) => {
              d.groupId === this.audio.deviceInfo.mic.groupId
            })
            if (!device) {
              this.logger.error(
                `当前麦克风已由【${this.audio.deviceInfo.mic.label}】切换至【${evt.device.label}】，可能会影响通话质量`
              )
              this.audio.deviceInfo.mic.label = evt.device.label
              this.audio.deviceInfo.mic.groupId = evt.device.groupId
              this.stream.emit('recording-device-changed', evt)
            }
          }
        }
      }
    })
  }

  getOrCreateAudioPipeline(mediaType: 'audio' | 'audioSlave' = 'audio') {
    let pipeline: AudioPipeline
    const context = getAudioContext()
    if (!context) {
      this.logger.error('getOrCreateAudioPipeline: AudioContext is not supported')
      return null
    }
    if (mediaType === 'audio') {
      if (!this.audio.pipeline) {
        pipeline = new AudioPipeline({
          logger: this.logger,
          outputStream: this.audio.audioStream,
          context
        })
        this.audio.pipeline = pipeline
        this.logger.log(`getOrCreateAudioPipeline: 初始化成功`)
      } else {
        pipeline = this.audio.pipeline
      }
      if (this.stream.isRemote) {
        if (pipeline.inputs.remote.track !== this.audio.micTrack) {
          this.logger.log(`getOrCreateAudioPipeline: 更新输入的Track`)
          pipeline.setInput('remote', this.audio.micTrack, `remote${this.stream.streamID}`)
        }
      } else {
        const track = this.audio.micTrack || this.audio.audioSource
        if (pipeline.inputs.local.track !== track) {
          this.logger.log(`getOrCreateAudioPipeline: 更新输入的Track`)
          pipeline.setInput('local', track, track?.label || 'empty')
        }
      }
    } else {
      if (!this.screenAudio.pipeline) {
        pipeline = new AudioPipeline({
          logger: this.logger,
          outputStream: this.screenAudio.screenAudioStream,
          context
        })
        this.screenAudio.pipeline = pipeline
        this.logger.log(`getOrCreateAudioPipeline/screenAudio: 初始化成功`)
      } else {
        pipeline = this.screenAudio.pipeline
      }
      if (this.stream.isRemote) {
        if (pipeline.inputs.remote.track !== this.screenAudio.screenAudioTrack) {
          this.logger.log(`getOrCreateAudioPipeline/screenAudio: 更新输入的Track`)
          pipeline.setInput(
            'remote',
            this.screenAudio.screenAudioTrack,
            `remote${this.stream.streamID}/screenAudio`
          )
        }
      } else {
        const track = this.screenAudio.screenAudioTrack || this.screenAudio.screenAudioSource
        if (pipeline.inputs.local.track !== track) {
          this.logger.log(`getOrCreateAudioPipeline/screenAudio: 更新输入的Track`)
          pipeline.setInput('local', track, track?.label || 'empty')
        }
      }
    }
    return pipeline
  }

  bindRenderStream() {
    if (
      (env.IS_SAFARI && getParameters().shimLocalCanvas === 'safari') ||
      getParameters().shimLocalCanvas === 'all'
    ) {
      this.video.videoStream.onaddtrack = async (evt: MediaStreamTrackEvent) => {
        if (
          // @ts-ignore
          typeof CanvasCaptureMediaStreamTrack !== 'undefined' &&
          // @ts-ignore
          evt.track instanceof CanvasCaptureMediaStreamTrack
        ) {
          const clonedTrack = pcCloneTrack(evt.track)
          watchTrack(clonedTrack)
          this.logger.warn('renderStream cloned track for video:', evt.track, clonedTrack)
          emptyStreamWith(this.video.renderStream, clonedTrack)
        } else {
          emptyStreamWith(this.video.renderStream, evt.track)
        }
      }
      this.video.videoStream.onremovetrack = (evt: MediaStreamTrackEvent) => {
        emptyStreamWith(this.video.renderStream, null)
      }
      this.screen.screenVideoStream.onaddtrack = async (evt: MediaStreamTrackEvent) => {
        if (
          // @ts-ignore
          typeof CanvasCaptureMediaStreamTrack !== 'undefined' &&
          // @ts-ignore
          evt.track instanceof CanvasCaptureMediaStreamTrack
        ) {
          const clonedTrack = pcCloneTrack(evt.track)
          watchTrack(clonedTrack)
          this.logger.warn('renderStream cloned track for screen:', evt.track, clonedTrack)
          emptyStreamWith(this.screen.renderStream, clonedTrack)
        } else {
          emptyStreamWith(this.screen.renderStream, evt.track)
        }
      }
      this.screen.screenVideoStream.onremovetrack = (evt: MediaStreamTrackEvent) => {
        emptyStreamWith(this.screen.renderStream, null)
      }
    } else {
      this.video.renderStream = this.video.videoStream
      this.screen.renderStream = this.screen.screenVideoStream
    }
  }

  assertLive() {
    if (this.stream.isRemote) return
    if (!this.stream.isRemote) {
      if (this.stream.destroyed) {
        this._reset()
        let err = new RtcError({
          code: ErrorCode.LOCALSTREAM_NOT_FOUND_ERROR,
          message: 'assertLive: localStream 已经销毁'
        })
        throw err
      }
    }
  }

  _reset() {
    this.stopAllEffects()
    if (!this.stream.isRemote) {
      if (this.audio.webAudio) {
        this.audio.webAudio.off('audioFilePlaybackCompleted')
        this.audio.webAudio.destroy()
      }
      this.audio.webAudio = null
      this.audio.micConstraint = null
      this.audio.audioRoutingEnabled = false
      if (this.audio.micTrack) {
        this.audio.micTrack.stop()
        this.audio.micTrack = null
      }
      if (this.video.low) {
        this.video.low.destroy()
        this.video.low = null
      }
      this.video.videoSource = null
      if (this.video.cameraTrack) {
        this.video.cameraTrack.stop()
        this.video.cameraTrack = null
      }
      if (this.screen.screenVideoTrack) {
        this.screen.screenVideoTrack.stop()
        this.screen.screenVideoTrack = null
      }
      this.video.cameraConstraint = { video: {} }
      if (this.screenAudio.screenAudioTrack) {
        this.screenAudio.screenAudioTrack.stop()
        this.screenAudio.screenAudioTrack = null
      }
      this.audio.mixAudioConf = {
        index: 0,
        audioBuffer: {}, //云端音频buffer数组
        sounds: {}
      }
    }
    emptyStreamWith(this.audio.audioStream, null)
    emptyStreamWith(this.audio.musicStream, null)
    emptyStreamWith(this.audio.micStream, null)
    emptyStreamWith(this.screenAudio.screenAudioStream, null)
    emptyStreamWith(this.video.videoStream, null)
    emptyStreamWith(this.screen.screenVideoStream, null)
    emptyStreamWith(this.screenAudio.screenAudioStream, null)
  }

  updateWebAudio() {
    if (!this.audio.webAudio) {
      this.audio.webAudio = new WebAudio({
        mediaHelper: this,
        logger: this.logger
      })
      this.audio.webAudio.on(
        'audioFilePlaybackCompleted',
        this._audioFilePlaybackCompletedEvent.bind(this)
      )
      const musicTrack = this.audio.webAudio?.musicDestination?.stream.getAudioTracks()[0]
      if (musicTrack) {
        emptyStreamWith(this.audio.musicStream, musicTrack)
      }
    }
    this.audio.webAudio.updateTracks([
      { track: this.audio.micTrack || this.audio.audioSource, type: 'microphone' }
      //{track: this.screenAudio.screenAudioTrack || this.screenAudio.screenAudioSource, type: 'screenAudio'},
    ])
  }
  async getScreenSource(constraint: GetStreamConstraints) {
    const { width, height, frameRate } = this.screen.captureConfig.high
    try {
      let screenStream = await GUM.getScreenStream(
        {
          video: {
            width: {
              ideal: width
            },
            height: {
              ideal: height
            },
            frameRate: {
              ideal: frameRate,
              max: frameRate
            }
          }
        },
        this.logger
      )
      return screenStream
    } catch (e: any) {
      const mediaType = 'screen'
      if (
        e.message &&
        // 为什么这样写：
        // Safari和ios的提示是：The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
        // Chrome的提示是：Permission Denied. Permission Denied by system
        e.message.indexOf('ermission') > -1 &&
        e.message.indexOf('denied') > -1
      ) {
        this.stream.client.safeEmit('accessDenied', mediaType)
      } else if (e.message && e.message.indexOf('not found') > -1) {
        this.stream.client.safeEmit('notFound', mediaType)
      } else if (e.message && e.message.indexOf('not start video source') > -1) {
        this.stream.client.safeEmit('beOccupied', mediaType)
      } else {
        this.stream.client.safeEmit('deviceError', mediaType)
      }
      this.stream.emit('device-error', { type: mediaType, error: e })

      return Promise.reject(e)
    }
  }

  getTrackByMediaType(mediaType: MediaTypeShort) {
    if (mediaType === 'audio') {
      return this.audio.micTrack || this.audio.audioSource
    } else if (mediaType === 'audioSlave') {
      return this.screenAudio.screenAudioTrack || this.screenAudio.screenAudioSource
    } else if (mediaType === 'video') {
      return this.video.cameraTrack || this.video.videoSource
    } else if (mediaType === 'screen') {
      return this.screen.screenVideoTrack || this.screen.screenVideoSource
    } else {
      return null
    }
  }

  async getStream(constraint: GetStreamConstraints) {
    let {
      audio = false,
      audioDeviceId = '',
      video = false,
      videoDeviceId = '',
      screen = false,
      sourceId = '',
      screenAudio = false,
      facingMode = '',
      audioSource = null,
      videoSource = null,
      screenAudioSource = null,
      screenVideoSource = null,
      deviceId = ''
    } = constraint
    if (audioSource) {
      audio = true
    }
    if (videoSource) {
      video = true
    }
    if (screenVideoSource) {
      screen = true
    }
    if (screenAudioSource) {
      screenAudio = true
    }
    if (this.stream.isRemote) {
      this.logger.error('getStream: 远端流不能够调用getStream')
      return
    }
    if (!audio && !video && !screen && !screenAudio) {
      this.logger.error('getStream: 必须指定媒体类型')
      return
    }
    if (audioSource) {
      if (audioSource.readyState === 'ended') {
        this.logger.error('不应输入已经停止的轨道:', audioSource.kind, audioSource.label)
        return
      }
      watchTrack(audioSource)
      this.audio.audioSource = audioSource
      emptyStreamWith(this.audio.audioSourceStream, audioSource)
      this.updateWebAudio()
      if (!this.audio.audioRoutingEnabled) {
        if (this.getAudioInputTracks().length > 1) {
          this.enableAudioRouting()
        } else {
          emptyStreamWith(this.audio.audioStream, audioSource)
          this.updateAudioSender(audioSource)
        }
      }
      audio = false
      this.stream.client.updateRecordingAudioStream()
    }

    if (videoSource) {
      if (videoSource.readyState === 'ended') {
        this.logger.error('不应输入已经停止的轨道:', videoSource.kind, videoSource.label)
        return
      }
      watchTrack(videoSource)
      this.video.videoSource = videoSource
      emptyStreamWith(this.video.videoStream, videoSource)
      if (
        this.video.videoStream.getVideoTracks().length &&
        typeof this.video.encoderConfig.high.contentHint === 'string' &&
        // @ts-ignore
        this.video.videoStream.getVideoTracks()[0].contentHint !==
          this.video.encoderConfig.high.contentHint
      ) {
        this.logger.log(`应用 contentHint video high`, this.video.encoderConfig.high.contentHint)
        // @ts-ignore
        this.video.videoStream.getVideoTracks()[0].contentHint =
          this.video.encoderConfig.high.contentHint
      }
      video = false
    }

    if (screenAudioSource) {
      if (screenAudioSource.readyState === 'ended') {
        this.logger.error(
          '不应输入已经停止的轨道:',
          screenAudioSource.kind,
          screenAudioSource.label
        )
        return
      }
      watchTrack(screenAudioSource)
      this.screenAudio.screenAudioSource = screenAudioSource
      emptyStreamWith(this.screenAudio.screenAudioStream, screenAudioSource)
      this.listenToTrackEnded(this.screenAudio.screenAudioSource)
      emptyStreamWith(this.screenAudio.screenAudioStream, screenAudioSource)
      screenAudio = false
    }

    if (screenVideoSource) {
      if (screenVideoSource.readyState === 'ended') {
        this.logger.error(
          '不应输入已经停止的轨道:',
          screenVideoSource.kind,
          screenVideoSource.label
        )
        return
      }
      watchTrack(screenVideoSource)
      this.screen.screenVideoSource = screenVideoSource
      emptyStreamWith(this.screen.screenVideoStream, screenVideoSource)
      if (
        this.screen.screenVideoStream.getVideoTracks().length &&
        typeof this.screen.encoderConfig.high.contentHint === 'string' &&
        // @ts-ignore
        this.screen.screenVideoStream.getVideoTracks()[0].contentHint !==
          this.screen.encoderConfig.high.contentHint
      ) {
        this.logger.log(`应用 contentHint screen high`, this.screen.encoderConfig.high.contentHint)
        // @ts-ignore
        this.screen.screenVideoStream.getVideoTracks()[0].contentHint =
          this.screen.encoderConfig.high.contentHint
      }
      screen = false
    }

    try {
      if (screen) {
        const { width, height, frameRate } = this.screen.captureConfig.high

        if (sourceId) {
          const stream = await GUM.getStream(
            {
              video: {
                mandatory: {
                  maxWidth: width,
                  maxHeight: height,
                  maxFrameRate: frameRate,
                  minFrameRate: 5,
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sourceId
                }
              }
            },
            this.logger
          )
          const screenTrack = stream.getVideoTracks()[0]
          this.screen.screenVideoTrack = screenTrack
          emptyStreamWith(this.screen.screenVideoStream, screenTrack)
        } else {
          let gdmStream = await GUM.getScreenStream(
            {
              video: {
                width: {
                  ideal: width
                },
                height: {
                  ideal: height
                },
                frameRate: {
                  ideal: frameRate,
                  max: frameRate
                }
              },
              audio:
                screenAudio && this.getAudioConstraints('audioSlave')
                  ? this.getAudioConstraints('audioSlave')
                  : screenAudio
            },
            this.logger
          )
          this.screen.screenVideoTrack = gdmStream.getVideoTracks()[0]
          this.listenToTrackEnded(this.screen.screenVideoTrack)
          emptyStreamWith(this.screen.screenVideoStream, this.screen.screenVideoTrack)
          if (
            this.screen.screenVideoStream.getVideoTracks().length &&
            typeof this.screen.encoderConfig.high.contentHint === 'string' &&
            // @ts-ignore
            this.screen.screenVideoStream.getVideoTracks()[0].contentHint !==
              this.screen.encoderConfig.high.contentHint
          ) {
            this.logger.log(
              `应用 contentHint screen high`,
              this.screen.encoderConfig.high.contentHint
            )
            // @ts-ignore
            this.screen.screenVideoStream.getVideoTracks()[0].contentHint =
              this.screen.encoderConfig.high.contentHint
          }
          if (screenAudio) {
            const screenAudioTrack = gdmStream.getAudioTracks()[0]
            if (screenAudioTrack) {
              this.screenAudio.screenAudioTrack = screenAudioTrack
              emptyStreamWith(this.screenAudio.screenAudioStream, screenAudioTrack)
              this.listenToTrackEnded(screenAudioTrack)
              //屏幕共享音频走音频辅流
              /*this.updateWebAudio()
              if (!this.audio.audioRoutingEnabled){
                if (this.getAudioInputTracks().length > 1){
                  this.enableAudioRouting();
                }else{
                  emptyStreamWith(this.audio.audioStream, screenAudioTrack);
                  this.updateAudioSender(screenAudioTrack);
                }
              }*/
              this.stream.client.apiEventReport('setFunction', {
                name: 'pub_second_audio',
                oper: '1',
                value: JSON.stringify(
                  {
                    result: 'success',
                    constaints: this.getAudioConstraints('audioSlave')
                  },
                  null,
                  ' '
                )
              })
            } else {
              this.logger.warn('getStream screenAudio: 未获取到屏幕共享音频')
              //@ts-ignore
              this.stream.screenAudio = false
              this.stream.client.emit('error', 'screenAudioNotAllowed')
            }
          }
        }
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_screen',
          oper: '1',
          value: JSON.stringify(
            {
              result: 'success',
              constaints: {
                video: {
                  width: {
                    ideal: width
                  },
                  height: {
                    ideal: height
                  },
                  frameRate: {
                    ideal: frameRate,
                    max: frameRate
                  }
                },
                audio:
                  screenAudio && this.getAudioConstraints('audioSlave')
                    ? this.getAudioConstraints('audioSlave')
                    : screenAudio
              }
            },
            null,
            ' '
          )
        })
        if (audio) {
          let gumAudioStream = await GUM.getStream(
            {
              audio: this.getAudioConstraints('audio')
            },
            this.logger
          )
          this.audio.micTrack = gumAudioStream.getAudioTracks()[0]
          emptyStreamWith(this.audio.micStream, this.audio.micTrack)
          this.listenToTrackEnded(this.audio.micTrack)
          this.updateWebAudio()
          if (!this.audio.audioRoutingEnabled) {
            if (this.getAudioInputTracks().length > 1) {
              this.enableAudioRouting()
            } else {
              emptyStreamWith(this.audio.audioStream, this.audio.micTrack)
              this.updateAudioSender(this.audio.micTrack)
            }
          }
          const compatAudioSource = compatAudioInputList.findSource(this.audio.micTrack.id)
          if (compatAudioSource) {
            // 如果是启用了兼容模式的设备，则设备信息来自于 compatAudioSource
            this.audio.deviceInfo.mic.compatAudio = true
            const micSettings = compatAudioSource.getSettings()
            this.audio.deviceInfo.mic.label = compatAudioSource.label
            this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
            this.audio.deviceInfo.mic.groupId = micSettings.groupId
          } else {
            this.audio.deviceInfo.mic.compatAudio = false
            const micSettings = this.audio.micTrack.getSettings()
            this.audio.deviceInfo.mic.label = this.audio.micTrack.label
            this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
            this.audio.deviceInfo.mic.groupId = micSettings.groupId
          }
          this.stream.client.apiEventReport('setFunction', {
            name: 'set_mic',
            oper: '1',
            value: JSON.stringify(
              {
                result: 'success',
                constaints: this.getAudioConstraints('audio')
              },
              null,
              ' '
            )
          })
        }
      } else if (screenAudio) {
        // 阻止有screenAudio没screen的情况
        this.logger.error('无法单独获取屏幕共享音频')
      } else if (audio || video) {
        if (this.stream.isRemote) {
          this.logger.error('MediaHelper.getStream:远端流不能调用getStream')
          return
        }
        const { height, width, frameRate } = this.video.captureConfig.high
        let config: GUMConstaints = {
          audio:
            audio && this.getAudioConstraints('audio')
              ? this.getAudioConstraints('audio')
              : undefined,
          video: video
            ? {
                width: {
                  ideal: width
                },
                height: {
                  ideal: height
                },
                frameRate: {
                  ideal: frameRate || 15
                }
              }
            : undefined
        }
        if (audioDeviceId && config.audio) {
          config.audio.deviceId = {
            exact: audioDeviceId
          }
        }

        if (config.video) {
          if (facingMode) {
            config.video.facingMode = {
              exact: facingMode
            }
          } else if (videoDeviceId) {
            config.video.deviceId = {
              exact: videoDeviceId
            }
          }
        }

        const gumStream = await GUM.getStream(config, this.logger)
        const cameraTrack = gumStream.getVideoTracks()[0]
        const micTrack = gumStream.getAudioTracks()[0]
        if (micTrack) {
          this.audio.micTrack = micTrack
          this.listenToTrackEnded(this.audio.micTrack)
          emptyStreamWith(this.audio.micStream, this.audio.micTrack)
          this.updateWebAudio()
          if (!this.audio.audioRoutingEnabled) {
            if (this.getAudioInputTracks().length > 1) {
              this.enableAudioRouting()
            } else {
              emptyStreamWith(this.audio.audioStream, this.audio.micTrack)
              this.updateAudioSender(this.audio.micTrack)
            }
          }
          const compatAudioSource = compatAudioInputList.findSource(this.audio.micTrack.id)
          if (compatAudioSource) {
            // 如果是启用了兼容模式的设备，则设备信息来自于 compatAudioSource
            this.audio.deviceInfo.mic.compatAudio = true
            const micSettings = compatAudioSource.getSettings()
            this.audio.deviceInfo.mic.label = compatAudioSource.label
            this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
            this.audio.deviceInfo.mic.groupId = micSettings.groupId
          } else {
            this.audio.deviceInfo.mic.compatAudio = false
            const micSettings = this.audio.micTrack.getSettings()
            this.audio.deviceInfo.mic.label = this.audio.micTrack.label
            this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
            this.audio.deviceInfo.mic.groupId = micSettings.groupId
          }
          this.stream.client.apiEventReport('setFunction', {
            name: 'set_mic',
            oper: '1',
            value: JSON.stringify(
              {
                result: 'success',
                constaints: config.audio
              },
              null,
              ' '
            )
          })
          if (typeof config.audio === 'object') {
            this.audio.micConstraint = { audio: config.audio }
          }
          this.stream.client.updateRecordingAudioStream()
        }
        if (cameraTrack) {
          this.video.cameraTrack = cameraTrack
          emptyStreamWith(this.video.videoStream, cameraTrack)
          if (
            this.video.videoStream.getVideoTracks().length &&
            typeof this.video.encoderConfig.high.contentHint === 'string' &&
            // @ts-ignore
            this.video.videoStream.getVideoTracks()[0].contentHint !==
              this.video.encoderConfig.high.contentHint
          ) {
            this.logger.log(
              `应用 contentHint video high`,
              this.video.encoderConfig.high.contentHint
            )
            // @ts-ignore
            this.video.videoStream.getVideoTracks()[0].contentHint =
              this.video.encoderConfig.high.contentHint
          }
          this.listenToTrackEnded(this.video.cameraTrack)
          this.stream.client.apiEventReport('setFunction', {
            name: 'set_camera',
            oper: '1',
            value: JSON.stringify({
              result: 'success',
              constaints: config.video
            })
          })
          if (typeof config.video === 'object') {
            this.video.cameraConstraint = { video: config.video }
          }
        }
      }
      this.assertLive()
    } catch (e: any) {
      this.logger.error('getStream error:', e.name, e.message)

      let mediaType = 'audio'
      if (audio) {
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_mic',
          oper: '1',
          value: JSON.stringify(
            {
              result: 'fail',
              reason: `${e.name} + ${e.message}`
            },
            null,
            ' '
          )
        })
      }
      if (video) {
        mediaType = 'video'
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_camera',
          oper: '1',
          value: JSON.stringify(
            {
              result: 'fail',
              reason: `${e.name} + ${e.message}`
            },
            null,
            ' '
          )
        })
      }
      if (screen) {
        mediaType = 'screen'
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_screen',
          oper: '1',
          value: JSON.stringify(
            {
              result: 'fail',
              reason: `${e.name} + ${e.message}`
            },
            null,
            ' '
          )
        })
      }
      if (e.name === 'NotAllowedError') {
        this.stream.client.safeEmit('accessDenied', mediaType)
      } else if (e.name === 'NotFoundError') {
        this.stream.client.safeEmit('notFound', mediaType)
      } else if (e.name === 'NotReadableError') {
        this.stream.client.safeEmit('beOccupied', mediaType)
      } else if (e.name === 'OverconstrainedError') {
        this.stream.client.safeEmit('deviceError', mediaType)
      }
      this.stream.emit('device-error', { type: mediaType, error: e })
      this.stream.client.apiEventReport('setStreamException', {
        name: 'pushStreamException',
        value: `getUserMediaError: ${e.name} + ${e.message}`,
        mediaType
      })
      return Promise.reject(e)
    }
  }

  async getSecondStream(constraint: GUMConstaints) {
    let { audio = false, video = false } = constraint
    if (this.stream.isRemote) {
      return
    }

    try {
      const gumStream = await GUM.getStream(constraint, this.logger)
      const audioTrack = gumStream.getAudioTracks()[0]
      const videoTrack = gumStream.getVideoTracks()[0]
      this.logger.log(
        `getSecondStream: ${audioTrack ? audioTrack.label : ''} ${
          videoTrack ? videoTrack.label : ''
        }`
      )
      if (audioTrack) {
        if (typeof constraint.audio === 'object') {
          this.audio.micConstraint = { audio: constraint.audio }
        }
        this.audio.micTrack = audioTrack
        this._stopTrack(this.audio.micStream)
        emptyStreamWith(this.audio.micStream, this.audio.micTrack)
        this.listenToTrackEnded(this.audio.micTrack)
        this.updateWebAudio()
        if (!this.audio.audioRoutingEnabled) {
          if (this.getAudioInputTracks().length > 1) {
            this.enableAudioRouting()
          } else {
            emptyStreamWith(this.audio.audioStream, this.audio.micTrack)
            this.updateAudioSender(this.audio.micTrack)
          }
        }
        const compatAudioSource = compatAudioInputList.findSource(this.audio.micTrack.id)
        if (compatAudioSource) {
          // 如果是启用了兼容模式的设备，则设备信息来自于 compatAudioSource
          this.audio.deviceInfo.mic.compatAudio = true
          const micSettings = compatAudioSource.getSettings()
          this.audio.deviceInfo.mic.label = compatAudioSource.label
          this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
          this.audio.deviceInfo.mic.groupId = micSettings.groupId
        } else {
          this.audio.deviceInfo.mic.compatAudio = false
          const micSettings = this.audio.micTrack.getSettings()
          this.audio.deviceInfo.mic.label = this.audio.micTrack.label
          this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
          this.audio.deviceInfo.mic.groupId = micSettings.groupId
        }
        this.stream.client.updateRecordingAudioStream()
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_mic',
          oper: '1',
          value: JSON.stringify(
            {
              result: 'success',
              constaints: constraint.audio
            },
            null,
            ' '
          )
        })
      }

      if (videoTrack) {
        if (typeof constraint.video === 'object') {
          this.video.cameraConstraint = { video: constraint.video }
        }
        this.video.cameraTrack = videoTrack
        this._stopTrack(this.video.videoStream)
        emptyStreamWith(this.video.videoStream, this.video.cameraTrack)
        if (
          this.video.videoStream.getVideoTracks().length &&
          typeof this.video.encoderConfig.high.contentHint === 'string' &&
          // @ts-ignore
          this.video.videoStream.getVideoTracks()[0].contentHint !==
            this.video.encoderConfig.high.contentHint
        ) {
          this.logger.log(`应用 contentHint video high`, this.video.encoderConfig.high.contentHint)
          // @ts-ignore
          this.video.videoStream.getVideoTracks()[0].contentHint =
            this.video.encoderConfig.high.contentHint
        }

        this.stream.client.apiEventReport('setFunction', {
          name: 'set_camera',
          oper: '1',
          value: JSON.stringify(
            {
              result: 'success',
              constaints: constraint.video
            },
            null,
            ' '
          )
        })
        const videoView = this.stream._play.video.view
        if (videoView) {
          await this.stream.play(videoView)
          if ('width' in this.stream.renderMode.local.video) {
            this.stream.setLocalRenderMode(this.stream.renderMode.local.video, 'video')
          }
        }
        const videoSender = this.stream.getSender('video', 'high')
        if (videoSender?.track) {
          videoSender.replaceTrack(videoTrack)
        } else {
          this.logger.warn('getSecondStream video: 此时未发布流')
        }
      }
    } catch (e: any) {
      this.logger.error('getStream error', e.message)
      const name = audio ? 'set_mic' : 'set_camera'
      this.stream.client.apiEventReport('setFunction', {
        name,
        oper: '1',
        value: JSON.stringify(
          {
            result: 'fail',
            reason: e.message
          },
          null,
          ' '
        )
      })
      return Promise.reject(e)
    }
  }

  convert(options: { resolution: NERTC_VIDEO_QUALITY_ENUM; frameRate: VIDEO_FRAME_RATE_ENUM }) {
    const resolution = options.resolution
    const frameRate = options.frameRate
    let result = {
      width: 640,
      height: 480,
      frameRate: 15
    }
    if (resolution === 2) {
      result.width = 320
      result.height = 180
    } else if (resolution === 4) {
      result.width = 640
      result.height = 480
    } else if (resolution === 8 || env.IS_IOS_SAFARI) {
      //ios端safari浏览器，1080P分辨率的视频编码发送异常，这里修改为720P
      result.width = 1280
      result.height = 720
    } else if (resolution === 16) {
      result.width = 1920
      result.height = 1080
    }

    if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_NORMAL) {
      result.frameRate = 15
    } else if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_5) {
      result.frameRate = 5
    } else if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_10) {
      result.frameRate = 10
    } else if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_15) {
      result.frameRate = 15
    } else if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_20) {
      result.frameRate = 20
    } else if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_25) {
      result.frameRate = 25
    } else if (frameRate === VIDEO_FRAME_RATE_ENUM.CHAT_VIDEO_FRAME_RATE_30) {
      result.frameRate = 30
    }
    return result
  }

  getAudioConstraints(mediaType: 'audio' | 'audioSlave'): GUMAudioConstraints | undefined {
    if (this.stream.isRemote) {
      this.logger.error('Remote Stream dont have audio constraints')
      return
    }
    //@ts-ignore
    const audioProcessing = this.stream.audioProcessing
    let constraint: GUMAudioConstraints = {
      channelCount: mediaType === 'audio' ? 1 : 2
    }
    if (audioProcessing) {
      if (typeof audioProcessing.AEC !== 'undefined') {
        constraint.echoCancellation = audioProcessing.AEC
        constraint.googEchoCancellation = audioProcessing.AEC
        constraint.googEchoCancellation2 = audioProcessing.AEC
      }
      if (typeof audioProcessing.ANS !== 'undefined') {
        constraint.noiseSuppression = audioProcessing.ANS
        constraint.googNoiseSuppression = audioProcessing.ANS
        constraint.googNoiseSuppression2 = audioProcessing.ANS
      }
      if (typeof audioProcessing.AGC !== 'undefined') {
        constraint.autoGainControl = audioProcessing.AGC
        constraint.googAutoGainControl = audioProcessing.AGC
        constraint.googAutoGainControl2 = audioProcessing.AGC
      }
    }
    if (mediaType === 'audioSlave') {
      // 屏幕共享默认关闭3A
      if (typeof constraint.echoCancellation === 'undefined') {
        constraint.echoCancellation = false
      }
      if (typeof constraint.noiseSuppression === 'undefined') {
        constraint.noiseSuppression = false
      }
      if (typeof constraint.autoGainControl === 'undefined') {
        constraint.autoGainControl = false
      }
    }
    //@ts-ignore
    switch (this.stream.audioProfile) {
      case 'standard_stereo':
      case 'high_quality_stereo':
        constraint.googAutoGainControl = false
        constraint.googAutoGainControl2 = false
        //测试发现需要关闭回声消除，编码双声道才生效
        constraint.echoCancellation = false
        constraint.googNoiseSuppression = false
        constraint.channelCount = 2
        //关闭AEC
        /*constraint.echoCancellation = false;
        //constraint.googEchoCancellation = false;
        //constraint.googEchoCancellation2 = false;
        //关闭ANS
        //constraint.noiseSuppression = false;
        constraint.googNoiseSuppression = false;
        //constraint.googNoiseSuppression2 = false;
        //关闭AGC
        //constraint.autoGainControl = false;
        constraint.googAutoGainControl = false;
        constraint.googAutoGainControl2 = false;*/
        break
    }
    return constraint
  }

  getTrackSettings() {
    const settings: any = {}
    try {
      if (this.audio.micTrack) {
        const track = compatAudioInputList.findSource(this.audio.micTrack.id)
        if (track) {
          settings.mic = {
            compat: true,
            settings: track.getSettings(),
            label: track.label,
            readyState: track.readyState
          }
        } else {
          settings.mic = {
            settings: this.audio.micTrack.getSettings(),
            label: this.audio.micTrack.label,
            readyState: this.audio.micTrack.readyState
          }
        }
      }
      if (this.audio.audioSource) {
        settings.audioSource = {
          settings: this.audio.audioSource.getSettings(),
          label: this.audio.audioSource.label,
          readyState: this.audio.audioSource.readyState
        }
      }

      if (this.video.cameraTrack) {
        settings.camera = {
          settings: this.video.cameraTrack.getSettings(),
          label: this.video.cameraTrack.label,
          readyState: this.video.cameraTrack.readyState
        }
      }
      if (this.video.videoSource) {
        settings.videoSource = {
          settings: this.video.videoSource.getSettings(),
          label: this.video.videoSource.label,
          readyState: this.video.videoSource.readyState
        }
      }

      if (this.screen.screenVideoTrack) {
        settings.screen = {
          settings: this.screen.screenVideoTrack.getSettings(),
          label: this.screen.screenVideoTrack.label,
          readyState: this.screen.screenVideoTrack.readyState
        }
      }
      if (this.screen.screenVideoSource) {
        settings.screenVideoSource = {
          settings: this.screen.screenVideoSource.getSettings(),
          label: this.screen.screenVideoSource.label,
          readyState: this.screen.screenVideoSource.readyState
        }
      }

      if (this.screenAudio.screenAudioTrack) {
        settings.screenAudio = {
          settings: this.screenAudio.screenAudioTrack.getSettings(),
          label: this.screenAudio.screenAudioTrack.label,
          readyState: this.screenAudio.screenAudioTrack.readyState
        }
      }
      if (this.screenAudio.screenAudioSource) {
        settings.screenAudioSource = {
          settings: this.screenAudio.screenAudioSource.getSettings(),
          label: this.screenAudio.screenAudioSource.label,
          readyState: this.screenAudio.screenAudioSource.readyState
        }
      }
      if (Device.deviceHistory.audioOut[0]) {
        settings.audioOutDefault = Device.deviceHistory.audioOut[0]
      }
    } catch (e: any) {
      settings.errName = e.name
      settings.errMessage = e.message
    }
    return settings
  }

  // 仅在remoteStream
  updateStream(kind: MediaTypeShort, track: MediaStreamTrack | null) {
    if (kind === 'audio') {
      this.audio.micTrack = track
      emptyStreamWith(this.audio.audioStream, track)
      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play.audio.dom) {
        this.stream._play.audio.dom.srcObject = this.audio.audioStream
      }
    } else if (kind === 'audioSlave') {
      this.screenAudio.screenAudioTrack = track
      emptyStreamWith(this.screenAudio.screenAudioStream, track)
      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play.audioSlave.dom) {
        this.stream._play.audioSlave.dom.srcObject = this.screenAudio.screenAudioStream
      }
    } else if (kind === 'video') {
      this.video.cameraTrack = track
      emptyStreamWith(this.video.videoStream, track)
      if (
        this.video.videoStream.getVideoTracks().length &&
        typeof this.video.encoderConfig.high.contentHint === 'string' &&
        // @ts-ignore
        this.video.videoStream.getVideoTracks()[0].contentHint !==
          this.video.encoderConfig.high.contentHint
      ) {
        this.logger.log(`应用 contentHint video high`, this.video.encoderConfig.high.contentHint)
        // @ts-ignore
        this.video.videoStream.getVideoTracks()[0].contentHint =
          this.video.encoderConfig.high.contentHint
      }

      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play.video.dom) {
        this.stream._play.video.dom.srcObject = this.video.renderStream
      }
    } else if (kind === 'screen') {
      this.screen.screenVideoTrack = track
      emptyStreamWith(this.screen.screenVideoStream, track)
      if (
        this.screen.screenVideoStream.getVideoTracks().length &&
        typeof this.screen.encoderConfig.high.contentHint === 'string' &&
        // @ts-ignore
        this.screen.screenVideoStream.getVideoTracks()[0].contentHint !==
          this.screen.encoderConfig.high.contentHint
      ) {
        this.logger.log(`应用 contentHint screen high`, this.screen.encoderConfig.high.contentHint)
        // @ts-ignore
        this.screen.screenVideoStream.getVideoTracks()[0].contentHint =
          this.screen.encoderConfig.high.contentHint
      }
      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play.screen.dom) {
        this.stream._play.screen.dom.srcObject = this.screen.renderStream
      }
    }
  }

  stopStream(kind: MediaTypeShort | 'screenAudio') {
    let type = 'set_mic'
    if (kind === 'audio') {
      this.audio.micTrack?.stop()
      this.audio.micTrack = null
      emptyStreamWith(this.audio.micStream, null)
      this.audio.audioSource = null
      emptyStreamWith(this.audio.audioSourceStream, null)
      this.updateWebAudio()
      if (this.canDisableAudioRouting()) {
        this.disableAudioRouting()
      }
    } else if (kind === 'screenAudio') {
      this.screenAudio.screenAudioTrack?.stop()
      this.screenAudio.screenAudioTrack = null
      this.screenAudio.screenAudioSource = null
      emptyStreamWith(this.screenAudio.screenAudioStream, null)
      /*this.updateWebAudio();
      if (this.canDisableAudioRouting()){
        this.disableAudioRouting();
      }*/
      type = 'pub_second_audio'
    } else if (kind === 'video') {
      type = 'set_camera'
      this.video.cameraTrack?.stop()
      this.video.cameraTrack = null
      emptyStreamWith(this.video.videoStream, null)
    } else if (kind === 'screen') {
      type = 'set_screen'
      this.screen.screenVideoTrack?.stop()
      this.screen.screenVideoTrack = null
      emptyStreamWith(this.screen.screenVideoStream, null)
    }
    this.stream.client.apiEventReport('setFunction', {
      name: type,
      oper: '0',
      value: 'success'
    })
  }

  _stopTrack(stream: MediaStream) {
    if (!stream) return
    if (this.stream.isRemote) return
    this.logger.log('清除stream: ', stream)
    const tracks = stream.getTracks()
    this.logger.log('清除stream: ', ...tracks)
    if (!tracks || tracks.length === 0) return
    tracks.forEach((track) => {
      if (track.kind === 'audio') {
        const globalTrackId = getParameters().tracks.audio.findIndex((mediaTrack) => {
          return track === mediaTrack
        })
        Logger.warn(
          `Stopping AUDIOTRACK#${globalTrackId} ${track.id}, ${track.label}, ${track.readyState}`
        )
      } else {
        const globalTrackId = getParameters().tracks.video.findIndex((mediaTrack) => {
          return track === mediaTrack
        })
        Logger.warn(
          `Stopping VIDEOTRACK#${globalTrackId} ${track.id}, ${track.label}, ${track.readyState}`
        )
      }
      track.stop()
      stream.removeTrack(track)
      if (this.audio.micTrack === track) {
        this.audio.micTrack = null
        this.audio.deviceInfo.mic = { compatAudio: compatAudioInputList.enabled, label: '' }
        this.updateWebAudio()
      }
      if (this.screenAudio.screenAudioTrack === track) {
        this.screenAudio.screenAudioTrack = null
        this.updateWebAudio()
      }
      if (this.video.cameraTrack === track) {
        this.video.cameraTrack = null
      }
      if (this.screen.screenVideoTrack === track) {
        this.screen.screenVideoTrack = null
      }
    })
  }

  getAudioTrack() {
    return this.audio?.audioStream.getAudioTracks()[0]
  }

  getVideoTrack() {
    return this.video?.videoStream.getVideoTracks()[0]
  }

  /**
   * 设置本地音频采集音量
   * @param {Number} gain 0-1
   */
  setGain(gain: number, audioType?: MediaTypeAudio) {
    if (this.audio.webAudio) {
      this.logger.log('setGain', gain)
      this.audio.webAudio.setGain(gain, audioType)
      if (this.canDisableAudioRouting()) {
        this.disableAudioRouting()
      }
    } else {
      this.logger.log('setGain: 缺失本地音频')
      return
    }
  }

  getGain() {
    return this.audio.webAudio?.getVolumeData() || '0.0'
  }

  canDisableAudioRouting() {
    let isMixAuidoCompleted = true
    if (!this.audio.webAudio) return false

    //判断是否开启了AI降噪
    if (this.audio.stageAIProcessing?.enabled) {
      return false
    }

    //判断伴音是否都已经结束了
    if (
      this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PLAYED ||
      this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED
    ) {
      isMixAuidoCompleted = false
    }

    //判断音效是否都已经结束了
    Object.values(this.audio.mixAudioConf.sounds).forEach((item) => {
      if (item.state === 'STARTING' || item.state === 'PLAYED' || item.state === 'PAUSED') {
        isMixAuidoCompleted = false
        return
      }
    })

    //判断音量是不是1
    const minGain = this.audio.webAudio.getGainMin()

    //判断麦克风和屏幕共享是不是最多只有一个

    return isMixAuidoCompleted && minGain === 1 && this.audio.webAudio.audioInArr.length <= 1
  }

  /******************************* 伴音 ********************************/

  _audioFilePlaybackCompletedEvent() {
    if (this.canDisableAudioRouting()) {
      this.disableAudioRouting()
    }
  }

  startAudioMixing(options: AudioMixingOptions) {
    this.logger.log(`开始伴音:`, JSON.stringify(options, null, ' '))
    Object.assign(this.audio.mixAudioConf, options)
    let reason, message
    if (!this.audio.mixAudioConf.audioFilePath) {
      message = 'startAudioMixing() 没有设置云端文件路径'
      reason = ErrorCode.AUDIO_MIX_FILE_ERROR
    } else if (this.getAudioInputTracks().length === 0 || !this.stream.pubStatus.audio.audio) {
      message = 'startAudioMixing() 当前没有开启过麦克风'
      reason = ErrorCode.AUDIO_MIX_NO_AUDIO
    } else if (!this.audio.webAudio || !this.audio.webAudio.context) {
      message = 'startAudioMixing() 浏览器环境不支持伴音'
      reason = ErrorCode.AUDIO_MIX_NO_SUPPORT
    }

    if (reason) {
      this.logger.error(message)
      this.stream.client.apiFrequencyControl({
        name: 'startAudioMixing',
        code: -1,
        param: JSON.stringify(
          Object.assign(this.audio.mixAudioConf, {
            reason: reason
          }),
          null,
          ' '
        )
      })
      return Promise.reject(
        new RtcError({
          code: reason,
          message
        })
      )
    }

    this.stream.client.apiFrequencyControl({
      name: 'startAudioMixing',
      code: 0,
      param: JSON.stringify(this.audio.mixAudioConf, null, ' ')
    })

    if (this.audio.webAudio) {
      if (
        this.audio.webAudio.mixAudioConf &&
        this.audio.webAudio.mixAudioConf.audioSource &&
        this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PLAYED
      ) {
        this.logger.log('startAudioMixing() 当前已经开启伴音，先关闭之前的伴音')
        this.stopAudioMixing()
      }

      this.audio.webAudio.mixAudioConf.state === AuidoMixingState.STARTING
    }
    if (
      this.audio.mixAudioConf.audioFilePath &&
      this.audio.mixAudioConf.audioBuffer[this.audio.mixAudioConf.audioFilePath]
    ) {
      this.logger.log('startAudioMixing() 开始伴音, 已经加载过云端音乐')
      return this.startMix(this.audio.mixAudioConf.index)
    } else {
      this.logger.log('startAudioMixing() 开始伴音, 先加载云端音乐')
      return this.loadRemoteAudioFile(this.audio.mixAudioConf.index)
    }
  }

  /*
    加载云端音频文件
   */
  loadRemoteAudioFile(index: number) {
    const url = this.audio.mixAudioConf.audioFilePath
    if (!url) {
      this.logger.warn('loadRemoteAudioFile() audioFilePath未设置')
      return Promise.resolve()
    }
    return ajax({
      url,
      type: 'GET',
      dataType: 'arraybuffer'
    })
      .then((data) => {
        this.logger.log('loadRemoteAudioFile 加载云端音乐成功')
        return new Promise((resolve, reject) => {
          this.audio.webAudio?.context?.decodeAudioData(
            data as ArrayBuffer,
            (buffer) => {
              this.logger.log('loadRemoteAudioFile 云端音乐解码成功')
              this.audio.mixAudioConf.audioBuffer[url] = buffer
              this.startMix(index)?.then((res) => {
                resolve(res)
              })
            },
            (e) => {
              reject(
                new RtcError({
                  code: ErrorCode.AUDIO_MIX_FILE_ERROR,
                  message: `loadRemoteAudioFile: 云端音乐解码失败: ${e.message}`
                })
              )
            }
          )
        })
      })
      .catch((error) => {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.AUDIO_MIX_FILE_ERROR,
            message: `loadRemoteAudioFile: 加载云端音乐失败: ${error.name} ${error.message}`
          })
        )
      })
  }

  listenToTrackEnded = (track: MediaStreamTrack | null) => {
    if (!track) {
      return
    }
    track.addEventListener('ended', () => {
      this.logger.log('Track ended', track.label, track.id)
      if (this.stream !== this.stream.client.adapterRef.localStream) {
        return
      }
      if (track === this.audio.micTrack || track === this.audio.audioSource) {
        //停止的原因可能是设备拔出、取消授权等
        this.logger.warn('音频轨道已停止')
        this.stream.client.safeEmit('audioTrackEnded')
        this.stream.client.apiEventReport('setStreamException', {
          name: 'pushStreamException',
          value: 'audioTrackEnded',
          mediaType: 'audio'
        })
      }
      if (track === this.video.cameraTrack || track === this.video.videoSource) {
        //停止的原因可能是设备拔出、取消授权等
        this.logger.warn('视频轨道已停止')
        this.stream.client.safeEmit('videoTrackEnded')
        this.stream.client.apiEventReport('setStreamException', {
          name: 'pushStreamException',
          value: 'videoTrackEnded',
          mediaType: 'video'
        })
      }
      // 分别处理 Chrome 共享屏幕中的“整个屏幕”、“窗口”、“Chrome标签页”
      if (
        track === this.screen.screenVideoTrack ||
        track === this.screen.screenVideoSource ||
        track.label.indexOf('screen') > -1 ||
        track.label.indexOf('window') > -1 ||
        track.label.indexOf('web-') > -1
      ) {
        this.logger.warn('屏幕共享已停止')
        this.stream.client.safeEmit('stopScreenSharing')
        this.stream.client.apiEventReport('setStreamException', {
          name: 'pushStreamException',
          value: 'videoTrackEnded',
          mediaType: 'screen'
        })
      }
      if (track === this.screenAudio.screenAudioTrack) {
        this.logger.warn('屏幕共享音频已停止')
        this.stream.client.safeEmit('stopScreenAudio')
        this.stream.client.apiEventReport('setStreamException', {
          name: 'pushStreamException',
          value: 'stopScreenAudio',
          mediaType: 'screenAudio'
        })
      }
    })
  }

  /*
    开始混音流程
   */
  startMix(index: number) {
    this.logger.log('startMix 开始混音:', JSON.stringify(this.audio.mixAudioConf))
    if (index !== this.audio.mixAudioConf.index) {
      this.logger.log('startMix: 该次伴音已经取消')
      return Promise.resolve()
    }
    if (!this.audio.audioRoutingEnabled) {
      this.enableAudioRouting()
    }
    const {
      audioFilePath = '',
      loopback = false,
      replace = false,
      cycle = 0,
      playStartTime = 0,
      volume = 255,
      auidoMixingEnd = null
    } = this.audio.mixAudioConf
    return this.audio.webAudio?.startMix({
      buffer: this.audio.mixAudioConf.audioBuffer[audioFilePath],
      loopback,
      replace,
      cycle,
      playStartTime,
      volume,
      auidoMixingEnd
    })
  }

  /*
    停止混音
  */
  stopAudioMixing(isFinished = true) {
    if (!this.audio.webAudio?.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.error('stopAudioMixing() 当前没有开启伴音')
      this.stream.client.apiFrequencyControl({
        name: 'stopAudioMixing',
        code: -1,
        param: JSON.stringify(
          Object.assign(this.audio.mixAudioConf, {
            reason: 'stopAudioMixing() 当前没有开启伴音'
          }),
          null,
          ' '
        )
      })
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_MIX_NOT_STATE_ERROR,
          message: 'stopAudioMixing() 当前没有开启伴音'
        })
      )
    }
    this.stream.client.apiFrequencyControl({
      name: 'stopAudioMixing',
      code: 0,
      param: JSON.stringify(this.audio.mixAudioConf, null, ' ')
    })
    return this.audio.webAudio!.stopAudioMixing(isFinished)
  }
  /*
    暂停混音
   */
  pauseAudioMixing() {
    let reason = null
    if (
      !this.audio.webAudio?.mixAudioConf ||
      !this.audio.webAudio.mixAudioConf.audioSource ||
      this.audio.webAudio.mixAudioConf.state !== AuidoMixingState.PLAYED
    ) {
      this.logger.error('pauseAudioMixing() 当前没有开启伴音')
      this.stream.client.apiFrequencyControl({
        name: 'pauseAudioMixing',
        code: -1,
        param: JSON.stringify(
          Object.assign(this.audio.mixAudioConf, {
            reason: 'pauseAudioMixing() 当前没有开启伴音'
          }),
          null,
          ' '
        )
      })
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_MIX_NOT_STATE_ERROR,
          message: 'pauseAudioMixing() 当前没有开启伴音'
        })
      )
    }
    this.stream.client.apiFrequencyControl({
      name: 'pauseAudioMixing',
      code: 0,
      param: JSON.stringify(this.audio.mixAudioConf, null, ' ')
    })
    return this.audio.webAudio && this.audio.webAudio.pauseAudioMixing()
  }

  /*
    恢复混音
   */
  resumeAudioMixing() {
    let reason, message
    if (!this.audio.webAudio?.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      message = 'resumeAudioMixing() 当前没有开启伴音'
      reason = ErrorCode.AUDIO_MIX_NOT_STATE_ERROR
    } else if (this.audio.webAudio.mixAudioConf.state !== AuidoMixingState.PAUSED) {
      message = 'resumeAudioMixing() 当前没有暂停伴音'
      reason = ErrorCode.AUDIO_MIX_NOT_PAUSE
    }
    this.stream.client.apiFrequencyControl({
      name: 'resumeAudioMixing',
      code: reason ? -1 : 0,
      param: JSON.stringify(
        Object.assign(this.audio.mixAudioConf, {
          reason: message || ''
        }),
        null,
        ' '
      )
    })
    if (reason) {
      this.logger.error(message)
      return Promise.reject(
        new RtcError({
          code: reason,
          message
        })
      )
    }

    if (!this.audio.webAudio) {
      return
    }
    let {
      audioFilePath = '',
      loopback = false,
      replace = false,
      cycle = 0,
      playStartTime = 0,
      auidoMixingEnd = null
    } = this.audio.mixAudioConf
    let playedTime =
      (this.audio.webAudio.mixAudioConf.pauseTime - this.audio.webAudio.mixAudioConf.startTime) /
        1000 +
      this.audio.webAudio.mixAudioConf.playStartTime
    if (playedTime > this.audio.webAudio.mixAudioConf.totalTime) {
      this.logger.log(
        '播放过的圈数 playedCycle: ',
        Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime)
      )
      cycle = cycle - Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime)
      this.audio.mixAudioConf.cycle = cycle
    }
    if (this.audio.webAudio.mixAudioConf.setPlayStartTime) {
      this.logger.log(
        '暂停期间，用户设置混音播放时间: ',
        this.audio.webAudio.mixAudioConf.setPlayStartTime
      )
      playStartTime = this.audio.webAudio.mixAudioConf.setPlayStartTime
      this.audio.webAudio.mixAudioConf.setPlayStartTime = 0
    } else {
      this.logger.log('恢复混音:', JSON.stringify(this.audio.webAudio.mixAudioConf))
      this.logger.log('已经播放的时间: ', playedTime)
      if (playedTime > this.audio.webAudio.mixAudioConf.totalTime) {
        playedTime = playedTime % this.audio.webAudio.mixAudioConf.totalTime
      }
      playStartTime = playedTime
    }
    this.logger.log('回复重置的时间点：', playStartTime)
    return this.audio.webAudio.resumeAudioMixing({
      buffer: this.audio.mixAudioConf.audioBuffer[audioFilePath],
      loopback,
      replace,
      cycle,
      playStartTime,
      auidoMixingEnd
    })
  }

  /*
    设置混音音量
  */
  setAudioMixingVolume(volume: number) {
    let reason, message
    if (!this.audio.webAudio?.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      message = 'adjustAudioMixingVolume() 当前没有开启伴音'
      reason = ErrorCode.AUDIO_MIX_NOT_STATE_ERROR
    } else if (!Number.isInteger(volume) || volume < 0 || volume > 255) {
      message = 'adjustAudioMixingVolume() volume应该是1-255的number类型'
      reason = ErrorCode.AUDIO_MIX_VOLUME_ERROR
    }
    this.stream.client.apiFrequencyControl({
      name: 'adjustAudioMixingVolume',
      code: reason ? -1 : 0,
      param: JSON.stringify(
        Object.assign(this.audio.mixAudioConf, {
          reason: message || '',
          volume
        }),
        null,
        ' '
      )
    })
    if (reason) {
      this.logger.error(message)
      return Promise.reject(
        new RtcError({
          code: reason,
          message
        })
      )
    }
    return this.audio.webAudio && this.audio.webAudio.setAudioMixingVolume(volume)
  }

  setAudioMixingPlayTime(playTime: number) {
    let reason, message
    if (!this.audio.webAudio?.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      message = 'setAudioMixingPosition(): 当前没有开启伴音'
      reason = ErrorCode.AUDIO_MIX_NOT_STATE_ERROR
    } else if (playTime < 0) {
      message = 'setAudioMixingPosition(): 设置的playStartTime 小于 0 了'
      reason = ErrorCode.AUDIO_MIX_PLAY_START_TIME_ERROR
    } else if (playTime >= this.audio.webAudio.mixAudioConf.totalTime) {
      message = 'setAudioMixingPosition(): 设置的playStartTime大于音频文件总时长了'
      reason = ErrorCode.AUDIO_MIX_PLAY_START_TIME_ERROR
    } else if (this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED) {
      this.audio.webAudio.mixAudioConf.setPlayStartTime = playTime
      this.logger.log(
        'setAudioMixingPosition() 当前正在暂停，记录设置的播发位置，在恢复伴音时，跳转到此次设置的播放位置: ',
        playTime
      )
      return Promise.resolve()
    }
    this.stream.client.apiFrequencyControl({
      name: 'setAudioMixingPosition',
      code: reason ? -1 : 0,
      param: JSON.stringify(
        {
          playTime: playTime,
          reason: message || ''
        },
        null,
        ' '
      )
    })
    if (reason) {
      this.logger.error(message)
      return Promise.reject(
        new RtcError({
          code: reason,
          message
        })
      )
    }

    return new Promise((resolve, reject) => {
      this.stopAudioMixing(false)
        .then((res) => {
          if (!this.audio.webAudio) {
            return
          }
          this.audio.mixAudioConf.playStartTime = playTime
          let {
            audioFilePath = '',
            loopback = false,
            replace = false,
            cycle = 0,
            playStartTime = 0,
            auidoMixingEnd = null
          } = this.audio.mixAudioConf
          this.logger.log('设置混音的播放位置:', this.audio.webAudio.mixAudioConf)
          let currentTime = Date.now()
          let playedTime =
            (currentTime - this.audio.webAudio.mixAudioConf.startTime) / 1000 +
            this.audio.webAudio.mixAudioConf.playStartTime
          this.logger.log('已经播放的时间: ', playedTime)
          if (playedTime > this.audio.webAudio.mixAudioConf.totalTime) {
            this.logger.log(
              '播放过的圈数 playedCycle: ',
              Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime)
            )
            cycle = cycle - Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime)
            this.audio.mixAudioConf.cycle = cycle
          }
          this.logger.log(`setAudioMixingPlayTime, playTime: ${playTime}, cycle: ${cycle}`)
          this.audio.webAudio
            .setAudioMixingPlayTime({
              buffer: this.audio.mixAudioConf.audioBuffer[audioFilePath],
              loopback: loopback,
              replace: replace,
              cycle: cycle,
              playStartTime: playStartTime,
              auidoMixingEnd: auidoMixingEnd
            })
            .then((res) => {
              this.stream.client.apiFrequencyControl({
                name: 'setAudioMixingPosition',
                code: 0,
                param: JSON.stringify(
                  {
                    playTime: playTime
                  },
                  null,
                  ' '
                )
              })
              resolve(res)
            })
            .catch((err) => {
              this.stream.client.apiFrequencyControl({
                name: 'setAudioMixingPosition',
                code: -1,
                param: JSON.stringify(
                  {
                    playTime: playTime,
                    reason: '重新播放伴音失败' + err.message
                  },
                  null,
                  ' '
                )
              })
              reject(err)
            })
        })
        .catch((err) => {
          this.stream.client.apiFrequencyControl({
            name: 'setAudioMixingPosition',
            code: -1,
            param: JSON.stringify(
              {
                playTime: playTime,
                reason: '暂停当前播放失败' + err.message
              },
              null,
              ' '
            )
          })
          return Promise.reject(err)
        })
    })
  }

  getAudioMixingPlayedTime() {
    if (!this.audio.webAudio?.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('getAudioMixingCurrentPosition() 当前没有开启伴音')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_MIX_NOT_STATE_ERROR,
          message: 'getAudioMixingCurrentPosition() 当前没有开启伴音'
        })
      )
    }
    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingCurrentPosition',
      code: 0,
      param: JSON.stringify(
        {
          playTime: this.audio.webAudio.getAudioMixingPlayedTime()?.playedTime
        },
        null,
        ' '
      )
    })
    return this.audio.webAudio.getAudioMixingPlayedTime()
  }

  getAudioMixingTotalTime() {
    if (!this.audio.webAudio?.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('getAudioMixingDuration() 当前没有开启伴音')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_MIX_NOT_STATE_ERROR,
          message: 'getAudioMixingDuration() 当前没有开启伴音'
        })
      )
    }

    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingDuration',
      code: 0,
      param: JSON.stringify(
        {
          totalTime: this.audio.webAudio.getAudioMixingTotalTime()?.totalTime
        },
        null,
        ' '
      )
    })
    return this.audio.webAudio.getAudioMixingTotalTime()
  }

  isMixAuido() {
    return this.audio.webAudio &&
      this.audio.webAudio.mixAudioConf &&
      this.audio.webAudio.mixAudioConf.audioSource
      ? true
      : false
  }

  /****************     音效功能      *******************/

  _initSoundIfNotExists(soundId: number, filePath?: string) {
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      this.audio.mixAudioConf.sounds[soundId] = {
        soundId,
        state: 'UNSTART',
        filePath: filePath || '',
        volume: 100,
        sourceNode: null,
        gainNode: null,
        cycle: 1,
        playStartTime: 0,
        playOverTime: 0,
        pauseTime: 0,
        startTime: 0,
        totalTime: 0,
        options: {}
      }
    }
    if (filePath) {
      this.audio.mixAudioConf.sounds[soundId].filePath = filePath
    }
  }

  async playEffect(options: AudioEffectOptions, playStartTime?: number) {
    const { soundId, filePath, cycle = 1 } = options
    const filePathCheck = {
      tag: 'Stream.playEffect:filePath',
      value: filePath
    }
    checkExists(filePathCheck)
    const soundIdCheck = {
      tag: 'Stream.playEffect:soundId',
      value: soundId,
      min: 1,
      max: 10000
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    const cycleCheck = {
      tag: 'Stream.playEffect:cycle',
      value: cycle,
      min: 1,
      max: 10000
    }

    if (isExistOptions(cycleCheck).result) {
      checkValidInteger(cycleCheck)
    }

    this._initSoundIfNotExists(soundId, filePath)

    if (!this.audio.audioRoutingEnabled) {
      this.enableAudioRouting()
    }

    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('playEffect() 浏览器不支持')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_EFFECT_NO_SUPPORT,
          message: 'playEffect() 当前浏览器不支持音效功能'
        })
      )
    } else if (
      this.audio.mixAudioConf.sounds[soundId] &&
      (this.audio.mixAudioConf.sounds[soundId].state === 'STARTING' ||
        this.audio.mixAudioConf.sounds[soundId].state === 'PLAYED' ||
        this.audio.mixAudioConf.sounds[soundId].state === 'PAUSED')
    ) {
      this.logger.log(
        `pauseEffect: 该音效文件正处于: ${this.audio.mixAudioConf.sounds[soundId].state} 状态`
      )
      if (playStartTime === undefined) {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.AUDIO_EFFECT_ERROR,
            message: 'playEffect() playStartTime 异常'
          })
        )
      }
    } else if (this.getAudioInputTracks().length === 0 || !this.stream.pubStatus.audio.audio) {
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_EFFECT_NO_AUDIO,
          message: 'playEffect() 当前没有开启麦克风，无法使用音效功能'
        })
      )
    }
    this.audio.mixAudioConf.sounds[soundId].state = 'STARTING'

    if (this.audio.mixAudioConf.audioBuffer[filePath]) {
      this.logger.log('playEffect: 已经 load 音效文件')
    } else {
      this.logger.log('playEffect, 先 load 音效文件')
      await this.preloadEffect(soundId, filePath)
    }

    try {
      const result = this.audio.webAudio.createAudioBufferSource(
        this.audio.mixAudioConf.audioBuffer[filePath]
      )
      this.audio.mixAudioConf.sounds[soundId].sourceNode = result.sourceNode
      if (result && result.sourceNode) {
        result.sourceNode.onended = (event) => {
          this.stopEffect(soundId)
        }
      }
      this.audio.mixAudioConf.sounds[soundId].gainNode = result.gainNode
      this.audio.mixAudioConf.sounds[soundId].totalTime =
        this.audio.mixAudioConf.audioBuffer[filePath] &&
        this.audio.mixAudioConf.audioBuffer[filePath].duration
      this.audio.mixAudioConf.sounds[soundId].cycle = cycle
      const totalTime =
        this.audio.mixAudioConf.audioBuffer[filePath] &&
        this.audio.mixAudioConf.audioBuffer[filePath].duration
      this.audio.mixAudioConf.sounds[soundId].playOverTime = totalTime
      if (cycle > 1) {
        this.audio.mixAudioConf.sounds[soundId].playOverTime =
          cycle * totalTime - this.audio.mixAudioConf.sounds[soundId].playStartTime
      }
      this.audio.mixAudioConf.sounds[soundId].playStartTime = playStartTime || 0
      this.audio.webAudio.startAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])
      this.audio.mixAudioConf.sounds[soundId].state = 'PLAYED'
      this.audio.mixAudioConf.sounds[soundId].startTime = Date.now()

      this.stream.client.apiFrequencyControl({
        name: 'playEffect',
        code: 0,
        param: JSON.stringify(options, null, ' ')
      })
    } catch (e) {}
  }

  async stopEffect(soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.stopEffect:soundId',
      value: soundId
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    let reason, message
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      message = 'pauseEffect() soundId找不到对应的音效文件'
      reason = ErrorCode.AUDIO_EFFECT_FILE_LOST_ERROR
    }
    if (reason) {
      throw new RtcError({
        code: reason,
        message
      })
    }
    this.audio.webAudio?.stopAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])
    this.audio.mixAudioConf.sounds[soundId].state = 'STOPED'
    this._audioFilePlaybackCompletedEvent()
    //delete this.audio.mixAudioConf.sounds[soundId]

    this.stream.client.apiFrequencyControl({
      name: 'stopEffect',
      code: 0,
      param: JSON.stringify(soundId, null, ' ')
    })
  }

  async pauseEffect(soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.pauseEffect:soundId',
      value: soundId
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    let reason, message
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      message = 'pauseEffect() soundId找不到对应的音效文件'
      reason = ErrorCode.AUDIO_EFFECT_FILE_LOST_ERROR
    } else if (this.audio.mixAudioConf.sounds[soundId].state === 'PAUSED') {
      this.logger.log('pauseEffect: 已经暂停')
      return
    } else if (this.audio.mixAudioConf.sounds[soundId].state !== 'PLAYED') {
      this.logger.log('pauseEffect: 当前没有开启该音效')
      message = 'pauseEffect() 当前没有开启该音效'
      reason = ErrorCode.AUDIO_EFFECT_NOT_STATE_ERROR
    }
    if (reason) {
      throw new RtcError({
        code: reason,
        message
      })
    }
    if (!this.audio.webAudio) return
    this.audio.webAudio.stopAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])

    this.audio.mixAudioConf.sounds[soundId].pauseTime = Date.now()
    this.audio.mixAudioConf.sounds[soundId].state = 'PAUSED'
    let playedTime =
      (this.audio.mixAudioConf.sounds[soundId].pauseTime -
        this.audio.mixAudioConf.sounds[soundId].startTime) /
        1000 +
      this.audio.mixAudioConf.sounds[soundId].playStartTime
    this.logger.log('pauseEffect 已经播放的时间: ', playedTime)
    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
    }
    this.logger.log('pauseEffect 暂停位置: ', playedTime)

    this.stream.client.apiFrequencyControl({
      name: 'pauseEffect',
      code: 0,
      param: JSON.stringify(soundId, null, ' ')
    })
  }

  async resumeEffect(soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.resumeEffect:soundId',
      value: soundId
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    let reason, message
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      message = 'resumeEffect() soundId找不到对应的音效文件'
      reason = ErrorCode.AUDIO_EFFECT_FILE_LOST_ERROR
    } else if (this.audio.mixAudioConf.sounds[soundId].state !== 'PAUSED') {
      message = 'resumeEffect() 当前没有暂停该音效文件'
      reason = ErrorCode.AUDIO_EFFECT_NOT_PAUSE
    }
    if (reason) {
      throw new RtcError({
        code: reason,
        message
      })
    }
    if (!this.audio.webAudio) return
    let playedTime =
      (this.audio.mixAudioConf.sounds[soundId].pauseTime -
        this.audio.mixAudioConf.sounds[soundId].startTime) /
        1000 +
      this.audio.mixAudioConf.sounds[soundId].playStartTime
    this.logger.log('resumeEffect 已经播放的时间: ', playedTime)
    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      const cyclePlayed = Math.floor(playedTime / this.audio.mixAudioConf.sounds[soundId].totalTime)
      this.logger.log('播放过的圈数 playedCycle: ', cyclePlayed)
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
      this.audio.mixAudioConf.sounds[soundId].cycle =
        this.audio.mixAudioConf.sounds[soundId].cycle - cyclePlayed
    }

    this.audio.mixAudioConf.sounds[soundId].playOverTime =
      this.audio.mixAudioConf.sounds[soundId].totalTime
    if (this.audio.mixAudioConf.sounds[soundId].cycle > 1) {
      this.audio.mixAudioConf.sounds[soundId].playOverTime =
        this.audio.mixAudioConf.sounds[soundId].cycle *
          this.audio.mixAudioConf.sounds[soundId].totalTime -
        this.audio.mixAudioConf.sounds[soundId].playStartTime
    }

    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
    }
    this.audio.mixAudioConf.sounds[soundId].playStartTime = playedTime
    this.logger.log('resumeEffect 回复重置的时间点：', playedTime)
    //this.audio.webAudio.startAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])
    this.playEffect(
      {
        soundId,
        filePath: this.audio.mixAudioConf.sounds[soundId].filePath,
        cycle: this.audio.mixAudioConf.sounds[soundId].cycle
      },
      playedTime
    )
    this.audio.mixAudioConf.sounds[soundId].state = 'PLAYED'
    this.audio.mixAudioConf.sounds[soundId].startTime = Date.now()

    this.stream.client.apiFrequencyControl({
      name: 'resumeEffect',
      code: 0,
      param: JSON.stringify(soundId, null, ' ')
    })
  }

  async setVolumeOfEffect(soundId: number, volume: number) {
    const soundIdCheck = {
      tag: 'Stream.setVolumeOfEffect:soundId',
      value: soundId,
      min: 1
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      throw new RtcError({
        code: ErrorCode.AUDIO_EFFECT_FILE_LOST_ERROR,
        message: 'resumeEffect() soundId找不到对应的音效文件'
      })
    }
    const volumeCheck = {
      tag: 'Stream.setVolumeOfEffect:volume',
      value: volume,
      min: 0,
      max: 100
    }

    if (isExistOptions(volumeCheck).result) {
      checkValidInteger(volumeCheck)
    }

    this.logger.log(`setVolumeOfEffect 设置 ${soundId} 音效文件的音量: ${volume}`)
    this._initSoundIfNotExists(soundId)
    const gainNode = this.audio.mixAudioConf.sounds[soundId]?.gainNode
    if (gainNode) {
      gainNode.gain.value = volume / 100
    } else {
      this.logger.log('setVolumeOfEffect: no gainNode')
    }
    this.audio.mixAudioConf.sounds[soundId].volume = volume

    this.stream.client.apiFrequencyControl({
      name: 'setVolumeOfEffect',
      code: 0,
      param: JSON.stringify(
        {
          soundId: soundId,
          volume: volume
        },
        null,
        ' '
      )
    })
  }

  async preloadEffect(soundId: number, filePath: string) {
    const filePathCheck = {
      tag: 'Stream.preloadEffect:filePath',
      value: filePath
    }
    checkExists(filePathCheck)
    const soundIdCheck = {
      tag: 'Stream.preloadEffect:soundId',
      value: soundId
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    this.logger.log(`preloadEffect 设置soundId: ${soundId}, 音效文件的filePath: ${filePath}`)
    this._initSoundIfNotExists(soundId, filePath)
    if (!this.audio.audioRoutingEnabled) {
      this.enableAudioRouting()
    }
    if (this.audio.mixAudioConf.audioBuffer[filePath]) {
      this.logger.log('preloadEffect: 已经 load 音效文件')
      return
    }
    try {
      await this.loadAudioBuffer(filePath)
      this.stream.client.apiFrequencyControl({
        name: 'preloadEffect',
        code: 0,
        param: JSON.stringify(
          {
            soundId: soundId,
            filePath: filePath
          },
          null,
          ' '
        )
      })
    } catch (e: any) {
      this.logger.error('preloadEffect 错误: ', e.name, e.message)
      this.stream.client.apiFrequencyControl({
        name: 'preloadEffect',
        code: -1,
        param: JSON.stringify(
          {
            reason: e.message
          },
          null,
          ' '
        )
      })
      throw e
    }
  }

  async unloadEffect(soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.unloadEffect:soundId',
      value: soundId,
      min: 1
    }
    if (isExistOptions(soundIdCheck).result) {
      checkValidInteger(soundIdCheck)
    }
    this.logger.log(`unloadEffect() ${soundId} 音效文件`)
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      this.logger.log('unloadEffect() 没有该音效文件')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_EFFECT_FILE_LOST_ERROR,
          message: 'unloadEffect() soundId找不到对应的音效文件'
        })
      )
    } else if (
      this.audio.mixAudioConf.sounds[soundId].state !== 'UNSTART' &&
      this.audio.mixAudioConf.sounds[soundId].state !== 'STOPED'
    ) {
      this.logger.log('unloadEffect() 该音效文件正在播放')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.AUDIO_EFFECT_PLAY_ALREADY,
          message: 'unloadEffect() 该音效文件正在播放'
        })
      )
    }
    delete this.audio.mixAudioConf.audioBuffer[this.audio.mixAudioConf.sounds[soundId].filePath]
    delete this.audio.mixAudioConf.sounds[soundId]

    this.stream.client.apiFrequencyControl({
      name: 'unloadEffect',
      code: 0,
      param: JSON.stringify(
        {
          soundId: soundId
        },
        null,
        ' '
      )
    })
  }

  getEffectsVolume() {
    this.logger.log(`getEffectsVolume()`)
    const result: any[] = []
    Object.values(this.audio.mixAudioConf.sounds).forEach((item) => {
      result.push({
        soundId: item.soundId,
        volume: item.volume
      })
    })
    this.stream.client.apiFrequencyControl({
      name: 'getEffectsVolume',
      code: 0,
      param: JSON.stringify(result, null, 2)
    })
    return result
  }

  setEffectsVolume(volume: number) {
    const volumeCheck = {
      tag: 'Stream.setEffectsVolume:volume',
      value: volume,
      min: 0,
      max: 100
    }
    if (isExistOptions(volumeCheck).result) {
      checkValidInteger(volumeCheck)
    }
    this.logger.log(`setEffectsVolume(), 设置音量: ${volume}`)
    Object.values(this.audio.mixAudioConf.sounds).forEach((item) => {
      this.setVolumeOfEffect(item.soundId, volume)
    })
    this.stream.client.apiFrequencyControl({
      name: 'setEffectsVolume',
      code: 0,
      param: JSON.stringify({ volume: volume }, null, 2)
    })
  }

  async stopAllEffects() {
    this.logger.log(`stopAllEffects()`)
    Object.values(this.audio.mixAudioConf.sounds).forEach((item) => {
      if (item.state === 'PLAYED' || item.state === 'PAUSED') {
        this.stopEffect(item.soundId)
      }
    })
    this.stream.client.apiFrequencyControl({
      name: 'stopAllEffects',
      code: 0,
      param: JSON.stringify('stopAllEffects', null, 2)
    })
  }

  async pauseAllEffects() {
    this.logger.log(`pauseAllEffects()`)
    Object.values(this.audio.mixAudioConf.sounds).forEach((item) => {
      if (item.state === 'PLAYED') {
        this.pauseEffect(item.soundId)
      }
    })
    this.stream.client.apiFrequencyControl({
      name: 'pauseAllEffects',
      code: 0,
      param: JSON.stringify('pauseAllEffects', null, 2)
    })
  }

  async resumeAllEffects() {
    this.logger.log(`resumeAllEffects()`)
    Object.values(this.audio.mixAudioConf.sounds).forEach((item) => {
      if (item.state === 'PAUSED') {
        this.resumeEffect(item.soundId)
      }
    })
    this.stream.client.apiFrequencyControl({
      name: 'resumeAllEffects',
      code: 0,
      param: JSON.stringify('resumeAllEffects', null, 2)
    })
  }

  getAudioEffectsTotalTime(options: AudioEffectOptions) {
    const { soundId, filePath, cycle = 1 } = options
    if (!this.audio.mixAudioConf || JSON.stringify(this.audio.mixAudioConf.sounds) === '{}') {
      this.logger.log('getAudioEffectsTotalTime: 当前没有音效文件')
      return Promise.resolve()
    }
    this._initSoundIfNotExists(soundId, filePath)
    let totalTime
    if (this.audio.mixAudioConf.sounds[soundId].state === 'PLAYED') {
      totalTime = this.audio.mixAudioConf.sounds[soundId].totalTime
    }

    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingTotalTime',
      code: 0,
      param: JSON.stringify(
        {
          totalTime: totalTime
        },
        null,
        ' '
      )
    })
    return totalTime
  }

  getAudioEffectsPlayedTime(options: AudioEffectOptions) {
    const { soundId, filePath, cycle = 1 } = options
    if (!this.audio.mixAudioConf || JSON.stringify(this.audio.mixAudioConf.sounds) === '{}') {
      this.logger.log('getAudioEffectsTotalTime: 当前没有音效文件')
      return Promise.resolve()
    }
    this._initSoundIfNotExists(soundId, filePath)

    let currentTime = Date.now()
    if (this.audio.mixAudioConf.sounds[soundId].state == 'PAUSED') {
      this.logger.log('当前是暂停状态')
      currentTime = this.audio.mixAudioConf.sounds[soundId].pauseTime
    }
    let playedTime =
      (currentTime - this.audio.mixAudioConf.sounds[soundId].startTime) / 1000 +
      this.audio.mixAudioConf.sounds[soundId].playStartTime
    //this.logger.log('已经播放的时间: ', playedTime)
    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
    }
    //this.logger.log("当前播放进度:", playedTime)

    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingPlayedTime',
      code: 0,
      param: JSON.stringify(
        {
          playTime: playedTime
        },
        null,
        ' '
      )
    })
    return { playedTime: playedTime }
  }

  loadAudioBuffer(filePath: string) {
    return ajax({
      url: filePath,
      type: 'GET',
      dataType: 'arraybuffer'
    })
      .then((data) => {
        this.logger.log('loadAudioBuffer 加载 audio file 成功')
        return new Promise((resolve, reject) => {
          this.audio.webAudio?.context?.decodeAudioData(
            data as ArrayBuffer,
            (buffer) => {
              this.logger.log('loadAudioBuffer audio file 解码成功')
              this.audio.mixAudioConf.audioBuffer[filePath] = buffer
              resolve(buffer)
            },
            (e) => {
              this.logger.log('loadAudioBuffer 云端音乐解码失败：', e.message)
              reject(
                new RtcError({
                  code: ErrorCode.AUDIO_EFFECT_FILE_ERROR,
                  message: `loadAudioBuffer: 云端音乐解码失败: ${e.name} ${e.message}`
                })
              )
            }
          )
        })
      })
      .catch((error) => {
        this.logger.log('loadAudioBuffer 加载云端音乐失败: ', error)
        return Promise.reject(
          new RtcError({
            code: ErrorCode.AUDIO_EFFECT_FILE_ERROR,
            message: `loadAudioBuffer: 加载云端音乐失败: ${error.name} ${error.message}`
          })
        )
      })
  }

  getAudioInputTracks(): MediaStreamTrack[] {
    let tracks: MediaStreamTrack[] = []
    if (this.audio.audioSource?.readyState === 'live') {
      tracks.push(this.audio.audioSource)
    }
    if (this.audio.micTrack?.readyState === 'live') {
      tracks.push(this.audio.micTrack)
    }
    return tracks
  }

  getAudioSlaveInputTracks(): MediaStreamTrack[] {
    let tracks: MediaStreamTrack[] = []
    if (this.screenAudio.screenAudioTrack?.readyState === 'live') {
      tracks.push(this.screenAudio.screenAudioTrack)
    }
    if (this.screenAudio.screenAudioSource?.readyState === 'live') {
      tracks.push(this.screenAudio.screenAudioSource)
    }
    return tracks
  }

  enableAudioRouting() {
    if (this.audio.webAudio && this.audio.webAudio.destination) {
      this.audio.audioRoutingEnabled = true
      const outputStream = this.audio.webAudio.destination.stream
      const destinationTrack = outputStream.getAudioTracks()[0]
      this.logger.log('enableAudioRouting: ', destinationTrack.label)
      const formerTrack = this.audio.audioStream.getAudioTracks()[0]
      if (formerTrack) {
        destinationTrack.enabled = formerTrack.enabled
        formerTrack.enabled = true
      }
      emptyStreamWith(this.audio.audioStream, destinationTrack)
      if (this.stream.audioLevelHelper) {
        this.stream.audioLevelHelper.updateStream(this.audio.audioStream)
      }
      this.updateAudioSender(destinationTrack)
    } else {
      this.logger.log('enableAudioRouting: 已替换为Destination')
    }
  }

  disableAudioRouting() {
    const audioInputTracks = this.getAudioInputTracks()
    if (audioInputTracks.length) {
      if (audioInputTracks.length === 1) {
        this.logger.log('disableAudioRouting: ', audioInputTracks[0].label)
      } else {
        this.logger.warn('disableAudioRouting: 仍然有多于一个输入', ...audioInputTracks)
      }
      const formerTrack = this.audio.audioStream.getAudioTracks()[0]
      emptyStreamWith(this.audio.audioStream, audioInputTracks[0])
      audioInputTracks[0].enabled = formerTrack.enabled
      formerTrack.enabled = true
      this.updateAudioSender(audioInputTracks[0])
    } else {
      this.logger.log('disableAudioRouting quiet.')
      emptyStreamWith(this.audio.audioStream, null)
    }
    this.audio.audioRoutingEnabled = false
  }

  updateAudioSender(audioTrack: MediaStreamTrack) {
    if (this.stream.isRemote) {
      throw new Error('updateAudioSender only for localStream')
    }
    if (this.stream.getAdapterRef()?._mediasoup?._micProducer) {
      if (this.stream.getAdapterRef()?._mediasoup?._micProducer?._rtpSender) {
        this.logger.info('updateAudioSender: 替换当前_micProducer的track', audioTrack.label)
        this.stream.getAdapterRef()?._mediasoup?._micProducer?._rtpSender?.replaceTrack(audioTrack)
      } else if (this.stream.getAdapterRef()?._mediasoup?._sendTransport?.handler?._pc) {
        const sender =
          this.stream.getAdapterRef()?._mediasoup?._sendTransport?.handler._pc.audioSender
        if (sender) {
          this.logger.info('updateAudioSender: 替换audioSender', sender?.track?.label)
          sender.replaceTrack(audioTrack)
        }
      }
    }
  }

  enablePreProcessing(mediaType: 'video' | 'screen', fps?: number) {
    enablePreProcessing(this, mediaType, fps)
  }

  disablePreProcessing(mediaType: 'video' | 'screen', keepFlag = false) {
    disablePreProcessing(this, mediaType, keepFlag)
  }

  canDisablePreProcessing(mediaType: 'video' | 'screen') {
    return canDisablePreProcessing(this, mediaType)
  }

  getPreprocessingStats(mediaType: 'video' | 'screen' = 'video') {
    const history = this[mediaType].preProcessing?.history
    if (!history?.length) {
      return null
    }
    const timeLen = history[history.length - 1].endTs - history[0].startTs
    const spent: any = {
      total: 0
    }
    for (let i = 0; i < history.length; i++) {
      spent.total += history[i].endTs - history[i].startTs
      for (let handlerTs of history[i].handlerTs) {
        if (handlerTs.spent > 0) {
          if (!spent[handlerTs.name]) {
            spent[handlerTs.name] = 0
          }
          spent[handlerTs.name] += handlerTs.spent
        }
      }
    }
    const fps = (history.length * 1000) / timeLen
    const load = spent.total / timeLen
    const delay = spent.total / history.length
    return {
      fps,
      load,
      delay,
      spent
    }
  }

  destroy() {
    this.logger.log('清除 meida')
    this._reset()
  }
}

export { MediaHelper }
