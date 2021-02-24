/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/


const videoElement = document.querySelector('video');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];

audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);
console.warn('webrtcSupport: ', webrtcSupport)
document.getElementById('supportWebrtc').checked = webrtcSupport.support
function gotDevices(deviceInfos) {
  console.warn('设备列表：', deviceInfos)
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  //for (let i = 0; i !== deviceInfos.length; ++i) 
  Object.keys(deviceInfos).forEach( key => {
    const deviceInfo = deviceInfos[key];
    if (key === 'audioIn') {
      for (let j = 0; j !== deviceInfo.length; ++j ) {
        const option = document.createElement('option');
        option.text = deviceInfo[j].label || `microphone ${audioInputSelect.length + 1}`;
        option.value = deviceInfo[j].deviceId;
        audioInputSelect.appendChild(option);
      }
    } else if (key === 'audioOut') {
      for (let j = 0; j !== deviceInfo.length; ++j ) {
        const option = document.createElement('option');
        option.text = deviceInfo[j].label || `speaker ${audioOutputSelect.length + 1}`;
        option.value = deviceInfo[j].deviceId;
        audioOutputSelect.appendChild(option);
      }
    } else if (key === 'video') {
      for (let j = 0; j !== deviceInfo.length; ++j ) {
        const option = document.createElement('option');
        option.text = deviceInfo[j].label || `camera ${videoSelect.length + 1}`;
        option.value = deviceInfo[j].deviceId;
        videoSelect.appendChild(option);
      }
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  })

  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`);
      })
      .catch(error => {
        let errorMessage = error;
        if (error.name === 'SecurityError') {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
      });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(document.getElementById('audioContainer').children[document.getElementById('audioContainer').children.length -1
  ], audioDestination);
}

function gotStream(event) {
  console.warn("gotStream: ", event)
  if (event && event.stream) {
    if (event.stream.getAudioTracks().length) {
      console.warn('获取到音频: ', event.stream.id)
      netcall.startDevice({
        type:WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL
      })
    }  else if (event.stream.getVideoTracks().length) {
      console.warn('获取到视频: ', event.stream.id)
      netcall.setLocalVideoRenderer({
        view: document.getElementById('videoContainer')
      })
      netcall.setLocalRenderMode({
        width: 640,
        height: 360,
        cut: true
      })
    }  
  }
  return netcall.getDevices()
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function start() {
  netcall.stopLocalAudio(WebRTC.DEVICE_TYPE_AUDIO_IN)
  netcall.stopVideoPreview(WebRTC.DEVICE_TYPE_VIDEO)

  const audioSource = audioInputSelect.value;
  const videoSource = videoSelect.value;
  const constraints = {
    audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
    video: {deviceId: videoSource ? {exact: videoSource} : undefined}
  };
  //navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
  netcall.openLocalAudio({
    type: WebRTC.DEVICE_TYPE_AUDIO_IN,
    device: {deviceId: audioSource}
  }).then(gotStream).then(gotDevices).catch(handleError);
  netcall.startVideoPreview({
    type: WebRTC.DEVICE_TYPE_VIDEO,
    device: {deviceId: videoSource}
  }).then(gotStream).then(gotDevices).catch(handleError);
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;

videoSelect.onchange = start;

/* 
 初始化NRTC
*/
window.netcall = null
window.recordId = null
window.WebRTC = window.NRTC
window.netcall = NRTC.getInstance({
  appkey:'a1266611da6dfb6fc59bc03df11ebdbd',
  debug: true
})

/*
初始化WebRTC
*/

window.WebRTC = window.WebRTC;
window.NIM = window.SDK.NIM;
NIM.use(WebRTC);

if (!window.nim) {
  window.nim = NIM.getInstance({
    debug: true,
    promise: true,
    socketUrl: null,
    appKey: 'fe416640c8e8a72734219e1847ad2547',
    token: 'e10adc3949ba59abbe56e057f20f883e',
    account: 'lly3',
    syncTeamMembers: false,
    privateConf: {
      nos_uploader_web:  null,
      nos_accelerate: null,
      nos_accelerate_host: null,
      //其他的域名统一使用imServer
      nos_downloader: null,
      lbs_web: null,
      link_ssl_web: null,
      nt_server: null
    },
    onconnect: function() {
      console.log("im连接成功...");
    },
    onsyncdone: function(msg) {
      console.warn("登录成功，且同步完成...");

    },
    onmsg: function(msg) {
      console.log("收到 IM 消息： ", msg);
    },
    ondisconnect: function(error) {
      console.error("IM断开连接：", error);
    },
    oncustomsysmsg: function(msg) {
      // 多端同步 正在输入自定义消息类型需要过滤
      var content = JSON.parse(msg.content);
      var id = content.id;
      if (id == 1) {
        return;
      }
      console.log("收到------自定义通知：", msg);
      if (id == 3) {
        console.log("群视频通知...");
      }
    }
  })
}

function init(){
  window.netcall = window.WebRTC.getInstance({
    container: null,
    remoteContainer: null,
    nim: window.nim,
    debug: true
  });
}


netcall.getDevices().then(list=>{gotDevices(list); start();})


$('#startRecordAudio').on('click', () => {
  const options = {
    type: 'audio'
  }
  var result = window.netcall.startMediaRecording(options).then(res =>{
    console.warn('res: ', res)
    recordId = res.recordId
  })
})
$('#stopRecordAudio').on('click', () => {
  if (!recordId) {
    console.warn('录制还没有开始，请稍后重试')
  }
  const options = {
    type: 'audio',
    recordId: recordId
  }
  window.netcall.stopMediaRecording(options)
})
$('#playRecordAudio').on('click', () => {
  if (!recordId) {
    console.warn('录制还没有开始，请稍后重试')
  }
  console.warn('先关闭麦克风')
  netcall.stopDevice({
    type:WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL
  })
  const options = {
    type: 'audio',
    recordId: recordId,
    div: document.getElementById('audioContainer')
  }

  window.netcall.playMediaRecording(options)
})

$('#startAudio').on('click', () => {
  console.warn('播放mic')
  netcall.startDevice({
    type:WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL
  })
})
