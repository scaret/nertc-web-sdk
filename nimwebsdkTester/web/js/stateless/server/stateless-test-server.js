const wrtc =  require("wrtc")
const express = require("express")
const path = require("path")
const request = require("request")
const cors = require("cors");
const bodyParser = require('body-parser')

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

app.post('/v1/edge/server/cid/:cid/push/request', async (req, res) => {
  const cid = req.params.cid
  const uid = req.body.uid
  const offerSdp = req.body.sdp
  console.log("PUSH ", cid, uid)
  let pusher = pushers.find((p)=>{
    return p.cid === cid && p.uid === uid
  })
  if (pusher){
    pusher.peerConnection.close()
  }else{
    pusher = {cid, uid, id: ++pusherIdx}
    pushers.push(pusher)
  }
  const pc = new wrtc.RTCPeerConnection()
  const candidatePromise = waitForCandidate(pc)
  pusher.peerConnection = pc
  pusher.tracks = []
  pc.onsignalingstatechange = (evt)=>{
    console.log(`#${pusher.id} onsignalingstatechange`, pc.signalingState)
  }
  pc.ontrack = (evt)=>{
    const id = ++trackIdx
    console.log(`#${pusher.id} ontrack ${id}`, evt.track.kind)
    pusher.tracks.push({
      id,
      track: evt.track
    })
  }
  const offer = new wrtc.RTCSessionDescription({
    type: 'offer',
    sdp: offerSdp
  })
  pc.setRemoteDescription(offer)
  let answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  const candidates = await candidatePromise
  res.json({
    sdp: answer.sdp,
    candidates: candidates
  })
})

app.post('/v1/edge/server/cid/:cid/pull/request', async (req, res) => {
  const cid = req.params.cid
  const uid = req.body.uid
  const targetUid = req.body.dstUid
  const offerSdp = req.body.sdp
  console.log("PULL ", cid, targetUid, '=>', uid)
  let pusher = pushers.find((p)=>{
    return p.cid === cid && p.uid === targetUid
  })
  if (!pusher){
    res.json({
      code: 400,
      errMsg: `没有发送端 cid: ${cid}, uid: ${targetUid}`
    })
    return;
  }else if (pusher?.peerConnection?.connectionState !== "connected"){
    res.json({
      code: 400,
      errMsg: `发送端断了 cid: ${cid}, uid: ${targetUid}`
    })
    return;
  }

  let puller = pullers.find((p) => p.uid === uid);
  if (puller){
    puller.peerConnection.close()
  }else{
    pullerIdx++
    puller = {id: pullerIdx}
  }
  const pc = new wrtc.RTCPeerConnection()
  const candidatePromise = waitForCandidate(pc)
  puller.peerConnection = pc

  pusher.peerConnection.getReceivers().forEach((receiver)=>{
    console.log("receiver", receiver, receiver.track)
    console.log(`PULLER#${puller.id} PUSHER#${pusher.id} ${receiver.track.kind}`)
    puller.peerConnection.addTrack(receiver.track)
  })
  
  const offer = new wrtc.RTCSessionDescription({
    type: 'offer',
    sdp: offerSdp
  })
  pc.setRemoteDescription(offer)
  let answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  const candidates = await candidatePromise
  res.json({
    sdp: answer.sdp,
    candidates: candidates
  })
})

app.post('/proxy/edge/server/cid/:cid/:method/request', function (req, res){
  const url = 'http://59.111.239.249:30443/v1/edge/server/cid/' + req.params.cid + "/" + req.params.method +"/request";
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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})