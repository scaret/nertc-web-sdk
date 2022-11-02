import { AdapterRef, FormativeStatsReportOptions } from '../../types'
import ErrorCode from '../../util/error/errorCode'
import RtcError from '../../util/error/rtcError'
import * as env from '../../util/rtcUtil/rtcEnvironment'
import { getBrowserInfo, getOSInfo } from '../../util/rtcUtil/rtcPlatform'
import { DataReport } from './dataReport'

let url = 'https://statistic.live.126.net/statistic/realtime/sdkinfo'
type UIDTYPE = number | string
/**
 *  @param {Object} options 配置参数
 */
class FormativeStatsReport {
  private adapterRef: AdapterRef
  private webrtcStats: string[]
  private publicIP: string
  public LocalAudioEnable: boolean
  public localVideoEnable: boolean
  public localScreenEnable: boolean
  private _audioLevel: { uid: number | string; level: number; type: 'audio' | 'audioSlave' }[]
  private infos: {
    cid?: number
    uid?: number | string
    ver?: number
    device?: number
    isp?: number
    net?: string
    platform?: string
    browser?: string
    sdk_ver?: string
    appkey?: string
    interval: number
    samples?: number
    time?: number
    qos_algorithm?: number
    fec_algorithm?: number
    qos_scene?: number
    qos_strategy?: number
  }
  private infos2: { [key: string]: any }
  public firstData: {
    recvFirstData: {
      [uid in UIDTYPE]: {
        recvFirstAudioFrame: boolean
        recvFirstVideoFrame: boolean
        recvFirstScreenFrame: boolean
        recvFirstAudioPackage: boolean
        recvFirstVideoPackage: boolean
        recvFirstScreenPackage: boolean
        videoTotalPlayDuration: number
        screenTotalPlayDuration: number
      }
    }
    sendFirstAudioPackage: boolean
    sendFirstVideoPackage: boolean
    sendFirstScreenPackage: boolean
  }
  private network: string

  constructor(options: FormativeStatsReportOptions) {
    this._reset()
    this.adapterRef = options.adapterRef
    this.webrtcStats = []
    this.publicIP = ''
    this._audioLevel = []
    // to pass typescript initializer check
    this.infos = {
      interval: 0
    }
    this.infos2 = {}
    this.firstData = {
      recvFirstData: {},
      sendFirstAudioPackage: false,
      sendFirstVideoPackage: false,
      sendFirstScreenPackage: false
    }
    this.network = ''
    this.LocalAudioEnable = false
    this.localVideoEnable = false
    this.localScreenEnable = false
    this.init(this.adapterRef.channelInfo.appkey)
    this.resetStatus()
  }

  _reset() {
    this._audioLevel = []
    this.infos = { interval: 0 }
  }

  init(appkey: string) {
    // 版本号，暂时写死1
    this.infos = {
      ver: 2,
      device: -1,
      isp: -1,
      platform: tool.convertPlatform(getOSInfo().osName) + '-' + getOSInfo().osVersion + '- webrtc',
      browser: getBrowserInfo().browserName + '-' + getBrowserInfo().browserVersion,
      sdk_ver: '3.6.0',
      appkey: appkey,
      // 上报时间间隔
      interval: 60,
      // 采样点数
      samples: 30,
      // 发送的时候再加时间戳
      time: Date.now(),
      // QoS算法选择 1：老的，2：新开发的。通过json字段拿到，设置到网络层，用于灰度上线
      qos_algorithm: -1,
      // FEC算法选择 1：老的，2：新开发的。通过json字段拿到，设置到网络层，用于灰度上线
      fec_algorithm: -1,
      // QoS场景，例如：桌面白板、运动camera、静止camera，具体场景待定
      qos_scene: -1,
      // QoS策略模式，例如：流畅优先、清晰优先
      qos_strategy: -1
    }
    return this.infos
  }

