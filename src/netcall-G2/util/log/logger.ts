import * as loglevel from 'loglevel';
import { logController } from '../log/upload'
sessionStorage.setItem('uploadLogEnabled', '0');

const logger = {
    setLogLevel(level:any) {
        loglevel.info('NERTC LogLevel was set to: ' + level);
        loglevel.setLevel(level);
    },
    enableUploadLog() {
        if(!Number(sessionStorage.getItem('uploadLogEnabled'))){
            loglevel.info('enable upload log');
            // initialize LogStorage
            logController.init();
            sessionStorage.setItem('uploadLogEnabled', '1');
        }
    },
    disableUploadLog() {
        if(Number(sessionStorage.getItem('uploadLogEnabled'))) {
            loglevel.warn(
                'disable upload log! Without log we are difficult to help you triage the issue you might run into!'
              );
            sessionStorage.setItem('uploadLogEnabled', '0');
        }
    }
      
}

// disable log upload by default
logger.disableUploadLog();
// default log level is 'INFO'
loglevel.setLevel('INFO');

export default logger;
