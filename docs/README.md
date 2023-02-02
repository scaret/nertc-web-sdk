# <span id="NERtc Web SDK">NERTC Web SDK</span>

NERTC Web SDK 提供完善的音视频通话 JavaScript 开发框架，提供基于网络的视频通话和语音通话功能，支持在网页中调用 API 快速建立音视频连接，进行音视频通话和推流的服务。

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

| 方法                               | 功能描述                      |
| ---------------------------------- | ----------------------------- |
| [[NERTC.createClient]]             | 创建客户端。                  |
| [[NERTC.createStream]]             | 创建音视频流对象。            |
| [[NERTC.getDevices]]               | 获取可用的媒体输入/输出设备。 |
| [[NERTC.getCameras]]               | 获取可用的视频输入设备。      |
| [[NERTC.getMicrophones]]           | 获取可用的音频输入设备。      |
| [[NERTC.getSpeakers]]              | 获取可用的音频输出设备。      |
| [[NERTC.Logger.enableLogUpload]]   | 开启日志上传。                |
| [[NERTC.Logger.disableLogUpload]]  | 关闭日志上传。                |
| [[NERTC.Device.enableCompatMode]]  | 开启音频采集设备兼容模式。    |
| [[NERTC.Device.disableCompatMode]] | 关闭音频采集设备兼容模式。    |
| [[NERTC.checkSystemRequirements]]  | 检查系统是否支持NERTC        |
| [[NERTC.checkBrowserCompatibility]] | 检查浏览器是否支持NERTC      |

## <span id="Client 客户端对象">Client 客户端对象</span>

### <span id="客户端管理">客户端管理</span>

| 方法                   | 功能描述             |
| ---------------------- | -------------------- |
| [[NERTC.createClient]] | 创建客户端对象实例。 |
| [[Client.destroy]]     | 销毁客户端对象实例。 |

### <span id="房间管理">房间管理</span>

| 方法                                | 功能描述                   |
| ----------------------------------- | -------------------------- |
| [[Client.join]]                     | 加入音视频房间。           |
| [[Client.leave]]                    | 离开音视频房间。           |
| [[Client.setChannelProfile]]        | 设置房间场景。             |
| [[Client.setClientRole]]            | 设置用户角色。             |
| [[Client.publish]]                  | 发布音视频流。             |
| [[Client.unpublish]]                | 取消发布音视频流。         |
| [[Client.subscribe]]                | 接收远端音视频流。         |
| [[Client.unsubscribe]]              | 取消接收远端音视频流。     |
| [[Client.setRemoteVideoStreamType]] | 动态更新订阅视频的分辨率。 |
| [[Client.getConnectionState]]       | 主动获取网络连接状态。     |
| [[Client.getUid]]                   | 获取本地用户 ID。          |
| [[Client.startProxyServer]]         | 开启云代理。               |
| [[Client.stopProxyServer]]          | 关闭云代理。               |
| [[Client.enableDualStream]]         | 开启双流发布模式。         |
| [[Client.disableDualStream]]        | 关闭双流发布模式。         |

### <span id="旁路推流管理">旁路推流管理</span>

| 方法                   | 功能描述           |
| ---------------------- | ------------------ |
| [[Client.addTasks]]    | 增加旁路推流任务。 |
| [[Client.deleteTasks]] | 删除旁路推流任务。 |
| [[Client.updateTasks]] | 更新旁路推流任务。 |

### <span id="设备数据">设备数据</span>

| 方法                         | 功能描述                   |
| ---------------------------- | -------------------------- |
| [[Client.getSystemStats]]    | 获取系统电量。             |
| [[Client.getTransportStats]] | 获取网络连接状况统计数据。 |

### <span id="音视频数据统计">音视频数据统计</span>

| 方法                           | 功能描述                       |
| ------------------------------ | ------------------------------ |
| [[Client.getLocalAudioStats]]  | 获取本地发布流的音频统计数据。 |
| [[Client.getLocalVideoStats]]  | 获取本地发布流的视频统计数据。 |
| [[Client.getRemoteAudioStats]] | 获取远端订阅流的音频统计数据。 |
| [[Client.getRemoteVideoStats]] | 获取远端订阅流的视频统计数据。 |
| [[Client.getSessionStats]]     | 获取会话的连接状况统计数据。   |

