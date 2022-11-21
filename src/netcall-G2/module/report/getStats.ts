/*
 getStats适配器
 */
import { EventEmitter } from 'eventemitter3'
import { SDK_VERSION } from '../../Config'
import { AdapterRef } from '../../types'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import { getBrowserInfo, getOSInfo } from '../../util/rtcUtil/rtcPlatform'

export interface DownAudioItem {
  googDecodingPLC: string
  googDecodingCNG: string
  googDecodingCTN: string
  googDecodingPLCCNG: string
}
class GetStats extends EventEmitter {
  private adapterRef: AdapterRef | null
  private interval: number
  private times: number
  private browser: 'chrome' | 'safari' | 'firefox'
  private prevItem: any = {}
  constructor(options: { adapterRef: AdapterRef; interval: number }) {
    super()
    this.adapterRef = options.adapterRef
    this.interval = options.interval || 1000
    //workaround for TS2564
    this.times = 0
    this.browser = 'chrome'
    this._reset()
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
  }

  async getAllStats() {
    let localPC = this.adapterRef?._mediasoup?._sendTransport?._handler._pc
    let remotePC = this.adapterRef?._mediasoup?._recvTransport?._handler._pc

    if (!localPC && !remotePC) {
      return
    }

    let result = {
      local: localPC ? await this.getLocalStats(localPC) : null,
      remote: remotePC ? await this.getRemoteStats(remotePC) : null
    }
    this.times = (this.times || 0) + 1
    // this.emit('stats', result, this.times)
    // console.log('stats before revised--->', result)
    let report = this.reviseData(result, this.browser)
    // 给 formativeStatsReport 传递全量数据
    this.emit('stats', report, this.times)
    // console.error('report: ', report)
    let reportData = this.finalizeData(report)
    // console.error('reportData: ', reportData)
    return reportData
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
      // chrome 在关闭本端屏幕共享后，非标准 getStats 还是能获取到屏幕共享数据，只是码率、帧率等数据显示为 0
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

          //console.log('!!!原始:', result)
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
      let result = {}
      const transceivers = pc.getTransceivers()

      for (let i = 0; i < transceivers.length; i++) {
        let getStats = null
        let report = null
        const item = transceivers[i]
        if (item.direction === 'sendonly') {
          if (item.sender && item.sender.getStats) {
            report = await item.sender.getStats()
            report = this.formatChromeStandardizedStats(report, direction, 0)
            Object.assign(result, report)
          }
        } else if (item.direction === 'recvonly') {
          if (item.receiver && item.receiver.getStats) {
            report = await item.receiver.getStats()
            report = this.formatChromeStandardizedStats(report, direction, 0)
            Object.assign(result, report)
          }
        }
      }

      return result
    }

