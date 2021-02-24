var util = require('utiljs')

var responseBodyMap = {
  file: {
    // url: '',                 // url 根据Bucket和ObjectName拼装
    // ext: '',                 // 文件后缀, 根据name来截取
    // name: '$(FileName)',     // 文件名由程序自己获取
    md5: '$(Etag)',
    size: '$(ObjectSize)' // long 单位byte
  },
  image: {
    // url: '',
    // ext: '',
    // name: '$(FileName)',
    md5: '$(Etag)',
    size: '$(ObjectSize)',
    w: '$(ImageInfo.Width)', // 图片宽度 int 单位: 像素
    h: '$(ImageInfo.Height)', // 图片高度 int 单位: 像素
    orientation: '$(ImageInfo.Orientation)'
  },
  audio: {
    // url: '',
    // ext: '',
    // name: '$(FileName)',
    md5: '$(Etag)',
    size: '$(ObjectSize)',
    dur: '$(AVinfo.Audio.Duration)' // 持续时间, 单位ms
  },
  video: {
    // url: '',
    // ext: '',
    // name: '$(FileName)',
    md5: '$(Etag)',
    size: '$(ObjectSize)',
    dur: '$(AVinfo.Video.Duration)', // 持续时间, 单位ms
    w: '$(AVinfo.Video.Width)', // 分辨率
    h: '$(AVinfo.Video.Height)' // 分辨率
  }
}

var nos = {}

nos.genResponseBody = function (type) {
  type = type || 'file'
  return responseBodyMap[type]
}

// https://en.wikipedia.org/wiki/Exchangeable_image_file_format
// http://www.impulseadventure.com/photo/exif-orientation.html
// top, left      Orientation: Horizontal (normal)
// right, top     Orientation: Rotate 90 CW
// bottom, right  Orientation: Rotate 180
// left, bottom   Orientation: Rotate 270 CW
/**
 * 解析 nos 返回的数据
 * @param  {Object} obj             nos 返回的数据
 * @param  {Boolean} exifOrientation 是否需要根据 exif orientation 信息来交换宽高
 * @return {Object}                 解析后的数据
 */
nos.parseResponse = function (obj, exifOrientation) {
  if (util.notundef(obj.size)) {
    obj.size = +obj.size
  }
  if (util.notundef(obj.w)) {
    obj.w = +obj.w
  }
  if (util.notundef(obj.h)) {
    obj.h = +obj.h
  }
  if (util.notundef(obj.dur)) {
    obj.dur = +obj.dur
  }
  var orientation = obj.orientation
  if (util.notundef(orientation)) {
    delete obj.orientation
    if (exifOrientation) {
      if (orientation === 'right, top' || orientation === 'left, bottom') {
        var temp = obj.w
        obj.w = obj.h
        obj.h = temp
      }
    }
  }
  return obj
}

module.exports = nos
