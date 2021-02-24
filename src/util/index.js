var naturalSort = require('javascript-natural-sort')
var deep = require('deep-access')
require('./console')

// error类
function ErrorObj (msg) {
  if (typeof msg === 'object') {
    this.callFunc = msg.callFunc || null
    this.message = msg.message || 'UNKNOW ERROR'
  } else {
    this.message = msg
  }
  this.time = new Date()
  this.timetag = +this.time
}

/**
 * NIM util 工具方法, 通过 `NIM.util` 来获取此工具的引用
 *
 * @namespace util
 */
var util = require('./util')
var window = util.getGlobal()
var regWhiteSpace = /\s+/

util.deduplicate = function (arr) {
  var rtn = []
  arr.forEach(function (item) {
    if (rtn.indexOf(item) === -1) {
      rtn.push(item)
    }
  })
  return rtn
}

util.capFirstLetter = function (str) {
  if (!str) {
    return ''
  }
  str = '' + str
  return str.slice(0, 1).toUpperCase() + str.slice(1)
}

/**
 * 生成一个 32 位的 [GUID](https://en.wikipedia.org/wiki/Globally_unique_identifier)/[UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier)
 *
 * @memberOf util
 * @method guid
 *
 * @return {String}   guid/uuid
 */
util.guid = (function () {
  var _s4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return function () {
    return _s4() + _s4() + _s4() + _s4() + _s4() + _s4() + _s4() + _s4()
  }
})()

util.extend = function (o1, o2, override) {
  for (var i in o2) {
    if (typeof o1[i] === 'undefined' || override === true) {
      o1[i] = o2[i]
    }
  }
}

util.filterObj = function (base, props) {
  var obj = {}
  if (util.isString(props)) {
    props = props.split(regWhiteSpace)
  }
  props.forEach(function (prop) {
    if (base.hasOwnProperty(prop)) {
      obj[prop] = base[prop]
    }
  })
  return obj
}

/**
 * 将 target 复制到 base
 *
 * @private
 * @param  {Object} target 待复制的对象
 * @param  {Object} base   复制后的对象
 * @return {Object}        复制后的对象
 */
util.copy = function (target, base) {
  base = base || {}
  if (!target) {
    return base
  }
  Object.keys(target).forEach(function (key) {
    if (util.exist(target[key])) {
      base[key] = target[key]
    }
  })
  return base
}

/**
 * 将 target 复制到 base，null值也复制
 *
 * @private
 * @param  {Object} target 待复制的对象
 * @param  {Object} base   复制后的对象
 * @return {Object}        复制后的对象
 */
util.copyWithNull = function (target, base) {
  base = base || {}
  if (!target) {
    return base
  }
  Object.keys(target).forEach(function (key) {
    if (util.exist(target[key]) || util.isnull(target[key])) {
      base[key] = target[key]
    }
  })
  return base
}

util.findObjIndexInArray = function (array, options) {
  array = array || []
  var keyPath = options.keyPath || 'id'
  var pos = -1
  array.some(function (obj, index) {
    if (deep(obj, keyPath) === options.value) {
      pos = index
      return true
    }
  })
  return pos
}

/**
 * 在数组里面找 keyPath 对应的属性值为 value 的元素
 * - 数组的每一项均为对象, 并且必须有由 keyPath 指定的属性
 *
 * @memberOf util
 * @method findObjInArray
 *
 * @param  {Object[]}   array               待查找的数组
 * @param  {Object}     options             查找的条件
 * @param  {String}     [options.keyPath]   keyPath, 匹配的字段, 默认为 'id'
 * @param  {Anything}   [options.value]     匹配的值
 * @return {Object}                         找到的元素, 或者 null
 *
 * @example
 * var array = [
 *     {name: 'tom'},
 *     {name: 'jack'},
 *     {name: 'dan'}
 * ];
 * var obj = NIM.util.findObjInArray(array, {
 *     keyPath: 'name',
 *     value: 'jack'
 * });
 * // obj 为 {name: 'jack'}
 */
util.findObjInArray = function (array, options) {
  var index = util.findObjIndexInArray(array, options)
  return index === -1 ? null : array[index]
}

