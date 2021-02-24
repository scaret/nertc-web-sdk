const path = require('path')
const fs = require('fs')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const h5Src = '/Users/mayingying/netease_repo/nim-web-demo-h5/'
const pcSrc = '/Users/mayingying/netease_repo/nim-web-demo-pc/'
const sdkSrc = '/Users/mayingying/netease_repo/nim-web-sdk/'

const env = 'test'
const version = '6.9.0'

const sdkFolder = path.resolve(sdkSrc, 'dist/lib', version, env === 'prod' ? 'production' : env)
const webSdkFileName = 'NIM_Web_SDK_v' + version + (env === 'prod' ? '' : '_' + env ) + '.js'
const NIM_WEB_SDK = path.resolve(sdkFolder, webSdkFileName)

async function doExec (commands) {
  for (let i = 0; i < commands.length; i++) {
    var item = commands[i]
    console.log(`start running command ${i + 1} : ${item.command}, and cwd is ${item.cwd}`)
    let { stderr, stdout } = await exec(item.command, item.cwd ? { cwd: item.cwd } : {})
    console.log(`command ${i + 1} done!`)
    console.log(`stdout is ${stdout}`)
    if (stderr) {
      console.error('stderr' + stderr)
    }
  }
}

var h5configFile = fs.readFileSync(path.resolve(h5Src, 'src/configs/index.js'), 'utf8')
h5configFile = h5configFile.replace(/NIM_Web_SDK.*\.js/, webSdkFileName)
fs.writeFileSync(path.resolve(h5Src, 'src/configs/index.js'), h5configFile, 'utf8')
console.log('replace done')

doExec([
  {
    command: `npm run pack:${env}`,
    cwd: sdkSrc
  }, {
    command: `cp ${NIM_WEB_SDK} ${path.resolve(h5Src, 'src/sdk/')}`
  }, {
    command: 'npm run buildend',
    cwd: h5Src
  }, {
    command: `cp -R ${path.resolve(h5Src, 'dist/js')} ${path.resolve(pcSrc, 'webdemo/h5/dist')} `
  }, {
    command: `cp -R ${sdkFolder}/ ${path.resolve(pcSrc, 'webdemo/3rd')}`
  }
])

