import { EventEmitter } from 'eventemitter3'
import {
  RTSTransportOptions,
  AdapterRef,
  SDKRef, SnapshotOptions,

} from "../types"

class RTSTransport extends EventEmitter {
  private adapterRef:AdapterRef;
  private _url: string | null;
  public _port: number | null;
  private _transportId: string | null;
  private _ws: WebSocket | null;
  
  
  constructor (options:RTSTransportOptions) {
    super()
    this._reset()
    this.adapterRef = options.adapterRef
    this._url = options.url
    this._port = options.port
    this._transportId = options.transportId
    this._ws = null
    this.initSocket()
  }

  get transportId(){
    return this._transportId
  }
  _reset() {
    this._url = ''
    this._port = 0
    this._ws = null
  }

  initSocket () {
    this.adapterRef.logger.log('RTSTransport建立连接, url: ', this._url)
    if(!this._url){
      throw new Error('RTSTransport: No _url');
    }
    this._ws = new WebSocket(this._url, ['protoo'])
    this._ws.binaryType = "arraybuffer"
    // 事件监听
    const ws = this._ws
    ws.onopen = this._onOpen.bind(this)
    ws.onmessage = this._onMessage.bind(this)
    ws.onclose = this._onClose.bind(this)
    ws.onerror = this._onError.bind(this)
  }

  _onOpen (event: any) {
    this.adapterRef.logger.log('RTSTransport:_onOpen')
    this.emit('open', event)
  }

  _onMessage (event: any) {
    this.adapterRef.instance.emit('rts-stream-data', event)
  }

  _onClose (event: any) {
    this.adapterRef.logger.log('RTSTransport:onClose <- ', event)
    this.emit('close', event)
  }

  _onError (event: any) {
    this.adapterRef.logger.log('RTSTransport:onError <- ', event)
    this.emit('error', event)
  }

  /**
   * 发送数据
   */
  send (data?: any) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data))
    } else {
      this.adapterRef.logger.log('RTSTransport:send: 当前不能发送，等待ws连接成功之后发送')
    }
  }

  _close () {
    this.adapterRef.logger.log('RTSTransport:close')
    if (this._ws) {
      this._ws.onclose = null
      this._ws.onerror = null
      this._ws.onopen = null
      this._ws.onmessage = null
      this._ws.close()
      this._ws = null
    }
  }


  destroy() {
    this.adapterRef.logger.log('WSTransport:destroy')
    this._close()
    this._url = null
  }
}

export { RTSTransport }