
export function deepCopy(param: Object){
   var result = Array.isArray(param) ? [] : {};
    for (var key in param) {
      if (param.hasOwnProperty(key)) {
        //@ts-ignore
        if (typeof param[key] === 'object' && param[key]!==null) {
          //@ts-ignore
          result[key] = deepCopy(param[key]);
        } else {
          //@ts-ignore
          result[key] = param[key];
        }
      }
    }
    return result;
}

export function getDomInfo(elem: HTMLElement){
  let info = elem.tagName;
  if (elem.id){
    info += "#" + elem.id;
  }
  if (elem.className){
    info += "." + elem.className
  }
  if (elem.offsetWidth || elem.offsetHeight){
    info += ` ${elem.offsetWidth}x${elem.offsetHeight}`
  }
  return info;
}
