function startZEGO() {
  console.warn('开启 ZEGO')
  let userId, roomId
  const localStoragePrefix = 'ZEGO-'
  window.zrtc = {
    client: null,
    zg: null,
    localStream: null,
    customStream: null,
    shareStream: null,
    localView: null,
    customView: null,
    localScreenView: null,
    remoteStreams: []
  }
  let shareStreamID, localStreamID, customStreamID
  let customAudio = false
  const dumpParams = {
    dumpMediaType: '',
    DUMP_SIZE_MAX: 10000000,
    dumpStartAt: 0,
    dumpEndAt: 0,
    dumpKey: 0,
    dumpDelta: 0,
    dumpBuffer: []
  }
  let options = {},
    cameraOptions = {},
    screenOptions = {}
  let resolutionMap = new Map([
    ['VIDEO_QUALITY_480p', ['480p', 640, 480]],
    ['VIDEO_QUALITY_180p', ['180p', 320, 180]],
    ['VIDEO_QUALITY_720p', ['720p', 1280, 720]],
    ['VIDEO_QUALITY_1080p', ['1080p', 1920, 1080]]
  ])
  let frameRateMap = new Map([
    ['CHAT_VIDEO_FRAME_RATE_5', 5],
    ['CHAT_VIDEO_FRAME_RATE_10', 10],
    ['CHAT_VIDEO_FRAME_RATE_15', 15],
    ['CHAT_VIDEO_FRAME_RATE_20', 20],
    ['CHAT_VIDEO_FRAME_RATE_25', 25],
    ['CHAT_VIDEO_FRAME_RATE_30', 30],
    ['CHAT_VIDEO_FRAME_RATE_NORMAL', 15]
  ])
  let audioBitrateMap = new Map([
    ['speech_low_quality', [24, 1]],
    ['speech_standard', [24, 1]],
    ['music_standard', [40, 1]],
    ['standard_stereo', [64, 2]],
    ['high_quality', [128, 2]],
    ['high_quality_stereo', [192, 2]]
  ])

  loadEnv()
  init()
  initDevices()

  function loadEnv() {
    roomId = window.localStorage
      ? window.localStorage.getItem(`${localStoragePrefix}channelName`)
      : ''
    $('#channelName').val(roomId)
    userId = '' + Math.floor(Math.random() * 9000 + 1000)
    $('#uid').val(userId)
  }

  function init() {
    let appID = 1807888605
    let server = 'wss://webliveroom1807888605-api.imzego.com/ws'

    zrtc.zg = new ZegoExpressEngine(appID, server)
    // installEventHandlers()
  }

  function installEventHandlers() {
    // zrtc.zg.on('roomStateChanged', (roomID, reason, errorCode, extendData) => {
    //   if (reason == 'LOGINING') {
    //     // 登录中
    //   } else if (reason == 'LOGINED') {
    //     // 登录成功
    //     //只有当房间状态是登录成功或重连成功时，推流（startPublishingStream）、拉流（startPlayingStream）才能正常收发音视频
    //     //将自己的音视频流推送到 ZEGO 音视频云
    //   } else if (reason == 'LOGIN_FAILED') {
    //     // 登录失败
    //   } else if (reason == 'RECONNECTING') {
    //     // 重连中
    //   } else if (reason == 'RECONNECTED') {
    //     // 重连成功
    //   } else if (reason == 'RECONNECT_FAILED') {
    //     // 重连失败
    //   } else if (reason == 'KICKOUT') {
    //     // 被踢出房间
    //   } else if (reason == 'LOGOUT') {
    //     // 登出成功
    //   } else if (reason == 'LOGOUT_FAILED') {
    //     // 登出失败
    //   }
    // })

    //房间内其他用户进出房间的通知
    //只有调用 loginRoom 登录房间时传入 ZegoRoomConfig，且 ZegoRoomConfig 的 userUpdate 参数为 “true” 时，用户才能收到 roomUserUpdate回调。
    zrtc.zg.on('roomUserUpdate', (roomID, updateType, userList) => {
      if (updateType == 'ADD') {
        for (var i = 0; i < userList.length; i++) {
          console.warn(userList[i]['userID'], '加入了房间：', roomID)
        }
      } else if (updateType == 'DELETE') {
        for (var i = 0; i < userList.length; i++) {
          console.warn(userList[i]['userID'], '退出了房间：', roomID)
        }
      }
    })

    zrtc.zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
      // 房间内其他用户音视频流变化的通知
      // 当 updateType 为 ADD 时，代表有音视频流新增，此时可以调用 startPlayingStream 接口拉取播放该音视频流
      if (updateType == 'ADD') {
        // 流新增，开始拉流
        // 这里为了使示例代码更加简洁，我们只拉取新增的音视频流列表中第的第一条流，在实际的业务中，建议开发者循环遍历 streamList ，拉取每一条音视频流

        for (const stream of streamList) {
          const streamID = stream.streamID
          let remoteStream = await zrtc.zg.startPlayingStream(streamID)
          remoteStream.mediaType_ = streamID
          zrtc.remoteStreams.push(remoteStream)

          let remoteView = zrtc.zg.createRemoteStreamView(remoteStream)

          if (streamID.indexOf('video') > -1 || streamID.indexOf('custom') > -1) {
            remoteView.play('remoteVideoContent')
          } else if (streamID.indexOf('screen') > -1) {
            remoteView.play('remoteScreenContent')
          }
        }
      } else if (updateType == 'DELETE') {
        // 流删除，停止拉流
        // 流删除，通过流删除列表 streamList 中每个流的 streamID 进行停止拉流。
        for (const stream of streamList) {
          const streamID = stream.streamID
          zrtc.zg.stopPlayingStream(streamID)
          console.warn('房间', roomID, '内减少了流：', streamID)
        }
      }
    })

    zrtc.zg.on('roomStateChanged', async (roomID, reason, errorCode, extendedData) => {
      // 房间状态变化的通知
    })

    //用户推送音视频流的状态通知
    //用户推送音视频流的状态发生变更时，会收到该回调。如果网络中断导致推流异常，SDK 在重试推流的同时也会通知状态变化。
    zrtc.zg.on('publisherStateUpdate', (result) => {
      // 推流状态更新回调
      var state = result['state']
      var streamID = result['streamID']
      var errorCode = result['errorCode']
      var extendedData = result['extendedData']
      if (state == 'PUBLISHING') {
        console.warn('成功推送音视频流：', streamID)
      } else if (state == 'NO_PUBLISH') {
        console.warn('未推送音视频流')
      } else if (state == 'PUBLISH_REQUESTING') {
        console.warn('请求推送音视频流：', streamID)
      }
      console.warn('错误码:', errorCode, ' 额外信息:', extendedData)
    })

    //用户拉取音视频流的状态通知
    //用户拉取音视频流的状态发生变更时，会收到该回调。如果网络中断导致拉流异常，SDK 会自动进行重试。
    zrtc.zg.on('playerStateUpdate', (result) => {
      // 拉流状态更新回调
      var state = result['state']
      var streamID = result['streamID']
      var errorCode = result['errorCode']
      var extendedData = result['extendedData']
      if (state == 'PLAYING') {
        console.warn('成功拉取音视频流：', streamID)
      } else if (state == 'NO_PLAY') {
        console.warn('未拉取音视频流')
      } else if (state == 'PLAY_REQUESTING') {
        console.warn('请求拉取音视频流：', streamID)
      }
      console.warn('错误码:', errorCode, ' 额外信息:', extendedData)
    })
  }

  async function joinRoom() {
    installEventHandlers()
    roomId = document.querySelector('#channelName').value
    if (window.localStorage) {
      window.localStorage.setItem(`${localStoragePrefix}channelName`, roomId)
    }
    let roomID = roomId
    let token = await getToken()

    let isLogin = await zrtc.zg.loginRoom(roomID, token, {
      userID: userId,
      userName: userId
    })
    if (isLogin) {
      console.warn('登录房间成功')
      try {
        await initLocalStream()
      } catch (e) {
        console.error('initLocalStream() error', e)
      }
      // zrtc.localStream = await zrtc.zg.createStream()
      // zrtc.localView = zrtc.zg.createLocalStreamView(zrtc.localStream)
      // zrtc.localView.play('localVideoContent')
      await zegoPublish()
    } else {
      console.warn('登录房间失败')
    }
  }

  async function initLocalStream() {
    initOptions()
    try {
      // 主流
      if (options.camera && Object.keys(options.camera).length > 0) {
        zrtc.localStream = await zrtc.zg.createStream({ camera: options.camera })
        console.warn('initLocalStream() options.camera', options.camera)
        zrtc.localView = zrtc.zg.createLocalStreamView(zrtc.localStream)
        zrtc.localView.play('localVideoContent')
        console.warn('本地流创建成功')
      }
      // 自定义主流
      if (options.custom && Object.keys(options.custom).length > 0) {
        zrtc.customStream = await zrtc.zg.createStream({ custom: options.custom })
        console.warn('initLocalStream() options.custom', options.custom)
        if (!options.custom.channelCount) {
          zrtc.customView = zrtc.zg.createLocalStreamView(zrtc.customStream)
          zrtc.customView.play('localVideoContent')
          console.warn('本地自定义主流创建成功')
        } else {
          console.warn('本地自定义音频主流创建成功')
        }
      }
      // 辅流
      if (options.screen && Object.keys(options.screen).length > 0) {
        zrtc.shareStream = await zrtc.zg.createStream({ screen: options.screen })
        console.warn('initLocalStream() options.screen', options.screen)
        zrtc.localScreenView = zrtc.zg.createLocalStreamView(zrtc.shareStream)
        zrtc.localScreenView.play('localScreenContent')
        console.warn('本地共享流创建成功')
      }
    } catch (error) {
      console.error('创建本地流失败', error)
    }
  }
  async function zegoPublish() {
    if (!zrtc.localStream && !zrtc.customStream && !zrtc.shareStream) {
      console.warn('zegoPublish() 请先创建流')
      return
    }
    let codec = $('input[name="zegoCodec"]:checked').val().toUpperCase()
    try {
      if (zrtc.localStream) {
        let timestamp = new Date().getTime().toString()
        localStreamID = 'video' + timestamp
        console.warn('zegoPublish() localStreamID: ', localStreamID)
        await zrtc.zg.startPublishingStream(localStreamID, zrtc.localStream, { videoCodec: codec })
        console.warn('LocalStream is published successfully')
      }
      if (zrtc.customStream) {
        let timestamp = new Date().getTime().toString()
        customStreamID = 'custom' + timestamp
        console.warn('zegoPublish() customStreamID: ', customStreamID)
        await zrtc.zg.startPublishingStream(customStreamID, zrtc.customStream, {
          videoCodec: codec
        })
        console.warn('CustomStream is published successfully')
      }
      if (zrtc.shareStream) {
        let timestamp = new Date().getTime().toString()
        shareStreamID = 'screen' + timestamp
        console.warn('zegoPublish() shareStreamID: ', shareStreamID)
        await zrtc.zg.startPublishingStream(shareStreamID, zrtc.shareStream, { videoCodec: codec })
        console.warn('ShareStream is published successfully')
      }
    } catch (error) {
      console.warn('publish failed', error)
    }
  }

  function initOptions() {
    const enableAudio = $('input[name="enableAudio"]:checked').val()
    // audio = !!enableAudio
    if (enableAudio === 'source') {
      let audioSource = getAudioSource('audio')
      audioSource.enabled = true
      const customSource = new MediaStream()
      customSource.addTrack(audioSource)
      // const stream = await zrtc.zg.createStream({ custom: { source: customSource } })
      // options.custom = {
      //   source: customSource
      // }
      if (!options.custom) {
        options.custom = {}
      }
      options.custom.source = customSource
      options.custom.channelCount = 1
      customAudio = true
    } else if (enableAudio === 'yes') {
      initAudioProfiles()
    } else {
      // options.camera = {
      //   audio: false
      // }
      if (!options.camera) {
        options.camera = {}
      }
      options.camera.audio = false
    }

    const enableVideo = $('input[name="enableVideo"]:checked').val()
    if (enableVideo === 'source') {
      options.camera = null
      initCustomProfiles()
    } else if (enableVideo === 'yes') {
      initVideoProfiles()
    } else {
      // options.camera = {
      //   video: false
      // }
      if (!options.camera) {
        options.camera = {}
      }
      options.camera.video = false
    }

    const enableScreen = $('input[name="enableScreen"]:checked').val()

    if (enableScreen === 'source') {
      console.warn('ZEGO 暂不支持自定义辅流视频')
    } else if (enableScreen === 'yes') {
      initScreenProfiles()
    } else {
      //
    }

    const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val()

    if (enableScreenAudio === 'source') {
      console.warn('ZEGO 暂不支持自定义辅流音频')
    } else if (enableScreenAudio === 'yes') {
      initScreenProfiles()
    } else {
      //
    }

    console.warn('initOptions() options: ', options)
  }

  function initAudioProfiles() {
    // 即构不支持设置音频采样率
    let bitrate, audioChannels, ANS, AGC, AEC, microphoneId
    let audioProfile = $('#sessionConfigAudioProfile').val()
    if (audioProfile) {
      bitrate = audioBitrateMap.get(audioProfile)[0]
      audioChannels = audioBitrateMap.get(audioProfile)[1]
    } else {
      ;(bitrate = 24), (audioChannels = 1)
    }
    switch ($('#ans').val()) {
      case '':
        break
      case 'true':
        ANS = true
        break
      case 'false':
        ANS = false
        break
    }
    switch ($('#aec').val()) {
      case '':
        break
      case 'true':
        AEC = true
        break
      case 'false':
        AEC = false
        break
    }
    switch ($('#agc').val()) {
      case '':
        break
      case 'true':
        AGC = true
        break
      case 'false':
        AGC = false
        break
    }
    if ($('#micro').val()) {
      microphoneId = $('#micro').val()
    }
    // options.camera = {
    //   audio: true,
    //   audioBitrate: bitrate,
    //   channelCount: audioChannels,
    //   audioInput: microphoneId,
    //   ANS,
    //   AGC,
    //   AEC
    // }
    if (!options.camera) {
      options.camera = {}
    }

    options.camera.audio = true
    options.camera.audioBitrate = bitrate
    options.camera.channelCount = audioChannels
    options.camera.audioInput = microphoneId
    options.camera.ANS = ANS
    options.camera.AGC = AGC
    options.camera.AEC = AEC
  }

  function initVideoProfiles() {
    let videoWidth,
      videoHeight,
      videoFrameRate,
      videoBitrate,
      mediaType,
      facingMode,
      cameraId,
      contentHint
    videoWidth = resolutionMap.get($('#sessionConfigVideoQuality').val())[1]
    videoHeight = resolutionMap.get($('#sessionConfigVideoQuality').val())[2]
    videoFrameRate = frameRateMap.get($('#sessionConfigVideoFrameRate').val())
    mediaType = $('#encoderMediaType').val()
    if (
      mediaType === 'video' &&
      document.getElementById('enableBitrateMax').checked &&
      $('#bitrateMax').val()
    ) {
      videoBitrate = $('#bitrateMax').val()
    } else {
      videoBitrate = 800
    }

    if ($('#cameraFacingMode').val()) {
      facingMode = $('#cameraFacingMode').val()
    }

    if ($('#camera').val()) {
      cameraId = $('#camera').val()
    }

    if (mediaType === 'video' && document.getElementById('enableContentHint').checked) {
      if ($('#contentHint').val()) {
        contentHint = $('#contentHint').val()
      } else {
        contentHint = 'default'
      }
      console.warn('videoContentHint: ', contentHint)
    }
    // options.camera = {
    //   video: true,
    //   videoQuality: 4,
    //   width: videoWidth,
    //   height: videoHeight,
    //   frameRate: videoFrameRate,
    //   bitrate: videoBitrate,
    //   videoInput: cameraId,
    //   videoOptimizationMode: contentHint,
    //   facingMode
    // }
    if (!options.camera) {
      options.camera = {}
    }
    options.camera.video = true
    options.camera.videoQuality = 4
    options.camera.width = videoWidth
    options.camera.height = videoHeight
    options.camera.frameRate = videoFrameRate
    options.camera.bitrate = videoBitrate
    options.camera.videoInput = cameraId
    options.camera.videoOptimizationMode = contentHint
    options.camera.facingMode = facingMode
  }

  function initCustomProfiles() {
    let mediaType, videoBitrate, audioChannels, contentHint
    let audioProfile = $('#sessionConfigAudioProfile').val()
    if (audioProfile) {
      audioChannels = audioBitrateMap.get(audioProfile)[1]
    } else {
      audioChannels = 1
    }
    let videoSource = getVideoSource('video')
    const customSource = new MediaStream()
    customSource.addTrack(videoSource)

    console.warn('customSource: ', customSource)
    videoSource.enabled = true
    mediaType = $('#encoderMediaType').val()
    if (
      mediaType === 'video' &&
      document.getElementById('enableBitrateMax').checked &&
      $('#bitrateMax').val()
    ) {
      videoBitrate = $('#bitrateMax').val()
    } else {
      videoBitrate = 800
    }
    if (mediaType === 'video' && document.getElementById('enableContentHint').checked) {
      if ($('#contentHint').val()) {
        contentHint = $('#contentHint').val()
      } else {
        contentHint = 'default'
      }
      console.warn('videoContentHint: ', contentHint)
    }
    // options.custom = {
    //   source: customSource,
    //   bitrate: videoBitrate,
    //   videoOptimizationMode: contentHint,
    //   channelCount: audioChannels
    // }
    if (!options.custom) {
      options.custom = {}
    }
    options.custom.source = customSource
    options.custom.bitrate = videoBitrate
    options.custom.videoOptimizationMode = contentHint
    // options.custom.channelCount = audioChannels
  }

  function initScreenProfiles() {
    let screenWidth, screenHeight, screenFrameRate, screenBitrate, mediaType, audio, contentHint
    screenWidth = resolutionMap.get($('#sessionConfigScreenProfile').val())[1]
    screenHeight = resolutionMap.get($('#sessionConfigScreenProfile').val())[2]
    screenFrameRate = frameRateMap.get($('#sessionConfigScreenFrameRate').val())
    mediaType = $('#encoderMediaType').val()
    if (
      mediaType === 'screen' &&
      document.getElementById('enableBitrateMax').checked &&
      $('#bitrateMax').val()
    ) {
      screenBitrate = $('#bitrateMax').val()
    } else {
      screenBitrate = 1600
    }

    if (mediaType === 'screen' && document.getElementById('enableContentHint').checked) {
      if ($('#contentHint').val()) {
        contentHint = $('#contentHint').val()
      } else {
        contentHint = 'default'
      }
      console.warn('videoContentHint: ', contentHint)
    }
    if ($('input[name="enableScreenAudio"]:checked').val() === 'yes') {
      audio = true
    }

    // options.screen = {
    //   audio,
    //   videoQuality: 4,
    //   width: screenWidth,
    //   height: screenHeight,
    //   frameRate: screenFrameRate,
    //   bitrate: screenBitrate,
    //   videoOptimizationMode: contentHint
    // }
    if (!options.screen) {
      options.screen = {}
    }
    options.screen.audio = audio
    options.screen.videoQuality = 4
    options.screen.width = screenWidth
    options.screen.height = screenHeight
    options.screen.frameRate = screenFrameRate
    options.screen.bitrate = screenBitrate
    options.screen.videoOptimizationMode = contentHint
  }

  async function leaveRoom() {
    console.warn('退出房间')
    zrtc.zg.logoutRoom(roomId)
    zrtc.zg.destroyEngine()
    zrtc.zg = null
  }
  async function getToken() {
    console.warn('获取token')
    // const appID = 1807888605
    // const serverSecret = 'bb20b661d6a800156226122fd02bcd06' // type: 32 byte length string
    // 请将 userId 修改为用户的 userId
    // const userId = userId // type: string
    // const effectiveTimeInSeconds = 3600 //type: number; unit: s； token 过期时间，单位：秒
    // //生成基础鉴权 token时，payload 要设为空字符串
    // const payload = ''
    // // Build token
    // const token =  generateToken04(appID, userId, serverSecret, effectiveTimeInSeconds, payload);
    // console.warn('token:',token);
    // tokenServerUrl =
    //   'https://admin-test.netease.im/public-service/tokenGen/zego/basic?userId=' + userId

    // fetch('https://admin-test.netease.im/public-service/tokenGen/zego/basic?userId=' + userId)
    //   .then((res) => res.json())
    //   .then((data) => {
    //     console.error('token:', data.data)
    //     // token = data.data
    //     return data.data
    //   })
    //   .catch((err) => console.error(err))
    const AppID = 1807888605
    const ServerSecret = 'bb20b661d6a800156226122fd02bcd06'
    try {
      const response = await fetch(
        'https://admin-test.netease.im/public-service/tokenGen/zego/basic?userId=' +
          userId +
          '&AppID=' +
          AppID +
          '&ServerSecret=' +
          ServerSecret
      )
      const data = await response.json()
      return data.data
    } catch (err) {
      console.error(err)
    }
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

  // 自定义音频
  function getAudioSource(mediaType) {
    let defaultStr
    if (mediaType === 'audio') {
      defaultStr = '1x1x0'
    } else if (mediaType === 'screenAudio') {
      defaultStr = '2x1x0'
    } else {
      defaultStr = '3x1x0'
    }
    let message = '自定义音频配置 【声音ID(1-3)】x【音量0-1】x【噪音(0-1)】：'
    message += '\n2_1_1：播报爸爸的爸爸叫爷爷'
    message += '\nsine：播放左右声道相反的正弦波'
    const optionsStr = prompt(message, defaultStr) || defaultStr
    if (optionsStr === 'sine') {
      const audioConstraint = {
        type: 'oscstereo'
      }
      console.log('自定义音频配置', mediaType, defaultStr, audioConstraint)
      const fakeAudio = fakeMediaDevices.getFakeMedia({
        audio: audioConstraint
      }).audio
      return fakeAudio.track
    } else {
      const matches = optionsStr.match(/(.+)x(.+)x(.+)/)
      const BUILTIN_AB = [null, 'brysj', 'bbdbbjyy', 'mmdmmjwp']
      const audioConstraint = {
        mono: {
          data: BUILTIN_AB[matches[1]],
          loop: true,
          gain: parseFloat(matches[2])
        },
        channelCount: 1
      }
      if (parseFloat(matches[3]) > 0.01) {
        audioConstraint.mono.noise = { gain: parseFloat(matches[3]) }
      }
      console.log('自定义音频配置', mediaType, defaultStr, audioConstraint)
      const fakeAudio = fakeMediaDevices.getFakeMedia({
        audio: audioConstraint
      }).audio
      return fakeAudio.track
    }
  }

  // 自定义视频
  function getVideoSource(mediaType) {
    let videoConstraint = {
      width: '1920',
      height: '1080',
      frameRate: '15',
      content: 'video 1920x1080x15x1'
    }
    let videoSource = fakeMediaDevices.getFakeMedia({ video: videoConstraint }).video.track
    return videoSource
  }
  // 音视频设备初始化
  function initDevices() {
    zrtc.zg.getMicrophones().then((data) => {
      var info = JSON.stringify(data)
      console.warn('麦克风: %o', info)
      renderDevice($('#micro'), data)
    })
    zrtc.zg.getCameras().then((data) => {
      var info = JSON.stringify(data)
      console.warn('摄像头: %o', info)
      renderDevice($('#camera'), data)
    })
  }
  function renderDevice(node, devices) {
    if (node.length) {
      node = node[0]
    }
    const childNodes = node.childNodes
    for (let i in childNodes) {
      const childNode = childNodes[i]
      if (childNode.value) {
        childNode.disabled = true
      }
    }

    for (var i = 0, len = devices.length; i < len; i++) {
      let isNewDevice = true
      for (let j in childNodes) {
        const childNode = childNodes[j]
        if (childNode.value === devices[i].deviceID) {
          isNewDevice = false
          childNode.innerText = devices[i].deviceName
          childNode.disabled = false
        }
      }
      if (isNewDevice) {
        const elem = document.createElement('option')
        elem.value = devices[i].deviceID
        elem.innerText = devices[i].deviceName
        node.appendChild(elem)
      }
    }
  }

  // 切换mic
  $('#micro').on('change', () => {
    const microphoneId = $('#micro').val()
    console.warn('切换mic: ', microphoneId)

    zrtc.zg &&
      zrtc.localStream &&
      zrtc.zg
        .useAudioDevice(zrtc.localStream, microphoneId)
        .then(() => {
          console.warn('切换mic成功')
        })
        .catch((err) => {
          console.warn('切换mic失败： ', err)
        })
  })

  // 切换camera
  $('#camera').on('change', () => {
    const cameraId = $('#camera').val()
    console.warn('切换camera: ', cameraId)

    zrtc.zg &&
      zrtc.localStream &&
      zrtc.zg
        .useVideoDevice(zrtc.localStream, cameraId)
        .then(() => {
          console.warn('切换camera成功')
        })
        .catch((err) => {
          console.warn('切换camera失败： ', err)
        })
  })
  // 设备相关
  // 音频
  $('#playMicroSource').on('click', async () => {
    console.warn('打开自定义音频')

    let audioSource = getAudioSource('audio')
    const customSource = new MediaStream()
    customSource.addTrack(audioSource)
    let timestamp = new Date().getTime().toString()
    customStreamID = 'customAudio' + timestamp
    zrtc.customStream = await zrtc.zg.createStream({ custom: { source: customSource } })
    zrtc.zg.startPublishingStream(customStreamID, zrtc.customStream)
    console.warn('开启自定义音频成功')
    customAudio = true
  })
  $('#playMicro').on('click', async () => {
    console.warn('打开麦克风')
    if (options.camera && options.camera.audio) {
      zrtc.zg.mutePublishStreamAudio(zrtc.localStream, false)
      console.warn('mutePublishStreamAudio() false 开启音频')
    } else {
      initAudioProfiles()
      zrtc.localStream = await zrtc.zg.createStream({ camera: options.camera })
      console.warn('playMic options.camera: ', options.camera)
      console.warn('开启音频时，设置 audioProfile: ', options.camera)
      zrtc.localView = zrtc.zg.createLocalStreamView(zrtc.localStream)
      zrtc.localView.play('localVideoContent')
    }
    console.warn('本地音频流创建成功')
  })

  $('#playMicroOff').on('click', async () => {
    console.warn('关闭麦克风')
    if (!zrtc.localStream && !zrtc.customStream) {
      return
    }
    if (customAudio) {
      zrtc.zg.stopPublishingStream(customStreamID)
      console.warn('关闭自定义音频成功')
      customAudio = false
    } else {
      zrtc.zg.mutePublishStreamAudio(zrtc.localStream, true)
      console.warn('mutePublishStreamAudio() true 关闭音频')
      console.warn('关闭麦克风成功')
    }
  })

  // 视频
  $('#playCameraSource').on('click', async () => {
    console.warn('打开自定义视频')
    if (!zrtc.localStream && !zrtc.customStream) {
      return
    }

    let videoSource = getVideoSource('video')
    const customSource = new MediaStream()
    customSource.addTrack(videoSource)

    const stream = await zrtc.zg.createStream({ custom: { source: customSource } })
    console.warn('playCamera options.custom: ', options.custom)
    zrtc.customView = zrtc.zg.createLocalStreamView(stream)
    zrtc.customView.play('localVideoContent')
    let timestamp = new Date().getTime().toString()
    customStreamID = 'custom' + timestamp
    console.warn('打开自定义视频 customStreamID: ', customStreamID)
    zrtc.zg.startPublishingStream(customStreamID, stream)
  })
  $('#playCamera').on('click', async () => {
    console.warn('打开摄像头')
    initVideoProfiles()

    zrtc.localStream = await zrtc.zg.createStream({ camera: options.camera })
    console.warn('playCamera options.camera: ', options.camera)

    console.warn('开启视频时，设置 videoProfile: ', options.camera)
    zrtc.localView = zrtc.zg.createLocalStreamView(zrtc.localStream)
    zrtc.localView.play('localVideoContent')
    console.warn('playCamera 本地视频流创建成功')

    let timestamp = new Date().getTime().toString()
    localStreamID = 'video' + timestamp
    console.warn('打开摄像头 localStreamID: ', localStreamID)
    await zrtc.zg.startPublishingStream(localStreamID, zrtc.localStream)
    console.warn('LocalStream is published successfully')
    console.warn('playCamera 本地视频流发布成功')
  })
  $('#playCameraOff').on('click', async () => {
    console.warn('关闭摄像头')
    if (!zrtc.localStream && !zrtc.customStream) {
      return
    }
    let videoTrack = zrtc.localStream && zrtc.localStream.getVideoTracks()[0]
    let customVideoTrack = zrtc.customStream && zrtc.customStream.getVideoTracks()[0]
    // if (videoTrack) {
    //   await zrtc.zg.removeTrack(zrtc.localStream, videoTrack)
    //   videoTrack.stop()
    //   console.warn('关闭摄像头成功')
    // }
    // if (customVideoTrack) {
    //   await zrtc.zg.removeTrack(zrtc.customStream, customVideoTrack)
    //   customVideoTrack.stop()
    //   console.warn('关闭自定义视频成功')
    // }
    if (videoTrack) {
      console.warn('关闭摄像头 localStreamID: ', localStreamID)
      zrtc.zg.stopPublishingStream(localStreamID)
      zrtc.zg.stopPlayingStream(localStreamID)
      zrtc.localStream && zrtc.zg.destroyStream(zrtc.localStream)
      console.warn('关闭摄像头成功')
    }
    if (customVideoTrack) {
      console.warn('关闭自定义视频 customStreamID: ', customStreamID)
      zrtc.zg.stopPublishingStream(customStreamID)
      zrtc.zg.stopPlayingStream(customStreamID)
      zrtc.customStream && zrtc.zg.destroyStream(zrtc.customStream)
      console.warn('关闭自定义视频成功')
    }
  })
  // 辅流
  $('#playScreenSource').on('click', async () => {
    console.warn('Zego 不支持自定义辅流')
  })
  $('#playScreen').on('click', async () => {
    console.warn('打开辅流')
    initScreenProfiles()

    zrtc.shareStream = await zrtc.zg.createStream({ screen: options.screen })
    console.warn('playScreen options.screen: ', options.screen)

    console.warn('开启辅流时，设置 screenProfile: ', options.screen)
    zrtc.screenView = zrtc.zg.createLocalStreamView(zrtc.shareStream)
    zrtc.screenView.play('localVideoContent')
    console.warn('playScreen 本地辅流创建成功')

    let timestamp = new Date().getTime().toString()
    shareStreamID = 'screen' + timestamp
    console.warn('打开辅流 shareStreamID: ', shareStreamID)
    await zrtc.zg.startPublishingStream(shareStreamID, zrtc.shareStream)
    console.warn('LocalStream is published successfully')
    console.warn('playScreen 本地辅流发布成功')
  })
  $('#playScreenOff').on('click', async () => {
    console.warn('关闭辅流')
    if (!zrtc.shareStream) {
      return
    }
    console.warn('关闭辅流 shareStreamID: ', shareStreamID)
    zrtc.zg.stopPublishingStream(shareStreamID)
    zrtc.zg.stopPlayingStream(shareStreamID)
    zrtc.shareStream && zrtc.zg.destroyStream(zrtc.shareStream)
    console.warn('关闭辅流成功')
  })
  // 辅流音频
  $('#playScreenAudioSource').on('click', async () => {
    console.warn('Zego 不支持自定义辅流音频')
  })
  $('#playScreenAudio').on('click', async () => {
    console.warn('打开辅流音频')
    initScreenProfiles()
    options.screen.audio = true

    zrtc.shareStream = await zrtc.zg.createStream({ screen: options.screen })
    console.warn('playScreenAudio options.screen: ', options.screen)

    console.warn('开启辅流音频时，设置 audioProfile: ', options.screen)
    zrtc.screenView = zrtc.zg.createLocalStreamView(zrtc.shareStream)
    zrtc.screenView.play('localVideoContent')
    console.warn('playScreenAudio 本地辅流音频创建成功')

    let timestamp = new Date().getTime().toString()
    shareStreamID = 'screen' + timestamp
    console.warn('打开辅流音频 shareStreamID: ', shareStreamID)
    await zrtc.zg.startPublishingStream(shareStreamID, zrtc.shareStream)
    console.warn('LocalStream is published successfully')
    console.warn('playScreenAudio 本地辅流音频发布成功')
  })
  $('#playScreenAudioOff').on('click', async () => {
    console.warn('关闭辅流音频')
    if (!zrtc.shareStream) {
      return
    }
    console.warn('关闭辅流音频 shareStreamID: ', shareStreamID)
    zrtc.zg.stopPublishingStream(shareStreamID)
    zrtc.zg.stopPlayingStream(shareStreamID)
    zrtc.shareStream && zrtc.zg.destroyStream(zrtc.shareStream)
    console.warn('关闭辅流音频成功')
  })

  document.getElementById('startVideoDump').onclick = async function () {
    let enableDump = parseInt($('input[name="enableDump"]:checked').val())
    startDump(enableDump)
  }
  document.getElementById('stopVideoDump').onclick = function () {
    stopDump()
  }

  async function startDump(option) {
    let frameCounter = 0
    let dumpTrack
    if (option === 1) {
      // dumpTrack = trtc.localStream.mediaStream_.getVideoTracks()[0]
      dumpTrack = zrtc.localStream.getVideoTracks()[0]
      dumpParams.dumpMediaType = 'localVideo'
    } else if (option === 2) {
      // dumpTrack = trtc.shareStream.mediaStream_.getVideoTracks()[0]
      dumpTrack = zrtc.shareStream.getVideoTracks()[0]
      dumpParams.dumpMediaType = 'localScreen'
    } else if (option === 3) {
      dumpTrack = zrtc.remoteStreams
        .find((item) => {
          item.mediaType_.indexOf('video') > -1 || item.mediaType_.indexOf('custom') > -1
        })
        .getVideoTracks()[0]
      dumpParams.dumpMediaType = 'remoteVideo'
    } else if (option === 4) {
      dumpTrack = zrtc.remoteStreams
        .find((item) => item.mediaType_.indexOf('screen') > -1)
        .getVideoTracks()[0]
      dumpParams.dumpMediaType = 'remoteScreen'
    }
    // let videoTrack = trtc.localStream.mediaHelper.video.renderStream.getTracks()[0];
    let trackSettings = dumpTrack.getSettings()
    let trackProcessor = new MediaStreamTrackProcessor(dumpTrack)
    let frameStream = trackProcessor.readable
    let frameReader = frameStream.getReader()
    let config = {
      // codec: 'avc3.42e01f', // level_idc 是 1f, 0x1f = 31，即 Level 3.1， 最大支持 720p 30fps编码
      codec: 'avc3.42e028', // 提升到 Level 4，最大支持 1080p 30fps
      width: trackSettings.width,
      height: trackSettings.height,
      framerate: trackSettings.frameRate,
      // latencyMode: 'realtime',
      latencyMode: 'quality',
      avc: {
        format: 'annexb'
      }
    }
    console.warn('dump frameRate: ', trackSettings.frameRate)
    encoder = new VideoEncoder({
      output: (chunk, data) => {
        handleChunk(chunk, data)
      },
      error: (error) => {
        handleError(error)
      }
    })
    encoder.configure(config)
    frameReader.read().then(async function processFrame({ done, value }) {
      let frame = value

      if (done) {
        await encoder.flush()
        encoder.close()
        return
      }

      if (encoder.encodeQueueSize <= 30) {
        if (++frameCounter % 20 == 0) {
          console.log(frameCounter + ' frames processed')
        }

        const insert_keyframe = frameCounter % 150 == 0
        encoder.encode(frame, { keyFrame: insert_keyframe })
      } else {
        console.log('dropping frame, encoder falling behind')
      }

      frame.close()
      frameReader.read().then(processFrame)
    })
  }

  async function stopDump() {
    console.warn(`stop Dump`)
    await encoder.flush()
    encoder.close()
    console.warn('buffer: ', dumpParams.dumpBuffer)
    if (dumpParams.dumpBuffer.length) {
      const blob = new Blob(dumpParams.dumpBuffer, { type: 'application/file' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `zrtc.${dumpParams.dumpMediaType}.${Math.ceil(
        (dumpParams.dumpEndAt - dumpParams.dumpStartAt) / 1000
      )}s.k${dumpParams.dumpKey}d${dumpParams.dumpDelta}.h264`
      link.click()
    }
  }

  function handleChunk(chunk, metadata) {
    console.warn('metadata: ', metadata)
    // console.warn('dsp: ', metadata.decoderConfig.description)
    let data = new Uint8Array(chunk.byteLength)
    chunk.copyTo(data)
    console.error('chunk: ', chunk)
    if (chunk.type === 'key') {
      dumpParams.dumpKey++
    } else if (chunk.type === 'delta') {
      dumpParams.dumpDelta++
    }
    let buffer = data.buffer.slice(0)
    console.error('buffer: ', data.buffer)
    dumpParams.dumpBuffer.push(buffer)
  }
}
