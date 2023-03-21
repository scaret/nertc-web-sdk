// 双域名高可用 文档： https://docs.popo.netease.com/lingxi/2b526730494f44dca20c76a81cd2e207#edit
// 用法：通过client.adapterRef.lbsManager.ajax()像之前一样请求就行了
// requestLBS可以在这里找到上报 http://logsearch.hz.netease.com/vcloud_elk_ssd_online/goto/5d2204e2b0eca5f1c5111f98258b40a4

import { BUILD, LBS_BUILD_CONFIG, lbsUrl, SDK_VERSION } from '../Config'
import { Client, ILogger, RequestLBSEvent, Timer } from '../types'
import { ajax, AjaxOptions, getFormData } from '../util/ajax'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import { generateUUID } from '../util/rtcUtil/utils'
import { getParameters } from './parameters'
import * as env from '../util/rtcUtil/rtcEnvironment'
import { JSONBigParse, JSONBigStringify } from '../util/json-big'

type URLBackupSourceType = 'builtin' | 'localstorage' | 'lbs' | 'extra'

export interface RequestInfo {
  // https://docs.popo.netease.com/lingxi/2b526730494f44dca20c76a81cd2e207#edit
  xhr?: XMLHttpRequest
  startAt: number
  finishiedAt: number
  rtt: number
  status: 'success' | 'fail' | 'inprogress'
  requestId: number
  seqId: string
  uuid: string
  errCode: number
  errMsg: string
}

export interface DomainItem {
  id: number
  domain: string
  mainDomain: string
  successCount: number
  failCount: number
  lastRequest?: RequestInfo
  updatedAt: number
  tag: string
  source: URLBackupSourceType
}

export interface URLSetting {
  requestId: number
  state: 'uninit' | 'sent' | 'success' | 'fail'
  seqId: string
  url: string
  item: DomainItem

  // 触发请求的函数
  fire?: () => void
  // setTimeout
  timer?: Timer
}

export interface LBS_RES {
  clientIp: string
  ttl: number
  preloadTimeSec: number
  nrtc: [string, string]
  call: [string, string]
  tracking: [string, string]
}

export interface LBS_CONFIG {
  ts: number
  appKey: string
  sdkVersion: string
  sdkBuild: string
  config: LBS_RES
}

export interface LoadLocalConfigRes {
  reason: string
  config: LBS_CONFIG | null
}

enum LBS_ERR_CODE {
  UNKNOWN_ERROR = 99999,
  TIMEOUT = 70100,
  JSON_ERROR = 70101,
  FORMAT_ERROR = 70102
}

export class LBSManager {
  private client: Client
  private logger: ILogger
  private urlBackupMap: { [domain: string]: DomainItem[] } = {}
  private requestCnt = 0
  private localStorageKey = 'LBS_CONFIG'
  private builtinConfig: {
    [tag: string]: [string, string]
  } = LBS_BUILD_CONFIG
  private updateTimer: Timer | null = null
  private lastUpdateStartAt = 0
  private lastUpdate: {
    activeFrom: number
    res: LBS_RES
  } | null = null
  private tagToMainDomain: { [tag: string]: string } = {}
  private lbsState: 'uninit' | 'builtin' | 'local' | 'remote' = 'uninit'
  private lbsStateWillChangeTimer: Timer | null = null

