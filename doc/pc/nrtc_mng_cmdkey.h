#pragma once

//key param---------------------------------------------
static const char *kNRTCCmdSessionId			= "session_id";				/**< string 会话id */
static const char *kNRTCCmdCmdId				= "cmd_id";					/**< int64 用于回调的接口id */
static const char *kNRTCCmdType					= "cmd_type";				/**< string cmd操作类型key */
static const char *kNRTCCmdInfo					= "cmd_info";				/**< json cmd操作内容 */

static const char *kNRTCCmdInfoType				= "type";					/**< int32 cmd操作内容的类型参数 */
static const char *kNRTCCmdInfoStatus			= "status";					/**< int32 cmd操作内容的状态参数 */
static const char *kNRTCCmdInfoCode				= "code";					/**< int32 cmd操作内容的参数 */
static const char *kNRTCCmdDevices				= "devices";				/**< list 设备名和设备地址列表 */
static const char *kNRTCCmdInfoContent			= "content";				/**< string 内容 */
static const char *kNRTCCmdInfoAccount			= "account";				/**< string 账号 */
static const char *kNRTCCmdInfoPath				= "path";					/**< string 地址 */
static const char *kNRTCCmdInfoId				= "id";						/**< int64 用户id */
static const char *kNRTCCmdInfoHeartbeat		= "heartbeat";				/**< int32 心跳开关 */
static const char *kNRTCCmdInfoCut				= "cut";					/**< int32 裁剪开关 */

static const char *kNRTCCmdPort					= "port";					/**< int32 视频数据端口 */
static const char *kNRTCCmdVersion				= "version";				/**< string 版本 */

static const char *kNRTCCmdAppKey				= "app_key";				/**< string 用户的app key */

static const char *kNoslogNosInfoBucket			= "nos_bucket";
static const char *kNoslogNosInfoObject			= "nos_object";
static const char *kNoslogNosInfoHeaderToken	= "nos_header_token";
static const char *kNoslogUrl					= "url";

//key interface---------------------------------------------无特殊说明的接口 xxxx,返回为xxxx_notify
static const char *kNRTCCmdInit					= "on_init";				/**< key 初始化 返回 init_notify */
//{"cmd_info":{"type" : 0, "account" : "xxxx", "heartbeat":1 }, "cmd_type" : "on_init", "cmd_id" : 123} //type=1标识强制登陆，会踢掉之前的连接;heartbeat默认为1，传0时，底层不开心跳
static const char *kNRTCCmdClear				= "on_clear";				/**< key 结束清理 */
//{"cmd_type" : "on_clear"} //
static const char *kNRTCCmdHeartbeat			= "on_heartbeat";			/**< key 心跳，35秒没收到会执行on_clear操作 */
//{"cmd_type" : "on_heartbeat"} //
static const char *kNRTCCmdClearMedia			= "on_clear_media";			/**< key 清理媒体通道，告诉agent停止向现有的某个uid的媒体link发送数据。通过媒体link接收，不走cmd信令通道。 */
//{"cmd_type" : "on_clear_media"} //
static const char *kNRTCCmdLog					= "on_log";					/**< key 打印日志 */
//{"cmd_info":{"type" : 3, "content" : "xxxx" }, "cmd_type" : "on_log"} // "type"为日志等级	LV_ERR = 0,LV_WAR = 1,LV_APP = 2,LV_PRO = 3
static const char *kNRTCCmdUploadLog			= "on_upload_log";			/**< key 上传日志 返回 upload_log_notify */
//{"cmd_info":{"nos_bucket" : "xxxx", "nos_object" : "xxxx", "nos_header_token" : "xxxx" }, "cmd_type" : "on_upload_log", "cmd_id" : 123} 
static const char *kNRTCCmdNetDetect			= "on_net_detect";			/**< key 音视频网络探测 返回 net_detect_notify */
//{"cmd_info":{"app_key" : "xxxx" }, "cmd_type" : "on_net_detect", "cmd_id" : 123} //
static const char *kNRTCCmdGetDevice			= "on_get_devices";			/**< key 遍历设备 返回 device_list_notify */
//{"cmd_info":{"type" : 3}, "cmd_type" : "on_get_devices", "cmd_id" : 123} //返回kNRTCCmdDeviceList, "type"为设备类型
static const char *kNRTCCmdStartDevice			= "on_start_device";		/**< key 开启设备 返回 device_start_notify */
//{"cmd_info":{"type" : 3, "width": 640, "height":480, "path" : "\\\\?\\root#image#0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global"}, "cmd_type" : "on_start_device", "cmd_id" : 123}
static const char *kNRTCCmdStopDevice			= "on_stop_device";			/**< key 关闭设备 */
//{"cmd_info":{"type" : 3}, "cmd_type" : "on_stop_device"}
static const char *kNRTCCmdCaptureVolume		= "on_capture_volume";		/**< key 采集音量0-255 */
//{"cmd_info":{"status" : 255}, "cmd_type" : "on_capture_volume"}
static const char *kNRTCCmdPlayVolume			= "on_play_volume";			/**< key 播放音量0-255 */
//{"cmd_info":{"status" : 255}, "cmd_type" : "on_play_volume"}
static const char *kNRTCCmdCaptureVideoSize		= "on_capture_video_size";	/**< key 设置采集的视频画面回调尺寸限制 */
//{"cmd_info":{"width": 640, "height":480, "cut":0 }, "cmd_type" : "on_capture_video_size", "cmd_id" : 123}//cut非0时表示需要按比例裁剪
static const char *kNRTCCmdRecVideoSize			= "on_rec_video_size";		/**< key 设置接收的视频画面回调尺寸限制 */
//{"cmd_info":{"id":84834, "width": 640, "height":480, "cut":0}, "cmd_type" : "on_rec_video_size", "cmd_id" : 123} //id为空或者0时，为通用设置,cut非0时表示需要按比例裁剪
static const char *kNRTCCmdSendVideoScale		= "on_send_video_Scale";	/**< key 设置发送的视频画面的裁剪 */
//{"cmd_info":{"type":0}, "cmd_type" : "on_send_video_Scale", "cmd_id" : 123} //type为NRTCChatVideoFrameScaleType

