import { LocalStream } from './api/localStream'
import { RemoteStream } from './api/remoteStream'
import { SpatialManager } from './api/spatialManager'
import { NERTC_VIDEO_QUALITY_ENUM, VIDEO_FRAME_RATE_ENUM } from './constant/videoQuality'
import { Consumer } from './module/3rd/mediasoup-client/Consumer'
import { Encryption } from './module/encryption'
import { LBSManager } from './module/LBSManager'
import { MediaHelper } from './module/media'
import { MediaCapability } from './module/mediaCapability'
import { Mediasoup } from './module/mediasoup'
import { Meeting } from './module/meeting'
import { DataReport } from './module/report/dataReport'
import { StatsReport } from './module/report/statsReport'
import { Signalling } from './module/signalling'
import { OperationQueue } from './util/OperationQueue'
import { SignalGetChannelInfoResponse } from './interfaces/SignalProtocols'
import { CanvasWatermarkControl } from './module/watermark/CanvasWatermarkControl'
import { EncoderWatermarkControl } from './module/watermark/EncoderWatermarkControl'
import { SimpleBig } from './util/json-big/SimpleBig'
import { STREAM_TYPE } from '../../docs/src/types'
import { SignalProbeManager } from './module/signalProbeManager/signalProbeManager'

type UIDTYPE = number | string

export interface AdapterRef {
  signalProbeManager: SignalProbeManager
  datareportCache: { func: string; datareport: DataReport }[]
  audioAsl: {
    enabled: 'yes' | 'no' | 'unknown'
    aslActiveNum: number
  }
  uid2SscrList: {
    [uid in UIDTYPE]: {
      audio: { ssrc: number }
      audioSlave: { ssrc: number }
      video: { ssrc: number }
      screen: { ssrc: number }
    }
  }
  netStatusTimer: Timer | null
  networkQuality: {}
  _statsReport: StatsReport | null
  _meetings: Meeting | null
  state: {
    lastDeviceStatus: {
      // 暂存上次用户打开的设备类型(供重连使用)
      audio: {
        type: string | null
        device: string | null
      }
      video: {
        type: string | null
        device: string | null
      }
    }
    audioDeviceHasOpened: boolean
    videoDeviceHasOpened: boolean
    chromeScreenShareOpened: boolean
    startSessionTime: number
    endSessionTime: number
    startPubVideoTime: number
    startPubScreenTime: number
    getChannelInfoTime: number
    signalEstablishTime: number
    signalOpenTime: number
    signalJoinResTime: number
    signalJoinSuccessTime: number
    /**
     * getChannelInfo请求产生的网络RTT
     */
    getChannelInfoRtt: number
    /**
     * 信令Websocket从发起到Open状态产生的网络RTT
     */
    signalWebsocketOpenRtt: number
    /**
     * Join消息产生的RTT
     */
    signalJoinMsgRtt: number
    signalAudioAddedTime: number
    signalAudioSubscribedTime: number
    signalVideoAddedTime: number
    signalVideoSubscribedTime: number
    iceRecvConnectedTime: number
    domVideoAppendTime: number
    videoFirstIframeTime: number
    videoResizeTime: number
  }
  mediaCapability: MediaCapability
  nim?: any
  instance: Client
  lbsManager: LBSManager
  channelInfo?: any
  apiEvent: {
    [prop: string]: APIEventItem[]
  }
  memberMap: { [uid in UIDTYPE]: string }
  apiEvents: {
    [prop: string]: APIEventItem[]
  }
  transportStats: {
    txRtt: number
    rxRtt: number
    NetworkType: string
    OutgoingAvailableBandwidth: number
  }
  sessionStats: {
    UserCount?: number
    Duration?: number
    RecvBytes: number
    SendBytes: number
    RecvBitrate: number
    SendBitrate: number
  }
  remoteAudioStats: {
    [uid in UIDTYPE]: MediaStats
  }
  remoteAudioSlaveStats: {
    [uid in UIDTYPE]: MediaStats
  }
  remoteVideoStats: {
    [uid in UIDTYPE]: MediaStats
  }
  remoteScreenStats: {
    [uid in UIDTYPE]: MediaStats
  }
  remoteStreamMap: {
    [uid in UIDTYPE]: RemoteStream
  }
  // 未发布localStream时，该值指向null
  localStream: LocalStream | null
  localAudioStats: {
    [uid in UIDTYPE]: LocalAudioStats
  }
  localAudioSlaveStats: {
    [uid in UIDTYPE]: LocalAudioStats
  }
  localVideoStats: LocalVideoStats[]
  localScreenStats: LocalVideoStats[]
  logger: ILogger
  logStorage: LogStorage
  // connectioning其实是reconnecting
  channelStatus: 'init' | 'leave' | 'join' | 'connectioning'
  _signalling: Signalling | null
  connectState: {
    prevState: ConnectionState
    curState: ConnectionState
    reconnect: boolean
  }
  _mediasoup?: Mediasoup | null
  mediaHelpers: { [uid in UIDTYPE]: MediaHelper }
  netStatusList: NetStatusItem[]
  requestId: {
    [apiName: string]: number
  }
  deviceId: string
  preferRemb: boolean
  /**
   * 播放音量，取值范围[0, 1]。默认为1
   * nomalized暗示范围为 0-1
   */
  nomalizedPlaybackVolume: number
  userPriority: MediaPriorityOptions
  proxyServer: ProxyServerOptions
  encryption: Encryption
  isAudioBanned: boolean
  isVideoBanned: boolean
  permKeyInfo?: {
    timeout: number
    pubAudioRight: boolean
    subAudioRight: boolean
    pubVideoRight: boolean
    subVideoRight: boolean
  }
}

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING'

