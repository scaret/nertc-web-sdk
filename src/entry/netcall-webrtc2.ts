import { Client } from '../netcall-G2/api/client'
import { Stream } from '../netcall-G2/api/stream'
import { Device } from '../netcall-G2/module/device'
import { clientNotYetUninitialized } from '../netcall-G2/constant/ErrorCode'
import { ClientOptions, StreamOptions } from "../netcall-G2/types";
import { BUILD, SDK_VERSION as VERSION } from "../netcall-G2/Config";
import { VIDEO_FRAME_RATE, NERTC_VIDEO_QUALITY as VIDEO_QUALITY } from "../netcall-G2/constant/videoQuality";
import { LIVE_STREAM_AUDIO_SAMPLE_RATE, LIVE_STREAM_AUDIO_CODEC_PROFILE } from "../netcall-G2/constant/liveStream";
import { checkExists, checkValidInteger } from "../netcall-G2/util/param";
import { getSupportedCodecs } from "../netcall-G2/util/rtcUtil/codec";
import { detectDevice } from "../netcall-G2/module/3rd/mediasoup-client";
import log from '../netcall-G2/util/log/logger';

/**
 * {@link NERTC} 
 * sdk的NERTC公共对象.
 * @class
 * @name NERTC
 */

/* 
  * 设备详情
  * @typedef {Object} DeviceInfo
  * @property {String} deviceId 该设备所独有的设备 ID（Chrome 81 及以后版本在获取媒体设备权限后才能获得设备 ID）
  * @property {String} label 能够区分设备的设备名字，例如"外接 USB 网络摄像头"（出于系统安全考虑，如果用户没有打开媒体设备的权限，该属性会被设为空）
 */


/**
 *  NERTC 是 云信 Web SDK 中所有可调用方法的入口
 *  @method constructor
 *  @memberOf NERTC
 */
let client:Client|null;


