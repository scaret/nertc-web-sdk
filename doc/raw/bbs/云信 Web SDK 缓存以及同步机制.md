缓存
- 浏览器本身有很多种缓存数据的方式, cookie/localStorage/sessionStorage/WebSQL/IndexedDB, 从稳定性和既有标准出发, 云信 Web SDK 选择使用 IndexedDB 来存储数据.
- 那么就会有一个问题, 有的浏览器支持 IndexedDB, 有的浏览器不支持.
- 所以 Web SDK 会进行检测, 在支持 IndexedDB 的浏览器上, Web SDK 会将收到的数据缓存到浏览器中, 在不支持 IndexedDB 的浏览器上, Web SDK 不会缓存收到的数据.
- 开发者不需要关心缓存存在哪里, 或者 Web SDK 什么时候将数据存到缓存里面.

同步
- 初始化 Web SDK 后, Web SDK 会跟服务器建立连接, 建立连接之后会马上进行同步, 开发者会依次收到 onconnect 和 onsyncdone 回调, 分别代表连接成功和同步完成.
- 在 onconnect 和 onsyncdone 回调中间, 开发者会收到很多同步数据的回调, 比如说
    - onblacklist 回调用于接收同步到的黑名单
    - onfriends 回调用于接收同步到的好友
    - onteams 用于接收同步到的群列表
    - onsessions 用于接收同步到的会话
    - 还有很多其他同步数据的回调, 完整列表请查阅开发手册
- 有几点说明
    - 这些同步数据的回调的顺序是不保证的.
    - 此外如果没有某个回调, 说明对应的数据没有或者没有更新.
    - 所以安全的做法是先初始化数据, 然后在同步数据的回调里面将收到的数据存起来, 最后在 onsyncdone 回调之后进行 UI 的渲染.
    - 此外要注意的是, 同步数据的回调有可能会被调用多次, 比如说网络断了, 然后在一段时间之后又恢复了, 因为 Web SDK 有自动重连机制, 在网络恢复之后 Web SDK 会自动进行连接和同步, 此时如果有同步到数据, 那么就会调用相应的回调函数. 所以安全的做法是, 将所有同步都当做增量同步, 把每次同步到的数据都合并到现有的数据里面, 当然 Web SDK 提供了一系列用于合并数据的接口, 请查阅相应章节的开发手册.
- 拿会话列表来举个例子

// 初始化数据
var data = {
    // 将会话列表初始化为空数组
    sessions: []
}
var nim = NIM.getInstance({
    // 假如有此回调, 那么将接收到的数据跟已有数据合并; 假如没有此回调, 说明没有会话列表, 或者会话列表没有更新
    onsessions: function (sessions) {
        data.sessions = nim.mergeSessions(data.sessions, sessions);
    },
    onsyncdone: function () {
        // 此时会话列表肯定是完整的, 在这里开始进行 UI 的渲染工作
    }
})