### <span id="音视频流回退">音视频流回退</span>

| 方法                             | 功能描述                     |
| -------------------------------- | ---------------------------- |
| [[Client.setLocalMediaPriority]] | 设置本地用户的媒体流优先级。 |

## <span id="加密">加密</span>

| 方法                           | 功能描述             |
| ------------------------------ | -------------------- |
| [[Client.setEncryptionMode]]   | 设置媒体流加密模式。 |
| [[Client.setEncryptionSecret]] | 设置媒体流加密密钥。 |

## <span id="Stream 音视频流对象">Stream 音视频流对象</span>

### <span id="音视频流管理">音视频流管理</span>

| 方法                   | 功能描述                         |
| ---------------------- | -------------------------------- |
| [[NERTC.createStream]] | 创建音视频流对象。               |
| [[Stream.destroy]]     | 销毁音视频流对象。               |
| [[Stream.init]]        | 初始化音视频流对象。             |
| [[Stream.play]]        | 播放音视频流。                  |
| [[Stream.isPlaying]]   | 音视频流是否正在播放。            |
| [[Stream.canPlay]]     | 音视频流是否可以播放。            |
| [[Stream.stop]]        | 停止播放音视频流。               |
| [[Stream.open]]        | 打开音视频流输入设备，如麦克风。 |
| [[Stream.close]]       | 关闭音视频流输入设备，如麦克风。 |

### <span id="音频管理">音频管理</span>

| 方法                        | 功能描述                 |
| --------------------------- | ------------------------ |
| [[Stream.setAudioProfile]]  | 设置音频属性。           |
| [[Stream.setAudioVolume]]   | 设置音频播放的音量。     |
| [[Stream.setCaptureVolume]] | 设置麦克风采集的音量。   |
| [[Stream.muteAudio]]        | 禁用音频轨道。           |
| [[Stream.unmuteAudio]]      | 启用音频轨道。           |
| [[Stream.getAudioLevel]]    | 获取当前麦克风采集音量。 |
| [[Stream.hasAudio]]         | 当前 Stream 是否有音频。 |
| [[Stream.setAudioOutput]]   | 设置音频输出设备。       |

### <span id="视频管理">视频管理</span>

| 方法                                 | 功能描述                 |
| ------------------------------------ | ------------------------ |
| [[Stream.setVideoProfile]]           | 设置视频属性。           |
| [[Stream.setSubscribeConfig]]        | 设置视频订阅的参数。     |
| [[Stream.setScreenProfile]]          | 设置屏幕共享属性。       |
| [[Stream.muteVideo]]                 | 禁用视频轨道。           |
| [[Stream.unmuteVideo]]               | 启用视频轨道。           |
| [[Stream.setLocalRenderMode]]        | 设置本端视频画面大小。   |
| [[Stream.setRemoteRenderMode]]       | 设置对端视频画面大小。   |
| [[Stream.takeSnapshot]]              | 截取指定用户的视频画面。 |
| [[Stream.setCanvasWatermarkConfigs]] | 添加视频画布水印。       |

### <span id="音乐文件播放及混音">音乐文件播放及混音</span>

| 方法                                     | 功能描述                                 |
| ---------------------------------------- | ---------------------------------------- |
| [[Stream.startAudioMixing]]              | 开始播放音乐文件和本地麦克风声音的混合。 |
| [[Stream.pauseAudioMixing]]              | 暂停播放音乐文件。                       |
| [[Stream.resumeAudioMixing]]             | 恢复播放音乐文件。                       |
| [[Stream.stopAudioMixing]]               | 停止播放音乐文件。                       |
| [[Stream.adjustAudioMixingVolume]]       | 调节音乐文件播放音量。                   |
| [[Stream.getAudioMixingDuration]]        | 获取音乐文件的总长度。                   |
| [[Stream.getAudioMixingCurrentPosition]] | 获取音乐文件当前播放进度。               |
| [[Stream.setAudioMixingPosition]]        | 设置音乐文件当前播放进度。               |

