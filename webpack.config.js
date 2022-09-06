const env = require('./build/env')
const git = require('./build/git')
const CopyPlugin = require('copy-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

if (env.isProduction() && git.hasChange()) {
  // throw new Error('please commit all changes')
}

const cwd = process.cwd()
// console.log(cwd)
const fse = require('fs-extra')
const merge = require('webpack-merge')
const path = require('path')
const pjson = require('./package.json')
const configs = require('./build/configs')
const webpack = require('webpack')
const WebpackOnBuildPlugin = require('./build/webpackOnBuildPlugin')
const HappyPack = require('happypack')
const os = require('os')
const HappyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length - 1 })

const version = pjson.private ? pjson.privateVersion : pjson.version
const webrtcG2Version = pjson.webrtcG2Version
const nodeEnv = env.getNodeEnv()
//const hashInfo = git.getFirstCommitHash()
const suffix = env.isProduction() ? '' : '_' + nodeEnv

const genFileName = (type = '', tagversion = '') => {
  if (type !== '') {
    type = '_' + type
  }
  if (tagversion == '') {
    tagversion = version
  }

  return env.isDevelopment()
    ? `NIM_Web_[name]${type}.js`
    : `NIM_Web_[name]${type}_v${tagversion}${suffix}.js`
}

const getWasmFileName = (type = '', tagversion = '') => {
  if (type !== '') {
    type = '_' + type
  }
  if (tagversion == '') {
    tagversion = version
  }

  return env.isDevelopment()
    ? `NIM_Web_[name]${type}.wasm`
    : `NIM_Web_[name]${type}_v${tagversion}${suffix}.wasm`
}

let config = require('./webpack.config.base')({})

config = merge(config, {
  entry: {},
  output: {
    path: path.join(cwd, './dist/lib/', version, nodeEnv),
    filename: genFileName(),
    library: '[name]',
    libraryTarget: 'umd',
    jsonpFunction: 'webpackJsonp_NIM_Web_v' + version.replace(/\./gi, '_') + suffix
  },
  module: {
    rules: [
      {
        test: /netcall-G2[\/\\]Config[\/\\]index\.ts$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: /\n.*WEBPACK_STRING_REPLACE_VERSION.*\n/,
              replace: `\nconst SDK_VERSION="${webrtcG2Version}";\n`
            },
            {
              search: /\n.*WEBPACK_STRING_REPLACE_BUILD.*\n/,
              replace: `\nconst BUILD="${git.describe()}";\n`
            },
            {
              search: /\n(.*)(development)(.*WEBPACK_STRING_REPLACE_ENV.*)\n/,
              replace: `\n$1${process.env.NODE_ENV}$3\n`
            }
          ]
        }
      },
      {
        test: /netcall-G2[\/\\]module[\/\\]blobs[\/\\]raw[\/\\].*\.js$/,
        use: 'raw-loader'
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new HappyPack({
      id: 'babel',
      threadPool: HappyThreadPool,
      loaders: [
        {
          loader: 'babel-loader?cacheDirectory=true'
        }
      ],
      // 允许 HappyPack 输出日志
      verbose: true
    })
  ],
  mode: env.isDevelopment() ? 'development' : 'production'
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
    NERTC: './src/entry/netcall-webrtc2',
    VirtualBackground: './src/entry/virtual-background',
    AdvancedBeauty: './src/entry/advanced-beauty'
  },
  output: {
    devtoolNamespace: 'nertc',
    path: path.join(cwd, './dist/lib/', webrtcG2Version, nodeEnv),
    filename: genFileName('', webrtcG2Version),
    library: '[name]',
    libraryTarget: 'umd',
    jsonpFunction: 'webpackJsonp_NIM_Web_v' + webrtcG2Version.replace(/\./gi, '_') + suffix
  },
  plugins: [
    new WebpackOnBuildPlugin(() => {
      const dir = './nimwebsdkTester/web/js/nim'
      fse.emptyDirSync(dir)
      fse.copySync(configWebrtcG2.output.path, dir)
    }),
    new webpack.BannerPlugin({
      banner: `NeRTC ${webrtcG2Version}|BUILD ${git.describe()} ${process.env.NODE_ENV}`
    }),
    new CopyPlugin([
      {
        from: './src/**/*.wasm',
        to:
          path.join(cwd, './dist/lib/', webrtcG2Version, nodeEnv, '/wasm/') +
          getWasmFileName('', webrtcG2Version)
      }
    ]),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'BundleReport.html',
      logLevel: 'info'
    })
  ],
  resolve: {
    alias: {
      polyfill: path.resolve(__dirname, './src/polyfill/browser.js'),
      dbjs: path.resolve(__dirname, './src/polyfill/libDb/browser.js'),
      platform: path.resolve(__dirname, './src/polyfill/general/platform.js')
    }
  }
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
