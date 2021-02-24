QUnit.module('连接测试', function() {
  
  QUnit.test('发布测试', async function (assert) {
    $("#infoBox").html(`<div id="publisherWrapper" style="width:40%;float: left;"></div><div id="publisherChart" style="width: 60%;float: left;"></div>`);
    if (!window.counter){window.counter = 1;}
    const appkey = $('#appkey').val()
    const token = $('#token').val() || ''

    const highchartOptions = {
      title:  {text: "发送端码率"},
      yAxis: {
        title: {
          text: 'bitrate'
        }
      },
      series: [],
    };

    const resolutions = [
      ["VIDEO_QUALITY_180p", 320, 180],
      ["VIDEO_QUALITY_480p", 640, 480],
      ["VIDEO_QUALITY_720p", 1280, 720],
      ["VIDEO_QUALITY_1080p", 1920, 1080],
    ];
    
    const chart = Highcharts.chart(document.querySelector("#publisherChart"), highchartOptions);
    
    for (let resolution of resolutions){
      const series = chart.addSeries({
        name: resolution[0],
        data: [],
      });
      console.log("New series", series);
      
      const uid = counter++;
      const client = WebRTC2.createClient({
        uid: uid,
        appkey: appkey,
        token,
        debug: true,
      });
      const localStream = WebRTC2.createStream({
        client: client,
        uid: "" + uid,
        audio: false,
        video: true
      });
      window.client = client;
      window.localStream = localStream;
      const joinResult = await client.join({
        "channelName": `channel_${uid}`,
        "uid": "" + uid
      });
      assert.true(true, `uid ${uid} 加入房间 channel_${uid} 成功，信令通道可以连通。`);
      await localStream.init();
      const localViewConfig = {
        width: 400,
        height: 400,
      };
      localStream.setLocalRenderMode(localViewConfig)
      localStream.play(document.querySelector("#publisherWrapper"));

      const videoSendBitrate = series;
      // const audioSendBitrate = chart.series[1];

      const publishResult = await client.publish(localStream);
      assert.true(true, `uid ${uid} 发布音视频流成功，WebRTC通道可以连通。`);
      console.log("publishResult", publishResult);
      let videoSendMax = 0;
      let audioSendMax = 0;
      const addPoint = async ()=>{
        const videoStats = await client.getLocalVideoStats();
        if (videoStats && videoStats[0]){
          videoSendBitrate.addPoint(videoStats[0].SendBitrate);
          videoSendMax = Math.max(videoSendMax, videoStats[0].SendBitrate);
        }
        // const audioStats = await client.getLocalAudioStats();
        // if (audioStats && audioStats[0]){
        //   audioSendBitrate.addPoint(audioStats[0].SendBitrate);
        //   audioSendMax = Math.max(audioSendMax, audioStats[0].SendBitrate);
        // }
        // console.log("videoStats", videoStats[]);
      };
      addPoint();
      const interval = setInterval(addPoint, 1000);
      await new Promise(async (resolve)=>{
        setTimeout(resolve, 10500);
      });
      clearInterval(interval);
      const browserInfo = browserDetect();
      if (browserInfo.name === "safari"){
        console.log("Safari不支持getLocalStats，跳过相关检测。");
        return;
      } else {
        assert.gte(videoSendMax, 10, `Video send Bitrate OK ${videoSendMax}`);
      }
      try{
        $("#publisherWrapper").html("");
        localStream.mediaHelper.videoStream.getTracks().forEach((track)=>{track.stop()});
      }catch(e){
        console.warn(e);
      }
    }
  });

});