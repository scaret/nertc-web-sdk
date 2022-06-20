import {ILogger, Timer} from "../types";
import {Logger} from "../util/webrtcLogger";
import {BUILD, LBS_BUILD_CONFIG, lbsUrl, SDK_VERSION} from "../Config";
import RtcError from "../util/error/rtcError";
import ErrorCode from "../util/error/errorCode";
import {getParameters} from "./parameters";
import {AjaxOptions, getFormData} from "../util/ajax";
var JSONbig = require('json-bigint');

export interface DomainItem{
  id: number,
  domain: string,
  mainDomain: string,
  successCount: number,
  failCount: number,
  lastFinishedAt: number,
  lastResult: "success"|"fail",
  updatedAt: number,
}

export interface URLSetting{
  requestId: number,
  state: "uninit"|"sent"|"success"|"fail",
  seqId: string;
  url: string;
  item: DomainItem;
  
  // 触发请求的函数
  fire?: ()=>void
  // setTimeout
  timer?: Timer;
}

export interface LBS_RES{
  "clientIp": string,
  "ttl": number,
  "preloadTimeSec": number,
  "nrtc": [string, string],
  "call": [string, string],
  "tracking": [string, string],
}

export interface LBS_CONFIG {
  ts: number;
  appKey: string;
  sdkVersion: string;
  sdkBuild: string;
  config: LBS_RES
}

export interface LoadLocalConfigRes {
  reason: string;
  config: LBS_CONFIG|null;
}

class LBSManager {
  private logger:ILogger = new Logger({
    tagGen: ()=>{
      let tag = `LBSManager ` + this.lbsState
      return tag
    }
  });
  private urlBackupMap:{[domain: string]: DomainItem[]} = {}
  private requestCnt = 0
  private localStorageKey = "LBS_CONFIG"
  private builtinConfig: {
    [mainDomain: string]: [string, string]
  } = LBS_BUILD_CONFIG
  private updateTimer: Timer|null = null
  private lastUpdatedAt:number = 0
  private lastAppKey:string = ""
  private lbsState: "builtin"|"local"|"remote" = "builtin"
  private lbsStateWillChangeTimer: Timer|null = null
  
  constructor() {
    this.loadBuiltinConfig("onload")
    window.addEventListener('online', ()=>{
      if (this.lastAppKey){
        this.logger.log(`侦测到网络连接恢复，尝试更新LBS配置`)
        this.startUpdate(this.lastAppKey, "online")
      }
    })
  }
  /**
   * 向LBS发起请求，更新域名配置，并存储在localStorage
   */
  async startUpdate(appKey: string, reason: string): Promise<LBS_RES|undefined>{
    const now = Date.now()
    const lastUpdatedDuration = now - this.lastUpdatedAt
    if (lastUpdatedDuration < 3000){
      this.logger.log(`startUpdate 忽略更新请求 ${reason}: 上次更新于 ${lastUpdatedDuration} 毫秒前`)
      return
    }
    this.lastUpdatedAt = now
    this.lastAppKey = appKey
    this.logger.log(`startUpdate: 开始更新LBS配置。原因：${reason}`)
    let config:LBS_RES | null = null
    try{
      config = await this.ajax({
        url: `${lbsUrl}?reason=${reason}&sdkVersion=${encodeURIComponent(SDK_VERSION)}&appKey=${encodeURIComponent(appKey)}&business=rtc&clientType=16`,
        type: 'GET',
      }) as LBS_RES
    }catch(e){
      this.logger.error(`LBS更新失败！`, e)
      return
    }
    if (config && config.nrtc && config.call && config.tracking){
      
      // ttl到期后重新更新配置
      if (config.ttl){
        if (this.updateTimer){
          clearTimeout(this.updateTimer)
        }
        this.updateTimer = setTimeout(()=>{
          this.logger.log(`LBS已到过期时间，正在回滚至内建设置`)
          this.loadBuiltinConfig("expire")
        }, config.ttl * 1000)
      }
      
      this.handleLbsStateWillChange(reason)
      this.addUrlBackup(config.nrtc[0], config.nrtc)
      this.addUrlBackup(config.call[0], config.call)
      this.addUrlBackup(config.tracking[0], config.tracking)

      this.lbsState = "remote"
      this.logger.log(`成功加载远端配置。过期时间：${config.ttl}秒后。preloadTimeSec:${config.preloadTimeSec}：`)
      this.saveConfig(appKey, config)
      return config
    }else{
      this.logger.error(`无效的 LBS 返回`, config)
    }
  }

