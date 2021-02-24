/** @file nrtc_device.h
  * @brief nrtc提供的音视频设备相关接口，使用前请先调用nrtc_init.h中nrtc_init
  * @copyright (c) 2015-2016, NetEase Inc. All rights reserved
  * @author gq
  * @date 2015/4/30
  */

#ifndef NRTC_API_DEVICE_H_
#define NRTC_API_DEVICE_H_

#include "nrtc_sdk_dll.h"
#include "nrtc_device_def.h"

#ifdef __cplusplus
extern"C"
{
#endif

/** @fn void nrtc_dev_enum_device_path(NRTCDeviceType type, const char *json_extension, nrtc_dev_enum_device_path_sync_cb_func cb, const void *user_data) 
  * NRTC DEVICE 遍历设备
  * @param[in] type NRTCDeviceType 见nrtc_device_def.h
  * @param[in] json_extension 无效的扩展字段
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */ 
NRTC_SDK_DLL_API void nrtc_dev_enum_device_path(NRTCDeviceType type, const char *json_extension, nrtc_dev_enum_device_path_sync_cb_func cb, const void *user_data);

/** @fn void nrtc_dev_start_device(NRTCDeviceType type, const char *device_path, unsigned fps, const char *json_extension, nrtc_dev_start_device_cb_func cb, const void *user_data)
  * NRTC DEVICE 启动设备，同一NRTCDeviceType下设备将不重复启动，不同的设备会先关闭前一个设备开启新设备
  * @param[in] type NRTCDeviceType 见nrtc_device_def.h
  * @param[in] device_path 设备路径对应kNRTCDevicePath，如果是kNRTCDeviceTypeAudioHook，对应播放器本地全路径
  * @param[in] fps 摄像头为采样频率（一般取30）,其他NRTCDeviceType无效（麦克风采样频率由底层控制，播放器采样频率也由底层控制）
  * @param[in] json_extension 打开摄像头是允许设置 kNRTCDeviceWidth 和 kNRTCDeviceHeight，并取最接近设置值得画面模式
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */ 
NRTC_SDK_DLL_API void nrtc_dev_start_device(NRTCDeviceType type, const char *device_path, unsigned fps, const char *json_extension, nrtc_dev_start_device_cb_func cb, const void *user_data);

/** @fn void nrtc_dev_end_device(NRTCDeviceType type, const char *json_extension)
  * NRTC DEVICE 结束设备
  * @param[in] type NRTCDeviceType 见nrtc_device_def.h
  * @param[in] json_extension 无效的扩展字段
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_end_device(NRTCDeviceType type, const char *json_extension);

/** @fn void nrtc_dev_add_device_status_cb(NRTCDeviceType type, nrtc_dev_device_status_cb_func cb, const void *user_data)
  * NRTC DEVICE 添加设备监听（摄像头和麦克风，伴音hook） 注意监听设备后底层会定时检查设备情况，在不需要监听后请移除
  * @param[in] type NRTCDeviceType（kNRTCDeviceTypeAudioIn和kNRTCDeviceTypeVideo、kNRTCDeviceTypeAudioHook有效） 见nrtc_device_def.h
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_add_device_status_cb(NRTCDeviceType type, nrtc_dev_device_status_cb_func cb, const void *user_data);

/** @fn void nrtc_dev_remove_device_status_cb(NRTCDeviceType type)
  * NRTC DEVICE 移除设备监听（摄像头和麦克风，伴音hook）
  * @param[in] type NRTCDeviceType（kNRTCDeviceTypeAudioIn和kNRTCDeviceTypeVideo有效） 见nrtc_device_def.h
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_remove_device_status_cb(NRTCDeviceType type);

/** @fn void nrtc_dev_start_extend_camera(const char *id, const char *device_path, unsigned fps, const char *json_extension, nrtc_dev_start_device_cb_func cb, const void *user_data)
  * NRTC DEVICE 启动辅助的摄像头，摄像头数据通过nrtc_dev_set_video_data_cb设置采集回调返回，不直接通过视频通话发送给对方，并且不参与设备监听检测
  * @param[in] id 摄像头标识，用于开关及数据回调时的对应，不能为空。（同一id下设备将不重复启动，如果设备device_path不同会先关闭前一个设备开启新设备）
  * @param[in] device_path 设备路径对应kNRTCDevicePath
  * @param[in] fps 摄像头为采样频率
  * @param[in] json_extension 打开摄像头是允许设置 kNRTCDeviceWidth 和 kNRTCDeviceHeight，并取最接近设置值的画面模式
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_start_extend_camera(const char *id, const char *device_path, unsigned fps, const char *json_extension, nrtc_dev_start_device_cb_func cb, const void *user_data);

/** @fn void nrtc_dev_stop_extend_camera(const char *id, const char *json_extension)
  * NRTC DEVICE 结束辅助摄像头
  * @param[in] id 摄像头标识id，如果为空，则关闭所有辅助摄像头
  * @param[in] json_extension 无效的扩展字段
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_stop_extend_camera(const char *id, const char *json_extension);

/** @fn void nrtc_dev_set_audio_data_cb(bool capture, const char *json_extension, nrtc_dev_audio_data_cb_func cb, const void *user_data)
  * NRTC DEVICE 监听音频数据（可以不监听，通过启动设备kNRTCDeviceTypeAudioOut和kNRTCDeviceTypeAudioOutChat由底层播放）
  * @param[in] capture true 标识监听麦克风采集数据，false 标识监听通话中对方音频数据
  * @param[in] json_extension 扩展Json string：kNRTCDeviceSampleRate（要求返回的音频数据为指定的采样频，缺省为0使用默认采样频）
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_set_audio_data_cb(bool capture, const char *json_extension, nrtc_dev_audio_data_cb_func cb, const void *user_data);

/** @fn void nrtc_dev_set_audio_data_cb_ex(int type, const char *json_extension, nrtc_dev_audio_data_cb_func_ex cb, const void *user_data)
  * NRTC DEVICE 监听音频数据（可以不监听，通过启动设备kNRTCDeviceTypeAudioOut和kNRTCDeviceTypeAudioOutChat由底层播放）
  * @param[in] type 暂时无效，只有监听伴音数据，一旦监听，底层将不再混音（测试逻辑）
  * @param[in] json_extension 暂时无效
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_set_audio_data_cb_ex(int type, const char *json_extension, nrtc_dev_audio_data_cb_func_ex cb, const void *user_data);

/** @fn void nrtc_dev_set_video_data_cb(bool capture, const char *json_extension, nrtc_dev_video_data_cb_func cb, const void *user_data)
  * NRTC DEVICE 监听视频数据
  * @param[in] capture true 标识监听采集数据（包括辅助摄像头数据），false 标识监听通话中对方视频数据
  * @param[in] json_extension 扩展Json string：kNRTCVideoSubType（缺省为kNRTCVideoSubTypeARGB）
  * @param[in] cb 结果回调见nrtc_device_def.h
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_set_video_data_cb(bool capture, const char *json_extension, nrtc_dev_video_data_cb_func cb, const void *user_data);

/** @fn void nrtc_dev_set_audio_volumn(unsigned char volumn, bool capture)
  * NRTC DEVICE 设置音量 默认255,音量均由软件换算得出,设置麦克风音量自动调节后麦克风音量参数无效
  * @param[in] volumn 结果回调见nrtc_device_def.h
  * @param[in] capture true 标识设置麦克风音量，false 标识设置播放音量
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_set_audio_volumn(unsigned char volumn, bool capture);

/** @fn unsigned char nrtc_dev_get_audio_volumn(bool capture)
  * NRTC DEVICE 获取nrtc_dev_set_audio_volumn中设置的音量
  * @param[in] capture true 标识获取麦克风音量，false 标识获取播放音量
  * @return unsigned char 音量值
  */
NRTC_SDK_DLL_API unsigned char nrtc_dev_get_audio_volumn(bool capture);

/** @fn void nrtc_dev_set_audio_input_auto_volumn(bool auto_volumn)
  * NRTC DEVICE 设置麦克风音量自动调节,默认关闭
  * @param[in] auto_volumn true 标识麦克风音量自动调节，false 标识麦克风音量不调节，这时nrtc_dev_set_audio_volumn中麦克风音量参数起效
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_set_audio_input_auto_volumn(bool auto_volumn);

/** @fn bool nrtc_dev_get_audio_input_auto_volumn()
  * NRTC DEVICE 获取是否自动调节麦克风音量
  * @return bool true 标识麦克风音量自动调节，false 标识麦克风音量不调节，这时nrtc_dev_set_audio_volumn中麦克风音量参数起效
  */
NRTC_SDK_DLL_API bool nrtc_dev_get_audio_input_auto_volumn();

/** @fn void nrtc_dev_set_audio_process_info(bool aec, bool ns, bool vid)
  * NRTC DEVICE 设置底层针对麦克风采集数据处理开关接口，默认全开（此接口是全局接口，在sdk初始化后设置一直有效）
  * @param[in] aec true 标识打开回音消除功能，false 标识关闭
  * @param[in] ns true 标识打开降噪功能，false 标识关闭
  * @param[in] vid true 标识打开人言检测功能，false 标识关闭
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_dev_set_audio_process_info(bool aec, bool ns, bool vid);

#ifdef __cplusplus
};
#endif //__cplusplus
#endif //NRTC_API_DEVICE_H_