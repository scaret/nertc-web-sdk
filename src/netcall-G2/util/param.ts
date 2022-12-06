import {
  ExistsOptions,
  ValidBooleanOptions,
  ValidFloatOptions,
  ValidIntegerOptions,
  ValidStringOptions
} from '../types'
import ErrorCode from '../util/error/errorCode'
import RtcError from '../util/error/rtcError'
import * as env from '../util/rtcUtil/rtcEnvironment'

const isValidInteger = (param: ValidIntegerOptions) => {
  if (!Number.isInteger(param.value)) {
    return {
      result: false,
      zhMsg: `参数不是整数`,
      enMsg: `Parameter is not Number`
    }
  } else if (typeof param.min === 'number' && param.value < param.min) {
    return {
      result: false,
      zhMsg: `参数小于最小值 ${param.min}`,
      enMsg: `The parameter is less than the minimum value ${param.min}`
    }
  } else if (typeof param.max === 'number' && param.value > param.max) {
    return {
      result: false,
      zhMsg: `参数大于最大值 ${param.max}`,
      enMsg: `The parameter is greater than the maximum value ${param.max}`
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
    let message = env.IS_ZH
      ? `checkValidInteger: 参数错误: ${param.tag}:${data.zhMsg}`
      : `checkValidInteger: invalid parameter: ${param.tag}:${data.enMsg}`
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER_ERROR,
      message
    })
  }
}

const isValidBoolean = (param: ValidBooleanOptions) => {
  if (typeof param.value !== 'boolean') {
    return {
      result: false,
      enMsg: `The parameter is not Boolean`,
      zhMsg: `参数不是布尔类型`
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
    let message = env.IS_ZH
      ? `checkValidBoolean: 参数错误: ${param.tag}:${data.zhMsg}`
      : `checkValidBoolean: invalid parameter: ${param.tag}:${data.enMsg}`
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER_ERROR,
      message
    })
  }
}

const isValidString = (param: ValidStringOptions) => {
  if (typeof param.value !== 'string') {
    return {
      result: false,
      zhMsg: `参数不是字符串`,
      enMsg: `The parameter is not String`
    }
  } else if (typeof param.min === 'number' && param.value.length < param.min) {
    return {
      result: false,
      zhMsg: `参数长度最小值${param.min}`,
      enMsg: `The parameter is less than the minimum value ${param.min}`
    }
  } else if (typeof param.max === 'number' && param.value.length > param.max) {
    return {
      result: false,
      zhMsg: `参数长度大于最大值${param.max}`,
      enMsg: `The parameter is greater than the maximum value ${param.max}`
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
    let message = env.IS_ZH
      ? `checkValidString: 参数错误: ${param.tag}:${data.zhMsg}`
      : `checkValidString: invalid parameter: ${param.tag}:${data.enMsg}`
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER_ERROR,
      message
    })
  }
}

const isValidFloat = (param: ValidFloatOptions) => {
  if (!Number.isFinite(param.value)) {
    return {
      result: false,
      zhMsg: `参数不是float类型`,
      enMsg: `The parameter is not float`
    }
  } else if (typeof param.min === 'number' && param.value < param.min) {
    return {
      result: false,
      zhMsg: `参数小于最小值${param.min}`,
      enMsg: `The parameter is less than the minimum value ${param.min}`
    }
  } else if (typeof param.max === 'number' && param.value > param.max) {
    return {
      result: false,
      zhMsg: `参数大于最大值${param.max}`,
      enMsg: `The parameter is greater than the maximum value ${param.max}`
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
    let message = env.IS_ZH
      ? `checkValidFloat: 参数错误: ${param.tag}:${data.zhMsg}`
      : `checkValidFloat: invalid parameter: ${param.tag}:${data.enMsg}`
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER_ERROR,
      message
    })
  }
}

const isExistOptions = (param: ExistsOptions) => {
  if (typeof param.value === 'undefined' || param.value === null) {
    return {
      result: false,
      zhMsg: `未填必选参数`,
      enMsg: `Missing required parameters`
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
    let message = env.IS_ZH
      ? `checkExists: 参数错误: ${param.tag}:${data.zhMsg}`
      : `checkExists: invalid parameter: ${param.tag}:${data.enMsg}`
    throw new RtcError({
      code: ErrorCode.INVALID_PARAMETER_ERROR,
      message
    })
  }
}

export {
  isValidInteger,
  checkExists,
  checkValidBoolean,
  checkValidFloat,
  checkValidInteger,
  checkValidString,
  isExistOptions
}
