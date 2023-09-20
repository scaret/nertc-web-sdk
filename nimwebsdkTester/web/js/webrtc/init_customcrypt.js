const naluTypes = {
  7: "SPS",
  8: "PPS",
  6: "SEI",
  5: "IFrame",
  1: "PFrame",
  3: "BFrame",
  4: "BFrame",
}

let customEncryptionOffset = 3;
let printRecvVideoFrame = false;
let printEncodedVideoFrame = false;

function findCryptIndexH264(data){
  const result = {
    frames: [],
    // pos表示第一个I帧或P帧的nalu type的位置+offset
    pos: -1
  };
  for (let i = 3; i < data.length; i++){
    if (data[i - 1] === 0x01 && data[i - 2] === 0x00 && data[i - 3] === 0x00){
      // 低四位为1为p帧，低四位为5为i帧。算法待改进
      // https://zhuanlan.zhihu.com/p/281176576
      // https://stackoverflow.com/questions/24884827/possible-locations-for-sequence-picture-parameter-sets-for-h-264-stream/24890903#24890903
      let frameTypeInt = data[i] & 0x1f;
      let frameType = naluTypes[frameTypeInt] || "nalu_" + frameTypeInt
      if (result.frames.length){
        //不包含这位
        result.frames[result.frames.length - 1].posEnd = i - 3
        if (data[i - 4] === 0x00) {
          result.frames[result.frames.length - 1].posEnd -= 1
        }
      }
      let nri = (data[i] & 0x70) >> 5
      if (nri >= 4) {
        console.error(`警告：出现长期参考帧!帧类型 ${frameType} nri ${nri} nalu ${data[i]}`, data)
      }
      if (frameType === "BFrame"){
        console.error(`警告：出现B帧!nri ${nri} nalu ${data[i]}`, data)
      }
      result.frames.push({
        pos: i,
        frameType
      });
      if (result.pos === -1 && (frameType === "IFrame" || frameType === "PFrame")){
        result.pos = i + customEncryptionOffset
      }
      // 通过SPS / PPS打印H264信息
      if (frameType === "SPS") {
        try{
          const info = h264SpsParser.parse(data.slice(i))
          // const info = {
          //   "sps_id": 0,
          //   "profile_compatibility": 192,
          //   "profile_idc": 66,
          //   "level_idc": 31,
          //   "chroma_format_idc": 1,
          //   "bit_depth_luma": 0,
          //   "bit_depth_chroma": 0,
          //   "color_plane_flag": 0,
          //   "qpprime_y_zero_transform_bypass_flag": 0,
          //   "seq_scaling_matrix_present_flag": 0,
          //   "seq_scaling_matrix": [],
          //   "log2_max_frame_num": 15,
          //   "pic_order_cnt_type": 0,
          //   "delta_pic_order_always_zero_flag": 0,
          //   "offset_for_non_ref_pic": 0,
          //   "offset_for_top_to_bottom_field": 0,
          //   "offset_for_ref_frame": [],
          //   "log2_max_pic_order_cnt_lsb": 16,
          //   "max_num_ref_frames": 1,
          //   "gaps_in_frame_num_value_allowed_flag": 0,
          //   "pic_width_in_mbs": 40,
          //   "pic_height_in_map_units": 30,
          //   "frame_mbs_only_flag": 1,
          //   "mb_adaptive_frame_field_flag": 0,
          //   "direct_8x8_inference_flag": 1,
          //   "frame_cropping_flag": 0,
          //   "frame_cropping": {
          //     "left": 0,
          //     "right": 0,
          //     "top": 0,
          //     "bottom": 0
          //   },
          //   "vui_parameters_present_flag": 1,
          //   "vui_parameters": {
          //     "aspect_ratio_info_present_flag": 0,
          //     "aspect_ratio_idc": 0,
          //     "sar_width": 0,
          //     "sar_height": 0,
          //     "overscan_info_present_flag": 0,
          //     "overscan_appropriate_flag": 0,
          //     "video_signal_type_present_flag": 0,
          //     "video_format": 0,
          //     "video_full_range_flag": 0,
          //     "colour_description_present_flag": 0,
          //     "colour_primaries": 0,
          //     "transfer_characteristics": 0,
          //     "matrix_coefficients": 0,
          //     "chroma_loc_info_present_flag": 0,
          //     "chroma_sample_loc_type_top_field": 0,
          //     "chroma_sample_loc_type_bottom_field": 0,
          //     "timing_info_present_flag": 0,
          //     "num_units_in_tick": 0,
          //     "time_scale": 0,
          //     "fixed_frame_rate_flag": 0,
          //     "nal_hrd_parameters_present_flag": 0,
          //     "vcl_hrd_parameters_present_flag": 0,
          //     "hrd_params": {
          //       "cpb_cnt": 0,
          //       "bit_rate_scale": 0,
          //       "cpb_size_scale": 0,
          //       "bit_rate_value": [],
          //       "cpb_size_value": [],
          //       "cbr_flag": [],
          //       "initial_cpb_removal_delay_length": 0,
          //       "cpb_removal_delay_length": 0,
          //       "dpb_output_delay_length": 0,
          //       "time_offset_length": 0
          //     },
          //     "low_delay_hrd_flag": 0,
          //     "pic_struct_present_flag": 0,
          //     "bitstream_restriction_flag": 1,
          //     "motion_vectors_over_pic_boundaries_flag": 1,
          //     "max_bytes_per_pic_denom": 0,
          //     "max_bits_per_mb_denom": 0,
          //     "log2_max_mv_length_horizontal": 16,
          //     "log2_max_mv_length_vertical": 16,
          //     "num_reorder_frames": 0,
          //     "max_dec_frame_buffering": 1
          //   }
          // }
          // console.error(JSON.stringify(info, null, 2))
          let str =
            info.profile_idc.toString(16).padStart(2, '0') +
            info.profile_compatibility.toString(16).padStart(2, '0') +
            info.level_idc.toString(16).padStart(2, '0') +
            ` ` + getH264LevelInfo(info) +
            ` ${info.pic_width_in_mbs * 16}x${info.pic_height_in_map_units * 16}${info.frame_cropping_flag === 1 ? '（裁剪）' : ''} ` +
            `${info.chroma_format_idc === 1 ? 'i420' : '!!!非i420'}。` +
            `短期参考帧：${info.max_num_ref_frames}。` +
            `帧编号连续：${info.gaps_in_frame_num_value_allowed_flag === 1 ? '否' : '是'}。` +
            '';
          console.error(`parseSPS: ${str}`, info)
          // console.error(`parseSPS: ${str}`, JSON.stringify(info, null, 2))
        }catch(e){
          console.error(e)
        }
      }
    }
  }
  return result;
}

