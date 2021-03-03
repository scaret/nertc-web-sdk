import {ValidIntegerOptions, ExistsOptions, ValidFloatOptions} from "../types";

const isValidInteger = (param: ValidIntegerOptions)=>{
  if (!Number.isInteger(param.value)){
    return {
      result: false,
      msg: `参数不是整数`
    }
  }else if (typeof param.min === "number" && param.value < param.min){
    return {
      result: false,
      msg: `参数小于最小值${param.min}`
    }
  }else if (typeof param.max === "number" && param.value > param.max){
    return {
      result: false,
      msg: `参数大于最大值${param.max}`
    }
  }else{
    return {
      result: true
    }
  }
}

const checkValidInteger = (param: ValidIntegerOptions)=>{
  const data = isValidInteger(param);
  if (data.result){
    return;
  }else{
    throw new Error(`参数错误 ${param.tag}:${data.msg}`);
  }
}

const isValidFloat = (param: ValidFloatOptions)=>{
  if (!Number.isFinite(param.value)){
    return {
      result: false,
      msg: `参数不是float类型`
    }
  }else if (typeof param.min === "number" && param.value < param.min){
    return {
      result: false,
      msg: `参数小于最小值${param.min}`
    }
  }else if (typeof param.max === "number" && param.value > param.max){
    return {
      result: false,
      msg: `参数大于最大值${param.max}`
    }
  }else{
    return {
      result: true
    }
  }
}

const checkValidFloat = (param: ValidFloatOptions)=>{
  const data = isValidFloat(param);
  if (data.result){
    return;
  }else{
    throw new Error(`参数错误 ${param.tag}:${data.msg}`);
  }
}

const isExistOptions = (param: ExistsOptions)=>{
  if (typeof param.value === "undefined" || param.value === null){
    return {
      result: false,
      msg: `未填必选参数`
    }
  }else{
    return {
      result: true
    }
  }
}

const checkExists = (param: ExistsOptions)=>{
  const data = isExistOptions(param);
  if (data.result){
    return;
  }else{
    throw new Error(`参数错误：${param.tag} ${data.msg}`);
  }
}

export {
  
  checkValidInteger,
  checkValidFloat,
  
  isExistOptions,
  checkExists,
  
}