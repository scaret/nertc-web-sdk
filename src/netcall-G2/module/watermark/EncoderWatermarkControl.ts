import { EventEmitter } from 'eventemitter3'
import dateformat from 'dateformat'
import {
  EncoderWatermarkSetting,
  EncoderWatermarkStyle,
  ILogger,
  NERtcEncoderWatermarkConfig,
  NERtcImageWatermarkConfig,
  NERtcTextWatermarkConfig,
  NERtcTimestampWatermarkConfig, PreProcessingConfig, PreProcessingHandler,
} from "../../types";
import {checkExists, checkValidFloat, checkValidInteger, isExistOptions} from "../../util/param";
import {measureText, numberToRGBA} from "./util";
import {MediaHelper} from "../media";
import {getParameters} from "../parameters";


export class EncoderWatermarkControl extends EventEmitter{
  watermarks: EncoderWatermarkSetting[];
  private settings:{
    defaultStyle: EncoderWatermarkStyle;
  }
  handler: PreProcessingHandler;
  private logger: ILogger;
  constructor(logger:ILogger) {
    super();
    this.logger = logger;
    this.settings = {
      defaultStyle: {
        left: 0,
        top: 0,
        textWidth: 0,
        textHeight: 0,
        fontSize: "15pt",
        fontFamily: getParameters().encoderWatermarkFontFamily,
        fillStyle: "white",
        textBaseline: "hanging",

        bgWidth: -1,
        bgHeight: -1,
        bgFillStyle: "rgba(136, 136, 136, 0.5)",
      },
    };
    this.watermarks = [];
    this.handler = {
      name: "watermark",
      func: this.handleFrame.bind(this)
    }
  }
  
  handleFrame(mediaHelper: MediaHelper, mediaType: "video"|"screen", config: PreProcessingConfig){
    this.watermarks.forEach((item)=>{
      if (item.type === "text" || item.type === "timestamp"){
        let content = ""
        if (item.type === "timestamp"){
          content = dateformat(new Date(), item.content || "yyyy-mm-dd HH:MM:ss")
        }else{
          content = item.content || ""
        }
        config.canvasCtx.font = `${item.style.fontSize} ${item.style.fontFamily}`
        config.canvasCtx.textBaseline = item.style.textBaseline;
        const text = item.content || ""

        // 先画背景
        if (item.style.bgWidth === -1 && item.style.bgHeight === -1){
          item.style.bgWidth = item.style.textWidth
          item.style.bgHeight = item.style.textHeight
        }

        if (item.style.bgWidth && item.style.bgHeight){
          // console.log("width", width, "height", height)
          config.canvasCtx.fillStyle = item.style.bgFillStyle
          config.canvasCtx.fillRect(item.style.left, item.style.top, item.style.bgWidth, item.style.bgHeight)
        }
        config.canvasCtx.fillStyle = item.style.fillStyle
        config.canvasCtx.fillText(content, item.style.left, item.style.top)
      }
      if (item.type === "image" && item.imgElems){
        //渲染：图片水印
        let imgToPlay:HTMLImageElement|undefined = undefined
        if (!item.interval){
          //静态图片
          if (item.imgElems[0].complete && item.imgElems[0].naturalWidth && item.imgElems[0].naturalHeight){
            imgToPlay = item.imgElems[0]
          }
        } else if (item.startMs && item.interval){
          // 轮播图片
          const now = Date.now()
          const elapse = now - item.startMs
          const startIndex = Math.floor(elapse / item.interval)
          for (let i = startIndex; i < startIndex + item.imgElems.length; i++){
            const img = item.imgElems[item.loop ? i % item.imgElems.length : i]
            if (img && img.complete && img.naturalWidth && img.naturalHeight){
              imgToPlay = img
              break
            }
          }
        }
        if (imgToPlay){
          let width, height;
          if (item.style.bgWidth > 0 && item.style.bgHeight > 0){
            width = item.style.bgWidth
            height = item.style.bgHeight
          }else{
            width = imgToPlay.naturalWidth
            height = imgToPlay.naturalHeight
          }
          config.canvasCtx.drawImage(imgToPlay, item.style.left, item.style.top, width, height)
        }
      }
    });
  }
  