  /**
   * 使用内置域名配置。发生时机：
   * 1. SDK第一次载入时，localStorage配置不可用
   * 2. 域名配置过期后，请求LBS配置无法返回
   */
  private async loadBuiltinConfig(reason: string){
    if (reason !== "onload"){
      this.handleLbsStateWillChange(reason)
    }
    for (let mainDomain in this.builtinConfig){
      this.addUrlBackup(mainDomain, this.builtinConfig[mainDomain])
    }
    this.lbsState = "builtin"
    this.logger.log(`成功加载内建配置 ${reason}。`)
  }
  
  private handleLbsStateWillChange(reason: string){
    if (this.lbsStateWillChangeTimer){
      clearTimeout((this.lbsStateWillChangeTimer))
    }
    const before = {
      lbsState: this.lbsState,
      settings: this.getSettings(),
    }
    this.lbsStateWillChangeTimer = setTimeout(()=>{
      const after = {
        lbsState: this.lbsState,
        settings: this.getSettings(),
      }
      getParameters().clients.forEach((client)=>{
        if (!client.destroyed && client.adapterRef.connectState.curState !== "DISCONNECTED"){
          client.apiFrequencyControl({
            name: '_lbsStateChange',
            code: 0,
            param: {
              reason,
              before,
              after,
            }
          })
        }
      })
    }, 0)
  }
  
  private getSettings(){
    const domains = Object.keys(this.urlBackupMap)
    const info:any = {}
    domains.forEach((mainDomain)=>{
      info[mainDomain] = this.urlBackupMap[mainDomain].map((domainItem)=>{
        return {
          domain: domainItem.domain,
          successCount: domainItem.successCount,
          failCount: domainItem.failCount,
          lastResult: domainItem.lastResult,
        }
      })
    })
    return info
  }
  
  private saveConfig(appKey:string, config: LBS_RES){
    const ts = Date.now()
    const data:LBS_CONFIG = {
      ts,
      appKey,
      sdkVersion: SDK_VERSION,
      sdkBuild: BUILD,
      config
    }
    try{
      localStorage.setItem(this.localStorageKey, JSON.stringify(data))
    }catch(e){
      this.logger.error(`saveConfig：无法存储LBS设置`, e.name, e.message)
    }
  }
  
  loadLocalConfig(appKey: string, reason: string): LoadLocalConfigRes{
    let data:LBS_CONFIG|null = null
    this.lastAppKey = appKey
    try{
      const str = window.localStorage.getItem(this.localStorageKey)
      if (!str){
        this.logger.log(`本地未发现LBS配置`)
        return {reason: "configNotFound", config: null}
      }
      data = JSON.parse(str)
    }catch(e){
      this.logger.error('无法读取本地配置：', e.name, e.message)
    }
    if (!data){
      return {reason: "configError", config: null};
    }

    const now = Date.now()
    const ttlMs = data.ts + data.config.ttl * 1000 - now
    if (ttlMs <0){
      this.logger.log(`LBS不使用本地配置：ttl已过期${ Math.floor(- ttlMs / 1000)} 秒。`)
      return {reason: "expire", config: null}
    }
    else if (data.sdkVersion !== SDK_VERSION || data.sdkBuild !== BUILD){
      this.logger.warn(`LBS不使用本地配置：版本不匹配。${data.sdkVersion}/${data.sdkBuild} ${SDK_VERSION}/${BUILD}。`)
      return {reason: "version", config: null}
    } else if (data.appKey !== appKey){
      this.logger.warn(`LBS不使用本地配置：appKey不匹配。${data.appKey} ${appKey}。`)
      return {reason: "appkey", config: null}
    } else {
      this.handleLbsStateWillChange(reason)
      this.addUrlBackup(data.config.call[0], data.config.call)
      this.addUrlBackup(data.config.nrtc[0], data.config.nrtc)
      this.addUrlBackup(data.config.tracking[0], data.config.tracking)
      
      this.lbsState = "local"
      this.logger.log(`成功加载本地配置。过期时间：${Math.floor(ttlMs / 1000)} 秒后。`)
      
      return {reason: "success", config: data}
    }
  }

