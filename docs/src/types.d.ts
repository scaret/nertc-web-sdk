/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

import { Client } from './client'

/**
 * 网络连接状态。包括：
 * - `DISCONNECTED`：网络连接已断开。
 * - `CONNECTING`：建立网络连接中。
 * - `CONNECTED`：网络已连接。
 * - `DISCONNECTING`：网络连接断开中。
 *
 * 参考 [[Client.getConnectionState]]
 */
export declare type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING'

/**
 * 媒体流类型。包括：
 * - `audio`：音频。
 * - `video`：视频。
 * - `screen`：屏幕共享。
 */
export declare type MediaType = 'audio' | 'audioSlave' | 'video' | 'screen'

/**
 * 加密方案，在调用 [[Client.setEncryptionMode]] 时使用。可设置为：
 * - `none`：不加密。
 * - `sm4-128-ecb`：128 位 SM4 加密，ECB 模式。
 */
export declare type EncryptionMode = 'none' | 'sm4-128-ecb'

/**
 * 滤镜类型。包括：
 * - `ziran`：自然。
 * - `baixi`：白皙。
 * - `fennen`：粉嫩。
 * - `weimei`：唯美。
 * - `langman`：浪漫。
 * - `rixi`：日系。
 * - `landiao`：蓝调。
 * - `qingliang`：清凉。
 * - `huaijiu`：怀旧。
 * - `qingcheng`：青橙。
 * - `wuhou`：午后。
 * - `zhigan`：质感。
 * - `mopian`：默片。
 * - `dianying`：电影。
 * - `heibai`：黑白。
 *
 */
export declare type BeautyFilters =
  | 'ziran'
  | 'baixi'
  | 'fennen'
  | 'weimei'
  | 'langman'
  | 'rixi'
  | 'landiao'
  | 'qingliang'
  | 'huaijiu'
  | 'qingcheng'
  | 'wuhou'
  | 'zhigan'
  | 'mopian'
  | 'dianying'
  | 'heibai'

/**
 * 注册插件参数。
 */
export interface pluginOptions {
  /**
   *  插件标识
   */
  key: 'AdvancedBeauty' | 'VirtualBackground'
  /**
   *  插件 js 地址
   */
  pluginUrl: string
  /**
   *  插件 wasm 地址
   */
  wasmUrl: string
}

/**
 * 基础美颜静态资源配置参数
 */
export declare type BasicBeautyResConfig = {
  beauty?: {
    whiten: string
    redden: string
  }
  filters?: {
    [key: string]: {
      src: string
      intensity?: number
    }
  }
}

/**
 * 高级美颜静态资源配置参数
 */
export declare type AdvBeautyResConfig = {
  faceMask?: string
  eyeTeethMask?: string
  teethWhiten?: string
}

/**
 * 高级美颜效果类型。包括：
 * - `enlargeEye`：大眼。
 * - `roundedEye`：圆眼。
 * - `openCanthus`：开眼角。
 * - `eyeDistance`：眼距。
 * - `eyeAngle`：眼睛角度。
 * - `shrinkNose`：瘦鼻。
 * - `lengthenNose`：长鼻。
 * - `widenMouth`：嘴巴宽度。
 * - `shrinkMouth`：嘴巴调整。
 * - `mouthCorners`：嘴角调整。
 * - `adjustPhiltrum`：人中调整。
 * - `shrinkUnderjaw`：瘦下颌。
 * - `shrinkCheekbone`：瘦颧骨。
 * - `lengthenJaw`：下巴长度调整。
 * - `narrowedFace`：窄脸。
 * - `shrinkFace`：瘦脸。
 * - `vShapedFace`：V 脸。
 * - `minifyFace`：小脸。
 * - `shortenFace`：短脸。
 * - `whitenTeeth`：美牙。
 * - `brightenEye`：亮眼。
 * - 'fadeHeadWrinkle'：抬头纹。
 * - 'fadeEyeRim'：黑眼圈。
 * - 'fadeNoseLine'：法令纹。
 */
