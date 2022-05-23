const env = require('../../../build/env')
const git = require('../../../build/git')

if (env.isProduction() && git.hasChange()) {
  // throw new Error('please commit all changes')
}

// console.log(cwd)
const fse = require('fs-extra')
const merge = require('webpack-merge')
const path = require('path')
const configs = require('../../../build/configs')
const webpack = require('webpack')
const WebpackOnBuildPlugin = require('../../../build/webpackOnBuildPlugin')
const HappyPack = require('happypack')
const os = require('os')
const HappyThreadPool = HappyPack.ThreadPool({size: os.cpus().length - 1})

const version = require('./package.json').version
const webrtcG2Version = require('../../../package.json').webrtcG2Version
const nodeEnv = env.getNodeEnv()
//const hashInfo = git.getFirstCommitHash()
const suffix = env.isProduction() ? '' : '_' + nodeEnv


const genFileName = (type = '', tagversion = '') => {
  return 'MirrorPlugin.js'
}

let config = require('./webpack.config.base')({})

config = merge(config, {
  entry: {
  },
  output: {
    path: path.join(__dirname, '../../../dist/lib/', version, nodeEnv),
    filename: genFileName(),
    library: '[name]',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  plugins: [
    new HappyPack({
      id: 'babel',
      threadPool: HappyThreadPool,
      loaders: [{
        loader: 'babel-loader?cacheDirectory=true'
      }],
      // 允许 HappyPack 输出日志
      verbose: true
    })
  ],
  mode: (env.isDevelopment()) ? 'development' : 'production'
})

if (env.isDevelopment()) {
  // sourceMap 相关
  config.output.pathinfo = true
  if (!process.env.NO_SOURCE_MAP) {
    // config.devtool = '#eval-source-map'
    // config.devtool = 'inline-module-source-map'
    config.devtool = 'eval'
  }
  config.devtool = 'inline-module-source-map'
} else if (env.isTest()) {
  // sourceMap 相关
  config.output.pathinfo = true
  if (!process.env.NO_SOURCE_MAP) {
    // config.devtool = '#eval-source-map'
    // config.devtool = 'inline-module-source-map'
    config.devtool = 'eval'
  }
  config.devtool = 'source-map'
}

// 设置webrtcG2相关的配置
let configWebrtcG2 = merge(config, {
  entry: {
    MirrorPlugin: path.join(__dirname, './MirrorPlugin.ts'),
  },
  output: {
    devtoolNamespace: 'MirrorPlugin',
    path: path.join(__dirname, '../../../dist/lib/', webrtcG2Version, nodeEnv),
    filename: genFileName('', webrtcG2Version),
    libraryTarget: 'umd',
  },
  plugins: [
    new WebpackOnBuildPlugin(() => {
      const dir = path.join(__dirname, '../../../nimwebsdkTester/web/js/nim')
      fse.emptyDirSync(dir)
      fse.copySync(configWebrtcG2.output.path, dir)
    }),
    new webpack.BannerPlugin({
      banner: `NeRTC MirrorPlugin ${webrtcG2Version}|BUILD ${git.describe()} ${process.env.NODE_ENV}`
    }),
  ],
})

let out
console.warn('webpack PLATFORM: ', process.env.PLATFORM)
switch (process.env.PLATFORM) {
  case 'all':
    out = configWebrtcG2
    break
  default:
    out = configWebrtcG2
    break
}

module.exports = out
