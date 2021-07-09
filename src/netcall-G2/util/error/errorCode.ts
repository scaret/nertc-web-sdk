/**
 * 错误码定义
 *
 * @module ErrorCode
 */
const ErrorCode = {
    /*
     * 无效参数
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
     * 非法操作
     *
     */
    INVALID_OPERATION: 1008,
    /*
     * 重复进房
     *
     */
    REPEAT_JOIN: 1009,
    /*
     * 本地用户不再频道中
     *
     */
    USER_NOT_IN_CHANNEL: 1010,
    /*
     * 当前不支持
     *
     */
    NOT_SUPPORTED_YET: 1011,
    /*
     * 未知类型
     *
     */
    UNKNOWN_TYPE: 1012,
    /*
     * 无权限，禁止操作
     *
     */
    NOT_ALLOWED: 1013,
    /*
     * 状态错误
     *
     */
    STATE_ERROR: 1014,
    /*
     * 找不到文件
     *
     */
    NO_FILE: 1015,
    /*
     * 解码失败
     *
     */
    DECODE_FAILED: 1016,
    /*
     * 添加推流任务失败
     *
     */
    ADD_TASK_FAILED: 1017,
    /*
     * 删除推流任务请求失败
     *
     */
    DELETE_TASK_FAILED: 1018,
    /*
     * 更新推流任务失败
     *
     */
    UPDATE_TASKS_FAILED: 1019,
    /*
     * 录制接口出错
     *
     */
    RECORD_API_ERROR: 1020,
    /*
     * 没有进行录制
     *
     */
    NO_RECORDER_FOUND: 1021,
    /*
     * 没有定义
     *
     */
    NOT_DEFINED: 1022,
    /*
     * 没有获取
     *
     */
    NOT_AVALIABLE: 1023,
    /*
     * 没有mediaHelper数据
     *
     */
    NO_MEDIAHELPER: 1024,
    /*
     * 没有实例化Play
     *
     */
    NO_PLAY: 1025,
    /*
     * 没有实例化Record
     *
     */
    NO_RECORD: 1026,
    /*
     * 没有找到
     *
     */
    NOT_FOUND: 1027,
    /*
     * appData错误
     *
     */
    APPDATA_ERROR: 1028,

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