export declare type AdvBeautyEffects =
  | 'enlargeEye'
  | 'roundedEye'
  | 'openCanthus'
  | 'eyeDistance'
  | 'eyeAngle'
  | 'shrinkNose'
  | 'lengthenNose'
  | 'shrinkMouth'
  | 'widenMouth'
  | 'mouthCorners'
  | 'adjustPhiltrum'
  | 'shrinkUnderjaw'
  | 'shrinkCheekbone'
  | 'lengthenJaw'
  | 'narrowedFace'
  | 'shrinkFace'
  | 'vShapedFace'
  | 'minifyFace'
  | 'shortenFace'
  | 'whitenTeeth'
  | 'brightenEye'
  | 'fadeHeadWrinkle'
  | 'fadeEyeRim'
  | 'fadeNoseLine'

export declare type AdvBeautyPreset = {
  enlargeEye?: number
  roundedEye?: number
  openCanthus?: number
  eyeDistance?: number
  eyeAngle?: number
  shrinkNose?: number
  lengthenNose?: number
  shrinkMouth?: number
  widenMouth?: number
  mouthCorners?: number
  adjustPhiltrum?: number
  shrinkUnderjaw?: number
  shrinkCheekbone?: number
  lengthenJaw?: number
  narrowedFace?: number
  shrinkFace?: number
  vShapedFace?: number
  minifyFace?: number
  shortenFace?: number
  whitenTeeth?: number
  brightenEye?: number
  fadeHeadWrinkle?: number
  fadeEyeRim?: number
  fadeNoseLine?: number
}

/**
 * 背景设置参数。
 */
export interface BackGroundOptions {
  /**
   *  背景设置类型
   */
  type: 'image' | 'color' | 'blur'
  /**
   *  背景图片
   */
  source?: HTMLImageElement | string
  /**
   *  背景颜色
   */
  color?: string
  /**
   *  背景虚化程度
   */
  level?: number
}
/**
 * 视频画布设置。
 */
export interface RenderMode {
  /**
   * 宽度
   */
  width: number
  /**
   * 高度
   */
  height: number
  /**
   * 是否裁剪
   */
  cut: boolean
}

/**
 * 客户端录制参数。
 */
export interface ClientMediaRecordingOptions {
  /**
   * 仅录制本段，或者录制房间里所有人
   */
  recorder?: 'local' | 'all'
  /**
   * 录制的配置参数
   */
  recordConfig?: ClientRecordConfig
}

export interface ClientRecordConfig {
  /**
   * 仅录制音频或者录制音视频（video表示音视频都录制）
   */
  recordType: 'audio' | 'video'
  /**
   * 录制文件的名称
   */
  recordName?: string
  /**
   * 录制文件的分辨率，仅支持640*360、640*480、1280*720设置（NERTC.RECORD_VIDEO_QUALITY_360p | NERTC.RECORD_VIDEO_QUALITY_480p | NERTC.RECORD_VIDEO_QUALITY_720p
   */
  recordVideoQuality: number
  /**
   * 录制文件的帧率，仅支持15和30两种设置（NERTC.RECORD_VIDEO_FRAME_RATE_15 | NERTC.RECORD_VIDEO_FRAME_RATE_30）
   */
  recordVideoFrame: number
}

/*
 * 录制状态。
 */
export interface RecordStatus {
  recordedChunks: Blob[]
  /**
   * 是否正在录制。
   */
  isRecording: boolean
  /**
   * 录制的视频流。
   */
  stream: MediaStream | MediaStream[] | null
  /**
   * 录制配置。
   */
  option: RecordStartOptions | null
  contentTypes: string[]
  mimeType: string
  audioController: null
  opStream: MediaStream | null
  /**
   * 状态。
   */
  state: string
  /**
   * 录制文件名称。
   */
  fileName: string | null
  /**
   * 录制 ID。
   */
  recordId: number
  /**
   * 录制状态。
   */
  recordStatus: string
  /**
   * 录制文件的 URL 地址。
   */
  recordUrl: string | null
  /**
   * 录制开始时间。
   */
  startTime: number | null
  /**
   * 录制结束时间。
   */
  endTime: number | null
}

