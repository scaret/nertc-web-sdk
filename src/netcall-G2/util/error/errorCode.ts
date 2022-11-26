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
   * 描述：通用参数错误
   * 可能原因：参数缺失、格式错误等等。
   * 处理建议：RtcError对象中的message有输出具体的错误内容，也可以在console中查看具体原因
   */
  INVALID_PARAMETER_ERROR: 10000,

  /*
   * 描述：系统环境不支持云信sdk运行
   * 可能原因：浏览器版本过低、或者浏览器不支持、或者没有使用https环境。
   * 处理建议：可以查看console查看具体原因，参考云信sdk支持的系统浏览器环境。
   */
  NOT_SUPPORT_ERROR: 10001,

  /*
   * 描述：网络环境异常，云信服务器彻底连接失败
   * 可能原因：用户网络问题：如防火墙限制、网络连接不文档，或者云信服务器异常。
   * 处理建议：先检查个人网络，如果确认网络没有问题，请稍后重试或者联系云信技术支持。
   */
  NETWORK_ERROR: 10002,

  /*
   * 描述：http请求发生了错误。
   * 可能原因：用户网络问题：如防火墙限制、网络连接不文档，或者云信服务器异常，具体原因可以查看Error对象的message信息。
   * 处理建议：先检查个人网络，如果确认网络没有问题，请稍后重试或者联系云信技术支持；如果是在join()、addTasks()、deleteTasks()、updateTasks()执行时反馈的错误，会影响功能，其他情况下反馈的该错误码对业务功能没有影响
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
   * 描述：接口调用顺序错误。
   * 可能原因：出现这种错误，说明该api接口需要在加入join()之前调用，而当前在加入房间之后调用了。
   * 处理建议：修改api接口的使用顺序，在join()之前调用即可
   */
  API_CALL_SEQUENCE_ERROR: 10008,

  /*
   * 描述：接口调用顺序错误。
   * 可能原因：出现这种错误，说明该api接口需要在加入join()成功之后调用，而当前的接口调用不符合要求，可能是当前没有执行过join()，也可能是join()失败了。
   * 处理建议：修改api接口的使用顺序，在join()成功之后调用即可
   */
  INVALID_OPERATION_ERROR: 10009,

  /*
   * localStream异常，可通过 console 日志产看具体原因
   *
   */
  LOCALSTREAM_ERROR: 10010,

  /*
   * 描述：本地流localStream异常。
   * 可能原因：该localStream对象已经被销毁、该stream对象不是通过NERTC.createSteam()创建的、或者重复使用了多个localStream对象，但是没有管理好多个实例对象的应用
   * 处理建议：请按照上述原因检查以及做相应的措施
   */
  LOCALSTREAM_NOT_FOUND_ERROR: 10011,

  /*
   * 描述：sdk内部系统错误。
   * 可能原因：出现异常的可能性原因比较多，一般RtcError对象中message消息会输出具体的原因，console中也会输出具体信息
   * 处理建议：麻烦提供具体的信息，联系云信技术支持
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

  /*
   * 描述：当前正在网络重连中。
   * 可能原因：当前sdk内部正在重连，相关的api调用会失败，反馈该错误
   * 处理建议：麻烦提供具体的信息，联系云信技术支持
   */
  RECONNECTING: 10020,

  /*
   * 描述：服务端未知错误。
   * 可能原因：一般是服务端错误，一般RtcError对象中message消息会输出具体的原因，console中也会输出具体信息
   * 处理建议：麻烦提供具体的信息，联系云信技术支持
   */
  SERVER_UNKNOWN_ERROR: 10099,

  // *********************  房间相关错误码(ErrorCode 范围：10101 - 10200)

  /*
   * 描述：服务器认证返回的错误
   * 可能原因：appkey、token等信息错误。
   * 处理建议：RtcError对象中的extraCode属性有指定云信服务器器反馈的具体错误码内容，也可以在console中查看具体原因
   */
  JOIN_FAILED: 10100,
  /*
   * 描述：重复加入房间
   * 可能原因：当前已经在房间中，又重复调用了join()
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃后面的join()调用
   */
  REPEAT_JOIN_ERROR: 10101,
  /*
   * 描述：服务器连接超时
   * 描述：服务器连接超时
   * 描述：服务器连接超时
   */
  MEETING_ERROR: 10102,

  /*
   * 房间服务相关错误
   *
   *
   */
  ROOM_SERVER_ERROR: 10103,

  /*
   * 用户不在频道中错误
   *
   *
   */
  USER_NOT_IN_CHANNEL_ERROR: 10104,

  /*
   * 事件上报错误
   *
   *
   */
  EVENT_UPLOAD_ERROR: 10105,

  /*
   * 未找到异常
   *
   *
   */
  NOT_FOUND_ERROR: 10106,

  /*
   * SDP异常
   *
   *
   */
  SDP_ERROR: 10107,

  /*
   * 描述：服务器permKey权限控制不允许加入房间
   * 可能原因：服务器permKey权限控制不允许加入房间
   * 处理建议：客户应用服务器侧的逻辑，可以自行调整permKey的规则
   */
  JOIN_PERMKEY_ERROR: 10009,

  /*
   * 描述：参数错误，join()方法没有传递channelName参数
   * 可能原因：参数错误，join()方法没有传递channelName参数
   * 处理建议：参数错误，join()方法中传递合法的channelName参数即可
   */
  JOIN_WITHOUT_CHANNEL_NAME: 10010,

  /*
   * 描述：参数错误，join()方法传递recordAudio或者recordVideo参数格式非法
   * 可能原因：recordAudio或者recordVideo不是Boolean类型
   * 处理建议：recordAudio或者recordVideo修改为Boolean类型
   */
  JOIN_RECORD_TYPE_ERROR: 10111,

  /*
   * 描述：join()方法传递uid参数错误
   * 可能原因：uid类型为number类型，但是只超过了Number类型的最大值(2^53 - 1)
   * 处理建议：uid支持string格式，如果需要使用数字非常大的值，请使用string格式
   */
  JOIN_UID_TYPE_ERROR: 10112,

  /*
   * 描述：服务器认证返回的错误
   * 可能原因：appkey、token等信息错误
   * 处理建议：RtcError对象中的extraCode属性有指定云信服务器器反馈的具体错误码内容，也可以在console中查看具体原因
   */
  SERVER_AUTH_ERROR: 10099,

  // *********************  localStream和remoteStream对象本地音视频视频采集&播放相关错误码 (ErrorCode 范围：10201 - 10400)
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

  /*
   * 描述：NERTC.createStream()接口中uid参数错误
   * 可能原因：uid类型为number类型，但是只超过了Number类型的最大值(2^53 - 1)
   * 处理建议：uid支持string格式，如果需要使用数字非常大的值，请使用string格式
   */
  STREAM_UID_ERROR: 10210,

  /*
   * SDP异常
   * 描述：没有指定要打开的媒体设备
   * 可能原因：执行init()方法时，由于在createStream时，没有设置auido、video、screen等属性，init()执行时没有需要打开的音视频媒体
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的initi()调用
   */
  STREAM_PROFILE_ERROR: 10211,

  /*
   * 描述：媒体设备打开失败
   * 可能原因：RtcError对象中的message属性有指定的具体信息
   * 处理建议：根据具体的信息处理，设备开启失败，sdk会反馈各种错误通知
   */
  MEDIA_DEVICE_ERROR: 10212,

  /*
   * 描述：视频播放参数错误
   * 可能原因：play()方法中，设置了playOptions.video或者screen，但是没有指定viewInput
   * 处理建议：如果需要播放视频内容，需要制定view节点
   */
  STREAM_PLAY_ARGUMENT_ERROR: 10215,

  /*
   * 描述：参数错误，setLocalRenderMode()或setRemoteEenderMode()方法没有传递width、height参数，或者传递的参数格式、数值不对
   * 可能原因：参数错误，setLocalRenderMode()或setRemoteEenderMode()方法没有传递width、height参数，或者传递的参数格式、数值不对
   * 处理建议：设置视频窗口时，width、height参数需要大于0
   */
  STREAM_RENDER_ARGUMENT_ERROR: 10216,

  /*
   * 描述：参数错误，isPlaying()方法没有传递type参数，或者传递的参数格式、数值不对
   * 可能原因：参数错误，isPlaying()方法没有传递type参数，或者传递的参数格式、数值不对
   * 处理建议：type应该是'audio'、'audioSlave'、'video'、'screen'中的一个
   */
  STREAM_ISPLAYING_ARGUMENT_ERROR: 10218,

  /*
   * 描述：参数错误，open()方法中没有指定要开启的音视频设备
   * 可能原因：参数错误，open()方法中没有指定要开启的音视频设备
   * 处理建议：open()方法需要指定要开启的音视频设备，比如：audio\video\screen\screenAudio
   */
  STREAM_OPTN_NO_TYPE_ERROR: 10220,
  /*
   * 描述：重复打开mic
   * 可能原因：当前已经成功打开了mic，或者正处打开mic的过程中，又执行了open({audio: true})
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的open()调用
   */
  REPEAT_OPEN_MIC_ERROR: 10221,
  /*
   * 描述：重复打开音频辅流
   * 可能原因：当前已经成功打开了音频辅流，或者正处打开音频辅流的过程中，又执行了open({screenAudio: true, screen: true})
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的open()调用
   */
  REPEAT_OPEN_AUDIO_SLAVE_ERROR: 10222,

  /*
   * 描述：重复打开camera
   * 可能原因：当前已经成功打开了camera，或者正处打开camera的过程中，又执行了open({camera: true})
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的open()调用
   */
  REPEAT_OPEN_CAMERA_ERROR: 10223,

  /*
   * 描述：重复打开screen
   * 可能原因：当前已经成功打开了screen，或者正处打开screen的过程中，又执行了open({screen: true})
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的open()调用
   */
  REPEAT_OPEN_SCREEN_ERROR: 10224,

  /*
   * 描述：参数错误，close()方法中没有指定要关闭的音视频设备
   * 可能原因：参数错误，close()方法中没有指定要开启的音视频设备
   * 处理建议：close()方法需要指定要开启的音视频设备，比如：audio\video\screen\screenAudio
   */
  STREAM_CLOSE_ARGUMENT_ERROR: 10228,

  /*
   * 描述：当前没有打开mic，却调用close({audio:true})关闭mic
   * 可能原因：当前没有打开mic，却调用close({audio:true})关闭mic
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的close()调用
   */
  STREAM_CLOSE_AUDIO_ERROR: 10229,

  /*
   * 描述：当前没有打开mic，却调用close({screenAudio:true})关闭mic
   * 可能原因：当前没有打开mic，却调用close({screenAudio:true})关闭mic
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的close()调用
   */
  STREAM_CLOSE_AUDIO_SLAVE_ERROR: 10230,

  /*
   * 描述：当前没有打开camera，却调用close({video:true})关闭mic
   * 可能原因：当前没有打开mic，却调用close({video:true})关闭mic
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的close()调用
   */
  STREAM_CLOSE_CAMERA_ERROR: 10231,

  /*
   * 描述：当前没有打开mic，却调用close({screen:true})关闭mic
   * 可能原因：当前没有打开mic，却调用close({screen:true})关闭mic
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的close()调用
   */
  STREAM_CLOSE_SCREEN_ERROR: 10232,

  /*
   * 描述：当前没有订阅过音频，却调用setAudioVolume()设置播放音量
   * 可能原因：当前没有订阅过音频，却调用setAUdioVolumeAUdioVolume()设置播放音量
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的setAudioVolume()调用
   */
  STREAM_NOT_SUBSCRIBE_AUDIO: 10240,

  /*
   * 描述：当前没有播放音频，却调用setAudioVolume()设置播放音量
   * 可能原因：当前没有播放音频，却调用setAUdioVolumeAUdioVolume()设置播放音量
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的setAudioVolume()调用
   */
  STREAM_NOT_SUBSCRIBE_AUDIO_SLAVE: 10241,

  /*
   * 描述：参数错误，调用setCaptureVolume()设置mic采集音量volume格式错误
   * 可能原因：参数错误，调用setCaptureVolume()设置mic采集音量volume格式错误
   * 处理建议：volume要求0-100（number）
   */
  STREAM_SET_CAPTURE_VOLUME_ARGUMENT_ERROR: 10242,

  // *********************  订阅和发布相关错误码 (ErrorCode 范围：10401 - 10600)

  /*
   * 描述：puhblish()接口中localStream错误，该stream中没有开启过任何媒体
   * 可能原因：puhblish()接口中localStream错误，该stream中没有开启过任何媒体，由于本地没有启动任何类型的媒体，无法发布媒体
   * 处理建议：应该先开启音频、视频或者音视频之后在执行publish()发布媒体
   */
  PUBLISH_NO_STREAM: 10300,

  /*
   * 描述：当前是观众模式，不允许调用publish()发布媒体
   * 可能原因：调用过setClientRole()设置为观众角色，观众是不能发布媒体的
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的publish()调用
   */
  PUBLISH_ROLE_ERROR: 10301,

  /*
   * 描述：服务器异常导致的发布失败
   * 可能原因：RtcError对象中的message属性有指定的具体信息
   * 处理建议：将详细的信息反馈给云信技术支持
   */
  PUBLISH_SERVER_ERROR: 10305,

  /*
   * 描述：服务器异常导致的订阅失败
   * 可能原因：RtcError对象中的message属性有指定的具体信息
   * 处理建议：将详细的信息反馈给云信技术支持
   */
  SUBSCRIBE_SERVER_ERROR: 10310,

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
