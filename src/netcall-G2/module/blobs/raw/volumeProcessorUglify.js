var _0x5611 = [
  '_nextUpdateFrame',
  'process',
  'postMessage',
  'port',
  'exports',
  'max',
  'sqrt',
  'length',
  '_rightVolume',
  'onmessage',
  'data',
  'vumeter',
  'updateIntervalInMS',
  '_leftVolume',
  'function',
  '_updateIntervalInMS',
  'intervalInFrames'
]
var _0x5972 = function (_0x561138, _0x59725a) {
  _0x561138 = _0x561138 - 0x0
  var _0x5dd729 = _0x5611[_0x561138]
  return _0x5dd729
}
;(function () {
  function _0x5481bf(_0x22ab6f, _0x21a885, _0x1b8f35) {
    function _0x14d95f(_0x54f6d3, _0x36fc8d) {
      if (!_0x21a885[_0x54f6d3]) {
        if (!_0x22ab6f[_0x54f6d3]) {
          var _0x52c914 = 'function' == typeof require && require
          if (!_0x36fc8d && _0x52c914) return _0x52c914(_0x54f6d3, !0x0)
          if (_0x178736) return _0x178736(_0x54f6d3, !0x0)
          var _0x6479de = new Error('Cannot\x20find\x20module\x20\x27' + _0x54f6d3 + '\x27')
          throw ((_0x6479de['code'] = 'MODULE_NOT_FOUND'), _0x6479de)
        }
        var _0x4bab20 = (_0x21a885[_0x54f6d3] = { exports: {} })
        _0x22ab6f[_0x54f6d3][0x0]['call'](
          _0x4bab20['exports'],
          function (_0x44d31b) {
            var _0x2d6677 = _0x22ab6f[_0x54f6d3][0x1][_0x44d31b]
            return _0x14d95f(_0x2d6677 || _0x44d31b)
          },
          _0x4bab20,
          _0x4bab20[_0x5972('0x4')],
          _0x5481bf,
          _0x22ab6f,
          _0x21a885,
          _0x1b8f35
        )
      }
      return _0x21a885[_0x54f6d3]['exports']
    }
    for (
      var _0x178736 = _0x5972('0xe') == typeof require && require, _0x1b03e2 = 0x0;
      _0x1b03e2 < _0x1b8f35[_0x5972('0x7')];
      _0x1b03e2++
    )
      _0x14d95f(_0x1b8f35[_0x1b03e2])
    return _0x14d95f
  }
  return _0x5481bf
})()(
  {
    1: [
      function (_0x2aba7b, _0x16be5b, _0x131009) {
        const _0x2829ca = 0.8
        const _0x1ea995 = 0.00001
        registerProcessor(
          _0x5972('0xb'),
          class extends AudioWorkletProcessor {
            constructor() {
              super()
              this['_leftVolume'] = 0x0
              this[_0x5972('0x8')] = 0x0
              this[_0x5972('0xf')] = 0x19
              this[_0x5972('0x0')] = this['_updateIntervalInMS']
              this[_0x5972('0x3')][_0x5972('0x9')] = (_0x280714) => {
                if (_0x280714[_0x5972('0xa')][_0x5972('0xc')])
                  this[_0x5972('0xf')] = _0x280714['data']['updateIntervalInMS']
              }
            }
            get [_0x5972('0x10')]() {
              return (this['_updateIntervalInMS'] / 0x3e8) * sampleRate
            }
            [_0x5972('0x1')](_0x344f9b, _0x340020, _0x87a52a) {
              const _0x25ab65 = _0x344f9b[0x0]
              if (_0x25ab65[_0x5972('0x7')] > 0x0) {
                const _0x291d1d = _0x25ab65[0x0]
                const _0x52612e = _0x25ab65[0x1]
                let _0x220d7f = 0x0
                let _0x13f206 = 0x0
                for (let _0x234f44 = 0x0; _0x234f44 < _0x291d1d['length']; ++_0x234f44)
                  _0x220d7f += _0x291d1d[_0x234f44] * _0x291d1d[_0x234f44]
                _0x13f206 = Math['sqrt'](_0x220d7f / _0x291d1d[_0x5972('0x7')])
                this['_leftVolume'] = Math[_0x5972('0x5')](
                  _0x13f206,
                  this['_leftVolume'] * _0x2829ca
                )
                _0x220d7f = 0x0
                _0x13f206 = 0x0
                for (let _0x351334 = 0x0; _0x351334 < _0x52612e[_0x5972('0x7')]; ++_0x351334)
                  _0x220d7f += _0x52612e[_0x351334] * _0x52612e[_0x351334]
                _0x13f206 = Math[_0x5972('0x6')](_0x220d7f / _0x52612e[_0x5972('0x7')])
                this[_0x5972('0x8')] = Math[_0x5972('0x5')](
                  _0x13f206,
                  this['_rightVolume'] * _0x2829ca
                )
                this[_0x5972('0x0')] -= _0x291d1d[_0x5972('0x7')]
                if (this[_0x5972('0x0')] < 0x0) {
                  this['_nextUpdateFrame'] += this[_0x5972('0x10')]
                  this[_0x5972('0x3')][_0x5972('0x2')]({
                    letfvolume: this[_0x5972('0xd')],
                    rightVolume: this['_rightVolume'],
                    volume: this[_0x5972('0xd')] || this['_rightVolume']
                  })
                }
              }
              return !![]
            }
          }
        )
      },
      {}
    ]
  },
  {},
  [0x1]
)
