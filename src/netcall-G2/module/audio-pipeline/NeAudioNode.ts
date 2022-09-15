// 封装的AudioNode
import { RTCEventEmitter } from '../../util/rtcUtil/RTCEventEmitter'

let audioNodeIdx = 0

/**
 * AudioNode的Wrapper，记录了节点的连接关系
 * NeAudioNode 的节点在初始化时就可以创建好，NeAudioNodeNullable 的节点需要时间来初始化（例如下载一份Worker代码）
 */
export class NeAudioNodeNullable<AudioNodeType> extends RTCEventEmitter {
  protected id = audioNodeIdx++
  protected tag: string
  public audioNode: AudioNodeType | null
  connectedTo: NeAudioNodeNullable<any>[] = []
  connectedFrom: NeAudioNodeNullable<any>[] = []
  constructor(tag: string, audioNode: AudioNodeType | null) {
    super()
    this.tag = tag
    this.audioNode = audioNode
  }
  connect(connectTo: NeAudioNodeNullable<any>) {
    if (this.audioNode && connectTo.audioNode) {
      ;(this.audioNode as unknown as AudioNode).connect(connectTo.audioNode)
    }
    if (this.connectedTo.indexOf(connectTo) === -1) {
      this.connectedTo.push(connectTo)
    }
    if (connectTo.connectedFrom.indexOf(this) === -1) {
      connectTo.connectedFrom.push(this)
    }
  }
  disconnect(disconnectTo: NeAudioNodeNullable<AudioNode>) {
    if (this.audioNode && disconnectTo.audioNode) {
      ;(this.audioNode as unknown as AudioNode).disconnect(disconnectTo.audioNode)
    }
    if (this.connectedTo.indexOf(disconnectTo) !== -1) {
      this.connectedTo.splice(this.connectedTo.indexOf(disconnectTo), 1)
    }
    if (disconnectTo.connectedFrom.indexOf(this) === -1) {
      disconnectTo.connectedFrom.splice(disconnectTo.connectedFrom.indexOf(this), 1)
    }
  }
  isConnectedTo(node: NeAudioNodeNullable<any>) {
    return this.connectedTo.indexOf(node) > -1
  }
  isConnectedFrom(node: NeAudioNodeNullable<any>) {
    return this.connectedFrom.indexOf(node) > -1
  }
  disconnectFromAll() {
    this.connectedFrom.forEach((node) => {
      if (node.audioNode && this.audioNode) {
        node.audioNode.disconnect(this.audioNode)
      }
      const i = node.connectedTo.indexOf(this)
      if (i > -1) {
        node.connectedTo.splice(i, 1)
      }
    })
    this.connectedFrom.length = 0
  }

  disconnectToAll() {
    this.connectedTo.forEach((node) => {
      if (node.audioNode && this.audioNode) {
        ;(this.audioNode as unknown as AudioNode).disconnect(node.audioNode)
      }
      const i = node.connectedFrom.indexOf(this)
      if (i > -1) {
        node.connectedFrom.splice(i, 1)
      }
    })
    this.connectedTo.length = 0
  }
}

/**
 * AudioNode的Wrapper，记录了节点的连接关系
 * NeAudioNode 的节点在初始化时就可以创建好，NeAudioNodeNullable 的节点需要时间来初始化（例如下载一份Worker代码）
 */
export class NeAudioNode<AudioNodeType> extends NeAudioNodeNullable<AudioNodeType> {
  public audioNode: AudioNodeType
  constructor(tag: string, audioNode: AudioNodeType) {
    super(tag, audioNode)
    this.tag = tag
    this.audioNode = audioNode
  }
}