  constructor(client: Client) {
    this.client = client
    this.logger = client.logger.getChild(() => {
      let tag = `LBSManager ` + this.lbsState
      if (this.client.adapterRef.lbsManager !== this) {
        tag += 'DETACHED'
      }
      return tag
    })
    window.addEventListener('online', () => {
      if (
        this.client.adapterRef.connectState.curState !== 'DISCONNECTED' &&
        this.client.adapterRef.lbsManager === this
      ) {
        this.logger.log(`侦测到网络连接恢复，尝试更新LBS配置`)
        this.startUpdate('online')
      }
    })
  }
  /**
   * 向LBS发起请求，更新域名配置，并存储在localStorage
   */
  async startUpdate(reason: string): Promise<LBS_RES | undefined> {
    if (!this.client._params.appkey) {
      this.logger.error(`无法更新域名配置：缺少appkey`)
      return
    }
    if (this.client?._params?.neRtcServerAddresses?.channelServer) {
      this.logger.log(`忽略更新LBS配置请求：当前为私有化配置`)
      return
    }
    const now = Date.now()
    const lastUpdatedDuration = now - this.lastUpdateStartAt
    if (lastUpdatedDuration < 3000) {
      this.logger.log(
        `startUpdate 忽略更新请求 ${reason}: 上次更新于 ${lastUpdatedDuration} 毫秒前`
      )
      return
    }
    this.lastUpdateStartAt = now
    this.logger.log(`startUpdate: 开始更新LBS配置。原因：${reason}`)
    let config: LBS_RES | null = null
    try {
      config = (await this.ajax({
        url: `${lbsUrl}?reason=${reason}&sdkVersion=${encodeURIComponent(
          SDK_VERSION
        )}&appKey=${encodeURIComponent(this.client._params.appkey)}&business=rtc&clientType=16`,
        type: 'GET',
        header: {
          //'Session-Id': this.client.adapterRef.deviceId || ''
        }
      })) as LBS_RES
    } catch (e) {
      this.logger.error(`LBS更新失败！`, e)
    }
    //上报LBS结果
    const requestInfoArr = this.getReportField('lbs')
    requestInfoArr.forEach((data: RequestLBSEvent) => {
      this.client.apiEventReport('setRequestLbs', data)
    })
    if (config && config.nrtc && config.call && config.tracking) {
      // ttl到期后重新更新配置
      if (config.ttl) {
        if (this.updateTimer) {
          clearTimeout(this.updateTimer)
        }
        this.updateTimer = setTimeout(() => {
          this.logger.log(`LBS已到过期时间，正在回滚至内建设置`)
          this.loadBuiltinConfig('expire')
        }, config.ttl * 1000)
      }

      this.lastUpdate = {
        activeFrom: Date.now(),
        res: config
      }
      this.handleLbsStateWillChange(reason)
      this.addUrlBackup(this.tagToMainDomain.nrtc, config.nrtc, 'nrtc', 'lbs')
      this.addUrlBackup(this.tagToMainDomain.call, config.call, 'call', 'lbs')
      this.addUrlBackup(this.tagToMainDomain.tracking, config.tracking, 'tracking', 'lbs')

      this.lbsState = 'remote'
      this.logger.log(
        `成功加载远端配置。过期时间：${config.ttl}秒后。preloadTimeSec:${config.preloadTimeSec}：`
      )
      this.client.safeEmit('@lbs-config-update', {
        reason
      })
      this.saveConfig(config)
      return config
    } else {
      this.logger.error(`startUpdate更新失败：无效的 LBS 返回`, config)
    }
  }

  /**
   * 使用内置域名配置。发生时机：
   * 1. SDK第一次载入时，localStorage配置不可用
   * 2. 域名配置过期后，请求LBS配置无法返回
   */
  async loadBuiltinConfig(reason: string) {
    if (this.lbsState !== 'uninit') {
      this.handleLbsStateWillChange(reason)
    }
    for (let tag in this.builtinConfig) {
      if (this.builtinConfig[tag].length) {
        this.addUrlBackup(this.builtinConfig[tag][0], this.builtinConfig[tag], tag, 'builtin')
        this.tagToMainDomain[tag] = this.builtinConfig[tag][0]
      }
    }
    this.lbsState = 'builtin'
    this.client.safeEmit('@lbs-config-update', {
      reason
    })
    if (reason !== 'oninit') {
      this.logger.log(`成功加载内建配置 ${reason}。`)
    }
  }

