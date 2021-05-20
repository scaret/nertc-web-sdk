"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const awaitqueue_1 = require("awaitqueue");
const Logger_1 = require("./Logger");
const EnhancedEventEmitter_1 = require("./EnhancedEventEmitter");
const errors_1 = require("./errors");
const utils = require("./utils");
const ortc = require("./ortc");
const Producer_1 = require("./Producer");
const Consumer_1 = require("./Consumer");
const DataProducer_1 = require("./DataProducer");
const DataConsumer_1 = require("./DataConsumer");
const logger = new Logger_1.Logger('Transport');
class Transport extends EnhancedEventEmitter_1.EnhancedEventEmitter {
    /**
     * @emits connect - (transportLocalParameters: any, callback: Function, errback: Function)
     * @emits connectionstatechange - (connectionState: ConnectionState)
     * @emits produce - (producerLocalParameters: any, callback: Function, errback: Function)
     * @emits producedata - (dataProducerLocalParameters: any, callback: Function, errback: Function)
     */
    constructor({ direction, id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, appData, handlerFactory, extendedRtpCapabilities, canProduceByKind }) {
        super();
        // Closed flag.
        this._closed = false;
        // Transport connection state.
        this._connectionState = 'new';
        // Map of Producers indexed by id.
        this._producers = new Map();
        // Map of Consumers indexed by id.
        this._consumers = new Map();
        // Map of DataProducers indexed by id.
        this._dataProducers = new Map();
        // Map of DataConsumers indexed by id.
        this._dataConsumers = new Map();
        // Whether the Consumer for RTP probation has been created.
        this._probatorConsumerCreated = false;
        // AwaitQueue instance to make async tasks happen sequentially.
        this._awaitQueue = new awaitqueue_1.AwaitQueue({ ClosedErrorClass: errors_1.InvalidStateError });
        logger.debug('constructor() [id:%s, direction:%s]', id, direction);
        this._id = id;
        this._direction = direction;
        this._extendedRtpCapabilities = extendedRtpCapabilities;
        this._canProduceByKind = canProduceByKind;
        this._maxSctpMessageSize =
            sctpParameters ? sctpParameters.maxMessageSize : null;
        // Clone and sanitize additionalSettings.
        additionalSettings = utils.clone(additionalSettings);
        delete additionalSettings.iceServers;
        delete additionalSettings.iceTransportPolicy;
        delete additionalSettings.bundlePolicy;
        delete additionalSettings.rtcpMuxPolicy;
        delete additionalSettings.sdpSemantics;
        this._handler = handlerFactory();
        this._handler.run({
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
            appData
        });
        this._appData = appData;
        this._handleHandler();
    }
    /**
     * Transport id.
     */
    get id() {
        return this._id;
    }
    set id(id) {
        this._id = id;
    }
    /**
     * Whether the Transport is closed.
     */
    get closed() {
        return this._closed;
    }
    /**
     * Transport direction.
     */
    get direction() {
        return this._direction;
    }
    /**
     * RTC handler instance.
     */
    get handler() {
        return this._handler;
    }
    /**
     * Connection state.
     */
    get connectionState() {
        return this._connectionState;
    }
    /**
     * App custom data.
     */
    get appData() {
        return this._appData;
    }
    /**
     * Invalid setter.
     */
    set appData(appData) {
        throw new Error('cannot override appData object');
    }
    /**
     * Close the Transport.
     */
    close() {
        if (this._closed)
            return;
        logger.debug('close()');
        this._closed = true;
        // Close the AwaitQueue.
        this._awaitQueue.close();
        // Close the handler.
        this._handler.close();
        // Close all Producers.
        for (const producer of this._producers.values()) {
            producer.transportClosed();
        }
        this._producers.clear();
        // Close all Consumers.
        for (const consumer of this._consumers.values()) {
            consumer.transportClosed();
        }
        this._consumers.clear();
        // Close all DataProducers.
        for (const dataProducer of this._dataProducers.values()) {
            dataProducer.transportClosed();
        }
        this._dataProducers.clear();
        // Close all DataConsumers.
        for (const dataConsumer of this._dataConsumers.values()) {
            dataConsumer.transportClosed();
        }
        this._dataConsumers.clear();
    }
    /**
     * Get associated Transport (RTCPeerConnection) stats.
     *
     * @returns {RTCStatsReport}
     */
    async getStats() {
        if (this._closed)
            throw new errors_1.InvalidStateError('closed');
        return this._handler.getTransportStats();
    }
    /**
     * Restart ICE connection.
     */
    async restartIce({ iceParameters }) {
        logger.debug('restartIce()');
        if (this._closed)
            throw new errors_1.InvalidStateError('closed');
        else if (!iceParameters)
            throw new TypeError('missing iceParameters');
        // Enqueue command.
        return this._awaitQueue.push(async () => this._handler.restartIce(iceParameters));
    }
    /**
     * Update ICE servers.
     */
    async updateIceServers({ iceServers } = {}) {
        logger.debug('updateIceServers()');
        if (this._closed)
            throw new errors_1.InvalidStateError('closed');
        else if (!Array.isArray(iceServers))
            throw new TypeError('missing iceServers');
        // Enqueue command.
        return this._awaitQueue.push(async () => this._handler.updateIceServers(iceServers));
    }
    /**
     * Create a Producer.
     */
    async produce({ track, encodings, codecOptions, codec, stopTracks = true, disableTrackOnPause = true, zeroRtpOnPause = false, appData = {} } = {}) {
        logger.debug('produce() [track:%o]', track);
        if (!track)
            throw new TypeError('missing track');
        else if (this._direction !== 'send')
            throw new errors_1.UnsupportedError('not a sending Transport');
        else if (!this._canProduceByKind[track.kind])
            throw new errors_1.UnsupportedError(`cannot produce ${track.kind}`);
        else if (track.readyState === 'ended')
            throw new errors_1.InvalidStateError('track ended');
        else if (this.listenerCount('produce') === 0)
            throw new TypeError('no "produce" listener set into this transport');
        else if (appData && typeof appData !== 'object')
            throw new TypeError('if given, appData must be an object');
        // Enqueue command.
        return this._awaitQueue.push(async () => {
            let normalizedEncodings;
            if (encodings && !Array.isArray(encodings)) {
                throw TypeError('encodings must be an array');
            }
            else if (encodings && encodings.length === 0) {
                normalizedEncodings = undefined;
            }
            else if (encodings) {
                normalizedEncodings = encodings
                    .map((encoding) => {
                    const normalizedEncoding = { active: true };
                    if (encoding.active === false)
                        normalizedEncoding.active = false;
                    if (typeof encoding.dtx === 'boolean')
                        normalizedEncoding.dtx = encoding.dtx;
                    if (typeof encoding.scalabilityMode === 'string')
                        normalizedEncoding.scalabilityMode = encoding.scalabilityMode;
                    if (typeof encoding.scaleResolutionDownBy === 'number')
                        normalizedEncoding.scaleResolutionDownBy = encoding.scaleResolutionDownBy;
                    if (typeof encoding.maxBitrate === 'number')
                        normalizedEncoding.maxBitrate = encoding.maxBitrate;
                    if (typeof encoding.maxFramerate === 'number')
                        normalizedEncoding.maxFramerate = encoding.maxFramerate;
                    if (typeof encoding.adaptivePtime === 'boolean')
                        normalizedEncoding.adaptivePtime = encoding.adaptivePtime;
                    if (typeof encoding.priority === 'string')
                        normalizedEncoding.priority = encoding.priority;
                    if (typeof encoding.networkPriority === 'string')
                        normalizedEncoding.networkPriority = encoding.networkPriority;
                    return normalizedEncoding;
                });
            }
            const { localId, rtpParameters, rtpSender, dtlsParameters, offer } = await this._handler.send({
                track,
                encodings: normalizedEncodings,
                codecOptions,
                appData,
                codec
            });
            try {
                // This will fill rtpParameters's missing fields with default values.
                ortc.validateRtpParameters(rtpParameters);
                const { id } = await this.safeEmitAsPromise('produce', {
                    kind: track.kind,
                    rtpParameters,
                    appData,
                    localDtlsParameters: dtlsParameters,
                    offer
                });
                const producer = new Producer_1.Producer({
                    id,
                    localId,
                    rtpSender,
                    track,
                    rtpParameters,
                    stopTracks,
                    disableTrackOnPause,
                    zeroRtpOnPause,
                    appData
                });
                this._producers.set(producer.id, producer);
                this._handleProducer(producer);
                return producer;
            }
            catch (error) {
                logger.error('produce error: ', error)
                this._handler.stopSending(localId)
                    .catch(() => { });
                throw error;
            }
        })
            // This catch is needed to stop the given track if the command above
            // failed due to closed Transport.
            .catch((error) => {
            logger.error('closed produce error: ', error)
            if (stopTracks) {
                try {
                    track.stop();
                }
                catch (error2) { }
            }
            throw error;
        });
    }
    async fillRemoteRecvSdp({ kind, appData, iceParameters, iceCandidates, dtlsParameters, sctpParameters, sendingRtpParameters, codecOptions, offer, audioProfile, codec}) {
        await this._handler.fillRemoteRecvSdp({
            kind,
            appData,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            sendingRtpParameters,
            codecOptions,
            offer,
            codec,
            audioProfile
        });
    }
    async prepareLocalSdp(kind, edgeRtpCapabilities, uid) {
        try {
            const { dtlsParameters, rtpCapabilities, offer, mid, iceUfragReg } = await this._handler.prepareLocalSdp(kind, uid);
            if (!this._recvRtpCapabilities ||
                !ortc.canSend('audio', this._recvRtpCapabilities) ||
                !ortc.canSend('video', this._recvRtpCapabilities)) {
                let extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(rtpCapabilities, edgeRtpCapabilities);
                // Generate our receiving RTP capabilities for receiving media.
                this._recvRtpCapabilities =
                    ortc.getRecvRtpCapabilities(extendedRtpCapabilities);
                // This may throw.
                ortc.validateRtpCapabilities(this._recvRtpCapabilities);
            }
            return { dtlsParameters, rtpCapabilities: this._recvRtpCapabilities, offer, mid, iceUfragReg };
        }
        catch (error) {
            throw error;
        }
    }

