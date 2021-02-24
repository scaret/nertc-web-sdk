import { EventEmitter } from 'eventemitter3'
import {
  PlayOptions,
  AdapterRef,
  SDKRef, SnapshotOptions,

} from "../types"

class Play extends EventEmitter {
  private adapterRef:AdapterRef;
  private sdkRef:SDKRef | null;
  private uid:number;
  private volume:number | null;
  private index:number;
  private audioSinkId:string;
  private containerSize:{
    width:number;
    height: number;
  };
  public videoDom: HTMLVideoElement | null;
  public audioDom: HTMLAudioElement | null;
  public videoContainerDom: HTMLElement | null;
  public videoView:HTMLElement | null;
  
  
  constructor (options:PlayOptions) {
    super()
    this._reset()
    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
    this.uid = options.uid
    this.videoDom = null;
    this.audioDom = null;
    this.videoContainerDom = null;
    this.videoView = null;
    this.volume = null;
    this.index = 0;
    this.containerSize = {
      width: 0,
      height:0,
    };
    this.audioSinkId = "";
    this._initNode()
  }

  _reset() {
    // TODO recover
    // this.adapterRef = null // adapter层的成员属性与方法引用
    this.sdkRef = null // SDK 实例指针
    this.videoDom = null
    this.videoContainerDom = null
    this.videoView = null
    this.audioDom = null
    this.volume = null
    this.index = 0
    this.containerSize = { // 外部存在开启流之后，再设置画面大小，如果先预设一个大小的话，会导致画面跳动
      width: 0,
      height: 0
    }
  }

  _initNode() {
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

  _initVideoContainer() {
    if(!this.videoContainerDom) {
      this.videoContainerDom = document.createElement('div')
      // 样式
      this.videoContainerDom.style.overflow = 'hidden'
      this.videoContainerDom.style.position = 'relative'
      this.videoContainerDom.style.width = `${this.containerSize.width}px`
      this.videoContainerDom.style.height = `${this.containerSize.height}px`
      this.videoContainerDom.style.display = 'inline-block'
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

  _mountVideoToDom () {
    if (this.videoContainerDom){
      if (this.videoView == this.videoContainerDom.parentNode) {
        this.adapterRef.logger.log('Play: _mountVideoToDom: 节点已挂载，请勿重复挂载')
        return
      }
      this.adapterRef.logger.log('Play: _mountVideoToDom: videoContainerDom: ', this.videoContainerDom.outerHTML)
      if (this.videoView){
        this.videoView.appendChild(this.videoContainerDom)
      }
    }
  }


  async playAudioStream(stream:MediaStream) {
    if(!stream) return
    this.adapterRef.logger.log(`播放音频, id: ${stream.id}, active state: ${stream.active}`)
    if (!this.audioDom) {
      this.audioDom = document.createElement('audio')
    }
    this.audioDom.muted = false
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
      await this.audioDom.play()
      this.adapterRef.logger.log('播放 %o 的音频完成，当前播放状态: %o', this.uid, this.audioDom && this.audioDom.played && this.audioDom.played.length)
    } catch (e) {
      this.adapterRef.logger.warn('播放 %o 的音频出现问题: %o', this.uid, e)
    }
  }

  async isPlayAudioStream() {
    const getTimeRanges = async (time:number) => {
      if (time){
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
    if(!this.audioDom || !this.audioDom.srcObject) return false
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

  async isPlayVideoStream() {
    const getVideoFrames = async (time:number) => {
      if (time) {
        await new Promise((resolve)=>{setTimeout(resolve, time)});
      }
      if (this.videoDom && this.videoDom.srcObject) {
        return this.videoDom.getVideoPlaybackQuality().totalVideoFrames
      } else {
        return 0;
      }
    }
    const firstTotalVideoFrames = await getVideoFrames(0);
    const secondTotalVideoFrames = await getVideoFrames(100)
    return secondTotalVideoFrames > firstTotalVideoFrames
  }

  async playVideoStream(stream:MediaStream, view:HTMLElement) {
    if(!stream) return
    this.adapterRef.logger.log(`播放视频, id: ${stream.id}, active state: ${stream.active}`)
    this.videoView = view
    this._initNode()
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
      this.videoDom.srcObject = stream
      this.adapterRef.logger.log('播放 %o 的视频频, streamId: %o, stream状态: %o', this.uid, stream.id, stream.active)
      await this.videoDom.play()
      this.adapterRef.logger.log('播放 %s 的视频完成，当前播放状态: %o', this.uid, this.videoDom && this.videoDom.played && this.videoDom.played.length)
    } catch (e) {
      this.adapterRef && this.adapterRef.logger.warn('播放 %s 的视频出现问题: %o', this.uid, e)
    }
  }

  async stopPlayVideoStream() {
    if (this.videoContainerDom && this.videoDom) {
      this.videoContainerDom.removeChild(this.videoDom)
      this.videoDom = null
    }
    if (this.videoView && this.videoContainerDom) {
      this.videoView.removeChild(this.videoContainerDom)
      this.videoContainerDom = null
      this.videoView = null
    }
  }

  setRender(options = {width: 100, height: 100, cut: true}) {
    if(!this.videoDom) return
    this.adapterRef.logger.log('setRender: uid %s, options: %s', this.uid, JSON.stringify(options, null, ' '))

    this.containerSize = options
    // 设置外部容器
    if (this.videoContainerDom){
      this.videoContainerDom.style.width = `${options.width}px`
      this.videoContainerDom.style.height = `${options.height}px`
    }else{
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
  takeSnapshot (options:SnapshotOptions,recordId?: string) {
    let { uid, name = '' } = options 
    if (!name) {
      name = (uid || this.adapterRef.channelInfo.uid) + '-' + this.index++
    }
    return new Promise((resolve, reject) => {
      let canvas = document.createElement("canvas")
      let ctx = canvas.getContext("2d");
      if (!ctx){
        return reject(new Error('无法获取canvas上下文'));
      }
      if (!this.videoDom){
        return reject(new Error('没有videoDom'));
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight)
      canvas.width = this.videoDom.videoWidth
      canvas.height = this.videoDom.videoHeight
      ctx.drawImage(this.videoDom, 0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight, 0, 0, this.videoDom.videoWidth, this.videoDom.videoHeight)
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
        return resolve(name + '.png')
      })
    })
  }

  destroy() {
    this.stopPlayAudioStream()
    this.stopPlayVideoStream()
    this._reset()
  }
}

export { Play }