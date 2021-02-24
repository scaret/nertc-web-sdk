const Config = require('utiljs/config');
var chunkSize = Config.chunkSize
var util = require('utiljs')
var ajax = require('./ajax')
// https://www.163yun.com/help/documents/66981681442246656  NOS 直传服务文档，由于微信小程序限制不能用直传
// 对于https的请求，获取最佳上传节点的方式不是通过LBS，而是使用DNS解析，直传域名是 https://wanproxy-web.127.net
// 直传域名通过智能DNS方式，将每个区域解析到最佳的上传节点。区域和最佳上传节点的对应关系 基本与LBS方式一致，每周更新一次
// 这里索性直接用这个直传域名进行 http/https的上传
var chunkUpload = function (options, fileName, lastLayerContext) {  // self.sn 用于终止上传
  var fileObj = {
    file: options.data[fileName],
    fileSize: options.data[fileName].size,
    fileUoloadedSize: 0,
    percentage: 0
  }
  function sliceupload(url, resObj, uploadOptions, fileName, fileObj) {
    var trunkStart = resObj.offset
    var trunkEnd = resObj.offset + chunkSize
    uploadOptions.data = fileObj.file.slice(trunkStart, trunkEnd)
    uploadOptions.query.offset = resObj.offset // 断点续传偏移量
    uploadOptions.query.complete = trunkEnd >= fileObj.fileSize // 是否是最后一片
    uploadOptions.query.context = resObj.context // 上下文
    uploadOptions.onuploading = onuploading
    uploadOptions.onload = onload
    uploadOptions.onerror = onerror
    return ajax(url, uploadOptions)
  }
  function onuploading (event) {
    var loaded = fileObj.fileUoloadedSize + event.loaded
    var percentage = Math.floor(loaded * 10000 / fileObj.fileSize) / 100.0
    if (parseInt(percentage) >= 100) {
      percentage = 100
      onuploading = function () {}
    }
    if (fileObj.percentage === percentage) { // 已通知过
      return
    }
    fileObj.percentage = percentage
    var obj = {
      docId: options.docId,
      total: fileObj.fileSize,
      loaded: loaded,
      percentage: percentage,
      percentageText: percentage + '%'
    }
    if (options.fileInput) {
      obj.fileInput = options.fileInput
    }
    if (options.blob) {
      obj.blob = options.blob
    }
    options.uploadprogress(obj)
  }
  function onload (obj) {
    try {
      obj = JSON.parse(obj)
    } catch (e) {
      lastLayerContext.onError(e)
      return
    }
    if (obj.errMsg || obj.errCode) {
      lastLayerContext.onError(obj)
      return
    }
    if (obj.offset < fileObj.fileSize) {
      delete uploadOptions.onaftersend
      fileObj.fileUoloadedSize = obj.offset
      lastLayerContext.sn = sliceupload(options.url, obj, uploadOptions, fileName, fileObj)
    } else {
      function getFileInfoError(err) {
        lastLayerContext.onError(err)
      }
      var fileUrl = Config.genFileUrl(options.nosToken)
      if (options.type === 'image') {
        ajax(fileUrl + '?imageInfo', {
          onload: function (body) {
            try {
              body = JSON.parse(body)
              options.uploaddone(null, {
                docId: obj.docId,
                w: body.Width,
                h: body.Height,
                orientation: body.Orientation || '',
                type: body.Type,
                size: body.Size || fileObj.fileSize
              })
            } catch (e) {
              getFileInfoError(e)
            }
          },
          onerror: getFileInfoError
        })
      } else if (options.type === 'video' || options.type === 'audio') {
        ajax(fileUrl + '?vinfo', {
          onload: function (body) {
            try {
              body = JSON.parse(body)
              if (body.GetVideoInfo && body.GetVideoInfo.VideoInfo) {
                body = body.GetVideoInfo.VideoInfo
              }
              options.uploaddone(null, {
                docId: obj.docId,
                w: body.Width,
                h: body.Height,
                dur: body.Duration,
                orientation: body.Rotate,
                audioCodec: body.AudioCodec,
                videoCodec: body.VideoCodec,
                container: body.Container,
                size: body.Size || fileObj.fileSize
              })
            } catch (e) {
              getFileInfoError(e)
            }
          },
          onerror: getFileInfoError
        })
      } else {
        options.uploaddone(null, {
          docId: obj.docId,
          size: fileObj.fileSize
        })
      }
    }
  }
  function onerror (obj) {
    try {
      if (obj.result) {
        var result = JSON.parse(obj.result)
      } else {
        result = obj
      }
      lastLayerContext.onError(result)
    } catch (error) {
      lastLayerContext.onError(error)
    }
  }
  var uploadOptions = {
    query: {
      offset: 0, // 断点续传偏移量
      complete: chunkSize >= fileObj.fileSize, // 是否是最后一片
      version: '1.0' // 版本
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-nos-token': options.nosToken.token,
    },
    method: 'POST',
    timeout: 0,
    onaftersend: function () {
      options.beginupload(lastLayerContext)
    },
    onuploading,
    onload,
    onerror
  }
  uploadOptions.data = fileObj.file.slice(0, chunkSize)
  return ajax(options.url, uploadOptions)
}

module.exports = chunkUpload