  /**
   * 当前同域名配置会被覆盖。
   */
  addUrlBackup(mainDomain:string, replacedBy: [string, string]|[string]){
    const formerDomainSettings = this.urlBackupMap[mainDomain] || []
    this.urlBackupMap[mainDomain] = []
    const URLBackup = this.urlBackupMap[mainDomain]
    const updatedAt = Date.now()
    replacedBy.forEach((domain)=>{
      let domainItem = formerDomainSettings.find((item)=>{
        return item.domain === domain && item.mainDomain === mainDomain
      })
      if (domainItem){
        domainItem.updatedAt = updatedAt
      }else{
        domainItem = {
          id: URLBackup.length,
          domain,
          mainDomain,
          lastFinishedAt: 0,
          successCount: 0,
          failCount: 0,
          lastResult: "success",
          updatedAt,
        }
      }
      URLBackup.push(domainItem)
    })
  }
  
  getURLSettings(url: string){
    const regex = /(\/\/)([^\/]+)(\/)/
    const domainMatch = url.match(regex)

    let domain = ""
    if (!domainMatch){
      // 无法识别URL，直接将整个URL当作Domain
      domain = url
    }else {
      domain = domainMatch[2]
    }
    if (!this.urlBackupMap[domain]){
      this.addUrlBackup(domain, [domain])
    }
    const requestId = this.requestCnt++
    const urlSettings:URLSetting[] = this.urlBackupMap[domain].map((item, index)=>{
      const urlChosen = url.replace(regex, `$1${item.domain}$3`)
      return {
        seqId: `${requestId}_${index}`,
        state: "uninit",
        requestId,
        url: urlChosen,
        item,
      }
    })
    return urlSettings
  }
  
  private markSuccess(urlSetting: URLSetting){
    urlSetting.item.lastFinishedAt = Date.now()
    urlSetting.item.successCount++
    urlSetting.item.lastResult = "success"
    urlSetting.state = "success"
    const domainList = this.urlBackupMap[urlSetting.item.mainDomain]
    if (domainList && domainList[0].lastResult === "fail"){
      // 如果主域名无法访问，而备用域名可以访问，则下次直接访问备用域名
      const index = domainList.findIndex((item)=>{
        return item === urlSetting.item
      })
      if (index > -1){
        this.logger.warn(`主备域名互换。${domainList[0].domain} => ${urlSetting.item.domain}`)
        this.handleLbsStateWillChange("domainDown:" + domainList[0].domain)
        domainList.splice(index, 1)
        domainList.unshift(urlSetting.item)
      }
    }
  }
  private markFail(urlSetting: URLSetting){
    urlSetting.item.lastFinishedAt = Date.now()
    urlSetting.item.failCount++
    urlSetting.item.lastResult = "fail"
    urlSetting.state = "fail"
  }
  private isAllRequestsFinished(urlSettings: URLSetting[]){
    for (let i in urlSettings){
      const setting = urlSettings[i]
      if (setting.state === "uninit" || setting.state === "sent"){
        return false
      }
    }
    return true
  }