const getH264LevelInfo = (info) => {
  const level_idc = info.level_idc
  let str = `Level${level_idc / 10}`
  if ( // https://blog.csdn.net/epubcn/article/details/102802108
    (info.profile_idc === 0x42 || (info.profile_compatibility & 0x80) !== 0) &&
    (info.profile_compatibility & 0x40) !== 0
  ) {
    // Constrained
    // str += '(Constrained)'
  } else {
    // 通常是硬编
    str += '(NOT Constrained)'
  }
  str += ' '
  // https://blog.mediacoderhq.com/h264-profiles-and-levels/
  // if (level_idc <= 13) {
  //   str += `700k`
  // } else if (level_idc <= 22) {
  //   str += `4M`
  // } else if (level_idc <= 30) {
  //   str += `10M`
  // } else if (level_idc <= 31) {
  //   str += `14M`
  // } else if (level_idc <= 40) {
  //   str += `20M`
  // } else if (level_idc <= 42) {
  //   str += `50M`
  // } else if (level_idc <= 51) {
  //   str += `240M`
  // } else {
  //   str += `240M+`
  // }
  return str
}

//STARTOF 自定义加密：RC4
let rc4_secret = null
function initRC4(){
  const textEncoder = new TextEncoder();
  rc4_secret = textEncoder.encode($("#customEncryptionSecret").val())

  console.log("rc4_secret", rc4_secret)
  let rc4_secret_hex = [];
  for (let i = 0; i < rc4_secret.length; i++){
    rc4_secret_hex.push(rc4_secret[i].toString(16))
  }
  addLog("初始化自定义加密：rc4。密钥（十六进制）：" + rc4_secret_hex.join(" "))
}

