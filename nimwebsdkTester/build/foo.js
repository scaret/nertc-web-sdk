
var log = require('./log')

log('__dirname', __dirname)
log('process.cwd', process.cwd())

var env = process.env
Object.keys(env).sort().forEach(function (key) {
  var obj = {}
  obj[key] = env[key]
// log(obj)
})
log({'process.env.NODE_ENV': '' + process.env.NODE_ENV})

var path = require('path')

log({'path.join': path.join('a', 'b')})

log({'path.resolve': path.resolve('a', 'b')})
