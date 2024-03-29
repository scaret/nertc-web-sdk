/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

/// <reference types="webrtc" />
import {
  NERtcCanvasWatermarkConfig,
  MediaType,
  RenderMode,
  BeautyFilters,
  pluginOptions,
  BasicBeautyResConfig,
  AdvBeautyResConfig,
  AdvBeautyEffects,
  AdvBeautyPreset,
  BackGroundOptions,
  RecordStatus,
  STREAM_TYPE,
  NERtcEncoderWatermarkConfig
} from './types'
/**
 * 音视频流对象。
 *
 * Stream 接口提供的方法用于定义音视频流对象的行为，例如流的播放控制、音视频的编码配置等。
 *
 * 您可以使用 [[NERTC.createStream]] 创建音视频流对象。 一个 Stream 对象指通话中发布的本地音视频流或订阅的远端音视频流。
 */
declare interface Stream {
  /**
   *  获取音视频流 ID。
   *
   * @example
   * ```Javascript
   * let uid = stream.getId()
   * ```
   */
  getId(): number | string | null
  /**
   * 设置视频订阅的参数。
   *
   * 注意：
   * * 如果您想取消订阅远端所有媒体，应使用 [[Client.unsubscribe]]
   * * 如果您在已经订阅了远端的视频大流的情况下，想实时切换为小流，应使用[[Client.setRemoteStreamType]]
   * * 参数 highOrLow中，0 表示大流，1 表示小流。默认为大流。为了保持代码清晰，建议使用常量 `NERTC.STREAM_TYPE.HIGH` 和 `NERTC.STREAM_TYPE.LOW`指定。
   * * 如果您想取消订阅远端的音频，但是保持视频不变，则应该设audio为false，video不设（见例子2）
   * @example
   * ```
   * // 例子1：订阅大流
   * rtc.client.on("stream-added", (evt)=>{
   *   console.log(`远端${evt.stream.getId()}发布了 ${evt.mediaType} 流`)
   *   evt.stream.setSubscribeConfig({
   *     audio: true,
   *     audioSlave: true,
   *     video: true,
   *     screen: true,
   *     highOrLow: NERTC.STREAM_TYPE.HIGH
   *   })
   *   rtc.client.subscribe(evt.stream)
   * });
   *
   * // 例子2：在音视频已经订阅的情况下，仅取消订阅音频
   * remoteStream.setSubscribeConfig({audio: false});
   * rtc.client.subscribe(remoteStream)
   * ```
   *
   */
  setSubscribeConfig(subscribeOptions: {
    /**
     * 是否订阅音频。
     */
    audio?: boolean
    /**
     * 是否订阅音频辅流。
     */
    audioSlave?: boolean
    /**
     * 是否订阅视频。
     */
    video?: boolean
    /**
     * 是否订阅屏幕共享。
     */
    screen?: boolean
    /**
     * 订阅大流或小流。
     *
     * 0 表示大流，1 表示小流。默认为大流。
     * 可以使用常量 `NERTC.STREAM_TYPE.HIGH` 和 `NERTC.STREAM_TYPE.LOW`指定
     */
    highOrLow?: STREAM_TYPE
  }): void

  /**
   * 获取音频流 MediaStream 对象，可用于自定义音频渲染。
   *
   * 您可以自行渲染这个对象，例如将 audio dom 节点的 srcObject 属性设为该对象。
   *
   * @note 使用自定义音频渲染功能时，应该在播放远端流时，关闭默认的音频渲染。
   *
   * @example
   * ```JavaScript
   * remoteStream.play({
   *    audio: false,
   *    video: true
   * });
   * const audioStream = remoteStream.getAudioStream();
   * // audioDom为自行创建的DOM节点
   * audioDom.srcObject = audioStream;
   * ```
   */
  getAudioStream(): MediaStream | null
  /**
   * 初始化音视频流对象。
   *
   * 该方法用于初始化本地创建的音视频流对象。
   *
   * @example
   * ```JavaScript
   * await localStream.init();
   * ```
   */
  init(): Promise<void>
  /**
   * 获取音频轨道。
   * 默认获取主流音频轨道（麦克风）
   *
   * @example
   * ```JavaScript
   * let audioTrack = stream.getAudioTrack('audio')
   * ```
   */
  getAudioTrack(mediaType?: 'audio' | 'audioSlave'): MediaStreamTrack | null
  /**
   * 获取视频轨道。
   * 默认获取主流视频轨道（摄像头）
   *
   *  @example
   * ```JavaScript
   * let audioTrack = localStream.getVideoTrack('video')
   * ```
   *
   */
  getVideoTrack(mediaType?: 'video' | 'screen'): MediaStreamTrack | null | undefined
  /**
   * 播放音视频流。
   *
   * @param view div 标签，播放画面的 dom 容器节点。
   * @param playOptions 播放的音视频选项。
   *
   * @note 注意
   * * 采用自定义视频输入时，部分 safari 版本不支持播放 CanvasCaptureMediaStreamTrack，请升级系统。详见 [https://bugs.webkit.org/show_bug.cgi?id=181663](https://bugs.webkit.org/show_bug.cgi?id=181663)
   *
   * @example
   * ```javascript
   *    // 本地流
   *    // 在await rtc.localStream.init之后
   *    await rtc.localStream.init();
   *    rtc.localStream.play(document.getElementById("local-video-wrapper"), {
   *      audio: false,
   *      audioSlave: false,
   *      video: true,
   *      screen: true,
   *    });
   *    rtc.localStream.setLocalRenderMode({
   *      width: 200,
   *      height: 200,
   *      cut: false
   *    });
   *
   *    // 远端流
   *    // 在stream-subscribed之后
   *    rtc.client.on("stream-subscribed", (evt)=>{
   *        evt.stream.play(document.getElementById("remote-video-wrapper", {
   *          audio: true,
   *          audioSlave: true,
   *          video: true,
   *          screen: true,
   *        });
   *        evt.stream.setRemoteRenderMode({
   *          width: 200,
   *          height: 200
   *          cut: false
   *        });
   *    })
   * ```
   */
  play(
    view: HTMLElement,
    playOptions?: {
      /**
       * 是否播放音频流。
       *
       * 默认播放不本地音频流，播放远端音频流。
       */
      audio?: boolean
      /**
       * 是否播放音频辅流。
       *
       * 默认不播放本地音频辅流，播放远端音频辅流。
       */
      audioSlave?: boolean
      /**
       * 是否播放视频流。
       *
       * 默认播放视频流。
       */
      video?: boolean
      /**
       * 是否播放辅流。
       *
       * 默认播放辅流。
       *
       * 主流和辅流可在不同画布上播放。需调用play两次，即:
       * ```javascript
       *   localStream.play(videoContainer, {video: true, screen: false});
       *   localStream.play(screenContainer, {video: false, screen: true});
       * ```
       */
      screen?: boolean
    }
  ): Promise<void>

  /**
   * 监测到自动播放受限后，重新播放音视频流。
   *
   * @example
   * ```javascript
   *    // 在监听到 notAllowedError (自动播放受限)之后调用 resume 可以恢复播放
   *    rtc.client.on('notAllowedError', err => {
   *      const errorCode = err.getCode();
   *      if(errorCode === 41030){
   *        await remoteStream.resume();
   *      }
   *     })
   * ```
   */
  resume(): Promise<void>

