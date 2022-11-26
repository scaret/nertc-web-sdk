/*
 getStats适配器,该模块仅仅提供数据，以及封装成统一的格式
 设计方案：https://docs.popo.netease.com/lingxi/172c1c97e0034932a4b4097049d39a70
 */
import { AdapterRef, MediaTypeShort } from '../../types'
import { FormativeStatsReport } from './formativeStatsData'
import * as env from '../../util/rtcUtil/rtcEnvironment'

class GetStats {
  private adapterRef: AdapterRef | null
  private times = 0
  private browser: 'chrome' | 'safari' | 'firefox'
  public formativeStatsReport: FormativeStatsReport | null
  private audioLevel: { uid: number | string; level: number; type: string | undefined }[]
  private tmp = { bytesSent: 0, bytesReceived: 0 }
  constructor(options: { adapterRef: AdapterRef }) {
    this.adapterRef = options.adapterRef
    //workaround for TS2564
    this.browser = 'chrome'
    this.audioLevel = [] //算是违背了初心，本来这个模块是不做业务的
    this._reset()
    //对原始数据进行二次封装，以及提供sdk本身数据相关接口的依赖
    this.formativeStatsReport = new FormativeStatsReport({
      adapterRef: this.adapterRef
    })
  }

  _reset() {
    this.times = 0
    this.browser = 'chrome'
    if (
      (env.IS_CHROME_ONLY && env.CHROME_MAJOR_VERSION && env.CHROME_MAJOR_VERSION >= 72) ||
      env.IS_ANDROID
    ) {
      this.browser = 'chrome'
    } else if (
      (env.IS_ANY_SAFARI && env.SAFARI_MAJOR_VERSION && env.SAFARI_MAJOR_VERSION >= 12) ||
      (env.IS_ANY_SAFARI && env.IS_WECHAT)
    ) {
      this.browser = 'safari'
    } else if (env.IS_FIREFOX && env.FIREFOX_MAJOR_VERSION && env.FIREFOX_MAJOR_VERSION >= 60) {
      this.browser = 'firefox'
    }
    this.audioLevel = []
    if (this.formativeStatsReport) {
      this.formativeStatsReport.destroy()
    }
    this.formativeStatsReport = null
  }

  async getAllStats() {
    function compare(property: string) {
      return function (a: any, b: any) {
        var value1 = a[property]
        var value2 = b[property]
        if (value2 !== 0 && !value2) {
          // 考虑NaN或无值的情况
          return -1
        } else if (value1 !== 0 && !value1) {
          return 1
        } else {
          return value2 - value1
        }
      }
    }
    try {
      let localPc = this?.adapterRef?._mediasoup?._sendTransport?._handler?._pc
      let remotePc = this?.adapterRef?._mediasoup?._recvTransport?._handler?._pc

      if (!localPc && !remotePc) {
        return
      }
      this.audioLevel.length = 0
      this.tmp = { bytesSent: 0, bytesReceived: 0 }
      this.times = (this.times || 0) + 1
      let result = {
        local: localPc ? await this.getLocalStats(localPc) : null,
        remote: remotePc ? await this.getRemoteStats(remotePc) : null,
        times: this.times
      }
      this.audioLevel.sort(compare('level'))
      if (this.audioLevel.length > 0 && this.audioLevel[0].level > 0) {
        // Firefox 获取不到audioLevel, 没有active-speaker探测能力
        this?.adapterRef?.instance.safeEmit('active-speaker', this.audioLevel[0])
        this?.adapterRef?.instance.safeEmit('volume-indicator', this.audioLevel)
      }
      //this.adapterRef?.logger.log('stats before revised--->', result)
      return result
    } catch (e: any) {
      this.adapterRef?.logger.warn('数据汇集出现异常: ', e.message)
    }
  }

  async getLocalStats(pc: RTCPeerConnection) {
    if (!pc || /(failed|closed|new)/gi.test(pc.iceConnectionState)) {
      return {}
    }
    return await this[this.browser](pc, 'send')
  }

  async getRemoteStats(pc: RTCPeerConnection) {
    if (!pc || /(failed|closed|new)/gi.test(pc.iceConnectionState)) {
      return {}
    }
    return await this[this.browser](pc, 'recv')
  }

