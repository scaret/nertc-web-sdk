const env = require('../env')
const nodeEnv = env.getNodeEnv()
const pjson = require('../../package.json')
const path = require('path')
const file = require('../file.js')
const version = pjson.private ? pjson.privateVersion : pjson.version 

if (process.env.PLATFORM === 'g2') {
  const g2Version = pjson.webrtcG2Version
  var sdkG2ZipPath = './dist/NERTC_Web_SDK_V' + g2Version + '.zip'
  file.zip(sdkG2ZipPath, {
    sources: [
      {
        type: 'directory',
        path: path.join('./dist/lib/', g2Version, nodeEnv),
        name: 'js'
      },
      {
        type: 'directory',
        path: './dist/api',
        name: 'API指南'
      }
    ],
    done () {},
    onerror (err) {
      throw err
    }
  })
} else {
  var sdkZipPath = './dist/lib/NIM_Web_SDK_v' + version + '.zip'
  var sdkWechatZipPath = './dist/lib/NIM_Weixin_SDK_v' + version + '.zip'
  var sdkRNZipPath = './dist/lib/NIM_ReactNative_SDK_v' + version + '.zip'
  var sdkNodeZipPath = './dist/lib/NIM_NodeJS_SDK_v' + version + '.zip'

  file.zip(sdkZipPath, {
    sources: [
      {
        type: 'directory',
        path: path.join('./dist/lib/', version, nodeEnv),
        name: 'js'
      },
      {
        type: 'directory',
        path: './dist/api',
        name: 'API指南'
      },
      {
        type: 'directory',
        path: './dist/guide',
        name: '开发文档'
      },
      {
        type: 'directory',
        path: './build/plugin-im',
        name: '插件'
      }
    ],
    done () {},
    onerror (err) {
      throw err
    }
  })

  file.zip(sdkWechatZipPath, {
    sources: [
      {
        type: 'directory',
        path: path.join('./dist/lib/', version, `${nodeEnv}-weixin`),
        name: '小程序js'
      },
      {
        type: 'directory',
        path: './dist/api',
        name: 'API指南'
      },
      {
        type: 'directory',
        path: './dist/guide/IM即时通讯',
        name: '开发文档'
      }
    ],
    done () {},
    onerror (err) {
      throw err
    }
  })

  file.zip(sdkRNZipPath, {
    sources: [
      {
        type: 'directory',
        path: path.join('./dist/lib/', version, `${nodeEnv}-rn`),
        name: 'react-native-js'
      },
      {
        type: 'directory',
        path: './build/nimpush',
        name: 'nimpush'
      },
      {
        type: 'directory',
        path: './dist/guide/IM即时通讯',
        name: '开发文档'
      }
    ],
    done () {},
    onerror (err) {
      throw err
    }
  })

  file.zip(sdkNodeZipPath, {
    sources: [
      {
        type: 'directory',
        path: path.join('./dist/lib/', version, `${nodeEnv}-nodejs`),
        name: 'nodejs'
      },
      {
        type: 'directory',
        path: './dist/guide/IM即时通讯',
        name: '开发文档'
      }
    ],
    done () {},
    onerror (err) {
      throw err
    }
  })
}

