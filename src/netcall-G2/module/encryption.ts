import { EventEmitter } from 'eventemitter3'
import md5 from "md5"
import {
  sm4_crypt_ecb,
  sm4_setkey_enc,
  sm4_setkey_dec,
  SM4Ctx,
} from "sm4-128-ecb";
import {AdapterRef, MediaTypeShort} from "../types";
import RtcError from '../util/error/rtcError';
import ErrorCode  from '../util/error/errorCode';
import {ReceiverInfo, SenderInfo} from "./3rd/mediasoup-client/Transport";

// "encoded-transform-sm4-128-ecb"是一个测试模式，不向外暴露
type EncryptionMode = "none"|"sm4-128-ecb"|"encoded-transform-sm4-128-ecb";

const EncryptionModes = {
  // "encoded-transform-sm4-128-ecb": -2,
  "none": -1,
  'sm4-128-ecb': 0,
  // 'sm2-128-ecb': 1, 暂时不支持
}

function encryptionModeToInt(encryptionMode: string) {
  if (encryptionMode === "none" || encryptionMode === "sm4-128-ecb") {
    return EncryptionModes[encryptionMode];
  } else {
    return undefined;
  }
}

interface RTCEncodedAudioFrame{
  timestamp: number;
  data: ArrayBuffer;
}

interface RTCEncodedVideoFrame{
  type: string;
  timestamp: number;
  data: ArrayBuffer;
}

interface TransformStreamDefaultController{
  enqueue: (arg:any)=>any;
  error: (err:any)=>any;
  terminate: (arg:any)=>any;
}

class Encryption extends EventEmitter {
  public encryptionMode: EncryptionMode;
  public encryptionSecret: string;
  public encodedInsertableStreams: boolean;
  public encCtx: SM4Ctx;
  public decCtx: SM4Ctx;
  public adapterRef: AdapterRef;
  constructor(adapterRef: AdapterRef) {
    super();
    this.encryptionMode = 'none';
    this.encryptionSecret = '';
    this.encodedInsertableStreams = false;
    this.adapterRef = adapterRef;
    this.encCtx = new SM4Ctx();
    this.decCtx = new SM4Ctx();
  }
  setEncryptionMode(encryptionMode: EncryptionMode){
    this.encryptionMode = encryptionMode;
    if (encryptionMode === "encoded-transform-sm4-128-ecb"){
      this.encodedInsertableStreams = true;
    }else{
      this.encodedInsertableStreams = false;
    }
  }
  setEncryptionSecret(encryptionSecret: string){
    this.encryptionSecret =  md5(encryptionSecret);
    if (this.encryptionMode === "encoded-transform-sm4-128-ecb"){
      this.initSm4();
    }
  }
  handleUpstreamTransform(senderInfo: SenderInfo, encodedFrame:RTCEncodedVideoFrame|RTCEncodedAudioFrame, controller:TransformStreamDefaultController){
    senderInfo.index++
    if (senderInfo.index === 1){
      this.adapterRef.logger.log("生成第一帧上行自定义加密（明文）。长度:", encodedFrame.data.byteLength, senderInfo.mediaType, senderInfo.streamType);
    }
    this.adapterRef.instance.safeEmit('sender-transform', {
      uid: this.adapterRef.channelInfo.uid,
      mediaType: senderInfo.mediaType,
      streamType: senderInfo.streamType,
      encodedFrame,
      controller,
    })
  }
  handleDownstreamTransform(receiverInfo: ReceiverInfo, encodedFrame:RTCEncodedVideoFrame, controller:TransformStreamDefaultController){
    receiverInfo.index++
    if (receiverInfo.index === 1){
      this.adapterRef.logger.log("收到第一帧下行自定义加密（密文）。长度:", encodedFrame.data.byteLength, receiverInfo.uid, receiverInfo.mediaType);
    }
    this.adapterRef.instance.safeEmit('receiver-transform', {
      uid: receiverInfo.uid,
      mediaType: receiverInfo.mediaType,
      encodedFrame,
      controller,
    })
  }
  
  initSm4(){
    if (this.encryptionSecret){
      const textEncoder = new TextEncoder();
      const sk = textEncoder.encode(this.encryptionSecret);
      sm4_setkey_enc(this.encCtx, sk);
      sm4_setkey_dec(this.decCtx, sk);
    }else{
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'No encryptionSecret'
      })
    }
  }
  findCryptIndexH264(data:Uint8Array){
    for (let i = 3; i < data.length; i++){
      if (data[i] === 0x61|| data[i] === 0x65 && data[i - 1] === 0x01 && data[i - 2] === 0x00 && data[i - 3] === 0x00){
        // 低四位为1为p帧，低四位为5为i帧。算法待改进
        return i+1;
      }
    }
    return -1;
  }
  encodeFunctionH264(encodedFrame:RTCEncodedVideoFrame, controller:TransformStreamDefaultController){
    const u8Arr1 = new Uint8Array(encodedFrame.data);
    const shiftStart = this.findCryptIndexH264(u8Arr1);
    if (shiftStart > 0){
      const encrypted = sm4_crypt_ecb(this.encCtx, u8Arr1.subarray(shiftStart), {shiftStart: shiftStart});
      for (let i = 0; i < shiftStart; i++){
        encrypted[i] = u8Arr1[i];
      }
      encodedFrame.data = encrypted.buffer;
    }
    controller.enqueue(encodedFrame);
  }
  decodeFunctionH264(encodedFrame:RTCEncodedVideoFrame, controller:TransformStreamDefaultController){
    const u8Arr1 = new Uint8Array(encodedFrame.data);
    const shiftStart = this.findCryptIndexH264(u8Arr1);
    if (shiftStart > 0){
      if ((u8Arr1.buffer.byteLength - shiftStart) % 16 !== 0){
        this.adapterRef.logger.warn("解密前的包无法被16整除", shiftStart, u8Arr1);
        controller.enqueue(encodedFrame);
        return;
      }
      const encrypted = sm4_crypt_ecb(this.decCtx, u8Arr1, {shiftStart: shiftStart});
      const u8Arr2 = new Uint8Array(shiftStart + encrypted.length);
      for (let i = 0; i < u8Arr2.length; i++){
        if (i < shiftStart){
          u8Arr2[i] = u8Arr1[i];
        }else{
          u8Arr2[i] = encrypted[i - shiftStart];
        }
      }
      encodedFrame.data = u8Arr2.buffer;
    }
    controller.enqueue(encodedFrame);
  }
}

export interface EncodedStreams {
  readable: ReadableStream;
  writable: WritableStream;
}

export {

  Encryption,

  EncryptionMode,

  EncryptionModes,

  encryptionModeToInt,
}