// screenShare 为服务端协议叫法，但代码中有大量screen叫法，故使用这种不好的类型名做区分。
export type MediaType = 'audio' | 'video' | 'screenShare' | 'audioSlave'
export type MediaTypeShort = 'audio' | 'video' | 'screen' | 'audioSlave'

export const MediaTypeListAudio: ['audio', 'audioSlave'] = ['audio', 'audioSlave']
export const MediaTypeListVideo: ['video', 'screen'] = ['video', 'screen']
export const MediaTypeList: ['audio', 'video', 'screen', 'audioSlave'] = [
  'audio',
  'video',
  'screen',
  'audioSlave'
]

export type StatsDirection = 'send' | 'recv'

export interface StatsInfo {
  firstStartAt: number
  lastStartAt: number
  totalCnt: number
  frequency: number
  errCnt: number
  cpStats: RTCIceCandidatePairStats | null
  statsMapHistory: { [id: string]: any[] }
  logger: ILogger
}

export interface NetStatusItem {
  uid: number | string
  downlinkNetworkQuality: number
  uplinkNetworkQuality: number
  receiveTs: number
}

interface VideoStatsChange {
  mediaType: 'video' | 'screen'
  streamType: 'high' | 'low'
  old: LocalVideoStats | null
  new: LocalVideoStats | null
}

interface AudioStatsChange {
  mediaType: 'audio' | 'audioSlave'
  streamType: 'high'
  old: LocalAudioStats | null
  new: LocalAudioStats | null
}

export interface MediaStatsChangeEvt {
  data: (VideoStatsChange | AudioStatsChange)[]
}

export interface ILogger {
  debug: (...msg: any) => void
  log: (...msg: any) => void
  info: (...msg: any) => void
  warn: (...msg: any) => void
  error: (...msg: any) => void
  getChild: (tagGen: () => string) => ILogger
  parent?: ILogger
}

export interface LogStorage {
  get: (...msg: any) => any
  delete: (...msg: any) => any
  log: (...msg: any) => any
}

export interface RenderMode {
  width: number
  height: number
  cut: boolean
}

export interface AudioPlaySettings {
  /**
   * 取值[0, 1], 默认值为1
   * 实际的音量应等于 AudioPlaySettings.normalizedVolume * adapterRef.normalizedPlaybackVolume
   */
  normalizedVolume: number
  dom: HTMLAudioElement | null
}

export interface VideoPlaySettings {
  dom: HTMLVideoElement | null
  containerDom: HTMLElement | null
  view: HTMLElement | null
  renderMode: RenderMode
  size: { width: number; height: number }
  canvasWatermark: CanvasWatermarkControl
  encoderWatermark: EncoderWatermarkControl
  frameData: {
    // 有canvas而无context，表示获取Context失败，之后不再尝试获取Context
    canvas: HTMLCanvasElement | null
    context: CanvasRenderingContext2D | null
  }
}

export interface MediaStats {
  TotalFreezeTime: number
  [key: string]: string | number | boolean | undefined
}

export interface DataEvent {
  name: string
  uid?: string
  cid?: string
  time?: number
}

