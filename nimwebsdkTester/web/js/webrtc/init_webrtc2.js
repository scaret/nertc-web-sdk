
const globalConfig = window.globalConfig = {
  env: 'DEV',
  inited: false,
  localViewConfig: {  // 本地视频容器尺寸
    width: 160,
    height: 120,
    cut: false // 默认不裁剪
  },
  remoteViewConfig: { // 远程视频容器尺寸
    width: 160,
    height: 120,
    cut: false // 默认不裁剪
  }
}

var WEBRTC2_ENV = {
  DEV: {
    appkey: "eca23f68c66d4acfceee77c200200359", //"eca23f68c66d4acfceee77c200200359","be8648374778fdfc3e445d5a0aac0c3b"
    token: ""
  },
  PROD: {
    appkey: "6acf024e190215b685905444b6e57dd7",
    token: ""
  }
};

const roomconfig = document.querySelector('select#roomconfig');
var debugContentNode = $('#debug-content').get(0)
var subList = $('#subList').get(0) //订阅列表 
var currentSpeaker = {}
// 添加日志
function addLog(info) {
  var temp = JSON.stringify(info)
  debugContentNode.innerHTML = `<p>${temp}</p>` + debugContentNode.innerHTML
}

window.rtc = {
  client: null,
  joined: false,
  published: false,
  localStream: null,
  remoteStreams: {},
  params: {},
  subListInfo: {},
  succTasksList: [],
  failTasksList: [],
  confTaskList: [],
  videoSource: null,
  audioSource: null
}

/** 
 * ----------------------------------------
 *              环境配置部分
 * ----------------------------------------
*/
// 获取大白测试页环境
function loadEnv() {
  const env = globalConfig.env = $('#part-env input[name="env"]:checked').val()
  $('#appkey').val(WEBRTC2_ENV[env].appkey)
  $('#token').val(WEBRTC2_ENV[env].token)
  $('#uid').val(Math.ceil(Math.random() * 1e4))
  //$('#channelName').val(Math.ceil(Math.random() * 1e10))
  const channelName = window.localStorage ? window.localStorage.getItem("channelName") : "";
  $('#channelName').val(channelName)
  // 读取url中配置的初始参数
  let query = _parseQuery(location.search);
  if (query) {
    if (query.channelName) { $('#channelName').val(query.channelName); }
  }
  init()
}

$('input[name="env"]').on('click', () => {
  loadEnv()
})

$('#setAppkey').on('click', () => {
  console.log('更新 appkey')
  init()
})

$('#config').on('click', () => {
  if ($("#sessionConf").css("display") == 'none') {
    $("#sessionConf").css("display", 'block')
  } else {
    $("#sessionConf").css("display", 'none')
  }
})

$('input[name="mode"]').on('click', () => {
  const mode = $('#part-env input[name="mode"]:checked').val()
  console.log('频道模式: ', mode)
  rtc.client.setChannelProfile({mode})
})

loadEnv()

function init() {
  if (globalConfig.inited) {
    /*addLog('已经初始化过了，刷新页面重试!!')
    console.error('已经初始化过了，刷新页面重试!!')
    return*/
    rtc.client.destroy()
    WebRTC2.destroy()
  }
  globalConfig.inited = true
  addLog('初始化实例')
  const appkey = $('#appkey').val()
  const token = $('#token').val() || ''
  const chrome = $('#part-env input[name="screen-type"]:checked').val()
  rtc.client = WebRTC2.createClient({
    appkey,
    token,
    debug: true,
  })
  initDevices()
  initEvents()
  initVolumeDetect()
}

function initDevices() {
  WebRTC2.getMicrophones().then((data) => {
    var info = JSON.stringify(data)
    console.log('麦克风: %o', info)
    renderDeivce($('#micro'), data)
  })
  WebRTC2.getCameras().then((data) => {
    var info = JSON.stringify(data)
    console.log('摄像头: %o', info)
    renderDeivce($('#camera'), data)
  })
  WebRTC2.getDevices().then((data)=>{
    const sounders = data.audioOut;
    renderDeivce($("#sounder"), sounders);
  })
}

function renderDeivce(node, device) {
  let html = ''
  device = device.devices || device
  for (var i = 0, len = device.length; i < len; i++) {
    html +=
      '<option value="' +
      device[i].deviceId +
      '">' +
      device[i].label +
      '</option>'
  }
  node.html(html)
}

// 是否显示网络回调
window.__SHOW_STATS__ = false;
jQuery('#js-netstats').on('change', function () {
  let checked = jQuery(this).prop('checked');
  window.__SHOW_STATS__ = !!checked;
  window.__SHOW_NETSTATS_PARAMS__ = !!checked;
})


