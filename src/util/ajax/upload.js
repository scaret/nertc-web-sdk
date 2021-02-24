var ajax = require('./ajax')

var upload = function (url, options) {
  options.method = 'POST'
  options.headers = options.headers || {}
  options.headers['Content-Type'] = 'multipart/form-data'
  options.timeout = 0
  options.type = options.type || 'json'
  return ajax(url, options)
}

module.exports = upload
