/**
 * 音频音量控制和实时音量获取
 * 对github开源插件进行了重写：mediastream-gain
 * https://github.com/otalk/mediastream-gain
 * created by hzzouhuan on 20170613
 * 音量获取参考:
 * https://webrtc.github.io/samples/src/content/getusermedia/volume/
 * 1. 音量控制
 * 2. 实时音量获取
 * 3. 多路音频输入
 */
import { EventEmitter } from 'eventemitter3'
import { RtcSupport } from '../util/rtcUtil/rtcSupport'
import { AuidoMixingState } from '../constant/state'
import {
  AdapterRef, AudioMixingOptions,soundsConf,
  Logger,
  WebAudioOptions,

} from '../types'

/**
 * webaudio 控制
 * @param {object} option 音频配置
 * @param {MediaStream_Array} option.stream 音频输入流，可以有多个输入，详情在下方：
 * 单个输入的音频流可以更新替换为新的，但是多路输入目前无法进行更新
 * @param {Num} option.uid 用户uid, 可选
 * @param {Boolean} [option.isAnalyze=false] 是否需要监控分析，默认不分析
 * @param {Boolean} [option.isRemote=false] 是否是远程流，远程流使用同一个输出
 */
const supports = RtcSupport.checkWebAudio()

let globalAc:AudioContext;

class WebAudio extends EventEmitter{
  private support:boolean;
  private gain: number;
  private stream: MediaStream | MediaStream[];
  private logger: Logger;
  private adapterRef: AdapterRef;
  private audioIn: {[key:string]: MediaStreamAudioSourceNode};
  private isAnalyze:boolean;
  private isRemote: boolean;
  private instant: number;
  private slow: number;
  private clip: number;
  private script?: ScriptProcessorNode;
  public mixAudioConf: {
    state: number,
    audioSource?: AudioBufferSourceNode|null,
    gainFilter?: GainNode|null,
    replace: boolean,
    cycle: number,
    pauseTime: number,
    startTime: number,
    totalTime: number,
    volume: number,
    playStartTime: number,
    setPlayStartTime: number,
    auidoMixingEnd: ((evt:Event) => void)|null,
  };
  public gainFilter?:GainNode;
  public musicDestination: MediaStreamAudioDestinationNode | null;
  public analyzeDestination: MediaStreamAudioDestinationNode | null;
  public destination: MediaStreamAudioDestinationNode|null;
  public context: AudioContext| null;
  
  constructor(option: WebAudioOptions) {
    super()
    const { adapterRef, stream, isAnalyze=true, isRemote = false } = option
    this.support = supports.WebAudio && supports.MediaStream

    // set our starting value
    this.gain = 1
    this.stream = stream
    this.logger = adapterRef.logger
    this.adapterRef = adapterRef
    this.audioIn = {}
    this.isAnalyze = isAnalyze
    this.isRemote = isRemote || false
    this.instant = 0.0
    this.slow = 0.0
    this.clip = 0.0
    this.mixAudioConf = {
      state: AuidoMixingState.UNSTART,
      audioSource: null,
      gainFilter: null,
      replace: false,
      cycle: 0,
      pauseTime: 0,
      startTime: 0,
      totalTime: 0,
      volume: 1,
      playStartTime: 0,
      setPlayStartTime: 0,
      auidoMixingEnd: null
    };
    
    if (globalAc){
      this.context = globalAc;
    }else if (supports.WebAudio && supports.MediaStream)
    {
      globalAc = new window.AudioContext()
      this.context = globalAc;
    }else{
      this.context = null;
    }
    
    if (this.context){
      // 伴音+音频输入
      this.destination = new MediaStreamAudioDestinationNode(this.context);
      // 仅有伴音，用于本地回放:localStream.play({audio: true, audioType: "music"})
      this.musicDestination = new MediaStreamAudioDestinationNode(this.context);
      // 仅用于测量音量
      this.analyzeDestination = new MediaStreamAudioDestinationNode(this.context);
    }else{
      this.destination = null;
      this.musicDestination = null;
      this.analyzeDestination = null;
    }
    
    if (this.support) {
      this.resetMixConf()
      this.init()
    }
  }
  
  init() {
    if (!this.validateInput()) return
    if (this.isAnalyze) {
      this.initMonitor()
    }

    this.formatStreams()
    this.initWebAudio()
    this.initAudioIn()
  }
  
  // 先验证输入流数据是否合法
  validateInput() {
    // 注：Firefox通过API获取的原生流构造函数是：LocalMediaStream
    return /(Array|MediaStream|LocalMediaStream)/.test(this.stream.constructor.toString())
  }


