
QUnit.module('摄像头', function() {
  QUnit.test('测试摄像头可以打开', async function(assert) {
    $("#infoBox").html("");
    if (!window.counter){window.counter = 1;}
    const ms = await navigator.mediaDevices.getUserMedia({video: true});
    const audioTrack = ms.getVideoTracks()[0];
    assert.equal(audioTrack.kind, "video", "摄像头可以打开");
    ms.getTracks().forEach((track)=>{
      track.stop();
    });
  });

  QUnit.test('摄像头分辨率测试', async function(assert) {
    $("#infoBox").html("");
    if (!window.counter){window.counter = 1;}
    const appkey = $('#appkey').val()
    const token = $('#token').val() || ''
    const resolutions = [
      ["VIDEO_QUALITY_180p", 320, 180],
      ["VIDEO_QUALITY_480p", 640, 480],
      ["VIDEO_QUALITY_720p", 1280, 720],
      ["VIDEO_QUALITY_1080p", 1920, 1080],
    ];
    const client = NERTC.createClient({
      appkey,
      token,
      debug: true,
    });
    const ms = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    const videoTrack = ms.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    const cameraId = capabilities.deviceId;
    videoTrack.stop();
    for (let resolution of resolutions){
      if (resolution[1] > capabilities.width.max || resolution[2] > capabilities.height.max){
        assert.ok(true, `不支持分辨率 ${resolution[0]}，但仍可通过兼容的分辨率进行通话`);
        continue;
      }
      let localStream = NERTC.createStream({
        client: client,
        uid: counter++,
        cameraId: cameraId,
        audio: false,
        video: true
      });
      window.localStream = localStream;
      localStream.setVideoProfile({resolution: NERTC.VIDEO_QUALITY[resolution[0]]});
      await localStream.init();
      await localStream.play(document.querySelector("#infoBox"));
      assert.true(true, `正在使用分辨率${resolution[0]} ${resolution[1]}x${resolution[2]}进行摄像头测试`);
      localStream.setLocalRenderMode({  // 本地视频容器尺寸
        width: 100,
        height: 100,
        cut: false // 默认不裁剪
      });
      for (var i = 0; i < 10; i++){
        if (!$("#infoBox").children().children()[0].videoWidth){
          console.log("Video没有播放，等待中。。。");
          await new Promise((res)=>{setTimeout(res, 500)});
        }
      }
      if ($("#infoBox").children().children()[0].videoWidth === resolution[1]){
        assert.true(true, `视频的宽度为 ${$("#infoBox").children().children()[0].videoWidth}`);
      } else {
        assert.true(false, `视频的宽度为 ${$("#infoBox").children().children()[0].videoWidth}，预期为 ${resolution[1]}，摄像头并不支持该分辨率`);
      }
      if ($("#infoBox").children().children()[0].videoHeight === resolution[2]){
        assert.true(true, `视频的高度为 ${$("#infoBox").children().children()[0].videoHeight}`);
      } else {
        assert.true(false, `视频的宽度为 ${$("#infoBox").children().children()[0].videoHeight}，预期为 ${resolution[2]}，摄像头并不支持该分辨率`);
      }
      localStream.getVideoTrack().stop();
      localStream.stop();
      localStream.destroy();
    }
  });
});