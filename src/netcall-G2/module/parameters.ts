// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
// 变量名请使用至少三个单词组合，以防与客户URL变量相撞

import { Client } from '../api/client'
import { LocalStream } from '../api/localStream'
import { loglevels } from '../util/log/loglevels'
import { ProducerCodecOptions } from './3rd/mediasoup-client/Producer'

interface IParameters {
  // 存储了所有通过SDK的MediaStreamTrack，包括SDK开启的、外部输入的、小流等
  tracks: {
    audio: (MediaStreamTrack | null)[]
    video: (MediaStreamTrack | null)[]
  }

  shimVideoOrientation: 'never' | 'ios151' | 'allsafari'

  // ios15.1上行直接通过摄像头发送H264会导致页面崩溃，需要在canvas绘制后传输
  shimCanvas: 'never' | 'ios151' | 'always'

  // 存储了通过createClient创建的客户端
  clients: Client[]

  // 存储了通过createStream创建的客户端
  localStreams: LocalStream[]

  // debugG2
  debugG2: boolean

  // 是否开启UI提示
  enableAlerter: 'never' | 'nolistener' | 'always'

  // 主流小流最大宽度
  videoLowMaxWidth: number
  // 主流小流最大高度
  videoLowMaxHeight: number
  // 主流小流帧率
  videoLowFramerate: number
  // 小流检查是否是空
  videoLowCheckCanvasBlank: 'ios' | 'all' | 'never'

  // 辅流小流最大宽度
  screenLowMaxWidth: number
  // 辅流小流最大高度
  screenLowMaxHeight: number
  // 辅流小流帧率
  screenLowFramerate: number

  // 播放时如果遇到自动播放问题，是否显示video控件的默认控制选项
  controlOnPaused: boolean

  // 恢复播放时，是否隐藏video控件的默认控制选项
  hideControlOnResume: boolean

  // 覆盖声网的设备枚举
  forceListenDeviceChange: boolean

  // 最大PeerConnection重连次数
  maxTransportRebuildCnt: number

  // 整个页面打印在console里的最低logLevel等级
  logLevel: loglevels

  // 强制使用的logLevel。-1为不强制
  forceLogLevel: -1 | loglevels

  // 强制开启或关闭日志上传。
  forceLogUpload: 'default' | 'on' | 'off'

