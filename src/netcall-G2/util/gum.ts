import { AudioLevel } from '../module/audioLevel'
import { compatAudioInputList } from '../module/compatAudioInputList'
import { Device } from '../module/device'
import { getParameters } from '../module/parameters'
import { getAudioContext } from '../module/webAudio'
import { GUMConstaints, ILogger, NeMediaStreamTrack, Timer } from '../types'
import { canShimCanvas, shimCanvas } from './rtcUtil/shimCanvas'
import { syncTrackState } from './syncTrackState'
import { getDefaultLogger, Logger } from './webrtcLogger'
import { MEDIA_READYSTATE_REV } from '../constant/videoQuality'
import { patchScreenConstraints } from './rtcUtil/forceConstraints'

const logger: ILogger = new Logger({
  tagGen: () => {
    return 'GUM'
  }
})

let gumTotal = 0

let getSettingsEnabled = 'getSettings' in MediaStreamTrack.prototype

async function getStream(constraint: GUMConstaints, logger: ILogger) {
  if (constraint.audio && typeof constraint.audio === 'object') {
    if (!constraint.audio.deviceId) {
      const defaultDevice = Device.deviceHistory.audioIn.find((deviceInfo) => {
        return deviceInfo.deviceId === 'default'
      })
      if (defaultDevice) {
        logger.log(`getStream：音频使用默认设备${defaultDevice.label}`)
        constraint.audio.deviceId = { exact: defaultDevice.deviceId }
      }
    }
    if (compatAudioInputList.enabled) {
      logger.log(`兼容模式：constraint强制将channelCount设为2，echoCancellation设为false`)
      constraint.audio.channelCount = 2
      constraint.audio.echoCancellation = false
    }
  }
  const gumCount = ++gumTotal
  logger.log(`getLocalStream constraint: #${gumCount}`, JSON.stringify(constraint))
  try {
    const p = navigator.mediaDevices.getUserMedia(constraint)
    printForLongPromise(p, `仍在等待 getUserMedia 返回 #${gumCount}`)
    const stream = await p
    logger.log(`获取到媒体流: #${gumCount}`, stream.id)
    const tracks = stream.getTracks()
    for (let trackId = 0; trackId < tracks.length; trackId++) {
      const track = tracks[trackId]
      watchTrack(track)
      if (track.kind === 'video') {
        if (canShimCanvas()) {
          logger.warn('使用canvas track取代videoTrack', track.label)
          const canvasTrack = shimCanvas(track)
          watchTrack(canvasTrack)
          stream.removeTrack(track)
          stream.addTrack(canvasTrack)
        }
      } else if (track.kind === 'audio') {
        if (compatAudioInputList.enabled) {
          let settings
          if (getSettingsEnabled) {
            settings = track.getSettings ? track.getSettings() : {}
          } else {
            settings = track.getConstraints ? track.getConstraints() : {}
          }

          //@ts-ignore
          if (settings.channelCount && settings.channelCount >= 2) {
            logger.log(`该设备支持兼容模式：${track.label}`, settings)
          } else {
            logger.warn(
              `该设备为单声道设备，强行开启兼容模式(右声道无声)：${track.label}`,
              settings
            )
          }
          const context = getAudioContext()
          if (context) {
            const channelSplitter = context.createChannelSplitter(2)
            const destination = context.createMediaStreamDestination()
            const sourceStream = new MediaStream([track])
            const source = context.createMediaStreamSource(sourceStream)
            const audioLevelHelper = new AudioLevel({
              stream: sourceStream,
              logger: logger,
              sourceNode: source
            })
            let output = 0 // 0:左， 1：右
            if (getParameters().audioInputcompatMode === 'left') {
              logger.log(`兼容模式：仅使用左声道`)
              output = 0
            } else if (getParameters().audioInputcompatMode === 'right') {
              logger.log(`兼容模式：仅使用右声道`)
              output = 1
            } else if (getParameters().audioInputcompatMode === 'auto') {
              logger.log(`兼容模式：在左右声道间根据音量切换`)
              audioLevelHelper.on('channel-state-change', (evt) => {
                if (evt.state === 'leftLoud' && output === 1) {
                  logger.log(`兼容模式切换至左声道：`, track.label)
                  channelSplitter.disconnect(destination)
                  channelSplitter.connect(destination, 0)
                  output = 0
                } else if (evt.state === 'rightLoud' && output === 0) {
                  logger.log(`兼容模式切换至右声道：`, track.label)
                  channelSplitter.disconnect(destination)
                  channelSplitter.connect(destination, 1)
                  output = 1
                }
              })
            }
            source.connect(channelSplitter)
            channelSplitter.connect(destination, output)
            const destTrack = destination.stream.getTracks()[0]
            watchTrack(destTrack)
            compatAudioInputList.compatTracks.push({
              source: track,
              dest: destTrack
            })
            syncTrackState(track, destTrack, 'bidirectional')
            stream.removeTrack(track)
            stream.addTrack(destTrack)
            logger.log(`getStream：启用兼容模式成功`)
          }
        }
      }
    }
    return stream
  } catch (e: any) {
    logger.error(
      `getUserMedia error: ${e.name} [${e.message}] constraint: ${JSON.stringify(constraint)}`
    )
    /*const stream = await navigator.mediaDevices.getUserMedia({audio: true})
    logger.log('重新获取到媒体流: ', stream.id)*/
    return Promise.reject(e)
  }
}

