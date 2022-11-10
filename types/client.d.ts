/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

import {
  ClientExceptionEvt,
  JoinOptions,
  MediaType,
  RTMPTask,
  RTMPTaskState,
  MediaPriorityOptions,
  EncryptionMode,
  STREAM_TYPE,
  ClientMediaRecordingOptions
} from './types'
import { Stream } from './stream'
import { ConnectionState } from './types'
import { NetStatusItem } from './types'
import { DeviceInfo } from './browser'

/**
 * Client 接口提供音视频通话的核心功能，例如加入房间、发布和订阅音视频流等。
 *
 * 请使用 [[NERTC.createClient]] 创建 Client 对象，Client 对象指通话中的本地或远程用户，提供云信 NERTC SDK 的核心功能。
 */
declare interface Client {
  /**
   * 获取当前通话信息。
   */
  getChannelInfo(): {
    /**
     * 频道ID，可用于服务端API调用。
     */
    cid: number
    /**
     * 用户输入的频道名。
     */
    channelName: string
    /**
     * 用户输入的id。当用户输入的uid为0时，则可获取服务端随机分配的uid。
     */
    uid: number | string
    /**
     * 用户输入的token。
     */
    token: string
  }

  /**
   * 开启云代理服务。
   * <br>在内网环境下，如果用户防火墙开启了网络限制，请参考《使用云代理》将指定 IP 地址和端口号加入防火墙白名单，然后调用此方法开启云代理。
   * @note **注意**
   * - 请在加入房间（join）前调用此方法。
   * - 如果需要关闭已设置的云代理，请在加入房间前调用 `stopProxyServer`。
   * @returns
   * 错误码包括：
   *
   * | **错误码（code）** | 错误原因（reason）                     |
   * | -------------- | -----------------------------------------|
   * | `INVALID_OPERATION` | 非法操作，请在加入房间之前调用该接口。  |
   */
  startProxyServer(): void

  /**
   * 关闭云代理服务。
   * @note 请在加入房间（join）前调用此方法。
   */
  stopProxyServer(): void

  /**
     设置本地用户的媒体流优先级。

     如果某个用户的优先级为高，那么该用户媒体流的优先级就会高于其他用户，弱网环境下 SDK 会优先保证其他用户收到的、高优先级用户的媒体流的质量。

     @note
     - 请在加入房间（join）前调用此方法。
     - 一个音视频房间中只有一个高优先级的用户。建议房间中只有一位用户调用 setLocalMediaPriority 将本端媒体流设为高优先级，否则需要开启抢占模式，保证本地用户的高优先级设置生效。

     @param options 优先级设置。
     */
  setLocalMediaPriority(options: MediaPriorityOptions): void

  /**
   * 加入房间。
   *
   * 加入房间时，如果指定房间尚未创建，云信服务器内部会自动创建一个同名房间。
   *
   * 调用该方法加入房间时，本地会触发 Client.on("connection-state-change") 回调；通信场景下的用户和直播场景下的主播角色加入房间后，远端会触发 Client.on("peer-online") 回调。
   *
   * @param options 房间相关设置。
   *
   * @returns
   * 错误码包括：
   *
   * | **错误码（code）** | 错误原因（reason）                                   | 说明                                                                                                                                                                             |
   * | -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   * | 403            | netcall.g2 unsafe mode is closed, please contact business! | 安全模式下未设置 Token。请通过服务端 getToken 接口获取 NERTC Token，并在加入房间时传入。如果您仍处于测试阶段，可以在控制台切换应用为调试模式，调试模式下加入房间时无需设置 Token。 |
   * | 414            | check checksum error                                       | 鉴权失败。通常原因为加入房间时设置的 Token 错误。                                                                                                             |
   */
  join(options: JoinOptions): Promise<any>

  /**
   * 离开房间。
   *
   * 调用该方法离开房间时，本地会触发 Client.on("connection-state-change") 回调；通信场景下的用户和直播场景下的主播角色离开房间后，远端会触发 Client.on("peer-leave") 回调。
   */
  leave(): Promise<void>

  /**
   * 发布本地音视频流。
   *
   * 发布音视频流之后，远端会触发 Client.on("stream-added") 回调。
   *
   * @param stream 需要发布的 Stream。
   */
  publish(stream: Stream): Promise<undefined>
  /**
   * 停止将本地音视频流发布到本房间。
   *
   * 停止发布音视频流之后，远端会触发 Client.on("stream-removed") 回调。
   *
   * @param stream 需要取消发布的 Stream。
   * @param type   流类型。
   */
  unpublish(stream?: Stream, type?: null): Promise<undefined>
  /**
   * 订阅远端音视频流。
   *
   * 订阅远端音视频流之后，本地会触发 Client.on("stream-subscribed") 回调。
   *
   * @param stream 需要订阅的源端音视频流。
   */
  subscribe(stream: Stream): Promise<void>
  /**
   * 取消订阅远端音视频流。
   *
   * 取消订阅后，SDK 将不再接收远端音视频流。
   * @param stream 需要取消订阅的源端音视频流。
   */
  unsubscribe(stream: Stream): Promise<void>
  /**
   * 开启双流模式
   *
   * 双流为视频大流和视频小流，其中视频大流指高分辨率、高码率的视频流，视频小流指低分辨率、低码率的视频流。
   *
   * @since V4.6.0
   *
   * @note 注意事项
   * * 该方法在 Publish 端，即发送端调用。该方法建议在 [[Client.join]] 后、[[Client.publish]] 前调用。
   * * 接收端大小流通过 [[Client.subscribe]] 和 [[Client.setRemoteStreamType]] 进行调用和切换。
   * * 视频小流的目标码率为100kbps，屏幕共享小流的目标码率为200kbps。
   * * SDK会尝试使用接近 180p(240x180) 的低分辨率进行重新采集以提高编解码效率。浏览器会尽量在保证长宽比的情况下使小流的采集接近180p。但由于浏览器和摄像头的限制，小流的分辨率也会出现240p、480p甚至与大流一致的情况，这些都为正常现象。
   * * 部分H5设备开启小流异常时，建议在[[Client.subscribe]]时选择订阅大流，再通过[[Client.setRemoteStreamType]]切换为小流。
   *
   * ```javascript
   * // 加入频道后
   * rtc.localStream = NERTC.createStream({
   *   audio: true,
   *   video: true,
   *   uid: 1234,
   *   client: rtc.client,
   * })
   * await rtc.localStream.init()
   * rtc.client.enableDualStream()
   * await rtc.client.join({
   *   channelName: "channelName",
   *   token: "token",
   *   uid: 1234
   * });
   * ```
   *
   */
  enableDualStream(dualStreamSetting?: { video: boolean; screen: boolean }): void

