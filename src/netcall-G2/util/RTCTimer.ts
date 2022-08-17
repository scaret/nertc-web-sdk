import { getBlobUrl } from '../module/blobs/getBlobUrl'

export interface OfflineTimerOptions {
  from: {
    native: boolean
    webAudio: boolean
    worker: boolean
  }
  minInterval: number
}

export type SOURCES = 'native' | 'worker' | 'webAudio'

export interface OfflineTimer {
  id: number
  handler: () => any
  interval: number
  lastCalledAt: number
  cnt: number
  cntMax: number
}

class RTCTimer {
  options: OfflineTimerOptions
  history: { source: SOURCES; ts: number }[] = []
  timers: (OfflineTimer | undefined)[] = [undefined]
  nativeTimer: any
  private worker: Worker | null = null
  constructor(
    options: OfflineTimerOptions = {
      from: {
        native: true,
        worker: true,
        webAudio: true
      },
      minInterval: 8
    }
  ) {
    this.options = options
    const trigger = (source: SOURCES) => {
      const now = {
        source,
        ts: Date.now()
      }
      const lastItem = this.history[this.history.length - 1]

      if (lastItem && now.ts - lastItem.ts < this.options.minInterval) {
        return
      }
      this.history.push(now)
      if (this.history.length > 1000) {
        this.history.shift()
      }
      for (let i = 0; i < this.timers.length; i++) {
        const timer = this.timers[i]
        if (!timer) {
          continue
        } else if (timer.cntMax <= timer.cnt) {
          continue
        } else if (now.ts - timer.lastCalledAt < timer.interval - 1) {
          continue
        } else {
          timer.cnt++
          timer.lastCalledAt = now.ts
          try {
            timer.handler()
          } catch (e) {
            console.error(e)
          }
        }
      }
    }

    if (options.from.native) {
      this.nativeTimer = setInterval(() => {
        trigger('native')
      }, this.options.minInterval)
    }
    if (options.from.worker && typeof Worker !== undefined) {
      this.worker = new Worker(getBlobUrl('rtcTimer'))
      this.worker.onmessage = () => {
        trigger('worker')
      }
    }
  }
  setInterval(handler: () => any, interval: number) {
    const timer: OfflineTimer = {
      handler,
      id: this.timers.length,
      interval,
      lastCalledAt: Date.now(),
      cnt: 0,
      cntMax: Number.MAX_SAFE_INTEGER
    }
    this.timers.push(timer)
    return timer.id
  }
  clearInterval(timerId: number | null) {
    if (!timerId) {
      return
    }
    const timer = this.timers[timerId]
    if (!timer) {
      return
    } else if (timer.id !== timerId) {
      console.error('timer错位', timerId, timer)
      return
    } else {
      delete this.timers[timerId]
    }
  }
}

let rtcTimer: RTCTimer | null = null

export function getRTCTimer() {
  if (!rtcTimer) {
    rtcTimer = new RTCTimer()
  }
  return rtcTimer
}

let start = Date.now()
const tongji = () => {
  const now = Date.now()
  const history = getRTCTimer().history.filter((item) => {
    //只统计3秒内的
    return now - item.ts < 3000
  })
  if (history.length < 2) {
    console.error('没有历史记录')
    return
  }
  if (now - start > 3000) {
    let text = `统计间隔：${now - start}毫秒。距离上一次：${
      now - history[history.length - 2].ts
    }毫秒。`
    text += `fps：${Math.floor((history.length * 1000) / (now - history[0].ts))}。`
    text += `native: ${history.filter((item) => item.source === 'native').length}。`
    text += `worker: ${history.filter((item) => item.source === 'worker').length}。`
    text += `webAudio: ${history.filter((item) => item.source === 'webAudio').length}。`
    start = now
    console.log(text)
  }
}

// rtcTimer.setInterval(tongji, 3000)
