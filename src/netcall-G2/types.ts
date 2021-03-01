import {MediaHelper} from "./module/media";
import {Stream} from "./api/stream";
import {Mediasoup} from "./module/mediasoup";
import {Signalling} from "./module/signalling";
import {Meeting} from "./module/meeting";
import {StatsReport} from "./module/report/statsReport";

export interface AdapterRef {
  uid2SscrList: {[uid:number]:{[kind:string]:{ssrc: number}}};
  netStatusTimer: Timer|null;
  networkQuality: {};
  _statsReport: StatsReport|null;
  _meetings: Meeting|null;
  state: {
    lastDeviceStatus: {
      // 暂存上次用户打开的设备类型(供重连使用)
      audio: {
        type: string|null,
        device: string|null
      },
      video: {
        type: string|null,
        device: string|null
      },
    },
    audioDeviceHasOpened: boolean;
    videoDeviceHasOpened: boolean;
    chromeScreenShareOpened: boolean;
    startSessionTime: number;
    endSessionTime: number;
    startPubVideoTime: number;
  };
  nim?: any;
  instance: Client;
  channelInfo?: any;
  apiEvent: {
    [prop: string]: APIEventItem[];
  };
  memberMap: {[uid:number]: string};
  apiEvents: {
    [prop: string]: DataEvent[];
  };
  transportStats: {
    txRtt: number;
    rxRtt: number;
    NetworkType: string;
    OutgoingAvailableBandwidth: number;
  }
  sessionStats: {
    UserCount?: number;
    Duration?: number;
    RecvBytes: number;
    SendBytes: number;
    RecvBitrate: number;
    SendBitrate: number;
  }
  remoteAudioStats: {
    [uid: number]: MediaStats
  }
  remoteVideoStats: {
    [uid: number]: MediaStats
  }
  remoteStreamMap: {
    [uid: number]: Stream
  }
  localStream: Stream|null;
  localAudioStats: {
    [uid: number]: LocalAudioStats
  };
  localVideoStats: {
    [uid: number]: LocalVideoStats
  };
  logger:Logger;
  testConf: {
    ForwardedAddr?:string;
    turnAddr?:string[];
    relayaddrs?: string;
    relaytoken?: string;
  };
  channelStatus: string;
  signalInited: boolean;
  _signalling: Signalling|null;
  connectState:{
    prevState: string;
    curState:string;
  };
  _mediasoup?:Mediasoup|null;
  mediaHelpers: {[uid:number]:MediaHelper};
  netStatusList: NetStatusItem[];
  requestId: {
    [apiName: string]: number;
  }
}

export interface NetStatusItem{
  uid: number;
  
}

export interface NetworkQualityItem{
  uid: number;
  downlinkNetworkQuality: number;
  uplinkNetworkQuality: number;
}

export interface Logger{
  log: (...msg:any)=>void
  info: (...msg:any)=>void
  warn: (...msg:any)=>void
  error: (...msg:any)=>void
}

export interface RenderMode{
  width: number;
  height: number;
  cut: boolean;
}


export interface MediaStats {
  TotalFreezeTime: number;
  [key: string]: string | number| boolean;
}

export interface DataEvent {
  name: string;
  uid?: string;
  cid?: string;
  time?: number;
}

export interface LoginEvent extends DataEvent{
  sdk_ver:string;
  platform:string;
  app_key:string;
  meeting_mode:number;
  a_record:boolean;
  v_record:boolean;
  record_type:number;
  host_speaker:boolean;
  server_ip:string;
  result:number;
  signal_time_elapsed:number;
  time_elapsed:number;
}

export interface ReloginEvent extends DataEvent{
  meeting_mode:number;
  a_record:boolean;
  v_record:boolean;
  record_type:number;
  host_speaker:boolean;
  server_ip:string;
  result:number;
  reason: string;
}

export interface LogoutEvent extends DataEvent{
  reason: string;
}

export interface RecvFirstFrameEvent extends DataEvent{
  pull_uid: number;
  media_type: number;
}

