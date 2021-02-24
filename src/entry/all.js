require('polyfill')
const sdk = {
  NIM: require('./nim'),
  Chatroom: require('./chatroom')
}

const mixin = require('./mixin')
mixin(sdk)

module.exports = sdk