/**
 * 合并数组
 * - 此方法接收不定量参数
 *     - 最后一个参数如果是对象, 那么就是配置参数
 *     - 除了配置参数之外, 所有其它的参数都必须是数组, 它们都会被合并
 * - 如果两个对象`keyPath`字段对应的属性值相同, 后面的对象会被合并到前面的对象
 *
 * @memberOf util
 * @method mergeObjArray
 *
 * @param  {Object[]}   arr1                    待合并的数组
 * @param  {Object[]}   arr2                    待合并的数组
 * @param  {Object}     [options]               配置参数
 * @param  {String}     [options.keyPath='id']  `keyPath`, 去重的字段, 默认为 `id`
 * @param  {Boolean}    [options.notSort]       是否要排序, 默认`false`要排序, 传`true`则不排序
 * @param  {Function}   [options.compare]       决定排序的方法, 如果不提供, 那么使用 {@link NIM.naturalSort|NIM.naturalSort} 进行排序
 * @param  {String}     [options.sortPath]      `sortPath`, 排序用的字段, 默认为 `keyPath`
 * @param  {Boolean}    [options.insensitive]   排序时是否不区分大小写, 默认区分
 * @param  {Boolean}    [options.desc]          是否逆序, 默认正序
 * @return {Object[]}                           合并并排序后的数组
 *
 * @example
 * var arr1 = [
 *     {
 *         account: 'tom',
 *         name: 'T'
 *     }
 * ];
 * var arr2 = [
 *     {
 *         account: 'adam'
 *     },
 *     {
 *         account: 'tom',
 *         name: 'T-new'
 *     }
 * ];
 * var options = {
 *     keyPath: 'account'
 * };
 * var resultArray = NIM.util.mergeObjArray(arr1, arr2, options);
 * // resultArray为
 * // [
 * //     {account: 'adam'},
 * //     {account: 'tom', name: 'T-new'},
 * // ]
 */
util.mergeObjArray = function () {
  var base = []
  // 截取除了最后一个之外的参数, 这些就是待合并的数组
  var arrays = [].slice.call(arguments, 0, -1)
  // 最后一个参数是 options, 如果它是数组, 那么它也是待合并的数组
  var options = arguments[arguments.length - 1]
  if (util.isArray(options)) {
    arrays.push(options)
    options = {}
  }
  // options
  var keyPath = (options.keyPath = options.keyPath || 'id')
  options.sortPath = options.sortPath || keyPath
  // 如果 base 的长度为 0, 那么直接拷贝后一个数组里面的所有元素
  while (!base.length && !!arrays.length) {
    base = arrays.shift() || []
    base = base.slice(0)
  }
  // 合并所有的数组
  var index
  arrays.forEach(function (array) {
    if (!array) {
      return
    }
    array.forEach(function (item) {
      index = util.findObjIndexInArray(base, {
        keyPath: keyPath,
        value: deep(item, keyPath)
      })
      if (index !== -1) {
        // 不修改原有的对象, 生成新的
        base[index] = util.merge({}, base[index], item)
      } else {
        base.push(item)
      }
    })
  })
  // 排序
  if (!options.notSort) {
    base = util.sortObjArray(base, options)
  }
  return base
}

/**
 * 从数组里面去除某些项
 *
 * @memberOf util
 * @method cutObjArray
 *
 * @param  {Array}      base                    基数组
 * @param  {Object[]}   arr1                    待去除的数组
 * @param  {Object[]}   arr2                    待去除的数组
 * @param  {Object}     options                 配置参数
 * @param  {String}     [options.keyPath='id']  `keyPath`, 去重的字段, 默认为 `id`
 * @return {Array}                              去除后的数组
 *
 * @example
 * var olds = [
 *     { account: 'a' },
 *     { account: 'b' },
 *     { account: 'c' }
 * ];
 * var invalids = [
 *     { account: 'b' }
 * ];
 * var options = {
 *     keyPath: 'account'
 * };
 * var array = NIM.util.cutObjArray(olds, invalids, options);
 * // array 为
 * // [
 * //     { account: 'a' },
 * //     { account: 'c' }
 * // ]
 */
util.cutObjArray = function (base) {
  var rtn = base.slice(0)
  var argsLength = arguments.length
  // 截取除了第一个和最后一个之外的参数, 这些就是待删除的数组
  var arrays = [].slice.call(arguments, 1, argsLength - 1)
  // 最后一个参数是 options, 如果它不是对象, 那么它也是待删除的数组
  var options = arguments[argsLength - 1]
  if (!util.isObject(options)) {
    arrays.push(options)
    options = {}
  }
  // keyPath
  var keyPath = (options.keyPath = options.keyPath || 'id')
  // 删除
  var index
  arrays.forEach(function (cuts) {
    if (!util.isArray(cuts)) {
      cuts = [cuts]
    }
    cuts.forEach(function (cut) {
      if (!cut) {
        return
      }
      options.value = deep(cut, keyPath)
      index = util.findObjIndexInArray(rtn, options)
      if (index !== -1) {
        rtn.splice(index, 1)
      }
    })
  })
  return rtn
}

