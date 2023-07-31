<template>
  <div id="app">
    <h1 v-html="nertcInfo"></h1>
    <div>
      <label>App Key:
        <input type="text" size="20" v-model="appkey">
      </label>
    </div>
    <div>
      <label>Channel Name:
        <input type="text" size="20" v-model="channelName">
      </label>
    </div>
    <div><button v-on:click="joinChannel">joinChannel</button></div>
    <h3>Local</h3>
    <div id="local-wrapper"></div>
    <h3>Remote</h3>
    <div id="remote-wrappers"></div>
  </div>
</template>

<script>
import NERTC from '../../..'
import NIM from './NIM_Web_NIM_v8.7.0'

console.log("NIM.getInstance", NIM.getInstance);

const rtc = {
  client: null,
  stream: null,
}

export default {
  name: 'App',
  components: {
  },
  methods: {
    joinChannel:async function(){
      console.log(`joinChannel`, this)
      if (rtc.client){
        rtc.client.destroy()
      }
      localStorage.setItem('nertc_vue_appkey', this.appkey)
      localStorage.setItem('nertc_vue_channelname', this.channelName)
      rtc.client = NERTC.createClient({
        appkey: this.appkey
      })
      rtc.client.on('stream-added', (evt)=>{
        console.log('收到远端', evt.stream.getId(), evt.mediaType)
        rtc.client.subscribe(evt.stream)
      })
      rtc.client.on('stream-subscribed', (evt)=>{
        console.log('开始播放远端', evt.stream.getId(), evt.mediaType)
        evt.stream.setRemoteRenderMode({
          width: 200,
          height: 150
        })
        evt.stream.play(document.getElementById('remote-wrappers'))
      })

      await rtc.client.join({
        uid: 0,
        channelName: this.channelName
      })
      console.log('加入房间成功')
      rtc.localStream = NERTC.createStream({
        client: rtc.client,
        audio: true,
        video: true
      })
      await rtc.localStream.init()
      await rtc.client.publish(rtc.localStream)
      console.log('发布音视频成功')
      rtc.localStream.setLocalRenderMode({
        width: 400,
        height: 300
      })
      await rtc.localStream.play(document.getElementById('local-wrapper'))
      console.log('本地播放成功')
    }
  },
  data: ()=>{
    return {
      appkey: localStorage.getItem('nertc_vue_appkey') || '',
      channelName: localStorage.getItem(('nertc_vue_channelname')) || 'channel' + Math.floor(Math.random() * 9000 + 1000),
      nertcInfo: `NERTC VERSION ${NERTC.VERSION} BUILD ${NERTC.BUILD}`
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
