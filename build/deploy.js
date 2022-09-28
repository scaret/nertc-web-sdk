/**
 * 部署到测试服务器的代码: 现在是本地copy到本地
 */

const fs = require('fs-extra')

const path = require('path')
const pjson = require('../package.json')
const git = require('./git')

const version = pjson.private ? pjson.privateVersion : pjson.version
const branchName = git.currentBranch();
let webrtcG2Branch = branchName.split('/').join('-');
if (webrtcG2Branch.indexOf('stab-') === 0) {
  webrtcG2Branch = webrtcG2Branch.slice(5)
}
const webrtcG2Version = pjson.webrtcG2Version
const nodeEnv = process.env.NODE_ENV || 'test'
const WEB_NRTC_DIR = process.env.WEB_NRTC_DIR || path.join(__dirname, '../../web-nrtc')
const map = {
  production: 'prod',
  test: 'dev'
}

console.log('deploy PLATFORM:', process.env.PLATFORM, 'webrtcG2Version:', webrtcG2Version)
if (process.env.PLATFORM === 'g2') {
  const env = map[nodeEnv] || nodeEnv
  console.log('webrtcG2Version:', webrtcG2Version, 'nodeEnv:', nodeEnv)
  var srcFolder3 = path.join(
    __dirname,
    `../dist/nimwebsdkTester/nimwebsdkTester_${webrtcG2Version}_${nodeEnv}/web/`
  )
  var destFolder3 = path.join(WEB_NRTC_DIR, `/websdk/G2 ${env}/${webrtcG2Version === '0.0.1' ? 'multi' : webrtcG2Version}/${webrtcG2Branch}/`)
  fs.emptyDirSync(destFolder3)
  copy(srcFolder3, destFolder3, ['webrtc2.html', 'css', 'js', 'img'], 'rtc2Rtmp.html', 'whiteboard.js')
} else {
  const env = map[nodeEnv] || nodeEnv
  console.log('version:', version, 'nodeEnv:', nodeEnv)

  var srcFolder = path.join(
    __dirname,
    `../dist/nimwebsdkTester/nimwebsdkTester_${version}_${nodeEnv}/web/`
  )
  var destFolder = path.join(WEB_NRTC_DIR, `/websdk/${env}/${version === '0.0.1' ? 'multi' : version}/`)
  fs.emptyDirSync(destFolder)
  copy(srcFolder, destFolder)

  const NO_PACK_WEAPP =  process.env.NO_PACK_WEAPP;
  if (env === 'prod' && !NO_PACK_WEAPP) {
    var srcFolder2 = path.join(
      __dirname,
      `../tester-weixin-app-netcall`
    )
    var destFolder2 = path.join(__dirname, `../../weapp-rtc/testPage/prod/v${version}/`)
    fs.emptyDirSync(destFolder2)
    copy(srcFolder2, destFolder2)
  }
}


function copy (srcFolder, destFolder, allowPath, excludePath) {
  console.log('\nsrcFolder:', srcFolder)
  console.log('destFolder:', destFolder)

  const obj = {
    dereference: true
  }
  if (excludePath) {
    console.warn('copy excludePath: ', excludePath)
    obj.filter = file => file !== excludePath
  }

  if (allowPath) {
    /*allowPath.forEach(item => {
      console.warn('copy item: ', item)
      obj.filter = file => file == 'webrtc2.html'
      obj.filter = file => /webrtc2/i.test(file)
    })*/


    obj.filter = (src, dest) =>{
      // console.log('src: ', src)
      // console.log('dest: ', dest)
      let stat = fs.lstatSync(src)
      let isDirectory = stat.isDirectory()
      if (isDirectory) {
        if (/css$/i.test(src) || /js/.test(src) || /web$/.test(src) || /auido$/.test(src) || /img/.test(src) || /wasm/.test(src)) {
          return true;
        } else {
          return false;
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
        if (/webrtc2/i.test(src) || /rtc2Rtmp/i.test(src) || /css/i.test(src) || /\.js/i.test(src) || /web$/.test(src) || /img/.test(src) || /mp3|aac|flac/.test(src) || /\.wasm/i.test(src)) {
          return true;
        } else {
          return false
        }
      }
    }
  }

  fs.copy(srcFolder, destFolder, obj, err=>{
    if(err) return  console.error('err', err);
    console.log("拷贝文件成功！")
  })
}