async function getScreenStream(constraint: MediaStreamConstraints, logger: ILogger) {
  const gumCount = ++gumTotal
  patchScreenConstraints(constraint, logger)
  logger.log(`getScreenStream constraint: #${gumCount}`, JSON.stringify(constraint, null, ' '))
  //@ts-ignore
  const getDisplayMedia = navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia
  // STARTOF handleDisplayMedia
  const handleDisplayMedia = (stream: MediaStream) => {
    logger.log(`获取到屏幕共享流: #${gumCount}`, stream.id)
    const tracks = stream.getTracks()
    tracks.forEach((track) => {
      watchTrack(track)
    })
    return Promise.resolve(stream)
  }
  // ENDOF handleDisplayMedia

  let mediaStream: MediaStream
  try {
    // @ts-ignore
    const p = navigator.mediaDevices.getDisplayMedia(constraint) as Promise<MediaStream>
    printForLongPromise(p, `仍在等待 getDisplayMedia 返回 #${gumCount}`)
    mediaStream = await p
  } catch (e: any) {
    if (e?.message?.indexOf('user gesture') > -1 && Device.onUserGestureNeeded) {
      logger.warn('荧幕共享获取中断，需要手势触发。', gumCount)
      Device.onUserGestureNeeded(e)
      try {
        mediaStream = await new Promise((resolve, reject) => {
          Device.once('user-gesture-fired', () => {
            // @ts-ignore
            navigator.mediaDevices.getDisplayMedia(constraint).then(resolve).catch(reject)
          })
        })
      } catch (e: any) {
        logger.error(`第二次屏幕共享获取失败: #${gumCount}`, e.name, e.message)
        throw e
      }
    } else {
      logger.error(`屏幕共享获取失败: #${gumCount}`, e.name, e.message)
      throw e
    }
  }
  handleDisplayMedia(mediaStream)
  return mediaStream
}

//监测track状态
let lastWatchTs = Date.now()
const interval = 1000
let warningCnt = 0

const hasDuplicateDevice = function (track: MediaStreamTrack) {
  const tracks = [
    ...getParameters().tracks.video,
    ...getParameters().tracks.audio
  ] as (NeMediaStreamTrack | null)[]
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i]
    if (t && t.label === track.label && t !== track && t.readyState !== 'ended') {
      return true
    }
  }
  return false
}

const trackWatcher = () => {
  const videoTracks = getParameters().tracks.video as (NeMediaStreamTrack | null)[]
  const audioTracks = getParameters().tracks.audio as (NeMediaStreamTrack | null)[]
  const now = Date.now()
  if (now - lastWatchTs > 5000 && warningCnt < getParameters().maxEventLoopLagWarning) {
    let text = `侦测到主线程事件循环从卡死中恢复。卡顿时间：${now - lastWatchTs - interval}毫秒。`
    text += '这可能是由于页面切往后台、设备休眠、频繁的dom操作、阻塞性代码引起的。'
    text += `当前页面页面是否隐藏：${document.hidden}，可见性：${document.visibilityState}，网络状态：${navigator.onLine}。`
    warningCnt += 1
    if (warningCnt === getParameters().maxEventLoopLagWarning) {
      text += `今后不再提示。`
    }
    logger.warn(text)
  }
  lastWatchTs = now
  const handleMediaTrack = (track: NeMediaStreamTrack | null, i: number) => {
    if (!track) {
      return
    }
    let trackName = ''
    if (track.canvas) {
      trackName = `CANVASTRACK#${i}${track.canvas.width}x${track.canvas.height}`
    } else {
      trackName = `${track.kind.toUpperCase()}TRACK#${i}【${track.label}】`
    }
    if (!track.endedAt) {
      if (track.readyState === 'ended') {
        logger.log(`${trackName}: 已停止`)
        track.endedAt = now
        const evt = new CustomEvent('neTrackEnded')
        track.dispatchEvent(evt)
      } else if (!track.canvas && track.muted && track.enabled) {
        // track处于无数据状态（通常是采集问题，表现为黑屏）
        // 剔除canvas，因为小流在不发布时就是黑屏
        track.mutedStartAt = track.mutedStartAt || now
        track.mutedCnt = track.mutedCnt || 0
        track.mutedCnt++
        if (track.mutedCnt === 11 || track.mutedCnt === 31) {
          logger.warn(
            `${trackName}： 处于无数据状态，请检查设备是否正常:${now - track.mutedStartAt}ms`
          )
          if (hasDuplicateDevice(track)) {
            logger.warn(`${trackName} ：该设备打开了多次`)
          }
        }
      } else {
        if (track.mutedStartAt) {
          if (track.mutedCnt && track.mutedCnt > 11) {
            logger.warn(`${trackName}：数据恢复正常 :${now - track.mutedStartAt}ms`)
          }
          delete track.mutedStartAt
          delete track.mutedCnt
        }
      }
    }
  }

  videoTracks.forEach(handleMediaTrack)
  audioTracks.forEach(handleMediaTrack)
}

