
const globalConfig = window.globalConfig = {
  env: 'DEV',
  inited: false,
  localViewConfig: {  // 本地视频容器尺寸
    width: 480,
    height: 420,
    cut: false // 默认不裁剪
  },
  remoteViewConfig: { // 远程视频容器尺寸
    width: 320,
    height: 240,
    cut: false // 默认不裁剪
  }
}

var WEBRTC2_ENV = {
  DEV: {
    appkey: 'eca23f68c66d4acfceee77c200200359',
    //appkey: 'b8e51166f2fc093d9d2f0680cb1f2d28', 
    checkSumUrl: "https://webtest.netease.im/nrtcproxy/demo/getChecksum.action",
    getTokenUrl: 'https://imtest.netease.im/nimserver/user/getToken.action',
    AppSecret: 'c9df0b60c1ba'
  },
  SAFEDEV: {
    appkey: 'abb4cce04e5e4a7b7fc381ba799878dc', 
    checkSumUrl: "https://webtest.netease.im/nrtcproxy/demo/getChecksum.action",
    getTokenUrl: 'https://imtest.netease.im/nimserver/user/getToken.action',
    AppSecret: '1209afc826ea'
  },
  PROD: {
    appkey: "6acf024e190215b685905444b6e57dd7",
    checkSumUrl: "https://nrtc.netease.im/demo/getChecksum.action",
    getTokenUrl: 'https://api.netease.im/nimserver/user/getToken.action',
    AppSecret: 'fffeeb78f165'
  }
};

//背景分割
const virtualBackgroundPluginConfig = {
  development: {
    chrome: {
      key: 'VirtualBackground',
      pluginUrl: './js/nim/NIM_Web_VirtualBackground.js',
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_segment_normal.wasm' + `?time=${Math.random()}`,
    },
    safari: {
      key: 'VirtualBackground',
      pluginUrl: './js/nim/NIM_Web_VirtualBackground.js',
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_segment_normal_nosimd.wasm' + `?time=${Math.random()}`,
    }
  }, 
  production: {
    chrome: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_segment_normal.wasm' + `?time=${Math.random()}`,
    },
    safari: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_segment_normal_nosimd.wasm' + `?time=${Math.random()}`,
    }
  },
  test: {
    chrome: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}_test.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_segment_normal.wasm' + `?time=${Math.random()}`,
    },
    safari: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}_test.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_segment_normal_nosimd.wasm' + `?time=${Math.random()}`,
    }
  } 
};
let segment_config = null;