  // mediasoup中的编码选项
  codecOptions: {
    audio: ProducerCodecOptions
  }
  videoHighStartBitrate: number
  videoHighMinBitrate: number
  videoLowStartBitrate: number
  videoLowMinBitrate: number
  screenHighStartBitrate: number
  screenHighMinBitrate: number
  screenLowStartBitrate: number
  screenLowMinBitrate: number
  // 屏幕共享时是否跳转到被共享页面
  screenFocus: 'default' | 'focus-captured-surface' | 'no-focus-change'
  // 屏幕共享Tab页时是否允许动态切换为别的共享页
  screenSurfaceSwitching: 'default' | 'include' | 'exclude'
  // 屏幕共享选择时默认是什么：标签、应用、屏幕
  screenDisplaySurface: 'default' | 'browser' | 'window' | 'monitor'
  // 屏幕共享时，浏览器将当前选项卡作为最突出的捕获源
  // preferCurrentTab: true 和 selfBrowserSurface: 'exclude' 互斥
  screenPreferCurrentTab: true | false
  // 屏幕共享是否允许用户选择当前选项卡进行捕获
  screenSelfBrowserSurface: 'default' | 'include' | 'exclude'
  // 是否允许localStream啥都不开
  allowEmptyMedia: boolean
  // leave时是否销毁localStream
  keepLocalstreamOnLeave: boolean
  // Join行为重试时的第一次退避时间
  joinFirstTimeout: number
  // Join行为允许的最大尝试次数
  joinMaxRetry: number
  // 重连行为允许的第一次退避时间
  reconnectionFirstTimeout: number
  // 重连行为允许的最大尝试次数（每个服务器）
  reconnectionMaxRetry: number
  // 是否开启信令通道探测功能
  signalProbeEnabled: boolean
  // 页面卸载时是否自动调用leave
  leaveOnUnload: boolean
  // 信任 window.ononline 回调
  trustOnOnline: boolean
  // 信任  window.onoffline 回调
  trustOnOffline: boolean
  // 信任  window.unhandledrejection 回调
  trustUnhandledrejection: boolean
  // 部分浏览器加载编解码器需要时间。如果浏览器不支持H264，则等待多少毫秒
  h264Wait: number
  // 编码水印字体
  encoderWatermarkFontFamily: string
  // 编码水印最大数量
  encoderWatermarkLimit: number
  // 强行开启encodedInsertableStreams
  forceEncodedInsertableStreams: boolean
  // 强行将向服务端上报的customEncryption flag设为false
  forceCustomEncryptionOff: boolean
  // 检测H264接收端时必须为High
  h264StrictHigh: boolean
  disableH264Send: boolean
  disableVP8Send: boolean
  // 允许TCP
  enableTcpCandidate: boolean
  // 允许UDP
  enableUdpCandidate: boolean
  // 最大事件循环卡顿提示次数
  maxEventLoopLagWarning: number
  // 默认是否开启兼容模式
  enableCompatAudio: boolean
  // 兼容模式下怎么决定用哪个声道
  audioInputcompatMode: 'left' | 'right' | 'auto'
  // 主链路无响应多久后启用备用链路
  fireBackupDelay: number
  // audioAslFlag设为false时强制关闭ASL功能
  audioAslFlag: boolean
  // 动态修改分辨率时是否尽量保留长宽比（即使保留长宽比，也会有zoom影响）
  keepAspectRatio: boolean
  // 是否关闭LBS服务
  disableLBSService: boolean
  // protoo单条消息的timeout时间。
  protooMessageTimeout: number
  //是否复用已经取消订阅的远端媒体流的mid
  reuseMid: boolean
  // 播放音频/视频的最大过期时间。超过该时间，play会返回成功。
  playMediaTimeout: number
  // 播放音频/视频的最大过期时间。超过该时间，Stream上会触发NotAllowedError事件
  playMediaTimeoutForAutoplay: number
  // 是否不启动WebAudio
  disableWebAudio: boolean
  // 是否关闭 2D 的 CanvasContext
  disable2dContext: boolean
  // 是否关闭 WebGL 的 CanvasContext
  disableWebGLContext: boolean
  // 是否关闭所有上报，包括counter/events/日志
  disableAllReports: boolean
  // 是否上报pageId和browserId
  reportPageBrowserId: boolean
  // 心跳间隔，也就是getStats间隔。设为很大的数可以用来屏蔽getStats操作
  doHeartbeatInterval: number
  // 设备拔插检测间隔，为0不启动额外计时器
  deviceChangeInterval: number
  // 如需启用硬件加速，将 h264ProfileLevel 改为 42001f，并将 h264ProfileLevelSignal 改为 42e01f
  h264ProfileLevel: string
  h264ProfileLevelSignal: string
  enableSdpRrtr: 'no' | 'chrome' | 'all'
  forceBWE: 'no' | 'transport-cc' | 'remb'
  // 调试用，采集音频时强制开启/关闭AEC，包括主辅流
  forceAEC: 'no' | 'on' | 'off'
  // 调试用，采集音频时强制开启/关闭ANS，包括主辅流
  forceANS: 'no' | 'on' | 'off'
  // 调试用，采集音频时强制开启/关闭AGC，包括主辅流
  forceAGC: 'no' | 'on' | 'off'
  // 调试用，采集音频时强制开启/关闭采集的单双声道，包括主辅流
  forceChannelCount: -1 | 1 | 2
  // 调试用，采集音频时强制开启/关闭采集的延迟，包括主辅流
  forceLatency: -1 | number
  // 调试用，采集音频时强制采样率，包括主辅流
  forceSampleRate: -1 | 44100 | 48000
  // Produce时将主流记为辅流、辅流记为主流
  revertSubstreamProduceType: boolean
  // 因为安卓微信的自动播放策略混乱，所以该开关开启后，会在不确定是否是编码失败、下行没数据等其他情况下，也抛出NotAllowedError
  moreNotAllowedError: boolean
  replaceIdealConstraint: 'safari16_screen' | 'all' | 'never'
  // 修补Safari本地canvas track无法播放的问题
  shimLocalCanvas: 'safari' | 'all' | 'never'
  // 禁止Vue进行代理
  enableVSkip: boolean
  // GetStats报错最大条数
  statsLogMaxCnt: number
  // 允许应用程序向用户代理提示可以接受的播放延迟，详见: https://henbos.github.io/webrtc-timing/
  audioPlayoutDelayHint: number
  videoPlayoutDelayHint: number
  // Chrome Legacy 默认flag
  chromeLegacyDefault: 'unknown' | 'supported' | 'unsupported'
  // getStats计算每秒数据时，基于多久之前的点
  statsHistoryInterval: number
  // 最小触发active-speaker的音量。0-65535
  activeSpeakerMin: number
  // 音量指数算法
  audioLevelFittingAlgorithm: 'classic' | 'linear' | 'log2'
  // 远端音量系数
  audioLevelRatioRemote: number
}

