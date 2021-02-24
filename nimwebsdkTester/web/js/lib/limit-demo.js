
// 频率设置 x/y/z，表示在x秒内允许最多调用y次请求，超过后惩罚z秒

// 过滤控制台日志
// 416(.|\s)*?from:\s"local"

var counter = 60 + 10
while (counter > 0) {
  counter--
}

// 发消息 60/300/60
// 大约 3700 条日志
var counter = 300 + 10
while (counter > 0) {
  counter--
  nim.sendText({
      scene: 'p2p',
      to: 'zyy2',
      text: 'hello',
      done: sendMsgDone
  });
  function sendMsgDone(error, msg) {
      console.log('发送' + msg.scene + ' ' + msg.type + '消息' + (!error?'成功':'失败') + ', id=' + msg.idClient, error, msg);
  }
}

// 查询用户名片 60/3000/60
// 大约 15000 条日志
var counter = 3000 + 10
while (counter > 0) {
  nim.getUser({
      account: 'zyy1',
      sync: true,
      done: getUserDone
  });
  function getUserDone(error, user) {
      console.log('获取用户名片' + (!error?'成功':'失败'), error, user)
  }
  counter--
}

// 获取群信息 60/1000/60
// 大约 2000 条日志
var counter = 1000 + 10
while (counter > 0) {
  nim.getTeam({
    teamId: '16552',
    sync: true,
    done: getTeamDone
  });
  function getTeamDone(error, obj) {
    console.log('获取群' + (!error?'成功':'失败'), error, obj);
  }
  counter--
}

// 更新好友 60/1000/60
// 大约 4000 条日志
var counter = 1000 + 10
while (counter > 0) {
  nim.updateFriend({
    account: 'zyy2',
    alias: '222',
    done: updateFriendDone
  });
  function updateFriendDone(error, obj) {
    console.log('更新好友' + (!error?'成功':'失败'), error, obj);
  }
  counter--
}

// 语音转文字 60s 60 次
// 大约 200 条日志
var counter = 60 + 10
while (counter > 0) {
  nim.audioToText({
    url: 'http://nimtest.nos.netease.com/MTAxMTAxMA==/bmltYV8xMTQwMzFfMTQzNTMwMjM3NTY5NF83NmVlNDc0MC0xMjY4LTQyMTAtYjBhYS0zNDBhOTg4YjdjMzU=',
    done: function (error, obj) {
      console.log('语音转文字' + (!error ? '成功' : '失败'), error, obj)
    }
  })
  counter--
}

// 发送聊天室消息 60/300/60
// 大约 1000 条日志
var counter = 300 + 10
while (counter > 0) {
  counter--
  var msg = chatroom.sendText({
      text: 'hello',
      done: sendChatroomMsgDone
  });
  function sendChatroomMsgDone(error, msg) {
      console.log('发送聊天室' + msg.type + '消息' + (!error?'成功':'失败') + ', id=' + msg.idClient, error, msg);
  }
}

// 查询聊天室成员名片 60/300/60
// 大约 1000 条日志
var counter = 300 + 10
while (counter > 0) {
  chatroom.getChatroomMembersInfo({
      accounts: ['zyy1'],
      done: getChatroomMembersInfoDone
  });
  function getChatroomMembersInfoDone(error, obj) {
      console.log('获取聊天室成员信息' + (!error?'成功':'失败'), error, obj)
  }
  counter--
}
