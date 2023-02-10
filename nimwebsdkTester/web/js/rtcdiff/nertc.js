document.getElementById('NERTC').onclick = function () {
  console.warn('开启 NERTC')
  document.getElementById('NERTC').style.backgroundColor = '#0d66ff'
  document.getElementById('AGORA').style.backgroundColor = '#efefef'
  startNERTC()
}

function startNERTC() {
  // let appkey = '6acf024e190215b685905444b6e57dd7' // 请输入自己的appkey  prod
  let appkey = $('#appkey').val()
  // let appkey = 'eca23f68c66d4acfceee77c200200359' // test
  let channelName // '您指定的房间号'
  let uid // '您指定的用户ID'
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
    screenAudioSource: null
  }
  let dumpSize = 0
  let dumpMediaType = ''
  const DUMP_SIZE_MAX = 10000000
  let dumpStartAt = 0
  let dumpEndAt = 0
  let dumpKey = 0
  let dumpDelta = 0
  let dumpBuffer = []
  let enableDump

  const localStoragePrefix = 'NERTC-'
  function loadEnv() {
    const channelName = window.localStorage
      ? window.localStorage.getItem(`${localStoragePrefix}channelName`)
      : ''
    $('#channelName').val(channelName)
    // const appkey = window.localStorage
    // ? window.localStorage.getItem(`${localStoragePrefix}appkey`)
    // : ''
    // $('#appkey').val(appkey)
    domUid = '' + Math.floor(Math.random() * 9000 + 1000)
    $('#uid').val(domUid)
  }
  initClient()
  document.getElementById('startCall').onclick = async function () {
    document.getElementById('startCall').style.backgroundColor = '#0d66ff'
    channelName = parseInt(document.querySelector('#channelName').value)
    // appkey = parseInt(document.querySelector('#appkey').value);
    if (window.localStorage) {
      window.localStorage.setItem(`${localStoragePrefix}channelName`, channelName)
      // window.localStorage.setItem(`${localStoragePrefix}appkey`, appkey)
    }
    uid = parseInt(document.querySelector('#uid').value)

    // 监听事件
    rtc.client.on('stream-added', (event) => {
      const remoteStream = event.stream
      console.warn('收到别人的发布消息: ', remoteStream.streamID, 'mediaType: ', event.mediaType)
      rtc.remoteStreams[remoteStream.streamID] = remoteStream
      //订阅远端流
      rtc.client.subscribe(remoteStream).then(() => {
        console.warn(`subscribe 成功 ${remoteStream.streamID}`)
      })
    })
    rtc.client.on('stream-subscribed', async (event) => {
      // 远端流订阅成功
      const remoteStream = event.stream
      console.warn(
        '订阅别人的流成功的通知: ',
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
      // let videoDom = document.getElementsByClassName('nertc-video-container-remote')[0].children[0];
      // let screenDom = document.getElementById('remoteVideoContent').querySelector('.nertc-screen-container').children[0];
      let videoDomFisrt =
        document.getElementsByClassName('nertc-video-container-remote')[0] &&
        document.getElementsByClassName('nertc-video-container-remote')[0].children[0].currentTime
      let screenDomFisrt =
        document.getElementById('remoteVideoContent').querySelector('.nertc-screen-container') &&
        document.getElementById('remoteVideoContent').querySelector('.nertc-screen-container')
          .children[0].currentTime
      // 远端视频首帧播放提示
      // console.error('videoDomFisrt: ',videoDomFisrt)
      if (parseFloat(videoDomFisrt) >= 0) {
        document.getElementById('videoFirstFrame').style.backgroundColor = '#0d66ff'
      }
      if (parseFloat(screenDomFisrt) >= 0) {
        document.getElementById('screenFirstFrame').style.backgroundColor = '#0d66ff'
      }
    })
    rtc.client.on('stream-removed', (evt) => {
      document.getElementById('videoFirstFrame').style.backgroundColor = '#efefef'
      document.getElementById('screenFirstFrame').style.backgroundColor = '#efefef'
    })

    try {
      await rtc.client.join({
        channelName,
        uid,
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
      if (rtc.client.adapterRef.mediaCapability && $('#enableCodecHacking').prop('checked')) {
        let preferredCodecSend = { video: [], screen: [] }
        if ($('#supportSendH264').prop('checked')) {
          preferredCodecSend.video.push('H264')
          preferredCodecSend.screen.push('H264')
        }
        if ($('#supportSendVP8').prop('checked')) {
          preferredCodecSend.video.push('VP8')
          preferredCodecSend.screen.push('VP8')
        }
        rtc.client.adapterRef.mediaCapability.preferredCodecSend = preferredCodecSend
      }
      await rtc.client.publish(rtc.localStream)
    } catch (error) {
      console.error(error)
    }
  }
  document.getElementById('finishCall').onclick = async function () {
    document.getElementById('startCall').style.backgroundColor = '#efefef'
    document.getElementById('videoFirstFrame').style.backgroundColor = '#efefef'
    document.getElementById('screenFirstFrame').style.backgroundColor = '#efefef'
    // stopDump()
    await rtc.client.leave()
  }

  function initClient() {
    loadEnv()
    rtc.client = NERTC.createClient({ appkey, debug: true })
    initDevices()
    initCodecOptions()
  }
  async function initLocalStream() {
    const enableAudio = $('input[name="enableAudio"]:checked').val()
    const audio = !!enableAudio
    const enableVideo = $('input[name="enableVideo"]:checked').val()
    const video = !!enableVideo
    const enableScreen = $('input[name="enableScreen"]:checked').val()
    const screen = !!enableScreen
    const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val()
    const screenAudio = !!enableScreenAudio

    enableDump = parseInt($('input[name="enableDump"]:checked').val())

    const createStreamOptions = {
      uid: getUidFromDomInput() || rtc.client.getChannelInfo().uid,
      audio,
      audioProcessing: getAudioProcessingConfig(),
      microphoneId: $('#micro').val(),
      video,
      screen,
      screenAudio,
      client: rtc.client
    }
    if ($('#camera').val()) {
      createStreamOptions.cameraId = $('#camera').val()
    }
    if ($('#cameraFacingMode').val()) {
      createStreamOptions.facingMode = $('#cameraFacingMode').val()
    }
    if ($('#micro').val()) {
      createStreamOptions.microphoneId = $('#micro').val()
    }
    rtc.localStream = NERTC.createStream(createStreamOptions)

    const resolution = $('#sessionConfigVideoQuality').val()
    const frameRate = $('#sessionConfigVideoFrameRate').val()
    const videoProfile = {}
    if (resolution) {
      videoProfile.resolution = NERTC.VIDEO_QUALITY[resolution]
    }
    if (frameRate) {
      videoProfile.frameRate = NERTC.VIDEO_FRAME_RATE[frameRate]
    }
    if (resolution || frameRate) {
      rtc.localStream.setVideoProfile(videoProfile)
      console.log('setVideoProfile', videoProfile)
    } else {
      console.log('setVideoProfile 没有设置')
    }
    const audioProfile = $('#sessionConfigAudioProfile').val()
    if (audioProfile) {
      rtc.localStream.setAudioProfile(audioProfile)
    }

    const screenProfile = {}
    const screenResolution = $('#sessionConfigScreenProfile').val()
    if (screenResolution) {
      screenProfile.resolution = NERTC.VIDEO_QUALITY[screenResolution]
    }
    const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
    if (screenFrameRate) {
      screenProfile.frameRate = NERTC.VIDEO_FRAME_RATE[screenFrameRate]
    }
    if (screenResolution || screenFrameRate) {
      rtc.localStream.setScreenProfile(screenProfile)
      console.log('setScreenProfile', screenProfile)
    } else {
      console.log('setScreenProfile 没有配置')
    }

    await rtc.localStream.init()
    // 设置本地视频画布
    rtc.localStream.setLocalRenderMode({
      width: 320,
      height: 240
    })
  }

  // 音视频设备初始化
  function initDevices() {
    NERTC.getMicrophones().then((data) => {
      var info = JSON.stringify(data)
      console.log('麦克风: %o', info)
      renderDevice($('#micro'), data)
    })
    NERTC.getCameras().then((data) => {
      var info = JSON.stringify(data)
      console.log('摄像头: %o', info)
      renderDevice($('#camera'), data)
    })
    // NERTC.getSpeakers().then((data) => {
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

  $('#setAppkey').on('click', () => {
    appkey = $('#appkey').val()
    console.log('更新 appkey: ', appkey)
    initClient()
  })

  //切换mic
  $('#micro').on('change', () => {
    const microphoneId = $('#micro').val()
    console.warn('切换mic: ', microphoneId)
    window.rtc.localStream &&
      window.rtc.localStream
        .switchDevice('audio', microphoneId)
        .then(() => {
          console.warn('切换mic成功')
        })
        .catch((err) => {
          console.warn('切换mic失败： ', err)
        })
  })
  //重新设置分辨率
  $('#sessionConfigVideoQuality').on('change', () => {
    const videoQuality = $('#sessionConfigVideoQuality').val()
    if (videoQuality) {
      window.rtc.localStream &&
        window.rtc.localStream.setVideoProfile({
          resolution: NERTC.VIDEO_QUALITY[videoQuality]
        })
    } else {
      console.log('该videoQuality无效')
    }
  })

  //重新设置帧率
  $('#sessionConfigVideoFrameRate').on('change', () => {
    const frameRate = $('#sessionConfigVideoFrameRate').val()
    window.rtc.localStream &&
      window.rtc.localStream.setVideoProfile({
        frameRate: NERTC.VIDEO_FRAME_RATE[frameRate]
      })
    console.log('change frame rate ', frameRate)
  })

  //切换camera
  $('#camera').on('change', () => {
    const cameraId = $('#camera').val()
    console.warn('切换camera: ', cameraId)
    window.rtc.localStream &&
      window.rtc.localStream
        .switchDevice('video', cameraId)
        .then(() => {
          console.warn('切换camera成功')
        })
        .catch((err) => {
          console.warn('切换camera失败： ', err)
        })
  })
  function getUidFromDomInput() {
    const uidInput = $('#uid').val()
    if (!uidInput) {
      // 未填
      return 0
    } else {
      let uid = $('#uid').val()
      if ($('#useStringUid').prop('checked') === false) {
        uid = parseInt(uid)
        console.log('使用Number类型的uid', uid)
      } else {
        console.log('使用String类型的uid', uid)
      }
      return uid
    }
  }
  $('#encoderConfigBtn').on('click', () => {
    if (!rtc.localStream) {
      console.log('未找到本地流')
      return
    }
    // const options = {}
    const options = {
      mediaType: $('#encoderMediaType').val()
      // streamType: $('#encoderStreamType').val()
    }
    if (document.getElementById('enableBitrateMax').checked) {
      options.maxBitrate = parseInt($('#bitrateMax').val())
    }
    if (document.getElementById('enableContentHint').checked) {
      options.contentHint = $('#contentHint').val()
    }
    console.log('上行视频编码设置', options)
    rtc.localStream.setVideoEncoderConfiguration(options)
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
      dumpTrack = rtc.localStream.mediaHelper.video.renderStream.getTracks()[0]
    } else if (enableDump === 2) {
      dumpTrack = rtc.localStream.mediaHelper.screen.renderStream.getTracks()[0]
    } else if (enableDump === 3) {
      dumpTrack = Object.values(rtc.remoteStreams)[0].mediaHelper.video.renderStream.getTracks()[0]
    } else if (enableDump === 4) {
      dumpTrack = Object.values(rtc.remoteStreams)[0].mediaHelper.screen.renderStream.getTracks()[0]
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
    console.warn('buffer: ', dumpBuffer)
    if (dumpBuffer.length) {
      const blob = new Blob(dumpBuffer, { type: 'application/file' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `nertc.${dumpMediaType}.${Math.ceil(
        (dumpEndAt - dumpStartAt) / 1000
      )}s.k${dumpKey}d${dumpDelta}.h264`
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

  $('#enableCodecHacking').on('change', () => {
    console.error('Here')
    if ($('#enableCodecHacking').prop('checked')) {
      $('.codec-hacking').removeAttr('disabled')
    } else {
      $('.codec-hacking').attr('disabled', 'disabled')
    }
  })

  //supportedCodec用于测试
  if ($('#enableCodecHacking').prop('checked')) {
    const supportedCodecRecv = []
    if ($('#supportRecvH264').prop('checked')) {
      supportedCodecRecv.push('H264')
    }
    if ($('#supportRecvVP8').prop('checked')) {
      supportedCodecRecv.push('VP8')
    }
    rtc.client.adapterRef.mediaCapability.supportedCodecRecv = supportedCodecRecv
    const supportedCodecSend = []
    if ($('#supportSendH264').prop('checked')) {
      supportedCodecSend.push('H264')
    }
    if ($('#supportSendVP8').prop('checked')) {
      supportedCodecSend.push('VP8')
    }
    rtc.client.adapterRef.mediaCapability.supportedCodecSend = supportedCodecSend
  }
  async function initCodecOptions() {
    const start = Date.now()
    if (rtc.client && rtc.client._getSupportedCodecs) {
      let supportedCodecsRecv = await rtc.client._getSupportedCodecs('recv')
      if (supportedCodecsRecv.video.indexOf('H264') === -1) {
        console.error('浏览器不支持H264。等待1秒。。。')
        while (Date.now() - start < 1000) {
          supportedCodecsRecv = await rtc.client._getSupportedCodecs('recv')
          if (supportedCodecsRecv.video.indexOf('H264') === -1) {
            // 停顿100毫秒后继续
            await new Promise((resolve) => {
              setTimeout(resolve, 100)
            })
          } else {
            console.log(`H264解码器加载完成！用时 ${Date.now() - start} 毫秒`)
            break
          }
        }
        if (supportedCodecsRecv.video.indexOf('H264') === -1) {
          console.error(`浏览器确实不支持H264!`)
        }
      }
      let supportedCodecsSend = await rtc.client._getSupportedCodecs('send')
      const codecs = ['H264', 'VP8']
      $('#supported-recv-codec-wrapper').empty()
      $('#supported-send-codec-wrapper').empty()
      codecs.forEach((codec) => {
        $('#supported-recv-codec-wrapper').append(
          `<label><input type="checkbox" class="codec-hacking" disabled id="supportRecv${codec}" ${
            supportedCodecsRecv.video.indexOf(codec) > -1 ? 'checked' : ''
          }>${codec}</label>`
        )
        $('#supported-send-codec-wrapper').append(
          `<label><input type="checkbox" class="codec-hacking" disabled id="supportSend${codec}" ${
            supportedCodecsSend.video.indexOf(codec) > -1 ? 'checked' : ''
          }>${codec}</label>`
        )
      })
    }
  }

  $('#playMicro').on('click', () => {
    console.warn('打开mic')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }

    rtc.localStream.setAudioProfile($('#sessionConfigAudioProfile').val())
    rtc.localStream
      .open({
        type: 'audio',
        deviceId: $('#micro').val()
      })
      .then(() => {
        console.log('打开mic sucess')
      })
      .catch((err) => {
        console.log('打开mic 失败: ', err)
      })
  })
  $('#playMicroOff').on('click', () => {
    console.warn('关闭mic')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }

    rtc.localStream
      .close({
        type: 'audio',
        microphoneId: $('#micro').val()
      })
      .then(() => {
        console.log('关闭mic sucess')
      })
      .catch((err) => {
        console.log('关闭mic 失败: ', err)
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
    if (resolution) {
      videoProfile.resolution = NERTC.VIDEO_QUALITY[resolution]
    }
    if (frameRate) {
      videoProfile.frameRate = NERTC.VIDEO_FRAME_RATE[frameRate]
    }
    if (resolution || frameRate) {
      rtc.localStream.setVideoProfile(videoProfile)
      console.log('setVideoProfile', videoProfile)
    } else {
      console.log('setVideoProfile 没有设置')
    }

    rtc.localStream
      .open({
        type: 'video',
        deviceId: $('#camera').val(),
        facingMode: $('#cameraFacingMode').val()
      })
      .then(async () => {
        console.log('打开摄像头 sucess')
        await rtc.localStream.play(document.getElementById('local-container'))
        rtc.localStream.setLocalRenderMode({
          width: 320,
          height: 240
        })
      })
      .catch((err) => {
        console.log('打开摄像头 失败: ', err)
      })
  })
  $('#playCameraOff').on('click', () => {
    console.warn('关闭摄像头')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }

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

  $('#playScreen').on('click', () => {
    console.warn('打开屏幕共享')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }

    const screenProfile = {}
    const screenResolution = $('#sessionConfigScreenProfile').val()
    if (screenResolution) {
      screenProfile.resolution = NERTC.VIDEO_QUALITY[screenResolution]
    }
    const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
    if (screenFrameRate) {
      screenProfile.frameRate = NERTC.VIDEO_FRAME_RATE[screenFrameRate]
    }
    if (screenResolution || screenFrameRate) {
      rtc.localStream.setScreenProfile(screenProfile)
      console.log('setScreenProfile', screenProfile)
    } else {
      console.log('setScreenProfile 没有配置')
    }

    rtc.localStream
      .open({
        type: 'screen'
      })
      .then(async () => {
        await rtc.localStream.play(document.getElementById('local-container'))
        rtc.localStream.setLocalRenderMode({
          width: 320,
          height: 240
        })
      })
      .catch((err) => {
        console.log('打开屏幕共享 失败: ', err)
      })
  })
  $('#playScreenOff').on('click', () => {
    console.warn('关闭屏幕共享')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }

    rtc.localStream
      .close({
        type: 'screen'
      })
      .then(() => {
        console.log('关闭屏幕共享 sucess')
      })
      .catch((err) => {
        console.log('关闭屏幕共享 失败: ', err)
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
    if (screenResolution) {
      screenProfile.resolution = NERTC.VIDEO_QUALITY[screenResolution]
    }
    const screenFrameRate = $('#sessionConfigScreenFrameRate').val()
    if (screenFrameRate) {
      screenProfile.frameRate = NERTC.VIDEO_FRAME_RATE[screenFrameRate]
    }
    if (screenResolution || screenFrameRate) {
      rtc.localStream.setScreenProfile(screenProfile)
      console.log('setScreenProfile', screenProfile)
    } else {
      console.log('setScreenProfile 没有配置')
    }

    rtc.localStream
      .open({
        type: 'screen',
        screenAudio: true
      })
      .then(async () => {
        await rtc.localStream.play(document.getElementById('local-container'))
        rtc.localStream.setLocalRenderMode({
          width: 320,
          height: 240
        })
      })
      .catch((err) => {
        console.log('打开屏幕共享音频 失败: ', err)
      })
  })
  $('#playScreenAudioOff').on('click', () => {
    console.warn('关闭屏幕共享音频')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }

    rtc.localStream
      .close({
        type: 'screenAudio'
      })
      .then(() => {
        console.log('关闭屏幕共享音频 sucess')
      })
      .catch((err) => {
        console.log('关闭屏幕共享音频 失败: ', err)
      })
  })
  // 云信远端主流全屏
  $('.nertc-remote-video-full-screen').on('click', async () => {
    let dom = document.getElementsByClassName('nertc-video-container-remote')[0]
    await dom.requestFullscreen()
  })
  // 云信远端辅流全屏
  $('.nertc-remote-screen-full-screen').on('click', async () => {
    let dom = document.getElementsByClassName('nertc-screen-container-remote')[0]
    await dom.requestFullscreen()
  })
  //云信退出全屏状态
  $('.nertc-exit-full-screen').on('click', async () => {
    await document.requestFullscreen()
  })
}
