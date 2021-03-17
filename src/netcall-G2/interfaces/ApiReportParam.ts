export interface ReportParamBase {
  reason?: string
}

export interface ReportParamSetChannelProfile extends ReportParamBase{
  channelProfile?: number
}

export interface ReportParamSetClientRole extends ReportParamBase{
  role?: number
}

export interface ReportParamSubscribeRemoteSubStreamVideo extends ReportParamBase{
  uid: number|null,
  subscribe: boolean
}