export interface RecvFirstPackageEvent extends DataEvent{
  pull_uid: number;
  media_type: number;
}

export interface FirstPacketSentEvent extends DataEvent{
  media_type: number;
}

export interface DisconnectEvent extends DataEvent{
  reason: string;
}

export interface DeviceAbnormalEvent extends DataEvent{
  reason: string;
  ip: string;
}

export interface FunctionEvent extends DataEvent{
  name: string;
  oper: string;
  value: string;
}

export interface CommonEvent extends DataEvent{
  ver: string;
  sdk_type: string;
  session_id: string;
  app_key: string;
}

export interface HeartbeatEvent extends DataEvent {
  sys:string;
  tx:string;
  rx:string;
}

export interface WholeStatsReportOptions{
  appkey: string;
  adapterRef: AdapterRef;
}

export interface WholeStatsReportStartOptions{
  appkey?: string;
  cid?: string;
  uid?: string;
}

export interface FormativeStatsReportOptions{
  adapterRef: AdapterRef;
  sdkRef: SDKRef;
  appkey: string; 
}

export interface PacketLostData {
  packetsLost: string;
  packetsSent?: string;
  packetsReceived?: string;
}

export interface DownVideoItem{
  //from Chrome Mac 87.0.4280.88
  bitsReceivedPerSecond: number;
  bytesReceived: string;
  codecImplementationName: string;
  framesDecoded: string;
  freezeTime: number;
  googCaptureStartNtpTimeMs: string;
  googCodecName: string;
  googContentType: string;
  googCurrentDelayMs: string;
  googDecodeMs: string;
  googFirsSent: string;
  googFirstFrameReceivedToDecodedMs: string;
  googFrameHeightReceived: string;
  googFrameRateDecoded: string;
  googFrameRateOutput: string;
  googFrameRateReceived: string;
  googFrameWidthReceived: string;
  googInterframeDelayMax: string;
  googJitterBufferMs: string;
  googMaxDecodeMs: string;
  googMinPlayoutDelayMs: string;
  googNacksSent: string;
  googPlisSent: string;
  googRenderDelayMs: string;
  googTargetDelayMs: string;
  googTrackId: string;
  id: string;
  mediaType: string;
  packetsLost: string;
  packetsReceived: string;
  packetsReceivedPerSecond: number;
  recvPacketLoss: number;
  ssrc: string;
  timestamp: Date;
  totalFreezeTime: number;
  transportId: string;
  type: string;
  vlr: number;
}

export interface DownAudioItem{
  //from Chrome Mac 87.0.4280.88
  alr: number;
  audioOutputLevel: string;
  bitsReceivedPerSecond: number;
  bytesReceived: string;
  freezeTime: number;
  googAccelerateRate: string;
  googCaptureStartNtpTimeMs: string;
  googCodecName: string;
  googCurrentDelayMs: string;
  googDecodingCNG: string;
  googDecodingCTN: string;
  googDecodingCTSG: string;
  googDecodingMuted: string;
  googDecodingNormal: string;
  googDecodingPLC: string;
  googDecodingPLCCNG: string;
  googExpandRate: string;
  googJitterBufferMs: string;
  googJitterReceived: string;
  googPreemptiveExpandRate: string;
  googPreferredJitterBufferMs: string;
  googSecondaryDecodedRate: string;
  googSecondaryDiscardedRate: string;
  googSpeechExpandRate: string;
  googTrackId: string;
  id: string;
  mediaType: string;
  packetsLost: string;
  packetsReceived: string;
  packetsReceivedPerSecond: number;
  recvPacketLoss: number;
  ssrc: string;
  timestamp: Date;
  totalAudioEnergy: string;
  totalFreezeTime: number;
  totalSamplesDuration: string;
  transportId: string;
  type: string;
}

