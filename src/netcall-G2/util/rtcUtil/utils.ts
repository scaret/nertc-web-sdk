/*
 * 使用尾递归优化，计算斐波那契数
 */
export function fibonacci(i: number, n1 = 1, n2 = 1): number {
  if (i <= 1) {
    return n2
  }
  return fibonacci(i - 1, n2, n1 + n2)
}

/*
 * 获取重连时间间隔
 * 根据斐波那契数来计算，最小间隔为 2s， 最大间隔为 13s
 */
export function getReconnectionTimeout(count: number) {
  // 最小间隔2s，2,3,5,8 间隔各尝试2次
  const n = Math.round(count / 2) + 1
  // 最大间隔 13s
  if (n > 6) {
    return 13 * 1000
    //   return -1;
  }
  return fibonacci(n) * 1000
}

/**
 *  UUID generator - RFC4122 version 4 compliant solution
 */
export const generateUUID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const randomId = function () {
  return 'xxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function deepCopy(param: Object) {
  var result = Array.isArray(param) ? [] : {}
  for (var key in param) {
    if (param.hasOwnProperty(key)) {
      //@ts-ignore
      if (typeof param[key] === 'object' && param[key] !== null) {
        //@ts-ignore
        result[key] = deepCopy(param[key])
      } else {
        //@ts-ignore
        result[key] = param[key]
      }
    }
  }
  return result
}

export function formatSingleArg(arg: any): any {
  if (window.RTCRtpSender && arg instanceof RTCRtpSender) {
    const sender = arg as RTCRtpSender
    const formatted = `[RTCRtpSender track: ${formatSingleArg(sender.track)}]`
    return formatted
  } else if (arg instanceof MediaStreamTrack) {
    const track = arg as MediaStreamTrack
    const formatted = `[MediaStreamTrack kind:${track.kind} label:${track.label} readyState:${track.readyState} id: ${track.id} enabled:${track.enabled} muted: ${track.muted}]`
    return formatted
  } else if (arg instanceof HTMLElement) {
    const elem = arg as HTMLElement
    const formatted = `[${elem.tagName}.${elem.className} ${elem.clientWidth}x${elem.clientHeight}]`
    return formatted
  } else if (arg instanceof MediaStream) {
    const elem = arg as MediaStream
    const formatted = `[MediaStream active:${elem.active} a:${elem.getAudioTracks().length} v:${
      elem.getVideoTracks().length
    }]`
    return formatted
  } else {
    return arg
  }
}

export function makePrintable(param: any, maxLevel: number, cachedObj: any[] = []) {
  if (typeof param !== 'object' || !param?.hasOwnProperty) {
    return param
  }
  var result: any = Array.isArray(param) ? [] : {}
  for (var key in param) {
    if (param.hasOwnProperty(key)) {
      const val = formatSingleArg(param[key])
      if (!val) {
        // 省点空间
        // result[key] = val;
      } else if (key === 'client' && val.adapterRef) {
        // 对client最多只打印一层
        // result[key] = makePrintable(val, Math.min(maxLevel - 1, 0));
      } else if (['adapterRef', 'sdkRef', 'logger', '_events'].indexOf(key) > -1) {
        // result[key] = "<" + key + ">"
      } else if (val && typeof val === 'object') {
        if (cachedObj.indexOf(val) > -1) {
          result[key] = '[Circular obj]'
        } else {
          cachedObj.push(result[key])
          if (maxLevel >= 1) {
            result[key] = makePrintable(val, maxLevel - 1, cachedObj)
          } else {
            if (val?.toString) {
              result[key] = val.toString()
            } else {
              result[key] = typeof val
            }
          }
        }
      } else {
        result[key] = val
      }
    }
  }
  return result
}

export function getDomInfo(elem: HTMLElement | null) {
  if (!elem) {
    return '' + elem
  }
  let info = elem.tagName
  if (elem.id) {
    info += '#' + elem.id
  }
  if (elem.className) {
    info += '.' + elem.className
  }
  if (elem.offsetWidth || elem.offsetHeight) {
    info += ` ${elem.offsetWidth}x${elem.offsetHeight}`
  }
  return info
}