  /*
    chrome浏览器getStats适配器
  */
  async chrome(pc: RTCPeerConnection, direction: string) {
    const nonStandardStats = () => {
      return new Promise((resolve, reject) => {
        // 由于Chrome为callback形式的getStats使用了非标准化的接口，故不遵守TypeScript定义
        // @ts-ignore
        pc.getStats((res) => {
          let result: { [key: string]: any } = {}
          const results = res.result()
          // @ts-ignore
          results.forEach(function (res) {
            const item: any = {}
            res.names().forEach(function (name: string) {
              item[name] = res.stat(name)
            })
            item.id = res.id
            item.type = res.type
            item.timestamp = res.timestamp
            result[item.id] = item
          })
          // @ts-ignore
          pc.lastStats = pc.lastStats || {}
          //针对非标准话的getStats进行格式化处理
          result = this.formatChromeNonStandardStats(pc, result, direction)
          resolve(result)
        })
      })
    }

    const standardizedStats = async () => {
      if (!pc.getTransceivers) return {}

      let result = {
        audio_ssrc: [],
        audioSlave_ssrc: [],
        video_ssrc: [], //风险点，要求大流在前，小流在后，需要排序
        screen_ssrc: [] //风险点，要求大流在前，小流在后，需要排序
      }
      const transceivers = pc.getTransceivers()
      for (let i = 0; i < transceivers.length; i++) {
        let report = null
        const item = transceivers[i]
        if (item.direction === 'sendonly') {
          if (item.sender && item.sender.track && item.sender.getStats) {
            report = await item.sender.getStats()
            report = this.formatChromeStandardizedStats(report, direction, 0)
            if (report.video_ssrc && result.video_ssrc) {
              //@ts-ignore
              result.video_ssrc.push(report.video_ssrc[0])
              if (result.video_ssrc.length > 1) {
                const temp: any = result.video_ssrc[0] || {}
                if (temp.streamType === 'low') {
                  ;[result.video_ssrc[0], result.video_ssrc[1]] = [
                    result.video_ssrc[1],
                    result.video_ssrc[0]
                  ]
                }
              }
            } else if (report.screen_ssrc && result.screen_ssrc) {
              //@ts-ignore
              result.screen_ssrc.push(report.screen_ssrc[0])
              if (result.screen_ssrc.length > 1) {
                const temp: any = result.screen_ssrc[0] || {}
                if (temp.streamType === 'low') {
                  ;[result.screen_ssrc[0], result.screen_ssrc[1]] = [
                    result.screen_ssrc[1],
                    result.screen_ssrc[0]
                  ]
                }
              }
            } else {
              Object.assign(result, report)
            }
          }
        } else if (item.direction === 'recvonly') {
          if (item.receiver && item.receiver.track && item.receiver.getStats) {
            report = await item.receiver.getStats()
            report = this.formatChromeStandardizedStats(report, direction, 0)
            if (report.audio_ssrc && result.audio_ssrc) {
              //@ts-ignore
              result.audio_ssrc.push(report.audio_ssrc[0])
            } else if (report.audioSlave_ssrc && result.audioSlave_ssrc) {
              //@ts-ignore
              result.audioSlave_ssrc.push(report.audioSlave_ssrc[0])
            } else if (report.video_ssrc && result.video_ssrc) {
              //@ts-ignore
              result.video_ssrc.push(report.video_ssrc[0])
            } else if (report.screen_ssrc && result.screen_ssrc) {
              //@ts-ignore
              result.screen_ssrc.push(report.screen_ssrc[0])
            } else {
              Object.assign(result, report)
            }
          }
        }
      }
      return result
    }

    const nonStandardResult = await nonStandardStats()
    const standardizedResult = await standardizedStats()
    const assignedResult: { [key: string]: any } = {}
    if (nonStandardResult && standardizedResult) {
      //@ts-ignore
      Object.keys(nonStandardResult).forEach((key) => {
        //@ts-ignore
        const nonTmp = nonStandardResult[key]
        //@ts-ignore
        const tmp = standardizedResult[key]
        assignedResult[key] = []
        if (!tmp) {
          assignedResult[key] = nonTmp
          return
        }
        for (let i = 0; i < nonTmp.length; i++) {
          if (tmp[i]) {
            assignedResult[key].push(Object.assign(nonTmp[i], tmp[i]))
          }
        }
      })
    } else if (nonStandardResult) {
      Object.assign(assignedResult, nonStandardResult)
    } else if (standardizedResult) {
      Object.assign(assignedResult, standardizedResult)
    }
    return assignedResult
  }

