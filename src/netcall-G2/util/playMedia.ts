import { Timer } from '../types'
import { printForLongPromise } from './gum'

export function playMedia(
  media: HTMLVideoElement | HTMLAudioElement,
  timeout: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let timer: Timer | null = setTimeout(() => {
      if (timer) {
        timer = null
        resolve()
      }
    }, timeout)
    const p1 = media.play()
    printForLongPromise(p1, '媒体标签仍在启动播放中')
    p1.then(() => {
      if (timer) {
        clearTimeout(timer)
        timer = null
        resolve()
      }
    })
    p1.catch((e) => {
      if (timer) {
        clearTimeout(timer)
        timer = null
        reject(e)
      }
    })
  })
}
