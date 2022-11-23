import { loglevels } from '../../../util/log/loglevels'
import { updateLogIndex } from '../../../util/webrtcLogger'
import { getParameters } from '../../parameters'
const APP_NAME = 'protoo-client'

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
    window.logUpload && window.wsTransport && window.wsTransport.sendLog(args)
  }

  warn() {
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs(args)
    if (getParameters().logLevel <= loglevels.WARNING) {
      console.warn.apply(console, args)
    }
    window.logUpload && window.wsTransport && window.wsTransport.sendLog(args)
  }

  error() {
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs(args)
    if (getParameters().logLevel <= loglevels.ERROR) {
      console.error.apply(console, args)
    }
    window.logUpload && window.wsTransport && window.wsTransport.sendLog(args)
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
}

module.exports = Logger
