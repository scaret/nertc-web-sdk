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

export interface ReportParamGetConnectionState extends ReportParamBase{
}

export interface ReportParamEnableEarback extends ReportParamBase{
  enable?: boolean
}

export interface ReportParamSwitchCamera extends ReportParamBase{
}

export interface ReportParamSetExternalAudioRender extends ReportParamBase{
}

export interface ReportParamEnableEncryption extends ReportParamBase{
  mode?: number;
  enable: boolean;
}