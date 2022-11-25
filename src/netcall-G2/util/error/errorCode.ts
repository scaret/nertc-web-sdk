/**
 * 错误码定义
 *
 * @module ErrorCode
 */
const ErrorCode = {
  /*
   * 无效参数，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // INVALID_PARAMETER: 41000,
  /*
   * 浏览器不支持
   * 4.6.25 之后弃用
   */
  // NOT_SUPPORT: 41001,
  /*
   * 没有找到服务器地址
   * 4.6.25 之后弃用
   */
  // NO_SERVER_ADDRESS: 41002,
  /*
   * 服务器地址连接失败
   * 4.6.25 之后弃用
   */
  // SOCKET_ERROR: 41003,
  /*
   * 找不到信令
   * 4.6.25 之后弃用
   */
  // NO_SIGNALLING: 41004,
  /*
   * 找不到 statsReport 数据
   * 4.6.25 之后弃用
   */
  // NO_STATS: 41005,
  /*
   * 找不到 mediasoup 数据
   * 4.6.25 之后弃用
   */
  // NO_MEDIASERVER: 41006,
  /*
   * 找不到 meetings 数据
   * 4.6.25 之后弃用
   */
  // NO_MEETINGS: 41007,
  /*
   * 找不到 localStream 数据
   * 4.6.25 之后弃用
   */
  // NO_LOCALSTREAM: 41008,
  /*
   * 非法操作，可以通过 console 日志查看原因,一般是状态不对
   * 4.6.25 之后弃用
   */
  // INVALID_OPERATION: 41009,
  /*
   * 重复进房
   * 4.6.25 之后弃用
   */
  // REPEAT_JOIN: 41010,
  /*
   * 本地用户不再频道中
   * 4.6.25 之后弃用
   */
  // USER_NOT_IN_CHANNEL: 41011,
  /*
   * 当前不支持，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // NOT_SUPPORTED_YET: 41012,
  /*
   * 未知类型，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // UNKNOWN_TYPE: 41013,
  /*
   * 无权限，禁止操作
   * 4.6.25 之后弃用
   */
  // NOT_ALLOWED: 41014,
  /*
   * 状态错误，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // STATE_ERROR: 41015,
  /*
   * 找不到文件，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // NO_FILE: 41016,
  /*
   * 解码失败
   * 4.6.25 之后弃用
   */
  // DECODE_FAILED: 41017,
  /*
   * 添加推流任务失败
   * 4.6.25 之后弃用
   */
  // ADD_TASK_FAILED: 41018,
  /*
   * 删除推流任务请求失败
   * 4.6.25 之后弃用
   */
  // DELETE_TASK_FAILED: 41019,
  /*
   * 更新推流任务失败
   * 4.6.25 之后弃用
   */
  // UPDATE_TASKS_FAILED: 41020,
  /*
   * 录制接口出错
   * 4.6.25 之后弃用
   */
  // RECORD_API_ERROR: 41021,
  /*
   * 没有进行录制
   * 4.6.25 之后弃用
   */
  // NO_RECORDER_FOUND: 41022,
  /*
   * 未定义，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // NOT_DEFINED: 41023,
  /*
   * 不可用，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // NOT_AVAILABLE: 41024,
  /*
   * 没有 mediaHelper 数据
   * 4.6.25 之后弃用
   */
  // NO_MEDIAHELPER: 41025,
  /*
   * 没有开启播放
   * 4.6.25 之后弃用
   */
  // NO_PLAY: 41026,
  /*
   * 没有开启录制
   * 4.6.25 之后弃用
   */
  // NO_RECORD: 41027,
  /*
   * 未获取，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // NOT_FOUND: 41028,
  /*
   * appData 错误，可以通过 console 日志查看原因
   * 4.6.25 之后弃用
   */
  // APPDATA_ERROR: 41029,

  /*
   * 自动播放受限
   *
   */
  AUTO_PLAY_NOT_ALLOWED: 41030,
  /*
   * 没有媒体
   * 4.6.25 之后弃用
   */
  // NO_MEDIA: 41031,

  /*
   * 被服务器禁言
   * 4.6.25 之后弃用
   */
  // MEDIA_OPEN_BANNED_BY_SERVER: 41032,

  /*
   * 云代理失败
   * 4.6.25 之后弃用
   */
  // PROXY_SERVER_ERROR: 41033,

  /*
   * 未知错误
   * 4.6.25 之后弃用
   */
  UNKNOWN: 99999,

  // *********************  通用错误码(ErrorCode 范围：10000 - 10100)

  /*
   * 无效参数，可通过 console 日志查看具体原因
   *
   */
  INVALID_PARAMETER_ERROR: 10000,

  /*
   * 浏览器不支持，可通过 console 日志产看具体原因
   *
   */
  NOT_SUPPORT_ERROR: 10001,

  /*
   * 网络环境异常，可通过 console 日志产看具体原因
   *
   */
  NETWORK_ERROR: 10002,

  /*
   * 网络请求异常，可通过 console 日志产看具体原因
   *
   */
  NETWORK_REQUEST_ERROR: 10003,

  /*
   * 云信服务异常，可通过 console 日志产看具体原因
   *
   */
  SERVER_ERROR: 10004,

  /*
   * 云信媒体服务异常，可通过 console 日志产看具体原因
   *
   */
  MEDIA_SERVER_ERROR: 10005,
  /*
   * 云信信令异常，可通过 console 日志产看具体原因
   *
   */
  SIGNALLING_ERROR: 10006,

  /*
   * 云信信令服务异常，可通过 console 日志产看具体原因
   *
   */
  SIGNALLING_SERVER_ERROR: 10007,

  /*
   * 接口调用顺序异常，可通过 console 日志产看具体原因
   *
   */
  API_CALL_SEQUENCE_ERROR: 10008,

  /*
   * 操作异常，可通过 console 日志产看具体原因
   *
   */
  INVALID_OPERATION_ERROR: 10009,

  /*
   * localStream异常，可通过 console 日志产看具体原因
   *
   */
  LOCALSTREAM_ERROR: 10010,

  /*
   * 未找到 localStream，可通过 console 日志产看具体原因
   *
   */
  LOCALSTREAM_NOT_FOUND_ERROR: 10011,

  /*
   * 未知类型异常，可通过 console 日志产看具体原因
   *
   */
  UNKNOWN_TYPE_ERROR: 10012,

  /*
   * 未定义异常，可通过 console 日志产看具体原因
   *
   */
  UNDEFINED_ERROR: 10013,

  /*
   * 不可用异常，可通过 console 日志产看具体原因
   *
   */
  UNAVAILABLE_ERROR: 10014,

  /*
   * 被服务器禁言
   *
   */
  BANNED_BY_SERVER: 10015,

  /*
   * socket异常，可通过 console 日志产看具体原因
   *
   */
  SOCKET_INIT_ERROR: 10016,

  // *********************  房间相关错误码(ErrorCode 范围：10101 - 10200)

  /*
   * 进房错误
   *
   */
  JOIN_FAILED: 10100,
  /*
   * 重复进房错误
   *
   */
  REPEAT_JOIN_ERROR: 10101,
  /*
   * 会控异常
   *
   */
  MEETING_ERROR: 10102,

  /*
   * 房间服务相关错误
   *
   */
  ROOM_SERVER_ERROR: 10103,

  /*
   * 用户不在频道中错误
   *
   */
  USER_NOT_IN_CHANNEL_ERROR: 10104,

  /*
   * 事件上报错误
   *
   */
  EVENT_UPLOAD_ERROR: 10105,

  /*
   * 未找到异常
   *
   */
  NOT_FOUND_ERROR: 10106,

  /*
   * SDP异常
   *
   */
  SDP_ERROR: 10107,

  // *********************  推流/拉流相关错误码(ErrorCode 范围：10201 - 10400)

  /*
   * 添加推流任务失败
   *
   */
  ADD_TASK_FAILED_ERROR: 10201,
  /*
   * 删除推流任务失败
   *
   */
  DELETE_TASK_FAILED_ERROR: 10202,
  /*
   * 更新推流任务失败
   *
   */
  UPDATE_TASKS_FAILED_ERROR: 10203,
  /*
   * 推流任务异常
   *
   */
  TASK_ERROR: 10204,
  /*
   * 未开始播放异常
   *
   */
  PLAY_NOT_START_ERROR: 10205,

  /*
   * appData异常
   *
   */
  APPDATA_OVERRIDE_ERROR: 10206,

  // *********************  功能模块相关错误码(ErrorCode 范围：10401 - 10600)
  /*
   * WebGL 不支持
   */
  WEBGL_NOT_SUPPORT_ERROR: 10401,
  /*
   * WebGL LoseContext
   */
  WEBGL_LOSE_CONTEXT_ERROR: 10402,
  /*
   * WEBGL Restored FAIL
   */
  WEBGL_RESTORED_FAILD_ERROR: 10403,
  /*
   * 基础美颜资源加载失败
   */
  BASIC_BEAUTY_RES_ERROR: 10404,
  /*
   * 高级美颜资源加载失败
   */
  ADV_BEAUTY_RES_ERROR: 10405,
  /*
   * 插件加载错误
   */
  PLUGIN_LOADED_ERROR: 10406,
  /*
   * 插件执行错误
   */
  PLUGIN_ERROR: 10407,
  /*
   * 插件注册错误
   */
  PLUGIN_REGISTER_ERROR: 10408,
  /*
   * 音频处理异常
   *
   */
  FORMAT_AUDIO_ERROR: 10420,

  /*
   * 伴音相关文件加载状态异常
   *
   */
  AUDIO_MIX_FILE_ERROR: 10421,
  /*
   * 伴音相关操作状态异常
   *
   */
  AUDIO_MIX_STATE_ERROR: 10422,
  /*
   * 音效相关操作状态异常
   *
   */
  AUDIO_EFFECT_STATE_ERROR: 10423,
  /*
   * 音效文件缺失
   *
   */
  AUDIO_EFFECT_FILE_LOST_ERROR: 10424,
  /*
   * 伴音解码异常
   *
   */
  AUDIO_MIX_DECODE_FAILED_ERROR: 10425,

  /*
   * 伴音相关异常
   *
   */
  AUDIO_MIXING_ERROR: 10426,
  /*
   * 音效相关异常
   *
   */
  AUDIO_EFFECT_ERROR: 10427,

  /*
   * 国密加密相关异常
   *
   */
  SET_ENCRYPTION_MODE_ERROR: 10440,
  /*
   * 云代理相关异常
   *
   */
  PROXY_ERROR: 10441,
  /*
   * 录制时参数异常相关异常
   *
   */
  RECORDING_ERROR: 10450,

  /*
   * 录制未开始相关异常
   *
   */
  RECORDING_NOT_START_ERROR: 10451,

  /*
   * 水印数额超限相关异常
   *
   */
  WATERMARKS_EXCEEDED_ERROR: 10460,
  /*
   * LBS 请求相关异常
   *
   */
  LBS_REQUEST_ERROR: 10461,
  /*
   * LBS json 解析异常
   *
   */
  LBS_JSON_ERROR: 10462,

  /*
   * 数据上报相关异常
   *
   */
  NO_STATS_ERROR: 10470,

  /*
   * permKey权限控制，不能推流
   */
  NO_PUBLISH_PERMISSSION: 10500,
  /*
   * permKey权限控制，不能拉流
   */
  NO_SUBSCRIBE_PERMISSSION: 10501
}

export default ErrorCode