  checkWatermarkParams(options: NERtcEncoderWatermarkConfig){
    // 因为水印的参数检查太长了，所以从stream.ts挪到这里
    let wmCounts =
      (options.textWatermarks?.length || 0) + 
      (options.timestampWatermarks ? 1 : 0) + 
      (options.imageWatermarks?.length || 0)
    const wmCountCheck = {
      tag: 'Stream.setEncoderWatermarkConfigs:watermarks.count',
      value: wmCounts,
      max: getParameters().encoderWatermarkLimit,
    };
    checkValidInteger(wmCountCheck);
    
    if (options.textWatermarks){
      options.textWatermarks.forEach((watermark)=>{
        // 检查文字水印字体参数
        const fontSizeCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:textWatermarks.fontSize',
          value: watermark.fontSize,
          min: 1,
          max: 128,
        };
        if (isExistOptions(fontSizeCheck).result){
          checkValidInteger(fontSizeCheck);
        }
        // 检查文字水印颜色参数
        const fontColorCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:textWatermarks.fontColor',
          value: watermark.fontColor,
          min: 0,
          max: 0xFFFFFFFF,
        };
        if (isExistOptions(fontColorCheck).result){
          checkValidInteger(fontColorCheck);
        }
        // 检查文字水印宽度参数
        const wmWidthCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:textWatermarks.wmWidth',
          value: watermark.wmWidth,
          min: 0,
        };
        if (isExistOptions(wmWidthCheck).result){
          checkValidInteger(wmWidthCheck);
        }

        // 检查文字水印高参数
        const wmHeightCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:textWatermarks.wmHeight',
          value: watermark.wmHeight,
          min: 0,
        };
        if (isExistOptions(wmHeightCheck).result){
          checkValidInteger(wmHeightCheck);
        }

