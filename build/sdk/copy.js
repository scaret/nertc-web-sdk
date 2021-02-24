const env = require('./build/env')
const fse = require('fs-extra')
const pjson = require('../../package.json')
const version = pjson.private ? pjson.privateVersion : pjson.version 

var sdkZipPath = './dist/lib/NIM_Web_SDK_v' + version + '.zip'
var sdkZipDestPath = '../nim_sdk/' + version + '/NIM_Web_SDK_v' + version + '.zip'

if (env.isProduction()) {
  console.log({
    action: 'copySdk',
    src: sdkZipPath,
    dest: sdkZipDestPath
  })
  fse.copy(sdkZipPath, sdkZipDestPath, {
    clobber: true
  }, err => {
    if (err) {
      throw err
    }
  })
}