//高级美颜
const advancedBeautyPluginConfig = {
  development: {
    chrome: {
      key: 'AdvancedBeauty',
      pluginUrl: './js/nim/NIM_Web_AdvancedBeauty.js',
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_face_points.wasm' + `?time=${Math.random()}`,
    },
    safari: {
      key: 'AdvancedBeauty',
      pluginUrl: './js/nim/NIM_Web_AdvancedBeauty.js',
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_face_points_nosimd.wasm' + `?time=${Math.random()}`,
    }
  }, 
  production: {
    chrome: {
      key: 'AdvancedBeauty',
      pluginUrl: `./js/nim/NIM_Web_AdvancedBeauty_v${NERTC.VERSION}.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_face_points.wasm' + `?time=${Math.random()}`,
    },
    safari: {
      key: 'AdvancedBeauty',
      pluginUrl: `./js/nim/NIM_Web_AdvancedBeauty_v${NERTC.VERSION}.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_face_points_nosimd.wasm' + `?time=${Math.random()}`,
    } 
  },
  test: {
    chrome: {
      key: 'AdvancedBeauty',
      pluginUrl: `./js/nim/NIM_Web_AdvancedBeauty_v${NERTC.VERSION}_test.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_face_points.wasm' + `?time=${Math.random()}`,
    },
    safari: {
      key: 'AdvancedBeauty',
      pluginUrl: `./js/nim/NIM_Web_AdvancedBeauty_v${NERTC.VERSION}_test.js`,
      wasmUrl: 'https://yx-web-nosdn.netease.im/sdk-release/ne_face_points_nosimd.wasm' + `?time=${Math.random()}`,
    }
  } 
};

let beauty_config = null;

let privatizationConfig = null
/*{
  "appkey":"6c6a4f0c8928b54032ebc495e442ebbf",
  "demoServer":"https://yunxinent-demo.netease.im/nrtcproxy/demo/getChecksum.action",
  "channelServer":"https://yunxinent-demo.netease.im/nrtcproxy/nrtc/getChannelInfos.action",
  "statisticsServer":"https://yunxinent-demo.netease.im/report/statics/report/common/form",
  "roomServer":"https://yunxinent-demo.netease.im/v2/sdk/rooms",
  "compatServer":"https://yunxinent-demo.netease.im/lbs/cc/nrtc/v2",
  "nosLbsServer":"https://yunxinent-demo.netease.im/lbs/noslbs-https.jsp",
  "nosUploadSever":"https://yunxinent-demo.netease.im",
  "nosTokenServer":"https://yunxinent-demo.netease.im/report/sdklog/getToken",
  "webSocketProxyServer":"www.testg2proxy.com",
   "mediaProxyServer":"59.111.58.216:3478",
  "useIPv6":false
}*/

const roomconfig = document.querySelector('select#roomconfig');
var debugContentNode = $('#debug-content').get(0)
var subList = $('#subList').get(0) //订阅列表 
var currentSpeaker = {}
// 添加日志
function addLog(info) {
  var temp = (typeof info === "string" ? info : JSON.stringify(info))
  debugContentNode.innerHTML = `<p>${info}</p>` + debugContentNode.innerHTML
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
  const env = globalConfig.env = $('#part-env input[name="env"]:checked').val()
  if (window.localStorage && window.localStorage.getItem(`${localStoragePrefix}appkey-${env}`)){
    $('#appkey').val(window.localStorage.getItem(`${localStoragePrefix}appkey-${env}`))
    if (window.localStorage.getItem(`${localStoragePrefix}AppSecret-${env}`)){
      $('#AppSecret').val(window.localStorage.getItem(`${localStoragePrefix}AppSecret-${env}`))
    }
  }else{
    $('#appkey').val(WEBRTC2_ENV[env].appkey)
    $('#AppSecret').val(WEBRTC2_ENV[env].AppSecret)
  }
  // $('#uid').val('111111111111111111')
  //$('#channelName').val(Math.ceil(Math.random() * 1e10))
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

$('input[name="env"]').on('click', () => {
  loadEnv()
})

$('#setAppkey').on('click', () => {
  console.log('更新 appkey')
  init()
})
$('#clearLocalStorage').on('click', () => {
  window.localStorage.clear();
  window.location.reload();
})

const defaultLogLevel = window.localStorage.getItem(`defaultLogLevel`) || "DEBUG";
NERTC.Logger.setLogLevel(NERTC.Logger[defaultLogLevel])
$('#loglevel').val(defaultLogLevel);

$('#setLogLevel').on('click', ()=>{
  const level = $("#loglevel").val();
  window.localStorage.setItem(`defaultLogLevel`, level);
  NERTC.Logger.setLogLevel(NERTC.Logger[level])
})

$('#privatizationConfig').on('click', () => {
  var objFile = document.getElementById("privatizationConfigFildId");
  if(objFile.value == "") {
    alert("不能为空空");
    return false;
  }

  console.log(objFile.files[0].size); // 文件字节数
  
  var files = $('#privatizationConfigFildId').prop('files');//获取到文件列表
  if(files.length == 0){
      alert('请选择文件');
  }else{
    var reader = new FileReader();//新建一个FileReader
    reader.readAsText(files[0], "UTF-8");//读取文件 
    reader.onload = async function(evt){ //读取完文件之后会回来这里
      var fileString = evt.target.result; // 读取文件内容
      //console.log(fileString)
      privatizationConfig = JSON.parse(fileString)
      if (privatizationConfig.appkey) {
        $('#appkey').val(privatizationConfig.appkey)
        init()
      }else {
        console.error("私有化配置: 没有获取appkey");
        addLog('私有化配置: 没有获取appkey，请检查设置的参数是否正确')
        return
      }
    }
  }
})

const USER_AGENT = (window.navigator && window.navigator.userAgent) || '';
const IS_XWEB = /XWEB\/\d+/i.test(USER_AGENT);
const IS_TBS = /TBS\/\d+/i.test(USER_AGENT);
const IS_FIREFOX = /Firefox/.test(USER_AGENT)
let wechatBrowser;
let WBBox = document.getElementById('wechatBrowserBox');
if(IS_XWEB){
  wechatBrowser = 'XWEB';
  WBBox.style.display = 'block';
}else if(IS_TBS){
  wechatBrowser = 'TBS';
  WBBox.style.display = 'block';
}else{
  wechatBrowser = '';
}
$('#wechatBrowser').html(`${wechatBrowser}`);

$('#isSupported').html(`${NERTC.checkSystemRequirements()}`);
// $('#userAgent').html(`${navigator.userAgent}`);

if (IS_FIREFOX){
  $("#videoLow").removeAttr("checked")
  $("#screenLow").removeAttr("checked")
}

/**
 * ----------------------------------------
 *             demo页面模块隐藏
 * ----------------------------------------
 */
$('#config').on('click', () => {
  //会话参数配置
  if ($("#sessionConf").css("display") == 'none') {
    $("#sessionConf").css("display", 'block')
  } else {
    $("#sessionConf").css("display", 'none')
  }
})

$('#uploadLog').on('click', () => {
  //启动上传日志
  NERTC.Logger.enableLogUpload();
})

$('#disableUploadLog').on('click', () => {
  //关闭上传日志
  NERTC.Logger.disableLogUpload();
})

$('#audioMixing').on('click', () => {
  //伴音功能模块
  if ($("#audioMixingFeature").css("display") == 'none') {
    $("#audioMixingFeature").css("display", 'block')
  } else {
    $("#audioMixingFeature").css("display", 'none')
  }
})

$('input[name="mode"]').on('click', () => {
  const mode = $('#part-env input[name="mode"]:checked').val()
  console.log('频道模式: ', mode)
  rtc.client.setChannelProfile({mode})
})

$("#sdkEnv").text(NERTC.ENV);

let envStr = ""
switch(NERTC.ENV){
  case "development":
  case "test":
    $("#test-env").prop("checked", true);
    envStr += "测试";
    if (window.location.href.indexOf("G2%20dev") > -1){
      envStr += `&nbsp;&nbsp;&nbsp;&nbsp;<small><a style="color:blue" href="${window.location.href.replace("G2%20dev", "G2%20prod")}">切换为线上</a></small>`
    }
    break;
  case "production":
    $("#online-env").prop("checked", true);
    envStr += "线上";
    if (window.location.href.indexOf("G2%20prod") > -1){
      envStr += ` &nbsp;&nbsp;&nbsp;&nbsp;<a style="color:blue" href="${window.location.href.replace("G2%20prod", "G2%20dev")}">切换为测试</a>`
    }
    break;
  default:
    envStr += "未知"
}
$("#env").html(envStr);
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

// $("#uid").on("change", loadTokenByAppKey);
// $("#channelName").on("change", loadTokenByAppKey);

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
  initDevices()
  initEvents()
  initVolumeDetect()
  initCodecOptions()
}

function initDevices(requestPerm) {
  NERTC.getMicrophones(requestPerm).then((data) => {
    var info = JSON.stringify(data)
    console.log('麦克风: %o', info)
    renderDevice($('#micro'), data)
  })
  NERTC.getCameras(requestPerm).then((data) => {
    var info = JSON.stringify(data)
    console.log('摄像头: %o', info)
    renderDevice($('#camera'), data)
  })
  NERTC.getDevices(requestPerm).then((data)=>{
    const sounders = data.audioOut;
    renderDevice($("#sounder"), sounders);
  })
}

function renderDevice(node, devices) {
  if (node.length){
    node = node[0]
  }
  const childNodes = node.childNodes
  for (let i in childNodes){
    const childNode = childNodes[i]
    if (childNode.value){
      childNode.disabled = true
    }
  }
  
  for (var i = 0, len = devices.length; i < len; i++) {
    let isNewDevice = true
    for (let j in childNodes){
      const childNode = childNodes[j]
      if (childNode.value === devices[i].deviceId){
        isNewDevice = false
        childNode.innerText = devices[i].label
        childNode.disabled = false
      }
    }
    if (isNewDevice){
      const elem = document.createElement("option")
      elem.value = devices[i].deviceId
      elem.innerText = devices[i].label
      node.appendChild(elem)
    }
  }
}

// 是否显示网络回调
window.__SHOW_STATS__ = false;
jQuery('#js-netstats').on('change', function () {
  let checked = jQuery(this).prop('checked');
  window.__SHOW_STATS__ = !!checked;
  window.__SHOW_NETSTATS_PARAMS__ = !!checked;
})


function initEvents() {
  if (typeof bindEventParing !== "undefined"){
    bindEventParing()
  }
  
  rtc.client.on('peer-online', evt => {
    console.warn(`${evt.uid} 加入房间`)
    addLog(`${evt.uid} 加入房间`)
    
    const view = getRemoteView(evt.uid)
    view.audio = {
      added: false,
      subscribed: false,
      muted: false,
    }
    view.video = {
      added: false,
      subscribed: false,
      muted: false,
    }
    view.screen = {
      added: false,
      subscribed: false,
      muted: false,
    }
    view.audioSlave = {
      added: false,
      subscribed: false,
      muted: false,
    }
    view.$div.show()
  })
  
  rtc.client.on('@mediaCapabilityChange', evt=>{
    $("#room-codec-wrapper").text(JSON.stringify(rtc.client.adapterRef.mediaCapability.room.videoCodecType));
  })
  
  rtc.client.on('aslStatus', evt=>{
    addLog(`服务端ASL支持状态：${evt.enabled} 选路数量 ${evt.aslActiveNum}`)
  })
  
  rtc.client.on('warning', evt => {
    console.warn(`收到警告：`, evt)
    addLog(`警告：${evt.code} ${evt.msg}`);
  })

  rtc.client.on('peer-leave', evt => {
    console.warn(`${evt.uid} 离开房间`)
    addLog(`${evt.uid} 离开房间`)
    getRemoteView(evt.uid).$div.hide()
    delete rtc.remoteStreams[evt.uid]
    if (currentSpeaker.uid == evt.uid) {
      currentSpeaker.uid = null
    }
    $(`#subList option[value=${evt.uid}]`).remove()
  })

  rtc.client.on('mute-audio', evt => {
    console.warn(`${evt.uid} mute自己的音频`)
    addLog(`${evt.uid} mute自己的音频`)
    getRemoteView(evt.uid).audio.muted = true
  })

  rtc.client.on('unmute-audio', evt => {
    console.warn(`${evt.uid} unmute自己的音频`)
    addLog(`${evt.uid} unmute自己的音频`)
    getRemoteView(evt.uid).audio.muted = false
  })

  rtc.client.on('mute-video', evt => {
    console.warn(`${evt.uid} mute自己的视频`)
    addLog(`${evt.uid} mute自己的视频`)
    getRemoteView(evt.uid).video.muted = true
  })

  rtc.client.on('unmute-video', evt => {
    console.warn(`${evt.uid} unmute自己的视频`)
    addLog(`${evt.uid} unmute自己的视频`)
    getRemoteView(evt.uid).video.muted = false
  })


  rtc.client.on('mute-screen', evt => {
    console.warn(`${evt.uid} mute自己的辅流`)
    addLog(`${evt.uid} mute自己的辅流`)
    getRemoteView(evt.uid).screen.muted = true
  })

  rtc.client.on('unmute-screen', evt => {
    console.warn(`${evt.uid} unmute自己的辅流`)
    addLog(`${evt.uid} unmute自己的辅流`)
    getRemoteView(evt.uid).screen.muted = false
  })
  
  rtc.client.on('crypt-error', evt => {
    console.warn(`加密失败：`,evt);
    addLog(`加密失败：` + evt.cryptType);
  })

  rtc.client.on('sender-transform', processSenderTransform)
  
  rtc.client.on('receiver-transform', processReceiverTransform)

  rtc.client.on('stream-added', evt => {
    var remoteStream = evt.stream;
    console.warn('收到别人的发布消息: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)
    
    getRemoteView(evt.stream.streamID)[evt.mediaType].added = true
    getRemoteView(evt.stream.streamID).$div.show()
    
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
    console.warn('收到别人停止发布的消息: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)
    addLog(`${remoteStream.streamID}停止发布 ` + evt.mediaType)
    getRemoteView(evt.stream.streamID)[evt.mediaType].added = false
    
    if (!remoteStream.audio && !remoteStream.video && !remoteStream.screen) {
      delete rtc.remoteStreams[remoteStream.streamID]
      $(`#subList option[value=${remoteStream.streamID}]`).remove()
    }
    remoteStream.stop(evt.mediaType);
  })
  
  rtc.client.on('@stream-unsubscribed', evt=>{
    getRemoteView(evt.stream.streamID)[evt.mediaType].subscribed = false
  })

  rtc.client.on('stream-subscribed', evt => {
    var remoteStream = evt.stream;
    console.warn('订阅别人的流成功的通知: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)
    getRemoteView(evt.stream.streamID)[evt.mediaType].subscribed = true
    const uid = $('#part-volume input[name="uid"]').val();
    const deviceId = $('#sounder').val();
    if (uid === "" + remoteStream.streamID && deviceId && deviceId !== "default"){
      console.log(`将设置扬声器为${deviceId}`);
      remoteStream.setAudioOutput(deviceId);
    }
    
    if ($('#allowRemoteAudioRendering').prop("checked")){
      const elemId = `audio-uid-${remoteStream.streamID}`;
      if (!$(`#${elemId}`).length){
        const elem = $(`<audio title="${elemId}" id="${elemId}" autoplay controls ></audio>`);
        elem.appendTo($('#remoteAudioRenderingContainer'));
      }
      const audioStream = remoteStream.getAudioStream();
      $(`#${elemId}`)[0].srcObject = audioStream;
    }
    
    const playOptions = $('#remotePlayOptionsEnabled').prop('checked') ? {
      audio: $("#remotePlayOptionsAudio").prop('checked'),
      video: $("#remotePlayOptionsVideo").prop('checked'),
      screen: $("#remotePlayOptionsScreen").prop('checked'),
    } : null;
    const remoteDiv = getRemoteView(remoteStream.streamID).$div[0]
    remoteStream.play(remoteDiv, playOptions).then(()=>{
      console.log('播放对端的流成功', playOptions)
      remoteStream.setRemoteRenderMode(globalConfig.remoteViewConfig, evt.mediaType)
      setTimeout(checkRemoteStramStruck, 2000)
    }).catch(err=>{
      console.log('播放对端的流失败: ', err)
    })
    
    if (!DO_NOT_ADD_EVENTS){
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
    }
    
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
    $("#activeSpeaker").text(`active-speaker：${_data.uid} ${_data.level}`);
    
    if (!currentSpeaker || currentSpeaker.uid != _data.uid) {
      //console.warn('currentSpeaker: ', currentSpeaker)
      currentSpeaker = _data
      addLog(`${_data.uid}当前在讲话`)
    }
    
  })
  
  rtc.client.on('volume-indicator', _data => {
    //console.log("===== 正在说话的远端用户及其音量：", _data)
    $("#volume-indicator").empty();
    for (var i = 0; i < _data.length; i++){
      $("#volume-indicator").append(`<tr><td>${_data[i].uid}</td><td>${_data[i].level}</td><td>${_data[i].type}</td></tr>`);
    }
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
    let status = null
    let tr = null
    let tables = $("#netQuality");
    $("#netQuality tr:not(:first)").remove();
    remoteViews.forEach((view)=>{
      view.uplinkNetworkQuality = ""
      view.downlinkNetworkQuality = ""
    })
    _data.forEach(item => {
      tr = `<tr style="font-size: small">
        <td>${item.uid}`
      const remoteStream = rtc.remoteStreams[item.uid]
      
      if (remoteStream){
        if (remoteStream.platformType !== 16){
          tr += `<br/>${NERTC.PlatformTypeMap[remoteStream.platformType] || "platform" + remoteStream.platformType}`
        }
        getRemoteView(item.uid).platformType = NERTC.PlatformTypeMap[remoteStream.platformType] || "platform" + remoteStream.platformType
        getRemoteView(item.uid).uplinkNetworkQuality = `${NERTC.NETWORK_STATUS[item.uplinkNetworkQuality]} (${item.uplinkNetworkQuality})`
        getRemoteView(item.uid).downlinkNetworkQuality = `${NERTC.NETWORK_STATUS[item.downlinkNetworkQuality]} (${item.downlinkNetworkQuality})`
      }

      tr +=  
        `</td>
        <td>${NERTC.NETWORK_STATUS[item.uplinkNetworkQuality]} (${item.uplinkNetworkQuality})</td>
        <td>${NERTC.NETWORK_STATUS[item.downlinkNetworkQuality]} (${item.downlinkNetworkQuality})</td>
        </tr>`
      $(tr).appendTo(tables)
    })
  })


  rtc.client.on('connection-state-change', _data => {
    console.warn(`网络状态 connection-state-change: ${_data.prevState} => ${_data.curState}, 是否重连：${_data.reconnect}`)
    const div = document.getElementById('netStatus')
    div.firstElementChild.firstElementChild.lastElementChild.innerText = ` ${_data.curState} ${_data.reconnect ? "重连" : ""}`
  })

  rtc.client.on("recording-device-changed", evt=>{
    console.log(`【${evt.state}】recording-device-changed ${evt.device.label}`, evt);
    addLog(`【${evt.state}】recording-device-changed ${evt.device.label}`);
    if (evt.state === "ACTIVE" || evt.state === "CHANGED"){
      if (evt.device.deviceId === "default" || evt.device.deviceId === ""){
        addLog(`默认麦克风已切换为【${evt.device.label}】`)
      }
    }
  })
  
  rtc.client.on("camera-changed", evt=>{
    console.log(`【${evt.state}】camera-changed ${evt.device.label}`, evt);
    addLog(`【${evt.state}】camera-changed ${evt.device.label}`);
    if (evt.state === "ACTIVE" || evt.state === "CHANGED"){
      if (evt.device.deviceId === "default" || evt.device.deviceId === ""){
        // 经测试，Chrome并没有deviceId为default的摄像头。所以并不会走入这段逻辑
        addLog(`默认摄像头已切换为【${evt.device.label}】`)
      }
    }
  })
  
  rtc.client.on("playout-device-changed", evt=>{
    console.log(`【${evt.state}】playout-device-changed ${evt.device.label}`, evt);
    addLog(`【${evt.state}】playout-device-changed ${evt.device.label}`);
    if (evt.state === "ACTIVE" || evt.state === "CHANGED"){
      if (evt.device.deviceId === "default" || evt.device.deviceId === ""){
        addLog(`默认扬声器已切换为【${evt.device.label}】`)
      }
    }
  })
  
  rtc.client.on('client-role-changed', evt => {
    addLog(`client-role-changed ${evt.role}`);
    $("#currentRole").text(evt.role);
  });
  
  rtc.client.on('@lbs-config-update', (evt)=>{
    addLog('lbs配置变为：' + rtc.client.adapterRef.lbsManager.lbsState + '。原因：' + evt.reason)
  })
  
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

function initVolumeDetect() {
  const instantMeter = document.querySelector('#instant meter');
  const instantValueDisplay = document.querySelector('#instant .value');
  setInterval(() => {
    if (rtc.client && rtc.localStream) {
      var result = rtc.localStream.getAudioLevel()
      result = result - 0
      if (isNaN(result)) {
        instantMeter.value = instantValueDisplay.innerText = 0.0
        return
      }
      instantMeter.value = instantValueDisplay.innerText = result
    }
  }, 100);
}

async function initCodecOptions(){
  const start = Date.now();
  if (rtc.client && rtc.client._getSupportedCodecs){
    let supportedCodecsRecv = await rtc.client._getSupportedCodecs("recv");
    if (supportedCodecsRecv.video.indexOf("H264") === -1){
      console.error("浏览器不支持H264。等待1秒。。。")
      while(Date.now() - start < 1000){
        supportedCodecsRecv = await rtc.client._getSupportedCodecs("recv");
        if (supportedCodecsRecv.video.indexOf("H264") === -1){
          // 停顿100毫秒后继续
          await new Promise((resolve)=>{setTimeout(resolve, 100)})
        }else{
          console.log(`H264解码器加载完成！用时 ${Date.now() - start} 毫秒`);
          break;
        }
      }
      if (supportedCodecsRecv.video.indexOf("H264") === -1){
        console.error(`浏览器确实不支持H264!`);
      }
    }
    let supportedCodecsSend = await rtc.client._getSupportedCodecs("send");
    const codecs = ["H264", "VP8"];
    $('#supported-recv-codec-wrapper').empty();
    $('#supported-send-codec-wrapper').empty();
    codecs.forEach((codec)=>{
      $('#supported-recv-codec-wrapper').append(`<label><input type="checkbox" class="codec-hacking" disabled id="supportRecv${codec}" ${(supportedCodecsRecv.video.indexOf(codec) > -1) ? "checked" : ""}>${codec}</label>`)
      $('#supported-send-codec-wrapper').append(`<label><input type="checkbox" class="codec-hacking" disabled id="supportSend${codec}" ${(supportedCodecsSend.video.indexOf(codec) > -1) ? "checked" : ""}>${codec}</label>`)
    });
  }
}

$('#init-btn').on('click', () => {
  
})

/*
  uid: number,
  $div: $div,
  uplinkNetworkQuality: "",
  downlinkNetworkQuality: "",
  audio :{
     added: boolean,
     subscribed: boolean,
     muted: boolean,
  },
 */
const remoteViews = []

function getRemoteView(uid){
  let view = null
  let i = 0
  for (; i < remoteViews.length; i++){
    if (uid == remoteViews[i].uid){
      view = remoteViews[i]
      break;
    }else if (uid < remoteViews[i].uid){
      break
    }
  }
  if (view){
    return view
  }else{
    const $div = $(`<div class="remote-view remove-view-${uid}"><div class="remote-view-title remote-view-title-${uid}"></div></div>`)
    view = {
      uid: uid,
      $div: $div,
      uplinkNetworkQuality: "",
      downlinkNetworkQuality: "",
      platformType: "",
      audio: {added: false, subscribed: false, muted: false},
      video: {added: false, subscribed: false, muted: false},
      screen: {added: false, subscribed: false, muted: false},
      audioSlave: {added: false, subscribed: false, muted: false},
    }
    if (i > 0){
      remoteViews.splice(i, 0, view)
      $div.insertAfter(remoteViews[i - 1].$div)
    }else{
      $div.insertAfter('#remote-container-title')
      remoteViews.unshift(view)
    }
    view.$div.hide()
    return view
  }
}

function updateRemoteViewInfo(){
  for (let i = 0; i < remoteViews.length; i++){
    const view = remoteViews[i]
    let title = `${view.platformType || "remote"} ${view.uid}`;
    ["audio", "video", "screen","audioSlave"].forEach((mediaType)=>{
      let infoStr = ""
      if (view[mediaType].subscribed){
        infoStr += `${mediaType}`.toUpperCase()
      }else if (view[mediaType].added){
        infoStr += `${mediaType}`
      }
      if (view[mediaType].muted){
        infoStr = `<del>${infoStr}</del>`
      }
      const remoteStream = rtc.remoteStreams[view.uid]
      if (remoteStream){
        if (mediaType === "video"){
          const track = remoteStream.mediaHelper.video.cameraTrack
          if (track){
            const settings = track.getSettings()
            if (settings && settings.width && settings.height){
              infoStr += ` ${settings.width}x${settings.height}`
            }
          }
        }
        if (mediaType === "screen"){
          const track = remoteStream.mediaHelper.screen.screenVideoTrack
          if (track){
            const settings = track.getSettings()
            if (settings && settings.width && settings.height){
              infoStr += ` ${settings.width}x${settings.height}`
            }
          }
        }
      }
      if (infoStr){
        title += " " + infoStr
      }
    })
    if (view.uplinkNetworkQuality && view.downlinkNetworkQuality){
      title += `<br>⬆${view.uplinkNetworkQuality} ⬇${view.downlinkNetworkQuality}`
    }
    const html = view.$div.children(".remote-view-title").html()
    if (html !== title){
      console.log(`更新说明【${html}】=>【${title}】`)
      view.$div.children(".remote-view-title").html(title)
    }
  }
}

const updateRemoteViewInfoTimer = setInterval(updateRemoteViewInfo, 200)

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
  // 实时音录制
  const recordType = ($('#sessionConfigRecordType').val())
  const isHostSpeaker = $('#sessionConfigIsHostSpeaker').prop('checked')
  const recordAudio = $('#sessionConfigRecordAudio').prop('checked')
  const recordVideo = $('#sessionConfigRecordVideo').prop('checked')
  // 互动直播相关
  const liveEnable = $('#sessionConfigLiveEnable').prop('checked') 
  // 媒体优先级
  //const enableMeidaPriority = $('#enableMeidaPriority').prop('checked') 
  const priority = +($('#priority').val())
  const isPreemptive = $('#isPreemptive').prop('checked')   

  let channelServer=null; statisticsServer=null; roomServer=null; demoServer=null;appkey=null;webSocketProxyServer=null;mediaProxyServer=null
  if (privatizationConfig) {
    if ($('#configUrl').val()) {
      try {
        let checkSumUrl = WEBRTC2_ENV[env].checkSumUrl
        const data = await axios.get($('#configUrl').val())
        var d = data.data;
        console.log("获取到私有化的配置参数: " + d);
        if (d.code != 200) {
          console.error("获取到私有化的配置参数失败");
          addLog('获取到私有化的配置参数失败，请检查url是否正确')
          return
        }
        channelServer = d.channelServer || test.channelServer
        statisticsServer = d.statisticsServer || test.statisticsServer
        roomServer = d.roomServer || test.roomServer
        demoServer = d.demoServer || test.demoServer
        appkey = d.appkey || test.appkey
      } catch (e) {
        console.error("获取到私有化的配置参数失败: ", e);
        addLog('获取到私有化的配置参数失败，请检查url是否正确')
        return
      }
    } else {
      appkey = $('#privatizationAppkey').val() || privatizationConfig.appkey
      channelServer = $('#channelServer').val() || privatizationConfig.channelServer
      statisticsServer = $('#statisticsServer').val() || privatizationConfig.statisticsServer
      roomServer = $('#roomServer').val() || privatizationConfig.roomServer
      demoServer = $('#demoServer').val() || privatizationConfig.demoServer
      webSocketProxyServer = privatizationConfig.webSocketProxyServer
      mediaProxyServer =  privatizationConfig.mediaProxyServer
    }

    if (appkey) {
      $('#appkey').val(appkey)
      $('#privatizationAppkey').val(appkey)
      $('#channelServer').val(channelServer)
      $('#statisticsServer').val(statisticsServer)
      $('#roomServer').val(roomServer)
      $('#demoServer').val(demoServer)
      const proxyServer =  rtc.client.adapterRef.proxyServer
      init()
      rtc.client.adapterRef.proxyServer = proxyServer
    } else {
      console.error("私有化配置: 没有获取appkey");
      addLog('私有化配置: 没有获取appkey，请检查设置的参数是否正确')
      return
    }
  }
  
  
  console.info('开始加入房间')
  rtc.client.setLocalMediaPriority({
    priority,
    preemtiveMode: isPreemptive
  })

  rtc.client.adapterRef.testConf = {
    turnAddr: $('#isTurnAddrConf').prop('checked') ? $('#isTurnAddrConf').prop('checked') && $('#turnAddr').val() : null,
  }

  //supportedCodec用于测试
  if ($("#enableCodecHacking").prop("checked")){
    const supportedCodecRecv = [];
    if ($("#supportRecvH264").prop("checked")){
      supportedCodecRecv.push("H264");
    }
    if ($("#supportRecvVP8").prop("checked")){
      supportedCodecRecv.push("VP8");
    }
    rtc.client.adapterRef.mediaCapability.supportedCodecRecv = supportedCodecRecv;
    const supportedCodecSend = [];
    if ($("#supportSendH264").prop("checked")){
      supportedCodecSend.push("H264");
    }
    if ($("#supportSendVP8").prop("checked")){
      supportedCodecSend.push("VP8");
    }
    rtc.client.adapterRef.mediaCapability.supportedCodecSend = supportedCodecSend;
  }
  rtc.client.join({
    channelName,
    uid: uid,
    token: $("#token").val(),
    wssArr: $('#isGetwayAddrConf').prop('checked') ? $('#getwayAddr').val().split(",") : null,
    joinChannelRecordConfig: {
      isHostSpeaker,
      recordAudio,
      recordVideo,
      recordType
    },
    joinChannelLiveConfig: {
      liveEnable
    },
    neRtcServerAddresses: {
      channelServer,
      statisticsServer,
      roomServer,
      cloudProxyServer: '',
      webSocketProxyServer,
      mediaProxyServer,
    }
  }).then((obj) => {
    addLog('加入房间成功')
    console.info('加入房间成功')
    if (rtc.localStream && rtc.localStream.inited){
      // localStream已经初始化了
      if ($('#autoPub').prop('checked')) {
        publish()
        updateLocalWatermark();
      }
      return;
    }

    const enableAudio = $('input[name="enableAudio"]:checked').val();
    const enableVideo = $('input[name="enableVideo"]:checked').val();
    const enableScreen = $('input[name="enableScreen"]:checked').val();
    const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val();
    if (rtc.localStream && !rtc.localStream.destroyed){
      addLog("已有localStream，不重复创建")
      // 发布
      if ($('#autoPub').prop('checked')) {
        if (rtc.client.adapterRef.connectState.curState === 'CONNECTED'){
          publish()
          updateLocalWatermark()
        }
      }
    }else if (enableAudio || enableVideo || enableScreen || enableScreenAudio || NERTC.getParameters().allowEmptyMedia || true){
      initLocalStream()
    }else{
      addLog("加入频道后未执行初始化本地流")
    }
    const channelInfo = rtc.client.getChannelInfo()
    $('#cid').html(`${channelInfo.cid} <a target="_blank" href="https://qs.netease.im/qs_inner/v2/static/rtc2/channel/detail-inner?cid=${channelInfo.cid}&uids=${channelInfo.uid}">QS</a> <a target="_blank" href="http://logsearch.hz.netease.com/vcloud_elk_ssd_online/app/kibana#/discover?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-30d,mode:quick,to:now))&_a=(columns:!(data,cid),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',key:TAG,negate:!f,params:(query:web_console_test,type:phrase),type:phrase,value:web_console_test),query:(match:(TAG:(query:web_console_test,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',key:cid,negate:!f,params:(query:'${channelInfo.cid}',type:phrase),type:phrase,value:'${channelInfo.cid}'),query:(match:(cid:(query:'${channelInfo.cid}',type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',key:uid,negate:!f,params:(query:'${channelInfo.uid}',type:phrase),type:phrase,value:'${channelInfo.uid}'),query:(match:(uid:(query:'${channelInfo.uid}',type:phrase))))),index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',asc))&1=1">日志</a>`)
  },
  error =>{
    console.error('加入房间失败',error)
    addLog('加入房间失败: '+ error)
  })
  
})

$('#destroyLocalStream').on('click', () => {
  rtc.localStream.destroy();
})

$('#destroy-btn').on('click', () => {
  rtc.client.destroy();
})

window.timesyncMs = parseInt(window.localStorage.getItem(`${localStoragePrefix}timesync-${env}`)) || 0
if (timesyncMs){
  $("#timesync-info").text(` ${timesyncMs}毫秒`)
}
$('#timesync-btn').on('click', ()=>{
  const value = parseInt($('#timesync-value').val())
  timesyncMs = value
  $("#timesync-info").text(` ${timesyncMs}毫秒`)
  window.localStorage.setItem(`${localStoragePrefix}timesync-${env}`, value)
})

window.customTransform = ""
$('#setTransform').on('click', () => {
  let customTransform = $("#customTransform").val()
  rtc.client.enableCustomTransform(!!customTransform)
  if (customTransform === "transparentWithFlagOff"){
    // 该模式下向服务端上报的 customEncryption 字端为false
    NERTC.getParameters().forceCustomEncryptionOff = true
  }
  window.customTransform = customTransform
  initCustomEncrypt()
  if (!customTransform){
    addLog("已关闭自定义加密")
  }else if (customTransform === "rc4"){
    initRC4()
  }else if (customTransform === "sm4-128-ecb"){
    initSm4()
  } else if (customTransform === "transparentWithFlagOn" || customTransform === "transparentWithFlagOff"){
    initTransparent(customTransform)
  }else{
    addLog("初始化自定义加密：" + customTransform)
  }
})

$('#leaveChannel-btn').on('click', async() => {
  addLog('离开房间')
  console.info('开始离开房间...')
  clearInterval(audioEffectsPlayTimer);
  

  $('#segmentStatus').html('loading').hide();
  $('#advancedBeautyStatus').html('loading').hide();
  window.rtc.client.leave()
  rtc.enableBodySegment = false
  rtc.enableAdvancedBeauty = false
  rtc.remoteStreams.length = 0
  subList.length = 0
  clearInterval(playTimer)
  progressInfo.innerText = fileName + '00 : 00' + ' / ' + formatSeconds(totalTime)
  progress.value = 0
  window.infoWindow && window.infoWindow.close()
  window.infoWindow = null
  $("#netQuality tr:not(:first)").remove();
  currentSpeaker = {}
  rtc.succTasksList = []
  rtc.failTasksList = []
  watermarks = {local: null, remote: {}};
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

$('#refreshDevices').on('click', () =>{
  initDevices(true);
})

/**
 * ----------------------------------------
 *              基础美颜
 * ----------------------------------------
 */

 const range0 = document.getElementById("filterIntensity"); // 滤镜明亮度
 const range1 = document.getElementById("r1"); // 明亮度
 const range2 = document.getElementById("r2"); // 美白
 const range3 = document.getElementById("r3"); // 红润
 const range4 = document.getElementById("r4"); // 平滑
 

// 预设美颜参数
let preEffects;
$('#preSetBeauty').on('click', () => {
  // if (!rtc.localStream) {
  //   assertLocalStream()
  //   return
  // }
  const meibaiVal = $('#setMeibai').val() || 0
  const hongrunVal = $('#setHongrun').val() || 0
  const pinghuaVal = $('#setPinghua').val() || 0
  preEffects = {
    brightnessLevel: Number(meibaiVal),
    rednessLevel: Number(hongrunVal),
    smoothnessLevel: Number(pinghuaVal)
  }
  console.log('预设美颜参数：', preEffects);
})

$('#startBeauty').on('click', async() => {
  await rtc.localStream.setBeautyEffect(true);
  console.warn('开启美颜功能');
  if(preEffects){
    rtc.localStream.setBeautyEffectOptions(preEffects);
  }
})

$('#closeBeauty').on('click', async() => {
  await rtc.localStream.setBeautyEffect(false);
  console.warn('关闭美颜功能');
})

// const lut = $('#setBeautyFilter').val();
const lutSelect = document.getElementById('setBeautyFilter');
let lut;
lutSelect.addEventListener('change', (e) => {
  const options = [
      null,
      'ziran',
      'baixi',
      'fennen',
      'weimei',
      'langman',
      'rixi',
      'landiao',
      'qingliang',
      'huaijiu',
      'qingcheng',
      'wuhou',
      'zhigan',
      'mopian',
      'dianying',
      'heibai'
  ];
  const optsIndex = e.target.selectedIndex;
  lut = options[optsIndex];
  console.log('optsIndex',optsIndex, 'lut',lut);
  range0.disabled = lut ? false : true;
  rtc.localStream.setFilter(lut);
});


range0.addEventListener('change', () => {
  const val = Number(range0.value);
  rtc.localStream.setFilter(lut, val);
})

range2.addEventListener('change', () => {
  const val = Number(range2.value) / 100;
  let effects = {
    brightnessLevel: val
  }
  rtc.localStream.setBeautyEffectOptions(effects);
})
range3.addEventListener('change', () => {
  const val = Number(range3.value) / 100;
  let effects = {
    rednessLevel: val
  }
  rtc.localStream.setBeautyEffectOptions(effects);
})

range4.addEventListener('change', () => {
  const val = Number(range4.value) / 100;
  let effects = {
    smoothnessLevel: val
  }
  rtc.localStream.setBeautyEffectOptions(effects);
})

function onPluginLoaded(name) {
  console.log('onPluginLoaded', name)
  if (name == 'VirtualBackground') {
    //rtc.localStream.enableBodySegment();
    $('#segmentStatus').html('loaded').show();
    rtc.enableBodySegment = true
  } else if (name == 'AdvancedBeauty') {
    //const maxFaceSize = document.getElementById('adv-face-size');
    //rtc.localStream.enableAdvancedBeauty(Number(maxFaceSize.value));
    $('#advancedBeautyStatus').html('loaded').show();
    rtc.enableAdvancedBeauty = true
  }
}

$('#registerVitrualBackground').on('click', async () => {
  $('#segmentStatus').html('loading').show();
  const type = await wasmFeatureDetect.simd() ? 'chrome' : 'safari';
  segment_config = virtualBackgroundPluginConfig[NERTC.ENV][type];
  rtc.localStream.registerPlugin(segment_config)
})

$('#enableSegment').on('click', () => {
  if (rtc.localStream && rtc.enableBodySegment) {
    rtc.localStream.enableBodySegment();
  } else {
    //console.warn('当前没有启动localStream，先记录状态');
  }
})

$('#disableSegment').on('click', () => {
  if (rtc.localStream) {
    console.warn('关闭背景分割'); 
    rtc.localStream.disableBodySegment();
  } else {
    console.warn('当前没有启动localStream，先记录状态');
  }
})

$('#unregisterVitrualBackground').on('click', () => {
  $('#segmentStatus').html('loading').hide();
  rtc.localStream.unregisterPlugin(segment_config.key)
  rtc.enableBodySegment = false
})

$('#registerAdvancedBeauty').on('click', async () => {
  $('#advancedBeautyStatus').html('loading').show();
  const type = await wasmFeatureDetect.simd() ? 'chrome' : 'safari';
  beauty_config = advancedBeautyPluginConfig[NERTC.ENV][type];
  rtc.localStream.registerPlugin(beauty_config)  
})

$('#advancedBeauty').on('click', () => {
  if (rtc.localStream && rtc.enableAdvancedBeauty) {
    const maxFaceSize = document.getElementById('adv-face-size');
    rtc.localStream.enableAdvancedBeauty(Number(maxFaceSize.value));
  } else {
    //console.warn('当前没有启动localStream，先记录状态');
  }
})

$('#closeAdvancedBeauty').on('click', () => {
  if(rtc.localStream){
    console.warn('关闭高级美颜');
    rtc.localStream.disableAdvancedBeauty();
  }
})

$('#resetAdvBeauty').on('click', () => {
  if(rtc.localStream){
    console.warn('重置高级美颜');
    rtc.localStream.setAdvBeautyEffect('reset');
  }
})
$('#presetAdvBeauty').on('click', () => {
  if(rtc.localStream){
    rtc.localStream.presetAdvBeautyEffect({
    // 大眼
    'enlargeEye': 0.25,
    // 圆眼
    'roundedEye': 0.5,
     // 窄脸
     'narrowedFace': 0.25,
     // 瘦脸
     'shrinkFace': 0.15,
     // v 脸
     'vShapedFace': 0.33,
     // 小脸
     'minifyFace': 0.15,
     // 亮眼
     'brightenEye': 0.75,
     // 美牙
     'whitenTeeth': 0.75
    });
  }
})

$('#unregisterAdvancedBeauty').on('click', () => {
  $('#advancedBeautyStatus').html('loading').hide();
  rtc.localStream.unregisterPlugin(beauty_config.key)
  rtc.enableAdvancedBeauty = false
})

document.getElementById('select').onchange = function () {
  let file = this.files[0];
  let reader = new FileReader();
  reader.onload = function () {
      const img = new Image();
      img.src = this.result;
      img.onload = () => {
        rtc.localStream.setBackGround({type: 'image', source: img})
      }  
      //rtc.localStream.setBackGround({type: 'image', source: this.result})
  };
  reader.readAsDataURL(file);
}

$('#red').on('click', () => {
  rtc.localStream.setBackGround({type: 'color', color: '#ff0000'})
});

$('#green').on('click', () => {
  rtc.localStream.setBackGround({type: 'color', color: '#00ff00'})
});

$('#blue').on('click', () => {
  rtc.localStream.setBackGround({type: 'color', color: '#0000ff'})
});

$('#blur').on('click', () => {
  let level = $('#level').val();
  rtc.localStream.setBackGround({type: 'blur', level: parseInt(level)})
});

$('#level').on('change', () => {
  let level = $('#level').val();
  console.log('level', level);
  rtc.localStream.setBackGround({type: 'blur', level: parseInt(level)})
});

// 高级美颜
const keyMap = {
  'enlargeEye':'adv-enlarge-eye',
  'roundedEye':'adv-rounded-eye',
  'openCanthus':'adv-open-canthus',
  'eyeDistance':'adv-eye-distance',
  'eyeAngle':'adv-eye-angle',
  'shrinkNose':'adv-shrink-nose',
  'lengthenNose':'adv-lengthen-nose',
  'shrinkMouth':'adv-shrink-mouth',
  'mouthCorners':'adv-mouth-corners',
  'adjustPhiltrum':'adv-adjust-philtrum',
  'shrinkUnderjaw':'adv-shrink-underjaw',
  'shrinkCheekbone':'adv-shrink-cheekbone',
  'lengthenJaw':'adv-lengthen-jaw',
  'narrowedFace':'adv-narrowed-face',
  'shrinkFace': 'adv-shrink-face',
  'vShapedFace':'adv-vshaped-face',
  'minifyFace':'adv-minify-face',
  'whitenTeeth':'adv-whiten-teeth',
  'brightenEye': 'adv-brighten-eye'
}

for(const key in keyMap){
  $(`#${keyMap[key]}`).on('input', (e)=>{
    if(rtc.localStream){
      rtc.localStream.setAdvBeautyEffect(key, Number(e.target.value));
    }
  })
}


/**
 * ----------------------------------------
 *              订阅、发布
 * ----------------------------------------
 */
$('#initLocalStream').on('click', () => {
  if (rtc.localStream && rtc.localStream.inited) {
    addLog('已经初始化过了，请勿重复操作')
    return
  }
  
  initLocalStream()
})


$('#pub').on('click', () => {
  publish()
  updateLocalWatermark()
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

$('#unsubAudio').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }

  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]

  remoteStream.setSubscribeConfig({
    audio: false
  })

  rtc.client.subscribe(remoteStream).then(()=>{
    console.log('本地 取消订阅音频 成功')
    addLog('本地 取消订阅音频 成功')
  }).catch(err=>{
    addLog('本地 取消订阅音频 失败')
    console.log('本地 取消订阅音频 失败: ', err)
  })
})

$('#unsubAudioSlave').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }

  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]

  // remoteStream.setSubscribeConfig({
  //   audioSlave: false
  // })

  rtc.client.unsubscribe(remoteStream, 'audioSlave').then(()=>{
    console.log('本地 取消订阅音频辅流 成功')
    addLog('本地 取消订阅音频辅流 成功')
  }).catch(err=>{
    addLog('本地 取消订阅音频辅流 失败')
    console.log('本地 取消订阅音频辅流 失败: ', err)
  })

})


