const child_process = require('child_process')

const status = child_process.execSync('jsdoc -r -c ./build/api/jsdoc.config.json -t ./external/ink-docstrap/template -d ./dist/api')

// const status = child_process.execSync('jsdoc -c ./build/api/jsdoc.config.json -d ./dist/api')
