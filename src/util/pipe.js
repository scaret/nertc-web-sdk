
export default {
  // 顺序执行promise的包装函数
  pipe () {
    const arr = [...arguments]
    return this._pipe(arr.length === 1 ? arr[0] : arr)
  },

  _pipe (arr = [], para) {
    const fn = arr.shift()
    const promise =
      para && para.constructor === Promise ? para : Promise.resolve(para)
    return promise.then(() => {
      if (arr.length === 0) {
        return this._pipeLast(fn, para)
      }

      return this._pipeLast(fn, para).then(data => {
        // console.log('当前结果', data)
        return this._pipe(arr, data)
      })
    })
  },

  _pipeLast (fn, para) {
    // 基本类型
    if (!fn || (fn.constructor !== Function && fn.constructor !== Promise)) {
      return Promise.resolve(fn)
    }

    if (fn.constructor === Promise) {
      return fn
    }

    if (fn.constructor === Function) {
      const result = fn(para)
      if (result && result.constructor === Promise) {
        return result
      }

      return Promise.resolve(result)
    }

    return Promise.resolve(fn)
  }
}
