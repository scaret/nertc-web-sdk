export class SimpleBig {
  private numStr: string
  isSimpleBig = true
  constructor(numStr: string | number | BigInt) {
    if (typeof numStr === 'string') {
      this.numStr = numStr
    } else if (numStr > Number.MIN_SAFE_INTEGER) {
      this.numStr = numStr.toString()
    } else {
      console.error(`Invalid numStr:`, numStr)
      this.numStr = '-1'
    }
  }
  toString() {
    return this.numStr
  }
  static fromHex(hexStr: string) {
    // 十六进制的string转为10进制string，主要需要考虑超过Number.MAX_SAFE_INT的情况

    if (hexStr.length < 13) {
      // 对比较小的数直接parse
      return parseInt(hexStr, 16)
    }
    let dec = '0'
    hexStr.split('').forEach((chr) => {
      var n = parseInt(chr, 16)
      for (let t = 8; t; t >>= 1) {
        dec = add(dec, dec)
        if (n & t) {
          dec = add(dec, '1')
        }
      }
    })

    return new SimpleBig(dec)
  }
}

function add(decInStrX: string, decInStrY: string) {
  let c = 0
  let r: number[] = []
  let x = decInStrX.split('').map(Number)
  let y = decInStrY.split('').map(Number)
  while (x.length || y.length) {
    const s = (x.pop() || 0) + (y.pop() || 0) + c
    r.unshift(s < 10 ? s : s - 10)
    c = s < 10 ? 0 : 1
  }
  if (c) {
    r.unshift(c)
  }
  return r.join('')
}