$('#unsubVideo').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }

  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]

  // remoteStream.setSubscribeConfig({
  //   video: false
  // })

  rtc.client.unsubscribe(remoteStream, 'video').then(()=>{
    console.log('本地 取消订阅视频 成功')
    addLog('本地 取消订阅视频 成功')
  }).catch(err=>{
    addLog('本地 取消订阅视频 失败')
    console.log('本地 取消订阅视频 失败: ', err)
  })
})


$('#unsubScreen').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }

  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]

  remoteStream.setSubscribeConfig({
    screen: false
  })

  rtc.client.subscribe(remoteStream).then(()=>{
    console.log('本地 取消订阅辅流 成功')
    addLog('本地 取消订阅辅流 成功')
  }).catch(err=>{
    addLog('本地 取消订阅辅流 失败')
    console.log('本地 取消订阅辅流 失败: ', err)
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

$('#switchHigh').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }
  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]
  
  const highorlow = NERTC.STREAM_TYPE.HIGH;
  // 0是大流，1是小流
  const mediaType = $("#switchMediaType").val();
  if (mediaType === "video"){
    rtc.client.setRemoteVideoStreamType(remoteStream, highorlow)
  }else{
    rtc.client.setRemoteStreamType(remoteStream, highorlow, mediaType);
  }
})

