/**
 * 返回一个能够自动播放的Video元素
 */
let videoId = 0
export function getAutoplayVideo() {
  const videoDom = document.createElement('video')
  // 样式
  videoDom.style.position = 'absolute'
  //videoDom.style.objectFit = 'cover'
  // 设置属性
  videoDom.setAttribute('x-webkit-airplay', 'x-webkit-airplay')
  videoDom.setAttribute('playsinline', 'playsinline')
  videoDom.setAttribute('webkit-playsinline', 'webkit-playsinline')
  videoDom.preload = 'auto'
  videoDom.className = `nertc-video-id-${videoId++}`
  videoDom.autoplay = true
  videoDom.muted = true
  return videoDom
}