export interface RecordStartOptions {
  stream: MediaStream | MediaStream[]
  uid: number | string
  type: string
  reset: boolean
}

/**
 * 互动直播推流任务状态。
 */
export interface RTMPTaskState {
  /**
   * 互动直播推流任务状态码。
   */
  code: number
  /**
   * 主讲人的用户 ID。
   */
  hostUid: number
  /**
   * 互动直播推流任务状态信息。
   */
  msg: string
  /**
   * 推流地址。
   */
  streamUrl: string
  /**
   * 互动直播任务 ID。
   */
  taskId: string
}

/**
 * 可能的异常有：
 * * AUDIO_INPUT_LEVEL_TOO_LOW
 * * SEND_AUDIO_BITRATE_TOO_LOW
 * * FRAMERATE_SENT_TOO_LOW
 * * FRAMERATE_VIDEO_BITRATE_TOO_LOW
 * * RECV_AUDIO_DECODE_FAILED
 * * AUDIO_OUTPUT_LEVEL_TOO_LOW
 * * RECV_VIDEO_DECODE_FAILED
 * * RECV_SCREEN_DECODE_FAILED
 *
 * 注意：当远端音频数量过多时SDK会按需开启音频选路模式（ASL），此时 RECV_AUDIO_DECODE_FAILED 及 AUDIO_OUTPUT_LEVEL_TOO_LOW 提示不再生效。
 */
export interface ClientExceptionEvt {
  /**
   * 房间内的异常事件信息。
   */
  msg: 'string'
  /**
   * 用户 ID。
   */
  uid: number | string
}

export enum NetworkStatus {
  UNKNOWN = 0,
  EXCELLENT = 1,
  GOOD = 2,
  POOR = 3,
  BAD = 4,
  VERYBAD = 5,
  DOWN = 6
}

export enum STREAM_TYPE {
  HIGH = 0,
  LOW = 1
}

/***
 * 房间中所有成员的上下行网络质量。
 */
export interface NetStatusItem {
  /**
   * 用户 ID。
   */
  uid: number | string
  downlinkNetworkQuality: NetworkStatus
  uplinkNetworkQuality: NetworkStatus
}

/**
 * 推流任务选项。
 */
export interface AddTaskOptions {
  /**
   * 推流任务信息。
   */
  rtmpTasks: RTMPTask[]
}

/**
 * 推流任务配置。
 */
