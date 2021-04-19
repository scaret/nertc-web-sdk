# <span id="NERtc Web SDK">NERTC Web SDK</span>

NERTC Web SDK提供完善的音视频通话JavaScript开发框架，提供基于网络的视频通话和语音通话功能，支持在网页中调用API快速建立音视频连接，进行音视频通话和推流的服务。

完整的NERTC Web SDK由WEBRTC2、Client和Stream三部分组成
- [[WebRTC2]]是基础对象，是所有可调用方法的入口
- [[Client]]是客户端对象，负责通话中的本地或远程用户的核心操作。
- [[Stream]]是音视频流对象，负责音视频流相关的设置

## <span id="WEBRTC2对象">WEBRTC2对象</span>

方法 | 功能描述
---|---|
[[WebRTC2.createClient]] | 创建客户端
[[WebRTC2.createStream]] | 创建音视频流对象
[[WebRTC2.getDevices]] | 获取可用的媒体输入/输出设备
[[WebRTC2.getCameras]] | 获取可用的视频输入设备
[[WebRTC2.getMicrophones]] | 获取可用的音频输入设备
[[WebRTC2.getSpeakers]] | 获取可用的音频输出设备

## <span id="Client客户端对象">Client客户端对象</span>

### <span id="客户端管理">客户端管理</span>

方法 | 功能描述
---|---|
[[WebRTC2.createClient]] | 创建客户端对象实例
[[Client.destroy]] | 销毁客户端对象实例



### <span id="频道管理">频道管理</span>


方法 | 功能描述
---|---|
[[Client.join]] | 加入音视频频道
[[Client.leave]] | 离开音视频频道
[[Client.setChannelProfile]] | 设置频道场景
[[Client.setClientRole]]|设置用户角色
[[Client.publish]] | 发布音视频流
[[Client.unpublish]] | 取消发布音视频流
[[Client.subscribe]] | 接收远端音视频流
[[Client.unsubscribe]] | 取消接收远端音视频流
[[Client.setRemoteVideoStreamType]] | 动态更新订阅视频的分辨率
[[Client.getConnectionState]]|主动获取网络连接状态。

### <span id="旁路推流管理">旁路推流管理</span>

方法 | 功能描述
---|---|
[[Client.addTasks]] | 增加旁路推流任务
[[Client.deleteTasks]] | 删除旁路推流任务
[[Client.updateTasks]] | 更新旁路推流任务


### <span id="设备数据">设备数据</span>



方法 | 功能描述
---|---|
[[Client.getSystemStats]] | 获取系统电量
[[Client.getTransportStats]] | 获取网络连接状况统计数据

### <span id="音视频数据统计">音视频数据统计</span>


方法 | 功能描述
---|---|
[[Client.getLocalAudioStats]] | 获取本地发布流的音频统计数据
[[Client.getLocalVideoStats]] | 获取本地发布流的视频统计数据
[[Client.getRemoteAudioStats]] | 获取远端订阅流的音频统计数据
[[Client.getRemoteVideoStats]] | 获取远端订阅流的视频统计数据
[[Client.getSessionStats]] | 获取会话的连接状况统计数据


## <span id="Stream音视频流对象">Stream音视频流对象</span>

### <span id="音视频流管理">音视频流管理</span>


方法 | 功能描述
---|---|
[[WebRTC2.createStream]] | 创建音视频流对象
[[Stream.destroy]] | 销毁音视频流对象
[[Stream.init]] | 初始化音视频流对象
[[Stream.play]] | 播放音视频流
[[Stream.stop]] | 停止播放音视频流
[[Stream.open]] | 打开音视频流输入设备，如麦克风
[[Stream.close]] | 关闭音视频流输入设备，如麦克风


### <span id="音频管理">音频管理</span>


方法 | 功能描述
---|---|
[[Stream.setAudioProfile]] | 设置音频属性
[[Stream.setAudioVolume]] | 设置音频播放的音量
[[Stream.setCaptureVolume]] | 设置麦克风采集的音量
[[Stream.muteAudio]] | 禁用音频轨道
[[Stream.unmuteAudio]] | 启用音频轨道
[[Stream.getAudioLevel]] | 获取当前麦克风采集音量
[[Stream.hasAudio]] | 当前Stream是否有音频
[[Stream.setAudioOutput]]|设置音频输出设备


### <span id="视频管理">视频管理</span>


方法 | 功能描述
---|---|
[[Stream.setVideoProfile]] | 设置视频属性
[[Stream.setSubscribeConfig]] | 设置视频订阅的参数
[[Stream.setScreenProfile]] | 设置屏幕共享属性
[[Stream.muteVideo]] | 禁用视频轨道
[[Stream.unmuteVideo]] | 启用视频轨道
[[Stream.setLocalRenderMode]] | 设置本端视频画面大小
[[Stream.setRemoteRenderMode]] | 设置对端视频画面大小
[[Stream.takeSnapshot]] | 截取指定用户的视频画面]

### <span id="音乐文件播放及混音">音乐文件播放及混音</span>

方法 | 功能描述
---|---|
[[Stream.startAudioMixing]] | 开始播放音乐文件和本地麦克风声音的混合
[[Stream.pauseAudioMixing]] | 暂停播放音乐文件
[[Stream.resumeAudioMixing]] | 恢复播放音乐文件
[[Stream.stopAudioMixing]] | 停止播放音乐文件
[[Stream.adjustAudioMixingVolume]] | 调节音乐文件播放音量
[[Stream.getAudioMixingDuration]] | 获取音乐文件的总长度
[[Stream.setAudioMixingPosition]] | 获取音乐文件当前播放进度

## <span id="录制管理">录制管理</span>

方法 | 功能描述
---|---|
[[Stream.startMediaRecording]] | 开启单人视频录制
[[Stream.stopMediaRecording]] | 结束视频录制
[[Stream.playMediaRecording]] | 播放录制的音视频文件
[[Stream.listMediaRecording]] | 枚举已录制的音视频文件
[[Stream.cleanMediaRecording]] | 清除录制的音视频
[[Stream.downloadMediaRecording]] | 下载录制的音视频
