/*
 getStats适配器,该模块仅仅提供数据，以及封装成统一的格式
 设计方案：https://docs.popo.netease.com/lingxi/172c1c97e0034932a4b4097049d39a70
 */
import {
  AdapterRef,
  ILogger,
  MediaStatsChangeEvt,
  MediaTypeShort,
  StatsDirection,
  StatsInfo
} from '../../types'
import { FormativeStatsReport } from './formativeStatsData'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import { isIosFromRtpStats } from '../3rd/mediasoup-client/handlers/sdp/getNativeRtpCapabilities'
import { getParameters } from '../parameters'
import {
  FormativeStatsAudio,
  FormativeStatsVideo,
  PerSecondStatsProperty
} from './FormativeStatsInterface'

class GetStats {
  private adapterRef: AdapterRef
  private times = 0
  private browser: 'chrome' | 'safari' | 'firefox'
  public formativeStatsReport: FormativeStatsReport | null
  private audioLevel: { uid: number | string; level: number; type: string | undefined }[]
  private tmp = { bytesSent: 0, bytesReceived: 0 }
  public statsInfo: {
    send: StatsInfo
    recv: StatsInfo
  }
  private chromeLegecy: 'unknown' | 'supported' | 'unsupported' =
    getParameters().chromeLegacyDefault
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
    this.statsInfo = {
      send: {
        firstStartAt: 0,
        lastStartAt: 0,
        totalCnt: 0,
        frequency: 0,
        errCnt: 0,
        cpStats: null,
        statsMapHistory: {},
        logger: this.adapterRef.logger.getChild(() => {
          return `getStats ${this.browser} send ${this.statsInfo.send.errCnt}/${this.statsInfo.send.totalCnt}`
        })
      },
      recv: {
        firstStartAt: 0,
        lastStartAt: 0,
        totalCnt: 0,
        frequency: 0,
        errCnt: 0,
        cpStats: null,
        statsMapHistory: {},
        logger: this.adapterRef.logger.getChild(() => {
          return `getStats ${this.browser} recv ${this.statsInfo.recv.errCnt}/${this.statsInfo.recv.totalCnt} `
        })
      }
    }
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

