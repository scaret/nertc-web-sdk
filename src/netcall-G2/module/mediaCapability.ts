import {
  SignalRoomCapability,
  VideoCodecInt2Str,
  VideoCodecStr2Int
} from '../interfaces/SignalProtocols'
import { AdapterRef, ILogger, VideoCodecType } from '../types'
import { getSupportedCodecs, VideoCodecList } from '../util/rtcUtil/codec'
import { getParameters } from './parameters'

export class MediaCapability {
  // 表示本地支持的解码类型
  public supportedCodecRecv: VideoCodecType[] | null
  // 表示本地支持的编码类型
  public supportedCodecSend: VideoCodecType[] | null

  // 表示用户想用的编码类型
  public preferredCodecSend: {
    video: VideoCodecType[]
    screen: VideoCodecType[]
  }
  public room: {
    // 表示房间内支持的编码类型
    videoCodecType: VideoCodecType[]
  }
  private logger: ILogger

  constructor(adapterRef: AdapterRef) {
    this.logger = adapterRef.logger.getChild(() => {
      let tag = `codec${this.room.videoCodecType.join(',')}`
      if (
        !this.supportedCodecSend ||
        this.supportedCodecSend.length !== 2 ||
        !this.supportedCodecRecv ||
        this.supportedCodecRecv.length !== 2
      ) {
        tag += `/${this.supportedCodecSend}/${this.supportedCodecRecv}`
      }
      if (adapterRef.mediaCapability !== this) {
        tag += ' DETACHED'
      }
      return tag
    })
    this.supportedCodecRecv = null
    this.supportedCodecSend = null
    this.preferredCodecSend = {
      video: ['H264', 'VP8'],
      screen: ['H264', 'VP8']
    }
    this.room = {
      videoCodecType: []
    }
  }

  async detect() {
    const start = Date.now()
    let supportedCodecsRecv = (await getSupportedCodecs('recv')) || { video: [], audio: ['OPUS'] }
    let supportedCodecsSend = (await getSupportedCodecs('send')) || { video: [], audio: ['OPUS'] }
    if (getParameters().h264Wait) {
      if (supportedCodecsRecv.video.indexOf('H264') === -1) {
        this.logger.warn(
          `当前浏览器不支持H264解码。这可能会触发频道内编码协商。最多等待 ${
            getParameters().h264Wait
          } 毫秒以避免编码器尚未加载。`
        )
        while (Date.now() - start < getParameters().h264Wait) {
          supportedCodecsRecv = (await getSupportedCodecs('recv')) || { video: [], audio: ['OPUS'] }
          if (supportedCodecsRecv.video.indexOf('H264') === -1) {
            // 停顿100毫秒后继续
            await new Promise((resolve) => {
              setTimeout(resolve, 100)
            })
          } else {
            this.logger.log(`H264解码器加载完成！用时 ${Date.now() - start} 毫秒`)
            break
          }
        }
      }
      if (supportedCodecsRecv.video.indexOf('H264') === -1) {
        this.logger.warn(`H264解码器加载失败！`)
      }
    }
    this.supportedCodecRecv = supportedCodecsRecv.video
    this.supportedCodecSend = supportedCodecsSend.video
    if (getParameters().disableH264Send) {
      let index = this.supportedCodecSend.indexOf('H264')
      if (index !== -1) {
        this.logger.log(`根据私有化参数设置，忽略H264发送支持`)
        this.supportedCodecSend.splice(index, 1)
      }
    }
    if (getParameters().disableVP8Send) {
      let index = this.supportedCodecSend.indexOf('VP8')
      if (index !== -1) {
        this.logger.log(`根据私有化参数设置，忽略VP8发送支持`)
        this.supportedCodecSend.splice(index, 1)
      }
    }
    this.logger.log(
      'detect supportedCodecRecv',
      JSON.stringify(this.supportedCodecRecv),
      'supportedCodecSend',
      JSON.stringify(this.supportedCodecSend),
      'Preferred codec:',
      JSON.stringify(this.preferredCodecSend)
    )
  }

