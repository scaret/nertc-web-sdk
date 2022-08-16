const Logger = require('./Logger')
const { generateRandomNumber } = require('./utils')
//js里面的整数有安全范围，即最大能显示的范围，超过了这个范围可能会精度丢失
//Number.MAX_SAFE_INTEGER  //值为9007199254740991
const JSONbig = require('json-bigint')

const logger = new Logger('Message')

class Message {
  static parse(raw) {
    let object
    const message = {}

    try {
      object = JSONbig.parse(raw)
    } catch (error) {
      logger.error('parse() | invalid JSONbig: %s', error)

      return
    }

    if (typeof object !== 'object' || Array.isArray(object)) {
      logger.error('parse() | not an object')

      return
    }

    // Request.
    if (object.request) {
      message.request = true

      if (typeof object.method !== 'string') {
        logger.error('parse() | missing/invalid method field')

        return
      }

      if (typeof object.id !== 'number') {
        logger.error('parse() | missing/invalid id field')

        return
      }

      message.id = object.id
      message.method = object.method
      message.data = object.data || {}
    }
    // Response.
    else if (object.response) {
      message.response = true

      if (typeof object.id !== 'number') {
        logger.error('parse() | missing/invalid id field')

        return
      }

      message.id = object.id

      // Success.
      if (object.ok) {
        message.ok = true
        message.data = object.data || {}
      }
      // Error.
      else {
        message.ok = false
        message.errorCode = object.errorCode
        message.errorReason = object.errorReason
      }
    }
    // Notification.
    else if (object.notification) {
      message.notification = true

      if (typeof object.method !== 'string') {
        logger.error('parse() | missing/invalid method field')

        return
      }

      message.id = object.id
      message.method = object.method
      message.data = object.data || {}
    }
    // Invalid.
    else {
      logger.error('parse() | missing request/response field')

      return
    }

    return message
  }

  static createRequest(method, data) {
    const request = {
      request: true,
      id: generateRandomNumber(),
      method: method,
      data: data || {}
    }

    return request
  }

  static createSuccessResponse(request, data) {
    const response = {
      response: true,
      id: request.id,
      ok: true,
      data: data || {}
    }

    return response
  }

  static createErrorResponse(request, errorCode, errorReason) {
    const response = {
      response: true,
      id: request.id,
      ok: false,
      errorCode: errorCode,
      errorReason: errorReason
    }

    return response
  }

  static createNotification(method, data) {
    const notification = {
      notification: true,
      method: method,
      data: data || {}
    }

    return notification
  }
}

module.exports = Message
