const util = require('../util')
const window = util.getGlobal()
const message = {}

const _self = window.name || '_parent'
const _listeners = []
const _key = 'MSG|'
const _queue = []

// for post message and onmessage event
message.addMsgListener = function (cb) {
  _listeners.push(cb)
}

const onMessage = function (_event) {
  for (var i = 0, l = _listeners.length; i < l; i++) {
    try {
      _listeners[i].call(null, _event)
    } catch (e) {}
  }
}

const formatOrigin = (function () {
  var _reg = /^([\w]+?:\/\/.*?(?=\/|$))/i
  return function (_origin) {
    _origin = _origin || ''
    if (_reg.test(_origin)) {
      return RegExp.$1
    }
    return '*'
  }
})()

// 检测window.name变化情况
const checkWindowName = () => {
  // check name
  var _name = unescape(window.name || '').trim()
  if (!_name || _name.indexOf(_key) !== 0) {
    return
  }
  window.name = ''
  // check result
  const _result = util.string2object(_name.replace(_key, ''), '|')
  const _origin = (_result.origin || '').toLowerCase()
  // check origin
  if (!!_origin && _origin !== '*' && location.href.toLowerCase().indexOf(_origin) !== 0) {
    return
  }
  // dispatch onmessage event
  onMessage({
    data: JSON.parse(_result.data || 'null'),
    source: window.frames[_result.self] || _result.self,
    origin: formatOrigin(_result.ref || (typeof document === 'undefined' ? '' : document.referrer))
  })
}

const checkNameQueue = (function () {
  var _checklist
  var _hasItem = function (_list, _item) {
    for (var i = 0, l = _list.length; i < l; i++) {
      if (_list[i] === _item) {
        return !0
      }
    }
    return !1
  }
  return function () {
    if (!_queue.length) return
    _checklist = []
    for (var i = _queue.length - 1, _map; i >= 0; i--) {
      _map = _queue[i]
      if (!_hasItem(_checklist, _map.w)) {
        _checklist.push(_map.w)
        _queue.splice(i, 1)
        // set window.name
        _map.w.name = _map.d
      }
    }
    _checklist = null
  }
})()

const startTimer = message.startTimer = (() => {
  let flag = false
  return () => {
    if (!flag) {
      flag = true
      if (!window.postMessage) {
        setInterval(checkNameQueue, 100)
        setInterval(checkWindowName, 20)
      }
    }
  }
})()

message.postMessage = (w, options = {}) => {
  util.fillUndef(options, {
    origin: '*',
    source: _self
  })
  if (!window.postMessage) {
    startTimer()
    if (util.isObject(options)) {
      var _result = {}
      _result.origin = options.origin || ''
      _result.ref = location.href
      _result.self = options.source
      _result.data = JSON.stringify(options.data)
      options = _key + util.object2string(_result, '|', !0)
    }
    _queue.unshift({
      w,
      d: escape(options)
    })
  } else {
    let data = options.data
    if (!window.FormData) {
      data = JSON.stringify(data)
    }
    w.postMessage(data, options.origin)
  }
}

module.exports = message
