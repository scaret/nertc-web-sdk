import * as loglevel from 'loglevel'

export default class Log {
  private uid_: any
  private type_: any
  constructor(options: any) {
    this.uid_ = options.uid
    this.type_ = options.type
  }

  trace(message: any) {
    loglevel.trace(message)
  }

  debug(message: any) {
    loglevel.debug(message)
  }

  info(message: any) {
    loglevel.info(message)
  }

  warn(message: any) {
    loglevel.warn(message)
  }

  error(message: any) {
    loglevel.error(message)
  }
}