export interface LoginEvent extends DataEvent {
  sdk_ver: string
  platform: string
  app_key: string
  meeting_mode: number
  a_record: boolean
  v_record: boolean
  record_type: number
  host_speaker: boolean
  server_ip: string
  result: number
  signalling_time: number
  signalling_rtt: number
  time_elapsed: number
  model: String
  extra_info: string
  build: string
  supported_codec_send?: string
  supported_codec_recv?: string
  preferred_codec_send?: string
  roomCodecType?: string
  lbs_addrs: any
}

export interface ReloginEvent extends DataEvent {
  meeting_mode: number
  a_record: boolean
  v_record: boolean
  record_type: number
  host_speaker: boolean
  server_ip: string
  result: number
  reason: string
}

export interface LogoutEvent extends DataEvent {
  reason: string
}

export interface RecvFirstFrameEvent extends DataEvent {
  pull_uid: number | string
  media_type: number
}

export interface RecvFirstPackageEvent extends DataEvent {
  pull_uid: number | string
  media_type: number
}

export interface FirstPacketSentEvent extends DataEvent {
  media_type: number
}

export interface DisconnectEvent extends DataEvent {
  reason: string
  ext?: string
}

export interface DeviceAbnormalEvent extends DataEvent {
  reason: string
  ip: string
}

export interface FunctionEvent extends DataEvent {
  name: string
  oper: string
  value: string
}

export interface CommonEvent extends DataEvent {
  ver: string
  sdk_type: string
  session_id: string
  app_key: string
}

export interface HeartbeatEvent extends DataEvent {
  sys?: string
  tx?: string
  rx?: string
}

export interface RequestLBSEvent extends DataEvent {
  app_key: string
  request_id: string
  err_code: number
  err_msg: string
  rtt: number
  time: number
}

export interface AudioVideoBannedEvent extends DataEvent {
  cid: string
  uid: string
  isAudioBanned: boolean
  isVideoBanned: boolean
  time: number
}

export interface StreamExceptionEvent extends DataEvent {
  cid: string
  uid: string
  name: string
  value: string
  time: number
}

export interface ExceptionEvent extends DataEvent {
  cid: string
  uid: string
  name: string
  value: string
  time: number
}

export interface UserCustomEvent extends DataEvent {
  name: string
  customIdentify: string
  param: string
}

export interface WholeStatsReportOptions {
  appkey: string
  adapterRef: AdapterRef
}

export interface WholeStatsReportStartOptions {
  appkey?: string
  cid?: string
  uid?: string
}

export interface FormativeStatsReportOptions {
  adapterRef: AdapterRef
}

export interface PacketLostData {
  packetsLost: string
  packetsSent?: string
  packetsReceived?: string
}

export interface Player {
  videoDom: HTMLVideoElement
  audioDom: HTMLAudioElement
}

export interface LocalAudioStats {
  CodecType?: string
  MuteState?: boolean
  RecordingLevel?: number
  SamplingRate?: number
  SendBitrate?: number
  SendLevel?: number
}

export interface LocalVideoStats {
  LayerType?: number
  CodecName?: string
  CodecImplementationName?: string
  CaptureFrameRate?: number
  CaptureResolutionHeight?: number
  CaptureResolutionWidth?: number
  EncodeDelay?: number
  MuteState?: boolean
  SendBitrate?: number
  SendFrameRate?: number
  SendResolutionHeight?: number
  SendResolutionWidth?: number
  TargetSendBitrate?: number
  TotalDuration?: number
  TotalFreezeTime?: number
}

export interface SDKRef {}

export interface PlayOptions {
  stream: LocalStream | RemoteStream
}

export interface LoggerHelperOptions {
  useTimestamps?: boolean
  useLocalStorage?: boolean
  autoTrim?: boolean
  maxLines?: number
  tailNumLines?: number
  logFilename?: string
  maxDepth?: number
  maxLogsLines?: number
}

export interface LogConfig {
  startTime: number
  log: string
  lastLog: number
}

export interface LoggerDebugOptions {
  style?: string
}

export interface LoggerOptions {
  isSavedLogs?: boolean
  useTimestamps?: boolean
  useLocalStorage?: boolean
  autoTrim?: boolean
  maxLines?: number
  tailNumLines?: number
  logFilename?: string
  maxDepth?: number
  maxLogsLines?: number
  logFunc?: {
    [name: string]: () => void
  }
  logStorage?: any
  tagGen?: () => string
}

export interface StatsReportOptions {
  sdkRef: SDKRef
  adapterRef: AdapterRef
  isReport: boolean
}

