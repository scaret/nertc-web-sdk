```c++
struct VideoChatInfo
{
	bool yunxin_;
	uint32_t	type_;//通话类型,1:音频;2:视频
	bool meeting_mode_;//多人模式
	//-----nim start yunxin
	uint64_t	my_uid_;
	uint64_t	channel_id_;
	std::string config_;
	std::string dispatch_;
	std::string session_key_;
	//std::vector<std::string>/*std::vector<std::vector<std::string>>*/ turn_server_list_;
	//std::vector<std::string> proxy_server_list_;
	bool p2p_connect_;
	//bool double_tunnel_key_;				//是否需要双通道探测
	//-----nim end
	//-----nrtc start
	std::string channel_name_;
	std::string encrypt_token_;
	//-----nrtc end
	bool custom_video_;
	bool custom_audio_;
	bool audio_record_;
	bool video_record_;
	//直播参数
	bool			support_bypass_rtmp_; //是否支持旁路直播
	bool			rtmp_record_; //是否支持旁路直播
	std::string		bypass_rtmp_url_;			//旁路直播推流地址
	bool			bypass_is_host_;				//旁路直播是否主播
	int				participant_mode_;			//直播互动画面合成模式
	int             app_type_;

	int32_t video_max_rate_;
	int32_t video_quality_;
	int32_t video_frame_rate_;
	bool   high_audio_rate_;

	VideoChatInfo()
	{
		yunxin_ = false;
		type_ = 1;
		meeting_mode_ = false;
		my_uid_ = 0;
		channel_id_ = 0;
		custom_video_ = false;
		custom_audio_ = false;
		video_max_rate_ = 0;
		video_quality_ = 0;
		video_frame_rate_ = 0;
		high_audio_rate_ = false;
		audio_record_ = false;
		video_record_ = false;
		p2p_connect_ = true;
		support_bypass_rtmp_ = false;
		rtmp_record_ = false;
		bypass_is_host_ = false;
		participant_mode_ = 0;
		app_type_ = 0;
	}
};


	Json::Value values;
	if (info.yunxin_)
	{
		values[kNRTCChatChannelID] = info.channel_id_;
		values[kNRTCChatId] = info.my_uid_;
		values[kNRTCChatDispatch] = info.dispatch_;
		values[kNRTCChatP2pConnect] = info.p2p_connect_ ? 1 : 0;
		//for (auto it = info.turn_server_list_.begin(); it != info.turn_server_list_.end(); it++)
		//{
		//	values[kNRTCChatTurnSer].append(*it);
		//}
		////for (auto it=info.sturn_server_list_.begin(); it != info.sturn_server_list_.end(); it++)
		////{
		////	values[kNRTCChatSturnSer].append(*it);
		////}
		//for (auto it = info.proxy_server_list_.begin(); it != info.proxy_server_list_.end(); it++)
		//{
		//	values[kNRTCChatProxySer].append(*it);
		//}
		//for (auto it = info.map_uid_acount_.begin(); it != info.map_uid_acount_.end(); it++)
		//{
		//	Json::Value member;
		//	member[kNRTCDeviceDataUid] = (int64_t)it->first;
		//	member[kNRTCDeviceDataAccount] = it->second;
		//	values[kNRTCUidAccount].append(member);
		//}
	}
	values[kNRTCChatSessionKey] = info.session_key_;
	values[kNRTCChatCustomVideo] = info.custom_video_;
	values[kNRTCChatCustomAudio] = info.custom_audio_;
	values[kNRTCChatRecord] = info.audio_record_ ? 1 : 0;
	values[kNRTCChatVideoRecord] = info.video_record_ ? 1 : 0;
	//if (info.aec_delay_time_ >= 0)
	//{
	//	values[kNRTCChatAecTime] = info.aec_delay_time_;
	//}
	values[kNRTCChatMaxVideoRate] = info.video_max_rate_;
	values[kNRTCChatVideoQuality] = info.video_quality_;
	values[kNRTCChatVideoFrameRate] = info.video_frame_rate_;
	values[kNRTCChatAudioHighRate] = info.high_audio_rate_ ? 1 : 0;
	values[kNRTCChatMeetingMode] = info.meeting_mode_ ? 1 : 0;
	values[kNRTCChatRtmpUrl] = info.bypass_rtmp_url_;
	values[kNRTCChatBypassRtmp] = info.support_bypass_rtmp_ ? 1 : 0;
	values[kNRTCChatRtmpRecord] = info.rtmp_record_ ? 1 : 0;
	values[kNRTCChatSplitMode] = info.participant_mode_;
	if (!info.config_.empty())
	{
		values[kNRTCChatConfig] = info.config_;
	}
	Json::FastWriter fs;
	std::string json = fs.write(values);



static const char *kNRTCChatCustomVideo		= "custom_video";	/**< int 是否使用自定义视频数据 >0表示是 */
static const char *kNRTCChatCustomAudio		= "custom_audio";	/**< int 是否使用自定义音频数据 >0表示是 */
static const char *kNRTCChatMaxVideoRate	= "max_video_rate";	/**< int 视频发送编码码率上限 >=100000 <=1000000有效 */
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
static const char *kNRTCChatTurnSer			= "turn_ser";
static const char *kNRTCChatSturnSer		= "sturn_ser";
static const char *kNRTCChatProxySer		= "proxy_ser";
static const char *kNRTCChatDispatch		= "dispatch";
static const char *kNRTCChatSessionKey		= "session_key";
static const char *kNRTCChatAecTime			= "aec_time";		/**< int 回音消除延迟参数 >=0有效 */
static const char *kNRTCChatConfig			= "config";			/**< string 服务器下发的配置信息 */
static const char *kNRTCChatP2pConnect 		= "p2p_connect";	/**< int 是否p2p直连 >0表示是 */
static const char *kNRTCChatId					= "id";					/**< int64 成员id */
static const char *kNRTCChatChannelID			= "cid";				/**< uint64 channel_id */
static const char *kNRTCChatType				= "type";				/**< int 类型 */
static const char *kNRTCChatSessionId		= "session_id";		/**< uint32 会话id用于start */
```
