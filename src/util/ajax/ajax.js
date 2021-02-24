var util = require('../util')
var ProxyXhr = require('./proxy/xhr')
var ProxyUpload = require('./proxy/upload')
var ProxyFrame = require('./proxy/frame')

var cache = {}
var doFilter = util.f

function getProxyByMode (options) {
  var mode = options.mode
  var Constructor = ProxyXhr
  // 如果是 IE 7/8/9 并且跨域, 那么使用 iframe 模式
  var window = util.getGlobal()
  if (!window.FormData && window.document) {
    mode = 'iframe'
  }
  if (mode === 'iframe') {
    Constructor = options.upload ? ProxyUpload : ProxyFrame
  }
  return new Constructor(options)
}

function getProxy (options) {
  var upload = options.upload = (options.headers || util.o)['Content-Type'] === 'multipart/form-data'
  var cors = false
  try {
    var origin1 = (location.protocol + '//' + location.host).toLowerCase()
    var origin2 = util.url2origin(options.url)
    cors = origin1 !== origin2
  } catch (error) {
    // ignore error in weixin app
  }
  options.cors = cors
  if (!upload && !cors && !options.mode) {
    return new ProxyXhr(options)
  }
  return getProxyByMode(options)
}

function clear (sn) {
  var c = cache[sn]
  if (!c) {
    return
  }
  c.req.destroy()
  delete cache[sn]
}

function parseExtData (c, data) {
  data = {
    data
  }
  var keys = c.result.headers
  if (keys) {
    data.headers = c.req.header(keys)
  }
  return data
}

function callback (sn, type, data) {
  var c = cache[sn]
  if (!c) {
    return
  }
  if (type === 'onload' && c.result) {
    data = parseExtData(c, data)
  }
  clear(sn)
  var event = {
    type,
    result: data
  }
  doFilter(event)
  if (!event.stopped) {
    c[type](event.result)
  }
}

function onLoad (sn, data) {
  callback(sn, 'onload', data)
}

function onError (sn, error) {
  callback(sn, 'onerror', error)
}

function mergeUrl (url, data) {
  var sep = util.genUrlSep(url)
  data = data || ''
  if (util.isObject(data)) {
    data = util.object2query(data)
  }
  if (data) {
    url += (sep + data)
  }
  return url
}

/**
 * ajax
 * @param  {String} url     请求地址
 * @param  {Object} options 配置参数
 * @property {String} [options.method='GET'] 请求方法, 可选值如下
 * - 'GET'
 * - 'POST'
 * @property {Boolean} [options.sync=false] 是否是同步请求
 * @property {Object|String} [options.query] 'GET' 请求的请求参数, 会拼接到 url
 * @property {Object|String} [options.data] 'POST' 请求要发送的数据, 如果是 'GET' 请求, 那么此参数会被拼接到 url
 * @property {Object} [options.headers] 头信息
 * @property {Boolean} [options.cookie=false] 是否设置`withCredentials`
 * @property {Number} [options.timeout=6000] ms, 超时时间, 0 表示不设置超时
 * @property {String} [options.type='text'] 请求成功时, 返回的数据格式, 可选的值如下
 * - 'text': 文本
 * - 'json': 对象
 * @property {Function} [options.onbeforesend] 发送之前的回调
 * @property {Function} [options.onload] 请求完成回调函数
 * @property {Function} [options.onerror] 请求失败回调函数
 * @property {String} [options.mode='auto'] 跨域或者文件上传所使用的模式
 * - 'auto': 自动, 高版本使用 HTML5, 低版本使用 iframe
 * - 'iframe': 全部使用 iframe
 * @property {Object} [options.result] onload回调时需包含的额外结果, 可选如下
 * - headers, 字符串或字符串数组, 那么会返回相应的头信息
 * @return {String}         序列号
 */
function ajax (url, options) {
  options = options || {}
  // cache callback
  var sn = util.uniqueID()
  var c = {
    result: options.result,
    onload: options.onload || util.f,
    onerror: options.onerror || util.f
  }
  cache[sn] = c
  options.onload = onLoad.bind(null, sn)
  options.onerror = onError.bind(null, sn)
  // append query
  if (options.query) {
    url = mergeUrl(url, options.query)
  }
  // append data for get
  var method = options.method || ''
  if ((!method || /get/i.test(method)) && options.data) {
    url = mergeUrl(url, options.data)
    options.data = null
  }
  options.url = url
  c.req = getProxy(options)
  return sn
}

ajax.filter = function (filter) {
  if (util.isFunction(filter)) {
    doFilter = filter
  }
}

ajax.abort = function (sn) {
  var c = cache[sn]
  if (c && c.req) {
    c.req.abort()
  }
}

module.exports = ajax
