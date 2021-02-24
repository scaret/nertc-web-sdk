var util = require('../util')
var ajax = require('./ajax')

var json = (function () {
  var regJson = /json/i
  var regPost = /post/i
  return function (url, options) {
    options = options || {}
    var data = options.data = options.data || {}
    // parse headers
    var headers = options.headers = options.headers || {}
    var accept = util.checkWithDefault(headers, 'Accept', 'application/json')
    var contentType = util.checkWithDefault(headers, 'Content-Type', 'application/json')
    // response data format
    if (regJson.test(accept)) {
      options.type = 'json'
    }
    // post data
    if (regPost.test(options.method) && regJson.test(contentType)) {
      options.data = JSON.stringify(data)
    }
    return ajax(url, options)
  }
}())

module.exports = json