export interface UpVideoItem {
  //from Chrome Mac 87.0.4280.88
  bitsSentPerSecond: number;
  bytesSent: string;
  codecImplementationName: string;
  framesEncoded: string;
  freezeTime: number;
  googActualEncBitrate: string;
  googAdaptationChanges: string;
  googAvailableReceiveBandwidth: string
  googAvailableSendBandwidth: string;
  googAvgEncodeMs: string;
  googBandwidthLimitedResolution: string;
  googBucketDelay: string;
  googCodecName: string;
  googContentType: string;
  googCpuLimitedResolution: string;
  googEncodeUsagePercent: string;
  googFirsReceived: string;
  googFrameHeightInput: string;
  googFrameHeightSent: string;
  googFrameRateInput: string;
  googFrameRateSent: string;
  googFrameWidthInput: string;
  googFrameWidthSent: string;
  googHasEnteredLowResolution: string;
  googNacksReceived: string;
  googPlisReceived: string;
  googRetransmitBitrate: string;
  googRtt: string;
  googTargetEncBitrate: string;
  googTrackId: string;
  googTransmitBitrate: string;
  hugeFramesSent: string;
  id: string;
  mediaType: string;
  packetsLost: string;
  packetsSent: string;
  packetsSentPerSecond: number;
  qpSum: string;
  sendPacketLoss: number;
  ssrc: string;
  timestamp: Date;
  totalFreezeTime: number;
  transportId: string;
  type: string;
  vlr: number;
}

export interface UpAudioItem {
  //from Chrome Mac 87.0.4280.88
  alr: number;
  audioInputLevel: string;
  bitsSentPerSecond: number;
  bytesSent: string;
  googCodecName: string;
  googJitterReceived: string;
  googRtt:string;
  googTrackId: string;
  googTypingNoiseState: string;
  id: string;
  mediaType: string;
  packetsLost: string;
  packetsSent: string;
  packetsSentPerSecond: number;
  sendPacketLoss: number;
  ssrc: string;
  timestamp: Date;
  totalAudioEnergy: string;
  totalSamplesDuration: string;
  transportId: string;
  type: string;
}

export interface AudioRtxInfo{
  uid: number[];
  a_p_volume:number[];
  a_d_nor:number[];
  a_d_plc:number[];
  a_d_plccng: number[];
  a_stuck:number[];
  a_bps:number[];
  a_p_lost_r:number[];
  a_delay:number[];
  a_acc_r: number[];
}

export interface VideoRtxInfo{
  v_res: string[],
  v_fps: number[],
  v_plis: number[],
  v_stuck: number[],
  v_bw_kbps: number[],
  v_bps: number[],
  v_p_lost_r: number[],
  v_dec_ms: number[],
  v_delay: number[]
}


export interface Player{
  videoDom: HTMLVideoElement;
  audioDom: HTMLAudioElement;
}

export interface LocalAudioStats{
  CodecType: string;
  MuteState: boolean;
  RecordingLevel: number;
  SamplingRate: number;
  SendBitrate: number;
  SendLevel: number;
}

export interface LocalVideoStats{
  CaptureFrameRate: number;
  CaptureResolutionHeight: number;
  CaptureResolutionWidth: number;
  EncodeDelay: number;
  MuteState: boolean;
  SendBitrate: number;
  SendFrameRate: number;
  SendResolutionHeight: number;
  SendResolutionWidth: number;
  TargetSendBitrate: number;
  TotalDuration: number;
  TotalFreezeTime: number;
}

export interface SDKRef{
  
}

export interface PlayOptions{
  adapterRef:AdapterRef;
  sdkRef: SDKRef;
  uid: number;
}

export interface LoggerHelperOptions{
  useTimestamps?:boolean;
  useLocalStorage?:boolean;
  autoTrim?:boolean;
  maxLines?:number;
  tailNumLines?:number;
  logFilename?:string;
  maxDepth?:number;
  maxLogsLines?:number;
}

export interface LogConfig{
  startTime: number;
  log:string;
  lastLog: number;
}

export interface LoggerDebugOptions{
  style?: string;
}

