
function startZEGO() {
  console.warn('开启 ZEGO')
  this.localStoragePrefix = 'ZEGO-'
  loadEnv()
  init()

  this.dumpParams = {
    dumpMediaType: '',
    DUMP_SIZE_MAX: 10000000,
    dumpStartAt: 0,
    dumpEndAt: 0,
    dumpKey: 0,
    dumpDelta: 0,
    dumpBuffer: []
  }
}

function loadEnv() {
  this.roomId = window.localStorage
    ? window.localStorage.getItem(`${this.localStoragePrefix}channelName`)
    : ''
  $('#channelName').val(roomId)
  this.userId = '' + Math.floor(Math.random() * 9000 + 1000)
  $('#uid').val(this.userId)
}

function init() {
 let appID = 1807888605
 let server = 'wss://webliveroom1807888605-api.imzego.com/ws'

  this.zg = new ZegoExpressEngine(appID, server);
  installEventHandlers()
}

function installEventHandlers() {
  this.zg.on('roomStateChanged', (roomID, reason, errorCode, extendData) => {
    if (reason == 'LOGINING') {
        // 登录中
    } else if (reason == 'LOGINED') {
        // 登录成功
        //只有当房间状态是登录成功或重连成功时，推流（startPublishingStream）、拉流（startPlayingStream）才能正常收发音视频
        //将自己的音视频流推送到 ZEGO 音视频云
    } else if (reason == 'LOGIN_FAILED') {
        // 登录失败
    } else if (reason == 'RECONNECTING') {
        // 重连中
    } else if (reason == 'RECONNECTED') {
        // 重连成功
    } else if (reason == 'RECONNECT_FAILED') {
        // 重连失败
    } else if (reason == 'KICKOUT') {
        // 被踢出房间
    } else if (reason == 'LOGOUT') {
        // 登出成功
    } else if (reason == 'LOGOUT_FAILED') {
        // 登出失败
    }
  });

//房间内其他用户进出房间的通知
//只有调用 loginRoom 登录房间时传入 ZegoRoomConfig，且 ZegoRoomConfig 的 userUpdate 参数为 “true” 时，用户才能收到 roomUserUpdate回调。
  this.zg.on('roomUserUpdate', (roomID, updateType, userList) => {
    if (updateType == 'ADD') {
      for (var i = 0; i < userList.length; i++) {
        console.log(userList[i]['userID'], '加入了房间：', roomID)
      }
    } else if (updateType == 'DELETE') {
      for (var i = 0; i < userList.length; i++) {
        console.log(userList[i]['userID'], '退出了房间：', roomID)
      }
    }
  });

  this.zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
      // 房间内其他用户音视频流变化的通知
  });

  this.zg.on('roomStateChanged', async (roomID, reason, errorCode, extendedData) => {
      // 房间状态变化的通知
  })
}

async function joinRoom() {
  this.roomId = parseInt(document.querySelector('#channelName').value)
  if (window.localStorage) {
    window.localStorage.setItem(`${localStoragePrefix}channelName`, this.roomId)
  }
  getToken()

  this.zg.loginRoom(this.roomID, this.token, { userID, userName: this.userID }, { userUpdate: true }).then(result => {
    if (result == true) {
      console.log("login success")
    }
  });
}

async function leaveRoom() {
  
}
function getToken() {
  const appID = 1807888605
  const serverSecret = 'bb20b661d6a800156226122fd02bcd06';// type: 32 byte length string

  // 请将 userId 修改为用户的 userId
  const userId = this.userID;// type: string

  const effectiveTimeInSeconds = 3600; //type: number; unit: s； token 过期时间，单位：秒

  //生成基础鉴权 token时，payload 要设为空字符串
  const payload = '';
  // Build token
  const token =  generateToken04(appID, userId, serverSecret, effectiveTimeInSeconds, payload);
  console.log('token:',token);
}



document.getElementById('startCall').onclick = async function () {
  document.getElementById('startCall').style.backgroundColor = '#0d66ff'
  await startBasicCall()
}

document.getElementById('finishCall').onclick = async function () {
  document.getElementById('startCall').style.backgroundColor = '#efefef'
  await finishBasicCall()
}

async function startBasicCall() {
  await joinRoom()
}

async function finishBasicCall() {
  await leaveRoom()
}
