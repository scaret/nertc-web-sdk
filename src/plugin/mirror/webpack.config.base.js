const cwd = process.cwd()
const path = require('path')
const srcJSDir = path.join(cwd, 'src')
// 打印下日志
process.traceDeprecation = true

module.exports = function (options = {}) {
  const includeJSDirs = [srcJSDir, ...(options.includeJSDirs || [])]
  const excludeJSDirs = [...(options.excludeJSDirs || [])]

  // loaders
  const rules = [
    { test: /\.txt$/, use: 'raw-loader' },
    { test: /\.html$/, use: 'raw-loader' },
    // { test: /\.json$/, use: 'json-loader' },
    {
      test: /\.js$/,
      include: includeJSDirs,
      exclude: excludeJSDirs,
      use: [
        {
          loader: 'babel-loader'
        }
      ]
    }
  ]

  const config = {
    module: {
      rules
    },
    resolve: {
      alias: {},
      extensions: ['.js', '.json', '.yaml']
    },
    performance: {
      hints: false
    }
  }

  return config
}