  private handleLbsStateWillChange(reason: string) {
    if (this.lbsStateWillChangeTimer) {
      clearTimeout(this.lbsStateWillChangeTimer)
    }
    const before = {
      lbsState: this.lbsState,
      settings: this.getSettings()
    }
    this.lbsStateWillChangeTimer = setTimeout(() => {
      const after = {
        lbsState: this.lbsState,
        settings: this.getSettings()
      }
      if (this.client.adapterRef.connectState.curState !== 'DISCONNECTED') {
        this.client.apiFrequencyControl({
          name: '_lbsStateChange',
          code: 0,
          param: {
            reason,
            before,
            after
          }
        })
      }
    }, 0)
  }

  private getSettings() {
    const domains = Object.keys(this.urlBackupMap)
    const info: any = {}
    domains.forEach((mainDomain) => {
      info[mainDomain] = this.urlBackupMap[mainDomain].map((domainItem) => {
        const lastResult = domainItem.lastRequest
          ? {
              status: domainItem.lastRequest.status,
              rtt: domainItem.lastRequest.rtt
            }
          : undefined
        return {
          domain: domainItem.domain,
          successCount: domainItem.successCount,
          failCount: domainItem.failCount,
          lastResult
        }
      })
    })
    return info
  }

  // 获取最近一次的请求信息，用于上报
  getReportField(tag: 'lbs' | 'nrtc' | 'call' | 'tracking') {
    const domainItems: DomainItem[] = []
    for (let mainDomain in this.urlBackupMap) {
      for (let i = 0; i < this.urlBackupMap[mainDomain].length; i++) {
        const item = this.urlBackupMap[mainDomain][i]
        if (item.tag === tag) {
          domainItems.push(item)
        }
      }
    }
    let lbsAddrs: any = []
    let requestId = 0
    domainItems.forEach((domainItem) => {
      if (domainItem.lastRequest && domainItem.lastRequest.status !== 'inprogress') {
        if (domainItem.lastRequest.requestId > requestId) {
          requestId = domainItem.lastRequest.requestId
          lbsAddrs = []
        }
        if (domainItem.lastRequest.requestId !== requestId) {
          return
        }
        if (tag === 'lbs') {
          lbsAddrs.push({
            app_key: this.client._params.appkey,
            request_id: domainItem.lastRequest.uuid,
            err_code: domainItem.lastRequest.errCode,
            err_msg: domainItem.lastRequest.errMsg,
            rtt: domainItem.lastRequest.rtt,
            time: domainItem.lastRequest.finishiedAt
          } as RequestLBSEvent)
        } else if (tag === 'nrtc') {
          lbsAddrs.push({
            domain: domainItem.domain,
            type: 1,
            code: domainItem.lastRequest.status === 'success' ? 0 : 1
          })
        } else if (tag === 'call') {
          lbsAddrs.push({
            domain: domainItem.domain,
            type: 1,
            code: domainItem.lastRequest.status === 'success' ? 0 : 1,
            status: domainItem.lastRequest.status,
            lbsFrom: this.lbsState,
            rtt: domainItem.lastRequest.rtt
          })
        } else {
          lbsAddrs.push({
            domain: domainItem.domain,
            requestId: domainItem.lastRequest.uuid,
            addr: '',
            type: 1,
            code: domainItem.lastRequest.status === 'success' ? 0 : 1,
            status: domainItem.lastRequest.status,
            lbsFrom: this.lbsState,
            rtt: domainItem.lastRequest.rtt
          })
        }
      }
    })
    return lbsAddrs
  }

  private saveConfig(config: LBS_RES) {
    if (!this.client._params.appkey) {
      this.logger.error(`saveConfig: 缺少appkey`)
      return
    }
    const ts = Date.now()
    const data: LBS_CONFIG = {
      ts,
      appKey: this.client._params.appkey,
      sdkVersion: SDK_VERSION,
      sdkBuild: BUILD,
      config
    }
    try {
      localStorage.setItem(this.localStorageKey, JSONBigStringify(data))
    } catch (e: any) {
      this.logger.error(`saveConfig：无法存储LBS设置`, e.name, e.message)
    }
  }

