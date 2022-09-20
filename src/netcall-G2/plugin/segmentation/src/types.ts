import { ILogger, AdapterRef } from '../../../types'

export interface BackGroundOptions {
  type: string
  source?: HTMLImageElement | string
  color?: string
  level?: number
}

export interface modelOptions {
  wasmUrl: string
  logger: ILogger
  adapterRef: AdapterRef
}
