const child_process = require('child_process')
const pjson = require('../../package.json');

const title = `NeRTC G2 v${pjson.webrtcG2Version}`

const status = child_process.execSync(`typedoc --name "${title}" --tsconfig ../../tsconfig_typedoc.json`)

// const status = child_process.execSync('jsdoc -c ./build/api/jsdoc.config.json -d ./dist/api')
