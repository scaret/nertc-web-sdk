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
  vueApp = new Vue({
    data: {
      mode: "uninit",
      CONNECTIONS,
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
  if (clients[id]){
    try{
      await clients[id].leave()
    }catch(e){
      console.error(e)
    }
  }
  clients[id] = null
}

async function testConnection(id){
  if (clients[id]){
    await clients[id].leave()
  }
  const conn = CONNECTIONS.find((c)=> c.id === id)
  conn.status = "INITING"
  console.log("testConnection")
  const client = NERTC.createClient({
    appkey: WebRTC2.ENV === "production" ? "6acf024e190215b685905444b6e57dd7" : "eca23f68c66d4acfceee77c200200359",
    debug: true
  })
  const iceServer = {
    urls: document.getElementById("iceUrl").value.split(","),
    username: document.getElementById("iceUsername").value,
    credential: document.getElementById("iceCredential").value,
  }
  if (iceServer.urls && document.getElementById("enableIce").checked){
    client.adapterRef.testConf.iceServers = [iceServer]
    client.adapterRef.testConf.iceTransportPolicy = document.getElementById("iceTransportPolicy").value
  }
  
  rtc.client = client
  clients[id] = client
  const joinOptions = {
    wssArr: [conn.address],
    channelName: "derek3222" + Math.random(),
    uid: id,
  }
  
  const start = Date.now()
  try{
    await client.join(joinOptions)
    conn.status = "SUCCESS"
    conn.joinMs = Date.now() - (client.adapterRef._signalling?._protoo?._data?.openTs || start)
    conn.joinResult = "SUCCESS"
  }catch(e){
    conn.status = "FAIL"
    console.error(e)
    conn.joinResult = "ERROR" + JSON.stringify(e)
    return
  }
  if (client.adapterRef._signalling?._protoo?._data){
    conn.connMs = client.adapterRef._signalling?._protoo._data.openTs - client.adapterRef._signalling?._protoo._data.createTs
  }
  /////////////
  const sendPC = client.adapterRef._mediasoup?._sendTransport?._handler?._pc
  // 监听ice状态
  let timer = null
  const iceStart = Date.now()
  const handleIceChange = async (evt)=>{
    
    clearTimeout(timer)
    if (sendPC.iceConnectionState === "failed" || sendPC.iceConnectionState === "closed"){
      console.error("sendPC.iceConnectionState", sendPC.iceConnectionState)
    }else{
      timer = setTimeout(handleIceChange, 2000)
    }
    // console.error("handleIceChange", sendPC.iceConnectionState, evt)
    conn.iceConnectionState = sendPC.iceConnectionState
    conn.lastMs = Date.now() - start
    if (conn.status === "ENDED"){
      return
    }
    if (sendPC.iceConnectionState === "connected"){
      if (conn.joinResult !== "ICESUCCESS"){
        conn.joinResult = "ICESUCCESS"
        conn.iceConnectMs = Date.now() - iceStart
        // 不知道什么原理，chrome收不到 iceConnectionState为completed的事件
        await new Promise((res)=>setTimeout(res, 200))
      }
    }
    const info = await getIceCandidatePair(sendPC);
    conn.candidateSummary = info.result
    conn.candidatePairInfo = JSON.stringify(info.pair, null, 2)
    conn.localAddress = JSON.stringify(info.local, null, 2)
    conn.remoteAddress = JSON.stringify(info.remote, null, 2)
  }
  if (sendPC){
    rtc.sendPC = sendPC
    sendPC.addEventListener('iceconnectionstatechange', handleIceChange)
  }
  
  // 准备本地流
  if (!rtc.videoSource){
    rtc.videoSource = fakeMediaDevices.getFakeMedia({video: true}).video.track
  }
  const videoSource = rtc.videoSource
  console.log("videoSource", videoSource)
  const localStream = NERTC.createStream({
    video: true,
    videoSource,
    client,
  })
  await localStream.init(localStream)
  // 开始推流
  const publishStart = Date.now()
  await client.publish(localStream)
}

async function getIceCandidatePair(pc){
  const info = {
    result: "",
    transport: null,
    local: [],
    remote: [],
    pair: null
  }
  const stats = await pc.getStats(null)
  const statsArr = []
  const transports = []
  stats.forEach((item, key)=>{
    delete item.timestamp
    statsArr.push(item)
    if (item.type === "local-candidate"){
      info.local.push(item)
    }
    if (item.type === "remote-candidate"){
      info.remote.push(item)
    }
    if (item.type === "transport"){
      transports.push(item)
      info.transport = item
    }
  })
  if (!transports.length){
    info.result = "没有transport"
    return info
  }
  transports.forEach((transport)=>{
    const candidatePair = statsArr.find((stats)=>{
      return stats.id === transport.selectedCandidatePairId
    })
    if (candidatePair){
      info.pair = candidatePair
      info.result += `${candidatePair.state} `
      const localCandidate = statsArr.find((stats)=>{
        return stats.id === candidatePair.localCandidateId
      })
      if (localCandidate){
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
      info.result += `无法找到candidatePair ${transport.selectedCandidatePairId}`
    }
  })
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