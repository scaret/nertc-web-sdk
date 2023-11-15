import { AdapterRef, FormativeStatsReportOptions, PacketLostData } from '../../types'
import ErrorCode from '../../util/error/errorCode'
import RtcError from '../../util/error/rtcError'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import { getBrowserInfo, getOSInfo } from '../../util/rtcUtil/rtcPlatform'

class FormativeStatsReport {
  private adapterRef: AdapterRef
  public firstData: {
    recvFirstData: {
      [uid: string]: {
        recvFirstAudioFrame: boolean
        recvFirstVideoFrame: boolean
        recvFirstScreenFrame: boolean
        recvFirstAudioPackage: boolean
        recvFirstVideoPackage: boolean
        recvFirstScreenPackage: boolean
      }
    }
    sendFirstAudioPackage: boolean
    sendFirstVideoPackage: boolean
    sendFirstScreenPackage: boolean
  }
  private statsCatch: {
    upAudioCache: any
    upAudioSlaveCache: any
    upVideoCache: any
    upScreenCache: any
    downAudioCache: any
    downAudioSlaveCache: any
    downVideoCache: any
    downScreenCache: any
    upTransportCache: any
    downTransportCache: any
    upCandidatePairStatsCache: RTCIceCandidatePairStats
    downCandidatePairStatsCache: RTCIceCandidatePairStats
  }

  constructor(options: FormativeStatsReportOptions) {
    this.adapterRef = options.adapterRef
    this.firstData = {
      recvFirstData: {},
      sendFirstAudioPackage: false,
      sendFirstVideoPackage: false,
      sendFirstScreenPackage: false
    }
    this.statsCatch = {
      upAudioCache: {},
      upAudioSlaveCache: {},
      upVideoCache: {},
      upScreenCache: {},
      downAudioCache: {},
      downAudioSlaveCache: {},
      downVideoCache: {},
      downScreenCache: {},
      upTransportCache: {},
      downTransportCache: {},
      //@ts-ignore
      upCandidatePairStatsCache: {},
      //@ts-ignore
      downCandidatePairStatsCache: {}
    }
  }

  _reset() {
    this.firstData = {
      recvFirstData: {},
      sendFirstAudioPackage: false,
      sendFirstVideoPackage: false,
      sendFirstScreenPackage: false
    }
    this.statsCatch = {
      upAudioCache: {},
      upAudioSlaveCache: {},
      upVideoCache: {},
      upScreenCache: {},
      downAudioCache: {},
      downAudioSlaveCache: {},
      downVideoCache: {},
      downScreenCache: {},
      upTransportCache: {},
      downTransportCache: {},
      //@ts-ignore
      upCandidatePairStatsCache: {},
      //@ts-ignore
      downCandidatePairStatsCache: {}
    }
  }

  clearFirstRecvData(uid: any) {
    //定时清除标记，比如订阅取消订阅远端，不需要上面业务层处理了
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const tmp = this.firstData.recvFirstData[uid]
    if (!remoteStream || !tmp) {
      return
    }
    if (remoteStream.pubStatus.audio.consumerId === '') {
      tmp.recvFirstAudioFrame = tmp.recvFirstAudioPackage = false
      this.statsCatch.downAudioCache[uid] = null
    }
    if (remoteStream.pubStatus.audioSlave.consumerId === '') {
      this.statsCatch.downAudioSlaveCache[uid] = null
    }
    if (remoteStream.pubStatus.video.consumerId === '') {
      tmp.recvFirstVideoFrame = tmp.recvFirstVideoPackage = false
      this.statsCatch.downVideoCache[uid] = null
    }
    if (remoteStream.pubStatus.screen.consumerId === '') {
      tmp.recvFirstScreenFrame = tmp.recvFirstScreenPackage = false
      this.statsCatch.downScreenCache[uid] = null
    }
  }

