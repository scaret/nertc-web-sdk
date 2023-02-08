document.getElementById('AGORA').onclick = function () {
  console.warn('开启 AGORA')
  document.getElementById('AGORA').style.backgroundColor = '#0d66ff'
  document.getElementById('NERTC').style.backgroundColor = '#efefef'
  startAGORA()
}

function startAGORA() {
  let appId = '0c0b4b61adf94de1befd7cdd78a50444'
  let channelName // '您指定的房间号'
  let uid // '您指定的用户ID'
  let suid
  let token = null
  let dumpKey = 0
  let dumpDelta = 0
  let dumpBuffer = []
  let enableDump
  let isScreenJoined = false
  let rtc = {
    client: null
  }
  let localTracks = {
    audioTrack: null,
    videoTrack: null
  }
  let localScreenTracks = {
    screenVideoTrack: null,
    screenAudioTrack: null
  }
  const localStoragePrefix = 'AGORA-'
  function loadEnv() {
    const channelName = window.localStorage
      ? window.localStorage.getItem(`${localStoragePrefix}channelName`)
      : ''
    $('#channelName').val(channelName)
    domUid = '' + Math.floor(Math.random() * 9000 + 1000)
    $('#uid').val(domUid)
  }
  const resolutionMap = new Map([
    ['VIDEO_QUALITY_480p', ['480p', 640, 480]],
    ['VIDEO_QUALITY_180p', ['180p', 320, 180]],
    ['VIDEO_QUALITY_720p', ['720p', 1280, 720]],
    ['VIDEO_QUALITY_1080p', ['1080p', 1920, 1080]]
  ])
  const frameRateMap = new Map([
    ['CHAT_VIDEO_FRAME_RATE_5', 5],
    ['CHAT_VIDEO_FRAME_RATE_10', 10],
    ['CHAT_VIDEO_FRAME_RATE_15', 15],
    ['CHAT_VIDEO_FRAME_RATE_20', 20],
    ['CHAT_VIDEO_FRAME_RATE_25', 25],
    ['CHAT_VIDEO_FRAME_RATE_30', 30],
    ['CHAT_VIDEO_FRAME_RATE_NORMAL', 15]
  ])
  initClient()
  let microphoneId, cameraId, facingMode
  if ($('#micro').val()) {
    microphoneId = $('#micro').val()
  }
  if ($('#camera').val()) {
    cameraId = $('#camera').val()
  }
  if ($('#cameraFacingMode').val()) {
    facingMode = $('#cameraFacingMode').val()
  }
  // const audioProfile = $('#sessionConfigAudioProfile').val();
  // const audioProcessingConfig = getAudioProcessingConfig();

  document.getElementById('startCall').onclick = async function () {
    document.getElementById('startCall').style.backgroundColor = '#0d66ff'
    await startBasicCall()
  }
  document.getElementById('finishCall').onclick = async function () {
    document.getElementById('startCall').style.backgroundColor = '#efefef'
    await leave()
  }

  async function startBasicCall() {
    channelName = document.querySelector('#channelName').value
    if (window.localStorage) {
      window.localStorage.setItem(`${localStoragePrefix}channelName`, channelName)
    }
    uid = parseInt(document.querySelector('#uid').value)
    suid = uid + 1
    // Create an AgoraRTCClient object.
    // rtc.client = AgoraRTC.createClient({mode: "rtc", codec: "vp8"});

    // Listen for the "user-published" event, from which you can get an AgoraRTCRemoteUser object.
    rtc.client.on('user-published', async (user, mediaType) => {
      // Subscribe to the remote user when the SDK triggers the "user-published" event
      if (user.uid === uid || user.uid === suid) {
        return
      }
      await rtc.client.subscribe(user, mediaType)
      console.log('subscribe success')

      // If the remote user publishes a video track.
      if (mediaType === 'video') {
        const remoteVideoTrack = user.videoTrack
        remoteVideoTrack.play(remoteVideoContent)
      }
      // If the remote user publishes an audio track.
      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack
        remoteAudioTrack.play()
      }
    })

    await joinChannel()
  }

  async function joinChannel() {
    const enableAudio = $('input[name="enableAudio"]:checked').val()
    const audio = !!enableAudio
    const enableVideo = $('input[name="enableVideo"]:checked').val()
    const video = !!enableVideo
    const enableScreen = $('input[name="enableScreen"]:checked').val()
    const screen = !!enableScreen
    const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val()
    const screenAudio = !!enableScreenAudio

    if (audio || video) {
      await rtc.client.join(appId, channelName, token, uid)
    }
    if (screen || screenAudio) {
      await rtc.clientScreen.join(appId, channelName, token, suid)
      isScreenJoined = true
    }
    // Create a local audio track from the audio sampled by a microphone.
    if (audio) {
      localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId,
        AEC: getAudioProcessingConfig() && getAudioProcessingConfig().AEC,
        ANS: getAudioProcessingConfig() && getAudioProcessingConfig().ANS,
        AGC: getAudioProcessingConfig() && getAudioProcessingConfig().AGC,
        encoderConfig: $('#sessionConfigAudioProfile').val() || 'speech_low_quality'
      })
    }

    // Create a local video track from the video captured by a camera.
    let width, height, frameRate, sWidth, sHeight, sFrameRate
    if ($('#sessionConfigVideoQuality').val()) {
      width = resolutionMap.get($('#sessionConfigVideoQuality').val())[1]
      height = resolutionMap.get($('#sessionConfigVideoQuality').val())[2]
    }
    if ($('#sessionConfigVideoFrameRate').val()) {
      frameRate = frameRateMap.get($('#sessionConfigVideoFrameRate').val())
    }
    if ($('#sessionConfigScreenProfile').val()) {
      sWidth = resolutionMap.get($('#sessionConfigScreenProfile').val())[1]
      sHeight = resolutionMap.get($('#sessionConfigScreenProfile').val())[2]
    }
    if ($('#sessionConfigScreenFrameRate').val()) {
      sFrameRate = frameRateMap.get($('#sessionConfigScreenFrameRate').val())
    }
    if (video) {
      const options = {
        cameraId: $('#camera').val(),
        encoderConfig: {
          width,
          height,
          frameRate
        }
      }
      if ($('#enableContentHint').prop('checked')) {
        options.optimizationMode = $('#contentHint').val()
      }
      // optimizationMode生效：似乎只有在设置了分辨率时才生效
      console.log(`createCameraVideoTrack ${JSON.stringify(options)}`)
      localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack(options)
      console.log(
        `localTracks.videoTrack._mediaStreamTrack.contentHint`,
        localTracks.videoTrack._mediaStreamTrack.contentHint
      )
    }
    if (screen) {
      let optimizationMode, maxBitrate
      if ($('#enableContentHint').prop('checked')) {
        optimizationMode = $('#contentHint').val()
      }
      if (document.getElementById('enableBitrateMax').checked) {
        maxBitrate = parseInt($('#bitrateMax').val())
      }
      let withAudio = screenAudio ? 'auto' : 'disable'
      let screenOptions = {
        // config: {
        encoderConfig: {
          width,
          height,
          frameRate,
          bitrateMax: maxBitrate
        },
        optimizationMode: optimizationMode,
        // },
        withAudio
      }
      // screenTrack = await AgoraRTC.createScreenVideoTrack(
      //   {
      //     encoderConfig: {
      //       width: sWidth,
      //       height: sHeight,
      //       frameRate: sFrameRate
      //     }
      //   },
      //   withAudio
      // )
      screenTrack = await AgoraRTC.createScreenVideoTrack(screenOptions)
      console.log(
        `screenTrack._mediaStreamTrack.contentHint`,
        screenTrack._mediaStreamTrack.contentHint
      )

      if (screenTrack instanceof Array) {
        localScreenTracks.screenVideoTrack = screenTrack[0]
        localScreenTracks.screenAudioTrack = screenTrack[1]
      } else {
        localScreenTracks.screenVideoTrack = screenTrack
      }
    }

    localTracks.videoTrack && localTracks.videoTrack.play(localVideoContent)
    localScreenTracks.screenVideoTrack && localScreenTracks.screenVideoTrack.play(localVideoContent)

    // Publish the local audio and video tracks to the RTC channel.
    if (localTracks.audioTrack) {
      await rtc.client.publish(localTracks.audioTrack)
    }
    if (localTracks.videoTrack) {
      await rtc.client.publish(localTracks.videoTrack)
    }
    if (localScreenTracks.screenAudioTrack) {
      await rtc.clientScreen.publish(localScreenTracks.screenAudioTrack)
    }
    if (localScreenTracks.screenVideoTrack) {
      await rtc.clientScreen.publish(localScreenTracks.screenVideoTrack)
    }
    console.log('publish success!')
  }

  async function leave() {
    // Destroy the local audio and video tracks.
    localTracks.audioTrack && localTracks.audioTrack.close()
    localTracks.videoTrack && localTracks.videoTrack.close()
    localScreenTracks.screenAudioTrack && localScreenTracks.screenAudioTrack.close()
    localScreenTracks.screenVideoTrack && localScreenTracks.screenVideoTrack.close()
    // Leave the channel.
    if (rtc.client) {
      await rtc.client.leave()
    }
    if (rtc.clientScreen) {
      await rtc.clientScreen.leave()
    }
  }

  function initClient() {
    console.error('initClient')
    loadEnv()
    let codec = $('input[name="agoraCodec"]:checked').val()
    rtc.client = AgoraRTC.createClient({ mode: 'rtc', codec })
    rtc.clientScreen = AgoraRTC.createClient({ mode: 'rtc', codec })
    initDevices()
  }

  async function initDevices() {
    AgoraRTC.getMicrophones().then((data) => {
      var info = JSON.stringify(data)
      console.log('麦克风: %o', info)
      renderDevice($('#micro'), data)
    })
    AgoraRTC.getCameras().then((data) => {
      var info = JSON.stringify(data)
      console.log('摄像头: %o', info)
      renderDevice($('#camera'), data)
    })
    // AgoraRTC.getPlaybackDevices().then((data) => {
    //     var info = JSON.stringify(data)
    //     console.log('扬声器: %o', info)
    //     renderDevice($('#sounder'), data)
    // })
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

  //切换mic
  $('#micro').on('change', async () => {
    const microphoneId = $('#micro').val()
    console.warn('切换mic: ', microphoneId)
    if (localTracks.audioTrack) {
      await localTracks.audioTrack.setDevice(microphoneId)
    }
  })
  //切换camera
  $('#camera').on('change', async () => {
    const cameraId = $('#camera').val()
    console.warn('切换camera: ', cameraId)
    if (localTracks.videoTrack) {
      await localTracks.videoTrack.setDevice(cameraId)
    }
  })

  async function switchCamera(label) {
    currentCam = cams.find((cam) => cam.label === label)
    $('.cam-input').val(currentCam.label)
    // switch device of local video track.
    if (localTracks.videoTrack) {
      await localTracks.videoTrack.setDevice(currentCam.deviceId)
    }
  }
  // async function switchMicrophone(label) {
  //     currentMic = mics.find(mic => mic.label === label);
  //     $(".mic-input").val(currentMic.label);
  //     // switch device of local audio track.
  //     await localTracks.audioTrack.setDevice(currentMic.deviceId);
  // }

  function initVideoProfiles() {
    videoProfiles.forEach((profile) => {
      $('.profile-list').append(
        `<a class="dropdown-item" label="${profile.label}" href="#">${profile.label}: ${profile.detail}</a>`
      )
    })
    curVideoProfile = videoProfiles.find((item) => item.label == '480p_1')
    $('.profile-input').val(`${curVideoProfile.detail}`)
  }
  async function changeVideoProfile(label) {
    curVideoProfile = videoProfiles.find((profile) => profile.label === label)
    $('.profile-input').val(`${curVideoProfile.detail}`)
    // change the local video track`s encoder configuration
    localTracks.videoTrack &&
      (await localTracks.videoTrack.setEncoderConfiguration(curVideoProfile.value))
  }

  // 3A 设置
  function getAudioProcessingConfig() {
    const audioProcessing = {}
    switch ($('#ans').val()) {
      case '':
        break
      case 'true':
        audioProcessing.ANS = true
        break
      case 'false':
        audioProcessing.ANS = false
        break
    }
    switch ($('#aec').val()) {
      case '':
        break
      case 'true':
        audioProcessing.AEC = true
        break
      case 'false':
        audioProcessing.AEC = false
        break
    }
    switch ($('#agc').val()) {
      case '':
        break
      case 'true':
        audioProcessing.AGC = true
        break
      case 'false':
        audioProcessing.AGC = false
        break
    }
    if (!$('#ans').val() && !$('#aec').val() && !$('#agc').val()) {
      return
    } else {
      return audioProcessing
    }
  }

  //视频重新设置分辨率
  $('#sessionConfigVideoQuality').on('change', () => {
    const videoQuality = resolutionMap.get($('#sessionConfigVideoQuality').val())[0]
    if (videoQuality) {
      localTracks.videoTrack && localTracks.videoTrack.setEncoderConfiguration(videoQuality)
    } else {
      console.log('该videoQuality无效')
    }
  })

  //视频重新设置帧率
  $('#sessionConfigVideoFrameRate').on('change', () => {
    const frameRate = frameRateMap.get($('#sessionConfigVideoFrameRate').val())
    localTracks.videoTrack &&
      localTracks.videoTrack.setEncoderConfiguration({
        encoderConfig: {
          frameRate
        }
      })
    console.log('change frame rate ', frameRate)
  })

  //屏幕共享重新设置分辨率
  $('#sessionConfigScreenProfile').on('change', () => {
    const screenQuality = resolutionMap.get($('#sessionConfigScreenProfile').val())[0]
    if (screenQuality) {
      localScreenTracks.screenVideoTrack &&
        localScreenTracks.screenVideoTrack.setEncoderConfiguration(screenQuality)
      // localTracks.videoTrack && localTracks.videoTrack.setEncoderConfiguration(videoQuality)
    } else {
      console.log('该screenQuality无效')
    }
  })

  //屏幕共享重新设置帧率
  $('#sessionConfigScreenFrameRate').on('change', () => {
    const screenFrameRate = frameRateMap.get($('#sessionConfigScreenFrameRate').val())
    localScreenTracks.screenVideoTrack &&
      localScreenTracks.screenVideoTrack.setEncoderConfiguration({
        encoderConfig: { frameRate: screenFrameRate }
      })
    // localTracks.videoTrack &&
    //   localTracks.videoTrack.setEncoderConfiguration({
    //     encoderConfig: {
    //       frameRate
    //     }
    //   })
    console.log('change screen frame rate ', screenFrameRate)
  })

  $('#encoderConfigBtn').on('click', async () => {
    if (!localTracks.videoTrack && !localScreenTracks.screenVideoTrack) {
      console.log('未找到本地track')
      return
    }
    const options = {}
    const mediaType = $('#encoderMediaType').val()

    if (document.getElementById('enableBitrateMax').checked) {
      options.maxBitrate = parseInt($('#bitrateMax').val())
    }
    if (document.getElementById('enableContentHint').checked) {
      options.contentHint = $('#contentHint').val()
    }
    console.log('上行视频编码设置', options)

    // await localTracks.videoTrack.setEncoderConfiguration({
    //   encoderConfig: {
    //     bitrateMax: options.maxBitrate
    //   },
    //   optimizationMode: options.contentHint
    // })
    let configTrack
    if (mediaType === 'video') {
      configTrack = localTracks.videoTrack
    } else if (mediaType === 'screen') {
      configTrack = localScreenTracks.screenVideoTrack
    }
    if (options.maxBitrate && localTracks.videoTrack) {
      await localTracks.videoTrack.setEncoderConfiguration({
        config: {
          bitrateMax: options.maxBitrate
        }
      })
    }
    if (options.contentHint) {
      await configTrack.setOptimizationMode(options.contentHint)
    }
  })

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

  document.getElementById('startVideoDump').onclick = async function () {
    enableDump = parseInt($('input[name="enableDump"]:checked').val())
    startDump(enableDump)
  }
  document.getElementById('stopVideoDump').onclick = function () {
    stopDump()
  }

  async function startDump(enableDump) {
    let frameCounter = 0
    let dumpTrack
    if (enableDump === 1) {
      dumpTrack = localTracks.videoTrack._mediaStreamTrack
    } else if (enableDump === 2) {
      dumpTrack = localScreenTracks.screenVideoTrack._mediaStreamTrack
    } else if (enableDump === 3) {
      dumpTrack = rtc.client._users[0].videoTrack._mediaStreamTrack
    } else if (enableDump === 4) {
      dumpTrack = rtc.client._users[1].videoTrack._mediaStreamTrack
    }
    // let videoTrack = rtc.localStream.mediaHelper.video.renderStream.getTracks()[0];
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
      latencyMode: 'realtime',
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
    console.warn('buffer: ', dumpBuffer)
    if (dumpBuffer.length) {
      const blob = new Blob(dumpBuffer, { type: 'application/file' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `agora_${dumpKey}d${dumpDelta}.h264`
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
      dumpKey++
    } else if (chunk.type === 'delta') {
      dumpDelta++
    }
    let buffer = data.buffer.slice(0)
    console.error('buffer: ', data.buffer)
    dumpBuffer.push(buffer)
  }

  function handleError(error) {
    console.error('VideoEncoder error: ', error)
  }

  $('#playMicro').on('click', async () => {
    console.warn('打开mic')
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      microphoneId,
      AEC: getAudioProcessingConfig() && getAudioProcessingConfig().AEC,
      ANS: getAudioProcessingConfig() && getAudioProcessingConfig().ANS,
      AGC: getAudioProcessingConfig() && getAudioProcessingConfig().AGC,
      encoderConfig: $('#sessionConfigAudioProfile').val() || 'speech_low_quality'
    })
    if (localTracks.audioTrack) {
      await rtc.client.publish(localTracks.audioTrack)
    }
  })
  $('#playMicroOff').on('click', async () => {
    console.warn('关闭mic')
    await rtc.client.unpublish(localTracks.audioTrack)
    await localTracks.audioTrack.close()
    localTracks.audioTrack = undefined
  })

  $('#playCamera').on('click', async () => {
    console.warn('打开摄像头')

    let width, height, frameRate
    let cameraId = $('#camera').val()
    if ($('#sessionConfigVideoQuality').val()) {
      width = resolutionMap.get($('#sessionConfigVideoQuality').val())[1]
      height = resolutionMap.get($('#sessionConfigVideoQuality').val())[2]
    }
    if ($('#sessionConfigVideoFrameRate').val()) {
      frameRate = frameRateMap.get($('#sessionConfigVideoFrameRate').val())
    }
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack({
      cameraId,
      encoderConfig: {
        width,
        height,
        frameRate
      }
    })
    localTracks.videoTrack && localTracks.videoTrack.play(localVideoContent)
    // console.error('localTracks1: ', localTracks)
    if (localTracks.videoTrack) {
      await rtc.client.publish(localTracks.videoTrack)
    }
  })

  $('#playCameraOff').on('click', async () => {
    console.warn('关闭摄像头')

    await rtc.client.unpublish(localTracks.videoTrack)
    await localTracks.videoTrack.close()
    localTracks.videoTrack = undefined
  })

  $('#playScreen').on('click', async () => {
    console.warn('打开屏幕共享')

    let width, height, frameRate
    if ($('#sessionConfigScreenProfile').val()) {
      width = resolutionMap.get($('#sessionConfigScreenProfile').val())[1]
      height = resolutionMap.get($('#sessionConfigScreenProfile').val())[2]
    } else {
      width = 1920
      height = 1080
    }
    if ($('#sessionConfigScreenFrameRate').val()) {
      frameRate = frameRateMap.get($('#sessionConfigScreenFrameRate').val())
    } else {
      frameRate = 5
    }
    // let withAudio = screenAudio ? 'auto' : 'disable'
    let withAudio = 'disable'
    localScreenTracks.screenVideoTrack = await AgoraRTC.createScreenVideoTrack(
      {
        encoderConfig: {
          width,
          height,
          frameRate
        }
      },
      withAudio
    )
    localScreenTracks.screenVideoTrack && localScreenTracks.screenVideoTrack.play(localVideoContent)
    // console.error('localTracks1: ', localTracks)
    if (!isScreenJoined) {
      await rtc.clientScreen.join(appId, channelName, token, suid)
    }

    if (localScreenTracks.screenVideoTrack) {
      await rtc.clientScreen.publish(localScreenTracks.screenVideoTrack)
    }
  })
  $('#playScreenOff').on('click', async () => {
    console.warn('关闭屏幕共享')
    await rtc.clientScreen.unpublish(localScreenTracks.screenVideoTrack)
    await localScreenTracks.screenVideoTrack.close()
    localScreenTracks.screenVideoTrack = undefined
  })

  $('#playScreenAudio').on('click', async () => {
    console.warn('打开屏幕共享+音频')
    let width, height, frameRate
    if ($('#sessionConfigScreenProfile').val()) {
      width = resolutionMap.get($('#sessionConfigScreenProfile').val())[1]
      height = resolutionMap.get($('#sessionConfigScreenProfile').val())[2]
    } else {
      width = 1920
      height = 1080
    }
    if ($('#sessionConfigScreenFrameRate').val()) {
      frameRate = frameRateMap.get($('#sessionConfigScreenFrameRate').val())
    } else {
      frameRate = 5
    }
    let withAudio = 'auto'
    let screenTrack = await AgoraRTC.createScreenVideoTrack(
      {
        encoderConfig: {
          width,
          height,
          frameRate
        }
      },
      withAudio
    )

    if (screenTrack instanceof Array) {
      localScreenTracks.screenVideoTrack = screenTrack[0]
      localScreenTracks.screenAudioTrack = screenTrack[1]
    } else {
      localScreenTracks.screenVideoTrack = screenTrack
    }
    localScreenTracks.screenVideoTrack && localScreenTracks.screenVideoTrack.play(localVideoContent)
    // console.error('localTracks1: ', localTracks)
    if (!isScreenJoined) {
      await rtc.clientScreen.join(appId, channelName, token, suid)
    }
    if (localScreenTracks.screenVideoTrack) {
      await rtc.clientScreen.publish(localScreenTracks.screenVideoTrack)
    }
    if (localScreenTracks.screenAudioTrack) {
      await rtc.clientScreen.publish(localScreenTracks.screenAudioTrack)
    }
  })
  $('#playScreenAudioOff').on('click', async () => {
    console.warn('关闭屏幕共享音频')
    await rtc.clientScreen.unpublish(localScreenTracks.screenAudioTrack)
    await localScreenTracks.screenAudioTrack.close()
    localScreenTracks.screenAudioTrack = undefined
  })

  //
}