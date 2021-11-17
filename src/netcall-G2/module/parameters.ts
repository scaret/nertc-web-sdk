// 注意：getParameters和setParameters是一些私有全局变量，仅用于调试和私有接口，不用于正常业务

import {Client} from "../api/client";
import {Stream} from "../api/stream";

interface IParameters{
  shimVideoOrientation: "never"|"ios151"|"allsafari",
  mediaTracks: MediaStreamTrack[],
  clients: Client[];
  localStreams: Stream[],
}

let parameters:IParameters = {
  shimVideoOrientation: "ios151",
  mediaTracks: [],
  clients: [],
  localStreams: []
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
