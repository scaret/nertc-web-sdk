import { Client } from './client';
import { Stream } from './stream';
import { ClientOptions, StreamOptions } from "./types";
import {DeviceInfo} from "./browser";

/**
 * NERTC 是 云信 Web SDK 中所有可调用方法的入口
 */
/*export  = NERTC
export  as namespace NERTC*/
declare namespace NERTC {
  const Logger: {
    /**
     * 打开日志上传
     * <br>
     * 调用本方法开启日志上传。日志上传默认是关闭状态，如果你需要开启此功能，请确保在所有方法之前调用本方法。
     *
     */
    enableLogUpload() : void;

    /**
     * 关闭日志上传
     * <br>
     * 默认是关闭状态，如果你调用了开启日志上传（enableLogUpload)，可以通过本方法停止上传日志。
     */

    disableLogUpload(): void;

  }
  /**
   * 创建客户端，开始通话前调用一次即可
   * @param options 配置参数
   */
  function createClient(options: ClientOptions): Client;
  /**
   * 该方法创建并返回音视频流对象。
   * 注意：自 V4.1.0 版本起，摄像头与屏幕共享的视频流可以同时发送，其中，屏幕共享流会以辅流形式发送。
   * @param options 配置参数 
   */
  function createStream(options: StreamOptions): Stream | {
    name: string;
    code: number;
    desc: string;
  };
  /**
   * 该方法枚举可用的媒体输入/输出设备，比如麦克风、摄像头、耳机等。
   *
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
    video: DeviceInfo[];
    audioIn: DeviceInfo[];
    audioOut: DeviceInfo[];
  }>;
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
  function getCameras(): Promise<DeviceInfo[]>;
  /**
   * 获取可用的音频输入设备。
   */
  function getMicrophones(): Promise<DeviceInfo[]>;
  /**
   * 获取可用的音频输出设备。
   */
  function getSpeakers(): Promise<DeviceInfo[]>;

  /**
   * 检查 NERTC Web SDK 对正在使用的浏览器的适配情况。
   * 
   * @note
   * 
   * - 请在创建音视频对象（createClient）之前调用该方法。
   * - SDK 和浏览器的适配情况与浏览器类型和版本有关，不同的浏览器版本可能会返回不一样的适配结果。
   * 
   * @returns
   * - `true`: SDK 与当前使用的浏览器适配
   * - `false`: SDK 与当前使用的浏览器不适配
   */
  function checkSystemRequirements(): Boolean;

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
   *     console.log(`Supported video codec: ${data.video.join(",")});
   *     console.log(`Supported audio codec: ${data.audio.join(",")});
   *   })
   * })
   * ```
   */
   function getSupportedCodec(): Promise<{audio: ["OPUS"], video: ["H264", "VP8"]}>;


  const VERSION: string;
  const BUILD: string;

  /**
   * 销毁Client对象
   * @param client 要销毁的client实例，不传递则销毁最初使用用createClient创建的client实例（一般多实例场景使用）。
   */
  function destroy(client?: Client): void;

  /**
   * 视频帧率设置
   */
  const VIDEO_FRAME_RATE: {
    /**
     *    视频通话帧率默认值 最大取每秒15帧
     */
    CHAT_VIDEO_FRAME_RATE_NORMAL: number;
    /**
     * 视频通话帧率 最大取每秒5帧
     */
    CHAT_VIDEO_FRAME_RATE_5: number;
    /**
     * 视频通话帧率 最大取每秒10帧
     */
    CHAT_VIDEO_FRAME_RATE_10: number;
    /**
     * 视频通话帧率 最大取每秒15帧
     */
    CHAT_VIDEO_FRAME_RATE_15: number;
    /**
     * 视频通话帧率 最大取每秒20帧
     */
    CHAT_VIDEO_FRAME_RATE_20: number;
    /**
     * 视频通话帧率 最大取每秒25帧
     */
    CHAT_VIDEO_FRAME_RATE_25: number;
  };

  const VIDEO_QUALITY: {
    VIDEO_QUALITY_180p: number;
    VIDEO_QUALITY_480p: number;
    VIDEO_QUALITY_720p: number;
    VIDEO_QUALITY_1080p: number;
  };

  const LIVE_STREAM_AUDIO_SAMPLE_RATE: {
    SAMPLE_RATE_32000: number;
    SAMPLE_RATE_44100: number;
    SAMPLE_RATE_48000: number;
  };
  
  const LIVE_STREAM_AUDIO_CODEC_PROFILE: {
    LC_AAC: number;
    HE_AAC: number;
  };
  
}