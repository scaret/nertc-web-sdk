import { Client } from '../netcall-G2/api/client'
import { Stream } from '../netcall-G2/api/stream'
import { Device } from '../netcall-G2/module/device'
import {clientNotYetUninitialized} from '../netcall-G2/constant/ErrorCode'
import {ClientOptions, StreamOptions} from "../netcall-G2/types";
import {BUILD, SDK_VERSION as VERSION} from "../netcall-G2/Config";
import {VIDEO_FRAME_RATE, WEBRTC2_VIDEO_QUALITY as VIDEO_QUALITY} from "../netcall-G2/constant/videoQuality";
import {checkExists, checkValidInteger} from "../netcall-G2/util/param";

/**
 * {@link WebRTC2} 
 * sdk的WebRTC2公共对象.
 * @class
 * @name WebRTC2
 */
let WebRTC2:any;

/* 
  * 设备详情
  * @typedef {Object} DeviceInfo
  * @property {String} deviceId 该设备所独有的设备 ID（Chrome 81 及以后版本在获取媒体设备权限后才能获得设备 ID）
  * @property {String} label 能够区分设备的设备名字，例如"外接 USB 网络摄像头"（出于系统安全考虑，如果用户没有打开媒体设备的权限，该属性会被设为空）
 */


/**
 *  WebRTC2 是 云信 Web SDK 中所有可调用方法的入口
 *  @method constructor
 *  @memberOf WebRTC2
 */
let client:Client|null;



/**
 * 创建客户端，开始通话前调用一次即可
 * @function createClient
 * @memberOf WebRTC2#
 * @param {Object} options 配置参数
 * @param {String} [options.appkey] 实例的应用ID
 * @param {Boolean} [options.debug=false] 是否开启debug模式，默认不开启，debug模式下浏览器会打印log日志
 * @return {Client} Client对象
 */
function createClient (options:ClientOptions) {
  checkExists({tag: 'createClient:ClientOptions', value: options});
  checkExists({tag: 'createClient:ClientOptions.appkey', value: options.appkey});
  // 需要监视的API，埋点等
  const apiList:string[] = []

  if (client) {
    return new Client(
      Object.assign(options, {
        apiList: apiList,
        ref: WebRTC2
      })
    )
  }
  client = new Client(
    Object.assign(options, {
      apiList: apiList,
      ref: WebRTC2
    })
  )
  return client
};


/**
 * 该方法创建并返回音视频流对象。
 * @function createStream
 * @memberOf WebRTC2#
 * @param {Object} options 配置参数
 *  @param {String} [options.audio] 是否从麦克风采集音频
 *  @param {String} [options.uid] 用户uid
 *  @param {String} [options.microphoneId] 麦克风设备 deviceId，通过 getMicrophones() 获取
 *  @param {Object} [options.video] 是否从摄像头采集视频
 *  @param {String} [options.cameraId] 摄像头设备 deviceId，通过 getCameras() 获取
 *  @param {Object} [options.screen] 是否采集屏幕分享流
 *  @param {MeidaTrack} [options.audioSource] 自定义的音频的track
 *  @param {MeidaTrack} [options.videoSource] 自定义的视频的track
 *  @param {client} [options.client] 和要Stream绑定的client实例对象，默认是最初使用用createClient创建的client实例（多实例场景使用）
 *  @returns {Stream}  Stream对象
 */
function createStream (options:StreamOptions) {
  checkExists({tag: 'createStream:options', value: options});
  checkExists({tag: 'createStream:options.uid', value: options.uid});
  
  if (client || options.client) {
    return new Stream(Object.assign(options, {
      isRemote: false,
      client: options.client || client
    }))
  } else {
    return clientNotYetUninitialized
  }
};


/**
 * 该方法枚举可用的媒体输入/输出设备，比如麦克风、摄像头、耳机等。
 * @function getDevices
 * @memberOf WebRTC2#
 * @returns {Promise<Object>}  deviceInfo 完整的设备信息
 * @returns {Array<DeviceInfo>} deviceInfo.audioIn 可用的音频输入设备
 * @returns {Array<DeviceInfo>} deviceInfo.audioOut 可用的音频输出设备。
 * @returns {Array<DeviceInfo>} deviceInfo.video 可用的视频输入设备。
 *
 * @example
 * //接口使用示例
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
 */
