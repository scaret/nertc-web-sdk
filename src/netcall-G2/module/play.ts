import { EventEmitter } from 'eventemitter3'
import {createWatermarkControl, WatermarkControl} from "../module/watermark";
import {
  PlayOptions,
  AdapterRef,
  SDKRef, SnapshotOptions, MediaTypeShort
} from "../types"
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';

class Play extends EventEmitter {
  private adapterRef:AdapterRef;
  private sdkRef:SDKRef | null;
  private uid:number|string;
  private volume:number | null;
  private index:number;
  private audioSinkId:string;
  private videoContainerSize:{
    width:number;
    height: number;
  };
  private screenContainerSize:{
    width:number;
    height: number;
  };
  public videoDom: HTMLVideoElement | null;
  public screenDom: HTMLVideoElement | null;
  public audioDom: HTMLAudioElement | null;
  public videoContainerDom: HTMLElement | null;
  public screenContainerDom: HTMLElement | null;
  public videoView:HTMLElement | null;
  public screenView:HTMLElement | null;
  
  
  public _watermarkControl: WatermarkControl;
  public _watermarkControlScreen: WatermarkControl;
  private autoPlayType:Number;
  constructor (options:PlayOptions) {
    super()
    this._reset()
    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
    this.uid = options.uid
    this.videoDom = null;
    this.screenDom = null;
    this.audioDom = null;
    this.videoContainerDom = null;
    this.screenContainerDom = null;
    this.videoView = null;
    this.screenView = null;
    this.volume = null;
    this.index = 0;
    this.videoContainerSize = {
      width: 0,
      height:0,
    };
    this.screenContainerSize = {
      width: 0,
      height:0,
    };
    this.audioSinkId = "";
    this._watermarkControl = createWatermarkControl(this.adapterRef.logger);
    this._watermarkControlScreen = createWatermarkControl(this.adapterRef.logger);
    this.autoPlayType = 0;
  }

  _reset() {
    // TODO recover
    // this.adapterRef = null // adapter层的成员属性与方法引用
    this.sdkRef = null // SDK 实例指针
    this.videoDom = null
    this.screenDom = null
    this.videoContainerDom = null
    this.screenContainerDom = null
    this.videoView = null
    this.screenView = null
    this.audioDom = null
    this.volume = null
    this.index = 0
    this.videoContainerSize = { // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0
    }
    this.screenContainerSize = { // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0
    }

  }

  _initNodeVideo() {
    this._initVideoContainer()
    this._initVideo()
    if (this.videoDom){
      if (this.videoContainerDom){
        if (this.videoContainerDom == this.videoDom.parentNode){
          this.adapterRef.logger.log('Play: _initVideoNode: 节点已挂载，请勿重复挂载')
          return
        }else{
          this.videoContainerDom.appendChild(this.videoDom)
          this.adapterRef.logger.log('Play: _initVideoNode, videoContainerDom: ', this.videoContainerDom.outerHTML)
        }
      }
    }
  }
  
  _initNodeScreen() {
    this._initScreenContainer()
    this._initScreen()
    if (this.screenDom){
      if (this.screenContainerDom){
        if (this.screenContainerDom == this.screenDom.parentNode){
          this.adapterRef.logger.log('Play: _initscreenNode: 节点已挂载，请勿重复挂载')
          return
        }else{
          this.screenContainerDom.appendChild(this.screenDom)
          this.adapterRef.logger.log('Play: _initscreenNode, screenContainerDom: ', this.screenContainerDom.outerHTML)
        }
      }
    }
  }

  _initVideoContainer() {
    if(!this.videoView) return
    if(!this.videoContainerDom) {
      this.videoContainerDom = document.createElement('div')
      this.videoContainerDom.className = "nertc-video-container";
      // 样式
      this.videoContainerDom.style.overflow = 'hidden'
      this.videoContainerDom.style.position = 'relative'
      this.videoContainerDom.style.width = `${this.videoView.clientWidth}px`
      this.videoContainerDom.style.height = `${this.videoView.clientHeight}px`
      this.videoContainerDom.style.display = 'inline-block'
    }
  }

