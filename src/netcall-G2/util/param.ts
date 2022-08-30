import {
  ExistsOptions,
  ValidBooleanOptions,
  ValidFloatOptions,
  ValidIntegerOptions,
  ValidStringOptions
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'

const isValidInteger = (param: ValidIntegerOptions) => {
  if (!Number.isInteger(param.value)) {
    return {
      result: false,
      msg: `参数不是整数`
    }
  } else if (typeof param.min === 'number' && param.value < param.min) {
    return {
      result: false,
      msg: `参数小于最小值${param.min}`
    }
  } else if (typeof param.max === 'number' && param.value > param.max) {
    return {
      result: false,
      msg: `参数大于最大值${param.max}`
    }
  } else {
    return {
      result: true
    }
  }
}

const checkValidInteger = (param: ValidIntegerOptions) => {
  const data = isValidInteger(param)
  if (data.result) {
    return
  } else {
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER,
      message: `invalid parameter: ${param.tag}:${data.msg}`
    })
  }
}

const isValidBoolean = (param: ValidBooleanOptions) => {
  if (typeof param.value !== 'boolean') {
    return {
      result: false,
      msg: `参数不是布尔类型`
    }
  } else {
    return {
      result: true
    }
  }
}

const checkValidBoolean = (param: ValidBooleanOptions) => {
  const data = isValidBoolean(param)
  if (data.result) {
    return
  } else {
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER,
      message: `invalid parameter: ${param.tag}:${data.msg}`
    })
  }
}

const isValidString = (param: ValidStringOptions) => {
  if (typeof param.value !== 'string') {
    return {
      result: false,
      msg: `参数不是字符串`
    }
  } else if (typeof param.min === 'number' && param.value.length < param.min) {
    return {
      result: false,
      msg: `参数长度最小值${param.min}`
    }
  } else if (typeof param.max === 'number' && param.value.length > param.max) {
    return {
      result: false,
      msg: `参数长度大于最大值${param.max}`
    }
  } else {
    return {
      result: true
    }
  }
}

const checkValidString = (param: ValidStringOptions) => {
  const data = isValidString(param)
  if (data.result) {
    return
  } else {
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER,
      message: `invalid parameter: ${param.tag}:${data.msg}`
    })
  }
}

const isValidFloat = (param: ValidFloatOptions) => {
  if (!Number.isFinite(param.value)) {
    return {
      result: false,
      msg: `参数不是float类型`
    }
  } else if (typeof param.min === 'number' && param.value < param.min) {
    return {
      result: false,
      msg: `参数小于最小值${param.min}`
    }
  } else if (typeof param.max === 'number' && param.value > param.max) {
    return {
      result: false,
      msg: `参数大于最大值${param.max}`
    }
  } else {
    return {
      result: true
    }
  }
}

const checkValidFloat = (param: ValidFloatOptions) => {
  const data = isValidFloat(param)
  if (data.result) {
    return
  } else {
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER,
      message: `invalid parameter: ${param.tag}:${data.msg}`
    })
  }
}

const isExistOptions = (param: ExistsOptions) => {
  if (typeof param.value === 'undefined' || param.value === null) {
    return {
      result: false,
      msg: `未填必选参数`
    }
  } else {
    return {
      result: true
    }
  }
}

const checkExists = (param: ExistsOptions) => {
  const data = isExistOptions(param)
  if (data.result) {
    return
  } else {
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER,
      message: `invalid parameter: ${param.tag}:${data.msg}`
    })
  }
}

export {
  checkExists,
  checkValidBoolean,
  checkValidFloat,
  checkValidInteger,
  checkValidString,
  isExistOptions
}