static const char *kNRTCCmdStartChat			= "on_start_chat";			/**< key 开启通话 */
//{"cmd_info":{...}, "cmd_type" : "on_start_chat", "cmd_id" : 123, "session_id":"abc"  }	//状态通知kNRTCCmdSessionNotify
static const char *kNRTCCmdStopChat				= "on_stop_chat";			/**< key 结束通话 */
//{"cmd_type" : "on_stop_chat" }
static const char *kNRTCCmdChatMode				= "on_set_chat_mode";		/**< key 设置通话模式 */
//{"cmd_info":{"type" : 1}, "cmd_type" : "on_set_chat_mode"}//NRTCChatMode
static const char *kNRTCCmdRtmpUrl				= "on_update_rtmp_url";		/**< key 主播更新推流地址 */
//{"cmd_info":{"content" : "xxxx"}, "cmd_type" : "on_update_rtmp_url", "cmd_id" : 123 } //content 为新的推流地址
static const char *kNRTCCmdStreamingMode		= "on_set_streaming_mode";	/**< key 开关推流状态 */
//{"cmd_info":{"status" : 1}, "cmd_type" : "on_set_streaming_mode", "cmd_id" : 123 } //status非0为推流,0为关闭推流

static const char *kNRTCCmdAudioBlack			= "on_set_audio_black";				/**< key 设置某一成员音频静音开关 */
//{"cmd_info":{"id":84834, "status" : 1}, "cmd_type" : "on_set_audio_black", "cmd_id" : 123 } //status非0为静音,0为非静音
static const char *kNRTCCmdVideoBlack			= "on_set_video_black";				/**< key 设置某一成员视频数据开关 */
//{"cmd_info":{"id":84834, "status" : 1}, "cmd_type" : "on_set_video_black", "cmd_id" : 123 } //status非0为关闭,0为发送视频数据
static const char *kNRTCCmdVideoQuality			= "on_set_video_quality";			/**< key 动态设置当前通话的视频发送最大尺寸 */
//{"cmd_info":{"type" : 0}, "cmd_type" : "on_set_video_quality" } //type为NRTCChatVideoQuality
static const char *kNRTCCmdVideoBitrate			= "on_set_video_bitrate";			/**< key 动态设置当前通话的视频发送最大码率 */
//{"cmd_info":{"code" : 600000}, "cmd_type" : "on_set_video_bitrate" } 
static const char *kNRTCCmdFrameRate			= "on_set_video_frame_rate";		/**< key 动态设置当前通话的视频发送最大帧率 */
//{"cmd_info":{"type" : 0}, "cmd_type" : "on_set_video_frame_rate" } //type为NRTCChatVideoFrameRate
static const char *kNRTCCmdSetViewer			= "on_set_viewer";					/**< key 设置观众模式（多人模式下），全局有效（重新发起时也生效），观众模式能减少运行开销 */
//{"cmd_info":{"status" : 0}, "cmd_type" : "on_set_viewer" } //status非0标识观众模式
static const char *kNRTCCmdAudioMuted			= "on_set_audio_muted";				/**< key 设置音频静音，全局有效（重新发起时也生效） */
//{"cmd_info":{"status" : 0}, "cmd_type" : "on_set_audio_muted" } //status非0标识静音
static const char *kNRTCCmdRotateRemoteVideo	= "on_rotate_remote_video";			/**< key 设置自动旋转对方画面，默认打开，全局有效（重新发起时也生效） */
//{"cmd_info":{"status" : 1}, "cmd_type" : "on_rotate_remote_video" } //status非0自动旋转
static const char *kNRTCCmdRecordMp4			= "on_record_mp4";					/**< key 开始mp4录制 */
//{"cmd_info":{"path" : "xxx", "id":84834}, "cmd_type" : "on_record_mp4", "cmd_id" : 123 } //path为保存的文件路径，id为需要录制的成员，如果录制自己的数据，填0或空
static const char *kNRTCCmdStopRecordMp4		= "on_stop_record_mp4";				/**< key 结束mp4录制 */
//{"cmd_info":{ "id":84834 }, "cmd_type" : "on_stop_record_mp4", "cmd_id" : 123 } //id为需要录制的成员，如果录制自己的数据，填0或空
static const char *kNRTCCmdRecordAAC			= "on_record_aac";					/**< key 开始混音文件录制 */
//{"cmd_info":{"path" : "xxx"}, "cmd_type" : "on_record_aac", "cmd_id" : 123 } //path为保存的文件路径
static const char *kNRTCCmdStopRecordAAC		= "on_stop_record_aac";				/**< key 结束混音文件录制 */
//{"cmd_info":{ }, "cmd_type" : "on_stop_record_aac", "cmd_id" : 123 } //


