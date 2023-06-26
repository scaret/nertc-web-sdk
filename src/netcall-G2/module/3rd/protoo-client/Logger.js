import { loglevels } from '../../../util/log/loglevels'
import { updateLogIndex } from '../../../util/webrtcLogger'
import { getParameters } from '../../parameters'
const APP_NAME = 'protoo-client'

let cachedLogs = []
class Logger {
  constructor(prefix) {
    this.prefix = prefix ? `${APP_NAME}:${prefix}` : `${APP_NAME}`
  }

  debug() {
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs(args)
    if (getParameters().logLevel <= loglevels.DEBUG) {
      console.debug.apply(console, args)
    }
    this.logCache(args)
  }

  warn() {
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs(args)
    if (getParameters().logLevel <= loglevels.WARNING) {
      console.warn.apply(console, args)
    }
    this.logCache(args)
  }

  error() {
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs(args)
    if (getParameters().logLevel <= loglevels.ERROR) {
      console.error.apply(console, args)
    }
    this.logCache(args)
  }

  formatArgs(args) {
    var date = new Date()
    var dateStr =
      this.formatTimeUnit('' + (date.getMonth() + 1)) +
      '-' +
      this.formatTimeUnit('' + date.getDate()) +
      ' ' +
      this.formatTimeUnit('' + date.getHours()) +
      ':' +
      this.formatTimeUnit('' + date.getMinutes()) +
      ':' +
      this.formatTimeUnit('' + date.getSeconds()) +
      ':' +
      this.formatTimeUnit('' + date.getMilliseconds(), 3)
    var prefix = `[NERTC:LOG:${updateLogIndex()} ${dateStr} ${this.prefix.toUpperCase()}]`
    args.unshift(prefix)

    return args
  }

  formatTimeUnit = function (num, count) {
    count = count || 2
    var str = '' + num
    while (str.length < count) {
      str = '0' + str
    }
    return str
  }

  logCache = function (args) {
    if (window.logUpload && !getParameters().disableAllReports) {
      if (!window.wsTransport) {
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
            window.wsTransport && window.wsTransport.sendLog(item.args)
          })
          cachedLogs = []
        }
        window.wsTransport && window.wsTransport.sendLog(args)
      }
    }
  }
}

module.exports = Logger