  /**
   * 关闭双流模式
   *
   * 双流模式默认为关闭状态。如如开启双流模式后需关闭，请在 [[Client.unpublish]] 后、再次 [[Client.publish]] 之前调用该方法。
   *
   */
  disableDualStream(): void
  /**
   * 动态切换视频大小流。可参见[[Client.setRemoteStreamType]]方法。
   *
   * @param stream 指定音视频流。
   * @param highOrLow 指定大小流类型。可以使用`NERTC.STREAM_TYPE.HIGH` 或 `NERTC.STREAM_TYPE.LOW` 指定
   *
   * @note 注意事项
   * * 该方法是在处于订阅状态时改变订阅的大小流类型时使用的。如您需要指定订阅那一刻的大小流类型，请参考[[Stream.setSubscribeConfig]]
   * * 如需指定辅流大小流，请使用 [[Client.setRemoteStreamType]]
   */
  setRemoteVideoStreamType(stream: Stream, highOrLow: STREAM_TYPE): Promise<void>

  /**
   * 动态切换视频大小流。
   *
   * 如果发送端开启了双流模式，即大小流模式，订阅端默认接收大流，您也可以在订阅端调用此方法选择接收大流还是小流。
   *
   * @param stream 指定音视频流。
   * @param highOrLow 指定大小流类型。可以使用`NERTC.STREAM_TYPE.HIGH` 或 `NERTC.STREAM_TYPE.LOW` 指定
   * @param mediaType 媒体类型。主流为"video"，辅流为"screen"
   *
   * @note 注意事项
   * * 该方法是在处于订阅状态时改变订阅的大小流类型时使用的。如您需要指定订阅那一刻的大小流类型，请参考[[Stream.setSubscribeConfig]]
   *
   * ```
   * // 在订阅状态下，想将屏幕共享的大流切换为小流。
   * rtc.client.setRemoteStreamType(remoteStream, NERTC.STREAM_TYPE.LOW, "screen")
   * ```
   */
  setRemoteStreamType(
    stream: Stream,
    highOrLow: STREAM_TYPE,
    mediaType: 'video' | 'screen'
  ): Promise<void>

  /**
   * 动态更新高级权限token。
   *
   * 启动高级权限token功能之后，用户可以中途动态更新其权限，以及刷新token超时时间
   *
   * @param newpermKey 新生成的高级权限token。
   *
   * @note 注意事项
   * * 该方法仅支持加入房间后调用
   *
   * ```
   * // 收到sdk反馈的高级token超时时间快要到的通知后，主动去刷新超时时间，或者中途更新本人的权限
   * rtc.client.updatePermKey(newpermKey).catch((err) => {
       console.error('刷新permKey错误: ', err.code, err.message)
     })
   * ```
   */
  updatePermKey(newpermKey: string): Promise<void>

  /**
   设置用户角色。默认情况下用户以主播角色加入房间。

   在加入房间前，用户可以调用本接口设置本端模式为观众或主播模式。在加入房间后，用户可以通过本接口切换用户模式。

   用户角色支持设置为主播（`host`）或观众(`audience`)，主播和观众的权限不同：
   + 主播：可以操作摄像头等音视频设备、发布流、配置互动直播推流任务、上下线对房间内其他用户可见。
   + 观众：观众只能接收音视频流，不支持操作音视频设备、配置互动直播推流任务、上下线不通知其他用户。

   @note 可以在加入房间之前或者之后设置。

   相关回调：

   如果您在加入房间后调用该方法切换用户角色，调用成功后，会触发以下回调：

   + 主播切换为观众，本地触发 Client.on(`client-role-changed`) 回调，远端触发 Client.on(`peer-leave`) 回调。
   + 观众切换为主播，本地触发 Client.on(`client-role-changed`) 回调，远端触发 Client.on(`peer-online`) 回调。

   * @param role

   用户角色。可设置为：
   + `host`：直播模式中的主播，可以发布和接收音视频流。如果用户之前已经发布了音频或视频，切换到主播时会自动恢复发布音频或视频流。
   + `audience`: 直播模式中的观众，只能接收音视频流。主播模式切换到观众模式后，会自动停止发送音视频流。

   */
  setClientRole(role: 'host' | 'audience'): Promise<undefined>
  /**
     主动获取网络连接状态。

     推荐用于以下场景：
     + 在 App 异常重启时，可以调用本接口主动获取当前客户端与服务器的连接状态，以做到本地与服务器状态的对齐。
     + 在实时音视频通话等业务场景中，主动获取房间的网络连接状态，以此完成上层业务逻辑。

     SDK 与服务器的连接状态，共有以下 4 种：

     + `DISCONNECTED`：网络连接断开。该状态表示 SDK 处于：
            1. 调用 [[Client.join]] 加入房间前的初始化阶段。
            2. 调用 [[Client.leave]] 离开房间之后。

     + `CONNECTING`：建立网络连接中。该状态表示 SDK 处于：
         1. 调用 [[Client.join]] 之后正在与指定房间建立连接。
         2. 通话过程中，连接中断自动重连。

     + `CONNECTED`：已连接。该状态表示用户已经成功加入房间，可以在房间内发布或订阅媒体流。

     + `DISCONNECTING`：正在断开连接。
         1. 在调用 [[Client.leave]] 的时候为此状态。
     */
  getConnectionState(): ConnectionState

