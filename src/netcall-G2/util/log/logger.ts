import * as loglevel from 'loglevel';
import { logController } from '../log/upload'
sessionStorage.setItem('uploadLogEnabled', '0');

const logger = {
    setLogLevel(level:any) {
        loglevel.info('NERTC LogLevel was set to: ' + level);
        loglevel.setLevel(level);
    },
    enableLogUpload() {
        if(!Number(sessionStorage.getItem('uploadLogEnabled'))){
            loglevel.info('enable upload log');
            // initialize LogStorage
            logController.init();
            sessionStorage.setItem('uploadLogEnabled', '1');
        }
    },
    disableLogUpload() {
        if(Number(sessionStorage.getItem('uploadLogEnabled'))) {
            loglevel.info(
                'disable upload log'
              );
            sessionStorage.setItem('uploadLogEnabled', '0');
        }
    }
      
}

// disable log upload by default
logger.disableLogUpload();
// default log level is 'INFO'
loglevel.setLevel('INFO');

export default logger;
