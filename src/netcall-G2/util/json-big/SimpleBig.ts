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

    const digits: number[] = []
    for (let i = 0; i < hexStr.length; i++) {
      if (!digits[i]) {
        digits[i] = 0
      }
      digits[i] += parseInt(hexStr.charAt(hexStr.length - 1 - i))
      if (digits[i] > 9) {
        // 产生了进位
        digits[i] -= 10
        digits[i + 1] = 1
      }
    }
    const numStr = digits.reverse().join('')
    return new SimpleBig(numStr)
  }
}
