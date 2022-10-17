import * as loglevel from 'loglevel'

import { getParameters } from '../../module/parameters'
import { loglevelMap, loglevels } from './loglevels'

let win: any = window
// 与声网对齐


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

if (getParameters().forceLogUpload === 'on') {
  logger.enableLogUpload()
} else {
  // disable log upload by default
  logger.disableLogUpload()
}
// default log level is 'INFO'
loglevel.setLevel('INFO')

export default logger
