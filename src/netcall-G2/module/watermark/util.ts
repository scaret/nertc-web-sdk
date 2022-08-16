export function numberToRGBA(num: number) {
  if (num === 0) {
    return `rgba(0,0,0,0)`
  }
  let r, g, b, alpha
  b = num % 0x100
  num = Math.floor(num / 0x100)
  g = num % 0x100
  num = Math.floor(num / 0x100)
  r = num % 0x100
  num = Math.floor(num / 0x100)
  if (num > 0) {
    alpha = ((num % 0x100) / 0x100).toFixed(2)
  } else {
    alpha = 1
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/*
  副作用：会造成dom卡顿，不要老是调用
 */
export function measureText(text: string, fontSize: string, fontFamily: string) {
  if (!text) {
    return { width: 0, height: 0 }
  }
  let div = document.createElement('div')
  let span = document.createElement('span')
  span.innerText = text
  span.style.fontSize = fontSize
  span.style.fontFamily = fontFamily
  div.style.opacity = '0'
  div.style.position = 'absolute'
  div.style.height = fontSize
  document.body.appendChild(div)
  div.appendChild(span)
  const height = div.clientHeight
  const width = span.offsetWidth
  div.remove()
  return { width, height }
}
