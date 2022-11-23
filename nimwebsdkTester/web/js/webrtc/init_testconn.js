const CONNECTIONS_TEST = [
  {
    id: 1,
    group: "测试服",
    name: "测试服1",
    address: "115-236-118-14.netease.im/?ip=115.236.118.14:6999",
  },
  {
    id: 2,
    group: "测试服",
    name: "测试服2",
    address: "49-7-8-171.netease.im/?ip=49.7.8.171:6999",
  },
]

const CONNECTIONS_PRODUCTION = [
  {
    id: 101,
    group: "正式服",
    name: "南通电信",
    address: "61-147-208-69.netease.im/?ip=61.147.208.69:6999",
  },
  {
    id: 102,
    group: "正式服",
    name: "杭州电信",
    address: "115-236-121-102.netease.im/?ip=115.236.121.102:6999"
  },
  {
    id: 103,
    group: "正式服",
    name: "加利福尼亚 洛杉矶",
    address: "107-151-183-137.netease.im/?ip=107.151.183.137:6999"
  },
  {
    id: 104,
    group: "正式服",
    name: "日本",
    address: "202-226-26-226.netease.im/?ip=202.226.26.226:6999"
  },
]

const CONNECTIONS = WebRTC2.ENV === "production" ? CONNECTIONS_PRODUCTION : CONNECTIONS_TEST

for (let server of CONNECTIONS){
  formatServer(server)
}

function formatServer (server){
  if (!server.name){
    server.name = "测试服" + server.id
  }
  server.status = "UNINIT"
  server.showDetail = false
  server.connMs = -1
  server.joinMs = -1
  server.iceConnectMs = -1
  server.joinResult = ""
  server.lastMs = 0
  server.iceConnectionState = ""
  server.candidateSummary = ""
  server.candidatePairInfo = ""
  server.channelName = ""
  server.streamAddedMs = -1
  server.p2s = {
    speed: -1,
    rtt: -1,
    lost: -1
  }

  server.localAddress = ""
  // server.localCandidateType = ""
  // server.localNetworkType = ""
  // server.localPort = -1
  // server.localProtocol = ""
  // server.localRelayProtocol = ""

  server.remoteAddress = ""
  // server.remoteCandidateType = ""
  // server.remotePort = -1
  // server.remoteProtocol = ""
  // server.remoteRelayProtocol = ""
  console.log(server)
}

let vueApp = null

const main = async ()=>{
  if (!rtc.videoSource){
    rtc.videoSource = fakeMediaDevices.getFakeMedia({video: {
        type: "randomcolor",
        width: 640,
        height: 480,
      }}).video.track
  }
  rtc.videoSource.contentHint = "motion"
  vueApp = new Vue({
    data: {
      enableIce: false,
      mode: "uninit",
      CONNECTIONS,
      addresses: [],
    },
    methods: {
      testConnection: testConnection,
      unloadConnection: unloadConnection,
    },
    el: document.getElementById("vueApp")
  })
  console.log("vueApp", vueApp)
}

rtc = {}

NERTC.getParameters().joinFirstTimeout = 20000
NERTC.getParameters().joinMaxRetry = 1

clients = {}

async function unloadConnection(id) {
  
  const conn = CONNECTIONS.find((c)=> c.id === id)
  conn.status = "ENDED"
  if (clients[id + "_send"]){
    try{
      await clients[id + "_send"].leave()
    }catch(e){
      console.error(e)
    }
    clients[id + "_send"] = null
  }
  if (clients[id + "_recv"]){
    try{
      await clients[id + "_recv"].leave()
    }catch(e){
      console.error(e)
    }
    clients[id + "+recv"] = null
  }
}