  /**
   * 设置本地视频画布。
   *
   * 该方法设置本地视频画布。只影响本地用户看到的视频画面，不影响远端。
   *
   * 例子见[[Stream.play]]。
   * @param options 配置对象。
   * @param mediaType 媒体流类型。即指定设置的是摄像头画面还是屏幕共享画面。
   *
   * @example
   * ```javascript
   *  localStream.setLocalRenderMode({
   *    width: 200,
   *    height: 200,
   *    cut: false
   *  });
   * ```
   *
   */
  setLocalRenderMode(
    options: RenderMode,
    mediaType?: 'video' | 'screen'
  ): 'INVALID_ARGUMENTS' | undefined
  /**
   * 设置远端视频画布。
   *
   * 该方法绑定远端用户和显示视图，只影响本地用户看到的视频画面。退出房间后，SDK 会清除远端用户和视图的绑定关系。
   *
   * 例子见[[Stream.play]]。
   * @param options 配置对象。
   * @param mediaType 媒体流类型。即指定设置的是摄像头画面还是屏幕共享画面。
   *
   * @example
   * ```javascript
   *  remoteStream.setRemoteRenderMode({
   *    width: 200,
   *    height: 200,
   *    cut: false
   *  });
   * ```
   */
  setRemoteRenderMode(options: RenderMode, mediaType?: 'video' | 'screen'): void
  /**
   * 停止音视频流。
   *
   * 该方法用于停止播放 Stream.play 播放的音视频流。
   * @param mediaType 媒体流类型。即指定设置的是摄像头画面还是屏幕共享画面。
   * @example
   * ```javascript
   * // 对于本地流，在 rtc.localStream.play() 后
   * rtc.localStream.stop("video") //停止播放视频
   * // 或者
   * rtc.localStream.stop() //停止播放音频+视频+屏幕共享
   *
   * // 对于远端流，在 stream-removed 后
   * rtc.client.on("stream-removed", (evt)=>{
   *   console.log("远端移除了媒体类型：", evt.mediaType)
   *   evt.stream.stop(evt.mediaType)
   * })
   *
   * ```
   *
   */
  stop(type?: MediaType): void
  /**
   * 返回音视频流当前是否可以播放。
   * 该API用于辅助判断当前流的状态，即：是否可以播放，为什么不能播放
   *
   * @param type 媒体流类型。
   * @return
   *  - result：当前是否可以播放。如为true，则可以调用 [[Stream.play]]
   *  - reason：如果当前流不能播放，则不能播放的原因是什么。包括：
   *    - `NOT_PUBLISHED`: 远端没有发布该媒体
   *    - `NOT_SUBSCRIBED`: 还没有订阅远端流
   *    - `CONSUME_START`: 正在订阅远端流中
   *    - `NOT_OPENED`: 本地流没有打开
   *    - `ENDED`: 本地流已结束（如设备被拔出）
   *    - `MUTED`: 本地流在黑屏状态，通常是调用了mute()，或者本地多次获取媒体导致当前媒体在异常状态。
   *    - `PAUSED`: 上一次播放行为在暂停状态，通常是上一次调用play()的行为受到了自动播放策略影响。
   *
   * @example
   * ```Javascript
   * let result = localStream.canPlay('video')
   * ```
   */
  canPlay(type: MediaType): { result: boolean; reason: string }
  /**
   * 返回音视频流当前是否在播放状态。
   * @param type 媒体流类型。
   * @return
   *  - true：该音视频流正在渲染或播放。
   *  - false：该音视频流没有渲染。
   *
   *  @example
   * ```Javascript
   *  let result = await rtc.localStream.isPlaying('audio')
   * ```
   */
  isPlaying(type: MediaType): boolean
  /**
   * 打开音视频输入设备，如麦克风、摄像头、屏幕共享，并且发布出去。
   *
   * 代码示例可见[[Stream.switchDevice]]
   *
   * @param options 配置对象。
   */
  open(options: {
    /**
     * 媒体流类型，即 audio、video 或 screen。
     *
     * 注意，Safari on MacOS 的屏幕共享需手势触发，且无法选择共享的屏幕、无法单独共享应用、无法共享音频。
     *
     */
    type: MediaType
    /**
     * 指定要开启的设备ID。
     *
     * 您可以通过 getDevices 接口获取设备列表。
     */
    deviceId?: string
    /**
     * Electron 屏幕共享的数据源 ID，您可以自行获取。
     */
    sourceId?: string
    /**
     * 指定屏幕共享时是否共享本地播放的背景音。
     *
     * 仅在 type 为 screen 时有效。详细说明请参考 [[StreamOptions.screenAudio]]。
     *
     * 在V4.4.0之前，麦克风和屏幕共享音频不能同时开启。
     */
    screenAudio?: boolean
    /**
     * 自定义音频的track。type 为 audio 时生效。
     *
     * @since V4.6.0
     */
    audioSource?: MediaStreamTrack
    /**
     * 自定义视频的track。type 为 video 时生效。
     *
     * @since V4.6.0
     */
    videoSource?: MediaStreamTrack
    /**
     * 自定义屏幕共享视频的track。type 为 screen 时生效。
     *
     * @since V4.6.0
     */
    screenVideoSource?: MediaStreamTrack
    /**
     * 自定义屏幕共享音频的track。type 为 screen 且 screenAudio 为 true 时生效。
     *
     * @since V4.6.0
     */
    screenAudioSource?: MediaStreamTrack
    /**
     * 调用 open 接口时，是否进行 publish
     *
     * 若为 false，则不进行 publish；若为 true 或者不填，则进行 publish。
     *
     *
     * @since V5.4.0
     */
    enableMediaPub?: boolean
  }): Promise<undefined>
  /**
   * 关闭音视频输入设备，如麦克风、摄像头、屏幕共享，并且停止发布。
   *
   * @example
   * ```
   *  // 例如，关闭屏幕共享
   *  rtc.localStream.close({ type: "screen"});
   * ```
   * @param {Object} options 配置对象
   */
  close(options: {
    /**
     * 媒体流类型，即 audio、video、 screen 或 screenAudio。
     */
    type: 'audio' | 'video' | 'screen' | 'screenAudio'
  }): Promise<undefined>
  /**
   * 启用音频轨道。
   *
   * @example
   * ```Javascript
   *  await stream.unmuteAudio()
   * ```
   */
  unmuteAudio(): Promise<void>
  /**
   * 禁用音频轨道。
   *
   * @example
   * ```Javascript
   *  await stream.muteAudio()
   * ```
   */
  muteAudio(): Promise<void>
  /**
   * 启用音频辅流轨道。
   *
   * @example
   * ```Javascript
   *  await stream.unmuteAudioSlave()
   * ```
   */
  unmuteAudioSlave(): Promise<void>
  /**
   * 禁用音频辅流轨道。
   *
   * @example
   * ```Javascript
   *  await stream.muteAudioSlave()
   * ```
   */
  muteAudioSlave(): Promise<void>
  /**
   * 获取音频 flag。
   *
   * 该方法用于确认当前音视频流对象（Stream）中是否包含音频资源。
   *
   * @note 该方法仅对本地流有效。
   *
   * @example
   * ```Javascript
   * let result = localStream.hasAudio()
   * ```
   *
   * @return
   * - true: 该音视频流对象中包含音频资源。
   * - false: 该音视频流对象中不包含音频资源。
   */
  hasAudio(): boolean
  /**
   * 获取音频辅流 flag。
   *
   * 该方法用于确认当前音视频流对象（Stream）中是否包含音频辅流资源。
   *
   * @note 该方法仅对本地流有效。
   *
   *  @example
   * ```Javascript
   * let result = localStream.hasAudioSlave()
   * ```
   *
   * @return
   * - true: 该音视频流对象中包含音频辅流资源。
   * - false: 该音视频流对象中不包含音频辅流资源。
   */
  hasAudioSlave(): boolean
  /**
   * 获取当前音量。
   *
   * @note 注意
   * * 该音量的取值范围为 0 - 1
   * * Safari 浏览器的桌面端14.1以下、iOS端14.5以下，不支持获取音量
   * * 从 v4.6.25开始，该接口也支持远端。远端音量可通过 mediaType 指定获取主流音量或辅流音量。本地音量不支持mediaType
   * * 目前发现 Chrome 104 以上版本获取音量会引发内存泄漏。该问题源于Chrome浏览器RTCPeerConnection与AudioWorkletNode协作时引发，目前无法回避。如有长时间通话需求，应避免使用该方法。
   *
   * @example
   * ```Javascript
   *  let audioLevel = stream.getAudioLevel()
   * ```
   */
  getAudioLevel(mediaType?: 'audio' | 'audioSlave'): number
  /**
   * 设置音频属性。
   *
   * @param profile 要设置的音频的属性类型，可设置为：
   * * speech_low_quality（表示16 kHz 采样率，单声道，编码码率约 24 Kbps）
   * * speech_standard（表示32 kHz 采样率，单声道，编码码率约 24 Kbps）
   * * music_standard（表示48 kHz 采样率，单声道，编码码率约 40 Kbps）
   * * standard_stereo（表达48 kHz 采样率，双声道，编码码率约 64 Kbps）
   * * high_quality（表示48 kHz 采样率，单声道， 编码码率约 128 Kbps）
   * * high_quality_stereo（表示48 kHz 采样率，双声道，编码码率约 192 Kbps）
   *
   * @example
   * ```Javascript
   *  localStream.setAudioProfile('speech_low_quality')
   * ```
   */
  setAudioProfile(profile: string): void
  /**
   * 设置音频播放的音量。
   * @param volume 要设置的远端音频的播放音量，范围为 [0-100]。0 表示静音。
   *
   * @note 注意
   * 由于系统限制，ios上目前不支持设置远端音频音量。
   *
   * @example
   * ```Javascript
   *  stream.setAudioVolume(50)
   * ```
   */
  setAudioVolume(volume?: number): string | undefined
  /**
   * 设置音频辅流播放的音量。
   * @param volume 要设置的远端音频辅流的播放音量，范围为 [0-100]。0 表示静音。
   *
   * @note 注意
   * 由于系统限制，ios上目前不支持设置远端音频辅流音量。
   *
   * @example
   * ```Javascript
   *  remoteStream.setAudioSlaveVolume(50)
   * ```
   */
  setAudioSlaveVolume(volume?: number): string | undefined
  /**
   * 设置麦克风采集的音量。
   * @param volume 要设置的采集音量。范围为 [0-100]。0 表示静音。
   * @param mediaTypeAudio 要设置的采集类型。可分开设置麦克风与屏幕共享音频。如您未使用屏幕共享音频功能，则忽略该参数。
   *
   *  @example
   * ```Javascript
   * // 设置采集值为 50 的麦克风音量
   *  localStream.setCaptureVolume(50, 'microphone')
   * ```
   */
  setCaptureVolume(
    volume: number,
    mediaTypeAudio?: 'microphone' | 'screenAudio'
  ): string | undefined
  /**
   * 设置订阅流的音频输出设备。
   *
   * 该方法可以在语音场景下设置订阅流的音频输出设备，在通话时切换扬声器。在播放订阅流之前或之后都可以调用该方法。
   *
   * @note
   * - 在播放订阅流之前或之后都可以调用该方法。
   * - 目前只有 Chrome 浏览器支持该方法。
   * - [由于Chrome的限制](https://groups.google.com/g/discuss-webrtc/c/vrw44ZGE0gs/m/2YJ6yUEjBgAJ)，所有远端流会共享同一个音频输出设备。
   *
   * @param deviceId 设备的 ID，可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
   *
   * @example
   * ```javascript
   * const audioOutputDevice = (await NERTC.getSpeakers())[0]
   * console.log("设置扬声器为", audioOutputDevice.label, audioOutputDevice.deviceId)
   * remoteStream.setAudioOutput(audioOutputDevice.deviceId)
   * ```
   *
   */
  setAudioOutput(deviceId: string, callback?: (err: any) => void): Promise<void>
  /**
   * 切换媒体输入设备。
   *
   * 该方法用于切换本地流的媒体输入设备，例如麦克风，摄像头。
   *
   * @note 注意
   * 1. 已经发布的流，切换后不用重新发流。
   * 2. 以摄像头为例，未打开摄像头时，应使用 [[Stream.open]] 打开设备。
   * 3. 部分移动端设备由于无法同时打开两个摄像头，因此会导致设备切换失败。此时可通过关闭摄像头（[[Stream.close]] ）再打开新的摄像头（[Stream.open]）的方式完成切换
   *
   * @example
   * ```javascript
   * // rtc.localStream.init() 之后
   * if (rtc.localStream.hasVideo()){
   *   await rtc.localStream.switchDevice("video", "1275f2a4df844f0bfc650f005fef5eb9415379761f4b36c3d12ca1b72948d6a8") // 通过 NERTC.getDevices() 获取
   * } else {
   *   await rtc.localStream.open({
   *     type: "video",
   *     deviceId: "1275f2a4df844f0bfc650f005fef5eb9415379761f4b36c3d12ca1b72948d6a8", // 通过 NERTC.getDevices() 获取
   *   });
   *   // 通常open后需配合播放使用
   *   rtc.localStream.play(document.getElementById("local-video-wrapper"));
   *   rtc.localStream.setLocalRenderMode({
   *     width: 200,
   *     height: 200,
   *     cut: false
   *   });
   * }
   *
   * ```
   *
   * @param {String} type 设备的类型。
   * * "audio": 音频输入设备
   * * "video": 视频输入设备
   * @param deviceId 设备的 ID，可以通过 getDevices 方法获取。获取的 ID 为 ASCII 字符，字符串长度大于 0 小于 256 字节。
   *
   */
  switchDevice(type: 'audio' | 'video', deviceId: string): Promise<void>
  /**
   * 启用视频轨道。
   *
   * 视频轨道默认为开启状态。如果您调用了 [[Stream.muteVideo]]，可调用本方法启用视频轨道。
   *
   * 对本地流启用视频轨道后远端会触发 Client.on("unmute-video") 回调。
   *
   * @note 对于本地创建的流，在 createStream 时将 video 设置为 true 才可使用该方法。
   *
   * @example
   * ```Javascript
   *  await stream.unmuteVideo()
   * ```
   */
  unmuteVideo(): Promise<void>
  /**
   * 禁用视频轨道。
   *
   * - 对于本地流，调用该方法会停止发送视频，远端会触发 Client.on("mute-video") 回调。
   * - 对于远端流，调用该方法仍然会接收视频，但是会停止播放。
   *
   * @note 对于本地创建的流，在 createStream 时将 video 设置为 true 才可使用该方法。
   *
   * @example
   * ```Javascript
   *  await stream.muteVideo()
   * ```
   *
   */
  muteVideo(): Promise<void>
  /**
   * 启用屏幕共享轨道。
   *
   * 如果您调用了 muteScreen，可调用本方法启用屏幕共享轨道。远端会触发 Client.on("ummute-screen") 回调。
   *
   * @example
   * ```Javascript
   *  await stream.unmuteScreen()
   * ```
   */
  unmuteScreen(): Promise<void>
  /**
   * 禁用屏幕共享轨道。
   *
   * 调用该方法会停止发送屏幕共享，远端会触发 Client.on("mute-screen") 回调。
   *
   * @example
   * ```Javascript
   *  await stream.muteScreen()
   * ```
   */
  muteScreen(): Promise<void>
  /**
   * 获取视频 flag。
   *
   * 该方法用于确认当前音视频流对象（Stream）中是否包含视频资源。
   *
   * @note 该方法仅对本地流有效。
   *
   * @example
   * ```Javascript
   * let result = localStream.hasVideo()
   * ```
   *
   * @return
   * - true: 该音视频流对象中包含视频资源。
   * - false: 该音视频流对象中不包含视频资源。
   */
  hasVideo(): boolean