export interface RTMPTask {
  /**
   * 自定义的推流任务 ID。请保证此 ID 唯一。字母数字下划线组成的64位以内的字符串。
   */
  taskId: string
  /**
   * 流地址，例如 `rtmp://test.url`。此处的推流地址可设置为网易云信直播产品中服务端API创建房间的返回参数pushUrl。
   */
  streamUrl: string
  /**
   * 旁路推流是否需要进行音视频录制。
   */
  record: boolean
  /**
   * 互动直播中的布局相关参数。详细参数说明请参考layout。布局参数的配置方式及典型配置示例请参考旁路推流画面布局。
   */
  layout: {
    /**
     * 用于设置混流视频的整体画布属性。
     */
    canvas: {
      /**
       * 整体画布的宽度，单位为 px。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      width: number
      /**
       * 整体画布的高度，单位为 px。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      height: number
      /**
       * 画面背景颜色，格式为 256 ✖ 256 ✖ R + 256 ✖ G + B的和。请将对应 RGB 的值分别带入此公式计算即可。若未设置，则默认为0。
       */
      color: number
    }
    /**
     * 用于设置混流视频中每个参与者对应的画面属性。
     */
    users: {
      /**
       * 将指定uid对应用户的视频流拉入直播。如果添加多个 users，则 uid 不能重复。
       */
      uid: number | string
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为用户图像的左上角。x 参数用于设置画布的横轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      x: number
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为用户图像的左上角。y 参数用于设置画布的纵轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      y: number
      /**
       * 该用户图像在画布中的宽度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      width: number
      /**
       * 该用户图像在画布中的高度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      height: number
      /**
       * 用于设置占位图片和指定区域的适应属性。可设置为：
       * * 0：适应图片。即保证视频内容全部显示，未覆盖区域默认填充背景色
       * * 1：适应区域。即保证所有区域被填满，视频超出部分会被裁剪。
       *
       * 若未设置，则默认为1。
       */
      adaption: 0 | 1
      /**
       * 是否在直播中混流该用户的对应音频流。可设置为：
       * * true：在直播中混流该用户的对应音频流。
       * * false：在直播中将该用户设置为静音。
       */
      pushAudio: boolean
      /**
       * 是否在直播中向观看者播放该用户的对应视频流。可设置为：
       * * true：在直播中播放该用户的视频流。
       * * false：在直播中不播放该用户的视频流。
       */
      pushVideo: boolean
      /**
       * 直播视频上用户视频帧的图层编号，用来决定渲染层级。
       *
       * 取值范围为 0~100，默认为 0。
       *
       * - 最小值为 0（默认值），表示该区域图像位于最底层。
       * - 最大值为 100，表示该区域图像位于最顶层。
       */
      zOrder: number
    }[]
    /**
     * 用于设置混流视频中占位图片属性。若参数 users 指定的用户未上线，会在其对应的区域展示占位图片。
     */
    images?: {
      /**
       * 占位图片的URL。
       */
      url: string
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为占位图片的左上角。x 参数用于设置画布的横轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      x: number
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为占位图片的左上角。y 参数用于设置画布的纵轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      y: number
      /**
       * 该占位图片在画布中的宽度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      width: number
      /**
       * 该占位图片在画布中的高度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      height: number
      /**
       * 用于设置占位图片和指定区域的适应属性。可设置为：
       * * 0：适应图片。即保证视频内容全部显示，未覆盖区域默认填充背景色
       * * 1：适应区域。即保证所有区域被填满，视频超出部分会被裁剪。
       *
       * 若未设置，则默认为 1。
       */
      adaption: 0 | 1
    }[]
  }
  /**
   * 其他设置
   */
  config?: {
    /**
     * 单视频直推不转码。开启后推流服务器会透传用户的视频编码，不再对视频做转码。
     */
    singleVideoNoTrans?: boolean
    /**
     * 音频参数
     */
    audioParam?: {
      /**
       * 自定义音频比特率。取值范围为 10～192。语音场景建议64以上，音乐场景建议128。
       */
      bitRate?: number
      /**
       * 音频推流采样率。可以设置为以下值。
       * * `NERTC.LIVE_STREAM_AUDIO_SAMPLE_RATE.SAMPLE_RATE_32000` : 32000
       * * `NERTC.LIVE_STREAM_AUDIO_SAMPLE_RATE.SAMPLE_RATE_44100` : 44100
       * * `NERTC.LIVE_STREAM_AUDIO_SAMPLE_RATE.SAMPLE_RATE_48000` : 48000（默认）
       */
      sampleRate?: number
      /**
       * 音频推流声道数。可以设置为`1`（mono）或者`2`（stereo）。默认为`2`。
       */
      channels?: number
      /**
       * 音频编码规格。可以设置为以下值。
       * * `NERTC.LIVE_STREAM_AUDIO_CODEC_PROFILE.LC_AAC`: 表示基本音频编码规格（默认）
       * * `NERTC.LIVE_STREAM_AUDIO_CODEC_PROFILE.HE_AAC`: 表示高效音频编码规格
       */
      codecProfile?: number
    }
  }
  extraInfo?: string
}