        // 检查文字水印横坐标参数
        const offsetXCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:textWatermarks.offsetX',
          value: watermark.offsetX,
        };
        if (isExistOptions(offsetXCheck).result){
          checkValidInteger(offsetXCheck);
        }

        // 检查文字水印纵坐标参数
        const offsetYCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:textWatermarks.offsetY',
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
          tag: 'Stream.setEncoderWatermarkConfigs:timestampWatermarks.fontSize',
          value: watermark.fontSize,
          min: 1,
        };
        if (isExistOptions(fontSizeCheck).result){
          checkValidInteger(fontSizeCheck);
        }
        // 检查时间戳水印颜色参数
        const fontColorCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:timestampWatermarks.fontColor',
          value: watermark.fontColor,
          min: 0,
        };
        if (isExistOptions(fontColorCheck).result){
          checkValidInteger(fontColorCheck);
        }
        // 检查时间戳水印宽度参数
        const wmWidthCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:timestampWatermarks.wmWidth',
          value: watermark.wmWidth,
          min: 0,
        };
        if (isExistOptions(wmWidthCheck).result){
          checkValidInteger(wmWidthCheck);
        }

        // 检查时间戳水印高参数
        const wmHeightCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:timestampWatermarks.wmHeight',
          value: watermark.wmHeight,
          min: 0,
        };
        if (isExistOptions(wmHeightCheck).result){
          checkValidInteger(wmHeightCheck);
        }

        // 检查时间戳水印横坐标参数
        const offsetXCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:timestampWatermarks.offsetX',
          value: watermark.offsetX,
        };
        if (isExistOptions(offsetXCheck).result){
          checkValidInteger(offsetXCheck);
        }

        // 检查时间戳水印纵坐标参数
        const offsetYCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:timestampWatermarks.offsetY',
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
          tag: 'Stream.setEncoderWatermarkConfigs.imageWatermarks.wmWidth',
          value: watermark.wmWidth,
          min: 0,
        };
        if (isExistOptions(wmWidthCheck).result){
          checkValidInteger(wmWidthCheck);
        }

        // 检查图片水印高参数
        const wmHeightCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:imageWatermarks.wmHeight',
          value: watermark.wmHeight,
          min: 0,
        };
        if (isExistOptions(wmHeightCheck).result){
          checkValidInteger(wmHeightCheck);
        }

        // 检查图片水印横坐标参数
        const offsetXCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:imageWatermarks.offsetX',
          value: watermark.offsetX,
        };
        if (isExistOptions(offsetXCheck).result){
          checkValidInteger(offsetXCheck);
        }

        // 检查图片水印纵坐标参数
        const offsetYCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:imageWatermarks.offsetY',
          value: watermark.offsetY,
        };
        if (isExistOptions(offsetYCheck).result){
          checkValidInteger(offsetYCheck);
        }
        
        // 检查图片水印imageUrls参数
        const imageUrlsExistsCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:imageWatermarks.imageUrls',
          value: watermark.imageUrls,
        };
        checkExists(imageUrlsExistsCheck);
        const imageUrlsLengthCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:imageWatermarks.imageUrls.length',
          value: watermark.imageUrls.length,
          min: 1,
        };
        checkValidInteger(imageUrlsLengthCheck);

        // 检查图片水印fps参数
        const fpsCheck = {
          tag: 'Stream.setEncoderWatermarkConfigs:imageWatermarks.fps',
          value: watermark.fps,
          min: 0,
          max: 30,
        };
        if (isExistOptions(fpsCheck).result){
          checkValidFloat(fpsCheck);
        }
      });
    }
  }
  updateWatermarks(options:NERtcEncoderWatermarkConfig){
    this.watermarks = [];
    const counts = {
      text: 0,
      timestamp: 0,
      image: 0
    };
    if (options.imageWatermarks){
      options.imageWatermarks.forEach((item: NERtcImageWatermarkConfig)=>{
        const style:EncoderWatermarkStyle = Object.assign({}, this.settings.defaultStyle, {background: "none"});
        // 左边距
        if (typeof item.offsetX === "number"){
          style.left = item.offsetX
        }else if (!item.offsetX){
          // 维持默认值
        }

        // 上边距
        if (typeof item.offsetY === "number"){
          style.top = item.offsetY;
        }else if (!item.offsetY){
          // 维持默认值
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
          style.bgWidth = item.wmWidth;
        }

        // 高度
        if (!item.wmHeight){
          // 维持默认值
        }else if (typeof item.wmHeight === "number"){
          style.bgHeight = item.wmHeight;
        }
        
        // 是否循环播放
        if (item.loop !== false){
          item.loop = true
        }

        let setting:EncoderWatermarkSetting;
        if (!item.fps){
          //静态水印，只取最后一张图
          setting = {
            type: 'image',
            content: '',
            imageUrls: [item.imageUrls[item.imageUrls.length -1]],
            loop: false,
            loopIndex: 0,
            interval: 0,
            style: style
          };
        }else{
          // 动态图片
          setting = {
            type: 'image',
            content: '',
            imageUrls: item.imageUrls,
            loop: !(item.loop === false),
            loopIndex: 0,
            interval: 1000 / (item.fps || 1),
            style: style
          };
        }
        setting.startMs = Date.now()
        setting.imgElems = []
        if (setting.imageUrls){
          for (let i = 0; i < setting.imageUrls.length; i++){
            const img = new Image()
            img.src = setting.imageUrls[i]
            setting.imgElems.push(img)
          }
        }
        this.watermarks.push(setting);
      });
    }
    if (options.textWatermarks){
      options.textWatermarks.forEach((item: NERtcTextWatermarkConfig)=>{
        let content:string = item.content || "";
        counts.text++;
        const style:EncoderWatermarkStyle = Object.assign({}, this.settings.defaultStyle);
        // 文字颜色
        if (typeof item.fontColor === "number"){
          style.fillStyle = numberToRGBA(item.fontColor);
        }else if (!item.fontColor){
          // 维持默认值
        }else if (typeof item.fontColor === "string"){
          style.fillStyle = item.fontColor;
        }

        // 文字大小
        if (typeof item.fontSize === "number"){
          style.fontSize = `${item.fontSize}pt`;
        }else if (!item.fontSize){
          // 维持默认值
        }else if (typeof item.fontSize === "string"){
          style.fontSize = item.fontSize;
        }
        const textSize = measureText(item.content, style.fontSize, style.fontFamily)
        style.textWidth = textSize.width
        style.textHeight = textSize.height

        // 左边距
        if (item.offsetX){
          style.left = item.offsetX;
        }

        // 上边距
        if (item.offsetY){
          style.top = item.offsetY;
        }
        
        // 水印框颜色
        if (item.wmColor){
          
        }
        
        if (item.wmWidth >= 0){
          style.bgWidth = item.wmWidth
        }
        if (item.wmHeight >= 0){
          style.bgHeight = item.wmHeight
        }
        
        if (typeof item.wmColor === "number"){
          style.bgFillStyle = numberToRGBA(item.wmColor);
        }else if (!item.wmColor){
          // 维持默认值
        }else if (typeof item.wmColor === "string"){
          style.bgFillStyle = item.wmColor;
        }
        
        const setting:EncoderWatermarkSetting = {
          type: 'text',
          content: content,
          loop: false,
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
        const style:EncoderWatermarkStyle = Object.assign({}, this.settings.defaultStyle);
        // 文字颜色
        if (typeof item.fontColor === "number"){
          style.fillStyle = numberToRGBA(item.fontColor);
        }else if (!item.fontColor){
          // 维持默认值
        }else if (typeof item.fontColor === "string"){
          style.fillStyle = item.fontColor;
        }

        // 文字大小
        if (typeof item.fontSize === "number"){
          style.fontSize = `${item.fontSize}pt`;
        }else if (!item.fontSize){
          // 维持默认值
        }else if (typeof item.fontSize === "string"){
          style.fontSize = item.fontSize;
        }
        const textSize = measureText(content, style.fontSize, style.fontFamily)
        style.textWidth = textSize.width
        style.textHeight = textSize.height

        // 左边距
        if (item.offsetX){
          style.left = item.offsetX;
        }

        // 上边距
        if (item.offsetY){
          style.top = item.offsetY;
        }

        // 水印框颜色
        if (item.wmWidth >= 0){
          style.bgWidth = item.wmWidth
        }
        if (item.wmHeight >= 0){
          style.bgHeight = item.wmHeight
        }
        if (typeof item.wmColor === "number"){
          style.bgFillStyle = numberToRGBA(item.wmColor)
        }else if (!item.wmColor){
          // 维持默认值
        } else if (item.wmColor === "string"){
          style.bgFillStyle = item.wmColor
        }

        const setting:EncoderWatermarkSetting = {
          type: 'timestamp',
          content: content,
          loop: false,
          loopIndex: 0,
          style: style
        };
        this.watermarks.push(setting);
      });
    }
  }

  start(mediaHelper: MediaHelper){
    mediaHelper.enablePreProcessing()
  }
}

export function createEncoderWatermarkControl(logger:ILogger){
  const control = new EncoderWatermarkControl(logger);
  return control;
}