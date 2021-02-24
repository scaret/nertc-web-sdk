/* globals hash:false, shortHash:false, version:false, agentVersion:false, nrtcVersion:fale, sdkVersion:false, nrtcSdkVersion:false, protocolVersion:false, lbsUrl:true, roomserver:true, defaultReportUrl: true */
// those globals will be injected via webpack, @see ./build/webpack.config.js

var theAnswerToEverything =
  process.env.NODE_ENV === 'development' ? 5 * 1000 : 8 * 1000

var config = {
  info: {
    hash: hash,
    shortHash: shortHash,
    version: version,
    sdkVersion: sdkVersion,
    nrtcVersion: nrtcVersion,
    webrtcG2Version:webrtcG2Version,
    nrtcSdkVersion: nrtcSdkVersion,
    protocolVersion: protocolVersion
  },
  agentVersion: agentVersion,
  lbsUrl: lbsUrl,
  roomserver: roomserver,
  // lbs 最大重试次数, 当所有 lbs 地址都不可用的时候, 会尝试重新获取 lbs 地址, 目前只重试一次
  // lbsMaxRetryCount: 1,
  // 连接超时时间
  connectTimeout: theAnswerToEverything,
  // xhr 超时时间
  xhrTimeout: theAnswerToEverything,
  // socket 超时时间
  socketTimeout: theAnswerToEverything,
  // 重连间隔和最大间隔
  reconnectionDelay: 1600, // 656.25,
  reconnectionDelayMax: theAnswerToEverything,
  reconnectionJitter: 0.01,
  reconnectiontimer: null, // 断线重连超时时间
  // 心跳间隔
  heartbeatInterval: 60 * 1000,

  // 协议超时时间
  cmdTimeout: theAnswerToEverything,
  defaultReportUrl: defaultReportUrl,
  isWeixinApp: false, // isWeixinApp
  isNodejs: false, // isNodejs
  isRN: false,
  ipVersion: 0, // 0-ipv4 1-ipv6
  // 推送相关
  PUSHTOKEN: '',
  PUSHCONFIG: {},
  CLIENTTYPE: 16,
  // iOS只能询问1次
  PushPermissionAsked: false,
  iosPushConfig: null,
  androidPushConfig: null,
  // 网络探测地址 通过webpack注入
  netDetectAddr: netDetectAddr,
  // web端、微信端lbs地址请求失败的时候使用的默认link地址
  optionDefaultLinkUrl: '',
  defaultLinkUrl: defaultLinkUrl,
  ipv6DefaultLinkUrl: defaultLinkUrl,
  optionIpv6DefaultLinkUrl: '',
  wxDefaultLinkUrl: 'wlnimsc0.netease.im'
}
// 对配置的或默认的link地址进行处理
config.getDefaultLinkUrl = function (secure) {
  var optionsLink
  var defaultLink

  if (config.ipVersion === 1) {
    optionsLink = config.optionIpv6DefaultLinkUrl
    defaultLink = config.ipv6DefaultLinkUrl
  } else {
    optionsLink = config.optionDefaultLinkUrl
    defaultLink = config.defaultLinkUrl
  }

  var url = optionsLink || (config.isWeixinApp ? config.wxDefaultLinkUrl : defaultLink)

  if (!url) {
    return false
  }
  const prefix = secure ? 'https' : 'http'
  const port = secure ? '443' : '80'
  var resUrl = url
  if (url.indexOf('http') === -1) {
    resUrl = prefix + '://' + resUrl
  }
  if (url.indexOf(':') === -1) {
    resUrl = resUrl + ':' + port
  }
  return resUrl
}

// 通过webpack注入
config.weixinNetcall = config.nrtcNetcall = {
  checkSumUrl: nrtcNetcallCheckSumUrl,
  getChannelInfoUrl: nrtcNetcallGetChannelInfoUrl
}
config.ipProbeAddr = {
  ipv4: ipv4Probe,
  ipv6: ipv6Probe
}

config.nrtcWebRTC2 = {
  checkSumUrl: nrtcWebRTC2CheckSumUrl,
  getChannelInfoUrl: nrtcWebRTC2GetChannelInfoUrl,
  createChannelUrl:nrtcWebRTC2CreateChannelUrl,
  roomsTaskUrl: nrtcWebRTC2RoomTaskUrl
} 

// process.env.NODE_ENV === 'production' ? {
//   checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
//   // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
//   getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action'
// } : {
//   checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
//   // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
//   getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action'
// }

// =============================
// socket 服务器地址相关
// =============================
// 格式化
config.formatSocketUrl = function ({ url, secure }) {
  const prefix = secure ? 'https' : 'http'
  if (url.indexOf('http') === -1) {
    return prefix + '://' + url
  }
  return url
}

// =====================================
// nos 相关
// =====================================
config.uploadUrl = 'https://nos.netease.com' // 普通上传：表单提交上传，最大100M
config.chunkUploadUrl = null // 直传（分片上传）域名：表单+参数提交上传，分片最大4M，最多10000片；null 没有初始化过，'' 经过初始化但没有此值说明不支持
config.commonMaxSize = 104857600 // 100M
config.chunkSize = 4194304 // 4M
config.chunkMaxSize = 41943040000 // 约39G
config.replaceUrl = 'https://{bucket}-nosdn.netease.im/{object}'
config.downloadHost = 'nos.netease.com'
config.downloadUrl = 'https://{bucket}-nosdn.netease.im/{object}'
config.httpsEnabled = false
config.threshold = 0 // 可以文件快传的文件大小阈值，小于该阈值则不支持快传

// 上传地址
config.genUploadUrl = function (bucket) {
  return config.uploadUrl + '/' + bucket
}
// 有 config.chunkUploadUrl 则可以使用直传，没有则不能使用直传
config.genChunkUploadUrl = function (nosToken) {
  if (config.chunkUploadUrl) {
    return config.chunkUploadUrl + '/' + nosToken.bucket + '/' + nosToken.objectName
  }
  return ''
}
// 生成下载地址
config.genDownloadUrl = function ({bucket, tag, expireSec}, object) {
  let now = +new Date()
  let survivalTime = expireSec ? `&survivalTime=${expireSec}` : ''
  let replaceUrl = `${config.replaceUrl}?createTime=${now}${survivalTime}`
  replaceUrl = config.genNosProtocolUrl(replaceUrl)
  return replaceUrl.replace('{bucket}', bucket).replace('{object}', object)
}
// 生成获取文件信息地址
config.genFileUrl = function ({bucket, objectName}) {
  let replaceUrl = config.genNosProtocolUrl(config.replaceUrl)
  return replaceUrl.replace('{bucket}', bucket).replace('{object}', objectName)
}
config.genNosProtocolUrl = function (replaceUrl) {
  if (/^http/.test(replaceUrl)) {
    if (config.httpsEnabled && replaceUrl.indexOf('https://') !== 0) {
      replaceUrl = replaceUrl.replace('http', 'https')
    }
  } else {
    if (config.httpsEnabled) {
      replaceUrl = `https://${replaceUrl}`
    } else {
      replaceUrl = `http://${replaceUrl}`
    }
  }
  return replaceUrl
}

module.exports = config
