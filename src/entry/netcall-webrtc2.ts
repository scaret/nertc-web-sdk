import { Client } from '../netcall-G2/api/client'
import { LocalStream } from '../netcall-G2/api/localStream'
import { BUILD, ENV, SDK_VERSION as VERSION } from '../netcall-G2/Config'
import { clientNotYetUninitialized } from '../netcall-G2/constant/ErrorCode'
import {
  LIVE_STREAM_AUDIO_CODEC_PROFILE,
  LIVE_STREAM_AUDIO_SAMPLE_RATE
} from '../netcall-G2/constant/liveStream'
import { NETWORK_STATUS } from '../netcall-G2/constant/networkStatus'
import {
  NERTC_RECORD_VIDEO_FRAME_RATE,
  NERTC_RECORD_VIDEO_QUALITY,
  NERTC_VIDEO_QUALITY as VIDEO_QUALITY,
  STREAM_TYPE,
  VIDEO_FRAME_RATE
} from '../netcall-G2/constant/videoQuality'
import { detectDevice } from '../netcall-G2/module/3rd/mediasoup-client'
import { Device } from '../netcall-G2/module/device'
import { getParameters } from '../netcall-G2/module/parameters'
import { ClientOptions, LocalStreamOptions, PlatformTypeMap } from '../netcall-G2/types'
import { checkSystemRequirements } from '../netcall-G2/util/checkSystemRequirements'
import ErrorCode from '../netcall-G2/util/error/errorCode'
import RtcError from '../netcall-G2/util/error/rtcError'
import log from '../netcall-G2/util/log/logger'
import { loglevelMap, loglevels } from '../netcall-G2/util/log/loglevels'
import { checkExists } from '../netcall-G2/util/param'
import { getSupportedCodecs } from '../netcall-G2/util/rtcUtil/codec'
import { checkBrowserCompatibility, isHttpProtocol } from '../netcall-G2/util/rtcUtil/rtcSupport'
import * as env from '../netcall-G2/util/rtcUtil/rtcEnvironment'

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
let client: Client | null
let win: any = window

