;(function () {
  const intervalIds = {}
  const timeoutIds = {}

  // 监听message 开始执行定时器或者销毁
  self.onmessage = function onMsgFunc(e) {
    switch (e.data.command) {
      case 'interval:start': // 开启定时器
        const intervalId = setInterval(function () {
          postMessage({
            message: 'interval:tick',
            id: e.data.id
          })
        }, e.data.interval)

        postMessage({
          message: 'interval:started',
          id: e.data.id
        })

        intervalIds[e.data.id] = intervalId
        break
      case 'interval:clear': // 销毁
        clearInterval(intervalIds[e.data.id])

        postMessage({
          message: 'interval:cleared',
          id: e.data.id
        })

        delete intervalIds[e.data.id]
        break

      case 'timeout:start': // 开启定时器
        const timeoutId = this.setTimeout(function () {
          postMessage({
            message: 'timeout:tick',
            id: e.data.id
          })
        }, e.data.timeout)

        postMessage({
          message: 'timeout:started',
          id: e.data.id
        })

        timeoutIds[e.data.id] = timeoutId
        break
      case 'timeout:clear': // 销毁
        clearTimeout(timeoutIds[e.data.id])

        postMessage({
          message: 'timeout:cleared',
          id: e.data.id
        })

        delete timeoutIds[e.data.id]
        break
    }
  }
})()
