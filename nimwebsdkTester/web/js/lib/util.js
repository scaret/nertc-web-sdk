
if (!window.console) {
  window.console = {
    log: function () {}
  }
}

var regBlank = /\s+/ig

window.initAfterNIM = function () {
  var supportedBrowsers = ['Chrome', 'Safari', 'Firefox']
  var platform = NIM.platform
  if (supportedBrowsers.indexOf(platform.name) === -1) {
    console._log = console.log
    console.log = function () {
      var args = [].slice.call(arguments, 0)
      args.forEach(function (arg) {
        try {
          if (NIM.util.isObject(arg)) {
            arg = JSON.stringify(arg, null, 4)
          }
          if (console._log) {
            if (NIM.util.isFunction(arg)) { return }
            if (Array.isArray(arg)) {
              arg.forEach(function (a) {
                console._log(JSON.stringify(a, null, 4))
              })
            } else {
              console._log(arg)
            }
          }
        } catch (e) {
          // ignore e
        }
      })
    }
  }
}

window.string2object = function (string, sep) {
  var obj = {}
  string = string || ''
  var pairs = string.split(sep)
  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i]
    var arr = pair.split('=')
    var key = arr.shift()
    if (!key) {
      continue
    }
    obj[decodeURIComponent(key)] = decodeURIComponent(arr.join('='))
  }
  return obj
}

window.logProgress = function (widthPercentage) {
  console.log('=========== ' + widthPercentage)
}

window.buildFieldsFormDomStr = function (id) {
  var prefix = '<li'
  if (id) prefix = prefix + ' id="' + id + '"'
  return [
    prefix + '><form class="pure-form pure-form-stacked"><fieldset><div class="pure-g">',
    '</div></fieldset></form></li><div class="hr hr-thick"></div>'
  ]
}

window.buildFieldDomStr = function (name, value, size) {
  if (NIM.util.isObject(value)) value = JSON.stringify(value, null, '\t')
  if (NIM.util.notexist(value)) value = ''
  size = size || '1-8'
  return '<div class="pure-u-' + size + '">' +
    '<label>' + name + '</label>' +
    '<input type="text" readonly class="pure-u-23-24" title="' + escapeHtml(value) + '" value="' + escapeHtml(value) + '">' +
    '</div>'
}

window.buildLinkFieldDomStr = function (name, value, size) {
  name = '<a target="_blank" href="' + value + '">' + name + '</a>'
  return buildFieldDomStr(name, value, size)
}

var matchHtmlRegExp = /["'&<>]/
function escapeHtml (string) {
  var str = '' + string
  var match = matchHtmlRegExp.exec(str)

  if (!match) {
    return str
  }

  var escape
  var html = ''
  var index = 0
  var lastIndex = 0

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;'
        break
      case 38: // &
        escape = '&amp;'
        break
      case 39: // '
        escape = '&#39;'
        break
      case 60: // <
        escape = '&lt;'
        break
      case 62: // >
        escape = '&gt;'
        break
      default:
        continue
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index)
    }

    lastIndex = index + 1
    html += escape
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex, index)
    : html
}
