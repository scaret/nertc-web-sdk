export interface NeRTCPeerConnection extends RTCPeerConnection{
  audioSender?: RTCRtpSender;
  videoSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
  videoSenderLow?: RTCRtpSender;
  screenSenderLow?: RTCRtpSender;
}