/**
 * 返回排序后的数组
 * - 数组的每一项都为 `Object`, 并且必须有由 `sortPath` 指定的属性
 *
 * @memberOf util
 * @method sortObjArray
 *
 * @param  {Object[]}   array                   待排序的数组
 * @param  {Object}     [options]               配置参数
 * @param {Function}    [options.compare]       决定排序的方法, 如果不提供, 那么使用 {@link NIM.naturalSort|NIM.naturalSort} 进行排序
 * @param  {String}     [options.sortPath]      `sortPath`, 排序用的字段, 默认为 `id`
 * @param  {Boolean}    [options.insensitive]   排序时是否不区分大小写, 默认区分
 * @param  {Boolean}    [options.desc]          是否逆序, 默认正序
 * @return {Object[]}                           排序后的数组
 *
 * @example
 * var array = [
 *     { account: 'b' },
 *     { account: 'a' }
 * ];
 * var options = {
 *     sortPath: 'account'
 * };
 * NIM.util.sortObjArray(array, options);
 * // array 为
 * //[
 * //    { account: 'a' },
 * //    { account: 'b' }
 * //]
 */
util.sortObjArray = function (array, options) {
  options = options || {}
  var sortPath = options.sortPath || 'id'
  naturalSort.insensitive = !!options.insensitive
  var desc = !!options.desc
  var pa, pb
  var compare
  if (util.isFunction(options.compare)) {
    compare = options.compare
  } else {
    compare = function (a, b) {
      pa = deep(a, sortPath)
      pb = deep(b, sortPath)
      if (desc) {
        return naturalSort(pb, pa)
      } else {
        return naturalSort(pa, pb)
      }
    }
  }
  return array.sort(compare)
}

util.emptyFunc = function () {}

util.isEmptyFunc = function (func) {
  return func === util.emptyFunc
}

util.notEmptyFunc = function (func) {
  return func !== util.emptyFunc
}

util.splice = function (obj, start, end) {
  return [].splice.call(obj, start, end)
}

// 重新切分数据，将一维数组切分成每列num个元素的二维数组
util.reshape2d = function (obj, num) {
  if (Array.isArray(obj)) {
    util.verifyParamType('type', num, 'number', 'util::reshape2d')
    let len = obj.length
    if (len <= num) {
      return [obj]
    } else {
      let count = Math.ceil(len / num)
      let result = []
      for (let i = 0; i < count; i++) {
        result.push(obj.slice(i * num, (i + 1) * num))
      }
      return result
    }
  }
  // 如果不是数组则不做任何处理
  return obj
}

// 扁平化数据，将2d数组转化为一维数组
util.flatten2d = function (obj) {
  if (Array.isArray(obj)) {
    let result = []
    obj.forEach(item => {
      result = result.concat(item)
    })
    return result
  }
  return obj
}

// 数组去重
util.dropArrayDuplicates = function (arr) {
  if (Array.isArray(arr)) {
    let map = {}
    let result = []
    while (arr.length > 0) {
      let item = arr.shift()
      map[item] = true
    }
    for (let key in map) {
      if (map[key] === true) {
        result.push(key)
      }
    }
    return result
  }
  return arr
}

// error 处理
/*
msg: {
  event: ...,
  message: ...,
  callFunc: ...
}
*/
util.onError = function (msg) {
  throw new ErrorObj(msg)
}

/*
 * 参数处理相关 API
 */

util.verifyParamPresent = function (name, value, prefix, callFunc) {
  prefix = prefix || ''
  var absent = false
  switch (util.typeOf(value)) {
    case 'undefined':
    case 'null':
      absent = true
      break
    case 'string':
      if (value === '') {
        absent = true
      }
      break
    case 'StrStrMap':
    case 'object':
      if (!Object.keys(value).length) {
        absent = true
      }
      break
    case 'array':
      if (!value.length) {
        absent = true
      } else {
        value.some(function (item) {
          if (util.notexist(item)) {
            absent = true
            return true
          }
        })
      }
      break
    default:
      break
  }
  if (absent) {
    util.onParamAbsent(prefix + name, callFunc)
  }
}

