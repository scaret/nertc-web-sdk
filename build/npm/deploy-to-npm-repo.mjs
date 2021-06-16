#!/usr/bin/env
const path = require('path');
const fs = require('fs');

const pathNpmRepo = path.join(__dirname, '../../../nertc-npm');
const VERSION = require('../../package.json').webrtcG2Version;
const sdkSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/NIM_Web_NERTC_v${VERSION}.js`);
const sdkDest = path.join(pathNpmRepo, 'NERTCSDK.min.js')

// 1. 验证SDK版本
const commentLine = await $`head -n 1 ${sdkSrc}`;
const match = commentLine.stdout.match(/NeRTC ([^ ]*)\|BUILD ([^ ]*) ([^ ]*)/);
if (!match){
  console.error("无法读取版本格式", commentLine.stdout)
  process.exit(1)
}else if (VERSION !== match[1]){
  console.error("版本信息不匹配", VERSION, match[1])
  process.exit(1)
}else if (!match[2].match(/v\d+\.\d+\.\d+\-0-[0-9a-f]+/)){
  console.error("BUILD信息不对", match[2]);
  process.exit(1)
}else if (match[3] !== "production"){
  console.error("环境错误：", match[3]);
  process.exit(1)
}

// 2. 拷贝SDK
await $`cp -f ${sdkSrc} ${sdkDest}`

// 3. 生成package.json
const npmPackageInfo = require('./src/package.json')
npmPackageInfo.version = VERSION;
fs.writeFileSync(
  path.join(pathNpmRepo, 'package.json'), 
  JSON.stringify(npmPackageInfo, null, 2),
  'utf-8');

// 4. 拷贝文档
await $`rm -rf ${path.join(pathNpmRepo, 'types')}`
await $`cp -r ${path.join(__dirname, '../../docs/src/')} ${pathNpmRepo}/types`

// 5. git操作
await $`cd ${pathNpmRepo} && git add -A .`
await $`cd ${pathNpmRepo} && git commit -m "v${VERSION}"`
await $`cd ${pathNpmRepo} && git push origin master`
