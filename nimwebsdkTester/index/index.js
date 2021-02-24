// index.js
var util = require('../../utils/util.js')
var pushLog = util.pushLog

const SDK = require('../../nim/NIM_Web_SDK_weixin.js')
// const SDK = require('../../nim/NIM_Web_SDK_weixin_v6.6.6.js')
const NIM = SDK.NIM
const Chatroom = SDK.Chatroom
// 获取应用实例
const app = getApp()
console.log('page index init')
Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    status: 'NIM INIT',
    chatroomStatus: 'Chatroom INIT',
    sessionIds: '',
    updateIds: '',
    logs: []
  },
  onLoad: function () {
    console.warn(new Date(), 'page onload')
  },
  onShow () {
    console.warn(new Date(), 'page show')
    this.rebuild()
    // this.connect()
    // console.log(this)
  },
  onHide () {
    console.warn(new Date(), 'page hide')
    this.destroy()
    // this.disconnect()
  },
  // 事件处理函数
  bindViewTap: function () {
    // wx.navigateTo({
    //   url: '../logs/logs'
    // });
  },
  writeLog: function (text) {
    text = new Date().toString().slice(15, 24) + ' ' + text
    var logs = this.data.logs
    logs.push(text)
    this.setData({
      logs: logs
    })
  },
  initNIM: function () {
    var that = this
    that.setData({
      status: 'NIM CONNECTING'
    })
    that.amendConsole()
    that.nim = NIM.getInstance({
      debug: true,
      // logFunc: function() {
      //   const args = [].slice.call(arguments, 0);
      //   pushLog(JSON.stringify(args));
      //   console.log.apply(console, args);
      // },
      // appKey: '45c6af3c98409b18a84451215d0bdd6e',
      appKey: 'fe416640c8e8a72734219e1847ad2547',
      account: 'cs1',
      token: 'e10adc3949ba59abbe56e057f20f883e',
      // appKey: "728539460100ee8e093eed7cd7b0f1cf",
      // account: "da29138590724357a7a95fd454df8031",
      // token: "d40e6dcb",
      reconnectionAttempts: 3,
      syncSessionUnread: true,
      onwillreconnect () {
        wx.showToast({
          title: 'NIM will reconnect',
          duration: 2000
        })
        that.writeLog('nim::onwillreconnect')
      },
      ondisconnect (error) {
        that.setData({
          status: 'NIM DISCONNECTED'
        })
        that.writeLog('nim::ondisconnect')
        console.error('IM链接断开', error)
      },
      onconnect () {
        const chatroomId = 3001
        that.writeLog('nim::onconnect')
        that.setData({
          status: 'NIM SYNCING'
        })
        return
        that.nim.getUser({
          account: 'test2',
          sync: true,
          done: function (err, cnt) {
            console.log('get user', err, cnt)
          }
        })
        that.nim.getChatroomAddress({
          chatroomId: chatroomId,
          done: getChatroomAddressDone
        })
        function getChatroomAddressDone (error, obj) {
          console.log('获取聊天室地址' + (!error ? '成功' : '失败'), error, obj)
          // var chatroomAddresses = obj.address
          // that.initChatroom(chatroomId, chatroomAddresses)
        }
      },
      onsyncdone () {
        that.writeLog('nim::onsyncdone')
        that.setData({
          status: 'NIM SYNC_DONE'
        })
        pushLog('sync done')
        wx.showToast({
          title: 'SYNC_DONE',
          duration: 2000
        })
      },
      onmsg: function (msg) {
        that.writeLog('nim::onmsg ' + msg.target + '-' + msg.text)
        const args = [].slice.call(arguments, 0)
        pushLog(JSON.stringify(args))
      },
      onsessions: function (s) {
        console.log('收到会话列表', s)
        var ids = s.map(item => item.id + '(' + item.unread + ')')
        that.writeLog('nim::onsessions ' + ids.join(' '))
      },
      onupdatesession: function (s) {
        console.log('会话更新了', s)
        if (s.id) {
          var str = s.id + '(' + s.unread + ')'
          that.writeLog('nim::onupdateSession ' + str)
        }
      },
      onerror (event) {
        that.setData({
          status: 'NIM ERROR' + JSON.stringify(event)
        })
        that.writeLog('nim::onerror ' + JSON.stringify(event))
        // that.nim.disconnect()
        // that.nim.connect()
      }
    })
  },
  initChatroom: function (chatroomId, chatroomAddresses) {
    var that = this
    that.setData({
      chatroomStatus: 'CHATROOM CONNECTING'
    })
    var chatroom = (that.chatroom = Chatroom.getInstance({
      debug: false,
      // transports: ['websocket'],
      appKey: 'fe416640c8e8a72734219e1847ad2547',
      account: 'wujie',
      token: 'e10adc3949ba59abbe56e057f20f883e',
      chatroomId: chatroomId,
      chatroomAddresses: ['wlnimsc1.netease.im'],
      onmsgs: function (datas) {
        console.log('聊天室', datas)
      },
      onconnect: function (params) {
        console.log('聊天室链接成功')
        that.setData({
          chatroomStatus: 'CHATROOM CONNECTED'
        })
      },
      ondisconnect: function (error) {
        console.error('聊天室链接断开', error)
        that.setData({
          chatroomStatus: 'CHATROOM DISCONNECTED'
        })
      }
    }))
  },
  amendConsole () {
    console.foo = function () {
      const args = [].slice.call(arguments, 0)
      pushLog(JSON.stringify(args))
    }
  },
  destroy () {
    if (this.nim) {
      this.nim.destroy({
        done: function () {
          console.log('destroy nim done !!!')
        }
      })
      this.nim = null
    }
    if (this.chatroom) {
      this.chatroom.destroy({
        done: function () {
          console.log('destroy chatroom done !!!')
        }
      })
      this.chatroom = null
    }
  },
  rebuild () {
    if (!this.nim) {
      this.initNIM()
    }
    // if (!this.chatroom) {
    //   this.initChatroom(3001)
    // }
  },
  connect () {
    if (!this.nim) {
      this.initNIM()
    } else {
      this.nim.connect()
    }
    // if (!this.chatroom) {
    //   this.initChatroom(3001)
    // } else {
    //   this.chatroom.connect()
    // }
  },
  disconnect () {
    wx.showToast({
      title: 'Disconnect',
      duration: 2000
    })
    if (this.nim) {
      this.nim.disconnect({
        done: function () {
          console.log('nim really disconnected')
        }
      })
    }
    if (this.chatroom) {
      this.chatroom.disconnect({
        done: function () {
          console.log('chatroom really disconnected')
        }
      })
    }
  },
  bindInputText (e) {
    this.setData({
      text: e.detail.value
    })
  },
  sendText () {
    var that = this
    console.log(123333333333333333333)
    that.nim.sendText({
      scene: 'p2p',
      to: 'test2',
      text: that.data.text,
      done (error, msg) {
        pushLog('send smg done')
        pushLog(error)
        pushLog(msg)
      }
    })
    // that.chatroom.sendText({
    //   text: that.data.text,
    //   done (error, msg) {
    //     pushLog('send smg done')
    //     pushLog(error)
    //     pushLog(msg)
    //   }
    // })
  },
  sendImage: function () {
    var that = this
    wx.chooseImage({
      count: 1,
      success: function (res) {
        // that.setData({
        //   path: res.tempFilePaths[0]
        // })
        that.nim.sendFile({
          to: 'greatcs',
          scene: 'p2p',
          type: 'image',
          uploadprogress: (e) => {
            pushLog('上传进度'+ e)
            console.log('上传进度', e)
          },
          filePath: res.tempFilePaths[0],
          done (err, data) {
            console.log('send file done', err, data)
          }
        })
      }
    })
  },
  // doSendImage: function () {
  //   var that = this
  //   console.log(that.data.path)
  //   this.nim.sendFile({
  //     to: 'greatcs',
  //     scene: 'p2p',
  //     type: 'image',
  //     uploadprogress: (e) => {
  //       console.log('上传进度', e)
  //     },
  //     filePath: that.data.path,
  //     done(err, data) {
  //       console.log('send file done', err, data)
  //     }
  //   })
  // }
})
