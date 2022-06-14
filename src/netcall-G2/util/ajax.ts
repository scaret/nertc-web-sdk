import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import {urlManager, URLSetting} from "./URLManager";
import {getParameters} from "../module/parameters";
/** 异步请求api */
var JSONbig = require('json-bigint');
/**
 * 异步请求方法
 *
 * @param {any} option
 * @param {string} [option.type=get] 请求方式: GET / POST
 * @param {string} [option.dataType=json] 数据传递方式: json / 其他
 * @param {string} option.url 请求地址
 * @param {obj} option.header 请求header特殊参数
 * @param {data} option.data 请求数据
 */
const getFormData = (data:AjaxFormData) =>
  Object.keys(data)
    .map(
      key =>
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(
          /Object/i.test(data[key as keyof AjaxFormData]) ? JSON.stringify(data[key as keyof AjaxFormData]) : data[key as keyof AjaxFormData]
        )
    )
    .join('&')

export interface AjaxFormData{
  [prop: string]: any;
}

export interface AjaxOptions{
  url: string;
  dataType?: XMLHttpRequestResponseType;
  type?: string;
  contentType?: string;
  header?: {[prop: string]: string};
  data?: AjaxFormData;
}


function ajax (option:AjaxOptions) {

  // 可能有多个配置，含有备份URL
  const urlSettings = urlManager.getURLSettings(option.url)
  // ajax请求已经返回
  let ajaxFinished = false
  
  return new Promise((resolve, reject)=>{
    const handleXHRLoad = function (xhr: XMLHttpRequest, urlSetting: URLSetting) {
      urlManager.markSuccess(urlSetting)
      urlSettings.forEach((setting)=>{
        if (setting.timer){
          clearTimeout(setting.timer)
          setting.timer = undefined
        }
        setting.fire = undefined
      })
      if (ajaxFinished) {
        urlManager.logger.log(`${urlSetting.url} 已忽略返回值：${xhr.status}`)
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
      urlManager.markFail(urlSetting)
      if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer){
        // 如果备用链路尚未启动，则直接启用备用链路
        urlManager.logger.warn(`主线路请求发生错误，启用备用线路 【主  ${urlSetting.url} 】【备 ${urlSettings[1].url} 】` , e)
        urlSettings[1].fire()
      }
      else if (urlManager.isAllRequestsFinished(urlSettings)){
        ajaxFinished = true
        reject(e)
      }
    }
    
    const handleXHRTimeout = (xhrRequest: XMLHttpRequest, urlSetting: URLSetting, e: ProgressEvent)=>{
      urlManager.markFail(urlSetting)
      if (urlSettings[1] && urlSettings[1].fire && urlSettings[1].timer){
        // 如果备用链路尚未启动，则直接启用备用链路
        urlManager.logger.warn(`主线路请求超时，启用备用线路 【主 ${urlSetting.url}】【备 ${urlSettings[1].url}】` , e)
        urlSettings[1].fire()
      }
      else if (urlManager.isAllRequestsFinished(urlSettings)){
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
            urlManager.logger.warn(`主线路请求超时，发起备用线路请求：${urlSetting.url}`)
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

export {ajax}

/* eslint no-unused-vars: 0 */
/* eslint prefer-promise-reject-errors: 0 */