function initEvents() {
  rtc.client.on('peer-online', evt => {
    console.warn(`${evt.uid} 加入房间`)
    addLog(`${evt.uid} 加入房间`)
  })

  rtc.client.on('peer-leave', evt => {
    console.warn(`${evt.uid} 离开房间`)
    addLog(`${evt.uid} 离开房间`)
    delete rtc.remoteStreams[evt.uid]
    if (currentSpeaker.uid == evt.uid) {
      currentSpeaker.uid = null
    }
    $(`#subList option[value=${evt.uid}]`).remove()
  })

  rtc.client.on('mute-audio', evt => {
    console.warn(`${evt.uid} mute自己的音频`)
    addLog(`${evt.uid} mute自己的音频`)
  })

  rtc.client.on('unmute-audio', evt => {
    console.warn(`${evt.uid} unmute自己的音频`)
    addLog(`${evt.uid} unmute自己的音频`)
  })

  rtc.client.on('mute-video', evt => {
    console.warn(`${evt.uid} mute自己的视频`)
    addLog(`${evt.uid} mute自己的视频`)
  })

  rtc.client.on('unmute-video', evt => {
    console.warn(`${evt.uid} mute自己的视频`)
    addLog(`${evt.uid} unmute自己的视频`)
  })

  rtc.client.on('stream-added', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人的发布消息: ', remoteStream.streamID)
    
    if (rtc.remoteStreams[remoteStream.streamID]) {
      console.warn('清除之前的音视频流，重新sub')
      remoteStream.stop()
    }
    rtc.remoteStreams[remoteStream.streamID] = remoteStream
    isRepeatability(subList, remoteStream.streamID) ? subList.add(new Option(remoteStream.streamID, remoteStream.streamID)) : null
    subscribe(remoteStream)
  })

  rtc.client.on('stream-removed', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人停止发布的消息: ', remoteStream.streamID)
    addLog(`${remoteStream.streamID}停止发布${!remoteStream.audio ? '音频 和 ' :' ' }${!remoteStream.Video ? '视频' :'' }`)
    
    if (!remoteStream.audio && !remoteStream.video) {
      delete rtc.remoteStreams[remoteStream.streamID]
      $(`#subList option[value=${remoteStream.streamID}]`).remove()
    }
    remoteStream.stop()
  })

  rtc.client.on('stream-subscribed', evt => {
    console.warn('订阅别人的流成功的通知')
    var remoteStream = evt.stream;

    const uid = $('#part-volume input[name="uid"]').val();
    const deviceId = $('#sounder').val();
    if (uid === "" + remoteStream.streamID && deviceId && deviceId !== "default"){
      console.log(`将设置扬声器为${deviceId}`);
      remoteStream.setAudioOutput(deviceId);
    }
    
    remoteStream.play(document.getElementById('remote-container')).then(()=>{
      console.log('播放对端的流成功')
      remoteStream.setRemoteRenderMode(globalConfig.remoteViewConfig)
      setTimeout(checkRemoteStramStruck, 2000)
    }).catch(err=>{
      console.log('播放对端的流失败: ', err)
    })
  })

  rtc.client.on('deviceAdd', _data => {
    console.warn('设备增加: ', _data)
  })

  rtc.client.on('deviceRemove', _data => {
    console.warn('设备删除: ', _data)
  })

  rtc.client.on('active-speaker', _data => {
    //console.log('"===== 当前在讲话的人：", _data.uid')
    
    if (!currentSpeaker || currentSpeaker.uid != _data.uid) {
      //console.warn('currentSpeaker: ', currentSpeaker)
      currentSpeaker = _data
      addLog(`${_data.uid}当前在讲话`)
    }
    
  })
  
  rtc.client.on('volume-indicator', _data => {
    //console.log("===== 正在说话的远端用户及其音量：", _data)
  })

  rtc.client.on('stopScreenSharing', _data => {
    console.warn("===== 屏幕共享已停止, 主动关闭")
    rtc.localStream.close({
      type: 'screen'
    }).then(()=>{
      console.log('关闭屏幕共享 sucess')
    }).catch(err =>{
      addLog('关闭屏幕共享 失败: ' + err)
      console.log('关闭屏幕共享 失败: ', err)
    })
  })
  rtc.client.on('videoTrackEnded', _data => {
    console.warn("===== 视频轨道已停止, 主动关闭")
    rtc.localStream.close({
      type: 'video'
    }).then(()=>{
      console.log('关闭摄像头 sucess')
    }).catch(err =>{
      addLog('关闭摄像头 失败: ' + err)
      console.log('关闭摄像头 失败: ', err)
    })
  })
  rtc.client.on('audioTrackEnded', _data => {
    console.warn("===== 音频轨道已停止, 主动关闭")
    rtc.localStream.close({
      type: 'audio',
      microphoneId: $('#micro').val()
    }).then(()=>{
      console.log('关闭mic sucess')
    }).catch(err =>{
      addLog('关闭mic 失败: ' + err)
      console.log('关闭mic 失败: ', err)
    })
  })
  rtc.client.on('channel-closed', _data => {
    console.warn("==== 房间被关闭")
    addLog("==== 房间被关闭")
  })

  rtc.client.on('client-banned', evt => {
    console.warn(`===== ${evt.uid}被踢出房间`)
    addLog(`===== ${evt.uid}被踢出房间`)
    delete rtc.remoteStreams[evt.uid]
    if (currentSpeaker.uid == evt.uid) {
      currentSpeaker.uid = null
    }
    $(`#subList option[value=${evt.uid}]`).remove()
  })

  rtc.client.on('error', type => {
    console.error("===== 发生错误事件：", type)
    if (type === 'SOCKET_ERROR') {
      addLog("==== 网络异常，已经退出房间")
    }
  })

  rtc.client.on('accessDenied', type => {
    console.warn("==== %s设备开启的权限被禁止了", type)
    addLog(`==== ${type}设备开启的权限被禁止`)
  })


  //该回调通知 App 频道内的异常事件。异常事件不是错误，但是往往会引起通话质量问题。
  rtc.client.on('exception', _data => {
    console.log('===== exception: ', _data)
  })

  rtc.client.on('network-quality', _data => {
    //console.warn('=====房间里所有成员的网络状况：', _data)
    let status = null
    let tr = null
    let tables = $("#netQuality");
    $("#netQuality tr:not(:first)").remove();
    _data.forEach(item => {
      tr = $("<tr>" +
        "<td>" + item.uid + "</td>" +
        "<td>" + item.uplinkNetworkQuality + "</td>" +
        "<td>" + item.downlinkNetworkQuality + "</td>" +
        "</tr>")
      tr.appendTo(tables)
    })
  })


  rtc.client.on('connection-state-change', _data => {
    console.warn('网络状态 : ', _data)
    const div = document.getElementById('netStatus')
    div.firstElementChild.firstElementChild.lastElementChild.innerText = ` ${_data.curState} `
  })


  rtc.client.on('client-role-changed', evt => {
    addLog(`client-role-changed ${evt.role}`);
    $("#currentRole").text(evt.role);
  });
  
  rtc.client.on('rtmp-state', _data => {
    console.warn('=====互动直播状况：', _data)
    addLog(`互动直播推流任务：${_data.taskId}，的状态：${_data.code}`)
    if (_data.code == 505) {
      rtc.succTasksList.push(_data.taskId)
      isRepeatability(infoWindow.succTasksList, _data.taskId) ? infoWindow.succTasksList.add(new Option(_data.taskId, _data.taskId)) : null
      isRepeatability(infoWindow.failTasksList, _data.taskId) ? null : infoWindow.failTasksList.remove(_data.taskId)
    } else if (_data.code == 511) {
      //isRepeatability(infoWindow.failTasksList, _data.taskId) ? null : infoWindow.failTasksList.remove(_data.taskId)
      isRepeatability(infoWindow.succTasksList, _data.taskId) ? null : infoWindow.succTasksList.remove(_data.taskId)
      for (let i=0; i < rtc.succTasksList.length; i++) {
        if (rtc.succTasksList[i] == _data.taskId) {
          rtc.succTasksList.splice(i, 1)
        }
      }
    } else {
      rtc.failTasksList.push(_data.taskId)
      isRepeatability(infoWindow.failTasksList, _data.taskId) ? infoWindow.failTasksList.add(new Option(_data.taskId, _data.taskId)) : null
      isRepeatability(infoWindow.succTasksList, _data.taskId) ? null : infoWindow.succTasksList.remove(_data.taskId)
    }
  })
}

