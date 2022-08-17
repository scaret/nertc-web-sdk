export const ok = {
  name: 'OK',
  code: 200,
  desc: 'success'
}

export const invalidArguments = {
  name: 'invalid arguments',
  code: 1,
  desc: '请检查参数的有效性'
}

export const clientNotYetUninitialized = {
  name: 'client not yet uninitialized',
  code: 2,
  desc: '请先调用createClient创建Client'
}

export const STREAM_HAS_NO_MEDIA_ATTRIBUTES = {
  name: 'STREAM_HAS_NO_MEDIA_ATTRIBUTES',
  code: 10,
  desc: 'stream不合法，没有audio、video或者screen属性'
}

export const clientNotYetPublished = {
  name: 'client not yet published',
  code: 11,
  desc: '请先publish'
}

export const serverError = {
  name: 'server error code',
  code: 414,
  desc: ''
}