let parameters: IParameters = {
  tracks: {
    audio: [],
    video: []
  },
  shimVideoOrientation: 'never',
  shimCanvas: 'ios151',
  clients: [],
  localStreams: [],
  debugG2: false,
  enableAlerter: 'never',
  videoLowMaxWidth: 320,
  videoLowMaxHeight: 180,
  videoLowFramerate: 15,
  videoLowCheckCanvasBlank: 'ios',
  screenLowMaxWidth: 320,
  screenLowMaxHeight: 180,
  screenLowFramerate: 15,
  controlOnPaused: true,
  hideControlOnResume: true,
  maxTransportRebuildCnt: Number.MAX_SAFE_INTEGER,
  logLevel: loglevels.INFO,
  forceLogLevel: -1,
  forceLogUpload: 'default',
  forceListenDeviceChange: true,
  codecOptions: {
    audio: {
      opusStereo: true,
      opusDtx: true
    }
  },
  videoHighStartBitrate: 1000,
  videoHighMinBitrate: 0,
  videoLowStartBitrate: 500,
  videoLowMinBitrate: 0,
  screenHighStartBitrate: 2000,
  screenHighMinBitrate: 0,
  screenLowStartBitrate: 500,
  screenLowMinBitrate: 0,
  screenFocus: 'no-focus-change',
  screenSurfaceSwitching: 'default',
  screenDisplaySurface: 'default',
  screenPreferCurrentTab: false,
  screenSelfBrowserSurface: 'default',
  allowEmptyMedia: true,
  keepLocalstreamOnLeave: false,
  joinFirstTimeout: 2000,
  joinMaxRetry: 3,
  reconnectionFirstTimeout: 2000,
  reconnectionMaxRetry: 3,
  signalProbeEnabled: true,
  leaveOnUnload: true,
  trustOnOnline: true,
  trustOnOffline: false,
  trustUnhandledrejection: false,
  h264Wait: 1000,
  encoderWatermarkLimit: 1,
  encoderWatermarkFontFamily: 'Verdana',
  forceEncodedInsertableStreams: false,
  forceCustomEncryptionOff: false,
  h264StrictHigh: false,
  disableH264Send: false,
  disableVP8Send: false,
  enableTcpCandidate: true,
  enableUdpCandidate: true,
  maxEventLoopLagWarning: 3,
  enableCompatAudio: false,
  audioInputcompatMode: 'auto',
  fireBackupDelay: 5000,
  audioAslFlag: true,
  keepAspectRatio: false,
  disableLBSService: false,
  protooMessageTimeout: 30000,
  reuseMid: true,
  playMediaTimeout: 3000,
  playMediaTimeoutForAutoplay: 6000,
  disableWebAudio: false,
  disable2dContext: false,
  disableWebGLContext: false,
  disableAllReports: false,
  reportPageBrowserId: true,
  //getStats请求间隔设置为1s，数据上报为doHeartbeatInterval * 2
  doHeartbeatInterval: 1000,
  deviceChangeInterval: 0,
  h264ProfileLevel: '42e01f',
  // 不要动这个参数
  h264ProfileLevelSignal: '42e01f',
  enableSdpRrtr: 'chrome',
  forceBWE: 'no',
  forceAGC: 'no',
  forceANS: 'no',
  forceAEC: 'no',
  forceChannelCount: -1,
  forceLatency: -1,
  forceSampleRate: -1,
  revertSubstreamProduceType: false,
  moreNotAllowedError: false,
  replaceIdealConstraint: 'safari16_screen',
  shimLocalCanvas: 'safari',
  enableVSkip: true,
  statsLogMaxCnt: 3,
  chromeLegacyDefault: 'unknown',
  audioLevelFittingAlgorithm: 'log2',
  audioLevelRatioRemote: 1,
  statsHistoryInterval: 3000,
  activeSpeakerMin: 10,
  audioPlayoutDelayHint: 0,
  videoPlayoutDelayHint: 0
}

try {
  if (location.search && typeof URLSearchParams === 'function') {
    const searchParams = new URLSearchParams(location.search)

    let key: keyof typeof parameters
    for (key in parameters) {
      const builtinValue = parameters[key]
      const searchStr = searchParams.get(key)
      if (searchStr) {
        let queryValue: number | string | boolean | null = null
        if (typeof builtinValue === 'string') {
          queryValue = searchStr
        } else if (typeof builtinValue === 'boolean') {
          if (searchStr === 'true' || searchStr === 'false') {
            queryValue = searchStr === 'true'
          }
        } else if (typeof builtinValue === 'number') {
          queryValue = Number(searchStr)
          if (Number(searchStr) > Number.MIN_SAFE_INTEGER) {
            queryValue = Number(searchStr)
          }
        }
        if (queryValue !== null && builtinValue !== queryValue) {
          console.warn(`NERTC 通过URL改变了私有化变量：${key}:`, builtinValue, '=>', queryValue)
          // @ts-ignore
          parameters[key] = queryValue
        }
      }
    }
  }
} catch (e) {
  // console.error(e)
}

// 注意：getParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
export const getParameters = () => {
  return parameters
}