function initVolumeDetect() {
  const instantMeter = document.querySelector('#instant meter');
  const instantValueDisplay = document.querySelector('#instant .value');
  setInterval(() => {
    if (rtc.client && rtc.localStream && rtc.localStream.audio) {
      var result = rtc.localStream.getAudioLevel()
      result = result - 0
      if (isNaN(result)) {
        instantMeter.value = instantValueDisplay.innerText = 0.0
        return
      }
      instantMeter.value = instantValueDisplay.innerText = result
    }
  }, 200);
}

$('#init-btn').on('click', () => {
  
})

/** 
 * ----------------------------------------
 *              房间逻辑
 * ----------------------------------------
 */

$('#joinChannel-btn').on('click', () => {
  const channelName = $('#channelName').val()
  if (window.localStorage){
    window.localStorage.setItem("channelName", channelName);
  }
  const uid = $('#uid').val()
  // 实时音录制
  const recordType = ($('#sessionConfigRecordType').val())
  const isHostSpeaker = $('#sessionConfigIsHostSpeaker').prop('checked')
  const recordAudio = $('#sessionConfigRecordAudio').prop('checked')
  const recordVideo = $('#sessionConfigRecordVideo').prop('checked')
  // 互动直播相关
  const liveEnable = $('#sessionConfigLiveEnable').prop('checked') 

  addLog('开始加入房间，判断一下角色...')
  console.info('开始加入房间，判断一下角色...')
  const role = +($('#part-mode input[name="role"]:checked').val())
  rtc.client.adapterRef.testConf = {
    turnAddr: $('#isTurnAddrConf').prop('checked') ? $('#isTurnAddrConf').prop('checked') && $('#turnAddr').val() : null,
    ForwardedAddr: $('#isForwardedAddrConf').prop('checked') ? $('#isForwardedAddrConf').prop('checked') && $('#forwardedAddr').val() : null
  }
  
  rtc.client.join({
    channelName,
    uid: +uid,
    wssArr: $('#isGetwayAddrConf').prop('checked') ? [$('#isGetwayAddrConf').prop('checked') && $('#getwayAddr').val()] : null,
    joinChannelRecordConfig: {
      isHostSpeaker,
      recordAudio,
      recordVideo,
      recordType
    },
    joinChannelLiveConfig: {
      liveEnable
    }
  }).then((obj) => {
    addLog('加入房间成功')
    console.info('加入房间...')
    if( $('#enableAudio').prop('checked') || $('#enableVideo').prop('checked') || $('#enableScreen').prop('checked') ) {
      let audio = video = false
      if ($('#privateAudio').prop('checked') && $('#privateVideo').prop('checked')) {
        audio = video = true
      } else if ($('#privateAudio').prop('checked')) {
        audio = true
      } else if ($('#privateVideo').prop('checked')) {
        video = true
      }
      if (audio || video) {
        navigator.mediaDevices.getUserMedia(
          {audio, video}
        ).then(mediaStream => {
          rtc.videoSource = mediaStream.getVideoTracks().length && mediaStream.getVideoTracks()[0];
          rtc.audioSource = mediaStream.getAudioTracks().length && mediaStream.getAudioTracks()[0];
          initLocalStream(rtc.audioSource, rtc.videoSource)
        })
      } else {
        initLocalStream()
      }
    }
    const { cid } = rtc.client.getChannelInfo()
    $('#cid').html(cid)
  },
  error =>{
    console.error('加入房间失败',error)
    addLog('加入房间失败: '+ error)
  })
  
})

$('#leaveChannel-btn').on('click', () => {
  addLog('离开房间')
  console.info('开始离开房间...')
  window.rtc.client.leave()
  rtc.remoteStreams.length = 0
  rtc.localStream = null
  subList.length = 0
  clearInterval(playTimer)
  progressInfo.innerText = fileName + '00 : 00' + ' / ' + formatSeconds(totalTime)
  progress.value = 0
  window.infoWindow && window.infoWindow.close()
  window.infoWindow = null
  $('#cid').html('')
  $("#netQuality tr:not(:first)").remove();
  currentSpeaker = {}
  rtc.succTasksList = []
  rtc.failTasksList = []
  if (rtc.audioSource) {
    rtc.audioSource.map(track=>{track.stop()})
  } 
  if (rtc.videoSource) {
    rtc.videoSource.map(track=>{track.stop()})
  }
})

$('#tasks-btn').on('click', () => {
  /*if (window.infoWindow) {
    return
  }*/
  var url='rtc2Rtmp.html';                             
  var name='推流任务功能';                            
  var iWidth = 940;                        
  var iHeight = 800;                      
  var iTop = (window.screen.availHeight - 30 - iHeight) / 2;
  var iLeft = (window.screen.availWidth - 10 - iWidth) / 2;
  window.infoWindow = window.open(url, name, 'height=' + iHeight + ',,innerHeight=' + iHeight + ',width=' + iWidth + ',innerWidth=' + iWidth + ',top=' + iTop + ',left=' + iLeft + ',status=no,toolbar=no,menubar=no,location=no,resizable=no,scrollbars=0,titlebar=no');
  /*var loop = setInterval(function() {
    if(infoWindow.closed) {
      clearInterval(loop);
      window.infoWindow = null
    }
  }, 1000);*/
})