### <span id="播放音效文件">播放音效文件</span>

| 方法                                      | 功能描述                 |
| ----------------------------------------- | ------------------------ |
| [[Stream.playEffect]]                     | 播放指定音效文件         |
| [[Stream.stopEffect]]                     | 停止播放指定音效文件     |
| [[Stream.pauseEffect]]                    | 暂停播放指定音效文件     |
| [[Stream.resumeEffect]]                   | 恢复播放指定音效文件     |
| [[Stream.setVolumeOfEffect]]              | 调节指定音效文件的音量   |
| [[Stream.preloadEffect]]                  | 预加载指定音效文件       |
| [[Stream.unloadEffect]]                   | 释放指定音效文件         |
| [[Stream.getEffectsVolume]]               | 获取所有音效文件播放音量 |
| [[Stream.setEffectsVolume]]               | 设置所有音效文件播放音量 |
| [[Stream.stopAllEffects]]                 | 停止播放所有音效文件     |
| [[Stream.pauseAllEffects]]                | 暂停播放所有音效文件     |
| [[Stream.resumeAllEffects]]               | 恢复播放所有音效文件     |
| [[Stream.getAudioEffectsDuration]]        | 获取音效时长             |
| [[Stream.getAudioEffectsCurrentPosition]] | 获取音效播放进度         |

## <span id="录制管理">录制管理</span>

| 方法                              | 功能描述                 |
| --------------------------------- | ------------------------ |
| [[Stream.startMediaRecording]]    | 开启单人视频录制。       |
| [[Stream.stopMediaRecording]]     | 结束视频录制。           |
| [[Stream.playMediaRecording]]     | 播放录制的音视频文件。   |
| [[Stream.listMediaRecording]]     | 枚举已录制的音视频文件。 |
| [[Stream.cleanMediaRecording]]    | 清除录制的音视频。       |
| [[Stream.downloadMediaRecording]] | 下载录制的音视频。       |

## <span id="事件">事件</span>

通过 [[Client.on]] 和 [[Stream.on]] 方法监听 [[Client]] 和 [[Stream]] 方法触发的事件。

## <span id="errorCode">错误代码</span>

以下为 SDK 可能抛出的错误，请参考下表进行处理

### ErrorCode

#### 4.6.20 及之前的版本

