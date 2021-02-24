
var assign = require('object-assign')
var base = require('./karma.base.config')

module.exports = function (config) {
  config.set(assign(base, {
    browsers: ['Chrome'],
    reporters: ['progress']
  }))
}