  // 第一步：初始化音量分析监控的脚本节点
  initMonitor() {
    var that = this
    if (!this.context){
      that.logger.error("initMonitor:参数不够");
      return;
    }
    var scriptNode = (this.script = this.context.createScriptProcessor(0, 1, 1))

    scriptNode.onaudioprocess = function (event) {
      var input = event.inputBuffer.getChannelData(0)
      var i
      var sum = 0.0
      var clipcount = 0
      for (i = 0; i < input.length; ++i) {
        sum += Math.abs(input[i])
        if (Math.abs(input[i]) > 0.99) {
          clipcount += 1
        }
      }
      that.instant = Math.sqrt(sum / input.length)
      that.slow = 0.95 * that.slow + 0.05 * that.instant
      that.clip = clipcount / input.length

      let inputBuffer = event.inputBuffer
      let outputBuffer = event.outputBuffer;
      outputBuffer.copyToChannel && outputBuffer.copyToChannel(inputBuffer.getChannelData(0), 0, 0);
    }
  }
  
  // 第二步：初始化webaudio的连接工作
  initWebAudio() {
    if (!this.context || !this.destination){
      this.logger.error("initMonitor:参数不够");
      return;
    }
    this.gainFilter = this.context.createGain()

    this.gainFilter.gain.value = this.gain

    //this.gainFilter.connect(this.destination)
  }
  
  // 第三步：初始化音频输入
  initAudioIn() {
    const that = this
    if (!this.context|| !this.gainFilter || !this.destination){
      this.logger.error("initAudioIn:参数不够");
      return null;
    }
    
    let tmp

    // 单路输入
    if (/(MediaStream|LocalMediaStream)/.test(this.stream.constructor.toString())) {
      addMs(this.stream as MediaStream)
      return
    }

    // 多路输入
    if (this.stream.constructor === Array) {
      this.stream.forEach(item => {
        tmp = addMs(item)
        if (tmp) {
          this.audioIn[item.id] = tmp
        }
      })
    }

    function addMs (ms:MediaStream) {
      if (!/(MediaStream|LocalMediaStream)/.test(ms.constructor.toString())){
        that.logger.error("addMs:参数不够");
        return null
      }
      if (ms.getAudioTracks().length === 0 || !that.context|| !that.gainFilter || !that.destination){
        that.logger.log('addMs失败');
        return null;
      }
      let audioIn = new MediaStreamAudioSourceNode(that.context, {mediaStream: ms})
      
      // 大坑问题！ script目前的代码是没有输出的，只作分析使用，所以source还要再连接一下下一个输出!
      /*if (that.isAnalyze && that.script) {
        audioIn.connect(that.script)
        that.script.connect(that.gainFilter)
      }*/
      audioIn.connect(that.gainFilter)
      that.audioIn[ms.id] = audioIn
      if (that.mixAudioConf.state === AuidoMixingState.UNSTART) {
        if (that.script && that.analyzeDestination) {
          that.gainFilter.connect(that.script)
          that.script.connect(that.analyzeDestination)
        }
        that.gainFilter.connect(that.destination)
      }
      return audioIn
    }

    this.logger.log('WebAudio: addMs: 初始化音频 state: ', this.context.state)
    if (this.context.state !== 'running') {
      this.context.resume().then(() => {
        if (this.context){
          this.logger.log('WebAudio: addMs: 状态变更成功 state: ', this.context.state)
        }
      }).catch((error) => {
        this.logger.log('WebAudio: addMs: 状态变更出错: ', error)
        if (this.context){
          this.context.resume();
        }
      })
    }
  }

  // 格式化流输入，为了不影响原始流，这里需要获取所有音频轨道，对每个轨道进行重新包裹
  formatStreams() {
    const stream = this.stream
    const arr:MediaStream[] = []

    // 单路输入
    if (stream instanceof MediaStream) {
      stream.getAudioTracks().map(track => {
        arr.push(new MediaStream([track]))
      })
      this.stream = arr
      return
    }

    // 多路输入
    if (stream.constructor === Array) {
      stream.map(item => {
        item.getAudioTracks().map(track => {
          arr.push(new MediaStream([track]))
        })
      })
      this.stream = arr
    }
  }

  // 动态加入音频流进行合并输出
  addStream(stream:MediaStream) {
    if (stream.getAudioTracks().length === 0 || !this.context || !this.gainFilter) {
      
      return
    }
    var audioIn = new MediaStreamAudioSourceNode(this.context, {mediaStream: stream})
    if (this.isAnalyze && this.script) {
      audioIn.connect(this.script)
    }
    audioIn.connect(this.gainFilter)
    this.audioIn[stream.id] = audioIn
  }
  
