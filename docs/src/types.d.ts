/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

import {Client} from "./client";

export declare type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING';
export declare type MediaType = 'audio' | 'video' | 'screen';

/**
 * 加密方案，在调用 [[Client.setEncryptionMode]] 时使用。可设置为：
 * - 'none'：不加密。
 * - 'sm4-128-ecb'：128 位 SM4 加密，ECB 模式。
 */
export declare type EncryptionMode = 'none' | 'sm4-128-ecb';

export interface RenderMode {
  /*
   * 宽度
   */
  width: number;
  /*
   * 高度
   */
  height: number;
  /*
   * 是否裁剪
   */
  cut: boolean;
}

export interface RecordStatus {
  recordedChunks: Blob[];
  isRecording: boolean;
  stream: MediaStream | MediaStream[] | null;
  option: RecordStartOptions | null;
  contentTypes: string[];
  mimeType: string;
  audioController: null;
  opStream: MediaStream | null;
  state: string;
  fileName: string | null;
  recordId: number;
  recordStatus: string;
  recordUrl: string | null;
  startTime: number | null;
  endTime: number | null;
}
export interface RecordStartOptions {
  stream: MediaStream | MediaStream[];
  uid: number;
  type: string;
  reset: boolean;
}


export interface RTMPTaskState{
  
  code: number;

  hostUid: number;

  msg: string;
  
  streamUrl: string;
  