    async recoverLocalSdp(remoteUid, mid, kind) {
        try {
            await this._handler.recoverTransceiver(remoteUid, mid, kind);
            return;
        }
        catch (error) {
            throw error;
        }
    }

    

    async prepareMid (kind, edgeRtpCapabilities, uid) {
        try {

            if (!this._recvRtpCapabilities ||
                !ortc.canSend('audio', this._recvRtpCapabilities) ||
                !ortc.canSend('video', this._recvRtpCapabilities)) {

                const { dtlsParameters, rtpCapabilities, offer, mid } = await this._handler.prepareLocalSdp(kind, uid);

                let extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(rtpCapabilities, edgeRtpCapabilities);
                // Generate our receiving RTP capabilities for receiving media.
                this._recvRtpCapabilities =
                    ortc.getRecvRtpCapabilities(extendedRtpCapabilities);
                // This may throw.
                ortc.validateRtpCapabilities(this._recvRtpCapabilities);
                return { dtlsParameters, rtpCapabilities: this._recvRtpCapabilities, offer, mid };
            } else {
                const { dtlsParameters, rtpCapabilities } = await this._handler.prepareLocalSdp(kind, uid);
                const { mid } = await this._handler.prepareMid(kind, uid);
                return { dtlsParameters, rtpCapabilities: this._recvRtpCapabilities, offer, mid };
            }
            
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * Create a Consumer to consume a remote Producer.
     */
    async consume({ id, producerId, kind, rtpParameters, appData = {}, offer, iceParameters, iceCandidates, dtlsParameters, sctpParameters, probeSSrc }) {
        logger.debug('consume()');
        if (this._closed)
            throw new errors_1.InvalidStateError('closed');
        else if (this._direction !== 'recv')
            throw new errors_1.UnsupportedError('not a receiving Transport');
        else if (typeof id !== 'string')
            throw new TypeError('missing id');
        else if (typeof producerId !== 'string')
            throw new TypeError('missing producerId');
        else if (kind !== 'audio' && kind !== 'video')
            throw new TypeError(`invalid kind '${kind}'`);
        else if (appData && typeof appData !== 'object')
            throw new TypeError('if given, appData must be an object');
        // Enqueue command.
        return this._awaitQueue.push(async () => {
            // Ensure the device can consume it.
            const canConsume = ortc.canReceive(rtpParameters, this._extendedRtpCapabilities);
            // 屏蔽canConsume的两个原因：
            // 1. 本地的extendedRtpCapabilities是来自编码而非解码的，这会导致某些能解的情况下这里报错。
            // 2. Native经常会不遵守声明的codec
            // if (!canConsume)
            //     throw new errors_1.UnsupportedError('cannot consume this Producer');
            const { localId, rtpReceiver, track } = await this._handler.receive({ iceParameters, iceCandidates, dtlsParameters, sctpParameters,
                trackId: id, kind, rtpParameters, offer, probeSSrc, remoteUid: appData.remoteUid});
            const consumer = new Consumer_1.Consumer({
                id,
                localId,
                producerId,
                rtpReceiver,
                track,
                rtpParameters,
                appData
            });
            this._consumers.set(consumer.id, consumer);
            this._handleConsumer(consumer);
            // If this is the first video Consumer and the Consumer for RTP probation
            // has not yet been created, create it now.
            if (0) 
            // if (!this._probatorConsumerCreated && kind === 'video')
            {
                try {
                    const probatorRtpParameters = ortc.generateProbatorRtpParameters(consumer.rtpParameters, probeSSrc);
                    logger.warn('chence probatorRtpParameters = %o', probatorRtpParameters);
                    const { offer } = await this._handler.prepareLocalSdp(kind);
                    await this._handler.receive({
                        trackId: 'probator',
                        kind: 'video',
                        rtpParameters: probatorRtpParameters,
                        offer
                    });
                    logger.debug('consume() | Consumer for RTP probation created');
                    this._probatorConsumerCreated = true;
                }
                catch (error) {
                    logger.error('consume() | failed to create Consumer for RTP probation:%o', error);
                }
            }
            return consumer;
        });
    }
    /**
     * Create a DataProducer
     */
    async produceData({ ordered = true, maxPacketLifeTime, maxRetransmits, priority = 'low', label = '', protocol = '', appData = {} } = {}) {
        logger.debug('produceData()');
        if (this._direction !== 'send')
            throw new errors_1.UnsupportedError('not a sending Transport');
        else if (!this._maxSctpMessageSize)
            throw new errors_1.UnsupportedError('SCTP not enabled by remote Transport');
        else if (!['very-low', 'low', 'medium', 'high'].includes(priority))
            throw new TypeError('wrong priority');
        else if (this.listenerCount('connect') === 0 && this._connectionState === 'new')
            throw new TypeError('no "connect" listener set into this transport');
        else if (this.listenerCount('producedata') === 0)
            throw new TypeError('no "producedata" listener set into this transport');
        else if (appData && typeof appData !== 'object')
            throw new TypeError('if given, appData must be an object');
        if (maxPacketLifeTime || maxRetransmits)
            ordered = false;
        // Enqueue command.
        return this._awaitQueue.push(async () => {
            const { dataChannel, sctpStreamParameters } = await this._handler.sendDataChannel({
                ordered,
                maxPacketLifeTime,
                maxRetransmits,
                priority,
                label,
                protocol
            });
            // This will fill sctpStreamParameters's missing fields with default values.
            ortc.validateSctpStreamParameters(sctpStreamParameters);
            const { id } = await this.safeEmitAsPromise('producedata', {
                sctpStreamParameters,
                label,
                protocol,
                appData
            });
            const dataProducer = new DataProducer_1.DataProducer({ id, dataChannel, sctpStreamParameters, appData });
            this._dataProducers.set(dataProducer.id, dataProducer);
            this._handleDataProducer(dataProducer);
            return dataProducer;
        });
    }
    /**
     * Create a DataConsumer
     */
    async consumeData({ id, dataProducerId, sctpStreamParameters, label = '', protocol = '', appData = {} }) {
        logger.debug('consumeData()');
        if (this._closed)
            throw new errors_1.InvalidStateError('closed');
        else if (this._direction !== 'recv')
            throw new errors_1.UnsupportedError('not a receiving Transport');
        else if (!this._maxSctpMessageSize)
            throw new errors_1.UnsupportedError('SCTP not enabled by remote Transport');
        else if (typeof id !== 'string')
            throw new TypeError('missing id');
        else if (typeof dataProducerId !== 'string')
            throw new TypeError('missing dataProducerId');
        else if (this.listenerCount('connect') === 0 && this._connectionState === 'new')
            throw new TypeError('no "connect" listener set into this transport');
        else if (appData && typeof appData !== 'object')
            throw new TypeError('if given, appData must be an object');
        // This may throw.
        ortc.validateSctpStreamParameters(sctpStreamParameters);
        // Enqueue command.
        return this._awaitQueue.push(async () => {
            const { dataChannel } = await this._handler.receiveDataChannel({
                sctpStreamParameters,
                label,
                protocol
            });
            const dataConsumer = new DataConsumer_1.DataConsumer({
                id,
                dataProducerId,
                dataChannel,
                sctpStreamParameters,
                appData
            });
            this._dataConsumers.set(dataConsumer.id, dataConsumer);
            this._handleDataConsumer(dataConsumer);
            return dataConsumer;
        });
    }
    _handleHandler() {
        const handler = this._handler;
        handler.on('@connect', ({ dtlsParameters }, callback, errback) => {
            if (this._closed) {
                errback(new errors_1.InvalidStateError('closed'));
                return;
            }
            this.safeEmit('connect', { dtlsParameters }, callback, errback);
        });
        handler.on('@connectionstatechange', (connectionState) => {
            if (connectionState === this._connectionState)
                return;
            logger.debug('connection state changed to %s', connectionState);
            this._connectionState = connectionState;
            if (!this._closed)
                this.safeEmit('connectionstatechange', connectionState);
        });
    }
    _handleProducer(producer) {
        producer.on('@close', () => {
            //this._producers.delete(producer.id);
            if (this._closed)
                return;
            logger.warn('producer 关闭: ', producer.localId)
            this._awaitQueue.push(async () => this._handler.stopSending(producer.localId, producer.appData.mediaType))
                .catch((error) => logger.warn('producer.close() failed:%o', error));
        });
        producer.on('@replacetrack', (track, callback, errback) => {
            this._awaitQueue.push(async () => this._handler.replaceTrack(producer.localId, track))
                .then(callback)
                .catch(errback);
        });
        producer.on('@setmaxspatiallayer', (spatialLayer, callback, errback) => {
            this._awaitQueue.push(async () => (this._handler.setMaxSpatialLayer(producer.localId, spatialLayer)))
                .then(callback)
                .catch(errback);
        });
        producer.on('@setrtpencodingparameters', (params, callback, errback) => {
            this._awaitQueue.push(async () => (this._handler.setRtpEncodingParameters(producer.localId, params)))
                .then(callback)
                .catch(errback);
        });
        producer.on('@getstats', (callback, errback) => {
            if (this._closed)
                return errback(new errors_1.InvalidStateError('closed'));
            this._handler.getSenderStats(producer.localId)
                .then(callback)
                .catch(errback);
        });
    }
    _handleConsumer(consumer) {
        consumer.on('@close', () => {
            logger.debug('consumer closed: %s', consumer.id);
            this._consumers.delete(consumer.id);
            if (this._closed)
                return;
            this._awaitQueue.push(async () => { 
                await this._handler.stopReceiving(consumer.localId)
            }).catch(() => { });
        });
        consumer.on('@getstats', (callback, errback) => {
            if (this._closed)
                return errback(new errors_1.InvalidStateError('closed'));
            this._handler.getReceiverStats(consumer.localId)
                .then(callback)
                .catch(errback);
        });
    }
    _handleDataProducer(dataProducer) {
        dataProducer.on('@close', () => {
            this._dataProducers.delete(dataProducer.id);
        });
    }
    _handleDataConsumer(dataConsumer) {
        dataConsumer.on('@close', () => {
            this._dataConsumers.delete(dataConsumer.id);
        });
    }
}
exports.Transport = Transport;