  loadLocalConfig(reason: string): LoadLocalConfigRes {
    if (!this.client._params.appkey) {
      this.logger.error(`loadLocalConfig: 缺少appkey`)
      return { reason: 'appkeyNotFound', config: null }
    }
    if (this.client._params?.neRtcServerAddresses?.channelServer) {
      this.logger.log(`忽略 loadLocalConfig 请求：当前为私有化配置`)
      return { reason: 'privilization', config: null }
    }
    let data: LBS_CONFIG | null = null
    try {
      const str = window.localStorage.getItem(this.localStorageKey)
      if (!str) {
        this.logger.log(`本地未发现LBS配置`)
        return { reason: 'configNotFound', config: null }
      }
      data = JSONBigParse(str)
    } catch (e: any) {
      this.logger.error('无法读取本地配置：', e.name, e.message)
    }
    if (!data) {
      return { reason: 'configError', config: null }
    }

    const now = Date.now()
    const ttlMs = data.ts + data.config.ttl * 1000 - now
    if (ttlMs < 0) {
      this.logger.log(`LBS不使用本地配置：ttl已过期${Math.floor(-ttlMs / 1000)} 秒。`)
      return { reason: 'expire', config: null }
    } else if (data.sdkVersion !== SDK_VERSION || data.sdkBuild !== BUILD) {
      this.logger.warn(
        `LBS不使用本地配置：版本不匹配。${data.sdkVersion}/${data.sdkBuild} ${SDK_VERSION}/${BUILD}。`
      )
      return { reason: 'version', config: null }
    } else if (data.appKey !== this.client._params.appkey) {
      this.logger.warn(
        `LBS不使用本地配置：appKey不匹配。${data.appKey} ${this.client._params.appkey}。`
      )
      return { reason: 'appkey', config: null }
    } else {
      this.lastUpdate = {
        activeFrom: data.ts,
        res: data.config
      }
      this.handleLbsStateWillChange(reason)
      this.addUrlBackup(this.tagToMainDomain.call, data.config.call, 'call', 'localstorage')
      this.addUrlBackup(this.tagToMainDomain.nrtc, data.config.nrtc, 'nrtc', 'localstorage')
      this.addUrlBackup(
        this.tagToMainDomain.tracking,
        data.config.tracking,
        'tracking',
        'localstorage'
      )

      this.lbsState = 'local'
      this.logger.log(`成功加载本地配置。过期时间：${Math.floor(ttlMs / 1000)} 秒后。`)

      this.client.safeEmit('@lbs-config-update', {
        reason
      })
      return { reason: 'success', config: data }
    }
  }

  /**
   * 当前同域名配置会被覆盖。
   */
  addUrlBackup(
    mainDomain: string,
    replacedBy: [string, string] | [string],
    tag: string,
    source: URLBackupSourceType
  ) {
    const formerDomainSettings = this.urlBackupMap[mainDomain] || []
    this.urlBackupMap[mainDomain] = []
    const URLBackup = this.urlBackupMap[mainDomain]
    const updatedAt = Date.now()
    replacedBy.forEach((domain) => {
      let domainItem = formerDomainSettings.find((item) => {
        return item.domain === domain && item.mainDomain === mainDomain
      })
      if (domainItem) {
        domainItem.updatedAt = updatedAt
        domainItem.tag = tag
        domainItem.source = source
      } else {
        domainItem = {
          id: URLBackup.length,
          domain,
          mainDomain,
          successCount: 0,
          failCount: 0,
          updatedAt,
          tag,
          source
        }
      }
      URLBackup.push(domainItem)
    })
  }

