import { getParameters } from '../module/parameters'
import { ILogger, LoggerOptions } from '../types'
import { loglevels } from './log/loglevels'
import { logHelper } from './logHelper'
import { getBrowserInfo } from './rtcUtil/rtcPlatform'
import { formatSingleArg } from './rtcUtil/utils'
import { BUILD } from '../Config'

let logIndex = 0
let cachedLogs: any[] = []

export function updateLogIndex() {
  logIndex++
  return ('' + logIndex).padStart(4, '0')
}

export class Logger {
  private options: LoggerOptions
  private api: string
  private style = 'color:#1cb977;'
  private logHelper?: logHelper
  private supportedBrowsers: string[]
  private cs: Console
  public parent?: Logger
  private tagGen?: () => string
  constructor(options: LoggerOptions) {
    this.options = options
    this.api = 'log'
    this.tagGen = options.tagGen
    if (options.isSavedLogs) {
      this.logHelper = new logHelper(options)
    }
    this.supportedBrowsers = ['Chrome', 'Safari', 'Firefox', 'Chrome Mobile', 'Electron']
    this.cs = console
  }

  getChild(tagGenerator: () => string) {
    const newOptions = Object.assign({}, this.options)
    const newLogger = new Logger(newOptions)
    newLogger.tagGen = tagGenerator
    newLogger.parent = this
    return newLogger
  }

  debug() {
    var logger = this
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs('DEBUG', [].slice.call(arguments, 0))
    // if (this.supportedBrowsers.indexOf(getBrowserInfo().browserName) !== -1 && typeof args[0] === "string") {
    //   args[0] = '%c' + args[0]
    //   args.splice(1, 0, logger.style)
    // }
    if (getParameters().logLevel <= loglevels.DEBUG) {
      logger._log('debug', args)
    }
    logCache(args)
  }

  log() {
    var logger = this
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs('LOG', [].slice.call(arguments, 0))
    if (
      this.supportedBrowsers.indexOf(getBrowserInfo().browserName) !== -1 &&
      typeof args[0] === 'string'
    ) {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
      for (let i = 2; i < args.length; i++) {
        if (typeof args[i] === 'string') {
          args[0] += '%c' + args[i]
          args[i] = ''
        } else {
          break
        }
      }
    }
    if (getParameters().logLevel <= loglevels.INFO) {
      logger._log('log', args)
    }
    logCache(args)
  }

