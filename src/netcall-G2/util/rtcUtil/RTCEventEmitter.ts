import { EventEmitter } from 'eventemitter3'

export class RTCEventEmitter extends EventEmitter {
  _events: {
    [eventName: string]: any
  }
  constructor() {
    super()
    // @ts-ignore
    if (!this._events) {
      this._events = {}
    }
  }
  safeEmit(eventName: string, ...args: any[]) {
    // 所有抛出事件请使用这个函数。
    // 内部事件名请加@
    // 外部事件会先抛出名字前加@的同名事件。内部如要监听该事件的，则通过 client.addListener("@stream-added")，以避免与用户事件混淆
    try {
      if (!eventName.match(/^@/)) {
        this.emit(`@${eventName}`, ...args)
      }
      this.emit(eventName, ...args)
    } catch (e: any) {
      // @ts-ignore
      ;(this.logger || console).error(
        `Error on event ${eventName}: ${e.name} ${e.message}`,
        e.stack
      )
    }
  }
}