  resetStatus() {
    this.infos = Object.assign(this.infos, {
      uid: null,
      cid: null,
      push_url: null,
      turn_ip: null,
      proxy_ip: null,
      meeting: false,
      live: false
    })
    this.firstData = {
      recvFirstData: {},
      sendFirstAudioPackage: false,
      sendFirstVideoPackage: false,
      sendFirstScreenPackage: false
    }
    if (this._audioLevel) {
      this._audioLevel.length = 0
    }
  }

  // 开启上报时初始化一些固定值
  initInfoData(uid?: number | string) {
    let tmp = {
      uid,
      cid: this.adapterRef.channelInfo.cid || 0,
      push_url: '',
      turn_ip:
        (this.adapterRef &&
          this.adapterRef.channelInfo.wssArr &&
          this.adapterRef.channelInfo.wssArr[0]) ||
        '',
      proxy_ip:
        (this.adapterRef &&
          this.adapterRef.channelInfo.wssArr &&
          this.adapterRef.channelInfo.wssArr[0]) ||
        '',
      meeting: true,
      live:
        (this.adapterRef.channelInfo && this.adapterRef.channelInfo.sessionConfig.liveEnable) ||
        false,
      // 通话状态: 直连、中转
      p2p: false,
      // 注册网络运营商: 46001 中国联通
      isp: -1,
      // 网络类型: 2g、3g、4g、wifi等
      net: -1,
      // 频道加入状态码
      connect_state: 200,
      // 信令通信时长: 调用加入频道 -> IM信令成功加入后计算时差
      signalling_time:
        ((this.adapterRef.channelInfo &&
          this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime) ||
          0) -
        (this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startJoinTime || 0),
      // 频道加入时长: 收到IM信令 -> 网络层登录成功后计算时差
      connect_time:
        ((this.adapterRef.channelInfo &&
          this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.joinedSuccessedTime) ||
          0) -
        ((this.adapterRef.channelInfo &&
          this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime) ||
          0)
    }
    this.infos = Object.assign(this.infos, tmp)
  }

  start() {
    this.infos.appkey = this.adapterRef.channelInfo.appkey

    this.infos.cid = this.adapterRef.channelInfo.cid
    this.infos.uid = this.adapterRef.channelInfo.uid
    // 需要每秒计算的值
    this.initInfoData(this.infos.uid)
  }

  stop() {
    this.resetStatus()
  }

