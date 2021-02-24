# webview

在互动白板 1.0 版本，白板的实现都是各端实现的，开发新的功能需要 4 端同时开发完成。在 2.0 版本，采用 webview 方案实现跨平台方案。

webview 的示例代码可以看[github 上的仓库](https://github.com/netease-im/WhiteBoard_SampleCode)

## 兼容性

需要 iOS 10 及以上，Android 的 webview 至少 39 以上，PC 的 CEF 至少 chromium/49 以上。

## 接入指南

因为 webview 也相当于是 Web 端，所以需要在云信管理后台开启允许多端登录。

webview 需要写好一个 html 页面，然后加载对应的 js 代码，js 代码里重要的是包含`NIM_Web_NIM_v7.1.0.js` , `NIM_Web_WhiteBoard_v7.1.0.js`，和 `webview.2.0.0.js`，可以参考上面 github 仓库里的示例。

开发者可以将 webview 部署到自己的域名下，然后在原生端，只需要使用 webview 载入这个 URL 就可以接入了。

## 移动端适配

1. iOS 端需要设置允许视频 inline 播放，允许不经用户交互自动播放。由于 iOS 端限制了 web 在同一时间只能有一个视频播放，所以建议在 iOS 端回放的时候，只传入一个视频文件
2. 建议不要让 webview 组件的大小改变，防止使用文字工具的时候拉起输入法导致界面变化。

## Webview 接入流程

1. Webview 页面指向 测试地址或线上地址的 url。（注意不要启用缓存）
2. Native 端暴露 jsBridge,供 webview 中的页面调用，会返回事件和参数给 native 端
3. Native 端根据事件阶段和参数，调用 webview 页面中的 window.WebJSBridge，传入 JSON 格式的参数。

- sdk + wbsdk + drawplugin
- 检测 onload
  - 通知 web/ios/aos/pc
  - web/ios/aos/pc 通知互动信息|回放信息

### webview 封装 jsbrige 统一方法

1. native 在 web 的 window 全局对象中注册 NativeFunction 供 web 使用, 参数为 json 字符串（无再次嵌套 json 字符串）
   - 比如 web 加载好后通知 native 时这样调用 `window.NativeFunction('{"action":"webPageLoaded","param":{}}')`
   - json 字符串第一层的 action 为 触发行为， param 为 依赖参数
1. web 在 window 全局对象中注册 WebJSBridge 方法供 native 使用，参数为 json 字符串（无再次嵌套 json 字符串）
   - 比如 web 加载好后 native 通知 web 登录时这样调用 `window.WebJSBridge('{"action":"webLoginIM","param":{"debug": true,"appKey": "aaaa"}}')`
   - json 字符串第一层的 action 为 触发行为，param 为 依赖参数
1. 如果端不需要某些回调函数，即不需要通过这些回调进行额外的 UI、业务处理等，就不用暴露（处理）相应的 action

### 相关操作流程

1. webview 载入页面，页面需要通知 native 已完成加载，web 调用（native 暴露的）页面加载完成回调 action=`webPageLoaded`，param=`{}`
   - native 暴露 action=`webPageLoaded`
1. native 收到 action=`webPageLoaded` 通知，调用 web 登录 action=`webLoginIM`，参数如操作流程下方(如果是录制回放，请往下翻，翻到录制回放章节)

   - native 暴露 im 登录成功 action=`webLoginSucceed`，param=`{}`
   - native 暴露 im 登录失败 action=`webLoginIMFailed`，param=`{code: '', msg '' }`

   1. web 登录成功后根据登录参数 `identity`=`owner` 时创建房间，如果房间已存在则加入房间，其他情况创建失败通知
      - web 创建、加入房间成功，web 调用 native action=`webJoinWBSucceed`, param=`{account:'cs1', cid:1123123, uid:42342234}`
      - native 暴 action=`webCreateWBFailed`，param=`{code: '', msg '' }`
        1. web 创建、加入房间成功，web 调用 native action=`webJoinWBSucceed`, param=`{}`
        2. 再次创建失败同样调用 native 的 action=`webCreateWBFailed`，param=`{code: '', msg '' }`
   1. web 登录成功后根据登录参数 `identity`=`normal` 时加入房间，加入失败通知 native
      - web 加入房间成功，web 调用 native action=`webJoinWBSucceed`, param=`{}`
      - native 暴露 action=`webJoinWBFailed`，param=`{code: '', msg '' }`
        1. web 加入房间失败，native 需要再次加入新的房间名，调用 action=`webJoinNewWBF`，param=`{ channelName: '' }`
        2. 再次加入失败同样调用 native 的 action=`webJoinWBFailed`，param=`{code: '', msg '' }`

1. native 收到 action=`webWBWorkerInited`后可以设置白板可用/不可用，native 调用 web action=`enableDraw`，param=`{ enable: true / false }`
1. native 收到 action=`webToolbarCustomEvent`后, 表示 toolbar 上自定义的按钮可以点击了，param=`{ eventName: "selectDoc" }`, 这个`selectDoc`是用户自己传入的。与之对应的关闭文档的事件名称是 `closeDoc`
1. 设置白板字体大小，native 调用 action= `setFontsize`，param=`{ fontsize: 23 }`
1. 设置白板画笔大小，native 调用 action= `setSize`，param=`{ size: 23 }`
1. 设置白板颜色，native 调用 action= `setColor`，param=`{ color: "#234234" }`
1. 设置白板使用的工具，native 调用 action= `setTool`，param=`{ tool: "free" }` , 可以使用的工具名称，请看附录 1 中的单词
1. 设置白板 ppt-img / ppt-h5 链接，native 调用 action= `setFileObj`，param=~~`{ url: '' }`~~ `{ xxx: xxx, xxx: xxx }`
1. 清除白板 ppt-img / ppt-h5 链接，native 调用 action= `clearFile`
1. 清除白板区域，native 调用 action= `clearCanvas`, 收到自定义的清除指令后，也要调用这个去清除

```
{
  type: "h5", // 文档类型: h5 / img
  docId: 'xxxx', // 文档ID
  pageCount: 23, // 文档总页数
  currentPage: 1, // 不传默认为 1
  url: 'http://xxxxx.com/ppt/index.html', // html 链接
  // url: "http://nos.com/8009dadc9e4_2_1.jpg", // img 链接
  // urlStr: "http://nos.com/8009dadc9e4_2_{index}.jpg" // img 翻页动态替换链接，不传根据各个端 nos 文件对象自动生成
}
```

1.  白板重连
    - native 暴露 action=`webReconnect`，param=`{}`
1.  白板重连成功
    - 同样调用 native 的 action=`webLoginSucceed`，param=`{}`
1.  其他异常情况
    - native 暴露 action=`webError`，param=`{code: '', msg '' }`
1.  退出 web 登录 native 调用 action=`webLogout`，param=`{}`

##### web im 白板 登录参数：

```javascript
{
    channelName: '一般是聊天室id', // 白板房间名称 为 唯一值，业务层维护，用来创建、加入房间
    debug: true, // 开启 web 调试日志
    appKey: 'aaaa', // IM 账号体系 appKey
    account: 'aaaa', // IM 账号体系 account
    token: 'aaaa', // IM 账号体系 密码
    record: true, // 是否服务端录制
    identity: 'owner', // 登录账号身份：白板创建'owner'去创建房间，如果房间存在则加入房间，其他成员'normal'加入房间。 两种身份初默认都是不可以绘画，需要调用 action=`enableDraw`开启绘画权限。
    ownerAccount: '', //   ownerAccount 参数，owner 账号

    tools: {
      customClear: false, // 是否手动调用清除，如果设置为true，可以在customEvent里收到用户点击了清除,事件名是‘clear’，然后展示弹窗
      toolbar: [
        'flag', 'free', 'text', 'fill',
        { type: 'shapes', items: ['line', 'rect', 'circle'] },
        { type: 'formats' },
        'erase', 'undo', 'redo', 'clear',
        { type: 'customTXT', label: '文档库', eventName: 'selectDoc' } ,//这个文档库，观众可以不用传输这一项； 工具条关闭文档的自定义事件名称是，closeDoc
      ]
    }, // 回放模式时不显示工具箱可不传; 具体object内容先忽略，对象形式；设置工具箱（展示哪些）和工具箱样式（自定义颜色、icon宽高大小、自定义icon图片地址、背景颜色）
}


// 移动端可以使用
 {
   tools:{
     toolbar:[
       'free', 'text',
       {type:'shapes', items:['line','rect','circle']},
       'erase', 'undo','clear',
       { type: 'customTXT', label: '文档库', eventName: 'selectDoc' } // 这个学生端不需要传入
     ]
   }
 }
```

以上传递给 Webview 页面的参数中，tools 是用来配置工具条的。


`tools`是一个工具栏配置参数，可以参考插件 2.0 章节里的参数设置。

#### 录制回放 Webview 的使用流程

1. webview 载入页面，页面需要通知 native 已完成加载，web 调用（native 暴露的）页面加载完成回调 action=`webPageLoaded`，param=`{}`
   - native 暴露 action=`webPageLoaded`
1. native 收到 action=`webPageLoaded` 通知，调用 web 登录 action=`webReplayInit`，参数如操作流程下方

   - native 暴露 回放初始化失败 action =`webReplayInitFailed` ,param=`{code: number,msg: string}`
   - native 暴露 im 登录成功 action=`webLoginSucceed`，param=`{}`
   - native 暴露 im 登录失败 action=`webLoginIMFailed`，param=`{code: '', msg '' }`

1. native 收到 action=`webReplayError` , param=`{ message: '错误信息', code: 1001 }`
1. native 收到 action=`webReplayEvent` , param=`{ eventName: "ready", duration: number }`后，可以 native 调用 web action=`webReplayDoPlay`
1. native 收到 action=`webReplayEvent` , param=`{ eventName: "play"}`后，表明当前开始播放
1. native 收到 action=`webReplayEvent` , param=`{ eventName: "pause"}`后，表明当前已暂停
1. native 收到 action=`webReplayEvent` , param=`{ eventName: "tick" , time: number}`后， 表明当前播放器在播放中的计时器的当前时间
1. native 上会收到好多种 action=`webReplayEvent`, param=`{ eventName: "finished" }`,表明当前计时器已经播放完毕了

```json
// 回放录制需要传递的参数
{
  // imConfig 只有在兼容旧版本的时候是必选参数
  "imConfig": {
    "account": "cs",
    "appKey": "xxxxxxxxxxxxx",
    "token": "password"
  },
  "isCompatible": false, // 回放是否采用兼容模式， 录制文件如果是在旧版本的SDK上录制的，需要开启这个；新白板的录制不需要设置这个，
  "account": "usperUser", // player以谁的角度去看，现在没有什么用处
  "files": [
    // 这个files是一个数组，数组子项是类似结构的对象
    {
      "account": "cs1", // 这个录制文件的account是谁
      "url": "https://some.secret.url/", // 这个是录制文件的url，可以跨域下载到的url
      // 后面六个属性都是使用正则从nim抄送的录制文件的地址里使用正则提取出来的
      // /(\d+)-(\d+)-(\d+)-(\d+)(-mixed)?\.(mp4|aac|flv|gz)$/i
      "uid": "234", //string match[1]
      "cid": "234", //string- match[2]
      "timestamp": 153344555, //int- match[3]
      "chunk": 1, // int -  match[4]
      "mixed": false, // boolean - match[5]
      "type": "gz" //string- match[6]
    }
  ]
}
```
