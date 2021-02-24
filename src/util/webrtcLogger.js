var platform = require('platform')
var util = require('utiljs') 
var ajax = require('utiljs/ajax')
var logHelper = require('../netcall-G2/util/logHelper.ts')

/**
 * 日志, SDK内部使用
 *
 * @constructor
 * @alias Logger
 * @private
 */

function Logger (options = {}) {
  util.merge(this, {
    options,
    debug: false,
    api: 'log',
    style: 'color:#1cb977;',
    log: util.emptyFunc,
    info: util.emptyFunc,
    warn: util.emptyFunc,
    error: util.emptyFunc
  })
  this.prefix = options.prefix || ''
  this.setDebug(options.debug)
  if(options.isSavedLogs) {
    this.logHelper = new logHelper(options)
  }
  
}

const pro = Logger.prototype

var supportedBrowsers = ['Chrome', 'Safari', 'Firefox']

pro.setDebug = function (debug = false) {
  const logger = this
  logger.debug = debug
  if (debug.style) {
    logger.style = debug.style
  }
  if (logger.debug && util.exist(console)) {
    var cs = console
    logger.debug = function () {
      this.logHelper && this.logHelper.log(arguments)
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('debug', args)
    }
    logger.log = function () {
      this.logHelper && this.logHelper.log(arguments)
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('log', args)
    }
    logger.info = function () {
      this.logHelper && this.logHelper.log(arguments)
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('info', args)
    }
    logger.warn = function () {
      this.logHelper && this.logHelper.log(arguments)
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('warn', args)
    }
    logger.error = function () {
      this.logHelper && this.logHelper.log(arguments)
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('error', args)
    }
    logger._log = function (name, args) {
      let isIE8 = '\v' == 'v'
      // 使用开发者传入的方法来记录日志
      let logFuncObj = logger.options.logFunc
      let logFunc = null
      if (logFuncObj && !isIE8) {
        if (logFuncObj[name]) {
          logFunc = logFuncObj[name]
        }
        if (util.isFunction(logFunc)) {
          logFunc.apply(logFuncObj, args)
          return
        }
      }
      // 使用 console 来记录日志
      if (cs[name]) {
        try {
          if (cs[name].apply) {
            logger.chrome(name, args)
          } else {
            logger.ie(name, args)
          }
        } catch (e) {
          // ignore error
        }
      }
    }
    // use this form to skip drop_console of uglify
    logger.chrome = function (func, args) {
      if (supportedBrowsers.indexOf(platform.name) !== -1) {
        cs[func].apply(cs, args)
      } else {
        logger.ie(func, args)
      }
    }
    logger.ie = function (func, args) {
      args.forEach(function (arg) {
        cs[func](JSON.stringify(arg, null, 4))
      })
    }
  }
}

pro.formatArgs = function (args) {
  const logger = this
  args = [].slice.call(args, 0)
  var date = new Date()
  var dateStr = formatTimeUnit((date.getMonth() + 1)) + '-' + formatTimeUnit(date.getDate()) + ' ' + formatTimeUnit(date.getHours()) + ':' + formatTimeUnit(date.getMinutes()) + ':' + formatTimeUnit(date.getSeconds()) + ':' + formatTimeUnit(date.getMilliseconds(), 3)
  var prefix = `[WEBRTC LOG ${dateStr} ${logger.prefix.toUpperCase()}]  `
  if (util.isString(args[0])) {
    args[0] = prefix + args[0]
  } else {
    args.splice(0, 0, prefix)
  }
  args.forEach(function (arg, index) {
    if (util.isArray(arg) || util.isObject(arg)) {
      args[index] = util.simpleClone(arg)
    }
  })
  return args
}

var formatTimeUnit = function (num, count) {
  count = count || 2
  var str = '' + num
  while (str.length < count) {
    str = '0' + str
  }
  return str
}

module.exports = Logger
