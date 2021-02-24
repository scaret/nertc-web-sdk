
function onMyInfo (user) {
  // console.log('收到我的名片', user)
  data.myInfo = user
  updateMyInfoUI()
  onUsers(user)
}
function onUpdateMyInfo (user) {
  console.log('我的名片更新了', user)
  data.myInfo = NIM.util.merge(data.myInfo, user)
  updateMyInfoUI()
}
function updateMyInfoUI () {
  var user = data.myInfo
  $('#myInfo').html(buildUserDomStr(user))
}
function onUsers (users) {
  // console.log('收到用户名片列表', users)
  data.users = nim.mergeUsers(data.users, users)
  refreshUsersUI()
}
function onUpdateUser (user) {
  console.log('用户名片更新了', user)
  data.users = nim.mergeUsers(data.users, user)
  refreshUsersUI()
}
function refreshUsersUI () {
  $('#usersNum').val(data.users ? data.users.length : 0)
  var $users = $('#users').empty()
  data.users.forEach(function (user) {
    $users.append($(buildUserDomStr(user)))
  })
}
function buildUserDomStr (user) {
  var formDomStr = buildFieldsFormDomStr()
  return formDomStr[0] +
    buildFieldDomStr('account', user.account, '1-6') +
    buildFieldDomStr('nick', user.nick, '1-6') +
    buildLinkFieldDomStr('avatar', user.avatar, '1-6') +
    buildFieldDomStr('sign', user.sign, '1-6') +
    buildFieldDomStr('gender', user.gender, '1-6') +
    buildFieldDomStr('email', user.email, '1-6') +
    buildFieldDomStr('birth', user.birth, '1-6') +
    buildFieldDomStr('tel', user.tel, '1-6') +
    buildFieldDomStr('custom', user.custom, '1-6') +
    buildFieldDomStr('createTime', user.createTime, '1-6') +
    buildFieldDomStr('updateTime', user.updateTime, '1-6') +
    formDomStr[1]
}

function initUserEvent () {
  $('#updateMyInfo').on('click', function () {
    var options = {
      done: function (error, obj) {
        console.log('更新我的信息' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          onUpdateMyInfo(obj)
          onUsers(obj)
        }
      }
    }
    var $parent = $(this).parent().parent()
    var updateNick = $parent.find('.updateNick').prop('checked')
    if (updateNick) {
      options.nick = $parent.find('.nick').val()
    }
    var updateAvatar = $parent.find('.updateAvatar').prop('checked')
    if (updateAvatar) {
      options.avatar = $parent.find('.avatar').val()
    }
    var updateSign = $parent.find('.updateSign').prop('checked')
    if (updateSign) {
      options.sign = $parent.find('.sign').val()
    }
    var updateGender = $parent.find('.updateGender').prop('checked')
    if (updateGender) {
      options.gender = $parent.find('.gender').val()
    }
    var updateEmail = $parent.find('.updateEmail').prop('checked')
    if (updateEmail) {
      options.email = $parent.find('.email').val()
    }
    var updateBirth = $parent.find('.updateBirth').prop('checked')
    if (updateBirth) {
      options.birth = $parent.find('.birth').val()
    }
    var updateTel = $parent.find('.updateTel').prop('checked')
    if (updateTel) {
      options.tel = $parent.find('.tel').val()
    }
    var updateCustom = $parent.find('.updateCustom').prop('checked')
    if (updateCustom) {
      options.custom = $parent.find('.custom').val()
    }
    nim.updateMyInfo(options)
  })
  $('#getUser').on('click', function () {
    var $parent = $(this).parent()
    var account = $parent.find('.account').val()
    var sync = $parent.find('.sync').prop('checked')
    nim.getUser({
      account: account,
      sync: sync,
      done: function (error, user) {
        console.log('获取用户名片' + (!error ? '成功' : '失败'), error, user)
        if (!error && user) {
          onUsers(user)
        }
      }
    })
  })
  $('#getUsers').on('click', function () {
    var $parent = $(this).parent()
    var accounts = $parent.find('.account').val().split(regBlank)
    var sync = $parent.find('.sync').prop('checked')
    nim.getUsers({
      accounts: accounts,
      sync: sync,
      done: function (error, users) {
        console.log('获取用户名片列表' + (!error ? '成功' : '失败'), error, users)
        if (!error && users.length) {
          onUsers(users)
        }
      }
    })
  })
}
