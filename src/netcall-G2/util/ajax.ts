import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
/** 异步请求api */
var JSONbig = require('json-bigint')
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
export const getFormData = (data: AjaxFormData) =>
  Object.keys(data)
    .map(
      (key) =>
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(
          /Object/i.test(data[key as keyof AjaxFormData])
            ? JSON.stringify(data[key as keyof AjaxFormData])
            : data[key as keyof AjaxFormData]
        )
    )
    .join('&')

export interface AjaxFormData {
  [prop: string]: any
}

export interface AjaxOptions {
  url: string
  dataType?: XMLHttpRequestResponseType
  type?: string
  contentType?: string
  header?: { [prop: string]: string }
  data?: AjaxFormData
}

function ajax(option: AjaxOptions) {
  if (!option || !option.url) {
    return Promise.reject(
      new RtcError({
        code: ErrorCode.INVALID_PARAMETER,
        message: 'could not send request due to invalid parameter'
      })
    )
  }

  option.dataType = option.dataType || 'json'
  var xhr: any = new XMLHttpRequest()
  xhr.open(option.type || 'GET', option.url, true)
  xhr.responseType = `${option.dataType}`

  const contentType = option.contentType || 'application/json;charset=UTF-8'
  xhr.setRequestHeader('Content-type', contentType)

  if (option.header) {
    Object.keys(option.header).map((key) => {
      if (option.header && option.header[key as keyof typeof option.header]) {
        xhr.setRequestHeader(key, option.header[key as keyof typeof option.header])
      }
    })
  }

  return new Promise((resolve, reject) => {
    xhr.onload = function () {
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
    xhr.onerror = function (e: ErrorEvent) {
      reject(e)
    }
    xhr.ontimeout = function (e: ProgressEvent) {
      reject({
        code: 456,
        desc: `ERR_TIMED_OUT ` + option.url
      })
    }
    if (contentType.indexOf('x-www-form-urlencoded') >= 0) {
      if (option.data) {
        xhr.send(getFormData(option.data))
      } else {
        xhr.send()
      }
    } else {
      if (option.data) {
        if (option.header && option.header['Content-Encoding'] === 'gzip') {
          xhr.send(option.data)
        } else {
          xhr.send(JSONbig.stringify(option.data))
        }
      } else {
        xhr.send()
      }
    }
  })
}

export { ajax }

/* eslint no-unused-vars: 0 */
/* eslint prefer-promise-reject-errors: 0 */
