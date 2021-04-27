/// <reference types="webrtc" />
import {
  NERtcCanvasWatermarkConfig,
  MediaType,
  RenderMode,
  ScreenProfileOptions,
  StreamOptions,
  SubscribeOptions,
  VideoProfileOptions,
  RecordStartOptions, RecordStatus
} from "./types";
/**
 * 请使用 [[WebRTC2.createStream]] 通过WEBRTC2.createStream创建
 */
declare interface Stream {
    /**
     *  获取音视频流 ID
     */
    getId(): number | null;
    /**
     * 设置视频订阅的参数。
     * @param subscribeOptions 配置参数
    */
    setSubscribeConfig(subscribeOptions: {
      /**
       * 是否订阅音频
       */
      audio?: boolean;
      /**
       * 是否订阅视频
       */
      video?: boolean;
      /**
       * 是否订阅屏幕共享
       */
      screen?: boolean;
      /**
       * 0是小流，1是大流
       */
      highOrLow?: number;
    }): void;
  /**
   * 获取音频流 MediaStream 对象，可用于自定义音频渲染。
   * 
   * 您可以自行渲染这个对象，例如将 audio dom 节点的 srcObject 属性设为该对象。
   * 
   * **注意**：使用自定义音频渲染功能时，应该在播放远端流时，关闭默认的音频渲染。
   *```JavaScript
   * remoteStream.play({
   *    audio: false,
   *    video: true
   * });
   * const audioStream = remoteStream.getAudioStream();
   * // audioDom为自行创建的DOM节点
   * audioDom.srcObject = audioStream;
   * ```
   */
  getAudioStream(): MediaStream| null;
    /**
     * 初始化音视频流对象
     */
    init(): Promise<void>;
    /**
     * 获取音频轨道
     */
    getAudioTrack(): MediaStreamTrack | null;
    /**
     * 获取视频轨道
     */
    getVideoTrack(): MediaStreamTrack | null | undefined;
    /**
     * 播放音视频流
     * @param view div标签，播放画面的dom容器节点
     * @param playOptions 播放的音视频选项。
     */
    play(view: HTMLElement | null, playOptions?: {
      /**
       * 是否播放音频流。默认播放本地音频流，不播放远端音频流。
       */
      audio?: boolean;
      /**
       * 是否播放视频流。默认播放视频流。
       */
      video?: boolean;
      /**
       * 是否播放视频流。默认播放视频流。
       */
      screen?: boolean;
    }): Promise<void>;
    /**
     * 设置本端视频画面大小
     * @param options 配置对象
     * @param mediaType 摄像头还是屏幕共享
     */
    setLocalRenderMode(options: RenderMode, mediaType?: MediaType): "INVALID_ARGUMENTS" | undefined;
    /**
     * 设置对端视频画面大小
     * @param options 配置对象
     * @param mediaType 摄像头还是屏幕共享
     */
    setRemoteRenderMode(options: RenderMode, mediaType?: MediaType): void;
    /**
     * 停止播放音视频流
     * @param mediaType 摄像头还是屏幕共享
     */
    stop(type?: MediaType): void;
    /**
     * 返回音视频流当前是否在播放状态
     * @param type 查看的媒体类型
     */
    isPlaying(type: MediaType): Promise<boolean>;
    /**
     * 打开音视频输入设备，如麦克风、摄像头、屏幕共享,并且发布出去
     * @param options 配置对象
     */
    open(options: {
      /**
       * 媒体设备: audio/video/screen
       */
        type: MediaType;
      /**
       * 指定要开启的设备ID，通过getDevices接口获取到设备列表
       */
      deviceId?: string;
      /**
       * Electron 屏幕共享的数据源 ID，您可以自行获取。
       */
      sourceId?: string;
    }): Promise<undefined>;
    /**
     * 关闭音视频输入设备，如麦克风、摄像头、屏幕共享，并且停止发布
     * @param {Object} options 配置对象
     */
    close(options: {
      /**
       * 媒体设备: audio/video/screen
       */
        type: MediaType;
    }): Promise<undefined>;
    /**
     * 启用音频轨道
     */
    unmuteAudio(): Promise<void>;
    /**
     * 禁用音频轨道
     */
    muteAudio(): Promise<void>;
    /**
     * 当前Stream是否有音频
     */
    hasAudio(): boolean;
    /**
     * 当前从麦克风中采集的音量
     */
    getAudioLevel(): string;
    /**
     * 设置音频属性
     * @param profile 要设置的音频的属性：
     * * speech_low_quality（表示16 kHz 采样率，单声道，编码码率约 24 Kbps）
     * * speech_standard'（表示32 kHz 采样率，单声道，编码码率约 24 Kbps）
     * * music_standard（表示48 kHz 采样率，单声道，编码码率约 40 Kbps）
     * * standard_stereo（表达48 kHz 采样率，双声道，编码码率约 64 Kbps）
     * * high_quality（表示48 kHz 采样率，单声道， 编码码率约 128 Kbps）
     * * high_quality_stereo（表示48 kHz 采样率，双声道，编码码率约 192 Kbps）
     */
    setAudioProfile(profile: string): void;
    /**
     * 设置音频播放的音量。
     * @param volume 要设置的远端音频的播放音量，范围为 0（静音）到 100（声音最大）
     */
    setAudioVolume(volume?: number): string | undefined;
    /**
     * 设置麦克风采集的音量。
     * @param volume 要设置的麦克风采集音量。，范围为 0（静音）到 100（声音最大）
     */
    setCaptureVolume(volume: number): string | undefined;
    /**
     * 设置音频输出设备，可以在耳机和扬声器之间切换。在播放订阅流之前或之后都可以调用该方法。
     * 目前只有 Chrome 浏览器支持该方法。
     * @param deviceId 设备的 ID,可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
     */
    setAudioOutput(deviceId: string, callback: (err: any) => void): Promise<void>;
    /**
     * 切换媒体输入设备，已经发布的流，切换后不用重新发流
     * @param {String} type 设备的类型
     * * "audio": 音频输入设备
     * * "video": 视频输入设备
     * @param deviceId 设备的 ID,可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
     */
    switchDevice(type: string, deviceId: string): Promise<void>;
    /**
     * 启用视频轨道
     */
    unmuteVideo(): Promise<void>;
    /**
     * 禁用视频轨道
     */
    muteVideo(): Promise<void>;
    /**
     * 启用视频轨道
     */
    unmuteScreen(): Promise<void>;
    /**
     * 禁用视频轨道
     */
    muteScreen(): Promise<void>;
    /**
     * 获取视频 flag
     */
    hasVideo(): boolean;
    /**
    * 设置视频属性。
    * @param options 配置参数
   */
    setVideoProfile(options: VideoProfileOptions): void;
    hasScreen(): boolean;
    /**
     * 设置屏幕共享属性。
     * @param {Object} options 配置参数
    */
    setScreenProfile(profile: ScreenProfileOptions): void;
    adjustResolution(MediaType: MediaType): void;
    /**
     * 截取指定用户的视频流画面。
     * 
     * 截图文件保存在浏览器默认路径下。
     * 
     * @note
     * - 本地视频流截图，需要在 Client.join 并 Client.publish 发布流成功之后调用。
     * - 远端视频流截图，需要在  Client.subscribe 订阅远端视频流之后调用。
     * - 同时设置文字、时间戳或图片水印时，如果不同类型的水印位置有重叠，会按照图片、文本、时间戳的顺序进行图层覆盖。
     */
    takeSnapshot(options: {
      /**
       * 用户 ID。
       */
      uid: number;
      /**
       * 截图文件名称，默认格式为 uid-1。
       */
      name: string;
      /**
       * 截图的视频流类型。支持设置为主流或辅流。
       */
      mediaType?: MediaType;
    }): Promise<"INVALID_OPERATION" | undefined>;
    /**
     * 开启单人视频录制
     * @param mediaRecordingOptions 参数对象
     */
    startMediaRecording(mediaRecordingOptions: {
      /**
       * 如果是自己流录制，'audio','video'或'screen'
       */
      type: string;
      /**
       * 如果之前的录制视频未下载，是否重置，默认false
       */
      reset: boolean;
    }): Promise<string | undefined>;
    /**
     * 结束视频录制
     * @param options 参数对象
     */
    stopMediaRecording(options: {
      /**
       * 录制id，可以通过listMediaRecording接口获取
       */
        recordId?: string;
    }): Promise<unknown>;
    /**
     * 播放视频录制
     * @param options 参数对象
     */
    playMediaRecording(options: {
      /**
       * 录制id，可以通过listMediaRecording接口获取
       */
        recordId: string;
      /**
       * 音频或者视频画面待渲染的DOM节点，如div、span等非流媒体节点
       */
      view: HTMLElement;
    }): Promise<void>;
    /**
     * 枚举录制的音视频
     */
    listMediaRecording(): {
        id: number;
        type: string;
        name: string | null;
        status: string;
        isRecording: boolean;
        startTime: number | null;
        endTime: number | null;
    }[];
    /**
     * 清除录制的音视频
     * @param options 参数对象
     */
    cleanMediaRecording(options: {
      /**
       * 录制id，可以通过listMediaRecording接口获取
       */
        recordId: string;
    }): Promise<void>;
    /**
     * 下载录制的音视频
     * @param options 参数对象
     */
    downloadMediaRecording(options: {
      /**
       * 录制id，可以通过listMediaRecording接口获取
       */
        recordId: string;
    }): Promise<RecordStatus>;
    /**
     * 云端音乐文件和本地麦克风声音混合；需要在启动麦克风之后使用
     * @param options 参数对象
     */
    startAudioMixing(options: {
      /**
       * 必须，云端音频文件路径
       */
      audioFilePath: string;
      /**
       * 可选，是否替换麦克风采集的音频数据，缺省为false
       */
      replace: boolean;
      /**
       * 可选，循环的次数，需要loopback参数置为true（如果想无限循环，cycle设置为0，loopback设置为true），缺省为0，如果loopback为true，表示无限循环，如果loopback为false，该参数不生效
       */
      cycle: number;
      /**
       * 可选，设置音频文件开始播放的位置，单位为 s。缺省设为 0，即从头开始播放
       */
      playStartTime: number;
      /**
       * 可选，设置伴音文件的音量
       */
      volume?: number;
      /**
       * 可选，伴音文件播放完成的通知反馈（正常停止伴音或关掉通话获取其他原因停止伴音不会触发）
       */
      auidoMixingEnd: (() => void) | null;
      /**
       * 是否循环播放，缺省为false，表示播放一次就结束（这里如果是false，则cycle参数不生效）
       */
      loopback: boolean;
    }): Promise<unknown> | undefined;
    /**
     * 停止播放伴奏
     */
    stopAudioMixing(): Promise<void>;
    /**
     * 暂停播放伴奏
     */
    pauseAudioMixing(): Promise<void> | null | undefined;
    /**
     * 恢复播放伴奏
     */
    resumeAudioMixing(): Promise<void> | undefined;
    /**
     * 调节伴奏音量
     */
    adjustAudioMixingVolume(volume: number): Promise<void> | null | undefined;
    /**
     * 获取伴奏时长
     */
    getAudioMixingDuration(): Promise<void>;
    /**
     * 获取伴奏播放进度
     * @function getAudioMixingCurrentPosition
     */
    getAudioMixingCurrentPosition(): Promise<void>;
    /**
     * 设置伴奏音频文件的播放位置。可以根据实际情况播放文件，而不是非得从头到尾播放一个文件,单位为ms
     * @param playStartTime 伴音播放的位置
     */
    setAudioMixingPosition(playStartTime: number): Promise<unknown>;
    /**
     * 添加视频画布水印。
     * 
     * @note setCanvasWatermarkConfigs 方法作用于本地视频画布，不影响视频流。视频流截图时，图片中不包含水印。
     * 
     * @param options 画布水印设置。支持设置文字水印、图片水印和时间戳水印，设置为 null 表示清除水印。
     */
    setCanvasWatermarkConfigs(options: NERtcCanvasWatermarkConfig): void;
    /**
     *  销毁实例
     */
    destroy(): void;
    
    /**
     * 获取设备权限被拒绝。
     */
    on(event: "accessDenied", callback: (
      mediaType: "audio"|"video"
    ) => void): void;
  
    /**
     * 获取麦克风或摄像头权限时，无法找到指定设备
     */
    on(event: "notFound", callback: (
      mediaType: "audio"|"video"
    ) => void): void;

    /**
     * 获取麦克风或摄像头权限时，遭遇未知错误错误
     */
    on(event: "deviceError", callback: (
      mediaType: "audio"|"video"
    ) => void): void;

    /**
     * 获取麦克风或摄像头权限时，设备被占用
     */
    on(event: "beOccupied", callback: (
      mediaType: "audio"|"video"
    ) => void): void;

    

}
export { Stream };
