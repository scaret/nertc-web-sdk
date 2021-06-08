QUnit.module('麦克风', function() {
  QUnit.test('测试麦克风是否可以打开', async function (assert) {
    $("#infoBox").html("");
    if (!window.counter){window.counter = 1;}
    const ms = await navigator.mediaDevices.getUserMedia({audio: true});
    const audioTrack = ms.getAudioTracks()[0];
    assert.equal(audioTrack.kind, "audio", "可以拿到音频Track");
    ms.getTracks().forEach((track) => {
      track.stop();
    });
  });

  const browserInfo = browserDetect();
  if (browserInfo.name === "safari"){
    console.log("Safari不支持getAudioLevel，跳过相关检测。");
    return;
  }
  
  QUnit.test('麦克风音量测试', async function(assert) {
    $("#infoBox").html("");
    if (!window.counter){window.counter = 1;}
    const appkey = $('#appkey').val()
    const token = $('#token').val() || ''
    const client = NERTC.createClient({
      appkey,
      token,
      debug: true,
    });
    const localStream = NERTC.createStream({
      client: client,
      uid: counter++,
      audio: true,
      video: false
    });
    window.localStream = localStream;
    await localStream.init();
    if (!localStream.audio){
      assert.true(false, "未发现音频输入设备，退出麦克风检测。");
      return;
    }
    localStream.startMediaRecording({
      type: "audio",
    });
    // 音量大于等于0.2则为有声音
    let maxLevel = 0;
    // 发现有声音开始的时间戳
    let soundTs = 0;
    // 判断有声音以后延迟少毫秒结束样本
    const recordLastDelay = 1000;
    // 判断有声音以前多少毫秒播放样本
    const recordSamplePrefix = 100;
    // 无声音能容忍的最大时长
    const recordNoSoundTimeout = 10000;

    const startTs = Date.now();
    $("#infoBox").html("<h1 style='color:red;'><b>麦克风测试中，请对麦克风说话</b></h1>");
    let end = false;
    while(!end){
      await new Promise((resolve)=>{
        setTimeout(()=>{
          const audioLevel = localStream.getAudioLevel();
          console.log("audioLevel", audioLevel);
          maxLevel = Math.max(maxLevel, audioLevel);
          if (maxLevel >= 0.2 && !soundTs){
            soundTs = Date.now();
          }
          if (soundTs && (Date.now() - soundTs > recordLastDelay)){
            assert.gte(maxLevel, 0.2, "样本音量超过0.2，麦克风有声音");
            end = true;
          }
          if (!soundTs && Date.now() - startTs > recordNoSoundTimeout){
            // 没有录到样本，结束
            assert.gte(maxLevel, 0.2, "样本音量未超过0.2，麦克风没有声音");
            end = true;
          }
          resolve()
        }, 50);
      });
    }
    const endTime = Date.now();
    localStream.stopMediaRecording({recordId: 'abc'});
    await new Promise((resolve)=>{
      setTimeout(()=>{
        resolve();
      })
    }, 200);
    localStream.getAudioTrack().stop();
    $audioTag = $(`<audio autoplay src="${localStream._record._status.recordUrl}" controls current-time="${Math.max(soundTs - startTs - recordSamplePrefix, 0) / 1000}"></audio>`);
    $btnTag = $(`<button id="canHear">听得到</button><button id="cannotHear">听不到</button>`);
    $("#infoBox").html('');
    $("#infoBox").append($audioTag);
    $("#infoBox").append($btnTag);
    $audioTag[0].currentTime = Math.max(soundTs - startTs - recordSamplePrefix, 0) / 1000;

    await new Promise((resolve, reject)=>{
      $("#canHear").click(()=>{
        assert.true(true, "可以听到自己说的话");
        resolve();
      });
      $("#cannotHear").click(()=>{
        assert.true(false, "听不到自己说的话，设备可能出现问题，或扬声器音量太低");
        reject();
      });
    });
  });

});