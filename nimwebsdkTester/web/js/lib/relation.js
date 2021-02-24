function onBlacklist (blacklist) {
  // console.log('收到黑名单', blacklist)
  data.blacklist = nim.mergeRelations(data.blacklist, blacklist)
  data.blacklist = nim.cutRelations(data.blacklist, blacklist.invalid)
  refreshBlacklistUI()
}
function onMarkInBlacklist (obj) {
  console.log(obj.account + '被你' + (obj.isAdd ? '加入' : '移除') + '黑名单', obj)
  if (obj.isAdd) {
    addToBlacklist(obj)
  } else {
    removeFromBlacklist(obj)
  }
}
function addToBlacklist (obj) {
  data.blacklist = nim.mergeRelations(data.blacklist, obj.record)
  refreshBlacklistUI()
}
function removeFromBlacklist (obj) {
  data.blacklist = nim.cutRelations(data.blacklist, obj.record)
  refreshBlacklistUI()
}
function refreshBlacklistUI () {
  $('#blacklistNum').val(data.blacklist ? data.blacklist.length : 0)
  var $blacklist = $('#blacklist').empty()
  data.blacklist.forEach(function (item) {
    $blacklist.append($(buildRelationDomStr(item)))
  })
}
function onMutelist (mutelist) {
  // console.log('收到静音列表', mutelist)
  data.mutelist = nim.mergeRelations(data.mutelist, mutelist)
  data.mutelist = nim.cutRelations(data.mutelist, mutelist.invalid)
  refreshMutelistUI()
}
function onMarkInMutelist (obj) {
  console.log(obj.account + '被你' + (obj.isAdd ? '加入' : '移除') + '静音列表', obj)
  if (obj.isAdd) {
    addToMutelist(obj)
  } else {
    removeFromMutelist(obj)
  }
}
function addToMutelist (obj) {
  data.mutelist = nim.mergeRelations(data.mutelist, obj.record)
  refreshMutelistUI()
}
function removeFromMutelist (obj) {
  data.mutelist = nim.cutRelations(data.mutelist, obj.record)
  refreshMutelistUI()
}
function refreshMutelistUI () {
  $('#mutelistNum').val(data.mutelist ? data.mutelist.length : 0)
  var $mutelist = $('#mutelist').empty()
  data.mutelist.forEach(function (item) {
    $mutelist.append($(buildRelationDomStr(item)))
  })
}
function buildRelationDomStr (item) {
  var formDomStr = buildFieldsFormDomStr()
  return formDomStr[0] +
    buildFieldDomStr('account', item.account, '1-2') +
    buildFieldDomStr('updateTime', item.updateTime, '1-2') +
    formDomStr[1]
}

function initRelationEvent () {
  $('#addToBlacklist').on('click', function () {
    var account = $(this).parent().find('.account').val()
    nim.addToBlacklist({
      account: account,
      done: function (error, obj) {
        console.log('加入黑名单' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          addToBlacklist(obj)
        }
      }
    })
  })
  $('#removeFromBlacklist').on('click', function () {
    var account = $(this).parent().find('.account').val()
    nim.removeFromBlacklist({
      account: account,
      done: function (error, obj) {
        console.log('从黑名单移除' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          removeFromBlacklist(obj)
        }
      }
    })
  })
  $('#addToMutelist').on('click', function () {
    var account = $(this).parent().find('.account').val()
    nim.addToMutelist({
      account: account,
      done: function (error, obj) {
        console.log('加入静音列表' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          addToMutelist(obj)
        }
      }
    })
  })
  $('#removeFromMutelist').on('click', function () {
    var account = $(this).parent().find('.account').val()
    nim.removeFromMutelist({
      account: account,
      done: function (error, obj) {
        console.log('从静音列表移除' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          removeFromMutelist(obj)
        }
      }
    })
  })
  $('#getRelations').on('click', function () {
    nim.getRelations({
      done: function (error, obj) {
        console.log('获取黑名单和静音列表' + (!error ? '成功' : '失败'), error, obj)
        if (!error) {
          onBlacklist(obj.blacklist)
          onMutelist(obj.mutelist)
        }
      }
    })
  })
}
