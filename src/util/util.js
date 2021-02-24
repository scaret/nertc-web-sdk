// const.js
export const o = {}
export const emptyObj = {}

export const f = () => {}
export const emptyFunc = () => {}

export const regBlank = /\s+/gi
export const regWhiteSpace = /\s+/gi

// getGlobal.js
export function getGlobal () {
  if (typeof window !== 'undefined') {
    return window
  }
  if (typeof global !== 'undefined') {
    return global
  }
  return {}
}

// css.js
export function detectCSSFeature (featurename) {
  let feature = false
  const domPrefixes = 'Webkit Moz ms O'.split(' ')
  if (typeof document === 'undefined') {
    console.log('error:fn:detectCSSFeature document is undefined');
    return
  }
  const elm = document.createElement('div')
  let featurenameCapital = null

  featurename = featurename.toLowerCase()

  if (elm.style[featurename] !== undefined) {
    feature = true
  }

  if (feature === false) {
    featurenameCapital =
      featurename.charAt(0).toUpperCase() + featurename.substr(1)
    for (let i = 0; i < domPrefixes.length; i++) {
      if (elm.style[domPrefixes[i] + featurenameCapital] !== undefined) {
        feature = true
        break
      }
    }
  }
  return feature
}

// date.js
export function fix (number, count) {
  count = count || 2
  let str = '' + number
  while (str.length < count) {
    str = '0' + str
  }
  return str
}

export function getYearStr (date) {
  return '' + date.getFullYear()
}

export function getMonthStr (date) {
  return fix(date.getMonth() + 1)
}

export function getDayStr (date) {
  return fix(date.getDate())
}

export function getHourStr (date) {
  return fix(date.getHours())
}

export function getMinuteStr (date) {
  return fix(date.getMinutes())
}

export function getSecondStr (date) {
  return fix(date.getSeconds())
}

export function getMillisecondStr (date) {
  return fix(date.getMilliseconds(), 3)
}

export const format = (() => {
  var reg = /yyyy|MM|dd|hh|mm|ss|SSS/g
  var mappers = {
    yyyy: getYearStr,
    MM: getMonthStr,
    dd: getDayStr,
    hh: getHourStr,
    mm: getMinuteStr,
    ss: getSecondStr,
    SSS: getMillisecondStr
  }
  return function (date, format) {
    date = new Date(date)
    if (isNaN(+date)) {
      return 'invalid date'
    }
    format = format || 'yyyy-MM-dd'
    return format.replace(reg, function (match) {
      return mappers[match](date)
    })
  }
})()

export function dateFromDateTimeLocal (str) {
  str = '' + str
  return new Date(str.replace(/-/g, '/').replace('T', ' '))
}

// type.js
export function getClass (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1)
}

export function typeOf (obj) {
  return getClass(obj).toLowerCase()
}

export function isString (obj) {
  return typeOf(obj) === 'string'
}

export function isNumber (obj) {
  return typeOf(obj) === 'number'
}

export function isBoolean (obj) {
  return typeOf(obj) === 'boolean'
}

export function isArray (obj) {
  return typeOf(obj) === 'array'
}

export function isFunction (obj) {
  return typeOf(obj) === 'function'
}

export function isDate (obj) {
  return typeOf(obj) === 'date'
}

export function isRegExp (obj) {
  return typeOf(obj) === 'regexp'
}

export function isError (obj) {
  return typeOf(obj) === 'error'
}

export function isnull (obj) {
  return obj === null
}

export function notnull (obj) {
  return obj !== null
}

// 需要用 typeof 来比较，兼容性好
export function undef (obj) {
  return typeof obj === 'undefined'
}

export function notundef (obj) {
  return typeof obj !== 'undefined'
}

export function exist (obj) {
  return notundef(obj) && notnull(obj)
}

export function notexist (obj) {
  return undef(obj) || isnull(obj)
}

export function isObject (obj) {
  return exist(obj) && typeOf(obj) === 'object'
}

/**
 * 是否是空值
 * @param  {Object}  obj 待检查的对象
 * @return {Boolean}     如果是 null/undefined/''/[] 返回 true
 */