  markStatsStart(direction: StatsDirection) {
    const info = this.statsInfo[direction]
    if (info) {
      info.lastStartAt = Date.now()
      if (!info.firstStartAt) {
        info.firstStartAt = info.lastStartAt
      }
      info.totalCnt += 1
      // 1分钟调用了几次getStats
      info.frequency = Math.floor((info.totalCnt / (info.lastStartAt - info.firstStartAt)) * 60000)
    }
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

    this.tmp = { bytesSent: 0, bytesReceived: 0 }
    this.times = (this.times || 0) + 1
    let localStats: any = null
    let remoteStats: any = null
    try {
      let localPc = this?.adapterRef?._mediasoup?._sendTransport?._handler?._pc
      if (!localPc) {
        return
      } else {
        localStats = await this.getLocalStats(localPc)
      }
    } catch (e) {
      this.statsInfo.send.errCnt++
      if (this.statsInfo.send.errCnt <= getParameters().statsLogMaxCnt) {
        this.statsInfo.send.logger.warn('数据汇集出现异常: ', e.name, e.message, e.stack)
      }
    }
    try {
      this.audioLevel.length = 0
      this!.adapterRef!.remoteAudioStats = {}
      this!.adapterRef!.remoteAudioSlaveStats = {}
      this!.adapterRef!.remoteVideoStats = {}
      this!.adapterRef!.remoteScreenStats = {}

      let remotePc = this?.adapterRef?._mediasoup?._recvTransport?._handler?._pc
      if (!remotePc) {
        return
      }
      remoteStats = await this.getRemoteStats(remotePc)

      this.audioLevel.sort(compare('level'))
      if (
        this.audioLevel.length > 0 &&
        this.audioLevel[0].level > getParameters().activeSpeakerMin
      ) {
        // 当对方mute时仍然会有audioLevel。对小于 activeSpeakerMin的值不应该触发active-speaker事件
        // Firefox 获取不到audioLevel, 没有active-speaker探测能力
        this?.adapterRef?.instance.safeEmit('active-speaker', this.audioLevel[0])
        this?.adapterRef?.instance.safeEmit('volume-indicator', this.audioLevel)
      }
      //this.logger.log('stats before revised--->', result)
    } catch (e: any) {
      this.statsInfo.recv.errCnt++
      if (this.statsInfo.recv.errCnt <= getParameters().statsLogMaxCnt) {
        this.statsInfo.recv.logger.warn('数据汇集出现异常: ', e.name, e.message, e.stack)
      }
    }
    let result = {
      local: localStats,
      remote: remoteStats,
      times: this.times
    }
    return result
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
  async chrome(pc: RTCPeerConnection, direction: StatsDirection) {
    const nonStandardStats = () => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve) => {
        try {
          this.markStatsStart(direction)
          // 由于Chrome为callback形式的getStats使用了非标准化的接口，故不遵守TypeScript定义
          // @ts-ignore
          await pc.getStats((res) => {
            this.chromeLegecy = 'supported'
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
        } catch (e) {
          this.statsInfo[direction].errCnt++
          if (e.name === 'TypeError') {
            this.statsInfo[direction].logger.warn(
              `getStats出现异常：${e.name}。fallback: 切换getStats方式 ${this.browser} => safari`,
              e.name,
              e.message
            )
            this.browser = 'safari'
          } else if (e.name === 'NotSupportedError') {
            this.statsInfo[direction].logger.log(
              `getStats：当前浏览器不再支持非标准getStats ${e.name} ${e.message}`
            )
            if (this.chromeLegecy === 'unknown') {
              this.chromeLegecy = 'unsupported'
            }
            resolve(null)
          } else {
            if (this.statsInfo[direction].errCnt <= getParameters().statsLogMaxCnt) {
              this.statsInfo[direction].logger.warn(`getStats出现异常: ${e.name} ${e.message}`)
            }
            resolve(null)
          }
        }
      })
    }

    const standardizedStats = async () => {
      if (!pc.getTransceivers) return {}

      let result = {
        audio_ssrc: [],
        audioSlave_ssrc: [],
        video_ssrc: [], //风险点，要求大流在前，小流在后，需要排序
        screen_ssrc: [], //风险点，要求大流在前，小流在后，需要排序
        bwe: []
      }
      const transceivers = pc.getTransceivers()
      for (let i = 0; i < transceivers.length; i++) {
        let report = null
        const item = transceivers[i]
        if (item.direction === 'sendonly') {
          if (item.sender && item.sender.track && item.sender.getStats) {
            this.markStatsStart(direction)
            report = await item.sender.getStats()
            report = this.formatChromeStandardizedStats(report, direction)
            if (report.video_ssrc && result.video_ssrc) {
              //@ts-ignore
              result.video_ssrc.push(report.video_ssrc[0])
              //排序，保障大流在数组的第一位
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
          if (result.bwe.length === 0 && this.statsInfo.send.cpStats) {
            result.bwe.push({
              // @ts-ignore
              googAvailableSendBandwidth:
                // @ts-ignore
                this.statsInfo.send.cpStats.availableOutgoingBitrate / 1000
            })
          }
        } else if (item.direction === 'recvonly') {
          if (item.receiver && item.receiver.track && item.receiver.getStats) {
            this.markStatsStart(direction)
            report = await item.receiver.getStats()
            report = this.formatChromeStandardizedStats(report, direction)
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

    const nonStandardResult = this.chromeLegecy === 'unsupported' ? null : await nonStandardStats()
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
    if (getParameters().showStatsLog) {
      if (direction === 'send') {
        this.statsInfo.send.logger.warn(`getStats send`, assignedResult)
      } else {
        this.statsInfo.recv.logger.warn(`getStats recv`, assignedResult)
      }
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
        return 0
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
    const audio_ssrc: any = []
    const audioSlave_ssrc: any = []
    const video_ssrc: any = []
    const screen_ssrc: any = []
    const bwe: any = []

    const mediaStateChangeEvt: MediaStatsChangeEvt = { data: [] }

    Object.values(stats).forEach((item) => {
      // 普通换算
      if (item.id.includes('Conn-') && item.googActiveConnection === 'true') {
        //使用ice选中的CandidatePair
        this.formativeStatsReport?.formatTransportData(item, direction)
      }
      if (item.id.includes('Cand-') && item.networkType) {
        //避免远端Candidate的干扰
        this!.adapterRef!.transportStats.NetworkType = item.networkType || ''
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
          googTransmitBitrate: parseInt(item.googTransmitBitrate) || 0,
          googBucketDelay: parseInt(item.googBucketDelay) || 0
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
            item.audioInputLevel !== undefined
              ? (tmp.audioInputLevel = parseInt(item.audioInputLevel))
              : null
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
            item.googEchoCancellationReturnLoss !== undefined
              ? (tmp.echoReturnLoss = '' + item.googEchoCancellationReturnLoss)
              : null
            item.googEchoCancellationReturnLossEnhancement !== undefined
              ? (tmp.echoReturnLossEnhancement = item.googEchoCancellationReturnLossEnhancement)
              : null
            this.formativeStatsReport?.formatSendData(tmp, mediaTypeShort)
            //tmp.active = item.active //不支持

            //sdk接口getLocalAudioStats()数据封装
            const audioStats = {
              CodecType: 'Opus',
              rtt: tmp.rtt || 0,
              MuteState: this?.adapterRef?.localStream?.muteStatus?.audio?.send || false,
              RecordingLevel: tmp.audioInputLevel || 0,
              SamplingRate: getSamplingRate(this?.adapterRef?.localStream?.audioProfile),
              SendBitrate: tmp.bitsSentPerSecond || 0,
              SendLevel: tmp.audioInputLevel || 0
            }
            if (mediaTypeShort === 'audio') {
              audio_ssrc.push(tmp)
              //@ts-ignore
              if (pc.audioSender?.track) {
                this!.adapterRef!.localAudioStats[0] = audioStats
              } else {
                //@ts-ignore
                this.adapterRef.localAudioStats = []
              }
            } else if (mediaTypeShort === 'audioSlave') {
              audioSlave_ssrc.push(tmp)
              //@ts-ignore
              if (pc.audioSlaveSender?.track) {
                this!.adapterRef!.localAudioSlaveStats[0] = audioStats
              } else {
                //@ts-ignore
                this.adapterRef.localAudioSlaveStats = []
              }
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
            item.framesEncoded !== undefined
              ? (tmp.framesEncoded = parseInt(item.framesEncoded))
              : null
            //tmp.framesEncodedPerSecond = 0//后面的模块计算得出
            tmp.avgEncodeMs = parseInt(item.googAvgEncodeMs)
            tmp.encodeUsagePercent = parseInt(item.googEncodeUsagePercent)
            tmp.frameRateInput = parseInt(item.googFrameRateInput)
            tmp.frameRateSent = parseInt(item.googFrameRateSent)
            tmp.frameWidthInput = parseInt(item.googFrameWidthInput)
            tmp.frameWidthSent = parseInt(item.googFrameWidthSent)
            tmp.frameHeightInput = parseInt(item.googFrameHeightInput)
            tmp.frameHeightSent = parseInt(item.googFrameHeightSent)
            item.hugeFramesSent !== undefined
              ? (tmp.hugeFramesSent = parseInt(item.hugeFramesSent))
              : null
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
              CodecImplementationName: item.codecImplementationName || '',
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
              TotalDuration:
                this?.adapterRef?.state.startPubVideoTime !== undefined
                  ? (Date.now() - this.adapterRef.state.startPubVideoTime) / 1000
                  : 0,
              TotalFreezeTime: tmp.totalFreezeTime || 0
            }
            if (mediaTypeShort === 'video') {
              video_ssrc.push(tmp)
              //@ts-ignore
              if (pc.videoSender?.track) {
                if (streamType === 'high') {
                  const oldVideoStats = this.adapterRef.localVideoStats[0]
                  this!.adapterRef!.localVideoStats[0] = videoStats
                  mediaStateChangeEvt.data.push({
                    mediaType: 'video',
                    streamType: 'high',
                    old: oldVideoStats,
                    new: videoStats
                  })
                }
              } else {
                mediaStateChangeEvt.data.push({
                  mediaType: 'video',
                  streamType: 'high',
                  old: this.adapterRef.localVideoStats[0] || null,
                  new: null
                })
                this.adapterRef.localVideoStats = []
              }
            } else if (mediaTypeShort === 'screen') {
              //@ts-ignore
              if (pc.screenSender?.track) {
                if (streamType === 'high') {
                  videoStats.MuteState =
                    this!.adapterRef!.localStream?.muteStatus?.screen?.send || false
                  videoStats.TotalDuration =
                    this?.adapterRef?.state.startPubScreenTime !== undefined
                      ? (Date.now() - this.adapterRef.state.startPubScreenTime) / 1000
                      : 0
                  videoStats.LayerType = 2
                  const oldScreenStats = this.adapterRef.localScreenStats[0]
                  this!.adapterRef!.localScreenStats[0] = videoStats
                  mediaStateChangeEvt.data.push({
                    mediaType: 'screen',
                    streamType: 'high',
                    old: oldScreenStats,
                    new: videoStats
                  })
                }
              } else {
                mediaStateChangeEvt.data.push({
                  mediaType: 'screen',
                  streamType: 'high',
                  old: this.adapterRef.localScreenStats[0] || null,
                  new: null
                })
                this.adapterRef.localScreenStats = []
              }
              screen_ssrc.push(tmp)
            }
          }
        } else if (direction === 'recv') {
          if (!targetUid) {
            return {}
          }
          this.formativeStatsReport?.clearFirstRecvData(targetUid)
          tmp.remoteuid = targetUid
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
            const remoteStream = this?.adapterRef?.remoteStreamMap[tmp.remoteuid]
            const muteStatusObj = remoteStream?.muteStatus[mediaTypeShort as MediaTypeShort]
            const muteStatus = muteStatusObj ? muteStatusObj.send || muteStatusObj.recv : false
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
              tmp.remoteuid
                ? (this!.adapterRef!.remoteAudioStats[tmp.remoteuid] = audioStats)
                : null
              audio_ssrc.push(tmp)
            } else if (mediaTypeShort === 'audioSlave') {
              tmp.remoteuid
                ? (this!.adapterRef!.remoteAudioSlaveStats[tmp.remoteuid] = audioStats)
                : null
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
            tmp.currentDelayMs = parseInt(item.googCurrentDelayMs)
            //tmp.powerEfficientDecoder = 1 //不支持
            item.googJitterBufferMs !== undefined
              ? (tmp.jitterBufferDelay = parseInt(item.googJitterBufferMs))
              : null
            this.formativeStatsReport?.formatRecvData(tmp, mediaTypeShort)

            const remoteStream = this?.adapterRef?.remoteStreamMap[tmp.remoteuid]
            let videoDom = remoteStream && remoteStream.Play && remoteStream?.Play?.video.dom
            let muteState =
              (remoteStream &&
                (remoteStream.muteStatus.video.send || remoteStream.muteStatus.video.recv)) ||
              false
            if (mediaTypeShort === 'screen') {
              videoDom = remoteStream && remoteStream.Play && remoteStream?.Play?.screen.dom
              muteState =
                (remoteStream &&
                  (remoteStream.muteStatus.screen.send || remoteStream.muteStatus.screen.recv)) ||
                false
            }

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
              this!.adapterRef!.remoteVideoStats[tmp.remoteuid] = videoStats
              video_ssrc.push(tmp)
            } else if (mediaTypeShort === 'screen') {
              videoStats.LayerType = 2
              this!.adapterRef!.remoteScreenStats[tmp.remoteuid] = videoStats
              screen_ssrc.push(tmp)
            }
          }
        }
      }
    })
    this.adapterRef.instance.safeEmit('@media-stats-change', mediaStateChangeEvt)

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
  formatChromeStandardizedStats(report: RTCStatsReport, direction: 'send' | 'recv') {
    function getLimitationReason(reason: string) {
      if (reason === 'bandwidth') {
        return 1
      } else if (reason === 'cpu') {
        return 2
      } else if (reason === 'other') {
        return 3
      } else if (reason === 'none') {
        return 0
      } else {
        return 0
      }
    }
    const audioObj = new FormativeStatsAudio()
    const videoObj = new FormativeStatsVideo()
    let ssrc = 0
    report.forEach((item) => {
      const itemHistoryCandidates = this.statsInfo[direction].statsMapHistory[item.id]
      let itemHistory: any = null
      if (itemHistoryCandidates) {
        for (let i = itemHistoryCandidates.length - 1; i >= 0; i--) {
          if (!itemHistory) {
            if (
              item.timestamp - itemHistoryCandidates[i].timestamp >=
              getParameters().statsHistoryInterval
            ) {
              // 找到一个3秒以外的点，计算基于那个点的每秒数据
              itemHistory = itemHistoryCandidates[i]
            }
          } else {
            itemHistoryCandidates.splice(i, 1)
          }
        }
        // 把现在这个点存入
        if (itemHistoryCandidates.length < 10 && item.timestamp) {
          itemHistoryCandidates.push(item)
        }
      } else {
        this.statsInfo[direction].statsMapHistory[item.id] = [item]
      }

      if (item.type == 'media-source') {
        if (item.kind === 'audio') {
          audioObj.audioInputLevel = Math.round(item.audioLevel * 32768)
          audioObj.totalAudioEnergy = Math.round(item.totalAudioEnergy)
          audioObj.totalSamplesDuration = Math.round(item.totalSamplesDuration)
          if (item.echoReturnLoss) {
            audioObj.echoReturnLoss = '' + item.echoReturnLoss
          }
          if (item.echoReturnLossEnhancement) {
            audioObj.echoReturnLossEnhancement = '' + item.echoReturnLossEnhancement * 100
          }
        } else if (item.kind === 'video') {
          //item.frames !== undefined ? (videoObj.framesEncoded = parseInt(item.frames)) : null
          videoObj.frameRateInput = item.framesPerSecond
          videoObj.frameWidthInput = item.width
          videoObj.frameHeightInput = item.height
        }
      } else if (item.type === 'media-playout') {
        if (item.kind === 'audio') {
          audioObj.totalPlayoutDelay = item.totalPlayoutDelay
        } else if (item.kind === 'video') {
          videoObj.totalPlayoutDelay = item.totalPlayoutDelay
        }
      } else if (item.type == 'outbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          setValidInteger(audioObj, 'targetBitrate', item.targetBitrate / 1000)
          audioObj.bytesSent = item.headerBytesSent + item.bytesSent
          audioObj.packetsSent = item.packetsSent
          if (itemHistory && direction === 'send') {
            const bytesSentPerSecond = getValuePerSecond(item, itemHistory, 'bytesSent')
            const headerBytesSentPerSecond = getValuePerSecond(item, itemHistory, 'headerBytesSent')
            const bitsSentPerSecond = (bytesSentPerSecond + headerBytesSentPerSecond) * 0.008
            setValidInteger(audioObj, 'bitsSentPerSecond', bitsSentPerSecond)

            const packetsSentPerSecond = getValuePerSecond(item, itemHistory, 'packetsSent')
            setValidInteger(audioObj, 'packetsSentPerSecond', packetsSentPerSecond)
          }
          setValidInteger(audioObj, 'nackCount', item.nackCount)
          audioObj.active = item.active ? 1 : 0
        } else if (item.kind === 'video') {
          videoObj.active = item.active ? 1 : 0
          videoObj.bytesSent = item.headerBytesSent + item.bytesSent
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          setValidInteger(videoObj, 'framesEncoded', item.framesEncoded)
          setValidInteger(videoObj, 'framesSent', item.framesSent)
          setValidInteger(videoObj, 'hugeFramesSent', item.hugeFramesSent)
          videoObj.packetsSent = item.packetsSent
          videoObj.qpSum = item.qpSum

          if (itemHistory && direction === 'send') {
            const bytesSentPerSecond = getValuePerSecond(item, itemHistory, 'bytesSent')
            const headerBytesSentPerSecond = getValuePerSecond(item, itemHistory, 'headerBytesSent')
            const bitsSentPerSecond = (bytesSentPerSecond + headerBytesSentPerSecond) * 0.008
            setValidInteger(videoObj, 'bitsSentPerSecond', bitsSentPerSecond)

            const packetsSentPerSecond = getValuePerSecond(item, itemHistory, 'packetsSent')
            setValidInteger(videoObj, 'packetsSentPerSecond', packetsSentPerSecond)

            const framesEncodedPerSecond = getValuePerSecond(item, itemHistory, 'framesEncoded')
            setValidInteger(videoObj, 'framesEncodedPerSecond', framesEncodedPerSecond)

            const qpSumPerSecond = getValuePerSecond(item, itemHistory, 'qpSum')
            // 按照formativeStatsData的公式，这个值并不在0-100之间。这里去掉了0-100的限制
            const qpPercentage = (qpSumPerSecond / framesEncodedPerSecond) * 100
            setValidInteger(videoObj, 'qpPercentage', qpPercentage)

            const encodeUsagePercent = getValuePerSecond(item, itemHistory, 'totalEncodeTime') * 100
            setValidInteger(videoObj, 'encodeUsagePercent', encodeUsagePercent)
          }
          videoObj.qualityLimitationReason = '' + getLimitationReason(item.qualityLimitationReason)
          videoObj.qualityLimitationResolutionChanges = item.qualityLimitationResolutionChanges
          videoObj.CodecImplementationName = item.encoderImplementation
          setValidInteger(videoObj, 'targetBitrate', item.targetBitrate / 1000)
          //这计算的是总的数据，不是实时数据，当前先依赖pc.getStats()反馈吧，后续不支持了在处理
          //videoObj.avgEncodeMs = Math.round((item.totalEncodeTime * 1000) / item.framesEncoded)
          setValidInteger(videoObj, 'frameRateSent', item.framesPerSecond)
          item.frameWidth !== undefined ? (videoObj.frameWidthSent = item.frameWidth) : null
          item.frameHeight !== undefined ? (videoObj.frameHeightSent = item.frameHeight) : null
          if (item.framesEncoded && item.totalEncodeTime && itemHistory) {
            const avgEncodeMs =
              ((item.totalEncodeTime - itemHistory.totalEncodeTime) * 1000) /
              (item.framesEncoded - itemHistory.framesEncoded)
            setValidInteger(videoObj, 'avgEncodeMs', avgEncodeMs)
          }
        }
      } else if (item.type == 'remote-inbound-rtp') {
        // remote-inbound-rtp是一些对端报告的数据（RR），很多数据比较奇怪，在此仍尽量上报。
        if (item.kind === 'audio') {
          setValidInteger(audioObj, 'fractionLost', item.fractionLost * 1000)
          audioObj.jitterReceived = Math.round(item.jitter * 1000)
          audioObj.packetsLost = item.packetsLost
          if (itemHistory && direction === 'send') {
            const packetLostPerSecond = getValuePerSecond(item, itemHistory, 'packetsLost')
            const packetsLostRate =
              (packetLostPerSecond / (audioObj.packetsSentPerSecond || 50)) * 100
            // 该值不准确。
            // 上行的packetsLostPerSecond是基于对端的RR。在完全断网的情况下，收不到RR消息，也就无法计算出实际的丢包率
            setValidInteger(audioObj, 'packetsLostRate', packetsLostRate)
          }
          setValidInteger(audioObj, 'rtt', item.roundTripTime * 1000)
        } else if (item.kind === 'video') {
          setValidInteger(videoObj, 'fractionLost', item.fractionLost * 1000)
          videoObj.jitter = Math.round(item.jitter * 1000)
          videoObj.packetsLost = item.packetsLost
          if (itemHistory && direction === 'send') {
            const packetLostPerSecond = getValuePerSecond(item, itemHistory, 'packetsLost')
            const packetsLostRate =
              (packetLostPerSecond / (videoObj.packetsSentPerSecond || 0)) * 100
            // 该值不准确。报告的packetsLost与实际的PacketsSent并不是一个时间段。
            // 上行的packetsLostPerSecond是基于对端的RR。在完全断网的情况下，收不到RR消息，也就无法计算出实际的丢包率
            setValidInteger(videoObj, 'packetsLostRate', packetsLostRate)
          }
          setValidInteger(videoObj, 'rtt', item.roundTripTime * 1000)
        }
      } else if (item.type == 'inbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          setValidInteger(audioObj, 'audioOutputLevel', item.audioLevel * 32768)
          setValidInteger(audioObj, 'totalAudioEnergy', item.totalAudioEnergy)
          setValidInteger(audioObj, 'totalSamplesDuration', item.totalSamplesReceived / 48000)
          audioObj.bytesReceived = item.headerBytesReceived + item.bytesReceived
          setValidInteger(audioObj, 'concealedSamples', item.concealedSamples)
          setValidInteger(audioObj, 'estimatedPlayoutTimestamp', item.estimatedPlayoutTimestamp)
          setValidInteger(audioObj, 'jitter', item.jitter * 1000)
          // https://developer.chrome.com/blog/getstats-migration/
          setValidInteger(audioObj, 'jitterBufferDelay', item.jitterBufferDelay * 1000)
          setValidInteger(
            audioObj,
            'jitterBufferMs',
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          setValidInteger(
            audioObj,
            'preemptiveExpandRate',
            (item.insertedSamplesForDeceleration * 100) / item.totalSamplesReceived
          )
          setValidInteger(
            audioObj,
            'preferredJitterBufferMs',
            (item.jitterBufferTargetDelay * 1000) / item.jitterBufferEmittedCount
          )
          // 这个值官网说明应该不正确。找了个替代值
          setValidInteger(
            audioObj,
            'secondaryDecodedRate',
            item.fecPacketsReceived - item.fecPacketsDiscarded
          )
          setValidInteger(audioObj, 'secondaryDiscardedRate', item.fecPacketsDiscarded)
          setValidInteger(
            audioObj,
            'speechExpandRate',
            ((item.concealedSamples - item.silentConcealedSamples) * 100) / item.concealedSamples
          )
          audioObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp
          setValidInteger(audioObj, 'nackCount', item.nackCount)
          setValidInteger(audioObj, 'silentConcealedSamples', item.silentConcealedSamples)
          audioObj.packetsLost = item.packetsLost
          audioObj.packetsReceived = item.packetsReceived
          if (itemHistory && direction === 'recv') {
            const bitsReceivedPerSecond =
              getValuePerSecond(item, itemHistory, 'bytesReceived') * 0.008
            setValidInteger(audioObj, 'bitsReceivedPerSecond', bitsReceivedPerSecond)

            const packetsReceivedPerSecond = getValuePerSecond(item, itemHistory, 'packetsReceived')
            setValidInteger(audioObj, 'packetsReceivedPerSecond', packetsReceivedPerSecond)
            const packetLostPerSecond = getValuePerSecond(item, itemHistory, 'packetsLost')
            const packetsLostRate =
              (packetLostPerSecond / (packetsReceivedPerSecond + packetLostPerSecond || 50)) * 100
            // 由于packetsLost可能为负数，所以实际上packetsLostRate也可能为负数。为避免歧义，此处消除负数值
            // https://www.w3.org/TR/webrtc-stats/#dom-rtcreceivedrtpstreamstats-packetslost
            if (packetsLostRate >= 0) {
              setValidInteger(audioObj, 'packetsLostRate', packetsLostRate)
            }
          }
        } else if (item.kind === 'video') {
          videoObj.bytesReceived = item.bytesReceived + item.headerBytesReceived
          videoObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp
          videoObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesDecoded = item.framesDecoded
          setValidInteger(videoObj, 'framesDropped', item.framesDropped)
          setValidInteger(videoObj, 'framesReceived', item.framesReceived)
          videoObj.packetsReceived = item.packetsReceived
          videoObj.packetsLost = item.packetsLost
          setValidInteger(videoObj, 'pauseCount', item.pauseCount)
          setValidInteger(videoObj, 'totalPausesDuration', item.totalPausesDuration * 1000)
          setValidInteger(videoObj, 'freezeCount', item.freezeCount)
          setValidInteger(videoObj, 'totalFreezesDuration', item.totalFreezesDuration * 1000)
          //videoObj.decodeMs = 0 //可以计算每秒的解码耗时，当前先不处理
          setValidInteger(videoObj, 'frameRateReceived', item.framesPerSecond)
          setValidInteger(videoObj, 'frameWidthReceived', item.frameWidth)
          setValidInteger(videoObj, 'frameHeightReceived', item.frameHeight)
          const codecImplementation = item.decoderImplementation
          if (codecImplementation === 'OpenH264') {
            videoObj.powerEfficientDecoder = 2
          } else if (codecImplementation) {
            videoObj.powerEfficientDecoder = 1
          } else {
            videoObj.powerEfficientDecoder = 0
          }
          //videoObj.jitter = Math.round(item.jitter * 1000)
          setValidInteger(
            videoObj,
            'jitterBufferDelay',
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          if (itemHistory && direction === 'recv') {
            // inbound rtp
            const bitsReceivedPerSecond =
              getValuePerSecond(item, itemHistory, 'bytesReceived') * 0.008
            setValidInteger(videoObj, 'bitsReceivedPerSecond', bitsReceivedPerSecond)

            const packetsReceivedPerSecond = getValuePerSecond(item, itemHistory, 'packetsReceived')
            setValidInteger(videoObj, 'packetsReceivedPerSecond', packetsReceivedPerSecond)
            const packetLostPerSecond = getValuePerSecond(item, itemHistory, 'packetsLost')
            const packetsLostRate =
              (packetLostPerSecond / (packetsReceivedPerSecond + packetLostPerSecond)) * 100
            // 由于packetsLost可能为负数，所以实际上packetsLostRate也可能为负数。为避免歧义，此处消除负数值
            // https://www.w3.org/TR/webrtc-stats/#dom-rtcreceivedrtpstreamstats-packetslost
            if (packetsLostRate >= 0) {
              setValidInteger(videoObj, 'packetsLostRate', packetsLostRate)
            }

            const totalDecodeTimeDelta =
              getValuePerSecond(item, itemHistory, 'totalDecodeTime') * 1000
            const framesDecodedDelta = getValuePerSecond(item, itemHistory, 'framesDecoded')
            setValidInteger(videoObj, 'decodeMs', totalDecodeTimeDelta / framesDecodedDelta)

            const frameRateDecoded = getValuePerSecond(item, itemHistory, 'framesDecoded')
            setValidInteger(videoObj, 'frameRateDecoded', frameRateDecoded)
            const frameRateDropped = getValuePerSecond(item, itemHistory, 'framesDropped')
            setValidInteger(videoObj, 'frameRateOutput', frameRateDecoded - frameRateDropped)
          }
        }
      } else if (item.type == 'remote-outbound-rtp') {
        if (item.kind === 'audio') {
          // 实际上Chrome 117 audio 下行的RR没有这些值，但保留
          item.jitter && setValidInteger(audioObj, 'jitter', item.jitter * 1000)
          item.roundTripTime && setValidInteger(audioObj, 'rtt', item.roundTripTime * 1000)
        } else if (item.kind === 'video') {
          // item.jitter ? (videoObj.jitter = Math.round(item.jitter * 1000)) : null
          // item.roundTripTime ? (videoObj.rtt = Math.round(item.roundTripTime * 1000)) : null
        }
      } else if (item.type == 'track') {
        //Chrome85版本及以下，audioLevel存在track的属性中，新版本的chrome，track属性废弃
        if (direction === 'recv') {
          if (item.kind === 'audio') {
            setValidInteger(audioObj, 'audioOutputLevel', item.audioLevel * 32768)
          }
        }
      } else if (item.type === 'candidate-pair') {
        setValidInteger(audioObj, 'rtt', item.currentRoundTripTime * 1000)
        setValidInteger(videoObj, 'rtt', item.currentRoundTripTime * 1000)
        this.statsInfo[direction].cpStats = item
      } else if (item.type === 'codec') {
        if (item.mimeType) {
          const [kind, codec] = item.mimeType.split('/')
          if (kind === 'audio') {
            if (item.mimeType === 'audio/opus') {
              audioObj.CodecType = 'Opus'
            } else {
              audioObj.CodecType = codec
            }
          } else if (kind === 'video') {
            if (item.mimeType) {
              videoObj.CodecName = codec
            }
          } else {
            audioObj.CodecType = item.mimeType
            videoObj.CodecName = item.mimeType
          }
        }
      }
    })
    const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(ssrc)
    if (!ssrc || !uidAndKindBySsrc) {
      return {}
    }
    let mediaTypeShort = uidAndKindBySsrc?.kind

    //计算来自多个item的合成数据
    if (direction === 'recv') {
      if (mediaTypeShort === 'audio' || mediaTypeShort === 'audioSlave') {
        if (audioObj.jitterBufferDelay && audioObj.totalPlayoutDelay) {
          audioObj.currentDelayMs = audioObj.jitterBufferDelay + audioObj.totalPlayoutDelay
        }
      } else if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
        if (videoObj.jitterBufferDelay && videoObj.totalPlayoutDelay) {
          videoObj.currentDelayMs = videoObj.jitterBufferDelay + videoObj.totalPlayoutDelay
        }
      }
    }

    if (direction === 'send') {
      const localStream = this.adapterRef.localStream
      if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
        videoObj.streamType = uidAndKindBySsrc?.streamType || 'high'
        if (this.chromeLegecy !== 'supported' && videoObj.streamType === 'high') {
          this.formativeStatsReport?.formatSendData(videoObj, mediaTypeShort)
          videoObj.LayerType = mediaTypeShort === 'video' ? 1 : 2
          videoObj.CaptureFrameRate = videoObj.frameRateInput
          videoObj.CaptureResolutionHeight = videoObj.frameHeightInput
          videoObj.CaptureResolutionWidth = videoObj.frameWidthInput
          videoObj.EncodeDelay = videoObj.avgEncodeMs
          if (localStream) {
            videoObj.MuteState = localStream.getMuteStatus(mediaTypeShort).muted
          }
          videoObj.SendBitrate = videoObj.bitsSentPerSecond
          videoObj.SendFrameRate = videoObj.frameRateSent
          videoObj.SendResolutionHeight = videoObj.frameHeightSent
          videoObj.SendResolutionWidth = videoObj.frameWidthSent
          videoObj.TargetSendBitrate = videoObj.targetBitrate
          if (mediaTypeShort === 'video' && this.adapterRef.state.startPubVideoTime) {
            videoObj.TotalDuration = (Date.now() - this.adapterRef.state.startPubVideoTime) / 1000
          }
          if (mediaTypeShort === 'screen' && this.adapterRef.state.startPubScreenTime) {
            videoObj.TotalDuration = (Date.now() - this.adapterRef.state.startPubScreenTime) / 1000
          }
          const videoStats = {
            LayerType: videoObj.LayerType,
            CodecName: videoObj.CodecName,
            CodecImplementationName: videoObj.CodecImplementationName,
            CaptureFrameRate: videoObj.CaptureFrameRate,
            CaptureResolutionHeight: videoObj.CaptureResolutionHeight,
            CaptureResolutionWidth: videoObj.CaptureResolutionWidth,
            EncodeDelay: videoObj.EncodeDelay,
            MuteState: videoObj.MuteState,
            SendBitrate: videoObj.SendBitrate,
            SendFrameRate: videoObj.SendFrameRate,
            SendResolutionHeight: videoObj.SendResolutionHeight,
            SendResolutionWidth: videoObj.SendResolutionWidth,
            TargetSendBitrate: videoObj.TargetSendBitrate,
            TotalDuration: videoObj.TotalDuration,
            TotalFreezeTime: videoObj.TotalFreezeTime
          }
          const statsArr =
            mediaTypeShort === 'video'
              ? this.adapterRef.localVideoStats
              : this.adapterRef.localScreenStats
          if (videoObj.streamType === 'high') {
            statsArr[0] = videoStats
          } else {
            statsArr[1] = videoStats
          }
        }
      } else if (mediaTypeShort === 'audio' || mediaTypeShort === 'audioSlave') {
        if (this.chromeLegecy !== 'supported') {
          this.formativeStatsReport?.formatSendData(audioObj, mediaTypeShort)
          if (localStream) {
            audioObj.MuteState = localStream.getMuteStatus(mediaTypeShort).muted
            if (mediaTypeShort === 'audio' && localStream.audioLevelHelper) {
              audioObj.RecordingLevel = Math.round(localStream.audioLevelHelper.volume * 32768)
            } else if (mediaTypeShort === 'audioSlave' && localStream.audioLevelHelperSlave) {
              audioObj.RecordingLevel = Math.round(localStream.audioLevelHelperSlave.volume * 32768)
            } else {
              audioObj.RecordingLevel = audioObj.audioInputLevel
            }
            audioObj.SamplingRate = getSamplingRate(localStream.audioProfile)
            audioObj.SendBitrate = audioObj.bitsSentPerSecond
            audioObj.SendLevel = audioObj.audioInputLevel
          }
          //sdk接口getLocalAudioStats()数据封装
          const audioStats = {
            CodecType: audioObj.CodecType,
            rtt: audioObj.rtt,
            MuteState: audioObj.MuteState,
            RecordingLevel: audioObj.RecordingLevel,
            SamplingRate: audioObj.SamplingRate,
            SendBitrate: audioObj.SendBitrate,
            SendLevel: audioObj.SendLevel
          }
          if (mediaTypeShort === 'audio') {
            this.adapterRef.localAudioStats[0] = audioStats
          } else if (mediaTypeShort === 'audioSlave') {
            this!.adapterRef.localAudioSlaveStats[0] = audioStats
          }
        }
      }
    }
    const result: { [key: string]: any } = {}
    if (direction === 'recv') {
      const remoteStream = uidAndKindBySsrc?.uid
        ? this.adapterRef.remoteStreamMap[uidAndKindBySsrc?.uid]
        : null
      if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
        videoObj.remoteuid = '' + uidAndKindBySsrc?.uid
        const videoDom = remoteStream?._play[mediaTypeShort]?.dom
        if (this.chromeLegecy !== 'supported') {
          this.formativeStatsReport?.formatRecvData(videoObj, mediaTypeShort)
          videoObj.LayerType = mediaTypeShort === 'video' ? 1 : 2
          if (videoObj.rtt && videoObj.jitterBufferDelay) {
            videoObj.End2EndDelay = videoObj.rtt + videoObj.jitterBufferDelay
          }
          if (remoteStream) {
            videoObj.MuteState = remoteStream.getMuteStatus(mediaTypeShort).muted
          }
          videoObj.PacketLossRate = videoObj.packetsLostRate
          videoObj.RecvBitrate = videoObj.bitsReceivedPerSecond
          videoObj.RecvResolutionHeight = videoObj.frameHeightReceived
          videoObj.RecvResolutionWidth = videoObj.frameWidthReceived
          videoObj.RenderFrameRate = videoObj.frameRateReceived
          if (videoDom) {
            videoObj.RenderResolutionHeight = videoDom.videoHeight
            videoObj.RenderResolutionWidth = videoDom.videoWidth
            if (videoDom.played?.length && videoDom.played.end) {
              videoObj.TotalPlayDuration = videoDom.played.end(0)
            }
          }
          videoObj.TotalFreezeTime = videoObj.totalFreezeTime
          videoObj.TransportDelay = videoObj.rtt
          const remoteVideoStats = {
            LayerType: videoObj.LayerType,
            CodecName: videoObj.CodecName,
            End2EndDelay: videoObj.End2EndDelay,
            MuteState: videoObj.MuteState,
            PacketLossRate: videoObj.PacketLossRate,
            RecvBitrate: videoObj.RecvBitrate,
            RecvResolutionHeight: videoObj.RecvResolutionHeight,
            RecvResolutionWidth: videoObj.RecvResolutionWidth,
            RenderFrameRate: videoObj.RenderFrameRate,
            RenderResolutionHeight: videoObj.RenderResolutionHeight,
            RenderResolutionWidth: videoObj.RenderResolutionWidth,
            TotalFreezeTime: videoObj.TotalFreezeTime,
            TotalPlayDuration: videoObj.TotalPlayDuration,
            TransportDelay: videoObj.TransportDelay
          }
          if (mediaTypeShort === 'video') {
            this.adapterRef.remoteVideoStats[videoObj.remoteuid] = remoteVideoStats
          } else {
            this.adapterRef.remoteScreenStats[videoObj.remoteuid] = remoteVideoStats
          }
        }
      } else if (mediaTypeShort === 'audio' || mediaTypeShort === 'audioSlave') {
        audioObj.remoteuid = '' + uidAndKindBySsrc?.uid
        if (this.chromeLegecy !== 'supported') {
          this.formativeStatsReport?.formatRecvData(audioObj, mediaTypeShort)
          if (audioObj.rtt && audioObj.jitterBufferDelay) {
            audioObj.End2EndDelay = audioObj.rtt + audioObj.jitterBufferDelay
          }
          if (remoteStream) {
            audioObj.MuteState = remoteStream.getMuteStatus(mediaTypeShort).muted
          }
          audioObj.PacketLossRate = audioObj.packetsLostRate
          audioObj.RecvBitrate = audioObj.packetsReceivedPerSecond
          audioObj.RecvLevel = audioObj.audioOutputLevel
          audioObj.TotalFreezeTime = audioObj.totalFreezeTime
          audioObj.TotalPlayDuration = audioObj.totalSamplesDuration
          audioObj.TransportDelay = audioObj.rtt
          const remoteAudioStats = {
            CodecType: audioObj.CodecType,
            End2EndDelay: audioObj.End2EndDelay,
            MuteState: audioObj.MuteState,
            PacketLossRate: audioObj.PacketLossRate,
            RecvBitrate: audioObj.RecvBitrate,
            RecvLevel: audioObj.RecvLevel,
            TotalFreezeTime: audioObj.TotalFreezeTime,
            TotalPlayDuration: audioObj.TotalPlayDuration,
            TransportDelay: audioObj.TransportDelay
          }
          if (mediaTypeShort === 'audio') {
            this.adapterRef.remoteAudioStats[audioObj.remoteuid] = remoteAudioStats
          } else if (mediaTypeShort === 'audioSlave') {
            this.adapterRef.remoteAudioSlaveStats[audioObj.remoteuid] = remoteAudioStats
          }
        }
        if (audioObj.audioOutputLevel) {
          const isPlaying = (mediaTypeShort && remoteStream?.isPlaying(mediaTypeShort)) || false
          this.audioLevel.push({
            uid: audioObj.remoteuid,
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
  async safari(pc: RTCPeerConnection, direction: StatsDirection) {
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
          this.markStatsStart(direction)
          report = await item.sender.getStats()
          report = this.formatSafariStandardizedStats(
            report,
            direction,
            (item.sender.track?.kind as 'audio' | 'video') || ''
          )
          if (report.video_ssrc && result.video_ssrc) {
            //@ts-ignore
            result.video_ssrc.push(report.video_ssrc[0])
            //排序，保障大流在数组的第一位
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
        if (item.receiver && item.receiver.getStats) {
          this.markStatsStart(direction)
          report = await item.receiver.getStats()
          report = this.formatSafariStandardizedStats(
            report,
            direction,
            (item.receiver.track?.kind as 'audio' | 'video') || ''
          )
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
    direction: StatsDirection,
    mediaType: 'audio' | 'video' | ''
  ) {
    const audioObj: { [key: string]: any } = {}
    const videoObj: { [key: string]: any } = {}
    let ssrc = 0
    report.forEach((item) => {
      //console.log(item.type, ' item: ', item)
      if (item.type == 'track') {
        //safari13没有kind字段,使用外部传入的mediaType代替
        if (item.kind === 'audio' || mediaType === 'audio') {
          audioObj.active = item.ended ? 0 : 1
          //safari 13下行
          item.audioLevel !== undefined
            ? (audioObj.audioOutputLevel = Math.round(item.audioLevel * 32768))
            : null
        } else if (item.kind === 'video' || mediaType === 'video') {
          videoObj.active = item.ended ? 0 : 1
          if (direction === 'send') {
            videoObj.frameWidthInput = item.width || item.frameWidth
            videoObj.frameHeightInput = item.height || item.frameHeight
            item.framesSent !== undefined ? (videoObj.framesSent = item.framesSent) : null
          } else if (direction === 'recv') {
            videoObj.frameWidthReceived = item.width || item.frameWidth
            videoObj.frameHeightReceived = item.height || item.frameHeight
            item.framesDecoded !== undefined ? (videoObj.framesDecoded = item.framesDecoded) : null
            item.framesReceived !== undefined
              ? (videoObj.framesReceived = item.framesReceived)
              : null
            item.framesDropped !== undefined ? (videoObj.framesDropped = item.framesDropped) : null
          }
        }
      } else if (item.type == 'outbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio' || item.mediaType === 'audio' || mediaType === 'audio') {
          audioObj.bytesSent = (item.headerBytesSent || 0) + item.bytesSent
          audioObj.packetsSent = item.packetsSent
          item.nackCount !== undefined ? (audioObj.nackCount = item.nackCount) : null
        } else if (item.kind === 'video' || item.mediaType === 'video' || mediaType === 'video') {
          videoObj.bytesSent = (item.headerBytesSent || 0) + item.bytesSent
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          videoObj.framesEncoded = item.framesEncoded
          item.hugeFramesSent !== undefined ? (videoObj.hugeFramesSent = item.hugeFramesSent) : null
          videoObj.packetsSent = item.packetsSent
          videoObj.qpSum = item.qpSum
          item.qualityLimitationResolutionChanges !== undefined
            ? (videoObj.qualityLimitationResolutionChanges =
                item.qualityLimitationResolutionChanges)
            : null
          //这计算的是总的数据，不是实时数据，当前先依赖pc.getStats()反馈吧，后续不支持了在处理
          item.totalEncodeTime !== undefined
            ? (videoObj.avgEncodeMs = Math.round(
                (item.totalEncodeTime * 1000) / item.framesEncoded
              ))
            : null
          item.framesPerSecond !== undefined
            ? (videoObj.frameRateSent = item.framesPerSecond)
            : null
          item.frameWidth !== undefined ? (videoObj.frameWidthSent = item.frameWidth) : null
          item.frameHeight !== undefined ? (videoObj.frameHeightSent = item.frameHeight) : null
        }
      } else if (item.type == 'remote-inbound-rtp') {
        if (item.kind === 'audio') {
          item.jitter !== undefined
            ? (audioObj.jitterReceived = Math.round(item.jitter * 1000))
            : null
          item.packetsLost !== undefined ? (audioObj.packetsLost = item.packetsLost) : null
          audioObj.rtt = Math.round(item.roundTripTime * 1000)
        } else if (item.kind === 'video') {
          item.jitter !== undefined ? (videoObj.jitter = Math.round(item.jitter * 1000)) : null
          item.packetsLost !== undefined ? (videoObj.packetsLost = item.packetsLost) : null
          videoObj.rtt = Math.round(item.roundTripTime * 1000)
        }
      } else if (item.type == 'inbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio' || item.mediaType === 'audio' || mediaType === 'audio') {
          item.audioLevel !== undefined
            ? (audioObj.audioOutputLevel = Math.round(item.audioLevel * 32768))
            : null
          item.totalAudioEnergy !== undefined
            ? (audioObj.totalAudioEnergy = Math.round(item.totalAudioEnergy))
            : null
          item.totalSamplesReceived !== undefined
            ? (audioObj.totalSamplesDuration = Math.round(item.totalSamplesReceived / 48000))
            : null
          audioObj.bytesReceived = (item.headerBytesReceived || 0) + item.bytesReceived
          item.concealedSamples !== undefined
            ? (audioObj.concealedSamples = item.concealedSamples)
            : null
          item.estimatedPlayoutTimestamp !== undefined
            ? (audioObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp)
            : null
          item.jitter !== undefined ? (audioObj.jitter = Math.round(item.jitter * 1000)) : null
          item.jitterBufferDelay !== undefined
            ? (audioObj.jitterBufferDelay = Math.round(
                (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
              ))
            : null
          item.lastPacketReceivedTimestamp !== undefined
            ? (audioObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp)
            : null
          item.nackCount !== undefined ? (audioObj.nackCount = item.nackCount) : null
          item.silentConcealedSamples !== undefined
            ? (audioObj.silentConcealedSamples = item.silentConcealedSamples)
            : null
          audioObj.packetsLost = item.packetsLost
          audioObj.packetsReceived = item.packetsReceived
          item.jitter !== undefined ? (audioObj.jitter = Math.round(item.jitter * 1000)) : null
        } else if (item.kind === 'video' || item.mediaType === 'video' || mediaType === 'video') {
          videoObj.bytesReceived = item.bytesReceived + (item.headerBytesReceived || 0)
          item.estimatedPlayoutTimestamp !== undefined
            ? (videoObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp)
            : null
          item.lastPacketReceivedTimestamp !== undefined
            ? (videoObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp)
            : null
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          item.framesDecoded !== undefined ? (videoObj.framesDecoded = item.framesDecoded) : null
          item.framesDropped !== undefined ? (videoObj.framesDropped = item.framesDropped) : null
          item.framesReceived !== undefined ? (videoObj.framesReceived = item.framesReceived) : null
          videoObj.packetsReceived = item.packetsReceived
          videoObj.packetsLost = item.packetsLost
          //videoObj.decodeMs = 0 //可以计算每秒的解码耗时，当前先不处理
          item.framesPerSecond !== undefined
            ? (videoObj.frameRateReceived = item.framesPerSecond)
            : null
          item.frameWidth !== undefined ? (videoObj.frameWidthReceived = item.frameWidth) : null
          item.frameHeight !== undefined ? (videoObj.frameHeightReceived = item.frameHeight) : null
          item.jitter !== undefined ? (videoObj.jitter = Math.round(item.jitter * 1000)) : null
          item.jitterBufferDelay !== undefined
            ? (videoObj.jitterBufferDelay = Math.round(
                (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
              ))
            : null
        }
      } else if (item.type == 'remote-outbound-rtp') {
        if (item.kind === 'audio') {
          item.jitter !== undefined ? (audioObj.jitter = Math.round(item.jitter * 1000)) : null
          item.roundTripTime !== undefined
            ? (audioObj.rtt = Math.round(item.roundTripTime * 1000))
            : null
        } else if (item.kind === 'video') {
          // item.jitter ? (videoObj.jitter = Math.round(item.jitter * 1000)) : null
          // item.roundTripTime ? (videoObj.rtt = Math.round(item.roundTripTime * 1000)) : null
        }
      }
    })
    const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(ssrc)
    let mediaTypeShort = uidAndKindBySsrc?.kind
    if (JSON.stringify(videoObj) !== '{}' && direction === 'send') {
      videoObj.streamType = uidAndKindBySsrc?.streamType || 'high'
    }
    const result: { [key: string]: any } = {}
    if (direction === 'recv') {
      this.formativeStatsReport?.clearFirstRecvData(uidAndKindBySsrc?.uid)
      if (JSON.stringify(videoObj) !== '{}') {
        videoObj.remoteuid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(videoObj, mediaTypeShort)
      } else if (JSON.stringify(audioObj) !== '{}') {
        audioObj.remoteuid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(audioObj, mediaTypeShort)
        if (audioObj.audioOutputLevel) {
          const remoteStream = this?.adapterRef?.remoteStreamMap[audioObj.remoteuid]
          const isPlaying = (mediaTypeShort && remoteStream?.isPlaying(mediaTypeShort)) || false
          this.audioLevel.push({
            uid: audioObj.remoteuid,
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
      // 采集不到不上报
      if (typeof audioObj.active === 'number') {
        result[`${mediaTypeShort}_ssrc`] = [audioObj]
      }
    } else if (mediaTypeShort === 'video' || mediaTypeShort === 'screen') {
      if (uidAndKindBySsrc?.streamType === 'high' && direction === 'send') {
        this.formativeStatsReport?.formatSendData(videoObj, mediaTypeShort)
      }
      if (typeof videoObj.active === 'number') {
        result[`${mediaTypeShort}_ssrc`] = [videoObj]
      }
    }
    return result
  }

  async firefox(pc: RTCPeerConnection, direction: StatsDirection) {
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
          this.markStatsStart(direction)
          report = await item.sender.getStats()
          report = this.formatFirefoxStandardizedStats(report, direction)
          Object.assign(result, report)
        }
      } else if (item.direction === 'recvonly') {
        if (item.receiver && item.receiver.getStats) {
          this.markStatsStart(direction)
          report = await item.receiver.getStats()
          report = this.formatFirefoxStandardizedStats(report, direction)
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
  formatFirefoxStandardizedStats(report: RTCStatsReport, direction: StatsDirection) {
    const audioObj: { [key: string]: any } = {}
    const videoObj: { [key: string]: any } = {}
    let ssrc = 0
    report.forEach((item) => {
      if (item.type == 'outbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          audioObj.bytesSent = (item.headerBytesSent || 0) + item.bytesSent
          audioObj.packetsSent = item.packetsSent
          audioObj.nackCount = item.nackCount
        } else if (item.kind === 'video') {
          videoObj.bytesSent = (item.headerBytesSent || 0) + item.bytesSent
          videoObj.firCount = item.firCount
          videoObj.nackCount = item.nackCount
          videoObj.pliCount = item.pliCount
          item.hugeFramesSent !== undefined ? (videoObj.hugeFramesSent = item.hugeFramesSent) : null
          videoObj.packetsSent = item.packetsSent
          videoObj.qpSum = item.qpSum
          item.framesEncoded !== undefined ? (videoObj.framesEncoded = item.framesEncoded) : null
          item.framesSent !== undefined ? (videoObj.framesSent = item.framesSent) : null
          //这计算的是总的数据，不是实时数据，当前先依赖pc.getStats()反馈吧，后续不支持了在处理
          item.totalEncodeTime !== undefined && item.framesEncoded !== undefined
            ? (videoObj.avgEncodeMs = Math.round(
                (item.totalEncodeTime * 1000) / item.framesEncoded
              ))
            : null
          //需要针对firefox计算帧率
          //item.framesEncoded ? (videoObj.frameRateInput = item.framesEncoded) : null
          item.framesPerSecond !== undefined
            ? (videoObj.frameRateSent = item.framesPerSecond)
            : null
          item.frameWidth !== undefined ? (videoObj.frameWidthSent = item.frameWidth) : null
          item.frameHeight !== undefined ? (videoObj.frameHeightSent = item.frameHeight) : null
        }
      } else if (item.type == 'remote-inbound-rtp') {
        if (item.kind === 'video') {
          videoObj.fractionLost = item.fractionLost
          videoObj.jitter = Math.round(item.jitter * 1000)
          videoObj.packetsLost = item.packetsLost
          videoObj.rtt = Math.round(item.roundTripTime * 1000)
        }
      } else if (item.type == 'inbound-rtp') {
        ssrc = item.ssrc
        if (item.kind === 'audio') {
          item.audioLevel !== undefined
            ? (audioObj.audioOutputLevel = Math.round(item.audioLevel * 32768))
            : null
          item.insertedSamplesForDeceleration !== undefined
            ? (audioObj.preemptiveExpandRate = parseInt(item.insertedSamplesForDeceleration))
            : null
          item.removedSamplesForAcceleration !== undefined
            ? (audioObj.speechExpandRate = parseInt(item.removedSamplesForAcceleration))
            : null
          audioObj.bytesReceived = item.bytesReceived + (item.headerBytesReceived || 0)
          audioObj.concealedSamples = item.concealedSamples
          audioObj.jitter = Math.round(item.jitter * 1000)
          audioObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          audioObj.silentConcealedSamples = item.silentConcealedSamples
          audioObj.packetsLost = item.packetsLost
          audioObj.packetsReceived = item.packetsReceived
          item.totalSamplesReceived !== undefined
            ? (audioObj.totalSamplesDuration = Math.round(item.totalSamplesReceived / 48000))
            : null
          item.totalAudioEnergy !== undefined
            ? (audioObj.totalAudioEnergy = Math.round(item.totalAudioEnergy))
            : null
          item.totalSamplesReceived !== undefined
            ? (audioObj.totalSamplesDuration = Math.round(item.totalSamplesReceived / 48000))
            : null
        } else if (item.kind === 'video') {
          videoObj.bytesReceived = item.bytesReceived + (item.headerBytesReceived || 0)
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
          //videoObj.jitter = Math.round(item.jitter * 1000)
          videoObj.jitterBufferDelay = Math.round(
            (item.jitterBufferDelay * 1000) / item.jitterBufferEmittedCount
          )
          item.estimatedPlayoutTimestamp !== undefined
            ? (videoObj.estimatedPlayoutTimestamp = item.estimatedPlayoutTimestamp)
            : null
          item.lastPacketReceivedTimestamp !== undefined
            ? (videoObj.lastPacketReceivedTimestamp = item.lastPacketReceivedTimestamp)
            : null
        }
      }
    })
    const uidAndKindBySsrc = this?.adapterRef?.instance.getUidAndKindBySsrc(ssrc)
    let mediaTypeShort = uidAndKindBySsrc?.kind
    if (JSON.stringify(videoObj) !== '{}' && direction === 'send') {
      videoObj.streamType = uidAndKindBySsrc?.streamType || 'high'
    }
    const result: { [key: string]: any } = {}
    if (direction === 'recv') {
      this.formativeStatsReport?.clearFirstRecvData(uidAndKindBySsrc?.uid)
      if (JSON.stringify(videoObj) !== '{}') {
        videoObj.remoteuid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(videoObj, mediaTypeShort)
      } else if (JSON.stringify(audioObj) !== '{}') {
        audioObj.remoteuid = uidAndKindBySsrc?.uid
        this.formativeStatsReport?.formatRecvData(audioObj, mediaTypeShort)
        if (audioObj.audioOutputLevel) {
          const remoteStream = this?.adapterRef?.remoteStreamMap[audioObj.remoteuid]
          const isPlaying = (mediaTypeShort && remoteStream?.isPlaying(mediaTypeShort)) || false
          this.audioLevel.push({
            uid: audioObj.remoteuid,
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

function setValidInteger(
  obj: any,
  key: keyof FormativeStatsAudio | keyof FormativeStatsVideo,
  value: any
) {
  if (obj && value >= Number.MIN_SAFE_INTEGER) {
    obj[key] = Math.round(value)
  }
}

function getValuePerSecond(item: any, itemHistory: any, key: PerSecondStatsProperty) {
  if (
    item &&
    itemHistory &&
    item[key] > Number.MIN_SAFE_INTEGER &&
    itemHistory[key] > Number.MIN_SAFE_INTEGER &&
    item.timestamp &&
    itemHistory.timestamp
  ) {
    return ((item[key] - itemHistory[key]) / (item.timestamp - itemHistory.timestamp)) * 1000
  } else {
    return NaN
  }
}

export { GetStats }