/**
 * ----------------------------------------
 *              订阅、发布
 * ----------------------------------------
 */
$('#initLocalStream').on('click', () => {
  if (rtc.localStream) {
    addLog('已经初始化过了，请勿重复操作')
    return
  }
  if( $('#enableAudio').prop('checked') || $('#enableVideo').prop('checked') || $('#enableScreen').prop('checked') ) {
    let audio = video = false
      if ($('#privateAudio').prop('checked') && $('#privateVideo').prop('checked')) {
        audio = video = true
      } else if ($('#privateAudio').prop('checked')) {
        audio = true
      } else if ($('#privateVideo').prop('checked')) {
        video = true
      }
      if (audio || video) {
        navigator.mediaDevices.getUserMedia(
          {audio, video}
        ).then(mediaStream => {
          rtc.videoSource = mediaStream.getVideoTracks().length && mediaStream.getVideoTracks()[0];
          rtc.audioSource = mediaStream.getAudioTracks().length && mediaStream.getAudioTracks()[0];
          initLocalStream(rtc.audioSource, rtc.videoSource)
        })
      } else {
        initLocalStream()
      }
  }
})


$('#pub').on('click', () => {
  publish(rtc.client.localStream)
})

$('#unpub').on('click', () => {
  unpublish(rtc.client.localStream)
})

$('#sub').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }
  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]
  subscribe(remoteStream)
})

$('#unsubVideo').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }

  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]

  remoteStream.setSubscribeConfig({
    audio: true,
    video: false
  })

  rtc.client.unsubscribe(remoteStream).then(()=>{
    console.log('本地 取消订阅视频 成功')
    addLog('本地 取消订阅视频 成功')
  }).catch(err=>{
    addLog('本地 取消订阅视频 失败')
    console.log('本地 取消订阅视频 失败: ', err)
  })
})

$('#unsub').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }
  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]
  unsubscribe(remoteStream)
})

$('#subUpdateResolution').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }
  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]
  const highorlow = $('#subResolution').val() - 0
  // 0是大流，1是小流
  rtc.client.setRemoteVideoStreamType(remoteStream, highorlow)
})

$('#openAsl').on('click', () => {
  rtc.client.openAslMode()
})

$('#closeAsl').on('click', () => {
  rtc.client.closeAslMode()
})

function initLocalStream(audioSource, videoSource) {
  rtc.localStream = WebRTC2.createStream({
    uid: +$('#uid').val(),
    audio: $('#enableAudio').prop('checked'),
    audioProcessing: getAudioProcessingConfig(),
    microphoneId: $('#micro').val(),
    video: $('#enableVideo').prop('checked'),
    cameraId: $('#camera').val(),
    screen: $('#enableScreen').prop('checked'),
    audioSource,
    videoSource
  })
  const videoQuality = $('#sessionConfigVideoQuality').val()
  const frameRate = $('#sessionConfigVideoFrameRate').val()
  rtc.localStream.setVideoProfile({
    resolution: WebRTC2.VIDEO_QUALITY[videoQuality],
    frameRate: WebRTC2.VIDEO_FRAME_RATE[frameRate]
  })

  const audioProfile = $('#sessionConfigAudioProfile').val();
  if (audioProfile){
    rtc.localStream.setAudioProfile($('#sessionConfigAudioProfile').val())
  }
  const screenProfile = $('#sessionConfigScreenProfile').val()
  const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
  rtc.localStream.setScreenProfile({
    resolution: WebRTC2.VIDEO_QUALITY[screenProfile],
    frameRate: WebRTC2.VIDEO_FRAME_RATE[screenFrameRate]
  })
  rtc.localStream.init().then(()=>{
    console.warn('音视频初始化完成，播放本地视频')
    rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    if(!$('#camera').val())
      initDevices()
    // 发布
    if ($('#autoPub').prop('checked')) {
      publish()
    }
  }).catch(err=>{
    console.warn('音视频初始化失败: ', err)
    addLog('音视频初始化失败, 请检查设备列表')
    rtc.localStream = null
  })
}

function publish() {
  console.warn('开始发布视频流')
  addLog('开始发布视频流')
  rtc.client.publish(rtc.localStream).then(()=>{
    addLog('本地 publish 成功')
    console.warn('本地 publish 成功')
  }).catch(err=>{
    addLog('本地 publish 失败')
    console.error('本地 publish 失败: ', err)
  })
}

function unpublish(type=null) {
  console.warn('开始取消发布视频流')
  addLog('开始取消发布视频流')
  rtc.client.unpublish(rtc.localStream, type).then(()=>{
    addLog('本地 unpublish 成功')
    console.warn('本地 unpublish 成功')
  }).catch(err=>{
    addLog('本地 unpublish 失败')
    console.error('本地 unpublish 失败: ', err)
  })
}

function subscribe(remoteStream) {
  remoteStream.setSubscribeConfig({
    audio: true,
    video: $('#subVideo').prop('checked'),
    highOrLow: parseInt($('#subResolution').val()),
  })

  rtc.client.subscribe(remoteStream).then(()=>{
    console.log('本地 subscribe 成功')
    addLog('本地 subscribe 成功')
  }).catch(err=>{
    addLog('本地 subscribe 失败')
    console.log('本地 subscribe 失败: ', err)
  })
}

function unsubscribe(remoteStream) {
  console.warn('开始取消订阅视频流')
  addLog('开始取消订阅视频流')
  rtc.client.unsubscribe(remoteStream).then(()=>{
    console.log('本地 unsubscribe 成功')
    addLog('本地 unsubscribe 成功')
  }).catch(err=>{
    addLog('本地 unsubscribe 失败')
    console.log('本地 unsubscribe 失败: ', err)
  })
}

