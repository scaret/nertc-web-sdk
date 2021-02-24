/** 异步请求api */

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
  dataType?: string;
  type?: string;
  contentType?: string;
  header?: {[prop: string]: string};
  data?: AjaxFormData;
}

function ajax (option:AjaxOptions) {
  if (!option || !option.url) {
    return Promise.reject('参数不完整，无法发起请求')
  }

  option.dataType = option.dataType || 'json'
  var xhr:any = new XMLHttpRequest()
  xhr.open(option.type || 'GET', option.url, true)
  xhr.responseType = `${option.dataType}`

  const contentType = option.contentType || 'application/json;charset=UTF-8'
  xhr.setRequestHeader('Content-type', contentType)

  if (option.header) {
    Object.keys(option.header).map(key => {
      if (option.header && option.header[key as keyof typeof option.header]) {
        xhr.setRequestHeader(key, option.header[key as keyof typeof option.header])
      }
    })
  }

  return new Promise((resolve, reject) => {
    xhr.onload = function () {
      if (xhr.status > 400) {
        return Promise.reject('参数不完整，无法发起请求')
      }
      var data = xhr.response
      // data = JSON.parse(data)
      resolve(data)
    }
    xhr.onerror = function (e:ErrorEvent) {
      reject(e)
    }
    if (contentType.indexOf('x-www-form-urlencoded') >= 0) {
      if (option.data) {
        xhr.send(getFormData(option.data))
      } else {
        xhr.send()
      }
    } else {
      if (option.data) {
        xhr.send(JSON.stringify(option.data))
      } else {
        xhr.send()
      }
    }
  })
}

export {ajax}

/* eslint no-unused-vars: 0 */
/* eslint prefer-promise-reject-errors: 0 */
