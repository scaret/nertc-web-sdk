const APP_NAME = 'mediasoup-client';

export const Logger = {
  debug(option?:any, ...args:any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`;
		var args = Array.prototype.slice.call(arguments);
		this.formatArgs(args, prefix);
    console.debug.apply(console, args);
		(<any>window).logStorage && (<any>window).logStorage.log('debug', args);

  },

  warn(option?:any, ...args:any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`;
		var args = Array.prototype.slice.call(arguments);
		this.formatArgs(args, prefix);
    console.warn.apply(console, args);
		(<any>window).logStorage && (<any>window).logStorage.log('warn', args);

	},

	error(option?:any, ...args:any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`;
		var args = Array.prototype.slice.call(arguments);
		this.formatArgs(args, prefix);
    console.error.apply(console, args);
		(<any>window).logStorage && (<any>window).logStorage.log('error', args);

	},
  
  formatSingleArg(arg:any) : any {
    if (arg instanceof RTCRtpSender){
      const sender = arg as RTCRtpSender
      const formatted = `[RTCRtpSender track: ${this.formatSingleArg(sender.track)}]`
      return formatted
    } else if (arg instanceof MediaStreamTrack){
      const track = arg as MediaStreamTrack;
      const formatted = `[MediaStreamTrack kind:${track.kind} label:${track.label} readyState:${track.readyState} id: ${track.id} enabled:${track.enabled} muted: ${track.muted}]`
      return formatted
    }else{
      return arg;
    }
  },

  formatArgs(args:any[], param?:any) {
    let date = new Date()
    let dateStr = this.formatTimeUnit('' + (date.getMonth() + 1)) + '-' + this.formatTimeUnit('' + date.getDate()) + ' ' + this.formatTimeUnit('' + date.getHours()) + ':' + this.formatTimeUnit('' + date.getMinutes()) + ':' + this.formatTimeUnit('' + date.getSeconds()) + ':' + this.formatTimeUnit('' + date.getMilliseconds(), 3)
    let prefix = `[WEBRTC LOG ${dateStr} ${param.toUpperCase()}]  `
    for (let i = args.length - 1; i >= 0; i--){
      args[i] = this.formatSingleArg(args[i])
    }
    args.unshift(prefix);
    return args
  },

  formatTimeUnit (num:string, count?:number) {
    count = count || 2
    var str = '' + num
    while (str.length < count) {
      str = '0' + str
    }
    return str
  }
}