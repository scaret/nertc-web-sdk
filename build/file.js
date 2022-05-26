var archiver = require('archiver')
var fse = require('fs-extra')
var util = require('./util')
var log = util.log

var file = {}

file.parseFileName = function (filePath) {
  return filePath.slice(filePath.lastIndexOf('/') + 1)
}

file.emptyDir = function (dir) {
  return new Promise(function (resolve, reject) {
    log('empty ' + dir)
    fse.emptyDir(dir, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

file.copy = function (src, dest, options) {
  return new Promise(function (resolve, reject) {
    log('copy ' + src + ' -> ' + dest)
    fse.copy(src, dest, options, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

file.emptyAndCopy = function (src, dest, options) {
  return file.emptyDir(dest).then(function () {
    return file.copy(src, dest, options)
  })
}

file.emptyFile = function (path) {
  return file.outputFile(path, '')
}

file.outputFile = function (path, data) {
  return new Promise(function (resolve, reject) {
    fse.outputFile(path, data, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

file.readFile = function (path) {
  return new Promise(function (resolve, reject) {
    fse.readFile(path, 'utf-8', function (err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

file.appendFile = function (path, data) {
  return new Promise(function (resolve, reject) {
    fse.appendFile(path, data, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

file.zip = function (dest, options) {
  // console.log('dest option', dest, options)
  var zip = archiver('zip')
  var output = fse.createWriteStream(dest)
  output.on('close', function () {
    log(`zip to ${dest} done, ${zip.pointer()} bytes total`)
    options.done()
  })
  zip.on('error', options.onerror)
  zip.pipe(output)
  options.sources.forEach(function (source) {
    var type = source.type
    if (type === 'directory') {
      zip.directory(source.path, source.name)
    }
    if (type === 'file') {
      zip.append(fse.createReadStream(source.path), { name: source.name })
    }
  })
  zip.finalize()
}

module.exports = file
