const CONTAINER_WIDTH = 1000;
const CONTAINER_HEIGHT = 1000;
const R = 100
const USER_WIDTH = 160;
const USER_HEIGHT = 120;

function MapToDom({x, y}){
  // -100~100 => 0~1000
  return {
    left: Math.round((x + R) * (CONTAINER_WIDTH / 2 / R)),
    top: Math.round((y + R) * (CONTAINER_HEIGHT / 2 / R)),
  }
}

function MapFromDom({left, top}){
  // 0 ~ 1000 => -100~100
  return {
    x: Math.round(left / CONTAINER_WIDTH * 2 * R) - R,
    y: Math.round(top / CONTAINER_HEIGHT * 2 * R) - R,
  }
}

$(".localUser").on("drag", (evt)=>{
  // console.log("evt", evt)
  const {left, top}= $(evt.target).position();
  const {x, y} = MapFromDom({left, top})
  $(evt.target).children(".xy").text(`(${x}, ${y})`)
})

window.rtc = {
  client: null,
  remotes: {
  }
}

function createRemoteIfNotExist(evt){
  const uid = evt.stream.streamID;
  let remote = rtc.remotes[uid]
  if (!remote){
    console.log("createRemoteIfNotExist", uid);
    remote = {
      dom: $(`
<div class="remoteUser remote-${evt.stream.streamID}" style="min-width: ${USER_WIDTH}px;min-height: ${USER_HEIGHT}px">
    <div class="remote-info"></div>
    <div class="remote-audio">audio</div>
    <div class="remote-video">video</div>
    <div class="remote-screen">screen</div>
    <div class="remote-video-container"></div>
    <div class="remote-screen-container"></div>
</div>`),
      stream: evt.stream,
      position: {
        x: 0,
        y: 0,
      }
    };
    rtc.remotes[uid] = remote
    remote.dom.appendTo($(".spatial-container"));
    remote.dom.draggable()
    remote.dom.css(MapToDom({ x: remote.position.x, y: remote.position.y}))
    remote.dom.on("drag", (evt)=>{
      // console.log("evt", evt)
      const {left, top}= $(evt.target).position();
      const {x, y} = MapFromDom({left, top})
      $(evt.target).children(".xy").text(`(${x}, ${y})`)
      rtc.client.spatialManager.updatePosition(remote.stream.getId(), {x, y})
      remote.dom.children(".remote-info").text(`${remote.stream.getId()} (${x},${y})`)
    })
    remote.dom.children(".remote-info").text(`${remote.stream.getId()} (${remote.position.x}, ${remote.position.y})`)
  }
  return remote
}

const bindEvents = ()=>{
  rtc.client.on("stream-added", function(evt){
    const remote = createRemoteIfNotExist(evt)
    remote.dom.children(".remote-" + evt.mediaType).addClass("stream-added");
  });

  rtc.client.on("stream-removed", function(evt){
    let remote = rtc.remotes[evt.stream.getId()]
    if (remote){
      remote.dom.children(".remote-" + evt.mediaType).removeClass("stream-added");
    }
  });
  
  rtc.client.on("stream-subscribed", function(evt){
    const remote = createRemoteIfNotExist(evt)
    remote.dom.children(".remote-" + evt.mediaType).addClass("stream-subscribed");
    evt.stream.setRemoteRenderMode({
      width: USER_WIDTH,
      height: USER_HEIGHT
    })
    evt.stream.play(remote.dom.children(`.remote-${evt.mediaType}-container`)[0])
  })

  rtc.client.on("stream-unsubscribed", (evt)=>{
    const uid = evt.stream.streamID;
    let remote = rtc.remotes[uid]
    if (remote){
      remote.dom.children(".remote-" + evt.mediaType).removeClass("stream-subscribed")
    }
  })

  rtc.client.on("peer-leave", (evt)=>{
    const uid = evt.uid;
    let remote = rtc.remotes[uid]
    if (remote){
      remote.dom.children(".remote-info").text(`${uid} OFFLINE`)
    }
  });
}

async function joinChannel(){
  rtc.client = NERTC.createClient({
    appkey: $("#appid").val(),
    // debug: true,
  })
  bindEvents()
  await rtc.client.join({
    channelName: $("#channelName").val(),
    uid: parseInt($("#uid").val()),
    spatial: {
      subConfig: {
        audio: $("#subAudio").prop('checked'),
        video: $("#subVideo").prop('checked'),
        screen: $("#subScreen").prop('checked'),
      }
    },
  })
}

async function main(){
  $(".spatial-container").css({
    width: CONTAINER_WIDTH,
    height: CONTAINER_HEIGHT,
  })
  $("#dabaiurl").attr("href", window.location.href.replace("webrtc2.spatial", "webrtc2"))
  $(".localUser").css(MapToDom({ x: -64, y: -64}))
  $(".localUser").css({width: '640px', height: '640px'})
  $(".center").css(MapToDom({x: 0, y: 0}))
  $("#uid").val(Math.floor(Math.random() * 9000 + 1000))
  $("#join").on("click", joinChannel)
}
main()