  //转换非标准getStats格式
  formatChromeNonStandardStats(
    pc: RTCPeerConnection,
    stats: { [key: string]: any },
    direction: string
  ) {
    function getLimitationReason(item: any) {
      if (item.googBandwidthLimitedResolution) {
        return 1
      } else if (item.googCpuLimitedResolution) {
        return 2
      } else if (item.googHasEnteredLowResolution) {
        return 3
      } else {
        0
      }
    }
    // 普通换算
    function formatData(data: any) {
      const KeyTransform = {
        googAvailableSendBandwidth: 1,
        googTargetEncBitrate: 1,
        googActualEncBitrate: 1,
        googRetransmitBitrate: 1,
        googTransmitBitrate: 1
      }
      Object.keys(data).map((key: string) => {
        // 换算为K
        //@ts-ignore
        if (KeyTransform[key]) {
          data[key] = parseInt(data[key]) / 1024
        }
      })
      return data
    }
    function getSamplingRate(param: string | undefined) {
      if (!param) return 16
      let samplingRate: number
      const SamplingRateMap = new Map([
        ['speech_low_quality', 16],
        ['speech_standard', 32],
        ['music_standard', 48],
        ['standard_stereo', 48],
        ['high_quality', 48],
        ['high_quality_stereo', 48]
      ])
      samplingRate = SamplingRateMap.get(param)!
      return samplingRate
    }
    const audio_ssrc: any = []
    const audioSlave_ssrc: any = []
    const video_ssrc: any = []
    const screen_ssrc: any = []
    const bwe: any = []
    Object.values(stats).forEach((item) => {
      // 普通换算
      if (item.id.includes('Conn-')) {
        this.formativeStatsReport?.formatTransportData(item, direction)
      }
      if (item.id.includes('Cand-')) {
        this!.adapterRef!.transportStats.NetworkType = item.networkType
      } else if (item.id === 'bweforvideo' && direction === 'send') {
        item = formatData(item)
        this!.adapterRef!.transportStats.OutgoingAvailableBandwidth =
          item.googAvailableSendBandwidth
        bwe.push({
          googActualEncBitrate: parseInt(item.googActualEncBitrate) || 0,
          googAvailableSendBandwidth: parseInt(item.googAvailableSendBandwidth) || 0,
          googRetransmitBitrate: parseInt(item.googRetransmitBitrate) || 0,
          googAvailableReceiveBandwidth: parseInt(item.googAvailableReceiveBandwidth) || 0,
          googTargetEncBitrate: parseInt(item.googTargetEncBitrate) || 0,
          googTransmitBitrate: parseInt(item.googTransmitBitrate) || 0
        })
      } else if (/^ssrc_/i.test(item.id)) {
        const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(parseInt(item.ssrc))
        const targetUid = uidAndKindBySsrc?.uid
        const streamType = uidAndKindBySsrc?.streamType
        let mediaTypeShort = ''
        if (uidAndKindBySsrc?.kind) {
          mediaTypeShort = uidAndKindBySsrc.kind
        } else if (item.googContentType === 'screen') {
          mediaTypeShort = 'screen'
        } else {
          mediaTypeShort = item.mediaType
        }
        let tmp: any = {}
        if (direction === 'send') {
          if (item.mediaType === 'audio') {
            tmp.audioInputLevel = parseInt(item.audioInputLevel)
            tmp.totalAudioEnergy = parseInt(item.totalAudioEnergy)
            tmp.totalSamplesDuration = parseInt(item.totalSamplesDuration)
            tmp.bytesSent = parseInt(item.bytesSent)
            //tmp.bitsSentPerSecond = 0//后面的模块计算得出
            //tmp.targetBitrate = 0 //不支持
            tmp.packetsSent = parseInt(item.packetsSent)
            //tmp.packetsSentPerSecond = 50 //后面的模块计算得出
            tmp.packetsLost = parseInt(item.packetsLost)
            //tmp.fractionLost = parseInt(item.fractionLost) //不支持
            //tmp.packetsLostRate = 0 //后面的模块计算得出
            //tmp.nackCount = 0 //不支持
            tmp.rtt = parseInt(item.googRtt)
            tmp.jitterReceived = parseInt(item.googJitterReceived)
            tmp.echoReturnLoss = item.googEchoCancellationReturnLoss || ''
            tmp.echoReturnLossEnhancement = item.googEchoCancellationReturnLossEnhancement || ''
            this.formativeStatsReport?.formatSendData(tmp, mediaTypeShort)
            //tmp.active = item.active //不支持

            //sdk接口getLocalAudioStats()数据封装
            const audioStats = {
              CodecType: 'Opus',
              MuteState: this?.adapterRef?.localStream?.muteStatus?.audio?.send || false,
              RecordingLevel: tmp.audioInputLevel || 0,
              SamplingRate: getSamplingRate(this?.adapterRef?.localStream?.audioProfile),
              SendBitrate: tmp.bitsSentPerSecond || 0,
              SendLevel: tmp.audioInputLevel || 0
            }
            if (mediaTypeShort === 'audio') {
              audio_ssrc.push(tmp)
              this!.adapterRef!.localAudioStats[0] = audioStats
            } else if (mediaTypeShort === 'audioSlave') {
              audioSlave_ssrc.push(tmp)
              this!.adapterRef!.localAudioSlaveStats[0] = audioStats
            }
          } else if (item.mediaType === 'video' /* && streamType === 'high'*/) {
            tmp.bytesSent = parseInt(item.bytesSent)
            //tmp.bitsSentPerSecond = 0 //后面的模块计算得出
            //tmp.targetBitrate = 0 //不支持
            tmp.packetsSent = parseInt(item.packetsSent)
            //tmp.packetsSentPerSecond = 0 //后面的模块计算得出
            tmp.packetsLost = parseInt(item.packetsLost)
            //tmp.fractionLost = parseInt(item.fractionLost) //不支持
            //tmp.packetsLostRate = 0 //后面的模块计算得出
            tmp.firCount = parseInt(item.googFirsReceived)
            tmp.pliCount = parseInt(item.googPlisReceived)
            tmp.nackCount = parseInt(item.googNacksReceived)
            tmp.framesEncoded = parseInt(item.framesEncoded)
            //tmp.framesEncodedPerSecond = 0//后面的模块计算得出
            tmp.avgEncodeMs = parseInt(item.googAvgEncodeMs)
            tmp.encodeUsagePercent = parseInt(item.googEncodeUsagePercent)
            tmp.frameRateInput = parseInt(item.googFrameRateInput)
            tmp.frameRateSent = parseInt(item.googFrameRateSent)
            tmp.frameWidthInput = parseInt(item.googFrameWidthInput)
            tmp.frameWidthSent = parseInt(item.googFrameWidthSent)
            tmp.frameHeightInput = parseInt(item.googFrameHeightInput)
            tmp.frameHeightSent = parseInt(item.googFrameHeightSent)
            tmp.hugeFramesSent = parseInt(item.hugeFramesSent)
            tmp.qpSum = parseInt(item.qpSum)
            //tmp.qpPercentage = 0 //后面的模块计算得出
            //tmp.freezeTime = 0 //后面的模块计算得出
            //tmp.totalFreezeTime = 0 //后面的模块计算得出
            tmp.qualityLimitationReason = getLimitationReason(item)
            tmp.qualityLimitationResolutionChanges = parseInt(item.googAdaptationChanges)
            //tmp.jitter = 0 //不支持
            tmp.rtt = parseInt(item.googRtt)
            //tmp.active = 1 //不支持
            tmp.streamType = streamType
            if (streamType === 'high') {
              this.formativeStatsReport?.formatSendData(tmp, mediaTypeShort)
            }
            //sdk接口getLocalVideoStats()数据封装
            const videoStats = {
              LayerType: 1,
              CodecName: item.googCodecName || 'h264',
              CaptureFrameRate: tmp.frameRateInput || 0,
              CaptureResolutionHeight: tmp.frameHeightInput || 0,
              CaptureResolutionWidth: tmp.frameWidthInput || 0,
              EncodeDelay: tmp.avgEncodeMs || 0,
              MuteState: this!.adapterRef!.localStream?.muteStatus?.video?.send || false,
              SendBitrate: tmp.bitsSentPerSecond || 0,
              SendFrameRate: tmp.frameRateSent || 0,
              SendResolutionHeight: tmp.frameHeightSent || 0,
              SendResolutionWidth: tmp.frameWidthSent || 0,
              TargetSendBitrate: tmp.bitsSentPerSecond || 0,
              TotalDuration: this?.adapterRef?.state.startPubVideoTime
                ? (Date.now() - this.adapterRef.state.startPubVideoTime) / 1000
                : 0,
              TotalFreezeTime: tmp.totalFreezeTime || 0
            }
            if (mediaTypeShort === 'video') {
              video_ssrc.push(tmp)
              this!.adapterRef!.localVideoStats[0] = videoStats
            } else if (mediaTypeShort === 'screen') {
              this!.adapterRef!.localScreenStats[0] = videoStats
              screen_ssrc.push(tmp)
            }
          }
        } else if (direction === 'recv') {
          tmp.uid = targetUid
          if (item.mediaType === 'audio') {
            tmp.audioOutputLevel = parseInt(item.audioOutputLevel)
            tmp.totalAudioEnergy = parseInt(item.totalAudioEnergy)
            tmp.totalSamplesDuration = parseInt(item.totalSamplesDuration)
            tmp.bytesReceived = parseInt(item.bytesReceived)
            //后面的模块计算得出
            //tmp.bitsReceivedPerSecond = 0
            tmp.packetsReceived = parseInt(item.packetsReceived)
            //后面的模块计算得出
            //tmp.packetsReceivedPerSecond = 50
            tmp.packetsLost = parseInt(item.packetsLost)
            //tmp.fractionLost = parseInt(item.fractionLost) //不支持
            //后面的模块计算得出
            //tmp.packetsLostRate = 0
            //tmp.nackCount = 0 //不支持
            //tmp.lastPacketReceivedTimestamp = 0 //不支持
            //tmp.estimatedPlayoutTimestamp = 0 //不支持
            //后面的模块计算得出
            // tmp.freezeTime = 0
            // tmp.totalFreezeTime = 0
            tmp.decodingPLC = parseInt(item.googDecodingPLC)
            tmp.decodingPLCCNG = parseInt(item.googDecodingPLCCNG)
            tmp.decodingNormal = parseInt(item.googDecodingNormal)
            tmp.decodingMuted = parseInt(item.googDecodingMuted)
            tmp.decodingCNG = parseInt(item.googDecodingCNG)
            tmp.decodingCTN = parseInt(item.googDecodingCTN)
            tmp.currentDelayMs = parseInt(item.googCurrentDelayMs)
            tmp.preferredJitterBufferMs = parseInt(item.googPreferredJitterBufferMs)
            tmp.jitterBufferMs = parseInt(item.googJitterBufferMs)
            tmp.jitter = parseInt(item.googJitterReceived)
            //tmp.rtt = 0 //不支持
            tmp.preemptiveExpandRate = parseInt(item.googPreemptiveExpandRate)
            tmp.speechExpandRate = parseInt(item.googSpeechExpandRate)
            //tmp.concealedSamples = 0 //不支持
            //tmp.silentConcealedSamples = 0 //不支持
            tmp.secondaryDecodedRate = parseInt(item.googSecondaryDecodedRate)
            tmp.secondaryDiscardedRate = parseInt(item.googSecondaryDiscardedRate)
            this.formativeStatsReport?.formatRecvData(tmp, mediaTypeShort)
            const remoteStream = this?.adapterRef?.remoteStreamMap[item.uid]
            const muteStatus =
              (remoteStream &&
                (remoteStream.muteStatus.audioSlave.send ||
                  remoteStream.muteStatus.audioSlave.recv)) ||
              false

            //sdk接口getRemoteAudioStats()数据封装
            const audioStats = {
              CodecType: 'Opus',
              End2EndDelay:
                (parseInt(item.googCurrentDelayMs) || 0) + (parseInt(item.googJitterBufferMs) || 0),
              MuteState: muteStatus,
              PacketLossRate: tmp.packetsLostRate || 0,
              RecvBitrate: tmp.bitsReceivedPerSecond || 0,
              RecvLevel: tmp.audioOutputLevel || 0,
              TotalFreezeTime: tmp.totalFreezeTime || 0,
              TotalPlayDuration: parseInt(item.totalSamplesDuration) || 0,
              TransportDelay: parseInt(item.googCurrentDelayMs) || 0
            }

            if (mediaTypeShort === 'audio') {
              this!.adapterRef!.remoteAudioStats[tmp.uid] = audioStats
              audio_ssrc.push(tmp)
            } else if (mediaTypeShort === 'audioSlave') {
              this!.adapterRef!.remoteAudioSlaveStats[tmp.uid] = audioStats
              audioSlave_ssrc.push(tmp)
            }
          } else if (item.mediaType === 'video') {
            tmp.bytesReceived = parseInt(item.bytesReceived)
            //后面的模块计算得出
            tmp.bitsReceivedPerSecond = 0
            tmp.packetsReceived = parseInt(item.packetsReceived)
            //后面的模块计算得出
            //tmp.packetsReceivedPerSecond = 0
            tmp.packetsLost = parseInt(item.packetsLost)
            //后面的模块计算得出
            //tmp.packetsLostRate = 0
            tmp.firCount = parseInt(item.googFirsSent)
            tmp.pliCount = parseInt(item.googPlisSent)
            tmp.nackCount = parseInt(item.googNacksSent)
            //tmp.lastPacketReceivedTimestamp = 0 //不支持
            //tmp.estimatedPlayoutTimestamp = 0 //不支持
            //tmp.pauseCount = 0 //不支持
            //tmp.totalPausesDuration = 0 //不支持
            //tmp.freezeCount = 0 //不支持
            //tmp.totalFreezesDuration = 0 //不支持
            //后面的模块计算得出
            //tmp.totalFreezeTime = 0
            //tmp.freezeTime = 0
            tmp.framesDecoded = parseInt(item.framesDecoded)
            //tmp.framesDropped = 0 //不支持
            tmp.decodeMs = parseInt(item.googDecodeMs)
            tmp.frameRateDecoded = parseInt(item.googFrameRateDecoded)
            tmp.frameRateOutput = parseInt(item.googFrameRateOutput)
            tmp.frameRateReceived = parseInt(item.googFrameRateReceived)
            tmp.frameWidthReceived = parseInt(item.googFrameWidthReceived)
            tmp.frameHeightReceived = parseInt(item.googFrameHeightReceived)
            //tmp.powerEfficientDecoder = 1 //不支持
            tmp.jitterBufferDelay = parseInt(item.googJitterBufferMs)
            this.formativeStatsReport?.formatRecvData(tmp, mediaTypeShort)

            const remoteStream = this?.adapterRef?.remoteStreamMap[tmp.uid]
            let videoDom = remoteStream && remoteStream.Play && remoteStream?.Play?.video.dom
            if (mediaTypeShort === 'screen') {
              videoDom = remoteStream && remoteStream.Play && remoteStream?.Play?.screen.dom
            }
            let muteState =
              (remoteStream &&
                (remoteStream.muteStatus.video.send || remoteStream.muteStatus.video.recv)) ||
              false
            //sdk接口getRemoteVideoStats()数据封装
            const videoStats = {
              LayerType: 1,
              CodecName: item.googCodecName,
              End2EndDelay:
                (parseInt(item.googCurrentDelayMs) || 0) +
                (parseInt(item.googJitterBufferMs) || 0) +
                (parseInt(item.googRenderDelayMs) || 0),
              MuteState: muteState,
              PacketLossRate: tmp.packetsLostRate || 0,
              RecvBitrate: tmp.bitsReceivedPerSecond || 0,
              RecvResolutionHeight: tmp.frameHeightReceived || 0,
              RecvResolutionWidth: tmp.frameWidthReceived || 0,
              RenderFrameRate: tmp.frameRateOutput || 0,
              RenderResolutionHeight: videoDom ? videoDom.videoHeight : 0,
              RenderResolutionWidth: videoDom ? videoDom.videoWidth : 0,
              TotalFreezeTime: item.totalFreezeTime || 0,
              TotalPlayDuration:
                videoDom && videoDom.played && videoDom.played.length ? videoDom.played.end(0) : 0,
              TransportDelay: parseInt(item.googCurrentDelayMs) || 0
            }

            if (mediaTypeShort === 'video') {
              this!.adapterRef!.remoteVideoStats[tmp.uid] = videoStats
              video_ssrc.push(tmp)
            } else if (mediaTypeShort === 'screen') {
              this!.adapterRef!.remoteScreenStats[tmp.uid] = videoStats
              screen_ssrc.push(tmp)
            }
          }
        }
      }
    })
    const result: any = {}
    if (audio_ssrc.length) {
      result.audio_ssrc = audio_ssrc
    }
    if (audioSlave_ssrc.length) {
      result.audioSlave_ssrc = audioSlave_ssrc
    }
    if (video_ssrc.length) {
      if (video_ssrc.length > 1) {
        const temp: any = video_ssrc[0] || {}
        if (temp.streamType === 'low') {
          ;[video_ssrc[0], video_ssrc[1]] = [video_ssrc[1], video_ssrc[0]]
        }
      }
      result.video_ssrc = video_ssrc
    }
    if (screen_ssrc.length) {
      if (screen_ssrc.length > 1) {
        const temp: any = screen_ssrc[0] || {}
        if (temp.streamType === 'low') {
          ;[screen_ssrc[0], screen_ssrc[1]] = [screen_ssrc[1], screen_ssrc[0]]
        }
      }
      result.screen_ssrc = screen_ssrc
    }
    if (bwe.length) {
      result.bwe = bwe
    }
    //console.log('非标准格式的数据: ', result)
    return result
  }

