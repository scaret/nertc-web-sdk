import * as sdpTransform from 'sdp-transform'
import { Logger } from '../Logger'
import { UnsupportedError } from '../errors'
import * as utils from '../utils'
import * as ortc from '../ortc'
import * as sdpCommonUtils from './sdp/commonUtils'
import * as sdpPlanBUtils from './sdp/planBUtils'
import { reduceCodecs } from '../../../../util/rtcUtil/codec'
import { getParameters } from '../../../parameters'
import {
  HandlerFactory,
  HandlerInterface,
  HandlerRunOptions,
  HandlerSendOptions,
  // HandlerSendResult,
  Chrome62HandlerSendResult,
  // HandlerReceiveOptions,
  Chrome62HandlerReceiveOptions,
  HandlerReceiveResult,
  HandlerSendDataChannelOptions,
  HandlerSendDataChannelResult,
  HandlerReceiveDataChannelOptions,
  HandlerReceiveDataChannelResult
} from './HandlerInterface'
import { RemoteSdp } from './sdp/RemoteSdp'
import { DtlsParameters, IceParameters, DtlsRole, FillRemoteRecvSdpOptions } from '../Transport'
import { RtpCapabilities, RtpParameters } from '../RtpParameters'
import { SctpCapabilities, SctpStreamParameters } from '../SctpParameters'
import { filterTransportCCFromSdp } from '../../../../util/rtcUtil/filterTransportCC'
import { Interop } from '../sdp-transform/interop'

// const Logger = new Logger('Chrome62')
const prefix = 'Chrome_'

const SCTP_NUM_STREAMS = { OS: 1024, MIS: 1024 }

//@ts-ignore
export class Chrome62 extends HandlerInterface {
  // Handler direction.
  private _direction?: 'send' | 'recv'
  // Remote SDP handler.
  private _remoteSdp?: RemoteSdp
  // Generic sending RTP parameters for audio and video.
  private _sendingRtpParametersByKind?: { [key: string]: RtpParameters }
  // Generic sending RTP parameters for audio and video suitable for the SDP
  // remote answer.
  private _sendingRemoteRtpParametersByKind?: { [key: string]: RtpParameters }
  // Initial server side DTLS role. If not 'auto', it will force the opposite
  // value in client side.
  private _forcedLocalDtlsRole?: DtlsRole
  // RTCPeerConnection instance.
  public _pc: any
  // Local stream for sending.
  private readonly _sendStream = new MediaStream()
  // Map of sending MediaStreamTracks indexed by localId.
  private readonly _mapSendLocalIdTrack: Map<string, MediaStreamTrack> = new Map()
  // Next sending localId.
  private _nextSendLocalId = 0
  // Map of MID, RTP parameters and RTCRtpReceiver indexed by local id.
  // Value is an Object with mid, rtpParameters and rtpReceiver.
  private readonly _mapRecvLocalIdInfo: Map<
    string,
    {
      mid: string
      rtpParameters: RtpParameters
    }
  > = new Map()
  // Whether a DataChannel m=application section has been created.
  private _hasDataChannelMediaSection = false
  // Sending DataChannel id value counter. Incremented for each new DataChannel.
  private _nextSendSctpStreamId = 0
  // Got transport local and remote parameters.
  public _transportReady = false

  /**
   * Creates a factory function.
   */
  // static createFactory(): HandlerFactory {
  //   return (): Chrome62 => new Chrome62()
  // }
  static createFactory(): HandlerFactory {
    //@ts-ignore
    return (): Chrome62 => new Chrome62()
  }

  constructor() {
    super()
  }

  get name(): string {
    return 'Chrome62'
  }

  // close(): void {
  //   Logger.debug('close()')

  //   // Close RTCPeerConnection.
  //   if (this._pc) {
  //     try {
  //       this._pc.close()
  //     } catch (error) {}
  //   }

  //   this.emit('@close')
  // }

  close(): void {
    Logger.debug(prefix, 'close()')

    // Close RTCPeerConnection.
    if (this._pc) {
      try {
        this._pc.onconnectionstatechange = null
        this._pc.close()
      } catch (error) {}
    }
  }

