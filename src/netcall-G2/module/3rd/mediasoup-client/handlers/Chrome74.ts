import * as sdpTransform from 'sdp-transform';
import { Logger } from '../Logger';
import * as utils from '../utils';
import * as ortc from '../ortc';
import * as sdpCommonUtils from './sdp/commonUtils';
import * as sdpUnifiedPlanUtils from './sdp/unifiedPlanUtils';
import {
  HandlerFactory,
  HandlerInterface,
  HandlerRunOptions,
  HandlerSendOptions,
  HandlerSendResult,
  HandlerReceiveOptions,
  HandlerReceiveResult,
  EnhancedTransceiver, EnhancedRTCRtpParameters
} from './HandlerInterface';
import { RemoteSdp } from './sdp/RemoteSdp';
import { parse as parseScalabilityMode } from '../scalabilityModes';
import {IceParameters, DtlsRole, DtlsParameters, FillRemoteRecvSdpOptions} from '../Transport';
import {
  RtpCapabilities,
  RtpParameters,
  RtpEncodingParameters
} from '../RtpParameters';
import { SctpCapabilities, SctpStreamParameters } from '../SctpParameters';
import {reduceCodecs} from "../../../../util/rtcUtil/codec";
import {MediaSection} from "./sdp/MediaSection";
import RtcError from '../../../../util/error/rtcError';
import ErrorCode  from '../../../../util/error/errorCode';

const logger = new Logger('Chrome74');

const SCTP_NUM_STREAMS = { OS: 1024, MIS: 1024 };

export class Chrome74 extends HandlerInterface
{
  // Handler direction.
  private _direction?: 'send' | 'recv';
  // Remote SDP handler.
  private _remoteSdp?: RemoteSdp;
  // Generic sending RTP parameters for audio and video.
  private _sendingRtpParametersByKind?: { [key: string]: RtpParameters };
  // Generic sending RTP parameters for audio and video suitable for the SDP
  // remote answer.
  private _sendingRemoteRtpParametersByKind: { [key: string]: RtpParameters } = {};
  // RTCPeerConnection instance.
  public _pc: any;
  // Map of RTCTransceivers indexed by MID.
  private readonly _mapMidTransceiver: Map<string, EnhancedTransceiver> =
    new Map();
  // Local stream for sending.
  private readonly _sendStream = new MediaStream();
  // Got transport local and remote parameters.
  public _transportReady = false;

  public _appData:any = {};
  
  /**
   * Creates a factory function.
   */
  static createFactory(): HandlerFactory
  {
    return (): Chrome74 => new Chrome74();
  }

  constructor()
  {
    super();
  }

  get name(): string
  {
    return 'Chrome74';
  }

  close(): void
  {
    logger.debug('close()');

    // Close RTCPeerConnection.
    if (this._pc)
    {
      try {
        this._pc.onconnectionstatechange = null;
        this._pc.close(); 
      }catch (error) {}
    }
  }

