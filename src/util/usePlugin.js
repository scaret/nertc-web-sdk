const device = require('utiljs/device')

function usePlugin (config) {
  if (config.db) {
    device.db = config.db
  }
  if (config.rnfs) {
    device.rnfs = config.rnfs
    
    if (!device.rnfs.size) {
      device.rnfs.size = 1024 * 1024 // 默认1M 
    }
    // 初始化
    // 后续的操作都按顺序来，放在nimPromise后面
    device.rnfs.nimPromise = initRnfs()
  }

}
function getFilepath (i) {
  return device.rnfs.DocumentDirectoryPath + '/nimlog_' + i + '.log'
}
function initRnfs () {
  var fs = device.rnfs
  let size = fs.size / 2 - 256 // 日志分为2个文件，并留一定的余量
 
  var path = getFilepath(0)
  // 判断本次从哪个日志文件开始写
  return fs.exists(path).then(res => {
    if (res) {
      return fs.stat(path)
    } else {
      return Promise.reject(0)
    }
  }).then(res => {
    if (res && res.size > size) {
      return Promise.reject(1)
    } else {
      return Promise.reject(0)
    }
  }).catch(e => {
    if (typeof e === 'number') {
      fs.nimIndex = e
    } else {
      console.error('initRnfs::ERROR', e)
    }
    return Promise.resolve()
  })
}

module.exports = usePlugin
