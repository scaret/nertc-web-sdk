
var nims = {}
var nim

/* exported initConnectEvent */
function initConnectEvent () {
  $('#account').on('keypress', function (event) {
    switch (event.which) {
      case 13:
        connect()
        break
    }
  })
  $('#connect').on('click', connect)
  $('#setOptions').on('click', setOptions)
  $('#disconnect').on('click', disconnect)
  $('#logout').on('click', logout)
}

function connect () {
  var account = $('#account').val()
  if (window.nim) {
   nim.connect()
   return
  }
  disableUI()
  window.nim = NIM.getInstance(assembleOptions())

  // setTimeout(function () {
  //   console.log(22222222222222222)
  //   var option2 = assembleOptions()
  //   option2.account = 'greatcs2'
  //   window.nim2 = NIM.getInstance(option2)
  // }, 5000)
}

function assembleOptions () {
  data.appKey = $('#appKey').val()
  data.account = $('#account').val()
  data.token = $('#token').val()
  data.customTag = $('#customTag').val()
  var options = {
    // 初始化SDK
    appKey: data.appKey,
    account: data.account,
    token: data.token,
    customTag: data.customTag,
    onconnect: onConnect,
    onwillreconnect: willReconnect,
    ondisconnect: onDisconnect,
    onerror: onError,
    // 多端
    /* global onLoginPortsChange */
    onloginportschange: onLoginPortsChange,
    // 用户关系
    /* global onBlacklist */
    onblacklist: onBlacklist,
    /* global onMarkInBlacklist */
    onsyncmarkinblacklist: onMarkInBlacklist,
    /* global onMutelist */
    onmutelist: onMutelist,
    /* global onMarkInMutelist */
    onsyncmarkinmutelist: onMarkInMutelist,
    // 好友关系
    /* global onFriends */
    onfriends: onFriends,
    onrobots: onRobots,
    /* global onSyncFriendAction */
    onsyncfriendaction: onSyncFriendAction,
    // 用户名片
    /* global onMyInfo */
    onmyinfo: onMyInfo,
    /* global onUpdateMyInfo */
    onupdatemyinfo: onUpdateMyInfo,
    /* global onUsers */
    onusers: onUsers,
    /* global onUpdateUser */
    onupdateuser: onUpdateUser,
    // 群组
    /* global onTeams */
    onteams: onTeams,
    /* global onCreateTeam */
    onsynccreateteam: onCreateTeam,
    /* global onTeamMembers */
    onteammembers: onTeamMembers,
    /* global onSyncTeamMembersDone */
    onsyncteammembersdone: onSyncTeamMembersDone,
    /* global onUpdateTeamMember */
    onupdateteammember: onUpdateTeamMember,
    onUpdateTeam: onTeams,
    onCreateTeam: onCreateTeam,
    onAddTeamMembers: onAddTeamMembers,
    onRemoveTeamMembers: onRemoveTeamMembers,
    onUpdateTeamManagers: onUpdateTeamManagers,
    onDismissTeam: onDismissTeam,
    onTransferTeam: onTransferTeam,
    onTeamMsgReceipt: onTeamMsgReceipt,
    // 超大群
    onSuperTeams: onSuperTeams,
    onSyncCreateSuperTeam: onSyncCreateSuperTeam,
    onUpdateSuperTeamMember: onUpdateSuperTeamMember,
    onDismissSuperTeam: onDismissSuperTeam,
    onAddSuperTeamMembers: onAddSuperTeamMembers,
    onRemoveSuperTeamMembers: onRemoveSuperTeamMembers,
    onUpdateSuperTeam: onUpdateSuperTeam,

    // 会话
    /* global onSessions */
    onsessions: onSessions,
    /* global onUpdateSession */
    onupdatesession: onUpdateSession,
    // 消息
    /* global onRoamingMsgs */
    onroamingmsgs: onRoamingMsgs,
    /* global onOfflineMsgs */
    onofflinemsgs: onOfflineMsgs,
    /* global onOfflineFilterMsgs */
    onofflinefiltermsgs: onOfflineFilterMsgs,
    /* global onMsg */
    onmsg: onMsg,
    // 系统通知
    /* global onOfflineSysMsgs */
    onofflinesysmsgs: onOfflineSysMsgs,
    /* global onOfflineCustomSysMsgs */
    onofflinecustomsysmsgs: onOfflineCustomSysMsgs,
    /* global onSysMsg */
    onsysmsg: onSysMsg,
    onbroadcastmsg: onBroadcastMsg,
    onbroadcastmsgs: onBroadcastMsgs,
    /* global onCustomSysMsg */
    oncustomsysmsg: onCustomSysMsg,
    /* global onUpdateSysMsg */
    onupdatesysmsg: onUpdateSysMsg,
    /* global onSysMsgUnread */
    onsysmsgunread: onSysMsgUnread,
    /* global onUpdateSysMsgUnread */
    onupdatesysmsgunread: onUpdateSysMsgUnread,
    /* global onOfflineFilterSysMsgs */
    onofflinefiltersysmsgs: onOfflineFilterSysMsgs,
    /* global onOfflineFilterCustomSysMsgs */
    onofflinefiltercustomsysmsgs: onOfflineFilterCustomSysMsgs,
    /* global onPushEvents */
    onpushevents: onPushEvents,
    // 同步完成
    onsyncdone: onSyncDone,
    // 数据源
    dataSource: {
      getUser: function (account) {
        return nim.findUser(data.users, account)
      },
      getSession: function (sessionId) {
        return nim.findSession(data.sessions, sessionId)
      },
      getMsg: function (msg) {
        return nim.findMsg(data.msgs && data.msgs[msg.sessionId], msg.idClient)
      },
      getSysMsg: function (sysMsg) {
        return nim.findSysMsg(data.sysMsgs, sysMsg.idServer)
      }
    },
  }
  // 独立音视频信令通知，测试IE时，不支持语法
  if (typeof onSignalingNotify != 'undefined') {
    options.onSignalingNotify = onSignalingNotify
    options.onSignalingMutilClientSyncNotify = onSignalingMutilClientSyncNotify
    options.onSignalingUnreadMessageSyncNotify = onSignalingUnreadMessageSyncNotify
    options.onSignalingMembersSyncNotify = onSignalingMembersSyncNotify
  }
  // lbsUrl
  var lbsUrl = $('#lbsUrl').val()
  if (lbsUrl) {
    options.lbsUrl = lbsUrl
  }
  // defaultLinkUrl
  var defaultLinkUrl = $('#defaultLinkUrl').val()
  if (defaultLinkUrl) {
    options.defaultLinkUrl = defaultLinkUrl
  }
  var replaceUrl = $('#replaceUrl').val()
  if (replaceUrl) {
    options.replaceUrl = replaceUrl
  }
  var uploadUrl = $('#uploadUrl').val()
  if (uploadUrl) {
    options.uploadUrl = uploadUrl
  }
  // options.ntServerAddress = null
  // downloadHost
  var downloadHost = $('#downloadHost').val()
  if (downloadHost) {
    options.downloadHost = downloadHost
  }

  var downloadUrl = $('#downloadUrl').val()
  if (downloadUrl) {
    options.downloadUrl = downloadUrl
  }
  // nos
  var nosScene = $('#nosScene').val()
  if(nosScene) {
    options.nosScene = nosScene
  }
  var nosSurvivalTime = $('#nosSurvivalTime').val()
  var nosSurvivalTimeMax = $('#nosSurvivalTimeMax:checked').val()
  if (nosSurvivalTimeMax) {
    options.nosSurvivalTime = Infinity
  }else if(nosSurvivalTime) {
    options.nosSurvivalTime = parseInt(nosSurvivalTime,10)
  }
  // db
  var db = $('#db').prop('checked')
  options.db = db
  // db
  var promise = $('#promise').prop('checked')
  options.promise = promise
  // debug
  var debug = $('#debug').prop('checked')
  if (debug) {
    var style = $('#debugStyle').val()
    if (style) {
      debug = { style: style }
    }
    // options.logFunc = new NIM.LoggerPlugin({
    //   url: '/getlogger',
    //   level: 'info'
    // })
  }
  var enabledHttpsForMessage = $('#enabledHttpsForMessage').prop('checked')
  if (enabledHttpsForMessage) {
    options.enabledHttpsForMessage = true
  }
  options.debug = debug
  // appendAppKeyForDBName
  options.appendAppKeyForDBName = $('#appendAppKeyForDBName').prop('checked')

  var noCacheLinkUrl = $('#noCacheLinkUrl').prop('checked')
  options.noCacheLinkUrl = noCacheLinkUrl
  // needReconnect
  var needReconnect = $('#needReconnect').prop('checked')
  options.needReconnect = needReconnect
  // reconnectionAttempts
  var reconnectionAttempts = $('#reconnectionAttempts').val()
  if (reconnectionAttempts) {
    options.reconnectionAttempts = +reconnectionAttempts
  }
  // syncRelations
  var syncRelations = $('#syncRelations').prop('checked')
  options.syncRelations = syncRelations
  // syncFriends
  var syncFriends = $('#syncFriends').prop('checked')
  options.syncFriends = syncFriends
  // syncFriendUsers
  var syncFriendUsers = $('#syncFriendUsers').prop('checked')
  options.syncFriendUsers = syncFriendUsers
  // syncRobots
  var syncRobots = $('#syncRobots').prop('checked')
  options.syncRobots = syncRobots
  // syncTeams
  var syncTeams = $('#syncTeams').prop('checked')
  options.syncTeams = syncTeams
  var syncSuperTeams = $('#syncSuperTeams').prop('checked')
  options.syncSuperTeams = syncSuperTeams
  // syncRoamingMsgs
  var syncRoamingMsgs = $('#syncRoamingMsgs').prop('checked')
  options.syncRoamingMsgs = syncRoamingMsgs
  var syncSuperTeamRoamingMsgs = $('#syncSuperTeamRoamingMsgs').prop('checked')
  options.syncSuperTeamRoamingMsgs = syncSuperTeamRoamingMsgs
  // syncTeamMembers
  var syncTeamMembers = $('#syncTeamMembers').prop('checked')
  options.syncTeamMembers = syncTeamMembers
  // syncExtraTeamInfo
  var syncExtraTeamInfo = $('#syncExtraTeamInfo').prop('checked')
  options.syncExtraTeamInfo = syncExtraTeamInfo
  // syncExtraTeamInfo
  var syncSessionUnread = $('#syncSessionUnread').prop('checked')
  options.syncSessionUnread = syncSessionUnread
  // syncFilter
  var syncFilter = $('#syncFilter').prop('checked')
  options.syncFilter = syncFilter
  // syncBroadcastMsgs
  var syncBroadcastMsgs = $('#syncBroadcastMsgs').prop('checked')
  options.syncBroadcastMsgs = syncBroadcastMsgs
  // autoMarkRead
  var autoMarkRead = $('#autoMarkRead').prop('checked')
  options.autoMarkRead = autoMarkRead
  // shouldIgnoreNotification
  var shouldIgnoreNotification = $('#shouldIgnoreNotification').prop('checked')
  if (shouldIgnoreNotification) {
    options.shouldIgnoreNotification = function () {
      return true
    }
  }
  var shouldCountNotifyUnread = $('#shouldCountNotifyUnread').prop('checked')
  if (shouldCountNotifyUnread) {
    options.shouldCountNotifyUnread = function () {
      return true
    }
  }
  // keepNosSafeUrl
  var keepNosSafeUrl = $('#keepNosSafeUrl').prop('checked')
  if (keepNosSafeUrl) {
    options.keepNosSafeUrl = keepNosSafeUrl
  }
  var rollbackDelMsgUnread = $('#rollbackDelMsgUnread').prop('checked')
  if (rollbackDelMsgUnread) {
    options.rollbackDelMsgUnread = rollbackDelMsgUnread
  }
  return options
}