$('#switchLow').on('click', () => {
  if (!rtc.remoteStreams[subList[subList.selectedIndex].value]) {
    addLog('无法进行此操作')
    return
  }
  let remoteStream = rtc.remoteStreams[subList[subList.selectedIndex].value]

  const highorlow = NERTC.STREAM_TYPE.LOW;
  // 0是大流，1是小流
  const mediaType = $("#switchMediaType").val();
  if (mediaType === "video"){
    rtc.client.setRemoteVideoStreamType(remoteStream, highorlow)
  }else{
    rtc.client.setRemoteStreamType(remoteStream, highorlow, mediaType);
  }
})

$("#subscribeAll").on("click", ()=>{
  $("#subAudio").prop("checked", true)
  $("#subAudioSlave").prop("checked", true)
  $("#subVideo").prop("checked", true)
  $("#subScreen").prop("checked", true)
  for (let uid in rtc.client.adapterRef.remoteStreamMap){
    const remoteStream = rtc.client.adapterRef.remoteStreamMap[uid]
    if (remoteStream.active){
      remoteStream.setSubscribeConfig({
        audio: true,
        video: true,
        screen: true,
        audioSlave: true
      })
      rtc.client.subscribe(remoteStream)
    }
  }
})

$("#unsubscribeAll").on("click", ()=>{
  $("#subAudio").prop("checked", false)
  $("#subAudioSlave").prop("checked", false)
  $("#subVideo").prop("checked", false)
  $("#subScreen").prop("checked", false)
  for (let uid in rtc.client.adapterRef.remoteStreamMap){
    const remoteStream = rtc.client.adapterRef.remoteStreamMap[uid]
    rtc.client.unsubscribe(remoteStream)
  }
})

