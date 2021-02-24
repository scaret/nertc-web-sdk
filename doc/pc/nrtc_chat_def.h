/** @file nrtc_chat_def.h
  * @brief NRTC提供的音视频接口定义，
  * @copyright (c) 2015-2016, NetEase Inc. All rights reserved
  * @author gq
  * @date 2015/5/5
  */

#ifndef NRTC_API_CHAT_DEF_H_
#define NRTC_API_CHAT_DEF_H_

#ifdef __cplusplus
extern"C"
{
#endif

/** @enum NRTCChatMode 音视频通话类型 */
enum NRTCChatMode{
	kNRTCChatModeAudio				= 1,		/**< 音频 */
	kNRTCChatModeVideo				= 2,		/**< 视频 */
};

/** @enum NRTCChatVideoQuality 视频通话分辨率 */
enum NRTCChatVideoQuality{
	kNRTCChatVideoQualityNormal			= 0,		/**< 视频默认分辨率 480x320*/
	kNRTCChatVideoQualityLow			= 1,		/**< 视频低分辨率 176x144*/
	kNRTCChatVideoQualityMedium			= 2,		/**< 视频中分辨率 352x288*/
	kNRTCChatVideoQualityHigh			= 3,		/**< 视频高分辨率 480x320*/
	kNRTCChatVideoQuality480p			= 4,		/**< 视频480p分辨率 640x480*/
	kNRTCChatVideoQuality720p			= 5,		/**< 用于桌面分享级别的分辨率1280x720，需要使用高清摄像头并指定对应的分辨率，或者自定义通道传输 */
	kNRTCChatVideoQuality540p			= 6,		/**< 介于720P与480P之间的类型，默认 960*540 */
};

/** @enum NRTCChatVideoFrameRate 视频通话帧率，实际帧率因画面采集频率和机器性能限制可能达不到期望值 */
enum NRTCChatVideoFrameRate{
	kNRTCChatVideoFrameRateNormal	= 0,		/**< 视频通话帧率默认值,最大取每秒15帧 */
	kNRTCChatVideoFrameRate5		= 1,		/**< 视频通话帧率 最大取每秒5帧 */
	kNRTCChatVideoFrameRate10		= 2,		/**< 视频通话帧率 最大取每秒10帧 */
	kNRTCChatVideoFrameRate15		= 3,		/**< 视频通话帧率 最大取每秒15帧 */
	kNRTCChatVideoFrameRate20		= 4,		/**< 视频通话帧率 最大取每秒20帧 */
	kNRTCChatVideoFrameRate25		= 5,		/**< 视频通话帧率 最大取每秒25帧 */
};

/** @enum NRTCChatUserLeftType 成员退出类型 */
enum NRTCChatUserLeftType{
    kNRTCChatUserLeftTimeout		= -1,		/**< 成员超时掉线 */
	kNRTCChatUserLeftNormal			= 0,		/**< 成员离开 */
};

/** @enum NRTCChatNetStatus 网络状态类型 */
enum NRTCChatNetStatus{
    kNRTCChatNetStatusVeryGood		= 0,		/**< 网络状态很好 */
    kNRTCChatNetStatusGood			= 1,		/**< 网络状态较好 */
    kNRTCChatNetStatusPoor			= 2,		/**< 网络状态较差 */
	kNRTCChatNetStatusBad			= 3,		/**< 网络状态很差 */
	kNRTCChatNetStatusVeryBad		= 4,		/**< 网络状态极差，考虑是否关闭视频 */
};

/** @enum NRTCChatMp4RecordCode mp4录制状态 */
enum NRTCChatMp4RecordCode{
	kNRTCChatMp4RecordClose				= 0,		/**< MP4结束 */
	kNRTCChatMp4RecordVideoSizeError	= 1,		/**< MP4结束，视频画面大小变化 */
	kNRTCChatMp4RecordOutDiskSpace		= 2,		/**< MP4结束，磁盘空间不足 */
	kNRTCChatMp4RecordThreadBusy		= 3,		/**< MP4结束，录制线程繁忙 */
	kNRTCChatMp4RecordCreate			= 200,		/**< MP4文件创建 */
	kNRTCChatMp4RecordExsit				= 400,		/**< MP4文件已经存在 */
	kNRTCChatMp4RecordCreateError		= 403,		/**< MP4文件创建失败 */
	kNRTCChatMp4RecordInvalid			= 404,		/**< 通话不存在 */
};

/** @enum NRTCChatAudioRecordCode 音频录制状态 */
enum NRTCChatAudioRecordCode{
	kNRTCChatAudioRecordClose			= 0,		/**< 录制正常结束 */
	kNRTCChatAudioRecordOutDiskSpace	= 2,		/**< 录制结束，磁盘空间不足 */
	kNRTCChatAudioRecordCreate			= 200,		/**< 文件创建成功 */
	kNRTCChatAudioRecordExsit			= 400,		/**< 已经存在 */
	kNRTCChatAudioRecordCreateError		= 403,		/**< 文件创建失败 */
	kNRTCChatAudioRecordInvalid			= 404,		/**< 通话不存在 */
};

/** @enum NRTCChatConnectEventType 音视频服务器连接状态类型 */
enum NRTCChatConnectEventType{
	kNRTCChatConnectEventReserve	= 1,		/**< 获取服务器错误 NRTCChatReserveErrorCode */
	kNRTCChatConnectEventJoin		= 2,		/**< 连接服务器错误 NRTCChatJoinErrorCode */
	kNRTCChatConnectEventLocal		= 3,		/**< 本地错误 NRTCChatLocalErrorCode */
};

/** @enum NRTCChatReserveErrorCode 获取服务器错误 （正常请求时不会有此类错误返回） */
enum NRTCChatReserveErrorCode{
	kNRTCChatReserveDataError		= 0,		/**< 数据错误 */
	kNRTCChatReserveTimeOut			= 101,		/**< 请求超时 */
	kNRTCChatReserveErrorParam		= 414,		/**< 服务器请求参数错误 */
	kNRTCChatReserveMoreThanTwoUser = 600,		/**< 只支持两个用户, 有第三个人试图使用相同的频道名分配频道 */
	kNRTCChatReserveServerFail		= 601,		/**< 分配频道服务器出错 */
};

/** @enum NRTCChatJoinErrorCode 连接服务器错误 */
enum NRTCChatJoinErrorCode{
	kNRTCChatJoinTimeout			= 101,		/**< 超时 */
	kNRTCChatJoinMeetingModeError	= 102,		/**< 会议模式错误 */
	kNRTCChatJoinRtmpModeError		= 103,		/**< 非rtmp用户加入rtmp频道 */
	kNRTCChatJoinRtmpNodesError		= 104,		/**< 超过频道最多rtmp人数限制 */
	kNRTCChatJoinRtmpHostError		= 105,		/**< 已经存在一个主播 */
	kNRTCChatJoinRtmpCreateError	= 106,		/**< 需要旁路直播, 但频道创建者非主播 */
	kNRTCChatJoinSuccess			= 200,		/**< 连接成功 */
	kNRTCChatJoinInvalidParam		= 400,		/**< 错误参数 */
	kNRTCChatJoinDesKey				= 401,		/**< 密码加密错误 */
	kNRTCChatJoinInvalidRequst		= 417,		/**< 错误请求 */
	kNRTCChatJoinServerUnknown		= 500,		/**< 服务器内部错误 */
	kNRTCChatJoinChannelBusy		= 9104,		/**< 通道繁忙 */
};

/** @enum NRTCChatLocalErrorCode 本地错误  */
enum NRTCChatLocalErrorCode{
	kNRTCChatLocalChannelStartFail		= 11000,	/**< 通道发起失败 */
	kNRTCChatLocalChannelDisconnected	= 11001,	/**< 断开连接 */
	kNRTCChatLocalVersionSelfLow		= 11002,	/**< 本人SDK版本太低不兼容 */
	kNRTCChatLocalVersionRemoteLow		= 11003,	/**< 对方SDK版本太低不兼容 */
	kNRTCChatLocalInvalid				= 11403,	/**< 无效的操作 */
};

/** @enum NRTCChatVideoSplitMode 主播设置的直播分屏模式  */
enum NRTCChatVideoSplitMode{
	kNRTCSplitBottomHorFloating					= 0,			/**< 底部横排浮窗 */
	kNRTCSplitTopHorFloating					= 1,			/**< 顶部横排浮窗 */
	kNRTCSplitLatticeTile						= 2,			/**< 平铺 */
	kNRTCSplitLatticeCuttingTile				= 3,			/**< 裁剪平铺 */
	kNRTCSplitCustomLayout						= 4,			/**< 自定义布局 */
	kNRTCSplitAudioLayout						= 5,			/**< 纯音频布局 */
}; 

/** @enum NRTCChatVideoFrameScaleType 视频画面长宽比，裁剪时不改变横竖屏，如4：3，代表宽高横屏4：3或者竖屏3：4  */
enum NRTCChatVideoFrameScaleType{
	kNRTCChatVideoFrameScaleNone				= 0,			/**< 默认，不裁剪 */
	kNRTCChatVideoFrameScale1x1					= 1,			/**< 裁剪成1：1的形状 */
	kNRTCChatVideoFrameScale4x3					= 2,			/**< 裁剪成4：3的形状，如果是 */
	kNRTCChatVideoFrameScale16x9				= 3,			/**< 裁剪成16：9的形状 */
}; 

/** @enum NRTCChatVideoEncodeMode 视频编码策略  */
enum NRTCChatVideoEncodeMode
{
	kNRTCChatVEModeNormal					= 0,		/**< 默认值，清晰优先 */
	kNRTCChatVEModeFramerate				= 1,		/**< 流畅优先 */
	kNRTCChatVEModeQuality					= 2,		/**< 清晰优先 */
};

/** @name json extension params for nrtc_chat_join_channel
  * 开始通话参数,默认为空或0，可以选填
  * @{
  */
static const char *kNRTCChatCustomVideo		= "custom_video";	/**< int 是否使用自定义视频数据 >0表示是 */
static const char *kNRTCChatCustomAudio		= "custom_audio";	/**< int 是否使用自定义音频数据 >0表示是 */	
static const char *kNRTCChatMaxVideoRate	= "max_video_rate";	/**< int 视频发送编码码率上限 >=100000 <=5000000有效 */	
static const char *kNRTCChatRecord			= "record";			/**< int 是否需要录制音频数据 >0表示是 （需要服务器配置支持，本地录制直接调用接口函数） */
static const char *kNRTCChatVideoRecord		= "video_record";	/**< int 是否需要录制视频数据 >0表示是 （需要服务器配置支持，本地录制直接调用接口函数）*/
static const char *kNRTCChatVideoQuality	= "video_quality";	/**< int 视频聊天分辨率选择 NRTCChatVideoQuality */
static const char *kNRTCChatVideoFrameRate	= "frame_rate";		/**< int 视频画面帧率 NRTCChatVideoFrameRate */
static const char *kNRTCChatAudioHighRate	= "high_rate";		/**< int 是否使用语音高清模式 >0表示是（默认关闭）2.7.0 之前的版本无法加入已经开启高清语音的多人会议 */
static const char *kNRTCChatMeetingMode		= "meeting_mode";	/**< int 是否使用多人模式 >0表示是 */
static const char *kNRTCChatRtmpUrl			= "rtmp_url";		/**< string 直播推流地址(加入多人时有效)，非空代表主播旁路直播， kNRTCChatBypassRtmp决定是否开始推流 */
static const char *kNRTCChatBypassRtmp		= "bypass_rtmp";	/**< int 是否旁路推流（如果rtmpurl为空是连麦观众，非空是主播的推流控制）， >0表示是 */
static const char *kNRTCChatRtmpRecord		= "rtmp_record";	/**< int 是否开启服务器对直播推流录制（需要开启服务器能力）， >0表示是 */
static const char *kNRTCChatSplitMode		= "split_mode";		/**< int 主播控制的直播推流时的分屏模式，见NRTCChatVideoSplitMode */
static const char *kNRTCChatCustomLayout	= "custom_layout";	/**< string 自定义布局，当主播选择kNRTCSplitCustomLayout和kNRTCSplitAudioLayout模式时生效 */
static const char *kNRTCChatWebrtc			= "webrtc";			/**< int, 是否支持webrtc互通,1表示是，0表示否。默认否，无需要不要开启 */
static const char *kNRTCChatVEncodeMode		= "v_encode_mode";	/**< int, 使用的视频编码策略NRTCChatVideoEncodeMode， 默认kNRTCChatVEModeNormal */
/** @}*/ //json extension params

/** @name json extension params for nrtc_chat_session_status_cb_func
  * @{
  */
static const char *kNRTCChatLogin				= "login";				/**< key 登录成功 kNRTCChatChannelID kNRTCChatVideoRecordFile kNRTCChatRecordFile */
static const char *kNRTCChatLogout				= "logout";				/**< key 退出 kNRTCChatTrafficStatRX kNRTCChatTrafficStatTX */
static const char *kNRTCChatError				= "error";				/**< key 错误通知 kNRTCChatType(NRTCChatConnectEventType) kNRTCChatStatus */
static const char *kNRTCChatUserJoined			= "user_joined";		/**< key 成员进入 kNRTCChatId */
static const char *kNRTCChatUserLeft			= "user_left";			/**< key 成员离开 kNRTCChatId kNRTCChatStatus(NRTCChatConnectErrorCode) */
static const char *kNRTCChatNetStatus			= "net";				/**< key 网络状态 kNRTCChatId kNRTCChatStatus(NRTCChatNetStatus) */
static const char *kNRTCChatControlNotify		= "control_notify";		/**< key 成员通知状态 kNRTCChatMute kNRTCChatCamera kNRTCChatMode，可缺省通知 */
static const char *kNRTCChatMp4Start			= "mp4_start";			/**< key Mp4写入数据开始 kNRTCChatMp4File kNRTCChatTime，如果非本人带kNRTCChatId */
static const char *kNRTCChatMp4Close			= "mp4_close";			/**< key 结束Mp4录制，返回时长及原因 kNRTCChatStatus(NRTCChatMp4RecordCode) kNRTCChatTime kNRTCChatMp4File，如果非本人带kNRTCChatId */
static const char *kNRTCChatAuRecordStart		= "audio_record_start";	/**< key 音频录制写入数据开始 kNRTCChatFile kNRTCChatTime */
static const char *kNRTCChatAuRecordClose		= "audio_record_close";	/**< key 结束音频录制，返回时长及原因 kNRTCChatStatus(NRTCChatAudioRecordCode) kNRTCChatTime kNRTCChatFile */
static const char *kNRTCChatIds					= "ids";				/**< key 成员id列表 */
static const char *kNRTCChatVideo				= "video";				/**< key 视频 */
static const char *kNRTCChatAudio				= "audio";				/**< key 音频 */
static const char *kNRTCChatStaticInfo			= "static_info";		/**< key 音视频实时状态 */
static const char *kNRTCChatAudioVolume			= "audio_volume";		/**< key 音频实时音量通知，包含发送的音量kNRTCChatSelf和接收音量kNRTCChatReceiver，kNRTCChatStatus的音量值是pcm的平均值最大为int16_max */
static const char *kNRTCChatSelf				= "self";				/**< key 本人信息 */
static const char *kNRTCChatReceiver			= "receiver";			/**< key 接收信息 */
static const char *kNRTCChatStatus				= "status";				/**< int 状态 */
static const char *kNRTCChatType				= "type";				/**< int 类型 */
static const char *kNRTCChatId					= "id";					/**< int64 成员id */
static const char *kNRTCChatChannelID			= "cid";				/**< uint64 channel_id */
static const char *kNRTCChatRecordAddr			= "record_addr";		/**< string 录制地址（服务器开启录制时有效） */
static const char *kNRTCChatRecordFile			= "record_file";		/**< string 服务器音频录制文件名（服务器开启录制时有效） */
static const char *kNRTCChatVideoRecordFile		= "video_record_file";	/**< string 服务器视频录制文件名（服务器开启录制时有效） */
static const char *kNRTCChatTrafficStatRX		= "trafficstat_rx";		/**< uint64 下行流量 */
static const char *kNRTCChatTrafficStatTX		= "trafficstat_tx";		/**< uint64 上行流量 */
static const char *kNRTCChatMute				= "mute";				/**< bool 成员通知静音状态 */
static const char *kNRTCChatCamera				= "camera";				/**< bool 成员通知摄像头是否工作 */
static const char *kNRTCChatMode				= "mode";				/**< int 成员通知通话模式（NRTCChatMode） */
static const char *kNRTCChatRecordMode			= "record"; 			/**< bool 录制状态 */
static const char *kNRTCChatTime				= "time";				/**< int64 时间 毫秒级 */
static const char *kNRTCChatMp4File				= "mp4_file";			/**< string mp4录制地址 */
static const char *kNRTCChatFile				= "file";				/**< string 文件地址 */
static const char *kNRTCChatFPS					= "fps";				/**< int 每秒帧率或者每秒发包数 */
static const char *kNRTCChatKBPS				= "KBps";				/**< int 每秒流量，单位为“千字节” */
/** @}*/ //json extension params

/** @typedef void(*nrtc_chat_session_status_cb_func)(const char *json, const void *user_data)
  * NRTC 通话状态返回接口\n
  * json for example: \n
  * 	成功连接	{"login":{"video_record_file":"84849-6203579135172813608.mp4","record_file":"84849-6203579135172813608.aac","cid":6203579135172813608 }} \n
  * 	退出通知	{"logout":{"trafficstat_rx":134634, "trafficstat_tx":164645 }} \n
  * 	错误通知	{"error":{"status":408, "type":1 }} \n
  *		成员进入 	{"user_joined":{"id":84834 }} \n
  *		成员退出 	{"user_left":{"id":84834,"status":0}} \n
  *		网络状态 	{"net":{"id":84834,"status":1}} \n
  *		成员通知 	{"control_notify":{ "camera": true, "mute": true, "mode": 2, "record": true }} \n
  *		MP4开始 	{"mp4_start":{ "mp4_file": "d:\\test.mp4", "time": 14496477000000, "id":84834 }} \n
  *		MP4结束 	{"mp4_close":{ "mp4_file": "d:\\test.mp4", "time": 120000, "status": 0, "id":84834 }} \n
  *		音频录制开始	{"audio_record_start":{ "file": "d:\\test.aac", "time": 14496477000000 }} \n
  *		音频录制结束	{"audio_record_close":{ "file": "d:\\test.aac", "time": 120000, "status": 0 }} \n
  *		实时状态 	{"static_info":{ "video": {"fps":20, "KBps":200, "width":1280,"height":720}, "audio": {"fps":17, "KBps":3}}} \n
  *		音量状态 	{"audio_volume":{ "self": {"status":600}, "receiver": [{"id":123,"status":1000},{"id":456,"status":222}] }} \n
  * @param[out] json 返回的json，见上面示例
  * @param[out] user_data APP的自定义用户数据，SDK只负责传回给回调函数，不做任何处理！
  * @return void 无返回值
  */
typedef void (*nrtc_chat_session_status_cb_func)(const char *json, const void *user_data);

/** @typedef void (*nrtc_chat_mp4_record_opt_cb_func)(bool ret, int code, const char *file, __int64 time, const char *json_extension, const void *user_data)
  * NRTC MP4操作回调，实际的开始录制和结束都会在nrtc_chat_session_status_cb_func中返回
  * @param[out] ret 结果代码，true表示成功
  * @param[out] code 对应NRTCChatMp4RecordCode，用于获得失败时的错误原因
  * @param[out] file 文件路径
  * @param[out] time 录制结束时有效，对应毫秒级的录制时长
  * @param[out] json_extension Json string 无效扩展字段
  * @param[out] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
typedef void (*nrtc_chat_mp4_record_opt_cb_func)(bool ret, int code, const char *file, __int64 time, const char *json_extension, const void *user_data);

/** @typedef void (*nrtc_chat_audio_record_opt_cb_func)(bool ret, int code, const char *file, __int64 time, const char *json_extension, const void *user_data)
  * NRTC 音频录制操作回调，实际的开始录制和结束都会在nrtc_chat_session_status_cb_func中返回
  * @param[out] ret 结果代码，true表示成功
  * @param[out] code 对应NRTCChatAudioRecordCode，用于获得失败时的错误原因
  * @param[out] file 文件路径
  * @param[out] time 录制结束时有效，对应毫秒级的录制时长
  * @param[out] json_extension Json string 无效扩展字段
  * @param[out] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
typedef void (*nrtc_chat_audio_record_opt_cb_func)(bool ret, int code, const char *file, __int64 time, const char *json_extension, const void *user_data);

/** @typedef void (*nrtc_chat_opt_cb_func)(bool ret, int code, const char *json_extension, const void *user_data)
  * NRTC 操作回调，通用的操作回调接口
  * @param[out] ret 结果代码，true表示成功
  * @param[out] code 对应NRTCChatLocalErrorCode，用于获得失败时的错误原因，成功时返回0
  * @param[out] json_extension Json string 扩展字段
  * @param[out] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
typedef void (*nrtc_chat_opt_cb_func)(bool ret, int code, const char *json_extension, const void *user_data);


#ifdef __cplusplus
};
#endif //__cplusplus
#endif //NRTC_API_CHAT_DEF_H_