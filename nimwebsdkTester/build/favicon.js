
var favicons = require('favicons')
var path = require('path')
favicons({
  source: path.resolve('../res/img/logo.png'),
  dest: path.resolve('../dist/')
})
