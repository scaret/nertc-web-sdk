http://doc.hz.netease.com/pages/viewpage.action?pageId=43558007

服务器通过 6-3 下发SDK日志上传通知, SDK 收到这条通知之后通知 PC 来上传日志, PC 上传日志后会将 url 通知给 SDK, 然后 SDK 调用 6-4 将地址告诉给服务器

```c++
static const char *kNRTCCmdLog					= "on_log";					/**< key 打印日志 */
//{"cmd_info":{"type" : 3, "content" : "xxxx" }, "cmd_type" : "on_log"} // "type"为日志等级	LV_ERR = 0,LV_WAR = 1,LV_APP = 2,LV_PRO = 3
static const char *kNRTCCmdUploadLog			= "on_upload_log";			/**< key 上传日志 */
//{"cmd_info":{"nos_bucket" : "xxxx", "nos_object" : "xxxx", "nos_header_token" : "xxxx" }, "cmd_type" : "on_upload_log"}
static const char *kNRTCCmdUploagLogNotify		= "upload_log_notify";		/**< key 上传结果 */
//{"cmd_info":{"code":200, "url":"xxx" }, "cmd_type" : "upload_log_notify"}//code是上传结果，如果200是成功，url返回成功后得到下载地址
```
