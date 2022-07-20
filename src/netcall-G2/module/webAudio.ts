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
import {AuidoMixingState, MIXING_STATES} from '../constant/state'
import {
  AdapterRef, AudioMixingOptions, soundsConf,
  ILogger,
  WebAudioOptions, AudioInConfig, MediaTypeAudio,

} from '../types'
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';

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

class AudioIn{
  audioNode: AudioNode;
  gainNode: GainNode;
  id: string;
  label: string;
  type?: MediaTypeAudio;
  
  constructor(config: AudioInConfig) {
    this.id = config.id;
    this.label = config.label;
    this.audioNode = config.audioNode;
    this.gainNode = config.context.createGain();
    this.type = config.type;
    
    this.audioNode.connect(this.gainNode);
  }
  
  connect(audioNode: AudioNode){
    this.gainNode.connect(audioNode);
  }
  
  disconnect() {
    try{
      this.audioNode.disconnect(this.gainNode);
    }catch(e){
      // continue
    }
    this.gainNode.disconnect();
  }
}

export function getAudioContext(){
  if (globalAc){
    return globalAc;
  }else if (supports.WebAudio && supports.MediaStream)
  {
    globalAc = new window.AudioContext({
      sampleRate: 16000,
    })
    return globalAc;
  }else{
    return null;
  }
}

