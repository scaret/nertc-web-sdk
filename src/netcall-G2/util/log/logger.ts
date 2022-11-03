import { getParameters } from '../../module/parameters'
import { loglevelMap, loglevels } from './loglevels'
import { getDefaultLogger } from '../webrtcLogger'

let win: any = window
// 与声网对齐

const logger = {
  setLogLevel(level: loglevels) {
    if (getParameters().logLevel !== level) {
      getDefaultLogger().info(
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

export default logger
