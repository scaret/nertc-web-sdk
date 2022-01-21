# 自定义加密

## 浏览器限制

自定义加密功能依赖 [encodedInsertableStreams](https://chromestatus.com/feature/5499415634640896) 接口。目前仅支持Chrome 94及以上版本。

## 启用自定义加密功能

需要在加入频道前调用`client.enableCustomTransform()`方法。调用后，可收到两个事件：`sender-transform` 和`receiver-transform`，应在这两个方法中实现加密和解密操作。

## 注意事项

1. H264数据应只加密I帧和P帧，且需在 0x00 0x00 0x01 后需保留三位不做加密（见示例代码）
2. 由于有丢包情况存在，请勿在帧与帧间使用类似 [cbc加密模式](https://zh.wikipedia.org/wiki/%E5%88%86%E7%BB%84%E5%AF%86%E7%A0%81%E5%B7%A5%E4%BD%9C%E6%A8%A1%E5%BC%8F#%E5%AF%86%E7%A0%81%E5%9D%97%E9%93%BE%E6%8E%A5%EF%BC%88CBC%EF%BC%89)
3. 开启自定义加密的客户端无法和未开启自定义加密的客户端加入同一个房间。


## 示例


```html
<!DOCTYPE html>
  <html>
    <body>
      <div id="localDiv" style="height: 500px;"></div>
      <div id="remoteDiv" style="height: 500px;"></div>
      <script src="<SDK地址>"></script>
      <script src="<加密库地址>"></script>
      <script>
        
        const rc4_secret = "I_AM_A_KEY"
		    
        function encodeFunctionRC4({mediaType, encodedFrame, controller}){
          // 加密算法，以RC4为例
          // 本示例中使用的SM4加密库地址： https://www.npmjs.com/package/sm4-128-ecb
          if (encodedFrame.data.byteLength){
            const u8Arr1 = new Uint8Array(encodedFrame.data);
            const info = findCryptIndexH264(u8Arr1)
            const h264Index = info.pos;
            const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
            const encrypted = SM4.rc4_encrypt(u8Arr1, rc4_secret, {shiftStart: shiftStart});
            encodedFrame.data = encrypted.buffer;
          }
          controller.enqueue(encodedFrame);
        }
		
        function decodeFunctionRC4({mediaType, encodedFrame, controller}){
          // 解密算法，以RC4为例
          if (encodedFrame.data.byteLength){
            const u8Arr1 = new Uint8Array(encodedFrame.data);
            const info = findCryptIndexH264(u8Arr1)
            const h264Index = info.pos;
            const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
            const encrypted = SM4.rc4_decrypt(u8Arr1, rc4_secret, {shiftStart: shiftStart});
            encodedFrame.data = encrypted.buffer;
          }
          controller.enqueue(encodedFrame);
        }
		
		
        function printInfoBeforeDecrypt(evt){
          // 工具函数，帮助判断是否有解密前数据
          if ((evt.mediaType === "video" || evt.mediaType === "screen") && printRecvVideoFrame){
            const u8Arr1 = new Uint8Array(evt.encodedFrame.data);
            const info = findCryptIndexH264(u8Arr1);
            console.log(`（解密前）uid ${evt.uid}，媒体类型 ${evt.mediaType}，帧类型 ${evt.encodedFrame.type}，帧长度 ${evt.encodedFrame.data.byteLength}，H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join(), "，前100字节帧内容", u8Arr1.slice(0, 100));
          }
        }
		
      function printInfoBeforeEncrypt(evt){
        // 工具函数，帮助判断是否有加密前数据
        if ((evt.mediaType === "video" || evt.mediaType === "screen") && printEncodedVideoFrame){
          const u8Arr1 = new Uint8Array(evt.encodedFrame.data);
          const info = findCryptIndexH264(u8Arr1);
          console.log(`（加密前）媒体类型 ${evt.mediaType}，大小流 ${evt.streamType}，帧类型 ${evt.encodedFrame.type}，帧长度 ${evt.encodedFrame.data.byteLength}，H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join(), "，前100字节帧内容", u8Arr1.slice(0, 100));
        }
      }
      
      // H264在 0x00 0x00 0x01 后需保留三位不做加密
      const customEncryptionOffset = 3
      const naluTypes = {
        7: "SPS",
        8: "PPS",
        5: "IFrame",
        1: "PFrame",
      }
		
      function findCryptIndexH264(data){
        // 工具函数，判断I帧和P帧位置
        const result = {
          frames: [],
          pos: -1
        };
        for (let i = 3; i < data.length; i++){
          if (data[i - 1] === 0x01 && data[i - 2] === 0x00 && data[i - 3] === 0x00){
            // 低五位为1为p帧，低五位为5为i帧。
            let frameTypeInt = data[i] & 0x1f;
            let frameType = naluTypes[frameTypeInt] || "nalu_" + frameTypeInt
            result.frames.push({
              pos: i,
              frameType
            });
            if (frameType === "IFrame" || frameType === "PFrame"){
              result.pos = i + customEncryptionOffset
            }
          }
        }
        return result;
      }
		
      const processSenderTransform = function(evt){
        printInfoBeforeEncrypt(evt)
        encodeFunctionRC4(evt)
      }
  
      const processReceiverTransform = function (evt){
        printInfoBeforeDecrypt(evt)
        decodeFunctionRC4(evt)
      }
		
      const main = async ()=>{
        let rtc = {};
        // 1. 创建client
        rtc.client = NERTC.createClient({appkey: "<您的appkey>", debug: true});
        // 2. 绑定订阅事件
        rtc.client.on('stream-added', (evt)=>{
          rtc.client.subscribe(evt.stream);
        })
        rtc.client.on('stream-subscribed', (evt)=>{
          evt.stream.play(document.getElementById('remoteDiv'));
        });
        // 自定义加密回调
        rtc.client.on('sender-transform', processSenderTransform)
        // 自定义解密回调
        rtc.client.on('receiver-transform', processReceiverTransform)
        // 3. 启用自定义加密
        rtc.client.enableCustomTransform()
        // 4. 加入频道
        await rtc.client.join({
            channelName: 'channel163',
            uid: 123,
          token: '<您的token>', // 如关闭了安全模式，则不需要该参数。
        });
        // 5. 创建localStream
        rtc.localStream = NERTC.createStream({
          video: true,
          audio: true,
          client: rtc.client,
          uid: 123
        });
        await rtc.localStream.init();
        // 6. 设置本地播放方式
        rtc.localStream.setLocalRenderMode({
          width: 640,
          height: 480
        })
        rtc.localStream.play(document.getElementById('localDiv'))
        // 7. 发布localStream
        rtc.client.publish(rtc.localStream);
      }
      
      main()
  </script>
  </body>
</html>
 ```