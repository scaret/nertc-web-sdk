/**
 * NIM support 工具对象, 通过 `NIM.support` 来获取此工具的引用
 *
 * @namespace support
 */
var support = {}

support.set = function (name, flag, obj) {
  support[name] = flag
  if (obj) {
    obj.support = flag
  }
}

/**
 * 是否支持数据库
 * @memberOf support
 * @name db
 * @type {Boolean}
 */

module.exports = support
