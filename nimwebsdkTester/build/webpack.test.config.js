
var path = require('path')

module.exports = {
  entry: './test/unit/specs/index.js',
  output: {
    path: path.resolve(__dirname, '../test/unit'),
    filename: 'specs.js'
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, '../web/js/'),
      unit: path.resolve(__dirname, '../test/unit/specs'),
      node: path.resolve(__dirname, '../node_modules')
    }
  },
  module: {
    loaders: [
      { test: /\.html$/, loader: 'raw' },
      { test: /\.yaml$/, loader: 'json!yaml' },
      { test: /\.css$/, loader: 'style!css!postcss' },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015'],
          cacheDirectory: true,
          plugins: [
            'transform-es3-property-literals',
            'transform-es3-member-expression-literals',
            'add-module-exports',
            ['transform-es2015-modules-commonjs', {
              loose: true
            }]
          ]
        }
      }
    ]
  },
  babel: {
    loose: 'all',
    optional: ['runtime']
  },
  devServer: {
    contentBase: './test/unit',
    noInfo: true
  },
  devtool: 'source-map'
}