  /**
   * 设置视频属性。
   *
   * @note 注意
   * * setVideoProfile方法会根据预设值使用合适的上行码率。如您之前调用过 [[Stream.setVideoEncoderConfiguration]] ，则原设置会被覆盖。
   * * 从 V4.6.20 起，可以在打开摄像头后继续通过调用该方法动态修改分辨率。该功能由于浏览器和摄像头的限制，可能出现以下情况：
   * 1. 从低分辨率切换到高分辨率失败
   * 2. 从高分辨率切换到低分辨率时长宽比不完全符合profile设定
   * 3. 在多个页面开启摄像头或者打开大小流的情况下，分辨率切换失败
   * 4. ios16的bug导致的动态切换视频属性仅对本地生效、远端不生效
   * 5. 由于系统限制，ios 13/14 上无法使用1080p的Profile
   *
   * SDK仅保证在这些情况下的设备可用及码率切换正常。
   *
   * @example
   * ```javascript
   * // init前，设置分辨率及帧率
   * rtc.localStream = createStream({
   *   video: true,
   *   audio: true,
   *   uid: 123,
   *   client: rtc.client
   * });
   * rtc.localStream.setVideoProfile({
   *   resolution: NERTC.VIDEO_QUALITY.VIDEO_QUALITY_1080p,
   *   frameRate: NERTC.VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15,
   * })
   * await rtc.localStream.init()
   *
   *
   * // init后，动态下调分辨率
   * rtc.localStream.setVideoProfile({
   *   resolution: NERTC.VIDEO_QUALITY.VIDEO_QUALITY_720p,
   * })
   * ```
   */
  setVideoProfile(options: {
    /**
     * 设置本端视频分辨率，详细信息请参考 [[NERTC.VIDEO_QUALITY]]。
     */
    resolution: number
    /**
     * 设置本端视频帧率，详细信息请参考 [[NERTC.VIDEO_FRAME_RATE]]。
     */
    frameRate: number
  }): void
  /**
   * 获取屏幕共享 flag。
   *
   * 该方法用于确认当前音视频流对象（Stream）中是否包含屏幕共享资源。
   *
   * @note 该方法仅对本地流有效。
   *
   * @example
   * ```Javascript
   * let result = localStream.hasScreen()
   * ```
   *
   * @return
   * - true: 该音视频流对象中包含屏幕共享资源。
   * - false: 该音视频流对象中不包含屏幕共享资源。
   */
  hasScreen(): boolean

