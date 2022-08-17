export const Hex = {
  /**
   * Converts a word array to a hex string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The hex string.
   *
   * @static
   *
   * @example
   *
   *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
   */
  stringify(wordArray: WordArray) {
    // Shortcuts
    var words = wordArray.words
    var sigBytes = wordArray.sigBytes

    // Convert
    var hexChars = []
    for (var i = 0; i < sigBytes; i++) {
      var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
      hexChars.push((bite >>> 4).toString(16))
      hexChars.push((bite & 0x0f).toString(16))
    }

    return hexChars.join('')
  }
}

export class WordArray {
  /**
   * Initializes a newly created word array.
   *
   * @param {Array} words (Optional) An array of 32-bit words.
   * @param {number} sigBytes (Optional) The number of significant bytes in the words.
   *
   * @example
   *
   *     var wordArray = CryptoJS.lib.WordArray.create();
   *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
   *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
   */
  words: number[]
  sigBytes: number
  constructor(words: number[], sigBytes?: number) {
    words = this.words = words || []

    if (sigBytes != undefined) {
      this.sigBytes = sigBytes
    } else {
      this.sigBytes = words.length * 4
    }
  }

  /**
   * Converts this word array to a string.
   *
   * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
   *
   * @return {string} The stringified word array.
   *
   * @example
   *
   *     var string = wordArray + '';
   *     var string = wordArray.toString();
   *     var string = wordArray.toString(CryptoJS.enc.Utf8);
   */
  toString(encoder?: any) {
    return (encoder || Hex).stringify(this)
  }

  /**
   * Concatenates a word array to this word array.
   *
   * @param {WordArray} wordArray The word array to append.
   *
   * @return {WordArray} This word array.
   *
   * @example
   *
   *     wordArray1.concat(wordArray2);
   */
  concat(wordArray: WordArray) {
    // Shortcuts
    var thisWords = this.words
    var thatWords = wordArray.words
    var thisSigBytes = this.sigBytes
    var thatSigBytes = wordArray.sigBytes

    // Clamp excess bits
    this.clamp()

    // Concat
    if (thisSigBytes % 4) {
      // Copy one byte at a time
      for (var i = 0; i < thatSigBytes; i++) {
        var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
        thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8)
      }
    } else {
      // Copy one word at a time
      for (var j = 0; j < thatSigBytes; j += 4) {
        thisWords[(thisSigBytes + j) >>> 2] = thatWords[j >>> 2]
      }
    }
    this.sigBytes += thatSigBytes

    // Chainable
    return this
  }

  /**
   * Removes insignificant bits.
   *
   * @example
   *
   *     wordArray.clamp();
   */
  clamp() {
    // Shortcuts
    var words = this.words
    var sigBytes = this.sigBytes

    // Clamp
    words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8)
    words.length = Math.ceil(sigBytes / 4)
  }
}