function onConnect (obj) {
  data.onConnectDate = new Date()
  document.title = data.account
  $('#socketTransport').val(nim.protocol.socket.socket.transport.name)
  $('#connect').addClass('f-dn')
  $('#disconnect')
    .removeClass('f-dn')
    .removeAttr('disabled')
  $('#logout')
    .removeClass('f-dn')
    .removeAttr('disabled')
}

function setOptions () {
  var account = $('#account').val()
  nim = nims[account]
  if (nim) {
    nim.setOptions(assembleOptions())
    $('#setOptions').addClass('f-dn')
  } else {
    console.log('未找到此账号对应的 NIM 实例')
  }
}

function disconnect () {
  $('#disconnect').attr('disabled', 'disabled')
  nim.disconnect()
}

function willReconnect (obj) {
  console.log('即将重连', obj)
}

function onDisconnect (error) {
  console.log('连接断开', error)
  if (error) {
    switch (error.code) {
      // 账号或者密码错误
      case 302:
        $('#setOptions')
          .removeClass('f-dn')
          .removeAttr('disabled')
        reset()
        break
      // 被踢
      case 'kicked':
        console.error('DD kicked...', error)
        break
      default:
        console.error('DD disconnected...', error)
        break
    }
  }
  $('#disconnect').addClass('f-dn')
  $('#connect')
    .removeClass('f-dn')
    .removeAttr('disabled')
}

function onError (error, obj) {
  console.error('发生错误' + ' ' + error.code + ' ' + error.message, error, obj)
}

function logout () {
  // 清除实例
  nim.destroy({
    done: function (err) {
      nim = null
      console.log('实例已被完全清除')
    }
  })
  reset()
}

function reset () {
  data = {}
  $('#logout').addClass('f-dn')
  $('#disconnect').addClass('f-dn')
  $('#connect')
    .removeClass('f-dn')
    .removeAttr('disabled')
  $('#appKey').removeAttr('disabled')
  $('#token').removeAttr('disabled')
  $('#account').removeAttr('disabled')
  $('#customTag').removeAttr('disabled')
}

function disableUI () {
  $('#connect').attr('disabled', 'disabled')
  $('#disconnect').attr('disabled', 'disabled')
  $('#logout').attr('disabled', 'disabled')
  $('#appKey').attr('disabled', 'disabled')
  $('#token').attr('disabled', 'disabled')
  $('#account').attr('disabled', 'disabled')
  $('#customTag').attr('disabled', 'disabled')
}

function onSyncDone () {
  var date = new Date()
  console.log(date - data.onConnectDate + ' ms同步完成')
}
