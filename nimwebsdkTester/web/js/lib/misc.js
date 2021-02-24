
function initMiscEvent () {
  $('#packFileDownloadName').on('click', function () {
    var $parent = $(this).parent()
    var url = $parent.find('.url').val()
    var name = $parent.find('.name').val()
    url = nim.packFileDownloadName({
      url: url,
      name: name
    })
    $('#packFileDownloadNameUrl').attr({
      href: url
    })
  })

  $('#audioToMp3').on('click', function () {
    var $parent = $(this).parent()
    var url = $parent.find('.url').val()
    url = nim.audioToMp3({
      url: url
    })
    $('#audioToMp3Url').attr({
      href: url
    })
  })

  $('#audioToText').on('click', function () {
    var $parent = $(this).parent()
    var url = $parent.find('.url').val()
    nim.audioToText({
      url: url,
      done: function (error, obj) {
        console.log('语音转文字' + (!error ? '成功' : '失败'), error, obj)
      }
    })
  })

  $('#callLimit').on('click', function () {
    var $parent = $(this).parent()
    var url = $parent.find('.url').val()
    // 此接口正常频控是 60 次
    var counter = 60 + 20

    while (counter > 0) {
      console.log('calling audioToText')
      nim.audioToText({
        url: url,
        done: function (error, obj) {
          console.log('语音转文字' + (!error ? '成功' : '失败'), error, obj)
        }
      })
      counter--
    }
  })

  $('#shortToOriginUrl').on('click', function () {
    var $parent = $(this).parent()
    var url = $parent.find('.url').val()
    nim.getNosOriginUrl({
      safeShortUrl: url,
      done: function (error, url) {
        console.log('Nos安全短链替换' + (!error ? '成功' : '失败'), error, url)
        $('#resOriginUrl').html(url)
        $('#resOriginUrl').attr('href', url)
      }
    })
  })

}