  /**
   设置媒体流加密模式。

   在金融行业等安全性要求较高的场景下，您可以在加入房间前通过此方法设置媒体流加密模式。

   - 该方法和 [[Client.setEncryptionSecret]] 搭配使用，必须在加入房间前先调用 [[Client.setEncryptionMode]] 设置媒体流加密方案，再调用 [[Client.setEncryptionSecret]] 设置密钥。如果未指定密钥，则无法启用媒体流加密。
   - 用户离开房间后，SDK 会自动关闭加密。如需重新开启加密，需要在用户再次加入房间前调用这两个方法。

   @since V4.4.0

   @note
   - 请在加入房间前调用该方法，加入房间后无法修改加密模式与密钥。
   - 安全起见，建议每次启用媒体流加密时都更换新的密钥。
   - 同一房间内，所有开启媒体流加密的用户必须使用相同的加密模式和密钥，否则使用不同密钥的成员加入房间时会触发 `Client.on("crypt-error")` 回调。

   @param encryptionMode 媒体流加密方案。详细信息请参考 encryptionMode。

   ```JavaScript
     // 例如，使用 sm4-128-ecb
     client.setEncryptionMode('sm4-128-ecb');
     client.setEncryptionSecret('abcdefghijklmnop');
     // 然后通过client.join()加入房间
   ```
   */
  setEncryptionMode(encryptionMode: EncryptionMode): void

  /**
   * 设置媒体流加密密钥。
   *
   * - 该方法和 [[Client.setEncryptionMode]] 搭配使用，必须在加入房间前先调用 [[Client.setEncryptionMode]] 设置媒体流加密方案，再调用 [[Client.setEncryptionSecret]] 设置密钥。如果未指定密钥，则无法启用媒体流加密。
   * - 用户离开房间后，SDK 会自动关闭加密。如需重新开启加密，需要在用户再次加入房间前调用这两个方法。
   *
   * @since V4.4.0
   * @note
   * - 请在加入房间前调用该方法，加入房间后无法修改加密模式与密钥。
   * - 安全起见，建议每次启用媒体流加密时都更换新的密钥。
   * - 同一房间内，所有开启媒体流加密的用户必须使用相同的加密模式和密钥，否则使用不同密钥的成员加入房间时会触发 `Client.on("crypt-error")` 回调。
   *
   * @param encryptionSecret 媒体流加密密钥。字符串格式，长度为 1~128 字节。推荐设置为英文字符串。
   */
  setEncryptionSecret(encryptionSecret: string): void

