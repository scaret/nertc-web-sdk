/** @file nrtc_init.h
  * @brief nrtc提供的音视频初始化和清理接口，需要用户外部自行调用OleInitialize和OleUninitialize
  * @copyright (c) 2015-2016, NetEase Inc. All rights reserved
  * @author gq
  * @date 2015/4/30
  */

#ifndef NRTC_API_INIT_H_
#define NRTC_API_INIT_H_

#include "nrtc_sdk_dll.h"
#include "nrtc_init_def.h"

#ifdef __cplusplus
extern"C"
{
#endif

/** @fn bool nrtc_init(const char *app_key, const char *log_dir, bool pro_log_out, const char *json_extension);
  * NRTC 音视频初始化
  * @param[in] app_key 用户注册云信的app_key
  * @param[in] log_dir 日志输出的路径
  * @param[in] pro_log_out 日志输出等级 true: 详细日志， false: 一般日志
  * @param[in] json_extension 无效的扩展字段
  * @return bool 返回值true: 成功， false: 失败
  */
NRTC_SDK_DLL_API bool nrtc_init(const char *app_key, const char *log_dir, bool pro_log_out, const char *json_extension);

/** @fn void nrtc_cleanup(const char *json_extension)
  * NRTC 清理
  * @param[in] json_extension json扩展参数（备用，目前不需要）
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_cleanup(const char *json_extension);

/** @fn void nrtc_version(char *version)
  * NRTC 获取版本信息
  * @param[out] version 版本信息，需要长度为64；
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_version(char *version);

/** @fn void nrtc_socks5_proxy(const char *socks5_host, unsigned short port, const char *username, const char *password)
  * NRTC 设置socks5代理
  * @param[out] socks5_host 地址，如果空则为不使用代理，默认不使用
  * @param[out] port 端口
  * @param[out] username 账号
  * @param[out] password 密码
  * @return void 无返回值
  */
NRTC_SDK_DLL_API void nrtc_socks5_proxy(const char *socks5_host, unsigned short port, const char *username, const char *password);

/** @fn unsigned __int64 nrtc_net_detect(const char *json_extension, nrtc_net_detect_cb_func cb, const void *user_data)
  * 网络探测接口
  * @param[in] json_extension json扩展参数（备用，目前不需要）
  * @param[in] cb 操作结果的回调函数
  * @param[in] user_data APP的自定义用户数据，SDK只负责传回给回调函数cb，不做任何处理！
  * @return unsigned __int64 探测任务id
  * @note 错误码	200:成功
  *				0:流程错误
  *				400:非法请求格式
  *				417:请求数据不对
  *				606:ip为内网ip
  *				607:频率超限
  *				20001:探测类型错误
  *				20002:ip错误
  *				20003:sock错误
  */
NRTC_SDK_DLL_API unsigned __int64 nrtc_net_detect(const char *json_extension, nrtc_net_detect_cb_func cb, const void *user_data);


#ifdef __cplusplus
};
#endif
#endif //NRTC_API_INIT_H_