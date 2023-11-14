let appkey = 'eca23f68c66d4acfceee77c200200359' // 请输入自己的appkey
let appSecret = 'c9df0b60c1ba' // 请输入自己的appSecret

//背景分割
const virtualBackgroundPluginConfig = {
  development: {
    simd: {
      key: 'VirtualBackground',
      pluginUrl: './js/nim/NIM_Web_VirtualBackground.js',
      wasmUrl: './js/nim/wasm/NIM_Web_VirtualBackground_simd.wasm' + `?time=${Math.random()}`
    },
    nosimd: {
      key: 'VirtualBackground',
      pluginUrl: './js/nim/NIM_Web_VirtualBackground.js',
      wasmUrl: './js/nim/wasm/NIM_Web_VirtualBackground_nosimd.wasm'
    }
  },
  production: {
    simd: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}.js`,
      wasmUrl: `./js/nim/wasm/NIM_Web_VirtualBackground_simd_v${NERTC.VERSION}.wasm`
    },
    nosimd: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}.js`,
      wasmUrl: `./js/nim/wasm/NIM_Web_VirtualBackground_nosimd_v${NERTC.VERSION}.wasm`
    }
  },
  test: {
    simd: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}_test.js`,
      wasmUrl: `./js/nim/wasm/NIM_Web_VirtualBackground_simd_v${NERTC.VERSION}_test.wasm`
    },
    nosimd: {
      key: 'VirtualBackground',
      pluginUrl: `./js/nim/NIM_Web_VirtualBackground_v${NERTC.VERSION}_test.js`,
      wasmUrl: `./js/nim/wasm/NIM_Web_VirtualBackground_nosimd_v${NERTC.VERSION}_test.wasm`
    }
  }
}
let segment_config = null

let channelName // '您指定的房间号'
let uid // '您指定的用户ID'
window.rtc = {
  client: null,
  joined: false,
  published: false,
  localStream: null,
  remoteStreams: {},
  remoteStreams1: {},
  params: {}
}
const localStoragePrefix = 'NERTC-'
initClient()

function loadEnv() {
  const channelName = window.localStorage
    ? window.localStorage.getItem(`${localStoragePrefix}channelName`)
    : ''
  const uid = window.localStorage ? window.localStorage.getItem(`${localStoragePrefix}uid`) : ''
  $('#channelName').val(channelName)
  $('#uid').val(uid)
}

function initClient() {
  loadEnv()
  rtc.client = NERTC.createClient({ appkey, debug: true })
  rtc.client1 = NERTC.createClient({ appkey, debug: true })
  initDevices()
  window.removeEventListener('beforeunload', rtc.client.handlePageUnload)
  window.removeEventListener('beforeunload', rtc.client1.handlePageUnload)
  console.warn('demo 移除 sdk 中的 beforeunload 事件监听')
}

$('#uploadLog').on('click', () => {
  console.warn('启动上传日志')
  NERTC.Logger.enableLogUpload()
})

$('#disableUploadLog').on('click', () => {
  console.warn('关闭上传日志')
  NERTC.Logger.disableLogUpload()
})
function initDevices() {
  // NERTC.getMicrophones().then((data) => {
  //   var info = JSON.stringify(data)
  //   console.log('麦克风: %o', info)
  //   renderDevice($('#micro'), data)
  // })
  // NERTC.getCameras().then((data) => {
  //   var info = JSON.stringify(data)
  //   console.log('摄像头: %o', info)
  //   renderDevice($('#camera'), data)
  // })
  NERTC.getDevices().then((data) => {
    var info = JSON.stringify(data)
    console.log('设备: %o', info)
  })
}

// function renderDevice(node, devices) {
//   if (node.length) {
//     node = node[0]
//   }
//   const childNodes = node.childNodes
//   for (let i in childNodes) {
//     const childNode = childNodes[i]
//     if (childNode.value) {
//       childNode.disabled = true
//     }
//   }

//   for (var i = 0, len = devices.length; i < len; i++) {
//     let isNewDevice = true
//     for (let j in childNodes) {
//       const childNode = childNodes[j]
//       if (childNode.value === devices[i].deviceId) {
//         isNewDevice = false
//         childNode.innerText = devices[i].label
//         childNode.disabled = false
//       }
//     }
//     if (isNewDevice) {
//       const elem = document.createElement('option')
//       elem.value = devices[i].deviceId
//       elem.innerText = devices[i].label
//       node.appendChild(elem)
//     }
//   }
// }

async function initLocalStream() {
  const enableAudio = $('input[name="enableAudio"]:checked').val()
  const audio = !!enableAudio
  const enableVideo = $('input[name="enableVideo"]:checked').val()
  const video = !!enableVideo

  const createStreamOptions = {
    uid: uid,
    audio,
    microphoneId: $('#micro').val(),
    video,
    client: rtc.client
  }
  const createStreamOptions1 = {
    uid: uid1,
    audio: false,
    video: false,
    client: rtc.client1
  }
  if ($('#camera').val()) {
    createStreamOptions.cameraId = $('#camera').val()
  }
  if ($('#micro').val()) {
    createStreamOptions.microphoneId = $('#micro').val()
  }
  const resolution = $('#sessionConfigVideoQuality').val()
  let videoProfile = {}
  if (resolution) {
    videoProfile.resolution = NERTC.VIDEO_QUALITY[resolution]
  }
  rtc.localStream = await NERTC.createStream(createStreamOptions)
  rtc.localStream.setVideoProfile(videoProfile)
  console.warn('setVideoProfile(): ', videoProfile)
  await rtc.localStream.init()
  rtc.localStream.setLocalRenderMode({
    width: 320,
    height: 240
  })
  rtc.localStream.on('plugin-load', onPluginLoaded)
  rtc.localStream.on('plugin-load-error', (e) => {
    console.error('plugin-load-error', e)
  })

  rtc.localStream1 = await NERTC.createStream(createStreamOptions1)
  await rtc.localStream1.init()
  // 设置本地视频画布
  rtc.localStream1.setLocalRenderMode({
    width: 320,
    height: 240
  })
}

async function join() {
  channelName = parseInt($('#channelName').val())
  if (window.localStorage) {
    window.localStorage.setItem(`${localStoragePrefix}channelName`, channelName)
  }
  uid = $('#uid').val()
  uid1 = (parseInt(uid) + 1).toString()
  // 监听事件
  rtc.client.on('stream-added', (event) => {
    const remoteStream = event.stream
    remoteStream.setSubscribeConfig({
      audio: true,
      video: true,
      screen: false
    })
    if (event.mediaType === 'audio' || event.mediaType === 'video') {
      console.warn('收到别人的发布消息: ', remoteStream.streamID, 'mediaType: ', event.mediaType)
      rtc.remoteStreams[remoteStream.streamID] = remoteStream
      //订阅远端流
      rtc.client.subscribe(remoteStream).then(() => {
        console.warn(`subscribe 成功 ${remoteStream.streamID}`)
      })
    } else {
      console.warn('client 不订阅辅流')
    }
  })
  rtc.client1.on('stream-added', (event) => {
    const remoteStream = event.stream
    remoteStream.setSubscribeConfig({
      audio: false,
      video: false,
      screen: true
    })
    if (event.mediaType === 'screen') {
      console.warn('收到别人的发布消息: ', remoteStream.streamID, 'mediaType: ', event.mediaType)
      rtc.remoteStreams1[remoteStream.streamID] = remoteStream
      //订阅远端流
      rtc.client1.subscribe(remoteStream).then(() => {
        console.warn(`subscribe 成功 ${remoteStream.streamID}`)
      })
    } else {
      console.warn('client1 不订阅主流')
    }
  })

  rtc.client.on('stream-subscribed', async (event) => {
    // 远端流订阅成功
    // if (event.mediaType === 'audio' || event.mediaType === 'video') {
    const remoteStream = event.stream
    console.warn(
      'client 订阅别人的流成功的通知: ',
      remoteStream.streamID,
      'mediaType: ',
      event.mediaType
    )
    // 设置远端视频画布
    remoteStream.setRemoteRenderMode({
      width: 320,
      height: 240
    })
    // 播放远端流
    await remoteStream.play('remoteVideoContent')

    console.warn(
      'client 播放别人的流成功的通知: ',
      remoteStream.streamID,
      'mediaType: ',
      event.mediaType
    )

    // } else {
    //   console.error('client 不订阅辅流')
    // }
  })

  rtc.client1.on('stream-subscribed', async (event) => {
    // 远端流订阅成功
    // if (event.mediaType === 'screen') {
    const remoteStream = event.stream
    console.warn(
      'client1 订阅别人的流成功的通知: ',
      remoteStream.streamID,
      'mediaType: ',
      event.mediaType
    )
    // 设置远端视频画布
    remoteStream.setRemoteRenderMode({
      width: 320,
      height: 240
    })
    // 播放远端流
    await remoteStream.play('remoteScreenContent')
    console.warn(
      'client1 播放别人的流成功的通知: ',
      remoteStream.streamID,
      'mediaType: ',
      event.mediaType
    )
    // } else {
    //   console.error('client1 不订阅主流')
    // }
  })

  rtc.client.on('stream-removed', (evt) => {
    let remoteStream = evt.stream
    console.warn(
      '==== client 收到别人停止发布的消息: ',
      remoteStream.streamID,
      'mediaType: ',
      evt.mediaType
    )
    remoteStream.stop(evt.mediaType)
  })

  rtc.client1.on('stream-removed', (evt) => {
    let remoteStream = evt.stream
    console.warn(
      '==== client1 收到别人停止发布的消息: ',
      remoteStream.streamID,
      'mediaType: ',
      evt.mediaType
    )
    remoteStream.stop(evt.mediaType)
  })

  rtc.client.on('uid-duplicate', (evt) => {
    console.warn('==== client uid重复，你被踢出', evt)
  })

  rtc.client1.on('uid-duplicate', (evt) => {
    console.warn('==== client1 uid重复，你被踢出', evt)
  })

  rtc.client.on('error', (type) => {
    console.error('===== client 发生错误事件：', type)
    if (type === 'SOCKET_ERROR') {
      console.warn('==== client 网络异常，已经退出房间')
    }
  })
  rtc.client1.on('error', (type) => {
    console.error('===== client1 发生错误事件：', type)
    if (type === 'SOCKET_ERROR') {
      console.warn('==== client1 网络异常，已经退出房间')
    }
  })

  rtc.client.on('accessDenied', (type) => {
    console.warn(`==== client ${type}设备开启的权限被禁止`)
  })

  rtc.client1.on('accessDenied', (type) => {
    console.warn(`==== client1 ${type}设备开启的权限被禁止`)
  })

  rtc.client.on('connection-state-change', (evt) => {
    console.warn(
      `==== client 网络状态变更: ${evt.prevState} => ${evt.curState}, 当前是否在重连：${evt.reconnect}`
    )
  })

  rtc.client1.on('connection-state-change', (evt) => {
    console.warn(
      `==== client1 网络状态变更: ${evt.prevState} => ${evt.curState}, 当前是否在重连：${evt.reconnect}`
    )
  })

  rtc.client.on('peer-online', (evt) => {
    console.warn(`==== client ${evt.uid} 加入房间`)
  })

  rtc.client1.on('peer-online', (evt) => {
    console.warn(`==== client1 ${evt.uid} 加入房间`)
  })

  rtc.client.on('peer-leave', (evt) => {
    console.warn(`==== client ${evt.uid} 离开房间`)
  })

  rtc.client1.on('peer-leave', (evt) => {
    console.warn(`==== client1 ${evt.uid} 离开房间`)
  })

  // rtc.client.on('network-quality', (data) => {
  //   data.forEach((item) => {
  //     console.log(
  //       `==== client 房间里所有成员的网络状况: uid: ${item.uid}, receiveTs: ${item.receiveTs}, uplinlNetworkQuality: ${item.uplinlNetworkQuality}, downlinkNetworkQuality: ${item.downlinkNetworkQuality}`
  //     )
  //   })
  // })

  // rtc.client1.on('network-quality', (data) => {
  //   data.forEach((item) => {
  //     console.log(
  //       `==== client1 房间里所有成员的网络状况: uid: ${item.uid}, receiveTs: ${item.receiveTs}, uplinlNetworkQuality: ${item.uplinlNetworkQuality}, downlinkNetworkQuality: ${item.downlinkNetworkQuality}`
  //     )
  //   })
  // })

  rtc.client.on('audioTrackEnded', (_data) => {
    console.warn('===== 音频轨道已停止:', data)
  })
  rtc.client.on('videoTrackEnded', (_data) => {
    console.warn('===== 音频轨道已停止:', data)
  })
  // rtc.client1.on('videoTrackEnded', (_data) => {
  //   console.warn('===== 音频轨道已停止:', data)
  // })

  try {
    await rtc.client.join({
      channelName,
      uid,
      wssArr: $('#isGetwayAddrConf').prop('checked') ? $('#getwayAddr').val().split(',') : null
    })
    await rtc.client1.join({
      channelName,
      uid: uid1,
      wssArr: $('#isGetwayAddrConf').prop('checked') ? $('#getwayAddr').val().split(',') : null
    })
    await initLocalStream()
    // 播放本地流
    const playOptions = {
      audio: true,
      audioType: true,
      video: true,
      screen: true
    }
    await rtc.localStream.play('localVideoContent', playOptions)
    await rtc.client.publish(rtc.localStream)
    console.warn('localStream.hasAudio(): ', rtc.localStream.hasAudio())
    console.warn('localStream.hasVideo(): ', rtc.localStream.hasVideo())
    // await rtc.client1.publish(rtc.localStream1)
  } catch (error) {
    console.error(error)
  }
}

async function leave() {
  await rtc.client.leave()
  await rtc.client1.leave()
}

// 进房
$('#join').on('click', async () => {
  console.log('进房')
  join()
})
// 离开
$('#leave').on('click', async () => {
  console.log('离开')
  leave()
  rtc.enableBodySegment = false
})

// 发布
$('#pub').on('click', async () => {
  console.log('发布')
  await rtc.client.publish(rtc.localStream)
})

// 取消发布
$('#unpub').on('click', async () => {
  console.log('取消发布')
  await rtc.client.unpublish(rtc.localStream)
})

// 销毁
$('#destroy').on('click', async () => {
  console.log('销毁localStream')
  await rtc.localStream.destroy()
  rtc.localStream = null
})

// 订阅
$('#sub').on('click', async () => {
  console.log('订阅')
  for (let uid in rtc.remoteStreams) {
    const remoteStream = rtc.remoteStreams[uid]
    await rtc.client.subscribe(remoteStream)
  }

  for (let uid in rtc.remoteStreams1) {
    const remoteStream = rtc.remoteStreams1[uid]
    await rtc.client1.subscribe(remoteStream)
  }
})

// 取消订阅
$('#unsub').on('click', async () => {
  console.log('取消订阅')
  for (let uid in rtc.remoteStreams) {
    const remoteStream = rtc.remoteStreams[uid]
    await rtc.client.unsubscribe(remoteStream)
  }

  for (let uid in rtc.remoteStreams1) {
    const remoteStream = rtc.remoteStreams1[uid]
    await rtc.client1.unsubscribe(remoteStream)
  }
})

/**
 * ----------------------------------------
 *              连接状态调试
 * ----------------------------------------
 */
$('#getConnectionState').on('click', () => {
  if (rtc.client) {
    console.warn('获取连接状态:' + rtc.client.getConnectionState())
  } else {
    console.warn('获取连接状态错误:无发找到client')
  }
})

$('#startPlay').on('click', function () {
  // 不写uid默认播放本地流，写uid播放远端流
  let uid = $('#stopUid').val()
  let mediaType = $('#stopMediaType').val()

  if (!uid) {
    //本地
    if (mediaType) {
      rtc.localStream.play('localVideoContent', { mediaType: true })
    } else {
      rtc.localStream.play('localVideoContent', {
        audio: !!$('input[name="enableAudio"]:checked').val(),
        video: !!$('input[name="enableVideo"]:checked').val()
      })
    }
  } else {
    // 远端
    if (mediaType) {
      if (mediaType === 'screen') {
        rtc.remoteStreams1[uid].play('remoteScreenContent', { screen: true })
      } else {
        rtc.remoteStreams[uid].play('remoteScreenContent', { mediaType: true })
      }
    } else {
      rtc.remoteStreams[uid] &&
        rtc.remoteStreams[uid].play('remoteScreenContent', { audio: true, video: true })
      rtc.remoteStreams1[uid] &&
        rtc.remoteStreams1[uid].play('remoteScreenContent', { screen: true })
    }
  }
})

$('#stopPlay').on('click', function () {
  // 不写uid默认停止播放本地流，写uid停止播放远端流
  let uid = $('#stopUid').val()
  let mediaType = $('#stopMediaType').val()
  if (!uid) {
    // 本地
    if (mediaType) {
      rtc.localStream.stop(mediaType)
    } else {
      rtc.localStream.stop()
    }
  } else {
    // 远端
    if (mediaType) {
      if (mediaType === 'screen') {
        rtc.remoteStreams1[uid].stop(mediaType)
      } else {
        rtc.remoteStreams[uid].stop(mediaType)
      }
    } else {
      rtc.remoteStreams[uid] && rtc.remoteStreams[uid].stop()
      rtc.remoteStreams1[uid] && rtc.remoteStreams1[uid].stop()
    }
  }
})

/**
 * ----------------------------------------
 *             云代理
 * ----------------------------------------
 */
$('#startProxyServer-btn').click(() => {
  console.log('启动云代理')
  rtc.client.startProxyServer()
})
$('#stopProxyServer-btn').click(() => {
  console.log('关闭云代理')
  rtc.client.stopProxyServer()
})

/**
 * ----------------------------------------
 *             背景分割
 * ----------------------------------------
 */

//强制注册simd版插件
$('#registerSimdVitrualBackground').on('click', async () => {
  if (rtc.localStream) {
    $('#segmentStatus').html('loading').show()
    const type = 'simd'
    segment_config = virtualBackgroundPluginConfig[NERTC.ENV][type]
    rtc.localStream.registerPlugin(segment_config)
  }
})
//模拟背景分割插件js 404
$('#vbjs404').on('click', async () => {
  if (rtc.localStream) {
    $('#segmentStatus').html('loading').show()
    const type = (await wasmFeatureDetect.simd()) ? 'simd' : 'nosimd'
    segment_config = Object.assign({}, virtualBackgroundPluginConfig[NERTC.ENV][type])
    segment_config.pluginUrl = './js/nim/NIM_Web_VirtualBackground111.js'
    rtc.localStream.registerPlugin(segment_config)
  }
})
//模拟背景分割插件wasm 404
$('#vbwasm404').on('click', async () => {
  if (rtc.localStream) {
    $('#segmentStatus').html('loading').show()
    const type = (await wasmFeatureDetect.simd()) ? 'simd' : 'nosimd'
    segment_config = Object.assign({}, virtualBackgroundPluginConfig[NERTC.ENV][type])
    segment_config.wasmUrl =
      './js/nim/wasm/NIM_Web_VirtualBackground_simd111.wasm' + `?time=${Math.random()}`
    rtc.localStream.registerPlugin(segment_config)
  }
})

$('#registerVitrualBackground').on('click', async () => {
  if (rtc.localStream) {
    $('#segmentStatus').html('loading').show()
    const type = (await wasmFeatureDetect.simd()) ? 'simd' : 'nosimd'
    segment_config = virtualBackgroundPluginConfig[NERTC.ENV][type]
    rtc.localStream.registerPlugin(segment_config)
  }
})

$('#enableSegment').on('click', () => {
  if (rtc.localStream) {
    rtc.localStream.enableBodySegment()
  }
})

$('#disableSegment').on('click', () => {
  if (rtc.localStream) {
    console.warn('关闭背景分割')
    rtc.localStream.disableBodySegment()
  }
})

$('#unregisterVitrualBackground').on('click', () => {
  $('#segmentStatus').html('loading').hide()
  if (segment_config) {
    rtc.localStream.unregisterPlugin(segment_config.key)
    rtc.enableBodySegment = false
  }
})

//强制注册simd版插件
$('#registerSimdAdvancedBeauty').on('click', async () => {
  if (rtc.localStream) {
    $('#advancedBeautyStatus').html('loading').show()
    const type = 'simd'
    beauty_config = advancedBeautyPluginConfig[NERTC.ENV][type]
    rtc.localStream.registerPlugin(beauty_config)
  }
})

document.getElementById('select').onchange = function () {
  let file = this.files[0]
  let reader = new FileReader()
  reader.onload = function () {
    const img = new Image()
    img.src = this.result
    img.onload = () => {
      rtc.localStream.setBackGround({ type: 'image', source: img })
    }
    //rtc.localStream.setBackGround({type: 'image', source: this.result})
  }
  reader.readAsDataURL(file)
}

$('#red').on('click', () => {
  rtc.localStream.setBackGround({ type: 'color', color: '#ff0000' })
})

$('#green').on('click', () => {
  rtc.localStream.setBackGround({ type: 'color', color: '#00ff00' })
})

$('#blue').on('click', () => {
  rtc.localStream.setBackGround({ type: 'color', color: '#0000ff' })
})

$('#blur').on('click', () => {
  let level = $('#level').val()
  rtc.localStream.setBackGround({ type: 'blur', level: parseInt(level) })
})

$('#level').on('change', () => {
  let level = $('#level').val()
  console.log('level', level)
  rtc.localStream.setBackGround({ type: 'blur', level: parseInt(level) })
})

function onPluginLoaded(name) {
  console.log('onPluginLoaded', name)
  if (name === 'VirtualBackground') {
    $('#segmentStatus').html('loaded').show()
    rtc.enableBodySegment = true
  }
}

$('#playCamera').on('click', () => {
  openCamera()
})

function openCamera() {
  console.warn('打开摄像头')

  const resolution = $('#sessionConfigVideoQuality').val()
  let videoProfile = {}
  if (resolution) {
    videoProfile.resolution = NERTC.VIDEO_QUALITY[resolution]
  }

  rtc.localStream.setVideoProfile(videoProfile)

  rtc.localStream
    .open({
      type: 'video'
      // deviceId: $('#camera').val(),
      // facingMode: $('#cameraFacingMode').val(),
      // enableMediaPub: $('#enableMediaPub').prop('checked')
    })
    .then(async () => {
      console.log('打开摄像头 sucess')
      await rtc.localStream.play(localVideoContent)
      // rtc.localStream.setLocalRenderMode(globalConfig.localViewConfig)
    })
    .catch((err) => {
      // addLog('打开摄像头' + err)
      console.log('打开摄像头 失败: ', err)
    })
}
$('#playCameraOff').on('click', () => {
  console.warn('关闭摄像头')

  rtc.localStream
    .close({
      type: 'video'
    })
    .then(() => {
      console.log('关闭摄像头 sucess')
    })
    .catch((err) => {
      console.log('关闭摄像头 失败: ', err)
    })
})

$('#playMicro').on('click', () => {
  openMicro()
})

function openMicro() {
  console.warn('打开mic')

  rtc.localStream
    .open({
      type: 'audio'
    })
    .then(() => {
      console.log('打开mic sucess')
    })
    .catch((err) => {
      console.log('打开mic 失败: ', err)
    })
}

$('#playMicroOff').on('click', () => {
  console.warn('关闭mic')

  rtc.localStream
    .close({
      type: 'audio'
    })
    .then(() => {
      console.log('关闭mic sucess')
    })
    .catch((err) => {
      console.log('关闭mic 失败: ', err)
    })
})