  /**
   * 获取系统电量信息。
   */
  getSystemStats(): Promise<any>
  /**
   * 获取与会话的连接状况统计数据。
   *
   * @note 请在加入房间后调用此方法。
   */
  getSessionStats(): Promise<any>
  /**
   * 获取与网关的连接状况统计数据。
   */
  getTransportStats(): Promise<any>
  /**
   * 获取本地发布流的音频统计数据。
   *
   * @example
   * ```javascript
   * setInterval(async () => {
   *   const localAudioStats = await rtc.client.getLocalAudioStats();
   *   if (localAudioStats[0]){
   *     console.log(`===== localAudioStats =====`);
   *     console.log(`Audio CodecType: ${localAudioStats[0].CodecType}`);
   *     console.log(`Audio MuteState: ${localAudioStats[0].MuteState}`);
   *     console.log(`Audio RecordingLevel: ${localAudioStats[0].RecordingLevel}`);
   *     console.log(`Audio SamplingRate: ${localAudioStats[0].SamplingRate}`);
   *     console.log(`Audio SendBitrate: ${localAudioStats[0].SendBitrate}`);
   *     console.log(`Audio SendLevel: ${localAudioStats[0].SendLevel}`);
   *   }
   * }, 1000)
   * ```
   */
  getLocalAudioStats(): Promise<any>
  /**
   * 获取本地发布流的视频统计数据。
   *
   * @param mediaType 媒体流类型。"video"为视频流，"screen"为屏幕共享流。如不填，则一起返回
   *
   * @example
   * ```javascript
   * setInterval(async () => {
   *   const localVideoStats = await rtc.client.getLocalVideoStats();
   *   for (var i in localVideoStats){
   *     let mediaType = (i === 0 ? "video" : "screen")
   *     console.log(`===== localVideoStats ${mediaType} =====`);
   *     console.log(`${mediaType} CaptureFrameRate: ${localVideoStats[i].CaptureFrameRate}`);
   *     console.log(`${mediaType} CaptureResolutionHeight: ${localVideoStats[i].CaptureResolutionHeight}`);
   *     console.log(`${mediaType} CaptureResolutionWidth: ${localVideoStats[i].CaptureResolutionWidth}`);
   *     console.log(`${mediaType} EncodeDelay: ${localVideoStats[i].EncodeDelay}`);
   *     console.log(`${mediaType} MuteState: ${localVideoStats[i].MuteState}`);
   *     console.log(`${mediaType} SendBitrate: ${localVideoStats[i].SendBitrate}`);
   *     console.log(`${mediaType} SendFrameRate: ${localVideoStats[i].SendFrameRate}`);
   *     console.log(`${mediaType} SendResolutionHeight: ${localVideoStats[i].SendResolutionHeight}`);
   *     console.log(`${mediaType} SendResolutionWidth: ${localVideoStats[i].SendResolutionWidth}`);
   *     console.log(`${mediaType} TargetSendBitrate: ${localVideoStats[i].TargetSendBitrate}`);
   *     console.log(`${mediaType} TotalDuration: ${localVideoStats[i].TotalDuration}`);
   *     console.log(`${mediaType} TotalFreezeTime: ${localVideoStats[i].TotalFreezeTime}`);
   *   }
   * }, 1000)
   * ```
   */
  getLocalVideoStats(mediaType?: 'video' | 'screen'): Promise<any>
  /**
   * 获取远端订阅流的音频统计数据。
   *
   * @example
   * ```javascript
   * setInterval(async () => {
   *   const remoteAudioStatsMap = await rtc.client.getRemoteAudioStats();
   *   for(var uid in remoteAudioStatsMap){
   *       console.log(`Audio CodecType from ${uid}: ${remoteAudioStatsMap[uid].CodecType}`);
   *       console.log(`Audio End2EndDelay from ${uid}: ${remoteAudioStatsMap[uid].End2EndDelay}`);
   *       console.log(`Audio MuteState from ${uid}: ${remoteAudioStatsMap[uid].MuteState}`);
   *       console.log(`Audio PacketLossRate from ${uid}: ${remoteAudioStatsMap[uid].PacketLossRate}`);
   *       console.log(`Audio RecvBitrate from ${uid}: ${remoteAudioStatsMap[uid].RecvBitrate}`);
   *       console.log(`Audio RecvLevel from ${uid}: ${remoteAudioStatsMap[uid].RecvLevel}`);
   *       console.log(`Audio TotalFreezeTime from ${uid}: ${remoteAudioStatsMap[uid].TotalFreezeTime}`);
   *       console.log(`Audio TotalPlayDuration from ${uid}: ${remoteAudioStatsMap[uid].TotalPlayDuration}`);
   *       console.log(`Audio TransportDelay from ${uid}: ${remoteAudioStatsMap[uid].TransportDelay}`);
   *   }
   * }, 1000)
   * ```
   */
  getRemoteAudioStats(): Promise<any>
  /**
   * 获取远端订阅流的视频统计数据。
   *
   * @param mediaType 媒体流类型。"video"为视频流，"screen"为屏幕共享流。默认为"video"。
   * @example
   * ```javascript
   * setInterval(async () => {
   *   const remoteVideoStatsMap = await rtc.client.getRemoteVideoStats();
   *    for(var uid in remoteVideoStatsMap){
   *      console.log(`Video End2EndDelay from ${uid}: ${remoteVideoStatsMap[uid].End2EndDelay}`);
   *      console.log(`Video MuteState from ${uid}: ${remoteVideoStatsMap[uid].MuteState}`);
   *      console.log(`Video PacketLossRate from ${uid}: ${remoteVideoStatsMap[uid].PacketLossRate}`);
   *      console.log(`Video RecvBitrate from ${uid}: ${remoteVideoStatsMap[uid].RecvBitrate}`);
   *      console.log(`Video RecvResolutionHeight from ${uid}: ${remoteVideoStatsMap[uid].RecvResolutionHeight}`);
   *      console.log(`Video RecvResolutionWidth from ${uid}: ${remoteVideoStatsMap[uid].RecvResolutionWidth}`);
   *      console.log(`Video RenderFrameRate from ${uid}: ${remoteVideoStatsMap[uid].RenderFrameRate}`);
   *      console.log(`Video RenderResolutionHeight from ${uid}: ${remoteVideoStatsMap[uid].RenderResolutionHeight}`);
   *      console.log(`Video RenderResolutionWidth from ${uid}: ${remoteVideoStatsMap[uid].RenderResolutionWidth}`);
   *      console.log(`Video TotalFreezeTime from ${uid}: ${remoteVideoStatsMap[uid].TotalFreezeTime}`);
   *      console.log(`Video TotalPlayDuration from ${uid}: ${remoteVideoStatsMap[uid].TotalPlayDuration}`);
   *      console.log(`Video TransportDelay from ${uid}: ${remoteVideoStatsMap[uid].TransportDelay}`);
   *   }
   * }, 1000)
   * ```
   */
  getRemoteVideoStats(mediaType?: 'video' | 'screen'): Promise<any>
  /**
   * 获取本地用户 ID。
   *
   * 如果在 join 方法中指定了 uid，此处会返回指定的 ID; 如果未指定 uid，此处将返回云信服务器自动分配的 ID。
   * @since V4.4.0
   */
  getUid(): number | string | null
  /**
   * 设置房间场景。
   *
   * 房间场景可设置为通话或直播场景，不同的场景中 QoS 策略不同。
   *
   * @note 该方法必须在加入房间前调用，进入房间后无法再设置房间场景。
   */
  setChannelProfile(options: {
    /**
     * 房间场景。
     *
     * 可设置为：
     * - `rtc`：（默认）通信场景。该场景下，房间内所有用户都可以发布和接收音、视频流。适用于语音通话、视频群聊等应用场景。
     * - `live`：直播场景。该场景有主播和观众两种用户角色，可以通过 setClientRole 设置。主播可以发布和接收音视频流，观众直接接收流。适用于语聊房、视频直播、互动大班课等应用场景。
     */
    mode: 'rtc' | 'live'
  }): void

