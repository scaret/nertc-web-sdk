/**
 * Has own property.
 *
 * @type {Function}
 */

var has = Object.prototype.hasOwnProperty;

/**
 * To string.
 *
 * @type {Function}
 */

var toString = Object.prototype.toString;

/**
 * Test whether a value is "empty".
 *
 * @param {Mixed} val
 * @return {Boolean}
 */

 function isPlainObject(value:any) {
    // 判断类型不是 Object 的
    if (
      !value ||
      typeof value !== 'object' ||
      Object.prototype.toString.call(value) != '[object Object]'
    ) {
      return false;
    }
    // 返回指定对象的原型 判断对象有没有原型，没有原型的对象算纯粹对象
    var proto = Object.getPrototypeOf(value);
    if (proto === null) {
      // Object.create(null) 的情况
      return true;
    }
    // 最后判断是不是通过 "{}" 或 "new Object" 方式创建的对象
    // 如果 proto 有 constructor属性，Ctor 的值就为 proto.constructor，
    // 原型的 constructor 属性指向关联的构造函数
    var Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
    return (
      typeof Ctor == 'function' &&
      // 用于检测构造函数Ctor的 prototype 属性是否出现在某个实例对象(Ctor)的原型链上。
      Ctor instanceof Ctor &&
      // 如果 Ctor 类型是  "function" ，并且调用Function.prototype.toString 方法后得到的字符串 与 "function Object() { [native code] }" 这样的字符串相等就返回true
      // 用来区分 自定义构造函数和 Object 构造函数
      Function.prototype.toString.call(Ctor) === Function.prototype.toString.call(Object)
    );
  };
function isEmpty(val:any) {
  // Null and Undefined...
  if (val == null) return true;

  // Booleans...
  if ('boolean' == typeof val) return false;

  // Numbers...
  if ('number' == typeof val) return val === 0;

  // Strings...
  if ('string' == typeof val) return val.length === 0;

  // Functions...
  if ('function' == typeof val) return val.length === 0;

  // Arrays...
  if (Array.isArray(val)) return val.length === 0;

  // Errors...
  if (val instanceof Error) return val.message === '';

  // Objects...
  if (isPlainObject(val)) {
    switch (Object.prototype.toString.call(val)) {
      // Maps, Sets, Files and Errors...
      case '[object File]':
      case '[object Map]':
      case '[object Set]': {
        return val.size === 0;
      }

      // Plain objects...
      case '[object Object]': {
        for (var key in val) {
          if (has.call(val, key)) return false;
        }

        return true;
      }
    }
  }

  // Anything else...
  return false;
}

export default isEmpty;
