var NRTC_ENV = {
  DEV: {
    appkey: "a1266611da6dfb6fc59bc03df11ebdbd",
    // requestUrl:
    //   "https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action",
    // checkSumUrl: "https://webtest.netease.im/nrtcproxy/demo/getChecksum.action",
    // websocket: {
    //   rtc: "wss://webrtcgwbj.netease.im?ip=223.252.198.238:5001",
    //   bb: "wss://wbhz1.netease.im/?ip=223.252.198.177:8083"
    // },
    // roomServerUrl: 'https://roomserver-test.netease.im/v1/sdk/command/rooms/'
  },
  PROD: {
    appkey: "eca23f68c66d4acfceee77c200200359",
    // requestUrl: "https://nrtc.netease.im/nrtc/getChannelInfos.action",
    // checkSumUrl: "https://nrtc.netease.im/demo/getChecksum.action",
    // websocket: {
    //   rtc: "wss://webrtcgateway01.netease.im",
    //   bb: "wss://wbhz1.netease.im/?ip=223.252.198.177:8083"
    // },
    // roomServerUrl: 'https://roomserver.netease.im/v1/sdk/command/rooms/'
  }
};

//扩充默认对象的属性，以兼容第三方库
// Array.prototype.abc = 123;
// Array.prototype.def = null;
// Array.prototype.ghi = function(){};
// Array.prototype.jkl = undefined;

