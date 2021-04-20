QUnit.module('发布-接收测试', function() {
  
  QUnit.test('发布-接收测试', async function (assert) {
    $("#infoBox").html(`<div id="subscriberWrapper" style="width:40%;float: left;"></div><div id="subscriberChart" style="width: 60%;float: left;"></div>`);
    if (!window.counter){window.counter = 1;}
    const appkey = $('#appkey').val()
    const token = $('#token').val() || ''
    
    // 发布端
    const uid = counter++;
    const client = WebRTC2.createClient({
      uid: uid,
      appkey: appkey,
      token,
      debug: true,
    });
    const localStream = WebRTC2.createStream({
      client: client,
      uid: uid,
      audio: true,
      video: true
    });
    window.client = client;
    window.localStream = localStream;
    const joinResult = await client.join({
        "channelName": `channel_${uid}`,
        "uid": uid
    });
    assert.true(true, `uid ${uid} 加入房间 channel_${uid} 成功`);
    await localStream.init();
    
    // 接收端
    const subUid = counter++;
    const subClient = WebRTC2.createClient({
      uid: subUid,
      appkey: appkey,
      token,
      debug: true,
    });
    window.subClient = subClient;
    let flag = 0;
    let videoRecvMax = 0;
    let audioRecvMax = 0;
    let interval = null;
    subClient.on('stream-subscribed', async evt => {
      flag ++;
      if (flag !== 2){
        console.error("Skip");
        return;
      }
      console.warn('订阅别人的流成功的通知')
      var remoteStream = evt.stream;
      window.remoteStream = remoteStream;
      remoteStream.play(document.querySelector("#subscriberWrapper"));
      remoteStream.setRemoteRenderMode({
        width: 400,
        height: 400,
      });
      const highchartOptions = {
        title:  {text: "接收端码率"},
        yAxis: {
          title: {
            text: 'bitrate'
          }
        },
        series: [{
          name: '视频',
          data: [],
        }, {
          name: '音频',
          data: []
        }],
      };
      const chart = Highcharts.chart(document.querySelector("#subscriberChart"), highchartOptions);
      const videoRecvBitrate = chart.series[0];
      const audioRecvBitrate = chart.series[1];
      console.log("videoRecvBitrate", videoRecvBitrate);
      console.log("audioRecvBitrate", audioRecvBitrate);
      //........................................................................
      const addPoint = async ()=>{
        const videoStats = await subClient.getRemoteVideoStats();
        if (videoStats && videoStats[uid] && videoStats[uid].RecvBitrate){
          console.log("videoStats[uid]", videoStats[uid]);
          videoRecvBitrate.addPoint(videoStats[uid].RecvBitrate);
          videoRecvMax = Math.max(videoRecvMax, videoStats[uid].RecvBitrate);
        }
        const audioStats = await subClient.getRemoteAudioStats();
        console.log("audioStats", audioStats);
        if (audioStats && audioStats[uid] && audioStats[uid].RecvBitrate){
          audioRecvBitrate.addPoint(audioStats[uid].RecvBitrate);
          audioRecvMax = Math.max(audioRecvMax, audioStats[uid].RecvBitrate);
        }
        // console.log("videoStats", videoStats[]);
      };
      //........................................................................
      addPoint();
      interval = setInterval(addPoint, 1000);
    });
    await subClient.join({
      "channelName": `channel_${uid}`,
      "uid": subUid
    });
    await client.publish(localStream);

    subClient.on('stream-added', async (evt)=>{
      console.log('stream-added', evt);
      evt.stream.subConf = {
        video: true,
        audio: true,
        highOrLow: 0,
      };
      window.remoteStream = evt.stream;
      const subResult = await subClient.subscribe(evt.stream);
    });
    await new Promise(resolve=>{
      setTimeout(resolve, 10500);
    });
    clearInterval(interval);
    const browserInfo = browserDetect();
    if (browserInfo.name === "safari"){
      console.log("Safari不支持getLocalStats，跳过相关检测。");
      return;
    } else {
      assert.gte(videoRecvMax, 10, `Video Recv Bitrate OK ${videoRecvMax}`);
      assert.gte(audioRecvMax, 10, `Audio Recv Bitrate OK ${audioRecvMax}`);
    }
    try{
      localStream.mediaHelper.videoStream.getTracks().forEach((track)=>{track.stop()});
      localStream.mediaHelper.micStream.getTracks().forEach((track)=>{track.stop()});
    }catch(e){
      console.warn(e);
    }
  });

});