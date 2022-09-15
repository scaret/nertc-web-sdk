import { NeAudioNode } from './NeAudioNode'

interface TrackSourcePair {
  track: MediaStreamTrack
  stream: MediaStream
  source: MediaStreamAudioSourceNode
  audioElem: HTMLAudioElement | null
  node: NeAudioNode<MediaStreamAudioSourceNode>
  ctx: AudioContext
}

const trackSourcePairs: TrackSourcePair[] = []

export function getMediaStreamSourceNode(
  ctx: AudioContext,
  track: MediaStreamTrack,
  createAudioElem: boolean
) {
  const existingPair = trackSourcePairs.find((item) => {
    return item.ctx === ctx && item.track === track
  })
  if (existingPair) {
    // 对于每个远端AudioTrack，页面上必须有一个在播放<audio>，不然AudioContext中不会解码
    if (createAudioElem) {
      if (!existingPair.audioElem) {
        const audioElem = document.createElement('audio')
        audioElem.muted = true
        audioElem.volume = 0
        audioElem.autoplay = true
        audioElem.controls = true
        // document.body.prepend(audioElem)
        existingPair.audioElem = audioElem
      }
      existingPair.audioElem.srcObject = existingPair.stream
      existingPair.audioElem.play().catch((e) => {
        // fall through
      })
    }
    return existingPair.node
  } else {
    const stream = new MediaStream([track])
    const source = ctx.createMediaStreamSource(stream)
    const node = new NeAudioNode('MediaStreamSource', source)
    let audioElem: HTMLAudioElement | null = null
    if (createAudioElem) {
      audioElem = document.createElement('audio')
      audioElem.muted = true
      audioElem.volume = 0
      audioElem.autoplay = true
      audioElem.controls = true
      // document.body.prepend(audioElem)
      audioElem.srcObject = stream
      audioElem.play().catch((e) => {
        // fall through
        // console.error('audioElem play error', e)
      })
    }

    const pair: TrackSourcePair = {
      track,
      stream,
      source,
      ctx,
      node,
      audioElem
    }
    trackSourcePairs.push(pair)
    return node
  }
}
