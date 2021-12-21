import { EventEmitter } from 'eventemitter3'
import * as GUM from '../util/gum'
import { WebAudio } from './webAudio'
import { RtcSystem } from '../util/rtcUtil/rtcSystem'
import { AuidoMixingState } from '../constant/state'
import { ajax } from '../util/ajax'
import {checkExists, isExistOptions, checkValidInteger} from "../util/param";
import {
  AdapterRef, AudioMixingOptions,
  GetStreamConstraints,
  MediaHelperOptions, MediaTypeShort, MixAudioConf, AudioEffectOptions, MediaTypeAudio, ILogger, EncodingParameters,
} from "../types";
import {emptyStreamWith, watchTrack} from "../util/gum";
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import {getParameters} from "./parameters";
import {LocalStream} from "../api/localStream";
import {RemoteStream} from "../api/remoteStream";
import {Device} from "./device";
import {Logger} from "./3rd/mediasoup-client/Logger";
import {platform} from "../util/platform";
class MediaHelper extends EventEmitter {
  stream: LocalStream|RemoteStream;
  public audio: {
    //****************** 以下为音频主流 ***************************************
    // stream对localStream而言是PeerConnection发送的MediaStream，
    // 对remoteStream而言是包含了接收的MediaStream
    // 无论是否有audio，audioStream总是存在，且始终是同一个对象。
    // 对localStream而言：
    // 1: 当audioRoutingEnabled == true 时，audioStream包含AudioDestinationNode
    // 2: 当audioRoutingEnabled == false 时，audioStream包含getUserMedia的输出
    readonly audioStream: MediaStream;
    // musicStream指没有人声的混音音乐
    readonly musicStream: MediaStream;
    // micStream指麦克风输入
    readonly micStream: MediaStream;
    // audioSourceStream指自定义音频输入
    readonly audioSourceStream: MediaStream;
    audioSource: MediaStreamTrack|null;
    micTrack: MediaStreamTrack|null;
    // Chrome为default设备做音频切换的时候，已有的track的label不会更新
    deviceInfo: {
      mic: {label: string, groupId?: string, deviceId?: string},
    }
    webAudio: WebAudio|null;
    micConstraint: {audio: MediaTrackConstraints}|null;
    mixAudioConf:MixAudioConf,
    audioRoutingEnabled: boolean;
  } = {
    audioStream: new MediaStream(),
    audioSourceStream: new MediaStream(),
    musicStream: new MediaStream(),
    micStream: new MediaStream(),
    audioSource: null,
    micTrack: null,
    // Chrome为default设备做音频切换的时候，已有的track的label不会更新
    deviceInfo: {mic: {label: ""}},
    webAudio: null,
    micConstraint: null,
    mixAudioConf: {
      index: 0,
      audioBuffer: {}, //云端音频buffer数组
      sounds: {}
    },
    audioRoutingEnabled: false,
  };
  public video: {
    // videoStream中的track可能是cameraTrack或者videoSource
    readonly videoStream: MediaStream;
    // videoTrackLow可能是cameraTrack或者videoSource的小流
    videoTrackLow: MediaStreamTrack|null
    cameraTrack: MediaStreamTrack|null;
    cameraConstraint: {video: MediaTrackConstraints};
    videoSource:MediaStreamTrack|null;
    captureConfig: { high: {width: number, height: number, frameRate: number}};
    encoderConfig: { high: EncodingParameters, low: EncodingParameters};
  } = {
    videoStream: new MediaStream(),
    videoTrackLow: null,
    cameraTrack: null,
    cameraConstraint: {video: {}},
    videoSource: null,
    captureConfig:{high: {width: 640, height: 480, frameRate: 15}},
    encoderConfig: {high: {maxBitrate: 300000}, low: {maxBitrate: 100000}},
  };
  public screen: {
    // screenVideoStream中的track可能是screenVideoTrack或者screenVideoSource
    readonly screenVideoStream: MediaStream;
    // screenVideoTrackLow可能是screenVideoTrack或者screenVideoSource的小流
    screenVideoTrackLow: MediaStreamTrack|null;
    
    screenVideoTrack: MediaStreamTrack|null;
    screenVideoSource: MediaStreamTrack|null;
    captureConfig: { high: {width: number, height: number, frameRate: number}};
    encoderConfig: {high: EncodingParameters, low: EncodingParameters};
  } = {
    screenVideoStream: new MediaStream(),
    screenVideoTrackLow: null,
    screenVideoTrack: null,
    screenVideoSource: null,
    captureConfig:{high: {width: 640, height: 480, frameRate: 15}},
    encoderConfig: {high: {maxBitrate: 400000}, low: {maxBitrate: 200000}},
  };
  public screenAudio: {
    readonly screenAudioStream: MediaStream,
    screenAudioTrack: MediaStreamTrack|null;
    screenAudioSource: MediaStreamTrack|null;
  } = {
    screenAudioStream: new MediaStream(),
    screenAudioTrack: null,
    screenAudioSource: null,
  }
  private logger: ILogger;
  
  constructor (options:MediaHelperOptions) {
    super()
    // 设置对象引用
    this.stream = options.stream;
    this.logger = options.stream.logger.getChild(()=>{
      let tag = "mediaHelper";
      if (this.audio.audioRoutingEnabled){
        tag += " WebAudio"
      }
      if (this.audio.webAudio){
        if (this.audio.webAudio.context){
          if (this.audio.webAudio.context.state !== "running"){
            tag += " " + this.audio.webAudio.context.state
          }
        }
        if (this.audio.webAudio.mixAudioConf.state !== AuidoMixingState.UNSTART){
          tag += " " + this.audio.webAudio?.mixAudioConf.state;
        } 
      }
      
      if (this.stream.mediaHelper !== this){
        tag += "DETACHED";
      }
      return tag
    })
    Device.on("recording-device-changed", (evt)=>{
      if (this.audio.micTrack){
        if (this.audio.deviceInfo.mic.deviceId === evt.device.deviceId){
          if (evt.state === "INACTIVE"){
            this.logger.error("当前使用的麦克风设备被移除，需重新启用设备", evt.device)
            this.stream.emit('recording-device-changed', evt);
          } else {
            let device = Device.deviceHistory.audioIn.find(d=>{
              d.groupId === this.audio.deviceInfo.mic.groupId
            });
            if (!device){
              this.logger.error(`当前麦克风已由【${this.audio.deviceInfo.mic.label}】切换至【${evt.device.label}】，可能会影响通话质量`)
              this.audio.deviceInfo.mic.label = evt.device.label;
              this.audio.deviceInfo.mic.groupId = evt.device.groupId;
              this.stream.emit('recording-device-changed', evt);              
            }
          }
        }
      }
    })
  }
  
