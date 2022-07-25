# <span id="NERtc Web SDK">NERTC Web SDK</span>

NERTC Web SDK 提供完善的音视频通话 JavaScript 开发框架，提供基于网络的视频通话和语音通话功能，支持在网页中调用API快速建立音视频连接，进行音视频通话和推流的服务。

完整的 NERTC Web SDK 由 NERTC、Client 和 Stream 三部分组成。
- [[NERTC]] 是基础对象，是所有可调用方法的入口。
- [[Client]] 是客户端对象，负责通话中的本地或远程用户的核心操作。
- [[Stream]] 是音视频流对象，负责音视频流相关的设置。

**注意**：自 V4.4.0 开始，入口 WebRTC2 更名为 NERTC，同时兼容 WebRTC2。 


<style>
table th:first-of-type {
    width: 10%;
}
table th:nth-of-type(2) {
    width: 10%;
}
</style>

## <span id="NERTC 对象">NERTC 对象</span>

方法 | 功能描述
---|---|
[[NERTC.createClient]] | 创建客户端。
[[NERTC.createStream]] | 创建音视频流对象。
[[NERTC.getDevices]] | 获取可用的媒体输入/输出设备。
[[NERTC.getCameras]] | 获取可用的视频输入设备。
[[NERTC.getMicrophones]] | 获取可用的音频输入设备。
[[NERTC.getSpeakers]] | 获取可用的音频输出设备。
[[NERTC.Logger.enableLogUpload]] | 开启日志上传。
[[NERTC.Logger.disableLogUpload]] | 关闭日志上传。

## <span id="Client 客户端对象">Client 客户端对象</span>

### <span id="客户端管理">客户端管理</span>

方法 | 功能描述
---|---|
[[NERTC.createClient]] | 创建客户端对象实例。
[[Client.destroy]] | 销毁客户端对象实例。


### <span id="房间管理">房间管理</span>


方法 | 功能描述
---|---|
[[Client.join]] | 加入音视频房间。
[[Client.leave]] | 离开音视频房间。
[[Client.setChannelProfile]] | 设置房间场景。
[[Client.setClientRole]]|设置用户角色。
[[Client.publish]] | 发布音视频流。
[[Client.unpublish]] | 取消发布音视频流。
[[Client.subscribe]] | 接收远端音视频流。
[[Client.unsubscribe]] | 取消接收远端音视频流。
[[Client.setRemoteVideoStreamType]] | 动态更新订阅视频的分辨率。
[[Client.getConnectionState]]|主动获取网络连接状态。
[[Client.getUid]]|获取本地用户 ID。
[[Client.startProxyServer]]|开启云代理。
[[Client.stopProxyServer]]|关闭云代理。
[[Client.enableDualStream]]|开启双流发布模式。
[[Client.disableDualStream]]|关闭双流发布模式。


### <span id="旁路推流管理">旁路推流管理</span>

方法 | 功能描述
---|---|
[[Client.addTasks]] | 增加旁路推流任务。
[[Client.deleteTasks]] | 删除旁路推流任务。
[[Client.updateTasks]] | 更新旁路推流任务。


### <span id="设备数据">设备数据</span> 

方法 | 功能描述
---|---|
[[Client.getSystemStats]] | 获取系统电量。
[[Client.getTransportStats]] | 获取网络连接状况统计数据。

### <span id="音视频数据统计">音视频数据统计</span>


方法 | 功能描述
---|---|
[[Client.getLocalAudioStats]] | 获取本地发布流的音频统计数据。
[[Client.getLocalVideoStats]] | 获取本地发布流的视频统计数据。
[[Client.getRemoteAudioStats]] | 获取远端订阅流的音频统计数据。
[[Client.getRemoteVideoStats]] | 获取远端订阅流的视频统计数据。
[[Client.getSessionStats]] | 获取会话的连接状况统计数据。

### <span id="音视频流回退">音视频流回退</span>

方法 | 功能描述
---|---|
[[Client.setLocalMediaPriority]] | 设置本地用户的媒体流优先级。


## <span id="加密">加密</span>

方法 | 功能描述
---|---|
[[Client.setEncryptionMode]] | 设置媒体流加密模式。
[[Client.setEncryptionSecret]] | 设置媒体流加密密钥。

## <span id="Stream 音视频流对象">Stream 音视频流对象</span>

### <span id="音视频流管理">音视频流管理</span>


方法 | 功能描述
---|---|
[[NERTC.createStream]] | 创建音视频流对象。
[[Stream.destroy]] | 销毁音视频流对象。
[[Stream.init]] | 初始化音视频流对象。
[[Stream.play]] | 播放音视频流。
[[Stream.stop]] | 停止播放音视频流。
[[Stream.open]] | 打开音视频流输入设备，如麦克风。
[[Stream.close]] | 关闭音视频流输入设备，如麦克风。


### <span id="音频管理">音频管理</span>


方法 | 功能描述
---|---|
[[Stream.setAudioProfile]] | 设置音频属性。
[[Stream.setAudioVolume]] | 设置音频播放的音量。
[[Stream.setCaptureVolume]] | 设置麦克风采集的音量。
[[Stream.muteAudio]] | 禁用音频轨道。
[[Stream.unmuteAudio]] | 启用音频轨道。
[[Stream.getAudioLevel]] | 获取当前麦克风采集音量。
[[Stream.hasAudio]] | 当前Stream是否有音频。
[[Stream.setAudioOutput]]|设置音频输出设备。


### <span id="视频管理">视频管理</span>


