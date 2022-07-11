
const globalConfig = window.globalConfig = {
  env: 'PROD',
  inited: false,
  localViewConfig: {  // 本地视频容器尺寸
    width: 320,
    height: 240,
    cut: false // 默认不裁剪
  },
  remoteViewConfig: { // 远程视频容器尺寸
    width: 320,
    height: 240,
    cut: false // 默认不裁剪
  }
}

var WEBRTC2_ENV = {
  PROD: {
    appkey: "3f46258310ab84fa5c9d91999640cb44",
    getTokenUrl: 'https://api.netease.im/nimserver/user/getToken.action',
    AppSecret: ''
  }
};

let privatizationConfig = null

const roomconfig = document.querySelector('select#roomconfig');
var debugContentNode = $('#debug-content').get(0)
var subList = $('#subList').get(0) //订阅列表 
var currentSpeaker = {}
// 添加日志
function addLog(info) {
  var temp = JSON.stringify(info)
  debugContentNode.innerHTML = `<p>${temp}</p>` + debugContentNode.innerHTML
}

window.addEventListener('unhandledrejection', (evt)=>{
  addLog("UNHANDLED PROMISE REJECTION:" +evt.reason)
})

window.addEventListener('error', (evt)=>{
  addLog(evt.message)
})

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
  audioSource: null,
  screenVideoSource: null,
  screenAudioSource: null,
}

/** 
 * ----------------------------------------
 *              环境配置部分
 * ----------------------------------------
*/
// 获取大白测试页环境
const localStoragePrefix = "G2-" + window.location.pathname.split(/[^a-zA-Z0-9]+/g).join("-") + "_";
function loadEnv() {
  if (window.localStorage && window.localStorage.getItem(`${localStoragePrefix}appkey-PROD}`)){
    $('#appkey').val(window.localStorage.getItem(`${localStoragePrefix}appkey-${env}`))
  }else{
    $('#appkey').val(WEBRTC2_ENV.PROD.appkey)
  }

  const channelName = window.localStorage ? window.localStorage.getItem(`${localStoragePrefix}channelName`) : "";
  $('#channelName').val(channelName)
  $('#uid').val(Math.floor(Math.random() * 9000 + 1000));
  
  // 读取url中配置的初始参数
  let query = _parseQuery(location.search);
  if (query) {
    if (query.channelName)
    {
      $('#channelName').val(query.channelName);
    }
    if (query.uid){
      $('#uid').val(query.uid);
    }
  }
  init()
}

loadEnv()

async function loadTokenByAppKey(){
  const config = WEBRTC2_ENV[globalConfig.env];
  let appkey = $("#appkey").val();
  let AppSecret = $("#AppSecret").val();
  let uid = getUidFromDomInput();
  let channelName = $("#channelName").val();
  let safemode = $('#part-env input[name="safemode"]:checked').val() === "safe"
  if (AppSecret && safemode && channelName){
    let Nonce = Math.ceil(Math.random() * 1e9);
    let CurTime = Math.ceil(Date.now() / 1000);
    let CheckSum = sha1(`${AppSecret}${Nonce}${CurTime}`);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      AppKey: appkey,
      Nonce,
      CurTime,
      CheckSum,
    }
    // console.log("config.getTokenUrl", config.getTokenUrl, "headers", headers, "appSecret", AppSecret);
    $("#token").val("");
    const data = await axios.post(config.getTokenUrl, `uid=${encodeURIComponent(uid)}&channelName=${encodeURIComponent(channelName)}`, {headers});
    if (data.data && data.data.token){
      $("#token").val(data.data.token);
    }else{
      console.error(data.data || data);
    }
  }else{
    $("#token").val("");
  }
}


$("#uid").on("input", function(){
  const uidInput = $("#uid").val();
  if(uidInput.length > 14){
    $('#useStringUid').attr("checked", true)
  }
});

