const CONFIG = require('utiljs/config')

const Instance = {
  genUrlSep (url) {
    url = '' + url
    var sep = url.indexOf('?') === -1 ? '?imageView&' : '&'
    return sep
  },
  urlQuery2Object (url) {
    if (Object.prototype.toString.call(url) !== '[object String]' || url === '') {
      return {}
    }
    var queryStart = url.indexOf('?')
    if (queryStart === -1) {
      return
    }
    var queryStr = url.slice(queryStart + 1)
    var queryArr = queryStr.split('&')
    var resObj = {}
    queryArr.forEach(item => {
      if (~item.indexOf('=')) {
        let temp = item.split('=')
        resObj[temp[0]] = decodeURIComponent(temp[1])
      } else {
        resObj[item] = ''
      }
    })
    return resObj
  },
  url2object (url) {
    if (Object.prototype.toString.call(url) !== '[object String]') {
      url = ''
    }
    url = url || ''
    let protocol = url.indexOf('https') >= 0 ? 'https://' : 'http://'
    let hostname = url.replace(protocol, '')
    if (hostname.indexOf('?') >= 0) {
      hostname = hostname.substring(0, hostname.indexOf('?'))
    }
    let hostItems = hostname.split('/')
    hostname = hostItems[0]
    let path = ''
    if (hostItems.length > 0) {
      path = hostItems.slice(1).join('/')
    }
    if (url.indexOf('?') === -1) {
      return {
        protocol,
        hostname,
        path,
        query: {}
      }
    } else {
      let query = url.substr(url.indexOf('?') + 1)
      let queryItems = query.split('&')
      let result = {}
      queryItems.forEach(item => {
        if (item.indexOf('=') > 0) {
          let temp = item.split('=')
          result[temp[0]] = decodeURIComponent(temp[1])
        } else {
          result[item] = ''
        }
      })
      return {
        protocol,
        hostname,
        path,
        query: result
      }
    }
  },
  object2url (obj) {
    let { protocol, hostname, path, query } = obj
    protocol = protocol || 'http://'
    hostname = hostname || ''
    if (path) {
      hostname = `${hostname}/${path}`
    }
    query = query || {}
    let queryItems = []
    for (let key in query) {
      if (key === 'imageView') {
        continue
      } else {
        queryItems.push(`${key}=${encodeURIComponent(query[key])}`)
      }
    }
    if (queryItems.length > 0) {
      return `${protocol}${hostname}?imageView&${queryItems.join('&')}`
    } else {
      return `${protocol}${hostname}`
    }
  },
  // http://doc.hz.netease.com/pages/viewpage.action?pageId=95782286
  // nos地址替换兼容
  genPrivateUrl (url) {
    const urlObj = Instance.url2object(url)
    const host = urlObj.hostname
    const path = urlObj.path
    const downloadHost = CONFIG.downloadHost
    const downloadUrl = CONFIG.downloadUrl
    if (host === downloadHost) {
      // 收到nos.netease.com/{bucket}/{obj}
      let index = path.indexOf('/')
      if (index !== -1) {
        let nosBucket = path.substring(0, index)
        let nosObj = path.substring(index + 1)
        return downloadUrl
          .replace('{bucket}', nosBucket)
          .replace('{object}', nosObj)
      }
    } else if (host && Object.prototype.toString.call(host) == '[object String]' && ~host.indexOf(downloadHost)) {
      // 收到{bucket}.nos.netease.com/{obj}
      let path = urlObj.path
      let index = path.indexOf('.')
      if (index !== -1) {
        let nosBucket = path.substring(0, index)
        let nosObj = path
        return downloadUrl
          .replace('{bucket}', nosBucket)
          .replace('{object}', nosObj)
      }
    }
    return url
  }
}

module.exports = Instance
