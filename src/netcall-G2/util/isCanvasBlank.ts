// https://blog.csdn.net/qq_42363090/article/details/125874684

let blankCanvas: HTMLCanvasElement | null = null
export function isCanvasBlank(canvas: HTMLCanvasElement) {
  if (!blankCanvas) {
    blankCanvas = document.createElement('canvas')
  }
  blankCanvas.width = canvas.width
  blankCanvas.height = canvas.height
  let result = canvas.toDataURL() === blankCanvas.toDataURL()
  if (result) {
    console.error('result', result, canvas)
  }
  return result
}