export interface LoggerOptions{
  debug?: boolean | LoggerDebugOptions;
  prefix:string;
  isSavedLogs?:boolean;
  useTimestamps?:boolean;
  useLocalStorage?:boolean;
  autoTrim?:boolean;
  maxLines?:number;
  tailNumLines?:number;
  logFilename?:string;
  maxDepth?:number;
  maxLogsLines?:number;
  logFunc?: {
    [name:string]: ()=>void
  };
}

export interface StatsReportOptions{
  sdkRef: SDKRef;
  adapterRef: AdapterRef;
}

export interface WebAudioOptions{
  adapterRef: AdapterRef;
  stream: MediaStream|MediaStream[];
  isAnalyze?: boolean;
  isRemote?: boolean;
}

export interface AudioMixingOptions{
  buffer:AudioBuffer;
  replace: boolean;
  cycle: number;
  playStartTime: number;
  volume?: number;
  auidoMixingEnd: (()=>void)|null;
  loopback: boolean;
}

export interface MixAudioConf{
  index: number;
  audioBuffer:{[key:string]:AudioBuffer};
  audioFilePath?: string;
  loopback?:boolean;
  replace?:boolean;
  cycle?:number;
  playStartTime?:number;
  volume?:number;
  auidoMixingEnd?:(()=>void)|null;
}

export interface MediaHelperOptions{
  sdkRef: SDKRef;
  adapterRef: AdapterRef;
  uid: number;
}

export interface GetStreamConstraints{
  audio?: boolean;
  audioDeviceId?: string;
  video?: boolean;
  videoDeviceId?: string;
  screen?: boolean;
  audioSource?: MediaStreamTrack|null;
  videoSource?: MediaStreamTrack|null;
  deviceId?: string;
}

export interface RecordInitOptions{
  sdkRef: SDKRef;
  adapterRef: AdapterRef;
  uid:number;
  media:MediaHelper;
}

export interface RecordStatus{
  recordedChunks: Blob[], // recordedChunks
  isRecording: boolean, // 录音标志位
  stream: MediaStream|MediaStream[]|null, // 录制媒体流
  option: RecordStartOptions|null, // 开启录制配置参数
  contentTypes: string[], // 媒体内容类型
  mimeType: string, // 媒体mime类型
  audioController: null, // webaudio对象，负责混音处理
  opStream: MediaStream|null, // 待操作的可变更媒体流
  state: string, // 录制状态： init | started | stopped
  timer: Timer|null, // 打印日志定时器
  fileName: string|null, // 录制保存的文件对象名
  recordId: number, // 录制id
  recordStatus: string, // 录制状态
  recordUrl: string|null,
  startTime: number|null,
  endTime: number|null,
}

export interface RecordStartOptions{
  stream: MediaStream|MediaStream[];
  uid: number;
  type: string;
  reset: boolean;
}

//因为Typescript对不同平台的timer返回值类型处理不同：
export type Timer = ReturnType<typeof setTimeout>|ReturnType<typeof setInterval>

export interface MeetingOptions{
  adapterRef:AdapterRef;
  sdkRef:SDKRef;
}

export interface MeetingJoinChannelOptions{
  appkey:string;
  channelName: string;
  uid: number;
  wssArr?: string[]|null;
  sessionMode?: string;
  joinChannelRecordConfig: RecordConfig;
  joinChannelLiveConfig: LiveConfig;
  token?:string;
}

export interface AddTaskOptions{
  rtmpTasks: RTMPTask[];
}

export interface RTMPTask{
  taskId: string;
  streamUrl: string;
  record: boolean;
  hostUid: string;
  version: number;
  layout: {
    canvas:{
      width: number,
      height: number,
      color: number,
    };
    users: {
      uid: number;
      x: number;
      y: number;
      width: number;
      height: number;
      adaption: number;
      pushAudio: boolean;
      pushVideo: boolean;
    }[];
    images: {
      url: string;
      x: number;
      y: number;
      width: number;
      height: number;
      adaption: number;
    }[];
  };
  config: {
    singleVideoNoTrans: boolean;
    audioParam?: {
      bitRate: number;
    }
  };
}

export interface MediasoupManagerOptions{
  adapterRef: AdapterRef;
  sdkRef: SDKRef;
}