  /**
   * 设置屏幕共享中的屏幕属性。
   *
   * 该方法设置屏幕共享时屏幕的显示属性，必须在 Stream.init 之前调用。
   *
   * 从 V4.6.20 起，可以在打开屏幕共享后继续通过调用该方法动态修改分辨率。该功能由于浏览器的限制，可能出现以下情况：
   * - 从低分辨率切换到高分辨率失败
   * - 从高分辨率切换到低分辨率时长宽比不完全符合profile设定
   * - 屏幕共享的边缘被切断
   *  SDK仅保证在这些情况下的设备可用及码率切换正常。
   *
   * @note 该方法仅可对本地流调用。
   *
   * @param profile 屏幕属性。
   *
   * @example
   * ```javascript
   * rtc.localStream = createStream({
   *   screen: true,
   *   uid: 456,
   *   client: rtc.client
   * });
   * rtc.localStream.setScreenProfile({
   *   resolution: NERTC.VIDEO_QUALITY.VIDEO_QUALITY_1080p,
   *   frameRate: NERTC.VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15,
   * })
   * await rtc.localStream.init()
   * ```
   *
   */
  setScreenProfile(profile: {
    /**
     * 设置本端屏幕共享分辨率。参考[[NERTC.VIDEO_QUALITY]]。
     *
     */
    resolution: number
    /**
     * 设置本端屏幕共享帧率。参考[[NERTC.VIDEO_FRAME_RATE]]。
     *
     */
    frameRate: number
  }): void

  /**
   * 截取指定用户的视频流画面。
   *
   * 截图文件保存在浏览器默认路径下。
   *
   * @note
   * - v4.5.0之前，本地视频流截图，需要在 Client.join 并 Client.publish 发布流成功之后调用。
   * - 远端视频流截图，需要在  Client.subscribe 订阅远端视频流之后调用。
   * - 水印不会被截图。
   *
   * @example
   * ```javascript
   *  await stream.takeSnapshot({
   *    uid: 123,
   *    mediaType: 'video',
   *    name: 'xxx'
   *  })
   * ```
   */
  takeSnapshot(options: {
    /**
     * 截图文件名称，默认格式为 uid-1。
     */
    name: string
    /**
     * 截图的视频流类型。
     */
    mediaType?: 'video' | 'screen'
  }): Promise<'INVALID_OPERATION' | undefined>

  /**
   * 截取指定用户的视频流画面，并生成 Base64。
   *
   *
   * @note
   * - 本地视频流截图，需要在 Client.join 并 Client.publish 发布流成功之后调用。
   * - 远端视频流截图，需要在  Client.subscribe 订阅远端视频流之后调用。
   * - 水印不会被截图。
   *
   * @returns 截图画面生成的 Base64。
   *
   * @example
   * ```javascript
   *  await stream.takeSnapshotBase64({ mediaType: 'video' })
   * ```
   *
   */
  takeSnapshotBase64(options: {
    /**
     * 截图的视频流类型。
     */
    mediaType?: 'video' | 'screen'
  }): string

  /**
   * 开启单人视频录制。
   *
   * @param mediaRecordingOptions 参数对象。
   *
   * @example
   * ```Javascript
   *  await stream.startMediaRecording({type: 'audio', reset: true})
   * ```
   */
  startMediaRecording(mediaRecordingOptions: {
    /**
     * 流类型，即 'audio'、'video' 或 'screen'。其中，`video` 或 `screen` 会带上音频。
     */
    type: 'audio' | 'video' | 'screen'
    /**
     * 如果之前的录制视频未下载，是否重置，默认 false。
     */
    reset: boolean
  }): Promise<string | undefined>

  /**
   * 结束视频录制。
   * @param options 参数对象。
   *
   * @example
   * ```Javascript
   *  await stream.stopMediaRecording({recordId: 'xxxx'})
   * ```
   */
  stopMediaRecording(options: {
    /**
     * 录制 ID。可以通过 [[Stream.listMediaRecording]] 接口获取。
     *
     */
    recordId?: string
  }): Promise<any>

