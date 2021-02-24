const Config = require('utiljs/config');
var util = require('utiljs')
var NIMError = require('im/model/nimerror')
var upload = require('utiljs/ajax').upload
var chunkUpload = require('utiljs/ajax').chunkUpload
var abort = require('utiljs/ajax').abort
// 是否支持FormData
var supportFormData = util.supportFormData
// var supportFormData = false; // test code for mock IE 8/9

/**
 * 文件上传控件, 使用FormData或者Iframe上传文件
 *
 * @param {options} options 配置参数
 * @param {String}          options.url             服务器url
 * @param {String|Node}     options.fileInput       文件选择input的id或者节点对象
 * @param {String}          options.type            文件类型过滤
 * @param {Object}          options.params          其它参数
 * @param {Function}        options.beginupload     开始上传图片的回调, 如果开发者传入 fileInput, 在此回调之前不能修改 fileInput, 否则上传的文件会错乱
 * @param {Function}        options.uploadprogress  上传进度, ie9以下不支持上传进度
 * @param {Function}        options.uploaddone      上传完成, 成功或者失败
 * @param {Object}        headers                 请求头
 */
function Upload (options) {
  var self = this
  self.options = util.copy(options)
  util.verifyOptions(options, 'url fileName')
  util.verifyParamPresentJustOne(options, 'blob fileInput')
  util.verifyCallback(options, 'beginupload uploadprogress uploaddone')
  if (options.fileInput) {
    options.fileInput = util.verifyFileInput(options.fileInput)
  }
  if (options.type) {
    util.verifyFileType(options.type)
  }
  if (options.timeout) {
    util.verifyParamType('timeout', options.timeout, 'number')
  } else {
    // 0 means no timeout
    options.timeout = 1000 * 60 * 10
  }
  util.verifyFileUploadCallback(options)

  options.data = {}

  // 添加其它参数
  if (options.params) {
    util.merge(options.data, options.params)
  }

  // 名字
  var fileName = options.fileName
  var fileInput = options.fileInput
  if (supportFormData) {
    // 如果是fileInput
    if (fileInput) {
      // 过滤
      var fileList = options.type ? util.filterFiles(fileInput.files, options.type) : [].slice.call(fileInput.files, 0)
      if (!fileList || !fileList.length) {
        options.uploaddone(NIMError.newWrongFileTypeError('未读取到' + options.type + '类型的文件, 请确保文件选择节点的文件不为空, 并且请确保选择了' + options.type + '类型的文件'))
        return
      }
      options.data[fileName] = fileList[0]
      var fileSize = fileInput.files[0].size
    } else if (options.blob) {
      options.data[fileName] = options.blob
      // 过滤
      if (options.type !== 'file' && options.blob.type && options.blob.type.indexOf(options.type) === -1) {
        options.uploaddone(NIMError.newWrongFileTypeError('未读取到' + options.type + '类型的文件, 请确保选择了' + options.type + '类型的文件'))
        return
      }
      var fileSize = options.blob.size
    }
    // 验证大小
    if (options.maxSize && fileSize > options.maxSize) {
      options.uploaddone(NIMError.newFileTooLargeError(`上传文件大小超过${options.maxSize}限制`))
      return
    }
    if (!options.commonUpload) {
      if (fileSize > Config.chunkMaxSize) { // 10000个100
        options.uploaddone(NIMError.newFileTooLargeError(`直传文件大小超过${Config.chunkMaxSize}限制`))
        return
      }
      self.sn = chunkUpload(options, fileName, self)
      return
    }
    if (fileSize > Config.commonMaxSize) {
      options.uploaddone(NIMError.newFileTooLargeError(`普通上传文件大小超过${Config.commonMaxSize}限制`))
      return
    }
  } else {
    util.dataset(fileInput, 'name', fileName)
    options.data.input = fileInput
  }

  var uploadOptions = {
    data: options.data,
    onaftersend: function () {
      options.beginupload(self)
    },
    onuploading: function (event) {
      var percentage = Math.floor(event.loaded * 10000 / event.total) / 100.0
      var obj = {
        docId: options.docId,
        total: event.total,
        loaded: event.loaded,
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
    },
    onload: function (obj) {
      // IE 8/9 报错走这里, see onerror
      obj.docId = options.docId
      if (obj.Error) {
        self.onError(obj)
      } else {
        options.uploaddone(null, obj)
      }
    },
    onerror: function (obj) {
      // 高级浏览器报错走这里, see onload
      try {
        // 能解析 obj.result 的时候, 它包含 nos 错误的详情, 其它情况 see catch
        if (obj.result) {
          var result = JSON.parse(obj.result)
        } else {
          result = obj
        }
        self.onError(result)
      } catch (error) {
        console.log('error: ignore error if could not parse obj.result', error)
        options.uploaddone(new NIMError(obj.message, obj.code), self.options)
      }
    }
  }

  // 其实并不需要指定 mode, 会自动识别, 这里是为了在 chrome 上测试 mode 才加了这段代码
  if (!supportFormData) {
    uploadOptions.mode = 'iframe'
  }

  uploadOptions.putFileAtEnd = true

  self.sn = upload(options.url, uploadOptions)
}

Upload.prototype.onError = function (obj) {
  var self = this
  var options = self.options
  var error, reason, message
  obj = obj || {}
  error = obj.Error || obj || {}
  reason = error.Code || error.code || 'unknown'
  message = error.Message || error.message || '未知错误'
  options.uploaddone(new NIMError(reason + '(' + message + ')', reason))
}

Upload.prototype.abort = function () {
  abort(this.sn)
}

module.exports = Upload
