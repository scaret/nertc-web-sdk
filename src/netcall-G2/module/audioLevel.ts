/**
 * 音频的音量计算模块
 */
import { EventEmitter } from 'eventemitter3'
import {
  AudioLevelOptions, ILogger,
} from '../types'
import {getBlobUrl} from "./blobs/getBlobUrl";
import {getAudioContext} from "./webAudio";

let AudioWorkletState:"NOTREADY"|"LOADING"|"READY" = "NOTREADY"
let AudioWorkletReady:Promise<void>|null = null

interface ChannelVolume{
  volume: number;
  history: {
    sec: number,
    sum: number
  }[];
}

class AudioLevel extends EventEmitter{
  
  private volume: number = 0;
  // 没有左右声道就是null
  public left: ChannelVolume|null = null;
  public right: ChannelVolume|null = null;
  public channelState: "mono"|"leftLoud"|"rightLoud"|"balance" = "balance"
  private stateChangeCnt = 0;
  
  private support: {
    stream: MediaStream,
    context: AudioContext,
    sourceNode?: AudioNode,
    audioWorkletNode?: AudioWorkletNode,
  }|null = null
  logger: ILogger;
  
  constructor(options: AudioLevelOptions) {
    super()
    this.logger = options.logger.getChild(()=>{
      let tag = `AudioLevel`
      if (AudioWorkletState !== 'READY'){
        tag += " " + AudioWorkletState
      }else {
        tag += " " + this.channelState
      }
      if (this.stateChangeCnt){
        tag += " change" + this.stateChangeCnt
      }
      return tag
    })
    const context = getAudioContext()
    const stream = options.stream
    if (context){
      this.support = {
        stream,
        context,
      }
      this.updateStream(stream, options.sourceNode)
    }
  }

  async updateStream(audioStream: MediaStream, sourceNode?: AudioNode) {
    this.logger.log('AudioLevel updateStream')
    if (this.support){
      
      // 1. 创建/更新 sourceNode
      if (!sourceNode){
        try{
          sourceNode = this.support.context.createMediaStreamSource(audioStream);
        }catch(e){
          if (e.name === "TypeError"){
            sourceNode = new MediaStreamAudioSourceNode(this.support.context, {mediaStream: audioStream});
          }else{
            this.logger.error(`无法创建MediaStreamAudioSourceNode`, e.name, e.message)
            return
          }
        }
      }
      if (this.support.sourceNode){
        this.support.sourceNode.disconnect()
      }
      this.support.sourceNode = sourceNode

      // 2.创建 WorkletNode
      if (!this.support.audioWorkletNode){
        if (!AudioWorkletReady){
          AudioWorkletState = "LOADING"
          this.logger.log(`正在载入音量模块`)
          AudioWorkletReady = this.support.context.audioWorklet.addModule(getBlobUrl('volumeProcessor'))
          await AudioWorkletReady
          AudioWorkletState = "READY"
          this.logger.log(`载入音量模块成功`)
        } else if (AudioWorkletState === "LOADING"){
          await AudioWorkletReady
        }
        this.support.audioWorkletNode = new AudioWorkletNode(this.support.context, 'vumeter')

        const handleTypeVolume = (event: MessageEvent)=>{
          const ts = Date.now()
          const sec = Math.floor(ts)
          
          this.volume = event.data.volume
          
          //左声道
          if (event.data.left > -1) {
            if (!this.left){
              this.left = {
                volume: 0,
                history: []
              }
            }
            //按秒记录历史音量总和，仅记录2秒
            if (!this.left.history.length || this.left.history[0].sec !== sec){
              this.left.history.unshift({
                sec,
                sum: 0
              })
            }
            this.left.volume = event.data.left
            this.left.history[0].sum += event.data.left
            if (this.left.history.length > 2){
              this.left.history.pop()
            }
          }else{
            const prevState = this.channelState
            this.channelState = "mono"
            if (prevState !== this.channelState){
              this.stateChangeCnt++
              if (this.stateChangeCnt < 20){
                this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
              }
              this.emit("channel-state-change", {
                state: this.channelState,
                prev: prevState
              })
            }
          }

          // 右声道
          if (event.data.right > -1) {
            if (!this.right){
              this.right = {
                volume: 0,
                history: []
              }
            }
            //按秒记录历史音量总和，仅记录2秒
            if (!this.right.history.length || this.right.history[0].sec !== sec){
              this.right.history.unshift({
                sec,
                sum: 0
              })
            }
            this.right.volume = event.data.right
            this.right.history[0].sum += event.data.right
            if (this.right.history.length > 2){
              this.right.history.pop()
            }
          }

          if (this.left?.history[1] && this.right?.history[1]){
            if (this.left.history[1].sum > 4 * this.right.history[1].sum){
              const prevState = this.channelState
              this.channelState = "leftLoud"
              if (prevState !== this.channelState){
                this.stateChangeCnt++
                if (this.stateChangeCnt < 20){
                  this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
                }
                this.emit("channel-state-change", {
                  state: this.channelState,
                  prev: prevState
                })
              }
            }else if (this.right.history[1].sum > 4 * this.left.history[1].sum){
              const prevState = this.channelState
              this.channelState = "rightLoud"
              if (prevState !== this.channelState){
                this.stateChangeCnt++
                if (this.stateChangeCnt < 20){
                  this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
                }
                this.emit("channel-state-change", {
                  state: this.channelState,
                  prev: prevState
                })
              }
            }else{
              if (this.left.history[1].sum > this.right.history[1].sum && this.channelState !== "leftLoud"){
                const prevState = this.channelState
                this.channelState = "balance"
                if (prevState !== this.channelState){
                  this.stateChangeCnt++
                  if (this.stateChangeCnt < 20){
                    this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
                  }
                  this.emit("channel-state-change", {
                    state: this.channelState,
                    prev: prevState
                  })
                }
              }
              if (this.right.history[1].sum > this.left.history[1].sum && this.channelState !== "rightLoud"){
                const prevState = this.channelState
                this.channelState = "balance"
                if (prevState !== this.channelState){
                  this.stateChangeCnt++
                  if (this.stateChangeCnt < 20){
                    this.logger.log(`声道状态变更 ${prevState} => ${this.channelState}`)
                  }
                  this.emit("channel-state-change", {
                    state: this.channelState,
                    prev: prevState
                  })
                }
              }
            }
          }
        }
        
        const handleTypeRawInputs = (event: MessageEvent)=>{
          console.error("handleTypeRawInputs", event.data.inputs)
        }

        this.support.audioWorkletNode.port.onmessage = function (event){
          if (event.data.type === 'volume'){
            handleTypeVolume(event)
          }else if (event.data.type === 'rawinputs'){
            handleTypeRawInputs(event)
          }else {
            console.error('Unknown message', event)
          }
        }
      }
      
      // 3.连接 sourceNode 和 audioWorkletNode
      this.support.sourceNode.connect(this.support.audioWorkletNode)
    }
  }

  getAudioLevel () {
    return this.volume
  }

  destroy() {
    this.logger.log('destroy() AudioLevel模块')
  }
}

export {
  AudioLevel
}
