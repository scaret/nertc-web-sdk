import rtcTimer from './raw/rtcTimer'
import volumeProcessor from './raw/volumeProcessor.js'
import webWorkerTimer from './raw/webWorkerTimer.js'
import audioAIProcessor from './raw/audioAIProcessor'
import audioWorkletAgentProcessor from './raw/audioWorkletAgentProcessor'

const moduleMap = {
  volumeProcessor: {
    blobParts: [volumeProcessor],
    options: { type: 'text/javascript; charset=utf-8' },
    url: ''
  },
  audioWorkletAgentProcessor: {
    blobParts: [audioWorkletAgentProcessor],
    options: { type: 'text/javascript; charset=utf-8' },
    url: ''
  },
  webWorkerTimer: {
    blobParts: [webWorkerTimer],
    options: { type: 'text/javascript; charset=utf-8' },
    url: ''
  },
  audioAIProcessor: {
    blobParts: [audioAIProcessor],
    options: { type: 'text/javascript; charset=utf-8' },
    url: ''
  },
  rtcTimer: {
    blobParts: [rtcTimer],
    options: { type: 'text/js-worker' },
    url: ''
  }
}

export function getBlobUrl(moduleName: keyof typeof moduleMap) {
  if (!moduleMap[moduleName].url) {
    const blob = new Blob(moduleMap[moduleName].blobParts, moduleMap[moduleName].options)
    moduleMap[moduleName].url = window.URL.createObjectURL(blob)
  }
  return moduleMap[moduleName].url
}
