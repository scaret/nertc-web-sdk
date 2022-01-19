const naluTypes = {
  7: "SPS",
  8: "PPS",
  5: "IFrame",
  1: "PFrame",
}

let customEncryptionOffset = 2;
let printRecvVideoFrame = false;

function findCryptIndexH264(data){
  const result = {
    frames: [],
    pos: -1
  };
  for (let i = 3; i < data.length; i++){
    if (data[i - 1] === 0x01 && data[i - 2] === 0x00 && data[i - 3] === 0x00){
      // 低四位为1为p帧，低四位为5为i帧。算法待改进
      // https://zhuanlan.zhihu.com/p/281176576
      // https://stackoverflow.com/questions/24884827/possible-locations-for-sequence-picture-parameter-sets-for-h-264-stream/24890903#24890903
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

//STARTOF 自定义加密：RC4
let rc4_secret = null
function initRC4(){
  const textEncoder = new TextEncoder();
  rc4_secret = textEncoder.encode($("#customEncryptionSecret").val())
  customEncryptionOffset = parseInt($("#customEncryptionOffset").val())
  printRecvVideoFrame = $("#printRecvVideoFrame").is(":checked")
  console.log("rc4_secret", rc4_secret)
  let rc4_secret_hex = [];
  for (let i = 0; i < rc4_secret.length; i++){
    rc4_secret_hex.push(rc4_secret[i].toString(16))
  }
  addLog("初始化自定义加密：rc4。密钥（十六进制）：" + rc4_secret_hex.join(" "))
}

function encodeFunctionRC4({mediaType, encodedFrame, controller}){
  if (encodedFrame.data.length){
    const u8Arr1 = new Uint8Array(encodedFrame.data);
    const info = findCryptIndexH264(u8Arr1)
    // if (mediaType === "video"){
      // console.log("encodeFunctionRC4", encodedFrame.type, info.frames.map((frame)=>{return frame.frameType}).join() ,info);
    // }
    const h264Index = info.pos;
    const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
    const encrypted = SM4.rc4_encrypt(u8Arr1, rc4_secret, {shiftStart: shiftStart});
    encodedFrame.data = encrypted.buffer;
  }
  controller.enqueue(encodedFrame);
}

function decodeFunctionRC4({mediaType, encodedFrame, controller}){
  if (encodedFrame.data.length){
    const u8Arr1 = new Uint8Array(encodedFrame.data);
    const info = findCryptIndexH264(u8Arr1)
    if (mediaType === "video" && printRecvVideoFrame){
      console.log(`decodeFunctionRC4 （解密前）收到帧类型 ${encodedFrame.type} 帧长度 ${encodedFrame.data.byteLength} H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join() ,info, "前100字节帧内容", u8Arr1.slice(0, 100));
    }
    const h264Index = info.pos;
    const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
    const encrypted = SM4.rc4_decrypt(u8Arr1, rc4_secret, {shiftStart: shiftStart});
    encodedFrame.data = encrypted.buffer;
  }
  controller.enqueue(encodedFrame);
}
//ENDOF 自定义加密：RC4

//STARTOF 自定义加密：SM4-128-ecb
let encCtx = null
let decCtx = null

function initSm4(){
  encCtx = new SM4.SM4Ctx();
  decCtx = new SM4.SM4Ctx();
  const textEncoder = new TextEncoder();
  let secret = textEncoder.encode($("#customEncryptionSecret").val())
  customEncryptionOffset = parseInt($("#customEncryptionOffset").val())
  // ECB模式其实无状态
  SM4.sm4_setkey_enc(encCtx, secret);
  SM4.sm4_setkey_dec(decCtx, secret);
  addLog("初始化自定义加密：sm4-128-ecb。密钥：" + secret)
}

function encodeFunctionSM4({mediaType, encodedFrame, controller}){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1).pos;
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  const encrypted = SM4.sm4_crypt_ecb(encCtx, u8Arr1.subarray(shiftStart), {shiftStart: shiftStart});
  for (let i = 0; i < shiftStart; i++){
    encrypted[i] = u8Arr1[i];
  }
  encodedFrame.data = encrypted.buffer;
  // console.error("shiftStart", shiftStart, "encrypted.buffer.byteLength", encrypted.buffer.byteLength)
  controller.enqueue(encodedFrame);
}

function decodeFunctionSM4({mediaType, encodedFrame, controller}){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = this.findCryptIndexH264(u8Arr1).pos;
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  // console.error("shiftStart", shiftStart, "u8Arr1.buffer.byteLength", u8Arr1.buffer.byteLength)
  if ((u8Arr1.buffer.byteLength - shiftStart) % 16 !== 0){
    console.error("解密前的包无法被16整除", mediaType, shiftStart, u8Arr1);
    controller.enqueue(encodedFrame);
    return;
  }
  const encrypted = SM4.sm4_crypt_ecb(decCtx, u8Arr1, {shiftStart: shiftStart});
  const u8Arr2 = new Uint8Array(shiftStart + encrypted.length);
  for (let i = 0; i < u8Arr2.length; i++){
    if (i < shiftStart){
      u8Arr2[i] = u8Arr1[i];
    }else{
      u8Arr2[i] = encrypted[i - shiftStart];
    }
  }
  encodedFrame.data = u8Arr2.buffer;
  controller.enqueue(encodedFrame);
}
//ENDOF 自定义加密：SM4-128-ecb


//STARTOF extraInfo
const textEncoderCustomCrypt = new TextEncoder();
const textDecoderCustomCrypt = new TextDecoder();
const frameIndex = {
  audio: {
    high: 0,
  },
  video: {
    high: 0,
    low: 0,
  },
  screen: {
    high: 0,
    low: 0,
  },
}

window.framesRecv = {
  // [uid]: {[mediaType]: extraInfo[]} 最多100
}

function encodeFunctionExtraInfo({mediaType, encodedFrame, controller, streamType}){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1).pos;
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  // console.error(`encodeFunctionExtraInfo shiftStart ${shiftStart}/${u8Arr1.length}`, mediaType, encodedFrame.timestamp);
  const extraInfo = {
    ts: Date.now() + (window.timesyncMs || 0),
    streamType: streamType,
  }
  frameIndex[mediaType][streamType] += 1
  extraInfo.frameIndex = frameIndex[mediaType][streamType]
  // console.log("extraInfo", extraInfo)
  // 不要超过256个字符
  const extraInfoStr = JSON.stringify(extraInfo)
  const extraInfoU8Arr = textEncoderCustomCrypt.encode( extraInfoStr + "ab")
  if (extraInfoStr.length > 255){
    console.error("extraInfo过长", extraInfoStr)
  }
  extraInfoU8Arr[extraInfoU8Arr.length - 1] = 88
  extraInfoU8Arr[extraInfoU8Arr.length - 2] = extraInfoStr.length
  const u8ArrOut = new Uint8Array(u8Arr1.length + extraInfoU8Arr.length)
  
  for (let i = 0; i < u8Arr1.length; i++){
    u8ArrOut[i] = u8Arr1[i];
    // if (i < shiftStart){
    //   u8ArrOut[i] = u8Arr1[i];
    // }else{
    //   u8ArrOut[i] = 255 - u8Arr1[i];
    // }
  }
  for (let i = 0; i < extraInfoU8Arr.length; i++){
    u8ArrOut[u8ArrOut.length - i - 1] = extraInfoU8Arr[extraInfoU8Arr.length - i - 1]
  }
  encodedFrame.data = u8ArrOut.buffer;
  controller.enqueue(encodedFrame);
}

function decodeFunctionExtraInfo({mediaType, encodedFrame, controller, uid}){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1).pos;
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  // console.error(`decodeFunctionExtraInfo shiftStart ${shiftStart}/${u8Arr1.length}`, mediaType, encodedFrame.timestamp);
  if (u8Arr1[u8Arr1.length - 1] === 88) {
    const extraInfoLength = u8Arr1[u8Arr1.length - 2]
    const extraInfoStr = textDecoderCustomCrypt.decode(u8Arr1.subarray(u8Arr1.length - 2 - extraInfoLength, u8Arr1.length - 2))
    const extraInfo = JSON.parse(extraInfoStr, null, 2)
    // console.error("接收帧长", extraInfo.frameIndex, u8Arr1.length - 2 - extraInfoStr.length)
    extraInfo.recvTs = Date.now() + (window.timesyncMs || 0)
    extraInfo.type = encodedFrame.type
    if (!framesRecv[uid]){
      framesRecv[uid] = {audio: [], video: [], screen: []}
    }
    const lastExtraInfo = framesRecv[uid][mediaType][framesRecv[uid][mediaType].length - 1]
    if (lastExtraInfo && lastExtraInfo.frameIndex){
      if (lastExtraInfo.streamType !== extraInfo.streamType){
        console.error("大小流切换。uid: ", uid, mediaType, lastExtraInfo.streamType, "=>", extraInfo.streamType)
        framesRecv[uid][mediaType] = []
      }else{
        for (let i = 0; i < framesRecv[uid][mediaType].length; i++){
          const historyExtraInfo = framesRecv[uid][mediaType][i];
          if (historyExtraInfo.frameIndex === extraInfo.frameIndex){
            console.error("收到重复帧。uid：", uid, mediaType, extraInfo.streamType, "帧序号：", extraInfo.frameIndex, "帧长：", encodedFrame.data.byteLength, encodedFrame.type, extraInfo)
            extraInfo.dulplicated = true;
            break;
          }
        }
      }
    }
    if (!extraInfo.dulplicated){
      framesRecv[uid][mediaType].push(extraInfo)
    }
    if (framesRecv[uid][mediaType].length > 100){
      framesRecv[uid][mediaType].shift()
    }
    const u8ArrOut = new Uint8Array(u8Arr1.length - 2 - extraInfoLength);
    for (let i = 0; i < u8ArrOut.length; i++){
      u8ArrOut[i] = u8Arr1[i];
      // if (i < shiftStart){
      //   u8ArrOut[i] = u8Arr1[i];
      // }else{
      //   u8ArrOut[i] = 255 - u8Arr1[i];
      // }
    }
    encodedFrame.data = u8ArrOut.buffer;
    controller.enqueue(encodedFrame);
  }else {
    console.error("检测到未知帧", mediaType, u8Arr1)
  }
}
//ENDOF extraInfo

// STARTOF transparent
function initTransparent(customTransform){
  customEncryptionOffset = parseInt($("#customEncryptionOffset").val())
  printRecvVideoFrame = $("#printRecvVideoFrame").is(":checked")
  if (customTransform === "transparentWithFlagOn"){
    addLog(customTransform + "模式不会进行加解密，数据直接送入编码器/解码器")
  } else {
    addLog(customTransform + "模式只能进入未开启自定义加密的房间")
  }
}

function encodeFunctionTransparent({mediaType, encodedFrame, controller, streamType}){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const info = findCryptIndexH264(u8Arr1);
  // if (mediaType === "video" && printRecvVideoFrame){
  //   console.log(`encodeFunctionTransparent （加密前）帧类型 ${encodedFrame.type} 帧长度 ${encodedFrame.data.byteLength} H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join() ,info, "前100字节帧内容", u8Arr1.slice(0, 100));
  // }
  controller.enqueue(encodedFrame);
}

function decodeFunctionTransparent({mediaType, encodedFrame, controller, uid}){
  console.log("decodeFunctionTransparent", ...arguments)
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const info = findCryptIndexH264(u8Arr1);
  if (mediaType === "video" && printRecvVideoFrame){
    console.log(`encodeFunctionTransparent （加密前）帧类型 ${encodedFrame.type} 帧长度 ${encodedFrame.data.byteLength} H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join() ,info, "前100字节帧内容", u8Arr1.slice(0, 100));
  }
  controller.enqueue(encodedFrame);
}
//ENDOF transparent

// 基于window.customTransform
const processSenderTransform = function(evt){
  switch(window.customTransform){
    case "rc4":
      encodeFunctionRC4(evt)
      break;
    case "sm4-128-ecb":
      encodeFunctionSM4(evt)
      break;
    case "extra-info":
      encodeFunctionExtraInfo(evt)
      break;
    case "transparentWithFlagOn":
      encodeFunctionTransparent(evt)
      break;
    case "transparentWithFlagOff":
      encodeFunctionTransparent(evt)
      break;
    default:
      //不处理
      evt.controller.enqueue(evt.encodedFrame);
  }
}

const processReceiverTransform = function (evt){
  // console.error("window.customTransform", window.customTransform)
  switch(window.customTransform){
    case "rc4":
      decodeFunctionRC4(evt)
      break;
    case "sm4-128-ecb":
      decodeFunctionSM4(evt)
      break;
    case "extra-info":
      decodeFunctionExtraInfo(evt)
      break;
    case "transparentWithFlagOn":
      decodeFunctionTransparent(evt)
      break;
    case "transparentWithFlagOff":
      decodeFunctionTransparent(evt)
      break;
    default:
      //不处理
      evt.controller.enqueue(evt.encodedFrame);
  }
}