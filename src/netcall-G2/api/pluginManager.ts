import { EventEmitter } from "eventemitter3";
import {Logger} from "../util/webrtcLogger";
import {Client, ILogger} from "../types";
import {LocalStream} from "./localStream";
import {getParameters} from "../module/parameters";
import {NERTC} from "../../entry/netcall-webrtc2"

export interface NEPlugin{
  name: string;
  version: string;
  description: string;
  install: (NERTC: any)=>Promise<void>
  uninstall: ()=>Promise<void>
  installed: boolean
  extendClient?: (client: Client)=>Promise<void>
  extendLocalStream?: (localStream: LocalStream)=>Promise<void>
}

class PluginManager extends EventEmitter{
  plugins: {
    [pathToPlugin: string]: {
      module: NEPlugin,
      installed: boolean
    }
  } = {}
  lastImported: NEPlugin|null = null
  constructor() {
    super();
    this.on('client-created', async (evt)=>{
      const client:Client = evt.client
      for (let pathToPlugin in this.plugins){
        const plugin = this.plugins[pathToPlugin]
        if (plugin && plugin.installed && plugin.module.extendClient){
          try{
            const start = Date.now()
            await plugin.module.extendClient(client)
            client.logger.log(`成功加载插件 client-created ${plugin.module.name}@${plugin.module.version}。花费 ${Date.now() - start}`)
          }catch(e){
            client.logger.error(`插件无法加载 client-created ${plugin.module.name} ${e.name} ${e.message}`)
          }
        }
      }
    })

    this.on('stream-created', async (evt)=>{
      const localStream:LocalStream = evt.localStream
      for (let pathToPlugin in this.plugins){
        const plugin = this.plugins[pathToPlugin]
        if (plugin && plugin.installed && plugin.module.extendLocalStream){
          try{
            const start = Date.now()
            await plugin.module.extendLocalStream(localStream)
            localStream.logger.log(`成功加载插件 stream-created ${plugin.module.name}。花费 ${Date.now() - start}`)
          }catch(e){
            localStream.logger.error(`插件无法加载 stream-created ${plugin.module.name} ${e.name} ${e.message}`)
          }
        }
      }
    })
  }
  
  public logger:ILogger = new Logger({
    tagGen: ()=>{
      let tag = "pluginManager";
      return tag
    }
  });

  safeEmit (eventName:string, ...args: any[]){
    // 对客户抛出的事件请使用这个函数
    try{
      this.emit(eventName, ...args);
    }catch(e){
      this.logger.error(`Error on event ${eventName}: ${e.name} ${e.message}`, e.stack);
    }
  }
  
  async import(pathToPlugin: string, install = true){
    if (this.plugins[pathToPlugin]){
      const plugin = this.plugins[pathToPlugin]
      this.logger.log(`import:找到已下载插件 ${plugin.module.name}@${plugin.module.version}【${plugin.module.description}】 ${pathToPlugin}`)
    }else{
      let nePlugin:NEPlugin|null = null
      try{
        this.logger.log(`import:开始下载插件 ${pathToPlugin}`)
        
        // 好像没修好
        // nePlugin = await import(/* webpackIgnore: true */pathToPlugin)
        
        this.lastImported = null
        await eval(`import('${pathToPlugin}')`)
        // @ts-ignore
        nePlugin = this.lastImported as NEPlugin
        this.lastImported = null

      }catch(e){
        this.logger.error(`import:无法下载插件 ${pathToPlugin}`, e.name, e.message)
        throw e
      }
      if (!nePlugin){
        throw new Error(`import:插件下载出现未知错误`)
      }
      this.plugins[pathToPlugin] = {
        module: nePlugin,
        installed: false,
      }
    }
    const plugin = this.plugins[pathToPlugin]
    if (install && !plugin.installed){
      this.logger.log(`import:成功下载插件 ${plugin.module.name}@${plugin.module.version}【${plugin.module.description}】开始安装。。。`)
      await this.install(pathToPlugin, NERTC)
      return plugin.module
    }else{
      return plugin.module
    }
  }
  
  async install(pathToPlugin: string, NERTC: any){
    const plugin = this.plugins[pathToPlugin]
    if (!plugin){
      throw new Error(`install:尚未下载插件 ${pathToPlugin}`)
    }
    if (plugin.installed){
      this.logger.warn(`install:找到已安装的插件 ${plugin.module.name}@${plugin.module.version}`)
      return plugin.module
    }
    try{
      await plugin.module.install(NERTC)
      plugin.installed = true
      this.logger.log(`成功安装插件 ${plugin.module.name}@${plugin.module.version}【${plugin.module.description}】`)
    }catch(e){
      this.logger.error(`无法安装插件 ${plugin.module.name}@${plugin.module.version}【${plugin.module.description}`, e.name, e.message, e.stack)
      throw e
    }
    getParameters().clients.forEach((client)=>{
      if (plugin.module.extendClient){
        // @ts-ignore
        plugin.module.extendClient(client)
      }
    })
    getParameters().localStreams.forEach((localStream)=>{
      if (plugin.module.extendLocalStream){
        plugin.module.extendLocalStream(localStream)
      }
    })
    return plugin.module
  }

  async uninstall(pathToPlugin: string){
    const plugin = this.plugins[pathToPlugin]
    if (plugin){
      await plugin.module.uninstall()
      plugin.installed = false
      this.logger.log(`已成功卸载${plugin.module.name}(${pathToPlugin})`)
    }else{
      this.logger.error(`卸载插件：尚未安装插件${pathToPlugin}`)
    }
  }
}

export const pluginManager = new PluginManager()
