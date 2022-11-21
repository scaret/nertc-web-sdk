export const USER_AGENT = (window.navigator && window.navigator.userAgent) || ''
export const USER_LANGUAGE = window.navigator && window.navigator.language
export const IS_IPAD = /iPad/i.test(USER_AGENT)
export const IS_IPHONE = /iPhone/i.test(USER_AGENT) && !IS_IPAD
export const IS_IPOD = /iPod/i.test(USER_AGENT)
export const IS_IOS = IS_IPHONE || IS_IPAD || IS_IPOD

export const IOS_VERSION =
  IS_IOS &&
  (function () {
    const match = USER_AGENT.match(/\b[0-9]+_[0-9]+(?:_[0-9]+)?\b/) || ['']
    if (match && match[0]) {
      return match[0].replace(/_/g, '.')
    }
    return null
  })()
export const IOS_MAJOR_VERSION =
  IOS_VERSION &&
  (function () {
    const match = IOS_VERSION.match(/\d+.?\d/)
    if (match && match[0]) {
      return parseFloat(match[0])
    }
    return null
  })()
export const IS_ANDROID = /Android/i.test(USER_AGENT)
export const ANDROID_VERSION =
  IS_ANDROID &&
  (function () {
    // This matches Android Major.Minor.Patch versions
    // ANDROID_VERSION is Major.Minor as a Number, if Minor isn't available, then only Major is returned
    const match = USER_AGENT.match(/Android (\d+)(?:\.(\d+))?(?:\.(\d+))*/i)

    if (!match) {
      return null
    }

    const major = match[1]
    const minor = match[2]
    const minor2 = match[3]

    if (major && minor && minor2) {
      return major + '.' + minor + '.' + minor2
    } else if (major && minor) {
      return major + '.' + minor
    } else if (major) {
      return major
    }
    return null
  })()

// Firefox
export const IS_FIREFOX = /Firefox/i.test(USER_AGENT)
// Firefox version
export const FIREFOX_VERSION =
  IS_FIREFOX &&
  (function () {
    const match = navigator.userAgent.match(/Firefox\/([\d.]+)/)
    if (match && match[1]) {
      return match[1]
    }
    return null
  })()