  // 更新流：全部替换更新
  updateStream(stream:MediaStream) {
    if (this.audioIn) {
      for (let i in this.audioIn) {
        this.audioIn[i] && this.audioIn[i].disconnect(0)
        delete this.audioIn[i]
      }
    }
    this.stream = stream
    this.initAudioIn()
  }
  
  // setting
  setGain(val:number) {
    // check for support
    if (!this.gainFilter) return
    this.gainFilter.gain.value = val
    this.gain = val
  }
  
  getGain() {
    // check for support
    if (!this.gainFilter) return
    return this.gain
  }
  
  stop() {
    // check for support
    if (!this.gainFilter) return

    if (this.script) {
      this.script.disconnect(0)
    } else {
      this.gainFilter.disconnect(0)
    }
    this.instant = 0.0
  }
  
  start() {
    // check for support
    if (!this.gainFilter || !this.destination) return
    
    if (this.script && this.analyzeDestination) {
      this.gainFilter.connect(this.script)
      this.script.connect(this.analyzeDestination)
    }
    this.gainFilter.connect(this.destination)
  }


  /**
   * ************************ 伴音功能相关 *****************************
   */

  resetMixConf() {
    if (this.mixAudioConf.replace) {
      this.logger.log('伴音停止了，恢复mic')
      if (this.gainFilter && this.destination){
        if (this.script && this.analyzeDestination) {
          this.gainFilter.connect(this.script)
          this.script.connect(this.analyzeDestination)
        }
        this.gainFilter.connect(this.destination);
      }
    }
    this.mixAudioConf = {
      state: AuidoMixingState.UNSTART,
      audioSource: null,
      gainFilter: null,
      replace: false,
      cycle: 0,
      pauseTime: 0,
      startTime: 0,
      totalTime: 0,
      volume: 1,
      playStartTime: 0,
      setPlayStartTime: 0,
      auidoMixingEnd: null
    }
    if (this.gainFilter && this.gainFilter.gain.value === 1 && this.adapterRef.localStream && this.adapterRef.localStream.mediaHelper){
      // Hack：应该抛出事件，让mediaHelper执行。
      //this.adapterRef.localStream.mediaHelper.disableAudioRouting();
      this.emit('audioFilePlaybackCompleted')
    }
  }

  startMix(options:AudioMixingOptions) {
    if (!this.context || !this.destination || !this.gainFilter){
      this.logger.error("initMonitor:参数不够");
      return Promise.reject("initMonitor:参数不够");
    }
    
    this.logger.log('开始混音: %s', JSON.stringify(options, null, ' '))
    this.mixAudioConf.audioSource = this.context.createBufferSource()
    this.mixAudioConf.gainFilter = this.context.createGain()
    this.mixAudioConf.audioSource.buffer = options.buffer
    this.mixAudioConf.replace = options.replace
    this.mixAudioConf.cycle = options.cycle
    this.mixAudioConf.playStartTime = options.playStartTime
    this.mixAudioConf.volume = options.volume ? options.volume / 255 : 1
    this.mixAudioConf.auidoMixingEnd = options.auidoMixingEnd
    this.mixAudioConf.audioSource.connect(this.mixAudioConf.gainFilter)
    this.mixAudioConf.gainFilter.connect(this.destination)
    if (this.musicDestination){
      this.mixAudioConf.gainFilter.connect(this.musicDestination)
    }
    if (options.replace) {
      this.gainFilter.disconnect(0)
      this.instant = 0.0
    }
    this.mixAudioConf.audioSource.onended = event => {
      this.audioEnd(event)
    }
    this.mixAudioConf.totalTime = options.buffer.duration
    if (this.mixAudioConf.playStartTime < 0 || this.mixAudioConf.playStartTime >= this.mixAudioConf.totalTime) {
      this.mixAudioConf.playStartTime = 0
    }
    this.logger.log('设置音量: %s', this.mixAudioConf.volume)
    this.mixAudioConf.gainFilter.gain.value = this.mixAudioConf.volume
    if (options.loopback && options.cycle > 1) {
      this.mixAudioConf.audioSource.loop = options.loopback
      const totalTime = options.cycle * this.mixAudioConf.totalTime - this.mixAudioConf.playStartTime
      this.logger.log('循环播放: options.playStartTime: ', this.mixAudioConf.playStartTime)
      this.logger.log('循环播放: totalTime: ', totalTime)
      //this.logger.log('audioSource: ', this.mixAudioConf.audioSource)
      this.mixAudioConf.audioSource.start(0, this.mixAudioConf.playStartTime, totalTime - 1)
    } else if (options.loopback && options.cycle == 1) {
      this.mixAudioConf.audioSource.loop = false
      this.mixAudioConf.audioSource.start(0, this.mixAudioConf.playStartTime)
    } else {
      this.logger.log('无限循环播放 loop: ', options.loopback)
      this.mixAudioConf.audioSource.loop = options.loopback
      this.mixAudioConf.audioSource.start(0, this.mixAudioConf.playStartTime)
    }
    this.mixAudioConf.state = AuidoMixingState.PLAYED
    this.mixAudioConf.startTime = Date.now()
    return Promise.resolve()
  }
  
