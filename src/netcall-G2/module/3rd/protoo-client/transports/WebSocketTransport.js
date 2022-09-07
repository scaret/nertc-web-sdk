const retry = require('retry')
const Logger = require('../Logger')
const EnhancedEventEmitter = require('../EnhancedEventEmitter')
const Message = require('../Message')
var JSONbig = require('json-bigint')
const WS_SUBPROTOCOL = 'protoo'
const DEFAULT_RETRY_OPTIONS = {
  retries: 10,
  factor: 2,
  minTimeout: 1 * 1000,
  maxTimeout: 8 * 1000
}

const logger = new Logger('WebSocketTransport')

let wsId = 0

class WebSocketTransport extends EnhancedEventEmitter {
  /**
   * @param {String} url - WebSocket URL.
   * @param {Object} [options] - Options for WebSocket-Node.W3CWebSocket and retry.
   */
  constructor(url, options) {
    super(logger)

    logger.debug('constructor() [url:%s, options:%o]', url, options)

    // Closed flag.
    // @type {Boolean}
    this._closed = false

    // WebSocket URL.
    // @type {String}
    this._url = url

    // Options.
    // @type {Object}
    this._options = options || {}

    // WebSocket instance.
    // @type {WebSocket}
    this._ws = null

    this.wsid = 0

    this.skipReconnection = false

    // Run the WebSocket.
    this._runWebSocket()
  }

  get closed() {
    return this._closed
  }

  close() {
    if (this._closed) return

    logger.debug('close()')

    // Don't wait for the WebSocket 'close' event, do it now.
    this._closed = true
    this.safeEmit('close')

    try {
      this._ws.onopen = null
      this._ws.onclose = null
      this._ws.onerror = null
      this._ws.onmessage = null
      this._ws.close()
    } catch (error) {
      logger.error('close() | error closing the WebSocket: %o', error)
    }
  }

  async send(message) {
    if (this._closed) throw new Error('transport closed')

    try {
      this._ws.send(JSONbig.stringify(message))
    } catch (error) {
      logger.warn('send() failed:', error.name, error.message)

      throw error
    }
  }

  _runWebSocket() {
    const operation = retry.operation(this._options.retry || DEFAULT_RETRY_OPTIONS)

    let wasConnected = false

    operation.attempt((currentAttempt) => {
      if (this._closed) {
        operation.stop()

        return
      }

      logger.debug('_runWebSocket() [currentAttempt:%s]', currentAttempt)

      this._ws = new WebSocket(this._url, [WS_SUBPROTOCOL])

      wsId++
      this.wsid = wsId

      this._ws.onopen = () => {
        if (this._closed) return

        wasConnected = true

        // Emit 'open' event.
        this.safeEmit('open')
      }

      this._ws.onclose = (event) => {
        if (this._closed) return

        logger.warn(
          'WebSocket "close" event [wasClean:%s, code:%s, reason:"%s"]',
          event.wasClean,
          event.code,
          event.reason
        )

        // 删除逻辑： Don't retry if code is 4000 (closed by the server). https://g.hz.netease.com/yunxin/nertc-web-sdk/-/merge_requests/369
        if (true || event.code !== 4000) {
          // If it was not connected, try again.
          if (!wasConnected) {
            this.safeEmit('failed', currentAttempt)

            if (this._closed) return

            if (operation.retry(true)) return
          }
          // If it was connected, start from scratch.
          else {
            operation.stop()

            this.safeEmit('disconnected')

            if (this._closed || this.skipReconnection) return

            this._runWebSocket()

            return
          }
        }

        this._closed = true

        // Emit 'close' event.
        this.safeEmit('close')
      }

      this._ws.onerror = () => {
        if (this._closed) return

        logger.error('WebSocket "error" event')
      }

      this._ws.onmessage = (event) => {
        if (this._closed) return

        const message = Message.parse(event.data)

        if (!message) return

        if (this.listenerCount('message') === 0) {
          logger.error('no listeners for WebSocket "message" event, ignoring received message')

          return
        }
        // Emit 'message' event.
        this.safeEmit('message', message)
      }
    })
  }
}

module.exports = WebSocketTransport
