"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdpTransform = require("sdp-transform");
const Logger_1 = require("../Logger");
const utils = require("../utils");
const ortc = require("../ortc");
const sdpCommonUtils = require("./sdp/commonUtils");
const sdpUnifiedPlanUtils = require("./sdp/unifiedPlanUtils");
const HandlerInterface_1 = require("./HandlerInterface");
const RemoteSdp_1 = require("./sdp/RemoteSdp");
const scalabilityModes_1 = require("../scalabilityModes");
const logger = new Logger_1.Logger('Chrome74');
const SCTP_NUM_STREAMS = { OS: 1024, MIS: 1024 };
class Chrome74 extends HandlerInterface_1.HandlerInterface {
    constructor() {
        super();
        // Map of RTCTransceivers indexed by MID.
        this._mapMidTransceiver = new Map();
        // Local stream for sending.
        this._sendStream = new MediaStream();
        // Whether a DataChannel m=application section has been created.
        this._hasDataChannelMediaSection = false;
        // Sending DataChannel id value counter. Incremented for each new DataChannel.
        this._nextSendSctpStreamId = 0;
        // Got transport local and remote parameters.
        this._transportReady = false;
        this._appDate = null;
    }
    /**
     * Creates a factory function.
     */
    static createFactory() {
        return () => new Chrome74();
    }
    get name() {
        return 'Chrome74';
    }
    close() {
        logger.debug('close()');
        // Close RTCPeerConnection.
        if (this._pc) {
            try {
                this._pc.onconnectionstatechange = null
                this._pc.close();
            }
            catch (error) { }
        }
    }
    async getNativeRtpCapabilities() {
        logger.debug('getNativeRtpCapabilities()');
        const pc = new RTCPeerConnection({
            iceServers: [],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan'
        });
        try {
            pc.addTransceiver('audio');
            pc.addTransceiver('video');
            const offer = await pc.createOffer();
            offer.sdp = offer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=rtcp-fb:111 transport-cc\r\na=rtcp-fb:111 nack`)
            try {
                pc.close();
            }
            catch (error) { }
            const sdpObject = sdpTransform.parse(offer.sdp);
            const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({ sdpObject });
            return nativeRtpCapabilities;
        }
        catch (error) {
            try {
                pc.close();
            }
            catch (error2) { }
            throw error;
        }
    }
    async getNativeSctpCapabilities() {
        logger.debug('getNativeSctpCapabilities()');
        return {
            numStreams: SCTP_NUM_STREAMS
        };
    }
    run({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, extendedRtpCapabilities, appData }) {
        logger.debug('run(): %o', appData);
        this._appDate = appData
        this._direction = direction;
        // this._remoteSdp = new RemoteSdp(
        // 	{
        // 		iceParameters,
        // 		iceCandidates,
        // 		dtlsParameters,
        // 		sctpParameters
        // 	});
        this._sendingRtpParametersByKind =
            {
                audio: ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
                video: ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
            };
        this._sendingRemoteRtpParametersByKind =
            {
                audio: ortc.getSendingRemoteRtpParameters('audio', extendedRtpCapabilities),
                video: ortc.getSendingRemoteRtpParameters('video', extendedRtpCapabilities)
            };
        logger.debug('iceServers: %o', iceServers)
        this._pc = new RTCPeerConnection({
            iceServers: iceServers || [],
            iceTransportPolicy: iceTransportPolicy || 'all',
            //bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            //sdpSemantics: 'unified-plan',
            //...additionalSettings
        }, proprietaryConstraints);
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
        }
        this._pc.onicecandidate = (event) =>{
            //console.error('本地候选地址的收集: ', event.candidate)
        }
        /*this._pc.onconnectionstatechange = (event) =>{
            console.error('peer的状态: ', event)
        }*/

        this._pc.onicecandidateerror = (e) => {
            console.error('地址收集失败: ', e)
        }
    }
    async updateIceServers(iceServers) {
        logger.debug('updateIceServers()');
        const configuration = this._pc.getConfiguration();
        configuration.iceServers = iceServers;
        this._pc.setConfiguration(configuration);
    }
    async restartIce(iceParameters) {
        logger.debug('restartIce()');
        // Provide the remote SDP handler with new remote ICE parameters.
        this._remoteSdp.updateIceParameters(iceParameters);
        if (!this._transportReady)
            return;
        if (this._direction /*=== 'send'*/) {
            const offer = await this._pc.createOffer({ iceRestart: true });
            if (offer.sdp.indexOf(`a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#`) < 0) {
                offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#${this._direction}`)
            }
            let localSdpObject = sdpTransform.parse(offer.sdp);
            localSdpObject.media.forEach(media => {
                if (media.type === 'audio' && this._direction === 'send') {
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

            logger.debug('restartIce() | calling pc.setLocalDescription() [offer:%o]', offer);
            await this._pc.setLocalDescription(offer);
            const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
            logger.debug('restartIce() | calling pc.setRemoteDescription() [answer:%o]', answer);
            await this._pc.setRemoteDescription(answer);
        }
        else {
            const offer = { type: 'offer', sdp: this._remoteSdp.getSdp() };
            logger.debug('restartIce() | calling pc.setRemoteDescription() [offer:%o]', offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug('restartIce() | calling pc.setLocalDescription() [answer:%o]', answer);
            await this._pc.setLocalDescription(answer);
        }
    }
    async getTransportStats() {
        return this._pc.getStats();
    }
    async send({ track, encodings, codecOptions, codec }) {
        this._assertSendDirection();
        logger.debug('send() [kind:%s, track.id:%s encodings:%o]', track.kind, track.id, encodings);
        if (encodings && encodings.length > 1) {
            encodings.forEach((encoding, idx) => {
                encoding.rid = `r${idx}`;
            });
        }
        const sendingRtpParameters = utils.clone(this._sendingRtpParametersByKind[track.kind]);
        // This may throw.
        sendingRtpParameters.codecs =
            ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
        
        let mediaSectionIdx = undefined;
        let transceiver = {}
        if (track.kind === 'audio' && this._pc.audioSender) {
            logger.debug('audioSender更新track: ', this._pc.audioSender)
            this._pc.audioSender.replaceTrack(track)
            mediaSectionIdx = 0
        } else if (track.kind === 'video' && this._pc.videoSender) {
            logger.debug('videoSender更新track: ', this._pc.videoSender)
            this._pc.videoSender.replaceTrack(track)
            if (this._pc.audioSender) {
                mediaSectionIdx = 1
            } else {
                //没有开启mic或者mic开启失败
                mediaSectionIdx = 0
            }
        } else {
            let stream = new MediaStream();
            stream.addTrack(track)
            transceiver = this._pc.addTransceiver(track, {
                direction: 'sendonly',
                streams: [stream],
                sendEncodings: encodings
            });
        }
        if (track.kind === 'audio' && !this._pc.audioSender) {
            this._pc.audioSender = transceiver.sender
        } else if (track.kind === 'video' && !this._pc.videoSender) {
            this._pc.videoSender = transceiver.sender
        }

        logger.debug('send() | [transceivers:%d]', this._pc.getTransceivers().length);
        let offer = await this._pc.createOffer();
        if (offer.sdp.indexOf(`a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#`) < 0) {
            offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#send`)
        }

        let localSdpObject = sdpTransform.parse(offer.sdp);
        
        let dtlsParameters = undefined;
        if (!this._transportReady)
            dtlsParameters = await this._setupTransport({ localDtlsRole: 'server', localSdpObject });
        // We can now get the transceiver.mid.
        //console.error('看一下 生成的transceiver: ', transceiver)
        const localId = transceiver.mid;
        //console.error('localId： ', localId)
        // Set MID.
        sendingRtpParameters.mid = localId;
        if (mediaSectionIdx === undefined) {
            mediaSectionIdx = localSdpObject.media.length - 1;
        }
        const offerMediaObject = localSdpObject.media[mediaSectionIdx];
        logger.debug('要检查M行: ', offerMediaObject)
        // Set RTCP CNAME.
        sendingRtpParameters.rtcp.cname =
            sdpCommonUtils.getCname({ offerMediaObject });
        // Set RTP encodings by parsing the SDP offer if no encodings are given.
        if (!encodings) {
            sendingRtpParameters.encodings =
                sdpUnifiedPlanUtils.getRtpEncodings({ offerMediaObject });
        }
        // Set RTP encodings by parsing the SDP offer and complete them with given
        // one if just a single encoding has been given.
        else if (encodings.length === 1) {
            let newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({ offerMediaObject });
            Object.assign(newEncodings[0], encodings[0]);
            // // Hack for VP9 SVC.
            // if (hackVp9Svc)
            // 	newEncodings = [ newEncodings[0] ];
            sendingRtpParameters.encodings = newEncodings;
        }
        // Otherwise if more than 1 encoding are given use them verbatim.
        else {
            sendingRtpParameters.encodings = encodings;
        }
        // If VP8 or H264 and there is effective simulcast, add scalabilityMode to
        // each encoding.
        if (sendingRtpParameters.encodings.length > 1 &&
            (sendingRtpParameters.codecs[0].mimeType.toLowerCase() === 'video/vp8' ||
                sendingRtpParameters.codecs[0].mimeType.toLowerCase() === 'video/h264')) {
            for (const encoding of sendingRtpParameters.encodings) {
                encoding.scalabilityMode = 'S1T3';
            }
        }
        localSdpObject.media.forEach(media => {
            if (media.type === 'audio') {
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

    async fillRemoteRecvSdp({ kind, iceParameters, iceCandidates, dtlsParameters, sctpParameters, sendingRtpParameters, codecOptions, offer,audioProfile }) {
        //offer.sdp = offer.sdp.replace(/a=extmap:2 http:([0-9a-zA-Z=+-_\/\\\\]+)\r\n/, ``)
        //offer.sdp = offer.sdp.replace(/a=extmap:3 http:([0-9a-zA-Z=+-_\/\\\\]+)\r\n/, ``)
        logger.debug('fillRemoteRecvSdp() | calling pc.setLocalDescription() [offer:%o]', offer.sdp);
        await this._pc.setLocalDescription(offer);
        if (!this._remoteSdp) {
            this._remoteSdp = new RemoteSdp_1.RemoteSdp({
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
            ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, undefined);
        let localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
        const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
        let offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];

        this._remoteSdp.send({
            offerMediaObject,
            reuseMid: mediaSectionIdx.reuseMid,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions,
            extmapAllowMixed: true
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
        logger.debug('fillRemoteRecvSdp() | calling pc.setRemoteDescription() [answer:%o]', answer.sdp);
        await this._pc.setRemoteDescription(answer);
    }

    async stopSending(localId, kind) {
        this._assertSendDirection();
        logger.debug('stopSending() [localId:%s]', localId);
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        
        if (kind === 'audio') {
            this._pc.audioSender.replaceTrack(null);
            //this._remoteSdp.closeMediaSection('0');
            //console.error('删除发送的audio track: ', this._pc.audioSender)
        } else if (kind === 'video') {
            this._pc.videoSender.replaceTrack(null);
            //this._remoteSdp.closeMediaSection('1');
            //console.error('删除发送的video track: ', this._pc.videoSender)
        } else {
            transceiver.sender.replaceTrack(null);
        }
        //transceiver.sender.replaceTrack(null);
        //this._pc.removeTrack(transceiver.sender);
        //this._remoteSdp.closeMediaSection(transceiver.mid);
        //transceiver.stop && transceiver.stop();
        const offer = await this._pc.createOffer();
        if (offer.sdp.indexOf(`a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#`) < 0) {
            offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-\/\\\\]+)/g, `a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#send`)
        }

        let localSdpObject = sdpTransform.parse(offer.sdp);
        localSdpObject.media.forEach(media => {
            if (media.type === 'audio') {
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

        logger.debug('stopSending() | calling pc.setLocalDescription() [offer:%s]', offer.sdp);
        try {
            await this._pc.setLocalDescription(offer);
        }
        catch (error) {
            logger.debug('setLocalDescription error = %o', error);
        }
        const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
        logger.debug('stopSending() | calling pc.setRemoteDescription() [answer:%s]', answer.sdp);
        await this._pc.setRemoteDescription(answer);
    }
    async replaceTrack(localId, track) {
        this._assertSendDirection();
        if (track) {
            logger.debug('replaceTrack() [localId:%s, track.id:%s]', localId, track.id);
        }
        else {
            logger.debug('replaceTrack() [localId:%s, no track]', localId);
        }
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        await transceiver.sender.replaceTrack(track);
    }
    async setMaxSpatialLayer(localId, spatialLayer) {
        this._assertSendDirection();
        logger.debug('setMaxSpatialLayer() [localId:%s, spatialLayer:%s]', localId, spatialLayer);
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        const parameters = transceiver.sender.getParameters();
        parameters.encodings.forEach((encoding, idx) => {
            if (idx <= spatialLayer)
                encoding.active = true;
            else
                encoding.active = false;
        });
        await transceiver.sender.setParameters(parameters);
    }
    async setRtpEncodingParameters(localId, params) {
        this._assertSendDirection();
        logger.debug('setRtpEncodingParameters() [localId:%s, params:%o]', localId, params);
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        const parameters = transceiver.sender.getParameters();
        parameters.encodings.forEach((encoding, idx) => {
            parameters.encodings[idx] = { ...encoding, ...params };
        });
        await transceiver.sender.setParameters(parameters);
    }
    async getSenderStats(localId) {
        this._assertSendDirection();
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        return transceiver.sender.getStats();
    }
    async sendDataChannel({ ordered, maxPacketLifeTime, maxRetransmits, label, protocol, priority }) {
        this._assertSendDirection();
        const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol,
            priority
        };
        logger.debug('sendDataChannel() [options:%o]', options);
        const dataChannel = this._pc.createDataChannel(label, options);
        // Increase next id.
        this._nextSendSctpStreamId =
            ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
        // If this is the first DataChannel we need to create the SDP answer with
        // m=application section.
        if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media
                .find((m) => m.type === 'application');
            if (!this._transportReady)
                await this._setupTransport({ localDtlsRole: 'server', localSdpObject });
            logger.debug('sendDataChannel() | calling pc.setLocalDescription() [offer:%o]', offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
            logger.debug('sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]', answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
        }
        const sctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits
        };
        return { dataChannel, sctpStreamParameters };
    }

    async prepareLocalSdp(kind) {
        logger.debug('prepareLocalSdp() [kind:%s]', kind);
        let mid = -1
        for (const transceiver of this._mapMidTransceiver.values()) {
            logger.debug('transceiver M行信息: %o', transceiver)
            const mediaType = transceiver.receiver.track && transceiver.receiver.track.kind || kind
            logger.debug('mediaType: ', mediaType)
            if (transceiver.isUseless && mediaType === kind) {
                mid = transceiver.mid;
                transceiver.isUseless = false
                break;
            }
        }

        if (mid === -1) {
            logger.debug('添加一个M行')
            this._pc.addTransceiver(kind, { direction: "recvonly" });
        } 
        
        let offer = await this._pc.createOffer();
        if (offer.sdp.indexOf(`a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#`) < 0) {
            offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#recv`)
            offer.sdp = offer.sdp.replace(/a=rtcp-fb:111 transport-cc/g, `a=rtcp-fb:111 transport-cc\r\na=rtcp-fb:111 nack`)
        }
        const localSdpObject = sdpTransform.parse(offer.sdp);
        let dtlsParameters = undefined;
        if (!this._transportReady)
            dtlsParameters = await this._setupTransport({ localDtlsRole: 'server', localSdpObject });
        const rtpCapabilities = sdpCommonUtils.extractRtpCapabilities({ sdpObject: localSdpObject });

        /*if (mid === -1) {
            mid = localSdpObject.media.length - 1
        } */
        return { dtlsParameters, rtpCapabilities, offer, mid };
    }

    async receive({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, trackId, kind, rtpParameters, offer, probeSSrc=-1 }) {
        this._assertRecvDirection();
        logger.debug('receive() | calling pc.setLocalDescription() [offer:%o]', offer.sdp);
        await this._pc.setLocalDescription(offer);
        logger.debug('receive() [trackId:%s, kind:%s]', trackId, kind);
        if (!this._remoteSdp) {
            this._remoteSdp = new RemoteSdp_1.RemoteSdp({
                iceParameters,
                iceCandidates,
                dtlsParameters,
                sctpParameters
            });
            this._remoteSdp.updateDtlsRole('client');
        }
        
        //let localId = String(this._mapMidTransceiver.size);
        let reuseMid = null
        const localId = rtpParameters.mid
        logger.debug('处理对端的M行 localId: ', localId)
        this._remoteSdp.receive({
            mid: rtpParameters.mid,
            kind,
            offerRtpParameters: rtpParameters,
            streamId: rtpParameters.rtcp.cname,
            trackId,
            reuseMid,
        });
        if (probeSSrc === 0) {
            this._remoteSdp.disableMediaSection(localId)
        }
        const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
        logger.debug('receive() | calling pc.setRemoteDescription() [answer:%o]', answer.sdp);
        await this._pc.setRemoteDescription(answer);
        const transceiver = this._pc.getTransceivers()
            .find((t) => t.mid === localId);
        if (!transceiver)
            throw new Error('new RTCRtpTransceiver not found');
        if (probeSSrc === 0) {
            logger.debug('伪造的M行是无用的，标记')
            transceiver.isUseless = true
        }
        // Store in the map.
        this._mapMidTransceiver.set(localId, transceiver);
        return {
            localId,
            track: transceiver.receiver.track,
            rtpReceiver: transceiver.receiver
        };
    }
    async stopReceiving(localId) {
        this._assertRecvDirection();
        logger.debug('stopReceiving() [localId:%s]', localId);
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        if (transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track && transceiver.receiver.track.kind === 'audio') {
            //audio的M行，删除ssrc，导致track终止，ssrc变更也会导致track终止
            //处理策略：M行不复用，新增
        } else {
            transceiver.isUseless = true
        }
        this._remoteSdp.disableMediaSection(transceiver.mid)
        //const offer = await this._pc.createOffer();
        /*
        这里不使用createOffer的原因是：创建consumer的时候，prepareLocalSdp接口的使用在mediasoup.js中，该方法不受_awaitQueue队列控制，做不到完全的同步策略
         */
        const offer = this._pc.localDescription
        if (offer.sdp.indexOf(`a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#`) < 0) {
            offer.sdp = offer.sdp.replace(/a=ice-ufrag:([0-9a-zA-Z=+-_\/\\\\]+)/g, `a=ice-ufrag:${this._appDate.cid}#${this._appDate.uid}#recv`)
        }
        logger.debug('stopReceiving() | calling pc.setLocalDescription() [offer:%o]', offer.sdp);
        await this._pc.setLocalDescription(offer);
        
        const answer = { type: 'answer', sdp: this._remoteSdp.getSdp() };
        logger.debug('stopReceiving() | calling pc.setRemoteDescription() [answer:%o]', answer.sdp);
        await this._pc.setRemoteDescription(answer);

    }
    async getReceiverStats(localId) {
        this._assertRecvDirection();
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error('associated RTCRtpTransceiver not found');
        return transceiver.receiver.getStats();
    }
    async receiveDataChannel({ sctpStreamParameters, label, protocol }) {
        this._assertRecvDirection();
        const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
        const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol
        };
        logger.debug('receiveDataChannel() [options:%o]', options);
        const dataChannel = this._pc.createDataChannel(label, options);
        // If this is the first DataChannel we need to create the SDP offer with
        // m=application section.
        if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = { type: 'offer', sdp: this._remoteSdp.getSdp() };
            logger.debug('receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]', offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            if (!this._transportReady) {
                const localSdpObject = sdpTransform.parse(answer.sdp);
                await this._setupTransport({ localDtlsRole: 'client', localSdpObject });
            }
            logger.debug('receiveDataChannel() | calling pc.setRemoteDescription() [answer:%o]', answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
        }
        return { dataChannel };
    }
    async _setupTransport({ localDtlsRole, localSdpObject }) {
        if (!localSdpObject)
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
        // Get our local DTLS parameters.
        const dtlsParameters = sdpCommonUtils.extractDtlsParameters({ sdpObject: localSdpObject });
        // Set our DTLS role.
        dtlsParameters.role = localDtlsRole;
        // Update the remote DTLS role in the SDP.
        // this._remoteSdp!.updateDtlsRole(
        // 	localDtlsRole === 'client' ? 'server' : 'client');
        // Need to tell the remote transport about our parameters.
        // await this.safeEmitAsPromise('@connect', { dtlsParameters });
        this._transportReady = true;
        return dtlsParameters;
    }
    _assertSendDirection() {
        if (this._direction !== 'send') {
            throw new Error('method can just be called for handlers with "send" direction');
        }
    }
    _assertRecvDirection() {
        if (this._direction !== 'recv') {
            throw new Error('method can just be called for handlers with "recv" direction');
        }
    }
}
exports.Chrome74 = Chrome74;