  /**
   * 播放视频录制。
   * @param options 参数对象。
   *
   * @example
   * ```Javascript
   *   let result = await stream.playMediaRecording({
   *     view: document.getElementById('xxx'),
   *     recordId: '12345'
   *   })
   * ```
   */
  playMediaRecording(options: {
    /**
     * 录制 ID。可以通过 [[Stream.listMediaRecording]] 接口获取。
     */
    recordId: string
    /**
     * 音频或者视频画面待渲染的 DOM 节点，如 div、span 等非流媒体节点。
     */
    view: HTMLElement
  }): Promise<void>
  /**
   * 枚举录制的音视频。
   *
   * @returns 录制的音视频信息。
   * - `id` ：ID。
   * - `type` ：录制类型。
   * - `name` ：录制文件名称。
   * - `status` ：录制状态。
   * - `isRecording` ：是否正在录制。
   * - `startTime` ：录制开始时间。
   * - `endTime` ：录制结束时间。
   *
   * @example
   * ```Javascript
   *  let records = stream.listMediaRecording()
   * ```
   */
  listMediaRecording(): {
    id: number
    type: string
    name: string | null
    status: string
    isRecording: boolean
    startTime: number | null
    endTime: number | null
  }[]

  /**
   * 清除录制的音视频。
   * @param options 参数对象。
   *
   * @example
   * ```Javascript
   * await client.cleanMediaRecording()
   * ```
   */
  cleanMediaRecording(options: {
    /**
     * 录制 ID。可以通过 [[Stream.listMediaRecording]] 接口获取。
     */
    recordId: string
  }): Promise<void>