| key                         | 错误码 | 描述                         | 可能原因及处理建议                                                                  |
| --------------------------- | :----- | :--------------------------- | :---------------------------------------------------------------------------------- |
| INVALID_PARAMETER           | 41000  | 无效参数                     | 一般是参数错误，可以通过 console 日志查看错误原因及处理方式                         |
| NOT_SUPPORT                 | 41001  | 浏览器不支持                 | 一般是浏览器不支持，可以通过 console 日志查看错误原因及处理方式                     |
| NO_SERVER_ADDRESS           | 41002  | 没有找到服务器地址           | 一般是服务器错误，请联系云信技术支持                                                |
| SOCKET_ERROR                | 41003  | 服务器地址连接失败           | 一般是服务器地址连接失败，请联系云信技术支持                                        |
| NO_SIGNALLING               | 41004  | 找不到信令                   | 一般是信令错误，请联系云信技术支持                                                  |
| NO_STATS                    | 41005  | 数据格式错误                 | 一般是数据格式错误，请联系云信技术支持                                              |
| NO_MEDIASERVER              | 41006  | 找不到媒体服务               | 一般是媒体服务器错误，请联系云信技术支持                                            |
| NO_MEETINGS                 | 41007  | 找不到会议信息               | 一般是会控错误，请联系云信技术支持                                                  |
| NO_LOCALSTREAM              | 41008  | 找不到 localStream 数据      | 可以通过 console 日志查看错误原因及处理方式                                         |
| INVALID_OPERATION           | 41009  | 非法操作                     | 一般是接口操作错误，可以通过 console 日志查看错误原因及处理方式                     |
| REPEAT_JOIN                 | 41010  | 重复加入房间                 | 一般是重复加入房间导致的错误                                                        |
| USER_NOT_IN_CHANNEL         | 41011  | 本地用户不在频道中           | 可以通过 console 日志查看错误原因及处理方式，或联系云信技术支持                     |
| NOT_SUPPORTED_YET           | 41012  | 当前不支持                   | 一般是当前操作浏览器不支持                                                          |
| UNKNOWN_TYPE                | 41013  | 位置类型                     | 一般是当前参数类型错误，可以通过 console 日志查看错误原因及处理方式                 |
| NOT_ALLOWED                 | 41014  | 权限错误                     | 一般是没有权限进行操作，可以通过 console 日志查看错误原因及处理方式                 |
| STATE_ERROR                 | 41015  | 状态错误                     | 请联系云信技术支持                                                                  |
| NO_FILE                     | 41016  | 找不到文件                   | 可以通过 console 日志查看错误原因及处理方式                                         |
| DECODE_FAILED               | 41017  | 解码失败                     | 可以通过 console 日志查看错误原因及处理方式                                         |
| ADD_TASK_FAILED             | 41018  | 添加推流任务失败             | 可以通过 console 日志查看错误原因及处理方式                                         |
| DELETE_TASK_FAILED          | 41019  | 删除推流任务请求失败         | 可以通过 console 日志查看错误原因及处理方式                                         |
| UPDATE_TASKS_FAILED         | 41020  | 更新推流任务请求失败         | 可以通过 console 日志查看错误原因及处理方式                                         |
| RECORD_API_ERROR            | 41021  | 录制接口出错                 | 可以通过 console 日志查看错误原因及处理方式                                         |
| NO_RECORDER_FOUND           | 41022  | 没有进行录制                 | 可以通过 console 日志查看错误原因及处理方式                                         |
| NOT_DEFINED                 | 41023  | 未定义错误                   | 可以通过 console 日志查看错误原因及处理方式                                         |
| NOT_AVAILABLE               | 41024  | 不可用错误                   | 可以通过 console 日志查看错误原因及处理方式                                         |
| NO_MEDIAHELPER              | 41025  | 一般是某些媒体数据错误       | 可以通过 console 日志查看错误原因及处理方式，或联系云信技术支持                     |
| NO_PLAY                     | 41026  | 一般是没有开启播放导致的错误 | 可以通过 console 日志查看错误原因及处理方式，或联系云信技术支持                     |
| NO_RECORD                   | 41027  | 一般是没有开启录制导致的错误 | 可以通过 console 日志查看错误原因及处理方式                                         |
| NOT_FOUND                   | 41028  | 相关信息无法获取             | 一般是参数设置问题，可以通过 console 日志查看错误原因及处理方式，或联系云信技术支持 |
| APPDATA_ERROR               | 41029  | 一般是媒体数据错误           | 请联系云信技术支持                                                                  |
| AUTO_PLAY_NOT_ALLOWED       | 41030  | 一般是浏览器自动播放受限错误 | 可以通过 console 日志查看错误原因及处理方式                                         |
| MEDIA_OPEN_BANNED_BY_SERVER | 41032  | 音视频被服务器禁言           | 可以通过 console 日志查看错误原因及处理方式                                         |
| PROXY_SERVER_ERROR          | 41033  | 云代理失败                   | 可以通过 console 日志查看错误原因及处理方式，或联系云信技术支持                     |
| UNKNOWN                     | 99999  | 一般是未知原因错误           | 请联系云信技术支持                                                                  |

#### 4.6.25