  /*
    暂停混音
  */
  pauseAudioMixing() {
    if (!this.mixAudioConf.audioSource || !this.mixAudioConf.gainFilter){
      this.logger.error("pauseAudioMixing:参数不够");
      return;
    }
    this.logger.log('暂停混音')
    this.mixAudioConf.audioSource.onended = null
    this.mixAudioConf.audioSource.disconnect(0)
    this.mixAudioConf.gainFilter.disconnect(0)
    this.mixAudioConf.audioSource.stop()
    this.mixAudioConf.pauseTime = Date.now()
    this.mixAudioConf.state = AuidoMixingState.PAUSED
    let playedTime = (this.mixAudioConf.pauseTime - this.mixAudioConf.startTime) / 1000 + this.mixAudioConf.playStartTime
    this.logger.log('已经播放的时间: ', playedTime)
    if (playedTime > this.mixAudioConf.totalTime) {
      playedTime = playedTime % this.mixAudioConf.totalTime
    }
    this.logger.log("暂停位置:", playedTime)

    return Promise.resolve()
  }
  
  /*
    恢复混音
  */
  resumeAudioMixing(options:AudioMixingOptions) {
    this.logger.log('恢复混音')
    this.mixAudioConf.pauseTime = 0
    options.volume = this.mixAudioConf.volume * 255
    return this.startMix(options)
  }
  
  /*
    停止混音
  */
  stopAudioMixing(isFinished = true) {
    if (!this.mixAudioConf.audioSource || !this.mixAudioConf.gainFilter){
      this.logger.error("stopAudioMixing:参数不够");
      return Promise.reject("stopAudioMixing:参数不够");
    }
    this.logger.log('停止混音, isFinished: ', isFinished)
    this.mixAudioConf.audioSource.onended = null
    this.mixAudioConf.audioSource.disconnect(0)
    this.mixAudioConf.gainFilter.disconnect(0)
    this.mixAudioConf.audioSource.stop()
    this.mixAudioConf.state = AuidoMixingState.STOPED
    if (isFinished) {
      this.resetMixConf()
    }
    return Promise.resolve()
  }

  audioEnd(event:Event) {
    if (this.mixAudioConf.state !== AuidoMixingState.PLAYED) {
      this.logger.error("audioEnd:参数不够");
      return
    } else if (this.mixAudioConf.audioSource && this.mixAudioConf.audioSource.loop && this.mixAudioConf.cycle <= 0) {
      this.logger.log('无限循环时，伴音播放完成event: ', event)
      return
    }
    this.logger.log('伴音播放完成: ', this.mixAudioConf)
    if (this.mixAudioConf.audioSource){
      this.mixAudioConf.audioSource.onended = null
    }
    if (this.mixAudioConf.auidoMixingEnd) {
      this.mixAudioConf.auidoMixingEnd(event)
      this.mixAudioConf.auidoMixingEnd = null
    }
    this.resetMixConf()
    return Promise.resolve()
  }
  
  /*
    设置混音音量
  */
  setAudioMixingVolume(volume:number) {
    if(!this.mixAudioConf.gainFilter){
      this.logger.error("setAudioMixingVolume:参数不够");
      return;
    }
    this.mixAudioConf.gainFilter.gain.value = volume / 255
    this.mixAudioConf.volume = this.mixAudioConf.gainFilter.gain.value
    return Promise.resolve()
  }
  
  /*
    设置混音播放位置
  */
  setAudioMixingPlayTime(options:AudioMixingOptions) {
    if (this.mixAudioConf.state === AuidoMixingState.PLAYED) {
      this.mixAudioConf.setPlayStartTime = options.playStartTime
    }
    options.volume = this.mixAudioConf.volume * 255
    return this.startMix(options)
  }
  
