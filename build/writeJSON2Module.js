var fs = require('fs')

module.exports = function (fileName, data) {
  var fileWriteStream = fs.createWriteStream(fileName)
  fileWriteStream.write('module.exports = ')
  fileWriteStream.write(JSON.stringify(data, null, 2))
  fileWriteStream.write(';')
  fileWriteStream.end()
}
