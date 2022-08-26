import ErrorCode from './errorCode'

const getErrorName = function (code: number) {
  for (let key in ErrorCode) {
    // @ts-ignore
    if (ErrorCode[key] === code) {
      return key
    }
  }
  return 'UNKNOWN'
}

class RtcError extends Error {
  private code_: any
  private message_: any
  private advice_?: any
  private extraCode_: any
  constructor(options: any) {
    let defaultUrl =
      'https://doc.yunxin.163.com/docs/interface/NERTC_SDK/Latest/Web/api/index.html#errorCode'
    let url = options.url ? options.url : defaultUrl
    let adviceMsg = options.advice ? ` advice: ${options.advice} ` : ''
    super(
      options.message +
        ` <${getErrorName(options.code)} ${options.code.toString()}> ` +
        adviceMsg +
        url
    )
    this.code_ = options.code
    this.message_ = options.message
    this.advice_ = options.advice
    this.extraCode_ = options.extraCode
  }

  get code() {
    return this.code_
  }

  get message() {
    return this.message_
  }

  get advice() {
    return this.advice_
  }

  getCode() {
    return this.code_
  }

  getMessage() {
    return this.message_
  }

  getProposal() {
    return this.advice_
  }

  getExtraCode() {
    return this.extraCode_
  }
}

export default RtcError
