export type MIXING_STATES =
  | 'MIX_UNSTART'
  | 'MIX_STARTING'
  | 'MIX_PLAYING'
  | 'MIX_PAUSED'
  | 'MIX_STOPED'

export const AuidoMixingState: { [state: string]: MIXING_STATES } = {
  UNSTART: 'MIX_UNSTART',
  STARTING: 'MIX_STARTING',
  PLAYED: 'MIX_PLAYING',
  PAUSED: 'MIX_PAUSED',
  STOPED: 'MIX_STOPED'
}
