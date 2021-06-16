import { EventEmitter } from 'eventemitter3';
import { getReconnectionTimeout } from '../util/rtcUtil/utils';
import * as protobuf  from 'protobufjs';
import heartbeatStats = require('../util/proto/heartbeatStats');
import { ConsoleLogger } from 'typedoc/dist/lib/utils';

const PING_PONG_INTERVAL = 10000;
const PING_TIMEOUT = 10000;
let uintPing = new Uint8Array(1);
uintPing[0] = 10;
const PING = uintPing;
const PONG = 11;
export default class WSTransport {
    private url_: string;
    private socket_: any;
    private socketInUse_: any;
    private isConnected_: boolean;
    private isConnecting_: boolean;
    private pingPongTimeoutId_: any;
    private pingTimeoutId_: any;
    private reconnectionTimer_: any;
    private reconnectionCount_: number;
    private emitter_: any;
    

    constructor(options: any){
        this.url_ = options.url;
        this.socket_ = null;
        this.isConnected_ = false;
        this.isConnecting_ = false;
        this.pingPongTimeoutId_ = -1;
        this.pingTimeoutId_ = -1;
        this.reconnectionTimer_ = -1;
        this.reconnectionCount_ = 0;
        this.emitter_ = new EventEmitter();
    }
    init() {
        console.log(`connect to url: ${this.url_}`);
        this.socket_ = new WebSocket(this.url_);
        this.bindSocket(this.socket_);
    }
    bindSocket(socket:any) {
        socket.onopen = this.onopen.bind(this);
        socket.onclose = this.onclose.bind(this);
        socket.onerror = this.onerror.bind(this);
        socket.onmessage = this.onmessage.bind(this);
    }

    unbindSocket(socket:any) {
        socket.onopen = () => {};
        socket.onclose = () => {};
        socket.onerror = () => {};
        socket.onmessage = () => {};
    }

    onopen(event:any) {
        if (this.isConnected_) return;
        this.isConnected_ = true;
        this.isConnecting_ = false;
        if (event.target === this.socket_) {
            this.socketInUse_ = this.socket_;
        }
        const url = event.target.url;
        console.log(` websocket[${url}] is connected`);
        // console.log('start ping pong');
        // this.startPingPong();
    }

    onclose(event:any) {
        const url = event.target.url;
        const isInUse = event.target === this.socketInUse_;
        console.log(
          ` websocket[${url} InUse: ${isInUse}] is closed with code: ${event.code}`
        );
        // only handle the close event for the socket in use
        if (event.target === this.socketInUse_) {
          // mark the wsTrasnport is disconnected
          this.isConnected_ = false;
          // 1000 is considered as normal close
          if (event.wasClean && event.code === 1000) {
            // 
          } else {
            console.warn(`onclose code:${event.code} reason:${event.reason}`);
            this.socketInUse_.onclose = () => {};
            // 4011 indicates that we want reconnect with new WebSocket
            this.socketInUse_.close(4011);
            this.socket_  = this.socketInUse_ = null;
          }
        }
      }

      onerror(event:any) {
        const url = event.target.url;
        console.warn(`websocket[${url}] error observed`);
        if (!this.isConnected_) {
          // WS connection failed at the first time
          this.reconnect()
        } else if (event.target === this.socketInUse_) {
          this.isConnected_ = false;
          this.socketInUse_ = null;
          this.reconnect()
        }
    
        this.isConnecting_ = false;
        this.isConnected_ = false;
      }

      onmessage(event:any) {
        if (!this.isConnected_) return; // close was requested.
        // deal with pb data
        const reader = event.data.stream().getReader();
        // @ts-ignore
        reader.read().then(({done, value}) => {
          // console.log(done+" "+value);
          // return;
          // console.log('PONG value--->',value);
        })
        

        // TODO: start ping-pong
        // console.log('start ping pong');
        // this.startPingPong();
      }

      isConnected() {
        return this.isConnected_;
      }

      // send pb
      sendPB(data:any) {
        if (this.isConnected_) {
          const sendMessage = this.createPBMessage(data);
          // console.log('sendMessage--->', sendMessage);
          this.socketInUse_.send(sendMessage);
        }
      }

      // send json
      send(data:any) {
        if (this.isConnected_) {
          this.socketInUse_.send(JSON.stringify(data));
        }
      }

      createPBMessage(data: any) {
        // convert json data to protocol-buffer
        let root = protobuf.Root.fromJSON(heartbeatStats);
        let heartbeatMessage = root.lookupType('WebrtcStats');
        let message = heartbeatMessage.create(data);
        // console.log(`message = ${JSON.stringify(message)}`);
        let buffer = heartbeatMessage.encode(message).finish();
        // console.log(`buffer = ${Array.prototype.toString.call(buffer)}`);
        // decoded = AwesomeMessage.decode(buffer);
        // console.log(`decoded = ${JSON.stringify(decoded)}`);
        return buffer;
      }

      async startPingPong() {
        try {
          if (this.pingPongTimeoutId_ !== -1) {
            return;
          }
          await this.ping();
          this.pingPongTimeoutId_ = setTimeout(() => {
            this.pingPongTimeoutId_ = -1;
            this.startPingPong();
          }, PING_PONG_INTERVAL);
        } catch (error) {
          console.log('ping-pong failed, start reconnection');
          this.close();
          this.reconnect();
        }

      }

      stopPingPong() {
        console.log('stop ping pong');
        clearTimeout(this.pingTimeoutId_);
        clearTimeout(this.pingPongTimeoutId_);
        this.pingTimeoutId_ = -1;
        this.pingPongTimeoutId_ = -1;
      }

      ping() {
        return new Promise<void>((resolve, reject) => {
          if (this.pingTimeoutId_ !== -1) {
            return resolve();
          }
          // let uintPing = new Uint8Array(1);
          // uintPing[0] = 10;
          // this.send(uintPing);
          this.send(PING);

          this.once(PONG, () => {
            clearTimeout(this.pingTimeoutId_);
            this.pingTimeoutId_ = -1;
            resolve();
          });
          this.pingTimeoutId_ = setTimeout(() => {
            this.pingTimeoutId_ = -1;
            reject();
          }, PING_TIMEOUT);
        });

      }

      reconnect() {
        // TODO: reconnect ws
        if(this.isConnecting_ || this.reconnectionTimer_ !== -1) {
          console.log("websocket is reconnecting");
          return;
        }
        this.isConnecting_ = true;
        this.reconnectionCount_++;

        this.socket_ = new WebSocket(this.url_);
        this.bindSocket(this.socket_);
        const RECONNECTION_TIMEOUT = getReconnectionTimeout(this.reconnectionCount_);
        this.reconnectionTimer_ = setTimeout(() => {
          this.isConnecting_ = false;
          this.clearReconnectionTimer();
          this.reconnect() 
        }, RECONNECTION_TIMEOUT)

      }

      clearReconnectionTimer() {
        if (this.reconnectionTimer_ !== -1) {
          clearTimeout(this.reconnectionTimer_);
          this.reconnectionTimer_ = -1;
        }
      }

      once(event:any, handler:any, context?:any) {
        this.emitter_.once(event, handler, context);
      }

      close() {
        console.log('close websocket');
        this.stopPingPong();
        this.unbindSocket(this.socketInUse_);
        this.isConnected_ = false;
        this.isConnecting_ = false;
        this.socketInUse_ = null;
      }
}