function encodeFunctionRC4({mediaType, encodedFrame, controller}){
  // 加密算法，以RC4为例
  // 本示例中使用的SM4加密库地址： https://www.npmjs.com/package/sm4-128-ecb
  if (encodedFrame.data.byteLength){
    const u8Arr1 = new Uint8Array(encodedFrame.data);
    const info = findCryptIndexH264(u8Arr1)
    const h264Index = info.pos;
    if (mediaType === "audio" || h264Index <= 0){
      SM4.rc4_encrypt(u8Arr1, rc4_secret, {shiftStart: 0});
    }else{
      info.frames.forEach((frameInfo)=>{
        if (frameInfo.frameType === "IFrame" || frameInfo.frameType === "PFrame"){
          SM4.rc4_encrypt(u8Arr1, rc4_secret, {
            shiftStart: frameInfo.pos + customEncryptionOffset,
            end: frameInfo.posEnd
          });
        }
      })
    }
  }
  controller.enqueue(encodedFrame);
}

function decodeFunctionRC4({mediaType, encodedFrame, controller}){
  // 解密算法，以RC4为例
  if (encodedFrame.data.byteLength){
    const u8Arr1 = new Uint8Array(encodedFrame.data);
    const info = findCryptIndexH264(u8Arr1)
    const h264Index = info.pos;
    if (mediaType === "audio" || h264Index <= 0){
      SM4.rc4_decrypt(u8Arr1, rc4_secret, {shiftStart: 0});
    }else{
      info.frames.forEach((frameInfo)=>{
        if (frameInfo.frameType === "IFrame" || frameInfo.frameType === "PFrame"){
          SM4.rc4_decrypt(u8Arr1, rc4_secret, {
            shiftStart: frameInfo.pos + customEncryptionOffset,
            end: frameInfo.posEnd,
          });          
        }
      })
    }
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
  if (customTransform === "transparentWithFlagOn"){
    addLog(customTransform + "模式不会进行加解密，数据直接送入编码器/解码器")
  } else {
    addLog(customTransform + "模式只能进入未开启自定义加密的房间")
  }
}

function encodeFunctionTransparent({mediaType, encodedFrame, controller, streamType}){
  findCryptIndexH264(new Uint8Array(encodedFrame.data))
  controller.enqueue(encodedFrame);
}

function decodeFunctionTransparent({mediaType, encodedFrame, controller, uid}){
  findCryptIndexH264(new Uint8Array(encodedFrame.data))
  controller.enqueue(encodedFrame);
}
//ENDOF transparent

//STARTOF 加解密通用方法
function printInfoBeforeDecrypt(evt){
  if ((evt.mediaType === "video" || evt.mediaType === "screen") && printRecvVideoFrame){
    const u8Arr1 = new Uint8Array(evt.encodedFrame.data);
    const info = findCryptIndexH264(u8Arr1);
    console.log(`（解密前）uid ${evt.uid}，媒体类型 ${evt.mediaType}，帧类型 ${evt.encodedFrame.type}，帧长度 ${evt.encodedFrame.data.byteLength}，H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join(), "，前100字节帧内容", u8Arr1.slice(0, 100));
  }
}
function printInfoBeforeEncrypt(evt){
  if ((evt.mediaType === "video" || evt.mediaType === "screen") && printEncodedVideoFrame){
    const u8Arr1 = new Uint8Array(evt.encodedFrame.data);
    const info = findCryptIndexH264(u8Arr1);
    console.log(`（加密前）媒体类型 ${evt.mediaType}，大小流 ${evt.streamType}，帧类型 ${evt.encodedFrame.type}，帧长度 ${evt.encodedFrame.data.byteLength}，H264帧类型`, info.frames.map((frame)=>{return frame.frameType}).join(), "，前100字节帧内容", u8Arr1.slice(0, 100));
  }
}
function initCustomEncrypt(){
  customEncryptionOffset = parseInt($("#customEncryptionOffset").val())
  printRecvVideoFrame = $("#printRecvVideoFrame").is(":checked")
  console.log("printRecvVideoFrame:", printRecvVideoFrame)
  printEncodedVideoFrame = $("#printEncodedVideoFrame").is(":checked")
  console.log("printEncodedVideoFrame:", printEncodedVideoFrame)
}
//ENDOF 加解密通用方法

// 基于window.customTransform
const processSenderTransform = function(evt){
  printInfoBeforeEncrypt(evt)
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
  printInfoBeforeDecrypt(evt)
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