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
} from "./types";
import { Stream } from "./stream";
import {ConnectionState} from "./types";
import {NetStatusItem} from "./types";
import {DeviceInfo} from "./browser";

/**
 * Client 接口提供音视频通话的核心功能，例如加入房间、发布和订阅音视频流等。
 * 
 * 请使用 [[NERTC.createClient]] 创建 Client 对象，Client 对象指通话中的本地或远程用户，提供云信 NERTC SDK 的核心功能。
 */
declare interface Client{
    /**
     * 获取当前通话信息。
     */
    getChannelInfo(): {
      /**
       * 频道ID，可用于服务端API调用。
       */
      cid: number;
      /**
       * 用户输入的频道名。
       */
      channelName: string;
      /**
       * 用户输入的id。当用户输入的uid为0时，则可获取服务端随机分配的uid。
       */
      uid: number|string;
      /**
       * 用户输入的token。
       */
      token: string;
    };

    /**
     设置本地用户的媒体流优先级。
     
     如果某个用户的优先级为高，那么该用户媒体流的优先级就会高于其他用户，弱网环境下 SDK 会优先保证其他用户收到的、高优先级用户的媒体流的质量。
     
     @note
     - 请在加入房间（join）前调用此方法。
     - 一个音视频房间中只有一个高优先级的用户。建议房间中只有一位用户调用 setLocalMediaPriority 将本端媒体流设为高优先级，否则需要开启抢占模式，保证本地用户的高优先级设置生效。

     @param options 优先级设置。
     */
    setLocalMediaPriority (options: MediaPriorityOptions): void;

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
    join(options: JoinOptions): Promise<any>;

    /**
     * 离开房间。
     * 
     * 调用该方法离开房间时，本地会触发 Client.on("connection-state-change") 回调；通信场景下的用户和直播场景下的主播角色离开房间后，远端会触发 Client.on("peer-leave") 回调。
     */
    leave(): Promise<void>;

    /**
     * 发布本地音视频流。
     * 
     * 发布音视频流之后，远端会触发 Client.on("stream-added") 回调。
     * 
     * @param stream 需要发布的 Stream。
     */
    publish(stream: Stream): Promise<undefined>;
    /**
     * 停止将本地音视频流发布到本房间。
     * 
     * 停止发布音视频流之后，远端会触发 Client.on("stream-removed") 回调。
     * 
     * @param stream 需要取消发布的 Stream。
     * @param type   流类型。
     */
    unpublish(stream?: Stream, type?: null): Promise<undefined>;
    /**
     * 订阅远端音视频流。
     * 
     * 订阅远端音视频流之后，本地会触发 Client.on("stream-subscribed") 回调。 
     * 
     * @param stream 需要订阅的源端音视频流。
     */
    subscribe(stream: Stream): Promise<void>;
    /**
     * 取消订阅远端音视频流。
     * 
     * 取消订阅后，SDK 将不再接收远端音视频流。
     * @param stream 需要取消订阅的源端音视频流。
     */
    unsubscribe(stream: Stream): Promise<void>;
    /**
     * 开启双流模式
     * 
     * 该方法在 Publish 端，即发送端，开启双流模式。该方法建议在加入频道（Client.join）后调用。
     * 
     * 双流为视频大流和视频小流，其中视频大流指高分辨率、高码率的视频流，视频小流指低分辨率、低码率的视频流。
     * 
     * 请在调用 [[Client.publish]] 之前调用该方法。
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
    enableDualStream(dualStreamSetting?: {video: boolean; screen: boolean}): void;
    /**
     * 设置视频大小流。
     * 
     * 如果发送端开启了双流模式，即大小流模式，订阅端默认接收大流，您也可以在订阅端调用此方法选择接收大流还是小流。
     * 
     * @note 该方法可以在加入房间前后设置。
     * @param stream 指定音视频流。
     * @param highOrLow 指定大小流类型。0 表示小流，1 表示大流。
    */
    setRemoteVideoStreamType(stream: Stream, highOrLow: 0|1): Promise<void>;

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
  setClientRole(role: "host"|"audience"): Promise<undefined>;
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
    getConnectionState(): ConnectionState;

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
  setEncryptionMode(encryptionMode: EncryptionMode): void;

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
  setEncryptionSecret(encryptionSecret: string): void;
  