export interface AudioLevelOptions {
  stream: MediaStream
  logger: ILogger
  sourceNode?: AudioNode
}

export interface WebAudioOptions {
  mediaHelper: MediaHelper
  logger: ILogger
  isAnalyze?: boolean
  isRemote?: boolean
}

export interface AudioMixingOptions {
  buffer: AudioBuffer
  replace: boolean
  cycle: number
  playStartTime: number
  volume?: number
  auidoMixingEnd: (() => void) | null
  loopback: boolean
}

export interface MixAudioConf {
  index: number
  audioBuffer: { [key: string]: AudioBuffer }
  audioFilePath?: string
  loopback?: boolean
  replace?: boolean
  cycle?: number
  playStartTime?: number
  volume?: number
  auidoMixingEnd?: (() => void) | null
  sounds: {
    [name: number]: soundsConf
  }
}

export interface soundsConf {
  soundId: number
  state: 'UNSTART' | 'STARTING' | 'PLAYED' | 'PAUSED' | 'STOPED' // STARTING,PLAYED,PAUSED,STOPED
  sourceNode: AudioBufferSourceNode | null
  gainNode: GainNode | null
  filePath: string
  cycle: number
  playStartTime: number
  playOverTime: number
  pauseTime: number
  startTime: number
  totalTime: number
  volume: number
  options?: {} | null
}

export interface AudioEffectOptions {
  cycle?: number
  soundId: number
  filePath: string
}

export interface MediaHelperOptions {
  stream: LocalStream | RemoteStream
}

export interface GetStreamConstraints {
  audio?: boolean
  audioDeviceId?: string
  video?: boolean
  videoDeviceId?: string
  screen?: boolean
  recordName?: string
  sourceId?: string
  facingMode?: string
  audioSource?: MediaStreamTrack | null
  videoSource?: MediaStreamTrack | null
  screenVideoSource?: MediaStreamTrack | null
  screenAudioSource?: MediaStreamTrack | null
  deviceId?: string
  screenAudio?: boolean
}

export interface ScreenSource {
  screenVideoSource?: MediaStreamTrack | null
  screenAudioSource?: MediaStreamTrack | null
}

export interface RecordInitOptions {
  logger: ILogger
  client: Client
  //stream: LocalStream|RemoteStream;
}

export interface RecordStatus {
  recordedChunks: Blob[] // recordedChunks
  isRecording: boolean // 录音标志位
  stream: MediaStream | MediaStream[] | null // 录制媒体流
  option: RecordStartOptions | null // 开启录制配置参数
  contentTypes: string[] // 媒体内容类型
  mimeType: string // 媒体mime类型
  audioController: null // webaudio对象，负责混音处理
  opStream: MediaStream | null // 待操作的可变更媒体流
  state: string // 录制状态： init | started | stopped
  timer: Timer | null // 打印日志定时器
  fileName: string | null // 录制保存的文件对象名
  recordId: number // 录制id
  recordStatus: string // 录制状态
  recordUrl: string | null
  startTime: number | null
  endTime: number | null
}

export interface RecordStartOptions {
  stream: MediaStream | MediaStream[]
  uid: number | string
  type: string
  recordName?: string
  reset: boolean
}

//因为Typescript对不同平台的timer返回值类型处理不同：
export type Timer = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>

export interface MeetingOptions {
  adapterRef: AdapterRef
  sdkRef: SDKRef
}

export interface MeetingJoinChannelOptions {
  appkey: string
  channelName: string
  uid: number | string
  wssArr?: string[] | null
  sessionMode?: 'meeting'
  joinChannelRecordConfig: RecordConfig
  joinChannelLiveConfig: LiveConfig
  token?: string
  getChanneInfoResponse?: any
  permKey?: string
}

export interface AddTaskOptions {
  rtmpTasks: RTMPTask[]
}

export interface RTMPTask {
  taskId: string
  streamUrl: string
  record: boolean
  hostUid: number | SimpleBig
  version: number
  layout: {
    canvas: {
      width: number
      height: number
      color: number
    }
    users: {
      uid: number | SimpleBig
      x: number
      y: number
      width: number
      height: number
      adaption: number
      pushAudio: boolean
      pushVideo: boolean
      zOrder: number
    }[]
    images: {
      url: string
      x: number
      y: number
      width: number
      height: number
      adaption: number
    }[]
  }
  config: {
    singleVideoNoTrans: boolean
    audioParam?: {
      bitRate: number
      sampleRate: number
      channels: number
      codecProfile: number
    }
  }
  extraInfo: string
}

