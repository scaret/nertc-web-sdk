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
    INVALID_PARAMETER: 1000,
    /*
     * 浏览器不支持
     *
     */
    NOT_SUPPORT: 1001,
    /*
     * 没有找到服务器地址
     *
     */
    NO_SERVER_ADDRESS: 1002,
    /*
     * 服务器地址连接失败
     *
     */
    SOCKET_ERROR: 1003,
    /*
     * 找不到信令
     *
     */
    NO_SIGNALLING: 1004,
    /*
     * 找不到 statsReport 数据
     *
     */
    NO_STATS: 1005,
    /*
     * 找不到 mediasoup 数据
     *
     */
    NO_MEDIASOUP: 1006,
    /*
     * 找不到 meetings 数据
     *
     */
    NO_MEETINGS: 1007,
    /*
     * 找不到 localStream 数据
     *
     */
    NO_LOCALSTREAM: 1008,
    /*
     * 非法操作，可以通过 console 日志查看原因,一般是状态不对
     *
     */
    INVALID_OPERATION: 1009,
    /*
     * 重复进房
     *
     */
    REPEAT_JOIN: 1010,
    /*
     * 本地用户不再频道中
     *
     */
    USER_NOT_IN_CHANNEL: 1011,
    /*
     * 当前不支持，可以通过 console 日志查看原因
     *
     */
    NOT_SUPPORTED_YET: 1012,
    /*
     * 未知类型，可以通过 console 日志查看原因
     *
     */
    UNKNOWN_TYPE: 1013,
    /*
     * 无权限，禁止操作
     *
     */
    NOT_ALLOWED: 1014,
    /*
     * 状态错误，可以通过 console 日志查看原因
     *
     */
    STATE_ERROR: 1015,
    /*
     * 找不到文件，可以通过 console 日志查看原因
     *
     */
    NO_FILE: 1016,
    /*
     * 解码失败
     *
     */
    DECODE_FAILED: 1017,
    /*
     * 添加推流任务失败
     *
     */
    ADD_TASK_FAILED: 1018,
    /*
     * 删除推流任务请求失败
     *
     */
    DELETE_TASK_FAILED: 1019,
    /*
     * 更新推流任务失败
     *
     */
    UPDATE_TASKS_FAILED: 1020,
    /*
     * 录制接口出错
     *
     */
    RECORD_API_ERROR: 1021,
    /*
     * 没有进行录制
     *
     */
    NO_RECORDER_FOUND: 1022,
    /*
     * 未定义，可以通过 console 日志查看原因
     *
     */
    NOT_DEFINED: 1023,
    /*
     * 不可用，可以通过 console 日志查看原因
     *
     */
    NOT_AVALIABLE: 1024,
    /*
     * 没有 mediaHelper 数据
     *
     */
    NO_MEDIAHELPER: 1025,
    /*
     * 没有实例化 Play
     *
     */
    NO_PLAY: 1026,
    /*
     * 没有实例化 Record
     *
     */
    NO_RECORD: 1027,
    /*
     * 未获取，可以通过 console 日志查看原因
     *
     */
    NOT_FOUND: 1028,
    /*
     * appData 错误，可以通过 console 日志查看原因
     *
     */
    APPDATA_ERROR: 1029,

    /*
     * 自动播放受限
     *
     */
    AUTO_PLAY_NOT_ALLOWED:1030,
    /*
     * 未知错误
     *
     */
    UNKNOWN: 9999,
}

export default ErrorCode;
