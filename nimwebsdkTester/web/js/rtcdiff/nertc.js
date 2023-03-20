document.getElementById('NERTC').onclick = function () {
  console.warn('开启 NERTC')
  document.getElementById('NERTC').style.backgroundColor = '#0d66ff'
  document.getElementById('AGORA').style.backgroundColor = '#efefef'
  document.getElementById('vendorInfo').innerText = 'NERTC ' + NERTC.BUILD
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
      if (event.mediaType === 'video' || event.mediaType === 'audio') {
        await remoteStream.play('remoteVideoContent')
      } else if (event.mediaType === 'screen' || event.mediaType === 'screenAudio') {
        await remoteStream.play('remoteScreenContent')
      }
      // await remoteStream.play('remoteVideoContent')
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
      var remoteStream = evt.stream
      console.warn('收到别人停止发布的消息: ', remoteStream.streamID, 'mediaType: ', evt.mediaType)
      console.log(`${remoteStream.streamID}停止发布 ` + evt.mediaType)

      if (!remoteStream.audio && !remoteStream.video && !remoteStream.screen) {
        delete rtc.remoteStreams[remoteStream.streamID]
        $(`#subList option[value=${remoteStream.streamID}]`).remove()
      }
      remoteStream.stop(evt.mediaType)
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
    await rtc.localStream.destroy()
    await rtc.client.leave()
  }

  function initClient() {
    rtc.client && rtc.client.destroy()
    loadEnv()
    NERTC.Logger.enableLogUpload()
    rtc.client = NERTC.createClient({ appkey, debug: true })
    initDevices()
    initCodecOptions()
  }
  async function initLocalStream() {
    const enableAudio = $('input[name="enableAudio"]:checked').val()
    const audio = !!enableAudio
    let audioSource
    if (enableAudio === 'source') {
      rtc.audioSource =
        rtc.audioSource && rtc.audioSource.readyState === 'live'
          ? rtc.audioSource
          : getAudioSource('audio')
      audioSource = rtc.audioSource
      rtc.audioSource.enabled = true
    } else {
      audioSource = null
    }

    const enableVideo = $('input[name="enableVideo"]:checked').val()
    const video = !!enableVideo
    let videoSource
    if (enableVideo === 'source') {
      rtc.videoSource =
        rtc.videoSource && rtc.videoSource.readyState === 'live'
          ? rtc.videoSource
          : getVideoSource('video')
      rtc.videoSource.enabled = true
      videoSource = rtc.videoSource
    } else {
      videoSource = null
    }

    const enableScreen = $('input[name="enableScreen"]:checked').val()
    const screen = !!enableScreen
    let screenVideoSource
    if (enableScreen === 'source') {
      rtc.screenVideoSource =
        rtc.screenVideoSource && rtc.screenVideoSource.readyState === 'live'
          ? rtc.screenVideoSource
          : getVideoSource('screen')
      screenVideoSource = rtc.screenVideoSource
      rtc.screenVideoSource.enabled = true
    } else {
      screenVideoSource = null
    }

    const enableScreenAudio = $('input[name="enableScreenAudio"]:checked').val()
    const screenAudio = !!enableScreenAudio
    let screenAudioSource
    if (enableScreenAudio === 'source') {
      rtc.screenAudioSource =
        rtc.screenAudioSource && rtc.screenAudioSource.readyState === 'live'
          ? rtc.screenAudioSource
          : getAudioSource('screenAudio')
      screenAudioSource = rtc.screenAudioSource
    } else {
      screenAudioSource = null
    }

    enableDump = parseInt($('input[name="enableDump"]:checked').val())

    const createStreamOptions = {
      uid: getUidFromDomInput() || rtc.client.getChannelInfo().uid,
      audio,
      audioProcessing: getAudioProcessingConfig(),
      microphoneId: $('#micro').val(),
      video,
      screen,
      screenAudio,
      client: rtc.client,
      audioSource,
      videoSource,
      screenAudioSource,
      screenVideoSource
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
      rtc.fakeAudio = fakeAudio
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
      rtc.fakeAudio = fakeAudio
      return fakeAudio.track
    }
  }

  // 自定义视频
  function getVideoSource(mediaType) {
    // let defaultStr = '1920x1080x15x1'
    // const optionsStr =
    //   prompt(
    //     `自定义${mediaType}配置：【宽x高x帧率x类型
    // 类型1：时钟;
    // 类型2：背景替换;
    // 类型3：随机颜色;
    // 类型4：屏幕共享;
    // `,
    //     defaultStr
    //   ) || defaultStr
    // const matches = optionsStr.match(/(\d+)x(\d+)x(\d+)x(\d+)/)
    // if (!matches) {
    //   console.warn('自定义视频 ：无法匹配字符串' + optionsStr)
    //   return
    // }
    // let videoConstraint = {
    //   width: matches[1],
    //   height: matches[2],
    //   frameRate: matches[3],
    //   content: `${mediaType} ${optionsStr}`
    // }

    // if (matches[4] === '1') {
    //   videoConstraint.type = 'clock'
    // } else if (matches[4] === '3') {
    //   videoConstraint.type = 'randomcolor'
    // } else if (matches[4] === '4') {
    //   videoConstraint.type = 'display'
    // } else {
    //   videoConstraint.type = 'background'
    //   const bgImg = new Image()
    //   const pathParts = window.location.pathname.split('/')
    //   pathParts.pop()
    //   const src = pathParts.join('/') + '/img/koala.jpg'
    //   bgImg.src = src
    //   videoConstraint.bgImg = bgImg
    // }
    let videoConstraint = {
      width: '1920',
      height: '1080',
      frameRate: '15',
      content: 'video 1920x1080x15x1'
    }
    let videoSource = fakeMediaDevices.getFakeMedia({ video: videoConstraint }).video.track
    return videoSource
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

  /**
   * ----------------------------------------
   *              videoDump 逻辑
   * ----------------------------------------
   */

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

  /**
   * ----------------------------------------
   *              设备开关逻辑
   * ----------------------------------------
   */

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
  $('#playMicroSource').on('click', () => {
    console.warn('打开自定义音频')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }
    if ($('#sessionConfigAudioProfile').val()) {
      rtc.localStream.setAudioProfile($('#sessionConfigAudioProfile').val())
    }
    rtc.audioSource =
      rtc.audioSource && rtc.audioSource.readyState === 'live'
        ? rtc.audioSource
        : getAudioSource('audio')
    rtc.audioSource.enabled = true
    let openOptions = {
      type: 'audio',
      audioSource: rtc.audioSource
    }
    console.log('openOptions', openOptions)
    rtc.localStream
      .open(openOptions)
      .then(() => {
        console.log('打开自定义音频成功')
      })
      .catch((err) => {
        console.log('打开自定义音频 失败: ', err)
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
        await rtc.localStream.play('localVideoContent')
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
  $('#playCameraSource').on('click', () => {
    console.warn('打开自定义摄像头')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }
    rtc.videoSource =
      rtc.videoSource && rtc.videoSource.readyState === 'live'
        ? rtc.videoSource
        : getVideoSource('video')
    rtc.videoSource.enabled = true
    rtc.localStream
      .open({
        type: 'video',
        videoSource: rtc.videoSource
      })
      .then(async () => {
        console.log('打开摄像头 sucess')
        await rtc.localStream.play('localVideoContent')
        rtc.localStream.setLocalRenderMode({
          width: 320,
          height: 240
        })
      })
      .catch((err) => {
        console.log('打开摄像头 失败: ', err)
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
        await rtc.localStream.play('localVideoContent')
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
  $('#playScreenSource').on('click', () => {
    console.warn('打开自定义辅流')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }
    rtc.screenVideoSource =
      rtc.screenVideoSource && rtc.screenVideoSource.readyState === 'live'
        ? rtc.screenVideoSource
        : getVideoSource('screen')
    rtc.screenVideoSource.enabled = true
    let openOptions = {
      type: 'screen',
      screenVideoSource: rtc.screenVideoSource
    }
    console.log('openOptions', openOptions)
    rtc.localStream
      .open(openOptions)
      .then(async () => {
        console.log('打开自定义辅流成功')
        await rtc.localStream.play('localScreenContent')
        rtc.localStream.setLocalRenderMode({
          width: 320,
          height: 240
        })
      })
      .catch((err) => {
        console.log('打开自定义辅流 失败: ', err)
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
        await rtc.localStream.play('localScreenContent')
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
  $('#playScreenAudioSource').on('click', () => {
    console.warn('打开自定义辅流音频')
    if (!rtc.localStream) {
      assertLocalStream()
      return
    }
    const audioProfile = $('#sessionConfigAudioProfile').val()
    if (audioProfile) {
      rtc.localStream.setAudioProfile(audioProfile)
    }
    rtc.screenAudioSource =
      rtc.screenAudioSource && rtc.screenAudioSource.readyState === 'live'
        ? rtc.screenAudioSource
        : getAudioSource('screenAudio')
    rtc.screenAudioSource.enabled = true
    let openOptions = {
      type: 'screenAudio',
      screenAudioSource: rtc.screenAudioSource
    }
    console.log('openOptions', openOptions)
    rtc.localStream
      .open(openOptions)
      .then(async () => {
        console.log('打开自定义辅流音频成功')
        await rtc.localStream.play('localScreenContent')
        rtc.localStream.setLocalRenderMode({
          width: 320,
          height: 240
        })
      })
      .catch((err) => {
        console.log('打开自定义辅流音频 失败: ', err)
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

  $('#forceBWE').val(WebRTC2.getParameters().forceBWE)

  $('#setBWE').click(() => {
    const val = $('#forceBWE').val()
    console.warn(`切换带宽估计：${WebRTC2.getParameters().forceBWE} => ${val}`)
    if (!WebRTC2.getParameters().forceBWE) {
      alert(`本版本不支持切换带宽估计！`)
    }
    WebRTC2.getParameters().forceBWE = val
  })

  $('#h264ProfileLevel').val(WebRTC2.getParameters().h264ProfileLevel)

  $('#setH264ProfileLevel').click(() => {
    const val = $('#h264ProfileLevel').val()
    console.warn(`切换H264 Profile Level：${WebRTC2.getParameters().h264ProfileLevel} => ${val}`)
    WebRTC2.getParameters().h264ProfileLevel = val
  })
}