  assertLive () {
    if (!this.stream.isRemote){
      if (this.stream.destroyed){
        this._reset()
        let err = new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: '本地流已经被销毁'
        })
        throw err
      }
    }
  }

  _reset() {
    this.stopAllEffects()
    if (!this.stream.isRemote){
      if(this.audio.webAudio){
        this.audio.webAudio.off('audioFilePlaybackCompleted')
        this.audio.webAudio.destroy()
      }
      this.audio.webAudio = null
      this.audio.micConstraint = null
      this.audio.audioRoutingEnabled = false;
      if (this.audio.micTrack){
        this.audio.micTrack.stop();
        this.audio.micTrack = null;
      }
      if (this.video.videoTrackLow){
        this.video.videoTrackLow.stop();
        this.video.videoTrackLow = null;
      }
      this.video.videoSource = null;
      if (this.video.cameraTrack){
        this.video.cameraTrack.stop();
        this.video.cameraTrack = null;
      }
      if (this.screen.screenVideoTrack){
        this.screen.screenVideoTrack.stop();
        this.screen.screenVideoTrack = null;
      }
      if (this.screen.screenVideoTrackLow){
        this.screen.screenVideoTrackLow.stop();
        this.screen.screenVideoTrackLow = null;
      }
      this.video.cameraConstraint = {video: {}}
      if (this.screenAudio.screenAudioTrack){
        this.screenAudio.screenAudioTrack.stop()
        this.screenAudio.screenAudioTrack = null
      }
      this.audio.mixAudioConf = {
        index: 0,
        audioBuffer: {}, //云端音频buffer数组
        sounds: {}
      };
    }
    emptyStreamWith(this.audio.audioStream, null);
    emptyStreamWith(this.audio.musicStream, null);
    emptyStreamWith(this.audio.micStream, null);
    emptyStreamWith(this.screenAudio.screenAudioStream, null);
    emptyStreamWith(this.video.videoStream, null);
    emptyStreamWith(this.screen.screenVideoStream, null);
    emptyStreamWith(this.screenAudio.screenAudioStream, null);
  }
  
  updateWebAudio() {
    if (!this.audio.webAudio) {
      this.audio.webAudio = new WebAudio({
        logger: this.logger,
      })
      this.audio.webAudio.on('audioFilePlaybackCompleted', this._audioFilePlaybackCompletedEvent.bind(this))
      const musicTrack = this.audio.webAudio?.musicDestination?.stream.getAudioTracks()[0];
      if (musicTrack){
        emptyStreamWith(this.audio.musicStream, musicTrack);
      }
    }
    this.audio.webAudio.updateTracks([
      {track: this.audio.micTrack || this.audio.audioSource, type: 'microphone'},
      {track: this.screenAudio.screenAudioTrack || this.screenAudio.screenAudioSource, type: 'screenAudio'},
    ])
  }
  async getScreenSource(constraint:GetStreamConstraints) {
    const {width, height, frameRate} = this.convert(this.screen.captureConfig.high)
    let screenStream = await GUM.getScreenStream({
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
      },
    }, this.logger)
    return screenStream;
  }

  async getStream(constraint:GetStreamConstraints) {
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
    if (audioSource){
      audio = true;
    }
    if (videoSource){
      video = true;
    }
    if (screenVideoSource){
      screen = true;
    }
    if (screenAudioSource){
      screenAudio = true;
    }
    if(!audio && !video && !screen && !screenAudio){
      this.logger.error('getStream: 必须指定媒体类型')
      return
    }
    if (audioSource) {
      if (audioSource.readyState === "ended"){
        this.logger.error("不应输入已经停止的轨道:", audioSource.kind, audioSource.label)
        return;
      }
      watchTrack(audioSource);
      this.audio.audioSource = audioSource;
      emptyStreamWith(this.audio.audioSourceStream, audioSource);
      this.updateWebAudio();
      if (!this.audio.audioRoutingEnabled){
        if (this.getAudioInputTracks().length > 1){
          this.enableAudioRouting();
        }else{
          emptyStreamWith(this.audio.audioStream, audioSource);
          this.updateAudioSender(audioSource);
        }
      }
      audio = false
    }

    if (videoSource) {
      if (videoSource.readyState === "ended"){
        this.logger.error("不应输入已经停止的轨道:", videoSource.kind, videoSource.label)
        return;
      }
      watchTrack(videoSource);
      this.video.videoSource = videoSource;
      emptyStreamWith(this.video.videoStream, videoSource);
      video = false
    }

    if (screenAudioSource) {
      if (screenAudioSource.readyState === "ended"){
        this.logger.error("不应输入已经停止的轨道:", screenAudioSource.kind, screenAudioSource.label)
        return;
      }
      watchTrack(screenAudioSource);
      this.screenAudio.screenAudioSource = screenAudioSource;
      emptyStreamWith(this.screenAudio.screenAudioStream, screenAudioSource);
      this.listenToTrackEnded(this.screenAudio.screenAudioSource);
      this.updateWebAudio();
      if (!this.audio.audioRoutingEnabled){
        if (this.getAudioInputTracks().length > 1){
          this.enableAudioRouting();
        }else{
          emptyStreamWith(this.audio.audioStream, screenAudioSource);
          this.updateAudioSender(screenAudioSource);
        }
      }
      screenAudio = false
    }

    if (screenVideoSource) {
      if (screenVideoSource.readyState === "ended"){
        this.logger.error("不应输入已经停止的轨道:", screenVideoSource.kind, screenVideoSource.label)
        return;
      }
      watchTrack(screenVideoSource);
      this.screen.screenVideoSource = screenVideoSource;
      emptyStreamWith(this.screen.screenVideoStream, screenVideoSource);
      screen = false;
    }

    try {
      if (screen) {
        if (this.stream.isRemote){
          this.logger.error('getStream: 远端流不能够调用getStream');
          return;
        }
        const {width, height, frameRate} = this.screen.captureConfig.high
        
        if (sourceId) {
          const stream = await GUM.getStream({
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
          }, this.logger)
          const cameraTrack = stream.getTracks()[0];
          this.video.cameraTrack = cameraTrack;
          emptyStreamWith(this.video.videoStream, cameraTrack)
        } else {
          let gdmStream = await GUM.getScreenStream({
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
            },
            audio: (screenAudio && this.getAudioConstraints()) ? this.getAudioConstraints() : screenAudio,
          }, this.logger)
          this.screen.screenVideoTrack = gdmStream.getVideoTracks()[0]
          this.listenToTrackEnded(this.screen.screenVideoTrack);
          emptyStreamWith(this.screen.screenVideoStream, this.screen.screenVideoTrack)
          if (screenAudio) {
            const screenAudioTrack = gdmStream.getAudioTracks()[0];
            if (screenAudioTrack){
              this.screenAudio.screenAudioTrack = screenAudioTrack
              emptyStreamWith(this.screenAudio.screenAudioStream, screenAudioTrack)
              this.listenToTrackEnded(screenAudioTrack);
              this.updateWebAudio()
              if (!this.audio.audioRoutingEnabled){
                if (this.getAudioInputTracks().length > 1){
                  this.enableAudioRouting();
                }else{
                  emptyStreamWith(this.audio.audioStream, screenAudioTrack);
                  this.updateAudioSender(screenAudioTrack);
                }
              }
            }else{
              this.logger.warn('getStream screenAudio: 未获取到屏幕共享音频');
              this.stream.screenAudio = false;
              this.stream.client.emit('error', 'screenAudioNotAllowed');
            }
          }
        }
        
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_screen',
          oper: '1',
          value: 'success'
        })
        if (audio) {
          let gumAudioStream = await GUM.getStream({
            audio: (this.getAudioConstraints()) ? this.getAudioConstraints() : true,
          }, this.logger)
          this.audio.micTrack = gumAudioStream.getAudioTracks()[0];
          emptyStreamWith(this.audio.micStream, this.audio.micTrack)
          this.listenToTrackEnded(this.audio.micTrack)
          this.updateWebAudio();
          if (!this.audio.audioRoutingEnabled){
            if (this.getAudioInputTracks().length > 1){
              this.enableAudioRouting();
            }else{
              emptyStreamWith(this.audio.audioStream, this.audio.micTrack);
              this.updateAudioSender(this.audio.micTrack);
            }
          }
          const micSettings = this.audio.micTrack.getSettings();
          this.audio.deviceInfo.mic.label = this.audio.micTrack.label;
          this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
          this.audio.deviceInfo.mic.groupId = micSettings.groupId;
          this.stream.client.apiEventReport('setFunction', {
            name: 'set_mic',
            oper: '1',
            value: 'success'
          })
        }
      } else if (screenAudio){
        // 阻止有screenAudio没screen的情况
        this.logger.error('无法单独获取屏幕共享音频')
      } else if (audio || video) {
        if (this.stream.isRemote){
          this.logger.error('MediaHelper.getStream:远端流不能调用getStream');
          return;
        }
        const {height, width, frameRate} = this.video.captureConfig.high
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

        if (video) {
          if (facingMode) {
            (config.video as any).facingMode = {
              exact: facingMode
            }
          } else if (videoDeviceId) {
            (config.video as any).deviceId = {
              exact: videoDeviceId
            }
          }
        }
        

        const gumStream = await GUM.getStream(config, this.logger)
        const cameraTrack = gumStream.getVideoTracks()[0];
        const micTrack = gumStream.getAudioTracks()[0];
        if (micTrack){
          this.audio.micTrack = micTrack;
          this.listenToTrackEnded(this.audio.micTrack);
          emptyStreamWith(this.audio.micStream, this.audio.micTrack);
          this.updateWebAudio();
          if (!this.audio.audioRoutingEnabled){
            if (this.getAudioInputTracks().length > 1){
              this.enableAudioRouting();
            }else{
              emptyStreamWith(this.audio.audioStream, this.audio.micTrack);
              this.updateAudioSender(this.audio.micTrack);
            }
          }
          const micSettings = micTrack.getSettings()
          this.audio.deviceInfo.mic.label = this.audio.micTrack.label;
          this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
          this.audio.deviceInfo.mic.groupId = micSettings.groupId;
          this.stream.client.apiEventReport('setFunction', {
            name: 'set_mic',
            oper: '1',
            value: 'success'
          })
          if (typeof config.audio === "object"){
            this.audio.micConstraint = {audio: config.audio}
          }
        }
        if (cameraTrack){
          this.video.cameraTrack = cameraTrack;
          emptyStreamWith(this.video.videoStream, cameraTrack);
          this.listenToTrackEnded(this.video.cameraTrack);
          this.stream.client.apiEventReport('setFunction', {
            name: 'set_camera',
            oper: '1',
            value: 'success'
          })
          if (typeof config.video === "object"){
            this.video.cameraConstraint = {video: config.video}
          }
        }
      }
      this.assertLive()
    } catch (e){
      this.logger.error('getStream error:', e.name, e.message)
      if (audio) {
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_mic',
          oper: '1',
          value: e.message
        })
      } 
      if (video) {
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_camera',
          oper: '1',
          value: e.message
        })
      } 
      if (screen) {
        this.stream.client.apiEventReport('setFunction', {
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
      this.logger.error('getSecondStream:必须指定一个参数');
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'getSecondStream: audio/video is invalid'
        })
      )
    }
    if (this.stream.isRemote){
      throw new Error('getSecondStream:远端用户不能调用getSecondStream');
    }

    try {
      const gumStream = await GUM.getStream(constraint, this.logger)
      const audioTrack = gumStream.getAudioTracks()[0]
      const videoTrack = gumStream.getVideoTracks()[0]
      this.logger.log(`getSecondStream: ${audioTrack ? audioTrack.label : ""} ${videoTrack ? videoTrack.label : ""}`)
      if (audioTrack) {
        if (typeof constraint.audio === "object"){
          this.audio.micConstraint = {audio: constraint.audio}
        }
        this.audio.micTrack = audioTrack
        this._stopTrack(this.audio.micStream)
        emptyStreamWith(this.audio.micStream, this.audio.micTrack)
        this.listenToTrackEnded(this.audio.micTrack);
        this.updateWebAudio();
        if (!this.audio.audioRoutingEnabled){
          if (this.getAudioInputTracks().length > 1){
            this.enableAudioRouting();
          }else{
            emptyStreamWith(this.audio.audioStream, this.audio.micTrack);
            this.updateAudioSender(this.audio.micTrack);
          }
        }
        const micSettings = audioTrack.getSettings();
        this.audio.deviceInfo.mic.label = this.audio.micTrack.label;
        this.audio.deviceInfo.mic.deviceId = micSettings.deviceId
        this.audio.deviceInfo.mic.groupId = micSettings.groupId;

        this.stream.client.apiEventReport('setFunction', {
          name: 'set_mic',
          oper: '1',
          value: 'success'
        })
      }

      if (videoTrack) {
        if (typeof constraint.video === "object"){
          this.video.cameraConstraint = {video: constraint.video}
        }
        this.video.cameraTrack = videoTrack
        this._stopTrack(this.video.videoStream)
        emptyStreamWith(this.video.videoStream, this.video.cameraTrack);
        
        this.stream.client.apiEventReport('setFunction', {
          name: 'set_camera',
          oper: '1',
          value: 'success'
        })
        const videoView = this.stream.Play?.videoView
        if (videoView) {
          await this.stream.play(videoView)
          if ("width" in this.stream.renderMode.local.video){
            this.stream.setLocalRenderMode(this.stream.renderMode.local.video, 'video')
          }
        }
        const videoSender = this.stream.getSender("video", "high");
        if (videoSender?.track) {
          videoSender.replaceTrack(videoTrack)
        } else {
          this.logger.warn('getSecondStream video: 此时未发布流')
        }
        const videoSenderLow = this.stream.getSender("video", "high");
        this.video.videoTrackLow?.stop()
        this.video.videoTrackLow = null
        if (videoSenderLow?.track?.readyState === "live"){
          await this.createTrackLow("video");
          this.logger.log('getSecondStream 切换小流', this.video.videoTrackLow);
          videoSenderLow.replaceTrack(this.video.videoTrackLow);
        }
      }
    } catch (e){
      this.logger.error('getStream error', e.message)
      const name = audio ? 'set_mic' : 'set_camera'
      this.stream.client.apiEventReport('setFunction', {
        name,
        oper: '1',
        value: e.message
      })
      return Promise.reject(e)
    }
  }

  async createTrackLow(mediaType: "video"|"screen") :Promise<MediaStreamTrack|null> {
    let constraintsLow:MediaTrackConstraints, trackHigh;
    if (mediaType === "video"){
      constraintsLow = JSON.parse(JSON.stringify(getParameters().videoLowDefaultConstraints));
      // trackHigh可能来自于摄像头或自定义视频
      trackHigh = this.video.videoStream.getVideoTracks()[0];
    }else{
      constraintsLow = JSON.parse(JSON.stringify(getParameters().screenLowDefaultConstraints));
      // trackHigh可能来自于摄像头或自定义视频
      trackHigh = this.screen.screenVideoStream.getVideoTracks()[0];
    }

    if (trackHigh?.readyState !== "live"){
      this.logger.error(`创建小流失败：大流已在停止状态`, trackHigh?.label)
      this.stream.client.safeEmit('track-low-init-fail', {mediaType})
      return null
    }
    this.logger.log("创建小流", mediaType, trackHigh.label, constraintsLow);
    const videoTrackLow = trackHigh.clone();
    const settings = trackHigh.getSettings();
    if (mediaType === "screen" && platform.name === "Safari"){
      this.logger.log(`创建小流：${mediaType} + ${platform.name} 使用与大流一样的分辨率 ${settings.width}x${settings.height}`)
    }
    else if (settings.width && settings.height) {
      try{
        constraintsLow.aspectRatio = settings.width / settings.height
        await videoTrackLow.applyConstraints(constraintsLow);
      }catch(e){
        this.logger.warn(`创建小流：无法应用配置。小流与大流使用一样的分辨率。${settings.width}x${settings.height}。${JSON.stringify(constraintsLow)} ${e.name} ${e.message}`)
      }
      const settingsHigh2 = trackHigh.getSettings();
      if (settingsHigh2.width !== settings.width || settingsHigh2.height !== settings.height){
        this.logger.warn(`创建小流：applyConstraints影响了大流宽高。${settings.width}x${settings.height} => ${settingsHigh2.width}x${settingsHigh2.height}。回滚大流配置，小流与大流使用一样的分辨率。`)
        await trackHigh.applyConstraints(settings);
        await videoTrackLow.applyConstraints(settings);
      }else{
        const settingsLow = videoTrackLow.getSettings();
        this.logger.log(`创建小流成功。大流宽高：${settings.width}x${settings.height} 小流宽高：${settingsLow.width}x${settingsLow.height}`)
      }
    }else{
      this.logger.warn(`创建小流：无法获取原始视频宽高。大流和小流使用同样的分辨率。${JSON.stringify(settings)}`)
    }
    watchTrack(videoTrackLow);
    if (mediaType === "video"){
      this.video.videoTrackLow = videoTrackLow;
    }else{
      this.screen.screenVideoTrackLow = videoTrackLow;
    }
    this.stream.client.safeEmit('track-low-init-success', {mediaType})
    return videoTrackLow;
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
    if (this.stream.isRemote){
      this.logger.error('Remote Stream dont have audio constraints');
      return;
    }
    const audioProcessing = this.stream.audioProcessing;
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
    switch(this.stream.audioProfile){
      case "standard_stereo":
        constraint.channelCount = 2;
        break;
      case "high_quality_stereo":
        constraint.channelCount = 2;
        break;
    }
    if (JSON.stringify(constraint) === "{}") {
      return null;
    } else {
      return constraint;
    }
  }
  
  // 仅在remoteStream
  updateStream(kind:MediaTypeShort, track:MediaStreamTrack) {
    if (kind === 'audio') {
      this.audio.micTrack = track;
      emptyStreamWith(this.audio.audioStream, track);
      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play?.audioDom){
        this.stream._play.audioDom.srcObject = this.audio.audioStream
      }
    } else if (kind === 'video') {
      this.video.cameraTrack = track;
      emptyStreamWith(this.video.videoStream, track)
      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play?.videoDom){
        this.stream._play.videoDom.srcObject = this.video.videoStream
      }
    } else if (kind === 'screen') {
      this.screen.screenVideoTrack = track;
      emptyStreamWith(this.screen.screenVideoStream, track)
      // Safari：即使前后属性相同，也需要重新设一遍srcObject
      if (this.stream._play?.screenDom){
        this.stream._play.screenDom.srcObject = this.screen.screenVideoStream
      }
    }
  }

  stopStream(kind:MediaTypeShort|'screenAudio') {
    let type = 'set_mic'
    if (kind === 'audio') {
      this.audio.micTrack?.stop();
      this.audio.micTrack = null;
      emptyStreamWith(this.audio.micStream, null);
      this.audio.audioSource = null;
      emptyStreamWith(this.audio.audioSourceStream, null);
      this.updateWebAudio()
      if (this.canDisableAudioRouting()){
        this.disableAudioRouting();
      }
    } else if (kind === 'screenAudio') {
      this.screenAudio.screenAudioTrack?.stop();
      this.screenAudio.screenAudioTrack = null;
      this.screenAudio.screenAudioSource = null;
      emptyStreamWith(this.screenAudio.screenAudioStream, null);
      this.updateWebAudio();
      if (this.canDisableAudioRouting()){
        this.disableAudioRouting();
      }
    } else if (kind === 'video') {
      type = 'set_camera'
      this.video.cameraTrack?.stop()
      this.video.cameraTrack = null
      emptyStreamWith(this.video.videoStream, null);
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

  _stopTrack (stream:MediaStream) {
    if (!stream) return
    if (this.stream.isRemote) return
    this.logger.log('清除stream: ', stream)
    const tracks = stream.getTracks()
    this.logger.log('清除stream: ', ...tracks)
    if (!tracks || tracks.length === 0) return
    tracks.forEach(track => {
      if (track.kind === "audio"){
        const globalTrackId = getParameters().tracks.audio.findIndex((mediaTrack)=>{
          return track === mediaTrack;
        })
        Logger.warn(`Stopping AUDIOTRACK#${globalTrackId} ${track.id}, ${track.label}, ${track.readyState}`);
      }else{
        const globalTrackId = getParameters().tracks.video.findIndex((mediaTrack)=>{
          return track === mediaTrack;
        })
        Logger.warn(`Stopping VIDEOTRACK#${globalTrackId} ${track.id}, ${track.label}, ${track.readyState}`);
      }
      track.stop()
      stream.removeTrack(track);
      if (this.audio.micTrack === track){
        this.audio.micTrack = null;
        this.audio.deviceInfo.mic = {label: ""};
        this.updateWebAudio()
      }
      if (this.screenAudio.screenAudioTrack === track){
        this.screenAudio.screenAudioTrack = null;
        this.updateWebAudio()
      }
      if (this.video.cameraTrack === track){
        this.video.cameraTrack = null;
        if (this.video.videoTrackLow){
          this.logger.log('停止视频小流:', this.video.videoTrackLow);
          this.video.videoTrackLow.stop();
          this.video.videoTrackLow = null;
        }
      }
      if (this.screen.screenVideoTrack === track){
        this.screen.screenVideoTrack = null;
        if (this.screen.screenVideoTrackLow){
          this.logger.log('停止辅流小流:', this.screen.screenVideoTrackLow);
          this.screen.screenVideoTrackLow.stop();
          this.screen.screenVideoTrackLow = null;
        }
      }
    })
  }

  getAudioTrack () {
    return this.audio?.audioStream.getAudioTracks()[0];
  }
  
  getVideoTrack () {
    return this.video?.videoStream.getVideoTracks()[0];
  }

  /**
   * 设置本地音频采集音量
   * @param {Number} gain 0-1
   */
  setGain (gain:number, audioType?: MediaTypeAudio) {
    if (this.audio.webAudio) {
      this.logger.log('setGain', gain);
      this.audio.webAudio.setGain(gain, audioType)
      if (this.canDisableAudioRouting()){
        this.disableAudioRouting();
      }
    }else{
      this.logger.log('setGain: 缺失本地音频')
      return
    }
  }

  getGain () {
    return (this.audio.webAudio?.getVolumeData()) || '0.0'
  }

  canDisableAudioRouting(){

    let isMixAuidoCompleted = true
    if(!this.audio.webAudio) return false
    
    //判断伴音是否都已经结束了
    if (this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PLAYED || this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED) {
      isMixAuidoCompleted = false
    }

    //判断音效是否都已经结束了
    Object.values(this.audio.mixAudioConf.sounds).forEach(item => {
      if (item.state === 'STARTING' || item.state === 'PLAYED' || item.state === 'PAUSED') {
        isMixAuidoCompleted = false
        return
      }
    })
    
    //判断音量是不是1
    const minGain = this.audio.webAudio.getGainMin()
    
    //判断麦克风和屏幕共享是不是最多只有一个
    
    return isMixAuidoCompleted && minGain === 1 && (this.audio.webAudio.audioInArr.length <= 1)
    
  }


  /******************************* 伴音 ********************************/

  _audioFilePlaybackCompletedEvent () {
    if (this.canDisableAudioRouting()) {
      this.disableAudioRouting();
    }
  }

  startAudioMixing (options:AudioMixingOptions) {
    this.logger.log(`开始伴音:`, JSON.stringify(options, null, ' '))
    Object.assign(this.audio.mixAudioConf, options)
    let reason = null
    if (!this.audio.mixAudioConf.audioFilePath) {
      this.logger.log('开始伴音: 没有找到云端文件路径')
      reason = 'INVALID_ARGUMENTS'
    } else if (this.getAudioInputTracks().length === 0 || !this.stream.pubStatus.audio.audio) {
      this.logger.log('开始伴音: 当前没有publish音频')
      reason = 'NOT_PUBLIST_AUDIO_YET'
    } else if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('开始伴音: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    }

    if (reason) {
      this.stream.client.apiFrequencyControl({
        name: 'startAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.audio.mixAudioConf, {
          reason: reason
        }), null, ' ')
      })
      if(reason === 'INVALID_ARGUMENTS') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'file path not found'
          })
        )
      }else if(reason === 'NOT_PUBLIST_AUDIO_YET'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'audio source is not published'
          })
        )
      }else if(reason === 'BROWSER_NOT_SUPPORT'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'audio mixing is not supported in this browser'
          })
        )
      }
    }

    this.stream.client.apiFrequencyControl({
      name: 'startAudioMixing',
      code: 0,
      param: JSON.stringify(this.audio.mixAudioConf, null, ' ')
    })

    if (this.audio.webAudio){
      if (this.audio.webAudio.mixAudioConf && this.audio.webAudio.mixAudioConf.audioSource && this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PLAYED) {
        this.logger.log('startAudioMixing: 当前已经开启伴音，先关闭之前的伴音')
        this.stopAudioMixing()
      }

      this.audio.webAudio.mixAudioConf.state === AuidoMixingState.STARTING
    }
    if (this.audio.mixAudioConf.audioFilePath && this.audio.mixAudioConf.audioBuffer[this.audio.mixAudioConf.audioFilePath]) {
      this.logger.log('开始伴音, 已经加载过云端音乐')
      return this.startMix(this.audio.mixAudioConf.index)
    } else {
      this.logger.log('开始伴音, 先加载云端音乐')
      return this.loadRemoteAudioFile(this.audio.mixAudioConf.index)
    }
    
  }

  /*
    加载云端音频文件
   */
  loadRemoteAudioFile (index: number) {
    if (!this.audio.mixAudioConf.audioFilePath){
      this.logger.error('audioFilePath未设置')
      return;
    }
    return ajax({
      url: this.audio.mixAudioConf.audioFilePath,
      type: 'GET',
      dataType: 'arraybuffer'
    }).then(data => {
      this.logger.log("loadRemoteAudioFile 加载云端音乐成功")
      return new Promise((resolve, reject) => {
        if (!this.audio.webAudio || !this.audio.webAudio.context){
          reject(
            new RtcError({
              code: ErrorCode.NOT_SUPPORT,
              message: 'webAudio lost'
            })
          )
          return;
        }
        this.audio.webAudio.context.decodeAudioData(data as ArrayBuffer, buffer => {
          this.logger.log("loadRemoteAudioFile 云端音乐解码成功")
          if (!this.audio.mixAudioConf.audioFilePath){
            reject(
              new RtcError({
                code: ErrorCode.STATE_ERROR,
                message: 'state error'
              })
            )
            return;
          }
          this.audio.mixAudioConf.audioBuffer[this.audio.mixAudioConf.audioFilePath] =buffer;
          this.startMix(index).then(res => {
            resolve(res);
          })
        }, e => {
          this.logger.log("loadRemoteAudioFile 云端音乐解码失败：", e)
          reject(
            new RtcError({
              code: ErrorCode.STATE_ERROR,
              message: 'create buffersource failed'
            })
          )
        })
      })
    }).catch(error => {
      this.logger.log('loadRemoteAudioFile 加载云端音乐失败: ', error.name, error.message, error)
      return Promise.reject(
        new RtcError({
          code: ErrorCode.STATE_ERROR,
          message: 'load audio failed'
        })
      ) 
    })
  }
  
  listenToTrackEnded = (track: MediaStreamTrack|null)=>{
    if (!track){
      return;
    }
    track.addEventListener('ended', ()=>{
      this.logger.log("Track ended", track.label, track.id);
      if (this.stream !== this.stream.client.adapterRef.localStream){
        return;
      }
      if (track === this.audio.micTrack || track === this.audio.audioSource){
        //停止的原因可能是设备拔出、取消授权等
        this.logger.warn('音频轨道已停止')
        this.stream.client.safeEmit('audioTrackEnded')
      }
      if (track === this.video.cameraTrack || track === this.video.videoSource){
        //停止的原因可能是设备拔出、取消授权等
        this.logger.warn('视频轨道已停止')
        this.stream.client.safeEmit('videoTrackEnded')
      }
      // 分别处理 Chrome 共享屏幕中的“整个屏幕”、“窗口”、“Chrome标签页”
      if (track === this.screen.screenVideoTrack ||
          track === this.screen.screenVideoSource ||
        (track.label.indexOf('screen') > -1) || 
        (track.label.indexOf('window') > -1) ||
        (track.label.indexOf('web-') > -1)){
        this.logger.warn('屏幕共享已停止')
        this.stream.client.safeEmit('stopScreenSharing')
      }
      if (track === this.screenAudio.screenAudioTrack){
        this.logger.warn('屏幕共享音频已停止')
        this.stream.client.safeEmit('stopScreenAudio')
      }
    });
  }

  /*
    混音流程
   */
  startMix (index:number) {
    if (!this.audio.webAudio){
      this.logger.error('startMix:参数错误')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'startMix parameter error'
        })
      );
    }
    this.logger.log('startMix 开始混音:', JSON.stringify(this.audio.mixAudioConf))
    if (index !== this.audio.mixAudioConf.index) {
      this.logger.log('startMix: 该次伴音已经取消')
      return Promise.resolve()
    }
    if (!this.audio.audioRoutingEnabled){
      this.enableAudioRouting();
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
    return this.audio.webAudio.startMix({
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
    暂停混音
   */
  pauseAudioMixing () {
    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('pauseAudioMixing: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource || this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED) {
      this.logger.log('pauseAudioMixing: 已经暂停')
      reason = 'PAUSED'
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource || this.audio.webAudio.mixAudioConf.state !== AuidoMixingState.PLAYED) {
      this.logger.log('pauseAudioMixing: 当前没有开启伴音')
      reason = 'NOT_PLAY'
    }
    if(reason){
      this.stream.client.apiFrequencyControl({
        name: 'pauseAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.audio.mixAudioConf, {
          reason
        }), null, ' ')
      })
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'pauseAudioMixing: audio mixing is not supported in this browser'
          })
        )
      }else if(reason === 'PAUSED'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'pauseAudioMixing: has already been paused'
          })
        )
      }else if(reason === 'NOT_PLAY'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'pauseAudioMixing: audio mixing is not open'
          })
        )
      }
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
  resumeAudioMixing () {

    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('resumeAudioMixing: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('resumeAudioMixing: 当前没有开启伴音')
      reason = 'NOT_OPEN'
    } else if (this.audio.webAudio.mixAudioConf.state !== AuidoMixingState.PAUSED) {
      this.logger.log('resumeAudioMixing: 当前没有暂停伴音')
      reason = 'NOT_PAUSED'
    }
    if(reason){
      this.stream.client.apiFrequencyControl({
        name: 'resumeAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.audio.mixAudioConf, {
          reason
        }), null, ' ')
      })
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'resumeAudioMixing: audio mixing is not supported in this browser'
          })
        )
      }else if(reason === 'NOT_OPEN'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'resumeAudioMixing: audio mixing is not open'
          })
        )
      }else if(reason === 'NOT_PAUSED'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'resumeAudioMixing: audio mixing is not paused'
          })
        )
      }
    }
    this.stream.client.apiFrequencyControl({
      name: 'resumeAudioMixing',
      code: 0,
      param: JSON.stringify(this.audio.mixAudioConf, null, ' ')
    })
    if (!this.audio.webAudio){
      return;
    }
    let { audioFilePath = '', loopback = false, replace = false, cycle = 0, playStartTime = 0, auidoMixingEnd = null } = this.audio.mixAudioConf
    let playedTime = (this.audio.webAudio.mixAudioConf.pauseTime - this.audio.webAudio.mixAudioConf.startTime) / 1000 + this.audio.webAudio.mixAudioConf.playStartTime
    if (playedTime > this.audio.webAudio.mixAudioConf.totalTime) {
      this.logger.log('播发过的圈数 playedCycle: ', Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime))
      cycle = cycle - Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime)
      this.audio.mixAudioConf.cycle = cycle
    }
    if (this.audio.webAudio.mixAudioConf.setPlayStartTime) {
      this.logger.log("暂停期间，用户设置混音播发时间: ", this.audio.webAudio.mixAudioConf.setPlayStartTime)
      playStartTime = this.audio.webAudio.mixAudioConf.setPlayStartTime
      this.audio.webAudio.mixAudioConf.setPlayStartTime = 0
    } else {
      this.logger.log("恢复混音:", JSON.stringify(this.audio.webAudio.mixAudioConf))
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
    停止混音
  */
  stopAudioMixing (isFinished = true) {

    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('stopAudioMixing: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('stopAudioMixing: 当前没有开启伴音')
      reason = 'NOT_OPEN'
    } 
    if(reason){
      this.stream.client.apiFrequencyControl({
        name: 'stopAudioMixing',
        code: -1,
        param: JSON.stringify(Object.assign(this.audio.mixAudioConf, {
          reason
        }), null, ' ')
      })
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'stopAudioMixing: audio mixing is not supported in this browser'
          })
        )
      }else if(reason === 'NOT_OPEN'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'stopAudioMixing: audio mixing is not open'
          })
        )
      }
    }
    this.stream.client.apiFrequencyControl({
      name: 'stopAudioMixing',
      code: 0,
      param: JSON.stringify(this.audio.mixAudioConf, null, ' ')
    })
    if (!this.audio.webAudio){
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_SUPPORT,
          message: 'webAudio is not supported in this browser'
        })
      )
    }else{
      return this.audio.webAudio.stopAudioMixing(isFinished);
    }
  }

  /*
    设置混音音量
  */
  setAudioMixingVolume (volume:number) {
    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('setAudioMixingVolume: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('setAudioMixingVolume: 当前没有开启伴音')
      reason = 'NOT_OPEN'
    } else if (!Number.isInteger(volume)) {
      this.logger.log('setAudioMixingVolume: volume不是整数')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume < 0) {
      this.logger.log('setAudioMixingVolume: volume范围（0 - 255）')
      reason = 'INVALID_ARGUMENTS'
    } else if (volume > 255) {
      this.logger.log('setAudioMixingVolume: volume范围（0 - 255）')
      reason = 'INVALID_ARGUMENTS'
    } 
    if(reason){
      this.stream.client.apiFrequencyControl({
        name: 'adjustAudioMixingVolume',
        code: -1,
        param: JSON.stringify(Object.assign(this.audio.mixAudioConf, {
          reason,
          volume
        }), null, ' ')
      })
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'setAudioMixingVolume: audio mixing is not supported in this browser'
          })
        )
      }else if(reason === 'NOT_OPEN'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'setAudioMixingVolume: audio mixing is not open'
          })
        )
      }else if(reason === 'INVALID_ARGUMENTS'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: 'setAudioMixingVolume: volume must be an integer with scope (0 - 255)'
          })
        )
      }
    }
    this.stream.client.apiFrequencyControl({
      name: 'adjustAudioMixingVolume',
      code: 0,
      param: JSON.stringify({
        volume
      }, null, ' ')
    })
    return this.audio.webAudio && this.audio.webAudio.setAudioMixingVolume(volume)
  }
  
  setAudioMixingPlayTime (playTime:number) {
    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('setAudioMixingPlayTime: 不支持伴音功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('setAudioMixingPlayTime: 当前没有开启伴音')
     reason = 'INVALID_ARGUMENTS'
    } else if (playTime < 0) {
      this.logger.log('setAudioMixingPlayTime: playStartTime小于0')
      reason = 'INVALID_ARGUMENTS'
    } else if (playTime >= this.audio.webAudio.mixAudioConf.totalTime) {
      this.logger.log('setAudioMixingPlayTime: playStartTime大于音频文件总时长了')
      reason = 'INVALID_ARGUMENTS'
    } else if (this.audio.webAudio.mixAudioConf.state === AuidoMixingState.PAUSED) {
      this.audio.webAudio.mixAudioConf.setPlayStartTime = playTime
      this.logger.log('setAudioMixingPlayTime: 当前正在暂停，记录设置的播发位置，在恢复伴音时，跳转到此次设置的播放位置')
      return Promise.resolve()
    }
    if(reason){
      this.stream.client.apiFrequencyControl({
        name: 'setAudioMixingPosition',
        code: -1,
        param: JSON.stringify({
          playTime: playTime,
          reason: reason
        }, null, ' ')
      })
      // return Promise.reject(reason)
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'setAudioMixingPlayTime: audio mixing is not supported in this browser'
          })
        )
      }else if(reason === 'NOT_OPEN'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'setAudioMixingPlayTime: audio mixing is not open'
          })
        )
      }else if(reason === 'INVALID_ARGUMENTS'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: 'setAudioMixingPlayTime: playStartTime is invalid'
          })
        )
      }
    }

    return new Promise((resolve, reject) => {
      this.stopAudioMixing(false)
        .then(res => {
          if (!this.audio.webAudio){
            const reason = 'webAudio not supported';
            reject(reason);
            return Promise.reject(
              new RtcError({
                code: ErrorCode.NOT_SUPPORT,
                message: 'webAudio is not supported in this browser'
              })
            );
          }
          this.audio.mixAudioConf.playStartTime = playTime
          let { audioFilePath = '', loopback = false, replace = false, cycle = 0, playStartTime = 0, auidoMixingEnd = null } = this.audio.mixAudioConf
          this.logger.log("设置混音的播放位置:", this.audio.webAudio.mixAudioConf)
          let currentTime = Date.now()
          let playedTime = (currentTime - this.audio.webAudio.mixAudioConf.startTime) / 1000 + this.audio.webAudio.mixAudioConf.playStartTime
          this.logger.log('已经播放的时间: ', playedTime)
          if (playedTime > this.audio.webAudio.mixAudioConf.totalTime) {
            this.logger.log('播发过的圈数 playedCycle: ', Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime))
            cycle = cycle - Math.floor(playedTime / this.audio.webAudio.mixAudioConf.totalTime)
            this.audio.mixAudioConf.cycle = cycle
          }
          this.logger.log(`setAudioMixingPlayTime, playTime: ${playTime}, cycle: ${cycle}`)
          this.audio.webAudio.setAudioMixingPlayTime({
            buffer: this.audio.mixAudioConf.audioBuffer[audioFilePath],
            loopback: loopback,
            replace: replace,
            cycle: cycle,
            playStartTime: playStartTime,
            auidoMixingEnd: auidoMixingEnd
          }).then(res => {
            this.stream.client.apiFrequencyControl({
              name: 'setAudioMixingPosition',
              code: 0,
              param: JSON.stringify({
                playTime: playTime
              }, null, ' ')
            })
            resolve(res);
          }).catch(err => {
            this.stream.client.apiFrequencyControl({
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
          this.stream.client.apiFrequencyControl({
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
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('getAudioMixingPlayedTime: 不支持伴音功能')
      return Promise.resolve()
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('getAudioMixingPlayedTime: 当前没有开启伴音')
      return Promise.resolve()
    } 
    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingPlayedTime',
      code: 0,
      param: JSON.stringify({
        playTime: this.audio.webAudio.getAudioMixingPlayedTime()?.playedTime,
      }, null, ' ')
    })
    return this.audio.webAudio.getAudioMixingPlayedTime()
  }

  getAudioMixingTotalTime () {
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('startAudioMixing: 不支持伴音功能')
      return Promise.resolve()
    } else if (!this.audio.webAudio.mixAudioConf || !this.audio.webAudio.mixAudioConf.audioSource) {
      this.logger.log('getAudioMixingTotalTime: 当前没有开启伴音')
      return Promise.resolve()
    } 

    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingTotalTime',
      code: 0,
      param: JSON.stringify({
        totalTime: this.audio.webAudio.getAudioMixingTotalTime()?.totalTime,
      }, null, ' ')
    })
    return this.audio.webAudio.getAudioMixingTotalTime()
  }

  isMixAuido () {
    return this.audio.webAudio && this.audio.webAudio.mixAudioConf && this.audio.webAudio.mixAudioConf.audioSource ? true : false
  }


  /****************     音效功能      *******************/

  _initSoundIfNotExists (soundId: number, filePath?: string) {
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      this.audio.mixAudioConf.sounds[soundId] = {
        soundId,
        state: "UNSTART",
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

  async playEffect (options: AudioEffectOptions, playStartTime?:number) {
    const {soundId, filePath, cycle = 1} = options
    const filePathCheck = {
      tag: 'Stream.playEffect:filePath',
      value: filePath,
    };
    checkExists(filePathCheck)
    const soundIdCheck = {
      tag: 'Stream.playEffect:soundId',
      value: soundId,
      min: 1,
      max: 10000
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }
    const cycleCheck = {
      tag: 'Stream.playEffect:cycle',
      value: cycle,
      min: 1,
      max: 10000
    };

    if (isExistOptions(cycleCheck).result){
      checkValidInteger(cycleCheck);
    }


    this._initSoundIfNotExists(soundId, filePath)
    
    
    if (!this.audio.audioRoutingEnabled){
      this.enableAudioRouting();
    }

    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('playEffect: 浏览器不支持')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_SUPPORT,
          message: 'playEffect: not supported in this browser'
        })
      )
    } else if (this.audio.mixAudioConf.sounds[soundId] && (this.audio.mixAudioConf.sounds[soundId].state === 'STARTING' || this.audio.mixAudioConf.sounds[soundId].state === 'PLAYED' || this.audio.mixAudioConf.sounds[soundId].state === 'PAUSED')) {
      this.logger.log(`pauseEffect: 该音效文件正处于: ${this.audio.mixAudioConf.sounds[soundId].state} 状态`)
      if (playStartTime === undefined) {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: 'playEffect: parameter is invalid'
          })
        )
      }
    }
    this.audio.mixAudioConf.sounds[soundId].state = 'STARTING'

    if (this.audio.mixAudioConf.audioBuffer[filePath]) {
      this.logger.log('playEffect: 已经 load 音效文件')
    } else {
      this.logger.log('playEffect, 先 load 音效文件')
      await this.preloadEffect(soundId, filePath)
    }

    try {
      const result = this.audio.webAudio.createAudioBufferSource(this.audio.mixAudioConf.audioBuffer[filePath])
      this.audio.mixAudioConf.sounds[soundId].sourceNode = result.sourceNode
      if(result && result.sourceNode){
        result.sourceNode.onended = event => {
          this.stopEffect(soundId)
        }
      }
      this.audio.mixAudioConf.sounds[soundId].gainNode = result.gainNode
      this.audio.mixAudioConf.sounds[soundId].totalTime = this.audio.mixAudioConf.audioBuffer[filePath] && this.audio.mixAudioConf.audioBuffer[filePath].duration
      this.audio.mixAudioConf.sounds[soundId].cycle = cycle
      const totalTime = this.audio.mixAudioConf.audioBuffer[filePath] && this.audio.mixAudioConf.audioBuffer[filePath].duration
      this.audio.mixAudioConf.sounds[soundId].playOverTime = totalTime
      if (cycle > 1) {
        this.audio.mixAudioConf.sounds[soundId].playOverTime = cycle * totalTime - this.audio.mixAudioConf.sounds[soundId].playStartTime
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
    } catch (e) {

    }
  }

  async stopEffect (soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.stopEffect:soundId',
      value: soundId,
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }

    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('stopEffect: 浏览器不支持')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_SUPPORT,
          message: 'stopEffect: not supported in this browser'
        })
      )
    } 

    this.audio.webAudio.stopAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])
    this.audio.mixAudioConf.sounds[soundId].state = 'STOPED'
    this._audioFilePlaybackCompletedEvent()
    //delete this.audio.mixAudioConf.sounds[soundId]

    this.stream.client.apiFrequencyControl({
      name: 'stopEffect',
      code: 0,
      param: JSON.stringify(soundId, null, ' ')
    })
  }

  async pauseEffect (soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.pauseEffect:soundId',
      value: soundId,
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }
    let reason = null
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      this.logger.log('pauseEffect: 没有该音效文件')
      reason = 'SOUND_NOT_EXISTS'
    } if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('pauseEffect: 不支持音效功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (this.audio.mixAudioConf.sounds[soundId].state === 'PAUSED') {
      this.logger.log('pauseEffect: 已经暂停')
      reason = 'PAUSED'
    } else if (this.audio.mixAudioConf.sounds[soundId].state !== 'PLAYED') {
      this.logger.log('pauseEffect: 当前没有开启该音效')
      reason = 'NOT_PLAYED'
    }
    if (reason) {
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'pauseEffect: audio effect is not supported in this browser'
          })
        )
      }else if(reason === 'NOT_PLAYED'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'pauseEffect: audio effect is not open'
          })
        )
      }else if(reason === 'PAUSED'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'pauseEffect: audio effect is not played'
          })
        )
      }else if(reason === 'SOUND_NOT_EXISTS'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_FILE,
            message: 'pauseEffect: audio effect file is not found'
          })
        )
      }
    }
    if(!this.audio.webAudio) return
    this.audio.webAudio.stopAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])

    this.audio.mixAudioConf.sounds[soundId].pauseTime = Date.now()
    this.audio.mixAudioConf.sounds[soundId].state = 'PAUSED'
    let playedTime = (this.audio.mixAudioConf.sounds[soundId].pauseTime - this.audio.mixAudioConf.sounds[soundId].startTime) / 1000 + this.audio.mixAudioConf.sounds[soundId].playStartTime
    this.logger.log('pauseEffect 已经播放的时间: ', playedTime)
    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
    }
    this.logger.log("pauseEffect 暂停位置: ", playedTime)

    this.stream.client.apiFrequencyControl({
      name: 'pauseEffect',
      code: 0,
      param: JSON.stringify(soundId, null, ' ')
    })
  }

  async resumeEffect (soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.resumeEffect:soundId',
      value: soundId,
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }
    let reason = null
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      this.logger.log('resumeEffect: 没有该音效文件')
      reason = 'SOUND_NOT_EXISTS'
    } if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('resumeEffect: 不支持音效功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } else if (this.audio.mixAudioConf.sounds[soundId].state !== 'PAUSED') {
      this.logger.log('resumeEffect: 当前没有暂停该音效文件')
      reason = 'NOT_PAUSED'
    }
    if (reason) {
      if(reason === 'BROWSER_NOT_SUPPORT') {
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NOT_SUPPORT,
            message: 'resumeEffect: audio effect is not supported in this browser'
          })
        )
      }else if(reason === 'NOT_PAUSED'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.INVALID_OPERATION,
            message: 'resumeEffect: audio mixing is not paused'
          })
        )
      }else if(reason === 'SOUND_NOT_EXISTS'){
        return Promise.reject(
          new RtcError({
            code: ErrorCode.NO_FILE,
            message: 'resumeEffect: audio effect file is not found'
          })
        )
      }
    }
    if(!this.audio.webAudio) return
    let playedTime = (this.audio.mixAudioConf.sounds[soundId].pauseTime - this.audio.mixAudioConf.sounds[soundId].startTime) / 1000 + this.audio.mixAudioConf.sounds[soundId].playStartTime
    this.logger.log('resumeEffect 已经播放的时间: ', playedTime)
    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      const cyclePlayed = Math.floor(playedTime / this.audio.mixAudioConf.sounds[soundId].totalTime)
      this.logger.log('播发过的圈数 playedCycle: ', cyclePlayed)
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
      this.audio.mixAudioConf.sounds[soundId].cycle = this.audio.mixAudioConf.sounds[soundId].cycle - cyclePlayed
    }

    this.audio.mixAudioConf.sounds[soundId].playOverTime = this.audio.mixAudioConf.sounds[soundId].totalTime
    if (this.audio.mixAudioConf.sounds[soundId].cycle > 1) {
      this.audio.mixAudioConf.sounds[soundId].playOverTime = this.audio.mixAudioConf.sounds[soundId].cycle * this.audio.mixAudioConf.sounds[soundId].totalTime - this.audio.mixAudioConf.sounds[soundId].playStartTime
    }

    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
    }
    this.audio.mixAudioConf.sounds[soundId].playStartTime = playedTime
    this.logger.log('resumeEffect 回复重置的时间点：', playedTime)
    //this.audio.webAudio.startAudioEffectMix(this.audio.mixAudioConf.sounds[soundId])
    this.playEffect({soundId, filePath: this.audio.mixAudioConf.sounds[soundId].filePath, cycle: this.audio.mixAudioConf.sounds[soundId].cycle}, playedTime)
    this.audio.mixAudioConf.sounds[soundId].state = 'PLAYED'
    this.audio.mixAudioConf.sounds[soundId].startTime = Date.now()

    this.stream.client.apiFrequencyControl({
      name: 'resumeEffect',
      code: 0,
      param: JSON.stringify(soundId, null, ' ')
    })
  }

  async setVolumeOfEffect (soundId: number, volume: number) {
    const soundIdCheck = {
      tag: 'Stream.setVolumeOfEffect:soundId',
      value: soundId,
      min: 1
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }
    const volumeCheck = {
      tag: 'Stream.setVolumeOfEffect:volume',
      value: volume,
      min: 0,
      max: 100
    };

    if (isExistOptions(volumeCheck).result){
      checkValidInteger(volumeCheck);
    }

    this.logger.log(`setVolumeOfEffect 设置 ${soundId} 音效文件的音量: ${volume}`)
    this._initSoundIfNotExists(soundId)
    let reason = null
    if (!this.audio.webAudio || !this.audio.webAudio.context) {
      this.logger.log('setVolumeOfEffect: 不支持音效功能')
      reason = 'BROWSER_NOT_SUPPORT'
    } 
    if (reason) {
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_SUPPORT,
          message: 'setVolumeOfEffect: audio effect is not supported in this browser'
        })
      )
    }
    const gainNode = this.audio.mixAudioConf.sounds[soundId]?.gainNode
    if (gainNode) {
      gainNode.gain.value = volume/100
    } else {
      this.logger.log('setVolumeOfEffect: no gainNode')
    }
    this.audio.mixAudioConf.sounds[soundId].volume = volume

    this.stream.client.apiFrequencyControl({
      name: 'setVolumeOfEffect',
      code: 0,
      param: JSON.stringify({
        soundId: soundId,
        volume: volume
      }, null, ' ')
    })
  }

  async preloadEffect (soundId: number, filePath: string) {
    const filePathCheck = {
      tag: 'Stream.preloadEffect:filePath',
      value: filePath,
    };
    checkExists(filePathCheck)
    const soundIdCheck = {
      tag: 'Stream.preloadEffect:soundId',
      value: soundId,
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }
    this.logger.log(`preloadEffect 设置soundId: ${soundId}, 音效文件的filePath: ${filePath}`)
    this._initSoundIfNotExists(soundId, filePath)
    if (!this.audio.audioRoutingEnabled){
      this.enableAudioRouting();
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
        param: JSON.stringify({
          soundId: soundId,
          filePath: filePath
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('preloadEffect 错误: ', e.name, e.message, e)
      this.stream.client.apiFrequencyControl({
        name: 'preloadEffect',
        code: -1,
        param: JSON.stringify({
          reason: e
        }, null, ' ')
      })
    }

  }

  async unloadEffect (soundId: number) {
    const soundIdCheck = {
      tag: 'Stream.unloadEffect:soundId',
      value: soundId,
      min: 1
    };
    if (isExistOptions(soundIdCheck).result){
      checkValidInteger(soundIdCheck);
    }
    this.logger.log(`unloadEffect： ${soundId} 音效文件`)
    if (!this.audio.mixAudioConf.sounds[soundId]) {
      this.logger.log('unloadEffect: 没有该音效文件')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NO_FILE,
          message: 'unloadEffect: audio effect file is not found'
        })
      )
    } else if (this.audio.mixAudioConf.sounds[soundId].state !== 'UNSTART' && this.audio.mixAudioConf.sounds[soundId].state !== 'STOPED') {
      this.logger.log('unloadEffect: 该音效文件已经播放，请使用 stopEffect 方法')
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_OPERATION,
          message: 'unloadEffect: invalid operation'
        })
      )
    }
    delete this.audio.mixAudioConf.audioBuffer[this.audio.mixAudioConf.sounds[soundId].filePath]
    delete this.audio.mixAudioConf.sounds[soundId]

    this.stream.client.apiFrequencyControl({
      name: 'unloadEffect',
      code: 0,
      param: JSON.stringify({
        soundId: soundId
      }, null, ' ')
    })

  }

  getEffectsVolume () {
    this.logger.log(`getEffectsVolume`)
    const result = new Array()
    Object.values(this.audio.mixAudioConf.sounds).forEach(item => {
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

  setEffectsVolume (volume: number) {
    const volumeCheck = {
      tag: 'Stream.setEffectsVolume:volume',
      value: volume,
      min: 0,
      max: 100
    };
    if (isExistOptions(volumeCheck).result){
      checkValidInteger(volumeCheck);
    }
    this.logger.log(`setEffectsVolume, 设置音量: ${volume}`)
    Object.values(this.audio.mixAudioConf.sounds).forEach(item => {
      this.setVolumeOfEffect(item.soundId, volume)
    })
    this.stream.client.apiFrequencyControl({
      name: 'setEffectsVolume',
      code: 0,
      param: JSON.stringify({volume: volume}, null, 2)
    })

  }

  async stopAllEffects () {
    this.logger.log(`stopAllEffects`)
    Object.values(this.audio.mixAudioConf.sounds).forEach(item => {
      if (item.state === "PLAYED" || item.state === "PAUSED"){
        this.stopEffect(item.soundId)
      }
    })
    this.stream.client.apiFrequencyControl({
      name: 'stopAllEffects',
      code: 0,
      param: JSON.stringify('stopAllEffects', null, 2)
    })

  }

  async pauseAllEffects () {
    this.logger.log(`pauseAllEffects`)
    Object.values(this.audio.mixAudioConf.sounds).forEach(item => {
      if (item.state === "PLAYED"){
        this.pauseEffect(item.soundId)
      }
    })
    this.stream.client.apiFrequencyControl({
      name: 'pauseAllEffects',
      code: 0,
      param: JSON.stringify('pauseAllEffects', null, 2)
    })

  }

  async resumeAllEffects () {
    this.logger.log(`resumeAllEffects`)
    Object.values(this.audio.mixAudioConf.sounds).forEach(item => {
      if (item.state === "PAUSED"){
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
    const {soundId, filePath, cycle = 1} = options
    if (!this.audio.mixAudioConf || JSON.stringify(this.audio.mixAudioConf.sounds) === '{}') {
      this.logger.log('getAudioEffectsTotalTime: 当前没有音效文件')
      return Promise.resolve()
    }
    this._initSoundIfNotExists(soundId, filePath);
    let totalTime;
    if(this.audio.mixAudioConf.sounds[soundId].state === 'PLAYED'){
      totalTime = this.audio.mixAudioConf.sounds[soundId].totalTime;
    }

    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingTotalTime',
      code: 0,
      param: JSON.stringify({
        totalTime: totalTime,
      }, null, ' ')
    })
    return totalTime;
  }

  getAudioEffectsPlayedTime(options: AudioEffectOptions) { // TODO
    const {soundId, filePath, cycle = 1} = options
    if (!this.audio.mixAudioConf || JSON.stringify(this.audio.mixAudioConf.sounds) === '{}') {
      this.logger.log('getAudioEffectsTotalTime: 当前没有音效文件')
      return Promise.resolve()
    }
    this._initSoundIfNotExists(soundId, filePath);

    let currentTime = Date.now();
    if (this.audio.mixAudioConf.sounds[soundId].state == 'PAUSED') {
      this.logger.log('当前是暂停状态')
      currentTime = this.audio.mixAudioConf.sounds[soundId].pauseTime
    }
    let playedTime = (currentTime - this.audio.mixAudioConf.sounds[soundId].startTime) / 1000 + this.audio.mixAudioConf.sounds[soundId].playStartTime
    //this.logger.log('已经播放的时间: ', playedTime)
    if (playedTime > this.audio.mixAudioConf.sounds[soundId].totalTime) {
      playedTime = playedTime % this.audio.mixAudioConf.sounds[soundId].totalTime
    }
    //this.logger.log("当前播放进度:", playedTime)

    

    this.stream.client.apiFrequencyControl({
      name: 'getAudioMixingPlayedTime',
      code: 0,
      param: JSON.stringify({
        playTime: playedTime
      }, null, ' ')
    })
    return {playedTime: playedTime}
  }

  loadAudioBuffer (filePath: string) {
    return ajax({
      url: filePath,
      type: 'GET',
      dataType: 'arraybuffer'
    }).then(data => {
      this.logger.log("loadAudioBuffer 加载 audio file 成功")
      return new Promise((resolve, reject) => {
        if (!this.audio.webAudio || !this.audio.webAudio.context){
          reject(
            new RtcError({
              code: ErrorCode.STATE_ERROR,
              message: 'webAudio lost'
            })
          )
          return;
        }
        this.audio.webAudio.context.decodeAudioData(data as ArrayBuffer, buffer => {
          this.logger.log("loadAudioBuffer audio file 解码成功")
          this.audio.mixAudioConf.audioBuffer[filePath] = buffer;
          resolve(buffer)
        }, e => {
          this.logger.log("loadRemoteAudioFile 云端音乐解码失败：", e)
          reject(
            new RtcError({
              code: ErrorCode.DECODE_FAILED,
              message: 'create buffersource failed'
            })
          )
        })
      })
    }).catch(error => {
      this.logger.log('loadRemoteAudioFile 加载云端音乐失败: ', error)
      return Promise.reject(
        new RtcError({
          code: ErrorCode.STATE_ERROR,
          message: 'load audio failed'
        })
      )
    })
  }

  getAudioInputTracks(): MediaStreamTrack[] {
    let tracks:MediaStreamTrack[] = [];
    if (this.audio.audioSource?.readyState === "live"){
      tracks.push(this.audio.audioSource)
    }
    if (this.audio.micTrack?.readyState === "live"){
      tracks.push(this.audio.micTrack)
    }
    if (this.screenAudio.screenAudioTrack?.readyState === "live"){
      tracks.push(this.screenAudio.screenAudioTrack)
    }
    if (this.screenAudio.screenAudioSource?.readyState === "live"){
      tracks.push(this.screenAudio.screenAudioSource)
    }
    return tracks
  }
  
  enableAudioRouting(){
    if (this.audio.webAudio && this.audio.webAudio.destination){
      this.audio.audioRoutingEnabled = true;
      const outputStream = this.audio.webAudio.destination.stream;
      const destinationTrack = outputStream.getAudioTracks()[0];
      this.logger.log('enableAudioRouting: ', destinationTrack.label)
      const formerTrack = this.audio.audioStream.getAudioTracks()[0];
      if (formerTrack){
        destinationTrack.enabled = formerTrack.enabled
        formerTrack.enabled = true;
      }
      emptyStreamWith(this.audio.audioStream, destinationTrack);
      this.updateAudioSender(destinationTrack);
    }else{
      this.logger.log('enableAudioRouting: 已替换为Destination');
    }
  }
  
  disableAudioRouting(){
    const audioInputTracks = this.getAudioInputTracks();
    if (audioInputTracks.length){
      if (audioInputTracks.length === 1){
        this.logger.log('disableAudioRouting: ', audioInputTracks[0].label)
      }else{
        this.logger.warn('disableAudioRouting: 仍然有多于一个输入', ...audioInputTracks);
      }
      const formerTrack = this.audio.audioStream.getAudioTracks()[0];
      emptyStreamWith(this.audio.audioStream, audioInputTracks[0]);
      audioInputTracks[0].enabled = formerTrack.enabled;
      formerTrack.enabled = true;
      this.updateAudioSender(audioInputTracks[0]);
    }else{
      this.logger.log('disableAudioRouting quiet.')
      emptyStreamWith(this.audio.audioStream, null);
    }
    this.audio.audioRoutingEnabled = false
  }
  
  updateAudioSender(audioTrack: MediaStreamTrack){
    if (this.stream.isRemote){
      throw new Error("updateAudioSender only for localStream")
    }
    if (this.stream.getAdapterRef()?._mediasoup?._micProducer){
      if (this.stream.getAdapterRef()?._mediasoup?._micProducer?._rtpSender){
        this.logger.info('updateAudioSender: 替换当前_micProducer的track', audioTrack.label);
        this.stream.getAdapterRef()?._mediasoup?._micProducer?._rtpSender?.replaceTrack(audioTrack);
      }
      else if (this.stream.getAdapterRef()?._mediasoup?._sendTransport?.handler?._pc){
        const senders = this.stream.getAdapterRef()?._mediasoup?._sendTransport?.handler._pc.getSenders();
        if (senders){
          for (var i in senders){
            const sender = senders[i];
            if (sender?.track?.kind === "audio"){
              this.logger.info('updateAudioSender: 替换audioSender', sender.track.label);
              sender.replaceTrack(audioTrack);
            }
          }
        }
      }
    }
  }

  destroy() {
    this.logger.log('清除 meida')
    this._reset()
  }
}

export { MediaHelper }
