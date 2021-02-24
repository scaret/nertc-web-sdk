# 小程序开发常见问题

以下是一些需要小程序音视频开发需要注意的事项，随着小程序的迭代，下面的问题可能已经解决了。

## 断线重连慢

断线后，小程序连接WebSocket的有一个默认超时时间，默认是60秒。断线后，小程序创建 WebSocket 连接不能马上返回网络连接错误，需要过了超时时间后，小程序才会向上抛出网络连接错误，导致SDK需要等待60秒后才能进行第二次重连。

建议配置小程序项目配置app.json文件里的WebSocket超时时间为10秒或更短。具体参见[关于networkTimeout](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html#networkTimeout)。

小程序切换至后台后，再切换回前台，如果超时时间过长，将会导致在超时事件触发前，不会进行重连，而要等到超时时间结束后，才会报错进行第二次重连。 

```javascript
{
  ...
  "networkTimeout": {
    "connectSocket": 10000
  },
  ...
}
```

## 声音断断续续

可能的原因是`<live-player ></live-player>`上的 `max-cache` 设置得过小导致的，建议修改为:

- `min-cache` 设置为0.2
- `max-cache` 设置为0.8

## 声音有5至8秒的延迟
音视频通话模式（开关摄像头/麦克风）切换后，可能存在5-8秒的延迟：<br/>
 - 有段时间，小程序通过`setData`改变值来控制`live-pusher`组件的`enable-camera`属性来实现纯音频通话（关闭摄像头）或音视频通话（打开摄像头），会导致对端接收到的视频画面和音频不同步，有延迟。
 - 后来采用的方法是手动控制`live-pusher`组件进行推流或者停止推流，该种方案下建议将`autopush`属性设置为`false`。<br/>

因此，对开发者而言要么使用`autopush`来自动控制音视频的媒体推流，要么手动调用 `livePusherContext` 上的 `start` 和 `stop` 方法来控制推流。[小程序demo](https://github.com/netease-im/NIM_Web_Weapp_Demo)里的用法是后者。

此外，微信（安卓）7.0.6及之前版本在音频通话模式下可能存在延迟问题，请及时升级至7.0.7版本及之后版本。