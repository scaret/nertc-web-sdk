import { LogConfig, LoggerHelperOptions } from '../types'

class logHelper {
  private useTimestamps: boolean
  private useLocalStorage: boolean
  private autoTrim: boolean
  private maxLines: number
  private tailNumLines: number
  private logFilename: string
  private maxDepth: number
  private maxLogsLines: number
  private depth: number
  private parentSizes: number[]
  private currentResult: string
  private startTime: Date
  private output: string

  constructor(options: LoggerHelperOptions) {
    if (
      options.maxLogsLines &&
      typeof options.maxLogsLines === 'number' &&
      !isNaN(options.maxLogsLines)
    ) {
      this.maxLogsLines = options.maxLogsLines
    } else {
      this.maxLogsLines = 5000
    }

    if (options.logFilename) {
      options.logFilename = options.logFilename + '.txt'
    }

    // OPTIONS
    this.useTimestamps = options.useTimestamps || false // insert a timestamp in front of each log
    this.useLocalStorage = options.useLocalStorage || false // store the output using window.localStorage() and continuously add to the same log each session
    this.autoTrim = true // to avoid the log eating up potentially endless memory
    this.maxLines = options.maxLogsLines || 5000 // if autoTrim is true, this many most recent lines are saved
    this.tailNumLines = 100 // how many lines tail() will retrieve
    this.logFilename = options.logFilename || 'nimWebRtcLog.txt' // filename of log downloaded with downloadLog()
    this.maxDepth = 5 // max recursion depth for logged objects

    // vars
    this.depth = 0
    this.parentSizes = [0]
    this.currentResult = ''
    this.startTime = new Date()
    this.output = ''

    /*
      START/RESUME LOG
    */
    if (this.useLocalStorage) {
      var savedStr = window.localStorage.getItem('nimWebRtcLog')
      if (savedStr) {
        var saved = JSON.parse(savedStr) as LogConfig
        this.output = saved.log
        var start = new Date(saved.startTime)
        var end = new Date(saved.lastLog)
        this.output += '\n---- Session end: ' + saved.lastLog + ' ----\n'
        this.output += this.formatSessionDuration(start.getTime(), end.getTime())
        this.output += '\n\n'
      }
    }
    this.output += '---- Session started: ' + this.startTime + ' ----\n\n'
  }

  getLog() {
    var self = this
    var retrievalTime = new Date()
    // if using local storage, get values
    if (self.useLocalStorage) {
      var savedStr = window.localStorage.getItem('nimWebRtcLog')
      if (savedStr) {
        var saved = JSON.parse(savedStr) as LogConfig
        self.startTime = new Date(saved.startTime)
        self.output = saved.log
        retrievalTime = new Date(saved.lastLog)
      }
    }
    return (
      self.output +
      '\n---- Log retrieved: ' +
      retrievalTime +
      ' ----\n' +
      self.formatSessionDuration(self.startTime.getTime(), retrievalTime.getTime())
    )
  }

  // accepts optional number or uses the default for number of lines
  tail(numLines: number) {
    var self = this
    var numLines = numLines || self.tailNumLines
    return self.trimLog(self.getLog(), numLines)
  }

  // accepts a string to search for
  search(string: string) {
    var self = this
    var lines = self.output.split('\n')
    var rgx = new RegExp(string)
    var matched = []
    // can't use a simple Array.prototype.filter() here
    // because we need to add the line number
    for (var i = 0; i < lines.length; i++) {
      var addr = '[' + i + '] '
      if (lines[i].match(rgx)) {
        matched.push(addr + lines[i])
      }
    }
    var result = matched.join('\n')
    if (result.length == 0) result = 'Nothing found for "' + string + '".'
    return result
  }

  // accepts the starting line and how many lines after the starting line you want
  getSlice(lineNumber: number, numLines: number) {
    var self = this
    var lines = self.output.split('\n')
    var segment = lines.slice(lineNumber, lineNumber + numLines)
    return segment.join('\n')
  }