  taskId: string;

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
 */
export interface ClientExceptionEvt{
  msg: 'string';
  uid: number;
}

export interface NetStatusItem {
  uid: number;
}

export interface AddTaskOptions {
  rtmpTasks: RTMPTask[];
}

/**
 * 一个推流任务
 */
export interface RTMPTask {
  /**
   * 自定义的推流任务ID。请保证此ID唯一。字母数字下划线组成的64位以内的字符串
   */
  taskId: string;
  /**
   * 流地址，例如`rtmp://test.url`。此处的推流地址可设置为网易云信直播产品中服务端API创建频道的返回参数pushUrl。
   */
  streamUrl: string;
  /**
   * 旁路推流是否需要进行音视频录制。
   */
  record: boolean;
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
      width: number;
      /**
       * 整体画布的宽度，单位为 px。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      height: number;
      /**
       * 画面背景颜色，格式为 256 ✖ 256 ✖ R + 256 ✖ G + B的和。请将对应 RGB 的值分别带入此公式计算即可。若未设置，则默认为0。
       */
      color: number;
    };
    /**
     * 用于设置混流视频中每个参与者对应的画面属性。
     */
    users: {
      /**
       * 将指定uid对应用户的视频流拉入直播。如果添加多个 users，则 uid 不能重复。
       */
      uid: number;
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为用户图像的左上角。x 参数用于设置画布的横轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      x: number;
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为用户图像的左上角。y 参数用于设置画布的纵轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      y: number;
      /**
       * 该用户图像在画布中的宽度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      width: number;
      /**
       * 该用户图像在画布中的高度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      height: number;
      /**
       * 用于设置占位图片和指定区域的适应属性。可设置为：
       * * 0：适应图片。即保证视频内容全部显示，未覆盖区域默认填充背景色
       * * 1：适应区域。即保证所有区域被填满，视频超出部分会被裁剪。
       * 
       * 若未设置，则默认为1。
       */
      adaption: 0|1;
      /**
       * 是否在直播中混流该用户的对应音频流。可设置为：
       * * true：在直播中混流该用户的对应音频流。
       * * false：在直播中将该用户设置为静音。
       */
      pushAudio: boolean;
      /**
       * 是否在直播中向观看者播放该用户的对应视频流。可设置为：
       * * true：在直播中播放该用户的视频流。
       * * false：在直播中不播放该用户的视频流。
       */
      pushVideo: boolean;
      
      zOrder: number;
    }[];
    /**
     * 用于设置混流视频中占位图片属性。若参数 users 指定的用户未上线，会在其对应的区域展示占位图片。
     */
    images?: {
      /**
       * 占位图片的URL。
       */
      url: string;
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为占位图片的左上角。x 参数用于设置画布的横轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      x: number;
      /**
       * 通过 x 和 y 指定画布坐标中的一个点，该点将作为占位图片的左上角。y 参数用于设置画布的纵轴坐标值。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      y: number;
      /**
       * 该占位图片在画布中的宽度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      width: number;
      /**
       * 该占位图片在画布中的高度。取值范围为 0~1920，若设置为奇数值，会自动向下取偶。
       */
      height: number;
      /**
       * 用于设置占位图片和指定区域的适应属性。可设置为：
       * * 0：适应图片。即保证视频内容全部显示，未覆盖区域默认填充背景色
       * * 1：适应区域。即保证所有区域被填满，视频超出部分会被裁剪。
       *
       * 若未设置，则默认为 1。
       */
      adaption: 0|1;
    }[];
  };
  /**
   * 其他设置
   */
  config?: {
    /**
     * 单视频直推不转码。开启后推流服务器会透传用户的视频编码，不再对视频做转码。
     */
    singleVideoNoTrans?: boolean;
    /**
     * 音频参数
     */
    audioParam?: {
      /**
       * 自定义音频比特率。取值范围为 10～192。语音场景建议64以上，音乐场景建议128。
       */
      bitRate?: number;
      /**
       * 音频推流采样率。可以设置为以下值。
       * * `NERTC.LIVE_STREAM_AUDIO_SAMPLE_RATE.SAMPLE_RATE_32000` : 32000
       * * `NERTC.LIVE_STREAM_AUDIO_SAMPLE_RATE.SAMPLE_RATE_44100` : 44100
       * * `NERTC.LIVE_STREAM_AUDIO_SAMPLE_RATE.SAMPLE_RATE_48000` : 48000（默认）
       */
      sampleRate?: number;
      /**
       * 音频推流声道数。可以设置为`1`（mono）或者`2`（stereo）。默认为`2`。
       */
      channels?: number;
      /**
       * 音频编码规格。可以设置为以下值。
       * * `NERTC.LIVE_STREAM_AUDIO_CODEC_PROFILE.LC_AAC`: 表示基本音频编码规格（默认）
       * * `NERTC.LIVE_STREAM_AUDIO_CODEC_PROFILE.HE_AAC`: 表示高效音频编码规格
       */
      codecProfile?: number;
    };
  };
  extraInfo?: string;
}

export interface StreamOptions {
  /**
   * 用户uid
   */
  uid: number;
  /**
   * 是否从麦克风采集音频
   */
  audio: boolean;
  /**
   * 是否开启/关闭音频处理接口（3A接口)
   * ##### 注意：
   * 音频处理接口取决于浏览器支持情况。目前Safari不支持AGC及ANS设置。
   * `AEC`: 是否开启声学回声消除。默认为 true。
   * * `true`：开启声学回声消除。
   * * `false`：关闭声学回声消除。
   * `AGC`: 是否开启自动增益控制。默认为 true。
   * * `true`：开启自动增益控制。
   * * `false`：关闭自动增益控制。
   * `ANS`: 是否开启自动噪声抑制。默认为 true。
   * * `true`：开启自动噪声抑制。
   * * `false`：关闭自动噪声抑制。
   */
  audioProcessing?: {
    ANS?: boolean;
    AEC?: boolean;
    AGC?: boolean;
  };
  /**
   * 麦克风设备 deviceId，通过 [[NERTC.getMicrophones()]] 获取
   */
  microphoneId?: string;
  /**
   * 摄像头设备 deviceId，通过 getCameras() 获取
   */
  cameraId?: string;
  /**
   * 是否从摄像头采集视频
   */
  video: boolean;
  /**
   * 是否采集屏幕共享流
   */
  screen?: boolean;
/**
   * 是否采集屏幕分享流的共享音频。
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
   * - 该功能仅支持 Windows 和 macOS 平台 Chrome 浏览器 74 及以上版本。其中 macOS 平台的 Chrome 浏览器仅支持 Chrome 标签页（Chrome Tab）模式。
   * - 如需使用屏幕共享背景音功能，必须将 screen 设为 true、audio 设为 false。[[Stream.setAudioProfile]] 推荐设置为 `high_quality_stereo`。如果 screenAudio 和 audio 都设置为 true，音视频流中只会包含本地播放的背景音。
   * - 如需使用屏幕共享背景音功能，还需要在屏幕共享的弹出框中，勾选 **分享音频**（Share audio）。
   */
 screenAudio?: boolean;
  /**
   * 和要Stream绑定的client实例对象，默认是最初使用用createClient创建的client实例（多实例场景使用）
   */
  client?: Client;
  /**
   * 自定义的音频的track
   */
  audioSource?: MediaStreamTrack;
  /**
   * 自定义的视频的track
   */
  videoSource?: MediaStreamTrack;
  /**
   * Electron 屏幕共享的数据源 ID，您可以自行获取。
   */
  sourceId?: string;
  /*
  * 指定使用前置/后置摄像头来采集视频
   */
  facingMode?: String
}

