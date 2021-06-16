import { ajax } from "../../util/ajax";
import {checkSumUrl, SDK_VERSION} from '../../Config';
import LogStorage from "@netease-yunxin/log-storage";
import { randomId } from '../../util/rtcUtil/utilsId';
import { Uploader } from './nosUpload';
const sha1 =  require('js-sha1');


const uploadUrl = 'https://statistic.live.126.net/sdklog/getToken';
const salt = '021cc0370d824a51b7c8180485c27b38';
const deviceId = randomId();
const Nonce = randomId();


class UploadLog  {
    private logStorage:any;
    init() {
        // 进行 LogStorage 实例化
        // 设置全局变量
        this.logStorage = new LogStorage('WEBRTC');
    }
    async getLogs() {
        // 提取日志
        const now = Date.now();
        try {
            return await this.logStorage.get({start: 0, end: now});
        } catch(err) {
            console.log(err);
        }
    }
    storage() {
        return this.logStorage;
    }

    async uploadLog(option:any) {
        // 日志转成file
        let logs = await this.getLogs();
        let blob = new Blob([JSON.stringify(logs)],{ type: "text/plain" });
        let file = new File([blob], 'logdata', { type: "text/plain" });
        // 上传到 nos
        let param:any = {
            protocol : 'https'
        }
        const uploader = Uploader(param);
        uploader.addFile(file);
        uploader.upload({
            bucketName: option.data.bucket,
            objectName: option.data.fileName,
            token: option.data.xNosToken,
        }, function (res:any) {
            // console.log('res--->',res);
            if(res.xhr.status === 200) {
                console.log('upload log success')
            }
        })
        
    }

    startUploadLog(params:any) {
        const CurTime:any = new Date().getTime();
        
        let data = {
            appkey: params.channelInfo.appkey,
            sdktype: 'webrtc',
            sdkver: SDK_VERSION,
            platform: 'web',
            deviceInfo: deviceId,
            userkey: params.channelInfo.uid, // uid
            ext: 'log'
        };
        let checksum = JSON.stringify(data)+Nonce+CurTime+salt;
        // get token and then upload log
        ajax({ 
            type: "post", 
            url: uploadUrl, 
            data: data, 
            header: {
                Nonce: Nonce,
                CurTime: CurTime,
                // CheckSum: this.sha1(data+Nonce+CurTime+salt)
                Checksum: sha1(checksum)
            } 
          }).then((res:any) => {
              if(res.code === 200){
              console.log(res.data);
              this.uploadLog(res);
              }else {
                console.log('error code is',res.code);
              }
              
            })
            .catch(err => {
              console.log("upload log error: ", err);
            });
    }
      
}

const logController = new UploadLog()
export {
    logController
}