/**
 * ----------------------------------------
 * 从页面选择框获取3A设置。
 * ----------------------------------------
 */
function getAudioProcessingConfig() {
  const audioProcessing = {};
  switch ($("#ans").val()) {
    case "":
      break;
    case "true":
      audioProcessing.ANS = true;
      break;
    case "false":
      audioProcessing.ANS = false;
      break;
  }
  switch ($("#aec").val()) {
    case "":
      break;
    case "true":
      audioProcessing.AEC = true;
      break;
    case "false":
      audioProcessing.AEC = false;
      break;
  }
  switch ($("#agc").val()) {
    case "":
      break;
    case "true":
      audioProcessing.AGC = true;
      break;
    case "false":
      audioProcessing.AGC = false;
      break;
  }
  if (!$("#ans").val() && !$("#aec").val() && !$("#agc").val()){
    return;
  }else{
    return audioProcessing
  }
}


/**
 * ----------------------------------------
 *              播放控制设置
 * ----------------------------------------
 */
$('#muteAudio').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('muteAudio: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.muteAudio().catch(err =>{
      addLog('muteAudio 错误：' + err)
      console.log('muteAudio 错误：', err)
    })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if (rtc.localStream) {
    rtc.localStream.muteAudio().catch(err =>{
      addLog('muteAudio 错误：' + err)
      console.log('muteAudio 错误：', err)
    })
  } else {
    addLog('当前不能进行此操作')
  }
})

$('#unmuteAudio').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('unmuteAudio: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.unmuteAudio().catch(err =>{
        addLog('unmuteAudio 错误：' + err)
        console.log('unmuteAudio 错误：', err)
      })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if(rtc.localStream){
    rtc.localStream.unmuteAudio().catch(err =>{
      addLog('unmuteAudio 错误：' + err)
      console.log('unmuteAudio 错误：', err)
    })
  } else {
    addLog('当前不能进行此操作')
  }
})

$('#muteVideo').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('muteVideo: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.muteVideo().catch(err =>{
        addLog('muteVideo 错误：' + err)
        console.log('muteVideo 错误：', err)
      })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if(rtc.localStream) {
    rtc.localStream.muteVideo().catch(err =>{
      addLog('muteVideo 错误：' + err)
      console.log('muteVideo 错误：', err)
    })
  } else {
    addLog('当前不能进行此操作')
  }
})

$('#unmuteVideo').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('unmuteVideo: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.unmuteVideo().catch(err =>{
        addLog('unmuteVideo 错误：' + err)
        console.log('unmuteVideo 错误：', err)
      })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if(rtc.localStream){
    rtc.localStream.unmuteVideo().catch(err =>{
      addLog('unmuteVideo 错误：' + err)
      console.log('unmuteVideo 错误：', err)
    })
  } else {
    addLog('当前不能进行此操作')
  }
})

// 设置自己的画面
$('#setLocal').on('click', () => {
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }
  const width = $('#localWidth').val() || 100
  const height = $('#localHeight').val() || 100
  const cut = $('#localCrop').prop('checked')
  window.globalConfig.localViewConfig = {
    width: +width,
    height: +height,
    cut
  }
  window.rtc.localStream.setLocalRenderMode(window.globalConfig.localViewConfig)
})

// 设置对方的画面
$('#setRemote').on('click', () => {
  const uid = $('#part-play input[name="uid"]').val()
  let remoteStream = rtc.remoteStreams[uid]
  if (!remoteStream) {
    addLog('请检查uid是否正确')
    return
  }
  const width = $('#remoteWidth').val() || 100
  const height = $('#remoteHeight').val() || 100
  const cut = $('#remoteCrop').prop('checked')
  window.globalConfig.remoteViewConfig = {
    width: +width,
    height: +height,
    cut
  }

  remoteStream.setRemoteRenderMode({
    width: +width,
    height: +height,
    cut
  })
})

/**
 * ----------------------------------------
 *              音量设置
 * ----------------------------------------
 */

$('#setPlayVolume').on('click', () => {
  const uid = $('#part-volume input[name="uid"]').val()
  let volume = $('#playVolumeInput').val()
  let remoteStream = rtc.remoteStreams[uid]
  if (!remoteStream) {
    console.warn('请检查uid是否正确')
    addLog('请检查uid是否正确')
    return
  }
  volume = parseInt(volume)
  volume = remoteStream.setAudioVolume(volume)
  $('#playVolumeInput').val(volume)
})

$('#setCaptureVolume').on('click', () => {
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }

  let volume = $('#captureVolumeInput').val()
  volume = parseInt(volume)
  volume = rtc.localStream.setCaptureVolume(volume)
  if (volume) {
    addLog('设置采集音频错误:' + volume)
  }
  //$('#captureVolumeInput').val(volume)
})

/**
 * ----------------------------------------
 *              连接状态调试
 * ----------------------------------------
 */
$('#getConnectionState').on('click', ()=>{
  if (rtc.client){
    addLog('获取连接状态:' + rtc.client.getConnectionState());
  }else{
    addLog('获取连接状态错误:无发找到client');
  }
});
$('#disconnectWS').on('click', () => {
  rtc.client.adapterRef._signalling._protoo._transport._ws.close();
})

$('#setAudioOutput').on('click', () => {
  const uid = $('#part-volume input[name="uid"]').val()
  const deviceId = $('#sounder').val();
  const remoteStream = rtc.remoteStreams[uid]
  if (!remoteStream) {
    console.warn('请检查uid是否正确')
    addLog('请检查uid是否正确')
    return
  }
  addLog('设置音频输出设备:' + uid + " " + deviceId);
  remoteStream.setAudioOutput(deviceId);
  
});

/** 
 * ----------------------------------------
 *              设备开关逻辑
 * ----------------------------------------
 */