export interface SubscribeOptions {
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
  highOrLow?: number;
}

export interface VideoProfileOptions {
  /**
   * @param options.resolution 设置本端视频分辨率，见 [[NERTC.VIDEO_QUALITY]]
   */
  resolution: number;
  /**
   * @param options.frameRate 设置本端视频帧率，见[[NERTC.VIDEO_FRAME_RATE]]
   */
  frameRate: number;
}

export interface ScreenProfileOptions {
  /**
   * @param {String} [options.resolution] 设置本端屏幕共享分辨率：NERTC.VIDEO_QUALITY_480p、NERTC.VIDEO_QUALITY_720p、NERTC.VIDEO_QUALITY_1080p
   * @param {String} [options.frameRate] 设置本端视频帧率：NERTC.CHAT_VIDEO_FRAME_RATE_5、NERTC.CHAT_VIDEO_FRAME_RATE_10、NERTC.CHAT_VIDEO_FRAME_RATE_15、NERTC.CHAT_VIDEO_FRAME_RATE_20、NERTC.CHAT_VIDEO_FRAME_RATE_25
   */
  resolution: number;
  frameRate: number;
}

export interface ClientOptions {
  /**
   * 实例的应用ID
   */
  appkey: string;
  /**
   * 是否开启debug模式，默认不开启，debug模式下浏览器会打印log日志。
   * 默认为false。
   */
  debug?: boolean;
}

export interface LiveConfig {
  /**
   * 是否旁路直播
   */
  liveEnable: boolean;
}
export interface RecordConfig {
  /**
   * 是否是主讲人
   */
  isHostSpeaker: boolean;
  /**
   * 是否开启音频实时音录制，0不需要，1需要（默认0）
   */
  recordAudio: boolean;
  /**
   * 是否开启视频实时音录制，0不需要，1需要（默认0）
   */
  recordVideo: boolean;
  /**
   * 录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
   */
  recordType: number;
}

export interface MediaPriorityOptions {
  /**
   * 本地用户的媒体流优先级。支持设置为：
   * - 50：高优先级。
   * - 100：（默认）普通优先级。
   */
  priority: number;
  /**
   * 是否开启抢占模式。默认为 false，即不开启。
   * - 抢占模式开启后，本地用户可以抢占其他用户的高优先级，被抢占的用户的媒体优先级变为普通优先级，在抢占者退出房间后，其他用户的优先级仍旧维持普通优先级。
   * - 抢占模式关闭时，如果房间中已有高优先级用户，则本地用户的高优先级设置不生效，仍旧为普通优先级。
   */
  preemtiveMode?: boolean;
}

