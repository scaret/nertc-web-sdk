/* eslint-disable camelcase */
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const child_process = require('child_process')
const projPath = path.resolve(__dirname, '../../')
const mdPath = path.join(projPath, 'dist/guide')
const mdSrcPath = path.join(projPath, 'doc/md')

Promise.resolve().then(() => {
  return new Promise((resolve, reject) => {
    const gitCommand = 'git subtree pull --prefix doc/md ssh://git@g.hz.netease.com:22222/yunxin-doc/web-sdk.git master --squash'
    child_process.exec(
      gitCommand,
      {cwd: projPath},
      err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })
}).then(() => {
  fse.removeSync(mdPath)
  fse.copySync(mdSrcPath, mdPath)
  fse.removeSync(path.join(mdPath, 'relations.cfg'))
}).then(() => {
  console.log('SUCCEED SYNC DOCS')
}).catch(err => {
  console.error('ERROR!!!!!! ')
  return Promise.reject(err)
})
