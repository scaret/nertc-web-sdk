
const globalConfig = window.globalConfig = {
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

var debugContentNode = $('#debug-content').get(0)

// 添加日志
function addLog(info) {
  var temp = JSON.stringify(info)
  debugContentNode.innerHTML = `<p>${temp}</p>` + debugContentNode.innerHTML
}

window.rtc = {
  client: null,
  client2: null,
  uid2: null,
  localStream: null,
  localStream2: null,
  remoteStreams: []
}

/** 
 * ----------------------------------------
 *              环境配置部分
 * ----------------------------------------
*/

$('#initClient').on('click', () => {
  loadEnv()
})

function loadEnv() {
  const env = globalConfig.env = $('#part-env input[name="env"]:checked').val()
  $('#uid').val(Math.ceil(Math.random() * 1e4))
  rtc.uid2 = Math.ceil(Math.random() * 1e4)
  $('#channelName').val(1122)
  // 读取url中配置的初始参数
  let query = _parseQuery(location.search);
  if (query) {
    if (query.channelName) { $('#channelName').val(query.channelName); }
    if (query.appkey) { $('#appkey').val(query.appkey); }
  }
  init()
}

function init() {
  if (globalConfig.inited) {
    addLog('已经初始化过了，刷新页面重试!!')
    console.error('已经初始化过了，刷新页面重试!!')
    return
  }
  globalConfig.inited = true
  addLog('初始化实例')
  const appkey = $('#appkey').val()
  rtc.client = WebRTC2.createClient({
    appkey,
    debug: true,
  })

  initDevices()
  initEvents()
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

  rtc.client.on('active-speaker', _data => {
    //console.log('"===== 当前在讲话的人：", _data.uid')
  })
  
  rtc.client.on('volume-indicator', _data => {
    //console.log("===== 正在说话的远端用户及其音量：", _data)
  })

  rtc.client.on('channel-closed', _data => {
    console.warn("==== 房间被关闭")
    addLog("==== 房间被关闭")
  })

  rtc.client.on('client-banned', _data => {
    console.warn(`===== ${_data.uid}被提出房间`)
    addLog(`===== ${_data.uid}被提出房间`)
  })

  rtc.client.on('error', _data => {
    console.log('"===== 发生错误事件：", _data')
  })

  rtc.client.on('network-quality', _data => {
    //console.warn('=====房间里所有成员的网络状况：', _data)
    let status = null
    let tr = null
    let tables = $("#netStatus");
    $("#netStatus tr:not(:first)").remove();
    _data.forEach(item => {
      tr = $("<tr>" +
        "<td>" + item.uid + "</td>" +
        "<td>" + item.uplinkNetworkQuality + "</td>" +
        "<td>" + item.downlinkNetworkQuality + "</td>" +
        "</tr>")
      tr.appendTo(tables)
    })
  })


  rtc.client.on('peer-online', evt => {
    console.warn(`${evt.uid} 加入房间`)
  })

  rtc.client.on('peer-leave', evt => {
    console.warn(`${evt.uid} 离开房间`)
    addLog(`${evt.uid} 离开房间`)
    delete rtc.remoteStreams[evt.uid]
  })

  rtc.client.on('stream-added', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人的发布消息: ', remoteStream.streamID)
    console.warn('remoteStream: ', remoteStream)
    if (remoteStream.streamID == rtc.uid2) {
      console.warn('本端实例Client2发布的屏幕共享流，忽略')
      return
    }
    if (rtc.remoteStreams[remoteStream.streamID]) {
      console.warn('清除之前的音视频流，重新sub')
      remoteStream.stop()
    }
    rtc.remoteStreams[remoteStream.streamID] = remoteStream
    subscribe(remoteStream)
  })

  rtc.client.on('stream-removed', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人停止发布的消息: ', remoteStream.streamID)
    addLog(`${remoteStream.streamID}停止发布${!remoteStream.audio ? '音频 和 ' :' ' }${!remoteStream.Video ? '视频' :'' }`)
    
    if (!remoteStream.audio && !remoteStream.video) {
      delete rtc.remoteStreams[remoteStream.streamID]
    }
    remoteStream.stop()
  })

  rtc.client.on('stream-subscribed', evt => {
    console.warn('订阅别人的流成功的通知')
    var remoteStream = evt.stream;
    remoteStream.play(document.getElementById('remote-container')).then(()=>{
      console.log('播放对端的流成功')
      remoteStream.setRemoteRenderMode(globalConfig.remoteViewConfig)
    }).catch(err=>{
      console.log('播放对端的流失败: ', err)
    })
  })
}


