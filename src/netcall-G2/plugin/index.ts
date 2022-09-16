import Pluggins, { AudioPluginType, VideoPluginType } from './plugin-list'

export function loadPlugin(key: VideoPluginType | AudioPluginType, url: string) {
  return new Promise<void>((resolve, reject) => {
    if (Pluggins.indexOf(key) == -1) {
      reject(`unsupport plugin ${key}`)
    }
    const script = document.createElement('script')
    script.defer = true
    script.src = url
    document.body.appendChild(script)
    script.onload = function () {
      resolve()
    }
    script.onerror = function (e) {
      reject(`Load plugin ${url} error`)
    }
  })
}
