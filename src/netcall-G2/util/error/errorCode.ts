/**
 * 错误码定义
 *
 * @module ErrorCode
 */
const ErrorCode = {
  /*
   * 标识leave()中reason，用于logout事件上报的通知，这部分和native SDK对齐
   * native端错误码（http://doc.hz.netease.com/pages/viewpage.action?pageId=329523157）
   */
  PAGE_UNLOAD: 30000, //浏览器刷新
  LOGIN_FAILED: 30001, //登录失败，sdk内部错误
  MEDIA_CONNECTION_DISCONNECTED: 30204, //媒体通道连接失败
  SIGNAL_CONNECTION_DISCONNECTED: 30205, //信令通道连接失败
  CLIENT_BANNED: 30206, //客户端被踢
  CHANNEL_CLOSED: 30207, //房间被关闭
  UID_DUPLICATE: 30209, //uid重复
  PERMKEY_TIMEOUT: 30902, // permkey高级权限token超时

  /*
   * 自动播放受限
   *
   */
  AUTO_PLAY_NOT_ALLOWED: 41030,

  /**
   * web端音视频sdk错误码规范统一: https://docs.popo.netease.com/lingxi/529191c6202443fe9d535067fdad061d
   */

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
   * 描述：非法操作。
   * 可能原因：出现这种错误，说明sdk接口使用姿势有问题。
   * 处理建议：RtcError对象中的message有输出具体的错误内容，也可以在console中查看具体原因
   */
  INVALID_OPERATION_ERROR: 10008,

  /*
   * 描述：接口调用顺序错误。
   * 可能原因：出现这种错误，说明该api接口需要在加入join()之前调用，而当前在加入房间之后调用了。
   * 处理建议：修改api接口的使用顺序，在join()之前调用即可
   */
  API_CALL_SEQUENCE_BEFORE_ERROR: 10009,

  /*
   * 描述：接口调用顺序错误。
   * 可能原因：出现这种错误，说明该api接口需要在加入join()成功之后调用，而当前的接口调用不符合要求，可能是当前没有执行过join()，也可能是join()失败了。
   * 处理建议：修改api接口的使用顺序，在join()成功之后调用即可
   */
  API_CALL_SEQUENCE_AFTER_ERROR: 10010,

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
   * 描述：登录请求发送了异常。
   * 可能原因：网络超时，或者系统内部错误
   * 处理建议：麻烦提供具体的信息，联系云信技术支持
   */
  LOGIN_REQUEST_ERROR: 10017,

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
   * 描述：sdk内部错误导致的加入房间失败
   * 可能原因：系统内部流程异常导致。
   * 处理建议：麻烦提供具体的信息，联系云信技术支持
   */
  JOIN_FAILED: 10100,
  /*
   * 描述：重复加入房间
   * 可能原因：当前已经在房间中，又重复调用了join()
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃后面的join()调用
   */
  REPEAT_JOIN_ERROR: 10101,

  /*
   * 描述：用户不再房间中
   * 可能原因：当前该client没有加入房间、或者加入房间失败、或者已经离开房间了，可能有由一下接口反馈[setClientRole()]
   * 处理建议：业务层规避这种行为，加入房间成功之后，方可执行相应的api
   */
  USER_NOT_IN_CHANNEL_ERROR: 10104,

  /*
   * 描述：服务器permKey权限控制不允许加入房间
   * 可能原因：服务器permKey权限控制不允许加入房间
   * 处理建议：客户应用服务器侧的逻辑，可以自行调整permKey的规则
   */
  JOIN_PERMKEY_ERROR: 10109,

  /*
   * 描述：参数错误，join()方法没有传递channelName参数
   * 可能原因：参数错误，join()方法没有传递channelName参数
   * 处理建议：参数错误，join()方法中传递合法的channelName参数即可
   */
  JOIN_WITHOUT_CHANNEL_NAME: 10110,

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
  SERVER_AUTH_ERROR: 10119,

  /*
   * 描述：参数错误，setChannelProfile(option)接口参数错误
   * 可能原因：要求option为{mode}，其中mode必须为'rtc'或者'live'
   * 处理建议：检查参数要求，符合sdk要求
   */
  SET_CHANNEL_PROFILE_INVALID_PARAMETER_ERROR: 10121,

  /*
   * 描述：当前是观众角色，不允许调用addTasks(option)接口
   * 可能原因：client角色不对
   * 处理建议：业务上避免该行为，setClientRole()应该是设置为host之后，才能执行该api
   */
  TASKS_ROLE_ERROR: 10131,
  /*
   * 描述：参数错误，addTasks(option)接口参数错误
   * 可能原因：rtmpTasks为空, 或者该数组长度为空
   * 处理建议：传递正确的参数
   */
  ADD_TASK_PARAMETER_ERROR: 10132,
  /*
   * 描述：addTasks(option)流程中服务器认证错误
   * 可能原因：rtmpTasks设置的参数不符合要求
   * 处理建议：RtcError对象中的extraCode属性有指定云信服务器器反馈的具体错误码内容，也可以在console中查看具体原因
   */
  ADD_TASK_FAILED_ERROR: 10133,
  /*
   * 描述：参数错误，deleteTasks(option)接口参数错误
   * 可能原因：taskIds为空, 或者该数组长度为空
   * 处理建议：传递正确的参数
   */
  DELETE_TASK_PARAMETER_ERROR: 10134,
  /*
   * 描述：deleteTasks(option)流程中服务器认证错误
   * 可能原因：taskIds设置的参数不符合要求，可能存在没有创建成功的taskId
   * 处理建议：RtcError对象中的extraCode属性有指定云信服务器器反馈的具体错误码内容，也可以在console中查看具体原因
   */
  DELETE_TASK_FAILED_ERROR: 10135,
  /*
   * 描述：参数错误，updateTasks(option)接口参数错误
   * 可能原因：rtmpTasks为空, 或者该数组长度为空
   * 处理建议：传递正确的参数
   */
  UPDATE_TASK_PARAMETER_ERROR: 10136,
  /*
   * 描述：updateTask(option)流程中服务器认证错误
   * 可能原因：rtmpTasks设置的参数不符合要求
   * 处理建议：RtcError对象中的extraCode属性有指定云信服务器器反馈的具体错误码内容，也可以在console中查看具体原因
   */
  UPDATE_TASKS_FAILED_ERROR: 10137,

  // *********************  localStream和remoteStream对象本地音视频视频采集&播放相关错误码 (ErrorCode 范围：10201 - 10349)

  /*
   * 描述：NERTC.createStream()接口中uid参数错误
   * 可能原因：uid类型为number类型，但是只超过了Number类型的最大值(2^53 - 1)
   * 处理建议：uid支持string格式，如果需要使用数字非常大的值，请使用string格式
   */
  STREAM_UID_ERROR: 10210,

  /*
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
   * 描述：当前没有打开屏幕共享音频，却调用close({screenAudio:true})关闭mic
   * 可能原因：当前没有打开屏幕共享音频，却调用close({screenAudio:true})关闭mic
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
   * 可能原因：当前没有订阅过音频，却调用setAudioVolume()设置播放音量
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的setAudioVolume()调用
   */
  STREAM_NOT_SUBSCRIBE_AUDIO: 10240,

  /*
   * 描述：当前没有播放音频，却调用setAudioVolume()设置播放音量
   * 可能原因：当前没有播放音频，却调用setAudioVolume()设置播放音量
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的setAudioVolume()调用
   */
  STREAM_NOT_SUBSCRIBE_AUDIO_SLAVE: 10241,

  /*
   * 描述：参数错误，调用setCaptureVolume()设置mic采集音量volume格式错误
   * 可能原因：参数错误，调用setCaptureVolume()设置mic采集音量volume格式错误
   * 处理建议：volume要求0-100（number）
   */
  STREAM_SET_CAPTURE_VOLUME_ARGUMENT_ERROR: 10242,

  /*
   * 描述：调用takeSnapshot()或者takeSnapshotBase64()截图出错
   * 可能原因：之前没有启动过摄像头，或者启动完成摄像头但是没有播放过视频, 不支持截屏
   * 处理建议：请先开启摄像头，并且play()播放视频
   */
  STREAM_TAKE_SNAPSHOT_ERROR: 10247,

  /*
   * 描述：调用takeSnapshot()或者takeSnapshotBase64()截图出错
   * 可能原因：浏览器环境不支持截图功能
   * 处理建议：请使用最新版本的chrome浏览器
   */
  STREAM_TAKE_SNAPSHOT_NO_CANVAS_ERROR: 10248,

  /*
   * 描述：调用setAudioVolume()出错
   * 可能原因：参数错误，volume不是number数据类型
   * 处理建议：volume 要设置的远端音频的播放音量，范围为 0（静音）到 100（声音最大）
   */
  SET_AUDIO_VOLUME_ARGUMENTS_ERROR: 10250,
  /*
   * 描述：调用setAudioVolume()出错
   * 可能原因：之前没有播放过音频，不能设置播放音量
   * 处理建议：请先调用play()播放声音
   */
  SET_AUDIO_VOLUME_ERROR: 10251,

  /*
   * 描述：调用setCaptureVolume()出错
   * 可能原因：参数错误，volume不是number数据类型
   * 处理建议：volume 要设置的远端音频的播放音量，范围为 0（静音）到 100（声音最大）
   */
  SET_CAPTURE_VOLUME_ARGUMENTS_ERROR: 10252,

  /*
   * 描述：调用setAudioOutput()出错
   * 可能原因：系统错误，可能是不支持，或者浏览器内部在切换扬声器的时候出现异常
   * 处理建议：联系云信技术支持
   */
  SET_AUDIO_OUTPUT_ERROR: 10253,

  /*
   * 描述：调用switchDevice()方法错误
   * 可能原因：参数错误，type仅支持'audio'、'video'
   * 处理建议：业务上避免
   */
  SWITCH_DEVICE_REPEAT_ARGUMENTS_ERROR: 10254,

  /*
   * 描述：调用switchDevice()方法错误
   * 可能原因：状态错误，在前一次调用switchDevice()切换还没有成功的时候，又重复调用switchDevice()
   * 处理建议：业务上避免，sdk会忽略此次调用
   */
  SWITCH_DEVICE_REPEAT_ERROR: 10255,

  /*
   * 描述：调用switchDevice()方法错误
   * 可能原因：状态错误，调用switchDevice()切换麦克风设备，但是当前并没有打开mic设备
   * 处理建议：业务上避免
   */
  SWITCH_DEVICE_NO_MIC_ERROR: 10256,

  /*
   * 描述：调用switchDevice()方法错误
   * 可能原因：状态错误，调用switchDevice()切换麦克风设备，但是音频数据是用户自定义数据，不支持切换
   * 处理建议：业务上避免
   */
  SWITCH_DEVICE_NO_SUPPORT_AUDIO: 10257,

  /*
   * 描述：调用switchDevice()方法错误
   * 可能原因：状态错误，调用switchDevice()切换摄像头设备，但是当前并没有打开摄像头设备
   * 处理建议：业务上避免
   */
  SWITCH_DEVICE_NO_CAMERA_ERROR: 10258,

  /*
   * 描述：调用switchDevice()方法错误
   * 可能原因：状态错误，调用switchDevice()切换摄像头设备，但是视频数据是用户自定义数据，不支持切换
   * 处理建议：业务上避免
   */
  SWITCH_DEVICE_NO_SUPPORT_VIDEO: 10259,

  /*
   * 描述：调用muteAudio()静音出错
   * 可能原因：之前没有播放过音频或者没有音频流, 不支持mute
   * 处理建议：请先调用play()播放音频成功之后，才能够静音
   */
  STREAM_MUTE_AUDIO_ERROR: 10265,

  /*
   * 描述：调用unmuteAudio()静音出错
   * 可能原因：之前没有mute过音频, 不支持unmute
   * 处理建议：业务上避免
   */
  STREAM_NOT_MUTE_AUDIO_YET: 10266,

  /*
   * 描述：调用unmuteAudio()静音出错
   * 可能原因：没有音频流, 无法执行unmute操作
   * 处理建议：请先保证存在音频数据
   */
  STREAM_UNMUTE_AUDIO_WITHOUT_STREAM: 10267,

  /*
   * 描述：调用muteAudioSlave()静音出错
   * 可能原因：之前没有播放过音频或者没有音频辅流, 不支持mute
   * 处理建议：请先调用play()播放音频辅流成功之后，才能够静音
   */
  STREAM_MUTE_AUDIO_SLAVE_ERROR: 10270,

  /*
   * 描述：调用unmuteAudioSlave()静音出错
   * 可能原因：之前没有mute过音频辅流, 不支持unmute
   * 处理建议：业务上避免
   */
  STREAM_NOT_MUTE_AUDIO_SLAVE_YET: 10271,

  /*
   * 描述：调用unmuteAudioSlave()静音出错
   * 可能原因：没有音频辅流, 无法执行unmute操作
   * 处理建议：请先保证存在音频辅流数据
   */
  STREAM_UNMUTE_AUDIO_SLAVE_WITHOUT_STREAM: 10272,

  /*
   * 描述：调用muteVideo()出错
   * 可能原因：之前没有播放过视频或者没有视频流, 不支持mute
   * 处理建议：请先调用play()播放视频成功之后，才能够mute
   */
  STREAM_MUTE_VIDEO_ERROR: 10275,

  /*
   * 描述：调用unmuteVideo()出错
   * 可能原因：之前没有mute过视频, 不支持unmute
   * 处理建议：业务上避免
   */
  STREAM_NOT_MUTE_VIDEO_YET: 10276,

  /*
   * 描述：调用unmuteVideo()静音出错
   * 可能原因：没有视频流, 无法执行unmute操作
   * 处理建议：请先保证存在视频数据
   */
  STREAM_UNMUTE_VIDEO_WITHOUT_STREAM: 10277,

  /*
   * 描述：调用muteScreen()出错
   * 可能原因：之前没有播放过屏幕共享或者没有屏幕共享流, 不支持mute
   * 处理建议：请先调用play()播放屏幕共享成功之后，才能够mute
   */
  STREAM_MUTE_SCREEN_ERROR: 10280,

  /*
   * 描述：调用unmuteScreen()出错
   * 可能原因：之前没有mute过屏幕共享, 不支持unmute
   * 处理建议：业务上避免
   */
  STREAM_NOT_MUTE_SCREEN_YET: 10281,

  /*
   * 描述：调用unmuteScreen()静音出错
   * 可能原因：没有屏幕共享流, 无法执行unmute操作
   * 处理建议：请先保证存在屏幕共享数据
   */
  STREAM_UNMUTE_SCREEN_WITHOUT_STREAM: 10282,

  // *********************  订阅和发布相关错误码 (ErrorCode 范围：10350 - 10400)

  /*
   * 描述：puhblish()接口中localStream错误，该stream中没有开启过任何媒体
   * 可能原因：puhblish()接口中localStream错误，该stream中没有开启过任何媒体，由于本地没有启动任何类型的媒体，无法发布媒体
   * 处理建议：应该先开启音频、视频或者音视频之后在执行publish()发布媒体
   */
  PUBLISH_NO_STREAM: 10350,

  /*
   * 描述：当前是观众模式，不允许调用publish()发布媒体
   * 可能原因：调用过setClientRole()设置为观众角色，观众是不能发布媒体的
   * 处理建议：业务层规避这种行为，也可以忽略这个报错，因为sdk会主动放弃该次的publish()调用
   */
  PUBLISH_ROLE_ERROR: 10351,

  /*
   * 描述：服务器异常导致的发布失败
   * 可能原因：RtcError对象中的message属性有指定的具体信息
   * 处理建议：将详细的信息反馈给云信技术支持
   */
  PUBLISH_SERVER_ERROR: 10355,

  /*
   * 描述：服务器异常导致的订阅失败
   * 可能原因：RtcError对象中的message属性有指定的具体信息
   * 处理建议：将详细的信息反馈给云信技术支持
   */
  SUBSCRIBE_SERVER_ERROR: 10360,

  /*
   *
   * ******************  功能模块相关错误码(ErrorCode 范围：10401 - 10600)
   */

  //美颜、背景替换、AI降噪等插件模块错误码范围：10401 - 10419
  /*
   * 描述：不支持美颜、背景替换、AI降噪功能
   * 可能原因：浏览器不支持webGL
   * 处理建议：使用最新版本的chrome浏览器
   */
  WEBGL_NOT_SUPPORT_ERROR: 10401,
  /*
   * 描述：WebGL LoseContext(已废弃)
   */
  WEBGL_LOSE_CONTEXT_ERROR: 10402,
  /*
   * 描述：WEBGL Restored FAIL(已废弃)
   */
  WEBGL_RESTORED_FAILD_ERROR: 10403,
  /*
   * 描述：基础美颜资源加载失败(已废弃)
   */
  BASIC_BEAUTY_RES_ERROR: 10404,
  /*
   * 描述：高级美颜资源加载失败(已废弃)
   */
  ADV_BEAUTY_RES_ERROR: 10405,

  /*
   * 描述：插件加载错误
   * 可能原因：插件路径错误，或者系统内容错误，message会反馈具体的信息
   * 处理建议：检查设置的插件路径是否正确，如果正确无误，仍然加载失败，请联系云信技术支持
   */
  PLUGIN_LOADED_ERROR: 10406,
  /*
   * 描述：插件执行错误(已废弃)
   */
  PLUGIN_ERROR: 10407,
  /*
   * 描述：插件注册错误(已废弃)
   */
  PLUGIN_REGISTER_ERROR: 10408,

  /*
   * 描述：插件未注册
   * 可能原因：虚拟背景/高级美颜/AI降噪插件，在注册前调用了enable
   * 处理建议：先调用registerPlugin接口进行注册
   */
  PLUGIN_NOT_REGISTER: 10409,

  //伴音、音效模块错误码范围：10420 - 10439
  /*
   * 描述：startAudioMixing()伴音功能没有音频
   * 可能原因：当前没有开启mic，不支持伴音功能
   * 处理建议：先开启mic
   */
  AUDIO_MIX_NO_AUDIO: 10420,

  /*
   * 描述：startAudioMixing()云端伴音文件加载失败
   * 可能原因：audioFilePath参数错误，或者该路径http请求失败，或者该云端文件数据格式错误
   * 处理建议：请检查audioFilePath云端音频文件是否是正常的
   */
  AUDIO_MIX_FILE_ERROR: 10421,

  /*
   * 描述：startAudioMixing()云端伴音功能不支持
   * 可能原因：浏览器环境不支持云端伴音功能
   * 处理建议：请使用最新版本的Chrome浏览器
   */
  AUDIO_MIX_NO_SUPPORT: 10422,

  /*
   * 描述：云端伴音功能接口调用异常
   * 可能原因：当前没有开启过伴音功能，调用停止、暂停、调节音量等操作会失败
   * 处理建议：请先startAudioMixing()开启伴音功能
   */
  AUDIO_MIX_NOT_STATE_ERROR: 10423,

  /*
   * 描述：resumeAudioMixing()调用异常
   * 可能原因：当前没有暂停伴音
   * 处理建议：业务上避免类似操作
   */
  AUDIO_MIX_NOT_PAUSE: 10424,

  /*
   * 描述：setAudioMixingVolume()参数错误
   * 可能原因：volume为number类型，范围是0-255，该参数设置错误
   * 处理建议：请正确设置volume
   */
  AUDIO_MIX_VOLUME_ERROR: 10425,

  /*
   * 描述：setAudioMixingPosition()参数错误
   * 可能原因：playStartTime格式或者范围错误
   * 处理建议：playStartTime应该是大于0，且小于云端伴音文件的总时长
   */
  AUDIO_MIX_PLAY_START_TIME_ERROR: 10426,

  /*
   * 描述：音效功能不支持
   * 可能原因：浏览器环境不支持音效功能
   * 处理建议：请使用最新版本的Chrome浏览器
   */
  AUDIO_EFFECT_NO_SUPPORT: 10430,
  /*
   * 描述：playEffect()|preloadEffect()云端音效文件加载失败
   * 可能原因：filePath参数错误，或者该路径http请求失败，或者该云端文件数据格式错误
   * 处理建议：请检查filePath云端音效文件是否是正常的
   */
  AUDIO_EFFECT_FILE_ERROR: 10431,

  /*
   * 描述：playEffect()音效功能没有音频
   * 可能原因：当前没有开启mic
   * 处理建议：先开启mic
   */
  AUDIO_EFFECT_NO_AUDIO: 10432,

  /*
   * 描述：云端音效功能接口调用异常
   * 可能原因：当前没有开启过音效功能，调用停止、暂停、调节音量等操作会失败
   * 处理建议：请先playEffect()开启音效功能
   */
  AUDIO_EFFECT_NOT_STATE_ERROR: 10433,

  /*
   * 描述：soundId找不到对应的音效问题
   * 可能原因：soundId的音效文件可能没有加载或者已经释放了，或者参数错误
   * 处理建议：请检查soundId是否正确
   */
  AUDIO_EFFECT_FILE_LOST_ERROR: 10434,

  /*
   * 描述：resumeEffect()调用异常
   * 可能原因：当前没有暂停该音效文件
   * 处理建议：业务上避免类似操作
   */
  AUDIO_EFFECT_NOT_PAUSE: 10435,
  /*
   * 描述：unloadEffect()调用异常
   * 可能原因：该音效文件正在播放，不能unload
   * 处理建议：该音效文件已经播放，请现使用 stopEffect 方法停止播放
   */
  AUDIO_EFFECT_PLAY_ALREADY: 10436,
  /*
   * 描述：playEffect()音效功能内部状态异常
   * 可能原因：在已经播放音效后，或者当前音效处于暂停、音效文件加载中时，又调用playEffect()出现了sdk内部状态异常
   * 处理建议：请提供必要的信息联系云信技术支持
   */
  AUDIO_EFFECT_ERROR: 10437,

  //小业务功能模块：10440 - 10449
  /*
   * 描述：参数错误，setLocalMediaPriority()方法中priority格式错误
   * 可能原因：参数错误，priority参数要求是number类型（可选50 | 100）
   * 处理建议：priority参数设置正确
   */
  SET_LOCAL_MEDIA_PRIORITY_ARGUMENT_ERROR: 10445,

  /*
   * 描述：updatePermKey()请求错误
   * 可能原因：服务器针对更新permKey请求拒绝了
   * 处理建议：RtcError对象中的extraCode属性有指定云信服务器器反馈的具体错误码内容，也可以在console中查看具体原因
   */
  UPDATE_PERMKEY_ERROR: 10446,

  //客户端录制+水印模块（?）：10450 - 10460

  /*
   * 描述：调用startMediaRecording()方法错误
   * 可能原因：当前浏览器环境不支持录制功能
   * 处理建议：使用最新版本的chrome浏览器
   */
  RECORDING_NOT_SUPPORT: 10450,

  /*
   * 描述：调用startMediaRecording()方法错误
   * 可能原因：重复调用了
   * 处理建议：业务上避免，sdk会忽略此次调用
   */
  REPEAT_RECORDING_ERROR: 10451,

  /*
   * 描述：调用startMediaRecording()方法错误
   * 可能原因：之前录制的数据没有进行下载或者清除操作
   * 处理建议：业务上避免，要调用downloadMediaRecording()下载或者调用cleanMediaRecording()清除
   */
  RECORDING_CACHE_ERROR: 10452,

  /*
   * 描述：调用本来录制过程中内部出现了异常
   * 可能原因：sdk内部异常
   * 处理建议：请提供具体的信息，联系云信技术支持
   *
   */
  RECORDING_ERROR: 10453,

  /*
   * 描述：调用stopMediaRecording()或者stopMediaRecording()或者cleanMediaRecording()方法错误
   * 可能原因：当前没有录制任务
   * 处理建议：业务上避免这种情况，没有开启的情况下，禁止调用这些接口
   */
  RECORDING_NOT_START_ERROR: 10454,

  /*
   * 描述：调用setCanvasWatermarkConfigs()方法设置画布水印错误
   * 可能原因：水印数额超限了(最多可以设置 10 个文字水印，4 个图片水印)
   * 处理建议：业务上避免这种情况
   */
  WATERMARKS_EXCEEDED_ERROR: 10460,

  //LBS模块：10461 - 10470
  /*
   * 描述：LBS 请求相关异常
   * 可能原因：网络有问题，sdk发起的所有LBS请求都失败了
   * 处理建议：切换一下网络常识，如果一直不成功，请联系云信技术支持
   */
  LBS_REQUEST_ERROR: 10461,
  /*
   * 描述：LBS 请求相关响应的结果解析异常
   * 可能原因：云信内部流程异常
   * 处理建议：情提供具体的信息，联系云信技术支持
   */
  LBS_JSON_ERROR: 10462,

  //日志和数据上报（?）：10470 - 10480

  //加密模块：10471 - 10476
  /*
   * 描述：该浏览器环境不支持自定义加密功能。
   * 可能原因：浏览器环境不支持
   * 处理建议：麻烦使用最新版本的chrome浏览器
   */
  CUSTOM_TRANSFOR_NOT_SUPPORT_ERROR: 10471,
  /*
   * 描述：自定义加密功能与国密加密功能不兼容。
   * 可能原因：使用setEncryptionMode()开启了国密加密功能，该功能和自定义加密功能不能同时使用
   * 处理建议：请先关闭国密加密功能
   */
  SET_ENCRYPTION_MODE_ERROR: 10472,
  /*
   * 描述：setEncryptionSecret()调用错误。
   * 可能原因：没有提前调用setEncryptionMode()开启了国密加密功能，此时无法设置加密密钥
   * 处理建议：请先调用setEncryptionMode()开启了国密加密功能
   */
  SET_ENCRYPTION_SECRET_INVALID_OPERATION_ERROR: 10473,

  //设置用户角色：10477 - 10479
  /*
   * 描述：setClientRole() role参数格式错误。
   * 可能原因：role参数错误
   * 处理建议：role只有两个值'host'(表示主播)、'audience'(表示观众)
   */
  ROLE_TYPE_ERROR: 10477,

  //client.get类相关错误码:10480 - 10489
  /*
   * 描述：getSystemStats()接口该浏览器不支持。
   * 可能原因：浏览器环境不支持
   * 处理建议：麻烦使用最新版本的chrome浏览器
   */
  GET_SYSTEM_STATS_NOT_SUPPORT_ERROR: 10480,
  /*
   * 描述：切换用户角色不成功（观众->主播）
   * 可能原因：该频道主播满了 https://docs.popo.netease.com/lingxi/89ecbc9ac1724cb88c3189119462f066
   * 处理建议：给用户提示/调整频道主播数量限制
   */
  SET_CLIENT_ROLE_ERROR: 10490
}

export default ErrorCode
