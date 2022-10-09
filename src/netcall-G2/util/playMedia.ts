import { Timer } from '../types'

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