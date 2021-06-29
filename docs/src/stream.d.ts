/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

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
 * 请使用 [[NERTC.createStream]] 通过NERTC.createStream创建
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
      /**
       * 指定屏幕共享时是否共享本地播放的背景音。仅在未开启音频且 type 为 screen 时有效。详细说明请参考 [[StreamOptions.screenAudio]]。
       */
      screenAudio?: boolean;
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
     * 开始播放音乐文件。
     * 
     * - 该方法指定在线音频文件和麦克风采集的音频流进行混音或替换，即用音频文件替换麦克风采集的音频流。
     * @note 请在加入房间并启动麦克风之后使用该方法。
     * @param options 混音设置。
     */
    startAudioMixing(options: {
      /**
       * 必选，在线音乐文件的 URL 地址。
       * 
       * @note 目前仅支持在线音频文件，格式一般为 MP3 等浏览器支持的音频文件类型。
       */
      audioFilePath: string;
      /**
       * 可选，是否要用音频文件替换本地音频流。
       * - true：音频文件内容将会替换本地录音的音频流。
       * - false：（默认值）音频文件内容将会和麦克风采集的音频流进行混音。
       */
      replace: boolean;
      /**
       * 可选，指定音频文件循环播放的次数。
       * @note
       * - 通过 cycle 指定循环播放次数时，需要同时指定 loopback 参数置为 true。如果 loopback 为 false，该参数不生效。
       * - cycle 默认为 0，表示无限循环播放，直至调用 stopAudioMixing 后停止。
       */
      cycle: number;
      /**
       * 可选，设置音频文件开始播放的时间位置，单位为秒（s）。默认为 0，即从头开始播放。
       */
      playStartTime: number;
      /**
       * 可选，音乐文件的播放音量，取值范围为 0~100。默认为 100，表示使用文件的原始音量。
       * @note 若您在通话中途修改了音量设置，则当前通话中再次调用时默认沿用此设置。
       */
      volume?: number;
      /**
       * 可选，伴音文件播放完成的通知反馈。正常停止伴音或关掉通话获取其他原因停止伴音不会触发。
       */
      auidoMixingEnd: (() => void) | null;
      /**
       * 是否循环播放音频文件，默认为 false。
       * - true：循环播放音频文件。此时可通过 cycle 设置循环播放次数，cycle 默认为 0，表示无限循环播放。
       * - false：（默认值）关闭无限循环播放。
       */
      loopback: boolean;
    }): Promise<unknown> | undefined;
    /**
     * 停止播放音乐文件。
     * 
     * 请在房间内调用该方法。
     */
    stopAudioMixing(): Promise<void>;
    /**
     * 暂停播放音乐文件。
     * 
     * 请在房间内调用该方法。
     */
    pauseAudioMixing(): Promise<void> | null | undefined;
    /**
     * 恢复播放音乐文件。
     * 
     * 请在房间内调用该方法。
     */
    resumeAudioMixing(): Promise<void> | undefined;
    /**
     * 调节音乐文件音量。
     * 
     * 该方法调节混音里伴奏的播放音量大小。请在房间内调用该方法。
     * 
     * @param volume 伴奏发送音量。取值范围为 0~100。默认 100，即原始文件音量。
     */
    adjustAudioMixingVolume(volume: number): Promise<void> | null | undefined;
    /**
     * 获取音乐文件时长。
     * 
     * 该方法获取伴奏时长，单位为毫秒。请在房间内调用该方法。
     * 
     * @returns 方法调用成功返回音乐文件时长，单位为毫秒（ms）。
     * 
     */
    getAudioMixingDuration(): Promise<void>;
    /**
     * 获取音乐文件当前播放进度。
     * 
     * 该方法获取当前伴奏播放进度，单位为毫秒。请在房间内调用该方法。
     * 
     * @returns 方法调用成功返回音乐文件播放进度。
     */
    getAudioMixingCurrentPosition(): Promise<void>;
    /**
     * 设置音乐文件的播放位置。
     * 
     * 该方法可以设置音频文件的播放位置，这样你可以根据实际情况播放文件，而非从头到尾播放整个文件。
     * @param playStartTime 音乐文件的播放位置，单位为毫秒。
     */
    setAudioMixingPosition(playStartTime: number): Promise<unknown>;
    /**
     * 播放指定音效文件。
     * - 支持的音效文件类型包括 MP3，AAC 等浏览器支持的其他音频格式。仅支持在线 URL。
     * - playEffect 与 startAudioMixing 方法的区别在于，该方法更适合播放较小的音效文件，且支持同时播放多个音效。
     * @since V4.3.0
     * @note
     *    - 请在 publish 音频之后调用该方法。
     *    - 您可以多次调用该方法，通过传入不同的音效文件的 soundId 和 filePath，同时播放多个音效文件，实现音效叠加。为获得最佳用户体验，建议同时播放的音效文件不超过 3 个。
     * 
     * @return 可能返回的错误码：
         - ""BROWSER_NOT_SUPPORT: 不支持的浏览器类型。
         - "INVALID_OPERATION"：非法操作，详细原因请查看日志，通常为状态错误。
         - "No MediaHelper": localStream 没有 init() 初始化，无法使用音效功能。 
         - "Stream.playEffect:soundId"：soundId 参数格式错误。
         - "Stream.playEffect:filePath"：filePath 参数格式错误。
         - "Stream.playEffect:cycle"：cycle 参数格式错误。
     */
         playEffect (options: {
          /**
           * 必选。指定在线音效文件的 URL地址。
           * 
           * 支持的音效文件类型包括 MP3，AAC 等浏览器支持的其他音频格式。
           */
          filePath: string;
          /**
           * 可选，指定音效文件循环播放的次数。默认值为 1，即播放 1 次。
           */
          cycle: number;
          /**
           * 必选，指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
           * 
           * 如果您已通过 preloadEffect 将音效加载至内存，确保 playEffect 的 soundID 与 preloadEffect 设置的 soundID 相同。
           */
          soundId: number;
        }) : Promise<unknown>    
    /**
     * 停止播放指定音效文件。
     * @since V4.3.0
     * @note 请在频道内调用该方法。
     * @return 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.playEffect:soundId"：soundId参数格式错误
         
     * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     */
    stopEffect (soundId: number) : Promise<unknown>
    /**
     * 暂停播放指定音效文件。
     * @since V4.3.0
     * 
     * @note 请在频道内调用该方法。
     * 
     * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     * @return {Promise}
     * 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "SOUND_NOT_EXISTS": soundId指定的音效文件不存在
         - "INVALID_OPERATION"：非法操作，可以通过console日志查看原因，一般是状态不对
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.pauseEffect:soundId"：soundId参数格式错误  
     * 
     */
    pauseEffect (soundId: number) : Promise<unknown>
    /**
     * 恢复播放指定音效文件。
     * 
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * @return 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.resumeEffect :soundId": soundId 参数格式错误
     * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     * @return {Promise}
     */
    resumeEffect (soundId: number) : Promise<unknown>
    /**
     * 调节指定音效文件的音量。
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * 
     * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认为 100，即原始文件音量。
     * @return {Promise} 
     * 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.setVolumeOfEffect:soundId": 参数格式错误
         - "Stream.setVolumeOfEffect:volume": 参数格式错误 
     */
    setVolumeOfEffect (soundId: number) : Promise<unknown>
    /**
     * 预加载指定音效文件。
     * 
     * 该方法缓存音效文件，以供快速播放。为保证通信畅通，请注意控制预加载音效文件的大小。
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * 
     * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     * @param {String} filePath 必选。指定在线音效文件的绝对路径。支持MP3、AAC 以及浏览器支持的其他音频格式。
     * @return {Object} 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.preloadEffect:filePath": 参数格式错误
         - "Stream.preloadEffect:soundId": 参数格式错误 
     */
    preloadEffect(soundId: number, filePath: string): Promise<unknown>
    /**
     * 释放指定音效文件。
     * 
     * 该方法从内存释放某个预加载的音效文件，以节省内存占用。
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * 
     * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     * @return {Object} 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "SOUND_NOT_EXISTS": soundId指定的音效文件不存在
         - "INVALID_OPERATION": 非法操作，可以查看console日志得到原因，一般是状态原因，如此时应处于播放、暂停状态，不能使用
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.unloadEffect:soundId": 参数格式错误
     */
    unloadEffect (soundId: number): Promise<unknown>
    /**
     * 获取所有音效文件播放音量。
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * @return 可能返回的错误码：
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
     * @return Array<{ soundId: number; volume: number }>
     * 返回一个包含 soundId 和 volume 的数组。每个 soundId 对应一个 volume。
        + `soundId`: 为音效的 ID，正整数，取值范围为 [1,10000]。
        + `volume`: 为音量值，整数，范围为 [0,100]。
     */
        getEffectsVolume(): Array<{ soundId: number; volume: number }> 
    /**
     * 设置所有音效文件播放音量。
     * 
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认 100 为原始文件音量。
     * @return {void} 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "Stream.setEffectsVolume:volume": volume 参数格式错误
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
     */
    setEffectsVolume (volume: number): void;
    /**
     * 停止播放所有音效文件。
     * 
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * @return {Promise} 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.playEffect:soundId"：soundId参数格式错误
     */
         stopAllEffects(): Promise<unknown>
    /**
     * 暂停播放所有音效文件。
     * @note 请在频道内调用该方法。
     * @since V4.3.0
     * @return 可能返回的错误码：
         - "BROWSER_NOT_SUPPORT": 浏览器不支持
         - "SOUND_NOT_EXISTS": soundId指定的音效文件不存在
         - "INVALID_OPERATION"：非法操作，可以通过console日志查看原因，一般是状态不对
         - "No MediaHelper": localStream没有init()初始化,无法使用音效功能 
         - "Stream.pauseEffect:soundId"：soundId参数格式错误
     * @return {Promise}
     */
         pauseAllEffects(): Promise<unknown> 
    /**
     * 恢复播放所有音效文件。
     * @note
     * - 请在频道内调用该方法。
     * - 可能返回的错误码同 resumeEffect 一致
     * 
     * @since V4.3.0
     * @return {Promise}
     */
     resumeAllEffects(): Promise<unknown>
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