  /**
   * 下载录制的音视频。
   * @param options 参数对象。
   *
   * @example
   * ```Javascript
   * await stream.downloadMediaRecording({
   *   recordId: '123456'
   * })
   * ```
   *
   */
  downloadMediaRecording(options: {
    /**
     * 录制 ID。可以通过 [[Stream.listMediaRecording]] 接口获取。
     */
    recordId: string
  }): Promise<RecordStatus>
  /**
   * 开始播放音乐文件。
   *
   * 该方法指定在线音频文件和麦克风采集的音频流进行混音或替换，即用音频文件替换麦克风采集的音频流。
   *
   * @note 请在 [[Client.publish]] 之后使用该方法。
   *
   * @param options 混音设置。
   *
   * @example
   * ```javascript
   * // await rtc.client.publish(rtc.localStream)
   * rtc.localStream.startAudioMixing({
   *   audioFilePath: $("#audioFilePath").val(),
   *   loopback: true,
   *   replace: false,
   *   cycle: 0,
   *   playStartTime: 0,
   *   volume: 255,
   *   auidoMixingEnd: () => {console.log("ended")},
   * })
   * ```
   *
   */
  startAudioMixing(options: {
    /**
     * 必选，在线音乐文件的 URL 地址。
     *
     * @note 目前仅支持在线音频文件，格式一般为 MP3 等浏览器支持的音频文件类型。
     *
     */
    audioFilePath: string
    /**
     * 可选，是否要用音频文件替换本地音频流。
     * - true：音频文件内容将会替换本地录音的音频流。
     * - false：（默认值）音频文件内容将会和麦克风采集的音频流进行混音。
     */
    replace: boolean
    /**
     * 可选，指定音频文件循环播放的次数。
     * @note
     * - 该参数仅对Chrome有效
     * - 通过 cycle 指定循环播放次数时，需要同时指定 loopback 参数置为 true。如果 loopback 为 false，该参数不生效。
     * - cycle 默认为 0，表示无限循环播放，直至调用 stopAudioMixing 后停止。
     */
    cycle: number
    /**
     * 可选，设置音频文件开始播放的时间位置，单位为秒（s）。默认为 0，即从头开始播放。
     */
    playStartTime: number
    /**
     * 可选，音乐文件的播放音量，取值范围为 0~100。默认为 100，表示使用文件的原始音量。
     * @note 若您在通话中途修改了音量设置，则当前通话中再次调用时默认沿用此设置。
     */
    volume?: number
    /**
     * 可选，伴音文件播放完成的通知反馈。正常停止伴音或关掉通话获取其他原因停止伴音不会触发。
     */
    auidoMixingEnd: (() => void) | null
    /**
     * 是否循环播放音频文件，默认为 false。
     * - true：循环播放音频文件。此时可通过 cycle 设置循环播放次数，cycle 默认为 0，表示无限循环播放。
     * - false：（默认值）关闭无限循环播放。
     */
    loopback: boolean
  }): Promise<unknown> | undefined
  /**
   * 停止播放音乐文件。
   *
   * 请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   *  await localStream.stopAudioMixing()
   * ```
   */
  stopAudioMixing(): Promise<void>
  /**
   * 暂停播放音乐文件。
   *
   * 请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   * localStream.pauseAudioMixing()
   *   .then((res) => {
   *     console.log('暂停伴音成功')
   *   })
   *   .catch((err) => {
   *     console.error('暂停伴音失败', err)
   *   })
   * ```
   */
  pauseAudioMixing(): Promise<void> | null | undefined
  /**
   * 恢复播放音乐文件。
   *
   * 请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   * await localStream.resumeAudioMixing()
   * ```
   */
  resumeAudioMixing(): Promise<void> | undefined
  /**
   * 调节音乐文件音量。
   *
   * 该方法调节混音里伴奏的播放音量大小。请在房间内调用该方法。
   *
   * @param volume 伴奏发送音量。取值范围为 0~100。默认 100，即原始文件音量。
   *
   * @example
   * ```Javascript
   * // 设置伴音音量为 50
   * localStream.adjustAudioMixingVolume(50))
   *   .then((res) => {
   *     console.log('设置伴音的音量成功')
   *   })
   *   .catch((err) => {
   *     console.error('设置伴音的音量失败', err)
   *   })
   * ```
   */
  adjustAudioMixingVolume(volume: number): Promise<void> | null | undefined
  /**
   * 获取音乐文件时长。
   *
   * 该方法获取伴奏时长，单位为毫秒。请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   *  await result = localStream.getAudioMixingDuration()
   *  let totalTime = result.totalTime
   * ```
   *
   * @returns 方法调用成功返回音乐文件时长，单位为毫秒（ms）。
   *
   */
  getAudioMixingDuration(): Promise<void>
  /**
   * 获取音乐文件当前播放进度。
   *
   * 该方法获取当前伴奏播放进度，单位为毫秒。请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   *  await result = localStream.getAudioMixingCurrentPosition()
   *  let playedTime = result.playedTime
   * ```
   *
   * @returns 方法调用成功返回音乐文件播放进度。
   */
  getAudioMixingCurrentPosition(): Promise<void>
  /**
   * 设置音乐文件的播放位置。
   *
   * 该方法可以设置音频文件的播放位置，这样你可以根据实际情况播放文件，而非从头到尾播放整个文件。
   * @param playStartTime 音乐文件的播放位置，单位为毫秒。
   *
   * @example
   * ```Javascript
   * await localStream.setAudioMixingPosition(2000)
   * ```
   */
  setAudioMixingPosition(playStartTime: number): Promise<unknown>
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
   *   - ""BROWSER_NOT_SUPPORT: 不支持的浏览器类型。
   *   - "INVALID_OPERATION"：非法操作，详细原因请查看日志，通常为状态错误。
   *   - "No MediaHelper": localStream 没有 init() 初始化，无法使用音效功能。
   *   - "Stream.playEffect:soundId"：soundId 参数格式错误。
   *   - "Stream.playEffect:filePath"：filePath 参数格式错误。
   *   - "Stream.playEffect:cycle"：cycle 参数格式错误。
   *
   * @example
   * ```Javascript
   *  let option = {cycle:1, filePath:'xxx', soundId:1}
   *  await localStream.playEffect(options)
   * ```
   */
  playEffect(options: {
    /**
     * 必选。指定在线音效文件的 URL地址。
     *
     * 支持的音效文件类型包括 MP3，AAC 等浏览器支持的其他音频格式。
     */
    filePath: string
    /**
     * 可选，指定音效文件循环播放的次数。默认值为 1，即播放 1 次。
     */
    cycle: number
    /**
     * 必选，指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     *
     * 如果您已通过 preloadEffect 将音效加载至内存，确保 playEffect 的 soundID 与 preloadEffect 设置的 soundID 相同。
     */
    soundId: number
  }): Promise<unknown>
  /**
   * 停止播放指定音效文件。
   * @since V4.3.0
   * @note 请在房间内调用该方法。
   * @return 可能返回的错误码：
   *   - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *   - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *   - "Stream.playEffect:soundId"：soundId参数格式错误
   *
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   *
   * @example
   * ```Javascript
   *  await localStream.stopEffect(123)
   * ```
   *
   */
  stopEffect(soundId: number): Promise<unknown>
  /**
   * 暂停播放指定音效文件。
   * @since V4.3.0
   *
   * @note 请在房间内调用该方法。
   *
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   * 可能返回的错误码：
   *    - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *   - "SOUND_NOT_EXISTS": soundId指定的音效文件不存在
   *   - "INVALID_OPERATION"：非法操作，可以通过console日志查看原因，一般是状态不对
   *   - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *   - "Stream.pauseEffect:soundId"：soundId参数格式错误
   *
   * @example
   * ```Javascript
   * localStream.pauseEffect(1)
   *    .then((res) => {
   *      console.log('暂停文件播放成功: ', res)
   *    })
   *    .catch((err) => {
   *      console.error('暂停音效文件失败: ', err)
   *    })
   * ```
   *
   */
  pauseEffect(soundId: number): Promise<unknown>
  /**
   * 恢复播放指定音效文件。
   *
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   * @return 可能返回的错误码：
   *   - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *   - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *   - "Stream.resumeEffect :soundId": soundId 参数格式错误
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Promise}
   *
   * @example
   * ```Javascript
   *  await localStream.resumeEffect(1)
   * ```
   */
  resumeEffect(soundId: number): Promise<unknown>
  /**
   * 调节指定音效文件的音量。
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   *
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认为 100，即原始文件音量。
   * @return {Promise}
   * 可能返回的错误码：
   *  - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *  - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *  - "Stream.setVolumeOfEffect:soundId": 参数格式错误
   *  - "Stream.setVolumeOfEffect:volume": 参数格式错误
   *
   * @example
   * ```Javascript
   *  await localStream.setVolumeOfEffect(1234, 50)
   * ```
   */
  setVolumeOfEffect(soundId: number, volume: number): Promise<unknown>
  /**
   * 预加载指定音效文件。
   *
   * 该方法缓存音效文件，以供快速播放。为保证通信畅通，请注意控制预加载音效文件的大小。
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   *
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @param {String} filePath 必选。指定在线音效文件的绝对路径。支持MP3、AAC 以及浏览器支持的其他音频格式。
   * @return {Object} 可能返回的错误码：
   *   - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *   - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *   - "Stream.preloadEffect:filePath": 参数格式错误
   *   - "Stream.preloadEffect:soundId": 参数格式错误
   *
   * @example
   * ```Javascript
   *  let option = {soundId:1, filePath:'xxx'}
   *  await localStream.preloadEffect(options)
   * ```
   */
  preloadEffect(soundId: number, filePath: string): Promise<unknown>
  /**
   * 释放指定音效文件。
   *
   * 该方法从内存释放某个预加载的音效文件，以节省内存占用。
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   *
   * @param {Number} soundId 指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
   * @return {Object} 可能返回的错误码：
   *   - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *   - "SOUND_NOT_EXISTS": soundId指定的音效文件不存在
   *   - "INVALID_OPERATION": 非法操作，可以查看console日志得到原因，一般是状态原因，如此时应处于播放、暂停状态，不能使用
   *   - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *   - "Stream.unloadEffect:soundId": 参数格式错误
   *
   * @example
   * ```Javascript
   *  await localStream.unloadEffect(123)
   * ```
   */
  unloadEffect(soundId: number): Promise<unknown>
  /**
   * 获取所有音效文件播放音量。
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   * @return 可能返回的错误码：
   * - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   * @return Array<{ soundId: number; volume: number }>
   * 返回一个包含 soundId 和 volume 的数组。每个 soundId 对应一个 volume。
   * + `soundId`: 为音效的 ID，正整数，取值范围为 [1,10000]。
   * + `volume`: 为音量值，整数，范围为 [0,100]。
   *
   * @example
   * ```Javascript
   * let result = localStream.getEffectsVolume()[0]
   * let soundId = result.soundId
   * let volume = result.volume
   * ```
   *
   */
  getEffectsVolume(): Array<{ soundId: number; volume: number }>
  /**
   * 设置所有音效文件播放音量。
   *
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   * @param {Number} volume 音效音量。整数，范围为 [0,100]。默认 100 为原始文件音量。
   * @return {void} 可能返回的错误码：
   *    - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *    - "Stream.setEffectsVolume:volume": volume 参数格式错误
   *    - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *
   * @example
   * ```Javascript
   *  localStream.setEffectsVolume(50)
   * ```
   *
   */
  setEffectsVolume(volume: number): void
  /**
   * 停止播放所有音效文件。
   *
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   * @return {Promise} 可能返回的错误码：
   *  - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *  - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *  - "Stream.playEffect:soundId"：soundId参数格式错误
   *
   * @example
   * ```Javascript
   *  await localStream.stopAllEffects()
   * ```
   */
  stopAllEffects(): Promise<unknown>
  /**
   * 暂停播放所有音效文件。
   * @note 请在房间内调用该方法。
   * @since V4.3.0
   * @return 可能返回的错误码：
   *    - "BROWSER_NOT_SUPPORT": 浏览器不支持
   *   - "SOUND_NOT_EXISTS": soundId指定的音效文件不存在
   *   - "INVALID_OPERATION"：非法操作，可以通过console日志查看原因，一般是状态不对
   *   - "No MediaHelper": localStream没有init()初始化,无法使用音效功能
   *   - "Stream.pauseEffect:soundId"：soundId参数格式错误
   * @return {Promise}
   *
   *  @example
   * ```Javascript
   *  localStream.pauseAllEffects()
   *    .then((res) => {
   *      console.log('pauseAllEffects 成功')
   *    })
   *    .catch((err) => {
   *      console.error('pauseAllEffects 失败: %o', err)
   *    })
   * ```
   */
  pauseAllEffects(): Promise<unknown>
  /**
   * 恢复播放所有音效文件。
   * @note
   * - 请在房间内调用该方法。
   * - 可能返回的错误码同 resumeEffect 一致
   *
   * @since V4.3.0
   * @return {Promise}
   *
   * @example
   * ```Javascript
   * await localStream.resumeAllEffects()
   * ```
   */
  resumeAllEffects(): Promise<unknown>