function init() {
  if (globalConfig.inited) {
    /*addLog('已经初始化过了，刷新页面重试!!')
    console.error('已经初始化过了，刷新页面重试!!')
    return*/
    rtc.client.destroy()
    NERTC.destroy()
  }
  globalConfig.inited = true
  addLog('初始化实例')
  const appkey = $('#appkey').val()
  // loadTokenByAppKey();
  const chrome = $('#part-env input[name="screen-type"]:checked').val()
  NERTC.Logger.enableLogUpload();
  rtc.client = NERTC.createClient({
    appkey,
    debug: true,
    //report: false
  })
  initEvents()
}


function initEvents() {
  if (typeof bindEventParing !== "undefined"){
    bindEventParing()
  }
  
  rtc.client.on('peer-online', evt => {
    console.warn(`${evt.uid} 加入房间`)
    addLog(`${evt.uid} 加入房间`)
  })
  
  rtc.client.on('mediaCapabilityChange', evt=>{
    $("#room-codec-wrapper").text(JSON.stringify(rtc.client.adapterRef.mediaCapability.room.videoCodecType));
  })
  
  rtc.client.on('warning', evt => {
    console.warn(`收到警告：`, evt)
    addLog(`警告：${evt.code} ${evt.msg}`);
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
    console.warn(`${evt.uid} unmute自己的视频`)
    addLog(`${evt.uid} unmute自己的视频`)
  })


  rtc.client.on('mute-screen', evt => {
    console.warn(`${evt.uid} mute自己的辅流`)
    addLog(`${evt.uid} mute自己的辅流`)
  })

  rtc.client.on('unmute-screen', evt => {
    console.warn(`${evt.uid} unmute自己的辅流`)
    addLog(`${evt.uid} unmute自己的辅流`)
  })
  
  rtc.client.on('crypt-error', evt => {
    console.warn(`加密失败：`,evt);
    addLog(`加密失败：` + evt.cryptType);
  })

  rtc.client.on('stream-added', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人的发布消息: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)
    
    if (rtc.remoteStreams[remoteStream.streamID]) {
      console.warn('清除之前的音视频流，重新sub')
      remoteStream.stop()
    }
    rtc.remoteStreams[remoteStream.streamID] = remoteStream
    subscribe(remoteStream)
  })

  rtc.client.on('stream-removed', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人停止发布的消息: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)
    addLog(`${remoteStream.streamID}停止发布 ` + evt.mediaType)
    
    if (!remoteStream.audio && !remoteStream.video && !remoteStream.screen) {
      delete rtc.remoteStreams[remoteStream.streamID]
      $(`#subList option[value=${remoteStream.streamID}]`).remove()
    }
    remoteStream.stop(evt.mediaType);
  })

  rtc.client.on('stream-subscribed', evt => {
    var remoteStream = evt.stream;
    console.warn('订阅别人的流成功的通知: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)

    const playOptions = {
      audio: true,
      video: true,
      screen: true,
    };
    remoteStream.play(document.getElementById('remote-container'), playOptions).then(()=>{
      console.log('播放对端的流成功', playOptions)
      remoteStream.setRemoteRenderMode(globalConfig.remoteViewConfig, evt.mediaType)
    }).catch(err=>{
      console.log('播放对端的流失败: ', err)
    })
    // 自动播放受限
    remoteStream.on('notAllowedError', err => {
      console.log('remoteStream notAllowedError', remoteStream);
      const errorCode = err.getCode();
      const id = remoteStream.getId();
      addView(id);
      if(errorCode === 41030){
        $(`#${id}-img`).show();
          $(`#${id}-img`).on('click', async () => {
            console.log('start resume--->');
            await remoteStream.resume();
            $(`#${id}-img`).hide();
          });
      }
    })
    
    
  })
  
  rtc.client.on('track-low-init-fail', (evt)=>{
    addLog("创建小流失败 " + evt.mediaType)
  })

  rtc.client.on('deviceAdd', _data => {
    console.warn('设备增加: ', _data)
  })

  rtc.client.on('deviceRemove', _data => {
    console.warn('设备删除: ', _data)
  })

  rtc.client.on('active-speaker', _data => {
    //console.log("===== 当前在讲话的人：", _data.uid)
  })
  
  rtc.client.on('volume-indicator', _data => {
   // console.log("===== 正在说话的远端用户及其音量：", _data)
  })

  rtc.client.on('stopScreenSharing', _data => {
    addLog("===== 屏幕共享已停止, 主动关闭")
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
    addLog("===== 视频轨道已停止, 主动关闭")
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
  rtc.client.on('stopScreenAudio', _data => {
    addLog("===== 屏幕共享音频轨道已停止, 主动关闭")
    console.warn("===== 屏幕共享音频轨道已停止, 主动关闭")
    rtc.localStream.close({
      type: 'screenAudio'
    }).then(()=>{
      console.log('关闭屏幕共享音频 sucess')
    }).catch(err =>{
      addLog('关闭屏幕共享音频 失败: ' + err)
      console.log('关闭屏幕共享音频 失败: ', err)
    })
  })
  rtc.client.on('audioTrackEnded', _data => {
    addLog("===== 音频轨道已停止, 主动关闭")
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
  rtc.client.on('uid-duplicate', _data => {
    console.warn("==== uid重复，你被踢出")
    addLog("==== uid重复，你被踢出")
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
  })


  rtc.client.on('connection-state-change', _data => {
    console.warn(`网络状态 connection-state-change: ${_data.prevState} => ${_data.curState}, 是否重连：${_data.reconnect}`)
  })

  rtc.client.on("recording-device-changed", evt=>{
    console.log(`【${evt.state}】recording-device-changed ${evt.device.label}`, evt);
    addLog(`【${evt.state}】recording-device-changed ${evt.device.label}`);
  })
  
  rtc.client.on("camera-changed", evt=>{
    console.log(`【${evt.state}】camera-changed ${evt.device.label}`, evt);
    addLog(`【${evt.state}】camera-changed ${evt.device.label}`);
  })
  
  rtc.client.on("playout-device-changed", evt=>{
    console.log(`【${evt.state}】playout-device-changed ${evt.device.label}`, evt);
    addLog(`【${evt.state}】playout-device-changed ${evt.device.label}`);
  })
  
  rtc.client.on('client-role-changed', evt => {
    addLog(`client-role-changed ${evt.role}`);
  });
  
  rtc.client.on('rtmp-state', _data => {
    console.warn('=====互动直播状况：', _data)
    addLog(`互动直播推流任务：${_data.taskId}，的状态：${_data.code}`)
  })
}

function addView(id) {
  if (!$('#' + id)[0]) {
    $('<div/>', {
      id,
      class: 'video-view'
    }).appendTo('#remote-container');
    $('<div/>', {
      id: `${id}-img`,
      class: 'play-img'
    }).appendTo(`#${id}`);
  }
}

$('#init-btn').on('click', () => {
  
})

/** 
 * ----------------------------------------
 *              房间逻辑
 * ----------------------------------------
 */

$('#joinChannel-btn').on('click', async () => {
  await loadTokenByAppKey();
  const channelName = $('#channelName').val()
  if (window.localStorage){
    window.localStorage.setItem(`${localStoragePrefix}channelName`, channelName);
    window.localStorage.setItem(`${localStoragePrefix}appkey-${globalConfig.env}`, $("#appkey").val());
    window.localStorage.setItem(`${localStoragePrefix}AppSecret-${globalConfig.env}`, $("#AppSecret").val());
  }
  const uid = getUidFromDomInput()   
  console.info('开始加入房间')
  rtc.client.adapterRef.mediaCapability.supportedCodecSend = ['vp8'];
  rtc.client.adapterRef.mediaCapability.supportedCodecRecv = ['vp8'];
  rtc.client.join({
    channelName,
    uid: uid,
    token: $("#token").val()
  }).then((obj) => {
    addLog('加入房间成功')
    console.info('加入房间...')
    initLocalStream()
  },
  error =>{
    console.error('加入房间失败',error)
    addLog('加入房间失败: '+ error)
  })
  
})

$('#destroy-btn').on('click', () => {
  rtc.client.destroy();
})

$('#leaveChannel-btn').on('click', async() => {
  addLog('离开房间')
  console.info('开始离开房间...')
  window.rtc.client.leave()
  rtc.remoteStreams.length = 0
  currentSpeaker = {}
  rtc.succTasksList = []
  rtc.failTasksList = []
  watermarks = {local: null, remote: {}};
})


function getVideoSource(mediaType){
  let defaultStr = "1920x1080x15x1"
  const optionsStr = prompt(
  `自定义${mediaType}配置：【宽x高x帧率x类型
  类型1：时钟; 
  类型2：背景替换;
  类型3：随机颜色;
  类型4：屏幕共享;
  `
    , defaultStr) || defaultStr
  const matches = optionsStr.match(/(\d+)x(\d+)x(\d+)x(\d+)/);
  if (!matches){
    addLog("自定义视频 ：无法匹配字符串" + optionsStr)
    return
  }
  let videoConstraint = {
    width: matches[1],
    height: matches[2],
    frameRate: matches[3],
    content: `${mediaType} ${optionsStr}`
  }
  if (matches[4] === "1"){
    videoConstraint.type = "clock"
  } else if (matches[4] === "3"){
    videoConstraint.type = "randomcolor"
  } else if (matches[4] === "4"){
    videoConstraint.type = "display"
  }else{
    videoConstraint.type = "background"
    const bgImg = new Image()
    const pathParts = window.location.pathname.split("/")
    pathParts.pop()
    const src = pathParts.join("/") + "/img/koala.jpg"
    bgImg.src = src
    videoConstraint.bgImg = bgImg
  }
  let videoSource = fakeMediaDevices.getFakeMedia({video: videoConstraint}).video.track
  return videoSource
}

function getAudioSource(mediaType){
  let defaultStr;
  if (mediaType === "audio"){
    defaultStr = "1x1x0";
  } else if (mediaType === "screenAudio"){
    defaultStr = "2x1x0";
  }else{
    defaultStr = "3x1x0"
  }
  let message = "自定义音频配置 【声音ID(1-3)】x【音量0-1】x【噪音(0-1)】："
  message += "\n2_1_1：播报爸爸的爸爸叫爷爷"
  message += "\nsine：播放左右声道相反的正弦波"
  const optionsStr = prompt(message, defaultStr) || defaultStr
  if (optionsStr === "sine"){
    const audioConstraint = {
      type: "oscstereo"
    }
    console.log("自定义音频配置", mediaType, defaultStr, audioConstraint);
    const fakeAudio = fakeMediaDevices.getFakeMedia({audio: audioConstraint}).audio
    // let i = 0
    // fakeAudio.gainNodeLeft.gain.value = 1
    // fakeAudio.gainNodeRight.gain.value = 1
    // setInterval(()=>{
    //   i++
    //   if (i % 4 === 1){
    //     console.log("正弦波切换为仅左声道", i)
    //     fakeAudio.gainNodeLeft.gain.value = 0.5
    //     fakeAudio.gainNodeRight.gain.value = 0
    //   }
    //   if (i % 4 === 2){
    //     console.log("正弦波切换为双声道", i)
    //     fakeAudio.gainNodeLeft.gain.value = 0.5
    //     fakeAudio.gainNodeRight.gain.value = 0.5
    //   }
    //   if (i % 4 === 3){
    //     console.log("正弦波切换为仅右声道", i)
    //     fakeAudio.gainNodeLeft.gain.value = 0
    //     fakeAudio.gainNodeRight.gain.value = 0.5
    //   }
    //   if (i % 4 === 0){
    //     console.log("正弦波切换为双声道", i)
    //     fakeAudio.gainNodeLeft.gain.value = 0.5
    //     fakeAudio.gainNodeRight.gain.value = 0.5
    //   }
    // }, 2000)
    rtc.fakeAudio = fakeAudio
    return fakeAudio.track;
  }else{
    const matches = optionsStr.match(/(.+)x(.+)x(.+)/);
    const BUILTIN_AB = [null, "brysj", "bbdbbjyy", "mmdmmjwp"];
    const audioConstraint = {
      mono :{
        data: BUILTIN_AB[matches[1]],
        loop: true,
        gain: parseFloat(matches[2]),
      },
      channelCount: 1,
    }
    if (parseFloat(matches[3]) > 0.01){
      audioConstraint.mono.noise = {gain: parseFloat(matches[3])}
    }
    console.log("自定义音频配置", mediaType, defaultStr, audioConstraint);
    const fakeAudio = fakeMediaDevices.getFakeMedia({audio: audioConstraint}).audio
    rtc.fakeAudio = fakeAudio
    return fakeAudio.track;
  }
}

$('#switchCustom').on('click', () => {
  rtc.screenVideoSource = rtc.screenVideoSource.readyState === "live" ? rtc.screenVideoSource :getVideoSource("screen")
  rtc.localStream.switchScreenStream({screenVideoSource:rtc.screenVideoSource});
})


$('#switchScreenShare').on('click', () => {
  rtc.localStream.switchScreenStream({screenAudio:true});
})


function initLocalStream() {
  try{
    rtc.localStream = NERTC.createStream({audio: true, screen: true});
  }catch(e){
    addLog('初始化本地流失败' + e)
    throw e;
  }


  rtc.localStream.setAudioProfile('speech_low_quality')
  //4K 60帧
  rtc.localStream.setScreenProfile({
    resolution: NERTC.VIDEO_QUALITY.VIDEO_QUALITY_4k,
    frameRate: NERTC.VIDEO_FRAME_RATE.CHAT_VIDEO_FRAME_RATE_60
  })


  
  rtc.localStream.init().then(async()=>{

    await rtc.localStream.play(document.getElementById('local-container'), {
      screen: true
    })
    console.warn('音视频初始化完成，播放本地视频');
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    publish()
  }).catch(err=>{
    console.warn('音视频初始化失败: ', err)
    addLog('音视频初始化失败, 请检查设备列表')
    rtc.localStream = null
  })
}

function publish() {
  console.warn('开始发布视频流')
  addLog('开始发布视频流')
  rtc.client.adapterRef.mediaCapability.preferredCodecSend.screen = ['vp8']
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
  let subscribeConfig = {
    audio: true,
    video: true,
    screen: true,
  }

  remoteStream.setSubscribeConfig(subscribeConfig)

  rtc.client.subscribe(remoteStream).then(()=>{
    if (!remoteStream.active){
      console.warn("订阅期间远端已离开")
      return
    }
    console.log(`subscribe 成功 ${remoteStream.streamID}`)
    addLog(`subscribe 成功 ${remoteStream.streamID}`)
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
 *              设备开关逻辑
 * ----------------------------------------
 */
$('#playCameraSource').on('click', () => {
  console.warn('打开自定义摄像头')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }
  rtc.videoSource = rtc.videoSource && rtc.videoSource.readyState === "live" ? rtc.videoSource : getVideoSource("video")
  rtc.localStream.open({
    type: 'video',
    videoSource: rtc.videoSource,
  }).then(async()=>{
    console.log('打开摄像头 sucess')
    await rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开摄像头' + err)
    console.log('打开摄像头 失败: ', err)
  })
})
$('#playCamera').on('click', () => {
  console.warn('打开摄像头')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }

  const resolution = $('#sessionConfigVideoQuality').val()
  const frameRate = $('#sessionConfigVideoFrameRate').val()
  const videoProfile = {}
  if (resolution){
    videoProfile.resolution = NERTC.VIDEO_QUALITY[resolution]
  }
  if (frameRate){
    videoProfile.frameRate = NERTC.VIDEO_FRAME_RATE[frameRate]
  }
  if (resolution || frameRate){
    rtc.localStream.setVideoProfile(videoProfile)
    console.log("setVideoProfile", videoProfile)
  }else{
    console.log("setVideoProfile 没有设置")
  }

  rtc.localStream.open({
    type: 'video',
    deviceId: $('#camera').val(),
    facingMode: $('#cameraFacingMode').val(),
  }).then(async()=>{
    console.log('打开摄像头 sucess')
    await rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    !!rtc.localStream.isBeautyTrack && (await rtc.localStream.setBeautyEffect(true))
  }).catch(err =>{
    addLog('打开摄像头' + err)
    console.log('打开摄像头 失败: ', err)
  })
})
$('#playCameraOff').on('click', () => {
  console.warn('关闭摄像头')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }

  rtc.localStream.close({
    type: 'video'
  }).then(()=>{
    console.log('关闭摄像头 sucess')
    rtc.localStream.isBeautyTrack && rtc.localStream.setBeautyEffect(false);
  }).catch(err =>{
    addLog('关闭摄像头 失败: ' + err)
    console.log('关闭摄像头 失败: ', err)
  })
})

$('#playMicroSource').on('click', () => {
  console.warn('打开自定义音频')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }
  if ($('#sessionConfigAudioProfile').val()){
    rtc.localStream.setAudioProfile($('#sessionConfigAudioProfile').val())
  }
  rtc.audioSource = rtc.audioSource && rtc.audioSource.readyState === "live" ? rtc.audioSource : getAudioSource("audio")
  let openOptions = {
    type: 'audio',
    audioSource: rtc.audioSource,
  }
  console.log("openOptions", openOptions)
  rtc.localStream.open(openOptions).then(()=>{
    console.log('打开自定义音频成功')
  }).catch(err =>{
    addLog('打开自定义音频 失败: ' + err)
    console.log('打开自定义音频 失败: ', err)
  })
})
$('#playMicro').on('click', () => {
  console.warn('打开mic')
  if (!rtc.localStream) {
    assertLocalStream()
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
    assertLocalStream()
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

$('#playScreenSource').on('click', () => {
  console.warn('打开自定义辅流')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }
  rtc.screenVideoSource = rtc.screenVideoSource && rtc.screenVideoSource.readyState === "live" ? rtc.screenVideoSource :getVideoSource("screen")
  let openOptions = {
    type: 'screen',
    screenVideoSource: rtc.screenVideoSource,
  }
  console.log("openOptions", openOptions)
  rtc.localStream.open(openOptions).then(async ()=>{
    console.log('打开自定义辅流成功')
    await rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开自定义辅流 失败: ' + err)
    console.log('打开自定义辅流 失败: ', err)
  })
})
$('#playScreen').on('click', () => {
  console.warn('打开屏幕共享')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }

  const screenProfile = {}
  const screenResolution = $('#sessionConfigScreenProfile').val()
  if (screenResolution){
    screenProfile.resolution = NERTC.VIDEO_QUALITY[screenResolution]
  }
  const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
  if (screenFrameRate){
    screenProfile.frameRate = NERTC.VIDEO_FRAME_RATE[screenFrameRate]
  }
  if (screenResolution || screenFrameRate){
    rtc.localStream.setScreenProfile(screenProfile)
    console.log("setScreenProfile", screenProfile)
  }else{
    console.log("setScreenProfile 没有配置")
  }
  
  rtc.localStream.open({
    type: 'screen',
    sourceId: getUrlVars().sourceId
  }).then(async()=>{
    await rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开屏幕共享 失败: ' + err)
    console.log('打开屏幕共享 失败: ', err)
  })
})
$('#playScreenOff').on('click', () => {
  console.warn('关闭屏幕共享')
  if (!rtc.localStream) {
    assertLocalStream()
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
/////

$('#playScreenAudioSource').on('click', () => {
  console.warn('打开自定义辅流音频')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }
  const audioProfile = $('#sessionConfigAudioProfile').val();
  if (audioProfile){
    rtc.localStream.setAudioProfile(audioProfile)
  }
  rtc.screenAudioSource = rtc.screenAudioSource && rtc.screenAudioSource.readyState === "live" ? rtc.screenAudioSource : getAudioSource("screenAudio")
  let openOptions = {
    type: 'screenAudio',
    screenAudioSource: rtc.screenAudioSource,
  }
  console.log("openOptions", openOptions)
  rtc.localStream.open(openOptions).then(async ()=>{
    console.log('打开自定义辅流音频成功')
    await rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开自定义辅流音频 失败: ' + err)
    console.log('打开自定义辅流音频 失败: ', err)
  })
})
$('#playScreenAudio').on('click', () => {
  console.warn('打开屏幕共享+音频')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }

  const screenProfile = {}
  const screenResolution = $('#sessionConfigScreenProfile').val()
  if (screenResolution){
    screenProfile.resolution = NERTC.VIDEO_QUALITY[screenResolution]
  }
  const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
  if (screenFrameRate){
    screenProfile.frameRate = NERTC.VIDEO_FRAME_RATE[screenFrameRate]
  }
  if (screenResolution || screenFrameRate){
    rtc.localStream.setScreenProfile(screenProfile)
    console.log("setScreenProfile", screenProfile)
  }else{
    console.log("setScreenProfile 没有配置")
  }
  
  rtc.localStream.open({
    type: 'screen',
    screenAudio: true,
    sourceId: getUrlVars().sourceId
  }).then(async()=>{
    await rtc.localStream.play(document.getElementById('local-container'))
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
  }).catch(err =>{
    addLog('打开屏幕共享音频 失败: ' + err)
    console.log('打开屏幕共享音频 失败: ', err)
  })
})
$('#playScreenAudioOff').on('click', () => {
  console.warn('关闭屏幕共享音频')
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }

  rtc.localStream.close({
    type: 'screenAudio'
  }).then(()=>{
    console.log('关闭屏幕共享音频 sucess')
  }).catch(err =>{
    addLog('关闭屏幕共享音频 失败: ' + err)
    console.log('关闭屏幕共享音频 失败: ', err)
  })
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

$('#allowRemoteAudioRendering').click(async ()=>{
  $("#remotePlayOptionsAudio").removeAttr("checked");
});



/** 
 * ----------------------------------------
 *              工具类函数
 * ----------------------------------------
 */

 function getUidFromDomInput(){
  const uidInput = $("#uid").val();
  if (!uidInput){
    // 未填
    return 0;
  }
  else{
    let uid = $("#uid").val();
    if ($("#useStringUid").prop("checked") === false){
      uid = parseInt(uid);
      console.log("使用Number类型的uid", uid);
    }else{
      console.log("使用String类型的uid", uid);
    }
    return uid;
  }
}
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

function toIntegerOrStringOrNull(val){
  //数字开头转为数字，否则保留为字符串
  if (!val){
    return null
  }else if (val.substr(0, 2) === "0x"){
    return parseInt(val, 16)
  }else if (/^\-?[\d\.]+$/.test(val)){
    return parseFloat(val)
  }else{
    return val;
  }
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

// Read a page's GET URL variables and return them as an associative array.
function getUrlVars()
{
  var vars = [], hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(var i = 0; i < hashes.length; i++)
  {
    hash = hashes[i].split('=');
    vars.push(decodeURIComponent(hash[0]));
    vars[hash[0]] = decodeURIComponent(hash[1]);
  }
  return vars;
}

function getdate() {
  var now = new Date(),
      y = now.getFullYear(),
      m = now.getMonth() + 1,
      d = now.getDate();
  return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d) + " " + now.toTimeString().substr(0, 8);
}