export interface StreamOptions {
  /**
   * 用户 ID，与client的id一致。
   */
  uid?: number | string
  /**
   * 是否打开音频。如使用自采集（audioSource），则应将audio设为true。
   */
  audio: boolean
  /**
   * 是否开启/关闭音频处理接口（3A接口)。
   *
   * @note
   * 音频处理接口取决于浏览器支持情况。
   *
   * 目前Safari不支持AGC及ANS设置。
   *
   * `AEC`: 是否开启声学回声消除。默认为 true。
   * * `true`：开启声学回声消除。
   * * `false`：关闭声学回声消除。
   *
   * `AGC`: 是否开启自动增益控制。默认为 true。
   * * `true`：开启自动增益控制。
   * * `false`：关闭自动增益控制。
   *
   * `ANS`: 是否开启自动噪声抑制。默认为 true。
   * * `true`：开启自动噪声抑制。
   * * `false`：关闭自动噪声抑制。
   */
  audioProcessing?: {
    ANS?: boolean
    AEC?: boolean
    AGC?: boolean
  }
  /**
   * 麦克风设备 deviceId，通过 [[NERTC.getMicrophones]] 获取。
   */
  microphoneId?: string
  /**
   * 摄像头设备 deviceId，通过 [[NERTC.getCameras]] 获取。
   */
  cameraId?: string
  /**
   * 是否打开视频。如使用自采集（videoSource），则应将video设为true。
   */
  video: boolean
  /**
   * 是否采集屏幕共享流。如使用自采集（screenVideoSource），则应将 screen 设为true。
   *
   * 注意，Safari on MacOS 的屏幕共享需手势触发，且无法选择共享的屏幕、无法单独共享应用、无法共享音频。
   *
   */
  screen?: boolean
  /**
   * 是否采集屏幕分享流的共享音频。如使用自采集（screenAudioSource），则应将 screenAudio 设为true。
   *
   * @since V4.3.0
   *
   * screenAudio 字段用于指定该屏幕共享流中是否包含本地播放的声音。
   *
   * 可设置为：
   * - true：屏幕共享同时共享本地播放的背景音。
   * - false：（默认）屏幕共享时不共享本地播放的背景音。
   *
   * @note
   * - 如需使用屏幕共享背景音功能，还需要在屏幕共享的弹出框中，勾选 **分享音频**（Share audio）。
   * - 该功能仅支持 Windows 和 macOS 平台 Chrome 浏览器 74 及以上版本。需要注意的是:
   *    1. macOS 平台的 Chrome 浏览器仅支持 Chrome 标签页（Chrome Tab）模式。
   *    2. 由于系统限制，分享当前的屏幕和页面时，无法将SDK接收到的声音再通过屏幕共享分享出去。
   * - 如需使用屏幕共享背景音功能，必须将 screen 设为 true。如此时audio设为true，则输出为麦克风与屏幕共享背景音的混音。[[Stream.setAudioProfile]] 推荐设置为 `high_quality_stereo`。
   * - 在V4.4.0版本之前，screenAudio和audio不能同时开启。
   */
  screenAudio?: boolean
  /**
   * 要Stream绑定的client实例对象。默认是最初使用用createClient创建的client实例（多实例场景使用）
   */
  client?: Client
  /**
   * 自定义的音频的track。开启后应将 audio 置为 true 。
   */
  audioSource?: MediaStreamTrack
  /**
   * 自定义的视频的track。开启后应将 video 置为 true 。
   */
  videoSource?: MediaStreamTrack
  /**
   * 自定义屏幕共享音频的Track。开启后应将 screenAudio 置为 true 。
   *
   * @since V4.6.0
   */
  screenAudioSource?: MediaStreamTrack
  /**
   * 自定义屏幕共享视频的视频的Track。开启后应将 screenVideo 置为true 。
   * @since V4.6.0
   */
  screenVideoSource?: MediaStreamTrack
  /**
   * Electron 屏幕共享的数据源 ID，您可以参考[这篇文章](https://www.electronjs.org/docs/api/desktop-capturer)。
   */
  sourceId?: string
  /**
   * 指定使用前置/后置摄像头来采集视频
   */
  facingMode?: 'user' | 'environment'
}

/*
 * 视频订阅配置参数。
 */
export interface SubscribeOptions {
  /**
   * 是否订阅音频。
   */
  audio?: boolean
  /**
   * 是否订阅视频。
   */
  video?: boolean
  /**
   * 是否订阅屏幕共享。
   */
  screen?: boolean
  /**
   * 是否订阅音频辅流。
   */
  audioSlave?: boolean
  /**
   * 订阅大流或小流。
   *
   * 0 表示小流，1 表示大流。
   */
  highOrLow?: 0 | 1
}