  formatTransportData(data: any, direction: string) {
    let tmp: any
    if (direction === 'send') {
      this!.adapterRef!.transportStats.rxRtt = data.googRtt - 0
      this!.adapterRef!.transportStats.txRtt = data.googRtt - 0
      this!.adapterRef!.sessionStats.SendBytes = data.bytesSent - 0
      //上行transport的feakback可以忽略不计，下行同理
      if (this.statsCatch.upTransportCache) {
        tmp = this.statsCatch.upTransportCache
      }
      this.statsCatch.upTransportCache = data
      if (tmp) {
        this!.adapterRef!.sessionStats.SendBitrate = Math.round(
          (8 * (data.bytesSent - tmp.bytesSent)) / 1000
        )
      }
    } else {
      //this!.adapterRef!.transportStats.txRtt = data.googRtt
      this!.adapterRef!.sessionStats.RecvBytes = data.bytesReceived - 0
      if (this.statsCatch.downTransportCache) {
        tmp = this.statsCatch.downTransportCache
      }
      this.statsCatch.downTransportCache = data
      if (tmp) {
        this!.adapterRef!.sessionStats.RecvBitrate = Math.round(
          (8 * (data.bytesReceived - tmp.bytesReceived)) / 1000
        )
      }
    }
  }

  formatTransportDataChrome117(data: any, direction: string) {
    if (direction === 'send') {
      const tmp = this.statsCatch.upCandidatePairStatsCache
      if (tmp && tmp.timestamp && data.timestamp - tmp.timestamp < 900) {
        // 如果距离上一次的值小于1秒，则不调用
        return
      }
      // this!.adapterRef!.transportStats.rxRtt = data.googRtt - 0
      this!.adapterRef!.transportStats.txRtt = Math.round(data.currentRoundTripTime * 1000)
      const downCPTimestamp = this.statsCatch.downCandidatePairStatsCache?.timestamp
      if (!downCPTimestamp || data.timestamp - downCPTimestamp > 2000) {
        // 如果接收端rtt没有值，就以发送端rtt的值为准
        this!.adapterRef!.transportStats.rxRtt = this!.adapterRef!.transportStats.txRtt
      }
      this!.adapterRef!.sessionStats.SendBytes = data.bytesSent
      this.adapterRef.transportStats.OutgoingAvailableBandwidth =
        data.availableOutgoingBitrate / 1000
      //上行transport的feakback可以忽略不计，下行同理
      this.statsCatch.upCandidatePairStatsCache = data
      if (tmp && tmp.timestamp) {
        this!.adapterRef!.sessionStats.SendBitrate = Math.round(
          (8 * (data.bytesSent - (tmp.bytesSent || 0))) / 1000
        )
      }
    } else {
      const tmp = this.statsCatch.downCandidatePairStatsCache
      if (tmp && tmp.timestamp && data.timestamp - tmp.timestamp < 900) {
        // 如果距离上一次的值小于1秒，则不调用
        return
      }
      this!.adapterRef!.transportStats.rxRtt = Math.round(data.currentRoundTripTime * 1000)
      if (this!.adapterRef!.transportStats.txRtt < 1) {
        this!.adapterRef!.transportStats.txRtt = this!.adapterRef!.transportStats.rxRtt
      }
      const upCPTimestamp = this.statsCatch.upCandidatePairStatsCache?.timestamp
      if (!upCPTimestamp || data.timestamp - upCPTimestamp > 2000) {
        // 如果发送端rtt没有值，就以接收端rtt的值为准
        this!.adapterRef!.transportStats.txRtt = this!.adapterRef!.transportStats.rxRtt
      }
      this!.adapterRef!.sessionStats.RecvBytes = data.bytesReceived
      this.statsCatch.downCandidatePairStatsCache = data
      if (tmp && tmp.timestamp) {
        this!.adapterRef!.sessionStats.RecvBitrate = Math.round(
          (8 * (data.bytesReceived - (tmp.bytesReceived || 0))) / 1000
        )
      }
    }
  }

