const ajax = require('./ajax')
const json = require('./json')
const upload = require('./upload')
const chunkUpload = require('./chunkUpload')


ajax.json = json
ajax.upload = upload
ajax.chunkUpload = chunkUpload

module.exports = ajax