  _initScreenContainer() {
    if(!this.screenContainerDom) {
      this.screenContainerDom = document.createElement('div')
      this.screenContainerDom.className = "nertc-screen-container";
      // 样式
      this.screenContainerDom.style.overflow = 'hidden'
      this.screenContainerDom.style.position = 'relative'
      this.screenContainerDom.style.width = `${this.screenContainerSize.width}px`
      this.screenContainerDom.style.height = `${this.screenContainerSize.height}px`
      this.screenContainerDom.style.display = 'inline-block'
    }
  }

  _initVideo() {
    if(!this.videoDom) {
      this.videoDom = document.createElement('video')
      // 样式
      this.videoDom.style.position = 'absolute'
      this.videoDom.style.left = '50%'
      this.videoDom.style.top = '50%'
      this.videoDom.style.transform = 'translate(-50%,-50%)'
      //this.videoDom.style.objectFit = 'cover'
      // 设置属性
      this.videoDom.setAttribute('x-webkit-airplay', 'x-webkit-airplay')
      this.videoDom.setAttribute('playsinline', 'playsinline')
      this.videoDom.setAttribute('webkit-playsinline', 'webkit-playsinline')
      this.videoDom.preload = 'auto'
      this.videoDom.dataset['uid'] = "" + this.uid
      this.videoDom.autoplay = true
      this.videoDom.muted = true
    }
  }
  
  _initScreen() {
    if(!this.screenDom) {
      this.screenDom = document.createElement('video')
      // 样式
      this.screenDom.style.position = 'absolute'
      this.screenDom.style.left = '50%'
      this.screenDom.style.top = '50%'
      this.screenDom.style.transform = 'translate(-50%,-50%)'

      // 设置属性
      this.screenDom.setAttribute('x-webkit-airplay', 'x-webkit-airplay')
      this.screenDom.setAttribute('playsinline', 'playsinline')
      this.screenDom.setAttribute('webkit-playsinline', 'webkit-playsinline')
      this.screenDom.preload = 'auto'
      this.screenDom.dataset['uid'] = "" + this.uid
      this.screenDom.autoplay = true
      this.screenDom.muted = true
    }
  }

  _removeUselessDom () {
    if(!this.videoView) return
    const length = this.videoView.children.length
    for (var i = length - 1; i >= 0; i--) {
      if (this.videoView.children[i].outerHTML.indexOf('data-uid=')){
        this.adapterRef.logger.log('删除多余的节点: ', this.videoView.children[i].outerHTML)
        this.videoView.removeChild(this.videoView.children[i])
      }
    }
  }
  