  /**
   * 获取指定音效文件时长。
   * 该方法获取音效时长，单位为毫秒。请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   * let option = {cycle:1, filePath:'xxx', soundId:1}
   * await duration = localStream.getAudioEffectsDuration(options)
   * ```
   *
   * @return 方法调用成功返回音效文件时长，单位为毫秒（ms）。
   */
  getAudioEffectsDuration(options: {
    /**
     * 必选。指定在线音效文件的 URL地址。
     *
     * 支持的音效文件类型包括 MP3，AAC 等浏览器支持的其他音频格式。
     */
    filePath: string
    /**
     * 可选，指定音效文件循环播放的次数。默认值为 1，即播放 1 次。
     */
    cycle: number
    /**
     * 必选，指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     *
     */
    soundId: number
  }): Promise<unknown>
  /**
   * 获取音效文件当前播放进度。
   *
   * 该方法获取当前音效播放进度，单位为毫秒。请在房间内调用该方法。
   *
   * @example
   * ```Javascript
   * let option = {cycle:1, filePath:'xxx', soundId:1}
   * await result = localStream.getAudioEffectsCurrentPosition(options)
   * let playedTime = result.playedTime
   * ```
   *
   * @returns 方法调用成功返回音效文件播放进度。
   */
  getAudioEffectsCurrentPosition(options: {
    /**
     * 必选。指定在线音效文件的 URL地址。
     *
     * 支持的音效文件类型包括 MP3，AAC 等浏览器支持的其他音频格式。
     */
    filePath: string
    /**
     * 可选，指定音效文件循环播放的次数。默认值为 1，即播放 1 次。
     */
    cycle: number
    /**
     * 必选，指定音效的 ID。每个音效均有唯一的 ID。正整数，取值范围为 [1,10000]。
     *
     */
    soundId: number
  }): Promise<unknown>

  /**
   * 获取当前帧的数据。
   *
   * @note 注意
   *
   * 1. 对应的媒体只有在播放状态下才能调用该方法
   * 2. 该方法为阻塞方法，在多个Stream上频繁调用该方法可能导致页面卡顿
   * 3. 当前如不可截图，则返回null。
   * 4. 由于底层接口限制，该功能在部分部分低版本浏览上性能较低，偶现截图时间在10秒以上，如Safari 13等。
   * 5. 打码状态不能截图
   *
   * @example
   * ```
   * // 假设rtc.localStream开启了屏幕共享，那么在rtc.localStream.play()之后
   * setInterval(()=>{
   *   const imageData = rtc.localstream.getCurrentFrameData({mediaType: 'screen'})
   *   if (imageData){
   *     console.log(`getCurrentFrameData：${imageData.width}x${imageData.height}`)
   *    // ctx.putImageData(imageData, 0, 0, 0, 0, imageData.width,  imageData.height)
   *   }
   * }, 100)
   * ```
   */
  getCurrentFrameData(options: { mediaType: 'video' | 'screen' }): ImageData | null
  /**
   * 视频上行参数设置。
   *
   *
   * @note 注意
   * * setVideoEncoderConfiguration 方法只作用于本地视频流。
   * * 在v4.6.20之后，该方法可以在会中使用，可动态调整参数。
   * * 使用 [[Stream.setVideoProfile]] 后，预设的 maxBitrate 会覆盖当前设置。
   * 请保证 setVideoEncoderConfiguration 在 setVideoProfile之后调用。
   *
   * @example 设置上行屏幕共享最大编码比特率为3M，流畅度优先：
   *
   * ```javascript
   * // rtc.localStream = NERTC.createStream({screen: true})
   * rtc.localStream.setVideoEncoderConfiguration({
   *   mediaType: "screen",
   *   streamType: "high",
   *   maxBitrate: 3000,
   *   contentHint: "motion",
   * })
   * // await rtc.localStream.init()
   * // await rtc.client.publish(rtc.localStream)
   * ```
   *
   */
  setVideoEncoderConfiguration(options: {
    mediaType: 'video' | 'screen'
    streamType: 'high' | 'low'
    maxBitrate?: number
    contentHint?: 'motion' | 'detail'
  }): void
  /**
   * 添加视频画布水印。
   *
   * @note 注意事项
   * * setCanvasWatermarkConfigs 方法作用于本地视频画布，不影响视频流。视频流截图时，图片中不包含水印。
   * *
   *
   * @param options 画布水印设置。支持设置文字水印、图片水印和时间戳水印，设置为 null 表示清除水印。
   *
   * @example
   * ```Javascript
   * // 设置图片水印参数
   *  let options = {
   *    "mediaType": "screen",
   *    "imageWatermarks": [
   *      {
   *        "imageUrls": [
   *          "img/logo_yunxin.png"
   *        ],
   *        "loop": true
   *      }
   *    ]
   *  }
   * // 添加水印
   *  localStream.setCanvasWatermarkConfigs(options)
   * ```
   */
  setCanvasWatermarkConfigs(options: NERtcCanvasWatermarkConfig): void
  /**
   * 添加视频编码水印。
   *
   * @note 注意事项
   * * setEncoderWatermarkConfigs 方法仅作用于本地Stream对象，且直接影响视频流。视频流截图时，图片中包含水印。
   * * 编码水印坐标是按原始摄像头采集计算的。如播放时画布通过cut=true参数做了裁剪，可能也会裁剪一部分水印。此时需要自行计算坐标偏移。
   * * 水印数量最多为1个。如有图文组合水印需求，可自行合成为1个图片。
   * * 由于浏览器策略限制，图片必须存于同一域名下。
   * * 文字水印不具备折行功能。
   * * 编码水印仅支持桌面端Chrome及Safari浏览器
   *
   * @param options 编码水印设置。支持设置文字水印、图片水印和时间戳水印，设置为 null 表示清除水印。
   *
   * @example
   * ```
   * // rtc.localStream.init()后
   * rtc.localStream.setEncoderWatermarkConfigs({
   *    "mediaType": "video",
   *    "textWatermarks": [
   *      {
   *        "content": "网易云信",
   *        "offsetX": 200,
   *        "offsetY": 200
   *      }
   *    ]
   *  })
   * rtc.localStream.setEncoderWatermarkConfigs({
   *    "mediaType": "screen",
   *    "imageWatermarks": [
   *      {
   *        "imageUrls": [
   *          "img/logo_yunxin.png"
   *        ],
   *        "loop": true
   *      }
   *    ]
   *  })
   * ```
   *
   */
  setEncoderWatermarkConfigs(options: NERtcEncoderWatermarkConfig): void

  /**
   * 配置基础美颜依赖的静态资源路径。
   * 默认走 cdn 加载且无需调用，
   * 当需要私有化部署或所在区域无法访问默认 cdn 节点时，需自行下载资源部署，并通过调用该方法进行资源配置。
   * 下载路径：https://yx-web-nosdn.netease.im/common/5e1e95a883139fe7a0847f3e68b9f1db/basic-beauty-res.zip
   * @param {BasicBeautyResConfig} config 资源配置信息
   */
  basicBeautyStaticRes(config: BasicBeautyResConfig): void

  /**
   * 配置高级美颜依赖的静态资源路径。
   * 默认走 cdn 加载且无需调用，
   * 当需要私有化部署或所在区域无法访问默认 cdn 节点时，需自行下载资源部署，并通过调用该方法进行资源配置。
   * 下载路径：https://yx-web-nosdn.netease.im/common/407fde90ffeb1147fa93199d346b9d5b/adv-beauty-res-6-25.zip
   * @param {AdvBeautyResConfig} config 资源配置信息
   */
  advBeautyStaticRes(config: AdvBeautyResConfig): void

