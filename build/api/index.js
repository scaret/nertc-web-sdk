const fs = require('fs');
const path = require('path');
const child_process = require('child_process')
const pjson = require('../../package.json');

const title = `NERTC V${pjson.webrtcG2Version}`
if (fs.existsSync(path.join(__dirname, '../../doc'))){
  console.error('文档已迁移至docs/src, 请把文件迁移到d.ts');
  process.exit(0)
}

try {
  const status = child_process.execSync(`typedoc --name "${title}" --tsconfig ../../tsconfig_typedoc.json`)
} catch (e) {
  console.error("文档生成失败");
  console.log(e.stdout.toString('utf8'));
  console.error(e.stderr.toString('utf8'));
  process.exit(0);
}

// const status = child_process.execSync('jsdoc -c ./build/api/jsdoc.config.json -d ./dist/api')