util.onParamAbsent = function (name, callFunc) {
  util.onParamError(
    `缺少参数 ${name}, 请确保参数不是 空字符串、空对象、空数组、null或undefined, 或数组的内容不是 null/undefined`,
    callFunc
  )
}

util.verifyParamAbsent = function (name, value, prefix, callFunc) {
  prefix = prefix || ''
  if (value !== undefined) {
    util.onParamPresent(prefix + name, callFunc)
  }
}

util.onParamPresent = function (name, callFunc) {
  util.onParamError(`多余的参数 ${name}`, callFunc)
}

util.verifyParamType = function (name, value, validTypes, callFunc) {
  var type = util.typeOf(value).toLowerCase()
  if (!util.isArray(validTypes)) {
    validTypes = [validTypes]
  }
  validTypes = validTypes.map(function (type) {
    return type.toLowerCase()
  })
  var valid = true
  if (validTypes.indexOf(type) === -1) {
    valid = false
  }
  switch (type) {
    case 'number':
      if (isNaN(value)) {
        valid = false
      }
      break
    case 'string':
      if (validTypes.join('') === 'numeric or numeric string') {
        if (/^[0-9]+$/.test(value)) {
          valid = true
        } else {
          valid = false
        }
      }
      break
    default:
      break
  }
  if (!valid) {
    util.onParamInvalidType(name, validTypes, '', callFunc)
  }
}

util.onParamInvalidType = function (name, validTypes, prefix, callFunc) {
  prefix = prefix || ''
  if (util.isArray(validTypes)) {
    validTypes = validTypes.map(function (type) {
      return '"' + type + '"'
    })
    validTypes = validTypes.join(', ')
  } else {
    validTypes = '"' + validTypes + '"'
  }
  util.onParamError(
    '参数"' + prefix + name + '"类型错误, 合法的类型包括: [' + validTypes + ']',
    callFunc
  )
}

util.verifyParamValid = function (name, value, validValues, callFunc) {
  if (!util.isArray(validValues)) {
    validValues = [validValues]
  }
  if (validValues.indexOf(value) === -1) {
    util.onParamInvalidValue(name, validValues, callFunc)
  }
}

util.onParamInvalidValue = function (name, validValues, callFunc) {
  if (!util.isArray(validValues)) {
    validValues = [validValues]
  }
  validValues = validValues.map(function (value) {
    return '"' + value + '"'
  })
  if (util.isArray(validValues)) {
    validValues = validValues.join(', ')
  }
  util.onParamError(
    `参数 ${name}值错误, 合法的值包括: [${JSON.stringify(validValues)}]`,
    callFunc
  )
}

util.verifyParamMin = function (name, value, min, callFunc) {
  if (value < min) {
    util.onParamError('参数' + name + '的值不能小于' + min, callFunc)
  }
}

util.verifyParamMax = function (name, value, max, callFunc) {
  if (value > max) {
    util.onParamError('参数' + name + '的值不能大于' + max, callFunc)
  }
}

util.verifyArrayMax = function (name, value, max, callFunc) {
  if (value.length > max) {
    util.onParamError('参数' + name + '的长度不能大于' + max, callFunc)
  }
}

util.verifyEmail = (function () {
  var reg = /^\S+@\S+$/
  return function (name, value, callFunc) {
    if (!reg.test(value)) {
      util.onParamError(
        '参数' +
          name +
          '邮箱格式错误, 合法格式必须包含@符号, @符号前后至少要各有一个字符',
        callFunc
      )
    }
  }
})()

util.verifyTel = (function () {
  var reg = /^[+\-()\d]+$/
  return function (name, value, callFunc) {
    if (!reg.test(value)) {
      util.onParamError(
        '参数' + name + '电话号码格式错误, 合法字符包括+、-、英文括号和数字',
        callFunc
      )
    }
  }
})()

util.verifyBirth = (function () {
  var reg = /^(\d{4})-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/
  return function (name, value, callFunc) {
    if (!reg.test(value)) {
      util.onParamError(
        '参数' + name + '生日格式错误, 合法为"yyyy-MM-dd"',
        callFunc
      )
    }
  }
})()

util.onParamError = function (message, callFunc) {
  util.onError({
    message,
    callFunc
  })
}

