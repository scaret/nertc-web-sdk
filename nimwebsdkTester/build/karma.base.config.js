
var webpackConfig = require('./webpack.test.config')
delete webpackConfig.entry
webpackConfig.devtool = 'inline-source-map'

// shared config for all unit test
module.exports = {
  files: [
    '../test/unit/specs/index.js'
  ],
  frameworks: ['jasmine'],
  preprocessors: {
    '../test/unit/specs/index.js': ['webpack', 'sourcemap']
  },
  webpack: webpackConfig,
  webpackMiddleware: {
    noInfo: true
  },
  singleRun: false
}
