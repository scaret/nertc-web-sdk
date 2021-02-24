
//https://github.com/matthewhudson/current-device

const device:{[func:string]: any;} = {
}

// The <html> element.
const documentElement = window.document.documentElement

// The client user agent string.
// Lowercase, so we can use the more efficient indexOf(), instead of Regex
const userAgent = window.navigator.userAgent.toLowerCase()

// Detectable television devices.
const television = [
  'googletv',
  'viera',
  'smarttv',
  'internet.tv',
  'netcast',
  'nettv',
  'appletv',
  'boxee',
  'kylo',
  'roku',
  'dlnadoc',
  'pov_tv',
  'hbbtv',
  'ce-html'
]

// Main functions
// --------------

device.macos = function() {
  return find('mac')
}

device.ios = function() {
  return device.iphone() || device.ipod() || device.ipad()
}

device.iphone = function() {
  return !device.windows() && find('iphone')
}

device.ipod = function() {
  return find('ipod')
}

device.ipad = function() {
  return find('ipad')
}

device.android = function() {
  return !device.windows() && find('android')
}

device.androidPhone = function() {
  return device.android() && find('mobile')
}

device.androidTablet = function() {
  return device.android() && !find('mobile')
}

device.blackberry = function() {
  return find('blackberry') || find('bb10') || find('rim')
}

device.blackberryPhone = function() {
  return device.blackberry() && !find('tablet')
}

device.blackberryTablet = function() {
  return device.blackberry() && find('tablet')
}

device.windows = function() {
  return find('windows')
}

device.windowsPhone = function() {
  return device.windows() && find('phone')
}

device.windowsTablet = function() {
  return device.windows() && (find('touch') && !device.windowsPhone())
}

device.fxos = function() {
  return (find('(mobile') || find('(tablet')) && find(' rv:')
}

device.fxosPhone = function() {
  return device.fxos() && find('mobile')
}

device.fxosTablet = function() {
  return device.fxos() && find('tablet')
}

device.meego = function() {
  return find('meego')
}

device.cordova = function() {
// @ts-ignore
  return window.cordova && location.protocol === 'file:'
}

device.nodeWebkit = function() {
  return typeof (window as any).process === 'object'
}

device.mobile = function() {
  return (
    device.androidPhone() ||
    device.iphone() ||
    device.ipod() ||
    device.windowsPhone() ||
    device.blackberryPhone() ||
    device.fxosPhone() ||
    device.meego()
  )
}

device.tablet = function() {
  return (
    device.ipad() ||
    device.androidTablet() ||
    device.blackberryTablet() ||
    device.windowsTablet() ||
    device.fxosTablet()
  )
}

device.weixin = function() {
  return find('micromessenger') 
}

device.h5 = function() {
  return device.tablet() || device.mobile() || device.weixin()
}

device.desktop = function() {
  return !device.tablet() && !device.mobile()
}

device.television = function() {
  let i = 0
  while (i < television.length) {
    if (find(television[i])) {
      return true
    }
    i++
  }
  return false
}

device.portrait = function() {
  if (
    // @ts-ignore
    screen.orientation &&
    Object.prototype.hasOwnProperty.call(window, 'onorientationchange')
  ) {
    return includes(screen.orientation.type, 'portrait')
  }
  return window.innerHeight / window.innerWidth > 1
}

device.landscape = function() {
  if (
    screen.orientation &&
    Object.prototype.hasOwnProperty.call(window, 'onorientationchange')
  ) {
    return includes(screen.orientation.type, 'landscape')
  }
  return window.innerHeight / window.innerWidth < 1
}

// Private Utility Functions
// -------------------------

// Check if element exists
function includes(haystack:string, needle:string) {
  return haystack.indexOf(needle) !== -1
}

// Simple UA string search
function find(needle:string) {
  return includes(userAgent, needle)
}

// Public functions to get the current value of type, os, or orientation
// ---------------------------------------------------------------------
function findMatch(arr:string[]) {
  for (let i = 0; i < arr.length; i++) {
    if (device[arr[i]]()) {
      return arr[i]
    }
  }
  return 'unknown'
}

device.type = findMatch(['mobile', 'tablet', 'desktop'])
device.os = findMatch([
  'ios',
  'iphone',
  'ipad',
  'ipod',
  'android',
  'blackberry',
  'macos',
  'windows',
  'fxos',
  'meego',
  'television'
])

function getVersion(uastring:string, expr:RegExp, pos:number) {
  var match = uastring.match(expr)
  return match && match.length >= pos && parseInt(match[pos], 10)
}