export interface ProduceConsumeInfo{
  uid: number;
  kind: 'audio'|'video';
  id: string;
  preferredSpatialLayer:number;
}

export interface AudioProcessingOptions{
  ANS?: boolean;
  AEC?: boolean;
  AGC?: boolean;
}

export interface StreamOptions{
  isRemote: boolean;
  uid: number;
  audio: boolean;
  audioProcessing?: AudioProcessingOptions;
  microphoneId?: '';
  cameraId?: '';
  video: boolean;
  screen: boolean;
  client: Client;
  audioSource?: MediaStreamTrack|null;
  videoSource?: MediaStreamTrack|null;
}

export interface Client{
  getMediaHlperByUid:(streamId: number)=>MediaHelper;
  adapterRef: AdapterRef;
  apiFrequencyControl: (event:any)=>void;
  emit:(eventName: string, eventData?:any)=>void
  _roleInfo: {
    userRole: number;
    audienceList: {[uid:number]: boolean}
  }
  publish: (stream: Stream)=>void
  apiEventReport: (eventName: string, eventData: any)=>void
  getPeer: (sendOrRecv: 'send'|'recv')=>any
  leave: ()=>any
  addSsrc: (uid:number, kind:string, ssrc:number)=>any
  reBuildRecvTransport: ()=>any
  _params: any
  setSessionConfig: any
  [key:string]: any
}

export interface PubStatus{
  audio: {
    audio: boolean;
    producerId: string;
    consumerId: string;
    consumerStatus: string;
    stopconsumerStatus: string;
    mute: boolean;
    simulcastEnable: boolean;
  },
  video: {
    video: boolean,
    producerId: string,
    consumerId: string,
    consumerStatus: string,
    stopconsumerStatus: string,
    mute: boolean;
    simulcastEnable: boolean;
  },
  screen: {
    screen: boolean,
    producerId: string,
    consumerId: string,
    consumerStatus: string,
    stopconsumerStatus: string
    mute: boolean;
    simulcastEnable: boolean;
  }
}

export interface SubscribeOptions{
  audio?: boolean;
  video?: boolean;
  highOrLow?: boolean;
}

export interface SubscribeConfig{
  audio: boolean;
  video: boolean;
  highOrLow: number;
  resolution: number;
}

export interface VideoProfileOptions{
  resolution: number;
  frameRate: number;
}

export interface ScreenProfileOptions{
  resolution: number;
  frameRate: number;
}

export interface SnapshotOptions{
  uid: number;
  name: string;
}

export interface MediaRecordingOptions{
  type: string;
  reset: boolean;
}

export interface SignallingOptions{
  adapterRef: AdapterRef;
  sdkRef: SDKRef;
}

export interface ClientOptions{
  appkey: string;
  debug: boolean | LoggerDebugOptions;
  ref: any;
}

export interface APIFrequencyControlOptions{
  name: string;
  code?: number;
  param: string;
}

export interface APIEventItem{
  name: string;
  time: number;
  param: string;
  request_id: number;
}

export interface LiveConfig{
  liveEnable: boolean;
}

export interface RecordConfig{
  isHostSpeaker: boolean;
  recordAudio: boolean;
  recordVideo: boolean;
  recordType: number;
}

export interface JoinOptions{
  channelName: string;
  uid: number;
  wssArr?: string[]|null;
  joinChannelLiveConfig?: LiveConfig;
  joinChannelRecordConfig?: RecordConfig;
}

export interface JoinChannelRequestParam4WebRTC2{
  channelName: string;
  uid: number;
  wssArr?: string[]|null;
  joinChannelLiveConfig: LiveConfig;
  joinChannelRecordConfig: RecordConfig;
  logoutReason?: number;
  startJoinTime: number;
  appkey: string;
  userRole: number;
  token?: string;
}

export interface ValidIntegerOptions{
  tag: string;
  value: number;
  min?: number;
  max?: number;
}

export interface ExistsOptions{
  tag: string;
  value: any;
  min?: number;
  max?: number;
}