  //转换chrome标准getStats格式
  formatChromeStandardizedStats(report: RTCStatsReport, direction: string, uid: string | number) {
    function getLimitationReason(reason: string) {
      if (reason === 'bandwidth') {
        return 1
      } else if (reason === 'cpu') {
        return 2
      } else if (reason === 'other') {
        return 3
      } else if (reason === 'none') {
        return 0
      }
    }
    const audioObj: { [key: string]: any } = {}
    const videoObj: { [key: string]: any } = {}
    let ssrc = 0
    report.forEach((item) => {
      if (item.type == 'media-source') {
        if (item.kind === 'audio') {
          audioObj.audioInputLevel = Math.round(item.audioLevel * 32768)
          audioObj.totalAudioEnergy = Math.round(item.totalAudioEnergy)
          audioObj.totalSamplesDuration = Math.round(item.totalSamplesDuration)
          item.echoReturnLoss ? (audioObj.echoReturnLoss = item.echoReturnLoss.toString()) : null
          item.echoReturnLossEnhancement
            ? (audioObj.echoReturnLossEnhancement = item.echoReturnLossEnhancement.toString())
            : null
        } else if (item.kind === 'video') {
          videoObj.framesEncoded = parseInt(item.frames)
          videoObj.frameRateInput = item.framesPerSecond
          videoObj.frameWidthInput = item.width
          videoObj.frameHeightInput = item.height
        }
      } else if (item.type == 'outbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.targetBitrate = item.targetBitrate
          audioObj.bytesSent = item.headerBytesSent + item.bytesSent
          audioObj.packetsSent = item.packetsSent
          audioObj.nackCount = item.nackCount
          audioObj.active = item.active ? 1 : 0
        } else if (item.kind === 'video') {
          videoObj.active = item.active ? 1 : 0
          videoObj.bytesSent = item.headerBytesSent + item.bytesSent
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesEncoded = item.framesEncoded
          videoObj.framesSent = item.framesSent
          videoObj.hugeFramesSent = item.hugeFramesSent
          videoObj.packetsSent = item.packetsSent
          videoObj.qpSum = item.qpSum
          videoObj.qualityLimitationReason = getLimitationReason(item.qualityLimitationReason)
          videoObj.qualityLimitationResolutionChanges = item.qualityLimitationResolutionChanges
          videoObj.targetBitrate = item.targetBitrate
          //这计算的是总的数据，不是实时数据，当前先依赖pc.getStats()反馈吧，后续不支持了在处理
          //videoObj.avgEncodeMs = Math.round((item.totalEncodeTime * 1000) / item.framesEncoded)
          item.framesPerSecond ? (videoObj.frameRateSent = item.framesPerSecond) : null
          item.frameWidth ? (videoObj.frameWidthSent = item.frameWidth) : null
          item.frameHeight ? (videoObj.frameHeightSent = item.frameHeight) : null
        }
      } else if (item.type == 'remote-inbound-rtp') {
        if (item.kind === 'audio') {
          audioObj.fractionLost = item.fractionLost
          audioObj.jitterReceived = Math.round(item.jitter * 1000)
          audioObj.packetsLost = item.packetsLost
          audioObj.rtt = Math.round(item.roundTripTime * 1000)
        } else if (item.kind === 'video') {
          videoObj.fractionLost = item.fractionLost
          videoObj.jitterReceived = Math.round(item.jitter * 1000)
          videoObj.packetsLost = item.packetsLost
          videoObj.rtt = Math.round(item.roundTripTime * 1000)
        }
      } else if (item.type == 'inbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.audioOutputLevel = Math.round(item.audioLevel * 32768)
          audioObj.totalAudioEnergy = Math.round(item.totalAudioEnergy)
          audioObj.totalSamplesDuration = Math.round(item.totalSamplesReceived)
          audioObj.bytesReceived = item.headerBytesReceived + item.bytesReceived
          audioObj.concealedSamples = item.concealedSamples
          audioObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp || 0
          audioObj.jitter = Math.round(item.jitter * 1000)
          audioObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          audioObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp
          audioObj.nackCount = item.nackCount
          audioObj.silentConcealedSamples = item.silentConcealedSamples
          audioObj.packetsLost = item.packetsLost
          audioObj.packetsReceived = item.packetsReceived
        } else if (item.kind === 'video') {
          videoObj.bytesReceived = item.bytesReceived + item.headerBytesReceived
          videoObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp
          videoObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesDecoded = item.framesDecoded
          videoObj.framesDropped = item.framesDropped
          videoObj.framesReceived = item.framesReceived
          videoObj.packetsReceived = item.packetsReceived
          videoObj.packetsLost = item.packetsLost
          videoObj.pauseCount = item.pauseCount
          videoObj.totalPausesDuration = item.totalPausesDuration
          videoObj.freezeCount = item.freezeCount
          videoObj.totalFreezesDuration = item.totalFreezesDuration
          //videoObj.decodeMs = 0 //可以计算每秒的解码耗时，当前先不处理
          videoObj.frameRateReceived = item.framesPerSecond
          videoObj.frameWidthReceived = item.frameWidth
          videoObj.frameHeightReceived = item.frameHeight
          videoObj.powerEfficientDecoder = item.powerEfficientDecoder ? 1 : 0
          videoObj.jitter = Math.round(item.jitter * 1000)
          videoObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
        }
      } else if (item.type == 'remote-outbound-rtp') {
        if (item.kind === 'audio') {
          item.jitter ? (audioObj.jitter = Math.round(item.jitter * 1000)) : null
          item.roundTripTime ? (audioObj.rtt = Math.round(item.roundTripTime * 1000)) : null
        } else if (item.kind === 'video') {
          item.jitter ? (videoObj.jitter = Math.round(item.jitter * 1000)) : null
          item.roundTripTime ? (videoObj.rtt = Math.round(item.roundTripTime * 1000)) : null
        }
      }
    })
    const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(ssrc)
    let mediaTypeShort = uidAndKindBySsrc?.kind
    if (JSON.stringify(videoObj) !== '{}') {
      videoObj.streamType = uidAndKindBySsrc?.streamType || 'high'
    }
    const result: { [key: string]: any } = {}
    if (direction === 'recv') {
      if (JSON.stringify(videoObj) !== '{}') {
        videoObj.uid = uidAndKindBySsrc?.uid
        //标准的getStats()就不参与数据计算了,会导致数据重复,后面同理
        //this.formativeStatsReport?.formatRecvData(videoObj, mediaTypeShort)
      } else if (JSON.stringify(audioObj) !== '{}') {
        audioObj.uid = uidAndKindBySsrc?.uid
        if (audioObj.audioOutputLevel) {
          const remoteStream = this?.adapterRef?.remoteStreamMap[audioObj.uid]
          const isPlaying = (mediaTypeShort && remoteStream?.isPlaying(mediaTypeShort)) || false
          this.audioLevel.push({
            uid,
            level: isPlaying ? +audioObj.audioOutputLevel || 0 : 0,
            type: mediaTypeShort
          })
        }
      }
    }
    if (mediaTypeShort?.includes('audio')) {
      result[`${mediaTypeShort}_ssrc`] = [audioObj]
    } else if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
      result[`${mediaTypeShort}_ssrc`] = [videoObj]
    }
    return result
  }

  /*
   safari浏览器getStats适配器
  */
  async safari(pc: RTCPeerConnection, direction: string) {
    if (!pc.getTransceivers) return {}

    let result = {
      audio_ssrc: [],
      audioSlave_ssrc: [],
      video_ssrc: [], //风险点，要求大流在前，小流在后，需要排序
      screen_ssrc: [] //风险点，要求大流在前，小流在后，需要排序
    }
    const transceivers = pc.getTransceivers()
    for (let i = 0; i < transceivers.length; i++) {
      let getStats = null
      let report = null
      const item = transceivers[i]
      if (item.direction === 'sendonly') {
        if (item.sender && item.sender.getStats) {
          report = await item.sender.getStats()
          report = this.formatSafariStandardizedStats(report, direction, 0)
          if (report.video_ssrc && result.video_ssrc) {
            //@ts-ignore
            result.video_ssrc.push(report.video_ssrc)
            if (result.video_ssrc.length > 1) {
              const temp: any = result.video_ssrc[0] || {}
              if (temp.streamType === 'low') {
                ;[result.video_ssrc[0], result.video_ssrc[1]] = [
                  result.video_ssrc[1],
                  result.video_ssrc[0]
                ]
              }
            }
          } else if (report.screen_ssrc && result.screen_ssrc) {
            //@ts-ignore
            result.screen_ssrc.push(report.screen_ssrc)
            if (result.screen_ssrc.length > 1) {
              const temp: any = result.screen_ssrc[0] || {}
              if (temp.streamType === 'low') {
                ;[result.screen_ssrc[0], result.screen_ssrc[1]] = [
                  result.screen_ssrc[1],
                  result.screen_ssrc[0]
                ]
              }
            }
          } else {
            Object.assign(result, report)
          }
        }
      } else if (item.direction === 'recvonly') {
        if (item.receiver && item.receiver.getStats) {
          report = await item.receiver.getStats()
          report = this.formatSafariStandardizedStats(report, direction, 0)
          if (report.audio_ssrc && result.audio_ssrc) {
            //@ts-ignore
            result.audio_ssrc.push(report.audio_ssrc[0])
          } else if (report.audioSlave_ssrc && result.audioSlave_ssrc) {
            //@ts-ignore
            result.audioSlave_ssrc.push(report.audioSlave_ssrc[0])
          } else if (report.video_ssrc && result.video_ssrc) {
            //@ts-ignore
            result.video_ssrc.push(report.video_ssrc[0])
          } else if (report.screen_ssrc && result.screen_ssrc) {
            //@ts-ignore
            result.screen_ssrc.push(report.screen_ssrc[0])
          } else {
            Object.assign(result, report)
          }
        }
      }
    }
    return result
  }

  formatSafariStandardizedStats(
    report: RTCStatsReport,
    direction: string,
    uid: string | number,
    mid?: string | null
  ) {
    const audioObj: { [key: string]: any } = {}
    const videoObj: { [key: string]: any } = {}
    let ssrc = 0
    report.forEach((item) => {
      if (item.type == 'track') {
        if (item.kind === 'audio') {
          audioObj.active = item.ended ? 0 : 1
        } else if (item.kind === 'video') {
          videoObj.active = item.ended ? 0 : 1
          videoObj.frameWidthInput = item.width
          videoObj.frameHeightInput = item.height
        }
      } else if (item.type == 'outbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.bytesSent = item.headerBytesSent + item.bytesSent
          audioObj.packetsSent = item.packetsSent
          audioObj.nackCount = item.nackCount
        } else if (item.kind === 'video') {
          videoObj.bytesSent = item.headerBytesSent + item.bytesSent
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesEncoded = item.framesEncoded
          videoObj.hugeFramesSent = item.hugeFramesSent
          videoObj.packetsSent = item.packetsSent
          videoObj.qpSum = item.qpSum
          videoObj.qualityLimitationResolutionChanges = item.qualityLimitationResolutionChanges
          //这计算的是总的数据，不是实时数据，当前先依赖pc.getStats()反馈吧，后续不支持了在处理
          videoObj.avgEncodeMs = Math.round((item.totalEncodeTime * 1000) / item.framesEncoded)
          item.framesPerSecond ? (videoObj.frameRateSent = item.framesPerSecond) : null
          item.frameWidth ? (videoObj.frameWidthSent = item.frameWidth) : null
          item.frameHeight ? (videoObj.frameHeightSent = item.frameHeight) : null
        }
      } else if (item.type == 'remote-inbound-rtp') {
        if (item.kind === 'audio') {
          audioObj.jitterReceived = Math.round(item.jitter * 1000)
          audioObj.packetsLost = item.packetsLost
          audioObj.rtt = Math.round(item.roundTripTime * 1000)
        } else if (item.kind === 'video') {
          videoObj.jitterReceived = Math.round(item.jitter * 1000)
          videoObj.packetsLost = item.packetsLost
          videoObj.rtt = Math.round(item.roundTripTime * 1000)
        }
      } else if (item.type == 'inbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.audioOutputLevel = Math.round(item.audioLevel * 32768)
          audioObj.totalAudioEnergy = Math.round(item.totalAudioEnergy)
          audioObj.totalSamplesDuration = Math.round(item.totalSamplesReceived)
          audioObj.bytesReceived = item.headerBytesReceived + item.bytesReceived
          audioObj.concealedSamples = item.concealedSamples || 0
          audioObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp || 0
          audioObj.jitter = Math.round(item.jitter * 1000)
          audioObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          audioObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp
          audioObj.nackCount = item.nackCount
          audioObj.silentConcealedSamples = item.silentConcealedSamples
          audioObj.packetsLost = item.packetsLost
          audioObj.packetsReceived = item.packetsReceived
        } else if (item.kind === 'video') {
          videoObj.bytesReceived = item.bytesReceived + item.headerBytesReceived
          videoObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp || 0
          videoObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp || 0
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesDecoded = item.framesDecoded
          videoObj.framesDropped = item.framesDropped
          videoObj.framesReceived = item.framesReceived
          videoObj.packetsReceived = item.packetsReceived
          videoObj.packetsLost = item.packetsLost
          //videoObj.decodeMs = 0 //可以计算每秒的解码耗时，当前先不处理
          videoObj.frameRateReceived = item.framesPerSecond
          videoObj.frameWidthReceived = item.frameWidth
          videoObj.frameHeightReceived = item.frameHeight
          videoObj.jitter = Math.round(item.jitter * 1000)
          videoObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
        }
      } else if (item.type == 'remote-outbound-rtp') {
        if (item.kind === 'audio') {
          item.jitter ? (audioObj.jitter = Math.round(item.jitter * 1000)) : null
          item.roundTripTime ? (audioObj.rtt = Math.round(item.roundTripTime * 1000)) : null
        } else if (item.kind === 'video') {
          item.jitter ? (videoObj.jitter = Math.round(item.jitter * 1000)) : null
          item.roundTripTime ? (videoObj.rtt = Math.round(item.roundTripTime * 1000)) : null
        }
      }
    })
    const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(ssrc)
    let mediaTypeShort = uidAndKindBySsrc?.kind
    if (JSON.stringify(videoObj) !== '{}') {
      videoObj.streamType = uidAndKindBySsrc?.streamType || 'high'
    }
    const result: { [key: string]: any } = {}
    if (direction === 'recv') {
      if (JSON.stringify(videoObj) !== '{}') {
        videoObj.uid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(videoObj, mediaTypeShort)
      } else if (JSON.stringify(audioObj) !== '{}') {
        audioObj.uid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(audioObj, mediaTypeShort)
        if (audioObj.audioOutputLevel) {
          const remoteStream = this?.adapterRef?.remoteStreamMap[audioObj.uid]
          const isPlaying = (mediaTypeShort && remoteStream?.isPlaying(mediaTypeShort)) || false
          this.audioLevel.push({
            uid,
            level: isPlaying ? +audioObj.audioOutputLevel || 0 : 0,
            type: mediaTypeShort
          })
        }
      }
    }
    if (mediaTypeShort?.includes('audio')) {
      if (direction === 'send') {
        this.formativeStatsReport?.formatSendData(audioObj, mediaTypeShort)
      }
      result[`${mediaTypeShort}_ssrc`] = [audioObj]
    } else if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
      if (uidAndKindBySsrc?.streamType === 'high' && direction === 'send') {
        this.formativeStatsReport?.formatSendData(videoObj, mediaTypeShort)
      }
      result[`${mediaTypeShort}_ssrc`] = [videoObj]
    }
    return result
  }

  async firefox(pc: RTCPeerConnection, direction: string) {
    if (!pc.getTransceivers) return {}

    let result = {
      audio_ssrc: [],
      audioSlave_ssrc: [],
      video_ssrc: [],
      screen_ssrc: []
    }
    const transceivers = pc.getTransceivers()
    for (let i = 0; i < transceivers.length; i++) {
      let getStats = null
      let report = null
      const item = transceivers[i]
      if (item.direction === 'sendonly') {
        if (item.sender && item.sender.getStats) {
          report = await item.sender.getStats()
          report = this.formatFirefoxStandardizedStats(report, direction, 0)
          Object.assign(result, report)
        }
      } else if (item.direction === 'recvonly') {
        if (item.receiver && item.receiver.getStats) {
          report = await item.receiver.getStats()
          report = this.formatFirefoxStandardizedStats(report, direction, 0)
          if (report.audio_ssrc && result.audio_ssrc) {
            //@ts-ignore
            result.audio_ssrc.push(report.audio_ssrc[0])
          } else if (report.audioSlave_ssrc && result.audioSlave_ssrc) {
            //@ts-ignore
            result.audioSlave_ssrc.push(report.audioSlave_ssrc[0])
          } else if (report.video_ssrc && result.video_ssrc) {
            //@ts-ignore
            result.video_ssrc.push(report.video_ssrc[0])
          } else if (report.screen_ssrc && result.screen_ssrc) {
            //@ts-ignore
            result.screen_ssrc.push(report.screen_ssrc[0])
          } else {
            Object.assign(result, report)
          }
        }
      }
    }
    return result
  }

  //转换标准getStats格式
  formatFirefoxStandardizedStats(
    report: RTCStatsReport,
    direction: string,
    uid: string | number,
    mid?: string | null
  ) {
    const audioObj: { [key: string]: any } = {}
    const videoObj: { [key: string]: any } = {}
    let ssrc = 0
    report.forEach((item) => {
      if (item.type == 'outbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.bytesSent = item.headerBytesSent + item.bytesSent
          audioObj.packetsSent = item.packetsSent
          audioObj.nackCount = item.nackCount
        } else if (item.kind === 'video') {
          videoObj.bytesSent = item.headerBytesSent + item.bytesSent
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.hugeFramesSent = item.hugeFramesSent
          videoObj.packetsSent = item.packetsSent
          videoObj.qpSum = item.qpSum
          //这计算的是总的数据，不是实时数据，当前先依赖pc.getStats()反馈吧，后续不支持了在处理
          videoObj.avgEncodeMs = Math.round((item.totalEncodeTime * 1000) / item.framesEncoded)
          //需要针对firefox计算帧率
          //item.framesEncoded ? (videoObj.frameRateInput = item.framesEncoded) : null
          item.framesPerSecond ? (videoObj.frameRateSent = item.framesPerSecond) : null
          item.frameWidth ? (videoObj.frameWidthSent = item.frameWidth) : null
          item.frameHeight ? (videoObj.frameHeightSent = item.frameHeight) : null
        }
      } else if (item.type == 'remote-inbound-rtp') {
        if (item.kind === 'video') {
          videoObj.fractionLost = item.fractionLost
          videoObj.jitterReceived = Math.round(item.jitter * 1000)
          videoObj.packetsLost = item.packetsLost
          videoObj.rtt = Math.round(item.roundTripTime * 1000)
        }
      } else if (item.type == 'inbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.totalSamplesDuration = Math.round(item.totalSamplesReceived)
          audioObj.bytesReceived = item.bytesReceived
          audioObj.concealedSamples = item.concealedSamples
          audioObj.jitter = Math.round(item.jitter * 1000)
          audioObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          audioObj.silentConcealedSamples = item.silentConcealedSamples
          audioObj.packetsLost = item.packetsLost
          audioObj.packetsReceived = item.packetsReceived
        } else if (item.kind === 'video') {
          videoObj.bytesReceived = item.bytesReceived
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesDecoded = item.framesDecoded
          videoObj.framesDropped = item.framesReceived - item.framesDecoded
          videoObj.framesReceived = item.framesReceived
          videoObj.packetsReceived = item.packetsReceived
          videoObj.packetsLost = item.packetsLost
          videoObj.frameRateReceived = item.framesPerSecond || 0
          videoObj.frameWidthReceived = item.frameWidth
          videoObj.frameHeightReceived = item.frameHeight
          videoObj.jitter = Math.round(item.jitter * 1000)
          videoObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
        }
      }
    })
    const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(ssrc)
    let mediaTypeShort = uidAndKindBySsrc?.kind
    if (JSON.stringify(videoObj) !== '{}') {
      videoObj.streamType = uidAndKindBySsrc?.streamType || 'high'
    }
    const result: { [key: string]: any } = {}
    if (direction === 'recv') {
      if (JSON.stringify(videoObj) !== '{}') {
        videoObj.uid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(videoObj, mediaTypeShort)
      } else if (JSON.stringify(audioObj) !== '{}') {
        audioObj.uid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(audioObj, mediaTypeShort)
        if (audioObj.audioOutputLevel) {
          const remoteStream = this?.adapterRef?.remoteStreamMap[audioObj.uid]
          const isPlaying = (mediaTypeShort && remoteStream?.isPlaying(mediaTypeShort)) || false
          this.audioLevel.push({
            uid,
            level: isPlaying ? +audioObj.audioOutputLevel || 0 : 0,
            type: mediaTypeShort
          })
        }
      }
    }
    if (mediaTypeShort?.includes('audio')) {
      if (direction === 'send') {
        this.formativeStatsReport?.formatSendData(audioObj, mediaTypeShort)
      }
      result[`${mediaTypeShort}_ssrc`] = [audioObj]
    } else if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
      if (uidAndKindBySsrc?.streamType === 'high' && direction === 'send') {
        this.formativeStatsReport?.formatSendData(videoObj, mediaTypeShort)
      }
      result[`${mediaTypeShort}_ssrc`] = [videoObj]
    }
    return result
  }

  stop() {
    this._reset()
  }

  destroy() {
    this._reset()
  }
}

export { GetStats }