  /*
    获取混音文件的播放位置
  */
  getAudioMixingPlayedTime() {
    //this.logger.log('获取混音文件的播放位置: ', this.mixAudioConf)
    let currentTime = Date.now();
    if (this.mixAudioConf.state == AuidoMixingState.PAUSED && this.mixAudioConf.pauseTime) {
      this.logger.log('当前是暂停状态')
      currentTime = this.mixAudioConf.pauseTime
    }
    let playedTime = (currentTime - this.mixAudioConf.startTime) / 1000 + this.mixAudioConf.playStartTime
    //this.logger.log('已经播放的时间: ', playedTime)
    if (playedTime > this.mixAudioConf.totalTime) {
      playedTime = playedTime % this.mixAudioConf.totalTime
    }
    //this.logger.log("当前播放进度:", playedTime)

    return {playedTime: playedTime}
  }

  /*
    获取混音文件时长
  */
  getAudioMixingTotalTime() {
    return {totalTime: this.mixAudioConf.totalTime}
  }



  /**   音效     */

  createAudioBufferSource (buffer: AudioBuffer) {
    if (!this.context || !this.destination || !this.gainFilter){
      this.logger.error("initMonitor:参数不够");
      return {}
    }
    const sourceNode =  this.context.createBufferSource()
    sourceNode.buffer = buffer
    const gainNode = this.context.createGain()
    sourceNode.connect(gainNode)
    const result = {sourceNode, gainNode}
    return result
  }


  startAudioEffectMix (options:soundsConf) {
    if (!this.context || !this.destination || !this.gainFilter){
      this.logger.error("initMonitor:参数不够");
      return Promise.reject("initMonitor:参数不够");
    }
    const {
      sourceNode,
      gainNode,
      playOverTime,
      playStartTime,
      volume,
      cycle
    } = options

    if (!gainNode || !sourceNode) {
      return 
    }
    this.logger.log('startAudioEffectMix: ', options)
    gainNode.connect(this.destination)
    if (this.musicDestination){
      gainNode.connect(this.musicDestination)
    }
    gainNode.gain.value = volume / 100

    if (cycle > 1) {
      sourceNode.loop = true
      sourceNode.start(0, playStartTime, playOverTime)
    } else {
      sourceNode.loop = false
      sourceNode.start(0, playStartTime)
    } 

    this.mixAudioConf.state = AuidoMixingState.PLAYED
    this.mixAudioConf.startTime = Date.now()
  }


  stopAudioEffectMix (options:soundsConf) {
    const {
      sourceNode,
      gainNode,
      playOverTime,
      playStartTime,
      volume,
      cycle
    } = options
    if (!gainNode || !sourceNode){
      this.logger.error("stopAudioEffectMix: 参数不够");
      return Promise.reject("stopAudioEffectMix: 参数不够");
    }
    this.logger.log('stopAudioEffectMix: ', options)
    sourceNode.onended = null
    sourceNode.disconnect(0)
    gainNode.disconnect(0)
    sourceNode.stop()
  }

  /*off() {
    return this.setGain(0)
  }

  on() {
    this.setGain(1)
  }*/

  destroy() {
    const that = this;
    this.adapterRef.logger.log('AudioContext 清除')
    this.instant = 0.0
    this.slow = 0.0
    this.clip = 0.0

    // this.microphone && this.microphone.disconnect(0)
    this.gainFilter && this.gainFilter.disconnect(0)
    this.script && this.script.disconnect(0)

    if (this.audioIn) {
      for (let i in this.audioIn) {
        this.audioIn[i] && this.audioIn[i].disconnect(0)
      }
    }

    this.audioIn = {}

    let ms = this.stream

    if (ms instanceof MediaStream) {
      dropMS(ms)
    }

    if (ms.constructor === Array) {
      ms.forEach(item => {
        dropMS(item)
      })
    }

    function dropMS (mms:MediaStream) {
      if (!mms){
        that.logger.error("dropMS:参数不够");
        return
      }
      // 这里不要停止轨道!!!停止轨道相当于结束音源，所有用到这个轨道的流都无法继续了
      // let tracks = mms.getTracks()
      // if (!tracks || tracks.length === 0) return
      mms.getTracks().forEach(function (track) {
        // track.stop()
        mms.removeTrack(track)
      })
    }
  }

  getVolumeData() {
    // return {
    //   instant: this.instant.toFixed(2),
    //   slow: this.slow.toFixed(2),
    //   clip: this.clip.toFixed(2)
    // }
    return this.instant.toFixed(2)
  }
}

export {
  WebAudio
}
