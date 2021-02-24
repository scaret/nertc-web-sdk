function LoggerPlugin (options) {
  var logLevelMap = {
    debug: 0,
    log: 1,
    info: 2,
    warn: 3,
    error: 4
  }
  var self = this
  var postUrl = options.url || null
  self.level = logLevelMap[options.level] || 0
  self.logCache = []
  self.logNum = 1
  self.timeInterval = 5000
  window.onerror = function (errorMessage, scriptURI, lineNumber, columnNumber, errorObj) {
    self.error(errorObj)
  }
  setInterval(function () {
    if (self.logCache.length > 0 && postUrl) {
      self.postLogs(postUrl, self.logCache)
    }
  }, self.timeInterval)
}

LoggerPlugin.prototype.debug = function () {
  if (this.level > 0) {
    return
  }
  console.debug.apply(this, arguments)
  this.cacheLogs.apply(this, ['[degbug]'].concat(arguments))
}

LoggerPlugin.prototype.log = function () {
  if (this.level > 1) {
    return
  }
  console.log.apply(this, arguments)
  this.cacheLogs.apply(this, ['[log]'].concat(arguments))
}

LoggerPlugin.prototype.info = function () {
  if (this.level > 2) {
    return
  }
  console.info.apply(this, arguments)
  this.cacheLogs.apply(this, ['[info]'].concat(arguments))
}

LoggerPlugin.prototype.warn = function () {
  if (this.level > 3) {
    return
  }
  console.warn.apply(this, arguments)
  this.cacheLogs.apply(this, ['[warn]'].concat(arguments))
}

LoggerPlugin.prototype.error = function () {
  if (this.level > 4) {
    return
  }
  console.error.apply(this, arguments)
  this.cacheLogs.apply(this, ['[error]'].concat(arguments))
}

LoggerPlugin.prototype.cacheLogs = function (logLevel, args) {
  var currentCache = []
  for (var i = 0; i < args.length; i++) {
    var arg = args[i]
    if (typeof arg === 'object') {
      currentCache.push(JSON.stringify(arg))
    } else {
      currentCache.push(arg)
    }
  }
  var logStr = (this.logNum++) + ' ' + logLevel + ' ' + currentCache.join('; ')
  this.logCache.push(logStr.replace('%c', ''))
}

LoggerPlugin.prototype.postLogs = function (url, data) {
  var self = this
  var xhr = new XMLHttpRequest()
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        console.info('LoggerPlugin::日志上报完成')
        self.logCache = []
        self.timeInterval = 5000
      } else {
        self.timeInterval += 5000
      }
    }
  }
  xhr.open('POST', url)
  xhr.setRequestHeader('Content-Type', 'plain/text;charset=utf-8')
  xhr.timeout = 360
  xhr.send(data.join('\n'))
}

module.exports = LoggerPlugin
