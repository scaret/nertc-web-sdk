import {AudioCodecType, VideoCodecType} from "../../types";

// 表示所有已知的编码类型
export const VideoCodecList: VideoCodecType[] = ["H264", "VP8"];

function getSupportedCodecFromSDP(sdp: string): { video: VideoCodecType[], audio: AudioCodecType[] } {
  const result: { video: VideoCodecType[], audio: AudioCodecType[] } = { video: [], audio: [] };
  if (sdp.match(/ H264/i)) {
      result.video.push("H264");
  }
  if (sdp.match(/ VP8/i)) {
    result.video.push("VP8");
  }
  if (sdp.match(/ opus/i)) {
    result.audio.push("OPUS");
  }
  return result;
}

function getSupportedCodecFromCapability(videoCapabilities: RTCRtpCapabilities|null, audioCapabilities?:RTCRtpCapabilities|null): { video: VideoCodecType[], audio: AudioCodecType[] } {
  const result: { video: VideoCodecType[], audio: AudioCodecType[] } = { video: [], audio: [] };
  if(videoCapabilities){
    for (let i in videoCapabilities.codecs){
      const codecCapability = videoCapabilities.codecs[i];
      if (codecCapability.mimeType == "video/H264" && result.video.indexOf("H264") === -1){
        if (codecCapability.sdpFmtpLine && codecCapability.sdpFmtpLine.indexOf("profile-level-id") > -1){
          if (codecCapability.sdpFmtpLine.indexOf("profile-level-id=64") > -1){
            // High Profile
            result.video.push("H264");
          }
        }else if (result.video.indexOf("H264") === -1){
          result.video.push("H264");
        }
      }
      if (codecCapability.mimeType == "video/VP8" && result.video.indexOf("VP8") === -1){
        result.video.push("VP8");
      }
    }
  }
  if(audioCapabilities){
    for (let i in audioCapabilities.codecs){
      const codecCapability = audioCapabilities.codecs[i];
      if (codecCapability.mimeType == "audio/opus"){
        result.audio.push("OPUS");
      }
    }
  }
  return result;
}

async function getSupportedCodec(direction:"send"|"recv" =  "recv", PeerConnection = RTCPeerConnection){
  if (direction === "recv"){
    if (typeof RTCRtpReceiver !== "undefined" && RTCRtpReceiver.getCapabilities){
      const videoCapabilties = RTCRtpReceiver.getCapabilities("video");
      const audioCapabilties = RTCRtpReceiver.getCapabilities("audio");
      const result = getSupportedCodecFromCapability(videoCapabilties, audioCapabilties);
      return result;
    }else{
      const pc = new PeerConnection({});
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });
      const offer = await pc.createOffer({});
      pc.close()
      if (!offer.sdp) {
        throw new Error("offer sdp is empty");
      }
      const result = getSupportedCodecFromSDP(offer.sdp);
      return result;
    }
  }
  else{
    if (typeof RTCRtpSender !== "undefined" && RTCRtpSender.getCapabilities){
      const videoCapabilties = RTCRtpSender.getCapabilities("video");
      const audioCapabilties = RTCRtpSender.getCapabilities("audio");
      const result = getSupportedCodecFromCapability(videoCapabilties, audioCapabilties);
      return result;
    }else{
      throw new Error(`direction ${direction} Not supported yet`);
    }
  }
}

function reduceCodecs(codecs: any[], selectedCodec:RTCRtpCodecCapability) {
  const filteredCodecs = [];
  for (let i = 0; i < codecs.length; i++){
    if (codecs[i].mimeType && selectedCodec){
      if (VideoCodecList.indexOf(codecs[i].mimeType.split('/')[1]) > -1){
        if (codecs[i].mimeType !== selectedCodec.mimeType){
          i++;
          continue;
        }else{
        }
      }
    }
    filteredCodecs.push(codecs[i]);
  }
  return filteredCodecs;
}

export {
  
  getSupportedCodec,

  reduceCodecs,
  
}