export function isEmpty (obj) {
  return notexist(obj) || ((isString(obj) || isArray(obj)) && obj.length === 0)
}

// dom.js
export function containsNode (parent, child) {
  if (parent === child) {
    return true
  }
  while (child.parentNode) {
    if (child.parentNode === parent) {
      return true
    }
    child = child.parentNode
  }
  return false
}

export function calcHeight (node) {
  const parent = node.parentNode || (typeof document === 'undefined' ? null : document.body)
  if (!parent) {
    return 0
  }
  node = node.cloneNode(true)
  node.style.display = 'block'
  node.style.opacity = 0
  node.style.height = 'auto'
  parent.appendChild(node)
  const height = node.offsetHeight
  parent.removeChild(node)
  return height
}

export function remove (node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node)
  }
}

export function dataset (node, key, value) {
  if (exist(value)) {
    node.setAttribute('data-' + key, value)
  } else {
    return node.getAttribute('data-' + key)
  }
}

export const addEventListener = (node, type, callback) => {
  if (node.addEventListener) {
    node.addEventListener(type, callback, false)
  } else if (node.attachEvent) {
    node.attachEvent('on' + type, callback)
  }
}
export const on = addEventListener

export const removeEventListener = (node, type, callback) => {
  if (node.removeEventListener) {
    node.removeEventListener(type, callback, false)
  } else if (node.detachEvent) {
    node.detachEvent('on' + type, callback)
  }
}
export const off = removeEventListener

export function target (event) {
  return event.target || event.srcElement
}

export function createIframe (options) {
  if (typeof document === 'undefined') {
    return
  }
  options = options || {}
  var iframe
  if (options.name) {
    try {
      iframe = document.createElement(
        '<iframe name="' + options.name + '"></iframe>'
      )
      iframe.frameBorder = 0
    } catch (error) {
      iframe = document.createElement('iframe')
      iframe.name = options.name
    }
  } else {
    iframe = document.createElement('iframe')
  }
  if (!options.visible) {
    iframe.style.display = 'none'
  }
  // on load
  function onIframeLoad (event) {
    if (!iframe.src) {
      return
    }
    if (!options.multi) {
      off(iframe, 'load', onIframeLoad)
    }
    options.onload(event)
  }
  if (isFunction(options.onload)) {
    on(iframe, 'load', onIframeLoad)
  }
  // will trigger onload
  var parent = options.parent
  ;(parent || document.body).appendChild(iframe)
  // ensure trigger onload async
  var src = options.src || 'about:blank'
  setTimeout(() => {
    iframe.src = src
  }, 0)
  return iframe
}

export function html2node (html) {
  if (typeof document === 'undefined') {
    return
  }
  const div = document.createElement('div')
  div.innerHTML = html
  const children = []
  let i
  let l
  if (div.children) {
    for (i = 0, l = div.children.length; i < l; i++) {
      children.push(div.children[i])
    }
  } else {
    for (i = 0, l = div.childNodes.length; i < l; i++) {
      var child = div.childNodes[i]
      if (child.nodeType === 1) {
        children.push(child)
      }
    }
  }
  return children.length > 1 ? div : children[0]
}

export function scrollTop (top) {
  if (typeof document !== 'undefined' && exist(top)) {
    document.documentElement.scrollTop = document.body.scrollTop = top
  }
  return (
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

// forOwn.js
export function forOwn (obj = {}, callback = () => {}, that) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      callback.call(that, key, obj[key])
    }
  }
}

// mixin.js
export function mixin (target, source) {
  forOwn(source, (key, value) => {
    target[key] = value
  })
}

// id.js
export const uniqueID = (() => {
  let id = 0
  return () => {
    return '' + id++
  }
})()

// json.js
export function isJSON (str) {
  return (
    isString(str) &&
    str.indexOf('{') === 0 &&
    str.lastIndexOf('}') === str.length - 1
  )
}

export function parseJSON (obj) {
  try {
    if (isJSON(obj)) {
      obj = JSON.parse(obj)
    }
    if (isObject(obj)) {
      forOwn(obj, (key, value) => {
        switch (typeOf(value)) {
          case 'string':
          case 'object':
            obj[key] = parseJSON(value)
            break
        }
      })
    }
  } catch (error) {
    console.log('error:', error)
  }
  return obj
}

