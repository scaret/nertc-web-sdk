import { EventEmitter } from 'eventemitter3'
import * as GUM from '../util/gum'
import { WebAudio } from './webAudio'
import { RtcSystem } from '../util/rtcUtil/rtcSystem'
import { AuidoMixingState } from '../constant/state'
import { ajax } from '../util/ajax'
import {
  AdapterRef, AudioMixingOptions,
  GetStreamConstraints,
  MediaHelperOptions, MediaTypeShort, MixAudioConf,
  SDKRef
} from "../types";
import {emptyStreamWith} from "../util/gum";
class MediaHelper extends EventEmitter {
  private adapterRef: AdapterRef;
  private sdkRef: SDKRef;
  private uid:number;
  private isLocal:boolean;
  micStream: MediaStream|null;
  // audioStream对localStream而言是PeerConnection发送的MediaStream，
  // 对remoteStream而言是包含了接收的MediaStream
  // 无论是否有audio，audioStream总是存在，且始终是同一个对象。
  public audioStream: MediaStream;
  // musicStream指没有人声的混音音乐
  public musicStream: MediaStream;
  public audioSource: MediaStreamTrack|null;
  public micTrack: MediaStreamTrack|null;
  private webAudio: WebAudio|null;
  public audioConstraint: {audio: MediaTrackConstraints}|null;
  private cameraStream: MediaStream|null;
  public videoStream: MediaStream|null;
  public videoConstraint: {video: MediaTrackConstraints}|null;
  public screenStream: MediaStream|null;
  public videoSource:MediaStreamTrack|null;
  public screenTrack: MediaStreamTrack|null;
  public cameraTrack: MediaStreamTrack|null;
  private mixAudioConf:MixAudioConf;
  
  constructor (options:MediaHelperOptions) {
    super()
    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
    this.uid = options.uid
    this.isLocal = this.adapterRef.channelInfo.uid == this.uid
    this.micStream = null;
    this.audioStream = new MediaStream();
    this.musicStream = new MediaStream();
    this.audioSource = null;
    this.webAudio = null;
    this.audioConstraint = null;
    this.cameraStream = null;
    this.videoStream = null;
    this.videoConstraint = null;
    this.screenStream = null;
    this.videoSource = null;
    this.screenTrack = null;
    this.micTrack = null;
    this.cameraTrack = null;
    this.mixAudioConf = {
      index: 0,
      audioBuffer: {}, //云端音频buffer数组
    };
  }
  

  _reset() {
    if (this.micStream) {
      this._stopTrack(this.micStream)
    }
    if(this.webAudio){
      this.webAudio.destroy()
    }
    this.webAudio = null
    this.micStream = null
    this.audioConstraint = null
    emptyStreamWith(this.audioStream, null);
    emptyStreamWith(this.musicStream, null);
    if (this.videoStream) {
      this._stopTrack(this.videoStream)
    }
    this.videoConstraint = {video: {}}
    this.videoStream = null
    this.cameraStream = null
    if (this.screenStream) {
      this._stopTrack(this.screenStream)
    }
    this.screenStream = null
    this.mixAudioConf = {
      index: 0,
      audioBuffer: {} //云端音频buffer数组
    };
  }

