import * as env from './rtcEnvironment';

const OSNameMap = new Map([
    [env.IS_ANDROID, ['Android', env.ANDROID_VERSION]],
    [env.IS_IOS, ['iOS', env.IOS_VERSION]],
    [env.IS_WIN, ['Windows', env.WIN_VERSION]],
    [env.IS_MAC, ['MacOS', env.MACOS_VERSION]]
  ]);
  
  export function getOSInfo() {
    let osName = 'unknown',
      osVersion = 'unknown';
    if (OSNameMap.get(true)) {
      //@ts-ignore
      osName = OSNameMap.get(true)[0];
      //@ts-ignore
      osVersion = OSNameMap.get(true)[1];
    }
    return { osName, osVersion };
  }
  
  const browserInfoMap = new Map([
    [env.IS_FIREFOX, ['Firefox', env.FIREFOX_VERSION]],
    [env.IS_EDG, ['Edg', env.EDG_VERSION]],
    [env.IS_CHROME, ['Chrome', env.CHROME_VERSION]],
    [env.IS_SAFARI, ['Safari', env.SAFARI_VERSION]],
    [env.IS_WECHAT, ['WeChat', env.WECHAT_VERSION]],
    [env.IS_WQQB, ['QQ(Win)', env.WQQB_VERSION]],
    [env.IS_MQQB, ['QQ(Mobile)', env.MQQB_VERSION]],
    [env.IS_X5MQQB, ['QQ(Mobile X5)', env.MQQB_VERSION]],
    [env.IS_MACQQB, ['QQ(Mac)', env.MACQQB_VERSION]],
    [env.IS_IPADQQB, ['QQ(iPad)', env.IPADQQB_VERSION]],
    [env.IS_MIBROWSER, ['MI', env.MI_VERSION]],
    [env.IS_HUAWEIBROWSER, ['HW', env.HUAWEI_VERSION]],
    [env.IS_SAMSUNGBROWSER, ['Samsung', env.SAMSUNG_VERSION]],
    [env.IS_OPPOBROWSER, ['OPPO', env.OPPO_VERSION]],
    [env.IS_VIVOBROWSER, ['VIVO', env.VIVO_VERSION]],
    [env.IS_EDGE, ['EDGE', env.EDGE_VERSION]],
    [env.IS_SOGOUM, ['SogouMobile', env.SOGOUM_VERSION]],
    [env.IS_SOGOU, ['Sogou', env.SOGOU_VERSION]],
    [env.IS_ELECTRON, ['Sogou', env.ELECTRON_VERSION]]
  ]);
  
  export function getBrowserInfo() {
    let browserName = 'unknown',
      browserVersion = 'unknown';
    if (browserInfoMap.get(true)) {
      //@ts-ignore
      browserName = browserInfoMap.get(true)[0];
      //@ts-ignore
      browserVersion = browserInfoMap.get(true)[1];
    }
    return { browserName, browserVersion };
  }