async function testStateless(){
  const endpoint = "https://wecan-api.netease.im"
  const appkey = "4c89d65432637918a7d603e402705b21"
  const clientId = "1"
  const streamName = "derek" + Date.now() % 10000
  const direction = "send"
  const update = false
  
  const pc = new RTCPeerConnection()
  window.statelessPC = pc;

  pc.onnegotiationneeded = async function(){
    console.log("onnegotiationneeded ", streamName, direction)
    let offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    console.debug(offer.sdp)
    console.log("发起HTTP请求", direction)
    // https://office.netease.com/doc/?identity=82a89a50e99a43879cd220f5cddaf343
    const resp = await axios.post(`${endpoint}/v1/rtc/${direction === "send" ? "publish" : "play"}`, {
      appkey: appkey,
      token: "",
      streamName,
      clientId,
      update,
      jsep: offer,
      appData: {
        videoCodecOnly: "h264",
      },
    })
    console.log(streamName, direction, resp)
    const data = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    document.getElementById(direction + "TraceId").innerText = data.traceId

    if (data?.jsep?.sdp){
      console.debug(data.jsep.sdp)
      data.jsep.type = "answer"
      const answer = new RTCSessionDescription(data.jsep)
      try{
        await pc.setRemoteDescription(answer)
      }catch(e){
        document.getElementById(direction + "State").innerText = e.name + " " + e.message
        throw(e)
      }
      if (direction === "send"){
        console.log("发送端连接建立成功")
      }
    }else{
      console.error("请求失败:", data)
      document.getElementById(direction + "State").innerText = JSON.stringify(data)
    }
  }
  pc.onsignalingstatechange = (evt)=>{
    console.log("onsignalingstatechange", pc.signalingState)
    document.getElementById(direction + "SignalingState").innerText = "signalingState:" + pc.signalingState
  }
  const p = new Promise((resolve)=>{
    let timer
    pc.oniceconnectionstatechange = async ()=>{
      clearTimeout(timer)
      document.getElementById(direction + "IceConnectionState").innerText = "signalingState:" + pc.iceConnectionState
      if (pc.iceConnectionState === "closed"){
        console.error("testStateless结束")
        resolve(pc.iceConnectionState)
        return
      }else{
        timer = setTimeout(pc.oniceconnectionstatechange, 3000)
      }
      console.log(pc.iceConnectionState)
      if (pc.iceConnectionState === "connected"){
        let networkTypes = []
        let candidates = []
        const stats = await pc.getStats()
        stats.forEach((stat)=>{
          if (stat.networkType){
            networkTypes.push(stat.networkType + " " + stat.protocol)
          }
          if (stat.type === "local-candidate"){
            console.log(stat.type, stat.id, stat)
            candidates.push(stat)
          }
        })
        document.getElementById("networkType").innerText = networkTypes.join("/")
        document.getElementById("statelessCandidateInfo").innerText = JSON.stringify(candidates, null, 2)
      }
    }
  })
  // 准备本地流
  // if (!rtc.videoSource){
  //   rtc.videoSource = fakeMediaDevices.getFakeMedia({video: {
  //     type: "randomcolor",
  //     }}).video.track
  // }
  const videoSource = rtc.videoSource
  pc.addTrack(videoSource)
  const timeout = parseInt(document.getElementById("connTime").value) * 1000
  console.log("timeout", timeout)
  setTimeout(()=>{
    pc.close()
  }, timeout)
  return p
}

