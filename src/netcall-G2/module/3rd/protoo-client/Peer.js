const Logger = require('./Logger')
const EnhancedEventEmitter = require('./EnhancedEventEmitter')
const Message = require('./Message')
const { getParameters } = require('../../parameters')

const logger = new Logger('Peer')

let id = 0

class Peer extends EnhancedEventEmitter {
  /**
   * @param {protoo.Transport} transport
   *
   * @emits open
   * @emits {currentAttempt: Number} failed
   * @emits disconnected
   * @emits close
   * @emits {request: protoo.Request, accept: Function, reject: Function} request
   * @emits {notification: protoo.Notification} notification
   */
  constructor(transport) {
    super(logger)

    logger.debug('constructor()')

    // Closed flag.
    // @type {Boolean}
    this._closed = false

    this.id = id++

    // Transport.
    // @type {protoo.Transport}
    this._transport = transport

    // Connected flag.
    // @type {Boolean}
    this._connected = false

    // Custom data object.
    // @type {Object}
    this._data = {
      createTs: Date.now()
    }

    // Map of pending sent request objects indexed by request id.
    // @type {Map<Number, Object>}
    this._sents = new Map()

    //通知消息的id
    this._notificationId = 0

    // Handle transport.
    this._handleTransport()
  }

  /**
   * Whether the Peer is closed.
   *
   * @returns {Boolean}
   */
  get closed() {
    return this._closed
  }

  /**
   * Whether the Peer is connected.
   *
   * @returns {Boolean}
   */
  get connected() {
    return this._connected
  }

  /**
   * App custom data.
   *
   * @returns {Object}
   */
  get data() {
    return this._data
  }

  /**
   * Invalid setter.
   */
  set data(
    data // eslint-disable-line no-unused-vars
  ) {
    throw new Error('cannot override data object')
  }

  /**
   * Close this Peer and its Transport.
   */
  close() {
    if (this._closed) {
      return
    }

    logger.debug('close()')

    this._closed = true
    this._connected = false
    this._notificationId = 0

    // Close Transport.
    this._transport.close()
    this._transport = null
    // Close every pending sent.
    for (const sent of this._sents.values()) {
      sent.close()
    }

    this._sents.clear()
    // Emit 'close' event.
    //主动关闭socket，不上报close事件
    //this.safeEmit('close');
  }

  clear() {
    for (const sent of this._sents.values()) {
      sent.close()
    }
    this._sents.clear()
  }

  /**
   * Send a protoo request to the server-side Room.
   *
   * @param {String} method
   * @param {Object} [data]
   *
   * @async
   * @returns {Object} The response data Object if a success response is received.
   */
  async request(method, data = undefined) {
    const request = Message.createRequest(method, data)
    if (method != 'Heartbeat') {
      this._logger.debug(`request() [method: ${method}, id: ${request.id}]`)
    }

    // This may throw.
    await this._transport.send(request)

    return new Promise((pResolve, pReject) => {
      const timeout =
        getParameters().protooMessageTimeout /*15000 * (15 + (0.1 * this._sents.size));*/
      const sent = {
        id: request.id,
        method: request.method,
        startTs: Date.now(),
        resolve: (data2) => {
          if (!this._sents.delete(request.id)) {
            return
          }
          if (this._closed) {
            return
          }
          clearTimeout(sent.timer)
          pResolve(data2)
        },
        reject: (error) => {
          if (!this._sents.delete(request.id)) {
            return
          }

          clearTimeout(sent.timer)
          pReject(error)
        },
        timer: setTimeout(() => {
          if (!this._sents.delete(request.id)) {
            return
          }

          pReject(new Error('request timeout'))
        }, timeout),
        close: () => {
          // //this._logger.debug('主动关闭了 sent: ', sent)
          // clearTimeout(sent.timer);
          // this._logger.debug(`向edge的 ${sent.method} 请求, id ${sent.id} 被取消：连接 #${this.id} 已被关闭。连接建立时间：${this._data.openTs - this._data.createTs}ms, 请求时间：${Date.now() - sent.startTs}ms`)
          // return pResolve({errMsg: 'peer closed'})

          let err = new Error()
          err.name = 'peer closed'
          if (sent.method) {
            err.message = `向edge的 ${sent.method} 请求被取消：连接 #${
              this.id
            } 已被关闭。连接建立时间：${this._data.openTs - this._data.createTs}ms, 请求时间：${
              Date.now() - sent.startTs
            }ms`
          }
          pReject(err)
        }
      }

      // Add sent stuff to the map.
      this._sents.set(request.id, sent)
    })
  }

