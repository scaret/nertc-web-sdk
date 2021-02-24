# 简介

针对本目录下资源内容进行一个简单的介绍，具体如下：

* event : SDK内部可能用到的事件名全局统一描述
    * index.js: 统一导出全部已定义的事件对象
    * rtc-event: 音视频相关的事件对象
    * notification：通知类回调事件对象
* protocol:网关信令的协议定义(发包对象，收包对象)
    * webrtcGateWayProtocol: webrtc网关协议收发对象定义
        * client_join.js: 新用户加入（收）
        * client_login.js: 登录（发）
        * client_logout.js: 用户退出（收）
        * client_update.js: 用户设备变化更新（收）
        * ice_answer.js: 接收ICE ANSWER (收)
        * ice_offer.js: 发送ICE OFFER(发)
        * index.js: 协议简单对象导出（在协议处理器中使用），提供字段描述合并指导
        * keep_alive_ack.js: 心跳回包（收）
        * keep_alive.js: 心跳包（发）
        * login_ack.js: 登录回包(收)
        * logout.js: 退出（发）
        * sdp_answer.js: 接收SDP ANSWER(收)
        * sdp_offer.js: 发送SDP OFFER(发)
        * sdp_update.js: SDP更新（发）
    * webrtcGateWayApi.js: 定义了webrtc网关的可用协议接口映射表
* common: 音视频相关的配置类及默认配置值定义
    * default-value: 默认配置对象
    * global：全局配置常量对象
    * keymap: 简单键值映射表
    * option: 全局对象的初始化实例可选项
    * param: 方法签名的请求参数对象
    * setting: 常量类枚举对象
    * index.js: common统一导出
* state: 状态管理器
* index.js: constant统一导出
    