方法 | 功能描述
---|---|
[[Stream.setVideoProfile]] | 设置视频属性。
[[Stream.setSubscribeConfig]] | 设置视频订阅的参数。
[[Stream.setScreenProfile]] | 设置屏幕共享属性。
[[Stream.muteVideo]] | 禁用视频轨道。
[[Stream.unmuteVideo]] | 启用视频轨道。
[[Stream.setLocalRenderMode]] | 设置本端视频画面大小。
[[Stream.setRemoteRenderMode]] | 设置对端视频画面大小。
[[Stream.takeSnapshot]] | 截取指定用户的视频画面。
[[Stream.setCanvasWatermarkConfigs]] | 添加视频画布水印。

### <span id="音乐文件播放及混音">音乐文件播放及混音</span>

方法 | 功能描述
---|---|
[[Stream.startAudioMixing]] | 开始播放音乐文件和本地麦克风声音的混合。 
[[Stream.pauseAudioMixing]] | 暂停播放音乐文件。
[[Stream.resumeAudioMixing]] | 恢复播放音乐文件。
[[Stream.stopAudioMixing]] | 停止播放音乐文件。
[[Stream.adjustAudioMixingVolume]] | 调节音乐文件播放音量。
[[Stream.getAudioMixingDuration]] | 获取音乐文件的总长度。
[[Stream.getAudioMixingCurrentPosition]] | 获取音乐文件当前播放进度。
[[Stream.setAudioMixingPosition]] | 设置音乐文件当前播放进度。


### <span id="播放音效文件">播放音效文件</span>

方法 | 功能描述
---|---|
[[Stream.playEffect]] | 播放指定音效文件
[[Stream.stopEffect]] | 停止播放指定音效文件
[[Stream.pauseEffect]] | 暂停播放指定音效文件
[[Stream.resumeEffect]] | 恢复播放指定音效文件
[[Stream.setVolumeOfEffect]] | 调节指定音效文件的音量
[[Stream.preloadEffect]] | 预加载指定音效文件
[[Stream.unloadEffect]] | 释放指定音效文件
[[Stream.getEffectsVolume]] | 获取所有音效文件播放音量
[[Stream.setEffectsVolume]] | 设置所有音效文件播放音量
[[Stream.stopAllEffects]] | 停止播放所有音效文件
[[Stream.pauseAllEffects]] | 暂停播放所有音效文件
[[Stream.resumeAllEffects]] | 恢复播放所有音效文件
[[Stream.getAudioEffectsDuration]] | 获取音效时长
[[Stream.getAudioEffectsCurrentPosition]] | 获取音效播放进度


## <span id="录制管理">录制管理</span>

方法 | 功能描述
---|---|
[[Stream.startMediaRecording]] | 开启单人视频录制。
[[Stream.stopMediaRecording]] | 结束视频录制。
[[Stream.playMediaRecording]] | 播放录制的音视频文件。
[[Stream.listMediaRecording]] | 枚举已录制的音视频文件。
[[Stream.cleanMediaRecording]] | 清除录制的音视频。
[[Stream.downloadMediaRecording]] | 下载录制的音视频。


## <span id="事件">事件</span>

通过 [[Client.on]] 和 [[Stream.on]] 方法监听 [[Client]] 和 [[Stream]] 方法触发的事件。

## <span id="errorCode">错误代码</span>
以下为 SDK 可能抛出的错误，请参考下表进行处理

错误代码| 值 | 描述
---|---|---
INVALID_PARAMETER | 41000 | 无效参数，可以通过 console 日志查看原因
NOT_SUPPORT | 41001 | 浏览器不支持，请使用 SDK 支持的浏览器
NO_SERVER_ADDRESS | 41002 | 没有找到服务器地址
SOCKET_ERROR | 41003 | 服务器地址连接失败
NO_SIGNALLING | 41004 | 找不到信令
NO_STATS | 41005 | 找不到 stats 数据
NO_MEDIASERVER | 41006 | 找不到 media server 数据
NO_MEETINGS | 41007 | 找不到 meetings 数据
NO_LOCALSTREAM | 41008 | 找不到 localStream 数据
INVALID_OPERATION | 41009 | 非法操作，可以通过 console 日志查看原因 
REPEAT_JOIN | 41010 | 重复进房
USER_NOT_IN_CHANNEL | 41011 | 本地用户不再频道中
NOT_SUPPORTED_YET | 41012 | 当前不支持，可以通过 console 日志查看原因
UNKNOWN_TYPE | 41013 | 未知类型，可以通过 console 日志查看原因
NOT_ALLOWED | 41014 | 无权限，禁止操作
STATE_ERROR | 41015 | 状态错误，可以通过 console 日志查看原因
NO_FILE | 41016 | 找不到文件，可以通过 console 日志查看原因
DECODE_FAILED | 41017 | 解码失败
ADD_TASK_FAILED | 41018 | 添加推流任务失败
DELETE_TASK_FAILED | 41019 | 删除推流任务请求失败
UPDATE_TASKS_FAILED | 41020 | 更新推流任务失败
RECORD_API_ERROR | 41021 | 录制接口出错
NO_RECORDER_FOUND | 41022 | 没有进行录制
NOT_DEFINED | 41023 | 未定义，可以通过 console 日志查看原因
NOT_AVALIABLE | 41024 | 不可用，可以通过 console 日志查看原因
NO_MEDIAHELPER | 41025 | 没有 mediaHelper 数据
NO_PLAY | 41026 | 没有实例化 Play
NO_RECORD | 41027 | 没有实例化 Record
NOT_FOUND | 41028 | 未获取，可以通过 console 日志查看原因
APPDATA_ERROR | 41029 | appData 错误，可以通过 console 日志查看原因
AUTO_PLAY_NOT_ALLOWED | 41030 | 自动播放受限
MEDIA_OPEN_BANNED_BY_SERVER | 41032 | 被服务器禁言
UNKNOWN | 99999 | 未知错误