  async getNativeRtpCapabilities(): Promise<RtpCapabilities> {
    Logger.debug('getNativeRtpCapabilities()')

    const pc = new (RTCPeerConnection as any)({
      iceServers: [],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'plan-b'
    })

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })

      try {
        pc.close()
      } catch (error) {}

      const sdpObject = sdpTransform.parse(offer.sdp)
      const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({ sdpObject })

      return nativeRtpCapabilities
    } catch (error) {
      try {
        pc.close()
      } catch (error2) {}

      throw error
    }
  }

  async getNativeSctpCapabilities(): Promise<SctpCapabilities> {
    Logger.debug('getNativeSctpCapabilities()')

    return {
      numStreams: SCTP_NUM_STREAMS
    }
  }

  run({
    direction,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    iceServers,
    iceTransportPolicy,
    additionalSettings,
    proprietaryConstraints,
    extendedRtpCapabilities
  }: HandlerRunOptions): void {
    Logger.debug('run()')

    this._direction = direction

    this._sendingRtpParametersByKind = {
      audio: ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
      video: ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
    }

    this._sendingRemoteRtpParametersByKind = {
      audio: ortc.getSendingRemoteRtpParameters('audio', extendedRtpCapabilities),
      video: ortc.getSendingRemoteRtpParameters('video', extendedRtpCapabilities)
    }

    if (dtlsParameters?.role && dtlsParameters.role !== 'auto') {
      this._forcedLocalDtlsRole = dtlsParameters.role === 'server' ? 'client' : 'server'
    }

    this._pc = new (RTCPeerConnection as any)(
      {
        iceServers: iceServers || [],
        iceTransportPolicy: iceTransportPolicy || 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'plan-b',
        ...additionalSettings
      },
      proprietaryConstraints
    )

    // Handle RTCPeerConnection connection status.
    // chrome 62 不支持 onconnectionstatechange

    if (this._pc.connectionState) {
      this._pc.addEventListener('connectionstatechange', () => {
        this.emit('@connectionstatechange', this._pc.connectionState)
      })
    } else {
      this._pc.addEventListener('iceconnectionstatechange', () => {
        Logger.debug('run() | pc.connectionState not supported, using pc.iceConnectionState')

        switch (this._pc.iceConnectionState) {
          case 'checking':
            this.emit('@connectionstatechange', 'connecting')
            break
          case 'connected':
          case 'completed':
            this.emit('@connectionstatechange', 'connected')
            break
          case 'failed':
            this.emit('@connectionstatechange', 'failed')
            break
          case 'disconnected':
            this.emit('@connectionstatechange', 'disconnected')
            break
          case 'closed':
            this.emit('@connectionstatechange', 'closed')
            break
        }
      })
    }

    //@ts-ignore
    this._pc.onicecandidate = (event: RTCIceCandidatePairChangedEvent) => {
      //console.error('本地候选地址的收集: ', event.candidate)
    }
    this._pc.onicecandidateerror = (e: any) => {
      Logger.warn('onicecandidateerror: ', e)
    }
  }

  async updateIceServers(iceServers: RTCIceServer[]): Promise<void> {
    Logger.debug('updateIceServers()')

    const configuration = this._pc.getConfiguration()

    configuration.iceServers = iceServers

    this._pc.setConfiguration(configuration)
  }

  async restartIce(iceParameters: IceParameters): Promise<void> {
    Logger.debug('restartIce()')

    // Provide the remote SDP handler with new remote ICE parameters.
    this._remoteSdp!.updateIceParameters(iceParameters)

    if (!this._transportReady) {
      return
    }

    if (this._direction === 'send') {
      const offer = await this._pc.createOffer({ iceRestart: true })

      Logger.debug('restartIce() | calling pc.setLocalDescription() [offer:%o]', offer)

      await this._pc.setLocalDescription(offer)

      const answer = { type: 'answer', sdp: this._remoteSdp!.getSdp() }

      Logger.debug('restartIce() | calling pc.setRemoteDescription() [answer:%o]', answer)
      await this._pc.setRemoteDescription(answer)
    } else {
      const offer = { type: 'offer', sdp: this._remoteSdp!.getSdp() }

      Logger.debug('restartIce() | calling pc.setRemoteDescription() [offer:%o]', offer)

      await this._pc.setRemoteDescription(offer)

      const answer = await this._pc.createAnswer()

      Logger.debug('restartIce() | calling pc.setLocalDescription() [answer:%o]', answer)

      await this._pc.setLocalDescription(answer)
    }
  }

  async getTransportStats(): Promise<RTCStatsReport> {
    return this._pc.getStats()
  }

  //@ts-ignore
  async send({
    track,
    encodings,
    codecOptions,
    codec,
    appData
  }: HandlerSendOptions): Promise<Chrome62HandlerSendResult> {
    this.assertSendDirection()

    Logger.debug('send() [kind:%s, track.id:%s]', track.kind, track.id)

    // if (codec) {
    //   Logger.warn('send() | codec selection is not available in %s handler', this.name)
    // }

    this._sendStream.addTrack(track)
    this._pc.addStream(this._sendStream)

    let offer = await this._pc.createOffer()
    // plan-b to unified-plan
    // let interop = new Interop()
    // offer = interop.toUnifiedPlan(offer)

    let localSdpObject = sdpTransform.parse(offer.sdp)
    if (appData.preferRemb) {
      filterTransportCCFromSdp(localSdpObject)
    }
    let offerMediaObject
    let dtlsParameters: DtlsParameters | undefined = undefined
    // const sendingRtpParameters = utils.clone(this._sendingRtpParametersByKind![track.kind], {})
    const sendingRtpParameters = utils.clone(this._sendingRtpParametersByKind![track.kind])

    sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs)

    const sendingRemoteRtpParameters = utils.clone(
      this._sendingRemoteRtpParametersByKind![track.kind]
    )

    sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs)

    if (!this._transportReady) {
      // await this._setupTransport({ localDtlsRole: 'server', localSdpObject })
      //@ts-ignore
      dtlsParameters = await this._setupTransport({ localDtlsRole: 'server', localSdpObject })
    }

    if (track.kind === 'video' && encodings && encodings.length > 1) {
      Logger.debug('send() | enabling simulcast')

      localSdpObject = sdpTransform.parse(offer.sdp)
      offerMediaObject = localSdpObject.media.find((m: any) => m.type === 'video')

      sdpPlanBUtils.addLegacySimulcast({
        offerMediaObject,
        track,
        numStreams: encodings.length
      })

      offer = { type: 'offer', sdp: sdpTransform.write(localSdpObject) }
    }

    Logger.debug('send() | calling pc.setLocalDescription() [offer:%o]', offer)

    // await this._pc.setLocalDescription(offer)
    // localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp)

    offerMediaObject = localSdpObject.media.find((m: any) => m.type === track.kind)

    // Set RTCP CNAME.
    sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({ offerMediaObject })

    // Set RTP encodings.
    sendingRtpParameters.encodings = sdpPlanBUtils.getRtpEncodings({ offerMediaObject, track })

    // Complete encodings with given values.
    if (encodings) {
      for (let idx = 0; idx < sendingRtpParameters.encodings.length; ++idx) {
        if (encodings[idx]) {
          Object.assign(sendingRtpParameters.encodings[idx], encodings[idx])
        }
      }
    }

    // If VP8 and there is effective simulcast, add scalabilityMode to each
    // encoding.
    if (
      sendingRtpParameters.encodings.length > 1 &&
      sendingRtpParameters.codecs[0].mimeType.toLowerCase() === 'video/vp8'
    ) {
      for (const encoding of sendingRtpParameters.encodings) {
        encoding.scalabilityMode = 'S1T3'
      }
    }

    let sendOptions = {
      // offerMediaObject,
      offerMediaObjectArr: [offerMediaObject],
      offerRtpParameters: sendingRtpParameters,
      answerRtpParameters: sendingRemoteRtpParameters,
      //@ts-ignore
      codecOptions
    }

    const localId = String(this._nextSendLocalId)

    this._nextSendLocalId++

    // Insert into the map.
    this._mapSendLocalIdTrack.set(localId, track)

    return {
      localId: localId,
      rtpParameters: sendingRtpParameters,
      dtlsParameters: dtlsParameters,
      offer: offer
    }
  }

  async fillRemoteRecvSdp({
    kind,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    sendingRtpParameters,
    codecOptions,
    offer,
    audioProfile,
    codec
  }: FillRemoteRecvSdpOptions) {
    //offer.sdp = offer.sdp.replace(/a=extmap:2 http:([0-9a-zA-Z=+-_\/\\\\]+)\r\n/, ``)
    //offer.sdp = offer.sdp.replace(/a=extmap:3 http:([0-9a-zA-Z=+-_\/\\\\]+)\r\n/, ``)
    Logger.debug(prefix, 'fillRemoteRecvSdp() | calling pc.setLocalDescription()')

    // plan-b to unified-plan
    let interop = new Interop()

    offer = interop.toUnifiedPlan(offer)
    await this._pc.setLocalDescription(offer)
    if (!this._remoteSdp) {
      this._remoteSdp = new RemoteSdp({
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters
      })
      this._remoteSdp.updateDtlsRole('client')
    }
    //@ts-ignore
    const sendingRemoteRtpParameters = utils.clone(this._sendingRemoteRtpParametersByKind[kind])
    // This may throw.
    sendingRemoteRtpParameters.codecs = reduceCodecs(sendingRemoteRtpParameters.codecs, codec)
    let localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp)
    const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx()
    let offerMediaObject = localSdpObject.media[mediaSectionIdx.idx]
    let offerMediaObjectLow: any = null
    if (sendingRtpParameters.encodings && sendingRtpParameters.encodings.length > 1) {
      offerMediaObjectLow = localSdpObject.media[mediaSectionIdx.idx + 1]
    }

    this._remoteSdp.send({
      offerMediaObjectArr: [offerMediaObject],
      reuseMid: mediaSectionIdx.reuseMid,
      offerRtpParameters: sendingRtpParameters,
      answerRtpParameters: sendingRemoteRtpParameters,
      codecOptions,
      extmapAllowMixed: true
    })

    let answer = { type: 'answer', sdp: this._remoteSdp.getSdp() }

    Logger.debug(prefix, 'audioProfile设置为: ', audioProfile)
    if (audioProfile) {
      let profile = null
      switch (audioProfile) {
        case 'speech_low_quality':
          //16 kHz 采样率，单声道，编码码率约 32 Kbps
          profile = 'maxplaybackrate=16000;sprop-maxcapturerate=16000;maxaveragebitrate=32000'
          break
        case 'speech_standard':
          //32 kHz 采样率，单声道，编码码率约 36 Kbps
          profile = 'maxplaybackrate=32000;sprop-maxcapturerate=32000;maxaveragebitrate=36000'
          break
        case 'music_standard':
          //48 kHz 采样率，单声道，编码码率约 40 Kbps
          profile = 'maxplaybackrate=48000;sprop-maxcapturerate=48000;'
          break
        case 'standard_stereo':
          //48 kHz 采样率，双声道，编码码率约 64 Kbps
          profile =
            'stereo=1;sprop-stereo=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;maxaveragebitrate=56000'
          break
        case 'high_quality':
          //48 kHz 采样率，单声道， 编码码率约 128 Kbps
          profile = 'maxplaybackrate=48000;sprop-maxcapturerate=48000;maxaveragebitrate=128000'
          break
        case 'high_quality_stereo':
          //48 kHz 采样率，双声道，编码码率约 192 Kbps
          profile =
            'stereo=1;sprop-stereo=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;maxaveragebitrate=192000'
          break
      }
      if (answer.sdp.indexOf('a=fmtp:111')) {
        //answer.sdp = answer.sdp.replace(/a=fmtp:111 ([0-9=;a-zA-Z]*)/, 'a=fmtp:111 $1;' + profile)
        answer.sdp = answer.sdp.replace(
          /a=fmtp:111 ([0-9=;a-zA-Z]*)/,
          'a=fmtp:111 minptime=10;useinbandfec=1;' + profile
        )
      }
      answer.sdp = answer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=maxptime:60`)
    }
    Logger.debug(prefix, 'fillRemoteRecvSdp() | calling pc.setRemoteDescription()')
    if (!getParameters().enableUdpCandidate) {
      answer.sdp = answer.sdp.replace(/\r\na=candidate:udpcandidate[^\r]+/g, '')
    }
    if (!getParameters().enableTcpCandidate) {
      answer.sdp = answer.sdp.replace(/\r\na=candidate:tcpcandidate[^\r]+/g, '')
    }

    await this._pc.setRemoteDescription(answer)
  }

  async stopSending(localId: string): Promise<void> {
    this.assertSendDirection()

    Logger.debug('stopSending() [localId:%s]', localId)

    const track = this._mapSendLocalIdTrack.get(localId)

    if (!track) {
      throw new Error('track not found')
    }

    this._mapSendLocalIdTrack.delete(localId)
    this._sendStream.removeTrack(track)
    this._pc.addStream(this._sendStream)

    const offer = await this._pc.createOffer()

    Logger.debug('stopSending() | calling pc.setLocalDescription() [offer:%o]', offer)

    try {
      await this._pc.setLocalDescription(offer)
    } catch (error) {
      // NOTE: If there are no sending tracks, setLocalDescription() will fail with
      // "Failed to create channels". If so, ignore it.
      if (this._sendStream.getTracks().length === 0) {
        Logger.warn(
          'stopSending() | ignoring expected error due no sending tracks: %s',
          (error as Error).toString()
        )

        return
      }

      throw error
    }

    if (this._pc.signalingState === 'stable') {
      return
    }

    const answer = { type: 'answer', sdp: this._remoteSdp!.getSdp() }

    Logger.debug('stopSending() | calling pc.setRemoteDescription() [answer:%o]', answer)

    await this._pc.setRemoteDescription(answer)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async pauseSending(localId: string): Promise<void> {
    // Unimplemented.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resumeSending(localId: string): Promise<void> {
    // Unimplemented.
  }

  async replaceTrack(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localId: string,
    track: MediaStreamTrack | null
  ): Promise<void> {
    throw new UnsupportedError('not implemented')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setMaxSpatialLayer(localId: string, spatialLayer: number): Promise<void> {
    throw new UnsupportedError(' not implemented')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setRtpEncodingParameters(localId: string, params: any): Promise<void> {
    throw new UnsupportedError('not supported')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSenderStats(localId: string): Promise<RTCStatsReport> {
    throw new UnsupportedError('not implemented')
  }

  async prepareLocalSdp(kind: 'video' | 'audio', remoteUid: number | string) {
    Logger.debug('prepareLocalSdp() [kind:%s, remoteUid:%s]', kind, remoteUid)
    let mid = -1

    let offer: RTCSessionDescriptionInit

    let mAudio, mVideo
    if (kind === 'audio' || this._pc.localDescription.sdp.indexOf('m=audio') > -1) {
      mAudio = true
    } else {
      mAudio = false
    }
    if (kind === 'video' || this._pc.localDescription.sdp.indexOf('m=video') > -1) {
      mVideo = true
    } else {
      mVideo = false
    }

    offer = await this._pc.createOffer({
      offerToReceiveAudio: mAudio,
      offerToReceiveVideo: mVideo
    })

    if (!offer.sdp) {
      Logger.error(prefix, `[Subscribe] prepareLocalSdp() offer没有sdp`)
      throw new Error('INVALID_OFFER')
    }
    // 去除 sdp 中 nack 行对 transport-cc 的依赖
    if (offer.sdp.indexOf('a=rtcp-fb:111') && offer.sdp.indexOf('a=rtcp-fb:111 nack') === -1) {
      offer.sdp = offer.sdp.replace(/(a=rtcp-fb:111.*)/, '$1\r\na=rtcp-fb:111 nack')
    }
    if (offer.sdp.indexOf('a=fmtp:111')) {
      offer.sdp = offer.sdp.replace(
        /a=fmtp:111 ([0-9=;a-zA-Z-]*)/,
        'a=fmtp:111 minptime=10;stereo=1;sprop-stereo=1;useinbandfec=1'
      )
    }

    if (!offer.sdp) {
      Logger.error(prefix, `[Subscribe] prepareLocalSdp() offer没有sdp`)
      throw new Error('INVALID_OFFER')
    }

    if (offer.sdp.includes('a=inactive')) {
      offer.sdp = offer.sdp.replace(/a=inactive/g, 'a=recvonly')
    }
    const localSdpObject = sdpTransform.parse(offer.sdp)
    //@ts-ignore
    // mid = localSdpObject.media[localSdpObject.media.length - 1].mid
    // mid = localSdpObject.media.find((m) => m.type === kind).mid
    mid = localSdpObject.media[localSdpObject.media.length - 1].mid

    let dtlsParameters = undefined

    if (!this._transportReady) {
      dtlsParameters = await this._setupTransport({ localDtlsRole: 'server', localSdpObject })
    }
    const rtpCapabilities = sdpCommonUtils.extractRtpCapabilities({ sdpObject: localSdpObject })
    // support NACK for OPUS
    // addNackSuppportForOpus(rtpCapabilities)
    // console.warn('rtpCapabilities: ', rtpCapabilities)

    if (mid === -1) {
      //@ts-ignore
      mid = localSdpObject.media[localSdpObject.media.length - 1].mid
    }

    return { dtlsParameters, rtpCapabilities, offer, mid, iceUfragReg: '' }
  }

  async receive({
    trackId,
    kind,
    rtpParameters,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    offer,
    remoteUid,
    extendedRtpCapabilities,
    appData
  }: any) {
    this.assertRecvDirection()

    Logger.debug('receive() [trackId:%s, kind:%s]', trackId, kind)
    // let localId = trackId
    const mid = kind
    const streamId = rtpParameters.rtcp.cname

    if (!this._remoteSdp) {
      this._remoteSdp = new RemoteSdp({
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters,
        planB: true
      })
      this._remoteSdp.updateDtlsRole('client')
      // 此处有一个 chrome 的 bug: https://bugs.chromium.org/p/webrtc/issues/detail?id=7072
      // 暂时的规避方案: 在 setRemoteDescription 之前，将 offer 中的 a=setup:active 改为 a=setup:actpass
      // this._remoteSdp.updateDtlsRole('auto')
    }
    let localId = (rtpParameters && rtpParameters.mid) || appData.mid
    Logger.debug(prefix, `[Subscribe] receive() mid: ${localId}`)

    this._remoteSdp!.receive({
      mid,
      kind,
      offerRtpParameters: rtpParameters,
      streamId,
      trackId
    })

    // if (!offer.sdp) {
    //   Logger.error(prefix, `[Subscribe] prepareLocalSdp() offer没有sdp`)
    //   throw new Error('INVALID_OFFER')
    // }
    // // receive() 的 sdp 中已经有 nack 了， 无需再添加
    // if (offer.sdp.indexOf('a=fmtp:111')) {
    //   offer.sdp = offer.sdp.replace(
    //     /a=fmtp:111 ([0-9=;a-zA-Z]*)/,
    //     'a=fmtp:111 minptime=10;stereo=1;sprop-stereo=1;useinbandfec=1'
    //   )
    // }

    let answer = { type: 'answer', sdp: this._remoteSdp.getSdp() }

    // if (answer.sdp.indexOf('a=fmtp:111')) {
    //   answer.sdp = answer.sdp.replace(
    //     /a=fmtp:111 ([0-9=;a-zA-Z]*)/,
    //     'a=fmtp:111 minptime=10;stereo=1;sprop-stereo=1;useinbandfec=1'
    //   )
    // }

    // if (getParameters().enableSdpRrtr === 'chrome' || getParameters().enableSdpRrtr === 'all') {
    //   offer.sdp = offer.sdp.replace(/a=rtcp-fb:(\d+) rrtr ?\r\n/g, '')
    //   offer.sdp = offer.sdp.replace(
    //     /a=rtcp-fb:(\d+) nack ?\r\n/g,
    //     'a=rtcp-fb:$1 rrtr\r\na=rtcp-fb:$1 nack\r\n'
    //   )
    //   answer.sdp = answer.sdp.replace(/a=rtcp-fb:(\d+) rrtr ?\r\n/g, '')
    //   answer.sdp = answer.sdp.replace(
    //     /a=rtcp-fb:(\d+) nack ?\r\n/g,
    //     'a=rtcp-fb:$1 rrtr\r\na=rtcp-fb:$1 nack\r\n'
    //   )
    // }

    // if (!getParameters().enableUdpCandidate) {
    //   answer.sdp = answer.sdp.replace(/\r\na=candidate:udpcandidate[^\r]+/g, '')
    // }
    // if (!getParameters().enableTcpCandidate) {
    //   answer.sdp = answer.sdp.replace(/\r\na=candidate:tcpcandidate[^\r]+/g, '')
    // }

    // let interop = new Interop()

    Logger.debug(prefix, '[Subscribe] receive() | calling pc.setLocalDescription()')

    await this._pc.setLocalDescription(offer)

    Logger.debug(prefix, '[Subscribe] receive() | calling pc.setRemoteDescription()')

    await this._pc.setRemoteDescription(answer)

    const stream = this._pc.getRemoteStreams().find((s: any) => s.id === streamId)
    const track = stream.getTrackById(trackId)

    return { localId, track, rtpReceiver: undefined }
  }

  //@ts-ignore
  async stopReceiving(localIds: string[]): Promise<void> {
    this.assertRecvDirection()

    for (const localId of localIds) {
      Logger.debug('stopReceiving() [localId:%s]', localId)

      const { mid, rtpParameters } = this._mapRecvLocalIdInfo.get(localId) || {}

      // Remove from the map.
      this._mapRecvLocalIdInfo.delete(localId)

      this._remoteSdp!.planBStopReceiving({ mid: mid!, offerRtpParameters: rtpParameters! })
    }

    const offer = { type: 'offer', sdp: this._remoteSdp!.getSdp() }

    Logger.debug('stopReceiving() | calling pc.setRemoteDescription() [offer:%o]', offer)

    await this._pc.setRemoteDescription(offer)

    const answer = await this._pc.createAnswer()

    Logger.debug('stopReceiving() | calling pc.setLocalDescription() [answer:%o]', answer)

    await this._pc.setLocalDescription(answer)
  }

  async pauseReceiving(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localIds: string[]
  ): Promise<void> {
    // Unimplemented.
  }

  async resumeReceiving(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localIds: string[]
  ): Promise<void> {
    // Unimplemented.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getReceiverStats(localId: string): Promise<RTCStatsReport> {
    throw new UnsupportedError('not implemented')
  }

  private async _setupTransport({
    localDtlsRole,
    localSdpObject
  }: {
    localDtlsRole: DtlsRole
    localSdpObject?: any
  }) {
    if (!localSdpObject) {
      localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp)
    }

    // Get our local DTLS parameters.
    const dtlsParameters = sdpCommonUtils.extractDtlsParameters({ sdpObject: localSdpObject })

    // Set our DTLS role.
    dtlsParameters.role = localDtlsRole

    // Update the remote DTLS role in the SDP.
    // this._remoteSdp!.updateDtlsRole(localDtlsRole === 'client' ? 'server' : 'client')

    // Need to tell the remote transport about our parameters.
    // await this.safeEmitAsPromise('@connect', { dtlsParameters })

    this._transportReady = true
    return dtlsParameters
  }

  private assertSendDirection(): void {
    if (this._direction !== 'send') {
      throw new Error('method can just be called for handlers with "send" direction')
    }
  }

  private assertRecvDirection(): void {
    if (this._direction !== 'recv') {
      throw new Error('method can just be called for handlers with "recv" direction')
    }
  }
}
