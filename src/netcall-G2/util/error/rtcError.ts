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
  private proposal_?: any
  private extraCode_: any
  constructor(options: any) {
    let defaultUrl =
      'https://doc.yunxin.163.com/docs/interface/NERTC_SDK/Latest/Web/api/index.html#errorCode'
    let url = options.url ? options.url : defaultUrl
    let proposalMsg = options.proposal ? ` proposal: ${options.proposal} ` : ''
    super(
      options.message +
        ` <${getErrorName(options.code)} ${options.code.toString()}> ` +
        proposalMsg +
        url
    )
    this.code_ = options.code
    this.message_ = options.message
    this.proposal_ = options.proposal
    this.extraCode_ = options.extraCode
  }

  get code() {
    return this.code_
  }

  get message() {
    return this.message_
  }

  getCode() {
    return this.code_
  }

  getMessage() {
    return this.message_
  }

  getProposal() {
    return this.proposal_
  }

  getExtraCode() {
    return this.extraCode_
  }
}

export default RtcError
