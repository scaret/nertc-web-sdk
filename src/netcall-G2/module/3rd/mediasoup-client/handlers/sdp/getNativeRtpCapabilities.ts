import { RtpCapabilities } from '../../RtpParameters'
import * as sdpTransform from 'sdp-transform'
import * as sdpCommonUtils from './commonUtils'
import { addNackSuppportForOpus } from '../ortc/edgeUtils'

interface RTCEnvInfo {
  nativeRtpCapabilities: RtpCapabilities
  isIOS: boolean
}

let rtcEnvInfo: RTCEnvInfo | null = null

export async function detectRtcCapabilities(): Promise<RTCEnvInfo> {
  const pc = new (RTCPeerConnection as any)({
    iceServers: [],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    sdpSemantics: 'unified-plan'
  })

  try {
    pc.addTransceiver('audio')
    pc.addTransceiver('video')

    const offer = await pc.createOffer()
    // Remove the dependency of the nack line in sdp on transport-cc
    if (offer?.sdp.indexOf('a=rtcp-fb:111') && offer.sdp.indexOf('a=rtcp-fb:111 nack') === -1) {
      offer.sdp = offer.sdp.replace(/(a=rtcp-fb:111.*)/, '$1\r\na=rtcp-fb:111 nack')
    }
    let isIOS = false
    try {
      await pc.getStats(() => {})
    } catch (e) {
      if (e.name === 'TypeError') {
        isIOS = true
      }
    }
    try {
      pc.close()
    } catch (error) {}

    const sdpObject = sdpTransform.parse(offer.sdp)
    const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({ sdpObject })
    // support NACK for OPUS
    addNackSuppportForOpus(nativeRtpCapabilities)

    const envInfo = {
      nativeRtpCapabilities,
      isIOS
    }
    rtcEnvInfo = envInfo
    return envInfo
  } catch (error) {
    try {
      pc.close()
    } catch (error2) {}

    throw error
  }
}

export async function getNativeRtpCapabilities(): Promise<RtpCapabilities> {
  if (!rtcEnvInfo) {
    rtcEnvInfo = await detectRtcCapabilities()
  }
  try {
    return JSON.parse(JSON.stringify(rtcEnvInfo.nativeRtpCapabilities))
  } catch (e) {
    return rtcEnvInfo.nativeRtpCapabilities
  }
}

export function isIosFromRtpStats() {
  return rtcEnvInfo?.isIOS
}
