import { EventEmitter } from 'eventemitter3'
import { ajax } from '../util/ajax'
import {getChannelInfoUrl, SDK_VERSION, roomsTaskUrl} from '../Config'
import * as md5 from 'md5';
import {
  AdapterRef, AddTaskOptions,
  MeetingJoinChannelOptions,
  MeetingOptions, RTMPTask,
  SDKRef
} from "../types";
/**
 * 会控相关
 */
class Meeting extends EventEmitter {
  private sdkRef:SDKRef;
  private adapterRef:AdapterRef;
  constructor (options: MeetingOptions) {
    super()

    this._reset()

    // 设置对象引用
    this.adapterRef = options.adapterRef
    this.sdkRef = options.sdkRef
  }

  _reset () {
    // this.adapterRef = null // adapter层的成员属性与方法引用
    // this.sdkRef = null // SDK 实例指针
  }

  /**
   * 多人通话：加入房间
   * 参数 appkey, channelName, uid
   */
  async joinChannel (options:MeetingJoinChannelOptions) {
    const {
      appkey,
      channelName,
      uid,
      // videoMode,
      // aslMode,
      wssArr = null,
      sessionMode = 'meeting',
      joinChannelRecordConfig,
      joinChannelLiveConfig,
      token = ''
    } = options

    let T1 = Date.now()
    let curtime = +new Date()

    try{
      const data:any = await ajax({
        url: getChannelInfoUrl, //'https://webtest.netease.im/nrtcproxy/nrtc/getChannelInfos.action'
        type: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        header: {
          'X-Forwarded-For': this.adapterRef.testConf.ForwardedAddr || ''
        },
        data: {
          uid,
          appkey,
          channelName,
          secureType: token ? '1' : '2', // 安全认证类型：1:安全、2:非安全
          osType: '4', // 系统类型：1:ios、2:aos、3:pc、4:web
          mode: 2, // 接口字段和信令字段不一致(3.5.0版本开始只保留会议模式)
          netType: '0', // 先填0吧 微信接口又是异步的 1:2G、2:3G、3:4G、4:wifi、5:有线、0:未知
          version: SDK_VERSION + '.0' || '1.0.0',
          curtime,
          checksum: token ? token : md5(appkey + "." + uid + "." + curtime),
          webrtc: 1, // 是否与其它端互通
          nrtcg2: 1,
          t1: T1 // 是一个毫秒级的时间戳，若填了这个，服务器会返回t1（客户端请求时间戳）、t2（服务器接收时间戳）、t3（服务器返回时间戳）
        }
      });

      this.adapterRef.logger.log('获取到房间信息: %o', data)
      if (data.code === 200) {
        this.adapterRef.channelStatus = 'join'
        const { ips = {}, time = {} } = data
        const maxVideoQuality = (data.config && data.config.quality_level_limit) || 16
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.startWssTime = Date.now()
        Object.assign(this.adapterRef.channelInfo, {
          cid: +data.cid,
          token: data.token,
          turnToken: ips.token,
          channelName,
          wssArr: wssArr || ips.webrtcarray || [],
          // 中继使用 服务器返回以下2个字段则需要走中继
          relayaddrs: ips.relayaddrs || null,
          relaytoken: ips.relaytoken || null,
          wssArrIndex: 0,
          maxVideoQuality,
          netDetect: false
        }, {
          uid,
          sessionMode,
          appkey
        })
        this.adapterRef.testConf.relayaddrs = ips.relayaddrs
        this.adapterRef.testConf.relaytoken = ips.relaytoken
        this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.token = data.token
        this.adapterRef.channelInfo.T4 = Date.now()
        let rtt = (this.adapterRef.channelInfo.T4 - time.t1) - (time.t3 - time.t2)
        this.adapterRef.channelInfo.clientNtpTime = time.t3 + Math.round(rtt / 2)
        this.adapterRef.instance.setSessionConfig(Object.assign({
          maxVideoQuality
        }, joinChannelLiveConfig, joinChannelRecordConfig))
        // 会话建立
        return this.adapterRef.instance.startSession()
      } else {
        this.adapterRef.channelStatus = 'leave'
        this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
        this.adapterRef.connectState.curState = 'DISCONNECTED'
        this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
        //上报login失败事件
        this.adapterRef.instance.apiEventReport('setLogin', {
          a_record: joinChannelRecordConfig.recordAudio,
          v_record: joinChannelRecordConfig.recordVideo,
          record_type: joinChannelRecordConfig.recordType,
          host_speaker: joinChannelRecordConfig.isHostSpeaker,
          result: data.code,
          serverIp: data.ips && data.ips.turnaddrs && data.ips.turnaddrs.length && data.ips.turnaddrs[0]
        })
        return Promise.reject(`code: ${data.code}, reason: ${data.desc}`)
      }
    } catch(e) {
      this.adapterRef.logger.log('获取到房间失败: %o', e)
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
      //上报login失败事件
      this.adapterRef.instance.apiEventReport('setLogin', {
        a_record: joinChannelRecordConfig.recordAudio,
        v_record: joinChannelRecordConfig.recordVideo,
        record_type: joinChannelRecordConfig.recordType,
        host_speaker: joinChannelRecordConfig.isHostSpeaker,
        result: -2,
        serverIp: ''
      })
      throw e;
    }
  }

