import { EventEmitter } from 'eventemitter3'
import {
  AdapterRef, ILogger,
  RecordInitOptions,
  RecordStartOptions,
  RecordStatus,
} from "../types";
import {MediaHelper} from "./media";
import RtcError from '../util/error/rtcError';
import ErrorCode from '../util/error/errorCode';
import {LocalStream} from "../api/localStream";
import {RemoteStream} from "../api/remoteStream";

/**
 * 媒体录制（音频混音录制/视频录制）
 */
class Record extends EventEmitter {
  private _status:RecordStatus = {
    recordedChunks: [], // recordedChunks
    isRecording: false, // 录音标志位
    stream: null, // 录制媒体流
    option: null, // 开启录制配置参数
    contentTypes: [], // 媒体内容类型
    mimeType: '', // 媒体mime类型
    audioController: null, // webaudio对象，负责混音处理
    opStream: null, // 待操作的可变更媒体流
    state: 'init', // 录制状态： init | started | stopped
    timer: null, // 打印日志定时器
    fileName: null, // 录制保存的文件对象名
    recordId: 0, // 录制id
    recordStatus: 'init', // 录制状态
    recordUrl: null,
    startTime: null,
    endTime: null
  };
  private stream: LocalStream|RemoteStream;
  private _recorder:MediaRecorder|null = null;
  private logger: ILogger;
  constructor (options:RecordInitOptions) {
    super()
    this.logger = options.logger.getChild(()=>{
      let tag = `recorder ${this._status.recordStatus}`;
      return tag
    })
    this._reset() // 初始化属性
    // 设置传入参数
    this.stream = options.stream
  }
  /**
   * [开始录制]
   * @param  {[type]} [stream=null] [媒体流信息]
   * @param  {Object} [option={ uid: 0] [用户uid]
   * @param  {[type]} account       [账户]
   * @param  {[type]} type          [录制类型] video audio screen
   * @param  {[type]} reset         [重置] 如果有文件未下载，是否重置
   * @return {[type]}               [Promise]
   */
  async start (option:RecordStartOptions) {
    const {stream = null, uid = '0', type = 'video', reset = false } = option
    this.logger.log('开始本地录制: ', JSON.stringify(option, null, ''))
    let reason = null;
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) {
      this.logger.log('浏览器不支持本地录制')
      reason = 'RecordBrowserNotSupport'
    }

    if (this._status.isRecording) {
      this.logger.log('当前正在录制中')
      reason = 'RecordInRecording'
    }

    if (this._status.recordUrl && this._status.recordStatus !== 'downloaded') {
      if (option.reset) {
        this.logger.warn('MediaRecordHelper: start: 存在未下载视频，强制清除...')
        // 当同步接口使用
        await this.clean()
      } else {
        this.logger.log(`MediaRecordHelper: start : 请先下载或重置上一段录制文件`)
        reason = 'RecordFileExsit'
      }
    }
    if (reason) {
      this.stream.client.apiFrequencyControl({
        name: 'startMediaRecording',
        code: -1,
        param: JSON.stringify({
          reason,
          uid,
          mediaType: type,
          recordName: ''
        }, null, ' ')
      })
      return reason;
    }
    
    this._status.stream = stream
    this._status.option = option
    this._status.fileName = `${this._status.option.uid}--${this._getTimeStamp()}--${this._status.option.type || 'video'}`
    this._status.startTime = this._getTimeStamp()
    // 不是音频就是视频
    let contentTypes = [
      'video/mp4;codecs=opus',
      'video/webm',
      'video/webm;codecs=h264',
      'video/x-matroska;codecs=opus',
      'video/invalid'
    ]
    if (option.type === 'audio') {
      contentTypes = ['audio/wav', 'audio/ogg', 'audio/pcm', 'audio/webm']
    }

    let mimeType = (this._status.mimeType = this._validation(contentTypes)[0])
    if (!mimeType) return 'RecordBrowserNotSupport'

