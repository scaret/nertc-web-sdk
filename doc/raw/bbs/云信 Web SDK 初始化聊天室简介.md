初始化云信 Web SDK 聊天室有两个步骤
- 获取聊天室服务器地址, 有两种方式可以获取聊天室服务器地址
    - [从服务器获取聊天室服务器地址](http://dev.netease.im/docs/product/IM即时通讯/服务端API文档?#请求聊天室地址), 请参考 demo 来查看具体的做法, 简单来说就是开发者通过自己的服务器向云信服务器查询想要进入的聊天室的服务器地址.
    - 如果开发者同时使用了 Web SDK 的 IM 功能, 那么可以调用 IM 的接口来获取聊天室服务器地址

```javascript
nim.getChatroomAddress({
    chatroomId: 'chatroomId',
    done: getChatroomAddressDone
});
function getChatroomAddressDone(error, obj) {
    console.log('获取聊天室地址' + (!error?'成功':'失败'), error, obj);
}
```

- 拿到地址之后, 就可以初始化聊天室了
