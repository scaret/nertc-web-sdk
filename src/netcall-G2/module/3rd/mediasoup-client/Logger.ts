import { loglevels } from '../../../util/log/loglevels'
import { formatSingleArg } from '../../../util/rtcUtil/utils'
import { updateLogIndex } from '../../../util/webrtcLogger'
import { getParameters } from '../../parameters'

const APP_NAME = 'mediasoup-client'
let win: any = window
let cachedLogs: any[] = []

export const Logger = {
  debug(option?: any, ...args: any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs('DEBUG', args, prefix)
    if (getParameters().logLevel <= loglevels.DEBUG) {
      console.debug.apply(console, args)
    }
    logCache(args)
  },

  warn(option?: any, ...args: any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs('WARN', args, prefix)
    if (getParameters().logLevel <= loglevels.WARNING) {
      console.warn.apply(console, args)
    }
    logCache(args)
  },

  error(option?: any, ...args: any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`
    var args = Array.prototype.slice.call(arguments)
    this.formatArgs('ERROR', args, prefix)
    if (getParameters().logLevel <= loglevels.ERROR) {
      console.error.apply(console, args)
    }
    logCache(args)
  },

  formatArgs(logLevel: 'DEBUG' | 'WARN' | 'ERROR', args: any[], param?: any) {
    let date = new Date()
    let dateStr =
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
    let prefix = `[NERTC:${logLevel}:${updateLogIndex()} ${dateStr} ${param.toUpperCase()}]  `
    for (let i = args.length - 1; i >= 0; i--) {
      args[i] = formatSingleArg(args[i])
    }
    args.unshift(prefix)
    return args
  },

  formatTimeUnit(num: string, count?: number) {
    count = count || 2
    var str = '' + num
    while (str.length < count) {
      str = '0' + str
    }
    return str
  }
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
