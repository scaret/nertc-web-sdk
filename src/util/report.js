const ajax = require('utiljs/ajax');
const platform = require('platform')

const reportErrEventUrl = 'https://statistic.live.126.net/statics/report/common/form'
const localKey = 'nimErrEvent'

const Report = {
  reportErrEventUrl,
  localKey,
}

// 上报错误信息到统计平台，一般在登录后触发 统一上报
// params.appKey
// params.sdk_ver
// params.deviceId
Report.reportErrEvent = function (params) {
  try {
    var data = localStorage.getItem(localKey)
    if (!data) return
    data = JSON.parse(data)
    var arrData = []
    Object.keys(data).forEach(key => {
      arrData.push(data[key])
    })
    var deviceinfo = {
      app_key: params.appKey,
      sdk_ver: params.sdk_ver,
      platform: 'Web',
      os_ver: platform.os.family + ' ' + platform.os.version,
      manufacturer: platform.manufacturer,
      model: platform.name,
    }

    ajax(reportErrEventUrl, {
      method: 'POST',
      timeout: 2000,
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        common: {
          device_id: params.deviceId,
          sdk_type: 'IM'
        },
        event: {
          logReport: arrData,
          deviceinfo,
        }
      }),
      onload: () => {
        // 上报成功后 删除本地数据
        localStorage.removeItem(localKey)
      },
      onerror: (e) => {}
    })
  } catch (e) {
    // console.error(e)
    // console.log('no localStrorage')
  }
}

// 将错误信息存储到本地
Report.saveErrEvent = function (params = {}) {
  if (!params.code || !params.module) return
  try {
    var data = localStorage.getItem(localKey) || "{}"
    data = JSON.parse(data)
    var key = params.code + params.module + params.accid
    if (data[key]) {
      data[key].count++
    } else {
      data[key] = {
        errorCode: params.code,
        module: params.module,
        accid: params.accid,
        timestamp: new Date().getTime(),
        count: 1
      }
    }
    localStorage.setItem(localKey, JSON.stringify(data))
  } catch (e) {
    // console.error(e)
  }
}

module.exports = Report