// Firefox major version
export const FIREFOX_MAJOR_VERSION =
  IS_FIREFOX &&
  (function () {
    const match = USER_AGENT.match(/Firefox\/(\d+)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// old Edge
export const IS_EDGE = /Edge\//i.test(USER_AGENT)
export const EDGE_VERSION =
  IS_EDGE &&
  (function () {
    var match = USER_AGENT.match(/Edge\/(\d+)/i)
    if (match && match[1]) {
      return match[1]
    }
  })()
// new Edge
export const IS_EDG = /Edg\//i.test(USER_AGENT)

// EDG major version
export const EDG_MAJOR_VERSION =
  IS_EDG &&
  (function () {
    const match = USER_AGENT.match(/Edg\/(\d+)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// EDG exact version
export const EDG_VERSION =
  IS_EDG &&
  (function () {
    const match = USER_AGENT.match(/Edg\/([\d.]+)/)
    if (match && match[1]) {
      return match[1]
    }
    return null
  })()

// sogou mobile
export const IS_SOGOUM = /SogouMobileBrowser\//i.test(USER_AGENT)
export const SOGOUM_VERSION =
  IS_SOGOUM &&
  (function () {
    const match = USER_AGENT.match(/SogouMobileBrowser\/(\d+)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// sogou desktop
export const IS_SOGOU = /MetaSr\s/i.test(USER_AGENT)
export const SOGOU_VERSION =
  IS_SOGOU &&
  (function () {
    const match = USER_AGENT.match(/MetaSr(\s\d+(\.\d+)+)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// TBS kernel
export const IS_TBS = /TBS\/\d+/i.test(USER_AGENT) // 仅 X5 内核，QQ 浏览器默认 x5 内核，但是 agent 没有 TBS
export const TBS_VERSION =
  IS_TBS &&
  (function () {
    var match = USER_AGENT.match(/TBS\/(\d+)/i)
    if (match && match[1]) {
      return match[1]
    }
  })()
// XWEB kernrl
export const IS_XWEB = /XWEB\/\d+/i.test(USER_AGENT)
export const XWEB_VERSION =
  IS_XWEB &&
  (function () {
    var match = USER_AGENT.match(/XWEB\/(\d+)/i)
    if (match && match[1]) {
      return match[1]
    }
  })()

// IE
export const IS_IE8 = /MSIE\s8\.0/.test(USER_AGENT)
export const IS_IE = /MSIE\/\d+/i.test(USER_AGENT)
export const IE_VERSION =
  IS_IE &&
  (function () {
    const result = /MSIE\s(\d+)\.\d/.exec(USER_AGENT)
    let version = result && parseFloat(result[1])

    if (!version && /Trident\/7.0/i.test(USER_AGENT) && /rv:11.0/.test(USER_AGENT)) {
      // IE 11 has a different user agent string than other IE versions
      version = 11.0
    }

    return version
  })()

export const IS_WECHAT = /(micromessenger|webbrowser)/i.test(USER_AGENT)
export const WECHAT_VERSION =
  IS_WECHAT &&
  (function () {
    var match = navigator.userAgent.match(/MicroMessenger\/([\d.]+)/)
    if (match && match[1]) {
      return match[1]
    }
  })()
export const WECHAT_MAJOR_VERSION =
  IS_WECHAT &&
  (function () {
    var match = USER_AGENT.match(/MicroMessenger\/(\d+)/i)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  })()

// mobile QQ X5 kernel
export const IS_X5MQQB =
  !IS_TBS && /MQQBrowser\/\d+/i.test(USER_AGENT) && /COVC\/\d+/i.test(USER_AGENT)
// mobile QQ
export const IS_MQQB =
  !IS_TBS && /MQQBrowser\/\d+/i.test(USER_AGENT) && !/COVC\/\d+/i.test(USER_AGENT)

export const MQQB_VERSION =
  (IS_MQQB || IS_X5MQQB) &&
  (function () {
    const match = USER_AGENT.match(/ MQQBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// windows QQ
export const IS_WQQB = !IS_TBS && / QQBrowser\/\d+/i.test(USER_AGENT)
export const WQQB_VERSION =
  IS_WQQB &&
  (function () {
    const match = USER_AGENT.match(/ QQBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// Mac QQ
export const IS_MACQQB = !IS_TBS && /QQBrowserLite\/\d+/i.test(USER_AGENT)
export const MACQQB_VERSION =
  IS_MACQQB &&
  (function () {
    const match = USER_AGENT.match(/QQBrowserLite\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// iPad QQ
export const IS_IPADQQB = !IS_TBS && /MQBHD\/\d+/i.test(USER_AGENT)
export const IPADQQB_VERSION =
  IS_IPADQQB &&
  (function () {
    const match = USER_AGENT.match(/MQBHD\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// window system
export const IS_WIN = /Windows/i.test(USER_AGENT)
export const WIN_VERSION =
  IS_WIN &&
  (function () {
    const match = USER_AGENT.match(/Windows NT (\d+)(?:\.(\d+))?(?:\.(\d+))*/i)
    const major = match && match[1]
    const minor = match && match[2]

    if (major && minor) {
      return major + '.' + minor
    } else if (major) {
      return major
    }
    return null
  })()
// MAC system，先检查 IOS
export const IS_MAC = !IS_IOS && /MAC OS X/i.test(USER_AGENT)

export const MACOS_VERSION =
  IS_MAC &&
  (function () {
    const match = USER_AGENT.match(/\b[0-9]+_[0-9]+(?:_[0-9]+)?\b/) || ['']
    if (match && match[0]) {
      return match[0].replace(/_/g, '.')
    }
    return null
  })()

export const IS_LINUX = !IS_ANDROID && /Linux/i.test(USER_AGENT)
// weixin
export const IS_WX = /MicroMessenger/i.test(USER_AGENT)
export const IS_UCBROWSER = /UCBrowser/i.test(USER_AGENT)
// electron
export const IS_ELECTRON = /Electron/i.test(USER_AGENT)
export const ELECTRON_VERSION =
  IS_ELECTRON &&
  (function () {
    const match = USER_AGENT.match(/Electron\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()
// xiaomi
export const IS_MIBROWSER = /MiuiBrowser/i.test(USER_AGENT)
export const MI_VERSION =
  IS_MIBROWSER &&
  (function () {
    const match = USER_AGENT.match(/MiuiBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()
// huawei
export const IS_HUAWEIBROWSER = /HuaweiBrowser/i.test(USER_AGENT)
export const HUAWEI_VERSION =
  IS_HUAWEIBROWSER &&
  (function () {
    const match = USER_AGENT.match(/HuaweiBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// samsung
export const IS_SAMSUNGBROWSER = /SamsungBrowser/i.test(USER_AGENT)
export const SAMSUNG_VERSION =
  IS_SAMSUNGBROWSER &&
  (function () {
    const match = USER_AGENT.match(/SamsungBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// OPPO
export const IS_OPPOBROWSER = /HeyTapBrowser/i.test(USER_AGENT)
export const OPPO_VERSION =
  IS_OPPOBROWSER &&
  (function () {
    const match = USER_AGENT.match(/HeyTapBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// Vivo
export const IS_VIVOBROWSER = /VivoBrowser/i.test(USER_AGENT)
export const VIVO_VERSION =
  IS_VIVOBROWSER &&
  (function () {
    const match = USER_AGENT.match(/VivoBrowser\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// Chrome
export const IS_CHROME_ONLY = /Chrome/i.test(USER_AGENT)
export const IS_CHROME =
  !IS_EDGE &&
  !IS_SOGOU &&
  !IS_SOGOUM &&
  !IS_TBS &&
  !IS_XWEB &&
  !IS_EDG &&
  !IS_WQQB &&
  !IS_MIBROWSER &&
  !IS_HUAWEIBROWSER &&
  !IS_SAMSUNGBROWSER &&
  !IS_OPPOBROWSER &&
  !IS_VIVOBROWSER &&
  /Chrome/i.test(USER_AGENT)

// Chrome major version
export const CHROME_MAJOR_VERSION =
  IS_CHROME &&
  (function () {
    const match = USER_AGENT.match(/Chrome\/(\d+)/)

    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// Chrome exact version
export const CHROME_VERSION =
  IS_CHROME &&
  (function () {
    const match = USER_AGENT.match(/Chrome\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

// iOS 的 Chrome/Edge/Firefox 浏览器支持的条件是 IOS_MAJOR_VERSION 版本要大于 14.3
// iOS Chrome
export const IS_IOS_CHROME = /CriOS/i.test(USER_AGENT)
// iOS Chrome exact Version / String
export const IOS_CHROME_VERSION =
  IS_IOS_CHROME &&
  (function () {
    const match = USER_AGENT.match(/CriOS\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()
// iOS Chrome major version
export const IOS_CHROME_MAJOR_VERSION =
  IS_IOS_CHROME &&
  (function () {
    const match = USER_AGENT.match(/CriOS\/(\d+)/)

    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// iOS Edge
export const IS_IOS_EDGE = /EdgiOS/i.test(USER_AGENT)
// iOS Edge exact Version / String
export const IOS_EDGE_VERSION =
  IS_IOS_EDGE &&
  (function () {
    const match = USER_AGENT.match(/EdgiOS\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()
// iOS Edge major version
export const IOS_EDGE_MAJOR_VERSION =
  IS_IOS_EDGE &&
  (function () {
    const match = USER_AGENT.match(/EdgiOS\/(\d+)/)

    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// iOS Firefox
export const IS_IOS_FIREFOX = /FxiOS/i.test(USER_AGENT)
// iOS Firefox exact Version / String
export const IOS_FIREFOX_VERSION =
  IS_IOS_FIREFOX &&
  (function () {
    const match = USER_AGENT.match(/FxiOS\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()
// iOS Firefox major version
export const IOS_FIREFOX_MAJOR_VERSION =
  IS_IOS_FIREFOX &&
  (function () {
    const match = USER_AGENT.match(/FxiOS\/(\d+)/)

    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// Safari
export const IS_SAFARI =
  !IS_CHROME_ONLY &&
  !IS_MQQB &&
  !IS_X5MQQB &&
  !IS_MACQQB &&
  !IS_IPADQQB &&
  /Safari/i.test(USER_AGENT)

export const IS_ANY_SAFARI = IS_SAFARI || IS_IOS

// Safari major version
export const SAFARI_MAJOR_VERSION =
  IS_SAFARI &&
  (function () {
    const match = USER_AGENT.match(/Version\/(\d+)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  })()

// Safari exact version
export const SAFARI_VERSION =
  IS_SAFARI &&
  (function () {
    const match = USER_AGENT.match(/Version\/([\d.]+)/)
    if (match && match[1]) return match[1]
    return null
  })()

export const IS_MAC_SAFARI = IS_SAFARI && IS_MAC

export const IS_IOS_SAFARI = IS_SAFARI && IS_IOS

// file, localhost or ip
export const IS_LOCAL =
  window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)

export const IS_ZH = /zh/i.test(USER_LANGUAGE)
export const IS_EN = /en/i.test(USER_LANGUAGE)
