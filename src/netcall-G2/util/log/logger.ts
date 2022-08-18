import * as loglevel from 'loglevel'

import { getParameters } from '../../module/parameters'

let win: any = window
// 与声网对齐
export enum loglevels {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  NONE = 4
}

// 与声网对齐
export const loglevelMap = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARNING',
  3: 'ERROR',
  4: 'NONE'
}

const logger = {
  setLogLevel(level: loglevels) {
    if (getParameters().logLevel !== level) {
      loglevel.info(
        `NERTC LogLevel was changed: ${loglevelMap[getParameters().logLevel]} => ${
          loglevelMap[level]
        }`
      )
      getParameters().logLevel = level
    }
  },
  enableLogUpload() {
    win.logUpload = true
  },
  disableLogUpload() {
    win.logUpload = false
  }
}

// disable log upload by default
logger.disableLogUpload()
// default log level is 'INFO'
loglevel.setLevel('INFO')

export default logger