  formatSendData(data: any, mediaType: any) {
    let tmp: any
    if (mediaType === 'audio') {
      if (this?.adapterRef?._mediasoup?._micProducer) {
      } else {
        this.firstData.sendFirstAudioPackage = false
        this.statsCatch.upAudioCache = {}
        return
      }
      if (data.packetsSent > 0 && !this.firstData.sendFirstAudioPackage) {
        this.firstData.sendFirstAudioPackage = true
        this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
          media_type: 0
        })
      }
      if (this.statsCatch.upAudioCache) {
        tmp = this.statsCatch.upAudioCache
      }
      this.statsCatch.upAudioCache = data
    } else if (mediaType === 'audioSlave') {
      if (this?.adapterRef?._mediasoup?._audioSlaveProducer) {
      } else {
        this.statsCatch.upAudioSlaveCache = {}
        return
      }
      if (this.statsCatch.upAudioSlaveCache) {
        tmp = this.statsCatch.upAudioSlaveCache
      }
      this.statsCatch.upAudioSlaveCache = data
      this.dispatchExceptionEventSendAudio(tmp, data)
    } else if (mediaType === 'video') {
      if (this?.adapterRef?._mediasoup?._webcamProducer) {
      } else {
        this.firstData.sendFirstVideoPackage = false
        this.statsCatch.upVideoCache = {}
        return
      }
      if (data.packetsSent > 0 && !this.firstData.sendFirstVideoPackage) {
        this.firstData.sendFirstVideoPackage = true
        this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
          media_type: 1
        })
      }
      if (this.statsCatch.upVideoCache) {
        tmp = this.statsCatch.upVideoCache
      }
      this.statsCatch.upVideoCache = data
      this.dispatchExceptionEventSendVideo(tmp, data)
    } else if (mediaType === 'screen') {
      if (this?.adapterRef?._mediasoup?._screenProducer) {
      } else {
        this.firstData.sendFirstScreenPackage = false
        this.statsCatch.upScreenCache = {}
        return
      }
      if (data.packetsSent > 0 && !this.firstData.sendFirstScreenPackage) {
        this.firstData.sendFirstScreenPackage = true
        this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
          media_type: 2
        })
      }
      if (this.statsCatch.upScreenCache) {
        tmp = this.statsCatch.upScreenCache
      }
      this.statsCatch.upScreenCache = data
    }

    if (!data.bitsSentPerSecond) {
      //计算码率
      data.bitsSentPerSecond = Math.round((8 * (data.bytesSent - (tmp.bytesSent || 0))) / 1000)
    }
    if (!data.packetsSentPerSecond) {
      //计算每秒发包数
      data.packetsSentPerSecond = data.packetsSent - (tmp.packetsSent || 0)
    }
    if (!data.packetsLostRate) {
      //计算丢包率
      if (data.packetsLost !== undefined) {
        data.packetsLostRate = this.getPacketLossRate(tmp, data, true)
      }
    }
    if (data.streamType) {
      //计算每秒编码数目
      if (!data.framesEncodedPerSecond) {
        if (data.framesEncoded >= tmp.framesEncoded) {
          data.framesEncodedPerSecond = data.framesEncoded - tmp.framesEncoded
        }
      }

      if (!data.qpPercentage) {
        //计算QP编码帧的占比
        data.qpPercentage = this.getQpPercentage(tmp, data)
      }
      if (!data.frameRateSent) {
        data.frameRateSent = data.framesSent - tmp.framesSent
      }
      //计算卡顿率
      let result = {
        freezeTime: 0,
        totalFreezeTime: 0
      }
      if (mediaType === 'video') {
        result = this.getLocalVideoFreezeStats(data)
      } else if (mediaType === 'screen') {
        result = this.getLocalScreenFreezeStats(data)
      }
      if (!data.freezeTime) {
        data.freezeTime = result.freezeTime
      }
      if (!data.totalFreezeTime) {
        data.totalFreezeTime = result.totalFreezeTime
      }
    }
  }

  formatRecvData(data: any, mediaType: any) {
    //console.log(data.remoteuid, ' ', mediaType, ': ', data)
    let tmp: any
    const uid = data.remoteuid || 0
    this.clearFirstRecvData(uid)
    if (!this.firstData.recvFirstData[uid]) {
      this.firstData.recvFirstData[uid] = {
        recvFirstAudioFrame: false,
        recvFirstVideoFrame: false,
        recvFirstScreenFrame: false,
        recvFirstAudioPackage: false,
        recvFirstVideoPackage: false,
        recvFirstScreenPackage: false
      }
    }
    if (mediaType === 'audio') {
      if (!this.firstData.recvFirstData[uid].recvFirstAudioPackage && data.packetsReceived > 0) {
        this.firstData.recvFirstData[uid].recvFirstAudioPackage = true
        this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
          media_type: 0,
          pull_uid: uid
        })
      }
      if (
        data.decodingNormal &&
        data.decodingNormal > 0 &&
        !this.firstData.recvFirstData[uid].recvFirstAudioFrame
      ) {
        this.firstData.recvFirstData[uid].recvFirstAudioFrame = true
        this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
          media_type: 0,
          pull_uid: uid
        })
      }
      if (this.statsCatch.downAudioCache) {
        tmp = this.statsCatch.downAudioCache[uid]
      }
      this.statsCatch.downAudioCache[uid] = data
      this.dispatchExceptionEventRecvAudio(tmp, data, uid)
    } else if (mediaType === 'audioSlave') {
      if (this.statsCatch.downAudioSlaveCache) {
        tmp = this.statsCatch.downAudioSlaveCache[uid]
      }
      this.statsCatch.downAudioSlaveCache[uid] = data
    } else if (mediaType === 'video') {
      if (!this.firstData.recvFirstData[uid].recvFirstVideoPackage && data.packetsReceived > 0) {
        this.firstData.recvFirstData[uid].recvFirstVideoPackage = true
        this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
          media_type: 1,
          pull_uid: uid
        })
      }
      if (!this.firstData.recvFirstData[uid].recvFirstVideoFrame && data.framesDecoded > 0) {
        this.firstData.recvFirstData[uid].recvFirstVideoFrame = true
        this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
          media_type: 1,
          pull_uid: uid
        })
      }
      if (this.statsCatch.downVideoCache) {
        tmp = this.statsCatch.downVideoCache[uid]
      }
      this.statsCatch.downVideoCache[uid] = data
      this.dispatchExceptionEventRecvVideo(tmp, data, uid)
    } else if (mediaType === 'screen') {
      if (!this.firstData.recvFirstData[uid].recvFirstScreenPackage && data.packetsReceived > 0) {
        this.firstData.recvFirstData[uid].recvFirstScreenPackage = true
        this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
          media_type: 2,
          pull_uid: uid
        })
      }
      if (!this.firstData.recvFirstData[uid].recvFirstScreenFrame && data.framesDecoded > 0) {
        this.firstData.recvFirstData[uid].recvFirstScreenFrame = true
        this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
          media_type: 2,
          pull_uid: uid
        })
      }
      if (this.statsCatch.downScreenCache) {
        tmp = this.statsCatch.downScreenCache[uid]
      }
      this.statsCatch.downScreenCache[uid] = data
      this.dispatchExceptionEventRecvScreen(tmp, data, uid)
    }
    if (!tmp || data.bytesReceived < tmp.bytesReceived) {
      return
    }
    let result = {
      freezeTime: 0,
      totalFreezeTime: 0
    }
    if (!data.bitsReceivedPerSecond) {
      //计算码率
      data.bitsReceivedPerSecond = Math.round((8 * (data.bytesReceived - tmp.bytesReceived)) / 1000)
    }
    // if (data.bitsReceivedPerSecond < 0) {
    //   debugger
    // }
    // console.warn(mediaType, ' 码率： ', data.bitsReceivedPerSecond)
    if (!data.packetsReceivedPerSecond) {
      //计算每秒发包数
      data.packetsReceivedPerSecond = data.packetsReceived - tmp.packetsReceived
    }
    if (!data.packetsLost) {
      //计算丢包率
      if (data.packetsLost !== undefined) {
        data.packetsLostRate = this.getPacketLossRate(tmp, data)
      }
    }

    if (mediaType === 'video' || mediaType === 'screen') {
      //计算卡顿率
      if (!data.frameRateReceived) {
        data.frameRateReceived = data.framesReceived - tmp.framesReceived
      }
      if (!data.frameRateDecoded) {
        data.frameRateDecoded = data.framesDecoded - tmp.framesDecoded
      }
      if (mediaType === 'video') {
        result = this.getRemoteVideoFreezeStats(tmp, data, uid)
      } else if (mediaType === 'screen') {
        result = this.getRemoteScreenFreezeStats(tmp, data, uid)
      }
    } else if (data.decodingCTN) {
      result = this.getRemoteAudioFreezeStats(tmp, data, uid)
    }
    if (!data.freezeTime) {
      data.freezeTime = result.freezeTime
    }
    if (!data.totalFreezeTime) {
      data.totalFreezeTime = result.totalFreezeTime
    }
  }

  getQpPercentage(prev: any, next: any) {
    if (
      !prev ||
      !prev.framesEncoded ||
      !prev.qpSum ||
      !next ||
      !next.framesEncoded ||
      !next.qpSum
    ) {
      return 0
    }
    const qpGop = next.qpSum - prev.qpSum
    const framesEncodedGop = next.framesEncoded - prev.framesEncoded
    if (qpGop <= 0 || framesEncodedGop <= 0) {
      return 0
    } else if (qpGop > framesEncodedGop) {
      return 100
    } else {
      return Math.round((qpGop / framesEncodedGop) * 100)
    }
  }

  getPacketLossRate(prev: PacketLostData, next: PacketLostData, isSend = false) {
    if (!prev || !next) {
      return 0
    }
    const prevLost = parseInt(prev.packetsLost) || 0
    const nextLost = parseInt(next.packetsLost) || 0
    if (nextLost <= prevLost) {
      return 0
    }
    const prevPacket = isSend ? prev.packetsSent : prev.packetsReceived
    const nextPacket = isSend ? next.packetsSent : next.packetsReceived
    const prevRecv = parseInt(prevPacket || '') || 0
    const nextRecv = parseInt(nextPacket || '') || 0
    if (nextRecv <= prevRecv) {
      return 0
    }
    const lostRate = isSend
      ? Math.round(((nextLost - prevLost) / (nextRecv - prevRecv)) * 100)
      : Math.round(((nextLost - prevLost) / (nextLost - prevLost + (nextRecv - prevRecv))) * 100)
    return lostRate
  }

  getLocalVideoFreezeStats(data: any) {
    let totalFreezeTime = 0
    if (!data || !data.frameRateSent) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let value = 0
    let i = parseInt(data.frameRateSent)

    if (i <= 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }

    if (i > 15) {
      return {
        totalFreezeTime: 0,
        freezeTime: 0
      }
    } else {
      value = Math.abs(15 - i)
    }
    //@ts-ignore
    totalFreezeTime = parseInt(value * 2000)
    let freezeTime = 0
    if (totalFreezeTime < 300) {
      totalFreezeTime = 0
      freezeTime = 0
    } else if (totalFreezeTime > 1500) {
      freezeTime = 6
    } else {
      //@ts-ignore
      freezeTime = parseInt(totalFreezeTime / 300)
    }

    const info = {
      totalFreezeTime,
      //@ts-ignore
      freezeTime
    }
    //console.log('本端video卡顿率: ', JSON.stringify(info, null, ' '))
    return info
  }

  getLocalScreenFreezeStats(data: any) {
    let totalFreezeTime = 0
    if (!data || !data.frameRateSent) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(data.framesEncoded) || 0
    let i = parseInt(data.framesSent) || 0
    if (n <= 0 || i <= 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }
    let value = Math.abs(n - i)
    let stuckRate = value / n
    //@ts-ignore
    totalFreezeTime = parseInt(stuckRate * 2000)
    let freezeTime = 0
    if (totalFreezeTime < 300) {
      totalFreezeTime = 0
      freezeTime = 0
    } else if (totalFreezeTime > 1500) {
      freezeTime = 6
    } else {
      //@ts-ignore
      freezeTime = parseInt(totalFreezeTime / 300)
    }

    const info = {
      totalFreezeTime,
      //@ts-ignore
      freezeTime
    }
    //console.log('本端screen卡顿率: ', JSON.stringify(info, null, ' '))
    return info
  }

  getRemoteAudioFreezeStats(prev: any, next: any, uid: number | string) {
    let totalFreezeTime = 0
    if (!prev || !next) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let prevStuck =
      parseInt(prev.decodingPLC) + parseInt(prev.decodingCNG) + parseInt(prev.decodingPLCCNG)
    let prevNormal = parseInt(prev.decodingCTN)

    let nextStuck =
      parseInt(prev.decodingPLC) + parseInt(prev.decodingCNG) + parseInt(prev.decodingPLCCNG)
    let nextNormal = parseInt(next.decodingCTN)
    if (nextNormal <= prevStuck) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let stuckRate = (nextStuck - prevStuck) / (nextNormal - prevNormal)
    const data = {
      //@ts-ignore
      totalFreezeTime: parseInt(stuckRate * 1000),
      //@ts-ignore
      freezeTime: stuckRate * 10 > 1 ? parseInt(stuckRate * 10) : stuckRate > 0 ? 1 : 0
    }
    //console.log('远端音频卡顿率: ', JSON.stringify(data, null, ' '))
    return data
  }

  getRemoteVideoFreezeStats(prev: any, next: any, uid: number | string) {
    let totalFreezeTime = 0
    //@ts-ignore
    if (!next || next.framesDecoded == 0) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    } else if (next && next.framesDecoded && next.frameRateDecoded == 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }

    let n = parseInt(next.frameRateReceived) || 0
    let i = parseInt(next.frameRateDecoded)

    if (n <= 0 || i <= 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }

    let value = 0
    if (n > 15) {
      return {
        totalFreezeTime: 0,
        freezeTime: 0
      }
    } else {
      value = Math.abs(15 - n)
    }

    let stuckRate = value / 15
    //@ts-ignore
    totalFreezeTime = parseInt(stuckRate * 2000)
    if (totalFreezeTime > 2000) {
      totalFreezeTime = 2000
    }

    let freezeTime = 0
    if (totalFreezeTime < 300) {
      totalFreezeTime = 0
      freezeTime = 0
    } else if (totalFreezeTime > 1500) {
      freezeTime = 6
    } else {
      //@ts-ignore
      freezeTime = parseInt(totalFreezeTime / 300)
    }

    const info = {
      totalFreezeTime,
      //@ts-ignore
      freezeTime
    }
    //console.log('远端视频卡顿率: ', JSON.stringify(info, null, ' '))
    return info
  }

  getRemoteScreenFreezeStats(prev: any, next: any, uid: number | string) {
    let totalFreezeTime = 0
    if (!next) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(next.frameRateReceived)
    let i = parseInt(next.frameRateDecoded)

    if (n <= 0 || i <= 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }

    let value = Math.abs(i - n)
    let stuckRate = value / n
    //@ts-ignore
    totalFreezeTime = parseInt(stuckRate * 2000) || 0
    let freezeTime = 0
    if (totalFreezeTime < 300) {
      totalFreezeTime = 0
      freezeTime = 0
    } else if (totalFreezeTime > 1500) {
      freezeTime = 6
    } else {
      //@ts-ignore
      freezeTime = parseInt(totalFreezeTime / 300)
    }

    const info = {
      totalFreezeTime,
      //@ts-ignore
      freezeTime
    }
    //console.log('远端屏幕共享卡顿率: ', JSON.stringify(info, null, ' '))
    return info
  }

  dispatchExceptionEventSendAudio(prev: any, next: any) {
    if (!prev || !next) {
      return
    }
    const muteStatus = this.adapterRef.localStream?.muteStatus.audio.send
    const pubStatus = this.adapterRef.localStream?.pubStatus.audio.audio
    if (muteStatus === true || pubStatus === false) {
      return
    }

    if (0 === next.audioInputLevel) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'AUDIO_INPUT_LEVEL_TOO_LOW',
        code: 2001,
        uid: this.adapterRef?.channelInfo.uid || 0
      })
    }

    let audioSendBytesDelta = parseInt(next.bytesSent) - parseInt(prev.bytesSent)
    if (0 === audioSendBytesDelta) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'SEND_AUDIO_BITRATE_TOO_LOW',
        code: 2003,
        uid: this.adapterRef?.channelInfo.uid || 0
      })
    }
  }

  dispatchExceptionEventSendVideo(prev: any, next: any) {
    if (!prev || !next) {
      return
    }
    const muteStatus = this.adapterRef.localStream?.muteStatus.video.send
    const pubStatus = this.adapterRef.localStream?.pubStatus.video.video
    if (muteStatus === true || pubStatus === false) {
      return
    }
    if (
      next.frameRateInput &&
      parseInt(next.frameRateInput) > 5 &&
      parseInt(next.frameRateSent) <= 1
    ) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'FRAMERATE_SENT_TOO_LOW',
        code: 1002,
        uid: this.adapterRef?.channelInfo.uid || 0
      })
    }
    let videoSendBytesDelta = parseInt(next.bytesSent) - parseInt(prev.bytesSent)
    if (videoSendBytesDelta === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'FRAMERATE_VIDEO_BITRATE_TOO_LOW',
        code: 1003,
        uid: this.adapterRef?.channelInfo.uid || 0
      })
    }
  }

  dispatchExceptionEventRecvAudio(prev: any, next: any, uid: number | string) {
    if (!prev || !next || !next.googDecodingNormal) {
      return
    }
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const muteStatus =
      remoteStream && (remoteStream.muteStatus.audio.send || remoteStream.muteStatus.audio.recv)
    if (remoteStream && muteStatus) {
      return
    }

    if (
      !remoteStream ||
      !remoteStream.Play ||
      !remoteStream.Play.audio.dom ||
      !remoteStream.Play.audio.dom.srcObject ||
      remoteStream.Play.audio.dom.muted
    ) {
      return
    }
    let audioRecvBytesDelta = parseInt(next.bytesReceived) - parseInt(prev.bytesReceived)
    let audioDecodingNormalDelta = parseInt(next.decodingNormal) - parseInt(prev.decodingNormal)
    if (audioRecvBytesDelta > 0 && audioDecodingNormalDelta === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'RECV_AUDIO_DECODE_FAILED',
        code: 2005,
        uid
      })
    }
    if (
      audioRecvBytesDelta > 0 &&
      audioDecodingNormalDelta > 0 &&
      0 === +(next.audioOutputLevel || next.audioLevel)
    ) {
      const volume =
        remoteStream &&
        remoteStream.Play &&
        remoteStream.Play.audio.dom &&
        remoteStream.Play.audio.dom.volume
      if (volume && volume > 0) {
        this.adapterRef.instance.safeEmit('exception', {
          msg: 'AUDIO_OUTPUT_LEVEL_TOO_LOW',
          code: 2002,
          uid
        })
      }
    }
  }

  dispatchExceptionEventRecvVideo(prev: any, next: any, uid: number | string) {
    if (!prev || !next) {
      return
    }
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const muteStatus =
      remoteStream && (remoteStream.muteStatus.video.send || remoteStream.muteStatus.video.recv)
    if (remoteStream && muteStatus) {
      return
    }
    let videoRecvBytesDelta = parseInt(next.bytesReceived) - parseInt(prev.bytesReceived)
    if (videoRecvBytesDelta > 0 && parseInt(next.frameRateDecoded) === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'RECV_VIDEO_DECODE_FAILED',
        code: 1005,
        uid
      })
    }
  }

  dispatchExceptionEventRecvScreen(prev: any, next: any, uid: number | string) {
    if (!prev || !next) {
      return
    }
    const remoteStream = this.adapterRef.remoteStreamMap[uid]
    const muteStatus =
      remoteStream && (remoteStream.muteStatus.screen.send || remoteStream.muteStatus.screen.recv)
    if (remoteStream && muteStatus) {
      return
    }
    let screenRecvBytesDelta = parseInt(next.bytesReceived) - parseInt(prev.bytesReceived)
    if (screenRecvBytesDelta > 0 && parseInt(next.frameRateDecoded) === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'RECV_SCREEN_DECODE_FAILED',
        code: 1005,
        uid
      })
    }
  }

  destroy() {
    this._reset()
  }
}

export { FormativeStatsReport }
