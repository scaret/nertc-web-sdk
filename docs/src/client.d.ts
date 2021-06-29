/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

import {
  AddTaskOptions,
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

/**
 *  请使用 [[NERTC.createClient]] 创建 Client对象，client对象指通话中的本地或远程用户，提供云信sdk的核心功能。
 */
declare interface Client{
    /**
     *  获取当前通话信息
     */
    getChannelInfo(): any;

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
     * 加入房间
     */
    join(options: JoinOptions): Promise<any>;
    /**
     * 离开房间
     */
    leave(): Promise<void>;
    /**
     * 发布视频
     */
    publish(stream: Stream): Promise<undefined>;
    /**
     * 取消发布本地音视频流
     */
    unpublish(stream: Stream, type?: null): Promise<undefined>;
    /**
     * 订阅远端音视频流
     */
    subscribe(stream: Stream): Promise<void>;
    /**
     * 取消订阅远端音视频流
     */
    unsubscribe(stream: Stream): Promise<void>;
    /**
     * 中途更新订阅的视频分辨率。
    */
    setRemoteVideoStreamType(stream: Stream, highOrLow: number): Promise<void>;

  /**
   设置用户角色。默认情况下用户以主播角色加入房间。
   
   在加入房间前，用户可以调用本接口设置本端模式为观众或主播模式。在加入房间后，用户可以通过本接口切换用户模式。
   
   用户角色支持设置为主播（`host`）或观众(`audience`)，主播和观众的权限不同：
   + 主播：可以操作摄像头等音视频设备、发布流、配置互动直播推流任务、上下线对房间内其他用户可见。
   + 观众：观众只能接收音视频流，不支持操作音视频设备、配置互动直播推流任务、上下线不通知其他用户。
   
   #### 注意：
   
   可以在加入房间之前或者之后设置。
   
   #### 相关回调：
   
   如果您在加入房间后调用该方法切换用户角色，调用成功后，会触发以下回调：
   
   + 主播切换为观众，本地触发`client-role-changed`回调，远端触发`peer-offline`回调
   + 观众切换为主播，本地触发`client-role-changed`回调，远端触发`peer-online`回调
   
   * @param role
   
   用户角色。可设置为：
   + `host`：直播模式中的主播，可以发布和接收音视频流。如果用户之前已经发布了音频或视频，切换到主播时会自动恢复发布音频或视频流。
   + `audience`: 直播模式中的观众，只能接收音视频流。主播模式切换到观众模式后，会自动停止发送音视频流。
   
   */
  setClientRole(role: "host"|"audience"): Promise<undefined>;
    /**
     #### 主动获取网络连接状态。
     推荐用于以下场景：
     + 在 App 异常重启时，可以调用本接口主动获取当前客户端与服务器的连接状态，以做到本地与服务器状态的对齐。
     + 在实时音视频通话等业务场景中，主动获取房间的网络连接状态，以此完成上层业务逻辑。
     
     SDK 与服务器的连接状态，共有以下 4 种：
     + `DISCONNECTED`：网络连接断开。该状态表示 SDK 处于：
       + 调用`Client.join`加入房间前的初始化阶段。
       + 调用`Client.leave`离开房间之后。
     + `CONNECTING`：建立网络连接中。该状态表示 SDK 处于：
       + 调用`Client.join`之后正在与指定房间建立连接。
       + 通话过程中，连接中断自动重连。
     + `CONNECTED`：已连接。该状态表示用户已经成功加入房间，可以在房间内发布或订阅媒体流。
       + `DISCONNECTING`：正在断开连接。
       + 在调用 `Client.leave` 的时候为此状态。
     */
    getConnectionState(): ConnectionState;

  /**
   设置媒体流加密模式。

   在金融行业等安全性要求较高的场景下，您可以在加入房间前通过此方法设置媒体流加密模式。

   - 该方法和 [[Client.setEncryptionSecret]] 搭配使用，必须在加入房间前先调用 [[Client.setEncryptionMode]] 设置媒体流加密方案，再调用 [[Client.setEncryptionSecret]] 设置秘钥。如果未指定密钥，则无法启用媒体流加密。
   - 用户离开房间后，SDK 会自动关闭加密。如需重新开启加密，需要在用户再次加入房间前调用这两个方法。

   @since V4.4.0

   @note 
   - 请在加入房间前调用该方法，加入房间后无法修改加密模式与秘钥。
   - 安全起见，建议每次启用媒体流加密时都更换新的秘钥。
   - 同一房间内，所有开启媒体流加密的用户必须使用相同的加密模式和秘钥，否则使用不同秘钥的成员加入房间时会触发 `Client.on("crypt-error")` 回调。

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
   * 设置媒体流加密秘钥。
   * 
   * - 该方法和 [[Client.setEncryptionMode]] 搭配使用，必须在加入房间前先调用 [[Client.setEncryptionMode]] 设置媒体流加密方案，再调用 [[Client.setEncryptionSecret]] 设置秘钥。如果未指定密钥，则无法启用媒体流加密。
   * - 用户离开房间后，SDK 会自动关闭加密。如需重新开启加密，需要在用户再次加入房间前调用这两个方法。
   * 
   * @since V4.4.0
   * @note 
   * - 请在加入房间前调用该方法，加入房间后无法修改加密模式与秘钥。
   * - 安全起见，建议每次启用媒体流加密时都更换新的秘钥。
   * - 同一房间内，所有开启媒体流加密的用户必须使用相同的加密模式和秘钥，否则使用不同秘钥的成员加入房间时会触发 `Client.on("crypt-error")` 回调。
   * 
   * @param encryptionSecret 媒体流加密秘钥。字符串格式，长度为 1~128 字节。推荐设置为英文字符串。 
   */
  setEncryptionSecret(encryptionSecret: string): void;
  
    /**
     * 获取系统电量
     */
    getSystemStats(): Promise<any>;
    /**
     * 获取与会话的连接状况统计数据
     */
    getSessionStats(): Promise<any>;
    /**
     * 获取与网关的连接状况统计数据
     */
    getTransportStats(): Promise<any>;
    /**
     * 获取本地发布流的音频统计数据
     */
    getLocalAudioStats(): Promise<any>;
    /**
      * 获取本地发布流的视频统计数据
      */
    getLocalVideoStats(mediaType?: MediaType): Promise<any>;
    /**
     * 获取远端订阅流的音频统计数据
     */
    getRemoteAudioStats(): Promise<any>;
    /**
     * 获取远端订阅流的视频统计数据
     */
    getRemoteVideoStats(mediaType?: MediaType): Promise<any>;
    /**
     * 获取本地用户 ID。
     * 
     * 如果在 join 方法中指定了 uid，此处会返回指定的 ID; 如果未指定 uid，此处将返回云信服务器自动分配的 ID。
     * @since V4.4.0
     */
     getUid(): number | null;
    /**
     * 设置房间模型
     */
    setChannelProfile(options: {
        mode: 'rtc' | 'live';
    }): void;
    /**
     * 增加互动直播推流任务。见[[RTMPTask]]
     */
    addTasks(options: {rtmpTasks: RTMPTask[]}): Promise<undefined>;
    /**
     * 删除互动直播推流任务
     */
    deleteTasks(options: {
        taskIds: string[];
    }): Promise<void>;
    /**
     * 更新互动直播推流任务
     * @return {Promise}
     */
    updateTasks(options: {
        rtmpTasks: RTMPTask[];
    }): Promise<void>;
    /**
     *  销毁实例
     */
    destroy(): void;
    
  /**
   * 本地用户角色发生了变化
   */
  on(event: "client-role-changed", callback: (evt: {
    /**
     * 变化后的角色
     */
    role: "host"|"audience";
  }) => void): void;

  /**
   * 远端用户发布了一个流的通知。
   */
  on(event: "stream-added", callback: (evt: {
    /**
     * 新增的远端流
     */
    stream: Stream;
  }) => void): void;


  /**
   * 远端用户发布的一路音视频轨道被订阅了。
   */
  on(event: "stream-subscribed", callback: (evt: {
    /**
     * 被订阅的远端流
     */
    stream: Stream;
    /**
     * 被订阅的音视频轨道
     */
    mediaType: MediaType
  }) => void): void;

  /**
   * 该事件表示指定远端流被移除了
   */
  on(event: "stream-removed", callback: (evt: {
    /**
     * 远端流
     */
    stream: Stream;
  }) => void): void;

  /**
   * 该事件会返回当前房间内声音最大的用户的uid。
   */
  on(event: "active-speaker", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;

  /**
   * 该事件会返回当前房间内的用户及音量。
   */
  on(event: "volume-indicator", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
    /**
     * 音量
     */
    level: number;
  }) => void): void;
  
  /**
   * 该事件会返回当前房间内声音最大的用户的uid。
   */
  on(event: "active-speaker", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;


  /**
   * 该事件表示有主播加入房间
   */
  on(event: "peer-online", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;



  /**
   * 该事件表示有主播离开房间
   */
  on(event: "peer-leave", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;


  /**
   * 该事件表示指定主播将麦克风静音
   */
  on(event: "mute-audio", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;


  /**
   * 该事件表示指定主播将麦克风取消静音
   */
  on(event: "unmute-audio", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;


  /**
   * 该事件表示指定主播将视频静音
   */
  on(event: "mute-video", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;
  
  /**
   * 该事件表示指定主播将视频取消静音
   */
  on(event: "unmute-video", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;
  
  /**
   * 该事件表示指定主播将屏幕共享静音
   */
  on(event: "mute-screen", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;

  /**
   * 该事件表示指定主播将屏幕共享取消静音
   */
  on(event: "unmute-screen", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;

  /**
   * 该事件表示指定主播被踢出房间
   */
  on(event: "client-banned", callback: (evt: {
    /**
     * 主播uid
     */
    uid: number;
  }) => void): void;
  
  /**
   * 该事件表示房间已关闭
   */
  on(event: "channel-closed", callback: () => void): void;

  /**
   * 该事件表示本地的屏幕共享停止了
   */
  on(event: "stopScreenSharing", callback: (evt: {
  }) => void): void;

  /**
   * 与服务器的连接状态发生了变化。
   */
  on(event: "connection-state-change", callback: (evt: {
    /**
     * 变化后的状态
     */
    curState: ConnectionState;
    /**
     * 变化前的状态
     */
    prevState: ConnectionState;
  }) => void): void;

  /**
   * 客户端遇到错误。可能有：
   * * SOCKET_ERROR: 连接错误。
   * * RELOGIN_ERROR: 重连失败。
   * 
   */
  on(event: "error", callback: (errorName: string) => void): void;
  
  /**
   * 客户端遇到警告。可能有：
   * * 406：ability not support。当前客户端设备视频编解码能力与房间不匹配，例如设备不支持 VP8 等编码类型。在此房间中可能无法成功进行视频编解码，即本端可能无法正常显示某些远端的视频画面，同样远端也可能无法显示本端画面。
   */
  on(event: "warning", callback: (evt: { code:number,reason:string }) => void): void;
  
  /**
   * 音频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: "audioTrackEnded"): void;

  /**
   * 视频频轨道结束。造成的原因可能是设备被拔出。
   */
  on(event: "videoTrackEnded"): void;

  /**
   * 该事件表示推流状态发生了变化
   */
  on(event: "rtmp-state", callback: (state: RTMPTaskState) => void): void;

  /**
   * 该事件展示了对端的网络状态
   */
  on(event: "network-quality", callback: (netStatus: NetStatusItem[]) => void): void;

  /**
   * 该事件展示了目前房间内的异常
   */
  on(event: "exception", callback: (exceptionEvent: ClientExceptionEvt) => void): void;

  /**
   * 该回调表示用户在发布或者订阅流过程中媒体流加密或者解密失败。
   * 通常原因为：
   * - 加密方案 [[Client.setEncryptionMode]] 或者加密秘钥 [[Client.setEncryptionSecret]] 与房间中的其他用户不匹配。
   * - 加密秘钥不正确。
   */
  on(event: "crypt-error", callback: (evt: { cryptType: EncryptionMode }) => void): void;
  
}
export { Client };
