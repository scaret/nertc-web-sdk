
var env = {}

env.isProduction = function () {
  return process.env.NODE_ENV === 'production'
}

module.exports = env