  getURLSettings(url: string) {
    const regex = /(\/\/)([^\/]+)(\/)/
    const domainMatch = url.match(regex)

    let domain = ''
    if (!domainMatch) {
      // 无法识别URL，直接将整个URL当作Domain
      domain = url
    } else {
      domain = domainMatch[2]
    }
    if (!this.urlBackupMap[domain]) {
      this.addUrlBackup(domain, [domain], 'extra', 'extra')
    }
    const requestId = this.requestCnt++
    const urlSettings: URLSetting[] = this.urlBackupMap[domain].map((item, index) => {
      const urlChosen = url.replace(regex, `$1${item.domain}$3`)
      return {
        seqId: `${requestId}_${index}`,
        state: 'uninit',
        requestId,
        url: urlChosen,
        item
      }
    })
    return urlSettings
  }

  private markSuccess(urlSetting: URLSetting, requestInfo: RequestInfo) {
    if (requestInfo?.status === 'inprogress') {
      requestInfo.finishiedAt = Date.now()
      requestInfo.rtt = requestInfo.finishiedAt - requestInfo.startAt
      requestInfo.status = 'success'
      this.logger.debug(
        `markFinish success seqId:${urlSetting.seqId} source:${urlSetting.item.source} rtt:${requestInfo.rtt}ms url:${urlSetting.url}`
      )
    }
    urlSetting.item.successCount++
    urlSetting.state = 'success'
    const domainList = this.urlBackupMap[urlSetting.item.mainDomain]
    if (domainList && domainList[0].lastRequest?.status === 'fail') {
      // 如果主域名无法访问，而备用域名可以访问，则下次直接访问备用域名
      const index = domainList.findIndex((item) => {
        return item === urlSetting.item
      })
      if (index > -1) {
        this.logger.warn(`主备域名互换。${domainList[0].domain} => ${urlSetting.item.domain}`)
        this.handleLbsStateWillChange('domainDown:' + domainList[0].domain)
        domainList.splice(index, 1)
        domainList.unshift(urlSetting.item)
      }
    }
  }
  // markFail指将一次XMLHTTPRequest请求计为失败。
  // 第一次失败会立即触发备用链路的请求。
  // - 第二次如成功，备用链路会自动和主链路交换优先级。
  // - 第二次如失败，会将.ajax()整体请求计为失败。
  private markFail(
    urlSetting: URLSetting,
    requestInfo: RequestInfo,
    errCode: number,
    errMsg: string
  ) {
    if (requestInfo?.status === 'inprogress') {
      requestInfo.finishiedAt = Date.now()
      requestInfo.rtt = requestInfo.finishiedAt - requestInfo.startAt
      requestInfo.status = 'fail'
      requestInfo.errCode = errCode
      requestInfo.errMsg = errMsg
      this.logger.debug(
        `markFinish fail seqId:${urlSetting.seqId} source:${urlSetting.item.source} rtt:${requestInfo.rtt}ms url:${urlSetting.url}`,
        errCode,
        errMsg
      )
    }
    urlSetting.item.failCount++
    urlSetting.state = 'fail'
    this.logger.error(`markFail：`, urlSetting.item.domain, errCode, errMsg)
  }
  private isAllRequestsFinished(urlSettings: URLSetting[]) {
    for (let i in urlSettings) {
      const setting = urlSettings[i]
      if (setting.state === 'uninit' || setting.state === 'sent') {
        return false
      }
    }
    return true
  }

