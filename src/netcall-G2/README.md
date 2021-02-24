# 音视频文件结构梳理

## 项目结构

``` shell
            entry::webrtc/nrtc
                    |
          webrtc/nrtc <-- api-adapter
            |-- api-module
                |-- common 音视频开关
                |-- device 设备相关
                |-- capture 采集
                |-- play 开启结束远程流等
                |-- record 录制
                |-- meeting/p2p
            |-- business(controller) <-- abstractAdapter
                |-- device
                |-- gateway
                |-- im
                |-- webrtc
      _______________|_________________
      |            Mixin              |
          module
            |-- core
                |-- dataReport 数据上报
                |-- gateway 网关
                |-- media
                |-- audio
```

核心方法
getInstance() 等同于其他端 createNrtcEngine
destroy() 等同于其他端release
X initialize web不实现
joinChannel
leaveChannel

核心音频方法
setAudioProfile
muteLocalAudioStream
muteRemoteAudioStream


核心视频方法
enableLocalVideo
disableLocalVideo
setLocalVideoProfile
setLocalVideoRender
setLocalRenderMode
setRemoteVideoProfile
setRemoteVideoRender
setRemoteRenderMode
muteLocalVideoStream
muteRemoteVideoStream

getChannelInfo
getUid

设备相关-web必须
getDevices
startDevice
stopDevice

录制相关-章娟需求
startMediaRecording
stopMediaRecording
listMediaRecording
cleanMediaRecording
downloadMediaRecording

## Web音视频遗留问题梳理

WebRTC+NRTC+小程序-SDK X3
  - A呼叫B，B没接听，C呼叫A，B接听A，A与B的cid不一致
    - SDK场景中，每个人的会话对象是唯一的，存在新的呼叫会刷掉历史呼叫信息，每个人是否需要存储每个呼叫的信息，通过uid记录还是requestId记录?
  - Web端做主播，主播关闭摄像头时拉流端出现短暂黑屏，音画不同步和花屏现象(WebRTC，小程序都有)
    - 服务端暂时无解
  - 在开启弱网的情况下会出现音画不同步现象(WebRTC，小程序都有)
    - 小程序: 可以通过重启组件推拉流进行，下面详述
    - WebRTC  MMC2-5086 ??
  - SDK与服务器websocket断掉之后，信令控制断掉了，媒体流还能继续通。(WebRTC，小程序都有)
  - 标准化易用性多端约定的状态码不一致，比如ios约定普通为1，观众为2；web统一是普通为0，观众为1
  - bug数量和重复开发及测试的问题
    - 目前重复代码过多，大白测试页代码质量也有问题，同一个需求，要写四遍代码，即大白页webrtc/大白页nrtc/webdemo点对点/webdemo多人，漏改或漏测，一个小问题，要同时改4个地方。组件化/小程序插件化，可以解决40%的问题
  - QA建议Web组对每个项目进行全组方案评估、方案讨论及后续代码评审会
WebRTC+NRTC-SDK
  - Web端对设备操作、录制操作、屏幕共享、状态码等会与其他端不一致
  - Web端有很多后门方法，如自定义网关地址、性能测试、安全认证、是否私有化部署等，是否需要保留？
  - 部分代码的设计，已经偏离斌斌重构时的设计思想，是否补正，补正需要开发成本？包括参数校验、事件类、日志管理、状态管理
  - 本地开启上下行丢包20%的情况下，出现重复登录场景
    - 概率出现，重复登录问题
  - 网络探测demo页面CPU占用过大
  - NRTC SDK，pc-- pc Firefox 61 -- Firefox60 ，点对点视频，加入相同的房间，不能进行互通
    - MMC2-3506
  - 同一个房间不同的cid的问题，出现的场景为，一方的上行ice failed，或者一方的上行流建立失败
    - SDK需要做兼容
  - NRTC SDK，火狐--火狐 （61+） 点对点视频互通，只播放自己的画面，对方画面卡住不动
    - 未明原因
  - UID或者CID长度超过51位时，浏览器侧无法解析，导致UID和cid的精度出现问题，引发退出房间等功能失效
    - 多端约定，限制最大长度
  - 当麦克风被除了浏览器的应用占用时，建议SDK上报麦克风被占用
    - 易用性，不确定是否能做到
  - 性能问题，Chrome4.8.0 与火狐5.0.0进行互通，火狐浏览器在内存小的pc端异常断线
    - 这个需要确认一下
  - 设备插拔webrtc目前尚未兼容
    - 目前会有事件上抛，需要demo层做处理
  - 多端登陆可能会崩溃
    - MMC2-1762
  - 4人互动直播，通话中，其中一人的实时画面长时间卡住不动，但是实际拉流的画面是在动的
    - MMC2-1415
  - 点对点通话，在一方可以看到对方的音视频，在另一方看不到对方的音视频，在测试中多次出现
    - MMC2-1404
  - web对web开启互动直播，播放端拉流查看，主播端关闭摄像头再开启摄像头，拉流端的画面看到连麦这边的会出现短暂的马赛克现象
