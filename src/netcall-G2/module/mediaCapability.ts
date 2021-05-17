import {SignalRoomCapability, VideoCodecInt2Str, VideoCodecStr2Int} from "../interfaces/SignalProtocols";
import {AdapterRef, VideoCodecType} from "../types";
import {getSupportedCodecs} from "../util/rtcUtil/codec";

export class MediaCapability{
  public adapterRef: AdapterRef;

  // 表示本地支持的解码类型
  public supportedCodecRecv: VideoCodecType[] | null;
  // 表示用户想用的编码类型
  public preferredCodecSend: {
    video: VideoCodecType[],
    screen: VideoCodecType[],
  };
  public room: {
    // 表示房间内支持的编码类型
    videoCodecType: VideoCodecType[];
  }
  
  constructor(adapterRef: AdapterRef) {
    this.adapterRef = adapterRef;
    this.supportedCodecRecv = null;
    this.preferredCodecSend = {
      video: ["H264", "VP8"],
      screen: ["H264", "VP8"]
    };
    this.room = {
      videoCodecType: []
    };
  }
  
  async detect(){
    const supportedCodecs = await getSupportedCodecs("recv");
    if (!supportedCodecs){
      throw new Error('Failed to detect codec');
    }
    this.supportedCodecRecv = supportedCodecs.video;
  }
  
  stringify(){
    let mediaCapabilitySet:any = {};
    if (this.supportedCodecRecv){
      mediaCapabilitySet[256] = [];
      for (let codec of this.supportedCodecRecv){
        if (VideoCodecStr2Int[codec] > -1){
          mediaCapabilitySet[256].push(VideoCodecStr2Int[codec])
        }
      }
      if (mediaCapabilitySet[256].length === 0){
        this.adapterRef.logger.error('No Local Suitable codec available. Supported:', this.supportedCodecRecv, 'Preferred:', this.preferredCodecSend);
      }else{
        this.adapterRef.logger.log('Local Supported codec:', this.supportedCodecRecv, 'Preferred codec:', this.preferredCodecSend);
      }
    }
    const str = JSON.stringify(mediaCapabilitySet);
    return str;
  }
  
  // 根据codec先后列表，排除本身不支持的codec和房间不支持的codec，顺序查找应该使用的codec
  getCodecSend(mediaTypeShort: "video"|"screen", codecsFromRtpCapability: any){
    let roomSupported:{codecParam?: any, codecName?: VideoCodecType|null} = {codecName: null};
    let roomNotSupported:{codecParam?: any, codecName?: VideoCodecType|null} = {codecName: null};
    for (var i = 0; i < this.preferredCodecSend[mediaTypeShort].length; i++){
      // 在备选codec中寻找
      const candidateCodec = this.preferredCodecSend[mediaTypeShort][i];
      for(var j in codecsFromRtpCapability.codecs){
        const codec = codecsFromRtpCapability.codecs[j];
        if(codec.mimeType.toLowerCase().indexOf(candidateCodec.toLowerCase()) > -1){
          if (this.room.videoCodecType.indexOf(candidateCodec) > -1){
            if (!roomSupported.codecName){
              roomSupported = {
                codecParam: codec,
                codecName: candidateCodec
              };
            }
          }else{
            if (!roomNotSupported.codecName){
              roomNotSupported = {
                codecParam: codec,
                codecName: candidateCodec
              }
            }
          }
        }
      }
    }
    if (roomSupported.codecName){
      this.adapterRef.logger.log('MediaCapability：发送的Codec为:', roomSupported.codecName, roomSupported.codecParam);
      return roomSupported;
    }else{
      this.adapterRef.logger.error('MediaCapability：未找到合适的发送Codec。发送的Codec使用:', roomNotSupported.codecName, roomNotSupported.codecParam);
      return roomNotSupported;
    }
  }
  
  parseRoom(signalRoomCapability: SignalRoomCapability) {
    if (!signalRoomCapability.mediaCapabilitySet){
      return;
    }
    const rawData = JSON.parse(signalRoomCapability.mediaCapabilitySet);
    if (rawData[256]){
      const prevVideoCodecType = this.room.videoCodecType;
      this.room.videoCodecType = [];
      for (const num of rawData[256]){
        // @ts-ignore
        let codecType = VideoCodecInt2Str[num] as VideoCodecs;
        if (codecType){
          this.room.videoCodecType.push(codecType);
        }else{
          this.adapterRef.logger.error('Unknown Video Codec Type', num, signalRoomCapability)
        }
      }
      if (!prevVideoCodecType.length){
        this.adapterRef.logger.log('Room videoCodecType:', this.room.videoCodecType)
      }else{
        this.adapterRef.logger.log('Room videoCodecType发生变更。new:', this.room.videoCodecType, 'old:',prevVideoCodecType);
      }
    }
  }
}