export interface JoinOptions {
  /**
   * 频道名称
   */
  channelName: string;
  /**
   * 用户的唯一标识 id，房间内每个用户的 uid 必须是唯一的。
   * 
   * uid 可选，默认为 0。如果不指定（即设为 0），SDK 会自动分配一个随机 uid，您可以通过 getUid 查看，App 层必须记住该值并维护，SDK 不对该值进行维护。
   */
  uid: number;
  /**
   * 用户的token
   */
  token?: string;
  /**
   * 加入房间互动直播相关参数
   */
  joinChannelLiveConfig?: LiveConfig;
  /**
   * 加入房间录制相关参数
   */
  joinChannelRecordConfig?: RecordConfig;
  /**
   * 私有化服务器地址对象
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
  mediaType: 'video'|'screen';
  /**
   * 文字水印。最多可以添加 10 个文字水印。
   */
  textWatermarks: NERtcTextWatermarkConfig[];
  /**
   * 时间戳水印。只能添加 1 个时间戳水印。
   */
  timestampWatermarks: NERtcTimestampWatermarkConfig;
  /**
   * 图片水印，最多可以添加 4 个图片水印。
   */
  imageWatermarks: NERtcImageWatermarkConfig[];
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
  content: string;
  /**
   * 字体大小。默认值为 10，相当于 144 dpi 设备上的 10 x 15 磅。
   */
  fontSize: number;
  /**
   * 字体颜色。默认为白色。
   */
  fontColor: number;
  /**
   * 水印左上角与视频画布左上角的水平距离。单位为像素（pixel）。默认为 0。
   */
  offsetX: number;
  /**
   * 水印左上角与视频画布左上角的垂直距离。单位为像素（pixel）。默认为 0。
   */
  offsetY: number;
  /**
   * 水印框内背景颜色。默认为灰色。支持透明度设置。
   */
  wmColor: number;
  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmWidth: number;
  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmHeight: number;
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
  fontSize: number;
  /**
   * 字体颜色。默认为白色。
   */
  fontColor: number;
  /**
   * 水印左上角与视频画布左上角的水平距离。单位为像素（pixel）。默认为 0。
   */
  offsetX: number;
  /**
   * 水印左上角与视频画布左上角的垂直距离。单位为像素（pixel）。默认为 0。
   */
  offsetY: number;
  /**
   * 水印框内背景颜色。默认为灰色。支持透明度设置。
   */
  wmColor: number;
  /**
   * 水印框的宽度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmWidth: number;
  /**
   * 水印框的高度。单位为像素（pixel），默认值为 0，表示没有水印框。
   */
  wmHeight: number;
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
  imageUrls: string[];
  /**
   * 水印图片左上角与视频画布左上角的水平距离。单位为像素（pixel），默认值为 0。
   */
  offsetX: number;
  /**
   * 水印图片左上角与视频画布左上角的垂直距离。单位为像素（pixel），默认值为 0。
   */
  offsetY: number;
  /**
   * 水印图片的宽度。单位为像素（pixel），默认值为 0 表示按原始图宽。
   */
  wmWidth?: number;
  /**
   * 水印图片的高度。单位为像素（pixel），默认值为 0 表示按原始图高。
   */
  wmHeight?: number;
  /**
   * 播放帧率。默认 0 帧/秒，即不自动切换图片，图片单帧静态显示。
   */
  fps: number;
  /**
   * 是否设置循环。默认循环，设置为 false 后水印数组播放完毕后消失。
   */
  loop: boolean;
}

export interface NeRtcServerAddresses{
  /**
   * 获取通道信息服务器
   */
  channelServer?: string;
  /**
   * 统计上报服务器
   */
  statisticsServer?: string;
  /**
   * roomServer服务器
   */
  roomServer?: string;
  /**
   * mediaServer服务器
   */
  mediaServer?: string;
}
