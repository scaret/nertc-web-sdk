
var env = require('./env')

var config = {
  input: 'src/postcss/**/*.css',
  dir: 'dist/css',
  'local-plugins': true,
  use: [
    'precss',
    'postcss-custom-properties',
    'postcss-calc',
    'autoprefixer',
    'cssnano'
  ],
  autoprefixer: {
    browsers: ['Android >= 4', 'iOS >= 7', 'Chrome >= 10', 'Firefox >= 10', 'IE >= 8']
  }
}

if (env.isProduction()) {
  config.map = false
} else {
  config.map = 'inline'
}

module.exports = config