  /**
   * Send a protoo notification to the server-side Room.
   *
   * @param {String} method
   * @param {Object} [data]
   *
   * @async
   */
  async notify(method, data = undefined) {
    const notification = Message.createNotification(method, data)

    this._logger.debug('notify() [method:%s]', method)

    // This may throw.
    await this._transport.send(notification)
  }

  _handleTransport() {
    if (this._transport.closed) {
      this._closed = true

      setTimeout(() => {
        if (this._closed) {
          return
        }

        this._connected = false

        this.safeEmit('close')
      })

      return
    }

    this._transport.on('open', () => {
      if (this._closed) {
        return
      }

      logger.debug('emit "open"')

      this._connected = true

      this._data.openTs = Date.now()

      this.safeEmit('open')
    })

    this._transport.on('disconnected', () => {
      if (this._closed) {
        return
      }

      logger.debug('emit "disconnected"')

      this._connected = false

      this.safeEmit('disconnected')
    })

    this._transport.on('failed', (currentAttempt) => {
      if (this._closed) {
        return
      }

      logger.debug('emit "failed" [currentAttempt:%s]', currentAttempt)

      this._connected = false

      this.safeEmit('failed', currentAttempt)
    })

    this._transport.on('close', () => {
      if (this._closed) {
        return
      }

      this._closed = true

      logger.debug('emit "close"')

      this._connected = false

      this.safeEmit('close')
    })

    this._transport.on('message', (message) => {
      if (message.request) {
        this._handleRequest(message)
      } else if (message.response) {
        this._handleResponse(message)
      } else if (message.notification) {
        this._handleNotification(message)
      }
    })
  }

  _handleRequest(request) {
    try {
      this.emit(
        'request',
        // Request.
        request,
        // accept() function.
        (data) => {
          const response = Message.createSuccessResponse(request, data)

          this._transport.send(response).catch(() => {})
        },
        // reject() function.
        (errorCode, errorReason) => {
          if (errorCode instanceof Error) {
            errorCode = 500
            errorReason = String(errorCode)
          } else if (typeof errorCode === 'number' && errorReason instanceof Error) {
            errorReason = String(errorReason)
          }

          const response = Message.createErrorResponse(request, errorCode, errorReason)

          this._transport.send(response).catch(() => {})
        }
      )
    } catch (error) {
      const response = Message.createErrorResponse(request, 500, String(error))

      this._transport.send(response).catch(() => {})
    }
  }

  _handleResponse(response) {
    const sent = this._sents.get(response.id)
    if (!sent) {
      logger.error(
        'received response does not match any sent request',
        response.id,
        JSON.stringify(response)
      )

      return
    }

    if (response.ok) {
      sent.resolve(response.data)
    } else {
      const error = new Error(response.errorReason)

      error.code = response.errorCode
      sent.reject(error)
    }
  }

  _handleNotification(notification) {
    if (this._handleNotification > notification.id) {
      //服务器通知的消息id是递增的，如果新通知的id小于当前的通知消息的id，则忽略。
      logger.warn('忽略重复的通知消息: ', JSON.stringify(notification, null, ' '))
      return
    }

    this._notificationId = notification.id
    //针对服务的notify通知，需要回复ack
    const ack = Message.createSuccessResponse(notification, {})
    this._transport.send(ack).catch(() => {})
    this.safeEmit('notification', notification)
  }
}

module.exports = Peer
