/**
 * 音频的音量计算模块
 */
import { EventEmitter } from 'eventemitter3'
import { RtcSupport } from '../util/rtcUtil/rtcSupport'
import {
  AudioLevelOptions, AdapterRef
} from '../types'
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';

const supports = RtcSupport.checkWebAudio()
//@ts-ignore
const globalAc = window.AudioContext || window.webkitAudioContext;
class AudioLevel extends EventEmitter{
  private support:boolean;
  private level: number;
  public letfvolume: number;
  public rightVolume: number;
  private adapterRef: AdapterRef;
  private stream: MediaStream|null;
  private analyserNode: AnalyserNode|null;
  private timeDomainData: Uint8Array;
  private sourceNode: MediaStreamAudioSourceNode|null|undefined;
  public context: AudioContext|null;
  private audioWorkletNode: AudioWorkletNode|null;
  
  constructor(options: AudioLevelOptions) {
    super()
    this.support = supports.WebAudio && supports.MediaStream
    this.level = 0
    this.letfvolume = 0
    this.rightVolume = 0
    this.stream = options.stream
    this.adapterRef = options.adapterRef
    this.context = new globalAc()
    this.analyserNode = this.sourceNode = null
    this.audioWorkletNode = null
    this.timeDomainData = new Uint8Array(1024)
    if (this.support) {
      this.init()
    }
    this.connect()
  }

  _reset() {
    this.disconnect()
    if (this.analyserNode) {
      this.analyserNode = null
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode = null
    }
    if (this.context) {
      this.context = null
    }
  }

  // 第三步：初始化音频输入
  init() {
    if (!this.context) { 
      return
    }
    this.adapterRef.logger.log('AudioLevel: init() 初始化音频 state: ', this.context.state)
    if (this.context.state !== 'running') {
      this.context.resume().then(() => {
        this.adapterRef.logger.log('AudioLevel: init() 状态变更成功 state: ', this.context && this.context.state)
      }).catch((error) => {
        this.adapterRef.logger.log('AudioLevel: init() 状态变更出错: ', error.name, error.message, error)
        if (this.context){
          this.context.resume();
        }
      })
    }
  }

  async connect() {
    if(!this.context){
      return
    }
    if (this.stream) {
      this.sourceNode = this.createSource({mediaStream: this.stream});
    }
    await this.initAudioWorkletNode()
    //agora计算音量的方式，弃用
    /*this.analyserNode = this.context.createAnalyser();
    this.timeDomainData = new Uint8Array(this.analyserNode.frequencyBinCount);*/
    /*if (this.sourceNode && this.analyserNode) {
      this.sourceNode.connect(this.analyserNode)
    }*/

    if (this.sourceNode && this.audioWorkletNode) {
      this.sourceNode.connect(this.audioWorkletNode)
      //this.sourceNode.connect(this.context.destination)
    } else {
      this.adapterRef.logger.warn('AudioLevel: connect() 缺乏audioWorkletNode、sourceNode')
    }
  }

  disconnect() {
    if (this.sourceNode) {
      this.sourceNode.disconnect(0);
      this.sourceNode = null
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect(0)
      this.audioWorkletNode = null
    }
    this.stream = null
    this.level = 0
  }


  createSource(options: {mediaStream: MediaStream}){
    if (this.context) {
      try{
        return this.context.createMediaStreamSource(options.mediaStream);
      }catch(e){
        if (e.name === "TypeError"){
          return new MediaStreamAudioSourceNode(this.context, options);
        }else{
          throw new RtcError({
            code: ErrorCode.INVALID_PARAMETER,
            message: `[AudioLevel] createSource: ${e.message}`
          })
        }
      }
    }
  }

  async initAudioWorkletNode() {
    if (!this.context){
      this.adapterRef.logger.warn("initAudioWorkletNode:参数不够");
      return;
    }
    if (this.audioWorkletNode) {
      return
    }
    try {
      //使用CND加速
      //支持单声道
      //await this.context.audioWorklet.addModule('https://yx-web-nosdn.netease.im/common/32204f5b5ca42e0164515894fa4d0b09/volumeProcessor.js')
      //支持双声道，文件就是 src/netcall-G2/module/volumeProcessor.js
      await this.context.audioWorklet.addModule('https://yx-web-nosdn.netease.im/sdk-release/volumeProcessorUglify.js')
      this.audioWorkletNode = new AudioWorkletNode(this.context, 'vumeter')
      this.audioWorkletNode.port.onmessage  = event => {
        if (event.data.volume) {
          this.letfvolume = event.data.letfvolume
          this.rightVolume = event.data.rightVolume
        }
      }
    } catch (e) {
      this.adapterRef.logger.error('音量采集模块加载失败: ', e)
    }
  } 


  updateStream(audioStream: MediaStream) {
    this.adapterRef.logger.log('AudioLevel updateStream()')
    if (this.sourceNode) {
      this.sourceNode.disconnect(0);
      this.sourceNode = null
    }
    this.stream = audioStream
    this.connect()
  }
  
  //agora计算音量的方式，弃用
  calculateAudioLevel () {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(this.timeDomainData);
      let value = 0
      for (let i = 0; i < this.timeDomainData.length; i++) {
        value = Math.max(value, Math.abs(this.timeDomainData[i] - 128));
      }
      this.level =  value / 128
    } else {
      this.adapterRef.logger.warn('AudioLevel: 缺乏analyserNode')
      this.level = 0
    }
    return this.level + ''
  }

  getAudioLevel () {
    //音量过低了
    /*if (this.level < 0.00005) {
      this.level = 0
    }*/
    this.level = +((this.letfvolume + this.letfvolume)/2).toFixed(5)
    /*console.log('左声道音量: ', this.letfvolume)
    console.log('右声道音量： ', this.rightVolume)
    console.warn('中和左右声道: ', this.level)*/
    return this.level
  }

  destroy() {
    this.adapterRef.logger.log('destroy() AudioLevel模块')
    this._reset()
  }
}

export {
  AudioLevel
}