/**
 * 验证options及其属性是否存在
 *
 * @private
 * @param  {Object}       options       配置参数
 * @param  {String|Array} params        属性列表
 * @param  {Boolean}      shouldPresent 是否应该存在
 * @return {Void}
 */
util.verifyOptions = function (
  options,
  params,
  shouldPresent,
  prefix,
  callFunc
) {
  options = options || {}
  if (params) {
    if (util.isString(params)) {
      params = params.split(regWhiteSpace)
    }
    if (util.isArray(params)) {
      if (typeof shouldPresent !== 'boolean') {
        callFunc = shouldPresent || null
        shouldPresent = true
        prefix = ''
      }
      // shouldPresent = shouldPresent === undefined ? true : !!shouldPresent
      var func = shouldPresent
        ? util.verifyParamPresent
        : util.verifyParamAbsent
      params.forEach(function (param) {
        func.call(util, param, options[param], prefix, callFunc)
      })
    }
  }
  return options
}

util.verifyParamAtLeastPresentOne = function (options, params, callFunc) {
  if (params) {
    if (util.isString(params)) {
      params = params.split(regWhiteSpace)
    }
    if (util.isArray(params)) {
      var presentOne = params.some(function (param) {
        return util.exist(options[param])
      })
      if (!presentOne) {
        util.onParamError(
          '以下参数[' + params.join(', ') + ']至少需要传入一个',
          callFunc
        )
      }
    }
  }
}

util.verifyParamPresentJustOne = function (options, params, callFunc) {
  if (params) {
    if (util.isString(params)) {
      params = params.split(regWhiteSpace)
    }
    if (util.isArray(params)) {
      var counter = params.reduce(function (p, param) {
        if (util.exist(options[param])) {
          p++
        }
        return p
      }, 0)
      if (counter !== 1) {
        util.onParamError(
          '以下参数[' + params.join(', ') + ']必须且只能传入一个',
          callFunc
        )
      }
    }
  }
}

util.verifyBooleanWithDefault = function (
  options,
  name,
  defaultValue,
  prefix,
  callFunc
) {
  if (util.undef(defaultValue)) {
    defaultValue = true
  }
  if (regWhiteSpace.test(name)) {
    name = name.split(regWhiteSpace)
  }
  if (util.isArray(name)) {
    name.forEach(function (n) {
      util.verifyBooleanWithDefault(options, n, defaultValue, prefix, callFunc)
    })
  } else {
    if (typeof options[name] === 'undefined') {
      options[name] = defaultValue
    } else if (!util.isBoolean(options[name])) {
      util.onParamInvalidType(name, 'boolean', prefix, callFunc)
    }
  }
}

util.verifyFileInput = function (fileInput, callFunc) {
  util.verifyParamPresent('fileInput', fileInput, '', callFunc)
  if (util.isString(fileInput)) {
    if (typeof document === 'undefined') {
      fileInput = undefined
    } else {
      fileInput = document.getElementById(fileInput)
    }
    if (!fileInput) {
      util.onParamError(
        `找不到要上传的文件对应的input, 请检查fileInput id ${fileInput}`,
        callFunc
      )
    }
  }
  if (
    !fileInput.tagName ||
    fileInput.tagName.toLowerCase() !== 'input' ||
    fileInput.type.toLowerCase() !== 'file'
  ) {
    util.onParamError(
      `请提供正确的 fileInput, 必须为 file 类型的 input 节点 tagname:${
        fileInput.tagName
      }, filetype:${fileInput.type}`,
      callFunc
    )
  }
  return fileInput
}

/**
 * 验证是否是合法的文件类型
 *
 * @private
 * @param  {type} type 待验证的文件类型
 * @return {bool}      是否是合法的文件类型
 */
util.verifyFileType = function (type, callFunc) {
  util.verifyParamValid('type', type, util.validFileTypes, callFunc)
}

util.verifyCallback = function (options, name, callFunc) {
  if (regWhiteSpace.test(name)) {
    name = name.split(regWhiteSpace)
  }
  if (util.isArray(name)) {
    name.forEach(function (n) {
      util.verifyCallback(options, n, callFunc)
    })
  } else {
    if (!options[name]) {
      options[name] = util.emptyFunc
    } else if (!util.isFunction(options[name])) {
      util.onParamInvalidType(name, 'function', '', callFunc)
    }
  }
}

util.verifyFileUploadCallback = function (options, callFunc) {
  util.verifyCallback(
    options,
    'uploadprogress uploaddone uploaderror uploadcancel',
    callFunc
  )
}

