import {SignalRoomCapability, VideoCodecInt2Str, VideoCodecStr2Int} from "../interfaces/SignalProtocols";
import {AdapterRef, VideoCodecType} from "../types";
import {getSupportedCodecs, VideoCodecList} from "../util/rtcUtil/codec";

export class MediaCapability{
  public adapterRef: AdapterRef;

  // 表示本地支持的解码类型
  public supportedCodecRecv: VideoCodecType[] | null;
  // 表示本地支持的编码类型
  public supportedCodecSend: VideoCodecType[] | null;

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
    this.supportedCodecSend = null;
    this.preferredCodecSend = {
      video: ["H264", "VP8"],
      screen: ["H264", "VP8"]
    };
    this.room = {
      videoCodecType: []
    };
  }
  
  async detect(){
    let supportedCodecsRecv = await getSupportedCodecs("recv") || {video: [], audio: ["OPUS"]};
    let supportedCodecsSend = await getSupportedCodecs("send") || {video: [], audio: ["OPUS"]};
    this.supportedCodecRecv = supportedCodecsRecv.video;
    this.supportedCodecSend = supportedCodecsSend.video;
    this.adapterRef.logger.log("detect supportedCodecRecv", this.supportedCodecRecv , "supportedCodecSend", this.supportedCodecSend, 'Preferred codec:', this.preferredCodecSend);
  }
  
  getCodecCapability(){
    //策略：取发送与接收的编码交集
    if (this.supportedCodecRecv && this.supportedCodecSend){
      const supportedCodec:VideoCodecType[] = [];
      for (let codec of VideoCodecList){
        if (this.supportedCodecRecv.indexOf(codec) > -1 && this.supportedCodecSend.indexOf(codec) > -1){
          supportedCodec.push(codec);
        }
      }
      return supportedCodec;
    }else{
      this.adapterRef.logger.error('getCodecCapability: call detect first');
      return [];
    }
  }
  
  stringify(){
    let mediaCapabilitySet:any = {};
    mediaCapabilitySet[256] = [];
    for (let codec of this.getCodecCapability()){
      if (VideoCodecStr2Int[codec] > -1){
        mediaCapabilitySet[256].push(VideoCodecStr2Int[codec])
      }else{
        this.adapterRef.logger.error('MediaCapability:Unknown VideoCodecStr2Int', codec);
      }
    }
    if (mediaCapabilitySet[256].length === 0){
      this.adapterRef.logger.error('MediaCapability:No Local Suitable codec available');
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
