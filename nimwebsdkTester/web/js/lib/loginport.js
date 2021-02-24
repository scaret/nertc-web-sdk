
function onLoginPortsChange (loginPorts) {
  console.log('当前登录帐号在其它端的状态发生改变了', loginPorts)
  loginPorts.forEach(function (loginPort) {
    if (loginPort.online) {
      data.loginPorts = nim.mergeLoginPorts(data.loginPorts, loginPort)
    } else {
      data.loginPorts = nim.cutLoginPorts(data.loginPorts, loginPort)
    }
  })
  refreshLoginPortsUI()
}

function refreshLoginPortsUI () {
  if (!data.loginPorts) { return }
  $('#loginPortsNum').val(data.loginPorts ? data.loginPorts.length : 0)
  var $loginPorts = $('#loginPorts').empty()
  data.loginPorts.forEach(function (loginPort) {
    $loginPorts.append($(buildLoginPortDomStr(loginPort)))
  })
}
function buildLoginPortDomStr (loginPort) {
  var formDomStr = buildFieldsFormDomStr()
  return formDomStr[0] +
    buildFieldDomStr('type', loginPort.type, '1-5') +
    buildFieldDomStr('deviceId', loginPort.deviceId, '4-5') +
    formDomStr[1]
}

function initLoginPortEvent () {
  $('#kick').on('click', kick)
}

function kick () {
  var deviceIds = $(this).parent().find('.deviceId').val().split(regBlank)
  nim.kick({
    deviceIds: deviceIds,
    done: onKick
  })
}

function onKick (error, obj) {
  console.log('踢其它端' + (!error ? '成功' : '失败'), error, obj)
}