    // 进行格式化
    try {
      await this._format()
      await this._start()
      this.stream.client.apiFrequencyControl({
        name: 'startMediaRecording',
        code: 0,
        param: JSON.stringify({
          uid,
          mediaType: type,
          recordName: ''
        }, null, ' ')
      })
    } catch (e) {
      this.logger.error('录制start error： ', e.name, e.message, e);
      this.stream.client.apiFrequencyControl({
        name: 'startMediaRecording',
        code: -1,
        param: JSON.stringify({
          reason: '录制接口 error',
          uid,
          mediaType: type,
          recordName: ''
        }, null, ' ')
      })
      return Promise.reject(
        new RtcError({
          code: ErrorCode.RECORD_API_ERROR,
          message: 'record api error'
        })
      )
    }
  }
  /**
   * 停止录制
   * @return {[Promise]}
   */
  stop (options?:{isUser?: boolean}) {
    let reason = null
    if (!this._status.isRecording || !this._recorder) {
      this.logger.log('当前没有进行录制')
      reason = 'RecordNotExist'
    }
    if (this._recorder && this._status.state !== 'started') {
      this.logger.warn(`MediaRecordHelper: record stopping when ${this._recorder.state}`)
      reason = 'RecordStateError' 
    }
    if (reason) {
      if(options && options.isUser === false) {

      } else {
        this.stream.client.apiFrequencyControl({
          name: 'stopMediaRecording',
          code: -1,
          param: ''
        })
      }
      return Promise.resolve()
    }
    this._status.state = 'stopped'
    this._status.recordStatus = 'stopping'
    return new Promise((resolve, reject) => {
      if (!this._recorder){
        return reject(
          new RtcError({
            code: ErrorCode.NO_RECORDER_FOUND,
            message: 'no record found'
          })
        )
      }
      this._status.fileName = this._status.fileName
      this._recorder.onstop = () => {
        this._onStop(resolve)
      }
      // 默认文件名
      this._recorder.stop()
      if (options && options.isUser){
        this.stream.client.apiFrequencyControl({
          name: 'stopMediaRecording',
          code: -1,
          param: ''
        })
      }
    })
  }

  /**
   * 播放录制
   * @param  {[String]} fileName [description]
   * @return {[Promise]}
   */
  play (div:HTMLElement) {
    if (this._status.state !== 'stopped') {
      this.stream.client.apiFrequencyControl({
        name: 'playMediaRecording',
        code: -1,
        param: JSON.stringify({
          reason: 'RecordStateError'
        }, null, ' ')
      })
      this.logger.warn(`MediaRecordHelper: record stopping when ${this._recorder && this._recorder.state}`)
      return Promise.resolve()
    }
    this.stream.client.apiFrequencyControl({
      name: 'playMediaRecording',
      code: 0,
      param: JSON.stringify({
        recordId: ''
      }, null, ' ')
    })
    return this._play(div)
  }

  /**
   * 下载录制
   */
  download (isUser=true) {
    return Promise.resolve().then(() => {
      if (this._status.isRecording) {
        this.logger.log('MediaRecordHelper: download: 正在录制中，立即停止...')
        return this.stop({isUser: false})
      }
      return Promise.resolve()
    }).then(() => {
      if (this._status.recordUrl) {
        const a = document.createElement('a')
        document.body.appendChild(a)
        a.style.display = 'none'
        a.href = this._status.recordUrl
        a.download = (this._status.fileName || this._getTimeStamp()) + '.webm'
        a.click()
        this._status.recordStatus = 'downloaded'
      } else {
        this.logger.log(`MediaRecordHelper: download: cannot download media without url ...`)
      }
      if (isUser) {
        this.stream.client.apiFrequencyControl({
          name: 'downloadMediaRecording',
          code: 0,
          param: ''
        })
      }
      return Promise.resolve(this._status)
    })
  }

  /**
   * 清空录制文件
   */
  async clean () {
    this.stream.client.apiFrequencyControl({
      name: 'cleanMediaRecording',
      code: 0,
      param: ''
    })
    if (this._status.isRecording && this._recorder) {
      await this.stop()
    }

    if (this._status.recordUrl) {
      window.URL.revokeObjectURL(this._status.recordUrl)
      this._status.recordUrl = null
    }
    this._destroy()
    this._status.recordStatus = 'init'
  }

  /**
   * 有人退出，如果退出的人正在进行录制，这里要主动停止该对象的音视频录制
   * @param  {Object} [option={}] [description]
   * @return {[null]}
   */
  leave (option = { uid: 0 }) {
    if (!this._status.isRecording || !this._recorder) {
      return Promise.resolve()
    }
    const { uid } = option
    if (!uid || !this._status.option) {
      return Promise.resolve()
    }
    if (uid === +this._status.option.uid) {
      return this.stop()
    }
  }
  /**
   * 暂停录制
   * @return {[null]}
   */
  pause () {
    this._recorder && this._recorder.pause()
  }
  /**
   * 回复录制
   * @return {[null]}
   */
  resume () {
    this._recorder && this._recorder.resume()
  }
  /**
   * 重置对象上所有属性
   * @return {[null]}
   */
  _reset () {
    this._recorder = null // MediaRecorder实例对象
    Object.assign(this._status, {
      recordedChunks: [], // recordedChunks
      isRecording: false, // 录音标志位
      stream: null, // 录制媒体流
      option: null, // 开启录制配置参数
      contentTypes: [], // 媒体内容类型
      mimeType: '', // 媒体mime类型
      audioController: null, // webaudio对象，负责混音处理
      opStream: null, // 待操作的可变更媒体流
      state: 'init', // 录制状态： init | started | stopped
      timer: null, // 打印日志定时器
      fileName: null, // 录制保存的文件对象名
      recordId: 0, // 录制id
      recordStatus: 'init', // 录制状态
      recordUrl: null,
      startTime: null,
      endTime: null
    })
  }
  _getTimeStamp () {
    return Math.floor(Date.now() / 1000)
  }
  /**
   * 检测浏览器是否支持mimetype类型
   * @param  {[Array]} arr [mimeType数组]
   * @return {[Array]}     [过滤出的浏览器支持的mimetype]
   */
  _validation (arr:string[]) {
    return arr.filter(item => {
      return MediaRecorder.isTypeSupported(item)
    })
  }
  /**
   * [格式化音视频、多轨合并]
   * @return {[Promie]} [返回处理好的音视频流]
   */
  _format () {
    let streams = this._status.stream
    let option = this._status.option
    return new Promise((resolve, reject) => {
      let opStream = new MediaStream()
      if (!streams){
        return reject(
          new RtcError({
            code: ErrorCode.NOT_DEFINED,
            message: 'stream not defined'
          })
        )
      }
      if (this._matchLocalStreamConstructor(streams.constructor.toString())) {
        streams = [streams] as MediaStream[]
      }
      if (!(Array.isArray(streams))) {
        return 
      }

      // 如果是混音录制，需要用webaudio api处理
      // 为什么这么做：单纯的合并很多音频轨道到一个流里面并不能录制全部
      /*if (option.type === 'audio') {
        this._status.audioController = new WebAudio({
          stream: streams,
          uid: option.uid
        })
        this._status.opStream = this._status.audioController.outputStream
        return resolve()
      }*/

      // 取出所有视频轨道和音频轨道
      streams.forEach(stream => {
        if (!stream || !this._matchLocalStreamConstructor(stream.constructor.toString())) {
          return
        }
        stream.getTracks().forEach((track:MediaStreamTrack) => {
          opStream.addTrack(track)
        })
      })

      if (opStream.getTracks().length === 0) {
        this.logger.error(`_format: No tracks available`)
        return resolve(opStream);
      }

      this._status.opStream = opStream
      resolve(opStream)
    })
  }
  /**
   * 判断构造函数是否有效
   * Firefox通过API获取的原生流构造函数是：LocalMediaStream
   * @param  {[Object]} constructor [媒体流的构造函数]
   * @return {[Booleam]}             [结果]
   */
  _matchLocalStreamConstructor (constructor:string) {
    return /(LocalMediaStream|MediaStream)/.test(constructor)
  }
  /**
   * 内部方法：开启录制
   * @return {[Promise]}
   */
  _start () {
    let options = {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
      mimeType: this._status.mimeType
    }
    if (!this._status.opStream){
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_AVALIABLE,
          message: 'no stream avaliable'
        })
      )
    }
    const audioTracks = this._status.opStream.getAudioTracks();
    let audioRecordStream;
    if (audioTracks.length > 1){
      audioRecordStream = new MediaStream([audioTracks[0]])
    }else{
      audioRecordStream = this._status.opStream
    }
    let recorder = (this._recorder = new MediaRecorder(audioRecordStream, options))
    recorder.ondataavailable = this._onDataAvailable.bind(this)
    recorder.onstop = () => {
      this.logger.log(`MediaRecordHelper: _start: record stop automatically ...`)
      this._onStop();
    }
    if (this._status.recordUrl) {
      window.URL.revokeObjectURL(this._status.recordUrl)
      this._status.recordUrl = null
    }
    this._status.recordedChunks = []
    this._status.isRecording = true
    this._status.state = 'started'
    this._status.recordId += 1
    this._status.recordStatus = 'starting'
    this._recorder.start()
    // 启用日志打印
    this._clearTimer()
    this._startTimer()
    return Promise.resolve(this._status.option)
  }

  /**
   * 定时打印recorder的state
   * @return {[null]}
   */
  _startTimer () {
    if (this._status.timer) return
    this._status.timer = setInterval(() => {
      this.logger.log(`MediaRecordHelper: startTimer: ${new Date().toLocaleString()} --> MediaRecorder status: ${this._recorder && this._recorder.state}`)
    }, 5000)
  }
  /**
   * recorder onstop事件回调
   * @return {[null]}
   */
  _onStop (resolve?: (data:any)=>void) {
    this.logger.log('MediaRecordHelper: _onStop: record stoped !!!')
    this._clearTimer()
    this._status.recordStatus = 'stopped'
    this._status.isRecording = false;
    this._status.endTime = this._getTimeStamp()
    let blob = new Blob(this._status.recordedChunks, {
      type: this._status.mimeType
    })
    this._status.recordUrl = URL.createObjectURL(blob)
    this.emit('stop', this.getRecordStatus())
    // this._destroy()
    if (resolve) {
      resolve(this._status.recordUrl)
    }
    // this.download()
  }

  /**
   * 内部方法：播放录制
   * @return {[Promise]}
   */
  _play (div:HTMLElement) {
    let dom = null
    if (this._status.mimeType.indexOf('audio') != -1) {
      dom = document.createElement('audio')
    } else if (this._status.mimeType.indexOf('video') != -1) {
      dom = document.createElement('video')
      dom.autoplay = true
    }else{
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_SUPPORT,
          message: `Unsupported MIME type ${this._status.mimeType}`
        })
      )
    }
    if (!this._status.recordUrl){
      return Promise.reject(
        new RtcError({
          code: ErrorCode.NOT_DEFINED,
          message: 'record url is unfefined'
        })
      )
    }
    div.appendChild(dom)
    dom.srcObject = null;
    dom.src = this._status.recordUrl
    dom.controls = false;
    dom.play();
    return Promise.resolve(this._status.option)
  }

  /**
   * 清空实例对象属性
   * @return {[null]}
   */
  async _destroy () {
    if (this._status.audioController) {
      //@ts-ignore
      this._status.audioController.destroy()
    }
    if (this._status.isRecording) {
      await this.stop({isUser: false})
    }
    this._clearTimer()
    this._recorder = null
    Object.assign(this._status, {
      stream: null,
      recordedChunks: [],
      isRecording: false,
      audioController: null,
      status: 'init'
    })
  }
  /**
   * 清除定时器
   * @return {[null]}
   */
  _clearTimer () {
    if (this._status.timer){
      clearInterval(this._status.timer)
      this._status.timer = null
    }
  }
  /**
   * recorder ondataavailable事件回调
   * @return {[Promise]}
   */
  _onDataAvailable (event:BlobEvent) {
    this._status.recordStatus = 'recording'
    this.logger.log('MediaRecordHelper: ondataavailable: data received')
    if (event.data.size > 0) {
      this._status.recordedChunks.push(event.data)
    } else {
      this.logger.warn('MediaRecordHelper: ondataavailable: no data')
      this.stop()
      return
    }
  }
  /**
   * 对外暴露是否正处于录音状态
   * @return {Boolean}
   */
  checkIsRecording () {
    return this._status.isRecording
  }
  /**
   * 查询录制状态
   */
  getRecordStatus () {
    const event = Object.assign({
      id: this._status.recordId,
      type: this._status.mimeType,
      name: this._status.fileName,
      status: this._status.recordStatus,
      isRecording: this._status.isRecording,
      startTime: this._status.startTime,
      endTime: this._status.endTime
    }, this._status.option)
    this.stream.client.apiFrequencyControl({
      name: 'listMediaRecording',
      code: 0,
      param: ''
    })
    return event
  }
  destroy() {
    this._destroy()
  }
}

export { Record }

/* eslint prefer-promise-reject-errors: 0 */
/* eslint no-useless-escape: 0 */
