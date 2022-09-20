import { ILogger, AdapterRef } from '../../../types'

export interface modelOptions {
  wasmUrl: string
  logger: ILogger
  adapterRef: AdapterRef
}
