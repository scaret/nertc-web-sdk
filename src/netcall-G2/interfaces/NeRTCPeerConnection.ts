export interface NeRTCPeerConnection extends RTCPeerConnection{
  videoSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
  videoSenderLow?: RTCRtpSender;
  screenSenderLow?: RTCRtpSender;
}