  /**
     客户端录制功能。

     允许用户在浏览器上实现本地录制音视频的功能。

     @since V4.6.10

     @note
     - 需要在加入房间之后调用。
     - 不允许同时录制多个文件。
     - 仅在chrome内核的浏览器上支持。
     - 录制文件的下载地址为浏览器默认下载地址
     - 录制文件的格式是webm，并非所有的播放器都支持（chrome上是可以直接播放的），如果需要转格式，需要开发者自己完成
     - 录制模块没有做内存管理，如果录制的时间过长，到导致内存占用越来越大，需要开发者及时释放

     @param options 是录制参数。详细信息请参考 ClientMediaRecordingOptions

     ```JavaScript
       // client.join()加入房间之后
       const data = {
         recorder: 'all',
         recordConfig: {
          recordType: 'video',
          recordName: '录制文件名称',
          recordVideoQuality: NERTC.RECORD_VIDEO_QUALITY_360p,
          recordVideoFrame: NERTC.RECORD_VIDEO_FRAME_RATE_15
        }
       }
       client.startMediaRecording(data);
     ```
     */
  startMediaRecording(options: ClientMediaRecordingOptions): Promise<undefined>

  /**
     结束视频录制
     @since V4.6.10


     ```JavaScript
       // client.startMediaRecording() 开启录制之后
       client.stopMediaRecording();
     ```
     */
  stopMediaRecording(): void

  /**
     下载录制的音视频数据，生成录制文件
     @since V4.6.10

     @note
     - 客户端录制，数据是保持在内存中，如果没有执行cleanMediaRecording释放，可以多次调用该接口生产录制文件。
     - 下载地址为浏览器默认地址

     ```JavaScript
       // client.startMediaRecording() 开启录制之后
       client.downloadMediaRecording();
     ```
     */
  downloadMediaRecording(): void

  /**
     清除内存中的录制的音视频数据
     @since V4.6.10

     @note
     - 客户端录制，数据是保持在内存中，需要主动调用该接口进行释放内存资源。

     ```JavaScript
       // client.startMediaRecording() 开启录制之后
       client.cleanMediaRecording();
     ```
     */
  cleanMediaRecording(): void

  /**
   * 添加房间推流任务。
   *
   * 成功调用该方法后，当前用户可以收到该直播流的状态通知 `Client.on("rtmp-state")`。
   *
   * - 该方法仅适用直播场景。
   * - 请在房间内调用该方法，该方法在通话中有效。
   * - 该方法每次只能增加一路旁路推流地址。如需推送多路流，则需多次调用该方法。同一个音视频房间（即同一个 channelid）可以创建 3 个不同的推流任务。
   *
   */
  addTasks(options: {
    /**
     * 推流任务信息。
     */
    rtmpTasks: RTMPTask[]
  }): Promise<undefined>
  /**
   * 删除房间推流任务。
   *
   * - 该方法仅适用直播场景。
   * - 请在房间内调用该方法，该方法在通话中有效。
   */
  deleteTasks(options: {
    /**
     * 推流任务 ID。
     */
    taskIds: string[]
  }): Promise<void>
  /**
   * 更新房间推流任务。
   * - 该方法仅适用直播场景。
   * - 请在房间内调用该方法，该方法在通话中有效。
   * @return {Promise}
   */
  updateTasks(options: {
    /**
     * 推流任务信息。
     */
    rtmpTasks: RTMPTask[]
  }): Promise<void>

  /**
   * 启用自定义加密
   * 需要在加入频道前调用`client.enableCustomTransform()`方法。调用后，可收到两个事件：`sender-transform` 和`receiver-transform`，应在这两个方法中实现加密和解密操作。
   * 自定义加密功能依赖 [encodedInsertableStreams](https://chromestatus.com/feature/5499415634640896) 接口。目前仅支持桌面端Chrome 94及以上版本。
   *
   */
  enableCustomTransform(): void

  /**
   * 销毁客户端对象。
   */
  destroy(): void

  /**
   * `client-role-changed` 回调表示本地用户的角色已改变。
   *
   * 直播场景下，当用户角色切换时会触发此回调，即主播切换为观众，或观众切换为主播时。
   */
  on(
    event: 'client-role-changed',
    callback: (evt: {
      /**
       * 改变后的角色。
       */
      role: 'host' | 'audience'
    }) => void
  ): void

  /**
   * `stream-added` 回调表示远端用户发布了音视频流。
   *
   * * 通常收到该事件后需要订阅音视频，即调用 [[Stream.setSubscribeConfig]] 和 [[Client.subscribe]]
   * * 该事件会为每一个音频或视频单独触发一次。`evt.mediaType`标识了具体的媒体类型。
   * * 与该事件相反的事件为 Client.on("stream-removed")
   * * 更完整的例子见[[NERTC.createClient]]
   * @example
   * ```javascript
   * rtc.client.on("stream-added", (evt)=>{
   *   console.log(`远端${evt.stream.getId()}发布了 ${evt.mediaType} 流`)
   *   rtc.client.subscribe(evt.stream)
   * });
   * ```
   *
   */
  on(
    event: 'stream-added',
    callback: (evt: {
      /**
       * 新增的远端流。
       */
      stream: Stream
      /**
       * 远端流新增的媒体类型
       */
      mediaType: 'audio' | 'audioSlave' | 'video' | 'screen'
    }) => void
  ): void

