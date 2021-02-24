```c++
static const char *kNRTCCmdInit					= "on_init";				/**< key 初始化 */
//{"cmd_info":{"type" : 0, "account" : "xxxx" }, "cmd_type" : "on_init"} //type=1标识强制登陆，会踢掉之前的连接
static const char *kNRTCCmdInitNotify			= "init_notify";			/**< key 初始化结果通知 */
//{"cmd_info":{"port":40000}, "cmd_type" : "init_notify"}
static const char *kNRTCCmdClear				= "on_clear";				/**< key 结束清理 */
//{"cmd_type" : "on_clear"} //
static const char *kNRTCCmdAudioBlack			= "on_set_audio_black";			/**< key 设置某一成员音频静音开关 */
//{"cmd_info":{"id":84834, "status" : 1}, "cmd_type" : "on_set_audio_black", "session_id":123 } //session_id 用于回调的时候标记，status非0为静音,0为非静音
static const char *kNRTCCmdVideoBlack			= "on_set_video_black";			/**< key 设置某一成员视频数据开关 */
//{"cmd_info":{"id":84834, "status" : 1}, "cmd_type" : "on_set_video_black", "session_id":123 } //session_id 用于回调的时候标记，status非0为关闭,0为发送视频数据
//key interface---------------------------------------------
static const char *kNRTCCmdGetDevice			= "on_get_devices";			/**< key 遍历设备 */
//{"cmd_info":{"type" : 3}, "cmd_type" : "on_get_devices"}
static const char *kNRTCCmdStartDevice			= "on_start_device";		/**< key 开启设备 */
//{"cmd_info":{"type" : 3, "width": 640, "height":480, "path" : "\\\\?\\root#image#0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global"}, "cmd_type" : "on_start_device"}
static const char *kNRTCCmdStopDevice			= "on_stop_device";			/**< key 关闭设备 */
//{"cmd_info":{"type" : 3}, "cmd_type" : "on_stop_device"}

static const char *kNRTCCmdStartChat			= "on_start_chat";			/**< key 开启通话 */
//{"cmd_info":{...}, "cmd_type" : "on_start_chat", "session_id":123 }
static const char *kNRTCCmdStopChat				= "on_stop_chat";			/**< key 结束通话 */
//{"cmd_type" : "on_stop_chat" }

//key notify---------------------------------------------
static const char *kNRTCCmdDeviceList			= "device_list_notify";		/**< key 设备状态通知 */
//{"cmd_info":
//	{"devices":[
//		{"name":"ManyCam Virtual Webcam", "path" : "\\\\?\\root#image#0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global"},
//		{ "name":"USB2.0 PC CAMERA", "path" : "\\\\?\\usb#vid_1908&pid_2310&mi_00#6&36289d9b&1&0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global" },
//		{ "name":"YY浼翠荆", "path" : "[virtual device]YY浼翠荆" }],
//	"type" : 3},
//"cmd_type" : "device_list_notify"}
static const char *kNRTCCmdDeviceStatus			= "device_status_notify";	/**< key 设备状态通知 */
//{"cmd_info":{"path":"ManyCam Virtual Webcam", "status" : 8, "type" : 3}, "cmd_type" : "device_status_notify"}
static const char *kNRTCCmdSessionNotify		= "session_notify";			/**< key 通话过程中的状态通知 */
//{"cmd_info":{...}, "cmd_type" : "session_notify", "session_id":123 }
/*成功连接{ "login":{"video_record_file":"84849-6203579135172813608.mp4", "record_file" : "84849-6203579135172813608.aac", "cid" : 6203579135172813608 } } \n
* 	退出通知{ "logout":{"trafficstat_rx":134634, "trafficstat_tx" : 164645 } } \n
* 	错误通知{ "error":{"status":408, "type" : 1 } } \n
*		成员进入{ "user_joined":{"id":84834, "port":40001} } \n
*		成员退出{ "user_left":{"id":84834, "status" : 0} } \n
*		网络状态{ "net":{"id":84834, "status" : 1} } \n
*		成员通知{ "control_notify":{ "camera": true, "mute" : true, "mode" : 2, "record" : true } } \n
*		MP4开始{ "mp4_start":{ "mp4_file": "d:\\test.mp4", "time" : 14496477000000 } } \n
*		MP4结束{ "mp4_close":{ "mp4_file": "d:\\test.mp4", "time" : 120000, "status" : 0 } } \n
*		实时状态{ "static_info":{ "video": {"fps":20, "KBps" : 200, "width" : 1280, "height" : 720}, "audio" : {"fps":17, "KBps" : 3}} } \n
*		音量状态{ "audio_volume":{ "self": {"status":600}, "receiver" : [{"id":123, "status" : 1000}, { "id":456, "status" : 222 }] } } \n
*/
```
