function findCryptIndexH264(data){
  for (let i = 3; i < data.length; i++){
    if (data[i] === 0x61|| data[i] === 0x65 && data[i - 1] === 0x01 && data[i - 2] === 0x00 && data[i - 3] === 0x00){
      // 低四位为1为p帧，低四位为5为i帧。算法待改进
      return i+1;
    }
  }
  return -1;
}

//STARTOF 自定义加密：RC4
let rc4_secret = null
function initRC4(){
  const textEncoder = new TextEncoder();
  rc4_secret = textEncoder.encode($("#encryptionSecret").val())
  addLog("初始化自定义加密：rc4。密钥：" + rc4_secret)
}

function encodeFunctionRC4(mediaType, encodedFrame, controller){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1);
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  const encrypted = SM4.rc4_encrypt(u8Arr1, rc4_secret, {shiftStart: shiftStart});
  encodedFrame.data = encrypted.buffer;
  controller.enqueue(encodedFrame);
}

function decodeFunctionRC4(mediaType, encodedFrame, controller){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1);
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  const encrypted = SM4.rc4_decrypt(u8Arr1, rc4_secret, {shiftStart: shiftStart});
  encodedFrame.data = encrypted.buffer;
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
  let secret = textEncoder.encode($("#encryptionSecret").val())
  // ECB模式其实无状态
  SM4.sm4_setkey_enc(encCtx, secret);
  SM4.sm4_setkey_dec(decCtx, secret);
  addLog("初始化自定义加密：sm4-128-ecb。密钥：" + secret)
}

function encodeFunctionSM4(mediaType, encodedFrame, controller){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1);
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  const encrypted = SM4.sm4_crypt_ecb(encCtx, u8Arr1.subarray(shiftStart), {shiftStart: shiftStart});
  for (let i = 0; i < shiftStart; i++){
    encrypted[i] = u8Arr1[i];
  }
  encodedFrame.data = encrypted.buffer;
  // console.error("shiftStart", shiftStart, "encrypted.buffer.byteLength", encrypted.buffer.byteLength)
  controller.enqueue(encodedFrame);
}

function decodeFunctionSM4(mediaType, encodedFrame, controller){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = this.findCryptIndexH264(u8Arr1);
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


//STARTOF 取反
function encodeFunctionInvert(mediaType, encodedFrame, controller){
  const u8Arr1 = new Uint8Array(encodedFrame.data);
  const h264Index = findCryptIndexH264(u8Arr1);
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  // console.error(`encodeFunctionInvert shiftStart ${shiftStart}/${u8Arr1.length}`)
  for (let i = shiftStart; i < u8Arr1.length; i++){
    u8Arr1[i] = 255 - u8Arr1[i];
  }
  encodedFrame.data = u8Arr1.buffer;
  controller.enqueue(encodedFrame);
}

function decodeFunctionInvert(mediaType, encodedFrame, controller){
  const u8Arr1 = new Uint8Array(encodedFrame.data.length);
  const h264Index = findCryptIndexH264(u8Arr1);
  const shiftStart = mediaType === "audio" ? 0: Math.max(h264Index, 0)
  // console.error(`decodeFunctionInvert shiftStart ${shiftStart}/${u8Arr1.length}`)
  for (let i = shiftStart; i < u8Arr1.length; i++){
    u8Arr1[i] = 255 - u8Arr1[i];
  }
  encodedFrame.data = u8Arr1.buffer;
  controller.enqueue(encodedFrame);
}
//ENDOF 取反

// 基于window.customTransform
const processSenderTransform = function(evt){
  switch(window.customTransform){
    case "rc4":
      encodeFunctionRC4(evt.mediaType, evt.encodedFrame, evt.controller)
      break;
    case "sm4-128-ecb":
      encodeFunctionSM4(evt.mediaType, evt.encodedFrame, evt.controller)
      break;
    case "invert":
      encodeFunctionInvert(evt.mediaType, evt.encodedFrame, evt.controller)
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
      decodeFunctionRC4(evt.mediaType, evt.encodedFrame, evt.controller)
      break;
    case "sm4-128-ecb":
      decodeFunctionSM4(evt.mediaType, evt.encodedFrame, evt.controller)
      break;
    case "invert":
      decodeFunctionInvert(evt.mediaType, evt.encodedFrame, evt.controller)
      break;
    default:
      //不处理
      evt.controller.enqueue(evt.encodedFrame);
  }
}