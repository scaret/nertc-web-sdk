#!/usr/bin/env
const path = require('path');
const fs = require('fs');

const pathNpmRepo = path.join(__dirname, '../../../nertc-npm');
const VERSION = require('../../package.json').webrtcG2Version;
const sdkSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/NIM_Web_NERTC_v${VERSION}.js`);
const sdkDest = path.join(pathNpmRepo, 'NERTC.js')
const VirtualBackgroundSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/NIM_Web_VirtualBackground_v${VERSION}.js`);
const VirtualBackgroundDest = path.join(pathNpmRepo, 'NERTC_Web_SDK_VirtualBackground.js')
const VirtualBackgroundSimdWasmSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/wasm/NIM_Web_VirtualBackground_simd_v${VERSION}.wasm`);
const VirtualBackgroundSimdWasmDest = path.join(pathNpmRepo, './wasm/NERTC_Web_SDK_VirtualBackground_simd.wasm');
const VirtualBackgroundNoSimdWasmSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/wasm/NIM_Web_VirtualBackground_nosimd_v${VERSION}.wasm`);
const VirtualBackgroundNoSimdWasmDest = path.join(pathNpmRepo, './wasm/NERTC_Web_SDK_VirtualBackground_nosimd.wasm');

const AdvancedBeautySrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/NIM_Web_AdvancedBeauty_v${VERSION}.js`);
const AdvancedBeautyDest = path.join(pathNpmRepo, 'NERTC_Web_SDK_AdvancedBeauty.js')
const AdvancedBeautySimdWasmSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/wasm/NIM_Web_AdvancedBeauty_simd_v${VERSION}.wasm`);
const AdvancedBeautySimdWasmDest = path.join(pathNpmRepo, './wasm/NERTC_Web_SDK_AdvancedBeauty_simd.wasm');
const AdvancedBeautyNoSimdWasmSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/wasm/NIM_Web_AdvancedBeauty_nosimd_v${VERSION}.wasm`);
const AdvancedBeautyNoSimdWasmDest = path.join(pathNpmRepo, './wasm/NERTC_Web_SDK_AdvancedBeauty_nosimd.wasm');

const AIDenoiseSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/NIM_Web_AIDenoise_v${VERSION}.js`);
const AIDenoiseDest = path.join(pathNpmRepo, 'NERTC_Web_SDK_AIDenoise.js')
const AIDenoiseSimdWasmSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/wasm/NIM_Web_AIDenoise_simd_v${VERSION}.wasm`);
const AIDenoiseSimdWasmDest = path.join(pathNpmRepo, './wasm/NERTC_Web_SDK_AIDenoise_simd.wasm');
const AIDenoiseNoSimdWasmSrc = path.join(__dirname, `../../dist/lib/${VERSION}/production/wasm/NIM_Web_AIDenoise_nosimd_v${VERSION}.wasm`);
const AIDenoiseNoSimdWasmDest = path.join(pathNpmRepo, './wasm/NERTC_Web_SDK_AIDenoise_nosimd.wasm');

const wasmDir = path.join(pathNpmRepo, 'wasm');

// 1. 验证SDK版本
const commentLine = await $`head -n 1 ${sdkSrc}`;
const firstLine = commentLine.stdout
const match = firstLine.match(/NeRTC ([^ ]*)\|BUILD ([^ ]*) ([^ ]*)/);
if (!match){
  console.error("\x1b[1;31m无法读取版本格式\x1b[m", commentLine.stdout)
  process.exit(1)
}else if (VERSION !== match[1]){
  console.error("\x1b[1;31m版本信息不匹配\x1b[m", VERSION, match[1])
  process.exit(1)
}else if (!match[2].match(/v\d+\.\d+\.\d+\-0-g[0-9a-f]+/)){
  console.error("\x1b[1;31mBUILD信息不对，但继续\x1b[m", match[2]);
}else if (match[3] !== "production"){
  console.error("\x1b[1;31m环境错误：\x1b[1;31m", match[3]);
  process.exit(1)
}

// 2. 准备git仓库
await $`cd ${pathNpmRepo} && git reset --hard HEAD && git pull origin master && rm -rf *.js`

// 3. 拷贝SDK
await $`cp -f ${sdkSrc} ${sdkDest}`
// 拷贝插件
await $`cp -f ${VirtualBackgroundSrc} ${VirtualBackgroundDest}`
await $`cp -f ${AdvancedBeautySrc} ${AdvancedBeautyDest}`
await $`cp -f ${AIDenoiseSrc} ${AIDenoiseDest}`
await $`rm -rf ${wasmDir}`
await $`mkdir ${wasmDir}`
await $`cp -f ${VirtualBackgroundSimdWasmSrc} ${VirtualBackgroundSimdWasmDest}`
await $`cp -f ${VirtualBackgroundNoSimdWasmSrc} ${VirtualBackgroundNoSimdWasmDest}`
await $`cp -f ${AdvancedBeautySimdWasmSrc} ${AdvancedBeautySimdWasmDest}`
await $`cp -f ${AdvancedBeautyNoSimdWasmSrc} ${AdvancedBeautyNoSimdWasmDest}`
await $`cp -f ${AIDenoiseSimdWasmSrc} ${AIDenoiseSimdWasmDest}`
await $`cp -f ${AIDenoiseNoSimdWasmSrc} ${AIDenoiseNoSimdWasmDest}`

// 4. 拷贝文档
await $`rm -rf ${path.join(pathNpmRepo, 'types')}`
await $`cp -r ${path.join(__dirname, '../../docs/src/')} ${pathNpmRepo}/types`
// 改变声明文件输出方式
let content = fs.readFileSync(`${pathNpmRepo}/types/nertc.d.ts`, 'utf-8');
content = content.replace("export as namespace", "export =");
fs.writeFileSync(`${pathNpmRepo}/types/nertc.d.ts`, content, 'utf-8');

// 5. git操作
await $`cd ${pathNpmRepo} && npm version ${VERSION} --allow-same-version --no-git-tag-version`
await $`cd ${pathNpmRepo} && git add -A .`
await $`cd ${pathNpmRepo} && git commit -m "${firstLine.replace(/[^\w\-\.]/g, ' ').trim()}"`
await $`cd ${pathNpmRepo} && git push origin master`

