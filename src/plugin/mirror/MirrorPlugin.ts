import {NEPlugin, PluginManager} from "../core";
import type {LocalStream} from "../../netcall-G2/api/localStream";
import type {MediaHelper} from "../../netcall-G2/module/media";
import type {PreProcessingConfig} from "../../netcall-G2/types";

const pluginName = "mirror"
const version = "1.0.0"

class MirrorPlugin implements NEPlugin{
  name = pluginName
  version = "1.0.0"
  description = "插件示例：编码镜像"
  installed = false
  NERTC: any
  
  async install(NERTC: any){
    this.NERTC = NERTC
  }
  
  async uninstall(){
    this.NERTC.getParameters().localStreams.forEach((localStream: LocalStream)=>{
      const mirrorHandler = localStream.mediaHelper.video.preProcessing?.handlers.find((h) => {
        return h && h.name === "mirror"
      })
      if (mirrorHandler){
        mirrorHandler.enabled = false
      }
      if (localStream.mediaHelper.canDisablePreProcessing("video")){
        localStream.mediaHelper.disablePreProcessing("video")
      }
    })
  }

  // async extendClient(client: Client) {
  //
  // }

  async extendLocalStream(localStream: LocalStream) {
    if (!localStream.mediaHelper.video.preProcessingEnabled) {
      localStream.mediaHelper.enablePreProcessing("video")
    }
    const mirrorHandler = localStream.mediaHelper.video.preProcessing?.handlers.find((h) => {
      return h && h.name === "mirror"
    })
    if (mirrorHandler){
      mirrorHandler.enabled = true
      mirrorHandler.func = this.preProcessingMirror.bind(this)
    }else{
      console.error(`无法找到 mirrorHandler`)
    }

    /**
     * disableMirror
     */
    // @ts-ignore
    localStream.disableMirror = () => {

    }
  }

  preProcessingMirror(mediaHelper: MediaHelper, mediaType: "video"|"screen", config: PreProcessingConfig){
    config.canvasCtx.scale(-1, 1)
    config.canvasCtx.drawImage(config.videoElem, 0, 0, config.videoElem.videoWidth * -1, config.videoElem.videoHeight)
    config.canvasCtx.scale(-1, 1)
  }
}

const nePlugin = new MirrorPlugin()

// @ts-ignore
if(window.NERTC && window.NERTC.pluginManager){
// @ts-ignore
  window.NERTC.pluginManager.lastImported = nePlugin
}

export default nePlugin