/** 
 * ----------------------------------------
 *              房间逻辑
 * ----------------------------------------
 */

$('#joinChannel-btn').on('click', () => {
  if (!rtc.client) {
    addLog('请先初始化')
    return
  }
  addLog('开始加入房间...')
  console.info('开始加入房间...')
  
  rtc.client.join({
    channelName: $('#channelName').val(),
    uid: $('#uid').val(),
    videoMode: true,
    joinChannelRecordConfig: {
      isHostSpeaker: false,
      recordAudio: false,
      recordVideo: false,
      recordType: false,
    },
    joinChannelLiveConfig: {
      liveEnable: false,
      rtmpRecord: false,
      splitMode: 0,
      layout: 0,
      rtmpUrl: ''
    }
  }).then((obj) => {
    addLog('加入房间成功')
    console.info('加入房间...')

    initLocalStream()
    const { channelId } = rtc.client.getChannelInfo()
    $('#cid').html(channelId)
  },
  error =>{
    console.error('加入房间失败',error)
    addLog('加入房间失败: '+ error)
  })
  
})

$('#leaveChannel-btn').on('click', () => {
  if (!rtc.client) {
    addLog('请先初始化')
    return
  }
  addLog('离开房间')
  console.info('开始离开房间...')
  rtc.client.leave()
  rtc.client2.leave()
  rtc.localStream = null
  rtc.localStream2 = null
  rtc.remoteStreams.length = 0
  $('#cid').html('')
  $("#netStatus tr:not(:first)").remove();
})

/**
 * ----------------------------------------
 *              订阅、发布
 * ----------------------------------------
 */

$('#pub').on('click', () => {
  if (!rtc.client) {
    addLog('请先初始化')
    return
  }

  if (rtc.localStream) {
    publish(rtc.localStream)
  }
  if (rtc.localStream2) {
    publish(rtc.localStream2, rtc.client2)
  }
  
})

$('#unpub').on('click', () => {
  if (!rtc.client) {
    addLog('请先初始化')
    return
  }

  if (rtc.localStream) {
    unpublish(rtc.localStream)
  }
  if (rtc.localStream2) {
    unpublish(rtc.localStream2, rtc.client2)
  }
})


function initLocalStream() {
  rtc.localStream = WebRTC2.createStream({
    uid: $('#uid').val(),
    audio: $('#enableAudio').prop('checked'),
    microphoneId: $('#micro').val(),
    video: $('#enableVideo').prop('checked'),
    cameraId: $('#camera').val(),
    screen: false,
  })

  if ($('#enableScreen').prop('checked')) {
    initClient2()
  }

  rtc.localStream.setVideoProfile({
    resolution: WebRTC2['VIDEO_QUALITY_480p'],
    frameRate: WebRTC2['CHAT_VIDEO_FRAME_RATE_15']
  })
  rtc.localStream.setAudioProfile('speech_low_quality')
  rtc.localStream.setScreenProfile(WebRTC2['VIDEO_QUALITY_1080p'])

  rtc.localStream.init().then(()=>{
    console.warn('音视频初始化完成，播放本地视频')
    rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    // 发布
    publish(rtc.localStream)
  }).catch(err=>{
    console.warn('音视频初始化失败: ', err)
    addLog('音视频初始化失败, 请检查设备列表')
    rtc.localStream = null
  })
}

function publish(stream, client2) {
  console.warn('开始发布视频流')
  addLog('开始发布视频流')
  let client = client2 || rtc.client
  client.publish(stream).then(()=>{
    addLog('本地 publish 成功')
    console.warn('本地 publish 成功')
  }).catch(err=>{
    addLog('本地 publish 失败')
    console.error('本地 publish 失败: ', err)
  })
}

