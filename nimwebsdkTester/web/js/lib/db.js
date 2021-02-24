function initDBEvent () {
  $('#supportDB').on('click', checkSupportDB)
  $('#clearDB').on('click', clearDB)
}

function checkSupportDB () {
  alert(NIM.support.db)
}

function clearDB () {
  nim.clearDB({
    done: function (error) {
      console.log('清空数据库' + (!error ? '成功' : '失败'), error)
    }
  })
}