export interface MediasoupManagerOptions {
  adapterRef: AdapterRef
  logger: ILogger
}

export interface ProduceConsumeInfo {
  uid: number | string
  kind: 'audio' | 'video'
  mediaType: MediaType
  id: string
  preferredSpatialLayer: number
  resolve: (data: any) => void
  reject: (err: any) => void
}

export interface AudioProcessingOptions {
  ANS?: boolean
  AEC?: boolean
  AGC?: boolean
}

export type AudioProcessingConstraintKeys = 'ANS' | 'AEC' | 'AGC'

export interface LocalStreamOptions {
  uid: number | string
  audio: boolean
  audioProcessing?: AudioProcessingOptions
  microphoneId?: string
  cameraId?: string
  sourceId?: string
  facingMode?: VideoFacingModeEnum
  video: boolean
  screen: boolean
  screenAudio?: boolean
  client: Client
  audioSource?: MediaStreamTrack | null
  videoSource?: MediaStreamTrack | null
  screenAudioSource?: MediaStreamTrack | null
  screenVideoSource?: MediaStreamTrack | null
}

export interface RemoteStreamOptions {
  uid: number | string
  audio: boolean
  audioSlave: boolean
  video: boolean
  screen: boolean
  client: Client
  platformType: PlatformType
}

export const PlatformTypeMap = {
  '-1': 'unknown',
  1: 'aos',
  2: 'ios',
  4: 'pc',
  8: 'winphone',
  9: 'mac',
  16: 'web'
}

export enum PlatformType {
  'unknown' = -1,
  'aos' = 1,
  'ios' = 2,
  'pc' = 4,
  'winphone' = 8,
  'mac' = 9,
  'web' = 16
}

export interface Client {
  logger: ILogger
  adapterRef: AdapterRef
  apiFrequencyControl: (event: any) => void
  emit: (eventName: string, eventData?: any) => void
  safeEmit: (eventName: string, eventData?: any) => void
  clientId: number
  _roleInfo: {
    userRole: number
    audienceList: { [uid in UIDTYPE]: boolean }
  }
  spatialManager: SpatialManager | null
  operationQueue: OperationQueue
  outOfConnect: boolean
  apiEventReport: (eventName: keyof DataReport, eventData: any) => void
  getPeer: (sendOrRecv: 'send' | 'recv') => any
  leave: () => any
  addSsrc: (uid: number | string, kind: MediaTypeShort, ssrc: number) => any
  reBuildRecvTransport: () => any
  _params: any
  setSessionConfig: any
  getUidAndKindBySsrc: (ssrc: number) => {
    uid: number | string
    kind: MediaTypeShort
    streamType: 'high' | 'low'
  }
  removeSsrc: (uid: number | string, kind?: MediaTypeShort) => void
  stopSession: () => void
  startSession: () => void
  addListener: (eventName: string, listener: (evt: any) => void) => void
  isPublished: (stream: LocalStream) => boolean
  getSubStatus: (stream: RemoteStream, mediaType: MediaTypeShort | 'all') => MediaSubStatus
  clearMember: (uid: number | string) => void
  resetChannel: () => void
  bindLocalStream: (stream: LocalStream) => void
  // 注：当前接口不应存在只有用户调用的方法，以避免SDK内部调用。
  // 例如，开启空间音频时禁止用户Subscribe，此时SDK内部应调用doSubscribe。
  doSubscribe: (stream: RemoteStream) => Promise<void>
  doUnsubscribe: (stream: RemoteStream) => void
  doPublish: (stream: LocalStream) => void
  updateRecordingAudioStream: () => void
  _events?: { [eventName: string]: any }
}

export type ConsumerStatus = 'init' | 'start' | 'end'

export type MediaSubStatus = {
  status: 'unsubscribed' | 'subscribing' | 'subscribed' | 'unsubscribing'
  //有尚未订阅的远端，且当前可以订阅
  subscribable: boolean
}

export interface PubStatus {
  audio: {
    audio: boolean
    producerId: string
    consumerId: string
    consumerStatus: ConsumerStatus
    stopconsumerStatus: string
    mute: boolean
    simulcastEnable: boolean
  }
  audioSlave: {
    audioSlave: boolean
    producerId: string
    consumerId: string
    consumerStatus: ConsumerStatus
    stopconsumerStatus: string
    mute: boolean
    simulcastEnable: boolean
  }
  video: {
    video: boolean
    producerId: string
    consumerId: string
    consumerStatus: string
    stopconsumerStatus: string
    mute: boolean
    simulcastEnable: boolean
  }
  screen: {
    screen: boolean
    producerId: string
    consumerId: string
    consumerStatus: string
    stopconsumerStatus: string
    mute: boolean
    simulcastEnable: boolean
  }
}