export interface LiveConfig {
  /**
   * 互动直播开关。加入房间时此开关默认开启。
   */
  liveEnable: boolean
}
export interface RecordConfig {
  /**
   * 当前用户是否是主讲人。
   */
  isHostSpeaker: boolean
  /**
   * 是否开启音频实时音录制，`false` 不需要，`true` 需要。默认 `false`。
   */
  recordAudio: boolean
  /**
   * 是否开启视频实时音录制，`false` 不需要，`true` 需要。默认 `false`。
   */
  recordVideo: boolean
  /**
   * 录制模式。
   * - 0：合流录制 + 单流录制。
   * - 1：合流录制模式。只产生混合录制文件。
   * - 2：单流录制模式。只产生单独录制文件。
   */
  recordType: 0 | 1 | 2
}

export interface MediaPriorityOptions {
  /**
   * 本地用户的媒体流优先级。支持设置为：
   * - 50：高优先级。
   * - 100：（默认）普通优先级。
   */
  priority: number
  /**
   * 是否开启抢占模式。默认为 false，即不开启。
   * - 抢占模式开启后，本地用户可以抢占其他用户的高优先级，被抢占的用户的媒体优先级变为普通优先级，在抢占者退出房间后，其他用户的优先级仍旧维持普通优先级。
   * - 抢占模式关闭时，如果房间中已有高优先级用户，则本地用户的高优先级设置不生效，仍旧为普通优先级。
   */
  preemtiveMode?: boolean
}

export interface JoinOptions {
  /**
   * 房间名称。
   */
  channelName: string
  /**
   * 用户的唯一标识 id，房间内每个用户的 uid 必须是唯一的。
   *
   * uid 可选。如果不指定，SDK 会自动分配一个随机 uid，您可以通过 getUid 查看，App 层必须记住该值并维护，SDK 不对该值进行维护。
   */
  uid?: number | string
  /**
   * 安全认证签名。详细信息请参考 [NERTC Token](/docs/jcyOTA0ODM/Dc4NTE4OTY)。
   * - 调试模式下：无需设置 Token。
   * - 安全模式下：必须设置为已获取的 NERTC Token。
   *
   * @note
   * - 应用测试期间，为便于调试，可以使用调试模式，此时无需 Token 鉴权即可加入房间。
   * - 出于安全起见，应用正式上线时，应转为安全模式，并在加入房间时使用 Token 鉴权。
   */
  token?: string
  /**
   * 互动直播相关参数。
   */
  joinChannelLiveConfig?: LiveConfig
  /**
   * 云端录制相关参数。
   */
  joinChannelRecordConfig?: RecordConfig
  /**
   * 私有化服务器地址对象。
   */
  neRtcServerAddresses?: NeRtcServerAddresses
}

/**
 * 画布水印设置。
 *
 * 同时设置文字、时间戳或图片水印时，如果不同类型的水印位置有重叠，会按照图片、文本、时间戳的顺序进行图层覆盖。
 */
export interface NERtcCanvasWatermarkConfig {
  /**
   * 视频流类型。支持设置为主流（video）或辅流（screen）。
   */
  mediaType: 'video' | 'screen'
  /**
   * 文字水印。最多可以添加 10 个文字水印。
   */
  textWatermarks: NERtcTextWatermarkConfig[]
  /**
   * 时间戳水印。只能添加 1 个时间戳水印。
   */
  timestampWatermarks: NERtcTimestampWatermarkConfig
  /**
   * 图片水印，最多可以添加 4 个图片水印。
   */
  imageWatermarks: NERtcImageWatermarkConfig[]
}

/**
 * 编码水印设置。
 *
 * 同时设置文字、时间戳或图片水印时，如果不同类型的水印位置有重叠，会按照图片、文本、时间戳的顺序进行图层覆盖。
 */
