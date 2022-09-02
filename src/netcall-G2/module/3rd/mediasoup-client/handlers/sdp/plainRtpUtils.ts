import ErrorCode from '../../../../../util/error/errorCode'
import RtcError from '../../../../../util/error/rtcError'
import * as env from '../../../../../util/rtcUtil/rtcEnvironment'
import { MediaKind, RtpEncodingParameters } from '../../RtpParameters'

export function extractPlainRtpParameters({
  sdpObject,
  kind
}: {
  sdpObject: any
  kind: MediaKind
}): {
  ip: string
  ipVersion: 4 | 6
  port: number
} {
  const mediaObject = (sdpObject.media || []).find((m: any) => m.type === kind)

  if (!mediaObject) {
    let enMessage = `extractPlainRtpParameters: m=${kind} section is not found`,
      zhMessage = `extractPlainRtpParameters: m=${kind} 未找到`,
      enAdvice = 'Please contact CommsEase technical support',
      zhAdvice = '请联系云信技术支持'
    let message = env.IS_ZH ? zhMessage : enMessage,
      advice = env.IS_ZH ? zhAdvice : enAdvice
    throw new RtcError({
      code: ErrorCode.SDP_ERROR,
      message,
      advice
    })
  }

  const connectionObject = mediaObject.connection || sdpObject.connection

  return {
    ip: connectionObject.ip,
    ipVersion: connectionObject.version,
    port: mediaObject.port
  }
}

export function getRtpEncodings({
  sdpObject,
  kind
}: {
  sdpObject: any
  kind: MediaKind
}): RtpEncodingParameters[] {
  const mediaObject = (sdpObject.media || []).find((m: any) => m.type === kind)

  if (!mediaObject) {
    let enMessage = `getRtpEncodings: m=${kind} section is not found`,
      zhMessage = `getRtpEncodings: m=${kind} 未找到`,
      enAdvice = 'Please contact CommsEase technical support',
      zhAdvice = '请联系云信技术支持'
    let message = env.IS_ZH ? zhMessage : enMessage,
      advice = env.IS_ZH ? zhAdvice : enAdvice
    throw new RtcError({
      code: ErrorCode.SDP_ERROR,
      message,
      advice
    })
  }

  const ssrcCnameLine = (mediaObject.ssrcs || [])[0]
  const ssrc = ssrcCnameLine ? ssrcCnameLine.id : null

  if (ssrc) return [{ ssrc }]
  else return []
}
