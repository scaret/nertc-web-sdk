import { NeRTCPeerConnection } from '../../../../interfaces/NeRTCPeerConnection'
import { EnhancedEventEmitter } from '../EnhancedEventEmitter'
import { ProducerCodecOptions } from '../Producer'
import {
  RtpCapabilities,
  RtpCodecCapability,
  RtpEncodingParameters,
  RtpParameters
} from '../RtpParameters'
import { SctpCapabilities, SctpParameters, SctpStreamParameters } from '../SctpParameters'
import { DtlsParameters, FillRemoteRecvSdpOptions, IceCandidate, IceParameters } from '../Transport'
import { RemoteSdp } from './sdp/RemoteSdp'

export type HandlerFactory = () => HandlerInterface

export type HandlerRunOptions = {
  direction: 'send' | 'recv'
  iceParameters?: IceParameters
  iceCandidates?: IceCandidate[]
  dtlsParameters?: DtlsParameters
  sctpParameters?: SctpParameters
  iceServers?: RTCIceServer[]
  iceTransportPolicy?: RTCIceTransportPolicy
  additionalSettings?: any
  proprietaryConstraints?: any
  extendedRtpCapabilities: any
  appData: {
    encodedInsertableStreams?: boolean
  }
}

export type HandlerSendOptions = {
  track: MediaStreamTrack
  trackLow: MediaStreamTrack | null
  encodings?: RtpEncodingParameters[]
  codecOptions?: ProducerCodecOptions
  codec?: RtpCodecCapability
  appData: {
    deviceId: string
    deviceIdLow: string | null
    mediaType: 'video' | 'audio' | 'screenShare' | 'audioSlave'
    preferRemb: boolean
  }
}

export type HandlerSendResult = {
  localId: string
  localIdLow: string | null
  rtpParameters: RtpParameters
  rtpSender?: RTCRtpSender
  rtpSenderLow?: RTCRtpSender
  dtlsParameters?: DtlsParameters
  offer: any
}

export type Chrome58HandlerSendResult = {
  localId: string
  rtpParameters: RtpParameters
  rtpSender?: RTCRtpSender
  dtlsParameters?: DtlsParameters
  offer: any
}

export type HandlerReceiveOptions = {
  trackId: string
  kind: 'audio' | 'video'
  rtpParameters: RtpParameters
  iceParameters?: IceParameters
  iceCandidates?: IceCandidate[]
  dtlsParameters?: DtlsParameters
  sctpParameters?: SctpParameters
  offer: any
  probeSSrc?: number | string
  remoteUid: number | string
  extendedRtpCapabilities: any
  appData?: any
}

export type Chrome58HandlerReceiveOptions = {
  trackId: string
  kind: 'audio' | 'video'
  rtpParameters: RtpParameters
  /**
   * Stream id. WebRTC based devices try to synchronize inbound streams with
   * same streamId. If not given, the consuming device will be told to
   * synchronize all streams produced by the same endpoint. However libwebrtc
   * can just synchronize up to one audio stream with one video stream.
   */
  streamId?: string
}

export type HandlerReceiveResult = {
  localId: string
  track: MediaStreamTrack
  rtpReceiver?: RTCRtpReceiver
}

export interface HandlerAppData {
  encodedInsertableStreams?: boolean
  cid?: number
  uid?: number
}

export interface EnhancedTransceiver extends RTCRtpTransceiver {
  isUseless?: boolean
}

export interface EnhancedRTCRtpParameters extends RTCRtpParameters {
  encodings?: any[]
}

export abstract class HandlerInterface extends EnhancedEventEmitter {
  /**
   * @emits @connect - (
   *     { dtlsParameters: DtlsParameters },
   *     callback: Function,
   *     errback: Function
   *   )
   * @emits @connectionstatechange - (connectionState: ConnectionState)
   */
  constructor() {
    super()
  }

  abstract _pc: NeRTCPeerConnection

  abstract get name(): string

  abstract get remoteSdp(): RemoteSdp | undefined

  abstract close(): void

  abstract _transportReady: boolean

  abstract getNativeRtpCapabilities(): Promise<RtpCapabilities>

  abstract getNativeSctpCapabilities(): Promise<SctpCapabilities>

  abstract run(options: HandlerRunOptions): void

  abstract updateIceServers(iceServers: RTCIceServer[]): Promise<void>

  abstract restartIce(iceParameters: IceParameters): Promise<void>

  abstract getTransportStats(): Promise<RTCStatsReport>

  abstract send(options: HandlerSendOptions): Promise<HandlerSendResult>

  abstract stopSending(
    localId: string,
    kind: 'audio' | 'video' | 'screenShare' | 'audioSlave'
  ): Promise<void>

  abstract fillRemoteRecvSdp(options: FillRemoteRecvSdpOptions): any

  abstract prepareLocalSdp(kind: 'video' | 'audio', uid: number | string): any

  abstract recoverTransceiver(
    remoteUid: number | string,
    mid: string | undefined,
    kind: 'video' | 'audio'
  ): any

  abstract replaceTrack(localId: string, track: MediaStreamTrack | null): Promise<void>

  abstract setMaxSpatialLayer(localId: string, spatialLayer: number): Promise<void>

  abstract setRtpEncodingParameters(localId: string, params: any): Promise<void>

  abstract getSenderStats(localId: string): Promise<RTCStatsReport>

  abstract receive(options: HandlerReceiveOptions): Promise<HandlerReceiveResult>

  abstract stopReceiving(localId: string): Promise<void>

  abstract getReceiverStats(localId: string): Promise<RTCStatsReport>
}

export type HandlerSendDataChannelOptions = SctpStreamParameters
export type HandlerSendDataChannelResult = {
  dataChannel: RTCDataChannel
  sctpStreamParameters: SctpStreamParameters
}
export type HandlerReceiveDataChannelOptions = {
  sctpStreamParameters: SctpStreamParameters
  label?: string
  protocol?: string
}
export type HandlerReceiveDataChannelResult = {
  dataChannel: RTCDataChannel
}
