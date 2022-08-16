export class RTCCanvas {
  public title: string
  // public width: number;
  // public height: number;
  public isAppend?: boolean = false
  //@ts-ignore
  public canvas: HTMLCanvasElement | null
  //@ts-ignore
  public ctx: CanvasRenderingContext2D
  // 20px for the size of each cell
  // CELL_SIZE = 20;

  public constructor(title: string, isAppend?: boolean) {
    this.title = title
    this.isAppend = isAppend
    this.createCanvas()
  }
  get _canvas() {
    return this.canvas
  }

  get _ctx() {
    return this.ctx
  }

  createCanvas() {
    this.canvas = <HTMLCanvasElement>document.createElement('canvas')
    //@ts-ignore
    this.ctx = this.canvas.getContext('2d')
    // this.canvas.width = this.width;
    // this.canvas.height = this.height;
    if (this.isAppend) {
      document.body.appendChild(this.canvas)
    }
    // return this.canvas;
  }

  setSize(width: number, height: number) {
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  // drawWorld() {
  //     this.ctx.beginPath();
  //     // first draw rows
  //     for (let x = 0; x < this.canvas!.width + 1; x++) {
  //     this.ctx.moveTo(this.CELL_SIZE * x, 0);
  //     // this will draw the line
  //     this.ctx.lineTo(this.CELL_SIZE * x, this.canvas!.width * this.CELL_SIZE);
  //     }
  //     for (let y = 0; y < this.canvas!.width + 1; y++) {
  //     this.ctx.moveTo(0, this.CELL_SIZE * y);
  //     this.ctx.lineTo(this.canvas!.width * this.CELL_SIZE, this.CELL_SIZE * y);
  //     }

  //     this.ctx.stroke();
  // }

  destroy() {
    this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height)
    if (this.isAppend) {
      document.body.removeChild(this.canvas!)
    }
    this.canvas = null
  }
}
