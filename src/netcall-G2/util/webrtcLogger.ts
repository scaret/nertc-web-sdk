import {platform} from "./platform";
import {logHelper} from "./logHelper";
import {
  AdapterRef,
  LoggerDebugOptions,
  LoggerOptions,
} from "../types";
import * as loglevel from 'loglevel';


class Logger{
  private options:LoggerOptions;
  private api:string;
  private style:string;
  private prefix:string;
  private logHelper?:logHelper;
  private supportedBrowsers: string[];
  private cs:Console;
  private isDebug: boolean;
  public adapterRef: AdapterRef;
  constructor(options:LoggerOptions) {
    this.options = options;
    this.api = 'log';
    this.style = 'color:#1cb977;';
    this.prefix = options.prefix || ''
    if (typeof options.debug === "object" && options.debug.style) {
      this.style = options.debug.style
    }
    if(options.isSavedLogs) {
      this.logHelper = new logHelper(options)
    }
    this.supportedBrowsers = ['Chrome', 'Safari', 'Firefox'];
    this.cs = console;
    this.isDebug = true;
    this.setDebug(options.debug);
    this.adapterRef = options.adapterRef;
  }
  
  setDebug(debug?: boolean|LoggerDebugOptions){
    if (typeof debug === "boolean"){
      this.isDebug = debug;
    }else{
      this.isDebug = true;
      if (debug && debug.style){
        this.style = debug.style;
      }
    }
  }
  
  debug(){
    var logger = this;
    if (!this.isDebug){
      return;
    }
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs([].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    logger._log('debug', args);
    (<any>window).logStorage && (<any>window).logStorage.log('debug', args);
    // loglevel.debug(arguments);
  }
  
  log(){
    var logger = this;
    if (!this.isDebug){
      return;
    }
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs([].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    logger._log('log', args);
    //  loglevel.trace(args);
    (<any>window).logStorage && (<any>window).logStorage.log('log', args);
  }
  
  info(){
    var logger = this;
    if (!this.isDebug){
      return;
    }
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs([].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    logger._log('info', args);
    // loglevel.info(arguments);
    (<any>window).logStorage && (<any>window).logStorage.log('info', args);
    
  }
  
  warn(){
    var logger = this;
    if (!this.isDebug){
      return;
    }
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs([].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    logger._log('warn', args);
    // loglevel.warn(arguments);
    (<any>window).logStorage && (<any>window).logStorage.log('warn', args);
  }
  
  error(){
    var logger = this;
    if (!this.isDebug){
      return;
    }
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs([].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    logger._log('error', args);
    // loglevel.error(arguments);
    (<any>window).logStorage && (<any>window).logStorage.log('error', args);
  }

  _log(name:string, args:any[]) {
    var logger = this;
    
    
    // @ts-ignore
    let isIE8 = '\v' == 'v'
    // 使用开发者传入的方法来记录日志
    let logFuncObj = logger.options.logFunc
    let logFunc = null
    if (logFuncObj && !isIE8) {
      if (logFuncObj[name]) {
        logFunc = logFuncObj[name]
      }
      if (typeof logFunc === "function") {
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
  chrome(func:string, args:any[]) {
    let name = platform.name;
    if (this.supportedBrowsers.indexOf(name) !== -1) {
      //@ts-ignore
      this.cs[func].apply(this.cs, args)
    } else {
      //@ts-ignore
      logger.ie(func, args)
    }
  }

  ie(func:string, args:any[]) {
    var self = this;
    args.forEach(function (arg) {
      //@ts-ignore
      self.cs[func](JSON.stringify(arg, null, 4))
    })
  }

  formatArgs(args:any[]) {
    const logger = this
    var date = new Date()
    var dateStr = formatTimeUnit('' + (date.getMonth() + 1)) + '-' + formatTimeUnit('' + date.getDate()) + ' ' + formatTimeUnit('' + date.getHours()) + ':' + formatTimeUnit('' + date.getMinutes()) + ':' + formatTimeUnit('' + date.getSeconds()) + ':' + formatTimeUnit('' + date.getMilliseconds(), 3)
    var prefix = `[WEBRTC LOG ${dateStr} ${logger.prefix.toUpperCase()}]  `
    if (typeof args[0] === "string") {
      args[0] = prefix + args[0]
    } else {
      args.splice(0, 0, prefix)
    }
    args.forEach(function (arg, index) {
      if (typeof arg === "object") {
        args[index] = simpleClone(arg)
      }
    })
    return args
  }
}



var formatTimeUnit = function (num:string, count?:number) {
  count = count || 2
  var str = '' + num
  while (str.length < count) {
    str = '0' + str
  }
  return str
}

function simpleClone (obj:any) {
  var cache:any[] = []
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

export {
  Logger
}