  /**
   * `stream-subscribed` 回调表示应用已接收远端音视频流。
   *
   * * 通常收到该事件后需要播放远端音视频。即调用 [[Stream.setRemoteRenderMode]] 和 [[Stream.play]]
   * * 该事件会为每一个音频或视频单独触发一次。`evt.mediaType`标识了具体的媒体类型。
   * * 更完整的例子见[[NERTC.createClient]]
   * @example
   * ```javascript
   *    rtc.client.on("stream-subscribed", (evt)=>{
   *        evt.stream.play(document.getElementById("remote-video-wrapper", {
   *          audio: true,
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
   *
   */
  on(
    event: 'stream-subscribed',
    callback: (evt: {
      /**
       * 已接收的远端流。
       */
      stream: Stream
      /**
       * 音视频轨道类型。
       */
      mediaType: 'audio' | 'audioSlave' | 'video' | 'screen'
    }) => void
  ): void

  /**
   * `stream-removed` 回调表示应用已删除远端音视频流。
   *
   * 远端用户调用 [[Client.unpublish]] 方法之后，会触发此回调。
   *
   * 注意：
   * * 该事件会为远端音频和视频分别触发一次。
   * * 如需确认远端离开，可参考 `peer-leave` 事件。
   * * 收到`stream-removed`时，如果调用不带参数的`evt.stream.stop()`，会同时关闭音视频渲染。这通常不是预期行为。
   *
   * @example
   * ```javascript
   * rtc.client.on("stream-removed", (evt)=>{
   *   // 远端流停止，则关闭渲染
   *   evt.stream.stop(evt.mediaType);
   * });
   * ```
   */
  on(
    event: 'stream-removed',
    callback: (evt: {
      /**
       * 远端流。
       */
      stream: Stream
      /**
       * 远端流被关闭的媒体类型
       */
      mediaType: 'audio' | 'audioSlave' | 'video' | 'screen'
    }) => void
  ): void

