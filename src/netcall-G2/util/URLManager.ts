import {ILogger, Timer} from "../types";
import {Logger} from "./webrtcLogger";

export interface DomainItem{
  id: number,
  domain: string,
  mainDomain: string,
  lastFinishedAt: number,
  lastResult: "success"|"fail",
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

class URLManager{
  logger:ILogger = new Logger({
    tagGen: ()=>{
      return "URLManager"
    }
  });
  urlBackupMap:{[domain: string]: DomainItem[]} = {}
  requestCnt = 0

  addUrlBackup(domainList: string[]){
    if (!domainList[0]){
      return;
    }
    if (!this.urlBackupMap[domainList[0]]){
      this.urlBackupMap[domainList[0]] = []
    }
    const URLBackup = this.urlBackupMap[domainList[0]]
    domainList.forEach((domain)=>{
      let item = URLBackup.find((item)=>{
        item.domain === domain
      })
      if (!item){
        item = {
          id: URLBackup.length,
          domain,
          mainDomain: domainList[0],
          lastFinishedAt: 0,
          lastResult: "success",
        }
        URLBackup.push(item)
      }
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
      this.addUrlBackup([domain])
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
  
  markSuccess(urlSetting: URLSetting){
    urlSetting.item.lastFinishedAt = Date.now()
    urlSetting.item.lastResult = "success"
    const domainList = this.urlBackupMap[urlSetting.item.mainDomain]
    if (domainList && domainList[0].lastResult === "fail"){
      // 如果主域名无法访问，而备用域名可以访问，则下次直接访问备用域名
      const index = domainList.findIndex((item)=>{
        return item === urlSetting.item
      })
      if (index > -1){
        this.logger.warn(`主备域名互换。${domainList[0].domain} => ${urlSetting.item.domain}`)
        domainList.splice(index, 1)
        domainList.unshift(urlSetting.item)
      }
    }
  }
  markFail(urlSetting: URLSetting){
    urlSetting.item.lastFinishedAt = Date.now()
    urlSetting.item.lastResult = "fail"
  }
  isAllRequestsFinished(urlSettings: URLSetting[]){
    for (let i in urlSettings){
      const setting = urlSettings[i]
      if (setting.state === "uninit" || setting.state === "sent"){
        return false
      }
    }
    return true
  }
}

export const urlManager = new URLManager()

console.log("urlManager", urlManager)