  _mountVideoToDom () {
    if (this.videoContainerDom){
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.adapterRef.logger.log('Play: _mountVideoToDom: 节点已挂载，请勿重复挂载')
        return
      }
      /*if (this.videoView && this.videoView.children) {
        this.adapterRef.logger.log('出现多余的dom节点')
        this._removeUselessDom()
      }*/
      this.adapterRef.logger.log('Play: _mountVideoToDom: videoContainerDom: ', this.videoContainerDom.outerHTML)
      if (this.videoView){
        this.videoView.appendChild(this.videoContainerDom)
        this._watermarkControl.start(this.videoContainerDom);
      }
    }
  }

  _mountScreenToDom () {
    if (this.screenContainerDom){
      if (this.screenView == this.screenContainerDom.parentNode) {
        this.adapterRef.logger.log('Play: _mountScreenToDom: 节点已挂载，请勿重复挂载')
        return
      }
      this.adapterRef.logger.log('Play: _mountScreenToDom: screenContainerDom: ', this.screenContainerDom.outerHTML)
      if (this.screenView){
        this.screenView.appendChild(this.screenContainerDom)
        this._watermarkControlScreen.start(this.screenContainerDom);
      }
    }
  }

  async resume(stream:MediaStream,option:any){
    if(!stream){
      return;
    }
    if(this.autoPlayType === 1){
      if(this.audioDom) {
        try {
          this.audioDom.muted = false
          await this.audioDom.play()
          this.autoPlayType = 0
        } catch(error) {
          this.adapterRef.logger.warn('播放 %o 的音频出现问题: %o', this.uid, error)
          this.autoPlayType = 1
          if(error.name === 'NotAllowedError') {
            throw new RtcError({
              code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
              message: error.toString()
            })
          }
        }
      }
      
    }
    if(this.autoPlayType === 2){
      if(this.videoDom) {
        try {
          this.videoDom.muted = false
          await this.videoDom.play()
          this.autoPlayType = 0
        } catch(error) {
          this.adapterRef && this.adapterRef.logger.warn('播放 %s 的视频出现问题: %o', this.uid, error)
          this.autoPlayType = 2
          if(error.name === 'NotAllowedError') {
            throw new RtcError({
              code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
              message: error.toString()
            })
          }
        }
      }
    }
  }


  async playAudioStream(stream:MediaStream, ismuted?:boolean) {
    if(!stream) return
    this.adapterRef.logger.log(`播放音频, id: ${stream.id}, active state: ${stream.active}`)
    if (!this.audioDom) {
      this.audioDom = document.createElement('audio')
    }
    if(!ismuted){
      this.audioDom.muted = false;
    }else {
      this.audioDom.muted = true;
    }
    
    this.audioDom.srcObject = stream
    this.adapterRef.logger.log('播放 %o 的音频, streamId: %o, stream状态: %o', this.uid, stream.id, stream.active)
    if (this.audioSinkId) {
      try {
        await (this.audioDom as any).setSinkId(this.audioSinkId);
        this.adapterRef.logger.log('音频使用输出设备：%s', this.audioSinkId);
      } catch (e) {
        this.adapterRef.logger.error('音频输出设备切换失败', e);
      }
    }
    if(!stream.active) return
    const isPlaying = await this.isPlayAudioStream()
    if (isPlaying) {
      this.adapterRef.logger.log('%o 的音频播放正常', this.uid)
    }
    try {
      this.audioDom.muted = false;
      await this.audioDom.play()
      this.adapterRef.logger.log('播放 %o 的音频完成，当前播放状态: %o', this.uid, this.audioDom && this.audioDom.played && this.audioDom.played.length)
    } catch (error) {
      this.adapterRef.logger.warn('播放 %o 的音频出现问题: %o', this.uid, error)

      if(error.name === 'NotAllowedError') {
        this.autoPlayType = 1;
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          message: error.toString(),
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082'
        })
        
      }
    }
  }

  async stopPlayAudioStream() {
    if (this.audioDom) {
      this.audioDom.muted = true
    }
  }

  setPlayVolume(volume:number) {
    this.volume = volume
    if (!this.audioDom) return
    this.audioDom.volume = volume / 255
  }

  async isPlayAudioStream(musthasDom = true) {
    const getTimeRanges = async (time:number) => {
      if(time){
        await new Promise((resolve)=>{setTimeout(resolve, time)});
      }
      if (!this.audioDom) {
        return 0
      } else {
        let length = this.audioDom.played.length;
        if (length >= 1) {
          return this.audioDom.played.end(length - 1);
        } else {
          return 0;
        }
      }
    }
    if (!this.audioDom || !this.audioDom.srcObject) {
      if (musthasDom) {
        return false
      } else {
        return true
      }
    }
    const firstTimeRanges  = await getTimeRanges(0)
    if (!firstTimeRanges) {
      return false;
    }
    this.adapterRef.logger.log('firstTimeRanges: ', firstTimeRanges)
    const secondTimeRanges  = await getTimeRanges(500)
    if (!secondTimeRanges) {
      return false;
    }
    this.adapterRef.logger.log('secondTimeRanges: ', secondTimeRanges)
    return secondTimeRanges > firstTimeRanges
  }

  async isPlayVideoStream(musthasDom = true) {
    const getVideoFrames = async (time:number) => {
      if (time) {
        await new Promise((resolve)=>{setTimeout(resolve, time)});
      }
      if (this.videoDom && this.videoDom.srcObject && this.videoDom.getVideoPlaybackQuality()) {
        return this.videoDom.getVideoPlaybackQuality().totalVideoFrames
      } else {
        return 0;
      }
    }
    if (!this.videoDom || !this.videoDom.srcObject) {
      if (musthasDom) {
        return false
      } else {
        return true
      }
    }
    const firstTotalVideoFrames = await getVideoFrames(0);
    const secondTotalVideoFrames = await getVideoFrames(100)
    return secondTotalVideoFrames > firstTotalVideoFrames
  }

  async isPlayScreenStream(musthasDom = true) {
    const getScreenFrames = async (time:number) => {
      if (time) {
        await new Promise((resolve)=>{setTimeout(resolve, time)});
      }
      if (this.screenDom && this.screenDom.srcObject && this.screenDom.getVideoPlaybackQuality()) {
        return this.screenDom.getVideoPlaybackQuality().totalVideoFrames
      } else {
        return 0;
      }
    }
    if (!this.screenDom || !this.screenDom.srcObject) {
      if (musthasDom) {
        return false
      } else {
        return true
      }
    }
    const firstTotalVideoFrames = await getScreenFrames(0);
    const secondTotalVideoFrames = await getScreenFrames(100)
    return secondTotalVideoFrames > firstTotalVideoFrames
  }

  async isPlayStreamError(mediaType?: string) {
    let dom = null
    switch (mediaType) {
      case "audio":
        return this.isPlayAudioStream(true)
        break;
      case "video":
        return this.isPlayVideoStream(true)
      case "screen":
        return this.isPlayScreenStream(true)
        break;
      default:
        return true;
    }
  }

  async playVideoStream(stream:MediaStream, view:HTMLElement, ismuted?:boolean) {
    if(!stream || !view) return
    this.adapterRef.logger.log(`播放视频, id: ${stream.id}, active state: ${stream.active}`)
    if (this.videoDom && this.videoDom.srcObject === stream) {
      this.adapterRef.logger.log(`请勿重复 ${this.uid} 播放` )
      return
    }
    this.videoView = view
    this._initNodeVideo()
    this._mountVideoToDom()
    if (!this.videoDom){
      this.adapterRef.logger.error(`没有视频源`);
      return;
    }
    if (this.videoDom.srcObject === stream) {
      this.adapterRef.logger.log(`请勿重复 ${this.uid} 播放` )
      return
    }
    try {
      if(!ismuted){
        this.videoDom.muted = false;
      }else {
        this.videoDom.muted = true;
      }
      this.videoDom.srcObject = stream
      this.adapterRef.logger.log('播放 %o 的视频频, streamId: %o, stream状态: %o', this.uid, stream.id, stream.active)
      
      this.videoDom.play()
      this.adapterRef.logger.log('播放 %s 的视频完成，当前播放状态: %o', this.uid, this.videoDom && this.videoDom.played && this.videoDom.played.length)
    } catch (error) {
      this.adapterRef && this.adapterRef.logger.warn('播放 %s 的视频出现问题: %o', this.uid, error)
     
      if(error.name === 'NotAllowedError') {
        this.autoPlayType = 2;
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          message: error.toString(),
          url: 'https://doc.yunxin.163.com/docs/jcyOTA0ODM/jM3NDE0NTI?platformId=50082'
        })
      }
    }
  }

  async playScreenStream(stream:MediaStream, view:HTMLElement) {
    if(!stream || !view) return
    this.adapterRef.logger.log(`播放辅流视频, id: ${stream.id}, active state: ${stream.active}`)
    this.screenView = view
    this._initNodeScreen()
    this._mountScreenToDom()
    if (!this.screenDom){
      this.adapterRef.logger.error(`辅流没有视频源`);
      return;
    }
    if (this.screenDom.srcObject === stream) {
      this.adapterRef.logger.log(`请勿重复 ${this.uid} 播放` )
      return
    }
    try {
      this.screenDom.srcObject = stream
      this.adapterRef.logger.log('播放 %o 的辅流, streamId: %o, stream状态: %o', this.uid, stream.id, stream.active)
      await this.screenDom.play()
      this.adapterRef.logger.log('播放 %s 的辅流，当前播放状态: %o', this.uid, this.screenDom && this.screenDom.played && this.screenDom.played.length)
    } catch (e) {
      this.adapterRef && this.adapterRef.logger.warn('播放 %s 的辅流出现问题: %o', this.uid, e)
    }
  }

  async stopPlayVideoStream() {
    this.adapterRef.logger.log('停止播发视频')
    if (this.videoContainerDom && this.videoDom) {
      if(this.videoContainerDom == this.videoDom.parentNode) {
        this.adapterRef.logger.log('清除 videoDom')
        this.videoContainerDom.removeChild(this.videoDom)
      } else if(this.videoContainerDom.lastChild){
        this.adapterRef.logger.log('videoContainerDom 删除子节点')
        this.videoContainerDom.removeChild(this.videoContainerDom.lastChild)
      }
      this.videoDom = null
    }
    if (this.videoView && this.videoContainerDom) {
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.adapterRef.logger.log('清除 videoContainerDom')
        this.videoView.removeChild(this.videoContainerDom)
      } else if(this.videoView.lastChild){
        this.adapterRef.logger.log('videoView 删除子节点')
        this.videoView.removeChild(this.videoView.lastChild)
        this.videoView.innerHTML = ''
      }
      this.videoContainerDom = null
      this.videoView = null
    }
  }
  
  async stopPlayScreenStream() {
    if (this.screenContainerDom && this.screenDom) {
      this.screenContainerDom.removeChild(this.screenDom)
      this.screenDom = null
    }
    if (this.screenView && this.screenContainerDom) {
      this.screenView.removeChild(this.screenContainerDom)
      this.screenContainerDom = null
      this.screenView = null
    }
  }

  setVideoRender(options = {width: 100, height: 100, cut: true}) {
    if(!this.videoDom) return
    this.adapterRef.logger.log('setRender: uid %s, options: %s', this.uid, JSON.stringify(options, null, ' '))

    this.videoContainerSize = Object.assign({}, options);
    // 设置外部容器
    if (this.videoContainerDom) {
      this.videoContainerDom.style.width = `${options.width}px`
      this.videoContainerDom.style.height = `${options.height}px`
    } else {
      this.adapterRef.logger.error('未找到videoContainerDom');
    }
    // 是否裁剪
    if (!options.cut) {
      this.videoDom.style.height = '100%'
      this.videoDom.style.width = '100%'
      return
    }
    // 计算宽高比后设置video宽高
    let videoDomRatio = this.videoDom.videoWidth / this.videoDom.videoHeight // 计算视频原始宽高得出的ratio
    let optionsRatio = options.width / options.height
    if (videoDomRatio > optionsRatio) {
      // 宽度填满但是高度填不满 => 填充高度，宽度自适应
      this.videoDom.style.width = 'auto'
      this.videoDom.style.height = '100%'
    } else {
      // 宽度不够但是高度填满 => 填充宽度，高度自适应
      this.videoDom.style.width = '100%'
      this.videoDom.style.height = 'auto'
    }
  }
  
  setScreenRender(options = {width: 100, height: 100, cut: true}) {
    if(!this.screenDom) return
    this.adapterRef.logger.log('setScreenRender: uid %s, options: %s', this.uid, JSON.stringify(options, null, ' '))

    this.screenContainerSize = options
    // 设置外部容器
    if (this.screenContainerDom){
      this.screenContainerDom.style.width = `${options.width}px`
      this.screenContainerDom.style.height = `${options.height}px`
    }else{
      this.adapterRef.logger.error('未找到screenContainerDom');
    }
    // 是否裁剪
    if (!options.cut) {
      this.screenDom.style.height = '100%'
      this.screenDom.style.width = '100%'
      return
    }
    // 计算宽高比后设置screen宽高
    let screenDomRatio = this.screenDom.videoWidth / this.screenDom.videoHeight // 计算视频原始宽高得出的ratio
    let optionsRatio = options.width / options.height
    if (screenDomRatio > optionsRatio) {
      // 宽度填满但是高度填不满 => 填充高度，宽度自适应
      this.screenDom.style.width = 'auto'
      this.screenDom.style.height = '100%'
    } else {
      // 宽度不够但是高度填满 => 填充宽度，高度自适应
      this.screenDom.style.width = '100%'
      this.screenDom.style.height = 'auto'
    }
  }
  
  async setAudioOutput (audioSinkId:string) {
    this.audioSinkId = audioSinkId;
    if (this.audioDom) {
      await (this.audioDom as any).setSinkId(audioSinkId);
      this.adapterRef.logger.log('设置通话音频输出设备成功')
    }
  }

  /**
  * 视频截图功能
  */
  async takeSnapshot (options:SnapshotOptions,streamId?: string|number) {
    let snapshotVideo = (!options.mediaType && this.videoDom) || options.mediaType === 'video';
    let snapshotScreen = (!options.mediaType && this.screenDom) || options.mediaType === 'screen';

    let canvas = document.createElement("canvas")
    let ctx = canvas.getContext("2d");
    if (!ctx){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'no context of canvas'
      })
    }
    // video
    if (snapshotVideo){
      const name = options.name || ((streamId || this.adapterRef.channelInfo.uid) + '-' + this.index++);
      ctx.fillStyle = '#ffffff'
      if (!this.videoDom){
        throw new RtcError({
          code: ErrorCode.NOT_FOUND,
          message: 'no videoDom'
        })
      }
      ctx.fillRect(0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight)
      canvas.width = this.videoDom.videoWidth
      canvas.height = this.videoDom.videoHeight
      ctx.drawImage(this.videoDom, 0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight, 0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight)
      const fileUrl = await new Promise((resolve, reject)=>{
        canvas.toBlob(blob => {
          this.adapterRef.logger.log('takeSnapshot, 获取到截图的blob: ', blob)
          let url = URL.createObjectURL(blob)
          this.adapterRef.logger.log('截图的url: ', url)
          let a = document.createElement('a')
          document.body.appendChild(a)
          a.style.display = 'none'
          a.href = url
          a.download = name + '.png'
          a.click()
          window.URL.revokeObjectURL(url)
          resolve(name + '.png')
        })
      })
      if (!snapshotScreen){
        return fileUrl;
      }
    }
    // screen
    if (snapshotScreen){
      const name = options.name || ((streamId || this.adapterRef.channelInfo.uid) + '-' + this.index++);
      ctx.fillStyle = '#ffffff'
      if (!this.screenDom){
        throw new RtcError({
          code: ErrorCode.NOT_FOUND,
          message: 'no screenDom'
        })
      }
      ctx.fillRect(0, 0, this.screenDom.videoWidth, this.screenDom.videoHeight)
      canvas.width = this.screenDom.videoWidth
      canvas.height = this.screenDom.videoHeight
      ctx.drawImage(this.screenDom, 0, 0, this.screenDom.videoWidth, this.screenDom.videoHeight, 0, 0, this.screenDom.videoWidth, this.screenDom.videoHeight)
      const fileUrl = await new Promise((resolve, reject)=>{
        canvas.toBlob(blob => {
          this.adapterRef.logger.log('takeSnapshot, 获取到截图的blob: ', blob)
          let url = URL.createObjectURL(blob)
          this.adapterRef.logger.log('截图的url: ', url)
          let a = document.createElement('a')
          document.body.appendChild(a)
          a.style.display = 'none'
          a.href = url
          a.download = name + '.png'
          a.click()
          window.URL.revokeObjectURL(url)
          resolve(name + '.png')
        })
      })
      return fileUrl;
    }
  }

  destroy() {
    this.stopPlayAudioStream()
    this.stopPlayVideoStream()
    this.stopPlayScreenStream()
    this._reset()
  }
}

export { Play }