  async getNativeRtpCapabilities(): Promise<RtpCapabilities>
  {
    logger.debug('getNativeRtpCapabilities()');

    const pc = new (RTCPeerConnection as any)(
      {
        iceServers         : [],
        iceTransportPolicy : 'all',
        bundlePolicy       : 'max-bundle',
        rtcpMuxPolicy      : 'require',
        sdpSemantics       : 'unified-plan'
      });

    try
    {
      pc.addTransceiver('audio');
      pc.addTransceiver('video');

      const offer = await pc.createOffer();
      // copied but why???
      offer.sdp = offer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=rtcp-fb:111 transport-cc\r\na=rtcp-fb:111 nack`)
      try { pc.close(); }
      
      catch (error) {}

      const sdpObject = sdpTransform.parse(offer.sdp);
      const nativeRtpCapabilities =
        sdpCommonUtils.extractRtpCapabilities({ sdpObject });

      return nativeRtpCapabilities;
    }
    catch (error)
    {
      try { pc.close(); }
      catch (error2) {}

      throw error;
    }
  }

  async getNativeSctpCapabilities(): Promise<SctpCapabilities>
  {
    logger.debug('getNativeSctpCapabilities()');

    return {
      numStreams : SCTP_NUM_STREAMS
    };
  }

  run(
    {
      direction,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers,
      iceTransportPolicy,
      additionalSettings,
      proprietaryConstraints,
      extendedRtpCapabilities,
      appData,
    }: HandlerRunOptions
  ): void
  {
    logger.debug('run()', appData);
    
    this._appData = appData;

    this._direction = direction;

    // this._remoteSdp = new RemoteSdp(
    //   {
    //     iceParameters,
    //     iceCandidates,
    //     dtlsParameters,
    //     sctpParameters
    //   });

    this._sendingRtpParametersByKind =
    {
      audio : ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
      video : ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
    };

    this._sendingRemoteRtpParametersByKind =
    {
      audio : ortc.getSendingRemoteRtpParameters('audio', extendedRtpCapabilities),
      video : ortc.getSendingRemoteRtpParameters('video', extendedRtpCapabilities)
    };

    logger.debug('iceServers: %o', iceServers)
    const pcConfig:any = {
      iceServers         : iceServers || [],
      iceTransportPolicy : iceTransportPolicy || 'all',
      // bundlePolicy       : 'max-bundle',
      rtcpMuxPolicy      : 'require',
      sdpSemantics       : 'unified-plan',
      // ...additionalSettings
    };
    if (appData.encodedInsertableStreams){
      pcConfig.encodedInsertableStreams = true;
    }
    this._pc = new (RTCPeerConnection as any)(
      pcConfig,
      proprietaryConstraints);

    // Handle RTCPeerConnection connection status.
    //使用onconnectionstatechange接口判断peer的状态，废弃使用 iceconnectionstatechange  
    this._pc.onconnectionstatechange = () => {
      switch (this._pc.connectionState) {
        case 'checking':
          this.emit('@connectionstatechange', 'connecting');
          break;
        case 'connected':
        case 'completed':
          this.emit('@connectionstatechange', 'connected');
          break;
        case 'failed':
          this.emit('@connectionstatechange', 'failed');
          break;
        case 'disconnected':
          this.emit('@connectionstatechange', 'disconnected');
          break;
        case 'closed':
          this.emit('@connectionstatechange', 'closed');
          break;
      }
    };

    this._pc.onicecandidate = (event: RTCIceCandidatePairChangedEvent) =>{
      //console.error('本地候选地址的收集: ', event.candidate)  
    }
    /*this._pc.onconnectionstatechange = (event) =>{  
    console.error('peer的状态: ', event)  
    }*/
    this._pc.onicecandidateerror = (e: any) => {
      console.error('地址收集失败: ', e)
    }
  }

  async updateIceServers(iceServers: RTCIceServer[]): Promise<void>
  {
    logger.debug('updateIceServers()');

    const configuration = this._pc.getConfiguration();

    configuration.iceServers = iceServers;

    this._pc.setConfiguration(configuration);
  }

  async restartIce(iceParameters: IceParameters): Promise<void>
  {
    logger.debug('restartIce()');

    // Provide the remote SDP handler with new remote ICE parameters.
    this._remoteSdp!.updateIceParameters(iceParameters);

    if (!this._transportReady)
      return;

    if (this._direction /*=== 'send'*/)
    {
      const offer = await this._pc.createOffer({ iceRestart: true });
      
      if (offer.sdp.indexOf(`a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#`) < 0) {
        offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#${this._direction}`)
      }
      let localSdpObject = sdpTransform.parse(offer.sdp);
      localSdpObject.media.forEach(media => {
        if (media.type === 'audio' && this._direction === 'send' && media.ext && media.rtcpFb) {
          media.ext = media.ext.filter((item)=>{
            return item.uri.indexOf('transport-wide-cc') == -1 && item.uri.indexOf('abs-send-time') == -1
          })
          media.rtcpFb = media.rtcpFb.map((item)=>{
            item.type = item.type.replace(/transport-cc/g, 'nack')
            return item
          })
        }
      })
      offer.sdp = sdpTransform.write(localSdpObject)
      logger.debug('restartIce() | calling pc.setLocalDescription()');

      await this._pc.setLocalDescription(offer);

      const answer = { type: 'answer', sdp: this._remoteSdp!.getSdp() };

      logger.debug(
        'restartIce() | calling pc.setRemoteDescription() [answer:%o]',
        answer);

      await this._pc.setRemoteDescription(answer);
    }
    else
    {
      const offer = { type: 'offer', sdp: this._remoteSdp!.getSdp() };

      logger.debug(
        'restartIce() | calling pc.setRemoteDescription() [offer:%o]',
        offer);

      await this._pc.setRemoteDescription(offer);

      const answer = await this._pc.createAnswer();

      logger.debug(
        'restartIce() | calling pc.setLocalDescription() [answer:%o]',
        answer);

      await this._pc.setLocalDescription(answer);
    }
  }

  async getTransportStats(): Promise<RTCStatsReport>
  {
    return this._pc.getStats();
  }

  async send(
    { track, encodings, codecOptions, codec, appData }: HandlerSendOptions
  ): Promise<HandlerSendResult>
  {
    this._assertSendDirection();

    logger.debug('send() [kind:%s, track.id:%s]', track.kind, track.id, encodings, appData);

    if (encodings && encodings.length > 1)
    {
      encodings.forEach((encoding: RtpEncodingParameters, idx: number) =>
      {
        encoding.rid = `r${idx}`;
      });
    }

    const sendingRtpParameters =
      utils.clone(this._sendingRtpParametersByKind![track.kind], {});

    // This may throw.
    sendingRtpParameters.codecs =
      reduceCodecs(sendingRtpParameters.codecs, codec);
    let transceiver:any = {};
    if (appData.mediaType === 'audio' && this._pc.audioSender) {
      logger.debug('audioSender更新track: ', this._pc.audioSender)
      this._pc.audioSender.replaceTrack(track)
    } else if (appData.mediaType === 'video' && this._pc.videoSender) {
      logger.debug('videoSender更新track: ', this._pc.videoSender)
      this._pc.videoSender.replaceTrack(track)
    } else if (appData.mediaType === 'screenShare' && this._pc.screenSender) {
      logger.debug('screenSender更新track: ', this._pc.screenSender)
      this._pc.screenSender.replaceTrack(track)
    } else {
      let stream = new MediaStream();
      stream.addTrack(track)
      transceiver = this._pc.addTransceiver(track, {
        direction     : 'sendonly',
        streams       : [ this._sendStream ],
        sendEncodings : encodings
      });
      if (appData.mediaType === 'audio' && !this._pc.audioSender) {
        this._pc.audioSender = transceiver.sender
      } else if (appData.mediaType === 'video' && !this._pc.videoSender) {
        this._pc.videoSender = transceiver.sender
      } else if (appData.mediaType === 'screenShare' && !this._pc.screenSender) {
        this._pc.screenSender = transceiver.sender
      }
    }
    logger.debug('send() | [transceivers:%d]', this._pc.getTransceivers().length);
    
    let offer = await this._pc.createOffer();
    if (offer.sdp.indexOf(`a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#`) < 0) {
      offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#send`)
    }
    let localSdpObject = sdpTransform.parse(offer.sdp);
    let dtlsParameters:DtlsParameters|undefined = undefined;
    let offerMediaObject;

    if (!this._transportReady)
      dtlsParameters = await this._setupTransport({ localDtlsRole: 'server', localSdpObject });
    
    // We can now get the transceiver.mid.
    const localId = transceiver.mid;

    // Set MID.
    sendingRtpParameters.mid = localId;

    //寻找 mediaSectionIdx  
    let mediaSectionIdx = -1;
    for(let i in localSdpObject.media){
      if(appData.mediaType === "audio"){
        if(localSdpObject.media[i].type === "audio"){
          mediaSectionIdx = parseInt(i);
          break;
        }
      }else if(appData.mediaType === "video"){
        if (localSdpObject.media[i].type === "video"){
          if (!this._pc.screenSender || !this._pc.screenSender.offerMediaObject || this._pc.screenSender.offerMediaObject.msid !== localSdpObject.media[i].msid){
            mediaSectionIdx = parseInt(i);
            break;
          }
        }
        if (localSdpObject.media[i].type === "screenShare"){
          if (!this._pc.videoSender || !this._pc.videoSender.offerMediaObject || this._pc.videoSender.offerMediaObject.msid !== localSdpObject.media[i].msid){
            mediaSectionIdx = parseInt(i);
            break;
          }
        }
      }
    }
    if (mediaSectionIdx === -1) {
      mediaSectionIdx = localSdpObject.media.length - 1;
    }
    offerMediaObject = localSdpObject.media[mediaSectionIdx];
    logger.debug('要检查M行: ', offerMediaObject)

    // Set RTCP CNAME.
    sendingRtpParameters.rtcp.cname =
      sdpCommonUtils.getCname({ offerMediaObject });

    // Set RTP encodings by parsing the SDP offer if no encodings are given.
    if (!encodings)
    {
      sendingRtpParameters.encodings =
        sdpUnifiedPlanUtils.getRtpEncodings({ offerMediaObject });
    }
    // Set RTP encodings by parsing the SDP offer and complete them with given
    // one if just a single encoding has been given.
    else if (encodings.length === 1)
    {
      let newEncodings =
        sdpUnifiedPlanUtils.getRtpEncodings({ offerMediaObject });

      Object.assign(newEncodings[0], encodings[0]);

      // Hack for VP9 SVC.
      // if (hackVp9Svc)
      //   newEncodings = [ newEncodings[0] ];

      sendingRtpParameters.encodings = newEncodings;
    }
    // Otherwise if more than 1 encoding are given use them verbatim.
    else
    {
      sendingRtpParameters.encodings = encodings;
    }

    // If VP8 or H264 and there is effective simulcast, add scalabilityMode to
    // each encoding.
    if (
      sendingRtpParameters.encodings.length > 1 &&
      (
        sendingRtpParameters.codecs[0].mimeType.toLowerCase() === 'video/vp8' ||
        sendingRtpParameters.codecs[0].mimeType.toLowerCase() === 'video/h264'
      )
    )
    {
      for (const encoding of sendingRtpParameters.encodings)
      {
        encoding.scalabilityMode = 'S1T3';
      }
    }
    
    /////
    localSdpObject.media.forEach(media => {
      if (media.type === 'audio' && media.ext && media.rtcpFb) {
        media.ext = media.ext.filter((item)=>{
          return item.uri.indexOf('transport-wide-cc') == -1 && item.uri.indexOf('abs-send-time') == -1
        })
        media.rtcpFb = media.rtcpFb.map((item)=>{
          item.type = item.type.replace(/transport-cc/g, 'nack')
          return item
        })
      }
    })
    offer.sdp = sdpTransform.write(localSdpObject)
    // Store in the map.  
    this._mapMidTransceiver.set(localId, transceiver);
    return {
      localId,
      rtpParameters: sendingRtpParameters,
      rtpSender: transceiver.sender,
      dtlsParameters: dtlsParameters,
      offer: offer
    };
  }
  
  
  async fillRemoteRecvSdp({ kind, iceParameters, iceCandidates, dtlsParameters, sctpParameters, sendingRtpParameters, codecOptions, offer,audioProfile, codec }:FillRemoteRecvSdpOptions) {
  //offer.sdp = offer.sdp.replace(/a=extmap:2 http:([0-9a-zA-Z=+-_\/\\\\]+)\r\n/, ``)  
  //offer.sdp = offer.sdp.replace(/a=extmap:3 http:([0-9a-zA-Z=+-_\/\\\\]+)\r\n/, ``)  
    logger.debug('fillRemoteRecvSdp() | calling pc.setLocalDescription()');
    await this._pc.setLocalDescription(offer);
    if (!this._remoteSdp) {
      this._remoteSdp = new RemoteSdp({
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters
      });
      this._remoteSdp.updateDtlsRole('client');
    }
    const sendingRemoteRtpParameters = utils.clone(this._sendingRemoteRtpParametersByKind[kind]);
    // This may throw.  
    sendingRemoteRtpParameters.codecs =
      reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
    let localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
    const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
    let offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
    this._remoteSdp.send({
        offerMediaObject,
        reuseMid            : mediaSectionIdx.reuseMid,
        offerRtpParameters  : sendingRtpParameters,
        answerRtpParameters : sendingRemoteRtpParameters,
        codecOptions,
        extmapAllowMixed    : true
      });

    const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
    logger.debug('audioProfile设置为: ', audioProfile)
    if (audioProfile) {
      let profile = null
      switch(audioProfile) {
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
          profile = 'stereo=1;sprop-stereo=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;maxaveragebitrate=56000'
          break
        case 'high_quality':
          //48 kHz 采样率，单声道， 编码码率约 128 Kbps  
          profile = 'maxplaybackrate=48000;sprop-maxcapturerate=48000;maxaveragebitrate=128000'
          break
        case 'high_quality_stereo':
          //48 kHz 采样率，双声道，编码码率约 192 Kbps  
          profile = 'stereo=1;sprop-stereo=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;maxaveragebitrate=192000'
          break
      }
      if (answer.sdp.indexOf('a=fmtp:111')) {
        //answer.sdp = answer.sdp.replace(/a=fmtp:111 ([0-9=;a-zA-Z]*)/, 'a=fmtp:111 $1;' + profile)  
        answer.sdp = answer.sdp.replace(/a=fmtp:111 ([0-9=;a-zA-Z]*)/, 'a=fmtp:111 minptime=10;useinbandfec=1;' + profile)
      }
      answer.sdp = answer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=maxptime:60`)
    }
    logger.debug('fillRemoteRecvSdp() | calling pc.setRemoteDescription() [answer]: ', answer.sdp);
    
    await this._pc.setRemoteDescription(answer);
  }

  async stopSending(localId: string, kind: 'audio'|'video'|'screenShare'): Promise<void>
  {
    this._assertSendDirection();

    logger.debug('stopSending() [localId:%s]', localId);

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }

    if (kind === 'audio') {
      this._pc.audioSender.replaceTrack(null);
      //this._remoteSdp.closeMediaSection('0');  
      //console.error('删除发送的audio track: ', this._pc.audioSender)  
    } else if (kind === 'video') {
      this._pc.videoSender.replaceTrack(null);
      //this._remoteSdp.closeMediaSection('1');  
      //console.error('删除发送的video track: ', this._pc.videoSender)  
    } else if (kind === 'screenShare') {
      this._pc.screenSender.replaceTrack(null);
    } else {
      transceiver.sender.replaceTrack(null);
      // this._pc.removeTrack(transceiver.sender);
      // this._remoteSdp!.closeMediaSection(transceiver.mid!);
    }

    const offer = await this._pc.createOffer();

    /////
    if (offer.sdp.indexOf(`a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#`) < 0) {
      offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-\/\\\\]+)/g, `a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#send`)
    }
    let localSdpObject = sdpTransform.parse(offer.sdp);
    localSdpObject.media.forEach(media => {
      if (media.type === 'audio' && media.ext && media.rtcpFb) {
        media.ext = media.ext.filter((item)=>{
          return item.uri.indexOf('transport-wide-cc') == -1 && item.uri.indexOf('abs-send-time') == -1
        })
        media.rtcpFb = media.rtcpFb.map((item)=>{
          item.type = item.type.replace(/transport-cc/g, 'nack')
          return item
        })
      }
    })
    offer.sdp = sdpTransform.write(localSdpObject)
    logger.debug('stopSending() | calling pc.setLocalDescription()');
    try {
      await this._pc.setLocalDescription(offer);
    }catch(error){
      logger.debug('setLocalDescription error = %o', error);
    }
    const answer = { type: 'answer', sdp: this._remoteSdp!.getSdp() };

    logger.debug(
      'stopSending() | calling pc.setRemoteDescription() [answer:%o]',
      answer);

    await this._pc.setRemoteDescription(answer);
  }

  async replaceTrack(
    localId: string, track: MediaStreamTrack | null
  ): Promise<void>
  {
    this._assertSendDirection();

    if (track)
    {
      logger.debug(
        'replaceTrack() [localId:%s, track.id:%s]', localId, track.id);
    }
    else
    {
      logger.debug('replaceTrack() [localId:%s, no track]', localId);
    }

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }

    await transceiver.sender.replaceTrack(track);
  }

  async setMaxSpatialLayer(localId: string, spatialLayer: number): Promise<void>
  {
    this._assertSendDirection();

    logger.debug(
      'setMaxSpatialLayer() [localId:%s, spatialLayer:%s]',
      localId, spatialLayer);

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }

    const parameters = transceiver.sender.getParameters();

    //@ts-ignore
    parameters.encodings.forEach((encoding: RTCRtpEncodingParameters, idx: number) =>
    {
      if (idx <= spatialLayer)
        encoding.active = true;
      else
        encoding.active = false;
    });

    await transceiver.sender.setParameters(parameters);
  }

  async setRtpEncodingParameters(localId: string, params: any): Promise<void>
  {
    this._assertSendDirection();

    logger.debug(
      'setRtpEncodingParameters() [localId:%s, params:%o]',
      localId, params);

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }

    const parameters:EnhancedRTCRtpParameters = transceiver.sender.getParameters();

    //@ts-ignore
    parameters.encodings.forEach((encoding: RTCRtpEncodingParameters, idx: number) =>
    {
      //@ts-ignore
      parameters.encodings[idx] = { ...encoding, ...params };
    });

    await transceiver.sender.setParameters(parameters);
  }

  async getSenderStats(localId: string): Promise<RTCStatsReport>
  {
    this._assertSendDirection();

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }

    return transceiver.sender.getStats();
  }

  //处理非200的consume response，将isUseless设置为true，因为该M行会被伪造  
  async recoverTransceiver(remoteUid: number|string, mid:string, kind: "video" | "audio") {
    logger.debug('recoverTransceiver() [kind:%s, remoteUid:%s, mid: %s]', kind, remoteUid, mid);
    const transceiver = this._mapMidTransceiver.get(mid);
    if (transceiver) {
      transceiver.isUseless = true
    } else {
      logger.debug('recoverTransceiver() transceiver undefined');
    }
    /*if (this._transportReady) {  
    this._transportReady = false  
    }*/
    return;
  }
  async prepareLocalSdp(kind: "video"|"audio", remoteUid: number|string) {
    logger.debug('prepareLocalSdp() [kind:%s, remoteUid:%s]', kind, remoteUid);
    let mid = -1
    for (const key of this._mapMidTransceiver.keys()) {
      const transceiver:EnhancedTransceiver|undefined = this._mapMidTransceiver.get(key)
      if (!transceiver){
        continue;
      }
      const mediaType = transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind || kind
      logger.debug('prepareLocalSdp() transceiver M行信息 [mid: %s, mediaType: %s, isUseless: %s]', transceiver.mid || key, mediaType, transceiver.isUseless);
      if (transceiver.isUseless && mediaType === kind) {
        //@ts-ignore
        mid = key - 0;
        transceiver.isUseless = false
        break;
      }
    }
    let offer = this._pc.localDescription;
    let transceiver = null
    if (true /*!offer || !offer.sdp || !offer.sdp.includes(`m=${kind}`)*/) {
      if (mid === -1) {
        logger.debug('prepareLocalSdp() 添加一个M行')
        transceiver = this._pc.addTransceiver(kind, { direction: "recvonly" });
        offer = await this._pc.createOffer();
        if (offer.sdp.indexOf(`a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#`) < 0) {
          offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#recv`)
          offer.sdp = offer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=rtcp-fb:111 transport-cc\r\na=rtcp-fb:111 nack`)
        }
        logger.debug('prepareLocalSdp() | calling pc.setLocalDescription()');
        await this._pc.setLocalDescription(offer);
      }
    }
    const localSdpObject = sdpTransform.parse(offer.sdp);
    let dtlsParameters = undefined;
    if (!this._transportReady)
      dtlsParameters = await this._setupTransport({ localDtlsRole: 'server', localSdpObject });
    const rtpCapabilities = sdpCommonUtils.extractRtpCapabilities({ sdpObject: localSdpObject });
    if (mid === -1) {
      mid = localSdpObject.media.length - 1
      this._mapMidTransceiver.set(`${mid}`, transceiver);
    }
    return { dtlsParameters, rtpCapabilities, offer, mid, iceUfragReg: '' };
  }

  async receive(
    { iceParameters, iceCandidates, dtlsParameters, sctpParameters, trackId, kind, rtpParameters, offer, probeSSrc=-1, remoteUid, extendedRtpCapabilities }: HandlerReceiveOptions
  ): Promise<HandlerReceiveResult>
  {
    this._assertRecvDirection();
    /////
    logger.debug('receive() [trackId: %s, kind: %s, remoteUid: %s]', trackId, kind, remoteUid);
    if (!this._remoteSdp) {
      this._remoteSdp = new RemoteSdp({
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters
      });
      this._remoteSdp.updateDtlsRole('client');
    }
    let reuseMid = null
    const localId = rtpParameters.mid
    logger.debug('处理对端的M行 mid: ', localId)
    if (!localId){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'No localId'
      })
    }
    const offerMediaSessionLength = this._pc.getTransceivers().length
//const answerMediaSessionLength = this._remoteSdp.getNextMediaSectionIdx().idx  
    const answerMediaSessionLength = this._remoteSdp._mediaSections.length + 1
    logger.debug(`offerMediaSessionLength: ${offerMediaSessionLength}，answerMediaSessionLength: ${answerMediaSessionLength}`)
    if (offerMediaSessionLength < answerMediaSessionLength) {
      /*let mid = -1  
      for (const transceiver of this._mapMidTransceiver.values()) {  
      const mediaType = transceiver.receiver.track && transceiver.receiver.track.kind || kind  
      logger.debug('prepareLocalSdp() transceiver M行信息 [mid: %s, mediaType: %s, isUseless: %s]', transceiver.mid, mediaType, transceiver.isUseless)  
      if (transceiver.isUseless && mediaType === kind) {  
      mid = transceiver.mid;  
      transceiver.isUseless = false  
      break;  
      }  
      }  
      if (mid === -1) {  
      logger.debug('prepareLocalSdp() 添加一个M行')  
      this._pc.addTransceiver(kind, { direction: "recvonly" });  
      }  
      offer = await this._pc.createOffer(); */
    } else if (offerMediaSessionLength > answerMediaSessionLength) {
      logger.debug('mediaSession 不匹配, 兼容处理')
      const missMediaSessions:{mid: any, kind: "video"|"audio"}[] = []
      const localSdpObject = sdpTransform.parse(offer.sdp)
      localSdpObject.media.forEach(media => {
        let isExist = false
        this._remoteSdp!._mediaSections.forEach(mediaSession => {
//这里使用隐式转换，因为_remoteSdp的mid格式是string，localSdpObject解析出来是的number类型  
          if (media.mid == mediaSession.mid) {
            isExist = true
            return
          }
        })
        if (!isExist) {
          // @ts-ignore
          missMediaSessions.push({mid: media.mid, kind: media.type})
        }
      })
      logger.debug('receive() 检索出来了缺失的media Session: ', missMediaSessions)
      missMediaSessions.forEach(item => {
        this._remoteSdp!.receive({
          mid: `${item.mid}`,
          kind: item.kind,
          offerRtpParameters: {
            codecs: extendedRtpCapabilities.codecs.filter((codec:any)=>{return codec.kind == item.kind}),
            encodings:[{ssrc: 0}],
            headerExtensions:[],
            rtcp:{},
            mid:`${item.mid}`
          }
        })
        this._remoteSdp!.disableMediaSection(`${item.mid}`)
      })
    }
    if (offer.sdp.indexOf(`a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#`) < 0) {
      offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#recv`)
      offer.sdp = offer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=rtcp-fb:111 transport-cc\r\na=rtcp-fb:111 nack`)
    }
    this._remoteSdp!.receive(
      {
        mid                : localId,
        kind,
        offerRtpParameters : rtpParameters,
        streamId           : rtpParameters.rtcp!.cname!,
        trackId,
        reuseMid,
      });

    const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
    logger.debug('receive() | calling pc.setRemoteDescription() [answer]: ', answer.sdp);
    if (this._pc.signalingState === 'stable') {
      await this._pc.setLocalDescription(offer);
      logger.debug('receive() | calling pc.setLocalDescription()');
    }
    await this._pc.setRemoteDescription(answer);
    const transceiver = this._pc.getTransceivers()
      .find((t: RTCRtpTransceiver) => t.mid === localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'new RTCRtpTransceiver not found'
      })
    }

    // Store in the map.
    this._mapMidTransceiver.set(localId, transceiver);

    return {
      localId,
      track       : transceiver.receiver.track,
      rtpReceiver : transceiver.receiver
    };
  }

  async stopReceiving(localId: string): Promise<void>
  {
    this._assertRecvDirection();

    logger.debug('stopReceiving() [localId:%s]', localId);

    const transceiver:EnhancedTransceiver|undefined = this._mapMidTransceiver.get(localId);

    if (!transceiver || !transceiver.mid){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }
    if (transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track && transceiver.receiver.track.kind === 'audio') {
    //audio的M行，删除ssrc，导致track终止，ssrc变更也会导致track终止  
    //处理策略：M行不复用，新增  
    } else {
      transceiver.isUseless = true
    }
    this._remoteSdp!.disableMediaSection(transceiver.mid)
    //const offer = await this._pc.createOffer();  
    /*  
    这里不使用createOffer的原因是：创建consumer的时候，prepareLocalSdp接口的使用在mediasoup.js中，该方法不受_awaitQueue队列控制，做不到完全的同步策略  
    */
    const offer = this._pc.localDescription
    if (offer.sdp.indexOf(`a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#`) < 0) {
      offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appData.cid}#${this._appData.uid}#recv`)
    }
    logger.debug('stopReceiving() | calling pc.setLocalDescription()');
    await this._pc.setLocalDescription(offer);
    const answer = { type: 'answer', sdp: this._remoteSdp!.getSdp() };
    logger.debug('stopReceiving() | calling pc.setRemoteDescription() [answer:%s]', answer.sdp);
    await this._pc.setRemoteDescription(answer);
  }

  async getReceiverStats(localId: string): Promise<RTCStatsReport>
  {
    this._assertRecvDirection();

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver){
      throw new RtcError({
        code: ErrorCode.NOT_FOUND,
        message: 'associated RTCRtpTransceiver not found'
      })
    }

    return transceiver.receiver.getStats();
  }

  private async _setupTransport(
    {
      localDtlsRole,
      localSdpObject
    }:
    {
      localDtlsRole: DtlsRole;
      localSdpObject?: any;
    }
  ): Promise<DtlsParameters>
  {
    if (!localSdpObject)
      localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);

    // Get our local DTLS parameters.
    const dtlsParameters =
      sdpCommonUtils.extractDtlsParameters({ sdpObject: localSdpObject });

    // Set our DTLS role.
    dtlsParameters.role = localDtlsRole;

    // Update the remote DTLS role in the SDP.
    // this._remoteSdp!.updateDtlsRole(
    //   localDtlsRole === 'client' ? 'server' : 'client');

    // Need to tell the remote transport about our parameters.
    // await this.safeEmitAsPromise('@connect', { dtlsParameters });

    this._transportReady = true;
    return dtlsParameters
  }

  private _assertSendDirection(): void
  {
    if (this._direction !== 'send')
    {
      throw new RtcError({
        code: ErrorCode.INVALID_OPERATION,
        message: 'method can just be called for handlers with "send" direction'
      })
    }
  }

  private _assertRecvDirection(): void
  {
    if (this._direction !== 'recv')
    {
      throw new RtcError({
        code: ErrorCode.INVALID_OPERATION,
        message: 'method can just be called for handlers with "recv" direction'
      })
    }
  }
}