  async getStream(constraint:GetStreamConstraints) {
    let {
      audio = false,
      audioDeviceId = '',  
      video = false,
      videoDeviceId = '', 
      screen = false, 
      sourceId = '',
      audioSource = null, 
      videoSource = null,
      deviceId = ''
    } = constraint
    if(!audio && !video && !screen){
      this.adapterRef.logger.error('getStream: 必须指定媒体类型')
      return
    }
    if (audioSource) {
      emptyStreamWith(this.audioStream, audioSource);
      this.audioSource = audioSource
      audio = false
    }

    if (videoSource) {
      this.videoStream = new MediaStream()
      this.videoStream.addTrack(videoSource)
      video = false
      this.videoSource = videoSource;
    }

    try {
      if (screen) {
        if (!this.adapterRef.localStream || !this.adapterRef.localStream.screenProfile){
          throw new Error('No screenProfile')
        }
        const {width, height, frameRate} = this.convert(this.adapterRef.localStream.screenProfile)
        
        if (sourceId) {
          this.screenStream = await GUM.getStream({
            video: {
              // @ts-ignore
              mandatory: {
                maxWidth: width,
                maxHeight: height,
                maxFrameRate: frameRate,
                minFrameRate: 5,
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId
              }
            }
          }, this.adapterRef.logger)
        } else {
          this.screenStream = await GUM.getScreenStream({
            video:{
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
          }, this.adapterRef.logger)
        }
        
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: 'set_screen',
          oper: '1',
          value: 'success'
        })
        if (!this.screenStream){
          this.adapterRef.logger.error('getStream: 未获取到screenStream');
          return;
        }
        this.screenTrack = this.screenStream.getVideoTracks()[0];
        if (audio) {
          this.micStream = await GUM.getStream({
            audio: (this.getAudioConstraints()) ? this.getAudioConstraints() : true,
          }, this.adapterRef.logger)
          this.micTrack = this.micStream.getAudioTracks()[0];
          this.adapterRef.instance.apiEventReport('setFunction', {
            name: 'set_mic',
            oper: '1',
            value: 'success'
          })
          emptyStreamWith(this.audioStream, this.micTrack);
          if (navigator.userAgent.indexOf('Chrome') > -1 && !RtcSystem.h5()) {
            if (!this.webAudio) {
              this.webAudio = new WebAudio({
                adapterRef: this.adapterRef,
                stream: this.audioStream
              })
            } else {
              this.webAudio.updateStream(this.audioStream)
            }
            if (this.webAudio.destination){
              const outputStream = this.webAudio.destination.stream;
              this.adapterRef.logger.log('音频的outputStream: ', outputStream)
              emptyStreamWith(this.audioStream, outputStream.getAudioTracks()[0]);
            }
          }
          
        }
      } else if (audio || video) {
        if (!this.adapterRef.localStream || !this.adapterRef.localStream.videoProfile){
          throw new Error('No videoProfile');
        }
        const {height, width, frameRate} = this.convert(this.adapterRef.localStream.videoProfile)
        let config:MediaStreamConstraints = {
          audio: (audio && this.getAudioConstraints()) ? this.getAudioConstraints() : audio,
          video: video ? {
            width: {
              ideal: width
            },
            height: {
              ideal: height
            },
            frameRate: {
              ideal: frameRate || 15
            }
          } : false
        }
        if (audioDeviceId && audio) {
          if (config.audio === true) {
            config.audio = {}
          }
          (config.audio as any).deviceId = {
            exact: audioDeviceId
          }
        }

        if (videoDeviceId && video) {
          (config.video as any).deviceId = {
            exact: videoDeviceId
          }
        }

        const stream = await GUM.getStream(config, this.adapterRef.logger)
        if (constraint.screen) {
          this.screenStream = stream
        } else {
          if (stream.getAudioTracks().length){
            this.micTrack = stream.getAudioTracks()[0]
          }
          if (stream.getVideoTracks().length){
            this.cameraTrack = stream.getVideoTracks()[0]
          }
          
          if (this.micTrack) {
            this.adapterRef.instance.apiEventReport('setFunction', {
              name: 'set_mic',
              oper: '1',
              value: 'success'
            })
            if (typeof config.audio === "object"){
              this.audioConstraint = {audio: config.audio}
            }
            this.micStream = new MediaStream()
            this.micStream.addTrack(this.micTrack)
            emptyStreamWith(this.audioStream, this.micTrack);

            if (navigator.userAgent.indexOf('Chrome') > -1 && !RtcSystem.h5()) {
              if (!this.webAudio) {
                this.webAudio = new WebAudio({
                  adapterRef: this.adapterRef,
                  stream: this.audioStream
                })
              } else {
                this.webAudio.updateStream(this.audioStream)
              }
              if (this.webAudio.destination){
                const outputStream = this.webAudio.destination.stream;
                this.adapterRef.logger.log('音频的outputStream: ', outputStream)
                emptyStreamWith(this.audioStream, outputStream.getAudioTracks()[0]);
              }
              if (this.webAudio.musicDestination){
                const musicStream = this.webAudio.musicDestination.stream;
                emptyStreamWith(this.musicStream, musicStream.getAudioTracks()[0]);
              }
            }
          }

          if (this.cameraTrack) {
            this.adapterRef.instance.apiEventReport('setFunction', {
              name: 'set_camera',
              oper: '1',
              value: 'success'
            })
            if (typeof config.video === "object"){
              this.videoConstraint = {video: config.video}
            }
            this.cameraStream = new MediaStream()
            this.cameraStream.addTrack(this.cameraTrack)
            this.videoStream = this.cameraStream
          }
        }
      }
      return
    } catch (e){
      const logger = this.adapterRef.logger || console
      logger.error('getStream error: %o', e.message)
      if (audio) {
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: 'set_mic',
          oper: '1',
          value: e.message
        })
      } 
      if (video) {
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: 'set_camera',
          oper: '1',
          value: e.message
        })
      } 
      if (screen) {
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: 'set_screen',
          oper: '1',
          value: e.message
        })
      } 

      return Promise.reject(e)
    }
  }

  async getSecondStream(constraint: MediaStreamConstraints) {
    let {
      audio = false, 
      video = false,
    } = constraint
    if(!audio && !video){
      this.adapterRef.logger.error('getSecondStream:必须指定一个参数');
      return Promise.reject('INVALID_OPERATION')
    }

    try {
      const stream = await GUM.getStream(constraint, this.adapterRef.logger)
      this.adapterRef.logger.log('获取到stream: ', stream.id)
      const audioTrack = stream.getAudioTracks().length && stream.getAudioTracks()[0]
      const videoTrack = stream.getVideoTracks().length && stream.getVideoTracks()[0]
      if (audioTrack) {
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: 'set_mic',
          oper: '1',
          value: 'success'
        })
        if (typeof constraint.audio === "object"){
          this.audioConstraint = {audio: constraint.audio}
        }
        if (this.micStream) {
          this._stopTrack(this.micStream)
        }
        this.micStream = new MediaStream()
        this.micStream.addTrack(audioTrack)
        emptyStreamWith(this.audioStream, audioTrack);
        if (this.webAudio){
          this.webAudio.updateStream(this.audioStream)
          if (this.webAudio.destination){
            const outputStream = this.webAudio.destination.stream;
            emptyStreamWith(this.audioStream, outputStream.getAudioTracks()[0]);
          }
        }
      }

      if (videoTrack) {
        this.adapterRef.instance.apiEventReport('setFunction', {
          name: 'set_camera',
          oper: '1',
          value: 'success'
        })
        if (typeof constraint.video === "object"){
          this.videoConstraint = {video: constraint.video}
        }
        if (!this.adapterRef.localStream){
          throw new Error('No LocalStream');
        }
        const isPlaying = await this.adapterRef.localStream.isPlaying('video')
        if (isPlaying && this.cameraStream) {
          this.adapterRef.localStream.stop('video')
          this._stopTrack(this.cameraStream)
        }
        this.cameraStream = new MediaStream()
        this.cameraStream.addTrack(videoTrack)
        this.videoStream = this.cameraStream
        const videoView = this.adapterRef.localStream.videoView || (this.adapterRef.localStream.Play && this.adapterRef.localStream.Play.videoView)
        if (isPlaying && videoView) {
          await this.adapterRef.localStream.play(videoView)
          if ("width" in this.adapterRef.localStream.renderMode.local){
            this.adapterRef.localStream.setLocalRenderMode(this.adapterRef.localStream.renderMode.local, 'video')
          }
        }
        const peer = this.adapterRef.instance.getPeer('send')
        if (peer && peer.videoSender) {
          peer.videoSender.replaceTrack(videoTrack)
        } else {
          this.adapterRef.logger.error('getSecondStream: undefined peer')
          return Promise.reject('undefinedPeer')
        }
      }
    } catch (e){
      const logger = this.adapterRef.logger || console
      logger.error('getStream error: %o', e.message)
      const name = audio ? 'set_mic' : 'set_camera'
      this.adapterRef.instance.apiEventReport('setFunction', {
        name,
        oper: '1',
        value: e.message
      })
      return Promise.reject(e)
    }
  }

  convert({resolution = 4, frameRate = 0}){
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
    } else if (resolution === 8 || RtcSystem.ios()) {
      //ios端safari浏览器，1080P分辨率的视频编码发送异常，这里修改为720P
      result.width = 1280
      result.height = 720
    } else if (resolution === 16) {
      result.width = 1920
      result.height = 1080
    }

    if (frameRate === 0 ) {
      result.frameRate = 15
    } else if (frameRate === 1) {
      result.frameRate = 5
    } else if (frameRate === 2) {
      result.frameRate = 10
    } else if (frameRate === 3) {
      result.frameRate = 15
    } else if (frameRate === 4) {
      result.frameRate = 20
    } else if (frameRate === 5) {
      result.frameRate = 25
    }
    return result
  }

  getAudioConstraints() {
    if (!this.adapterRef.localStream){
      throw new Error('No LocalStream');
    }
    const audioProcessing = this.adapterRef.localStream.audioProcessing;
    let constraint:any = {};
    if (audioProcessing) {
      if (typeof audioProcessing.AEC !== "undefined") {
        constraint.echoCancellation = audioProcessing.AEC;
        constraint.googEchoCancellation = audioProcessing.AEC;
        constraint.googEchoCancellation2 = audioProcessing.AEC;
      }
      if (typeof audioProcessing.ANS !== "undefined") {
        constraint.noiseSuppression = audioProcessing.ANS;
        constraint.googNoiseSuppression = audioProcessing.ANS;
        constraint.googNoiseSuppression2 = audioProcessing.ANS;
      }
      if (typeof audioProcessing.AGC !== "undefined") {
        constraint.autoGainControl = audioProcessing.AGC;
        constraint.googAutoGainControl = audioProcessing.AGC;
        constraint.googAutoGainControl2 = audioProcessing.AGC;
      }
    }
    if (JSON.stringify(constraint) === "{}") {
      return null;
    } else {
      return constraint;
    }
  }
  
  updateStream(kind:MediaTypeShort, track:MediaStreamTrack) {
    if (kind === 'audio') {
      this.micTrack = track;
      emptyStreamWith(this.audioStream, track);
      this.audioStream.addTrack(track)
    } else if (kind === 'video') {
      this.videoStream = new MediaStream()
      this.cameraTrack = track;
      this.videoStream.addTrack(track)
    } else if (kind === 'screen') {
      this.screenStream = new MediaStream()
      this.screenStream.addTrack(track)
      this.screenTrack = track;
    }
  }

  stopStream(kind:MediaTypeShort) {
    let type = 'set_mic'
    if (kind === 'audio' && this.micStream) {
      this._stopTrack(this.micStream)
      this.micStream = null;
      emptyStreamWith(this.audioStream, null);
    } else if (kind === 'video' && this.videoStream) {
      type = 'set_camera'
      this._stopTrack(this.videoStream)
      this.videoStream = this.cameraStream = null
    } else if (kind === 'screen' && this.screenStream) {
      type = 'set_screen'
      this._stopTrack(this.screenStream)
      this.screenStream = null
    } 
    this.adapterRef.instance.apiEventReport('setFunction', {
      name: type,
      oper: '0',
      value: 'success'
    })
  }

  _stopTrack (stream:MediaStream) {
    if (!stream) return
    if (!this.isLocal) return
    this.adapterRef.logger.log('清除stream: ', stream.id)
    const tracks = stream.getTracks()
    if (!tracks || tracks.length === 0) return
    tracks.forEach(track => {
      track.stop()
    })
  }

  getAudioTrack () {
    return this.audioStream && this.audioStream.getAudioTracks()[0];
  }
  
  getVideoTrack () {
    return this.videoStream && this.videoStream.getVideoTracks()[0];
  }

  /**
   * 设置本地音频采集音量
   * @param {Number} gain 0-1
   */
  setGain (gain:number) {
    if (!this.micStream) {
      this.adapterRef.logger.log('setGain: 缺失本地音频')
      return
    };
    if (this.webAudio) {
      this.webAudio.setGain(gain)
    }
  }

  getGain () {
    return (this.webAudio && this.webAudio.getVolumeData()) || '0.0'
  }

  /******************************* 伴音 ********************************/
  startAudioMixing (options:AudioMixingOptions) {
    this.adapterRef.logger.log(`开始伴音: %s`, JSON.stringify(options, null, ' '))
    Object.assign(this.mixAudioConf, options)
    let reason = null
    if (!this.mixAudioConf.audioFilePath) {
      this.adapterRef.logger.log('开始伴音: 没有找到云端文件路径')
      reason = 'INVALID_ARGUMENTS'
    } else if (!this.micStream || !this.adapterRef.localStream || !this.adapterRef.localStream.pubStatus.audio.audio) {
      this.adapterRef.logger.log('开始伴音: 当前没有publish音频')
      reason = 'NOT_PUBLIST_AUDIO_YET'
    } else if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('开始伴音: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    }

    if (reason) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'startAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.mixAudioConf, {
          reason: reason
        }), null, ' ')
      })
      return Promise.reject(reason)
    }

    if (this.webAudio){
      if (this.webAudio.mixAudioConf && this.webAudio.mixAudioConf.audioSource && this.webAudio.mixAudioConf.state === AuidoMixingState.PLAYED) {
        this.adapterRef.logger.log('startAudioMixing: 当前已经开启伴音，先关闭之前的伴音')
        this.stopAudioMixing()
      }

      this.webAudio.mixAudioConf.state === AuidoMixingState.STARTING
    }
    if (this.mixAudioConf.audioFilePath && this.mixAudioConf.audioBuffer[this.mixAudioConf.audioFilePath]) {
      this.adapterRef.logger.log('开始伴音, 已经加载过云端音乐')
      return this.startMix(this.mixAudioConf.index)
    } else {
      this.adapterRef.logger.log('开始伴音, 先加载云端音乐')
      return this.loadRemoteAudioFile(this.mixAudioConf.index)
    }
    
  }

  /*
    加载云端音频文件
   */
  loadRemoteAudioFile (index: number) {
    if (!this.mixAudioConf.audioFilePath){
      this.adapterRef.logger.error('audioFilePath未设置')
      return;
    }
    return ajax({
      url: this.mixAudioConf.audioFilePath,
      type: 'GET',
      dataType: 'arraybuffer'
    }).then(data => {
      this.adapterRef.logger.log("loadRemoteAudioFile 加载云端音乐成功")
      return new Promise((resolve, reject) => {
        if (!this.webAudio || !this.webAudio.context){
          reject('webAudio丢失')
          return;
        }
        this.webAudio.context.decodeAudioData(data as ArrayBuffer, buffer => {
          this.adapterRef.logger.log("loadRemoteAudioFile 云端音乐解码成功")
          if (!this.mixAudioConf.audioFilePath){
            reject('状态错误')
            return;
          }
          this.mixAudioConf.audioBuffer[this.mixAudioConf.audioFilePath] =buffer;
          this.startMix(index).then(res => {
            resolve(res);
          })
        }, e => {
          this.adapterRef.logger.log("loadRemoteAudioFile 云端音乐解码失败：", e)
          reject('CREATE_BUFFERSOURCE_FAILED')
        })
      })
    }).catch(error => {
      this.adapterRef.logger.log('loadRemoteAudioFile 加载云端音乐失败: ', error)
      return Promise.reject('LOAD_AUDIO_FAILED') 
    })
  }

  /*
    混音流程
   */
  startMix (index:number) {
    if (!this.webAudio){
      this.adapterRef.logger.error('startMix:参数错误')
      return Promise.reject('startMix:参数错误');
    }
    this.adapterRef.logger.log('startMix 开始混音: %o', this.mixAudioConf)
    if (index !== this.mixAudioConf.index) {
      this.adapterRef.logger.log('startMix: 该次伴音已经取消')
      return Promise.resolve()
    }
    const {
      audioFilePath = '',
      loopback = false,
      replace = false,
      cycle = 0,
      playStartTime = 0,
      volume = 255,
      auidoMixingEnd = null
    } = this.mixAudioConf
    return this.webAudio.startMix({
      buffer: this.mixAudioConf.audioBuffer[audioFilePath],
      loopback,
      replace,
      cycle,
      playStartTime,
      volume,
      auidoMixingEnd
    })
  }

  /*
    暂停混音
   */
  pauseAudioMixing () {
    let reason = null
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('pauseAudioMixing: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource || this.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED) {
      this.adapterRef.logger.log('pauseAudioMixing: 已经暂停')
      reason = 'INVALID_OPERATION'
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource || this.webAudio.mixAudioConf.state !== AuidoMixingState.PLAYED) {
      this.adapterRef.logger.log('pauseAudioMixing: 当前没有开启伴音')
      reason = 'INVALID_OPERATION'
    }
    if(reason){
      this.adapterRef.instance.apiFrequencyControl({
        name: 'pauseAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.mixAudioConf, {
          reason
        }), null, ' ')
      })
      return Promise.reject(reason)
    }
    this.adapterRef.instance.apiFrequencyControl({
      name: 'pauseAudioMixing',
      code: 0,
      param: JSON.stringify(this.mixAudioConf, null, ' ')
    })
    return this.webAudio && this.webAudio.pauseAudioMixing()
  }

  /*
    恢复混音
   */
  resumeAudioMixing () {

    let reason = null
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('resumeAudioMixing: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource) {
      this.adapterRef.logger.log('resumeAudioMixing: 当前没有开启伴音')
      reason = 'INVALID_OPERATION'
    } else if (this.webAudio.mixAudioConf.state !== AuidoMixingState.PAUSED) {
      this.adapterRef.logger.log('resumeAudioMixing: 当前没有暂停伴音')
      reason = 'INVALID_OPERATION'
    }
    if(reason){
      this.adapterRef.instance.apiFrequencyControl({
        name: 'resumeAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.mixAudioConf, {
          reason
        }), null, ' ')
      })
      return Promise.reject(reason)
    }
    this.adapterRef.instance.apiFrequencyControl({
      name: 'resumeAudioMixing',
      code: 0,
      param: JSON.stringify(this.mixAudioConf, null, ' ')
    })
    if (!this.webAudio){
      return;
    }
    let { audioFilePath = '', loopback = false, replace = false, cycle = 0, playStartTime = 0, auidoMixingEnd = null } = this.mixAudioConf
    let playedTime = (this.webAudio.mixAudioConf.pauseTime - this.webAudio.mixAudioConf.startTime) / 1000 + this.webAudio.mixAudioConf.playStartTime
    if (playedTime > this.webAudio.mixAudioConf.totalTime) {
      this.adapterRef.logger.log('播发过的圈数 playedCycle: ', Math.floor(playedTime / this.webAudio.mixAudioConf.totalTime))
      cycle = cycle - Math.floor(playedTime / this.webAudio.mixAudioConf.totalTime)
      this.mixAudioConf.cycle = cycle
    }
    if (this.webAudio.mixAudioConf.setPlayStartTime) {
      this.adapterRef.logger.log("暂停期间，用户设置混音播发时间: ", this.webAudio.mixAudioConf.setPlayStartTime)
      playStartTime = this.webAudio.mixAudioConf.setPlayStartTime
      this.webAudio.mixAudioConf.setPlayStartTime = 0
    } else {
      this.adapterRef.logger.log("恢复混音:", this.webAudio.mixAudioConf)
      this.adapterRef.logger.log('已经播放的时间: ', playedTime)
      if (playedTime > this.webAudio.mixAudioConf.totalTime) {
        playedTime = playedTime % this.webAudio.mixAudioConf.totalTime
      }
      playStartTime = playedTime
    }
    this.adapterRef.logger.log('回复重置的时间点：', playStartTime)
    return this.webAudio.resumeAudioMixing({
      buffer: this.mixAudioConf.audioBuffer[audioFilePath],
      loopback,
      replace,
      cycle,
      playStartTime,
      auidoMixingEnd
    })
  }  

  /*
    停止混音
  */
  stopAudioMixing (isFinished = true) {

    let reason = null
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('stopAudioMixing: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource) {
      this.adapterRef.logger.log('stopAudioMixing: 当前没有开启伴音')
      reason = 'INVALID_OPERATION'
    } 
    if(reason){
      this.adapterRef.instance.apiFrequencyControl({
        name: 'stopAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.mixAudioConf, {
          reason
        }), null, ' ')
      })
      return Promise.reject(reason)
    }
    this.adapterRef.instance.apiFrequencyControl({
      name: 'stopAudioMixing',
      code: 0,
      param: JSON.stringify(this.mixAudioConf, null, ' ')
    })
    if (!this.webAudio){
      return Promise.reject('WebAudio Unsupported')
    }else{
      return this.webAudio.stopAudioMixing(isFinished);
    }
  }

  /*
    设置混音音量
  */
  setAudioMixingVolume (volume:number) {
    let reason = null
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('setAudioMixingVolume: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource) {
      this.adapterRef.logger.log('setAudioMixingVolume: 当前没有开启伴音')
      reason = 'INVALID_ARGUMENTS'
    } else if (!Number.isInteger(volume)) {
      this.adapterRef.logger.log('setAudioMixingVolume: volume不是整数')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume < 0) {
      this.adapterRef.logger.log('setAudioMixingVolume: volume范围（0 - 255）')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume > 255) {
      this.adapterRef.logger.log('setAudioMixingVolume: volume范围（0 - 255）')
      reason = 'INVALID_ARGUMENTS'
    } 
    if(reason){
      this.adapterRef.instance.apiFrequencyControl({
        name: 'adjustAudioMixingVolume',
        code: -1,
        param: JSON.stringify(Object.assign(this.mixAudioConf, {
          reason,
          volume
        }), null, ' ')
      })
      return Promise.reject(reason)
    }
    this.adapterRef.instance.apiFrequencyControl({
      name: 'adjustAudioMixingVolume',
      code: 0,
      param: JSON.stringify({
        volume
      }, null, ' ')
    })
    return this.webAudio && this.webAudio.setAudioMixingVolume(volume)
  }
  
  setAudioMixingPlayTime (playTime:number) {
    let reason = null
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('setAudioMixingPlayTime: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource) {
      this.adapterRef.logger.log('setAudioMixingPlayTime: 当前没有开启伴音')
     reason = 'INVALID_ARGUMENTS'
    } else if (playTime < 0) {
      this.adapterRef.logger.log('setAudioMixingPlayTime: playStartTime小于0')
      reason = 'INVALID_ARGUMENTS'
    } else if (playTime >= this.webAudio.mixAudioConf.totalTime) {
      this.adapterRef.logger.log('setAudioMixingPlayTime: playStartTime大于音频文件总时长了')
      reason = 'INVALID_ARGUMENTS'
    } else if (this.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED) {
      this.webAudio.mixAudioConf.setPlayStartTime = playTime
      this.adapterRef.logger.log('setAudioMixingPlayTime: 当前正在暂停，记录设置的播发位置，在恢复伴音时，跳转到此次设置的播放位置')
      return Promise.resolve()
    }
    if(reason){
      this.adapterRef.instance.apiFrequencyControl({
        name: 'setAudioMixingPosition',
        code: -1,
        param: JSON.stringify({
          playTime: playTime,
          reason: reason
        }, null, ' ')
      })
      return Promise.reject(reason)
    }

    return new Promise((resolve, reject) => {
      this.stopAudioMixing(false)
        .then(res => {
          if (!this.webAudio){
            const reason = 'webAudio not supported';
            reject(reason);
            return Promise.reject(reason);
          }
          this.mixAudioConf.playStartTime = playTime
          let { audioFilePath = '', loopback = false, replace = false, cycle = 0, playStartTime = 0, auidoMixingEnd = null } = this.mixAudioConf
          this.adapterRef.logger.log("设置混音的播放位置:", this.webAudio.mixAudioConf)
          let currentTime = Date.now()
          let playedTime = (currentTime - this.webAudio.mixAudioConf.startTime) / 1000 + this.webAudio.mixAudioConf.playStartTime
          this.adapterRef.logger.log('已经播放的时间: ', playedTime)
          if (playedTime > this.webAudio.mixAudioConf.totalTime) {
            this.adapterRef.logger.log('播发过的圈数 playedCycle: ', Math.floor(playedTime / this.webAudio.mixAudioConf.totalTime))
            cycle = cycle - Math.floor(playedTime / this.webAudio.mixAudioConf.totalTime)
            this.mixAudioConf.cycle = cycle
          }
          this.adapterRef.logger.log('setAudioMixingPlayTime, playTime: %s, cycle: %s', playTime, cycle)
          this.webAudio.setAudioMixingPlayTime({
            buffer: this.mixAudioConf.audioBuffer[audioFilePath],
            loopback: loopback,
            replace: replace,
            cycle: cycle,
            playStartTime: playStartTime,
            auidoMixingEnd: auidoMixingEnd
          }).then(res => {
            this.adapterRef.instance.apiFrequencyControl({
              name: 'setAudioMixingPosition',
              code: 0,
              param: JSON.stringify({
                playTime: playTime
              }, null, ' ')
            })
            resolve(res);
          }).catch(err => {
            this.adapterRef.instance.apiFrequencyControl({
              name: 'setAudioMixingPosition',
              code: -1,
              param: JSON.stringify({
                playTime: playTime,
                reason: '重新播放伴音失败'
              }, null, ' ')
            })
            reject(err)
          })
        })
        .catch(err => {
          this.adapterRef.instance.apiFrequencyControl({
            name: 'setAudioMixingPosition',
            code: -1,
            param: JSON.stringify({
              playTime: playTime,
              reason: '暂停当前播放失败'
            }, null, ' ')
          })
          return Promise.reject(err)
        })
    })
  }

  getAudioMixingPlayedTime () {
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('getAudioMixingPlayedTime: 不支持伴音功能')
      return Promise.resolve()
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource) {
      this.adapterRef.logger.log('getAudioMixingPlayedTime: 当前没有开启伴音')
      return Promise.resolve()
    } 

    return this.webAudio.getAudioMixingPlayedTime()
  }

  getAudioMixingTotalTime () {
    if (!this.webAudio || !this.webAudio.context) {
      this.adapterRef.logger.log('startAudioMixing: 不支持伴音功能')
      return Promise.resolve()
    } else if (!this.webAudio.mixAudioConf || !this.webAudio.mixAudioConf.audioSource) {
      this.adapterRef.logger.log('getAudioMixingTotalTime: 当前没有开启伴音')
      return Promise.resolve()
    } 
    return this.webAudio.getAudioMixingTotalTime()
  }

  isMixAuido () {
    return this.webAudio && this.webAudio.mixAudioConf && this.webAudio.mixAudioConf.audioSource ? true : false
  }

  destroy() {
    this.adapterRef.logger.log('清除 meida')
    this._reset()
  }
}

export { MediaHelper }
