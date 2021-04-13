import { Client } from './Client';
import { Stream } from './Stream';
import { ClientOptions, StreamOptions } from "./Types";
import {DeviceInfo} from "./Browser";

export as namespace WebRTC2;

/**
 * WebRTC2 是 云信 Web SDK 中所有可调用方法的入口
 */
declare namespace WebRTC2 {
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
   * WebRTC2.getDevices().then(data => {
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
   * WebRTC2.getCameras().then(data => {
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
  function checkSystemRequirements(): void;

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