$('#playCamera').on('click', () => {
  console.warn('打开摄像头')
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }
  const videoQuality = $('#sessionConfigVideoQuality').val()
  const frameRate = $('#sessionConfigVideoFrameRate').val()
  rtc.localStream.setVideoProfile({
    resolution: WebRTC2.VIDEO_QUALITY[videoQuality],
    frameRate: WebRTC2.VIDEO_FRAME_RATE[frameRate],
  })
  rtc.localStream.open({
    type: 'video',
    deviceId: $('#camera').val()
  }).then(()=>{
    console.log('打开摄像头 sucess')
    rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开摄像头' + err)
    console.log('打开摄像头 失败: ', err)
  })
})
$('#playCameraOff').on('click', () => {
  console.warn('关闭摄像头')
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }

  rtc.localStream.close({
    type: 'video'
  }).then(()=>{
    console.log('关闭摄像头 sucess')
  }).catch(err =>{
    addLog('关闭摄像头 失败: ' + err)
    console.log('关闭摄像头 失败: ', err)
  })
})
$('#playMicro').on('click', () => {
  console.warn('打开mic')
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }

  rtc.localStream.setAudioProfile($('#sessionConfigAudioProfile').val())
  rtc.localStream.open({
    type: 'audio',
    deviceId: $('#micro').val()
  }).then(()=>{
    console.log('打开mic sucess')
  }).catch(err =>{
    addLog('打开mic 失败: ' + err)
    console.log('打开mic 失败: ', err)
  })
})
$('#playMicroOff').on('click', () => {
  console.warn('关闭mic')
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }

  rtc.localStream.close({
    type: 'audio',
    microphoneId: $('#micro').val()
  }).then(()=>{
    console.log('关闭mic sucess')
  }).catch(err =>{
    addLog('关闭mic 失败: ' + err)
    console.log('关闭mic 失败: ', err)
  })
})
$('#playScreen').on('click', () => {
  console.warn('打开屏幕共享')
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }

  const screenProfile = $('#sessionConfigScreenProfile').val()
  const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
  rtc.localStream.setScreenProfile({
    resolution: WebRTC2.VIDEO_QUALITY[screenProfile],
    frameRate: WebRTC2.VIDEO_FRAME_RATE[screenFrameRate]
  })
  rtc.localStream.open({
    type: 'screen'
  }).then(()=>{
    rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开屏幕共享 失败: ' + err)
    console.log('打开屏幕共享 失败: ', err)
  })
})
$('#playScreenOff').on('click', () => {
  console.warn('关闭屏幕共享')
  if (!rtc.localStream) {
    addLog('当前不能进行此操作')
    return
  }

  rtc.localStream.close({
    type: 'screen'
  }).then(()=>{
    console.log('关闭屏幕共享 sucess')
  }).catch(err =>{
    addLog('关闭屏幕共享 失败: ' + err)
    console.log('关闭屏幕共享 失败: ', err)
  })
})

/** 
 * ----------------------------------------
 *              录制逻辑
 * ----------------------------------------
 */
