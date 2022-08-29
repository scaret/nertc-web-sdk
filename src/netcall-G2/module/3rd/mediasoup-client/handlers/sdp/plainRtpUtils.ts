import ErrorCode from '../../../../../util/error/errorCode'
import RtcError from '../../../../../util/error/rtcError'
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
    throw new RtcError({
      code: ErrorCode.NOT_FOUND,
      message: `extractPlainRtpParameters: m=${kind} section is not found`
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
    throw new RtcError({
      code: ErrorCode.NOT_FOUND,
      message: `getRtpEncodings: m=${kind} section is not found`
    })
  }

  const ssrcCnameLine = (mediaObject.ssrcs || [])[0]
  const ssrc = ssrcCnameLine ? ssrcCnameLine.id : null

  if (ssrc) return [{ ssrc }]
  else return []
}
