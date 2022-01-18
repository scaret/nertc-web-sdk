import {platform} from "./platform";
import {logHelper} from "./logHelper";
import {LoggerDebugOptions, LoggerOptions} from "../types";
import {getParameters} from "../module/parameters";
import {loglevels} from "./log/logger";
import {formatSingleArg} from "./util";

let logIndex = 0

export function updateLogIndex(){
  logIndex++
  return ("" + logIndex).padStart(4, "0");
}

export class Logger{
  private options:LoggerOptions;
  private api:string;
  private style:string = 'color:#1cb977;';
  private logHelper?:logHelper;
  private supportedBrowsers: string[];
  private cs:Console;
  private parent?: Logger;
  private tagGen?: ()=>string;
  constructor(options:LoggerOptions) {
    this.options = options;
    this.api = 'log';
    this.tagGen = options.tagGen
    if(options.isSavedLogs) {
      this.logHelper = new logHelper(options)
    }
    this.supportedBrowsers = ['Chrome', 'Safari', 'Firefox', 'Chrome Mobile', 'Electron'];
    this.cs = console;
  }

  getChild(tagGenerator: ()=>string){
    const newOptions = Object.assign({}, this.options);
    const newLogger = new Logger(newOptions);
    newLogger.tagGen = tagGenerator;
    newLogger.parent = this;
    return newLogger
  }
  
  debug(){
    var logger = this;
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs("DEBUG", [].slice.call(arguments, 0))
    // if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
    //   args[0] = '%c' + args[0]
    //   args.splice(1, 0, logger.style)
    // }
    if(getParameters().logLevel <= loglevels.DEBUG){
      logger._log('debug', args);
    }
    // (<any>window).logStorage && (<any>window).logStorage.log('debug', args);
    (<any>window).logUpload && (<any>window).wsTransport.sendLog(args);
    // loglevel.debug(arguments);
  }
  
  log(){
    var logger = this;
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs("LOG", [].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
      for (let i = 2; i < args.length; i++){
        if (typeof args[i] === "string"){
          args[0] += "%c" + args[i]
          args[i] = ""
        }else{
          break;
        }
      }
    }
    if(getParameters().logLevel <= loglevels.INFO){
      logger._log('log', args);
    }
    //  loglevel.trace(args);
    // (<any>window).logStorage && (<any>window).logStorage.log('log', args);
    (<any>window).logUpload && (<any>window).wsTransport.sendLog(args);
  }
  
  info(){
    var logger = this;
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs("INFO", [].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    if(getParameters().logLevel <= loglevels.INFO) {
      logger._log('info', args);
    }
    // loglevel.info(arguments);
    // (<any>window).logStorage && (<any>window).logStorage.log('info', args);
    (<any>window).logUpload && (<any>window).wsTransport.sendLog(args);
    
  }
  
  warn(){
    var logger = this;
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs("WARN", [].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }
    if(getParameters().logLevel <= loglevels.WARNING) {
      logger._log('warn', args);
    }
    // loglevel.warn(arguments);
    // (<any>window).logStorage && (<any>window).logStorage.log('warn', args);
    (<any>window).logUpload && (<any>window).wsTransport.sendLog(args);
  }
  
  error(){
    var logger = this;
    this.logHelper && this.logHelper.log(arguments)
    var args = logger.formatArgs("ERROR", [].slice.call(arguments, 0))
    if (this.supportedBrowsers.indexOf(platform.name) !== -1 && typeof args[0] === "string") {
      args[0] = '%c' + args[0]
      args.splice(1, 0, logger.style)
    }

    if(getParameters().logLevel <= loglevels.ERROR) {
      logger._log('error', args);
    }
    // loglevel.error(arguments);
    // (<any>window).logStorage && (<any>window).logStorage.log('error', args);
    (<any>window).logUpload && (<any>window).wsTransport.sendLog(args);
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
    //@ts-ignore
    if (this.cs[func]){
      //@ts-ignore
      this.cs[func].apply(this.cs, args)
    }else if (this.cs.log){
      this.cs.log.apply(this.cs, args)
    }else{
      this.ie(func, args)
    }
  }

  ie(func:string, args:any[]) {
    var self = this;
    args.forEach(function (arg) {
      //@ts-ignore
      self.cs[func](JSON.stringify(arg, null, 4))
    })
  }

  formatArgs(logLevel: "DEBUG"|"LOG"|"INFO"|"WARN"|"ERROR", args:any[]) {
    var date = new Date()
    var dateStr = formatTimeUnit('' + (date.getMonth() + 1)) + '-' + formatTimeUnit('' + date.getDate()) + ' ' + formatTimeUnit('' + date.getHours()) + ':' + formatTimeUnit('' + date.getMinutes()) + ':' + formatTimeUnit('' + date.getSeconds()) + ':' + formatTimeUnit('' + date.getMilliseconds(), 3)
    let logger:Logger = this
    let prefix = "";
    for (let i = 0; i < 3; i++){
      // 最多上溯3层tag
      if (logger.tagGen){
        prefix = `[${logger.tagGen()}]` + prefix;
      }
      if (logger.parent){
        logger = logger.parent;
      }else{
        break;
      }
    }
    prefix = `[NERTC:${logLevel}:${updateLogIndex()} ${dateStr}]${prefix}`;
    args.splice(0, 0, prefix)
    args.forEach(function (arg, index) {
      arg = formatSingleArg(arg);
      if (typeof arg === "object") {
        args[index] = simpleClone(arg)
      }else{
        args[index] = arg
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
