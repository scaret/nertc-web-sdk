import { EventEmitter } from 'eventemitter3'
import {createWatermarkControl, WatermarkControl} from "../module/watermark";
import {
  PlayOptions,
  AdapterRef,
  SDKRef, SnapshotOptions, MediaTypeShort, RenderMode, ILogger
} from "../types"
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';
import {getParameters} from "./parameters";
import {getDomInfo} from "../util/util";
import {LocalStream} from "../api/localStream";
import {RemoteStream} from "../api/remoteStream";

class Play extends EventEmitter {
  private volume:number | null;
  private index:number;
  private audioSinkId:string;
  private videoRenderMode:RenderMode;
  //实际就是Stream.renderMode.screen
  private screenRenderMode:RenderMode;
  private videoSize: {width: number, height: number} = {width: 0, height: 0};
  private screenSize: {width: number, height: number} = {width: 0, height: 0};
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
  private stream: LocalStream | RemoteStream;
  private logger: ILogger
  constructor (options:PlayOptions) {
    super()
    this._reset()
    // 设置对象引用
    this.stream = options.stream
    this.logger = options.stream.logger.getChild(()=>{
      let tag = "player";
      if (this.audioDom?.paused){
        tag += " audio_paused"
      }
      
      if (this.stream._play !== this){
        tag += " DETACHED"
      }
      return tag
    });
    this.videoDom = null;
    this.screenDom = null;
    this.audioDom = null;
    this.videoContainerDom = null;
    this.screenContainerDom = null;
    this.videoView = null;
    this.screenView = null;
    this.volume = null;
    this.index = 0;
    this.videoRenderMode = {
      width: 0,
      height:0,
      cut: false,
    };
    this.screenRenderMode = {
      width: 0,
      height:0,
      cut: false,
    };
    this.audioSinkId = "";
    this._watermarkControl = createWatermarkControl(this.logger);
    this._watermarkControlScreen = createWatermarkControl(this.logger);
    this.autoPlayType = 0;
  }

  _reset() {
    // TODO recover
    // this.adapterRef = null // adapter层的成员属性与方法引用
    this.videoDom = null
    this.screenDom = null
    this.videoContainerDom = null
    this.screenContainerDom = null
    this.videoView = null
    this.screenView = null
    this.audioDom = null
    this.volume = null
    this.index = 0
    this.videoRenderMode = { // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0,
      cut: false,
    }
    this.screenRenderMode = { // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0,
      cut: false,
    }

  }