$('#openAsl').on('click', () => {
  rtc.client.openAslMode()
})

$('#closeAsl').on('click', () => {
  rtc.client.closeAslMode()
})

$('#enableCodecHacking').on('change', ()=>{
  console.error("Here");
  if ($("#enableCodecHacking").prop("checked")){
    $(".codec-hacking").removeAttr("disabled");
  }else{
    $(".codec-hacking").attr("disabled", "disabled");
  }
});

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
  rtc.screenVideoSource = rtc.screenVideoSource && rtc.screenVideoSource.readyState === "live" ? rtc.screenVideoSource :getVideoSource("screen")
  rtc.localStream.switchScreenStream({screenVideoSource:rtc.screenVideoSource});
})


$('#switchScreenShare').on('click', () => {
  rtc.localStream.switchScreenStream({screenAudio:true});
})


function initLocalStream() {
  let sourceId = "";
  if ($("#enableScreen").prop("checked")){
    sourceId = getUrlVars().sourceId;
    if (sourceId){
      addLog("Electron屏幕共享：" + sourceId)
    }
  }

  const enableAudio = $('input[name="enableAudio"]:checked').val()
  const audio = !!enableAudio;
  let audioSource;
  if (enableAudio === "source"){
    rtc.audioSource = rtc.audioSource && rtc.audioSource.readyState === "live" ? rtc.audioSource : getAudioSource("audio")
    audioSource = rtc.audioSource
  }else{
    audioSource = null
  }
  
  const enableVideo = $('input[name="enableVideo"]:checked').val()
  const video = !!enableVideo;
  let videoSource;
  if (enableVideo === "source"){
    rtc.videoSource = rtc.videoSource && rtc.videoSource.readyState === "live" ? rtc.videoSource :getVideoSource("video")
    videoSource = rtc.videoSource;
  }else{
    videoSource = null
  }
  
  const enableScreen = $('input[name="enableScreen"]:checked').val()
  const screen = !!enableScreen;
  let screenVideoSource;
  if (enableScreen === "source"){
    rtc.screenVideoSource = rtc.screenVideoSource && rtc.screenVideoSource.readyState === "live" ? rtc.screenVideoSource :getVideoSource("screen")
    screenVideoSource = rtc.screenVideoSource;
  }else{
    screenVideoSource = null
  }

  const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val()
  const screenAudio = !!enableScreenAudio;
  let screenAudioSource;
  if (enableScreenAudio === "source"){
    rtc.screenAudioSource = rtc.screenAudioSource && rtc.screenAudioSource.readyState === "live" ? rtc.screenAudioSource : getAudioSource("screenAudio")
    screenAudioSource = rtc.screenAudioSource
  }else{
    screenAudioSource = null
  }
  
  const createStreamOptions = {
    uid: getUidFromDomInput() || rtc.client.getChannelInfo().uid,
    audio,
    audioProcessing: getAudioProcessingConfig(),
    microphoneId: $('#micro').val(),
    video,
    screen,
    screenAudio,
    sourceId: sourceId,
    audioSource,
    videoSource,
    screenAudioSource,
    screenVideoSource,
  };
  if ($('#camera').val()){
    createStreamOptions.cameraId = $('#camera').val();
  }
  if ($('#cameraFacingMode').val()){
    createStreamOptions.facingMode = $('#cameraFacingMode').val();
  }
  if ($('#micro').val()){
    createStreamOptions.microphoneId = $('#micro').val();
  }
  try{
    rtc.localStream = NERTC.createStream(createStreamOptions);
  }catch(e){
    addLog('初始化本地流失败' + e)
    throw e;
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

  const audioProfile = $('#sessionConfigAudioProfile').val();
  if (audioProfile){
    rtc.localStream.setAudioProfile(audioProfile)
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
  
  rtc.localStream.init().then(async()=>{
    const playOptions = $('#localPlayOptionsEnabled').prop('checked') ? {
      audio: $("#localPlayOptionsAudio").prop('checked'),
      audioType: $("#localPlayOptionsAudioType").val(),
      video: $("#localPlayOptionsVideo").prop('checked'),
      screen: $("#localPlayOptionsScreen").prop('checked'),
    } : null;

    await rtc.localStream.play(document.getElementById('local-container'), playOptions)
    console.warn('音视频初始化完成，播放本地视频', playOptions);
    rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    updateLocalWatermark()
    if(!$('#camera').val()){
      initDevices()
    }

    // 发布
    if ($('#autoPub').prop('checked')) {
      if (rtc.client.adapterRef.connectState.curState === 'CONNECTED'){
        publish()
        updateLocalWatermark()
      }
    }
  }).catch(err=>{
    console.warn('音视频初始化失败: ', err)
    addLog('音视频初始化失败, 请检查设备列表')
    //rtc.localStream = null
  })
  //插件
  rtc.localStream.on('plugin-load', onPluginLoaded);
}

function updateLocalWatermark(){
  try{
    if (watermarks.local){
      if (document.getElementById('watermark-type').value === "encoding"){
        console.log("更新编码水印", watermarks.local.video)
        if (watermarks.local.video){
          addLog("更新编码水印 video")
          rtc.localStream.setEncoderWatermarkConfigs(watermarks.local.video);
        }
        if (watermarks.local.screen){
          addLog("更新编码水印 screen")
          rtc.localStream.setEncoderWatermarkConfigs(watermarks.local.screen);
        }
        
      }else{
        console.log("更新画布水印")
        addLog("更新画布水印")
        rtc.localStream.setCanvasWatermarkConfigs(watermarks.local);
      }
    }else if ($('#idWatermark').prop('checked')){
      rtc.localStream.setCanvasWatermarkConfigs({
        textWatermarks: [{
          content: 'video ' + rtc.localStream.getId(),
        }],
      });
      rtc.localStream.setCanvasWatermarkConfigs({
        mediaType: "screen",
        textWatermarks: [{
          content: 'screen ' + rtc.localStream.getId(),
        }],
      });
    }  
  }catch(e){
    console.error(e.name, e.message, e.stack)
  }
}

function publish() {
  console.warn('开始发布视频流')
  addLog('开始发布视频流')
  if (rtc.client.adapterRef.mediaCapability && $("#enableCodecHacking").prop("checked")){
    let preferredCodecSend = {video: [], screen: []};
    if ($("#supportSendH264").prop("checked")){
      preferredCodecSend.video.push("H264");
      preferredCodecSend.screen.push("H264");
    }
    if ($("#supportSendVP8").prop("checked")){
      preferredCodecSend.video.push("VP8");
      preferredCodecSend.screen.push("VP8");
    }
    rtc.client.adapterRef.mediaCapability.preferredCodecSend = preferredCodecSend;
  }
  rtc.client.enableDualStream({
    video: $("#videoLow").prop("checked"),
    screen: $("#screenLow").prop("checked"),
  })
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
    audio: $('#subAudio').prop('checked'),
    audioSlave: $('#subAudioSlave').prop('checked'),
    video: $('#subVideo').prop('checked'),
    screen: $('#subScreen').prop('checked'),
  }
  if (subscribeConfig.video && $("#subResolutionVideo").val()){
    subscribeConfig.video = $("#subResolutionVideo").val();
  }
  if (subscribeConfig.screen && $("#subResolutionScreen").val()){
    subscribeConfig.screen = $("#subResolutionScreen").val();
  }
  remoteStream.setSubscribeConfig(subscribeConfig)

  rtc.client.subscribe(remoteStream).then(()=>{
    if (!remoteStream.active){
      console.warn("订阅期间远端已离开")
      return
    }
    console.log(`subscribe 成功 ${remoteStream.streamID}`)
    addLog(`subscribe 成功 ${remoteStream.streamID}`)
    if (watermarks.remote[remoteStream.streamID]){
      remoteStream.setCanvasWatermarkConfigs(watermarks.remote[remoteStream.streamID].video);
      remoteStream.setCanvasWatermarkConfigs(watermarks.remote[remoteStream.streamID].screen);
    }else if ($('#idWatermark').prop('checked')){
      remoteStream.setCanvasWatermarkConfigs({
        mediaType: "video",
        textWatermarks: [{
          content: 'video ' + remoteStream.streamID,
        }],
      });
      remoteStream.setCanvasWatermarkConfigs({
        mediaType: "screen",
        textWatermarks: [{
          content: 'screen ' + remoteStream.streamID,
        }],
      });
    }
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
    assertLocalStream()
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
    assertLocalStream()
  }
})

$('#muteAudioSlave').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('muteAudioSlave: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.muteAudioSlave().catch(err =>{
      addLog('muteAudioSlave 错误：' + err)
      console.log('muteAudioSlave 错误：', err)
    })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if (rtc.localStream) {
    rtc.localStream.muteAudioSlave().catch(err =>{
      addLog('muteAudioSlave 错误：' + err)
      console.log('muteAudioSlave 错误：', err)
    })
  } else {
    assertLocalStream()
  }
})

$('#unmuteAudioSlave').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('unmuteAudioSlave: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.unmuteAudioSlave().catch(err =>{
        addLog('unmuteAudioSlave 错误：' + err)
        console.log('unmuteAudioSlave 错误：', err)
      })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if(rtc.localStream){
    rtc.localStream.unmuteAudioSlave().catch(err =>{
      addLog('unmuteAudioSlave 错误：' + err)
      console.log('unmuteAudioSlave 错误：', err)
    })
  } else {
    assertLocalStream()
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
    assertLocalStream()
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
    assertLocalStream()
  }
})


$('#muteScreen').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('muteScreen: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.muteScreen().catch(err =>{
        addLog('muteScreen 错误：' + err)
        console.log('muteScreen 错误：', err)
      })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if(rtc.localStream) {
    rtc.localStream.muteScreen().catch(err =>{
      addLog('muteScreen 错误：' + err)
      console.log('muteScreen 错误：', err)
    })
  } else {
    assertLocalStream()
  }
})

$('#unmuteScreen').on('click', () => {
  let uid = $('#part-play input[name="uid"]').val()
  console.warn('unmuteScreen: ', uid)
  if (uid) {
    let remoteStream = rtc.remoteStreams[uid]
    if (remoteStream) {
      remoteStream.unmuteScreen().catch(err =>{
        addLog('unmuteScreen 错误：' + err)
        console.log('unmuteScreen 错误：', err)
      })
    } else {
      console.warn('请检查uid是否正确')
      addLog('请检查uid是否正确')
      return
    }
  } else if(rtc.localStream){
    rtc.localStream.unmuteScreen().catch(err =>{
      addLog('unmuteScreen 错误：' + err)
      console.log('unmuteScreen 错误：', err)
    })
  } else {
    assertLocalStream()
  }
})

