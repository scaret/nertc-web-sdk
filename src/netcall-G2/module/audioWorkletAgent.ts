import { EventEmitter } from 'eventemitter3'
import {ILogger} from "../types";
import {getAudioContext} from "./webAudio";
import {getBlobUrl} from "./blobs/getBlobUrl";

let AudioWorkletState:"NOTREADY"|"LOADING"|"READY" = "NOTREADY"
let AudioWorkletReady:Promise<void>|null = null

export interface AudioWorkletAgentOptions{
  logger: ILogger;
  sourceNode: AudioNode;
}

export class AudioWorkletAgent extends EventEmitter{
  logger: ILogger;
  outputCnt = 0;
  inputCnt = 0;
  support: {
    sourceNode: AudioNode,
    destination: MediaStreamAudioDestinationNode,
    context: AudioContext,
    audioWorkletNode?: AudioWorkletNode,
  }
  constructor(options: AudioWorkletAgentOptions) {
    super();
    this.logger = options.logger.getChild(()=>{
      let tag = `AudioWorkletAgent`
      if (AudioWorkletState !== 'READY'){
        tag += " " + AudioWorkletState
      }
      const delay = (this.inputCnt - this.outputCnt) * 10
      tag += " Delay" + delay + "ms"
      return tag
    })

    const context = getAudioContext()!
    let destination:MediaStreamAudioDestinationNode
    try{
      destination = new MediaStreamAudioDestinationNode(context);
    }catch(e){
      if (e.name === "TypeError"){
        destination = context.createMediaStreamDestination();
      }else{
        throw e;
      }
    }
    
    this.support = {
      sourceNode: options.sourceNode,
      context: context,
      destination: destination,
    }
    
    setInterval(()=>{
      this.logger.log(`outputCnt`, this.outputCnt, `inputCnt`, this.inputCnt)
    }, 10000)
  }
  
  async init(){
    if (this.support.audioWorkletNode){
      this.logger.error(`Already Inited`)
    }
    if (!AudioWorkletReady){
      AudioWorkletState = "LOADING"
      this.logger.log(`正在载入 audioWorkletAgentProcessor 模块`)
      AudioWorkletReady = this.support.context.audioWorklet.addModule(getBlobUrl('audioWorkletAgentProcessor'))
      await AudioWorkletReady
      AudioWorkletState = "READY"
      this.logger.log(`载入 audioWorkletAgentProcessor 模块成功`)
    } else if (AudioWorkletState === "LOADING"){
      await AudioWorkletReady
    }
    this.support.audioWorkletNode = new AudioWorkletNode(this.support.context, 'audioWorkletAgentProcessor')
    this.bindProcessorEvents()
    this.support.sourceNode.connect(this.support.audioWorkletNode)
    this.support.audioWorkletNode.connect(this.support.destination)
  }
  
  outputData(data: Float32Array[][]){
    if (!this.support.audioWorkletNode){
      throw new Error(`Destroyed`)
    }
    this.inputCnt++
    this.support.audioWorkletNode.port.postMessage({
      type: 'outputData',
      data: data
    })
  }

  bindProcessorEvents(){
    this.support.audioWorkletNode!.port.onmessage = (event)=>{
      this.emit('processor-message', event)
      if (event.data.type === 'rawinputs'){
        this.handleTypeRawInputs(event)
      }else {
        console.error('Unknown message', event)
      }
    }
  }
  handleTypeRawInputs(event: MessageEvent){
    this.outputCnt++
    this.emit('rawinputs', event.data)
  }
}