async function testConnection(id){
  if (clients[id + "_send"]){
    await clients[id].leave()
  }
  if (clients[id + "_recv"]){
    await clients[id + "_recv"].leave()
  }
  const conn = CONNECTIONS.find((c)=> c.id === id)
  conn.status = "INITING"
  console.log("testConnection")
  const clientSend = NERTC.createClient({
    appkey: WebRTC2.ENV === "production" ? "6acf024e190215b685905444b6e57dd7" : "eca23f68c66d4acfceee77c200200359",
    debug: true
  })
  const clientRecv = NERTC.createClient({
    appkey: WebRTC2.ENV === "production" ? "6acf024e190215b685905444b6e57dd7" : "eca23f68c66d4acfceee77c200200359",
    debug: true
  })
  
  NERTC.Logger.setLogLevel(NERTC.Logger.ERROR)
  if (vueApp.enableIce){
    const iceServer = {
      urls: document.getElementById("iceUrl").value.split(","),
      username: document.getElementById("iceUsername").value,
      credential: document.getElementById("iceCredential").value,
    }
    if (iceServer.urls.length){
      clientSend.adapterRef.testConf.iceServers = [iceServer]
      clientSend.adapterRef.testConf.iceTransportPolicy = document.getElementById("iceTransportPolicy").value
      clientRecv.adapterRef.testConf.iceServers = [iceServer]
      clientRecv.adapterRef.testConf.iceTransportPolicy = document.getElementById("iceTransportPolicy").value
      console.warn("启用Ice",
        clientSend.adapterRef.testConf.iceServers.length,
        clientSend.adapterRef.testConf.iceServers,
        clientSend.adapterRef.testConf.iceTransportPolicy
      )
    }else{
      alert("没有iceServer")
    }
  }
  
  rtc.clientSend = clientSend
  rtc.clientRecv = clientRecv
  clients[id + "_send"] = clientSend
  clients[id + "_recv"] = clientRecv
  
  const channelName = "testconn" + Math.floor(Math.random() * 9000 + 1000)
  conn.channelName = channelName
  
  const start = Date.now()
  const joinOptionsSend = {
    wssArr: [conn.address],
    channelName: channelName,
    uid: 1,
  }
  const joinOptionsRecv = {
    wssArr: [conn.address],
    channelName: channelName,
    uid: 2,
  }
  try{
    await clientSend.join(joinOptionsSend)
    await clientRecv.join(joinOptionsRecv)
    conn.status = "SUCCESS"
    conn.joinMs = Date.now() - (clientSend.adapterRef._signalling?._protoo?._data?.openTs || start)
    conn.joinResult = "SUCCESS"
  }catch(e){
    conn.status = "FAIL"
    console.error(e)
    conn.joinResult = "ERROR" + JSON.stringify(e)
    return
  }
  if (clientSend.adapterRef._signalling?._protoo?._data){
    conn.connMs = clientSend.adapterRef._signalling?._protoo._data.openTs - clientSend.adapterRef._signalling?._protoo._data.createTs
  }
  /////////////
  const recvPC = clientRecv.adapterRef._mediasoup?._recvTransport?._handler?._pc
  // 监听ice状态
  let timer = null
  const iceStart = Date.now()
  const handleIceChange = async (evt)=>{
    clearTimeout(timer)
    if (recvPC.iceConnectionState === "failed" || recvPC.iceConnectionState === "closed"){
      console.error("recvPC.iceConnectionState", recvPC.iceConnectionState)
    }else{
      timer = setTimeout(handleIceChange, 2000)
    }
    // console.error("handleIceChange", sendPC.iceConnectionState, evt)
    conn.iceConnectionState = recvPC.iceConnectionState
    conn.lastMs = Date.now() - start
    if (conn.status === "ENDED"){
      return
    }
    if (recvPC.iceConnectionState === "connected"){
      if (conn.joinResult !== "ICESUCCESS"){
        conn.joinResult = "ICESUCCESS"
        conn.iceConnectMs = Date.now() - iceStart
        // 不知道什么原理，chrome收不到 iceConnectionState为completed的事件
        await new Promise((res)=>setTimeout(res, 200))
      }
    }
    const info = await getIceCandidatePair(recvPC);
    conn.candidateSummary = info.result
    conn.p2s.rtt = info.rtt
    conn.p2s.rttAverage = info.rttAverage
    if (info.speed > 0){
      conn.p2s.speed = info.speed
    }
    conn.p2s.speedAverage = info.speedAverage
    conn.p2s.lost = info.lost
    conn.p2s.lostAverage = info.lostAverage
    // console.error("info", info)
    conn.candidatePairInfo = JSON.stringify(info.pair, null, 2)
    conn.localAddress = JSON.stringify(info.local, null, 2)
    conn.remoteAddress = JSON.stringify(info.remote, null, 2)
  }
  if (recvPC){
    rtc.recvPC = recvPC
    recvPC.addEventListener('iceconnectionstatechange', handleIceChange)
  }
  
  // 准备本地流
  // if (!rtc.videoSource){
  //   rtc.videoSource = fakeMediaDevices.getFakeMedia({video: {
  //     type: "randomcolor",
  //     }}).video.track
  // }
  const videoSource = rtc.videoSource
  console.log("videoSource", videoSource)
  const localStream = NERTC.createStream({
    video: true,
    videoSource,
    clientSend,
  })
  await localStream.init()
  const maxBitrate = parseInt(document.getElementById("encoderMbps").value) * 1000
  const options = {
    mediaType: "video",
    streamType: "high",
    maxBitrate: maxBitrate,
  }
  console.log("上行视频编码设置", options)
  localStream.setVideoEncoderConfiguration(options)
  // 设置拉流
  const publishStart = Date.now()
  clientRecv.on('stream-added', (evt)=>{
    console.error('stream-added', evt);
    if (evt.stream.streamID === joinOptionsSend.uid){
      conn.streamAddedMs = Date.now() - publishStart
      clientRecv.subscribe(evt.stream)
    }
  })
  // 开始推流
  await clientSend.publish(localStream)
}

let infoHistory = []