function getDevices() {
  return Device.getDevices()
};
/**
 * 获取可用的视频输入设备。
 * @function getCameras
 * @memberOf WebRTC2#
 * @returns {DeviceInfo}
 *
 *
 *@example
 //接口使用示例
 WebRTC2.getCameras().then(data => {
      data.forEach(item=>{
        console.log('video label: ', item.label, 'deviceId: ', item.deviceId)
      })
    })
 */
function getCameras() {
  return Device.getCameras()
};
/**
 * 获取可用的音频输入设备。
 * @function getMicrophones
 * @memberOf WebRTC2#
 *  @returns {Promise}
 */
function getMicrophones() {
  return Device.getMicrophones()
}
/**
 * 获取可用的音频输出设备。
 * @function getSpeakers
 * @memberOf WebRTC2#
 *  @returns {Promise}
 */
function getSpeakers() {
  return Device.getSpeakers()
};

function checkSystemRequirements() {

};
/**
 * 销毁Client对象
 * @function destroy
 * @memberOf WebRTC2#
 * @param {Client} client 要销毁的client实例，不传递则销毁最初使用用createClient创建的client实例（一般多实例场景使用）
 * @returns {Promise}
 */
function destroy(parameterClient?: Client){
  let tmp = parameterClient || client
  if (tmp) {
    tmp.destroy()
  }
  if (!parameterClient) {
    client = null
  }
}

const CHAT_VIDEO_FRAME_RATE_NORMAL = VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL;
const CHAT_VIDEO_FRAME_RATE_5 = VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5;
const CHAT_VIDEO_FRAME_RATE_10 = VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_10;
const CHAT_VIDEO_FRAME_RATE_15 = VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15;
const CHAT_VIDEO_FRAME_RATE_20 = VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_20;
const CHAT_VIDEO_FRAME_RATE_25 = VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_25;

const VIDEO_QUALITY_180p = VIDEO_QUALITY.VIDEO_QUALITY_180p;
const VIDEO_QUALITY_480p = VIDEO_QUALITY.VIDEO_QUALITY_480p;
const VIDEO_QUALITY_720p = VIDEO_QUALITY.VIDEO_QUALITY_720p;
const VIDEO_QUALITY_1080p = VIDEO_QUALITY.VIDEO_QUALITY_1080p;

WebRTC2 = {
  createClient,
  createStream,
  getDevices,
  getCameras,
  getMicrophones,
  getSpeakers,
  checkSystemRequirements,
  destroy,
  VIDEO_FRAME_RATE,
  VIDEO_QUALITY,

  CHAT_VIDEO_FRAME_RATE_NORMAL,
  CHAT_VIDEO_FRAME_RATE_5,
  CHAT_VIDEO_FRAME_RATE_10,
  CHAT_VIDEO_FRAME_RATE_15,
  CHAT_VIDEO_FRAME_RATE_20,
  CHAT_VIDEO_FRAME_RATE_25,

  VIDEO_QUALITY_180p,
  VIDEO_QUALITY_480p,
  VIDEO_QUALITY_720p,
  VIDEO_QUALITY_1080p,
  
  VERSION,
  BUILD
}


export {
  createClient,
  createStream,
  getDevices,
  getCameras,
  getMicrophones,
  getSpeakers,
  checkSystemRequirements,
  destroy,
  VIDEO_FRAME_RATE,
  VIDEO_QUALITY,

  CHAT_VIDEO_FRAME_RATE_NORMAL,
  CHAT_VIDEO_FRAME_RATE_5,
  CHAT_VIDEO_FRAME_RATE_10,
  CHAT_VIDEO_FRAME_RATE_15,
  CHAT_VIDEO_FRAME_RATE_20,
  CHAT_VIDEO_FRAME_RATE_25,

  VIDEO_QUALITY_180p,
  VIDEO_QUALITY_480p,
  VIDEO_QUALITY_720p,
  VIDEO_QUALITY_1080p,
  
  VERSION,
  BUILD
}