function getRecordId() {
  return $('#part-record .recordId').val()
}
// 开始录制
$('#recordVideo').on('click', async (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if (rtc.client.getUid() == uid || !uid) {
    stream = rtc.localStream
  } else {
    stream = rtc.remoteStreams[uid]
    if (!stream) {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  }
  const result = await stream.startMediaRecording({
    type: $('#part-record input[name="recordSource"]:checked').val()
  })
  if (result){
    addLog(`录制错误：${result}`)
  }
})

// 结束录制
$('#recordVideoEnd').on('click', async (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if (rtc.client.getUid() == uid || !uid) {
    stream = rtc.localStream
  } else {
    stream = rtc.remoteStreams[uid]
  }
  await stream.stopMediaRecording({
    recordId: getRecordId()
  })
})
// 显示录制列表
$('#recordList').on('click', (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if (rtc.client.getUid() == uid || !uid) {
    stream = rtc.localStream
  } else {
    stream = rtc.remoteStreams[uid]
  }
  const records = stream.listMediaRecording()
  console.log('onRecordListClick:', records)
  $('#part-record .recordId').html('')
  Object.values(records).forEach((item) => {
    $('#part-record .recordId').append(`<option>${item.id} ${item.status}</option>`)
  })
})
// 下载文件
$('#recordDownload').on('click', async (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if (rtc.client.getUid() == uid || !uid) {
    stream = rtc.localStream
  } else {
    stream = rtc.remoteStreams[uid]
  }
  const result = await stream.downloadMediaRecording({
    recordId: getRecordId()
  })
  if (result && result.recordStatus !== "downloaded"){
    addLog(`录制下载错误。状态：${result.recordStatus}`)
  }
})
// 清理文件
$('#recordClean').on('click', (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if (rtc.client.getUid() == uid || !uid) {
    stream = rtc.localStream
  } else {
    stream = rtc.remoteStreams[uid]
  }
  stream.cleanMediaRecording({
    recordId: getRecordId()
  })
})

/** 
 * ----------------------------------------
 *              发布配置动态修改
 * ----------------------------------------
 */

//切换mic
$('#micro').on('change', () => {
  const microphoneId = $('#micro').val()
  console.warn('切换mic: ', microphoneId)
  window.rtc.localStream && window.rtc.localStream.switchDevice('audio', microphoneId).then(()=>{
    console.warn('切换mic成功')
  }).catch(err=>{
    console.warn('切换mic失败： ', err)
  })
})

//切换camera
$('#camera').on('change', () => {
  const cameraId = $('#camera').val()
  console.warn('切换camera: ', cameraId)
  window.rtc.localStream && window.rtc.localStream.switchDevice('video', cameraId).then(()=>{
    console.warn('切换camera成功')
  }).catch(err=>{
    console.warn('切换camera失败： ', err)
  })
})

//重新设置分辨率
$('#sessionConfigVideoQuality').on('change', () => {
  const videoQuality = $('#sessionConfigVideoQuality').val()
  window.rtc.localStream && window.rtc.localStream.setVideoProfile({
    quality: WebRTC2.VIDEO_QUALITY[videoQuality]
  })
  console.log('change video quality ', videoQuality)
})

//重新设置帧率
$('#sessionConfigVideoFrameRate').on('change', () => {
  const frameRate = $('#sessionConfigVideoFrameRate').val()
  window.rtc.localStream && window.rtc.localStream.setVideoProfile({
    frameRate: WebRTC2.VIDEO_FRAME_RATE[frameRate]
  })
  console.log('change frame rate ', frameRate)
})



/** 
 * ----------------------------------------
 *              video全屏
 * ----------------------------------------
 */
// 初始化事件，单击video标签全屏

document.body.addEventListener('click', function (e) {
  e.stopPropagation()
  var target = e.target
  if (!/VIDEO/gi.test(target.tagName)) {
    return
  }
  if (/fullScreen/gi.test(target.parentNode.className)) {
    target.parentNode.classList.remove('fullScreen')
  } else {
    target.parentNode.classList.add('fullScreen')
  }
})

// 用户角色
$('#setRoleHost-btn').click(async ()=>{
  addLog('尝试切换为主播');
  await rtc.client.setClientRole("host");
});
$('#setRoleAudience-btn').click(async ()=>{
  addLog('尝试切换为观众');
  await rtc.client.setClientRole("audience");
});

//视频截图
$('#snapshot').click(function(event) {
  if (rtc.client) {
    let stream
    let uid = $('#snapshotAccount').val()
    console.warn('截图: ', uid)
    if (rtc.client.getUid() == uid || !uid) {
      stream = rtc.localStream
      if (!stream) {
        console.warn('请检查本地流是否存在')
        addLog('请检查uid是否正确')
        return
      }
    } else {
      stream = rtc.remoteStreams[uid]
      if (!stream) {
        console.warn('请检查uid是否正确')
        addLog('请检查uid是否正确')
        return
      }
    }
    stream.takeSnapshot({
      uid: uid,
      name: $('#snapshotName').val()
    }).then(res => {
      console.log('截图成功')
      addLog('截图成功')
    }).catch(err => {
      console.log('截图失败: ', err)
      addLog('截图失败')
    })
  }
})

/**
  * ************************ 伴音功能相关 *****************************
*/

$('#audioFilePath').val('auido/大头儿子小头爸爸.mp3') //'auido/nico - love mail.mp3' 'auido/大头儿子小头爸爸.mp3'
const progress = document.querySelector('#auidoMixing progress');
const progressInfo = document.querySelector('#auidoMixing .value');
let fileName = $("#audioFilePath").val().split('/')[1].split('.')[0] + ' :                  '
progressInfo.innerText = fileName
let playTimer = null
let totalTime = 0
let isEnd = false
let isPuase = false
let progressLength = progress.offsetLeft + progress.offsetWidth

const audioMixingEndHandler = function(event){
  console.warn('伴音结束: ', event)
  isEnd = true
}

progress.onclick = event => {
  console.log('点击了进度条： ', event)
  console.log('点击了进度条 offsetLeft： ', progress.offsetLeft)
  console.log('点击了进度条 offsetWidth: ', progress.offsetWidth)
  clearInterval(playTimer)
  let clientX = event.clientX
  if (clientX < progress.offsetLeft) {
    clientX = progress.offsetLeft
  } else if (clientX > progress.offsetLeft + progress.offsetWidth) {
    clientX = progress.offsetLeft + progress.offsetWidth
  }
  const playStartTime = ((clientX - progress.offsetLeft) / progress.offsetWidth) * totalTime
  console.info('设置伴音播放的位置: ', playStartTime)
  progress.value = playStartTime/totalTime * 100
  progressInfo.innerText = fileName + formatSeconds(playStartTime) + ' / ' + formatSeconds(totalTime)
  if (rtc.localStream) {
    rtc.localStream.setAudioMixingPosition(playStartTime)
    .then(res=>{
      console.log('设置伴音播放的位置成功')
      if(isPuase) return
      playTimer = setInterval(playAuido, 500)
    }).catch(err=>{
      console.error('设置伴音播放的位置失败')
      console.error(err)
    })
  } 
}

function playAuido(){
  if (isEnd) {
    console.log('播放结束')
    clearInterval(playTimer)
    playTimer = null
    progress.value = 100
    progressInfo.innerText = fileName + formatSeconds(totalTime) + ' / ' + formatSeconds(totalTime)
    return
  }

  res = rtc.localStream.getAudioMixingCurrentPosition()
  if (res.code) return 
  progress.value = res.playedTime/totalTime * 100
  progressInfo.innerText = fileName + formatSeconds(res.playedTime) + ' / ' + formatSeconds(totalTime)
}

$('#startAudioMixing').click(function(){
  console.info('开始伴音...')
  const progressInfo = document.querySelector('#auidoMixing .value');
  let fileName = $("#audioFilePath").val().split('/')[1].split('.')[0] + ' :                  '
  progressInfo.innerText = fileName
  clearInterval(playTimer)
  isEnd = false
  isPuase = false
  if (rtc.localStream) {
    rtc.localStream.startAudioMixing({
      audioFilePath: $("#audioFilePath").val(), 
      loopback: $("#loopback").prop('checked'),
      replace: $("#replace").prop('checked'),
      cycle: $("#cycle").val() || 0,
      playStartTime: Number($("#playStartTime").val()) || 0,
      volume: Number($('#playVolume').val()) || 255,
      auidoMixingEnd: audioMixingEndHandler
    }).then(res=>{
      console.log('伴音成功')
      res = rtc.localStream.getAudioMixingDuration()
      console.log('获取伴音文件总时长成功：', res);
      totalTime = res.totalTime
      progressInfo.innerText = fileName + '00 : 00' + ' / ' + formatSeconds(totalTime)
      progress.value = 0
      playTimer = setInterval(playAuido, 500)
    }).catch(err=>{
      console.error('伴音失败')
      console.error(err)
    })
  } 
})

$('#pauseAudioMixing').click(function(){
  console.info('暂停伴音...')
  isPuase = true
  clearInterval(playTimer)
  if (rtc.localStream) {
    rtc.localStream.pauseAudioMixing()
    .then(res=>{
      console.log('暂停伴音成功')
    }).catch(err=>{
      console.error('暂停伴音失败')
      console.error(err)
    })
  } 
});

$('#resumeAudioMixing').click(function(){
  console.info('恢复伴音...')
  isPuase = false
  if (rtc.localStream) {
    rtc.localStream.resumeAudioMixing()
    .then(res=>{
      console.log('恢复伴音成功')
      playTimer = setInterval(playAuido, 500)
    }).catch(err=>{
      console.error('恢复伴音失败')
      console.error(err)
    })
  } 
});

$('#stopAudioMixing').click(function(){
  console.info('停止伴音...')
  isPuase = false
  isEnd = true
  clearInterval(playTimer)
  progressInfo.innerText = fileName + '00 : 00' + ' / ' + formatSeconds(totalTime)
  progress.value = 0
  if (rtc.localStream) {
    rtc.localStream.stopAudioMixing()
    .then(res=>{
      console.log('停止伴音成功')
    }).catch(err=>{
      console.error('停止伴音失败')
      console.error(err)
    })
  } 
});

$('#setAudioMixingVolume').click(function(){
  console.info('设置伴音的音量...')
  if (rtc.localStream) {
    rtc.localStream.adjustAudioMixingVolume(Number($("#volume").val()))
    .then(res=>{
      console.log('设置伴音的音量成功')
    }).catch(err=>{
      console.error('设置伴音的音量失败')
      console.error(err)
    })
  } 
});

$("#sdkVersion").text(WebRTC2.VERSION);
$("#sdkBuild").text(WebRTC2.BUILD);

const showStats = async ()=>{
  let str = `<hr/><pre class="pubStats" style="min-width: 200px; float: left;">`;
  const localAudioStats = await rtc.client.getLocalAudioStats();
  str += `本地音频\n`;
  for (var key in localAudioStats[0]){
    str += `${key}:${localAudioStats[0][key]}\n`
  };
  const localVideoStats = await rtc.client.getLocalVideoStats();
  str += `本地视频\n`;
  for (var key in localVideoStats[0]){
    str += `${key}:${localVideoStats[0][key]}\n`
  };
  str += `</pre>`
  //////////////
  const remoteAudioStats = await rtc.client.getRemoteAudioStats();
  const remoteVideoStats = await rtc.client.getRemoteVideoStats();
  // uid求交集
  const uids = Object.keys(remoteAudioStats).concat(Object.keys(remoteVideoStats).filter(v => !Object.keys(remoteAudioStats).includes(v)))
  uids.forEach((uid)=>{
    str += `<hr/><pre class="subStats" style="min-width: 200px; float: left;">`;
    str += `远端音频 ${uid}\n`;
    for (var key in remoteAudioStats[uid]){
      str += `${key}:${remoteAudioStats[uid][key]}\n`
    }
    str += `远端视频 ${uid}\n`;
    for (var key in remoteVideoStats[uid]){
      str += `${key}:${remoteVideoStats[uid][key]}\n`
    }
    str += `</pre>`
  });
  $("#statsPanel").html(str);
}
let statsTimer = null;
$("#showStats").on('click', ()=>{
  if (!statsTimer){
    $("#statsPanel").show();
    showStats();
    statsTimer = setInterval(showStats, 1000);
  }else{
    $("#statsPanel").hide();
    clearInterval(statsTimer);
    statsTimer = null;
  }
});

/** 
 * ----------------------------------------
 *              工具类函数
 * ----------------------------------------
 */
function isRepeatability(listNode, item) {
  for(i = 0,len = listNode.options.length; i < len; i++) {
    if(listNode.options[i].value == item) {
      return false
    }
  }
  return true
}

function addEvent(_node, _event, _fn) {
  _node.addEventListener(_event, _fn, false);
}

function formatSeconds(value) {
    var secondTime = parseInt(value);// 秒
    var minuteTime = 0;// 分
    var hourTime = 0;// 小时
    if(secondTime > 60) {//如果秒数大于60，将秒数转换成整数
        //获取分钟，除以60取整数，得到整数分钟
        minuteTime = parseInt(secondTime / 60);
        //获取秒数，秒数取佘，得到整数秒数
        secondTime = parseInt(secondTime % 60);
        //如果分钟大于60，将分钟转换成小时
        if(minuteTime > 60) {
            //获取小时，获取分钟除以60，得到整数小时
            hourTime = parseInt(minuteTime / 60);
            //获取小时后取佘的分，获取分钟除以60取佘的分
            minuteTime = parseInt(minuteTime % 60);
        }
    }
    if (parseInt(secondTime) > 9) {
        var result = "00:" + parseInt(secondTime) + "";
    } else {
        var result = "00:0" + parseInt(secondTime) + "";
    }

    if(minuteTime > 0) {
      result = "" + parseInt(minuteTime) + ":" + parseInt(secondTime);
    }
    if(hourTime > 0) {
      result = "" + parseInt(hourTime) + ":" + parseInt(minuteTime) + ":" + parseInt(secondTime);
    }
    return result;
}

$('#clear-btn').on('click', () => {
  debugContentNode.innerHTML = "";
})

function checkRemoteStramStruck(){
  return
  let struckGraph;
  let struckSeries;
  let headerrateSeries;
  struckSeries = new TimelineDataSeries();
  struckGraph = new TimelineGraphView('struckGraph', 'struckCanvas');
  struckGraph.updateEndDate();

  headerrateSeries = new TimelineDataSeries();
  headerrateSeries.setColor('green');
  let videos = document.querySelectorAll('video')
  let video = videos.length > 0 && videos[1]
  let num = 0
  video.ontimeupdate = function(event){num++; console.log('num: ', num)}
  setInterval(()=>{
    let now = Date.now()
    console.log(num)
    let row = 1000/num
    // append to chart
    struckSeries.addPoint(now, row);
    //headerrateSeries.addPoint(now, headerrate);
    struckGraph.setDataSeries([struckSeries, headerrateSeries]);
    struckGraph.updateEndDate();
    num = 0
  }, 1000)
}

function getdate() {
  var now = new Date(),
      y = now.getFullYear(),
      m = now.getMonth() + 1,
      d = now.getDate();
  return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d) + " " + now.toTimeString().substr(0, 8);
}