// 设置自己的画面
$('#setLocal').on('click', () => {
  if (!rtc.localStream) {
    assertLocalStream()
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
  const mediaType = $("#localRenderMediaType").val() || undefined;
  window.rtc.localStream.setLocalRenderMode(window.globalConfig.localViewConfig, mediaType)
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

  const mediaType = $("#remoteRenderMediaType").val() || undefined;
  remoteStream.setRemoteRenderMode({
    width: +width,
    height: +height,
    cut
  }, mediaType)
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

$('#setAudioSlavePlayVolume').on('click', () => {
  const uid = $('#part-volume input[name="uid"]').val()
  let volume = $('#playAudioSlaveVolumeInput').val()
  let remoteStream = rtc.remoteStreams[uid]
  if (!remoteStream) {
    console.warn('请检查uid是否正确')
    addLog('请检查uid是否正确')
    return
  }
  volume = parseInt(volume)
  volume = remoteStream.setAudioSlaveVolume(volume)
  $('#playAudioSlaveVolumeInput').val(volume)
})


$('#setCaptureVolumeType').on('click', () => {
  if (!rtc.localStream) {
    assertLocalStream()
    return
  }

  let mediaTypeAudio = $('#captureVolumeType').val();
  let volume = $('#captureVolumeTypeInput').val()
  volume = parseInt(volume)
  if (mediaTypeAudio){
    volume = rtc.localStream.setCaptureVolume(volume, mediaTypeAudio)
  }else{
    volume = rtc.localStream.setCaptureVolume(volume)
  }
  if (volume) {
    addLog('设置采集音频错误:' + mediaTypeAudio + " " + volume)
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
  const stream = uid ? rtc.remoteStreams[uid] : rtc.localStream;
  if (!stream) {
    console.warn('请检查uid是否正确')
    addLog('请检查uid是否正确')
    return
  }
  addLog('设置音频输出设备:' + uid + " " + deviceId);
  stream.setAudioOutput(deviceId);
  
});

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
 *              金融私有化录制逻辑
 * ----------------------------------------
 */
const screenProfile = $('#sessionConfigScreenProfile').val()
// 开始录制
$('#recordVideoPro').on('click', async (_event) => {
  console.log('金融私有化录制: 开始录制')
  const result = await rtc.client.startMediaRecording({
    recorder: $('#part-record-pro input[name="recordType"]:checked').val(),
    recordConfig: {
      recordType: $('#part-record-pro input[name="recordMediaType"]:checked').val(),
      recordName: $('#recordName').val(),
      recordVideoQuality: NERTC[$('#recordVideoQuality').val()],
      recordVideoFrame: NERTC[$('#recordVideoFrame').val()]
    }
  })
})

// 结束录制
$('#recordVideoEndPro').on('click', async (_event) => {
  console.log('金融私有化录制: 结束录制')
  try{
    await rtc.client.stopMediaRecording()
  }catch(e) {
    console.error(e)
    addLog(e.message)
  }
  
})

// 下载文件
$('#recordDownloadPro').on('click', async (_event) => {
  console.log('金融私有化录制: 下载文件')
  try{
    await rtc.client.downloadMediaRecording()
  }catch(e) {
    console.error(e)
    addLog(e.message)
  }
})
// 清理文件
$('#recordCleanPro').on('click', async (_event) => {
  console.log('金融私有化录制: 清理文件')
  try{
    await rtc.client.cleanMediaRecording()
  }catch(e) {
    console.error(e)
    addLog(e.message)
  }
})

/** 
 * ----------------------------------------
 *              本地录制逻辑
 * ----------------------------------------
 */
function getRecordId() {
  return $('#part-record .recordId').val()
}
// 开始录制
$('#recordVideo').on('click', async (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if ((rtc.client.getUid() == uid) || !uid) {
    console.log("录制本地");
    stream = rtc.localStream
  } else {
    console.log("录制远端");
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

// 播放文件
$('#recordPlayback').on('click', async (_event) => {
  let stream
  let uid = $('#recordUid').val()
  if (rtc.client.getUid() == uid || !uid) {
    stream = rtc.localStream
  } else {
    stream = rtc.remoteStreams[uid]
  }
  $('#mediaRecordingPlayback').html('');
  const result = await stream.playMediaRecording({
    view: document.getElementById('mediaRecordingPlayback'),
    recordId: getRecordId()
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
  $("#mediaRecordingPlayback").html('')
  stream.cleanMediaRecording({
    recordId: getRecordId()
  })
})

$(".block-header").on("click", function (evt){
  $(this).next(".part").toggleClass("hide")
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
  if (videoQuality){
    window.rtc.localStream && window.rtc.localStream.setVideoProfile({
      resolution: NERTC.VIDEO_QUALITY[videoQuality]
    })
  }else{
    addLog("该videoQuality无效")
  }
})

//重新设置屏幕共享分辨率
$('#sessionConfigScreenProfile').on('change', () => {
  const screenProfile = $('#sessionConfigScreenProfile').val()
  if (screenProfile){
    window.rtc.localStream && window.rtc.localStream.setScreenProfile({
      resolution: NERTC.VIDEO_QUALITY[screenProfile]
    })
  }else{
    addLog(`该screenProfile无效`)
  }
})

//重新设置帧率
$('#sessionConfigVideoFrameRate').on('change', () => {
  const frameRate = $('#sessionConfigVideoFrameRate').val()
  window.rtc.localStream && window.rtc.localStream.setVideoProfile({
    frameRate: NERTC.VIDEO_FRAME_RATE[frameRate]
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

$('#allowRemoteAudioRendering').click(async ()=>{
  $("#remotePlayOptionsAudio").removeAttr("checked");
});

/**
 * ----------------------------------------
 *             云代理
 * ----------------------------------------
 */
$('#startProxyServer-btn').click(()=>{
  addLog('启动云代理');
  console.log('启动云代理')
  rtc.client.startProxyServer()
});
$('#stopProxyServer-btn').click(()=>{
  addLog('关闭云代理');
  console.log('关闭云代理')
  rtc.client.stopProxyServer()
});


/**
 * ----------------------------------------
 *             用户角色
 * ----------------------------------------
 */
$('#setRoleHost-btn').click(async ()=>{
  addLog('尝试切换为主播');
  await rtc.client.setClientRole("host");
});
$('#setRoleAudience-btn').click(async ()=>{
  addLog('尝试切换为观众');
  await rtc.client.setClientRole("audience");
});

/**
 * ----------------------------------------
 *             截图
 * ----------------------------------------
 */
$('#snapshot').click(function(event) {
  if (rtc.client) {
    let stream
    let uid = $('#snapshotAccount').val()
    let mediaType = $('#snapType').val()
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
      mediaType: mediaType,
      name: $('#snapshotName').val()
    }).then(res => {
      console.log('截图成功' + mediaType)
      addLog('截图成功' + mediaType)
    }).catch(err => {
      console.log('截图失败: ' + mediaType, err)
      addLog('截图失败' + mediaType)
    })
  }
})

/**
 * ----------------------------------------
 *             截图生成 base64
 * ----------------------------------------
 */
 $('#snapshotbase64').click(function(event) {
  if (rtc.client) {
    let stream
    let uid = $('#snapshotAccount').val()
    let mediaType = $('#snapType').val()
    console.warn('截图生成 base64: ', uid)
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
    let base64Url = stream.takeSnapshotBase64({mediaType: mediaType});
    let base64Input = document.getElementById('base64Text');
    base64Input.value = base64Url;
    base64Input.select();
    document.execCommand('copy');
    console.warn('截图生成 base64: ',base64Url);
  }
})

/**
 * ----------------------------------------
 *             音效相关
 * ----------------------------------------
 */

/**
 * 音效文件一
 */ 
 
  let audioEffectsPlayTimer = null
  let isAudioEffectsTotalTime = 0
  let isAudioEffectsEnd = false
  let isAudioEffectsPuase = false
for (i = 1; i < 4; i++ ) {
  let audioEffectsProgressInfo = document.querySelector(`#audioEffects${i} .value`);
    let audioEffectsProgress = document.querySelector(`#audioEffects${i} progress`);
    
    
    clearInterval(audioEffectsPlayTimer);
    isAudioEffectsEnd = false;
    isAudioEffectsPuase = false;
  
  $(`#playEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
    console.info('开启音效文件:  ', $(`#path${num}`).val())
    let audioEffectsFileName = $(`#path${num}`).val();
    audioEffectsProgressInfo.innerText = audioEffectsFileName;

    if (rtc.localStream) {
      rtc.localStream.playEffect({
        filePath: $(`#path${num}`).val(), 
        cycle: Number($(`#cycle${num}`).val()),
        soundId: Number($(`#soundId${num}`).val())
      }).then(res=>{
        console.log('音效文件播放成功: ', $(`#path${num}`).val())
        isAudioEffectsTotalTime = rtc.localStream.getAudioEffectsDuration({
          filePath: $(`#path${num}`).val(),
          soundId: Number($(`#soundId${num}`).val())
        })
        console.log('获取音效文件总时长成功：', isAudioEffectsTotalTime)
        audioEffectsProgressInfo.innerText = audioEffectsFileName + '00 : 00' + ' / ' + formatSeconds(isAudioEffectsTotalTime);
        audioEffectsProgress.value = 0;
        audioEffectsPlayTimer = setInterval(playAuidoEffects, 500,{
          filePath: $(`#path${num}`).val(),
          soundId: Number($(`#soundId${num}`).val()),
          audioEffectsFileName,
        });
        // console.log('音效文件总时长--->: ', formatSeconds(isAudioEffectsTotalTime))
      }).catch(err=>{
        console.error('播放音效文件 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    }

    
  })
  function playAuidoEffects(options){
    // if (isAudioEffectsEnd) {
      // console.log('播放结束')
      // clearInterval(audioEffectsPlayTimer)
      // audioEffectsPlayTimer = null
      // audioEffectsProgress.value = 100
      // audioEffectsProgress.value = 0
      // audioEffectsProgressInfo.innerText = options.audioEffectsFileName + '   ' + formatSeconds(isAudioEffectsTotalTime) + ' / ' + formatSeconds(isAudioEffectsTotalTime)
      // return
    // }
    res = rtc.localStream.getAudioEffectsCurrentPosition(options)
    audioEffectsProgress.value = res.playedTime/isAudioEffectsTotalTime * 100
    audioEffectsProgressInfo.innerText = options.audioEffectsFileName + '   ' + formatSeconds(res.playedTime) + ' / ' + formatSeconds(isAudioEffectsTotalTime)
  }

  $(`#stopEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
    console.info('停止音效文件:  ', $(`#soundId${num}`).val())
    let audioEffectsFileName = $(`#path${num}`).val();
    isAudioEffectsEnd = true;
    // audioEffectsProgress.value = 0;
    clearInterval(audioEffectsPlayTimer);
    if (rtc.localStream) {
      rtc.localStream.stopEffect(Number($(`#soundId${num}`).val()))
      .then(res=>{
        console.log('停止文件播放成功: ', $(`#path${num}`).val())
      }).catch(err=>{
        console.error('停止音效文件 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    } 
  });

  $(`#pauseEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
    console.info('暂停音效文件:  ', $(`#soundId${num}`).val());
    let audioEffectsFileName = $(`#path${num}`).val();
    isAudioEffectsPuase = true;
    clearInterval(audioEffectsPlayTimer);
    if (rtc.localStream) {
      rtc.localStream.pauseEffect(Number($(`#soundId${num}`).val()))
      .then(res=>{
        console.log('暂停文件播放成功: ', $(`#path${num}`).val())
      }).catch(err=>{
        console.error('暂停音效文件 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    } 
  });

  $(`#resumeEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
   console.info('恢复音效文件1:  ', $(`#soundId${num}`).val())
   let audioEffectsFileName = $(`#path${num}`).val();
   isAudioEffectsPuase = false;
    if (rtc.localStream) {
      rtc.localStream.resumeEffect(Number($(`#soundId${num}`).val()))
      .then(res=>{
        console.log('恢复文件播放成功: ', $(`#path${num}`).val())
        
        playTimer = setInterval(playAuidoEffects, 500, {
          filePath: $(`#path${num}`).val(),
          soundId: Number($(`#soundId${num}`).val()),
          audioEffectsFileName
        })
      }).catch(err=>{
        console.error('恢复音效文件 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    } 
  });

  $(`#preloadEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
    console.info('预加载音效文件:  ', $(`#soundId${num}`).val())
    if (rtc.localStream) {
      rtc.localStream.preloadEffect(Number($(`#soundId${num}`).val()), $(`#path${num}`).val())
      .then(res=>{
        console.log('预加载音效文件成功: ', $(`#path${num}`).val())
      }).catch(err=>{
        console.error('预加载音效文件 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    } 
  });

  $(`#unloadEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
    console.info('释放音效文件:  ', $(`#soundId${num}`).val())
    if (rtc.localStream) {
      rtc.localStream.unloadEffect(Number($(`#soundId${num}`).val()))
      .then(res=>{
        console.log('释放音效文件成功: ', $(`#path${num}`).val())
      }).catch(err=>{
        console.error('释放音效文件 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    } 
  });

  $(`#setVolumeOfEffect${i}`).click(function(event){
    var num = event.target.id.match(/\d/)[0]
    console.info('音效文件num: %s 音量: %s', $(`#soundId${num}`).val(), $(`#volume${num}`).val())
    if (rtc.localStream) {
      rtc.localStream.setVolumeOfEffect(Number($(`#soundId${num}`).val()), Number($(`#volume${num}`).val()))
      .then(res=>{
        console.log('设置音效文件音量成功: ', $(`#path${num}`).val())
      }).catch(err=>{
        console.error('设置音效文件音量 %s 失败: %o', $(`#path${num}`).val(), err)
      })
    } 
  });
}

$('#setEffectsVolume').click(function(){
  console.info('setEffectsVolume:  ', $(`#volumeAll`).val())
  if (rtc.localStream) {
    rtc.localStream.setEffectsVolume(Number($('#volumeAll').val()))
  } 
});

$('#getEffectsVolume').click(function(){
  console.info('getEffectsVolume')
  if (rtc.localStream) {
    const volumes = rtc.localStream.getEffectsVolume()
    console.log('volumes: ', volumes)
    volumes.forEach(item=>{
      addLog(`soundId: ${item.soundId}, volume: ${item.volume}`)
    })
  } 
});

$('#stopAllEffects').click(function(){
 console.info('stopAllEffects')
  if (rtc.localStream) {
    rtc.localStream.stopAllEffects()
    .then(res=>{
      console.log('stopAllEffects成功')
    }).catch(err=>{
      console.error('stopAllEffects失败: %o', err)
    })
  } 
});

$('#pauseAllEffects').click(function(){
 console.info('pauseAllEffects')
  if (rtc.localStream) {
    rtc.localStream.pauseAllEffects()
    .then(res=>{
      console.log('pauseAllEffects成功')
    }).catch(err=>{
      console.error('pauseAllEffects失败: %o', err)
    })
  } 
});

$('#resumeAllEffects').click(function(){
 console.info('resumeAllEffects')
  if (rtc.localStream) {
    rtc.localStream.resumeAllEffects()
    .then(res=>{
      console.log('resumeAllEffects成功')
    }).catch(err=>{
      console.error('resumeAllEffects失败: %o', err)
    })
  } 
});
 

/**
 * ----------------------------------------
 *              伴音相关
 * ----------------------------------------
 */

$('#audioFilePath').val('https://yunxin-g2-assets.oss-cn-hangzhou.aliyuncs.com/web/auido/大头儿子小头爸爸.mp3') //'auido/nico - love mail.mp3' 'auido/大头儿子小头爸爸.mp3'
const progress = document.querySelector('#auidoMixing progress');
const progressInfo = document.querySelector('#auidoMixing .value');
let fileName = $("#audioFilePath").val().split('/')[1].split('.')[0] + ' :                  '
progressInfo.innerText = fileName
let playTimer = null
let totalTime = 0
let isEnd = false
let isPuase = false
let progressLength = progress.offsetLeft + progress.offsetWidth

document.getElementById("audioFilePath").ondragover = (evt)=>{
  // Prevent default behavior (Prevent file from being opened)
  evt.preventDefault();
}

document.getElementById("audioFilePath").ondrop = function(evt){
  if (evt.dataTransfer.files){
    evt.preventDefault()
    const blob = new Blob(evt.dataTransfer.files)
    const url = URL.createObjectURL(blob)
    console.log("audioFilePath", url);
    document.getElementById("audioFilePath").value = url
  }
  return false
}

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
  !res.playedTime && clearInterval(playTimer);
  progress.value = !!res.playedTime && res.playedTime/totalTime * 100
  progressInfo.innerText = fileName + formatSeconds(res.playedTime) + ' / ' + formatSeconds(totalTime)
}

function showAudioSenderLabel(){
  let label = '';
  if (rtc.client && rtc.client.adapterRef._mediasoup && rtc.client.adapterRef._mediasoup._sendTransport){
    const senders = rtc.client.adapterRef._mediasoup._sendTransport.handler._pc.getSenders();
    for (var i = 0; i < senders.length; i++){
      if (senders[i].track && senders[i].track.kind === "audio"){
        label += senders[i].track.label;
      }
    }
  }
  if ($("#audioSenderLabel").text() !== label){
    $("#audioSenderLabel").text(label);
  }
}

function showAudioMixingStatus(){
  const AuidoMixingState = {
    UNSTART: 0,
    STARTING: 1,
    PLAYED: 2,
    PAUSED: 3,
    STOPED: 4
  };
  let stateText = ''
  if (rtc.localStream && rtc.localStream.mediaHelper && rtc.localStream.mediaHelper.webAudio){
    const state = rtc.localStream.mediaHelper.webAudio.mixAudioConf.state;
    stateText += state;
    for (let key in AuidoMixingState){
      if (AuidoMixingState[key] === state){
        stateText += `(${key})`;
      }
    }
  }
  if ($("#audioMixingState").text() !== stateText){
    $("#audioMixingState").text(stateText);
  }
}

function updateAudioMixingStatus(){
  showAudioSenderLabel();
  showAudioMixingStatus()
}

setInterval(updateAudioMixingStatus, 1000);

function updateLogUploadStatus(){
  const uploadLogEnabled = window.logUpload;
  $("#logUploadEnabled").text(uploadLogEnabled);
}

setInterval(updateLogUploadStatus, 1000);

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


$("#startPlay").on("click", function(){
  let uid = $("#stopUid").val();
  let mediaType = $("#stopMediaType").val();
  let stream;
  if (!uid){
    stream = rtc.localStream;
  }else{
    stream = rtc.remoteStreams[uid];
  }
  if (!stream){
    addLog("播放：未找到stream" + uid);
    return;
  }
  addLog("播放" + stream.getId() + " " + mediaType);
  if (mediaType){
    const playOptions = {audio: false, audioSlave: false, video: false, screen: false};
    playOptions[mediaType] = true
    if (uid){
      stream.play(getRemoteView(uid).$div[0], playOptions)
    }else{
      stream.play(document.getElementById('local-container'), playOptions)
    }
  }else{
    if (uid){
      stream.play(getRemoteView(uid).$div[0])
    }else{
      stream.play(document.getElementById('local-container'))
    }
  }
});
$("#stopPlay").on("click", function(){
  let uid = $("#stopUid").val();
  let mediaType = $("#stopMediaType").val();
  let stream;
  if (!uid){
    stream = rtc.localStream;
  }else{
    stream = rtc.remoteStreams[uid];
  }
  if (!stream){
    addLog("停止播放：未找到stream" + uid);
    return;
  }
  addLog("停止播放" + stream.getId() + " " + mediaType);
  if (mediaType){
    stream.stop(mediaType);
  }else{
    stream.stop();
  }
});

$("#isPlaying").on("click", function(){
  let uid = $("#stopUid").val();
  let mediaType = $("#stopMediaType").val();
  let stream;
  if (!uid){
    stream = rtc.localStream;
  }else{
    stream = rtc.remoteStreams[uid];
  }
  if (!stream){
    addLog("正在播放：未找到stream" + uid);
    return;
  }
  if (!mediaType){
    ["audio", "video", "screen"].forEach(async (mediaType)=>{
      stream.isPlaying(mediaType).then((result)=>{
        addLog("正在播放：" + stream.getId() + " " + mediaType + " " + result);
      })
    })
  }else{
    stream.isPlaying(mediaType).then((result)=>{
      addLog("正在播放：" + stream.getId() + " " + mediaType + " " + result);
    })
  }
});

/**
 * ----------------------------------------
 *              水印相关
 * ----------------------------------------
 */
let watermarks = {local: null, remote: {}};
$("#clearWatermark").on('click', ()=>{
  let stream;
  let uid = $("#watermarkUid").val();
  let mediaType = $("#watermarkMediaType").val();
  if (uid) {
    stream = rtc.remoteStreams[uid];
  } else{
    stream = rtc.localStream;
  }
  if (!stream){
    return addLog('水印：请检查uid是否正确')
  }
  
  if(uid){
    if (watermarks.remote[uid]){
      watermarks.remote[uid][mediaType] = {
        mediaType: mediaType,
      }
    }
  }else{
    if (watermarks.local){
      watermarks.local[mediaType] = {
        mediaType: mediaType,
      };
    }
  }


  if (document.getElementById("watermark-type").value === "encoding"){
    console.log(`清空编码水印 UID ${stream.streamID}\n${$("#watermarkMediaType").val()}`);
    addLog('清空编码水印');
    stream.setEncoderWatermarkConfigs({
      mediaType: $("#watermarkMediaType").val()
    });
  }else{
    console.log(`清空画布水印 UID ${stream.streamID}\n${$("#watermarkMediaType").val()}`);
    addLog('清空画布水印');
    stream.setCanvasWatermarkConfigs({
      mediaType: $("#watermarkMediaType").val()
    });
  }

});
$("#setWatermark").on('click', ()=>{
  let stream, watermarkConf;
  let uid = $("#watermarkUid").val();
  let watermarkMediaType = $("#watermarkMediaType").val()
  if (uid) {
    stream = rtc.remoteStreams[uid];
    if (!watermarks.remote[uid]){
      watermarks.remote[uid] = {
        video: {mediaType: 'video'},
        screen: {mediaType: 'screen'}
      };
    }
    watermarkConf = watermarks.remote[uid][watermarkMediaType];
  } else{
    stream = rtc.localStream;
    if (!watermarks.local){
      watermarks.local = {
        video: {mediaType: 'video'},
        screen: {mediaType: 'screen'}
      };
    }
    watermarkConf = watermarks.local[watermarkMediaType];
  }
  if (!stream){
    return addLog('水印：请检查uid是否正确')
  }
  const watermarkOptions = {};
  const type = $('#watermarkType').val()
  if ($('#watermarkContent').val()) {
    watermarkOptions.content = $('#watermarkContent').val()
  }
  if ($('#watermarkFontColor').val()) {
    watermarkOptions.fontColor = toIntegerOrStringOrNull($('#watermarkFontColor').val())
  }
  if ($('#watermarkFontSize').val()) {
    watermarkOptions.fontSize = toIntegerOrStringOrNull($('#watermarkFontSize').val())
  }
  if ($('#watermarkOffsetX').val()) {
    watermarkOptions.offsetX = toIntegerOrStringOrNull($('#watermarkOffsetX').val())
  }
  if ($('#watermarkOffsetY').val()) {
    watermarkOptions.offsetY = toIntegerOrStringOrNull($('#watermarkOffsetY').val())
  }
  if ($('#watermarkWmWidth').val()) {
    watermarkOptions.wmWidth = toIntegerOrStringOrNull($('#watermarkWmWidth').val())
  }
  if ($('#watermarkWmHeight').val()) {
    watermarkOptions.wmHeight = toIntegerOrStringOrNull($('#watermarkWmHeight').val())
  }
  if ($('#watermarkWmColor').val()) {
    watermarkOptions.wmColor = toIntegerOrStringOrNull($('#watermarkWmColor').val())
  }
  if ($('#watermarkImageUrls').val()) {
    watermarkOptions.imageUrls = $('#watermarkImageUrls').val()
  }
  if ($('#watermarkFps').val()) {
    watermarkOptions.fps = parseFloat($('#watermarkFps').val())
  }
  if (!$('#watermarkLoop').prop("checked")) {
    watermarkOptions.loop = false
  }
  switch(type){
    case "text":
      if (!watermarkConf.textWatermarks){
        watermarkConf.textWatermarks = [];
      }
      watermarkConf.textWatermarks.push(watermarkOptions);
      break;
    case "timestamp":
      watermarkConf.timestampWatermarks = watermarkOptions;
      break;
    case "image":
      if (!watermarkConf.imageWatermarks){
        watermarkConf.imageWatermarks = [];
      }
      watermarkConf.imageWatermarks.push(watermarkOptions);
      break;
  }

  if (document.getElementById("watermark-type").value === "encoding"){
    console.log(`编码水印设置 UID ${stream.streamID}\n${JSON.stringify(watermarkConf, null, 2)}`);
    stream.setEncoderWatermarkConfigs(watermarkConf);
  }else{
    console.log(`画布水印设置 UID ${stream.streamID}\n${JSON.stringify(watermarkConf, null, 2)}`);
    stream.setCanvasWatermarkConfigs(watermarkConf);
  }

})
$("#showUpdateWatermark").on("click", function(){
  $("#updateWatermarkPanel").show();
  let uid = $("#watermarkUid").val();
  let mediaType = $("#watermarkMediaType").val();
  let watermarkConf;
  if (uid) {
    watermarkConf = watermarks.remote[uid][mediaType];
  } else{
    watermarkConf = watermarks.local[mediaType];
  }
  $("#watermarkConfStr").val(JSON.stringify(watermarkConf, null, 2));
});

$("#doUpdateWatermark").on("click", function (){
  let stream,watermarkConf;
  let uid = $("#watermarkUid").val();
  let mediaType = $("#watermarkMediaType").val();
  if (uid) {
    stream = rtc.remoteStreams[uid];
  } else{
    stream = rtc.localStream;
  }
  if (!stream){
    return alert('水印：请检查uid是否正确')
  }
  let wm;
  try{
    wm = JSON.parse($("#watermarkConfStr").val())
  }catch(e){
    alert("JSON格式不对");
    throw e;
  }

  if (uid) {
    watermarks.remote[uid][mediaType] = wm;
  } else{
    watermarks.local[mediaType] = wm;
  }

  if (document.getElementById("watermark-type").value === "encoding"){
    console.log(`编码水印设置 UID ${stream.streamID}\n${JSON.stringify(wm, null, 2)}`);
    stream.setEncoderWatermarkConfigs(wm);
  }else{
    console.log(`画布水印设置 UID ${stream.streamID}\n${JSON.stringify(wm, null, 2)}`);
    stream.setCanvasWatermarkConfigs(wm);
  }
  
});


$("#closeWatermarkPanel").on("click", function (){
  $("#updateWatermarkPanel").hide();
});

$("#pushMask").on("click", function(){
  let uid = document.getElementById("maskUid").value
  const maskSecond = parseInt(document.getElementById("maskSecond").value)
  if (!uid){
    uid = rtc.client.getChannelInfo().uid
  }
  const externData = {
    type: "AutoMaskUid",
    data: {
      maskUid: uid,
      duration: maskSecond,
      evidence: {
      }
    }
  }
  console.log("测试打码", externData)
  rtc.client.adapterRef._signalling._protoo.emit('notification', {method: "OnUserData", data: {externData}})
})

$("#sdkVersion").text(NERTC.VERSION);
$("#sdkBuild").text(NERTC.BUILD);
$("#systemRequirement").text(`WebRTC:${NERTC.checkSystemRequirements() ? "支持": "不支持"}； 适配器:${NERTC.getHandler()}`);
if (!NERTC.checkSystemRequirements()){
  alert("浏览器环境缺失部分WebRTC基础功能。（是否没有开启HTTPS？）")
}

$("#copyEnvInfo").on('click', async function(){
  let text = $("#envInfo").text().replace(/\n[ ]*/g, "\n")
  text += "\n页面地址: " + window.location.href;
  text += "\nUserAgent: " + navigator.userAgent;
  if (rtc.client){
    const channelInfo = rtc.client.getChannelInfo()
    text += `\nappkey: ${channelInfo.appkey}`
    text += `\nuid: ${channelInfo.uid}`
    text += `\nchannelName: ${channelInfo.channelName}`
    text += `\n服务端地址: ${channelInfo._protooUrl}`
    if (channelInfo.cid){
      text += `\ncid: ${channelInfo.cid}`
      text += `\nQS地址：\nhttps://qs.netease.im/qs_inner/v2/static/rtc2/channel/detail-inner?cid=${channelInfo.cid}&uids=${channelInfo.uid}`
      text += `\n日志上传地址：\nhttp://logsearch.hz.netease.com/vcloud_elk_ssd_online/app/kibana#/discover?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-30d,mode:quick,to:now))&_a=(columns:!(data,cid),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',key:TAG,negate:!f,params:(query:web_console_test,type:phrase),type:phrase,value:web_console_test),query:(match:(TAG:(query:web_console_test,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',key:cid,negate:!f,params:(query:'${channelInfo.cid}',type:phrase),type:phrase,value:'${channelInfo.cid}'),query:(match:(cid:(query:'${channelInfo.cid}',type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',key:uid,negate:!f,params:(query:'${channelInfo.uid}',type:phrase),type:phrase,value:'${channelInfo.uid}'),query:(match:(uid:(query:'${channelInfo.uid}',type:phrase))))),index:'7b3a5610-064a-11ec-8095-fd4b2e7241e4',interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',asc))`
    }
  }
  await navigator.clipboard.writeText(text);
  console.log(`环境信息已复制到剪贴板\n${text}`);
  addLog('环境信息已复制到剪贴板')
});

if (NERTC.getSupportedCodec){
  NERTC.getSupportedCodec().then((data)=>{
    $("#systemRequirement").append(`<br/>视频编码：${data.video.join(",")}；音频编码：${data.audio.join(",")}`)
  })
}

const showStats = async ()=>{
  let str = `<hr/><pre class="pubStats" style="min-width: 200px; float: left;">`;
  const localAudioStats = await rtc.client.getLocalAudioStats();
  str += `本地音频\n`;
  for (let key in localAudioStats[0]){
    str += `${key}:${localAudioStats[0][key]}\n`
  };
  const localVideoStats = await rtc.client.getLocalVideoStats();
  for (let i = 0; i < localVideoStats.length; i++){
    if (!localVideoStats[i].TotalDuration){
      continue;
    }
    if (localVideoStats[i].LayerType === 2){
      str += `本地辅流\n`;
    }else{
      str += `本地视频\n`;
    }
    for (let key in localVideoStats[i]){
      str += `${key}:${localVideoStats[i][key]}\n`
    };
  }
  str += `</pre>`
  //////////////
  const remoteAudioStats = await rtc.client.getRemoteAudioStats();
  const remoteVideoStats = await rtc.client.getRemoteVideoStats('video');
  const remoteScreenStats = await rtc.client.getRemoteVideoStats('screen');
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
    str += `远端辅流 ${uid}\n`;
    for (var key in remoteScreenStats[uid]){
      str += `${key}:${remoteScreenStats[uid][key]}\n`
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

$("#encoderConfigBtn").on("click", ()=>{
  if (!rtc.localStream){
    addLog("未找到本地流")
    return
  }
  const options = {
    mediaType: $("#encoderMediaType").val(),
    streamType: $("#encoderStreamType").val(),
  }
  if (document.getElementById("enableBitrateMax").checked){
    options.maxBitrate = parseInt($("#bitrateMax").val())
  }
  if (document.getElementById("enableContentHint").checked){
    options.contentHint = $("#contentHint").val()
  }
  console.log("上行视频编码设置", options)
  addLog("上行视频编码设置" + JSON.stringify(options))
  rtc.localStream.setVideoEncoderConfiguration(options)
})

$("#setEncryptionMode").click(()=>{
  const encryptionMode = $("#encryptionMode").val();
  rtc.client.setEncryptionMode(encryptionMode);
  addLog("setEncryptionMode " + encryptionMode)
})

$("#setEncryptionSecret").click(()=>{
  const encryptionSecret = $("#encryptionSecret").val();
  rtc.client.setEncryptionSecret(encryptionSecret);
  addLog("setEncryptionSecret " + encryptionSecret)
})

let DO_NOT_ADD_EVENTS = false

$("#removeMostListeners").click(()=>{
  const eventWhitelist = $("#event-whitelist").val()
  for (let eventName in rtc.client._events){
    if (eventWhitelist && eventWhitelist.indexOf(eventName) > -1){
      continue
    }
    if (eventName && eventName[0] !== '@'){
      const eventLen = rtc.client._events[eventName].length || 1
      let msg = `去除${eventLen}个监听${eventName}`
      addLog(msg)
      console.log(msg, rtc.client._events[eventName])
      rtc.client.off(eventName)
    }
  }
  addLog(`新加入的remoteStream不再监听事件`)
  DO_NOT_ADD_EVENTS = true
})

$("#pauseReconnection").on("click", async ()=>{
  const info = await rtc.client.pauseReconnection();
  addLog("===暂停重连" + info && info.reason)
})

$("#resumeReconnection").on("click", async ()=>{
  const info = await rtc.client.resumeReconnection();
  addLog("===恢复重连" + info && info.reason)
})

let urlParams = new URLSearchParams(window.location.search);
let vconsole = null
$(document).ready(()=>{
  if (urlParams.get("v") === "1"){
    vconsole = new VConsole();
  }
})
$("#toggleVConsole").click(()=>{
  if (!vconsole){
    vconsole = new VConsole();
  }
})

$("#forceHeartbeat").click(()=>{
  rtc.client.adapterRef._statsReport.doHeartbeat()
  rtc.client.adapterRef._statsReport.formativeStatsReport.send()
})

const pluginMap = {
  mirror: {
    id: 'mirror',
    name: '镜像',
    pathToPlugin: './MirrorPlugin.js',
    nePlugin: null,
  }
}


for (var key in pluginMap){
  const pluginItem = pluginMap[key]
  const installBtn = $(`<button id="${key}-install">安装</button>`)
  installBtn.on("click", ()=>{
    NERTC.pluginManager.import(pluginItem.pathToPlugin).then((nePlugin)=>{
      pluginItem.nePlugin = pluginItem
      addLog("插件加载完成：" + pluginItem.name)
    })
  })
  const uninstallBtn = $(`<button id=${key}-uninstall>卸载</button>`)
  uninstallBtn.on("click", ()=>{
    NERTC.pluginManager.uninstall(pluginItem.pathToPlugin).then(()=>{
      pluginItem.nePlugin = null
      addLog("插件卸载完成：" + pluginItem.name)
    })
  })
  let div = $(`<div><span>${pluginItem.name}</span></div>`)
  $("#nePluginContainer").append(div)
  div.append(installBtn)
  div.append(uninstallBtn)
}
const assertLocalStream = ()=>{
  if (!rtc.localStream){
    addLog('当前不能执行此操作：rtc.localStream不存在');
    throw new Error('rtc.localStream不存在')
  }
}

$("#setReconnectionMaxRetry").on("click", ()=>{
  const reconnectionMaxRetry = parseInt($("#reconnectionMaxRetry").val())
  addLog(`[调试]设置断线重连次数：${NERTC.getParameters().reconnectionMaxRetry} => ${reconnectionMaxRetry}`)
  NERTC.getParameters().reconnectionMaxRetry = reconnectionMaxRetry
  NERTC.getParameters().joinMaxRetry = reconnectionMaxRetry
})

$("select").on("change", function(){
  if ($(this).val()){
    $(this).addClass("select-changed")
  }else{
    $(this).removeClass("select-changed")
  }
  
})


const handleOnBeforeUnload = function(evt){
  addLog("handleOnBeforeUnload")
  console.warn("收到了 handleOnBeforeUnload 事件，但并不主动调用leave。")
  // 经测试，以下文字并不会在chrome中展示（但是不重要）
  return "您确认离开当前页面吗？（点否rtc.client不调用leave）"
}

const handleOnPageHide = function(evt){
  console.warn("收到了 PageHide 事件，但并不主动调用leave。")
}

$("#confirmOnRefresh").on("click", ()=>{
  addLog("取消默认的页面卸载逻辑")
  // 处理未来的client
  NERTC.getParameters().leaveOnUnload = false
  if (rtc.client){
    // 处理当前的client
    window.removeEventListener("pagehide", rtc.client.handlePageUnload)
    window.removeEventListener("beforeunload", rtc.client.handlePageUnload)
  }
  window.onbeforeunload = handleOnBeforeUnload;
  window.onpagehide = handleOnPageHide
})

$('#lbsRemoveLocalConfig').on("click", ()=>{
  localStorage.removeItem(rtc.client.adapterRef.lbsManager.localStorageKey)
  addLog("已删除lbs本地配置")
  location.reload()
})

$('#lbsLoadBuiltinConfig').on("click", ()=>{
  rtc.client.adapterRef.lbsManager.loadBuiltinConfig("manual")
  addLog("已载入lbs内置配置")
})

$('#lbsLoadLocalConfig').on("click", ()=>{
  const config = rtc.client.adapterRef.lbsManager.loadLocalConfig("manual")
  if (config.config){
    addLog("已载入lbs本地配置")
    console.log("已载入lbs本地配置", config)
  }else{
    addLog("载入lbs本地配置失败 " + config.reason)
    console.error("载入lbs本地配置失败", config)
  }
})

$('#lbsStartUpdate').on("click", async ()=>{
  const config = await rtc.client.adapterRef.lbsManager.startUpdate("manual")
  if (config){
    addLog("已载入lbs远端配置")
    console.log("已载入lbs远端配置", config)
  }else{
    addLog("载入lbs远端配置失败")
  }
})

const lbsTimer = setInterval(()=>{
  let lbsState = rtc.client.adapterRef.lbsManager.lbsState
  document.getElementById("lbsState").innerText = lbsState
  if (rtc.client.adapterRef.lbsManager.lastUpdate){
    document.getElementById("lbsExpireTime").innerText = rtc.client.adapterRef.lbsManager.lastUpdate.res.ttl - Math.floor( (Date.now() - rtc.client.adapterRef.lbsManager.lastUpdate.activeFrom) / 1000)
  }else{
    document.getElementById("lbsExpireTime").innerText = ""
  }
}, 1000)

$("#enableCompatMode").click(()=>{
  NERTC.Device.enableCompatMode()
  addLog("开启兼容模式")
  initDevices()
})

$("#disableCompatMode").click(()=>{
  NERTC.Device.disableCompatMode()
  addLog("关闭兼容模式")
  initDevices()
})

$("#clearCompatList").click(()=>{
  localStorage.removeItem(NERTC.Device.compatAudioInputList.localStorageKey)
  addLog("清除兼容设备列表")
})

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
