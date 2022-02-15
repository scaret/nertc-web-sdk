const wrtc =  require("wrtc")
const express = require("express")
const path = require("path")
const request = require("request")
const cors = require("cors");
const bodyParser = require('body-parser')
const fs = require("fs")

const credentials = {
  key: fs.readFileSync('/home/yunxin/.badcert/127.0.0.1/key.pem'),
  cert: fs.readFileSync('/home/yunxin/.badcert/127.0.0.1/cert.pem'),
}

console.log(wrtc)

const app = express()
app.use(cors())
app.use(bodyParser.json({}));


const port = 3388

let pusherIdx = 0
let trackIdx = 0
const pushers = []

let pullerIdx = 0
const pullers = []

app.use(express.static(path.join(__dirname, "../../..")))

app.post('/v1/rtc/publish', async (req, res) => {
  const streamName = req.body.stream_name;
  const update = req.body.update;
  const jsep = req.body.jsep;
    
  console.log("PUBLISH", streamName, update ? "UPDATE": "NEW")
  
  let pusherIndex = pushers.findIndex((p)=>{
    return p.streamName === streamName
  })
  let pusher = pushers[pusherIndex]
  if (pusher && !update){
    console.log("Close former Peerconnection", pusher.id)
    //不是更新，把之前的流给删掉
    pusher.peerConnection.close()
    pushers.splice(pusherIndex, 1)
    pusher = null
  }

  let candidatePromise = null
  let pc = null
  if (!pusher){
    pc = new wrtc.RTCPeerConnection();
    pusher = {
      streamName,
      id: ++pusherIdx,
      peerConnection: pc,
      tracks: []
    }
    pc.onsignalingstatechange = (evt)=>{
      const tracksStatus = pusher.tracks.map((trackInfo)=>{
        return trackInfo.track.kind + " " + trackInfo.track.readyState
      }).join()
      console.log(`PUSHER#${pusher.id} onsignalingstatechange ${pc.signalingState}. Tracks ${tracksStatus}`)
    }
    pc.ontrack = (evt)=>{
      const id = ++trackIdx
      console.log(`#${pusher.id} ontrack ${id}`, evt.track.kind)
      pusher.tracks.unshift({
        id,
        track: evt.track
      })
    }
    candidatePromise = waitForCandidate(pc)
    pushers.push(pusher)
  } else {
    pc = pusher.peerConnection
  }
  
  const offer = new wrtc.RTCSessionDescription(jsep)
  pc.setRemoteDescription(offer)
  let answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  let candidates = null
  if (candidatePromise){
    candidates = await candidatePromise
  }
  res.json({
    code: 200,
    err_msg: "success",
    trace_id: `${streamName}_${pusher.id}`,
    jsep: answer,
    candidates: candidates
  })
})

app.post('/v1/rtc/play', async (req, res) => {
  const streamName = req.body.stream_name
  const update = req.body.update
  const jsep = req.body.jsep
  const uid = req.body.client_id
  
  console.log("PULL ", streamName, "update:", update, uid)
  let pusher = pushers.find((p)=>{
    return p.streamName === streamName
  })
  if (!pusher){
    res.json({
      code: 400,
      errMsg: `没有发送端 streamName: ${streamName}`
    })
    return;
  }else if (pusher?.peerConnection?.connectionState !== "connected"){
    res.json({
      code: 400,
      errMsg: `发送端断了 ${streamName}, ${pusher.id}`
    })
    return;
  }
  let pullerIndex = uid ? pullers.findIndex((p) => p.uid === uid): -1;
  let puller = pullers[pullerIndex];
  if (puller && !update){
    puller.peerConnection.close()
    pullers.splice(pullerIndex, 1)
    puller = null
  }
  let pc = null
  let candidatePromise = null
  if (!puller){
    console.error("新的puller")
    pc = new wrtc.RTCPeerConnection()
    puller = {
      streamName,
      pusher,
      id: ++pullerIdx,
      peerConnection: pc,
      tracks: [],
    }
    candidatePromise = waitForCandidate(pc)
  }else{
    console.log("已有的puller")
    pc = puller.peerConnection
  }
  
  pusher.tracks.forEach((trackInfo)=>{
    // 多了多了
    console.log("Add track", trackInfo.track.kind)
    puller.peerConnection.addTrack(trackInfo.track)
  })
  const offer = new wrtc.RTCSessionDescription(jsep)
  await pc.setRemoteDescription(offer)
  let answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  const candidates = await candidatePromise
  res.json({
    trace_id: `${streamName}_${pusher.id}_${puller.id}`,
    code: 200,
    jsep: answer,
    candidates: candidates
  })
})

app.post('/proxy/v1/rtc/:method', function (req, res){
  const url = 'http://wecan-api.netease.im/v1/rtc/' + req.params.method;
  console.log("proxy", url)
  const body = req.body
  console.log("body", body)
  request({
    method: 'POST',
    url: url,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
  }, function(err, httpResponse, body){
    if (err){
      console.error(err)
    }else{
      console.log(body)
      res.json(body)
    }
  })
})

const waitForCandidate = async (pc)=>{
  let candidates = []
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>{
      console.error("TIMEOUT")
      reject("TIMEOUT")
    }, 3000)
    pc.addEventListener('icecandidate', (evt)=>{
      if (!evt.candidate){
        clearTimeout(timer)
        resolve(candidates)
      }else{
        candidates.push(evt.candidate)
      }
    });
  })
}

const httpsServer = require("https").createServer(credentials, app)
httpsServer.listen(port, () => {
  console.log(`Example app listening at https://localhost.wrtc.dev:${port}/webrtc2.stateless.html`)
})