function unpublish(stream, client2) {
  console.warn('开始取消发布视频流')
  addLog('开始取消发布视频流')
  let client = client2 || rtc.client
  client.unpublish(stream).then(()=>{
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
    video: true
  })

  rtc.client.subscribe(remoteStream).then(()=>{
    console.log('本地 subscribe 成功')
    addLog('本地 subscribe 成功')
  }).catch(err=>{
    addLog('本地 subscribe 失败')
    console.log('本地 subscribe 失败: ', err)
  })
}


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

  rtc.localStream.open({
    type: 'video',
    deviceId: $('#camera').val()
  }).then(()=>{
    console.log('打开摄像头 sucess')
    rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    if(!$('#camera').val()){
      initDevices()
    }
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

  rtc.localStream.setAudioProfile('speech_low_quality')
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
  if (!rtc.localStream2) {
    //addLog('当前不能进行此操作')
    initClient2()
    return
  }

  rtc.localStream2.setScreenProfile(WebRTC2['VIDEO_QUALITY_1080p'])
  rtc.localStream2.open({
    type: 'screen'
  }).then(()=>{
    rtc.localStream2.play(document.getElementById('local-container'))
    rtc.localStream2.setLocalRenderMode(globalConfig.localViewConfig)
    rtc.localStream2.on('stopScreenSharing', ()=>{
      console.warn('屏幕共享已经停止，demo层主动关闭')
      rtc.localStream2.close({
        type: 'screen'
      }).then(()=>{
        console.log('关闭屏幕共享 sucess')
      })
    })
    console.log('打开屏幕共享 sucess')
  }).catch(err =>{
    addLog('打开屏幕共享 失败: ' + err)
    console.log('打开屏幕共享 失败: ', err)
  })
})
$('#playScreenOff').on('click', () => {
  console.warn('关闭屏幕共享')
  if (!rtc.localStream2) {
    addLog('当前不能进行此操作')
    return
  }

  rtc.localStream2.close({
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

/** 
 * ----------------------------------------
 *              另一个实例client2
 * ----------------------------------------
 */

function initClient2(){
  addLog('初始化实例2')
  const appkey = $('#appkey').val()
  if (!rtc.client2) {
    rtc.client2 = WebRTC2.createClient({
      appkey,
      debug: true,
    })
  }
  
  rtc.client2.join({
    channelName: $('#channelName').val(),
    uid: rtc.uid2,
    videoMode: true,
    joinChannelRecordConfig: {
      isHostSpeaker: false,
      recordAudio: false,
      recordVideo: false,
      recordType: false,
    },
    joinChannelLiveConfig: {
      liveEnable: false,
      rtmpRecord: false,
      splitMode: 0,
      layout: 0,
      rtmpUrl: ''
    }
  }).then((obj) => {
    addLog(`client2 [${rtc.uid2}] 加入房间成功 `)
    console.info('client2 加入房间...')

    rtc.localStream2 = WebRTC2.createStream({
      client: rtc.client2, //多实例时，在创建Stream对象时，需要传递client实例参数
      uid: rtc.uid2,
      audio: false,
      video: false,
      screen: true,
    }) 

    rtc.localStream2.on('stopScreenSharing', ()=>{
      console.log('===== 屏幕共享已经停止')
      addLog("屏幕共享已经停止")
      rtc.client2.stopDevice(WebRTC2.DEVICE_TYPE_DESKTOP_CHROME_SCREEN)
    })

    rtc.localStream2.setVideoProfile({
      resolution: WebRTC2['VIDEO_QUALITY_480p'],
      frameRate: WebRTC2['CHAT_VIDEO_FRAME_RATE_15']
    })
    rtc.localStream2.setAudioProfile('speech_low_quality')
    rtc.localStream2.setScreenProfile(WebRTC2['VIDEO_QUALITY_1080p'])

    rtc.localStream2.init().then(()=>{
      console.warn('音视频初始化完成，播放本地视频')
      rtc.localStream2.play(document.getElementById('local-container'))
      rtc.localStream2.setLocalRenderMode(globalConfig.localViewConfig)
      // 发布
      publish(rtc.localStream2, rtc.client2)
    }).catch(err=>{
      console.warn('音视频初始化失败: ', err)
      addLog('音视频初始化失败, 请检查设备列表')
      rtc.localStream = null
    })
  },
  error =>{
    console.error('加入房间失败',error)
    addLog('加入房间失败: '+ error)
  })
}


/** 
 * ----------------------------------------
 *              辅助
 * ----------------------------------------
 */
// 单击video标签全屏

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
//清除日志
$('#clear-btn').on('click', () => {
  debugContentNode.innerHTML = "";
})


/** 
 * ----------------------------------------
 *              工具类函数
 * ----------------------------------------
 */

function addEvent(_node, _event, _fn) {
  _node.addEventListener(_event, _fn, false);
}