//key notify---------------------------------------------
static const char *kNRTCCmdInitNotify			= "init_notify";			/**< key 初始化结果通知 */
//{"cmd_id" : 123, "cmd_info":{"code":200, "version":"1.0.0.0","port":40000,"device_list_notify":[{"devices":[...], "type" : 0},...]}, "cmd_type" : "init_notify"}//code 返回200成功才能继续操作
static const char *kNRTCCmdUploagLogNotify		= "upload_log_notify";		/**< key 上传结果 */
//{"cmd_id" : 123, "cmd_info":{"code":200, "url":"xxx" }, "cmd_type" : "upload_log_notify"}//code是上传结果，如果200是成功，url返回成功后得到下载地址
static const char *kNRTCCmdNetDetectNotify		= "net_detect_notify";		/**< key 网络探测结果 */
//{"cmd_id" : 123, "cmd_info":{"code":200, "status":0 }, "cmd_type" : "net_detect_notify"}//code是调用结果，如果200是成功，status返回成功后得到的网络等级

static const char *kNRTCCmdDeviceList			= "device_list_notify";		/**< key 设备状态通知 */
//{"cmd_id" : 123, "cmd_info":
//	{"code":200, "devices":[
//		{"name":"ManyCam Virtual Webcam", "path" : "\\\\?\\root#image#0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global"}, 
//		{ "name":"USB2.0 PC CAMERA", "path" : "\\\\?\\usb#vid_1908&pid_2310&mi_00#6&36289d9b&1&0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global" }, 
//		{ "name":"YY浼翠荆", "path" : "[virtual device]YY浼翠荆" }], 
//	"type" : 3}, 
//"cmd_type" : "device_list_notify"}
static const char *kNRTCCmdDeviceStatus			= "device_status_notify";	/**< key 设备状态通知 */
//{"cmd_info":{"path":"ManyCam Virtual Webcam", "status" : 8, "type" : 3}, "cmd_type" : "device_status_notify"}//status对应NRTCDeviceStatus的与
static const char *kNRTCCmdDeviceStartCb		= "device_start_notify";	/**< key 设备开启结果通知 */
//{"cmd_id" : 123, "cmd_info":{"path":"ManyCam Virtual Webcam", "code" : 200, "type" : 3}, "cmd_type" : "device_start_notify"}//code 200标识成功
static const char *kNRTCCmdSessionNotify		= "session_notify";			/**< key 通话过程中的状态通知 */
//{"cmd_info":{...}, "cmd_type" : "session_notify", "cmd_id" : 123, "session_id":"abc" }
/*成功连接{ "login":{"video_record_file":"84849-6203579135172813608.mp4", "record_file" : "84849-6203579135172813608.aac", "cid" : 6203579135172813608 } } \n
* 	退出通知{ "logout":{"trafficstat_rx":134634, "trafficstat_tx" : 164645 } } \n
* 	错误通知{ "error":{"status":408, "type" : 1 } } \n
*		成员进入{ "user_joined":{"id":84834, "port":40001} } \n
*		成员退出{ "user_left":{"id":84834, "status" : 0} } //status 0为正常离开 -1为超时断开
*		网络状态{ "net":{"id":84834, "status" : 1} } \n
*		成员通知{ "control_notify":{ "camera": true, "mute" : true, "mode" : 2, "record" : true } } //无效，不需要暴露给用户
*		MP4开始 	{"mp4_start":{ "mp4_file": "d:\\test.mp4", "time": 14496477000000, "id":84834 }} \n
*		MP4结束 	{"mp4_close":{ "mp4_file": "d:\\test.mp4", "time": 120000, "status": 0, "id":84834 }} \n
*		音频录制开始	{"audio_record_start":{ "file": "d:\\test.aac", "time": 14496477000000 }} \n
*		音频录制结束	{"audio_record_close":{ "file": "d:\\test.aac", "time": 120000, "status": 0 }} \n
*		实时状态 	{"static_info":{ "video": {"fps":20, "KBps":200, "width":1280,"height":720}, "audio": {"fps":17, "KBps":3}}} \n
*		音量状态 	{"audio_volume":{ "self": {"status":600}, "receiver": [{"id":123,"status":1000},{"id":456,"status":222}] }} \n
*/

//