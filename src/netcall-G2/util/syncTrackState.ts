import { ILogger } from '../types'
import { Logger } from './webrtcLogger'

const logger: ILogger = new Logger({
  tagGen: () => {
    return 'syncTrackState'
  }
})

const trackList: {
  srcTrack: MediaStreamTrack
  destTrack: MediaStreamTrack
  direction: 'oneway' | 'bidirectional'
  enabled: boolean
}[] = []

let timer = setInterval(() => {
  for (let pairId = trackList.length - 1; pairId >= 0; pairId--) {
    const pair = trackList[pairId]
    if (pair.srcTrack.readyState === 'ended') {
      if (pair.destTrack.readyState === 'live') {
        logger.log(
          `同步MediaStreamTrack关闭状态。【${pair.srcTrack.label}】=>【${pair.destTrack.label}】`
        )
        pair.destTrack.stop()
      }
      trackList.splice(pairId, 1)
      return
    }
    if (pair.direction === 'bidirectional' && pair.destTrack.readyState === 'ended') {
      if (pair.srcTrack.readyState === 'live') {
        logger.warn(
          `同步MediaStreamTrack关闭状态。【${pair.destTrack.label}】=>【${pair.srcTrack.label}】`
        )
        pair.srcTrack.stop()
      }
      trackList.splice(pairId, 1)
      return
    }
    if (pair.srcTrack.enabled !== pair.enabled) {
      pair.enabled = pair.srcTrack.enabled
      if (pair.srcTrack.enabled !== pair.destTrack.enabled) {
        logger.warn(`同步MediaStreamTrack enabled:【${pair.srcTrack.label}】`, pair.enabled)
        pair.destTrack.enabled = pair.srcTrack.enabled
      }
    }
    if (pair.direction === 'bidirectional' && pair.destTrack.enabled !== pair.enabled) {
      pair.enabled = pair.destTrack.enabled
      if (pair.destTrack.enabled !== pair.srcTrack.enabled) {
        logger.warn(`同步MediaStreamTrack enabled:【${pair.srcTrack.label}】`, pair.enabled)
        pair.srcTrack.enabled = pair.destTrack.enabled
      }
    }
  }
}, 1000)

export function syncTrackState(
  srcTrack: MediaStreamTrack,
  destTrack: MediaStreamTrack,
  direction: 'oneway' | 'bidirectional'
) {
  trackList.push({
    srcTrack,
    destTrack,
    direction,
    enabled: srcTrack.enabled
  })
}