export interface SubscribeOptions {
  audio?: boolean
  audioSlave: boolean
  video?: boolean | 'high' | 'low'
  screen?: boolean | 'high' | 'low'
  highOrLow?: STREAM_TYPE
}

export interface SubscribeConfig {
  audio: boolean
  audioSlave: boolean
  video: boolean
  screen: boolean
  highOrLow: {
    video: STREAM_TYPE
    screen: STREAM_TYPE
  }
}

export interface UnsubscribeOptions {
  audio?: boolean
  audioSlave?: boolean
  video?: boolean
  screen?: boolean
}

export interface VideoProfileOptions {
  resolution: NERTC_VIDEO_QUALITY_ENUM
  frameRate: VIDEO_FRAME_RATE_ENUM
}

export interface ScreenProfileOptions {
  resolution: NERTC_VIDEO_QUALITY_ENUM
  frameRate: VIDEO_FRAME_RATE_ENUM
}

export interface EncodingParameters {
  maxBitrate?: number
  contentHint: '' | 'motion' | 'detail' | null
}

export interface MaskUserSetting {
  maskUid: number
  duration: number
  targetEndMs: number
}

export interface SnapshotOptions {
  name?: string
  mediaType?: MediaTypeShort
}

export interface SnapshotBase64Options {
  mediaType?: MediaTypeShort
}

export interface GetCurrentFrameDataOptions {
  mediaType: MediaTypeShort
  width?: number
  height?: number
}

export interface MediaRecordingOptions {
  type: string
  reset: boolean
}
export interface ClientMediaRecordingOptions {
  recorder?: 'local' | 'all'
  recordConfig?: ClientRecordConfig
}

export interface ClientRecordConfig {
  recordType: 'audio' | 'video'
  recordName?: string
  recordVideoQuality: number
  recordVideoFrame: number
  recordSize: number
}

export interface SignallingOptions {
  adapterRef: AdapterRef
  logger: ILogger
}

export interface ClientOptions {
  appkey: string
  debug?: boolean
  report?: boolean
  token?: string
  ref: any
}

export interface APIFrequencyControlOptions {
  name: string
  code?: number
  param: string | object
}

export interface APIEventItem {
  name: string
  code?: number
  time: number
  cid: number
  uid: number | string
  param: string | object
  request_id: number
}

export interface LiveConfig {
  liveEnable: boolean
}

export interface RecordConfig {
  isHostSpeaker: boolean
  recordAudio: boolean
  recordVideo: boolean
  recordType: number
}

export type MediaTypeAudio = 'microphone' | 'screenAudio'

export interface AudioInConfig {
  id: string
  label: string
  context: AudioContext
  audioNode: AudioNode
  type?: MediaTypeAudio
}

export interface ProxyServerOptions {
  enable: boolean
  type: number
  wsProxyArray?: string[] | null
  mediaProxyArray?: string[]
  mediaProxyToken?: string
  credential?: string
}

export interface MediaPriorityOptions {
  priority: number
  preemtiveMode?: boolean
}

export type VideoCodecType = 'H264' | 'VP8'

export type AudioCodecType = 'OPUS'

export interface SpatialInitOptions {
  subConfig: {
    audio: boolean
    audioSlave: boolean
    video: boolean
    screen: boolean
  }
}

export interface JoinOptions {
  channelName: string
  uid: number | string
  token: string
  permKey?: string
  spatial?: SpatialInitOptions
  wssArr?: string[] | null
  joinChannelLiveConfig?: LiveConfig
  joinChannelRecordConfig?: RecordConfig
  neRtcServerAddresses?: NeRtcServerAddresses
  getChanneInfoResponse?: SignalGetChannelInfoResponse
  customData?: string
}

export interface JoinChannelRequestParam4WebRTC2 {
  channelName: string
  uid: number | string
  wssArr?: string[] | null
  joinChannelLiveConfig: LiveConfig
  joinChannelRecordConfig: RecordConfig
  logoutReason?: number
  startJoinTime: number
  appkey: string
  permKey: string
  userRole: number
  token?: string
  getChanneInfoResponse?: SignalGetChannelInfoResponse
}

