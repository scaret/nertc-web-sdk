var validTypes = ['IM', 'Chatroom', 'Netcall', 'WhiteBoard']
var argv = require('yargs').argv
var type = argv.type

if (type) {
  parseTagMap(type)
} else {
  validTypes.forEach(parseTagMap)
}

function parseTagMap (type) {
  if (validTypes.indexOf(type) === -1) { return }

  var tagMap = require('../src/im/protocol/map/tagMap' + type)
  var tagMapCopy = {} // 部分类似于 _avatar_safe 这样的参数是NOS文件安全连接使用的参数不回传给服务器
  var unserializeMap = {}
  for (var name in tagMap) {
    if (tagMap.hasOwnProperty(name)) {
      var tagMapObj = {}
      var obj = {}
      var map = tagMap[name]
      for (var p in map) {
        if (map.hasOwnProperty(p)) {
          if (p[0] != '_') {
            tagMapObj[p] = map[p]
          }
          obj[map[p]] = p
        }
      }
      tagMapCopy[name] = tagMapObj
      unserializeMap[name] = obj
    }
  }

  var writeJSON2Module = require('./writeJSON2Module.js')
  writeJSON2Module('./src/im/protocol/map/serializeMap' + type + '.js', tagMapCopy)
  writeJSON2Module('./src/im/protocol/map/unserializeMap' + type + '.js', unserializeMap)
}