  ajax (option:AjaxOptions) {

    // 可能有多个配置，含有备份URL
    const urlSettings = this.getURLSettings(option.url)
    // ajax请求已经返回
    let ajaxFinished = false

    return new Promise((resolve, reject)=>{
      const handleXHRLoad = (xhr: XMLHttpRequest, urlSetting: URLSetting)=>{
        this.markSuccess(urlSetting)
        urlSettings.forEach((setting)=>{
          if (setting.timer){
            clearTimeout(setting.timer)
            setting.timer = undefined
          }
          setting.fire = undefined
        })
        if (ajaxFinished) {
          this.logger.log(`${urlSetting.url} 已忽略返回值：${xhr.status}`)
          return
        } else {
          ajaxFinished = true
          if (xhr.status > 400) {
            return Promise.reject(
              new RtcError({
                code: ErrorCode.INVALID_PARAMETER,
                message: 'could not send request due to invalid parameter'
              })
            )
          }
          var data = xhr.response
          // data = JSON.parse(data)
          resolve(data)
        }
      }

      const handleXHRError = (xhr: XMLHttpRequest, urlSetting: URLSetting, e: ProgressEvent)=>{
        this.markFail(urlSetting)
        if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer){
          // 如果备用链路尚未启动，则直接启用备用链路
          this.logger.warn(`主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】` , e)
          urlSettings[1].fire()
        }
        else if (this.isAllRequestsFinished(urlSettings)){
          ajaxFinished = true
          reject(e)
        }
      }

      const handleXHRTimeout = (xhrRequest: XMLHttpRequest, urlSetting: URLSetting, e: ProgressEvent)=>{
        this.markFail(urlSetting)
        if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer){
          // 如果备用链路尚未启动，则直接启用备用链路
          this.logger.warn(`主线路请求超时，启用备用线路 【主 ${urlSetting.url}】【备 ${urlSettings[1].url}】` , e)
          urlSettings[1].fire()
        }
        else if (this.isAllRequestsFinished(urlSettings)){
          ajaxFinished = true
          reject({
            code: 456,
            desc: `ERR_TIMED_OUT ` + option.url
          })
        }
      }

      const createXHR = (urlSetting: URLSetting)=>{
        const xhr = new XMLHttpRequest()
        xhr.open(option.type || 'GET', urlSetting.url, true)
        xhr.responseType = option.dataType || 'json'

        const contentType = option.contentType || 'application/json;charset=UTF-8'
        xhr.setRequestHeader('Content-Type', contentType)

        if (option.header) {
          Object.keys(option.header).map(key => {
            if (option.header && option.header[key as keyof typeof option.header]) {
              xhr.setRequestHeader(key, option.header[key as keyof typeof option.header])
            }
          })
        }

        xhr.onload = handleXHRLoad.bind(xhr, xhr, urlSetting)
        xhr.onerror = handleXHRError.bind(xhr, xhr, urlSetting)
        xhr.ontimeout = handleXHRTimeout.bind(xhr, xhr, urlSetting)
        if (contentType.indexOf('x-www-form-urlencoded') >= 0) {
          if (option.data) {
            xhr.send(getFormData(option.data))
          } else {
            xhr.send()
          }
        } else {
          if (option.data) {
            xhr.send(JSONbig.stringify(option.data))
          } else {
            xhr.send()
          }
        }
      }

      urlSettings.forEach((urlSetting, index)=>{
        urlSetting.fire = ()=>{
          // 保护，只触发一次
          urlSetting.fire = undefined
          if (urlSetting.timer){
            clearTimeout(urlSetting.timer)
            urlSetting.timer = undefined
          }
          urlSetting.state = "sent"
          createXHR(urlSetting)
        }
        if (index){
          urlSetting.timer = setTimeout(()=>{
            if (urlSetting.fire){
              this.logger.warn(`主线路请求超时，发起备用线路请求：${urlSetting.url}`)
              urlSetting.fire()
            }
          }, getParameters().fireBackupDelay * index)
        }
      })
      // 直接发起主链路请求
      if (urlSettings[0].fire){
        urlSettings[0].fire()
      }
    })
  }
}

export const lbsManager = new LBSManager()
