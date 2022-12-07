import { EventEmitter } from 'eventemitter3'
import md5 from 'md5'

import { AdapterRef } from '../types'
import { ReceiverInfo, SenderInfo } from './3rd/mediasoup-client/Transport'

type EncryptionMode = 'none' | 'sm4-128-ecb'

const EncryptionModes = {
  none: -1,
  'sm4-128-ecb': 0
  // 'sm2-128-ecb': 1, 暂时不支持
}

function encryptionModeToInt(encryptionMode: string) {
  if (encryptionMode === 'none' || encryptionMode === 'sm4-128-ecb') {
    return EncryptionModes[encryptionMode]
  } else {
    return undefined
  }
}

interface RTCEncodedAudioFrame {
  timestamp: number
  data: ArrayBuffer
}

interface RTCEncodedVideoFrame {
  type: string
  timestamp: number
  data: ArrayBuffer
}

interface TransformStreamDefaultController {
  enqueue: (arg: any) => any
  error: (err: any) => any
  terminate: (arg: any) => any
}

class Encryption extends EventEmitter {
  public encryptionMode: EncryptionMode
  public encryptionSecret: string
  public encodedInsertableStreams: boolean
  public adapterRef: AdapterRef
  constructor(adapterRef: AdapterRef) {
    super()
    this.encryptionMode = 'none'
    this.encryptionSecret = ''
    this.encodedInsertableStreams = false
    this.adapterRef = adapterRef
  }
  setEncryptionMode(encryptionMode: EncryptionMode) {
    this.encryptionMode = encryptionMode
  }
  setEncryptionSecret(encryptionSecret: string) {
    this.encryptionSecret = md5(encryptionSecret)
  }
  handleUpstreamTransform(
    senderInfo: SenderInfo,
    encodedFrame: RTCEncodedVideoFrame | RTCEncodedAudioFrame,
    controller: TransformStreamDefaultController
  ) {
    senderInfo.index++
    if (senderInfo.index === 1) {
      this.adapterRef.logger.log(
        '生成第一帧上行自定义加密（明文）。长度:',
        encodedFrame.data.byteLength,
        senderInfo.mediaType,
        senderInfo.streamType
      )
    }
    this.adapterRef.instance.safeEmit('sender-transform', {
      uid: this.adapterRef.channelInfo.uid,
      mediaType: senderInfo.mediaType,
      streamType: senderInfo.streamType,
      encodedFrame,
      controller
    })
  }
  handleDownstreamTransform(
    receiverInfo: ReceiverInfo,
    encodedFrame: RTCEncodedVideoFrame,
    controller: TransformStreamDefaultController
  ) {
    receiverInfo.index++
    if (receiverInfo.index === 1) {
      this.adapterRef.logger.log(
        '收到第一帧下行自定义加密（密文）。长度:',
        encodedFrame.data.byteLength,
        receiverInfo.uid,
        receiverInfo.mediaType
      )
    }
    if (
      encodedFrame.type === 'key' &&
      this.adapterRef.state.videoFirstIframeTime < this.adapterRef.state.signalJoinSuccessTime
    ) {
      this.adapterRef.state.videoFirstIframeTime = Date.now()
    }
    this.adapterRef.instance.safeEmit('receiver-transform', {
      uid: receiverInfo.uid,
      mediaType: receiverInfo.mediaType,
      encodedFrame,
      controller
    })
  }
}

export interface EncodedStreams {
  readable: ReadableStream
  writable: WritableStream
}

export { Encryption, EncryptionMode, EncryptionModes, encryptionModeToInt }
