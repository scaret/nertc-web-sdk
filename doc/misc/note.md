
# 消息 msg
- 抄送和过滤
    - 抄送走的是原有协议，只对原有协议有效；过滤走的是新协议，只对新协议有效；所以如果设置了过滤，那么会走新协议，抄送自然会失效
    - 抄送 cc
        - 如果设置了为true，此消息会抄送给第三方服务器。
        - 如果设置了为false，此消息不会抄送给第三方服务器。
        - 不过不设置，那么会有一个默认的APP级别的配置。
        - 不管此参数如何设置，云信服务器都会将消息发给接收者。
    - 过滤 filter
        - 如果设置了为true，那么云信服务器收到此消息后不会发送给接收者，会转发给第三方服务器，由第三方服务器决定接下来的处理逻辑。
        - 如果不设置，那就是false，就是正常的消息流程。
- idServer只给你标记已读时使用，漫游消息是不需要标记已读的，所以没有idServer

# 自定义消息

- 自定义消息是我们要存到消息数据库，展示到聊天记录里面的。7-7是SDK完全透传，不存，不解析，所有处理都是第三方app的事情。7-3可以用来做猜拳，贴图一类的消息，7-7可以用来做好友邀请一类的事情

# roaming

- 线上漫游要等性能测试做完再开


# 各种获取数据的接口

- 从服务器获取数据的接口
    - getHistoryMsgs
- 增量接口，增量从服务器获取
    - getRelations
    - getFriends
    - getTeams
    - getTeamMembers
- 混合接口，支持数据库的话走数据库，否则从服务器获取
    - getMyInfo/getUser/getUsers
    - getTeam
- 获取本地数据的接口
    - getLocalTeams
    - getLocalSessions
    - getLocalMsgs
    - searchLocalMsgs
    - getLocalMsgByIdClient
    - getLocalMsgsByIdClients
    - getLocalSysMsgs
- 删除本地数据的接口
    - deleteLocalMsg 单个或多个
    - deleteLocalMsgsBySession
    - deleteAllLocalMsgs
    - deleteLocalSession 单个或多个
    - deleteLocalSysMsg 单个或多个
    - deleteAllLocalSysMsgs
    - deleteLocalTeam 单个或多个
- 更新本地数据的接口
    - updateLocalSession
    - updateLocalMsg
    - updateLocalSysMsg