export interface NERtcEncoderWatermarkConfig {
  /**
   * 视频流类型。支持设置为主流（video）或辅流（screen）。
   */
  mediaType: 'video' | 'screen'
  /**
   * 文字水印。最多可以添加 10 个文字水印。
   */
  textWatermarks: NERtcTextWatermarkConfig[]
  /**
   * 时间戳水印。只能添加 1 个时间戳水印。
   */
  timestampWatermarks: NERtcTimestampWatermarkConfig
  /**
   * 图片水印，最多可以添加 4 个图片水印。
   */
  imageWatermarks: NERtcImageWatermarkConfig[]
}

/**
 * 文字水印设置参数。
 *
 * 最多可添加 10 个文字水印。
 */
export interface NERtcTextWatermarkConfig {
  /**
   * 文字内容，设置为空时，表示不添加文字水印。
   * - 字符串长度无限制。最终显示受字体大小和水印框大小的影响。超出水印框的部分不显示。
   * - 如果设置了水印框宽度，当文字内容长度超过水印框宽度时，会自动换行，如果超出水印框高度，超出部分不显示。
   * - 未设置水印框宽度和高度时，文字不换行，超出水印框的部分不显示。
   */
  content: string
  /**
   * 字体大小。默认值为 10，相当于 144 dpi 设备上的 10 x 15 磅。
   */
  fontSize?: number
  /**
   * 字体颜色。默认为白色。
   */
  fontColor?: number
  /**
   * 水印左上角与视频画布左上角的水平距离。单位为像素（pixel）。默认为 0。
   */
  offsetX?: number
  /**
   * 水印左上角与视频画布左上角的垂直距离。单位为像素（pixel）。默认为 0。
   */
  offsetY?: number
  /**
   * 水印框内背景颜色。默认为灰色。支持透明度设置。
   */
  wmColor?: number
  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmWidth?: number
  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmHeight?: number
}
/**
 * 时间戳水印设置。
 * - 只能添加 1 个时间戳水印，格式为 yyyy-MM-dd HH:mm:ss。
 * - 时间戳水印的时间和当前时间相同，且实时变化。
 */
export interface NERtcTimestampWatermarkConfig {
  /**
   * 字体大小。默认值为 10，相当于 144 dpi 设备上的 10 x 15 磅。
   */
  fontSize?: number
  /**
   * 字体颜色。默认为白色。
   */
  fontColor?: number
  /**
   * 水印左上角与视频画布左上角的水平距离。单位为像素（pixel）。默认为 0。
   */
  offsetX?: number
  /**
   * 水印左上角与视频画布左上角的垂直距离。单位为像素（pixel）。默认为 0。
   */
  offsetY?: number
  /**
   * 水印框内背景颜色。默认为灰色。支持透明度设置。
   */
  wmColor?: number
  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmWidth?: number
  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmHeight?: number
}
/**
 * 图片水印设置参数。
 *
 * 支持添加 4 个图片水印。
 */
export interface NERtcImageWatermarkConfig {
  /**
   * 水印图片。
   */
  imageUrls: string[]
  /**
   * 水印图片左上角与视频画布左上角的水平距离。单位为像素（pixel），默认值为 0。
   */
  offsetX?: number
  /**
   * 水印图片左上角与视频画布左上角的垂直距离。单位为像素（pixel），默认值为 0。
   */
  offsetY?: number
  /**
   * 水印图片的宽度。单位为像素（pixel），默认值为 0 表示按原始图宽。
   */
  wmWidth?: number
  /**
   * 水印图片的高度。单位为像素（pixel），默认值为 0 表示按原始图高。
   */
  wmHeight?: number
  /**
   * 播放帧率。默认 0 帧/秒，即不自动切换图片，图片单帧静态显示。
   */
  fps?: number
  /**
   * 是否设置循环。默认循环，设置为 false 后水印数组播放完毕后消失。
   */
  loop?: boolean
}

/**
 * 私有化服务器相关配置参数。
 */
export interface NeRtcServerAddresses {
  /**
   * 通道信息服务器地址。
   */
  channelServer?: string
  /**
   * 统计上报服务器地址。
   */
  statisticsServer?: string
  /**
   * roomServer服务器地址。
   */
  roomServer?: string
  /**
   * mediaServer服务器地址。
   */
  mediaServer?: string
}