export interface SignalingConnectionConfig {
  timeout: number
  url: string
  serverIndex: number
  times: number
  isJoinRetry: boolean
  isReconnection: boolean
  isLastTry: boolean
}

export interface WatermarkSetting {
  type: 'text' | 'timestamp' | 'image'
  content: string
  imageUrls?: string[]
  loop: boolean
  interval?: number
  elem: HTMLElement | null
  loopTimer?: Timer | null
  loopIndex: number
  imgElems?: HTMLImageElement[]
  style: {
    [key: string]: string
  }
}

export interface EncoderWatermarkStyle {
  textBaseline: CanvasTextBaseline
  left: number
  top: number
  fontSize: string
  textWidth: number
  textHeight: number
  fontFamily: string
  fillStyle: string

  bgWidth: number
  bgHeight: number
  bgFillStyle: string
}

export interface EncoderWatermarkSetting {
  type: 'text' | 'timestamp' | 'image'
  content: string
  imageUrls?: string[]
  loop: boolean
  interval?: number
  loopIndex: number
  imgElems?: HTMLImageElement[]
  startMs?: number
  style: EncoderWatermarkStyle
}

/**
 * 画布水印配置
 */
export interface NERtcCanvasWatermarkConfig {
  /**
   * 水印类型，video为主流，screen为辅流
   */
  mediaType: 'video' | 'screen'

  /**
   * 文字水印 最对支持10个
   */
  textWatermarks: NERtcTextWatermarkConfig[]

  /**
   * 时间戳水印
   */
  timestampWatermarks: NERtcTimestampWatermarkConfig

  /**
   * 图片水印，最多支持4个
   */
  imageWatermarks: NERtcImageWatermarkConfig[]
}
/**
 * 文字水印设置参数
 */
export interface NERtcTextWatermarkConfig {
  /**
   * 文字内容。
   * <br>支持自动换行。当文字内容长度超过水印框宽度时，会自动换行<br/>
   * <br>字符串长度没有限制。最终显示受字体大小和水印框大小的影响，超出水印框的部分不显示<br/>
   */
  content: string

  /**
   * 字体大小。默认值为 10，相当于 144 dpi 设备上的 10 x 15 磅
   */
  fontSize: number

  /**
   * 字体颜色。默认白色
   */
  fontColor: number

  /**
   * 水印框左上角与视频画布左上角的水平距离。单位为像素（pixel），默认值为 0
   */
  offsetX: number

  /**
   * 水印框左上角与视频画布左上角的垂直距离。单位为像素（pixel），默认值为 0。
   */
  offsetY: number

  /**
   * 水印框颜色。默认灰色（支持透明度）
   */
  wmColor: number

  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0 表示没有水印框
   */
  wmWidth: number

  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0 表示没有水印框
   */
  wmHeight: number
}

/**
 * 时间戳水印，格式为 yyyy-MM-dd HH:mm:ss
 */
export interface NERtcTimestampWatermarkConfig {
  content?: string
  /**
   * 字体大小。默认值为 10，相当于 144 dpi 设备上的 10 x 15 磅
   */
  fontSize: number

  /**
   * 字体颜色。默认白色
   */
  fontColor: number

  /**
   * 水印框左上角与视频画布左上角的水平距离。单位为像素（pixel），默认值为 0
   */
  offsetX: number

  /**
   * 水印框左上角与视频画布左上角的垂直距离。单位为像素（pixel），默认值为 0。
   */
  offsetY: number

  /**
   * 水印框颜色。默认灰色（支持透明度）
   */
  wmColor: number

  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0 表示没有水印框
   */
  wmWidth: number

  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0 表示没有水印框
   */
  wmHeight: number
}

/**
 * 图片水印设置参数
 */
export interface NERtcImageWatermarkConfig {
  /**
   * 水印图片
   */
  imageUrls: string[]

  /**
   * 水印框左上角与视频画布左上角的水平距离。单位为像素（pixel），默认值为 0
   */
  offsetX: number

  /**
   * 水印框左上角与视频画布左上角的垂直距离。单位为像素（pixel），默认值为 0。
   */
  offsetY: number

  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0 表示没有水印框
   */
  wmWidth?: number

  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0 表示没有水印框
   */
  wmHeight?: number
  /**
   * 播放帧率。默认 0 帧
   */
  fps: number

  /**
   * 是否设置循环。默认循环，设置为false后水印数组播放完毕后消失
   */
  loop: boolean
}