    /**
     * 获取系统电量信息。
     */
    getSystemStats(): Promise<any>;
    /**
     * 获取与会话的连接状况统计数据。
     * 
     * @note 请在加入房间后调用此方法。
     */
    getSessionStats(): Promise<any>;
    /**
     * 获取与网关的连接状况统计数据。
     */
    getTransportStats(): Promise<any>;
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
    getLocalAudioStats(): Promise<any>;
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
    getLocalVideoStats(mediaType?: "video"|"screen"): Promise<any>;
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
    getRemoteAudioStats(): Promise<any>;
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
    getRemoteVideoStats(mediaType?: "video"|"screen"): Promise<any>;
    /**
     * 获取本地用户 ID。
     * 
     * 如果在 join 方法中指定了 uid，此处会返回指定的 ID; 如果未指定 uid，此处将返回云信服务器自动分配的 ID。
     * @since V4.4.0
     */
     getUid(): number | string |null;
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
        mode: 'rtc' | 'live';
    }): void;

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
      rtmpTasks: RTMPTask[]}): Promise<undefined>;
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
        taskIds: string[];
    }): Promise<void>;
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
        rtmpTasks: RTMPTask[];
    }): Promise<void>;
    /**
     * 销毁客户端对象。
     */
    destroy(): void;
    
  /**
   * 本地用户的角色已改变回调。
   * 
   * 直播场景下，当用户角色切换时会触发此回调，即主播切换为观众，或观众切换为主播时。
   */
  on(event: "client-role-changed", callback: (evt: {
    /**
     * 改变后的角色。
     */
    role: "host"|"audience";
  }) => void): void;

  /**
   * 远端用户发布了音视频流。
   */
  on(event: "stream-added", callback: (evt: {
    /**
     * 新增的远端流。
     */
    stream: Stream;
    /**
     * 远端流新增的媒体类型
     */
    mediaType: "audio"|"video"|"screen";
  }) => void): void;


  /**
   * 应用已接收远端音视频流。
   * 
   * 远端用户发布的一路音视频轨道被订阅之后，会触发此回调。
   */
  on(event: "stream-subscribed", callback: (evt: {
    /**
     * 已接收的远端流。
     */
    stream: Stream;
    /**
     * 音视频轨道类型。
     */
    mediaType: "audio"|"video"|"screen";
  }) => void): void;

  /**
   * 应用已删除远端音视频流。
   * 
   * 远端用户调用 [[Client.unpublish]] 方法之后，会触发此回调。
   * 
   * @example
   * ```javascript
   * rtc.client.on("stream-removed", (evt)=>{
   *   // 远端流停止，则关闭渲染
   *   evt.stream.stop(evt.mediaType);
   * });
   * ```
   */
  on(event: "stream-removed", callback: (evt: {
    /**
     * 远端流。
     */
    stream: Stream;
    /**
     * 远端流被关闭的媒体类型
     */
    mediaType: "audio"|"video"|"screen";
  }) => void): void;

  /**
   * 该事件会返回当前房间内音量最大的用户的 uid。
   */
  on(event: "active-speaker", callback: (evt: {
    /**
     * 音量最大的用户的 uid。
     */
    uid: number|string;
  }) => void): void;

  /**
   * 该事件会返回当前房间内除自己以外的用户的音量。
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
  on(event: "volume-indicator", callback: (userList: {
    /**
     * 用户 ID。
     */
    uid: number|string;
    /**
     * 用户音量。
     */
    level: number;
  }[]) => void): void;

  /**
   * 该事件表示有远端用户或主播加入房间。
   * 
   * - 通信场景中，该回调提示有远端用户加入了房间，并返回新加入房间的用户 ID。
   * - 直播场景中，该回调提示有主播角色加入了房间，并返回该主播的用户 ID。
   * 
   * 以下场景中会触发该回调：
   * - 通信场景中，远端用户或直播场景的远端主播角色调用了 Client.join 方法加入房间。
   * - 直播场景中，远端观众加入房间后调用 Client.setClientRole 将用户角色改变为主播。
   * - 通信场景中，远端用户或直播场景的远端主播网络中断后重新加入房间。
   */
  on(event: "peer-online", callback: (evt: {
    /**
     * 远端用户或主播角色的用户 ID。
     */
    uid: number|string;
  }) => void): void;

  /**
   * 该事件表示远端用户或主播角色离开房间。
   * 
   * 以下场景中会触发该回调：
   * - 远端用户离开房间。
   * - 用户角色从主播变为观众。
   * 
   * @note 在直播场景中，只有角色为主播的用户会触发该回调。
   */
  on(event: "peer-leave", callback: (evt: {
    /**
     * 远端用户或主播角色的用户 ID。
     */
    uid: number|string;
  }) => void): void;


  /**
   * 该事件表示远端用户静音其音频，即关掉自己的声音。
   */
  on(event: "mute-audio", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;


  /**
   * 该事件表示远端用户取消静音，即打开自己的声音。
   */
  on(event: "unmute-audio", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;


  /**
   * 该事件表示远端用户在视频通话中关掉自己的视频。
   */
  on(event: "mute-video", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;
  
  /**
   * 该事件表示远端用户在视频通话中打开自己的视频。
   */
  on(event: "unmute-video", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;
  
  /**
   * 该事件表示远端用户暂停屏幕共享。
   */
  on(event: "mute-screen", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;

  /**
   * 该事件表示远端用户继续屏幕共享。
   */
  on(event: "unmute-screen", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;

  /**
   * 该事件表示本地用户被踢出房间。
   * 
   * @note 仅被踢出房间的用户会收到此回调。
   */
  on(event: "client-banned", callback: (evt: {
    /**
     * 远端用户 ID。
     */
    uid: number|string;
  }) => void): void;
  
  /**
   * 该事件表示房间已关闭。
   */
  on(event: "channel-closed", callback: () => void): void;

  /**
   * 该事件表示本地用户停止屏幕共享。
   */
  on(event: "stopScreenSharing", callback: (evt: {
  }) => void): void;
  
  /**
   * 该事件表示本地用户停止屏幕共享音频。
   */
  on(event: "stopScreenAudio", callback: (evt: {
  }) => void): void;

  /**
   * 该事件表示 SDK 与服务器的连接状态发生了变化。
   */
  on(event: "connection-state-change", callback: (evt: {
    /**
     * 变化后的状态。
     */
    curState: ConnectionState;
    /**
     * 变化前的状态。
     */
    prevState: ConnectionState;
  }) => void): void;

  /**
   * 客户端遇到错误。错误类型包括：
   * * SOCKET_ERROR: 连接错误。
   * * RELOGIN_ERROR: 重连失败。
   * 
   */
  on(event: "error", callback: (errorName: string) => void): void;
  
  /**
   * 客户端遇到警告。可能有：
   * * 406：ability not support。当前客户端设备视频编解码能力与房间不匹配，例如设备不支持 VP8 等编码类型。在此房间中可能无法成功进行视频编解码，即本端可能无法正常显示某些远端的视频画面，同样远端也可能无法显示本端画面。
   */
  on(event: "warning", callback: (evt: {
    /**
     * 警告码。
     */    
    code:number;
    /**
     * 原因。
     */    
    reason:string }) => void): void;
  
  /**
   * 音频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: "audioTrackEnded"): void;

  /**
   * 视频频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: "videoTrackEnded"): void;

  /**
   * 该事件表示推流状态发生了变化。
   */
  on(event: "rtmp-state", callback: (state: RTMPTaskState) => void): void;

  /**
   * 该事件展示房间中所有成员的上下行网络质量。
   */
  on(event: "network-quality", callback: (netStatus: NetStatusItem[]) => void): void;

  /**
   * 该事件展示了目前房间内的异常事件。
   * 
   * 异常事件不是错误，但是往往会引起通话质量问题。
   */
  on(event: "exception", callback: (exceptionEvent: ClientExceptionEvt) => void): void;

  /**
   * 该回调表示本地设置的媒体流加密密钥与房间中其他成员不一致，加入房间失败。
   * 
   * 请通过 [[Client.setEncryptionSecret]] 重新设置加密密钥。
   */
  on(event: "crypt-error", callback: (evt: { cryptType: EncryptionMode }) => void): void;

  /**
   * 获取设备权限被拒绝。
   */
  on(event: "accessDenied", callback: (
    mediaType: "audio"|"video"
  ) => void): void;

  /**
   * 获取麦克风或摄像头权限时，无法找到指定设备。
   */
  on(event: "notFound", callback: (
    mediaType: "audio"|"video"
  ) => void): void;

  /**
   * 获取麦克风或摄像头权限时，遭遇未知错误错误。
   */
  on(event: "deviceError", callback: (
    mediaType: "audio"|"video"
  ) => void): void;

  /**
   * 获取麦克风或摄像头权限时，设备被占用。
   */
  on(event: "beOccupied", callback: (
    mediaType: "audio"|"video"
  ) => void): void;

  /**
   * 浏览器自动播放受限
   * 
   * @example
   * ```javascript
   * rtc.client.on("notAllowedError", (evt)=>{
   *   // 获取错误码
   *   const erroCode = evt.getCode();
   * });
   * ```
   */
   on(event: "notAllowedError", callback: (
    evt: {
      /**
      * 错误码
      */
      erroCode: Number
    }
    ) => void): void;

  /**
   * 该回调通知应用有音频输入设备被添加、更改或移除。
   * * `ACTIVE`: 新增设备
   * * `INACTIVE`: 设备被移除
   * * `CHANGED`: 设备更改
   * 
   * 注意：在Chrome浏览器上，部分蓝牙设备关闭后，Chrome会将默认输入设备切换为其他麦克风，此时可能遇到声音异常，需重启设备。
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
  on(event: "recording-device-changed", callback: (
    state: "ACTIVE"|"INACTIVE"|"CHANGED",
    device: DeviceInfo,
  ) => void): void;

  /**
   * 该回调通知应用有视频输入设备被添加、更改或移除。
   * * `ACTIVE`: 新增设备
   * * `INACTIVE`: 设备被移除
   * * `CHANGED`: 设备更改
   *
   */
  on(event: "camera-changed", callback: (
    state: "ACTIVE"|"INACTIVE"|"CHANGED",
    device: DeviceInfo,
  ) => void): void;

  /**
   * 该回调通知应用有音频输出设备被添加、更改或移除。
   * * `ACTIVE`: 新增设备
   * * `INACTIVE`: 设备被移除
   * * `CHANGED`: 设备更改
   * 
   * 注意：目前仅Chrome浏览器支持扬声器枚举与选择。
   * 
   */
  on(event: "playout-device-changed", callback: (
    state: "ACTIVE"|"INACTIVE"|"CHANGED",
    device: DeviceInfo,
  ) => void): void;
  
  /**
   * 该回调可以取消监听事件。
   *
   */
  off(event: string, callback: any): void;

}
export { Client };