  _initNodeVideo() {
    this._initVideoContainer()
    this._initVideo()
    if (this.videoDom){
      if (this.videoContainerDom){
        if (this.videoContainerDom == this.videoDom.parentNode){
          this.logger.log('Play: _initVideoNode: 节点已挂载，请勿重复挂载')
          return
        }else{
          this.videoContainerDom.appendChild(this.videoDom)
          this.logger.log('Play: _initVideoNode, videoContainerDom: ', this.videoContainerDom.outerHTML)
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
          this.logger.log('Play: _initscreenNode: 节点已挂载，请勿重复挂载')
          return
        }else{
          this.screenContainerDom.appendChild(this.screenDom)
          this.logger.log('Play: _initscreenNode, screenContainerDom: ', this.screenContainerDom.outerHTML)
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
      this.screenContainerDom.style.width = `${this.screenRenderMode.width}px`
      this.screenContainerDom.style.height = `${this.screenRenderMode.height}px`
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
      this.videoDom.dataset['uid'] = "" + this.stream.getId()
      this.videoDom.autoplay = true
      this.videoDom.muted = true
      this.videoSize.width = 0
      this.videoSize.height = 0
      this.videoDom.addEventListener("resize", (evt)=> {
        // 在resize的时候重新setVideoRender，需注意：
        // 1. 回调后可能已经stop/play过了，所以需要比较事件的target是不是videoDom
        // 2. 即使无宽高变化也可能回调多次，所以需要记录上一次的宽高
        if (!this.videoDom || this.videoDom !== evt.target){
          return
        }
        const width = this.videoDom.videoWidth;
        const height = this.videoDom.videoHeight
        
        if (width !== this.videoSize.width || height !== this.videoSize.height){
          this.logger.log(`主流视频分辨率发生变化：${this.videoSize.width}x${this.videoSize.height} => ${width}x${height}。当前父节点：${getDomInfo(this.videoView)}`);
          if (width > height && this.videoSize.width > this.videoSize.height || width < height && this.videoSize.width < this.videoSize.height){
            // 未改变视频方向
          }else{
            this.setVideoRender();
          }
          this.videoSize.width = width;
          this.videoSize.height = height;
        }
      });
      if (getParameters()["controlOnPaused"]) {
        this.videoDom.addEventListener("pause", this.showControlIfVideoPause.bind(this))
        this.videoDom.addEventListener("play", this.handleVideoScreenPlay.bind(this))
        this.videoDom.addEventListener("click", this.handleVideoScreenClick.bind(this))
      }
    }
  }
  
  showControlIfVideoPause(){
    if (this.videoDom && this.videoDom.paused) {
      this.logger.log("可能遇到了自动播放问题，展示默认控件:", "video");
      this.videoDom.setAttribute('controls', 'controls')
    }
    if (this.screenDom && this.screenDom.paused) {
      this.logger.log("可能遇到了自动播放问题，展示默认控件:", "screen");
      this.screenDom.setAttribute('controls', 'controls')
    }
  }

  handleVideoScreenClick(){
    if (this.audioDom && this.audioDom.paused){
      this.logger.log("侦测到视频点击，尝试恢复音频播放");
      this.audioDom.play()
    }
  }
  
  handleVideoScreenPlay(){
    if (this.videoDom && !this.videoDom.paused && this.videoDom.hasAttribute("controls")){
      this.logger.log("侦测到视频播放，隐藏默认控件:");
      this.videoDom.removeAttribute("controls")
    }
    if (this.screenDom && !this.screenDom.paused && this.screenDom.hasAttribute("controls")){
      this.logger.log("侦测到辅流播放，隐藏默认控件:");
      this.screenDom.removeAttribute("controls")
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
      this.screenDom.dataset['uid'] = "" + this.stream.getId()
      this.screenDom.autoplay = true
      this.screenDom.muted = true
      this.screenSize.width = 0
      this.screenSize.height = 0
      this.screenDom.addEventListener("resize", (evt)=> {
        // 在resize的时候重新setScreenRender，需注意：
        // 1. 回调后可能已经stop/play过了，所以需要比较事件的target是不是screenDom
        // 2. 即使无宽高变化也可能回调多次，所以需要记录上一次的宽高
        if (!this.screenDom || this.screenDom !== evt.target){
          return
        }
        const width = this.screenDom.videoWidth;
        const height = this.screenDom.videoHeight

        if (width !== this.screenSize.width || height !== this.screenSize.height){
          this.logger.log(`辅流视频分辨率发生变化：${this.screenSize.width}x${this.screenSize.height} => ${width}x${height}`);
          if (width > height && this.screenSize.width > this.screenSize.height || width < height && this.screenSize.width < this.screenSize.height){
            // 未改变视频方向
          }else{
            this.setScreenRender();
          }
          this.screenSize.width = width;
          this.screenSize.height = height;
        }
      });
      if (getParameters()["controlOnPaused"]) {
        this.screenDom.addEventListener("pause", this.showControlIfVideoPause.bind(this))
        this.screenDom.addEventListener("play", this.handleVideoScreenPlay.bind(this))
        this.screenDom.addEventListener("click", this.handleVideoScreenClick.bind(this))
      }
    }
  }

  _removeUselessDom () {
    if(!this.videoView) return
    const length = this.videoView.children.length
    for (var i = length - 1; i >= 0; i--) {
      if (this.videoView.children[i].outerHTML.indexOf('data-uid=')){
        this.logger.log('删除多余的节点: ', this.videoView.children[i].outerHTML)
        this.videoView.removeChild(this.videoView.children[i])
      }
    }
  }
  
  _mountVideoToDom () {
    if (this.videoContainerDom){
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.logger.log('Play: _mountVideoToDom: 节点已挂载，请勿重复挂载')
        return
      }
      /*if (this.videoView && this.videoView.children) {
        this.logger.log('出现多余的dom节点')
        this._removeUselessDom()
      }*/
      this.logger.log('Play: _mountVideoToDom: videoContainerDom: ', this.videoContainerDom.outerHTML)
      if (this.videoView){
        this.videoView.appendChild(this.videoContainerDom)
        this.logger.log(`视频主流dom节点挂载成功。父节点：${getDomInfo(this.videoView)}`)
        this._watermarkControl.start(this.videoContainerDom);
      }
    }
  }

  _mountScreenToDom () {
    if (this.screenContainerDom){
      if (this.screenView == this.screenContainerDom.parentNode) {
        this.logger.log('Play: _mountScreenToDom: 节点已挂载，请勿重复挂载')
        return
      }
      this.logger.log('Play: _mountScreenToDom: screenContainerDom: ', this.screenContainerDom.outerHTML)
      if (this.screenView){
        this.screenView.appendChild(this.screenContainerDom)
        this.logger.log(`视频辅流dom节点挂载成功。父节点：${getDomInfo(this.screenView)}`)
        this._watermarkControlScreen.start(this.screenContainerDom);
      }
    }
  }

  async resume(){
    const mediaIsPaused = {
      audio: this.audioDom && this.audioDom.paused,
      video: this.videoDom && this.videoDom.paused,
      screen: this.screenDom && this.screenDom.paused,
    };
    const promises = [];
    if (this.audioDom && this.audioDom.paused){
      promises.push(this.audioDom.play())
    }
    if (this.videoDom && this.videoDom.paused){
      promises.push(this.videoDom.play())
    }
    if (this.screenDom && this.screenDom.paused){
      promises.push(this.screenDom.play())
    }
    try{
      // 为什么这么写：因为同时触发play
      await Promise.all(promises);
    }catch(error){
      this.logger.error(`恢复播放 出现问题:`, error.name, error.message);
      if(error.name === 'notAllowedError' || error.name === 'NotAllowedError') { // 兼容临时版本客户
        throw new RtcError({
          code: ErrorCode.AUTO_PLAY_NOT_ALLOWED,
          message: error.message
        })
      }
    }
    if(mediaIsPaused.audio){
      this.logger.log(`恢复播放音频${this.audioDom && !this.audioDom.paused ? "成功": "失败"}`)
    }
    if(mediaIsPaused.video){
      this.logger.log(`恢复播放视频${this.videoDom && !this.videoDom.paused ? "成功": "失败"}`)
    }
    if(mediaIsPaused.screen){
      this.logger.log(`恢复播放辅流${this.screenDom && !this.screenDom.paused ? "成功": "失败"}`)
    }
  }

  async playAudioStream(stream:MediaStream, ismuted?:boolean) {
    if(!stream) return
    if (!this.audioDom) {
      this.audioDom = document.createElement('audio')
    }
    if(!ismuted){
      this.audioDom.muted = false;
    }else {
      this.audioDom.muted = true;
    }
    
    this.audioDom.srcObject = stream
    if (this.audioSinkId && stream.getAudioTracks().length) {
      try {
        this.logger.log(`音频尝试使用输出设备`, this.audioSinkId);
        await (this.audioDom as any).setSinkId(this.audioSinkId);
        this.logger.log(`音频使用输出设备成功`, this.audioSinkId);
      } catch (e) {
        this.logger.error('音频输出设备切换失败', e.name, e.message, e);
      }
    }
    if(!stream.active) return
    const isPlaying = await this.isPlayAudioStream()
    if (isPlaying) {
      this.logger.log(`音频播放正常`)
    }
    try {
      this.audioDom.muted = false;
      await this.audioDom.play()
      this.logger.log(`播放音频完成，当前播放状态:`, this.audioDom && this.audioDom.played && this.audioDom.played.length)
    } catch (error) {
      this.logger.warn('播放音频出现问题: ', error.name, error.message, error)

      if(error.name === 'notAllowedError' || error.name === 'NotAllowedError') { // 兼容临时版本客户
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
    this.logger.log('firstTimeRanges: ', firstTimeRanges)
    const secondTimeRanges  = await getTimeRanges(500)
    if (!secondTimeRanges) {
      return false;
    }
    this.logger.log('secondTimeRanges: ', secondTimeRanges)
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

  async playVideoStream(stream:MediaStream, view:HTMLElement) {
    if(!stream || !view) return
    if (this.videoDom && this.videoDom.srcObject === stream) {
      this.logger.log(`请勿重复 播放` )
      return
    }
    this.videoView = view
    this._initNodeVideo()
    this._mountVideoToDom()
    if (!this.videoDom){
      this.logger.error(`没有视频源`);
      return;
    }
    if (this.videoDom.srcObject === stream) {
      this.logger.log(`请勿重复 播放` )
      return
    }
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack){
        this.logger.log(`开始加载主流播放视频源：视频参数 "${videoTrack.label}",enabled ${videoTrack.enabled} , ${JSON.stringify(videoTrack.getSettings())}`)
      }else{
        this.logger.error(`加载主流播放视频源失败：没有视频源`)
      }
      this.videoDom.srcObject = stream
      this.videoDom.play().then(()=>{
        this.logger.log(`成功加载主流播放视频源：当前视频实际分辨率${this.videoDom?.videoWidth}x${this.videoDom?.videoHeight}，显示宽高${this.videoDom?.offsetWidth}x${this.videoDom?.offsetHeight}`)
        if (this.videoDom?.paused && getParameters()["controlOnPaused"]){
          //给微信的Workaround。微信会play()执行成功但不播放
          this.showControlIfVideoPause();
        }
      }).catch((e)=>{
        if (e.name === "AbortError"){
          // The play() request was interrupted by a new load request. https://goo.gl/LdLk22
        }else{
          console.error(e);
        }
      })
    } catch (error) {
      this.logger.warn('播放视频出现问题:', error.name, error.message, error)
     
      if(error.name === 'notAllowedError' || error.name === 'NotAllowedError') { // 兼容临时版本客户
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
    this.logger.log(`播放辅流视频, id: ${stream.id}, active state: ${stream.active}`)
    this.screenView = view
    this._initNodeScreen()
    this._mountScreenToDom()
    if (!this.screenDom){
      this.logger.error(`辅流没有视频源`);
      return;
    }
    if (this.screenDom.srcObject === stream) {
      this.logger.log(`请勿重复 播放` )
      return
    }
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack){
        this.logger.log(`开始加载辅流播放视频源：视频参数 "${videoTrack.label}",enabled ${videoTrack.enabled} , ${JSON.stringify(videoTrack.getSettings())}`)
      }else{
        this.logger.error(`加载主流播放视频源失败：没有视频源`)
      }
      this.screenDom.srcObject = stream
      this.screenDom.play().then(()=>{
        this.logger.log(`成功加载辅流播放视频源：当前视频实际分辨率${this.screenDom?.videoWidth}x${this.screenDom?.videoHeight}，显示宽高${this.screenDom?.offsetWidth}x${this.screenDom?.offsetHeight}`)
        if (this.screenDom?.paused && getParameters()["controlOnPaused"]){
          //给微信的Workaround。微信会play()执行成功但不播放
          this.showControlIfVideoPause();
        }
      })
    } catch (e) {
      this.logger.warn('播放辅流出现问题: ', e.name, e.message, e)
    }
  }

  async stopPlayVideoStream() {
    this.logger.log(`stopPlayVideoStream 停止播发视频`)
    if (this.videoContainerDom && this.videoDom) {
      if(this.videoContainerDom == this.videoDom.parentNode) {
        this.logger.log(`清除 videoDom`)
        this.videoContainerDom.removeChild(this.videoDom)
      } else if(this.videoContainerDom.lastChild){
        this.logger.log(`videoContainerDom 删除子节点`)
        this.videoContainerDom.removeChild(this.videoContainerDom.lastChild)
      }
      try {
        this.videoDom.remove()
        this.videoDom.srcObject = null
        this.videoDom = null
      } catch(e) {
        this.logger.log('stopPlayVideoStream e: ', e)
      }
      
    }
    if (this.videoView && this.videoContainerDom) {
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.logger.log('清除 videoContainerDom')
        this.videoView.removeChild(this.videoContainerDom)
      } else if(this.videoView.lastChild){
        this.logger.log('videoView 删除子节点')
        this.videoView.removeChild(this.videoView.lastChild)
        this.videoView.innerHTML = ''
      }
      this.videoContainerDom = null
      this.videoView = null
    }
  }
  
  async stopPlayScreenStream() {
    this.logger.log(`stopPlayScreenStream: 停止播发屏幕共享`)
    if (this.screenContainerDom && this.screenDom) {
      this.screenContainerDom.removeChild(this.screenDom)
      try {
        this.screenDom.remove()
        this.screenDom.srcObject = null
        this.screenDom = null
      } catch(e) {
        this.logger.log(`stopPlayScreenStream: 停止播发屏幕共享`, e.name, e.message);
      }
    }
    if (this.screenView && this.screenContainerDom) {
      this.screenView.removeChild(this.screenContainerDom)
      this.screenContainerDom = null
      this.screenView = null
    }
  }

  /**
   * @param options 可以不填，用上一次的设置来resize
   */
  setVideoRender(options?: RenderMode) {
    if(!this.videoDom) return
    if (options){
      this.logger.log(`setVideoRender options: ${JSON.stringify(options)}`)
      this.videoRenderMode = Object.assign({}, options);
    }else{
      options = this.videoRenderMode
      this.logger.log(`setVideoRender: existing videoRenderMode: ${JSON.stringify(options)}`)
    }
    // 设置外部容器
    if (this.videoContainerDom) {
      this.videoContainerDom.style.width = `${options.width}px`
      this.videoContainerDom.style.height = `${options.height}px`
    } else {
      this.logger.error('未找到videoContainerDom');
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
  
  setScreenRender(options?: RenderMode) {
    if(!this.screenDom) return
    if (options){
      this.logger.log('setScreenRender: options: ', JSON.stringify(options, null, ' '))
      this.screenRenderMode = Object.assign({}, options);
    }else{
      options = this.screenRenderMode
      this.logger.log(`setScreenRender, existing screenRenderMode: ${JSON.stringify(options)}`);
    }
    this.screenRenderMode = options
    // 设置外部容器
    if (this.screenContainerDom){
      this.screenContainerDom.style.width = `${options.width}px`
      this.screenContainerDom.style.height = `${options.height}px`
    }else{
      this.logger.error('未找到screenContainerDom');
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
    if (this.audioDom?.srcObject && (this.audioDom?.srcObject as MediaStream).getAudioTracks().length) {
      await (this.audioDom as any).setSinkId(audioSinkId);
      this.logger.log('设置通话音频输出设备成功')
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
      const name = options.name || ((streamId || this.stream.getId()) + '-' + this.index++);
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
          this.logger.log('takeSnapshot, 获取到截图的blob: ', blob)
          let url = URL.createObjectURL(blob)
          this.logger.log('截图的url: ', url)
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
      const name = options.name || ((streamId || this.stream.getId()) + '-' + this.index++);
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
          this.logger.log('takeSnapshot, 获取到截图的blob: ', blob)
          let url = URL.createObjectURL(blob)
          this.logger.log('截图的url: ', url)
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