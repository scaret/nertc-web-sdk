export class FormativeStatsAudio {
  // 以下是上行上报数据
  audioInputLevel?: number
  totalAudioEnergy?: number
  totalSamplesDuration?: number
  bytesSent?: number
  bitsSentPerSecond?: number
  targetBitrate?: number
  packetsSent?: number
  packetsSentPerSecond?: number
  packetsLost?: number
  fractionLost?: number
  packetsLostRate?: number
  nackCount?: number
  rtt?: number
  jitterReceived?: number
  echoReturnLoss = ''
  echoReturnLossEnhancement = ''
  active?: number

  // 以下是LocalAudioStats中的数据
  CodecType = ''
  // rtt?: number
  MuteState?: boolean
  RecordingLevel?: number
  SamplingRate?: number
  SendBitrate?: number
  SendLevel?: number

  // 以下是下行上报数据
  audioOutputLevel?: number
  // totalAudioEnergy?: number
  // totalSamplesDuration?: number
  bytesReceived?: number
  bitsReceivedPerSecond?: number
  packetsReceived?: number
  packetsReceivedPerSecond?: number
  // packetsLost?: number
  // packetsLostRate?: number
  // nackCount?: number
  lastPacketReceivedTimestamp?: number
  estimatedPlayoutTimestamp?: number
  freezeTime?: number
  totalFreezeTime = 0
  decodingPLC?: number
  decodingPLCCNG?: number
  decodingNormal?: number
  decodingMuted?: number
  decodingCNG?: number
  decodingCTN?: number
  currentDelayMs?: number
  preferredJitterBufferMs?: number
  jitterBufferMs?: number
  jitterBufferDelay?: number
  jitter?: number
  // rtt?: number
  preemptiveExpandRate?: number
  speechExpandRate?: number
  concealedSamples?: number
  silentConcealedSamples?: number
  secondaryDecodedRate?: number
  secondaryDiscardedRate?: number
  remoteuid = ''

  //以下是RemoteAudioStats中的数据
  // CodecType = ''
  End2EndDelay?: number
  // MuteState?: boolean
  PacketLossRate?: number
  RecvBitrate?: number
  RecvLevel?: number
  TotalFreezeTime?: number
  TotalPlayDuration?: number
  TransportDelay?: number

  // 以下是为了计算最终结果的中间量
  playoutDelayMs?: number
}

export class FormativeStatsVideo {
  // 以下是上行上报数据
  bytesSent?: number
  bitsSentPerSecond?: number
  targetBitrate?: number
  packetsSent?: number
  packetsSentPerSecond?: number
  packetsLost?: number
  fractionLost?: number
  packetsLostRate?: number
  firCount?: number
  pliCount?: number
  nackCount?: number
  framesEncoded?: number
  framesEncodedPerSecond?: number
  avgEncodeMs?: number
  encodeUsagePercent?: number
  framesSent?: number
  frameRateInput?: number
  frameRateSent?: number
  frameWidthInput?: number
  frameWidthSent?: number
  frameHeightInput?: number
  frameHeightSent?: number
  hugeFramesSent?: number
  qpSum?: number
  qpPercentage?: number
  freezeTime?: number
  totalFreezeTime = 0
  qualityLimitationReason = ''
  qualityLimitationResolutionChanges?: number
  jitter?: number
  rtt?: number
  active?: number
  streamType = ''

  // 以下是LocalVideoStats中的数据
  LayerType?: number
  CodecName = ''
  CodecImplementationName = ''
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

  // 以下是下行上报数据
  bytesReceived?: number
  bitsReceivedPerSecond?: number
  packetsReceived?: number
  packetsReceivedPerSecond?: number
  // packetsLost?: number
  // packetsLostRate?: number
  // firCount?: number
  // pliCount?: number
  // nackCount?: number
  lastPacketReceivedTimestamp?: number
  estimatedPlayoutTimestamp?: number
  pauseCount?: number
  totalPausesDuration?: number
  freezeCount?: number
  totalFreezesDuration?: number
  // totalFreezeTime?: number
  // freezeTime?: number
  framesDecoded?: number
  framesDropped?: number
  framesReceived?: number
  decodeMs?: number
  frameRateDecoded?: number
  frameRateOutput?: number
  frameRateReceived?: number
  frameWidthReceived?: number
  frameHeightReceived?: number
  powerEfficientDecoder?: number
  currentDelayMs?: number
  jitterBufferDelay?: number
  remoteuid = ''

  // 以下是RemoteVideoStats
  // LayerType?: number
  // CodecName?: string
  End2EndDelay?: number
  // MuteState?: boolean
  PacketLossRate?: number
  RecvBitrate?: number
  RecvResolutionHeight?: number
  RecvResolutionWidth?: number
  RenderFrameRate?: number
  RenderResolutionHeight?: number
  RenderResolutionWidth?: number
  // TotalFreezeTime?: number
  TotalPlayDuration?: number
  TransportDelay?: number

  // 以下是中间变量
  jitterBufferMs?: number
}

export type PerSecondStatsProperty =
  | 'framesEncoded'
  | 'bytesSent'
  | 'headerBytesSent'
  | 'packetsSent'
  | 'packetsLost'
  | 'qpSum'
  | 'totalEncodeTime'
  | 'bytesReceived'
  | 'packetsReceived'
  | 'totalDecodeTime'
  | 'framesDecoded'
  | 'framesDropped'
  | 'jitterBufferDelay'
  | 'jitterBufferEmittedCount'
  | 'totalPlayoutDelay'
  | 'totalSamplesCount'
  | 'totalSamplesReceived'
  | 'removedSamplesForAcceleration'
  | 'insertedSamplesForDeceleration'