| key                           | 错误码 | 描述                     | 原因及处理建议                              |
| ----------------------------- | :----- | :----------------------- | :------------------------------------------ |
| INVALID_PARAMETER_ERROR       | 10000  | 无效参数                 | 可以通过 console 日志查看错误原因及处理方式 |
| NOT_SUPPORT_ERROR             | 10001  | 浏览器不支持             | 可以通过 console 日志查看错误原因及处理方式 |
| NETWORK_ERROR                 | 10002  | 网络环境异常             | 可以通过 console 日志查看错误原因及处理方式 |
| NETWORK_REQUEST_ERROR         | 10003  | 网络请求异常             | 可以通过 console 日志查看错误原因及处理方式 |
| SERVER_ERROR                  | 10004  | 云信服务异常             | 可以通过 console 日志查看错误原因及处理方式 |
| MEDIA_SERVER_ERROR            | 10005  | 云信媒体服务异常         | 可以通过 console 日志查看错误原因及处理方式 |
| SIGNALLING_ERROR              | 10006  | 云信信令异常             | 可以通过 console 日志查看错误原因及处理方式 |
| SIGNALLING_SERVER_ERROR       | 10007  | 云信信令服务异常         | 可以通过 console 日志查看错误原因及处理方式 |
| API_CALL_SEQUENCE_ERROR       | 10008  | 接口调用顺序异常         | 可以通过 console 日志查看错误原因及处理方式 |
| INVALID_OPERATION_ERROR       | 10009  | 操作异常                 | 可以通过 console 日志查看错误原因及处理方式 |
| LOCALSTREAM_ERROR             | 10010  | localStream 异常         | 可以通过 console 日志查看错误原因及处理方式 |
| LOCALSTREAM_NOT_FOUND_ERROR   | 10010  | localStream 未找到       | 可以通过 console 日志查看错误原因及处理方式 |
| UNKNOWN_TYPE_ERROR            | 10012  | 未知类型异常             | 可以通过 console 日志查看错误原因及处理方式 |
| UNDEFINED_ERROR               | 10013  | 未定义异常               | 可以通过 console 日志查看错误原因及处理方式 |
| UNAVAILABLE_ERROR             | 10014  | 不可用异常               | 可以通过 console 日志查看错误原因及处理方式 |
| BANNED_BY_SERVER              | 10015  | 被服务器禁言             | 可以通过 console 日志查看错误原因及处理方式 |
| SOCKET_INIT_ERROR             | 10016  | socket 异常              | 可以通过 console 日志查看错误原因及处理方式 |
| REPEAT_JOIN_ERROR             | 10101  | 重复进房错误             | 可以通过 console 日志查看错误原因及处理方式 |
| MEETING_ERROR                 | 10102  | 会控异常                 | 可以通过 console 日志查看错误原因及处理方式 |
| ROOM_SERVER_ERROR             | 10103  | 房间服务相关错误         | 可以通过 console 日志查看错误原因及处理方式 |
| USER_NOT_IN_CHANNEL_ERROR     | 10104  | 用户不在频道中错误       | 可以通过 console 日志查看错误原因及处理方式 |
| EVENT_UPLOAD_ERROR            | 10105  | 事件上报错误             | 可以通过 console 日志查看错误原因及处理方式 |
| NOT_FOUND_ERROR               | 10106  | 未找到异常               | 可以通过 console 日志查看错误原因及处理方式 |
| SDP_ERROR                     | 10107  | SDP 异常                 | 可以通过 console 日志查看错误原因及处理方式 |
| ADD_TASK_FAILED_ERROR         | 10201  | 添加推流任务失败         | 可以通过 console 日志查看错误原因及处理方式 |
| DELETE_TASK_FAILED_ERROR      | 10202  | 删除推流任务失败         | 可以通过 console 日志查看错误原因及处理方式 |
| UPDATE_TASKS_FAILED_ERROR     | 10203  | 更新推流任务失败         | 可以通过 console 日志查看错误原因及处理方式 |
| TASK_ERROR                    | 10204  | 推流任务异常             | 可以通过 console 日志查看错误原因及处理方式 |
| PLAY_NOT_START_ERROR          | 10205  | 未开始播放异常           | 可以通过 console 日志查看错误原因及处理方式 |
| APPDATA_OVERRIDE_ERROR        | 10206  | appData 异常             | 可以通过 console 日志查看错误原因及处理方式 |
| SET_BEAUTY_ERROR              | 10401  | 开关基础美颜相关异常     | 可以通过 console 日志查看错误原因及处理方式 |
| SET_ADVANCED_BEAUTY_ERROR     | 10402  | 开关高级美颜相关异常     | 可以通过 console 日志查看错误原因及处理方式 |
| SET_BODY_SEGMENT_ERROR        | 10403  | 开关背景替换相关异常     | 可以通过 console 日志查看错误原因及处理方式 |
| FORMAT_AUDIO_ERROR            | 10420  | 音频处理异常             | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_MIX_FILE_ERROR          | 10421  | 伴音相关文件加载状态异常 | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_MIX_STATE_ERROR         | 10422  | 伴音相关操作状态异常     | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_EFFECT_STATE_ERROR      | 10423  | 音效相关操作状态异常     | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_EFFECT_FILE_LOST_ERROR  | 10424  | 音效文件缺失             | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_MIX_DECODE_FAILED_ERROR | 10425  | 伴音解码异常             | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_MIXING_ERROR            | 10426  | 伴音相关异常             | 可以通过 console 日志查看错误原因及处理方式 |
| AUDIO_EFFECT_ERROR            | 10427  | 音效相关异常             | 可以通过 console 日志查看错误原因及处理方式 |
| SET_ENCRYPTION_MODE_ERROR     | 10440  | 国密加密相关异常         | 可以通过 console 日志查看错误原因及处理方式 |
| PROXY_ERROR                   | 10441  | 云代理相关异常           | 可以通过 console 日志查看错误原因及处理方式 |
| RECORDING_ERROR               | 10450  | 录制时参数异常相关异常   | 可以通过 console 日志查看错误原因及处理方式 |
| RECORDING_NOT_START_ERROR     | 10451  | 录制未开始异常           | 可以通过 console 日志查看错误原因及处理方式 |
| WATERMARKS_EXCEEDED_ERROR     | 10460  | 水印数额超限相关异常     | 可以通过 console 日志查看错误原因及处理方式 |
| LBS_REQUEST_ERROR             | 10461  | LBS 请求相关异常         | 可以通过 console 日志查看错误原因及处理方式 |
| LBS_JSON_ERROR                | 10462  | LBS json 解析异常        | 可以通过 console 日志查看错误原因及处理方式 |
| NO_STATS_ERROR                | 10470  | 数据上报相关异常         | 可以通过 console 日志查看错误原因及处理方式 |
| AUTO_PLAY_NOT_ALLOWED         | 41030  | 自动播放受限异常         | 可以通过 console 日志查看错误原因及处理方式 |
| UNKNOWN                       | 99999  | 未知错误                 | 可以通过 console 日志查看错误原因及处理方式 |


#### 4.6.40及之后版本

见 [API 参考 > 错误码](https://doc.yunxin.163.com/jcyOTA0ODM/docs/zU2MDQ4MjU?platform=web)

### 其他常见报错及处理方式

| 错误信息                                 | 错误原因                                                           | 处理方案                                            |
| ---------------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------- |
| getUserMedia error: NotAllowedError      | 用户拒绝了当前的浏览器实例访问音频、视频或屏幕分享的请求           | 用户需要授权摄像头/麦克风访问，才能进行音视频通话   |
| getUserMedia error: NotFoundError        | 找不到满足请求参数的媒体类型，如音频，视频                         | 建议通话前进行设备检测，确认设备状态正常            |
| getUserMedia error: NotReadableError     | 操作系统上某个硬件、浏览器或者网页层面发生的错误导致设备无法被访问 | 请确保当前麦克风/摄像头没有被其他设备占用           |
| getUserMedia error: OverconstrainedError | 浏览器无法获取到媒体设备的 deviceId，如 cameraId/microphoneId      | 请确保 cameraId/microphoneId 是符合要求的非空字符串 |
| getUserMedia error: TypeError            | 当前使用的是 http 协议                                             | 请确保 当前使用的是 https 协议                      |