/*
 * 文件相关 API
 */

util.validFileTypes = ['image', 'audio', 'video', 'file']

util.validFileExts = {
  image: ['bmp', 'gif', 'jpg', 'jpeg', 'jng', 'png', 'webp'],
  audio: [
    'mp3',
    'wav',
    'aac',
    'wma',
    'wmv',
    'amr',
    'mp2',
    'flac',
    'vorbis',
    'ac3'
  ],
  video: ['mp4', 'rm', 'rmvb', 'wmv', 'avi', 'mpg', 'mpeg']
}

util.filterFiles = function (files, targetType) {
  targetType = targetType.toLowerCase()
  var anyfile = targetType === 'file'
  var arr = []
  var ext
  var mime
  var type
  //   var subtype
  ;[].forEach.call(files, function (file) {
    if (anyfile) {
      arr.push(file)
    } else {
      ext = file.name.slice(file.name.lastIndexOf('.') + 1)
      mime = file.type.split('/')
      if (!!mime[0] && !!mime[1]) {
        type = mime[0].toLowerCase()
        // subtype = mime[1].toLowerCase()
        var match = false
        if (type === targetType) {
          match = true
        } else {
          match = util.validFileExts[targetType].indexOf(ext) !== -1
        }
        if (match) {
          arr.push(file)
        }
      } else {
        // unknow mime
      }
    }
  })
  return arr
}

var supportFormData = (util.supportFormData = util.notundef(window.FormData))
util.getFileName = (function () {
  return function (fileInput) {
    fileInput = util.verifyFileInput(fileInput)
    if (supportFormData) {
      return fileInput.files[0].name
    } else {
      return fileInput.value.slice(fileInput.value.lastIndexOf('\\') + 1)
    }
  }
})()

// 获取文件信息
util.getFileInfo = (function () {
  const map = {
    ppt: 1,
    pptx: 2,
    pdf: 3
  }
  return function (fileInput) {
    fileInput = util.verifyFileInput(fileInput)
    const res = {}
    if (!fileInput.files) {
      return res
    }
    const file = fileInput.files[0]
    if (supportFormData) {
      res.name = file.name
      res.size = file.size
      res.type = file.name.match(/\.(\w+)$/)
      res.type = res.type && res.type[1].toLowerCase()
      res.transcodeType = map[res.type] || 0
    }
    return res
  }
})()

util.sizeText = (function () {
  var sizeUnit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'BB']
  return function (size) {
    var text
    var index = 0
    do {
      size = Math.floor(size * 100) / 100
      var unit = sizeUnit[index]
      text = size + unit
      size /= 1024
      index++
    } while (size > 1)
    return text
  }
})()

util.promises2cmds = function (promises) {
  return promises.map(function (promise) {
    return promise.cmd
  })
}

util.objs2accounts = function (objs) {
  return objs.map(function (obj) {
    return obj.account
  })
}

util.teams2ids = function (teams) {
  return teams.map(function (team) {
    return team.teamId
  })
}

util.objs2ids = function (objs) {
  return objs.map(function (obj) {
    return obj.id
  })
}

util.getMaxUpdateTime = function (array) {
  var timetags = array.map(function (item) {
    return +item.updateTime
  })
  return Math.max.apply(Math, timetags)
}

// util.genCheckUniqueFunc = function (keyPath, size) {
//   var array = []
//   var set = {}
//   keyPath = keyPath || 'id'
//   size = size || 1000
//   return function (obj) {
//     var id
//     if (array.length >= size) {
//       id = array.shift()
//       delete set[id]
//     }
//     id = deep(obj, keyPath)
//     if (!set[id]) {
//       set[id] = true
//       array.push(id)
//       return true
//     } else {
//       return false
//     }
//   }
// }

util.genCheckUniqueFunc = function (keyPath, size) {
  keyPath = keyPath || 'id'
  size = size || 1000
  return function (obj) {
    this.uniqueSet = this.uniqueSet || {}
    this.uniqueSet[keyPath] = this.uniqueSet[keyPath] || {}
    const currSet = this.uniqueSet[keyPath]
    const setId = obj[keyPath]
    if (currSet[setId]) {
      return false
    } else {
      currSet[setId] = true
      return true
    }
  }
}

util.fillPropertyWithDefault = function (obj, name, defaultValue) {
  if (util.undef(obj[name])) {
    obj[name] = defaultValue
    return true
  }
  return false
}


module.exports = util
