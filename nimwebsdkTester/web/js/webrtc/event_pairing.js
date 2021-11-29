const eventList = [
  {
    type: "long",
    text: "peer-online",
    title: "远端用户上线/离线",
    eventsPlus: {"peer-online": 0},
    eventsMinus: {"peer-leave": 0},
  },
  {
    type: "long",
    text: "stream-added",
    title: "远端流出现/离开",
    eventsPlus: {"stream-added": 0},
    eventsMinus: {"stream-removed": 0},
  },
  {
    type: "long",
    text: "stream-subscribed",
    title: "订阅/取消订阅",
    eventsPlus: {"stream-subscribed": 0},
    eventsMinus: {"stream-unsubscribed": 0},
  },
  {
    type: "short",
    text: "join",
    title: "加入频道",
    max: 1,
    eventsPlus: {"pairing-join-start": 0},
    eventsMinus: {"pairing-join-success": 0, "pairing-join-error": 0},
  },
  {
    type: "short",
    text: "reBuildRecvTransport",
    title: "重建P2P下行",
    max: 1,
    eventsPlus: {"pairing-reBuildRecvTransport-start": 0},
    eventsMinus: {"pairing-reBuildRecvTransport-success": 0, "pairing-reBuildRecvTransport-error": 0},
  },
  {
    type: "short",
    text: "信令重连",
    title: "信令WebSocket通道重连",
    max: 1,
    eventsPlus: {"pairing-websocket-reconnection-start": 0},
    eventsMinus: {
      "pairing-websocket-reconnection-success": 0,
      "pairing-websocket-reconnection-skip": 0,
      "pairing-websocket-reconnection-error": 0,
    },
  },
  {
    type: "short",
    text: "createConsumer",
    title: "订阅track",
    eventsPlus: {"pairing-createConsumer-start": 0},
    eventsMinus: {
      "pairing-createConsumer-success": 0,
      "pairing-createConsumer-skip": 0,
      "pairing-createConsumer-error": 0
    },
  },
]

const bindEventParing = ()=>{
  for (let i in eventList){
    const eventInfo = eventList[i];
    for(let eventName in eventInfo.eventsPlus){
      console.log("listen to eventsPlus" + eventName)
      rtc.client.on(eventName, ()=>{
        eventInfo.eventsPlus[eventName]++
        updateEventName()
      })
    }
    for(let eventName in eventInfo.eventsMinus){
      console.log("listen to eventsMinus" + eventName)
      rtc.client.on(eventName, ()=>{
        eventInfo.eventsMinus[eventName]++
        updateEventName()
      })
    }
  }
}

const updateEventName = ()=>{
  let htmlLong = "<table border='1'><tr><td>长时事件</td><td>当前数量</td><td>正</td><td>反</td></tr>";
  let htmlShort = "<table border='1'><tr><td>短时事件</td><td>当前数量</td><td>发起</td><td>完成</td></tr>";
  for (let i in eventList){
    const eventInfo = eventList[i];
    let title = eventInfo.title
    let eventsPlusTotal = 0;
    let eventsMinusTotal = 0;
    for (let eventName in eventInfo.eventsPlus){
      eventsPlusTotal += eventInfo.eventsPlus[eventName];
      title += `\n${eventName}:${eventInfo.eventsPlus[eventName]}`
    }
    for (let eventName in eventInfo.eventsMinus){
      eventsMinusTotal += eventInfo.eventsMinus[eventName];
      title += `\n${eventName}:${eventInfo.eventsMinus[eventName]}`
    }
    if (eventsPlusTotal - eventsMinusTotal < 0){
      console.error("错误：事件数量倒置: ", JSON.stringify(eventInfo))
      eventInfo.highlight = true
    }else if (eventInfo.max > -1 && eventsPlusTotal - eventsMinusTotal > eventInfo.max) {
      console.error("错误：事件数量超过最大值: ", eventInfo.max, JSON.stringify(eventInfo))
      eventInfo.highlight = true
    }
    if (eventInfo.type === "long"){
      htmlLong += `<tr class="${eventInfo.highlight ? "highlight" : ""}" title="${title}"><td>${eventInfo.text}</td><td>${eventsPlusTotal - eventsMinusTotal}</td><td>${eventsPlusTotal}</td><td>${eventsMinusTotal}</td></tr>`
    }else{
      htmlShort += `<tr class="${eventInfo.highlight ? "highlight" : ""}" title="${title}"><td>${eventInfo.text}</td><td>${eventsPlusTotal - eventsMinusTotal}</td><td>${eventsPlusTotal}</td><td>${eventsMinusTotal}</td></tr>`
    }
  }
  htmlLong += "</table>"
  htmlShort += "</table>"
  $("#eventPairingLong").html(htmlLong)
  $("#eventPairingShort").html(htmlShort)
}