    const nonStandardResult = await nonStandardStats()
    const standardizedResult = await standardizedStats()
    let assignedResult = Object.assign(nonStandardResult, standardizedResult)
    return assignedResult
  }

  //转换非标准getStats格式
  formatChromeNonStandardStats(
    pc: RTCPeerConnection,
    stats: { [key: string]: any },
    direction: string
  ) {
    const tmp: any = {}

    Object.values(stats).forEach((item) => {
      if (/^ssrc_/i.test(item.id)) {
        const uidAndKindBySsrc = this.adapterRef?.instance.getUidAndKindBySsrc(parseInt(item.ssrc))
        item.streamType = uidAndKindBySsrc?.streamType
        item.uid = uidAndKindBySsrc?.uid
        let mediaTypeShort
        if (uidAndKindBySsrc?.kind) {
          mediaTypeShort = uidAndKindBySsrc.kind
        } else if (item.googContentType === 'screen') {
          mediaTypeShort = 'screen'
        } else {
          mediaTypeShort = item.mediaType
        }
        item.dataId = `${mediaTypeShort}_${item.streamType}_${item.id}`
      }
      if (/^bweforvideo/i.test(item.id)) {
        item.dataId = item.id
      }
      if (/^Conn-0-1-0/i.test(item.id) && direction === 'send') {
        item.dataId = `${item.id}_${item.type}`
      }
      if (direction === 'send') {
        if (/^video_/i.test(item.dataId) || /^screen_/i.test(item.dataId)) {
          let stats = this.getLocalVideoScreenFreezeStats(item, item.uid)
          item.freezeTime = stats.freezeTime
          item.totalFreezeTime = stats.totalFreezeTime
        }
      } else {
        if (/^video_/i.test(item.dataId) || /^screen_/i.test(item.dataId)) {
          let stats = this.getRemoteVideoScreenFreezeStats({}, item, item.uid)
          item.freezeTime = stats.freezeTime
          item.totalFreezeTime = stats.totalFreezeTime
        }
        if (/^audio_/i.test(item.dataId) || /^audioSlave_/i.test(item.dataId)) {
          let stats = this.getRemoteAudioFreezeStats(item, item.uid)
          item.freezeTime = stats ? stats.freezeTime : 0
          item.totalFreezeTime = stats ? stats.totalFreezeTime : 0
        }
      }

      if (
        /^audio_/i.test(item.dataId) ||
        /^audioSlave_/i.test(item.dataId) ||
        /^video_/i.test(item.dataId) ||
        /^screen_/i.test(item.dataId) ||
        /^bweforvideo/i.test(item.dataId) ||
        /^Conn-/.test(item.dataId)
      ) {
        item = this.computeData(direction, pc, item)
        tmp[item.dataId] = item
      }
    })

    return tmp
  }

  //转换标准getStats格式
  formatChromeStandardizedStats(report: RTCStatsReport, direction: string, uid: string | number) {
    let result: { [key: string]: any } = {}
    report.forEach((report) => {
      if (report.type == 'inbound-rtp' && this.adapterRef && this.adapterRef.instance) {
        uid = this.adapterRef.instance.getUidAndKindBySsrc(report.ssrc).uid
        return
      }
    })

    //无用的信息
    if (!uid && direction.indexOf('recv') > -1) return

    report.forEach((item) => {
      item.dataId = `${item.type}_${
        this.adapterRef && this.adapterRef.channelInfo.uid
      }_${direction}_${uid}`
      if (
        item.type == 'outbound-rtp' ||
        item.type === 'remote-inbound-rtp' ||
        item.type == 'inbound-rtp' ||
        item.type === 'remote-outbound-rtp'
      ) {
        const uidAndKindBySsrc = this.adapterRef?.instance.getUidAndKindBySsrc(parseInt(item.ssrc))
        item.streamType = uidAndKindBySsrc?.streamType
        item.mediaType = uidAndKindBySsrc?.kind
        item.dataId = `${item.mediaType}_${item.streamType}_${item.dataId}`
        item.uid = uid
      }
      if (
        (item.type === 'local-candidate' && direction === 'send') ||
        (item.type === 'candidate-pair' && direction === 'send')
      ) {
        item.dataId = `${item.type}_${item.id}`
      }
      if (
        /^audio_/i.test(item.dataId) ||
        /^audioSlave_/i.test(item.dataId) ||
        /^video_/i.test(item.dataId) ||
        /^screen_/i.test(item.dataId) ||
        /^local-candidate_/i.test(item.dataId) ||
        /^candidate-pair_/i.test(item.dataId)
      ) {
        result[`${item.dataId}`] = item
      }
    })
    return result
  }

  /*
   safari浏览器getStats适配器
  */
  async safari(pc: RTCPeerConnection, direction: string) {
    // safari nonStandard 和 Standard 获取到的数据一样，因此只需使用 nonStandard 数据即可
    const nonStandardStats = async () => {
      const stats = await pc.getStats()
      //@ts-ignore
      pc.lastStats = pc.lastStats || {}
      const result = this.formatSafariNonStandardStats(pc, stats, direction)
      return result
    }

    const nonStandardResult = await nonStandardStats()
    let assignedResult = Object.assign({}, nonStandardResult)
    return assignedResult
  }

  formatSafariNonStandardStats(
    pc: RTCPeerConnection,
    stats: { [key: string]: any },
    direction: string
  ) {
    let result: { [key: string]: any } = {}
    // 上行数据为 outbound-rtp 和 remote-inbound-rtp，下行数据为 inbound-rtp
    stats.forEach((item: any) => {
      if (
        item.type == 'outbound-rtp' ||
        item.type == 'remote-inbound-rtp' ||
        item.type == 'inbound-rtp'
      ) {
        const uidAndKindBySsrc = this.adapterRef?.instance.getUidAndKindBySsrc(parseInt(item.ssrc))
        item.uid = uidAndKindBySsrc ? uidAndKindBySsrc.uid : '0'
        item.mediaType = uidAndKindBySsrc?.kind
        item.streamType = uidAndKindBySsrc?.streamType
        item.dataId = `${item.mediaType}_${item.streamType}_${item.type}_${item.id}`
        item = this.computeData(direction, pc, item)
        result[item.dataId] = item
      } else if (item.type == 'candidate-pair') {
        item.dataId = `${item.type}_${item.id}`
        result[item.dataId] = item
      }
    })

    return result
  }

  async firefox(pc: RTCPeerConnection, direction: string) {
    // firefox nonStandard 和 Standard 获取到的数据一样，因此只需使用 nonStandard 数据即可
    const nonStandardStats = async () => {
      let stats = await pc.getStats()
      //@ts-ignore
      pc.lastStats = pc.lastStats || {}
      const result = this.formatFirefoxNonStandardStats(pc, stats, direction)
      return result
    }

    const nonStandardResult = await nonStandardStats()
    let assignedResult = Object.assign(nonStandardResult, {})
    return assignedResult
  }

  // 转换非标准 getStats 格式
  formatFirefoxNonStandardStats(
    pc: RTCPeerConnection,
    stats: { [key: string]: any },
    direction: string
  ) {
    let result: { [key: string]: any } = {}
    // 上行数据为 outbound-rtp 和 remote-inbound-rtp，下行数据为 inbound-rtp 和 remote-outbound-rtp
    stats.forEach((item: any) => {
      if (
        item.type == 'outbound-rtp' ||
        item.type == 'remote-inbound-rtp' ||
        item.type == 'inbound-rtp' ||
        item.type == 'remote-outbound-rtp'
      ) {
        const uidAndKindBySsrc = this.adapterRef?.instance.getUidAndKindBySsrc(parseInt(item.ssrc))
        item.uid = uidAndKindBySsrc ? uidAndKindBySsrc.uid : '0'
        item.mediaType = uidAndKindBySsrc?.kind
        item.streamType = uidAndKindBySsrc?.streamType
        item.dataId = `${item.mediaType}_${item.streamType}_${item.type}_${item.id}`
        item = this.computeData(direction, pc, item)
        result[item.dataId] = item
      }
    })

    return result
  }

  // 计算一些数据，码率、每秒中发送、接收包数、丢包率
  computeData(direction: string, pc: RTCPeerConnection, item: any) {
    const param = {
      pc,
      ssrcKey: item.ssrc,
      currentItem: item
    }

    if (direction === 'send') {
      if (item.bytesSent) {
        item['bitsSentPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'bytesSent' })
        )
      }

      if (item.packetsSent) {
        item['packetsSentPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'packetsSent' })
        )
      }

      if (item.framesSent) {
        item['frameRateSent'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'framesSent' })
        )
      }

      if (item.packetsLost) {
        item['packetsLostPerSecond'] = Number(
          this.getLastStats(Object.assign({}, param, { firstKey: 'packetsLost' }))
        )
      }

      if (item.packetsSent && item.packetsLost) {
        item['sendPacketLoss'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'packetsSent', secondKey: 'packetsLost' })
        )
        if (item['packetsSentPerSecond'] + item['packetsLostPerSecond'] === 0) {
          item['packetsLostRate'] = 0
        } else {
          item['packetsLostRate'] =
            item['packetsLostPerSecond'] /
            (item['packetsSentPerSecond'] + item['packetsLostPerSecond'])
        }
      }

      if (item.framesEncoded) {
        item['framesEncodedPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'framesEncoded' })
        )
      }

      if (item.qpSum && item.framesEncoded) {
        item['qpPercentage'] = item.qpSum / item.framesEncoded
      }
    } else {
      if (item.googDecodingNormal) {
        item['googDecodingNormalPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'googDecodingNormal' })
        )
      }

      if (item.bytesReceived) {
        item['bitsReceivedPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'bytesReceived' })
        )
      }

      if (item.framesReceived) {
        item['frameRateReceived'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'framesReceived' })
        )
      }

      if (item.packetsReceived) {
        item['packetsReceivedPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'packetsReceived' })
        )
      }

      if (item.packetsLost) {
        item['packetsLostPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'packetsLost' })
        )
      }

      if (item.packetsReceived && item.packetsLost) {
        item['recvPacketLoss'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'packetsReceived', secondKey: 'packetsLost' })
        )
        if (item['packetsReceivedPerSecond'] + item['packetsLostPerSecond'] === 0) {
          item['packetsLostRate'] = 0
        } else {
          item['packetsLostRate'] =
            item['packetsLostPerSecond'] /
            (item['packetsReceivedPerSecond'] + item['packetsLostPerSecond'])
        }
      }

      if (item.framesDecoded) {
        item['framesDecodedPerSecond'] = this.getLastStats(
          Object.assign({}, param, { firstKey: 'framesDecoded' })
        )
      }
    }

    return item
  }

  // 码率、丢包率的具体计算
  getLastStats(option: any = {}) {
    const { pc, ssrcKey, firstKey, secondKey = null, currentItem } = option
    //console.log('getLastStats ssrcKey: ', ssrcKey)
    let firstGap = 0
    let secondGap = 0
    if (!pc.lastStats[ssrcKey] || !pc.lastStats[ssrcKey][firstKey]) {
      if (!pc.lastStats[ssrcKey]) {
        pc.lastStats[ssrcKey] = {}
      }
      firstGap = parseFloat(currentItem[firstKey])
      secondKey ? (secondGap = parseFloat(currentItem[secondKey])) : null
    } else if (
      parseFloat(currentItem[firstKey]) - parseFloat(pc.lastStats[ssrcKey][firstKey]) >
      0
    ) {
      firstGap =
        (parseFloat(currentItem[firstKey]) - parseFloat(pc.lastStats[ssrcKey][firstKey])) / 2
      secondKey
        ? (secondGap =
            (parseFloat(currentItem[secondKey]) - parseFloat(pc.lastStats[ssrcKey][secondKey])) / 2)
        : null
    } else {
      return Number(firstGap)
    }

    if (/bytes/gi.test(firstKey)) {
      //当前的检测周期是2s
      firstGap = Math.round((Number(firstGap) * 8) / 1000)
    } else if (secondKey) {
      if (firstKey.indexOf('send') > -1) {
        firstGap = Math.floor((Number(secondGap) / Number(firstGap)) * 10000) / 100
      } else {
        firstGap = ((Number(secondGap) / (Number(secondGap) + Number(secondGap))) * 10000) / 100
      }
    } else {
      firstGap = Number(firstGap)
    }

    // 设置上一次的值
    pc.lastStats[ssrcKey][firstKey] = currentItem[firstKey]
    secondKey ? (pc.lastStats[ssrcKey][secondKey] = currentItem[secondKey]) : null
    return Number(firstGap)
  }

  reviseData(params: any, browser: string) {
    // 整理后的数据只包含 4 种 mediaType，以及 bwe（local 和 remote 相同）
    //上行数据处理
    let result = {
      appkey: this.adapterRef?.channelInfo.appkey,
      cid: this.adapterRef?.channelInfo.cid,
      uid: this.adapterRef?.channelInfo.uid,
      timestamp: new Date().getTime(),
      platform: getOSInfo().osName,
      browser,
      sdkVersion: SDK_VERSION,
      local: {},
      remote: {}
    }
    let local = {
      audio_ssrc: [] as any,
      video_ssrc: [] as any,
      audioSlave_ssrc: [] as any,
      screen_ssrc: [] as any,
      bwe: [] as any,
      conn: [] as any,
      candidatePair: [] as any,
      localCandidate: [] as any
    }
    let video_high = {},
      video_low = {},
      screen_high = {},
      screen_low = {},
      audio_local = {},
      audioSlave_local = {},
      bwe_local = {},
      conn_local = {},
      candidate_pair_local = {},
      local_candidate_local = {}
    // 下行数据处理
    let remote = {
      audio_ssrc: [] as any,
      video_ssrc: [] as any,
      audioSlave_ssrc: [] as any,
      screen_ssrc: [] as any,
      bwe: [] as any
    }
    let remoteAudio: any[] = [],
      remoteVideo: any[] = [],
      remoteAudioSlave: any[] = [],
      remoteScreen: any[] = []
    // 数据处理
    if (browser === 'chrome') {
      // Chrome 上行数据
      Object.values(params.local).forEach((item: any) => {
        if (/^audio_/i.test(item.dataId)) {
          if (typeof item.active === 'boolean') {
            item.active = item.active ? 1 : 0
          }
          audio_local = Object.assign(audio_local, item)
        }
        if (/^audioSlave_/i.test(item.dataId)) {
          if (typeof item.active === 'boolean') {
            item.active = item.active ? 1 : 0
          }
          audioSlave_local = Object.assign(audioSlave_local, item)
        }
        if (/^video_high/i.test(item.dataId)) {
          if (typeof item.active === 'boolean') {
            item.active = item.active ? 1 : 0
          }
          if (item.googBandwidthLimitedResolution === 'false') {
            item.googBandwidthLimitedResolution = 0
          } else if (item.googBandwidthLimitedResolution === 'true') {
            item.googBandwidthLimitedResolution = 1
          }
          if (item.googCpuLimitedResolution === 'false') {
            item.googCpuLimitedResolution = 0
          } else if (item.googCpuLimitedResolution === 'true') {
            item.googCpuLimitedResolution = 1
          }
          if (item.googHasEnteredLowResolution === 'false') {
            item.googHasEnteredLowResolution = 0
          } else if (item.googHasEnteredLowResolution === 'true') {
            item.googHasEnteredLowResolution = 1
          }
          video_high = Object.assign(video_high, item)
        }
        if (/^video_low/i.test(item.dataId)) {
          if (typeof item.active === 'boolean') {
            item.active = item.active ? 1 : 0
          }
          if (item.googBandwidthLimitedResolution === 'false') {
            item.googBandwidthLimitedResolution = 0
          } else if (item.googBandwidthLimitedResolution === 'true') {
            item.googBandwidthLimitedResolution = 1
          }
          if (item.googCpuLimitedResolution === 'false') {
            item.googCpuLimitedResolution = 0
          } else if (item.googCpuLimitedResolution === 'true') {
            item.googCpuLimitedResolution = 1
          }
          if (item.googHasEnteredLowResolution === 'false') {
            item.googHasEnteredLowResolution = 0
          } else if (item.googHasEnteredLowResolution === 'true') {
            item.googHasEnteredLowResolution = 1
          }
          video_low = Object.assign(video_low, item)
        }
        if (/^screen_high/i.test(item.dataId)) {
          if (typeof item.active === 'boolean') {
            item.active = item.active ? 1 : 0
          }
          if (item.googBandwidthLimitedResolution === 'false') {
            item.googBandwidthLimitedResolution = 0
          } else if (item.googBandwidthLimitedResolution === 'true') {
            item.googBandwidthLimitedResolution = 1
          }
          if (item.googCpuLimitedResolution === 'false') {
            item.googCpuLimitedResolution = 0
          } else if (item.googCpuLimitedResolution === 'true') {
            item.googCpuLimitedResolution = 1
          }
          if (item.googHasEnteredLowResolution === 'false') {
            item.googHasEnteredLowResolution = 0
          } else if (item.googHasEnteredLowResolution === 'true') {
            item.googHasEnteredLowResolution = 1
          }
          screen_high = Object.assign(screen_high, item)
        }
        if (/^screen_low/i.test(item.dataId)) {
          if (typeof item.active === 'boolean') {
            item.active = item.active ? 1 : 0
          }
          if (item.googBandwidthLimitedResolution === 'false') {
            item.googBandwidthLimitedResolution = 0
          } else if (item.googBandwidthLimitedResolution === 'true') {
            item.googBandwidthLimitedResolution = 1
          }
          if (item.googCpuLimitedResolution === 'false') {
            item.googCpuLimitedResolution = 0
          } else if (item.googCpuLimitedResolution === 'true') {
            item.googCpuLimitedResolution = 1
          }
          if (item.googHasEnteredLowResolution === 'false') {
            item.googHasEnteredLowResolution = 0
          } else if (item.googHasEnteredLowResolution === 'true') {
            item.googHasEnteredLowResolution = 1
          }
          screen_low = Object.assign(screen_low, item)
        }
        if (/^bweforvideo/i.test(item.dataId)) {
          bwe_local = Object.assign(bwe_local, item)
        }
        if (/^Conn/i.test(item.dataId)) {
          conn_local = Object.assign(conn_local, item)
        }
        if (/^local-candidate_/i.test(item.dataId)) {
          candidate_pair_local = Object.assign(candidate_pair_local, item)
        }
        if (/^candidate-pair_/i.test(item.dataId)) {
          local_candidate_local = Object.assign(local_candidate_local, item)
        }
      })
      // 不能使用 active 状态判断是否 push，老版本 chrome 没有 active 字段
      if (Object.values(video_high).length) {
        local.video_ssrc.push(video_high)
      }
      if (Object.values(video_low).length) {
        local.video_ssrc.push(video_low)
      }
      if (Object.values(screen_high).length) {
        local.screen_ssrc.push(screen_high)
      }
      if (Object.values(screen_low).length) {
        local.screen_ssrc.push(screen_low)
      }
      if (Object.values(audio_local).length) {
        local.audio_ssrc.push(audio_local)
      }
      if (Object.values(audioSlave_local).length) {
        local.audioSlave_ssrc.push(audioSlave_local)
      }
      if (local.video_ssrc.length || local.screen_ssrc.length) {
        local.bwe.push(bwe_local)
        local.bwe[0].timestamp = Date.parse(local.bwe[0].timestamp)
      }

      if (Object.values(conn_local).length) {
        local.conn.push(conn_local)
      }
      if (Object.values(candidate_pair_local).length) {
        local.candidatePair.push(candidate_pair_local)
      }
      if (Object.values(local_candidate_local).length) {
        local.localCandidate.push(local_candidate_local)
      }

      // Chrome 下行数据
      Object.values(params.remote).forEach((item: any) => {
        if (/^audio_/i.test(item.dataId) && item.uid.length) {
          remoteAudio.push(item)
        }
        if (/^video_/i.test(item.dataId) && item.uid.length) {
          remoteVideo.push(item)
        }
        if (/^audioSlave_/i.test(item.dataId) && item.uid.length) {
          remoteAudioSlave.push(item)
        }
        if (/^screen_/i.test(item.dataId) && item.uid.length) {
          remoteScreen.push(item)
        }
        if (/^bweforvideo/i.test(item.dataId)) {
          remote.bwe.push(item)
          remote.bwe[0].timestamp = Date.parse(remote.bwe[0].timestamp)
        }
      })
      remote.audio_ssrc = this.combineArray(remoteAudio)
      remote.video_ssrc = this.combineArray(remoteVideo)
      remote.audioSlave_ssrc = this.combineArray(remoteAudioSlave)
      remote.screen_ssrc = this.combineArray(remoteScreen)
      if (!remote.video_ssrc.length && !remote.screen_ssrc.length) {
        remote.bwe = []
      }
    } else if (browser === 'safari') {
      //  Safari 上行数据
      Object.values(params.local).forEach((item: any) => {
        if (/^audio_/i.test(item.dataId)) {
          audio_local = Object.assign(audio_local, item)
        }
        if (/^audioSlave_/i.test(item.dataId)) {
          audioSlave_local = Object.assign(audioSlave_local, item)
        }
        if (/^video_high/i.test(item.dataId)) {
          video_high = Object.assign(video_high, item)
        }
        if (/^video_low/i.test(item.dataId)) {
          video_low = Object.assign(video_low, item)
        }
        if (/^screen_high/i.test(item.dataId)) {
          screen_high = Object.assign(screen_high, item)
        }
        if (/^screen_low/i.test(item.dataId)) {
          screen_low = Object.assign(screen_low, item)
        }
        if (/^candidate-pair/i.test(item.dataId)) {
          candidate_pair_local = Object.assign(candidate_pair_local, item)
        }
      })

      Object.values(audio_local).length && local.audio_ssrc.push(audio_local)
      Object.values(audioSlave_local).length && local.audioSlave_ssrc.push(audioSlave_local)
      Object.values(video_high).length && local.video_ssrc.push(video_high)
      Object.values(video_low).length && local.video_ssrc.push(video_low)
      Object.values(screen_high).length && local.screen_ssrc.push(screen_high)
      Object.values(screen_low).length && local.screen_ssrc.push(screen_low)
      Object.values(candidate_pair_local).length && local.candidatePair.push(candidate_pair_local)

      // Safari 下行数据
      Object.values(params.remote).forEach((item: any) => {
        if (/^audio_/i.test((item as any).dataId)) {
          remote.audio_ssrc.push(item)
        }
        if (/^video_/i.test(item.dataId)) {
          remote.video_ssrc.push(item)
        }
        if (/^audioSlave_/i.test(item.dataId)) {
          remote.audioSlave_ssrc.push(item)
        }
        if (/^screen_/i.test(item.dataId)) {
          remote.screen_ssrc.push(item)
        }
      })
    } else if (browser === 'firefox') {
      // Firefox 上行数据
      Object.values(params.local).forEach((item: any) => {
        if (/^audio_/i.test(item.dataId)) {
          audio_local = Object.assign(audio_local, item)
        }
        if (/^audioSlave_/i.test(item.dataId)) {
          audioSlave_local = Object.assign(audioSlave_local, item)
        }
        if (/^video_high/i.test(item.dataId)) {
          video_high = Object.assign(video_high, item)
        }
        if (/^video_low/i.test(item.dataId)) {
          video_low = Object.assign(video_low, item)
        }
        if (/^screen_high/i.test(item.dataId)) {
          screen_high = Object.assign(screen_high, item)
        }
        if (/^screen_low/i.test(item.dataId)) {
          screen_low = Object.assign(screen_low, item)
        }
      })
      Object.values(audio_local).length && local.audio_ssrc.push(audio_local)
      Object.values(audioSlave_local).length && local.audioSlave_ssrc.push(audioSlave_local)
      Object.values(video_high).length && local.video_ssrc.push(video_high)
      Object.values(video_low).length && local.video_ssrc.push(video_low)
      Object.values(screen_high).length && local.screen_ssrc.push(screen_high)
      Object.values(screen_low).length && local.screen_ssrc.push(screen_low)
      // Firefox 下行数据
      Object.values(params.remote).forEach((item: any) => {
        if (/^audio_/i.test((item as any).dataId)) {
          remoteAudio.push(item)
        }
        if (/^video_/i.test(item.dataId)) {
          remoteVideo.push(item)
        }
        if (/^audioSlave_/i.test(item.dataId)) {
          remoteAudioSlave.push(item)
        }
        if (/^screen_/i.test(item.dataId)) {
          remoteScreen.push(item)
        }
      })
      remote.audio_ssrc = this.combineArray(remoteAudio)
      remote.video_ssrc = this.combineArray(remoteVideo)
      remote.audioSlave_ssrc = this.combineArray(remoteAudioSlave)
      remote.screen_ssrc = this.combineArray(remoteScreen)
    }

    result.local = local
    result.remote = remote
    if (env.IS_EDG) {
      result.browser = 'Edge-' + getBrowserInfo().browserVersion
    } else {
      result.browser = getBrowserInfo().browserName + '-' + getBrowserInfo().browserVersion
    }

    return result
  }

  finalizeData(params: any) {
    let result = {
      appkey: params.appkey,
      cid: params.cid,
      uid: params.uid,
      timestamp: params.timestamp,
      platform: params.platform,
      browser: params.browser,
      sdkVersion: SDK_VERSION,
      local: {
        audio_ssrc: params.local.audio_ssrc,
        video_ssrc: params.local.video_ssrc,
        audioSlave_ssrc: params.local.audioSlave_ssrc,
        screen_ssrc: params.local.screen_ssrc,
        bwe: params.local.bwe
      },
      remote: params.remote
    }
    return result
  }

  combineArray(arr: any) {
    // 合并下行相同 uid 的数组
    let result = Object.values(
      arr.reduce((m: any, n: any) => {
        if (!m[n.uid]) {
          m[n.uid] = { uid: n.uid, list: {} }
        }
        Object.assign(m[n.uid].list, n)
        return m
      }, {})
    )
    return result.map((item: any) => item.list)
  }

  getLocalVideoScreenFreezeStats(data: any, uid: number | string) {
    let totalFreezeTime = 0
    if (!data) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }

    let n = parseInt(data.googFrameRateInput)
    let i = parseInt(data.googFrameRateSent)

    if (n <= 0 || i <= 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }
    //let stuckRate = (n - i) / n

    let value = Math.abs(n - i - 2)
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
    //console.log('本端视频卡顿率: ', JSON.stringify(info, null, ' '))
    return info
  }

  getRemoteVideoScreenFreezeStats(prev: any, next: any, uid: number | string) {
    let totalFreezeTime = 0
    //@ts-ignore
    if (!next || next.framesDecoded == 0) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    } else if (next && next.googFrameRateDecoded == '0' && next.framesDecoded) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }

    let n = parseInt(next.googFrameRateReceived) || 0
    let i = parseInt(next.googFrameRateDecoded)

    if (n <= 0 || i <= 0) {
      return {
        totalFreezeTime: 2000,
        freezeTime: 6
      }
    }

    let value = Math.abs(i - n - 2)
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
    //console.log('远端屏幕共享卡顿率: ', JSON.stringify(info, null, ' '))
    return info
  }

  getRemoteAudioFreezeStats(currentItem: DownAudioItem, uid: number | string) {
    let totalFreezeTime = 0
    if (!this.prevItem || !currentItem) {
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }
    if (!Object.values(this.prevItem).length && currentItem) {
      this.prevItem = currentItem
      return {
        totalFreezeTime,
        freezeTime: 0
      }
    }
    if (this.prevItem && currentItem) {
      let prevStuck =
        parseInt(this.prevItem.googDecodingPLC) +
        parseInt(this.prevItem.googDecodingCNG) +
        parseInt(this.prevItem.googDecodingPLCCNG)
      let prevNormal = parseInt(this.prevItem.googDecodingCTN)

      let nextStuck =
        parseInt(currentItem.googDecodingPLC) +
        parseInt(currentItem.googDecodingCNG) +
        parseInt(currentItem.googDecodingPLCCNG)
      let nextNormal = parseInt(currentItem.googDecodingCTN)
      if (nextNormal <= prevNormal || nextStuck <= prevStuck) {
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
      this.prevItem = currentItem
      return data
    }
  }

  stop() {
    this._reset()
  }

  destroy() {
    this._reset()
  }
}

export { GetStats }
