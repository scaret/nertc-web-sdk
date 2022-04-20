import { EventEmitter } from 'eventemitter3'
import dateformat from 'dateformat'
import {
  ILogger,
  NERtcCanvasWatermarkConfig, NERtcImageWatermarkConfig,
  NERtcTextWatermarkConfig,
  NERtcTimestampWatermarkConfig,
  Timer,
  WatermarkSetting
} from "../../types";
import {checkExists, checkValidFloat, checkValidInteger, isExistOptions} from "../../util/param";
import {numberToRGBA} from "./util";

export class CanvasWatermarkControl extends EventEmitter{
  watermarks: WatermarkSetting[];
  private div:HTMLElement|null;
  private settings:{
    defaultStyle: {[key:string]: string};
  }
  private logger: ILogger;
  constructor(logger:ILogger) {
    super();
    this.logger = logger;
    this.settings = {
      defaultStyle: {
        background: "rgba(128,128,128, 0.5)",
        overflow:"hidden",
        'white-space': "break-spaces",
        position: "absolute",
        wordBreak: "break-all",
        color: "white",
        fontSize: "10pt",
      },
    };
    this.watermarks = [];
    this.div = null;
  }
  checkWatermarkParams(options: NERtcCanvasWatermarkConfig){
    // 因为水印的参数检查太长了，所以从stream.ts挪到这里
    if (options.textWatermarks){
      options.textWatermarks.forEach((watermark)=>{
        // 检查文字水印字体参数
        const fontSizeCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:textWatermarks.fontSize',
          value: watermark.fontSize,
          min: 1,
        };
        if (isExistOptions(fontSizeCheck).result){
          checkValidInteger(fontSizeCheck);
        }
        // 检查文字水印颜色参数
        const fontColorCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:textWatermarks.fontColor',
          value: watermark.fontColor,
          min: 0,
        };
        if (isExistOptions(fontColorCheck).result){
          checkValidInteger(fontColorCheck);
        }
        // 检查文字水印宽度参数
        const wmWidthCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:textWatermarks.wmWidth',
          value: watermark.wmWidth,
          min: 0,
        };
        if (isExistOptions(wmWidthCheck).result){
          checkValidInteger(wmWidthCheck);
        }

        // 检查文字水印高参数
        const wmHeightCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:textWatermarks.wmHeight',
          value: watermark.wmHeight,
          min: 0,
        };
        if (isExistOptions(wmHeightCheck).result){
          checkValidInteger(wmHeightCheck);
        }

