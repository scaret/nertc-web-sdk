// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务

import {Client} from "../api/client";
import {Stream} from "../api/stream";

interface IParameters{
  
  // 储存了通过createClient创建的客户端
  clients: Client[];
  
  // 存储了通过createStream创建的客户端
  localStreams: Stream[],
  
  // 播放时如果遇到自动播放问题，是否显示video控件的默认控制选项
  controlOnPaused: boolean,

  // 恢复播放时，是否隐藏video控件的默认控制选项
  hideControlOnResume: boolean,
}

let parameters:IParameters = {
  clients: [],
  localStreams: [],
  controlOnPaused: true,
  hideControlOnResume: true,
}

// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
const getParameters = ()=>{
  return parameters
}

// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务
const setParameters = (params: IParameters)=>{
  Object.assign(parameters, params);
}

export {
  getParameters,
  setParameters,
}
