// https://github.com/HerringtonDarkholme/json-big 93dfc3c

import { stringify } from './lib/stringify'
import { JSONParse } from './lib/parse'

export const JSONBigParse = JSONParse()
export const JSONBigStringify = stringify
