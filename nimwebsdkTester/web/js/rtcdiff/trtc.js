function startTRTC() {
  console.warn('开启 TRTC')
  const localStoragePrefix = 'TRTC-'
  let userId, roomId
  window.trtc = {
    client: null,
    localStream: null,
    shareStream: null,
    remoteStreams: []
  }
  let contentHint
  let videoProfile = {}
  // let audioProfile={}
  let screenProfile = {}
  let options = {},
    shareOptions = {}

  let audioProfileMap = new Map([
    ['speech_low_quality', 'standard'],
    ['speech_standard', 'standard'],
    ['music_standard', 'standard'],
    ['standard_stereo', 'standard-stereo'],
    ['high_quality', 'high'],
    ['high_quality_stereo', 'high-stereo']
  ])
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

  let dumpParams = {
    dumpMediaType: '',
    DUMP_SIZE_MAX: 10000000,
    dumpStartAt: 0,
    dumpEndAt: 0,
    dumpKey: 0,
    dumpDelta: 0,
    dumpBuffer: []
  }

  loadEnv()
  initClient()
  initDevices()
  TRTC.Logger.setLogLevel(TRTC.Logger.LogLevel.DEBUG)

  function loadEnv() {
    roomId = window.localStorage
      ? window.localStorage.getItem(`${localStoragePrefix}channelName`)
      : ''
    $('#channelName').val(roomId)
    userId = '' + Math.floor(Math.random() * 9000 + 1000)
    $('#uid').val(userId)
  }

  function initClient() {
    const config = genTestUserSig(userId)
    try {
      trtc.client = TRTC.createClient({
        mode: 'rtc',
        sdkAppId: config.sdkAppId,
        userId: userId,
        userSig: config.userSig
        // useStringRoomId: true
      })
      console.log('init client success')
    } catch (e) {
      console.error('init client failed', e)
    }

    installEventHandlers()
  }

  async function joinRoom() {
    roomId = parseInt(document.querySelector('#channelName').value)
    if (window.localStorage) {
      window.localStorage.setItem(`${localStoragePrefix}channelName`, roomId)
    }
    try {
      await trtc.client.join({
        roomId: roomId
      })
      console.warn('加入房间成功')
    } catch (error) {
      console.error('加入房间失败', error)
    }

    try {
      await initLocalStream()
    } catch (error) {
      console.error('init LocalStream failed', error)
    }
    try {
      await publishStream()
    } catch (error) {
      console.error('publish failed', error)
    }
  }

  async function leaveRoom() {
    await unpublishStream()
    try {
      await trtc.client.leave()
      console.log('Leave room success')
      if (trtc.localStream) {
        trtc.localStream.stop()
        trtc.localStream.close()
        trtc.localStream = null
      }
      if (trtc.shareStream) {
        trtc.shareStream.stop()
        trtc.shareStream.close()
        trtc.shareStream = null
      }
    } catch (error) {
      console.error('leave failed', error)
    }
  }

  function initVideoProfiles() {
    let videoWidth, videoHeight, videoFrameRate, videoBitrate, mediaType
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
      videoBitrate = 900
    }

    videoProfile = {
      width: videoWidth,
      height: videoHeight,
      frameRate: videoFrameRate,
      bitrate: videoBitrate
    }
    if (document.getElementById('enableContentHint').checked && $('#contentHint').val()) {
      contentHint = $('#contentHint').val()
      console.log('videoContentHint: ', contentHint)
    }
  }
  function initScreenProfiles() {
    let screenWidth, screenHeight, screenFrameRate, screenBitrate, mediaType
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

    screenProfile = {
      width: screenWidth,
      height: screenHeight,
      frameRate: screenFrameRate,
      bitrate: screenBitrate
    }
  }

  function initOptions() {
    options = {
      userId: userId
    }
    shareOptions = {
      userId: userId
    }
    if ($('#cameraFacingMode').val()) {
      options.facingMode = $('#cameraFacingMode').val()
    }
    if ($('#micro').val()) {
      options.microphoneId = $('#micro').val()
    }
    if ($('#camera').val()) {
      options.cameraId = $('#camera').val()
    }

    let audioSource, videoSource
    const enableAudio = $('input[name="enableAudio"]:checked').val()
    // audio = !!enableAudio
    if (enableAudio === 'source') {
      audioSource =
        audioSource && audioSource.readyState === 'live'
          ? trtc.audioSource
          : getAudioSource('audio')
      audioSource.enabled = true
      options.audioSource = audioSource
    } else if (enableAudio === 'yes') {
      options.audio = true
      audioSource = null
    } else {
      options.audio = false
      audioSource = null
    }

    const enableVideo = $('input[name="enableVideo"]:checked').val()
    // video = !!enableVideo
    videoSource
    if (enableVideo === 'source') {
      videoSource =
        videoSource && videoSource.readyState === 'live' ? videoSource : getVideoSource('video')
      videoSource.enabled = true
      options.videoSource = videoSource
    } else if (enableVideo === 'yes') {
      options.video = true
      videoSource = null
    } else {
      options.video = false
      videoSource = null
    }

    const enableScreen = $('input[name="enableScreen"]:checked').val()

    if (enableScreen === 'source') {
      console.warn('TRTC 暂不支持自定义辅流视频')
    } else if (enableScreen === 'yes') {
      shareOptions.screen = true
    } else {
      shareOptions.screen = false
    }

    const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val()

    if (enableScreenAudio === 'source') {
      console.warn('TRTC 暂不支持自定义辅流音频')
    } else if (enableScreenAudio === 'yes') {
      shareOptions.screenAudio = true
    } else {
      shareOptions.screenAudio = false
    }
  }

  async function initLocalStream() {
    initOptions()
    initVideoProfiles()
    initScreenProfiles()

    try {
      // 主流
      if (options.audio || options.video) {
        // console.error('stream options is : ', options)
        trtc.localStream = TRTC.createStream(options)

        // TODO
        options.video && trtc.localStream.setVideoProfile(videoProfile)
        console.warn('设置的 videoProfile: ', videoProfile)
      }

      // 辅流
      if (shareOptions.screen) {
        console.warn('stream options is : ', shareOptions)
        trtc.shareStream = TRTC.createStream(shareOptions)
        // 屏幕分享流监听屏幕分享停止事件
        trtc.shareStream.on('screen-sharing-stopped', async (event) => {
          // 取消推流
          await trtc.client.unpublish(trtc.shareStream)
          // 停止采集屏幕分享
          trtc.shareStream.close()
        })
        trtc.shareStream.setScreenProfile(screenProfile)
        console.warn('设置的 screenProfile: ', screenProfile)
      }
    } catch (error) {
      console.error('创建本地流失败', error)
    }
    // TRTC 的 setAudioProfile 需要在 initialize 之前调用
    if ($('#sessionConfigAudioProfile').val() && options.audio) {
      trtc.localStream.setAudioProfile(audioProfileMap.get($('#sessionConfigAudioProfile').val()))
      console.warn(
        '设置的 audioProfile: ',
        audioProfileMap.get($('#sessionConfigAudioProfile').val())
      )
    } else {
      trtc.localStream && trtc.localStream.setAudioProfile('standard')
      console.warn('设置的 audioProfile: standard')
    }
    if (trtc.localStream) {
      await trtc.localStream.initialize()
      console.warn('初始化本地流成功')
      contentHint && trtc.localStream.setVideoContentHint(contentHint)
      console.warn('设置 videoContentHint', contentHint)
      await trtc.localStream.play('localVideoContent')
    }
    if (trtc.shareStream) {
      await trtc.shareStream.initialize()
      console.warn('初始化辅流成功')
      await trtc.shareStream.play('localScreenContent')
    }
  }
  async function publishStream() {
    if (!trtc.localStream && !trtc.shareStream) {
      return
    }
    try {
      if (trtc.localStream) {
        await trtc.client.publish(trtc.localStream)
        console.log('LocalStream is published successfully')
      }
      if (trtc.shareStream) {
        await trtc.client.publish(trtc.shareStream, { isAuxiliary: true })
        console.log('ShareStream is published successfully')
      }
    } catch (error) {
      console.log('publish failed', error)
    }
  }

  async function unpublishStream() {
    try {
      if (trtc.localStream) {
        await trtc.client.unpublish(trtc.localStream)
        console.log('Unpublish localStream success')
      }
      if (trtc.shareStream) {
        await trtc.client.unpublish(trtc.shareStream)
        console.log('Unpublish shareStream success')
      }
    } catch (error) {
      console.error('unpublish failed', error)
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

  function installEventHandlers() {
    trtc.client.on('error', handleError.bind(this))
    trtc.client.on('client-banned', handleBanned.bind(this))
    trtc.client.on('peer-join', handlePeerJoin.bind(this))
    trtc.client.on('peer-leave', handlePeerLeave.bind(this))
    trtc.client.on('stream-added', handleStreamAdded.bind(this))
    trtc.client.on('stream-subscribed', handleStreamSubscribed.bind(this))
    trtc.client.on('stream-removed', handleStreamRemoved.bind(this))
    trtc.client.on('stream-updated', handleStreamUpdated.bind(this))
    trtc.client.on('connection-state-changed', handleConnection.bind(this))
    trtc.client.on('mute-video', handleMuteVideo.bind(this))
    trtc.client.on('mute-audio', handleMuteAudio.bind(this))
    trtc.client.on('unmute-video', handleUnmuteVideo.bind(this))
    trtc.client.on('unmute-audio', handleUnmuteAudio.bind(this))
  }

  function handleMuteVideo(event) {
    console.log(`[${event.userId}] mute video`)
  }

  function handleMuteAudio(event) {
    console.log(`[${event.userId}] mute audio`)
  }

  function handleUnmuteVideo(event) {
    console.log(`[${event.userId}] unmute video`)
  }

  function handleUnmuteAudio(event) {
    console.log(`[${event.userId}] unmute audio`)
  }

  function handleError(error) {
    console.error('client error', error)
    console.error(`RTCError: ${error.message_}`)
  }

  function handleBanned(event) {
    console.warn(`client has been banned for ${event.reason}`)
    console.warn('您已被踢出房间')
    console.error(`Client has been banned for${event.reason}`)
  }

  function handlePeerJoin(event) {
    const { userId } = event
    console.log(`peer-join ${userId}`)
    if (userId !== 'local-screen') {
      console.log(`Peer Client [${userId}] joined`)
    }
  }

  function handlePeerLeave(event) {
    const { userId } = event
    console.log(`peer-leave ${userId}`)
    if (userId !== 'local-screen') {
      console.log(`[${userId}] leave`)
    }
  }

  async function handleStreamAdded(event) {
    const remoteStream = event.stream
    const id = remoteStream.getId()
    const userId = remoteStream.getUserId()

    console.log(`remote stream added: [${userId}] ID: ${id} type: ${remoteStream.getType()}`)
    trtc.client.subscribe(remoteStream).catch((error) => {
      console.error(`Subscribe [${userId}] failed, ${error}`)
    })
    console.log(`RemoteStream added: [${userId}]`)
  }

  async function handleStreamSubscribed(event) {
    const remoteStream = event.stream
    const id = remoteStream.getId()
    const userId = remoteStream.getUserId()
    let streamType = remoteStream.getType()
    console.log(`remote stream subscribed: [${userId}] ID: ${id} type: ${streamType}`)
    // TODO: TRTC 同时播放主辅流，辅流会无法播放，问题原因待查
    if (streamType === 'main') {
      await remoteStream.play('remoteVideoContent')
      console.log(`play remote stream success: [${userId}] ID: ${id} type: ${streamType}`)
    } else if (streamType === 'auxiliary') {
      await remoteStream.play('remoteScreenContent')
      console.log(`play remote stream success: [${userId}] ID: ${id} type: ${streamType}`)
    }

    trtc.remoteStreams.push(remoteStream)
    remoteStream.on('player-state-changed', (event) => {
      // TODO: handle remote stream player state changed
    })
    console.log('stream-subscribed ID: ', id)
  }

  function handleStreamRemoved(event) {
    const remoteStream = event.stream
    const id = remoteStream.getId()
    const userId = remoteStream.getUserId()
    const remoteId = `remote-${id}`
    remoteStream.stop()
    console.log(`remote stream removed:${userId}`)
    if (remoteStream.getUserId() !== `share_${userId}`) {
      console.log(`RemoteStream removed: [${userId}]`)
    }
    trtc.remoteStreams = trtc.remoteStreams.filter((stream) => stream.getId() !== id)

    console.log(`stream-removed ID: ${id}  type: ${remoteStream.getType()}`)
  }

  function handleStreamUpdated(event) {
    const remoteStream = event.stream
    const userId = remoteStream.getUserId()

    console.log(
      `RemoteStream updated: [${userId}] audio:${remoteStream.hasAudio()} video:${remoteStream.hasVideo()}`
    )
    console.log(
      `type: ${remoteStream.getType()} stream-updated hasAudio:${remoteStream.hasAudio()} hasVideo:${remoteStream.hasVideo()}`
    )
  }

  function handleConnection(event) {
    console.log(`connection state changed: ${event.state}`)
  }

  // 音视频设备初始化
  function initDevices() {
    TRTC.getMicrophones().then((data) => {
      var info = JSON.stringify(data)
      console.log('麦克风: %o', info)
      renderDevice($('#micro'), data)
    })
    TRTC.getCameras().then((data) => {
      var info = JSON.stringify(data)
      console.log('摄像头: %o', info)
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
        if (childNode.value === devices[i].deviceId) {
          isNewDevice = false
          childNode.innerText = devices[i].label
          childNode.disabled = false
        }
      }
      if (isNewDevice) {
        const elem = document.createElement('option')
        elem.value = devices[i].deviceId
        elem.innerText = devices[i].label
        node.appendChild(elem)
      }
    }
  }

  // 切换mic
  $('#micro').on('change', () => {
    const microphoneId = $('#micro').val()
    console.warn('切换mic: ', microphoneId)
    trtc.localStream &&
      trtc.localStream
        .switchDevice('audio', microphoneId)
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
    trtc.localStream &&
      trtc.localStream
        .switchDevice('video', cameraId)
        .then(() => {
          console.warn('切换camera成功')
        })
        .catch((err) => {
          console.warn('切换camera失败： ', err)
        })
  })

  // 设备相关
  // 注: TRTC 没有 stream.open() 接口，设备相关的开关功能只能通过 addTrack/removeTrack 实现

  // 音频
  $('#playMicroSource').on('click', async () => {
    console.warn('打开自定义音频')
    if (!trtc.localStream) {
      return
    }
    const audioSource = getAudioSource('audio')
    await trtc.localStream.addTrack(audioSource)
  })
  $('#playMicro').on('click', async () => {
    console.warn('打开麦克风')
    let microphoneId, audioProfile
    if ($('#micro').val()) {
      microphoneId = $('#micro').val()
    }
    let audioStream = TRTC.createStream({
      userId,
      audio: true,
      video: false,
      microphoneId
    })
    if ($('#sessionConfigAudioProfile').val()) {
      audioProfile = audioProfileMap.get($('#sessionConfigAudioProfile').val())
    }
    audioStream.setAudioProfile(audioProfile)
    console.warn('开启音频时，设置 audioProfile: ', audioProfile)
    await audioStream.initialize()

    if (trtc.localStream) {
      await trtc.localStream.addTrack(audioStream.getAudioTrack())
    } else {
      // 辅流入会，再开音频
      trtc.localStream = audioStream
      await trtc.client.publish(trtc.localStream)
    }
  })
  $('#playMicroOff').on('click', async () => {
    console.warn('关闭麦克风')
    if (!trtc.localStream) {
      return
    }
    const audioTrack = trtc.localStream.getAudioTrack()
    if (audioTrack) {
      await trtc.localStream.removeTrack(audioTrack)
      audioTrack.stop()
    }
  })

  // 视频
  $('#playCameraSource').on('click', async () => {
    console.warn('打开自定义视频')
    if (!trtc.localStream) {
      return
    }
    const videoSource = getVideoSource('video')
    await trtc.localStream.addTrack(videoSource)
  })
  $('#playCamera').on('click', async (event) => {
    console.log('event: ', event)
    console.log($(this).data('events'))
    console.warn('打开摄像头')
    let cameraId, facingMode
    if ($('#camera').val()) {
      cameraId = $('#camera').val()
    }
    if ($('#cameraFacingMode').val()) {
      facingMode = $('#cameraFacingMode').val()
    }

    const videoStream = TRTC.createStream({
      userId,
      audio: false,
      video: true,
      cameraId,
      facingMode
    })
    await videoStream.initialize()
    contentHint && videoStream.setVideoContentHint(contentHint)
    console.warn('开启视频时，设置 videoContentHint', contentHint)

    if (trtc.localStream) {
      trtc.localStream.setVideoProfile(videoProfile)
      console.warn('开启视频时，设置 videoProfile', videoProfile)
      await trtc.localStream.play('localVideoContent')
      await trtc.localStream.addTrack(videoStream.getVideoTrack())
    } else {
      // 辅流入会，再开视频
      trtc.localStream = videoStream
      trtc.localStream.setVideoProfile(videoProfile)
      console.warn('开启视频时，设置 videoProfile', videoProfile)
      await trtc.localStream.play('localVideoContent')
      await trtc.client.publish(trtc.localStream)
    }
  })
  $('#playCameraOff').on('click', async () => {
    console.warn('关闭摄像头')
    if (!trtc.localStream) {
      return
    }
    const videoTrack = trtc.localStream.getVideoTrack()
    if (videoTrack) {
      await trtc.localStream.removeTrack(videoTrack)
      videoTrack.stop()
    }
  })

  // 辅流
  $('#playScreenSource').on('click', async () => {
    console.warn('TRTC 不支持自定义辅流')
    // if (!trtc.shareStream) {
    //   return
    // }
    // const screenSource = getVideoSource('screen')
    // await trtc.shareStream.addTrack(screenSource)
  })
  $('#playScreen').on('click', async () => {
    console.warn('打开屏幕分享')

    const screenStream = TRTC.createStream({ userId, screen: true })
    if (!trtc.shareStream) {
      trtc.shareStream = screenStream
    }
    await trtc.shareStream.initialize()
    trtc.shareStream.setScreenProfile(screenProfile)
    console.warn('开启辅流时，设置 screenProfile', screenProfile)
    await trtc.shareStream.play('localScreenContent')
    await trtc.client.publish(trtc.shareStream, { isAuxiliary: true })
  })
  $('#playScreenOff').on('click', async () => {
    console.warn('关闭屏幕分享')
    if (!trtc.shareStream) {
      return
    }
    await trtc.client.unpublish(trtc.shareStream)
    trtc.shareStream.close()
  })
  // 辅流音频
  $('#playScreenAudioSource').on('click', async () => {
    console.warn('TRTC 不支持自定义辅流音频')
  })
  $('#playScreenAudio').on('click', async () => {
    console.warn('打开辅流音频')

    const screenAudioStream = TRTC.createStream({
      userId,
      screen: true,
      screenAudio: true
    })
    if (!trtc.shareStream) {
      trtc.shareStream = screenAudioStream
    }
    await trtc.shareStream.initialize()
    trtc.shareStream.setScreenProfile(screenProfile)
    console.warn('开启辅流音频时，设置 screenProfile', screenProfile)
    await trtc.shareStream.play('localScreenContent')
    await trtc.client.publish(trtc.shareStream, { isAuxiliary: true })
  })
  $('#playScreenAudioOff').on('click', async () => {
    console.warn('关闭辅流音频')
    if (!trtc.shareStream) {
      return
    }
    await trtc.client.unpublish(trtc.shareStream)
    trtc.shareStream.close()
  })

  $('#remoteFullVideo').on('click', async () => {
    if ($('#sdkSet').val() === 'TRTC') {
      if ($('#endSet').val() === 'remote') {
        // 腾讯远端主流全屏
        let dom = document.querySelector('#remoteVideoContent').children[0]
        await dom.requestFullscreen()
      } else if ($('#endSet').val() === 'local') {
        // 腾讯本地流全屏
        let dom = document.querySelector('#localVideoContent').children[0]
        await dom.requestFullscreen()
      }
    }
  })

  $('#remoteFullScreen').on('click', async () => {
    if ($('#sdkSet').val() === 'TRTC') {
      if ($('#endSet').val() === 'remote') {
        // 腾讯远端辅流全屏
        let dom = document.querySelector('#remoteScreenContent').children[0]
        await dom.requestFullscreen()
      } else if ($('#endSet').val() === 'local') {
        // 腾讯本地辅流全屏
        let dom = document.querySelector('#localScreenContent').children[0]
        await dom.requestFullscreen()
      }
    }
  })

  // 腾讯退出全屏状态
  $('#exitFullScreen').on('click', async () => {
    await document.requestFullscreen()
  })

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

  /**
   * ----------------------------------------
   *              videoDump 逻辑
   * ----------------------------------------
   */

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
      dumpTrack = trtc.localStream.mediaStream_.getVideoTracks()[0]
      dumpParams.dumpMediaType = 'localVideo'
    } else if (option === 2) {
      dumpTrack = trtc.shareStream.mediaStream_.getVideoTracks()[0]
      dumpParams.dumpMediaType = 'localScreen'
    } else if (option === 3) {
      dumpTrack = remoteStreams
        .find((item) => item.type_ === 'main')
        .mediaStream_.getVideoTracks()[0]
      dumpParams.dumpMediaType = 'remoteVideo'
    } else if (option === 4) {
      dumpTrack = remoteStreams
        .find((item) => item.type_ === 'auxiliary')
        .mediaStream_.getVideoTracks()[0]
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
      link.download = `nertc.${dumpParams.dumpMediaType}.${Math.ceil(
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
