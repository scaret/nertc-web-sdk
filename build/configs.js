var config = {}

// 测试程序的端口
var http = 2000
var https = 3000

// lbsUrl
const lbsUrlMap = {
  development: 'https://imtest.netease.im/lbs/webconf.jsp',
  pre: 'https://imtest.netease.im/lbsrc/webconf.jsp',
  production: 'https://lbs.netease.im/lbs/webconf.jsp'
}
lbsUrlMap.test = lbsUrlMap.development
lbsUrlMap.custom = lbsUrlMap.production

// defaultLink

const defaultLinkUrlMap = {
  test: 'imtest4.netease.im:443',
  production: 'weblink.netease.im'
}
defaultLinkUrlMap.development = defaultLinkUrlMap.test
defaultLinkUrlMap.pre = defaultLinkUrlMap.production
defaultLinkUrlMap.custom = defaultLinkUrlMap.production

// auth
var token = 'e10adc3949ba59abbe56e057f20f883e'
const authsMap = {
  development: {
    appKey: 'fe416640c8e8a72734219e1847ad2547',
    token,
    chatroomAddress: 'testlink.netease.im:9093 testlink.netease.im:10843',
    roomserver: 'roomserver-test.netease.im',
    defaultReportUrl: 'https://imtest.netease.im/1.gif'
  },
  pre: {
    appKey: '45c6af3c98409b18a84451215d0bdd6e',
    token,
    chatroomAddress: 'wlnim05.netease.im:9092',
    roomserver: 'roomserver.netease.im',
    defaultReportUrl: 'https://dr.netease.im/1.gif'
  }
}
authsMap.test = Object.assign({}, authsMap.development)
authsMap.production = Object.assign({}, authsMap.pre)
authsMap.production.chatroomAddress = 'dgphy10.netease.im:9093'
authsMap.custom = Object.assign({}, authsMap.production)

const netDetectAddr = {
  production: 'https://roomserver-dev.netease.im/v1/sdk/detect/local',
  development: 'https://roomserver-test.netease.im/v1/sdk/detect/local'
}
netDetectAddr.test = netDetectAddr.development
netDetectAddr.custom = netDetectAddr.development
netDetectAddr.pre = netDetectAddr.production

const nrtcNetcall = {
  production: {
    checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
    // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
    getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action'
  },
  development: {
    checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
    // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
    getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action'
  }
}
nrtcNetcall.test = Object.assign({}, nrtcNetcall.development)
nrtcNetcall.custom = Object.assign({}, nrtcNetcall.development)
nrtcNetcall.pre = Object.assign({}, nrtcNetcall.production)

// 探测ip version
const ipProbeAddr = {
  test: {
    ipv4: 'https://imtest4.netease.im/test/',
    ipv6: 'https://imtest6.netease.im:8012/'
  }, 
  production: {
    ipv4: 'https://detect4.netease.im/test/',
    ipv6: 'https://detect6.netease.im/test/'
  }
}
ipProbeAddr.development = ipProbeAddr.custom = Object.assign({}, ipProbeAddr.test)
ipProbeAddr.pre = Object.assign({}, ipProbeAddr.test)

const nrtcWebRTC2 = {
  production: {
    checkSumUrl: 'https://nrtc.netease.im/demo/getChecksum.action',
    // appkey: '4c418f22935f1e2cf8488ff1c84229c0',
    createChannelUrl: 'https://nrtc.netease.im/nrtc/createChannel.action',
    getChannelInfoUrl: 'https://nrtc.netease.im/nrtc/getChannelInfos.action',
    roomTaskUrl: 'https://roomserver.netease.im/v2/sdk/rooms/'
  },
  development: {
    checkSumUrl: 'https://webtest.netease.im/nrtcproxy/demo/getChecksum.action',
    // appkey: 'a1266611da6dfb6fc59bc03df11ebdbd',
    createChannelUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/createChannel.action',
    getChannelInfoUrl: 'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action',
    roomTaskUrl: 'https://roomserver-greytest.netease.im/v2/sdk/rooms/'
  }
}
nrtcWebRTC2.test = Object.assign({}, nrtcWebRTC2.development)
nrtcWebRTC2.custom = Object.assign({}, nrtcWebRTC2.development)
nrtcWebRTC2.pre = Object.assign({}, nrtcWebRTC2.production)


// 各种环境
const envs = (config.envs = [
  'development',
  'test',
  'pre',
  'production',
  'custom'
])

envs.forEach(env => {
  // 为每一个环境赋一份新的配置
  var c = (config[env] = {})
  // 添加 ports
  c.ports = {
    http: http++,
    https: https++
  }
  c.lbsUrl = lbsUrlMap[env]
  c.defaultLinkUrl = defaultLinkUrlMap[env]
  // 添加 auth
  c.auth = authsMap[env]
  c.netDetectAddr = netDetectAddr[env]
  c.nrtcNetcall = nrtcNetcall[env]
  c.ipProbeAddr = ipProbeAddr[env]
  c.nrtcWebRTC2 = nrtcWebRTC2[env]
})

module.exports = config
