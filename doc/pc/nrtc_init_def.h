/** @file nrtc_init_def.h
  * @brief NRTC提供的全局接口定义，
  * @copyright (c) 2015-2016, NetEase Inc. All rights reserved
  * @author gq
  * @date 2016/12/29
  */

#ifndef NRTC_API_INIT_DEF_H_
#define NRTC_API_INIT_DEF_H_

#ifdef __cplusplus
extern"C"
{
#endif
	
/** @name 网络探测 内容Json key for nrtc_net_detect
  * @{
  */
static const char *kNRTCAppKey				= "app_key";		/**< string 用户的app key */
static const char *kNRTCNetDetectTimeLimit	= "time";			/**< int32 毫秒级的探测时长限制 */
/** @}*/ //网络探测 内容Json key

/** @name 网络探测回调 内容Json key for nrtc_net_detect_cb_func
  * @{
  */
static const char *kNRTCNetDetectTaskId		= "task_id";		/**< uint64 任务id */
static const char *kNRTCNetDetectLoss		= "loss";			/**< int 丢包率百分比 */
static const char *kNRTCNetDetectRttmax		= "rttmax";			/**< int rtt 最大值 */
static const char *kNRTCNetDetectRttmin		= "rttmin";			/**< int rtt 最小值 */
static const char *kNRTCNetDetectRttavg		= "rttavg";			/**< int rtt 平均值 */
static const char *kNRTCNetDetectRttmdev	= "rttmdev";		/**< int rtt 偏差值 mdev */
static const char *kNRTCNetDetectDetail		= "detailinfo";		/**< string 扩展信息 */
/** @}*/ //网络探测回调 内容Json key


/** @typedef void (*nrtc_net_detect_cb_func)(int rescode, const char *json_extension, const void *user_data)
 * 网络探测回调
 * @param[out] rescode
 * @param[out] json_extension	json数据
 * @param[out] user_data APP的自定义用户数据，SDK只负责传回给回调函数，不做任何处理！
 * @return void 无返回值
 */
typedef void(*nrtc_net_detect_cb_func)(int rescode, const char *json_extension, const void *user_data);


#ifdef __cplusplus
};
#endif //__cplusplus
#endif //NRTC_API_INIT_DEF_H_