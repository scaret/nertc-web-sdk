/**
 * 错误码定义
 *
 * @module ErrorCode
 */
const ErrorCode = {
    /*
     * 无效参数，可以通过 console 日志查看原因
     *
     */
    INVALID_PARAMETER: 41000,
    /*
     * 浏览器不支持
     *
     */
    NOT_SUPPORT: 41001,
    /*
     * 没有找到服务器地址
     *
     */
    NO_SERVER_ADDRESS: 41002,
    /*
     * 服务器地址连接失败
     *
     */
    SOCKET_ERROR: 41003,
    /*
     * 找不到信令
     *
     */
    NO_SIGNALLING: 41004,
    /*
     * 找不到 statsReport 数据
     *
     */
    NO_STATS: 41005,
    /*
     * 找不到 mediasoup 数据
     *
     */
    NO_MEDIASERVER: 41006,
    /*
     * 找不到 meetings 数据
     *
     */
    NO_MEETINGS: 41007,
    /*
     * 找不到 localStream 数据
     *
     */
    NO_LOCALSTREAM: 41008,
    /*
     * 非法操作，可以通过 console 日志查看原因,一般是状态不对
     *
     */
    INVALID_OPERATION: 41009,
    /*
     * 重复进房
     *
     */
    REPEAT_JOIN: 41010,
    /*
     * 本地用户不再频道中
     *
     */
    USER_NOT_IN_CHANNEL: 41011,
    /*
     * 当前不支持，可以通过 console 日志查看原因
     *
     */
    NOT_SUPPORTED_YET: 41012,
    /*
     * 未知类型，可以通过 console 日志查看原因
     *
     */
    UNKNOWN_TYPE: 41013,
    /*
     * 无权限，禁止操作
     *
     */
    NOT_ALLOWED: 41014,
    /*
     * 状态错误，可以通过 console 日志查看原因
     *
     */
    STATE_ERROR: 41015,
    /*
     * 找不到文件，可以通过 console 日志查看原因
     *
     */
    NO_FILE: 41016,
    /*
     * 解码失败
     *
     */
    DECODE_FAILED: 41017,
    /*
     * 添加推流任务失败
     *
     */
    ADD_TASK_FAILED: 41018,
    /*
     * 删除推流任务请求失败
     *
     */
    DELETE_TASK_FAILED: 41019,
    /*
     * 更新推流任务失败
     *
     */
    UPDATE_TASKS_FAILED: 41020,
    /*
     * 录制接口出错
     *
     */
    RECORD_API_ERROR: 41021,
    /*
     * 没有进行录制
     *
     */
    NO_RECORDER_FOUND: 41022,
    /*
     * 未定义，可以通过 console 日志查看原因
     *
     */
    NOT_DEFINED: 41023,
    /*
     * 不可用，可以通过 console 日志查看原因
     *
     */
    NOT_AVALIABLE: 41024,
    /*
     * 没有 mediaHelper 数据
     *
     */
    NO_MEDIAHELPER: 41025,
    /*
     * 没有实例化 Play
     *
     */
    NO_PLAY: 41026,
    /*
     * 没有实例化 Record
     *
     */
    NO_RECORD: 41027,
    /*
     * 未获取，可以通过 console 日志查看原因
     *
     */
    NOT_FOUND: 41028,
    /*
     * appData 错误，可以通过 console 日志查看原因
     *
     */
    APPDATA_ERROR: 41029,

    /*
     * 自动播放受限
     *
     */
    AUTO_PLAY_NOT_ALLOWED: 41030,
  
    /*
     * 没有媒体
     *
     */
    NO_MEDIA: 41031,

    /*
     * 被服务器禁言
     *
     */
    MEDIA_OPEN_BANNED_BY_SERVER: 41032,

    /*
     * 云代理失败
     *
     */
    PROXY_SERVER_ERROR: 41033,

    /*
     * 未知错误
     *
     */
    UNKNOWN: 99999,
}

export default ErrorCode;
