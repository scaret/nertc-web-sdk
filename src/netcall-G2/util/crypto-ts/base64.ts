// port from https://github.com/brix/crypto-js/blob/develop/src/enc-base64.js

import { Hex, WordArray } from './core'

const _map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

let _reverseMap: number[]
/**
 * Converts a Base64 string to a word array.
 *
 * @param {string} base64Str The Base64 string.
 *
 * @return {WordArray} The word array.
 *
 * @static
 *
 * @example
 *
 *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
 */
export function parseBase64(base64Str: string) {
  // Shortcuts
  var base64StrLength = base64Str.length
  var map = _map

  if (!_reverseMap) {
    _reverseMap = []
    for (var j = 0; j < map.length; j++) {
      _reverseMap[map.charCodeAt(j)] = j
    }
  }

  // Ignore padding
  var paddingChar = map.charAt(64)
  if (paddingChar) {
    var paddingIndex = base64Str.indexOf(paddingChar)
    if (paddingIndex !== -1) {
      base64StrLength = paddingIndex
    }
  }

  // Convert
  return parseLoop(base64Str, base64StrLength, _reverseMap)
}

function parseLoop(base64Str: string, base64StrLength: number, reverseMap: number[]) {
  var words: number[] = []
  var nBytes = 0
  for (var i = 0; i < base64StrLength; i++) {
    if (i % 4) {
      var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2)
      var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2)
      var bitsCombined = bits1 | bits2
      words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8)
      nBytes++
    }
  }
  return new WordArray(words, nBytes)
}
