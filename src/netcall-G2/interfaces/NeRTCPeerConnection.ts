export interface NeRTCPeerConnection extends RTCPeerConnection{
  audioSender?: RTCRtpSender;
  pcid?: number;
  iceStartedAt?: number;
  iceConnectedAt?: number;
  videoSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
  videoSenderLow?: RTCRtpSender;
  screenSenderLow?: RTCRtpSender;
}