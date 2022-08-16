/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

import { Client } from './client'
import { Stream } from './stream'
import { StreamOptions } from './types'
import { DeviceInfo } from './browser'

/**
 * NERTC 是 云信 Web SDK 中所有可调用方法的入口。
 */
export as namespace NERTC
declare namespace NERTC {
  namespace Logger {
    /**
     * 开启日志上传。
     *
     * 调用本方法开启日志上传。开启日志上传并加入房间，SDK 的日志会在通话结束后上传到网易云信服务器。
     *
     * 日志上传默认为关闭状态，如果您需要开启此功能，请确保在所有方法之前调用本方法。
     *
     * @since V4.4.0
     *
     * @note 如果没有成功加入房间，SDK 不会发送日志到云信服务器，服务器上无法查看日志信息。
     *
     */
    function enableLogUpload(): void

    /**
     * 关闭日志上传。
     *
     * 默认是关闭状态，如果您调用了方法 enableLogUpload 开启日志上传，可以通过本方法关闭日志上传。
     *
     * @since V4.4.0
     */
    function disableLogUpload(): void
  }
  /**
   * 创建客户端。
   *
   * 该方法用于创建客户端，每次通话前调用一次即可。
   *
   * @param options 配置参数。
   * @param options.appkey
   *    应用的 AppKey。可从[云信后台](https://app.yunxin.163.com/)获取。
   * @param options.debug 是否开启 debug 模式。debug 模式下浏览器会打印 log 日志。默认为 false，即关闭状态。
   *
   * @example
   * ```html
   * <!DOCTYPE html>
   *   <html>
   *     <body>
   *       <div id="localDiv" style="height: 500px;"></div>
   *       <div id="remoteDiv" style="height: 500px;"></div>
   *       <script src="<SDK地址>"></script>
   *       <script>
   * const main = async ()=>{
   * let rtc = {};
   * // 1. 创建client
   * rtc.client = NERTC.createClient({appkey: "<您的appkey>", debug: true});
   * // 2. 绑定订阅事件
   * rtc.client.on('stream-added', (evt)=>{
   *   rtc.client.subscribe(evt.stream);
   * })
   * rtc.client.on('stream-subscribed', (evt)=>{
   *   evt.stream.play(document.getElementById('remoteDiv'));
   * });
   * // 3. 加入频道
   * await rtc.client.join({
   *   channelName: 'channel163',
   *   uid: 123,
   *   token: '<您的token>', // 如关闭了安全模式，则不需要该参数。
   * });
   * // 4. 创建localStream
   * rtc.localStream = NERTC.createStream({
   *   video: true,
   *   audio: true,
   *   client: rtc.client,
   *   uid: 123
   * });
   * await rtc.localStream.init();
   * // 5. 设置本地播放方式
   * rtc.localStream.setLocalRenderMode({
   *   width: 640,
   *   height: 480
   * })
   * rtc.localStream.play(document.getElementById('localDiv'))
   * // 5. 发布localStream
   * rtc.client.publish(rtc.localStream);
   * }
   * main()
   *   </script>
   *   </body>
   * </html>
   ```
   */
  function createClient(options: { appkey: string; debug?: boolean }): Client
  /**
   * 该方法创建并返回音视频流对象。
   *
   * @note 自 V4.1.0 版本起，摄像头与屏幕共享的视频流可以同时发送，其中屏幕共享流会以辅流形式发送。
   *
   * @param options 配置参数。
   */
  function createStream(options: StreamOptions):
    | Stream
    | {
        name: string
        code: number
        desc: string
      }
  /**
   * 该方法枚举可用的媒体输入/输出设备，比如麦克风、摄像头、耳机等。
   *
   * 出于安全性考虑，各平台对枚举设备接口有不同的权限控制策略。例如：
   * 1. Safari浏览器只有在当前页面执行一次[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)(也就是[[Stream.init]])之后才能够枚举设备。
   * 2. Chrome浏览器曾经在当前页面执行过`getUserMedia`即可枚举设备。
   *
   * @return
   * - video：视频
   *
   * @example
   * ```JavaScript
   * // 接口使用示例
   * NERTC.getDevices().then(data => {
   *   const {audioIn, audioOut, video} = data
   *   audioIn.forEach(item=>{
   *     console.log('mic label: ', item.label, 'deviceId: ', item.deviceId)
   *   })
   *   video.forEach(item=>{
   *     console.log('video label: ', item.label, 'deviceId: ', item.deviceId)
   *   })
   *   //...
   * })
   * ```
   */
  function getDevices(): Promise<{
    /**
     * 视频设备。
     */
    video: DeviceInfo[]
    /**
     * 音频输入设备。
     */
    audioIn: DeviceInfo[]
    /**
     * 音频输入设备。
     */
    audioOut: DeviceInfo[]
  }>
  /**
   * 获取可用的视频输入设备。
   *
   * ```JavaScript
   * //接口使用示例
   * NERTC.getCameras().then(data => {
   *   data.forEach(item=>{
   *     console.log('video label: ', item.label, 'deviceId: ', item.deviceId)
   *   })
   * })
   * ```
   */
  function getCameras(): Promise<DeviceInfo[]>
  /**
   * 获取可用的音频输入设备。
   */
  function getMicrophones(): Promise<DeviceInfo[]>
  /**
   * 获取可用的音频输出设备。
   */
  function getSpeakers(): Promise<DeviceInfo[]>

