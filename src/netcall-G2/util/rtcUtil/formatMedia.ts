import { EventEmitter } from 'eventemitter3'
import { Timer, FormatMediaOptions, ClientRecordConfig, ILogger } from '../../types'


/*
  该模块主要的功能是混音和混流
 */
class FormatMedia extends EventEmitter{
  private audioContext: AudioContext| null;
  public destination: MediaStreamAudioDestinationNode|null;
  private audioStreams: AudioNode[];
  private canvas: HTMLCanvasElement|null;
  private canvasContext: CanvasRenderingContext2D|null;
  private canvasTimer: Timer|null
  private logger: ILogger;
  constructor(options: FormatMediaOptions){
    super()
    this.logger = options.logger
    this.audioContext = null
    this.destination = null
    this.audioStreams = []
    this.canvas = null
    this.canvasContext = null
    this.canvasTimer = null
  }

  //混音（webAudio）
  async formatAudio (streams: MediaStream[]) {
    this.logger.log('formatAudio() [混音: ]', streams)
    try {
      if (!this.audioContext) {
        this.audioContext = new window.AudioContext();
      }
      this.destination = this.audioContext.createMediaStreamDestination();
      await this.initAudioIn(streams);
      return this.destination.stream 
    } catch(e) {
      this.logger.error('媒体设备获取失败: ', e.name, e.message)
      return Promise.reject(e)
    }
  }

  initAudioIn(streams: MediaStream[]) {
    if (!this.audioContext || !this.destination){
      this.logger.error("initAudioIn:参数不够");
      return;
    }
    
    for (var i = 0; i < streams.length; i++){
      const audioSource = this.audioContext.createMediaStreamSource(streams[i])
      audioSource.connect(this.destination);
      this.audioStreams.push(audioSource)
    }

    this.logger.log(`initAudioIn() [初始化音频 state: ${this.audioContext.state}]`)
    if (this.audioContext.state !== 'running') {
      this.audioContext.resume().then(() => {
        if (this.audioContext){
          this.logger.log(`initAudioIn(): [audioContext 状态变更成功 state: ${this.audioContext.state}]`)
        }
      }).catch((error) => {
        this.logger.warn(`initAudioIn(): [audioContext 状态变更发生错误, errorName: ${error.name}, erroMessage: ${error.message}]`)
        if (this.audioContext){
          this.audioContext.resume();
        }
      })
    }
  }

  async updateStream(streams: MediaStream[]) {
    this.logger.log('updateStream() [更新混频的音频数据: ]', streams)
    this.audioStreams.forEach(audioSource=>{
      audioSource.disconnect(0)
    })
    this.audioStreams.length = 0
    this.initAudioIn(streams)
  }

  stopFormatAudio() {
    this.logger.log('stopFormatAudio() [结束混音]')
    this.audioStreams.forEach(audioSource=>{
      audioSource.disconnect(0)
    })

    if(this.audioContext){
      this.audioContext.close()
    }
    this.audioContext = null
  }


  //混频（canvas）
  async formatVideo (videoDoms: HTMLVideoElement[], config?: ClientRecordConfig) {
    this.logger.log('formatVideo() 混频: ', videoDoms, 'config: ', config)
    if (!videoDoms.length) {
      return
    } else if (videoDoms.length > 9) {
      this.logger.log('formatVideo() 超出了混频的上限')
      return
    }

    const recordVideoWidth = config?.recordVideoWidth || 640
    const recordVideoHeight = config?.recordVideoHeight || 360
    const recordVideoFrame = config?.recordVideoFrame || 15

    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.canvas.width = recordVideoWidth
      this.canvas.height = recordVideoHeight
      this.canvasContext = this.canvas.getContext('2d') 
    }
    if (this.canvasTimer) {
      clearInterval(this.canvasTimer)
      this.canvasTimer = null
    }

    const helfWidth = Math.floor(recordVideoWidth / 2)
    const helfHeigth = Math.floor(recordVideoHeight / 2)
    const oneThirdWidht = Math.floor(recordVideoWidth / 3)
    const oneThirdHeight = Math.floor(recordVideoHeight / 3)

    this.canvasTimer = setInterval(() => {
      switch(videoDoms.length) {
        case 1:
          this.canvasContext?.drawImage(videoDoms[0], 0, 0, recordVideoWidth, recordVideoHeight)
          break; 
        case 2:
          this.canvasContext?.drawImage(videoDoms[0], 0, 0, helfWidth, recordVideoHeight)
          this.canvasContext?.drawImage(videoDoms[1], helfWidth, 0, helfWidth, recordVideoHeight)
          break;
        case 3:
        case 4:
          this.canvasContext?.drawImage(videoDoms[0], 0, 0, helfWidth, helfHeigth)
          this.canvasContext?.drawImage(videoDoms[1], helfWidth, 0, helfWidth, helfHeigth)
          this.canvasContext?.drawImage(videoDoms[2], 0, helfHeigth, helfWidth, helfHeigth)
          videoDoms[3] && this.canvasContext?.drawImage(videoDoms[3], helfWidth, helfHeigth, helfWidth, helfHeigth)
          break;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
          this.canvasContext?.drawImage(videoDoms[0], 0, 0, oneThirdWidht, oneThirdHeight)
          this.canvasContext?.drawImage(videoDoms[1], oneThirdWidht, 0, oneThirdWidht, oneThirdHeight)
          this.canvasContext?.drawImage(videoDoms[2], oneThirdWidht * 2, 0 , oneThirdWidht, oneThirdHeight)
          this.canvasContext?.drawImage(videoDoms[3], 0, oneThirdHeight, oneThirdWidht, oneThirdHeight)
          this.canvasContext?.drawImage(videoDoms[4], oneThirdWidht, oneThirdHeight, oneThirdWidht, oneThirdHeight)
          videoDoms[5] && this.canvasContext?.drawImage(videoDoms[5], oneThirdWidht * 2, oneThirdHeight, oneThirdWidht, oneThirdHeight)
          videoDoms[6] && this.canvasContext?.drawImage(videoDoms[6], 0, oneThirdHeight * 2, oneThirdWidht, oneThirdHeight)
          videoDoms[7] && this.canvasContext?.drawImage(videoDoms[7], oneThirdWidht, oneThirdHeight * 2, oneThirdWidht, oneThirdHeight)
          videoDoms[8] && this.canvasContext?.drawImage(videoDoms[8], oneThirdWidht * 2, oneThirdHeight * 2, oneThirdWidht, oneThirdHeight)
          break;
        default: 
          break;  
      }
    }, Math.floor(1000 / recordVideoFrame))
    //@ts-ignore
    return this.canvas.captureStream()
  }

  async stopFormatVideo () {
    this.logger.log('stopFormatAudio() [结束混频]')
    if (this.canvasTimer) {
      clearInterval(this.canvasTimer)
      this.canvasTimer = null
    }
    this.canvasContext = this.canvas = null
  }



  destroy() {
    this.logger.log('destroy()')
    this.stopFormatAudio()
    this.stopFormatVideo()
  }
}



export {
  FormatMedia
}