async function getIceCandidatePair(pc){
  const info = {
    ts: Date.now(),
    result: "",
    transport: null,
    local: [],
    remote: [],
    rtt: -1,
    speed: -1,
    lost: -1,
    rttAverage: -1,
    speedAverage: -1,
    lostAverage: -1,
    pair: null
  }
  const stats = await pc.getStats(null)
  const statsArr = []
  rtc.statsArr = statsArr
  const transports = []
  stats.forEach((item, key)=>{
    // console.error(item.type, item.id, item)
    delete item.timestamp
    statsArr.push(item)
    if (item.type === "local-candidate"){
      info.local.push(item)
    }
    if (item.type === "remote-candidate"){
      info.remote.push(item)
    }
    if (item.type === "candidate-pair" && item.selected === true){
      // Firefox
      info.pair = item
      info.result += `${item.state} `
    }
    if (item.type === "transport"){
      transports.push(item)
      info.transport = item
    }
    if (item.type === "inbound-rtp"){
      info.packetsReceived = item.packetsReceived
      info.packetsLost = item.packetsLost
    }
  })
  if (!transports.length && !info.pair){
    info.result = "没有transport"
    return info
  }
  transports.forEach((transport)=>{
    const candidatePair = statsArr.find((stats)=>{
      return stats.id === transport.selectedCandidatePairId
    })
    if (candidatePair) {
      info.pair = candidatePair
      info.result += `${candidatePair.state} `
    }
  })
  if (info.pair){
    const candidatePair = info.pair
    const history = infoHistory.find((i)=>{
      // console.error(i.pair?.id, info.pair.id)
      return i.pair?.id === info.pair.id
    })
    infoHistory.reverse()
    const historyEarly = infoHistory.find((i)=>{
      // console.error(i.pair?.id, info.pair.id)
      return i.pair?.id === info.pair.id
    })
    infoHistory.reverse()
    info.totalRoundTripTime = candidatePair.totalRoundTripTime
    info.responsesReceived = candidatePair.responsesReceived
    // console.error("candidatePair", candidatePair)
    info.bytesRecv = candidatePair.bytesReceived
    info.rttAverage = Math.floor((info.totalRoundTripTime) / (info.responsesReceived) * 1000)
    
    if (history){
      if(info.responsesReceived - history.responsesReceived > 0){
        info.rtt = Math.floor((info.totalRoundTripTime - history.totalRoundTripTime) / (info.responsesReceived - history.responsesReceived) * 1000)
      }else{
        info.rtt = history.rtt
      }
      if (info.bytesRecv && history.bytesRecv){
        // kbps
        info.speed = (info.bytesRecv - history.bytesRecv) * 8 / (info.ts - history.ts)
      }
      // console.error("info.packetsReceived", info.packetsReceived)
      if (info.packetsReceived && history.packetsReceived){
        info.lost = (info.packetsLost - history.packetsLost) / (info.packetsReceived - history.packetsReceived + info.packetsLost - history.packetsLost)
      }
    }
    if (historyEarly){
      // 最早记录
      info.speedAverage = (info.bytesRecv - historyEarly.bytesRecv) * 8 / (info.ts - historyEarly.ts)
      info.lostAverage = (info.packetsLost - historyEarly.packetsLost) / (info.packetsReceived - historyEarly.packetsReceived + info.packetsLost - history.packetsLost)
    }
    const localCandidate = statsArr.find((stats)=>{
      return stats.id === candidatePair.localCandidateId
    })
    if (localCandidate){
      if (localCandidate.address){
        if (vueApp.addresses.indexOf(localCandidate.address) === -1){
          vueApp.addresses.push(localCandidate.address)
        }
      }
      if (localCandidate.relayProtocol){
        info.result += `【relay ${localCandidate.relayProtocol}】`
      }
      if (localCandidate.networkType && localCandidate.networkType !== "wifi"){
        info.result += `【${localCandidate.networkType}】`
      }
      info.result += `|local:${localCandidate.protocol} `
      info.result += `${localCandidate.address}:${localCandidate.port} ${localCandidate.candidateType} ${localCandidate.networkType}`
    }else{
      info.result += `|无法找到localCandidate ${candidatePair.localCandidateId}`
    }
    const remoteCandidate = statsArr.find((stats)=>{
      return stats.id === candidatePair.remoteCandidateId
    })
    if (remoteCandidate){
      info.result += `|remote:${remoteCandidate.protocol} `
      info.result += `${remoteCandidate.address}:${remoteCandidate.port} ${remoteCandidate.candidateType}`
    }else{
      info.result += `|无法找到remoteCandidate ${candidatePair.remoteCandidateId}`
    }
  }else{
    info.result += `无法找到candidatePair`
  }
  infoHistory.unshift(info)
  if (infoHistory.length > 100){
    infoHistory.pop()
  }
  return info
}

const addConnection = ()=>{
  const id = Math.max.apply(Math, CONNECTIONS.map(conn => conn.id)) + 1
  console.log("id", id)
  const server = {
      id,
      group: "自定义地址",
      name: document.getElementById("customName").value || "新服" + id,
      address: document.getElementById("customAddress").value
    };
  formatServer(server)
  vueApp.CONNECTIONS.push(server)
}

async function startAllTests(){
  console.log("Here");
  vueApp.mode = "test_all"
  for (let server of CONNECTIONS){
    try{
      await vueApp.testConnection(server.id)
      console.warn("连接成功", server.id)
    }catch(e){
      console.error("连接失败", server.id, e.name, e.message)
      continue;
    }
    const connTime = parseInt(document.getElementById("connTime").value) * 1000
    console.log(`${connTime}毫秒后关闭测试${server.id}`)
    await new Promise((resolve)=>{
      setTimeout(async ()=>{
        console.error(`开始关闭测试 ${server.id}`)
        await unloadConnection(server.id)
        resolve()
      }, connTime)
    }, connTime)
  }
}

console.log("CONNECTIONS", CONNECTIONS)
main()