/**
 * 画布水印配置
 */
export interface NERtcEncoderWatermarkConfig {
  /**
   * 水印类型，video为主流，screen为辅流
   */
  mediaType: 'video' | 'screen'

  /**
   * 文字水印 最对支持10个
   */
  textWatermarks: NERtcTextWatermarkConfig[]

  /**
   * 时间戳水印
   */
  timestampWatermarks: NERtcTimestampWatermarkConfig

  /**
   * 图片水印，最多支持4个
   */
  imageWatermarks: NERtcImageWatermarkConfig[]
}

export interface NeRtcServerAddresses {
  channelServer?: string
  statisticsServer?: string
  roomServer?: string
  mediaServer?: string
  cloudProxyServer?: string
  webSocketProxyServer?: string
  mediaProxyServer?: string
  statisticsWebSocketServer?: string
}

export interface ValidStringOptions {
  tag: string
  value: any
  min?: number
  max?: number
}

export interface ValidObjectOptions {
  tag: string
  value: any
}

export interface ValidIntegerOptions {
  tag: string
  value: any
  min?: number
  max?: number
}

export interface ValidBooleanOptions {
  tag: string
  value: any
}

export interface ValidEnumOptions {
  tag: string
  value: any
  enums: any[]
}

export interface ValidFloatOptions {
  tag: string
  value: any
  min?: number
  max?: number
}

export interface ExistsOptions {
  tag: string
  value: any
  min?: number
  max?: number
}

export interface StreamPlayOptions {
  audio?: boolean
  audioSlave?: boolean
  audioType?: 'voice' | 'music' | 'mixing'
  video?: boolean
  screen?: boolean
  muted?: boolean
}

export type PreProcessingHandlerName = 'syncState' | 'copy' | 'color' | 'watermark' | 'mirror'

export interface PreProcessingHandler {
  name: PreProcessingHandlerName
  enabled: boolean
  func: (
    mediaHelper: MediaHelper,
    mediaType: 'video' | 'screen',
    config: PreProcessingConfig
  ) => void
}

export interface NeMediaStreamTrack extends MediaStreamTrack {
  canvas?: HTMLCanvasElement
  mutedStartAt?: number
  mutedCnt?: number
  endedAt?: number
}

export interface PreProcessingConfig {
  // canvasTrack指的是开启前处理后的Track
  canvasTrack: MediaStreamTrack
  canvasCtx: CanvasRenderingContext2D
  videoElem: HTMLVideoElement
  videoTrack: MediaStreamTrack | null
  canvasElem: HTMLCanvasElement
  handlers: (PreProcessingHandler | undefined)[]
  history: PreProcessingHistoryInfo[]
  timer: number | null
}

export interface PreProcessingHistoryInfo {
  startTs: number
  endTs: number
  handlerTs: {
    name: string
    spent: number
  }[]
}

export interface GUMAudioConstraints {
  channelCount: number
  deviceId?: {
    exact: string
  }

  echoCancellation?: boolean
  googEchoCancellation?: boolean
  googEchoCancellation2?: boolean

  noiseSuppression?: boolean
  googNoiseSuppression?: boolean
  googNoiseSuppression2?: boolean

  autoGainControl?: boolean
  googAutoGainControl?: boolean
  googAutoGainControl2?: boolean
}

export interface GUMVideoConstraints {
  mandatory?: any
  width?: {
    max?: number
    ideal?: number
  }
  height?: {
    ideal?: number
    max?: number
  }
  frameRate?: {
    ideal?: number
    max?: number
  }
  facingMode?: {
    exact: string
  }
  deviceId?: {
    exact: string
  }
}

export interface GUMConstaints {
  audio?: GUMAudioConstraints | boolean
  video?: GUMVideoConstraints
}

export interface FormatMediaOptions {
  adapterRef: AdapterRef
}

export interface RecvInfo {
  uid: string
  mediaType: MediaTypeShort
  remoteStream: RemoteStream
  consumer: Consumer
}

export interface BeautyEffectOptions {
  brightnessLevel: number
  rednessLevel: number
  smoothnessLevel: number
}

export interface AdvancedBeautyEffectOptions {
  thinFaceLevel: number
  bigEyesLevel: number
}

export interface PluginOptions {
  key: string
  pluginUrl?: string
  pluginObj?: AnyClass
  wasmUrl: string
  adapterRef: AdapterRef
}

type AnyClass = {
  new (...args: any): AnyClass
  [key: string]: any
}
