/**
 * 部署到测试服务器的代码: 现在是本地copy到本地
 */

const fs = require('fs-extra')

const path = require('path')
const pjson = require('../package.json')
const git = require('./git')
const file = require('./file')

const version = pjson.private ? pjson.privateVersion : pjson.version
const commitId = git.currentCommit()
const webrtcG2Version = pjson.webrtcG2Version
const buildId = git.describe()
const nodeEnv = process.env.NODE_ENV || 'test'
const TARGET_DIR = process.env.TARGET_DIR || path.join(__dirname, '../../web-nrtc')
const map = {
  production: 'prod',
  test: 'dev'
}
console.log(
  'deploy by Build ID PLATFORM:',
  process.env.PLATFORM,
  'webrtcG2Version:',
  webrtcG2Version,
  'commitId',
  commitId,
  'buildId',
  buildId
)
const env = map[nodeEnv] || nodeEnv
console.log('webrtcG2Version:', webrtcG2Version, 'nodeEnv:', nodeEnv)
var srcFolder3 = path.join(
  __dirname,
  `../dist/nimwebsdkTester/nimwebsdkTester_${webrtcG2Version}_${nodeEnv}/web/`
)
var destFolder3 = path.join(TARGET_DIR, `${buildId}`)
fs.emptyDirSync(destFolder3)
copy(srcFolder3, destFolder3, ['webrtc2.html', 'css', 'js', 'img'], 'rtc2Rtmp.html')

var srcFolderApidoc = path.join(__dirname, `../dist/api/`)
var destFolderApidoc = path.join(TARGET_DIR, `${buildId}`, 'api')
fs.emptyDirSync(destFolderApidoc)
copy(srcFolderApidoc, destFolderApidoc)

var srcFolderApidocEn = path.join(__dirname, `../dist/api_en/`)
var destFolderApidocEn = path.join(TARGET_DIR, `${buildId}`, 'api_en')
fs.emptyDirSync(destFolderApidocEn)
copy(srcFolderApidocEn, destFolderApidocEn)

// 搬运Electron的app文件夹
var srcFolderElectronApp = path.join(
  __dirname,
  `../build/electron/Electron.app/Contents/Resources/app`
)
var srcFolderElectronSrc = srcFolder3
var destFilenameZip = path.join(TARGET_DIR, `${buildId}`, 'electronApp.zip')

const zipSources = []
const fileNames = fs.readdirSync(srcFolderElectronApp)
fileNames.forEach((name) => {
  zipSources.push({
    type: 'file',
    path: path.join(srcFolderElectronApp, name),
    name: name
  })
})
zipSources.push({
  type: 'directory',
  path: srcFolderElectronSrc,
  name: 'nim'
})

file.zip(destFilenameZip, {
  sources: zipSources,
  done() {
    console.log('zip electron app folder done')
  },
  onerror(err) {
    throw err
  }
})

function copy(srcFolder, destFolder, allowPath, excludePath) {
  console.log('\nsrcFolder:', srcFolder)
  console.log('destFolder:', destFolder)

  const obj = {
    dereference: true
  }
  if (excludePath) {
    console.warn('copy excludePath: ', excludePath)
    obj.filter = (file) => file !== excludePath
  }

  if (allowPath) {
    /*allowPath.forEach(item => {
      console.warn('copy item: ', item)
      obj.filter = file => file == 'webrtc2.html'
      obj.filter = file => /webrtc2/i.test(file)
    })*/

    obj.filter = (src, dest) => {
      /*console.log('src: ', src)
      console.log('dest: ', dest)*/
      let stat = fs.lstatSync(src)
      let isDirectory = stat.isDirectory()
      if (isDirectory) {
        if (
          /css$/i.test(src) ||
          /js/.test(src) ||
          /web$/.test(src) ||
          /auido$/.test(src) ||
          /img/.test(src) ||
          /wasm/.test(src)
        ) {
          return true
        } else {
          return false
        }
        /*var files = fs.readdirSync(src);
        files.forEach(item => {
          if (/\.html$/i.test(item) || /whiteboard\.js$/.test(item)) {
            return true;
          } else {
            return true;
          }
        })*/
      } else {
        if (
          /webrtc2/i.test(src) ||
          /rtc2Rtmp/i.test(src) ||
          /css/i.test(src) ||
          /\.js/i.test(src) ||
          /web$/.test(src) ||
          /img/.test(src) ||
          /mp3|aac|flac/.test(src) ||
          /\.wasm/i.test(src)
        ) {
          return true
        } else {
          return false
        }
      }
    }
  }

  fs.copy(srcFolder, destFolder, obj, (err) => {
    if (err) return console.error('err', err)
    console.log('拷贝文件成功！')
  })
}