function detectBrowser () {
  var navigator = window && window.navigator
  // Returned result object.
  var result:{[prop:string]: string|null|number|false;} = {};
  result.ua = null;
  result.version = null;
  result.UIVersion = null;

  // Fail early if it's not a browser
  if (typeof window === 'undefined' || !window.navigator) {
    result.ua = 'Not a browser.'
    return result
  }
  
  if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
    result.ua = 'edge'
    result.version = getVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2)
    // @ts-ignore
    result.UIVersion = navigator.userAgent.match(/Edge\/([\d.]+)/)[1] //Edge/16.17017
    // @ts-ignore
  } else if (navigator.mozGetUserMedia) {
    result.ua = 'firefox'
    result.version = getVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1)
    // @ts-ignore
    result.UIVersion = navigator.userAgent.match(/Firefox\/([\d.]+)/)[1] //Firefox/64.0
  } else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
    // Chrome, Chromium, Webview, Opera, Vivaldi all use the chrome shim for now
    if (/micromessenger/.test(userAgent)) {
      result.ua = 'weixin'
      result.version = getVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
      // @ts-ignore
      result.UIVersion = navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/) && navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/).length > 1 && navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2] //Chrome/74.0.3263.100 
    } else if (navigator.userAgent.match(/(OPR|Opera).([\d.]+)/)) {
      result.ua = 'opera'
      result.version = getVersion(navigator.userAgent, /O(PR|pera)\/(\d+)\./, 2)
      // @ts-ignore
      result.UIVersion = navigator.userAgent.match(/O(PR|pera)\/([\d.]+)/)[2] //OPR/48.0.2685.39
    } else if (/Chrome/gi.test(navigator.userAgent)) {
      result.ua = 'chrome'
      result.version = getVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
      // @ts-ignore
      result.UIVersion = navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/) && navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/).length > 1 && navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2] //Chrome/74.0.3263.100 
    } else {
      result.ua = 'unknown'
      return result;
    }
    // @ts-ignore
  } else if ((!navigator.webkitGetUserMedia && navigator.userAgent.match(/AppleWebKit\/([0-9]+)\./)) || (navigator.webkitGetUserMedia && !navigator.webkitRTCPeerConnection)) {
    if (/micromessenger/.test(userAgent)) {
      result.ua = 'weixin'
      result.version = getVersion(userAgent, /micromessenger\/(\d+)\./, 2)
      // @ts-ignore
      result.UIVersion = 7.0 //navigator.userAgent.match(/micromessenger\/([\d.]+)/).length && navigator.userAgent.match(/micromessenger\/([\d.]+)/).length > 2  && navigator.userAgent.match(/micromessenger\/([\d.]+)/)[2] //Chrome/74.0.3263.100 
    } else if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
      result.ua = 'safari'
      //result.version = getVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1)
      // @ts-ignore
      result.version = navigator.userAgent.match(/Version\/([\d]+)/)[1]
      // @ts-ignore
      result.UIVersion = navigator.userAgent.match(/Version\/([\d.]+)/)[1] //Version/11.0.1
    } else {
      result.ua = 'unknown'
      return result;
    }
  } else {
    result.ua = 'unknown'
    return result;
  }
  return result;
}

device.browser = detectBrowser()

device.browser.greaterThanOrEqualToSafari_12_1_1 = function() {
  if (device.browser.ua !== 'safari' || !device.browser.UIVersion) {
    return false
  }

  const version = device.browser.UIVersion.split('.')
  if (version.length === 1) {
    if (version[0] < 12) {
      return false
    } else {
      return true
    }
  } else if (version.length === 2) {
    if (version[0] > 12) {
      return true
    } else if (version[0] < 12) {
      return false
    } else if (version[1] < 1) {
      return false
    } else {
      return true
    }
  } else {
    if (version[0] > 12) {
      return true
    } else if (version[0] < 12) {
      return true
    } else if (version[1] < 1) {
      return false
    } else if (version[2] < 1) {
      return false
    } else {
      return true
    }
  }
}

device.browser.lessThanSafari_13 = function() {
  if (device.browser.ua !== 'safari' || !device.browser.UIVersion) {
    return true
  }

  const version = device.browser.UIVersion.split('.')
  if (version.length < 1) {
    return false
  } else if (version[0] < 13) {
    return false
  } else {
    return true
  }
}

device.browser.lessThanSafari_12_1_1 = function() {
  if (device.browser.ua !== 'safari' || !device.browser.UIVersion) {
    return false
  }
  return !device.browser.greaterThanOrEqualToSafari_12_1_1()
}

device.browser.safari_12_1 = function() {
  if (device.browser.ua !== 'safari' || !device.browser.UIVersion) {
    return false
  }
  const version = device.browser.UIVersion.split('.')
  if (version.length != 2) {
    return false
  } else if (version[0] != 12) {
    return false
  } else if (version[1] != 1) {
    return false
  } else {
    return true
  }
}

device.browser.safari_12_0_1 = function() {
  if (device.browser.ua !== 'safari' || !device.browser.UIVersion) {
    return false
  }
  const version = device.browser.UIVersion.split('.')
  if (version.length < 3) {
    return false
  } else if (version[0] !== 12) {
    return false
  } else if (version[1] !== 0) {
    return false
  } else if (version[2] !== 1) {
    return false
  } else {
    return true
  }
}

function setOrientationCache() {
  device.orientation = findMatch(['portrait', 'landscape'])
}

setOrientationCache()

const RtcSystem = device;

export {
  RtcSystem 
}