  /**
   * `active-speaker` 事件会返回当前房间内音量最大的用户的 uid（iOS 微信浏览器暂不支持该事件）。
   */
  on(
    event: 'active-speaker',
    callback: (evt: {
      /**
       * 音量最大的用户的 uid。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `volume-indicator` 事件会返回当前房间内除自己以外的用户的音量（iOS 微信浏览器暂不支持该事件）。
   * @example
   * ```javascript
   * rtc.client.on("volume-indicator", (userList)=>{
   *   // 远端流停止，则关闭渲染
   *   userList.forEach((user)=>{
   *     console.log(`用户 ${user.uid} 音量 ${user.level}`)
   *   })
   * });
   * ```
   */
  on(
    event: 'volume-indicator',
    callback: (
      userList: {
        /**
         * 用户 ID。
         */
        uid: number | string
        /**
         * 用户音量。
         */
        level: number
        /**
         * 音频类型。
         */
        type: 'audio' | 'audioSlave'
      }[]
    ) => void
  ): void

  /**
   * `peer-online` 事件表示有远端用户或主播加入房间。
   *
   * - 通信场景中，该回调提示有远端用户加入了房间，并返回新加入房间的用户 ID。
   * - 直播场景中，该回调提示有主播角色加入了房间，并返回该主播的用户 ID。
   *
   * 以下场景中会触发该回调：
   * - 通信场景中，远端用户或直播场景的远端主播角色调用了 Client.join 方法加入房间。
   * - 直播场景中，远端观众加入房间后调用 Client.setClientRole 将用户角色改变为主播。
   * - 通信场景中，远端用户或直播场景的远端主播网络中断后重新加入房间。
   */
  on(
    event: 'peer-online',
    callback: (evt: {
      /**
       * 远端用户或主播角色的用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `peer-leave` 事件表示远端用户或主播角色离开房间。
   *
   * 以下场景中会触发该回调：
   * - 远端用户离开房间。
   * - 用户角色从主播变为观众。
   *
   * @note 在直播场景中，只有角色为主播的用户会触发该回调。
   */
  on(
    event: 'peer-leave',
    callback: (evt: {
      /**
       * 远端用户或主播角色的用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `mute-audio` 事件表示远端用户静音其音频，即关掉自己的声音。
   */
  on(
    event: 'mute-audio',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `unmute-audio` 事件表示远端用户取消静音，即打开自己的声音。
   */
  on(
    event: 'unmute-audio',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `unmute-audio-slave` 事件表示远端用户静音其音频辅流，即关掉自己的系统共享的声音。
   */
  on(
    event: 'mute-audio-slave',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `unmute-audio` 事件表示远端用户取消静音音频辅流，即打开自己的系统共享的声音。
   */
  on(
    event: 'unmute-audio-slave',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `mute-video` 事件表示远端用户在视频通话中关掉自己的视频。
   */
  on(
    event: 'mute-video',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `unmute-video` 事件表示远端用户在视频通话中打开自己的视频。
   */
  on(
    event: 'unmute-video',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `mute-screen` 事件表示远端用户暂停屏幕共享。
   */
  on(
    event: 'mute-screen',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `unmute-screen` 事件表示远端用户继续屏幕共享。
   */
  on(
    event: 'unmute-screen',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `uid-duplicate` 事件表示当前有人使用相同的uid加入了房间，你被提出了。
   */
  on(event: 'uid-duplicate', callback: () => void): void

  /**
   * `client-banned` 事件表示本地用户被踢出房间。
   *
   * @note 仅被踢出房间的用户会收到此回调。
   */
  on(
    event: 'client-banned',
    callback: (evt: {
      /**
       * 远端用户 ID。
       */
      uid: number | string
    }) => void
  ): void

  /**
   * `channel-closed` 事件表示房间已关闭。
   */
  on(event: 'channel-closed', callback: () => void): void

  /**
   * `stopScreenSharing` 表示本地用户停止屏幕共享。这通常是在屏幕共享浮窗上点击关闭触发的。
   */
  on(event: 'stopScreenSharing', callback: (evt: {}) => void): void

  /**
   * `stopScreenAudio`事件表示本地用户停止屏幕共享音频。这通常是在屏幕共享浮窗上点击关闭触发的。
   */
  on(event: 'stopScreenAudio', callback: (evt: {}) => void): void

  /**
   * `connection-state-change`事件表示 SDK 与服务器的连接状态发生了变化。
   *
   * @example 示例代码
   * ```
   * rtc.client.on('connection-state-change', (evt)=>{
   *   console.log(`connection-state-change ${evt.prevState} => ${evt.curState}。是否重连：${evt.reconnect}`)
   * })
   * ```
   */
  on(
    event: 'connection-state-change',
    callback: (evt: {
      /**
       * 变化后的状态。
       */
      curState: ConnectionState
      /**
       * 变化前的状态。
       */
      prevState: ConnectionState
      /**
       * 是否为重连
       */
      reconnect: boolean
    }) => void
  ): void

  /**
   * 客户端遇到错误。错误类型包括：
   * * SOCKET_ERROR: 与服务器断开连接，请检查用户网络。
   * * RELOGIN_ERROR: 网络重连登录失败，请联系云信技术支持。
   * * MEDIA_TRANSPORT_DISCONNECT: 媒体通道一直连接失败，请检查用户网络。
   * * AUDIOLEVEL_NOT_SUPPORTED：该浏览器环境不支持音频前处理模块，不能使用伴音、音效、getAudioLevel()、AI降噪等功能。
   * * no-publish-audio-permission：高级权限token限制您发布自己的音频主流（麦克风）
   * * no-publish-audio-slave-permission：高级权限token限制您发布自己的音频辅流（即屏幕共享系统声卡声音）
   * * no-publish-video-permission：高级权限token限制您发布自己的视频主流（摄像头）
   * * no-publish-screen-permission：高级权限token限制您发布自己的视频辅流（屏幕共享）
   * * no-subscribe-audio-permission：高级权限token限制您订阅其他人的音频主流（麦克风）
   * * no-subscribe-audio-slave-permission：高级权限token限制您发布订阅其他人的音频辅流（即屏幕共享系统声卡声音）
   * * no-subscribe-video-permission：高级权限token限制您发布订阅其他人的视频主流（摄像头）
   * * no-subscribe-screen-permission：高级权限token限制您发布订阅其他人的视频辅流（屏幕共享）
   *
   * * @example 示例代码
   * ```
   * rtc.client.on('error', (type) => {
      console.error('===== 发生错误事件：', type)
      if (type === 'SOCKET_ERROR') {
        addLog('==== 网络异常，已经退出房间')
      } else if (type === 'no-publish-audio-permission') {
        console.error('permkey控制，没有发布音频的权限')
      } else if (type === 'no-publish-audio-slave-permission') {
        console.error('permkey控制，没有发布音频辅流的权限')
      } else if (type === 'no-publish-video-permission') {
        addLog(`permkey控制，没有发布视频的权限`)
      } else if (type === 'no-publish-screen-permission') {
        console.error('permkey控制，没有发布屏幕共享的权限')
      } else if (type === 'no-subscribe-audio-permission') {
        console.error('permkey控制，没有订阅音频的权限')
      } else if (type === 'no-subscribe-audio-slave-permission') {
        console.error('permkey控制，没有订阅音频辅流的权限')
      } else if (type === 'no-subscribe-video-permission') {
        console.error('permkey控制，没有订阅视频的权限')
      } else if (type === 'no-subscribe-screen-permission') {
        console.error('permkey控制，没有订阅屏幕共享的权限')
      }
    })
    ```
   */
  on(event: 'error', callback: (type: string) => void): void

  /**
   * 客户端遇到警告。可能有：
   * * 406：ability not support。当前客户端设备视频编解码能力与房间不匹配，例如设备不支持 VP8 等编码类型。在此房间中可能无法成功进行视频编解码，即本端可能无法正常显示某些远端的视频画面，同样远端也可能无法显示本端画面。
   */
  on(
    event: 'warning',
    callback: (evt: {
      /**
       * 警告码。
       */
      code: number
      /**
       * 原因。
       */
      reason: string
    }) => void
  ): void

  /**
   * `permkey-will-expire` 事件表示房间中有人在join()的时候设置了自定义消息。
   *
   *
   * @example
   * ```javascript
   * rtc.client.on("custom-data", async evt=>{
   *   console.warn(`${evt.uid} 发送自定义消息 ${evt.customData}`)
   * })
   * ```
   *
   */
  on(event: 'custom-data'): void

  /**
   * `permkey-will-expire` 事件表示高级权限token功能启用后，permkey还有30s就要超时了，需要主动调用updatePermkey()去更新。
   * @example
   * ```javascript
   * rtc.client.on("permkey-will-expire", async evt=>{
   *   console.warn(`permKey 即将过期}`)
   *   const newpermKey = await getPermkey() //自己业务层实现该功能
   *   rtc.client.updatePermKey(newpermKey).catch((err) => {
   *     console.error('刷新permKey错误: ', err.message)
   *   })
   * })
   * ```
   *
   */
  on(event: 'permkey-will-expire'): void

  /**
   * `permkey-timeout` 事件表示高级权限token功能启用后，permkey已经超时，您被提出房间了。
   */
  on(event: 'permkey-timeout'): void

  /**
   * `audioTrackEnded` 事件表示音频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: 'audioTrackEnded'): void

  /**
   * `audioTrackEnded` 事件表示音频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: 'audioTrackEnded'): void

  /**
   * `videoTrackEnded` 事件表示视频频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: 'videoTrackEnded'): void

  /**
   * `rtmp-state` 事件表示RTMP旁路推流状态发生了变化。
   */
  on(event: 'rtmp-state', callback: (state: RTMPTaskState) => void): void

  /**
   * `network-quality` 事件展示房间中所有成员的上下行网络质量。
   */
  on(event: 'network-quality', callback: (netStatus: NetStatusItem[]) => void): void

  /**
   * `exception` 事件展示了目前房间内的异常事件。
   *
   * 异常事件不是错误，但是往往会引起通话质量问题。
   */
  on(event: 'exception', callback: (exceptionEvent: ClientExceptionEvt) => void): void

  /**
   * `crypt-error` 回调表示本地设置的媒体流加密密钥与房间中其他成员不一致，加入房间失败。
   *
   * 请通过 [[Client.setEncryptionSecret]] 重新设置加密密钥。
   */
  on(event: 'crypt-error', callback: (evt: { cryptType: EncryptionMode }) => void): void

  /**
   * `accessDenied` 事件表示获取设备权限被拒绝。
   */
  on(event: 'accessDenied', callback: (mediaType: 'audio' | 'video' | 'screen') => void): void

  /**
   * `notFound`事件表示获取麦克风或摄像头权限时，无法找到指定设备。
   */
  on(event: 'notFound', callback: (mediaType: 'audio' | 'video') => void): void

  /**
   * `deviceError`事件表示获取麦克风或摄像头权限时，遭遇未知错误错误。
   */
  on(event: 'deviceError', callback: (mediaType: 'audio' | 'video') => void): void

  /**
   * `beOccupied`事件表示获取麦克风或摄像头权限时，设备被占用。
   */
  on(event: 'beOccupied', callback: (mediaType: 'audio' | 'video') => void): void

  /**
   * `audioVideoBanned` 事件表示音频或视频被服务器禁言
   * * state: true 表示被服务器禁言，false 表示服务器解禁
   * * duration: 服务器禁言事件，单位为秒
   */
  on(
    event: 'audioVideoBanned',
    callback: (evt: {
      uid: number
      mediaType: 'audio' | 'video'
      state: boolean
      duration?: number
    }) => void
  ): void

  /**
   * `recording-device-changed` 回调通知应用有音频输入设备被添加、更改或移除。
   * * `ACTIVE`: 新增设备
   * * `INACTIVE`: 设备被移除
   * * `CHANGED`: 设备更改
   *
   * 注意：
   * 1. 在Chrome浏览器上，部分蓝牙设备关闭后，Chrome会将默认输入设备切换为其他麦克风，此时可能遇到声音异常，需重启设备。
   * 2. Firefox不支持设备检测
   *
   * @example
   * ```javascript
   * rtc.client.on("recording-device-changed", async evt=>{
   *   console.log("麦克风设备变更", evt.state, evt.device.label);
   *   if (evt.state === "CHANGED" && evt.device.deviceId === "default"){
   *     console.error("默认麦克风自动切换，如遇到声音异常，需重启设备", evt.device.label);
   *     // await rtc.localStream.close({type: "audio"})
   *     // await rtc.localStream.open({type: "audio"})
   *   }
   * })
   * ```
   */
  on(
    event: 'recording-device-changed',
    callback: (evt: { state: 'ACTIVE' | 'INACTIVE' | 'CHANGED'; device: DeviceInfo }) => void
  ): void

  /**
   * `camera-changed` 回调通知应用有视频输入设备被添加、更改或移除。
   * * `ACTIVE`: 新增设备
   * * `INACTIVE`: 设备被移除
   * * `CHANGED`: 设备更改
   *
   * 注：Firefox不支持设备检测
   */
  on(
    event: 'camera-changed',
    callback: (evt: { state: 'ACTIVE' | 'INACTIVE' | 'CHANGED'; device: DeviceInfo }) => void
  ): void

  /**
   * `playout-device-change` 回调通知应用有音频输出设备被添加、更改或移除。
   * * `ACTIVE`: 新增设备
   * * `INACTIVE`: 设备被移除
   * * `CHANGED`: 设备更改
   *
   * 注意：目前仅Chrome浏览器支持扬声器枚举与选择。
   *
   */
  on(
    event: 'playout-device-changed',
    callback: (evt: { state: 'ACTIVE' | 'INACTIVE' | 'CHANGED'; device: DeviceInfo }) => void
  ): void

  /**
   * `track-low-init-success` 回调通知小流创建成功
   *
   */
  on(
    event: 'track-low-init-success',
    callback: (evt: { mediaType: 'video' | 'screen' }) => void
  ): void

  /**
   * `track-low-init-fail` 回调通知小流创建失败
   */
  on(event: 'track-low-init-fail', callback: (evt: { mediaType: 'video' | 'screen' }) => void): void

  /**
   * `sender-transform` 回调用于自定义加密，回调编码后的帧
   */
  on(
    event: 'sender-transform',
    callback: (evt: { mediaType: 'audio' | 'video' | 'screen'; encodedFrame: any }) => void
  ): void

  /**
   * `receiver-transform` 回调用于自定义加密，回调解码前的帧
   */
  on(
    event: 'receiver-transform',
    callback: (evt: {
      uid: number
      mediaType: 'audio' | 'video' | 'screen'
      encodedFrame: any
    }) => void
  ): void

  /**
   * 该回调可以取消监听事件。
   *
   */
  off(event: string, callback: any): void
}
export { Client }
