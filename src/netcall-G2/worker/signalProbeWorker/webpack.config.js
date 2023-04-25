/**
 * 由于SDK是单文件的特殊性，Worker的开发遵从以下规则：
 * 1.简单的Worker不要使用WebPack打包，WebPack本身就有损耗
 * 2.Worker源代码放在`worker`目录，通过单独的WebPack进程编译。编译结果放在`module/blobs/raw`下，再以string+Blob的方式引入
 */
const path = require('path')
module.exports = {
  mode: 'production',
  entry: {
    signalProbeWorker: path.join(__dirname, './signalProbeWorker.ts')
  },
  target: 'webworker',
  output: {
    path: path.join(__dirname, '../../module/blobs/raw')
  },
  module: {
    rules: [
      {
        test: /signalProbeWorker\/.*\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
}
