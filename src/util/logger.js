var platform = require('platform')
var util = require('utiljs') 
var config = require('utiljs/config')
var device = require('utiljs/device')
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
    style: 'color:blue;',
    log: util.emptyFunc,
    info: util.emptyFunc,
    warn: util.emptyFunc,
    error: util.emptyFunc
  })
  this.prefix = options.prefix || ''
  this.setDebug(options.debug)
}

const pro = Logger.prototype

var supportedBrowsers = ['Chrome', 'Safari', 'Firefox']

pro.setDebug = function (debug = false) {
  const logger = this
  logger.debug = debug
  if (debug.style) {
    logger.style = debug.style
  }
  if (!util.exist(console)) return
  if (logger.debug) {
    const _writeLocalLog =  config.isRN ? writeLocalLog : () => {}
    var cs = console
    logger.debug = function () {
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('debug', args)
    }
    logger.log = function () {
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('log', args)
    }
    logger.info = function () {
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('info', args)
    }
    logger.warn = function () {
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('warn', args)
    }
    logger.error = function () {
      var args = logger.formatArgs(arguments)
      if (supportedBrowsers.indexOf(platform.name) !== -1 && util.isString(args[0])) {
        args[0] = '%c' + args[0]
        args.splice(1, 0, logger.style)
      }
      logger._log('error', args)
    }
    logger._log = function (name, args) {
      // 只有这三种类型的log才写到本地
      if (/error|warn|info/.test(name)) {
        _writeLocalLog(JSON.stringify(args) + '\r\n')
      }
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
  } else if (config.isRN) {
    // RN非Debug
    logger.info = function () {
      var args = logger.formatArgs(arguments)
      writeLocalLog(JSON.stringify(args))
    }
    logger.warn = function () {
      var args = logger.formatArgs(arguments)
      writeLocalLog(JSON.stringify(args))
    }
    logger.error = function () {
      var args = logger.formatArgs(arguments)
      writeLocalLog(JSON.stringify(args))
    }
  }
}

pro.formatArgs = function (args) {
  const logger = this
  args = [].slice.call(args, 0)
  var date = new Date()
  var dateStr = formatTimeUnit((date.getMonth() + 1)) + '-' + formatTimeUnit(date.getDate()) + ' ' + formatTimeUnit(date.getHours()) + ':' + formatTimeUnit(date.getMinutes()) + ':' + formatTimeUnit(date.getSeconds()) + ':' + formatTimeUnit(date.getMilliseconds(), 3)
  var prefix = `[NIM LOG ${dateStr} ${logger.prefix.toUpperCase()}]  `
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

function writeLocalLog (str) {
  // 只有RN下才会写日志
  if (!config.isRN) {
    return;
  }
  // 没有rnfs，或rnfs不对
  if (!device.rnfs || !device.rnfs.writeFile || !device.rnfs.appendFile || !device.rnfs.DocumentDirectoryPath) {
    return;
  }
  let fs = device.rnfs
  let filepath
  let size = fs.size / 2 - 256 // 日志分为2个文件，并留一定的余量

  // 初始本次要写入的log文件的index
  fs.nimPromise = fs.nimPromise.then(function () {
    filepath = getFilepath(fs.nimIndex)
    // 判断文件是否存在
    return fs.exists(filepath)
  })
  .then(res => res ? fs.appendFile(filepath, str) : fs.writeFile(filepath, str))
  .then(() => fs.stat(filepath))
  .then(res => {
    // console.log(res.path.slice(-13), res.size)
    // console.log('current index', index)
    // 判断当前文件大小是否超过预设size
    if (res.size > size) {
      fs.nimIndex++
      if (fs.nimIndex > 1) {
        fs.nimIndex = fs.nimIndex % 2
      }
      // console.log('over size, current index', index)
      // 删除文件
      return fs.unlink(getFilepath(fs.nimIndex)).catch(e => {
        // console.log('======删除文件失败')
        // console.log(e)
        return Promise.resolve()
      })
    }
  })
  .catch(err => {
    console.error(err)
  })
  function getFilepath (i) {
    return device.rnfs.DocumentDirectoryPath + '/nimlog_' + i + '.log'
  }
}

module.exports = Logger