  /**
   * 检查 NERTC Web SDK 对正在使用的浏览器的适配情况。
   *
   * @note
   * - 请在创建音视频对象（createClient）之前调用该方法。
   * - SDK 和浏览器的适配情况与浏览器类型和版本有关，不同的浏览器版本可能会返回不一样的适配结果。
   *
   * @returns
   * - `true`: SDK 与当前使用的浏览器适配
   * - `false`: SDK 与当前使用的浏览器不适配
   */
  function checkSystemRequirements(): Boolean

  /**
   * 检查 NERTC Web SDK 和当前浏览器同时支持的编解码格式。
   *
   * NERTC Web SDK 2.0 视频编解码支持 VP8、H.264、H.265、NEVC 格式，音频支持 OPUS 格式。
   * 您可以调用此接口检查 NERTC Web SDK 与当前浏览器同时支持的编解码格式，以免因编解码能力不匹配导致通话过程中出现音视频播放问题。
   *
   * @note
   * - 请在初始化之后调用该方法。
   * - 该方法支持部分浏览器，列表请查看[Web SDK 支持的浏览器类型](/docs/jcyOTA0ODM/TU5NjUzNjU?platformId=50082#Web端支持的浏览器类型和版本)。
   * - 返回的音视频编码为浏览器通过 SDP 声明的的编码类型，为参考值。
   * - 目前部分安卓手机 H.264 与其他平台 H.264 存在无法互通或单通问题，对于这部分机型推荐使用 VP8 编码格式。
   *
   * @returns  NERTC Web SDK 和当前浏览器同时支持的编解码格式。
   *
   * 调用该方法会返回一个 Promise 对象，在 .then(data(result){}) 回调中，data 包含以下属性：
   * - video: 支持的视频编解码格式，数组类型。返回值包括 "H264"、"VP8"。
   * - audio: 支持的音频编解码格式，数组类型。返回值包括 "OPUS"。
   *
   * ```JavaScript
   * //接口使用示例
   * NERTC.getSupportedCodec().then(data => {
   *   data.forEach(item=>{
   *     console.log(`Supported video codec: ${data.video.join(",")}`);
   *     console.log(`Supported audio codec: ${data.audio.join(",")}`);
   *   })
   * })
   * ```
   */
  function getSupportedCodec(): Promise<{ audio: ['OPUS']; video: ['H264', 'VP8'] }>

  const VERSION: string
  const BUILD: string

  /**
   * 销毁 Client 对象。
   *
   * @param client 指定要销毁的 Client 实例，不传递则销毁最初使用用 createClient 创建的 Client 实例（一般多实例场景使用）。
   */
  function destroy(client?: Client): void

  /**
   * 视频帧率设置
   */
  const VIDEO_FRAME_RATE: {
    /**
     * 视频通话帧率默认值 最大取每秒15帧
     */
    CHAT_VIDEO_FRAME_RATE_NORMAL: number
    /**
     * 视频通话帧率 最大取每秒5帧
     */
    CHAT_VIDEO_FRAME_RATE_5: number
    /**
     * 视频通话帧率 最大取每秒10帧
     */
    CHAT_VIDEO_FRAME_RATE_10: number
    /**
     * 视频通话帧率 最大取每秒15帧
     */
    CHAT_VIDEO_FRAME_RATE_15: number
    /**
     * 视频通话帧率 最大取每秒20帧
     */
    CHAT_VIDEO_FRAME_RATE_20: number
    /**
     * 视频通话帧率 最大取每秒25帧
     */
    CHAT_VIDEO_FRAME_RATE_25: number
  }
  /**
   * 分辨率设置。
   */
  const VIDEO_QUALITY: {
    /**
     * 180P
     */
    VIDEO_QUALITY_180p: number
    /**
     * 480P
     */
    VIDEO_QUALITY_480p: number
    /**
     * 720P
     */
    VIDEO_QUALITY_720p: number
    /**
     * 1080P
     */
    VIDEO_QUALITY_1080p: number
  }
  /**
   * 互动直播的音频采样率。
   */
  const LIVE_STREAM_AUDIO_SAMPLE_RATE: {
    /**
     * 32000 Hz
     */
    SAMPLE_RATE_32000: number
    /**
     * 44100 Hz
     */
    SAMPLE_RATE_44100: number
    /**
     * 48000 Hz
     */
    SAMPLE_RATE_48000: number
  }

  const LIVE_STREAM_AUDIO_CODEC_PROFILE: {
    LC_AAC: number
    HE_AAC: number
  }
}