        // 检查文字水印横坐标参数
        const offsetXCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:textWatermarks.offsetX',
          value: watermark.offsetX,
        };
        if (isExistOptions(offsetXCheck).result){
          checkValidInteger(offsetXCheck);
        }

        // 检查文字水印纵坐标参数
        const offsetYCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:textWatermarks.offsetY',
          value: watermark.offsetY,
        };
        if (isExistOptions(offsetYCheck).result){
          checkValidInteger(offsetYCheck);
        }
      });
    }
    if (options.timestampWatermarks){
      [options.timestampWatermarks].forEach((watermark)=>{
        // 检查时间戳水印字体参数
        const fontSizeCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:timestampWatermarks.fontSize',
          value: watermark.fontSize,
          min: 1,
        };
        if (isExistOptions(fontSizeCheck).result){
          checkValidInteger(fontSizeCheck);
        }
        // 检查时间戳水印颜色参数
        const fontColorCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:timestampWatermarks.fontColor',
          value: watermark.fontColor,
          min: 0,
        };
        if (isExistOptions(fontColorCheck).result){
          checkValidInteger(fontColorCheck);
        }
        // 检查时间戳水印宽度参数
        const wmWidthCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:timestampWatermarks.wmWidth',
          value: watermark.wmWidth,
          min: 0,
        };
        if (isExistOptions(wmWidthCheck).result){
          checkValidInteger(wmWidthCheck);
        }

        // 检查时间戳水印高参数
        const wmHeightCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:timestampWatermarks.wmHeight',
          value: watermark.wmHeight,
          min: 0,
        };
        if (isExistOptions(wmHeightCheck).result){
          checkValidInteger(wmHeightCheck);
        }

        // 检查时间戳水印横坐标参数
        const offsetXCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:timestampWatermarks.offsetX',
          value: watermark.offsetX,
        };
        if (isExistOptions(offsetXCheck).result){
          checkValidInteger(offsetXCheck);
        }

        // 检查时间戳水印纵坐标参数
        const offsetYCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:timestampWatermarks.offsetY',
          value: watermark.offsetY,
        };
        if (isExistOptions(offsetYCheck).result){
          checkValidInteger(offsetYCheck);
        }
      });
    }
    if (options.imageWatermarks){
      options.imageWatermarks.forEach((watermark)=>{
        // 检查图片水印宽度参数
        const wmWidthCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs.imageWatermarks.wmWidth',
          value: watermark.wmWidth,
          min: 0,
        };
        if (isExistOptions(wmWidthCheck).result){
          checkValidInteger(wmWidthCheck);
        }

        // 检查图片水印高参数
        const wmHeightCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:imageWatermarks.wmHeight',
          value: watermark.wmHeight,
          min: 0,
        };
        if (isExistOptions(wmHeightCheck).result){
          checkValidInteger(wmHeightCheck);
        }

        // 检查图片水印横坐标参数
        const offsetXCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:imageWatermarks.offsetX',
          value: watermark.offsetX,
        };
        if (isExistOptions(offsetXCheck).result){
          checkValidInteger(offsetXCheck);
        }

        // 检查图片水印纵坐标参数
        const offsetYCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:imageWatermarks.offsetY',
          value: watermark.offsetY,
        };
        if (isExistOptions(offsetYCheck).result){
          checkValidInteger(offsetYCheck);
        }
        
        // 检查图片水印imageUrls参数
        const imageUrlsExistsCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:imageWatermarks.imageUrls',
          value: watermark.imageUrls,
        };
        checkExists(imageUrlsExistsCheck);
        const imageUrlsLengthCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:imageWatermarks.imageUrls.length',
          value: watermark.imageUrls.length,
          min: 1,
        };
        checkValidInteger(imageUrlsLengthCheck);

        // 检查图片水印fps参数
        const fpsCheck = {
          tag: 'Stream.setCanvasWatermarkConfigs:imageWatermarks.fps',
          value: watermark.fps,
          min: 0,
        };
        if (isExistOptions(fpsCheck).result){
          checkValidFloat(fpsCheck);
        }
      });
    }

  }
  updateWatermarks(options:NERtcCanvasWatermarkConfig){
    this.clear()
    this.watermarks = [];
    const counts = {
      text: 0,
      timestamp: 0,
      image: 0
    };
    if (options.imageWatermarks){
      options.imageWatermarks.forEach((item: NERtcImageWatermarkConfig)=>{
        const style:any = Object.assign({}, this.settings.defaultStyle, {background: "none"});
        // 左边距
        if (typeof item.offsetX === "number"){
          style.left = `${item.offsetX}px`;
        }else if (!item.offsetX){
          // 维持默认值
        }else if (typeof item.offsetX === "string"){
          style.left = item.offsetX;
        }

        // 上边距
        if (typeof item.offsetY === "number"){
          style.top = `${item.offsetY}px`;
        }else if (!item.offsetY){
          // 维持默认值
        }else if (typeof item.offsetY === "string"){
          style.top = item.offsetY;
        }

        if (item.wmWidth === 0 || item.wmHeight === 0){
          // NRTCG2-8635 图片维持默认宽高
          delete item.wmWidth;
          delete item.wmHeight;
        }
        // 宽度
        if (!item.wmWidth) {
          // 维持默认值
        }else if (typeof item.wmWidth === "number"){
          style.width = `${item.wmWidth}px`;
        }else if (typeof item.wmWidth === "string"){
          style.width = item.wmWidth;
        }

        // 高度
        if (!item.wmHeight){
          // 维持默认值
        }else if (typeof item.wmHeight === "number"){
          style.height = `${item.wmHeight}px`;
        }else if (typeof item.wmHeight === "string"){
          style.height = item.wmHeight;
        }

        // 是否设置循环。
        if (typeof item.wmHeight === "number"){
          style.height = `${item.wmHeight}px`;
        }else if (!item.wmHeight){
          // 维持默认值
        }else if (typeof item.wmHeight === "string"){
          style.height = item.wmHeight;
        }

        let setting:WatermarkSetting;
        if (!item.fps){
          //静态水印，只取最后一张图
          setting = {
            type: 'image',
            content: '',
            imageUrls: [item.imageUrls[item.imageUrls.length -1]],
            loop: false,
            loopIndex: 0,
            interval: 0,
            elem: null,
            style: style
          };
        }else{
          setting = {
            type: 'image',
            content: '',
            imageUrls: item.imageUrls,
            loop: !(item.loop === false),
            loopIndex: 0,
            interval: 1000 / (item.fps || 1),
            elem: null,
            style: style
          };
        }
        this.watermarks.push(setting);
      });
    }
    if (options.textWatermarks){
      options.textWatermarks.forEach((item: NERtcTextWatermarkConfig)=>{
        let content:string = item.content || "";
        counts.text++;
        const style:any = Object.assign({}, this.settings.defaultStyle);
        // 文字颜色
        if (typeof item.fontColor === "number"){
          style.color = numberToRGBA(item.fontColor);
        }else if (!item.fontColor){
          // 维持默认值
        }else if (typeof item.fontColor === "string"){
          style.color = item.fontColor;
        }

        // 文字大小
        if (typeof item.fontSize === "number"){
          style.fontSize = `${item.fontSize}pt`;
        }else if (!item.fontSize){
          // 维持默认值
        }else if (typeof item.fontSize === "string"){
          style.fontSize = item.fontSize;
        }

        // 左边距
        if (typeof item.offsetX === "number"){
          style.left = `${item.offsetX}px`;
        }else if (!item.offsetX){
          // 维持默认值
        }else if (typeof item.offsetX === "string"){
          style.left = item.offsetX;
        }

        // 上边距
        if (typeof item.offsetY === "number"){
          style.top = `${item.offsetY}px`;
        }else if (!item.offsetY){
          // 维持默认值
        }else if (typeof item.offsetY === "string"){
          style.top = item.offsetY;
        }
        
        // 水印框颜色
        if ((!item.wmWidth && !item.wmHeight) ||
          (item.wmWidth === 0) ||
          (item.wmHeight === 0)
        ){
          style.background = "";
        }else if (typeof item.wmColor === "number"){
          style.background = numberToRGBA(item.wmColor);
        }else if (!item.wmColor){
          // 维持默认值
        }else if (typeof item.wmColor === "string"){
          style.background = item.wmColor;
        }

        // 宽度
        if (!item.wmWidth){
          // 维持默认值
        }
        if (typeof item.wmWidth === "number"){
          if (item.wmWidth > 0){
            style.width = `${item.wmWidth}px`;
          }
        }else if (typeof item.wmWidth === "string"){
          style.width = item.wmWidth;
        }

        // 高度
        if (!item.wmHeight){
          // 维持默认值
        }else if (typeof item.wmHeight === "number"){
          if (item.wmHeight > 0){
            style.wmHeight = `${item.wmWidth}px`;
          }
          style.height = `${item.wmHeight}px`;
        }else if (typeof item.wmHeight === "string"){
          style.height = item.wmHeight;
        }
        
        const setting:WatermarkSetting = {
          type: 'text',
          content: content,
          loop: false,
          elem: null,
          loopIndex: 0,
          style: style
        };
        this.watermarks.push(setting);
      });
    }
    if (options.timestampWatermarks){
      [options.timestampWatermarks].forEach((item: NERtcTimestampWatermarkConfig)=>{
        let content:string = "yyyy-mm-dd HH:MM:ss";
        counts.timestamp++;
        const style:any = Object.assign({}, this.settings.defaultStyle);
        // 文字颜色
        if (typeof item.fontColor === "number"){
          style.color = numberToRGBA(item.fontColor);
        }else if (!item.fontColor){
          // 维持默认值
        }else if (typeof item.fontColor === "string"){
          style.color = item.fontColor;
        }

        // 文字大小
        if (typeof item.fontSize === "number"){
          style.fontSize = `${item.fontSize}pt`;
        }else if (!item.fontSize){
          // 维持默认值
        }else if (typeof item.fontSize === "string"){
          style.fontSize = item.fontSize;
        }

        // 左边距
        if (typeof item.offsetX === "number"){
          style.left = `${item.offsetX}px`;
        }else if (!item.offsetX){
          // 维持默认值
        }else if (typeof item.offsetX === "string"){
          style.left = item.offsetX;
        }

        // 上边距
        if (typeof item.offsetY === "number"){
          style.top = `${item.offsetY}px`;
        }else if (!item.offsetY){
          // 维持默认值
        }else if (typeof item.offsetY === "string"){
          style.top = item.offsetY;
        }

        // 水印框颜色
        if ((!item.wmWidth && !item.wmHeight) ||
          (item.wmWidth === 0) ||
          (item.wmHeight === 0)
        ){
          style.background = "";
        }else if (typeof item.wmColor === "number"){
          style.background = numberToRGBA(item.wmColor);
        }else if (!item.wmColor){
          // 维持默认值
        }else if (typeof item.wmColor === "string"){
          style.background = item.wmColor;
        }

        // 宽度
        if (!item.wmWidth){
          // 维持默认值
        }else if (typeof item.wmWidth === "number"){
          style.width = `${item.wmWidth}px`;
        }else if (typeof item.wmWidth === "string"){
          style.width = item.wmWidth;
        }

        // 高度
        if (!item.wmHeight){
          // 维持默认值
        }else if (typeof item.wmHeight === "number"){
          style.height = `${item.wmHeight}px`;
        }else if (typeof item.wmHeight === "string"){
          style.height = item.wmHeight;
        }

        const setting:WatermarkSetting = {
          type: 'timestamp',
          content: content,
          loop: false,
          loopIndex: 0,
          elem: null,
          style: style
        };
        this.watermarks.push(setting);
      });
    }

    if (this.div){
      this.start(this.div);
    }


  }

  start(div:HTMLElement){
    this.clear();
    this.div = div;
    this.watermarks.forEach((item)=>{
      let elem:HTMLElement;
      switch (item.type){
        case "text":
          elem = document.createElement("pre");
          elem.className = 'nim-watermark nim-watermark-text';
          elem.innerText = item.content || "";
          Object.assign(elem.style, item.style);
          break;
        case "timestamp":
          elem = document.createElement("pre");
          elem.className = 'nim-watermark nim-watermark-timestamp';
          elem.innerText = '';
          Object.assign(elem.style, item.style);
          break;
        case "image":
          if (!item.imageUrls && item.content){
            item.imageUrls = [item.content];
          }
          elem = document.createElement("div");
          elem.className = "nim-watermark nim-watermark-image-container"
          item.imgElems = [];
          if (item.imageUrls && item.imageUrls.length){
            item.imageUrls.forEach((imageUrl, index)=>{
              const img = document.createElement("img");
              img.className = `nim-watermark nim-watermark-image nim-watermark-image-${index}`;
              img.src = imageUrl;
              img.style.width = "100%";
              if (item.style.height){
                img.style.height = "100%";
              }
              img.style.overflow = "hidden";
              item.imgElems && item.imgElems.push(img);
              elem.appendChild(img);
              if (index > 0){
                img.style.display = 'none';
              }
            })
          }
          item.loopIndex = -1;
          const drawNextFrame = ()=>{
            if (!item.interval && item.imgElems && item.loopIndex >= 0){
              item.imgElems[item.loopIndex].style.display = '';
              return
            }
            if (item.imgElems && item.imgElems[item.loopIndex]){
              item.imgElems[item.loopIndex].style.display = 'none';
            }
            item.loopIndex++;
            if (item.imgElems && item.loopIndex >= item.imgElems.length){
              if (item.loop){
                item.loopIndex = 0;
              }else{
                item.loopTimer && clearInterval(item.loopTimer);
                return;
              }
            }
            if (item.imgElems){
              item.imgElems[item.loopIndex].style.display = '';
            }
          };
          drawNextFrame();
          if (item.interval){
            item.loopTimer = setInterval(drawNextFrame, item.interval);
          }
          
          Object.assign(elem.style, item.style);
          break;
      }
      item.elem = elem;
      div.appendChild(item.elem);
    });
  }
  clear(){

    if (this.div){
      this.watermarks.forEach((item)=>{
        if (item.elem){
          item.elem.remove();
          item.elem = null;
        }
        if (item.loopTimer){
          clearTimeout(item.loopTimer);
        }
      });
    }
  }
}

class CanvasWatermarkManager{
  public controls:CanvasWatermarkControl[];
  private timer:Timer;
  constructor() {
    this.controls = [];
    this.timer = setInterval(()=>{
      this.updateTimestamps();
    }, 1000);
  }
  updateTimestamps(){
    this.controls.forEach((control:CanvasWatermarkControl)=>{
      control.watermarks
        .filter((item)=>{return item.type === 'timestamp'})
        .forEach((item)=>{
          if (item.elem){
            item.elem.innerText = dateformat(new Date(), item.content || "yyyy-mm-dd HH:MM:ss");
          }
        });
    })
  }
}

const watermarkManager = new CanvasWatermarkManager();

export function createCanvasWatermarkControl(logger:ILogger){
  const control = new CanvasWatermarkControl(logger);
  watermarkManager.controls.push(control);
  return control;
}