  update(data: any, time: number) {
    let uid = data.uid
    let bytesSent = 0
    let bitsSent = 0
    let bytesReceived = 0
    let recvBitrate = 0
    if (this._audioLevel) {
      this._audioLevel.length = 0
    }
    // 上行
    // 音频
    if (data.local.audio_ssrc[0] && Object.values(data.local.audio_ssrc[0]).length > 0) {
      bytesSent += parseInt(data.local.audio_ssrc[0].bytesSent)
      bitsSent += parseInt(data.local.audio_ssrc[0].bitsSentPerSecond)
      this.dispatchExceptionEventSendAudio(data.uid, data.local.audio_ssrc[0], 1)
      if (!this.firstData.sendFirstAudioPackage && data.local.audio_ssrc[0].packetsSent > 0) {
        this.firstData.sendFirstAudioPackage = true
        this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
          media_type: 0
        })
      }
    }
    // 辅流音频
    if (data.local.audioSlave_ssrc[0] && Object.values(data.local.audioSlave_ssrc[0]).length > 0) {
      bytesSent += parseInt(data.local.audioSlave_ssrc[0].bytesSent)
      bitsSent += parseInt(data.local.audioSlave_ssrc[0].bitsSentPerSecond)
      this.dispatchExceptionEventSendAudio(data.uid, data.local.audioSlave_ssrc[0], 0)
    }
    // 视频
    if (
      data.local.video_ssrc.length >= 1 &&
      data.local.video_ssrc[0] &&
      Object.values(data.local.video_ssrc[0]).length > 0
    ) {
      bytesSent += parseInt(data.local.video_ssrc[0].bytesSent)
      bitsSent += parseInt(data.local.video_ssrc[0].bitsSentPerSecond)
      if (!this.firstData.sendFirstVideoPackage && data.local.video_ssrc[0].packetsSent > 0) {
        this.firstData.sendFirstVideoPackage = true
        this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
          media_type: 1
        })
      }
      data.local.video_ssrc.forEach((item: any) => {
        if (Object.values(item).length && item.streamType === 'high') {
          this.dispatchExceptionEventSendVideo(data.uid, item)
        }
      })
    }
    // 屏幕共享
    if (
      data.local.screen_ssrc.length >= 1 &&
      data.local.screen_ssrc[0] &&
      Object.values(data.local.screen_ssrc[0]).length > 0
    ) {
      bytesSent += parseInt(data.local.screen_ssrc[0].bytesSent)
      bitsSent += parseInt(data.local.screen_ssrc[0].bitsSentPerSecond)
      if (!this.firstData.sendFirstScreenPackage && data.local.screen_ssrc[0].packetsSent > 0) {
        this.firstData.sendFirstScreenPackage = true
        this.adapterRef.instance.apiEventReport('setSendFirstPackage', {
          media_type: 2
        })
      }
    }
    // Chrome 上行 Conn
    if (data.local.conn[0] && Object.values(data.local.conn[0]).length > 0) {
      this.publicIP = data.local.conn[0].googLocalAddress.match(/([0-9\.]+)/)[1]
      let rtt = data.local.conn[0].googRtt == '0' ? '1' : data.local.conn[0].googRtt
      this.adapterRef.transportStats.txRtt = rtt
      this.adapterRef.transportStats.rxRtt = rtt
    }
    // Chrome 上行 local-candidate
    if (data.local.localCandidate[0] && Object.values(data.local.localCandidate[0]).length > 0) {
      this.adapterRef.transportStats.OutgoingAvailableBandwidth =
        data.local.localCandidate[0].availableOutgoingBitrate / 1000
    }
    // Chrome/Safari 上行 candidate-pair
    if (data.local.candidatePair[0] && Object.values(data.local.candidatePair[0]).length > 0) {
      this.adapterRef.transportStats.NetworkType = data.local.candidatePair[0].networkType
    }

    // 下行
    // 音频
    if (
      data.remote.audio_ssrc.length &&
      data.remote.audio_ssrc[0] &&
      Object.values(data.remote.audio_ssrc[0]).length
    ) {
      data.remote.audio_ssrc.forEach((item: any) => {
        if (!this.firstData.recvFirstData[item.uid]) {
          this.firstData.recvFirstData[item.uid] = {
            recvFirstAudioFrame: false,
            recvFirstVideoFrame: false,
            recvFirstScreenFrame: false,
            recvFirstAudioPackage: false,
            recvFirstVideoPackage: false,
            recvFirstScreenPackage: false,
            videoTotalPlayDuration: 0,
            screenTotalPlayDuration: 0
          }
        }
        this.dispatchExceptionEventRecvAudio(item)
        if (
          Object.values(item).length &&
          !this.firstData.recvFirstData[item.uid].recvFirstAudioFrame &&
          item.googDecodingNormal &&
          parseInt(item.googDecodingNormal)
        ) {
          this.firstData.recvFirstData[item.uid].recvFirstAudioFrame = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 0,
            pull_uid: item.uid
          })
        }

        if (
          Object.values(item).length &&
          !this.firstData.recvFirstData[item.uid].recvFirstAudioPackage &&
          item.packetsReceived &&
          parseInt(item.packetsReceived)
        ) {
          this.firstData.recvFirstData[item.uid].recvFirstAudioPackage = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 0,
            pull_uid: item.uid
          })
        }
        let audioLevel = 0
        if (item.audioOutputLevel >= 0) {
          // Chrome， 0-32767
          audioLevel = item.audioOutputLevel
        } else if (item.audioLevel >= 0) {
          // Safari， 0-1，正好与Chrome呈线性关系
          audioLevel = Math.floor(item.audioLevel * 32768)
        }

        const remoteStream = this.adapterRef.remoteStreamMap[item.uid]
        const muteStatus =
          remoteStream && (remoteStream.muteStatus.audio.send || remoteStream.muteStatus.audio.recv)
        let isPlaying = true
        if (muteStatus) {
          isPlaying = false
        }

        if (
          !remoteStream ||
          !remoteStream.Play ||
          !remoteStream.Play.audioDom ||
          !remoteStream.Play.audioDom.srcObject ||
          remoteStream.Play.audioDom.muted
        ) {
          isPlaying = false
        }

        this._audioLevel.push({
          uid: item.uid,
          level: isPlaying ? +audioLevel || 0 : 0,
          type: 'audio'
        })
        if (typeof muteStatus === 'boolean') {
          this.adapterRef.remoteAudioStats[item.uid] = {
            CodecType: 'Opus',
            End2EndDelay:
              (parseInt(item.googCurrentDelayMs) || 0) + (parseInt(item.googJitterBufferMs) || 0),
            MuteState: muteStatus,
            PacketLossRate: item.packetsLostRate || 0,
            RecvBitrate: item.bitsReceivedPerSecond || 0,
            RecvLevel: parseInt(item.audioOutputLevel) || +item.audioLevel || 0,
            TotalFreezeTime: item.totalFreezeTime || 0,
            TotalPlayDuration: parseInt(item.totalSamplesDuration) || 0,
            TransportDelay: parseInt(item.googCurrentDelayMs) || 0
          }
          recvBitrate = recvBitrate + item.bitsReceivedPerSecond
          bytesReceived = bytesReceived + item.bytesReceived
        }
      })
    }
    // 辅流音频
    if (
      data.remote.audioSlave_ssrc.length &&
      data.remote.audioSlave_ssrc[0] &&
      Object.values(data.remote.audioSlave_ssrc[0]).length
    ) {
      data.remote.audioSlave_ssrc.forEach((item: any) => {
        let audioLevel = 0
        if (item.audioOutputLevel >= 0) {
          // Chrome， 0-32767
          audioLevel = item.audioOutputLevel
        } else if (item.audioLevel >= 0) {
          // Safari， 0-1，正好与Chrome呈线性关系
          audioLevel = Math.floor(item.audioLevel * 32768)
        }
        const remoteStream = this.adapterRef.remoteStreamMap[item.uid]
        const muteStatus =
          remoteStream &&
          (remoteStream.muteStatus.audioSlave.send || remoteStream.muteStatus.audioSlave.recv)
        let isPlaying = true
        if (muteStatus) {
          isPlaying = false
        }

        if (
          !remoteStream ||
          !remoteStream.Play ||
          !remoteStream.Play.audioSlaveDom ||
          !remoteStream.Play.audioSlaveDom.srcObject ||
          remoteStream.Play.audioSlaveDom.muted
        ) {
          isPlaying = false
        }

        this._audioLevel.push({
          uid: item.uid,
          level: isPlaying ? +audioLevel || 0 : 0,
          type: 'audioSlave'
        })
        if (typeof muteStatus === 'boolean') {
          this.adapterRef.remoteAudioSlaveStats[item.uid] = {
            CodecType: 'Opus',
            End2EndDelay:
              (parseInt(item.googCurrentDelayMs) || 0) + (parseInt(item.googJitterBufferMs) || 0),
            MuteState: muteStatus,
            PacketLossRate: item.packetsLostRate || 0,
            RecvBitrate: item.bitsReceivedPerSecond || 0,
            RecvLevel: parseInt(item.audioOutputLevel) || +item.audioLevel || 0,
            TotalFreezeTime: item.totalFreezeTime || 0,
            TotalPlayDuration: parseInt(item.totalSamplesDuration) || 0,
            TransportDelay: parseInt(item.googCurrentDelayMs) || 0
          }
          recvBitrate = recvBitrate + item.bitsReceivedPerSecond
          bytesReceived = bytesReceived + item.bytesReceived
        }
      })
    }
    // 视频
    if (
      data.remote.video_ssrc.length &&
      data.remote.video_ssrc[0] &&
      Object.values(data.remote.video_ssrc[0]).length
    ) {
      data.remote.video_ssrc.forEach((item: any) => {
        if (!this.firstData.recvFirstData[item.uid]) {
          this.firstData.recvFirstData[item.uid] = {
            recvFirstAudioFrame: false,
            recvFirstVideoFrame: false,
            recvFirstScreenFrame: false,
            recvFirstAudioPackage: false,
            recvFirstVideoPackage: false,
            recvFirstScreenPackage: false,
            videoTotalPlayDuration: 0,
            screenTotalPlayDuration: 0
          }
        }
        const remoteStream = this.adapterRef.remoteStreamMap[item.uid]
        const videoDom = remoteStream && remoteStream.Play && remoteStream.Play.videoDom
        let muteState =
          remoteStream && (remoteStream.muteStatus.video.send || remoteStream.muteStatus.video.recv)
        if (!this.firstData.recvFirstData[item.uid].recvFirstVideoFrame && item.framesDecoded > 0) {
          this.firstData.recvFirstData[item.uid].recvFirstVideoFrame = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 1,
            pull_uid: item.uid
          })
        } else if (item.framesDecoded > 0) {
          this.firstData.recvFirstData[item.uid].videoTotalPlayDuration++
        }

        if (
          !this.firstData.recvFirstData[item.uid].recvFirstVideoPackage &&
          item.packetsReceived > 0
        ) {
          this.firstData.recvFirstData[item.uid].recvFirstVideoPackage = true
          this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
            media_type: 1,
            pull_uid: item.uid
          })
        }
        this.dispatchExceptionEventRecvVideo(item)
        if (typeof muteState === 'boolean') {
          this.adapterRef.remoteVideoStats[item.uid] = {
            LayerType: 1,
            CodecName: item.googCodecName,
            End2EndDelay:
              (parseInt(item.googCurrentDelayMs) || 0) +
              (parseInt(item.googJitterBufferMs) || 0) +
              (parseInt(item.googRenderDelayMs) || 0),
            MuteState: muteState,
            PacketLossRate: item.packetsLostRate || 0,
            RecvBitrate: item.bitsReceivedPerSecond || 0,
            RecvResolutionHeight: parseInt(item.googFrameHeightReceived) || 0,
            RecvResolutionWidth: parseInt(item.googFrameWidthReceived) || 0,
            RenderFrameRate: parseInt(item.googFrameRateOutput) || 0,
            RenderResolutionHeight: videoDom ? videoDom.videoHeight : 0,
            RenderResolutionWidth: videoDom ? videoDom.videoWidth : 0,
            TotalFreezeTime: item.totalFreezeTime || 0,
            TotalPlayDuration:
              (this.firstData.recvFirstData[uid] &&
                this.firstData.recvFirstData[uid].videoTotalPlayDuration) ||
              (videoDom && videoDom.played && videoDom.played.length ? videoDom.played.end(0) : 0),
            TransportDelay: parseInt(item.googCurrentDelayMs) || 0
          }
          recvBitrate = recvBitrate + item.bitsReceivedPerSecond
          bytesReceived = bytesReceived + item.bytesReceived
        }
      })
    }

    // 屏幕共享
    if (
      data.remote.screen_ssrc.length &&
      data.remote.screen_ssrc[0] &&
      Object.values(data.remote.screen_ssrc[0]).length
    ) {
      data.remote.screen_ssrc.forEach((item: any) => {
        if (!this.firstData.recvFirstData[item.uid]) {
          this.firstData.recvFirstData[item.uid] = {
            recvFirstAudioFrame: false,
            recvFirstVideoFrame: false,
            recvFirstScreenFrame: false,
            recvFirstAudioPackage: false,
            recvFirstVideoPackage: false,
            recvFirstScreenPackage: false,
            videoTotalPlayDuration: 0,
            screenTotalPlayDuration: 0
          }
        }
        const remoteStream = this.adapterRef.remoteStreamMap[item.uid]
        const screenDom = remoteStream && remoteStream.Play && remoteStream.Play.screenDom
        let muteState =
          remoteStream &&
          (remoteStream.muteStatus.screen.send || remoteStream.muteStatus.screen.recv)
        if (
          !this.firstData.recvFirstData[item.uid].recvFirstScreenFrame &&
          item.framesDecoded > 0
        ) {
          this.firstData.recvFirstData[item.uid].recvFirstScreenFrame = true
          this.adapterRef.instance.apiEventReport('setRecvFirstFrame', {
            media_type: 2,
            pull_uid: item.uid
          })
        } else if (item.framesDecoded > 0) {
          this.firstData.recvFirstData[item.uid].screenTotalPlayDuration++
        }

        if (
          !this.firstData.recvFirstData[item.uid].recvFirstScreenPackage &&
          item.packetsReceived > 0
        ) {
          this.firstData.recvFirstData[item.uid].recvFirstScreenPackage = true
          this.adapterRef.instance.apiEventReport('setRecvFirstPackage', {
            media_type: 2,
            pull_uid: item.uid
          })
        }
        this.dispatchExceptionEventRecvScreen(item)
        if (typeof muteState === 'boolean') {
          this.adapterRef.remoteScreenStats[item.uid] = {
            LayerType: 2,
            CodecName: item.googCodecName,
            End2EndDelay:
              (parseInt(item.googCurrentDelayMs) || 0) +
              (parseInt(item.googJitterBufferMs) || 0) +
              (parseInt(item.googRenderDelayMs) || 0),
            MuteState: muteState,
            PacketLossRate: item.packetsLostRate || 0,
            RecvBitrate: item.bitsReceivedPerSecond || 0,
            RecvResolutionHeight: parseInt(item.googFrameHeightReceived) || 0,
            RecvResolutionWidth: parseInt(item.googFrameWidthReceived) || 0,
            RenderFrameRate: parseInt(item.googFrameRateOutput) || 0,
            RenderResolutionHeight: screenDom ? screenDom.videoHeight : 0,
            RenderResolutionWidth: screenDom ? screenDom.videoWidth : 0,
            TotalFreezeTime: item.totalFreezeTime || 0,
            TotalPlayDuration:
              (this.firstData.recvFirstData[uid] &&
                this.firstData.recvFirstData[uid].screenTotalPlayDuration) ||
              (screenDom && screenDom.played && screenDom.played.length
                ? screenDom.played.end(0)
                : 0),
            TransportDelay: parseInt(item.googCurrentDelayMs) || 0
          }
          recvBitrate = recvBitrate + item.bitsReceivedPerSecond
          bytesReceived = bytesReceived + item.bytesReceived
        }
      })
    }
    this.adapterRef.sessionStats.SendBytes = bytesSent
    this.adapterRef.sessionStats.SendBitrate = bitsSent
    this.adapterRef.sessionStats.RecvBytes = bytesReceived
    this.adapterRef.sessionStats.RecvBitrate = recvBitrate
    if (time === 1) {
      return
    }
    this._audioLevel.sort(tool.compare('level'))
    if (this._audioLevel.length > 0 && this._audioLevel[0].level > 0) {
      // Safari 和 Firefox 获取不到audioLevel, 没有active-speaker探测能力
      this.adapterRef.instance.safeEmit('active-speaker', this._audioLevel[0])
    }

    if (time % 2 === 0) {
      this.adapterRef.instance.safeEmit('volume-indicator', this._audioLevel)
      this.updateLocalMediaInfo(data)
    }
  }

  getSamplingRate(param: string) {
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

  updateLocalMediaInfo(params: any) {
    if (!this.adapterRef.localStream) return
    // client: getLocalAudioStats
    this.adapterRef.localAudioStats[0] = {
      CodecType: 'Opus',
      MuteState: this.adapterRef.localStream!.muteStatus.audio.send,
      RecordingLevel: parseFloat(params.local.audio_ssrc[0].audioInputLevel) || 0,
      SamplingRate: this.getSamplingRate(this.adapterRef.localStream!.audioProfile),
      SendBitrate: params.local.audio_ssrc[0].bitsSentPerSecond,
      SendLevel: parseFloat(params.local.audio_ssrc[0].audioInputLevel) || 0
    }

    // client: getLocalAudioSlaveStats
    this.adapterRef.localAudioSlaveStats[0] = {
      CodecType: 'Opus',
      MuteState: this.adapterRef.localStream!.muteStatus.audioSlave.send,
      RecordingLevel: parseFloat(params.local.audioSlave_ssrc[0].audioInputLevel) || 0,
      SamplingRate: this.getSamplingRate(this.adapterRef.localStream!.audioProfile),
      SendBitrate: params.local.audioSlave_ssrc[0].bitsSentPerSecond,
      SendLevel: parseFloat(params.local.audioSlave_ssrc[0].audioInputLevel) || 0
    }
    // client: getLocalVideoStats('video')
    this.adapterRef.localVideoStats[0] = {
      LayerType: 1,
      CodecName: params.local.video_ssrc[0].googCodecName || 'h264',
      CaptureFrameRate: params.local.video_ssrc[0].googFrameRateInput || 0,
      CaptureResolutionHeight: parseInt(params.local.video_ssrc[0].googFrameHeightInput) || 0,
      CaptureResolutionWidth: parseInt(params.local.video_ssrc[0].googFrameWidthInput) || 0,
      EncodeDelay: parseInt(params.local.video_ssrc[0].googAvgEncodeMs) || 0,
      MuteState: this.adapterRef.localStream.muteStatus.video.send,
      SendBitrate: parseInt(params.local.video_ssrc[0].googTransmitBitrate) || 0,
      SendFrameRate: parseInt(params.local.video_ssrc[0].googFrameRateSent) || 0,
      SendResolutionHeight: parseInt(params.local.video_ssrc[0].googFrameHeightSent) || 0,
      SendResolutionWidth: parseInt(params.local.video_ssrc[0].googFrameWidthSent) || 0,
      TargetSendBitrate: parseInt(params.local.video_ssrc[0].googTargetEncBitrate) || 0,
      TotalDuration: this.adapterRef.state.startPubVideoTime
        ? (Date.now() - this.adapterRef.state.startPubVideoTime) / 1000
        : 0,
      TotalFreezeTime: params.local.video_ssrc[0].totalFreezeTime || 0
    }
    // client: getLocalVideoStats('screen')
    this.adapterRef.localScreenStats[0] = {
      LayerType: 2,
      CodecName: params.local.screen_ssrc[0].googCodecName || 'h264',
      CaptureFrameRate: params.local.screen_ssrc[0].googFrameRateInput || 0,
      CaptureResolutionHeight: parseInt(params.local.screen_ssrc[0].googFrameHeightInput) || 0,
      CaptureResolutionWidth: parseInt(params.local.screen_ssrc[0].googFrameWidthInput) || 0,
      EncodeDelay: parseInt(params.local.screen_ssrc[0].googAvgEncodeMs) || 0,
      MuteState: this.adapterRef.localStream.muteStatus.screen.send,
      SendBitrate: parseInt(params.local.screen_ssrc[0].googTransmitBitrate) || 0,
      SendFrameRate: parseInt(params.local.screen_ssrc[0].googFrameRateSent) || 0,
      SendResolutionHeight: parseInt(params.local.screen_ssrc[0].googFrameHeightSent) || 0,
      SendResolutionWidth: parseInt(params.local.screen_ssrc[0].googFrameWidthSent) || 0,
      TargetSendBitrate: parseInt(params.local.screen_ssrc[0].googTargetEncBitrate) || 0,
      TotalDuration: this.adapterRef.state.startPubScreenTime
        ? (Date.now() - this.adapterRef.state.startPubScreenTime) / 1000
        : 0,
      TotalFreezeTime: params.local.screen_ssrc[0].totalFreezeTime || 0
    }

    // let systemNetworkType = ((navigator.connection || {}).type || 'unknown')
    //   .toString()
    //   .toLowerCase()
    // this.infos.net = tool.convertNetwork(this.network || systemNetworkType)
  }

  dispatchExceptionEventSendAudio(uid: string, params: any, type: number) {
    if (0 === parseInt(params.audioInputLevel)) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: type ? 'AUDIO_INPUT_LEVEL_TOO_LOW' : 'AUDIOSLAVE_INPUT_LEVEL_TOO_LOW',
        code: 2001,
        uid: uid
      })
    }
    if (0 === params.bitsSentPerSecond) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: type ? 'SEND_AUDIO_BITRATE_TOO_LOW' : 'SEND_AUDIOSLAVE_BITRATE_TOO_LOW',
        code: 2003,
        uid: params.uid
      })
    }
  }

  dispatchExceptionEventSendVideo(uid: string, params: any) {
    // 暂时只监听大流
    if (parseInt(params.googFrameRateInput) > 5 && parseInt(params.googFrameRateSent) <= 1) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'FRAMERATE_SENT_TOO_LOW',
        code: 1002,
        uid: uid
      })
    }
    if (params.bitsSentPerSecond === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'FRAMERATE_VIDEO_BITRATE_TOO_LOW',
        code: 1003,
        uid: uid
      })
    }
  }

  dispatchExceptionEventRecvAudio(params: any) {
    const remoteStream = this.adapterRef.remoteStreamMap[params.uid]
    const muteStatus =
      remoteStream && (remoteStream.muteStatus.audio.send || remoteStream.muteStatus.audio.recv)
    if (remoteStream && muteStatus) {
      return
    }

    if (
      !remoteStream ||
      !remoteStream.Play ||
      !remoteStream.Play.audioDom ||
      !remoteStream.Play.audioDom.srcObject ||
      remoteStream.Play.audioDom.muted
    ) {
      return
    }

    if (params.bitsReceivedPerSecond > 0 && params.googDecodingNormalPerSecond === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'RECV_AUDIO_DECODE_FAILED',
        code: 2005,
        uid: params.uid
      })
    }

    if (
      params.bitsReceivedPerSecond > 0 &&
      params.googDecodingNormalPerSecond > 0 &&
      0 === +(params.audioOutputLevel || params.audioLevel)
    ) {
      const volume =
        remoteStream &&
        remoteStream.Play &&
        remoteStream.Play.audioDom &&
        remoteStream.Play.audioDom.volume
      if (volume && volume > 0) {
        this.adapterRef.instance.safeEmit('exception', {
          msg: 'AUDIO_OUTPUT_LEVEL_TOO_LOW',
          code: 2002,
          uid: params.uid
        })
      }
    }
  }

  dispatchExceptionEventRecvVideo(params: any) {
    const remoteStream = this.adapterRef.remoteStreamMap[params.uid]
    const muteStatus =
      remoteStream && (remoteStream.muteStatus.video.send || remoteStream.muteStatus.video.recv)
    if (remoteStream && muteStatus) {
      return
    }
    if (params.bitsReceivedPerSecond > 0 && parseInt(params.googFrameRateDecoded) === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'RECV_VIDEO_DECODE_FAILED',
        code: 1005,
        uid: params.uid
      })
    }
  }

  dispatchExceptionEventRecvScreen(params: any) {
    const remoteStream = this.adapterRef.remoteStreamMap[params.uid]
    const muteStatus =
      remoteStream && (remoteStream.muteStatus.screen.send || remoteStream.muteStatus.screen.recv)
    if (remoteStream && muteStatus) {
      return
    }
    if (params.bitsReceivedPerSecond > 0 && parseInt(params.googFrameRateDecoded) === 0) {
      this.adapterRef.instance.safeEmit('exception', {
        msg: 'RECV_SCREEN_DECODE_FAILED',
        code: 1005,
        uid: params.uid
      })
    }
  }

  destroy() {
    this.resetStatus()
    this._reset()
  }
}

// 数据转换工具
let tool = {
  convertNetwork(txt: string) {
    let map: { [key: string]: string } = {
      wlan: 'wifi',
      lan: 'ethernet'
    }
    return map[txt] || 'unknown'
  },
  convertPlatform(txt: string) {
    let win = /Windows/i
    let mac = /OS X/i
    let result
    result = (win.test(txt) && 'Win') || txt
    result = (mac.test(result) && 'Mac') || result
    return result
  },
  compare(property: string) {
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
}

export { FormativeStatsReport }
