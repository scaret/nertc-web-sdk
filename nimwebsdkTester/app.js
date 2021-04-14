
var express = require('express')
var bodyParser = require('body-parser')  
var https = require('https')
var http = require('http')
var fs = require('fs')
var prettyjson = require('prettyjson')
// var multer = require('multer')
var naturalSort = require('javascript-natural-sort')
naturalSort.insensitive = true

var app = express()
app.use(bodyParser.json())
app.use(express.static('./'))
app.use(express.static('web'))
app.use(express.static('node_modules'))

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, AppKey, Nonce, CurTime, CheckSum')
  // res.header('Access-Control-Max-Age', 604800)
  res.header('Access-Control-Allow-Credentials', true)
  next()
})

app.post('/getlogger', function (req, res) {
  req.setEncoding('utf8');
  req.rawBody = '';
  req.on('data', function (chunk) {
    req.rawBody += chunk;
  });
  req.on('end', function () {
    let body = req.rawBody
    fs.appendFile('sdklog.log', body, function () {
      res.end()
    })
  });
})

app.post('/postlogger', function (req, res) {
  const body = req.body
  body.timestamp = +new Date()
  fs.appendFile('nrtc.log', JSON.stringify(body) + '\n', function () {
    res.end()
  })
})

app.get('/hello', function (req, res) {
  console.log('Hello World!')
  res.send('Hello World!')
})

app.get('timeout', function (req, res) {
  console.log('timeout')
})

var options = {
  key: fs.readFileSync('ssh/key.pem'),
  cert: fs.readFileSync('ssh/cert.pem')
}

var httpServer = http.createServer(app)
httpServer.listen(2000, function () {
  logAddress(httpServer, 'http')
})
var httpsServer = https.createServer(options, app)
httpsServer.listen(3002, function () {
  logAddress(httpsServer, 'https')
})

function logAddress (server, type) {
  var address = server.address()
  address = type + '://localhost:' + address.port
  console.log(address)
  log('mock chatroom: ')
  console.log(address + '?debug=true&tab=connect&chatroomId=64&account=cs1')
  // log('mock flash: ')
  // console.log(address + '?flash=true')
  log('mock xhr-polling: ')
  console.log(address + '?xhr=ture')
  log()
}

function log (obj) {
  if (typeof obj === 'string') {
    if (obj.length > 100) {
      return
    }
    obj = [obj]
  }
  if (obj) {
    console.log(prettyjson.render(obj))
  }
}
