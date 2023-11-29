import { AdapterRef } from '../../../types'

export interface modelOptions {
  wasmUrl: string
  adapterRef: AdapterRef
}

export interface ReverbObjType {
  wetGain: number
  dryGain: number
  damping: number
  roomSize: number
  decayTime: number
  preDelay: number
}

export type ReverbType = keyof ReverbObjType
