const APP_NAME = 'mediasoup-client';

export const Logger = {
  debug(option?:any, ...args:any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`;
		var args = Array.prototype.slice.call(arguments);
		this.formatArgs(args, prefix);
		(<any>window).logStorage && (<any>window).logStorage.log('debug', args);

  },

  warn(option?:any, ...args:any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`;
		var args = Array.prototype.slice.call(arguments);
		this.formatArgs(args, prefix);
		(<any>window).logStorage && (<any>window).logStorage.log('warn', args);

	},

	error(option?:any, ...args:any[]) {
    const prefix = option ? `${APP_NAME}:${option}` : `${APP_NAME}`;
		var args = Array.prototype.slice.call(arguments);
		this.formatArgs(args, prefix);
		(<any>window).logStorage && (<any>window).logStorage.log('error', args);

	},

  formatArgs(args:any[], param?:any) {
    let date = new Date()
    let dateStr = this.formatTimeUnit('' + (date.getMonth() + 1)) + '-' + this.formatTimeUnit('' + date.getDate()) + ' ' + this.formatTimeUnit('' + date.getHours()) + ':' + this.formatTimeUnit('' + date.getMinutes()) + ':' + this.formatTimeUnit('' + date.getSeconds()) + ':' + this.formatTimeUnit('' + date.getMilliseconds(), 3)
    let prefix = `[WEBRTC LOG ${dateStr} ${param.toUpperCase()}]  `
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