export const NERTC = {
  Logger: {
    DEBUG: 0,

    INFO: 1,

    WARNING: 2,

    ERROR: 3,

    NONE: 4,

    setLogLevel(level: loglevels) {
      const forceLogLevel = getParameters().forceLogLevel
      if (forceLogLevel !== -1) {
        client?.logger.error(`setLogLevel: 本页面的日志级别固定为 ${loglevelMap[forceLogLevel]}`)
      } else {
        if (client) {
          client.apiFrequencyControl({
            name: 'setLogLevel',
            code: 0,
            param: {
              clientUid: client.adapterRef.channelInfo.uid || '',
              level
            }
          })
        }
        log.setLogLevel(level)
      }
    },

    /**
     * 打开日志上传
     * <br>
     * 调用本方法开启日志上传。日志上传默认是关闭状态，如果你需要开启此功能，请确保在所有方法之前调用本方法。
     *
     */
    enableLogUpload() {
      if (getParameters().forceLogUpload === 'off') {
        client?.logger.error(`enableLogUpload: 禁止开启日志上传`)
      } else {
        if (client) {
          client.apiFrequencyControl({
            name: 'enableLogUpload',
            code: 0,
            param: {
              clientUid: client.adapterRef.channelInfo.uid || ''
            }
          })
        }
        log.enableLogUpload()
      }
    },

    /**
     * 关闭日志上传
     * <br>
     * 默认是关闭状态，如果你调用了开启日志上传（enableLogUpload)，可以通过本方法停止上传日志。
     */
    disableLogUpload() {
      if (getParameters().forceLogUpload === 'on') {
        client?.logger.error(`disableLogUpload: 禁止关闭日志上传`)
      } else {
        if (client) {
          client.apiFrequencyControl({
            name: 'disableLogUpload',
            code: 0,
            param: {
              clientUid: client.adapterRef.channelInfo.uid || ''
            }
          })
        }
        log.disableLogUpload()
      }
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
  createClient(options: ClientOptions) {
    if (!checkSystemRequirements()) {
      console.error('浏览器环境不支持')
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT_ERROR,
        message: '云信sdk不支持，请使用最新版本的chrome浏览器'
      })
    }
    checkExists({ tag: 'createClient:ClientOptions', value: options })
    checkExists({ tag: 'createClient:ClientOptions.appkey', value: options.appkey })
    // 需要监视的API，埋点等
    const apiList: string[] = []
    const instance = new Client(
      Object.assign(options, {
        apiList: apiList,
        ref: NERTC
      })
    )
    getParameters().clients.push(instance)
    if (!client) {
      client = instance
    }
    return instance
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
  createStream(options: LocalStreamOptions) {
    checkExists({ tag: 'createStream:options', value: options })
    if (isHttpProtocol()) {
      client?.adapterRef.logger.warn('The current protocol is HTTP')
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT_ERROR,
        message: '请使用https环境或者localhost环境'
      })
    }
    let getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    if (!getUserMedia) {
      console.warn(`没有 getUserMedia 方法。请使用最新版本的chrome浏览器`)
      throw new RtcError({
        code: ErrorCode.NOT_SUPPORT_ERROR,
        message: '浏览器不支持开启媒体设备，请使用最新版本的chrome浏览器'
      })
    }
    if (options.screenAudio) {
      if (!options.screen) {
        throw new RtcError({
          code: ErrorCode.INVALID_OPERATION_ERROR,
          message: 'createStream: screenAudio 要与 screen 一起开启'
        })
      }
    }

    if (!options.client && client) {
      client.adapterRef.logger.warn('createStream: 未传入client参数。使用默认client。')
    }
    if (client || options.client) {
      const localStream = new LocalStream(
        Object.assign(options, {
          isRemote: false,
          client: options.client || client
        })
      )
      getParameters().localStreams.push(localStream)
      return localStream
    } else {
      return clientNotYetUninitialized
    }
  },

  Device: Device,

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
  getDevices(requestPerm = false) {
    return Device.getDevices({
      audioinput: true,
      audiooutput: true,
      videoinput: true,
      requestPerm
    })
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
  getCameras(requestPerm = false) {
    return Device.getCameras(requestPerm)
  },
  /**
   * 获取可用的音频输入设备。
   * @function getMicrophones
   * @memberOf NERTC#
   *  @returns {Promise}
   */
  getMicrophones(requestPerm = false) {
    return Device.getMicrophones(requestPerm)
  },
  /**
   * 获取可用的音频输出设备。
   * @function getSpeakers
   * @memberOf NERTC#
   *  @returns {Promise}
   */
  getSpeakers(requestPerm = false) {
    return Device.getSpeakers(requestPerm)
  },

  /**
   * 检查 SDK 对正在使用的浏览器的适配情况。
   * @function checkSystemRequirements
   * @memberOf NERTC#
   *
   */
  checkSystemRequirements,
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
        console.log(`Supported video codec: ${data.video.join(",")}`);
        console.log(`Supported audio codec: ${data.audio.join(",")}`);
      })
    })
 */
  async getSupportedCodec() {
    return await getSupportedCodecs()
  },

  /**
 * 获取当前浏览器支持 WebRTC 的基本能力。
 * @function checkBrowserCompatibility
 * @memberOf NERTC#
 *  @returns {Promise}
 *
 * @example
 //接口使用示例
  NERTC.checkBrowserCompatibility().then(data => {
    console.log(`isPullStreamSupport: ${data.isPullStreamSupport}`);
    console.log(`isPushStreamSupport: ${data.isPushStreamSupport}`);
    console.log(`isScreenShareSupport: ${data.isScreenShareSupport}`);
  })
 */

  async checkBrowserCompatibility() {
    return await checkBrowserCompatibility()
  },

  getHandler() {
    return detectDevice()
  },

  getParameters: getParameters,

  /**
   * 销毁Client对象
   * @function destroy
   * @memberOf NERTC#
   * @param {Client} client 要销毁的client实例，不传递则销毁最初使用用createClient创建的client实例（一般多实例场景使用）
   * @returns {Promise}
   */
  destroy(parameterClient?: Client) {
    let tmp = parameterClient || client
    if (tmp) {
      tmp.destroy()
    }
    if (!parameterClient) {
      client = null
    }
  },

  PlatformTypeMap: PlatformTypeMap,

  CHAT_VIDEO_FRAME_RATE_NORMAL: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_NORMAL,
  CHAT_VIDEO_FRAME_RATE_5: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_5,
  CHAT_VIDEO_FRAME_RATE_10: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_10,
  CHAT_VIDEO_FRAME_RATE_15: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_15,
  CHAT_VIDEO_FRAME_RATE_20: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_20,
  CHAT_VIDEO_FRAME_RATE_25: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_25,
  CHAT_VIDEO_FRAME_RATE_30: VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_30,

  VIDEO_QUALITY_180p: VIDEO_QUALITY.VIDEO_QUALITY_180p,
  VIDEO_QUALITY_480p: VIDEO_QUALITY.VIDEO_QUALITY_480p,
  VIDEO_QUALITY_720p: VIDEO_QUALITY.VIDEO_QUALITY_720p,
  VIDEO_QUALITY_1080p: VIDEO_QUALITY.VIDEO_QUALITY_1080p,
  RECORD_VIDEO_QUALITY_360p: NERTC_RECORD_VIDEO_QUALITY.RECORD_VIDEO_QUALITY_360p,
  RECORD_VIDEO_QUALITY_480p: NERTC_RECORD_VIDEO_QUALITY.RECORD_VIDEO_QUALITY_480p,
  RECORD_VIDEO_QUALITY_720p: NERTC_RECORD_VIDEO_QUALITY.RECORD_VIDEO_QUALITY_720p,
  RECORD_VIDEO_FRAME_RATE_15: NERTC_RECORD_VIDEO_FRAME_RATE.RECORD_VIDEO_FRAME_RATE_15,
  RECORD_VIDEO_FRAME_RATE_30: NERTC_RECORD_VIDEO_FRAME_RATE.RECORD_VIDEO_FRAME_RATE_30,
  LIVE_STREAM_AUDIO_CODEC_PROFILE,
  LIVE_STREAM_AUDIO_SAMPLE_RATE,
  VIDEO_FRAME_RATE,
  VIDEO_QUALITY,
  NETWORK_STATUS,
  STREAM_TYPE,
  VERSION,
  BUILD,
  ENV
}

module.exports = win.WebRTC2 = NERTC