  // immediately downloads the log - for desktop browser use
  downloadLog() {
    var self = this
    var logFile = self.getLog()
    var blob = new Blob([logFile], { type: 'data:text/plain;charset=utf-8' })
    var a = document.createElement('a')
    a.href = window.URL.createObjectURL(blob)
    a.target = '_blank'
    a.download = self.logFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(a.href)
  }

  // clears the log
  clear() {
    var self = this
    var clearTime = new Date()
    self.output = '---- Log cleared: ' + clearTime + ' ----\n'
    if (self.useLocalStorage) {
      // local storage
      var saveObject = {
        startTime: self.startTime,
        log: self.output,
        lastLog: clearTime
      }
      var saveStr = JSON.stringify(saveObject)
      window.localStorage.setItem('nimWebRtcLog', saveStr)
    }
  }

  // records a log
  log(obj: any) {
    var self = this
    // record log
    var type = self.determineType(obj)
    if (type != null) {
      var addition = self.formatType(type, obj)
      // timestamp, formatted for brevity
      if (self.useTimestamps) {
        var logTime = new Date()
        self.output += self.formatTimestamp(logTime)
      }
      self.output += addition + '\n'
      if (self.autoTrim) self.output = self.trimLog(self.output, self.maxLines)
      // local storage
      if (self.useLocalStorage) {
        var last = new Date()
        var saveObject = {
          startTime: self.startTime,
          log: self.output,
          lastLog: last
        }
        var saveStr = JSON.stringify(saveObject)
        window.localStorage.setItem('nimWebRtcLog', saveStr)
      }
    }
    self.depth = 0
    self.parentSizes = [0]
    self.currentResult = ''
  }

  // like typeof but classifies objects of type 'object'
  // kept separate from formatType() so you can use at your convenience!
  determineType(object: any) {
    if (object != null) {
      var typeResult
      var type = typeof object
      if (type == 'object') {
        var len = object.length
        if (len == null) {
          if (typeof object.getTime == 'function') {
            typeResult = 'Date'
          } else if (typeof object.test == 'function') {
            typeResult = 'RegExp'
          } else {
            typeResult = 'Object'
          }
        } else {
          typeResult = 'Array'
        }
      } else {
        typeResult = type
      }
      return typeResult
    } else {
      return 'null'
    }
  }

