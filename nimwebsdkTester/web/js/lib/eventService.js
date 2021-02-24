// 发布事件
$('#publish-event').on('click', function () {
  var $parent = $(this).parent().parent()
  var type = $parent.find('.event-type').val()
  var value = $parent.find('.event-value').val()
  var custom = $parent.find('.custom').val()
  var validTime = $parent.find('.valid-time').val()
  var broadcastType = $parent.find('.broadcast-type').val()
  var sync = $parent.find('.sync').get(0).checked
  nim.publishEvent({
    type: +type,
    value: +value,
    custom: custom,
    validTime: +validTime,
    broadcastType: +broadcastType,
    sync: Boolean(sync),
    done: function (error, obj) {
      console.log('发布事件' + (!error?'成功':'失败'), error, obj);
    }
  })
})

// 订阅事件
$('#subscribe-event').on('click', function () {
  var $parent = $(this).parent().parent()
  var type = $parent.find('.event-type').val()
  var accounts = $parent.find('.accounts').val()
  accounts = accounts.split(/\s*,\s*/)
  var subscribeTime = $parent.find('.subscribeTime').val()
  var sync = $parent.find('.sync').get(0).checked
  nim.subscribeEvent({
    type: +type,
    accounts: accounts,
    subscribeTime: +subscribeTime,
    sync: Boolean(sync),
    done: function (error, obj) {
      console.log('订阅事件' + (!error?'成功':'失败'), error, obj);
    }
  })
})

// 按账号取消指定事件的订阅关系
$('#unSubscribeEventsByAccounts').on('click', function () {
  var $parent = $(this).parent().parent()
  var type = $parent.find('.event-type').val()
  var accounts = $parent.find('.accounts').val()
  accounts = accounts.split(/\s*,\s*/)
  nim.unSubscribeEventsByAccounts({
    type: +type,
    accounts: accounts,
    done: function (error, obj) {
      console.log('取消订阅事件' + (!error?'成功':'失败'), error, obj);
    }
  })
})

// 取消指定事件的全部订阅关系
$('#unSubscribeEventsByType').on('click', function () {
  var $parent = $(this).parent().parent()
  var type = $parent.find('.event-type').val()
  nim.unSubscribeEventsByType({
    type: +type,
    done: function (error, obj) {
      console.log('取消订阅事件' + (!error?'成功':'失败'), error, obj);
    }
  })
})

// 按账号查询指定事件的订阅关系
$('#querySubscribeEventsByAccounts').on('click', function () {
  var $parent = $(this).parent().parent()
  var type = $parent.find('.event-type').val()
  var accounts = $parent.find('.accounts').val()
  accounts = accounts.split(/\s*,\s*/)
  nim.querySubscribeEventsByAccounts({
    type: +type,
    accounts: accounts,
    done: function (error, obj) {
      console.log('查询订阅事件' + (!error?'成功':'失败'), error, obj);
    }
  })
})

// 查询指定事件的全部订阅关系
$('#querySubscribeEventsByType').on('click', function () {
  var $parent = $(this).parent().parent()
  var type = $parent.find('.event-type').val()
  nim.querySubscribeEventsByType({
    type: +type,
    done: function (error, obj) {
      console.log('查询订阅事件' + (!error?'成功':'失败'), error, obj);
    }
  })
})

function onPushEvents (obj) {
  console.info('服务器下推事件:', obj)
}
