function startTRTCNew() {
  console.warn('开启 TRTC_NEW')
  const localStoragePrefix = 'TRTC-NEW-'
  let userId, roomId, remoteUserId
  window.te = {
    trtc: null
  }
  let contentHint
  let videoProfile = {}
  let audioProfile = {}
  let screenProfile = {}
  let options = {},
    shareOptions = {}
  let systemAudio = false

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
  init()
  initDevices()
  TRTC.setLogLevel(1)

  function loadEnv() {
    roomId = window.localStorage
      ? window.localStorage.getItem(`${localStoragePrefix}channelName`)
      : ''
    $('#channelName').val(roomId)
    userId = '' + Math.floor(Math.random() * 9000 + 1000)
    $('#uid').val(userId)
  }

  function init() {
    te.trtc = TRTC.create()
    installEventHandlers()
  }

  async function joinRoom() {
    roomId = parseInt(document.querySelector('#channelName').value)
    if (window.localStorage) {
      window.localStorage.setItem(`${localStoragePrefix}channelName`, roomId)
    }
    const config = genTestUserSig(userId)

    try {
      await te.trtc.enterRoom({
        scene: 'rtc',
        roomId: roomId,
        sdkAppId: config.sdkAppId,
        userId: userId,
        userSig: config.userSig
      })
      console.warn('进房成功')
    } catch (err) {
      console.error('进房失败 ', err)
    }
    initProfiles()

    // 上麦后开启mic
    if (!!$('input[name="enableAudio"]:checked').val()) {
      console.warn('上麦后开启mic')
      await te.trtc.startLocalAudio(audioProfile)
    }
    // 上麦后开启camera
    if (!!$('input[name="enableVideo"]:checked').val()) {
      console.warn('上麦后开启camera')
      await te.trtc.startLocalVideo(videoProfile)
    }
    // 上麦后开启screen
    if ($('input[name="enableScreen"]:checked').val() === 'yes') {
      console.warn('上麦后开启screen')
      await te.trtc.startScreenShare(screenProfile)
    }
  }

  async function leaveRoom() {
    await te.trtc.exitRoom()
  }

  function initProfiles() {
    initLocalAudioProfile()
    initLocalVideoProfile()
    initLocalScreenProfiles()
  }

  async function initLocalAudioProfile() {
    let microphoneId, audioSource
    if ($('#micro').val()) {
      microphoneId = $('#micro').val()
    }

    const enableAudio = $('input[name="enableAudio"]:checked').val()
    // audio = !!enableAudio
    if (enableAudio === 'source') {
      audioSource =
        audioSource && audioSource.readyState === 'live'
          ? trtc.audioSource
          : getAudioSource('audio')
      audioSource.enabled = true
      audioTrack = audioSource

      audioProfile = {
        option: {
          microphoneId,
          profile: audioProfileMap.get($('#sessionConfigAudioProfile').val()),
          audioTrack
        }
      }
    } else {
      audioProfile = {
        option: {
          microphoneId,
          profile: audioProfileMap.get($('#sessionConfigAudioProfile').val())
        }
      }
    }
  }

  async function initLocalVideoProfile() {
    let videoWidth,
      videoHeight,
      videoFrameRate,
      videoBitrate,
      mediaType,
      qosPreference,
      useFrontCamera,
      cameraId
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

    if (document.getElementById('enableContentHint').checked && $('#contentHint').val()) {
      contentHint = $('#contentHint').val()
      console.warn('videoContentHint: ', contentHint)
      if (contentHint === 'motion') {
        qosPreference = 'smooth'
      } else {
        qosPreference = 'clear'
      }
    }
    if ($('#cameraFacingMode').val()) {
      if ($('#cameraFacingMode').val() === 'user') {
        useFrontCamera = true
      } else {
        useFrontCamera = false
      }
    }
    if ($('#camera').val()) {
      cameraId = $('#camera').val()
    }

    if ($('input[name="enableVideo"]:checked').val() === 'source') {
      videoProfile = {
        view: document.getElementById('localVideoContent'),
        option: {
          videoTrack: getVideoSource('video'),
          profile: {
            width: videoWidth,
            height: videoHeight,
            frameRate: videoFrameRate,
            bitrate: videoBitrate
          },
          qosPreference,
          useFrontCamera,
          cameraId
        }
      }
    } else {
      videoProfile = {
        view: document.getElementById('localVideoContent'),
        option: {
          profile: {
            width: videoWidth,
            height: videoHeight,
            frameRate: videoFrameRate,
            bitrate: videoBitrate
          },
          qosPreference,
          useFrontCamera,
          cameraId
        }
      }
    }
  }
  function initLocalScreenProfiles() {
    let screenWidth, screenHeight, screenFrameRate, screenBitrate, mediaType, qosPreference
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

    if (document.getElementById('enableContentHint').checked && $('#contentHint').val()) {
      contentHint = $('#contentHint').val()
      console.warn('videoContentHint: ', contentHint)
      if (contentHint === 'motion') {
        qosPreference = 'smooth'
      } else {
        qosPreference = 'clear'
      }
    }

    if ($('input[name="enableScreenAudio"]:checked').val() === 'yes') {
      systemAudio = true
    }

    screenProfile = {
      view: document.getElementById('localScreenContent'),
      option: {
        systemAudio,
        profile: {
          width: screenWidth,
          height: screenHeight,
          frameRate: screenFrameRate,
          bitrate: screenBitrate
        },
        qosPreference
      }
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
    te.trtc.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
      // 为了播放视频画面，您需在 DOM 中放置一个 HTMLElement，可以是一个 div 标签，假设其 id 为 `${userId}_${streamType}`
      console.warn('远端视频可用', userId, streamType)
      remoteUserId = userId
      if (streamType === 'main') {
        te.trtc.startRemoteVideo({
          userId,
          streamType,
          view: document.getElementById('remoteVideoContent')
        })
      } else if (streamType === 'sub') {
        te.trtc.startRemoteVideo({
          userId,
          streamType,
          view: document.getElementById('remoteScreenContent')
        })
      }
    })
  }

  // 音视频设备初始化
  function initDevices() {
    TRTC.getMicrophoneList().then((data) => {
      var info = JSON.stringify(data)
      console.warn('麦克风: %o', info)
      renderDevice($('#micro'), data)
    })
    TRTC.getCameraList().then((data) => {
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

  // // 切换mic
  $('#micro').on('change', async () => {
    const microphoneId = $('#micro').val()
    console.warn('切换mic: ', microphoneId)
    await te.trtc.updateLocalAudio({ option: { microphoneId } })
  })

  // // 切换camera
  $('#camera').on('change', async () => {
    const cameraId = $('#camera').val()
    console.warn('切换camera: ', cameraId)
    await te.trtc.updateLocalVideo({ option: { cameraId } })
  })

  // 设备相关
  // 音频
  $('#playMicroSource').on('click', async () => {
    console.warn('打开自定义音频')
    initLocalAudioProfile()
    audioProfile.option.audioTrack = getAudioSource('audio')
    await te.trtc.startLocalAudio(audioProfile)
  })
  $('#playMicro').on('click', async () => {
    console.warn('打开麦克风')
    initLocalAudioProfile()
    await te.trtc.startLocalAudio(audioProfile)
  })
  $('#playMicroOff').on('click', async () => {
    console.warn('关闭麦克风')

    await te.trtc.stopLocalAudio()
  })

  // 视频
  $('#playCameraSource').on('click', async () => {
    console.warn('打开自定义视频')
    initLocalVideoProfile()
    videoProfile.option.videoTrack = getVideoSource('video')
    await te.trtc.startLocalVideo(videoProfile)
  })
  $('#playCamera').on('click', async (event) => {
    console.warn('event: ', event)
    console.warn($(this).data('events'))
    console.warn('打开摄像头')
    initLocalVideoProfile()
    await te.trtc.startLocalVideo(videoProfile)
  })
  $('#playCameraOff').on('click', async () => {
    console.warn('关闭摄像头')
    await te.trtc.stopLocalVideo()
  })

  // 辅流
  $('#playScreenSource').on('click', async () => {
    console.warn('TRTC_NEW 不支持自定义辅流')
  })
  $('#playScreen').on('click', async () => {
    console.warn('打开屏幕分享')
    initLocalScreenProfiles()
    await te.trtc.startScreenShare(screenProfile)
  })
  $('#playScreenOff').on('click', async () => {
    console.warn('关闭屏幕分享')
    await te.trtc.stopScreenShare()
  })
  // 辅流音频
  $('#playScreenAudioSource').on('click', async () => {
    console.warn('TRTC_NEW 不支持自定义辅流音频')
  })
  $('#playScreenAudio').on('click', async () => {
    console.warn('打开辅流音频')
    initLocalScreenProfiles()
    await te.trtc.startScreenShare(screenProfile)
  })
  $('#playScreenAudioOff').on('click', async () => {
    console.warn('关闭辅流音频')
    await te.trtc.stopScreenShare()
  })

  $('#remoteFullVideo').on('click', async () => {
    if ($('#sdkSet').val() === 'TRTC_NEW') {
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
    if ($('#sdkSet').val() === 'TRTC_NEW') {
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
      console.warn('自定义音频配置', mediaType, defaultStr, audioConstraint)
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
      console.warn('自定义音频配置', mediaType, defaultStr, audioConstraint)
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
    // TODO: 暂时不能dump远端流
    let frameCounter = 0
    let dumpTrack
    if (option === 1) {
      dumpTrack = te.trtc.getVideoTrack()
      dumpParams.dumpMediaType = 'localVideo'
    } else if (option === 2) {
      dumpTrack = te.trtc.getVideoTrack({ streamType: 'sub' })
      dumpParams.dumpMediaType = 'localScreen'
    } else if (option === 3) {
      dumpTrack = te.trtc.getVideoTrack({ userId: remoteUserId, streamType: 'main' })
      dumpParams.dumpMediaType = 'remoteVideo'
    } else if (option === 4) {
      dumpTrack = te.trtc.getVideoTrack({ userId: remoteUserId, streamType: 'sub' })
      dumpParams.dumpMediaType = 'remoteScreen'
    }
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
          console.warn(frameCounter + ' frames processed')
        }

        const insert_keyframe = frameCounter % 150 == 0
        encoder.encode(frame, { keyFrame: insert_keyframe })
      } else {
        console.warn('dropping frame, encoder falling behind')
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