  info() {
    var logger = this
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs('INFO', [].slice.call(arguments, 0))
    if (
      this.supportedBrowsers.indexOf(getBrowserInfo().browserName) !== -1 &&
      typeof args[0] === 'string'
    ) {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    if (getParameters().logLevel <= loglevels.INFO) {
      logger._log('info', args)
    }
    logCache(args)
  }

  warn() {
    var logger = this
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs('WARN', [].slice.call(arguments, 0))
    if (
      this.supportedBrowsers.indexOf(getBrowserInfo().browserName) !== -1 &&
      typeof args[0] === 'string'
    ) {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    if (getParameters().logLevel <= loglevels.WARNING) {
      logger._log('warn', args)
    }
    logCache(args)
  }

  error() {
    var logger = this
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs('ERROR', [].slice.call(arguments, 0))
    if (
      this.supportedBrowsers.indexOf(getBrowserInfo().browserName) !== -1 &&
      typeof args[0] === 'string'
    ) {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }

    if (getParameters().logLevel <= loglevels.ERROR) {
      logger._log('error', args)
    }
    logCache(args)
  }

  _log(name: string, args: any[]) {
    var logger = this

    // @ts-ignore
    let isIE8 = '\v' == 'v'
    // 使用开发者传入的方法来记录日志
    let logFuncObj = logger.options.logFunc
    let logFunc = null
    if (logFuncObj && !isIE8) {
      if (logFuncObj[name]) {
        logFunc = logFuncObj[name]
      }
      if (typeof logFunc === 'function') {
        //@ts-ignore
        logFunc.apply(logFuncObj, args)
        return
      }
    }
    // 使用 console 来记录日志
    //@ts-ignore
    if (this.cs[name]) {
      try {
        //@ts-ignore
        if (this.cs[name].apply) {
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
  chrome(func: string, args: any[]) {
    let name = getBrowserInfo().browserName
    //@ts-ignore
    if (this.cs[func]) {
      //@ts-ignore
      this.cs[func].apply(this.cs, args)
    } else if (this.cs.log) {
      this.cs.log.apply(this.cs, args)
    } else {
      this.ie(func, args)
    }
  }

  ie(func: string, args: any[]) {
    var self = this
    args.forEach(function (arg) {
      //@ts-ignore
      self.cs[func](JSON.stringify(arg, null, 4))
    })
  }

  formatArgs(logLevel: 'DEBUG' | 'LOG' | 'INFO' | 'WARN' | 'ERROR', args: any[]) {
    var date = new Date()
    var dateStr =
      formatTimeUnit('' + (date.getMonth() + 1)) +
      '-' +
      formatTimeUnit('' + date.getDate()) +
      ' ' +
      formatTimeUnit('' + date.getHours()) +
      ':' +
      formatTimeUnit('' + date.getMinutes()) +
      ':' +
      formatTimeUnit('' + date.getSeconds()) +
      ':' +
      formatTimeUnit('' + date.getMilliseconds(), 3)
    let logger: Logger = this
    let prefix = ''
    for (let i = 0; i < 3; i++) {
      // 最多上溯3层tag
      if (logger.tagGen) {
        prefix = `[${logger.tagGen()}]` + prefix
      }
      if (logger.parent) {
        logger = logger.parent
      } else {
        break
      }
    }
    prefix = `[NERTC:${logLevel}:${updateLogIndex()} ${dateStr}]${prefix}`
    args.splice(0, 0, prefix)
    args.forEach(function (arg, index) {
      arg = formatSingleArg(arg)
      if (typeof arg === 'object') {
        args[index] = simpleClone(arg)
      } else {
        args[index] = arg
      }
    })
    return args
  }
}

let defaultLogger: Logger | null = null

export function getDefaultLogger(): ILogger {
  if (!defaultLogger) {
    defaultLogger = new Logger({
      tagGen: () => {
        return `${BUILD}`
      }
    })
  }
  return defaultLogger
}

var formatTimeUnit = function (num: string, count?: number) {
  count = count || 2
  var str = '' + num
  while (str.length < count) {
    str = '0' + str
  }
  return str
}

function simpleClone(obj: any, cache: any[] = []) {
  obj = formatSingleArg(obj)
  if (!obj || typeof obj !== 'object') {
    return obj
  }
  let clonedObj = {}
  for (let key in obj) {
    // 有些来自Object.create(null)的方法没有 obj.hasOwnProperty属性
    if (!obj.hasOwnProperty || obj.hasOwnProperty(key)) {
      if (obj[key] && typeof obj[key] === 'object') {
        if (cache.indexOf(obj[key]) !== -1) {
          // @ts-ignore
          clonedObj[key] = '[Circular obj]'
        } else {
          cache.push(obj[key])
          // @ts-ignore
          clonedObj[key] = simpleClone(obj[key], cache)
        }
      } else {
        // @ts-ignore
        clonedObj[key] = obj[key]
      }
    }
  }
  return clonedObj
}

function logCache(args: any) {
  let win: any = window
  if (win.logUpload && !getParameters().disableAllReports) {
    if (!win.wsTransport) {
      // ws创建前 缓存日志
      let time = Date.now()
      try {
        // @ts-ignore
        if (cachedLogs.length) {
          // @ts-ignore
          cachedLogs[cachedLogs.length - 1].args[0].replace('[NERTC', '[缓存][NERTC')
        }
      } catch (e) {
        // do noting
      }
      cachedLogs.push({
        time,
        args
      })
      // console.error('cachedLogs: ',cachedLogs)
    } else {
      if (cachedLogs.length) {
        cachedLogs.forEach((item) => {
          win.wsTransport && win.wsTransport.sendLog(item.args)
        })
        cachedLogs = []
      }
      win.wsTransport && win.wsTransport.sendLog(args)
    }
  }
}