  ajax(option: AjaxOptions) {
    if (getParameters().disableLBSService) {
      this.logger.log(`disableLBSService:`, option.url)
      return ajax(option)
    }

    // 可能有多个配置，含有备份URL
    const urlSettings = this.getURLSettings(option.url)
    // ajax请求已经返回
    let ajaxFinished = false

    return new Promise((resolve, reject) => {
      let xhrSendTs = 0
      let xhrSpendMs = 0
      const handleXHRLoad = (
        xhr: XMLHttpRequest,
        requestInfo: RequestInfo,
        urlSetting: URLSetting
      ) => {
        xhrSpendMs = Date.now() - xhrSendTs
        if (option.url.indexOf('getChannelInfos.action') > -1) {
          // 为了确保统计准确，时间统计必须放在前面
          this.client.adapterRef.state.getChannelInfoRtt = xhrSpendMs
        }

        // console.error("handleXHRLoad", xhr.status, urlSetting.item.tag, xhr.responseType, xhr.response, xhr)
        if (xhr.status >= 400) {
          // 服务端api即使拒绝一个请求，status也是200的。
          this.markFail(
            urlSetting,
            requestInfo,
            xhr.status,
            typeof xhr.response === 'string' ? xhr.response : JSONBigStringify(xhr.response)
          )
          if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer) {
            // 如果备用链路尚未启动，则直接启用备用链路
            this.logger.warn(
              `主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】`,
              xhr.status
            )
            urlSettings[1].fire()
          } else if (this.isAllRequestsFinished(urlSettings)) {
            return reject(
              new RtcError({
                code: ErrorCode.LBS_REQUEST_ERROR,
                message: 'LBS: 网络请求错误'
              })
            )
          }
        } else if (xhr.responseType === 'json' && !xhr.response) {
          // 如果服务端的ContentType是json，而返回的内容不是json，这会导致response为null，而无法获得实际的返回值
          this.markFail(urlSetting, requestInfo, LBS_ERR_CODE.JSON_ERROR, 'JSON_ERROR')
          if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer) {
            // 如果备用链路尚未启动，则直接启用备用链路
            this.logger.warn(
              `主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】`,
              xhr
            )
            urlSettings[1].fire()
          } else if (this.isAllRequestsFinished(urlSettings)) {
            return reject(
              new RtcError({
                code: ErrorCode.LBS_JSON_ERROR,
                message: 'LBS: 结果json解析错误'
              })
            )
          }
        } else if (xhr.response?.code === 500) {
          // 兼容getChannelInfo返回500的情况
          this.markFail(
            urlSetting,
            requestInfo,
            LBS_ERR_CODE.UNKNOWN_ERROR,
            JSONBigStringify(xhr.response)
          )
          if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer) {
            // 如果备用链路尚未启动，则直接启用备用链路
            this.logger.warn(
              `主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】`,
              xhr.response
            )
            urlSettings[1].fire()
          } else if (this.isAllRequestsFinished(urlSettings)) {
            var data = xhr.response
            resolve(data)
          }
        } else if (
          urlSetting.item.tag === 'lbs' &&
          (!xhr.response?.call?.length ||
            !xhr.response?.nrtc?.length ||
            !xhr.response?.tracking?.length)
        ) {
          this.markFail(
            urlSetting,
            requestInfo,
            LBS_ERR_CODE.FORMAT_ERROR,
            JSONBigStringify(xhr.response)
          )
          if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer) {
            // 如果备用链路尚未启动，则直接启用备用链路
            this.logger.warn(
              `主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】`,
              'FORMAT_ERROR'
            )
            urlSettings[1].fire()
          } else {
            return resolve(xhr.response)
          }
        } else {
          this.markSuccess(urlSetting, requestInfo)
          urlSettings.forEach((setting) => {
            if (setting.timer) {
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
            var data = xhr.response
            // data = JSONBigParse(data)
            resolve(data)
          }
        }
      }

      const handleXHRError = (
        xhr: XMLHttpRequest,
        requestInfo: RequestInfo,
        urlSetting: URLSetting,
        e: ProgressEvent
      ) => {
        this.markFail(
          urlSetting,
          requestInfo,
          LBS_ERR_CODE.UNKNOWN_ERROR,
          `${e.type || JSONBigStringify(e)}:${urlSetting.url}`
        )
        if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer) {
          // 如果备用链路尚未启动，则直接启用备用链路
          this.logger.warn(
            `主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】`,
            e
          )
          urlSettings[1].fire()
        } else if (this.isAllRequestsFinished(urlSettings)) {
          ajaxFinished = true
          return reject(
            new RtcError({
              code: ErrorCode.LBS_REQUEST_ERROR,
              message: 'LBS: 主线路请求发生错误(onerror)'
            })
          )
        }
      }

