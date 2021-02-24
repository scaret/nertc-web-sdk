const paths = [
  'src/protocol/map/tagMapBase.js',
  'src/protocol/map/tagMapIM.js',
  'src/protocol/map/tagMapChatroom.js',
  'src/protocol/map/tagMapNetcall.js',
  'src/protocol/map/tagMapWhiteBoard.js'
]

module.exports = function (path) {
  return paths.indexOf(path) !== -1
}