  getCodecCapability() {
    //策略：取发送与接收的编码交集
    if (this.supportedCodecRecv && this.supportedCodecSend) {
      const supportedCodec: VideoCodecType[] = []
      for (let codec of VideoCodecList) {
        if (
          this.supportedCodecRecv.indexOf(codec) > -1 &&
          this.supportedCodecSend.indexOf(codec) > -1
        ) {
          supportedCodec.push(codec)
        }
      }
      return supportedCodec
    } else {
      this.logger.error('getCodecCapability: call detect first')
      return []
    }
  }

  stringify() {
    let mediaCapabilitySet: any = {}
    mediaCapabilitySet[256] = []
    for (let codec of this.getCodecCapability()) {
      if (VideoCodecStr2Int[codec] > -1) {
        mediaCapabilitySet[256].push(VideoCodecStr2Int[codec])
      } else {
        this.logger.error('MediaCapability:Unknown VideoCodecStr2Int', codec)
      }
    }
    if (mediaCapabilitySet[256].length === 0) {
      this.logger.warn('MediaCapability:No Local Suitable codec available')
    }
    const str = JSON.stringify(mediaCapabilitySet)
    return str
  }

  // 根据codec先后列表，排除本身不支持的codec和房间不支持的codec，顺序查找应该使用的codec
  getCodecSend(mediaTypeShort: 'video' | 'screen', codecsFromRtpCapability: any) {
    let roomSupported: { codecParam?: any; codecName?: VideoCodecType | null } = { codecName: null }
    let roomNotSupported: { codecParam?: any; codecName?: VideoCodecType | null } = {
      codecName: null
    }
    for (let i = 0; i < this.preferredCodecSend[mediaTypeShort].length; i++) {
      // 在备选codec中寻找
      const candidateCodec = this.preferredCodecSend[mediaTypeShort][i]
      if (!codecsFromRtpCapability.codecs && codecsFromRtpCapability.codecs.length) {
        continue
      }
      for (let j = 0; j < codecsFromRtpCapability.codecs.length; j++) {
        const codec = codecsFromRtpCapability.codecs[j]
        if (getParameters().disableH264Send && codec.mimeType?.toLowerCase().indexOf('h264') > -1) {
          continue
        }
        if (getParameters().disableVP8Send && codec.mimeType?.toLowerCase().indexOf('vp8') > -1) {
          continue
        }
        if (
          codec.mimeType &&
          codec.mimeType.toLowerCase().indexOf(candidateCodec.toLowerCase()) > -1
        ) {
          if (this.room.videoCodecType.indexOf(candidateCodec) > -1) {
            if (!roomSupported.codecName) {
              roomSupported = {
                codecParam: codec,
                codecName: candidateCodec
              }
            }
          } else {
            if (!roomNotSupported.codecName) {
              roomNotSupported = {
                codecParam: codec,
                codecName: candidateCodec
              }
            }
          }
        }
      }
    }
    if (roomSupported.codecName) {
      this.logger.log(
        'MediaCapability：发送的Codec为:',
        roomSupported.codecName,
        JSON.stringify(roomSupported.codecParam)
      )
      return roomSupported
    } else {
      this.logger.warn(
        'MediaCapability：未找到合适的发送Codec。发送的Codec使用:',
        roomNotSupported.codecName,
        roomNotSupported.codecParam
      )
      return roomNotSupported
    }
  }

  parseRoom(signalRoomCapability: SignalRoomCapability) {
    if (!signalRoomCapability.mediaCapabilitySet) {
      return
    }
    const rawData = JSON.parse(signalRoomCapability.mediaCapabilitySet)
    if (rawData[256]) {
      const prevVideoCodecType = this.room.videoCodecType
      this.room.videoCodecType = []
      for (const num of rawData[256]) {
        // @ts-ignore
        let codecType = VideoCodecInt2Str[num] as VideoCodecs
        if (codecType) {
          this.room.videoCodecType.push(codecType)
        } else {
          this.logger.error('Unknown Video Codec Type', num, signalRoomCapability)
        }
      }
      if (!prevVideoCodecType.length) {
        this.logger.log('Room videoCodecType:', JSON.stringify(this.room.videoCodecType))
      } else {
        this.logger.log(
          'Room videoCodecType发生变更。new:',
          this.room.videoCodecType,
          'old:',
          prevVideoCodecType
        )
      }
    }
  }
}