const NERTC = {

  Logger: {
    /**
     * 日志输出等级
     * @readonly
     * @enum {number}
     */
    // LogLevel: {
    //   /**
    //    * 输出所有日志
    //    */
    //   TRACE: 0,
    //   /**
    //    * 输出 DEBUG、INFO、WARN、ERROR 等级日志
    //    */
    //   DEBUG: 1,
    //   /**
    //    * 输出 INFO、WARN、ERROR 等级日志
    //    */
    //   INFO: 2,
    //   /**
    //    * 输出 WARN、ERROR 等级日志
    //    */
    //   WARN: 3,
    //   /**
    //    * 输出 ERROR 等级日志
    //    */
    //   ERROR: 4,
    //   /**
    //    * 不输出任何日志
    //    */
    //   NONE: 5
    // },

    /**
     * 设置日志输出等级
     * <br>
     * 默认输出 INFO 日志等级，该日志等级包含 SDK 关键路径信息。
     *
     * @param {LogLevel} level 日志输出等级 {@link TRTC.Logger.LogLevel LogLevel}
     * @example
     * // 输出INFO以上日志等级
     * TRTC.Logger.setLogLevel(TRTC.Logger.LogLevel.INFO);
     */
    // setLogLevel(level:number) {
    //   log.setLogLevel(level);
    // },

    /**
     * 打开日志上传
     * <br>
     * 调用本方法开启日志上传。日志上传默认是关闭状态，如果你需要开启此功能，请确保在所有方法之前调用本方法。
     *
     */
    enableLogUpload() {
      log.enableLogUpload();
    },

    /**
     * 关闭日志上传
     * <br>
     * 默认是关闭状态，如果你调用了开启日志上传（enableLogUpload)，可以通过本方法停止上传日志。
     */
    disableLogUpload() {
      log.disableLogUpload();
    }
  },

  /**
 * 创建客户端，开始通话前调用一次即可
 * @function createClient
 * @memberOf NERTC#
 * @param {Object} options 配置参数
 * @param {String} [options.appkey] 实例的应用ID
 * @param {Boolean} [options.debug=false] 是否开启debug模式，默认不开启，debug模式下浏览器会打印log日志
 * @return {Client} Client对象
 */
createClient (options:ClientOptions) {
  checkExists({tag: 'createClient:ClientOptions', value: options});
  checkExists({tag: 'createClient:ClientOptions.appkey', value: options.appkey});
  // 需要监视的API，埋点等
  const apiList:string[] = []

  if (client) {
    return new Client(
      Object.assign(options, {
        apiList: apiList,
        ref: NERTC
      })
    )
  }
  client = new Client(
    Object.assign(options, {
      apiList: apiList,
      ref: NERTC
    })
  )
  return client
},


/**
 * 该方法创建并返回音视频流对象。
 * @function createStream
 * @memberOf NERTC#
 * @param {Object} options 配置参数
 *  @param {String} [options.audio] 是否从麦克风采集音频
 *  @param {String | Number} [options.uid] 用户uid
 *  @param {String} [options.microphoneId] 麦克风设备 deviceId，通过 getMicrophones() 获取
 *  @param {Object} [options.video] 是否从摄像头采集视频
 *  @param {String} [options.cameraId] 摄像头设备 deviceId，通过 getCameras() 获取
 *  @param {String} [options.cameraId] 摄像头设备 deviceId，通过 getCameras() 获取
 *  @param {Object} [options.screen] 是否采集屏幕分享流
 *  @param {String} [options.sourceId] 屏幕共享的数据源Id（electron用户可以自己获取）
 *  @param {MeidaTrack} [options.audioSource] 自定义的音频的track
 *  @param {MeidaTrack} [options.videoSource] 自定义的视频的track
 *  @param {client} [options.client] 和要Stream绑定的client实例对象，默认是最初使用用createClient创建的client实例（多实例场景使用）
 *  @returns {Stream}  Stream对象
 */
createStream (options:StreamOptions) {
  checkExists({tag: 'createStream:options', value: options});
  checkExists({tag: 'createStream:options.uid', value: options.uid});
  if (options.screenAudio){
    if (!options.screen){
      throw new Error('createStream:screenAudio要与screen一起开启');
    }
    if (options.audio){
      throw new Error('createStream:screenAudio与audio只能开启一个');
    }
  }
  
  if (client || options.client) {
    return new Stream(Object.assign(options, {
      isRemote: false,
      client: options.client || client
    }))
  } else {
    return clientNotYetUninitialized
  }
},


/**
 * 该方法枚举可用的媒体输入/输出设备，比如麦克风、摄像头、耳机等。
 * @function getDevices
 * @memberOf NERTC#
 * @returns {Promise<Object>}  deviceInfo 完整的设备信息
 * @returns {Array<DeviceInfo>} deviceInfo.audioIn 可用的音频输入设备
 * @returns {Array<DeviceInfo>} deviceInfo.audioOut 可用的音频输出设备。
 * @returns {Array<DeviceInfo>} deviceInfo.video 可用的视频输入设备。
 *
 * @example
 * //接口使用示例
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
 */
getDevices() {
  return Device.getDevices()
},
/**
 * 获取可用的视频输入设备。
 * @function getCameras
 * @memberOf NERTC#
 * @returns {DeviceInfo}
 *
 *
 *@example
 //接口使用示例
 NERTC.getCameras().then(data => {
      data.forEach(item=>{
        console.log('video label: ', item.label, 'deviceId: ', item.deviceId)
      })
    })
 */
getCameras() {
  return Device.getCameras()
},
/**
 * 获取可用的音频输入设备。
 * @function getMicrophones
 * @memberOf NERTC#
 *  @returns {Promise}
 */
getMicrophones() {
  return Device.getMicrophones()
},
/**
 * 获取可用的音频输出设备。
 * @function getSpeakers
 * @memberOf NERTC#
 *  @returns {Promise}
 */
getSpeakers() {
  return Device.getSpeakers()
},

/**
 * 检查 SDK 对正在使用的浏览器的适配情况。
 * @function checkSystemRequirements
 * @memberOf NERTC#
 * 
 */
checkSystemRequirements() {
  var PC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  var getUserMedia = navigator.mediaDevices.getUserMedia;
  var webSocket = window.WebSocket;
  var isAPISupport = !!PC && !!getUserMedia && !!webSocket;
  return isAPISupport;
},
/**
 * 获取 SDK 对当前浏览器支持的编解码格式。
 * @function getSupportedCodec
 * @memberOf NERTC#
 *  @returns {Promise}
 *
 * @example
 //接口使用示例
 NERTC.getSupportedCodec().then(data => {
      data.forEach(item=>{
        console.log(`Supported video codec: ${data.video.join(",")});
        console.log(`Supported audio codec: ${data.audio.join(",")});
      })
    })
 */
async getSupportedCodec() {
  return await getSupportedCodecs();
},

getHandler() {
  return detectDevice()
},
/**
 * 销毁Client对象
 * @function destroy
 * @memberOf NERTC#
 * @param {Client} client 要销毁的client实例，不传递则销毁最初使用用createClient创建的client实例（一般多实例场景使用）
 * @returns {Promise}
 */
destroy(parameterClient?: Client){
  let tmp = parameterClient || client
  if (tmp) {
    tmp.destroy()
  }
  if (!parameterClient) {
    client = null
  }
},

CHAT_VIDEO_FRAME_RATE_NORMAL : VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL,
CHAT_VIDEO_FRAME_RATE_5 : VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5,
CHAT_VIDEO_FRAME_RATE_10 : VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_10,
CHAT_VIDEO_FRAME_RATE_15 : VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15,
CHAT_VIDEO_FRAME_RATE_20 : VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_20,
CHAT_VIDEO_FRAME_RATE_25 : VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_25,

VIDEO_QUALITY_180p : VIDEO_QUALITY.VIDEO_QUALITY_180p,
VIDEO_QUALITY_480p : VIDEO_QUALITY.VIDEO_QUALITY_480p,
VIDEO_QUALITY_720p : VIDEO_QUALITY.VIDEO_QUALITY_720p,
VIDEO_QUALITY_1080p : VIDEO_QUALITY.VIDEO_QUALITY_1080p,
LIVE_STREAM_AUDIO_CODEC_PROFILE,
LIVE_STREAM_AUDIO_SAMPLE_RATE,
VIDEO_FRAME_RATE,
VIDEO_QUALITY,
VERSION,
BUILD
}


module.exports = NERTC;
(<any>window).WebRTC2 = NERTC;