  // format type accordingly, recursively if necessary
  formatType(type: string, obj: any) {
    var self = this
    if (self.maxDepth && self.depth >= self.maxDepth) {
      return '... (max-depth reached)'
    }

    switch (type) {
      case 'Object':
        self.currentResult += '{\n'
        self.depth++
        self.parentSizes.push(self.objectSize(obj))
        var i = 0
        for (var prop in obj) {
          /*
          if (Object.prototype.hasOwnProperty.call(obj, prop)) { // 过滤
            self.currentResult += self.indentsForDepth(self.depth);
            self.currentResult += prop + ': ';
            var subtype = self.determineType(obj[prop]);
            var subresult = self.formatType(subtype, obj[prop]);
            if (subresult) {
              self.currentResult += subresult;
              if (i != self.parentSizes[self.depth]-1) self.currentResult += ',';
              self.currentResult += '\n';
            } else {
              if (i != self.parentSizes[self.depth]-1) self.currentResult += ',';
              self.currentResult += '\n';
            }
            i++;
             }
             */
          self.currentResult += self.indentsForDepth(self.depth)
          self.currentResult += prop + ': '
          var subtype = self.determineType(obj[prop])
          var subresult = self.formatType(subtype, obj[prop])
          if (subresult) {
            if (subtype !== 'function')
              //console.warn('subresult: ', subresult)
              self.currentResult += subresult
            if (i != self.parentSizes[self.depth] - 1) self.currentResult += ','
            self.currentResult += '\n'
          } else {
            if (i != self.parentSizes[self.depth] - 1) self.currentResult += ','
            self.currentResult += '\n'
          }
          i++
        }
        self.depth--
        self.parentSizes.pop()
        self.currentResult += self.indentsForDepth(self.depth)
        self.currentResult += '}'
        if (self.depth == 0) return self.currentResult
        break
      case 'Array':
        self.currentResult += '['
        self.depth++
        self.parentSizes.push(obj.length)
        for (var i = 0; i < obj.length; i++) {
          var subtype = self.determineType(obj[i])
          if (subtype == 'Object' || subtype == 'Array')
            self.currentResult += '\n' + self.indentsForDepth(self.depth)
          var subresult = self.formatType(subtype, obj[i])
          if (subresult) {
            self.currentResult += subresult
            if (i != self.parentSizes[self.depth] - 1) self.currentResult += ', '
            if (subtype == 'Array') self.currentResult += '\n'
          } else {
            if (i != self.parentSizes[self.depth] - 1) self.currentResult += ', '
            if (subtype != 'Object') self.currentResult += '\n'
            else if (i == self.parentSizes[self.depth] - 1) self.currentResult += '\n'
          }
        }
        self.depth--
        self.parentSizes.pop()
        self.currentResult += ']'
        if (self.depth == 0) return self.currentResult
        break
      case 'function':
        obj += ''
        var lines = obj.split('\n')
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].match(/\}/)) self.depth--
          self.currentResult += self.indentsForDepth(self.depth)
          if (lines[i].match(/\{/)) self.depth++
          self.currentResult += lines[i] + '\n'
        }
        return self.currentResult
      case 'RegExp':
        return '/' + obj.source + '/'
      case 'Date':
      case 'string':
        if (self.depth > 0 || obj.length == 0) {
          return '"' + obj + '"'
        } else {
          return obj
        }
      case 'boolean':
        if (obj) return 'true'
        else return 'false'
      case 'number':
        return obj + ''
    }
  }

  indentsForDepth(depth: number) {
    var str = ''
    for (var i = 0; i < depth; i++) {
      str += '\t'
    }
    return str
  }

  trimLog(log: string, maxLines: number) {
    var lines = log.split('\n')
    if (lines.length > maxLines) {
      lines = lines.slice(lines.length - maxLines)
    }
    return lines.join('\n')
  }

  lines() {
    var self = this
    return self.output.split('\n').length
  }

  // calculate testing time
  formatSessionDuration(startTime: number, endTime: number) {
    var msec = endTime - startTime
    var hh = Math.floor(msec / 1000 / 60 / 60)
    var hrs = ('0' + hh).slice(-2)
    msec -= hh * 1000 * 60 * 60
    var mm = Math.floor(msec / 1000 / 60)
    var mins = ('0' + mm).slice(-2)
    msec -= mm * 1000 * 60
    var ss = Math.floor(msec / 1000)
    var secs = ('0' + ss).slice(-2)
    msec -= ss * 1000
    return '---- Session duration: ' + hrs + ':' + mins + ':' + secs + ' ----'
  }
  formatTimestamp(timestamp: Date) {
    var year = timestamp.getFullYear()
    var date = timestamp.getDate()
    var month = ('0' + (timestamp.getMonth() + 1)).slice(-2)
    var hrs = Number(timestamp.getHours())
    var mins = ('0' + timestamp.getMinutes()).slice(-2)
    var secs = ('0' + timestamp.getSeconds()).slice(-2)
    return '[' + year + '-' + month + '-' + date + ' ' + hrs + ':' + mins + ':' + secs + ']: '
  }
  objectSize(obj: any) {
    var size = 0,
      key
    for (key in obj) {
      if (obj.hasOwnProperty && obj.hasOwnProperty(key)) size++
    }
    return size
  }
}

function logHelper2(options = {}) {
  /*
		USER METHODS
	*/
  /*
		METHODS FOR CONSTRUCTING THE LOG
	*/
}

export { logHelper }