class WebAudio extends EventEmitter{
  private support:boolean;
  private gain: number;
  private logger: ILogger;
  public audioInArr: AudioIn[];
  private isAnalyze:boolean;
  private isRemote: boolean;
  private instant: number;
  private slow: number;
  private clip: number;
  private script?: ScriptProcessorNode;
  public mixAudioConf: {
    state: MIXING_STATES,
    audioSource?: AudioBufferSourceNode|null,
    /**
     * 伴音的音量
     */
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
  /**
   * 麦克风+屏幕共享音频+伴音+音效的汇总节点
   * 除了处理mute/unmute，不会单独设置音量
   */
  public gainFilter?:GainNode;
  public musicDestination: MediaStreamAudioDestinationNode | null;
  public analyzeDestination: MediaStreamAudioDestinationNode | null;
  public destination: MediaStreamAudioDestinationNode|null;
  public context: AudioContext| null;
  
  constructor(option: WebAudioOptions) {
    super()
    const { logger, isAnalyze=false, isRemote = false } = option
    this.support = supports.WebAudio && supports.MediaStream

    // set our starting value
    this.gain = 1
    this.logger = logger
    this.audioInArr = []
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
    
    this.context = getAudioContext();
    
    if (this.context){
      // 伴音+音频输入
      this.destination = this.createDestination();
      // 仅有伴音，用于本地回放:localStream.play({audio: true, audioType: "music"})
      this.musicDestination = this.createDestination();
      // 仅用于测量音量
      this.analyzeDestination = this.createDestination();
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
  
  createDestination(){
    if (this.context){
      try{
        return new MediaStreamAudioDestinationNode(this.context);
      }catch(e){
        if (e.name === "TypeError"){
          return this.context.createMediaStreamDestination();
        }else{
          throw e;
        }
      }
    }else{
      throw new Error('AudioContextRequired');
    }
  }
  
  createSource(options: {mediaStream: MediaStream}){
    if (this.context){
      try{
        return new MediaStreamAudioSourceNode(this.context, options);
      }catch(e){
        if (e.name === "TypeError"){
          return this.context.createMediaStreamSource(options.mediaStream);
        }else{
          throw e;
        }
      }
    }else{
      throw new Error('AudioContextRequired');
    }
  }
  
  init() {
    if (this.isAnalyze) {
      this.initMonitor()
    }

    this.initWebAudio()
    this.initAudioIn()
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
    if (!that.context|| !that.gainFilter || !that.destination){
      this.logger.error("initAudioIn:参数不够");
      return null;
    }

    for (var i = 0; i < that.audioInArr.length; i++){
      const audioIn = that.audioInArr[i];
      audioIn.connect(that.gainFilter)
    }

    if (that.mixAudioConf.state === AuidoMixingState.UNSTART) {
      if (that.script && that.analyzeDestination) {
        that.gainFilter.connect(that.script)
        that.script.connect(that.analyzeDestination)
      }
      that.gainFilter.connect(that.destination)
    }

    this.logger.log('WebAudio: initAudioIn: 初始化音频 state: ', that.context.state)
    if (that.context.state !== 'running') {
      that.context.resume().then(() => {
        if (this.context){
          this.logger.log('WebAudio: addMs: 状态变更成功 state: ', this.context.state)
        }
      }).catch((error) => {
        this.logger.log('WebAudio: addMs: 状态变更出错: ', error.name, error.message, error)
        if (this.context){
          this.context.resume();
        }
      })
    }
  }
  
  // 更新流：替换ID对不上的
  updateTracks(trackInputs: {track: MediaStreamTrack|null, type?: MediaTypeAudio}[]) {
    // 1. 删除不再存在的AudioIn
    for (let i = this.audioInArr.length - 1; i >=0; i--){
      const formerAudioIn = this.audioInArr[i];
      const matchedAudioIn = trackInputs.find((trackInput)=>{
        return trackInput.track && formerAudioIn && trackInput.track.id === formerAudioIn.id;
      });
      if (!matchedAudioIn){
        this.logger.log('updateTracks，删除', formerAudioIn.label, formerAudioIn.id);
        this.audioInArr.splice(i, 1);
        formerAudioIn.disconnect();
      }
    }
    // 2. 增加新的AudioIn
    for (let j = trackInputs.length - 1; j >=0; j--){
      const newTrackInput = trackInputs[j];
      const matchedAudioIn = this.audioInArr.find((audioIn)=>{
        return newTrackInput.track && newTrackInput.track.id === audioIn.id;
      });
      if (!matchedAudioIn && newTrackInput.track){
        if (this.context){
          const mediaStream = new MediaStream()
          mediaStream.addTrack(newTrackInput.track);
          const audioInConfig:AudioInConfig = {
            context: this.context,
            id: newTrackInput.track.id,
            label: newTrackInput.track.label,
            audioNode: this.createSource({mediaStream}),
            type: newTrackInput.type,
          };
          const newAudioIn = new AudioIn(audioInConfig)
          newAudioIn.gainNode.gain.value = this.gain;
          this.audioInArr.push(newAudioIn)          
        }else{
          this.logger.error('updateTracks：没有audioContext');
        }
      }
    }
    this.initAudioIn()
  }
  
  removeTrack(track: MediaStreamTrack){
    for (let i = this.audioInArr.length - 1; i >=0; i--){
      const formerAudioIn = this.audioInArr[i];
      if (formerAudioIn.id === track.id){
        this.logger.log('removeTrack，删除track', track.id, track.label);
        this.audioInArr.splice(i, 1);
        formerAudioIn.disconnect();
      }
    }
  }
  
  // setting
  setGain(val:number, type?: MediaTypeAudio) {
    for (let i = 0; i < this.audioInArr.length; i++){
      const audioIn = this.audioInArr[i];
      if (!type || type === audioIn.type){
        this.logger.log("WebAudio.setGain", type, val, audioIn.type, audioIn.label, audioIn.id);
        audioIn.gainNode.gain.value = val;
      }
    }
    if (!type) {
      // 注意，这个gain值不会设置到this.gainFilter上去。
      // this.gainFilter只是作为所有混音输入（麦克风、伴音、音效）的汇总节点，并且处理mute的情况。
      // 音量应该设置到每个单独的输入的gain上去。
      this.gain = val
    }
  }
  
  getGain() {
    // check for support
    if (!this.gainFilter) return
    return this.gain
  }
  
  getGainMin(){
    let minGain = 1;
    for (let i = 0; i < this.audioInArr.length; i++){
      const audioIn = this.audioInArr[i];
      if (audioIn.gainNode.gain.value < minGain){
        minGain  = audioIn.gainNode.gain.value;
      }
    }
    return minGain;
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
    this.mixAudioConf.audioSource?.disconnect(0)
    this.mixAudioConf.gainFilter?.disconnect(0)
    if (this.mixAudioConf.replace) {
      this.logger.log('伴音停止了，恢复mic')
      if (this.gainFilter && this.destination){
        for (var i = 0; i < this.audioInArr.length; i++){
          const audioIn = this.audioInArr[i];
          audioIn.gainNode.connect(this.gainFilter)
        }
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
    if (this.gainFilter && this.gainFilter.gain.value === 1){
      this.emit('audioFilePlaybackCompleted')
    }
  }

  startMix(options:AudioMixingOptions) {
    if (!this.context || !this.destination || !this.gainFilter){
      this.logger.error("initMonitor:参数不够");
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'initMonitor: invalid parameter'
        })
      )
    }
    
    this.logger.log('开始混音: ', JSON.stringify(options))
    this.mixAudioConf.audioSource = this.context.createBufferSource()
    this.mixAudioConf.gainFilter = this.context.createGain()
    this.mixAudioConf.audioSource.buffer = options.buffer
    this.mixAudioConf.replace = options.replace
    this.mixAudioConf.cycle = options.cycle
    this.mixAudioConf.playStartTime = options.playStartTime
    this.mixAudioConf.volume = options.volume ? options.volume / 255 : 1
    this.mixAudioConf.auidoMixingEnd = options.auidoMixingEnd
    this.mixAudioConf.audioSource.connect(this.mixAudioConf.gainFilter)
    this.mixAudioConf.gainFilter.connect(this.gainFilter)
    if (this.musicDestination){
      this.mixAudioConf.gainFilter.connect(this.musicDestination)
    }
    if (options.replace) {
      // 将audioIn全部断开
      for (var i = 0; i < this.audioInArr.length; i++){
        const audioIn = this.audioInArr[i];
        try{
          audioIn.gainNode.disconnect(this.gainFilter)
          this.logger.log(`已断开音频：【${audioIn.label}】`)
        }catch(e){
          if (e.name === "InvalidAccessError"){
            this.logger.log(`音频断开前未连接：【${audioIn.label}】`)
          }else{
            this.logger.error(`无法断开音频:【${audioIn.label}】${e.name}`, e.message)
          }
        }
      }
    }
    this.mixAudioConf.audioSource.onended = event => {
      this.audioEnd(event)
    }
    this.mixAudioConf.totalTime = options.buffer.duration
    if (this.mixAudioConf.playStartTime < 0 || this.mixAudioConf.playStartTime >= this.mixAudioConf.totalTime) {
      this.mixAudioConf.playStartTime = 0
    }
    this.logger.log('设置音量:', this.mixAudioConf.volume)
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
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'stopAudioMixing: invalid parameter'
        })
      )
    }
    this.logger.log('开始停止混音, isFinished: ', isFinished)
    this.mixAudioConf.audioSource.onended = null
    this.mixAudioConf.audioSource.disconnect(0)
    this.mixAudioConf.gainFilter.disconnect(0)
    this.mixAudioConf.audioSource.stop()
    this.mixAudioConf.state = AuidoMixingState.STOPED
    if (isFinished) {
      this.resetMixConf()
    }
    this.logger.log('混音已停止')
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
      throw new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'createAudioBufferSource: invalid parameter'
      })
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
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'initMonitor: invalid parameter'
        })
      )
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
    this.logger.log('startAudioEffectMix: ', JSON.stringify(options))
    gainNode.connect(this.gainFilter)
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
      return Promise.reject(
        new RtcError({
          code: ErrorCode.INVALID_PARAMETER,
          message: 'stopAudioEffectMix: invalid parameter'
        })
      )
    }
    this.logger.log('stopAudioEffectMix: ', JSON.stringify(options))
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
    this.logger.log('AudioContext 清除')
    this.instant = 0.0
    this.slow = 0.0
    this.clip = 0.0

    // this.microphone && this.microphone.disconnect(0)
    this.gainFilter && this.gainFilter.disconnect(0)
    this.script && this.script.disconnect(0)

    for (let i = 0; i < this.audioInArr.length; i++) {
      this.audioInArr[i] && this.audioInArr[i].disconnect()
    }
    this.audioInArr = []
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