      const handleXHRTimeout = (
        xhr: XMLHttpRequest,
        requestInfo: RequestInfo,
        urlSetting: URLSetting,
        e: ProgressEvent
      ) => {
        this.markFail(urlSetting, requestInfo, LBS_ERR_CODE.TIMEOUT, 'TIMEOUT')
        if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer) {
          // 如果备用链路尚未启动，则直接启用备用链路
          this.logger.warn(
            `主线路请求超时，启用备用线路 【主 ${urlSetting.url}】【备 ${urlSettings[1].url}】`,
            e
          )
          urlSettings[1].fire()
        } else if (this.isAllRequestsFinished(urlSettings)) {
          ajaxFinished = true
          return reject(
            new RtcError({
              code: ErrorCode.LBS_REQUEST_ERROR,
              message: 'LBS: 主线路请求发生错误(ontimeout)'
            })
          )
        }
      }

      const createXHR = (requestInfo: RequestInfo, urlSetting: URLSetting) => {
        const xhr = new XMLHttpRequest()
        requestInfo.xhr = xhr
        xhr.open(option.type || 'GET', urlSetting.url, true)
        xhr.responseType = option.dataType || 'json'

        const contentType = option.contentType || 'application/json;charset=UTF-8'
        xhr.setRequestHeader('Content-Type', contentType)

        if (option.header) {
          Object.keys(option.header).map((key) => {
            if (option.header && option.header[key as keyof typeof option.header]) {
              xhr.setRequestHeader(key, option.header[key as keyof typeof option.header])
            }
          })
        }
        if (urlSetting.item.tag === 'lbs') {
          const uuid = generateUUID()
          if (urlSetting.item.lastRequest) {
            urlSetting.item.lastRequest.uuid = uuid
          }
          xhr.setRequestHeader('X-Request-Id', uuid)
        }

        xhr.onload = handleXHRLoad.bind(xhr, xhr, requestInfo, urlSetting)
        xhr.onerror = handleXHRError.bind(xhr, xhr, requestInfo, urlSetting)
        xhr.ontimeout = handleXHRTimeout.bind(xhr, xhr, requestInfo, urlSetting)
        xhrSendTs = Date.now()
        if (contentType.indexOf('x-www-form-urlencoded') >= 0) {
          if (option.data) {
            xhr.send(getFormData(option.data))
          } else {
            xhr.send()
          }
        } else {
          if (option.data) {
            xhr.send(JSONBigStringify(option.data))
          } else {
            xhr.send()
          }
        }
      }

      urlSettings.forEach((urlSetting, index) => {
        urlSetting.fire = () => {
          // 保护，只触发一次
          urlSetting.fire = undefined
          if (urlSetting.timer) {
            clearTimeout(urlSetting.timer)
            urlSetting.timer = undefined
          }
          urlSetting.state = 'sent'
          const requestInfo: RequestInfo = {
            status: 'inprogress',
            startAt: Date.now(),
            requestId: urlSetting.requestId,
            seqId: urlSetting.seqId,
            uuid: '',
            finishiedAt: 0,
            errCode: 0,
            errMsg: '',
            rtt: -1
          }
          urlSetting.item.lastRequest = requestInfo
          createXHR(requestInfo, urlSetting)
        }
        if (index) {
          urlSetting.timer = setTimeout(() => {
            if (urlSetting.fire) {
              this.logger.warn(`主线路请求超时，发起备用线路请求：${urlSetting.url}`)
              urlSetting.fire()
            }
          }, getParameters().fireBackupDelay * index)
        }
      })
      // 直接发起主链路请求
      if (urlSettings[0].fire) {
        urlSettings[0].fire()
      }
    })
  }
}