  /**
   * 开启/关闭美颜
   * @param {Boolean} option 设置 true 表示开启美颜，设置 false 表示关闭美颜。
   *
   * @example
   * ```Javascript
   *  await localStream.setBeautyEffect(true)
   * ```
   *
   */
  setBeautyEffect(option: boolean): Promise<void>
  /**
   * 设置美颜效果
   *
   * @param options 美颜选项。
   *
   * @example
   * ```Javascript
   * //设置基础美颜参数并传递
   *  let effects = {
   *    brightnessLevel: 0.5,
   *    rednessLevel: 0.4,
   *    smoothnessLevel: 0.5
   *  }
   *  await localStream.setBeautyEffectOptions(effects)
   * ```
   *
   */
  setBeautyEffectOptions(options: {
    /**
     *
     * 明亮度。取值范围 [0,1]
     */
    brightnessLevel: number
    /**
     * 红润度。取值范围 [0,1]
     */
    rednessLevel: number
    /**
     * 平滑度。取值范围 [0,1]
     */
    smoothnessLevel: number
  }): void

  /**
   * 设置滤镜
   *
   * @param {BeautyFilters} options 滤镜选项。
   * @param {Number} intensity 滤镜强度。取值范围 [0,1]
   *
   * @example
   * ```Javascript
   * // 开启基础美颜功能
   *  rtc.localStream.setBeautyEffect(true)
   * // 设置滤镜参数并传递
   *  rtc.localStream.setFilter('ziran', 1);
   * // 需要关闭滤镜，将强度设置成 0 即可
   * ```
   */
  setFilter(options: BeautyFilters, intensity?: number): void

  /**
   * 注册(高级美颜/背景替换/AI降噪)插件
   * @param {pluginOptions} options 插件参数说明
   *
   * @example
   * ```Javascript
   * let options = {key:'VirtualBackground', pluginUrl:'xxx', wasmUrl:'xxx'}
   *  await localStream.registerPlugin(options)
   * ```
   *
   */
  registerPlugin(options: pluginOptions): Promise<void>

  /**
   * 注销(高级美颜/背景替换/AI降噪)插件
   * @param key 插件标识，可设置为：
   * * AdvancedBeauty (表示注销高级美颜插件)
   * * VirtualBackground (表示注销背景替换插件)
   * * AIDenoise (表示注销AI降噪插件)
   *
   * @example
   * ```Javascript
   *  await localStream.unregisterPlugin('xxx')
   * ```
   *
   */
  unregisterPlugin(key: string): Promise<void>

  /**
   * 开启高级美颜
   * @param faceNumber 取值范围 [1,5]，表示可支持的人脸识别数，最多可以支持 5 张人脸。
   *
   * @example
   * ```Javascript
   * await localStream.enableAdvancedBeauty(2)
   * ```
   */
  enableAdvancedBeauty(faceNumber: number): Promise<void>

  /**
   * 关闭高级美颜
   *
   *
   * @example
   * ```Javascript
   * await localStream.disableAdvancedBeauty()
   * ```
   */
  disableAdvancedBeauty(): Promise<void>

  /**
   * 设置高级美颜效果
   *
   * @param {advBeautyEffects} key 高级美颜效果选项。
   * @param {Number} intensity 高级美颜效果强度。取值范围 [0,1]
   *
   * @example
   * ```Javascript
   * localStream.setAdvBeautyEffect({enlargeEye: 0.25})
   * ```
   *
   */
  setAdvBeautyEffect(key: AdvBeautyEffects, intensity?: number): void

  /**
   * 预设高级美颜参数
   * @param {AdvBeautyPreset} preset 预设参数
   *
   * @example
   * ```Javascript
   *  localStream.presetAdvBeautyEffect({
   *   // 大眼
   *   enlargeEye: 0.25,
   *   // 圆眼
   *   roundedEye: 0.5,
   *   // 窄脸
   *   narrowedFace: 0.25,
   *   // 瘦脸
   *   shrinkFace: 0.15,
   *   // v 脸
   *   vShapedFace: 0.33,
   *   // 小脸
   *   minifyFace: 0.15,
   *   // 亮眼
   *   brightenEye: 0.75,
   *   // 美牙
   *   whitenTeeth: 0.75
   * })
   * ```
   */
  presetAdvBeautyEffect(preset: AdvBeautyPreset): void

  /**
   * 开启背景分割
   *
   * @example
   * ```Javascript
   * await localStream.enableBodySegment()
   * ```
   */
  enableBodySegment(): Promise<void>

  /**
   * 关闭背景分割
   *
   * @example
   * ```Javascript
   * await localStream.disableBodySegment()
   * ```
   *
   */
  disableBodySegment(): Promise<void>

  /**
   * 设置背景
   * @param {BackGroundOptions} options 背景设置说明。
   *
   * @example
   * ```Javascript
   * localStream.setBackGround({ type: 'image', source: 'img' })
   * ```
   */
  setBackGround(options: BackGroundOptions): void

  /**
   * 开启AI降噪
   *
   * @example
   * ```Javascript
   * await localStream.enableAIDenoise()
   * ```
   */
  enableAIDenoise(): Promise<boolean>

  /**
   * 关闭AI降噪
   *
   * @example
   * ```Javascript
   * await localStream.disableAIDenoise()
   * ```
   */
  disableAIDenoise(): Promise<boolean>

  /**
   *  销毁音视频流对象。
   *
   * @example
   * ```Javascript
   * stream.destroy()
   * ```
   */
  destroy(): void

  /**
   * 设备错误。
   * 1. 只有本地流才会有"device-error"回调
   * 2. 通常应该使用`Client`上的回调 `Client.on("deviceError")`。Client上有更丰富设备错误类型。只有当应用需要不止一个本地流，需要严格
   * 区分哪个本地流的设备出现设备问题时，才会用到这个回调。
   */
  on(
    event: 'device-error',
    callback: (type: 'audio' | 'video' | 'screen', error: any) => void
  ): void

  /**
   * 高级美颜/背景分割/AI降噪插件加载通知。
   *
   */
  on(
    event: 'plugin-load',
    callback: (type: 'AdvancedBeauty' | 'VirtualBackground' | 'AIDenoise') => void
  ): void

  /**
   * 高级美颜/背景分割/AI降噪插件加载失败通知。
   *
   */
  on(event: 'plugin-load-error', callback: (key: any, msg: any) => void): void

  /**
   * 基础美颜资源加载通知，成功时 failUrls 为空数组。
   *
   */
  on(event: 'basic-beauty-res-complete', callback: (failUrls: string[]) => void): void

  /**
   * `notAllowedError` 事件表示浏览器自动播放受限
   *
   * @example
   * ```javascript
   * rtc.remoteStream.on("notAllowedError", (evt) => {
   *   // 获取错误码
   *   const errorCode = evt.getCode();
   *   // 判断为自动播放受限
   *   if(errorCode === 41030){
   *      // 手势操作恢复
   *      $("#button").on("click", async () => {
   *         await remoteStream.resume();
   *         $("#button").hide();
   *      });
   *   }
   * });
   * ```
   */
  on(
    event: 'notAllowedError',
    callback: (evt: {
      /**
       * 错误码
       */
      erroCode: Number
    }) => void
  ): void
}
export { Stream }