// object.js
export function simpleClone (obj) {
  var cache = []
  var strObj = JSON.stringify(obj, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        return
      }
      // Store value in our collection
      cache.push(value)
    }
    return value
  })
  return JSON.parse(strObj)
}

/**
 * mock Object.assign
 * - 将 sources 的 enumerable own properties 拷贝到 target
 * @param  {Object} target={}  目标对象
 * @param  {Object} ...sources 待拷贝的对象
 * @return {Object}            目标对象
 */
export function merge (target = {}, ...sources) {
  sources.forEach(source => {
    mixin(target, source)
  })
  return target
}

/**
 * 对于 source 的 enumerable own properties, 如果 target 没有此属性, 将 source 的值赋给 target
 * @param  {Object} target 目标对象
 * @param  {Object} source 源对象
 * @return {Object}        目标对象
 */
export function fillUndef (target, source) {
  forOwn(source, (key, value) => {
    if (undef(target[key])) {
      target[key] = value
    }
  })
  return target
}

/**
 * 如果 target 没有 key 对应的属性, 那么将 value 赋给他
 * @param  {Object} target 目标对象
 * @param  {String} key    属性名
 * @param  {Object} value  属性值
 * @return {Object}        属性值
 */
export function checkWithDefault (target, key, value) {
  let v = target[key] || target[key.toLowerCase()]
  if (notexist(v)) {
    v = value
    target[key] = v
  }
  return v
}

/**
 * 对于 target 的 enumerable own properties, 如果 source 存在对应的值, 将其赋给 target
 * @param  {Object} target 目标对象
 * @param  {Object} source 源对象
 * @return {Object}        目标对象
 */
export function fetch (target, source) {
  forOwn(target, (key, value) => {
    if (exist(source[key])) {
      target[key] = source[key]
    }
  })
  return target
}

export function string2object (string = '', sep = ',') {
  const obj = {}
  string.split(sep).forEach(pair => {
    const arr = pair.split('=')
    const key = arr.shift()
    if (!key) {
      return
    }
    obj[decodeURIComponent(key)] = decodeURIComponent(arr.join('='))
  })
  return obj
}

export function object2string (obj, sep, encode) {
  if (!obj) {
    return ''
  }
  const arr = []
  forOwn(obj, (key, value) => {
    if (isFunction(value)) {
      return
    }
    if (isDate(value)) {
      value = value.getTime()
    } else if (isArray(value)) {
      value = value.join(',')
    } else if (isObject(value)) {
      value = JSON.stringify(value)
    }
    if (encode) {
      value = encodeURIComponent(value)
    }
    arr.push(encodeURIComponent(key) + '=' + value)
  })
  return arr.join(sep || ',')
}

export function genUrlSep (url) {
  return url.indexOf('?') < 0 ? '?' : '&'
}

export function object2query (obj) {
  return object2string(obj, '&', true)
}

export const url2origin = (() => {
  const reg = /^([\w]+?:\/\/.*?(?=\/|$))/i
  return url => {
    if (reg.test(url || '')) {
      return RegExp.$1.toLowerCase()
    }
    return ''
  }
})()

// ajax
export function isFileInput (value) {
  var window = getGlobal()
  return (
    (value.tagName && value.tagName.toUpperCase() === 'INPUT') ||
    (window.Blob && value instanceof window.Blob)
  )
}

/**
 * 获取所有的 keys
 * putFileAtEnd 表示将文件对应的 keys 放在最后
 */
export function getKeys (data, putFileAtEnd) {
  var keys = Object.keys(data)
  if (putFileAtEnd) {
    keys.sort(function (key1, key2) {
      var value1IsFileInput = isFileInput(data[key1])
      var value2IsFileInput = isFileInput(data[key2])
      // 如果两个值相等, 说明都是文件或者都不是文件, 那么顺序不变
      if (value1IsFileInput === value2IsFileInput) {
        return 0
      } else {
        return value1IsFileInput ? 1 : -1
      }
    })
  }
  return keys
}
