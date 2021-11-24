import * as loglevel from 'loglevel';
// import { logController } from '../log/upload'
import {getParameters, setParameters} from "../../module/parameters";
// sessionStorage.setItem('uploadLogEnabled', '0');

// 与声网对齐
export enum loglevels{
  DEBUG= 0,
  INFO= 1,
  WARNING= 2,
  ERROR= 3,
  NONE= 4,
}

// 与声网对齐
export const loglevelMap = {
  0: "DEBUG",
  1: "INFO",
  2: "WARNING",
  3: "ERROR",
  4: "NONE",
}

const logger = {
    setLogLevel(level:loglevels) {
      const params = getParameters();
      loglevel.info(`NERTC LogLevel was changed: ${loglevelMap[params.logLevel]} => ${loglevelMap[level]}`);
      params.logLevel = level;
      setParameters(params);
    },
    enableLogUpload() {
        // if(!Number(sessionStorage.getItem('uploadLogEnabled'))){
        //     loglevel.info('enable upload log');
        //     // initialize LogStorage
        //     logController.init();
        //     sessionStorage.setItem('uploadLogEnabled', '1');
        // }
        (<any>window).logUpload = true;

    },
    disableLogUpload() {
        // if(Number(sessionStorage.getItem('uploadLogEnabled'))) {
        //     loglevel.info(
        //         'disable upload log'
        //       );
        //     sessionStorage.setItem('uploadLogEnabled', '0');
        // }
        (<any>window).logUpload = false;
    }
      
}

// disable log upload by default
logger.disableLogUpload();
// default log level is 'INFO'
loglevel.setLevel('INFO');

export default logger;
