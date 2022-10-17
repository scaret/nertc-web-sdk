import { LocalStream, LocalStreamCloseOptions, LocalStreamOpenOptions } from '../api/localStream'
import { Client, ILogger, JoinOptions } from '../types'
import { makePrintable } from './rtcUtil/utils'

type OperationArgs =
  | {
      caller: Client
      method: 'join'
      options: JoinOptions
    }
  | {
      caller: Client
      method: 'leave'
      options: null
    }
  | {
      caller: Client
      method: 'publish'
      options: LocalStream
    }
  | {
      caller: Client
      method: 'unpublish'
      options: null
    }
  | {
      caller: Client
      method: 'destroy'
      options: null
    }
  | {
      caller: LocalStream
      method: 'open'
      options: LocalStreamOpenOptions
    }
  | {
      caller: LocalStream
      method: 'close'
      options: LocalStreamCloseOptions
    }
  | {
      caller: LocalStream
      method: 'init'
      options: null
    }

interface QueueElem {
  id: number
  enqueueTs: number
  startTs?: number
  args: OperationArgs
  resolve: any
  reject: any
  status: 'pending' | 'live' | 'finished' | 'timeout'
}

type callMeWhenFinished = () => void

export class OperationQueue {
  cnt = 0
  current: QueueElem | null = null
  history: QueueElem | null = null
  queue: QueueElem[] = []
  logger: ILogger
  constructor(logger: ILogger) {
    this.logger = logger.getChild(() => {
      let tag = 'oper'
      if (this.current) {
        tag += ` ${this.current.args.method}#${this.current.id}`
      } else if (this.history) {
        tag += ` ${this.history.args.method}#${this.history.id} FINISHED`
      }
      this.queue.forEach((queueElem) => {
        tag += `|${queueElem.args.method}#${queueElem.id}`
      })
      return tag
    })
    setInterval(() => {
      if (this.current && Date.now() - this.current.enqueueTs > 5000) {
        if (this.queue.length) {
          const nextElem = this.queue[0]
          this.logger.error(
            `当前操作已执行了${Date.now() - this.current.enqueueTs}ms，放开锁限制：${
              this.current.args.method
            }#${this.current.id}。即将进行下一个操作：${nextElem.args.method}#${nextElem.id}`
          )
        } else {
          this.logger.log(
            `当前操作已执行了${Date.now() - this.current.enqueueTs}ms，放开锁限制：${
              this.current.args.method
            }#${this.current.id}`
          )
        }
        this.current.status = 'timeout'
        this.history = this.current
        this.current = null
        this.fire('timer')
      }
    }, 5000)
  }
  enqueue(args: OperationArgs): Promise<callMeWhenFinished> {
    return new Promise((resolve, reject) => {
      // await enqueue操作会卡住所有join/leave操作。
      // resolve被调用时代表继续执行下面的操作。
      // reject被调用时代表下面的操作被取消。目前没有操作被取消的行为。
      this.queue.push({
        id: ++this.cnt,
        enqueueTs: Date.now(),
        args,
        resolve,
        reject,
        status: 'pending'
      })
      if (!this.current) {
        this.fire('instant')
      } else {
        this.logger.log(
          `操作等位中，目前有其他操作。前面还有${this.queue.length}位：${args.method}#${this.cnt}。`
        )
      }
    })
  }
  private fire(source: 'instant' | 'functionEnd' | 'timer') {
    if (!this.current) {
      const elem = this.queue.shift()
      if (elem) {
        this.history = this.current
        this.current = elem
        this.current.status = 'live'
        if (source === 'instant') {
          //this.logger.log(`开始执行操作：${elem.args.method}。参数：`, makePrintable(elem.args.options, 1))
          this.logger.log(`开始执行操作：${elem.args.method}`)
        } else {
          this.logger.log(
            `开始执行队列中的操作：${elem.args.method}#${elem.id}，等待时间：${
              Date.now() - elem.enqueueTs
            }ms。`
          )
        }
        elem.startTs = Date.now()
        elem.resolve(() => {
          if (this.current === elem) {
            this.current.status = 'finished'
            this.history = this.current
            this.current = null
            this.logger.log(
              `执行操作结束：${elem.args.method}。花费 ${
                elem.startTs ? Date.now() - elem.startTs : null
              }ms`
            )
            this.fire('functionEnd')
          } else {
            if (elem.status === 'timeout') {
              this.logger.log(
                `执行操作结束：${elem.args.method}。花费 ${
                  elem.startTs ? Date.now() - elem.startTs : null
                }ms。该操作超时，但未阻塞执行队列。`
              )
            } else {
              this.logger.error(
                `操作收到多次返回：${elem.args.method}#${elem.id}。花费 ${
                  elem.startTs ? Date.now() - elem.startTs : null
                }ms`
              )
            }
          }
        })
      }
    }
  }
}
