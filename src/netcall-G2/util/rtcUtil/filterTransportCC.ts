import { RtpParameters } from '../../module/3rd/mediasoup-client/RtpParameters'
import type { SessionDescription } from 'sdp-transform'

export function filterTransportCCFromRtpParameters(rtpParametersSend: RtpParameters) {
  if (rtpParametersSend.headerExtensions) {
    for (let i = rtpParametersSend.headerExtensions.length - 1; i >= 0; i--) {
      if (rtpParametersSend.headerExtensions[i].uri.indexOf('transport-wide-cc') > -1) {
        rtpParametersSend.headerExtensions.splice(i, 1)
      }
    }
  }
  for (let i = rtpParametersSend.codecs.length - 1; i >= 0; i--) {
    const codec = rtpParametersSend.codecs[i]
    if (codec.rtcpFeedback) {
      for (let j = codec.rtcpFeedback.length - 1; j >= 0; j--) {
        if (codec.rtcpFeedback[j].type === 'transport-cc') {
          codec.rtcpFeedback.splice(j, 1)
        }
      }
    }
  }
}

export function filterTransportCCFromSdp(sdpObj: SessionDescription) {
  for (let mid in sdpObj.media) {
    const media = sdpObj.media[mid]
    if (media.ext) {
      for (let extId = media.ext.length - 1; extId >= 0; extId--) {
        if (media.ext[extId].uri.indexOf('transport-wide-cc') > -1) {
          media.ext.splice(extId, 1)
        }
      }
    }
    if (media.rtcpFb) {
      for (let i = media.rtcpFb.length - 1; i >= 0; i--) {
        if (media.rtcpFb[i].type === 'transport-cc') {
          media.rtcpFb.splice(i, 1)
        }
      }
    }
  }
}
