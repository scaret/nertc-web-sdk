/**
 * 通过构建本地PeerConnection来复制一个track
 */
export function pcCloneTrack(track: MediaStreamTrack){
  const pcLocal = new RTCPeerConnection()
  const pcRemote = new RTCPeerConnection()
  // @ts-ignore
  window.pcLocal = pcLocal
  // @ts-ignore
  window.pcRemote = pcRemote
  pcLocal.onicecandidate = (evt)=>{
    if (evt.candidate){
      pcRemote.addIceCandidate(evt.candidate)
    }
  }
  pcLocal.onnegotiationneeded = async (evt)=>{
    const offer = await pcLocal.createOffer()
    await pcLocal.setLocalDescription(offer)
    await pcRemote.setRemoteDescription(offer)
    const answer = await pcRemote.createAnswer()
    await pcRemote.setLocalDescription(answer)
    await pcLocal.setRemoteDescription(answer)
  }
  const transceiverRecv:RTCRtpTransceiver = pcLocal.addTransceiver("video", {direction: "recvonly"})
  pcRemote.addTrack(track)
  track.addEventListener('neTrackEnded', ()=>{
    pcRemote.close()
    transceiverRecv.receiver.track.stop()
  })
  return transceiverRecv.receiver.track
}