NRTC+小程序-SDK X2
  - 接口一致性问题(Web端NRTC与小程序NRTC使用流程不一致，接口命名不一致)
    - 由于小程序推拉流组件是微信原生组件，并不在SDK管辖范围内，除非将SDK做成组件化，否则无法满足接口易用性的需求
WebRTC+IM-SDK X2
  - 断网重连以后，一方挂断，另一方可能没挂断，因为没有收到相应的通知
    - 因为有两条信令，音视频Socket重连上了，但IM此时尚未重连上，用户挂断音视频并发送挂断消息，IM这边消息没有发出去(但状态已被销毁，无法做二次操作)
  - 多人音视频通话，webrtc-im在泰国，另一方在国内，上行不能到国内，国内下行可以到泰国
NRTC+PCAgent-SDK X2
  - NRTC和PC-Agent部分通信协议不一致，互通会有问题
  - PC4.4.0版本互通中弱网条件下出现花屏现象
WebRTC-SDK
  - Firefox64 浏览器 webrtc点对点通话过程中，断网的那端在断网重连之后没有建立起上行连接
    - 问题定位中。。。
  - Firefox64 浏览器 webrtc点对点通话过程中，断网重连之后有一端没有发出音频流，导致对端听不到它的声音
    - 小概率出现，原因还未定位到
  - Web端主播，拉流端看主播出现卡顿现象  MMC2-5308
    - 互动直播服务器问题
  - Safari 12 和 firefox（最新版本）互通时，firefox的画面卡顿感强，帧率只有5帧左右
小程序-SDK 可能耦合Demo
  - 音画不同步-弱网环境
    - 可以通过重启组件推拉流进行，问题1：重启策略是怎样的，何时认为需要重启，问题2：SDK无法控制，那么需要用户应用上层做这些复杂逻辑处理，是否友好？是否需要组件化实现？
  - 音画不同步-多端互通其他端切换摄像头
    - 需要产品有策略，其他端切换摄像头的时候发送通知，告诉小程序做重新拉流
  - 小程序音视频一些必要的http请求会有阻塞现象
    - 需要管理http请求，超时abort阻塞的请求，并抛出异常(需要作为需求点排期)
  - 小程序视频画面比例为9:16，其他客户端为3:4
    - 只能将小程序SDK封装成组件才能做
  - 部分手机切换到后置摄像头，点击旋转画面，会变成前置摄像头(而非画面旋转)-不明原因
  - 多人互通场景(iOS/Android与小程序互通),小程序播放有破音
  - 断网重连后，有一定概率加入房间没反应
    - 断网后，http请求发送pending，造成小程序线程阻塞，并且无回包，需要SDK处理，定时器超时主动abort
  - 一些安卓机型如oppo，切后台再切回，iphone有变声，如怪物史莱克
  - 小程序oppo反复进出房间，有40%概率出现花屏
  - 断网重连功能，大部分业务是不在sdk里的，开发者接入门槛很高。
    - 即SDK只能涵盖断网重连40%的功能，其余60%都是业务层做。建议小程序sdk插件化
WebRTC+教学白板-SDK X2
  - 长时间在房间内，会失去心跳，房间莫名其妙403/互动直播中，webrtc主播或连麦者出现忽然收不到heart ack的问题
    - 服务端暂时无解
H5音视频-SDK
  - VP8/H.264问题
  - PC-Android浏览器互通，点对点视频，Android端在pc端画面卡住，声音停顿
  - 音频对话，移动端（ios & Android nrtc）--火狐（61）互通失败
  - 点对点连接进入Android - ios 出现无音，无画面的异常
  - 多人视频，PC（Chrome）-- Android（chrom） Android做主播，拉流失败
  - PC-iOS浏览器互通成功，ios端摄像头切换功能不可使用
  - web demo和手机端登录同一个帐号，一端发起webrtc通话，手机端接通，然后webrtc再接通，发起端demo崩溃
小程序+IM-Demo
  - 群组多人音视频产品逻辑问题，呼叫加入频道，退出后再加入，cid不一致
    - 群组音视频这块应该怎么实现? 通过呼叫方式是否合理? 可以通过独立信令邀请的方式进行
在线教育DEMO
  - Chrome71，音频流没有发出去，问题定位中。。。





