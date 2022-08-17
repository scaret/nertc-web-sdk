function getMediaSecionIdx(localSdpObject: any, appData: any, _pc: any) {
  //寻找 mediaSectionIdx
  let mediaSectionIdx = -1
  for (let i = 0; i < localSdpObject.media.length; i++) {
    if (appData.mediaType === 'audio') {
      if (localSdpObject.media[i].type === 'audio') {
        mediaSectionIdx = i
        break
      }
    } else if (appData.mediaType === 'video') {
      if (localSdpObject.media[i].type === 'video') {
        if (
          !_pc.screenSender ||
          !_pc.screenSender.offerMediaObject ||
          _pc.screenSender.offerMediaObject.msid !== localSdpObject.media[i].msId
        ) {
          mediaSectionIdx = i
          break
        }
      }
      if (localSdpObject.media[i].type === 'screenShare') {
        if (
          !_pc.videoSender ||
          !_pc.videoSender.offerMediaObject ||
          _pc.videoSender.offerMediaObject.msid !== localSdpObject.media[i].msId
        ) {
          mediaSectionIdx = i
          break
        }
      }
    }
  }

  if (mediaSectionIdx === -1) {
    mediaSectionIdx = localSdpObject.media.length - 1
  }
  return mediaSectionIdx
}

export { getMediaSecionIdx }