setInterval(trackWatcher, interval)

export function watchTrack(track: MediaStreamTrack | null) {
  if (track) {
    if (track.readyState === 'ended') {
      logger.error('注意：输入的track已经停止：', track)
    }
    if (track.kind === 'audio') {
      const globalAudioTracks = getParameters().tracks.audio
      let audioSettings = getSettingsEnabled ? track.getSettings() : track.getConstraints()
      logger.log(
        `获取到的设备类型: AUDIOTRACK#${globalAudioTracks.length}`,
        track.kind,
        track.label,
        track.id,
        JSON.stringify(audioSettings)
      )

      const t = globalAudioTracks.findIndex((historyTrack) => {
        return track === historyTrack
      })
      if (t > -1) {
        logger.warn(`注意：AUDIOTRACK#${globalAudioTracks.length} 与 AUDIOTRACK#${t} 相同`)
        globalAudioTracks.push(null)
      } else {
        track.addEventListener('ended', trackWatcher)
        globalAudioTracks.push(track)
      }
    } else {
      const globalVideoTracks = getParameters().tracks.video
      let videoSettings = getSettingsEnabled ? track.getSettings() : track.getConstraints()
      logger.log(
        `获取到的设备类型: VIDEOTRACK#${globalVideoTracks.length}`,
        track.kind,
        track.label,
        track.id,
        JSON.stringify(videoSettings)
      )

      const t = globalVideoTracks.findIndex((historyTrack) => {
        return track === historyTrack
      })
      if (t > -1) {
        logger.warn(`注意：VIDEOTRACK#${globalVideoTracks.length} 与 VIDEOTRACK#${t} 相同`)
        globalVideoTracks.push(null)
      } else {
        track.addEventListener('ended', trackWatcher)
        globalVideoTracks.push(track)
      }
    }
  }
}

export async function printForLongPromise(p: Promise<any>, description: string) {
  let cnt = 0
  const start = Date.now()
  let timer: Timer | null = setInterval(() => {
    cnt++
    getDefaultLogger().warn(`${description} ${Date.now() - start}ms`)
    if (timer && cnt > 10) {
      clearInterval(timer)
      timer = null
    }
  }, 6000)
  p.then(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }).catch((e) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })
}

export async function printVideoState(p: Promise<any>, dom: HTMLMediaElement) {
  let cnt = 0
  const start = Date.now()
  const timeout = 6000
  // 之前的打印太多了，现在只在第6秒、30秒、60秒给三条打印
  const timeoutSelect = [1, 5, 10]
  let timer: Timer | null = setInterval(() => {
    cnt++
    if (timeoutSelect.indexOf(cnt) === -1) {
      return
    }
    let info =
      `ReadyState:${MEDIA_READYSTATE_REV[dom.readyState]}(${dom.readyState})` +
      `Paused: ${dom.paused}.` +
      `Time: ${Date.now() - start}ms.`
    const mediaStream = dom.srcObject as MediaStream | null
    const track = mediaStream?.getTracks()[0]
    if (track) {
      info += `Track enabled: ${track.enabled} muted:${track.muted} name:[${track.label}]`
      if (!track.enabled) {
        // 播不出来是因为track被主动disable了。
        getDefaultLogger().warn(`媒体被disable：${info}`)
        if (timer) {
          clearInterval(timer)
          timer = null
        }
      } else if (track.muted) {
        // 播不出来是因为还没有解码第一帧，track因为各种原因处在mute状态
        getDefaultLogger().warn(`媒体处于mute状态，无数据或者解码失败：${info}`)
      } else {
        // 播不出来跟Track状态无关
        // 但事实上经过测试，如果远端没有数据的话，Safari的Track.muted为false，但是Chrome的Track.muted为true
        getDefaultLogger().warn(`媒体标签仍在启动播放中：${info}`)
      }
    } else {
      // 没救了
      getDefaultLogger().warn(`媒体标签srcObject属性处于异常状态：${info}`)
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    if (timer && cnt > timeoutSelect[timeoutSelect.length - 1]) {
      clearInterval(timer)
      timer = null
    }
  }, timeout)
  p.then(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }).catch((e) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })
}

function emptyStreamWith(stream: MediaStream, withTrack: MediaStreamTrack | null) {
  let sameTrack = false
  stream.getTracks().forEach((track) => {
    if (track !== withTrack) {
      stream.removeTrack(track)
      if (stream.onremovetrack) {
        // @ts-ignore
        stream.onremovetrack({ track })
      }
    } else {
      sameTrack = true
    }
  })
  if (!sameTrack && withTrack) {
    stream.addTrack(withTrack)
    if (stream.onaddtrack) {
      // @ts-ignore
      stream.onaddtrack({ track: withTrack })
    }
  }
}

export { emptyStreamWith, getScreenStream, getStream }