  /**
   * 多人通话：离开房间
   */
  leaveChannel () {
    this.adapterRef.instance.apiEventReport('setLogout', {
      reason: this.adapterRef.instance._params.JoinChannelRequestParam4WebRTC2.logoutReason || 0
    })
    if (!this.adapterRef._signalling){
      throw new Error('No _signalling');
    }
    return this.adapterRef._signalling.doSendLogout().then(()=>{
      this.adapterRef.channelStatus = 'leave'
      this.adapterRef.connectState.prevState = this.adapterRef.connectState.curState
      this.adapterRef.connectState.curState = 'DISCONNECTED'
      this.adapterRef.instance.emit("connection-state-change", this.adapterRef.connectState);
      return this.adapterRef.instance.stopSession()
    })
    
  }

  //添加推流任务
  async addTasks (options:AddTaskOptions) {
    const {
      // appkey,
      // channelName,
      // uid,
      // sessionMode,
      rtmpTasks = []
    } = options
    if (!this.adapterRef.channelInfo.cid) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'addTasks',
        code: -1,
        param: JSON.stringify({
          error: '请先加入房间',
          version: 1,
          taskId: rtmpTasks.length ? rtmpTasks[0].taskId : ''
        }, null, '')
      })
      this.adapterRef.logger.error('请先加入房间')
      return Promise.reject('INVALID_OPERATION')
    } else if (!rtmpTasks || !Array.isArray(rtmpTasks) || !rtmpTasks.length){
      this.adapterRef.logger.error('添加推流任务失败: 参数格式错误，rtmpTasks为空，或者该数组长度为空')
      return Promise.reject('INVALID ARGUMENTS')
    }

    const url = `${roomsTaskUrl}${this.adapterRef.channelInfo.cid}/tasks`
    for (let i=0; i < rtmpTasks.length; i++) {
      rtmpTasks[i].hostUid = this.adapterRef.channelInfo.uid
      rtmpTasks[i].version = 1
      this.adapterRef.logger.log('rtmpTask: ', rtmpTasks[i])
      try {
        const data:any = await ajax({
          url, 
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken
          },
          data: {
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: parseInt(rtmpTasks[i].hostUid),
            layout: rtmpTasks[i].layout,
            config: rtmpTasks[i].config,
            extraInfo: rtmpTasks[i].extraInfo,
          }
        })
        if (data.code === 200) {
          this.adapterRef.logger.log('添加推流任务完成')
          this.adapterRef.instance.apiFrequencyControl({
            name: 'addTasks',
            code: 0,
            param: JSON.stringify({
              version: 1,
              taskId: rtmpTasks[i].taskId,
              streamUrl: rtmpTasks[i].streamUrl,
              record: rtmpTasks[i].record,
              hostUid: parseInt(rtmpTasks[i].hostUid),
              layout: rtmpTasks[i].layout,
              config: rtmpTasks[i].config,
            }, null, ' ')
          })
        } else {
          this.adapterRef.logger.error('添加推流任务失败: ', data)
          this.adapterRef.instance.apiFrequencyControl({
            name: 'addTasks',
            code: data.code,
            param: JSON.stringify({
              version: 1,
              taskId: rtmpTasks[i].taskId,
              streamUrl: rtmpTasks[i].streamUrl,
              record: rtmpTasks[i].record,
              hostUid: parseInt(rtmpTasks[i].hostUid),
              layout: rtmpTasks[i].layout,
              config: rtmpTasks[i].config,
            }, null, ' ')
          })
          return Promise.reject('ADD_TASKS_FAILED')
        }
      } catch (e) {
        this.adapterRef.logger.error('addTasks: ', e)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'addTasks',
          code: -1,
          param: JSON.stringify({
            error: 'code error',
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: parseInt(rtmpTasks[i].hostUid),
            layout: rtmpTasks[i].layout,
            config: rtmpTasks[i].config,
          }, null, ' ')
        })
        return Promise.reject('ADD_TASKS_FAILED')
      }
    } 
  }

  //删除推流任务
  async deleteTasks (options:{taskIds:string[]}) {
    const {
      taskIds = []
    } = options
    if (!this.adapterRef.channelInfo.cid) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'deleteTasks',
        code: -1,
        param: JSON.stringify({
          error: '请先加入房间',
          version: 1,
          taskId: taskIds.length ? taskIds[0] : ''
        }, null, ' ')
      })
      this.adapterRef.logger.error('请先加入房间')
      return Promise.reject('INVALID_OPERATION')
    } else if (!taskIds || !Array.isArray(taskIds) || !taskIds.length){
      this.adapterRef.logger.error('删除推流任务失败: 参数格式错误，taskIds为空，或者该数组长度为空')
      return Promise.reject('INVALID ARGUMENTS')
    }

    const url = `${roomsTaskUrl}${this.adapterRef.channelInfo.cid}/tasks/delete`
    for (let i=0; i < taskIds.length; i++) {
      this.adapterRef.logger.log('deleteTasks: ', taskIds[i])
      try {
        const data:any = await ajax({
          url, 
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken
          },
          data: {
            taskId: taskIds[i]
          }
        })
        if (data.code === 200) {
          this.adapterRef.logger.log('删除推流任务完成')
          this.adapterRef.instance.apiFrequencyControl({
            name: 'deleteTasks',
            code: 0,
            param: JSON.stringify({
              taskId: taskIds[i]
            }, null, ' ')
          })
          return Promise.resolve()
        } else {
          this.adapterRef.logger.log('删除推流任务请求失败: %o', data)
          this.adapterRef.instance.apiFrequencyControl({
            name: 'deleteTasks',
            code: data.code,
            param: JSON.stringify({
              taskId: taskIds[i]
            }, null, ' ')
          })
          return Promise.reject('DELETE_TASKS_FAILED')
        }
      } catch (e) {
        console.error('deleteTasks发生错误: ', e)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'deleteTasks',
          code: -1,
          param: JSON.stringify({
            error: 'code error',
            taskId: taskIds[i]
          }, null, ' ')
        })
        return Promise.reject('DELETE_TASKS_FAILED')
      }
    }
    return
  }

  //更新推流任务
  async updateTasks (options:{rtmpTasks: RTMPTask[]}) {
    const {
      // appkey,
      // channelName,
      // uid,
      // sessionMode,
      rtmpTasks = []
    } = options
    if (!this.adapterRef.channelInfo.cid) {
      this.adapterRef.instance.apiFrequencyControl({
        name: 'updateTasks',
        code: -1,
        param: JSON.stringify({
          error: '请先加入房间',
          version: 1,
          taskId: rtmpTasks.length ? rtmpTasks[0].taskId : ''
        }, null, ' ')
      })
      this.adapterRef.logger.error('请先加入房间')
      return Promise.reject('INVALID_OPERATION')
    } else if (!rtmpTasks || !Array.isArray(rtmpTasks) || !rtmpTasks.length){
      this.adapterRef.logger.error('更新推流任务失败: 参数格式错误，rtmpTasks为空，或者该数组长度为空')
      return Promise.reject('INVALID ARGUMENTS')
    }

    const url = `${roomsTaskUrl}${this.adapterRef.channelInfo.cid}/task/update`
    for (let i = 0; i < rtmpTasks.length; i++) {
      rtmpTasks[i].hostUid = this.adapterRef.channelInfo.uid
      try {
        const data:any = await ajax({
          url, 
          type: 'POST',
          contentType: 'application/json;charset=utf-8',
          header: {
            Token: this.adapterRef.channelInfo.turnToken
          },
          data: {
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: parseInt(rtmpTasks[i].hostUid),
            layout: rtmpTasks[i].layout,
            config: rtmpTasks[i].config,
          }
        })
        if (data.code === 200) {
          this.adapterRef.logger.log('更新推流任务完成')
          this.adapterRef.instance.apiFrequencyControl({
            name: 'updateTasks',
            code: 0,
            param: JSON.stringify({
              version: 1,
              taskId: rtmpTasks[i].taskId,
              streamUrl: rtmpTasks[i].streamUrl,
              record: rtmpTasks[i].record,
              hostUid: parseInt(rtmpTasks[i].hostUid),
              layout: rtmpTasks[i].layout,
              config: rtmpTasks[i].config,
            }, null, ' ')
          })
          return Promise.resolve()
        } else {
          this.adapterRef.logger.log('更新推流任务失败： %o', data)
          this.adapterRef.instance.apiFrequencyControl({
            name: 'updateTasks',
            code: data.code,
            param: JSON.stringify({
              version: 1,
              taskId: rtmpTasks[i].taskId,
              streamUrl: rtmpTasks[i].streamUrl,
              record: rtmpTasks[i].record,
              hostUid: parseInt(rtmpTasks[i].hostUid),
              layout: rtmpTasks[i].layout,
              config: rtmpTasks[i].config,
            }, null, ' ')
          })
          return Promise.reject('UPDATE_TASKS_FAILED')
        }
      } catch (e) {
        this.adapterRef.logger.error('updateTasks 发生错误: ', e)
        this.adapterRef.instance.apiFrequencyControl({
          name: 'updateTasks',
          code: -1,
          param: JSON.stringify({
            error: 'code error',
            version: 1,
            taskId: rtmpTasks[i].taskId,
            streamUrl: rtmpTasks[i].streamUrl,
            record: rtmpTasks[i].record,
            hostUid: parseInt(rtmpTasks[i].hostUid),
            layout: rtmpTasks[i].layout,
            config: rtmpTasks[i].config,
          }, null, ' ')
        })
        return Promise.reject('UPDATE_TASKS_FAILED')
      }
    }
  }

  destroy() {
    this.adapterRef.logger.log('清除 meeting')
    this._reset()
  }
}

export { Meeting }
