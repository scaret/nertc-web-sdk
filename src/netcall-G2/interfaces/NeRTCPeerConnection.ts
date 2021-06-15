export interface NeRTCPeerConnection extends RTCPeerConnection{
  videoSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
}