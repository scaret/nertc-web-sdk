
function onSessions (sessions) {
  // console.log('收到会话列表', sessions)
  console.log('888888888', sessions)
  data.sessions = nim.mergeSessions(data.sessions, sessions)
  updateSessionsUI()
}
function onUpdateSession (session) {
  console.log('会话更新了', session)
  data.sessions = nim.mergeSessions(data.sessions, session)
  updateSessionsUI()
}
function onDeleteSession (ids) {
  data.sessions = nim.cutSessionsByIds(data.sessions, ids)
  updateSessionsUI()
}
function updateSessionsUI () {
  $('#sessionsNum').val(data.sessions ? data.sessions.length : 0)
  var sessions = data.sessions
  var $sessions = $('#sessions').empty()
  sessions.forEach(function (session) {
    $sessions.append($(buildSessionDomStr(session)))
  })
}
function buildSessionDomStr (session) {
  var formDomStr = buildFieldsFormDomStr()
  return formDomStr[0] +
    buildFieldDomStr('id', session.id, '1-4') +
    buildFieldDomStr('scene', session.scene, '1-4') +
    buildFieldDomStr('to', session.to, '1-4') +
    buildFieldDomStr('unread', session.unread, '1-4') +
    buildFieldDomStr('lastMsg', session.lastMsg, '1-4') +
    buildFieldDomStr('localCustom', session.localCustom, '1-4') +
    buildFieldDomStr('updateTime', session.updateTime, '1-4') +
    buildFieldDomStr('hasMoreLocalMsgs', session.hasMoreLocalMsgs, '1-4') +
    formDomStr[1]
}

function findSession (sessionId) {
  var obj
  if (data.sessions) {
    data.sessions.some(function (session) {
      if (session.id === sessionId) {
        obj = session
        return true
      }
    })
  }
  return obj
}

function initSessionEvent () {
  $('#setCurrSession').on('click', function () {
    var $parent = $(this).parent()
    var sessionId = $parent.find('.sessionId').val()
    nim.setCurrSession(sessionId)
    data.currSession = sessionId
    console.log('设置当前会话为' + sessionId)
  })
  $('#resetSessionUnread').on('click', function () {
    var $parent = $(this).parent()
    var sessionId = $parent.find('.sessionId').val()
    var session = findSession(sessionId)
    nim.resetSessionUnread(sessionId)
  })
  $('#resetAllSessionUnread').on('click', function () {
    nim.resetAllSessionUnread()
  })
  $('#sendMsgReceipt').on('click', function () {
    var $parent = $(this).parent()
    var sessionId = $parent.find('.sessionId').val()
    if (sessionId) {
      var session = findSession(sessionId)
      if (session) {
        var lastMsg = session.lastMsg
        if (lastMsg) {
          nim.sendMsgReceipt({
            msg: lastMsg,
            done: function (error) {
              console.log('发送已读回执' + (!error ? '成功' : '失败'), error)
            }
          })
          return
        }
      }
    }
    console.log('没有找到收到的消息')
  })
  $('#insertLocalSession').on('click', function () {
    var $parent = $(this).parent()
    var scene = $parent.find('.scene').val()
    var to = $parent.find('.to').val()
    var updateTime = $parent.find('.updateTime').val()
    if (updateTime) {
      updateTime = +updateTime
    }
    nim.insertLocalSession({
      scene: scene,
      to: to,
      updateTime: updateTime,
      done: function (error, obj) {
        console.log('插入本地会话记录' + (!error ? '成功' : '失败'), error, obj)
      }
    })
  })
  $('#getLocalSessions').on('click', function () {
    var $parent = $(this).parent()
    var lastSessionId = $parent.find('.lastSessionId').val() || undefined
    var limit = $parent.find('.limit').val()
    limit = limit ? parseInt(limit) : undefined
    var $reverse = $parent.find('.reverse')
    var reverse = $reverse.prop('checked')
    nim.getLocalSessions({
      lastSessionId: lastSessionId,
      limit: limit,
      reverse: reverse,
      done: function (error, obj) {
        console.log('获取本地会话列表' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          onSessions(obj.sessions)
        }
      }
    })
  })
  $('#getLocalSession').on('click', function () {
    var $parent = $(this).parent()
    var sessionId = $parent.find('.sessionId').val() || undefined
    nim.getLocalSession({
      sessionId: sessionId,
      done: function (error, obj) {
        console.log('获取本地会话操作' + (!error ? '完成' : '失败'), error, obj)
      }
    })
  })
  $('#updateLocalSession').on('click', function () {
    var $parent = $(this).parent()
    var id = $parent.find('.id').val()
    var options = {
      id: id,
      done: function (error, obj) {
        console.log('更新本地会话' + (!error ? '成功' : '失败'), error, obj)
        onSessions(obj.session)
      }
    }
    var localCustom = $parent.find('.localCustom').val()
    if (localCustom) options.localCustom = localCustom
    if (localCustom === "''") options.localCustom = ''
    nim.updateLocalSession(options)
  })
  $('#deleteLocalSession').on('click', function () {
    var $parent = $(this).parent()
    var id = $parent.find('.id').val()
    nim.deleteLocalSession({
      id: id,
      done: function (error, obj) {
        console.log('删除本地会话' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          onDeleteSession(id)
        }
      }
    })
  })
  $('#deleteLocalSessions').on('click', function () {
    var $parent = $(this).parent()
    var ids = $parent.find('.id').val().split(regBlank)
    nim.deleteLocalSession({
      id: ids,
      done: function (error, obj) {
        console.log('删除本地会话' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          onDeleteSession(ids)
        }
      }
    })
  })
  $('#deleteSession').on('click', function () {
    var $parent = $(this).parent()
    var id = $parent.find('.id').val()
    id = id.split('-')
    nim.deleteSession({
      scene: id[0],
      to: id[1],
      done: function (error, obj) {
        console.log('删除服务器上的会话记录' + (!error ? '成功' : '失败'), error, obj)
      }
    })
  })
  $('#deleteSessions').on('click', function () {
    var $parent = $(this).parent()
    var ids = $parent.find('.id').val().split(regBlank)
    ids = ids.map(function (id) {
      id = id.split('-')
      return {
        scene: id[0],
        to: id[1]
      }
    })
    nim.deleteSessions({
      sessions: ids,
      done: function (error, obj) {
        console.log('批量删除服务器上的会话记录' + (!error ? '成功' : '失败'), error, obj)
      }
    })
  })
}
