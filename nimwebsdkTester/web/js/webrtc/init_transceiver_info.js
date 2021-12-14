// 采集状态、上行状态、下行状态

const historyStats = {

}
const captureTimer = setInterval(async ()=>{
  if (!rtc.client){
    return
  }
  let audioInfo = "";
  if (rtc.localStream){
    audioInfo += `数量：${rtc.localStream?.mediaHelper.getAudioInputTracks().length}`
    if (rtc.localStream?.mediaHelper.audio.audioRoutingEnabled) {
      audioInfo += " 混音中"
    }
    const sender = rtc.localStream.getSender("audio", "high")
    if (sender?.track){
      audioInfo += " 发布中"
    }
  }
  $("#audioStatus").text(audioInfo)

  const transceivers = rtc.client?.adapterRef?._mediasoup?._sendTransport?.handler?._pc?.getTransceivers() || []
  NERTC.getParameters().tracks.audio.forEach((track, index)=>{
    if (track){
      const trackId = "track_status_" + track.id.split(/\W/).join("")
      let content = "";
      const matchedTransceivers = transceivers.filter((t =>{
        return t?.sender?.track?.id === track.id;
      }))
      content += matchedTransceivers.map((transceiver)=>{
        return "mid" + transceiver.mid
      }).join("");
      content += `#${index}`;

      if (!track.enabled){
        content += " disabled";
      }
      if (track.muted){
        content += " muted";
      }
      if (track?.constructor?.name !== "MediaStreamTrack"){
        content += " [" + track?.constructor?.name + "]"
      }
      content += ` ${track.label}`;
      if (track.readyState === "ended"){
        content = `<del>${content}</del>`
      }else{
        content = `<span onclick="stopTrack('${track.id}')">[拔出]</span>` + content
      }
      if ($("#" + trackId).length === 0){
        $("#audioTrackStatus").append(`<li id="${trackId}">${content}</li>`)
        $("#" + trackId).attr("title", content);
      }else if($("#" + trackId).html() !== content){
        $("#" + trackId).html(content)
        $("#" + trackId).attr("title", content);
      }
    }
  })
  NERTC.getParameters().tracks.video.forEach((track, index)=>{
    if (track){
      const trackId = "track_status_" + track.id.split(/\W/).join("")
      let content = "";
      const matchedTransceivers = transceivers.filter((t =>{
        return t?.sender?.track?.id === track.id;
      }))
      content += matchedTransceivers.map((transceiver)=>{
        return "mid" + transceiver.mid;
      }).join("")

      const settings = track.getSettings();
      content += `#${index}`;
      if (!track.enabled){
        content += " disabled";
      }
      if (track.muted){
        content += " muted";
      }
      if (settings.width || settings.height || settings.frameRate) {
        content += ` ${parseInt(settings.width)}x${parseInt(settings.height)}x${parseInt(settings.frameRate)}`
      }
      if (track?.constructor?.name !== "MediaStreamTrack"){
        content += " [" + track?.constructor?.name + "]"
      }
      content += ` ${track.label}`;
      if (track.readyState === "ended"){
        content = `<del>${content}</del>`
      }else{
        content = `<span onclick="stopTrack('${track.id}')">[拔出]</span>` + content
      }
      if ($("#" + trackId).length === 0){
        $("#videoTrackStatus").append(`<li id="${trackId}">${content}</li>`)
        $("#" + trackId).attr("title", content);
      }else if($("#" + trackId).html() !== content){
        $("#" + trackId).html(content)
        $("#" + trackId).attr("title", content);
      }
    }
  })


  // 上行状态
  if (rtc.client?.adapterRef?._mediasoup?._sendTransport?._handler?._pc){
    const transceivers = rtc.client.adapterRef._mediasoup._sendTransport._handler._pc.getTransceivers()
    let html = "";
    let upstreamBitrate = 0;
    for (let i = 0; i < transceivers.length; i++){
      const transceiver = transceivers[i];
      let li = "#" + transceiver.mid
      let title = "";
      const sender = transceiver.sender
      if (sender.track){
        li += " " + sender.track.kind;
        if (sender.track.kind === "video"){
          const settings = sender.track.getSettings();
          if (settings.width || settings.height){
            li += ` ${settings.width}x${settings.height}`
          }
        }
        if (sender.track.enabled === false){
          li += " disabled"
        }
        if (sender.track.muted){
          li += " muted"
        }
        if (sender.track.readyState !== "live"){
          li += " " + sender.track.readyState
        }
        const statsNow = await sender.getStats();
        statsNow.forEach((item)=>{
          // console.error("item", item.type, item.id, item);
          const itemHistory = historyStats[item.id]
          historyStats[item.id] = JSON.parse(JSON.stringify(item))
          if (item.type === "outbound-rtp"){
            // li += " ssrc " + item.ssrc
            if (itemHistory){
              // 计算码率
              if (item.type === "outbound-rtp") {
                const bitrate = Math.floor(8 * (item.bytesSent - itemHistory.bytesSent) / (item.timestamp - itemHistory.timestamp))
                li += " " + bitrate + "kbps"
                upstreamBitrate += bitrate
              }
            }
            if (item.keyFramesEncoded){
              li += " I帧：" + item.keyFramesEncoded
            }
            // console.error("item", item.type, item.id, item);
          }
          if (item.type === "codec"){
            title += " " + item.mimeType
          }
          if (item.type === "transport"){
            title += "\ndtlsCipher:" + item.dtlsCipher + " " + item.dtlsState
            title += "\nsrtpCipher:" + item.srtpCipher
          }
        })
      }
      if (sender.transport){
        if (sender.transport.state !== "connected"){
          li += " " + sender.transport.state
        }
      }else{
        li += " NOTRANSPORT"
      }
      html += `<li title="${title}">${li}</li>`
    }
    $("#senderStatus").html(html)
    $("#upstreamBitrate").text(upstreamBitrate + "kbps");
  }
  
  // 下行状态
  if (rtc.client?.adapterRef?._mediasoup?._recvTransport?._handler?._pc){
    const transceivers = rtc.client.adapterRef._mediasoup._recvTransport._handler._pc.getTransceivers()
    let html = "";
    let downstreamBitrate = 0;
    for (let i = 0; i < transceivers.length; i++){
      const transceiver = transceivers[i];
      let li = "#" + transceiver.mid
      let title = "";
      const receiver = transceiver.receiver
      if (receiver.track){
        li += " " + receiver.track.kind;
        if (receiver.track.kind === "video"){
          const settings = receiver.track.getSettings();
          if (settings.width || settings.height){
            li += ` ${settings.width}x${settings.height}`
          }
        }
        if (receiver.track.enabled === false){
          li += " disabled"
        }
        if (receiver.track.muted){
          li += " muted"
        }
        if (receiver.track.readyState !== "live"){
          li += " " + receiver.track.readyState
        }
        const statsNow = await receiver.getStats();
        statsNow.forEach((item)=>{
          // console.error("item", item.type, item.id, item)
          const itemHistory = historyStats[item.id]
          historyStats[item.id] = JSON.parse(JSON.stringify(item))
          if (item.type === "inbound-rtp"){
            // li += " ssrc " + item.ssrc
            if (itemHistory){
              // 计算码率
              if (item.type === "inbound-rtp") {
                // console.error("item.bytesReceived", item.bytesReceived, item.timestamp);
                const bitrate = Math.floor(8 * (item.bytesReceived - itemHistory.bytesReceived) / (item.timestamp - itemHistory.timestamp))
                li += " " + bitrate + "kbps"
                downstreamBitrate += bitrate;
              }
            }
            if (item.keyFramesDecoded >= 0){
              li += " I帧："+ item.keyFramesDecoded
            }
          }
          if (item.type === "transport"){
            title += "\ndtlsCipher:" + item.dtlsCipher + " " + item.dtlsState
            title += "\nsrtpCipher:" + item.srtpCipher
          }
        })
      }
      if (receiver.transport){
        if (receiver.transport.state !== "connected"){
          li += " " + receiver.transport.state
        }
      }
      html += `<li title="${title}">${li}</li>`
    }
    $("#receiverStatus").html(html)
    $("#downstreamBitrate").text(downstreamBitrate + "kbps");
  }

  // 订阅状态
  if (rtc.client?.adapterRef.remoteStreamMap){
    let html = "";
    for (let uid in rtc.client.adapterRef.remoteStreamMap){
      const remoteStream = rtc.client.adapterRef.remoteStreamMap[uid];
      let li = `remote#${remoteStream.getId()}<ul>`
      for (let mediaType of ["audio", "video", "screen"]){
        li += `<li>${mediaType}`
        if (!remoteStream.pubStatus[mediaType].producerId){
          li += ` 未发布`
        }
        const subStatus = rtc.client.getSubStatus(remoteStream, mediaType)
        if (subStatus.subscribable){
          li += " 可订阅"
        }
        li += " " + subStatus.status
        li += "</li>"
      }
      li += "</ul>"
      html += `<li>${li}</li>`
    }
    $("#subStatus").html(html)
  }
  
  if (rtc.client.adapterRef._mediasoup){
    let targetPubStatus = ""
    if (rtc.client.adapterRef.localStream){
      targetPubStatus += "发布"
      if (rtc.client.adapterRef.localStream !== rtc.localStream){
        targetPubStatus += "!当前发布流异常"
      }
    }else{
      targetPubStatus += "不发布"
    }
    if (rtc.client.adapterRef.connectState.curState !== 'CONNECTED'){
      targetPubStatus += ` ${rtc.client.adapterRef.connectState.curState}`
    }
    if ($('#targetPubStatus').text() !== targetPubStatus){
      $('#targetPubStatus').text(targetPubStatus)
    }
    let currentPubStatus = ""
    let highlight = false
    if (rtc.client.adapterRef._mediasoup._micProducerId){
      currentPubStatus += "音频"
      if (rtc.client.adapterRef.localStream?.pubStatus.audio.audio !== !!rtc.client.adapterRef._mediasoup._micProducerId){
        highlight = true
      }
    }
    if (rtc.client.adapterRef._mediasoup._webcamProducerId){
      currentPubStatus += " 视频"
      if (rtc.client.adapterRef.localStream?.pubStatus.video.video !== !!rtc.client.adapterRef._mediasoup._webcamProducerId){
        highlight = true
      }
    }
    if (rtc.client.adapterRef._mediasoup._screenProducerId){
      currentPubStatus += " 屏幕共享"
      if (rtc.client.adapterRef.localStream?.pubStatus.screen.screen !== !!rtc.client.adapterRef._mediasoup._screenProducerId){
        highlight = true
      }
    }
    if (highlight){
      $('#currentPubStatus').addClass("highlight")
    }else{
      $('#currentPubStatus').removeClass("highlight")
    }
    if ($('#currentPubStatus').html() !== currentPubStatus){
      $('#currentPubStatus').text(currentPubStatus)
    }
  }

}, 1000)

const stopTrack = function(trackId){
  const tracks = [].concat(NERTC.getParameters().tracks.audio, NERTC.getParameters().tracks.video)
  const track = tracks.find((t)=>{return t.id === trackId})
  console.warn("模拟拔出设备：", trackId, track);
  track.stop()
  track.dispatchEvent(new Event("ended"))
}