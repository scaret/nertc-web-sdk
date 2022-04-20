export function numberToRGBA (num: number){
  if (num === 0){
    return `rgba(0,0,0,0)`;
  }
  let r,g,b, alpha;
  b = num % 0x100;
  num = Math.floor(num / 0x100);
  g = num % 0x100;
  num = Math.floor(num / 0x100);
  r = num % 0x100;
  num = Math.floor(num / 0x100);
  if (num > 0){
    alpha = ((num % 0x100) / 0x100).toFixed(2);
  }else{
    alpha = 1;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
};