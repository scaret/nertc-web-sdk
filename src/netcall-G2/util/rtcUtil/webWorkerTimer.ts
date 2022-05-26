//@ts-nocheck
// Build a worker from an anonymous function body
const blobURL = URL.createObjectURL(
    new Blob(
      [
        '(',
  
        function() {
          const intervalIds = {};
          const timeoutIds = {};
  
          // 监听message 开始执行定时器或者销毁
          self.onmessage = function onMsgFunc(e) {
            switch (e.data.command) {
              case 'interval:start': // 开启定时器
                const intervalId = setInterval(function() {
                  postMessage({
                    message: 'interval:tick',
                    id: e.data.id,
                  });
                }, e.data.interval);
  
                postMessage({
                  message: 'interval:started',
                  id: e.data.id,
                });
  
                intervalIds[e.data.id] = intervalId;
                break;
              case 'interval:clear': // 销毁
                clearInterval(intervalIds[e.data.id]);
  
                postMessage({
                  message: 'interval:cleared',
                  id: e.data.id,
                });
  
                delete intervalIds[e.data.id];
                break;
            
              case 'timeout:start': // 开启定时器
                const timeoutId = this.setTimeout(function() {
                  postMessage({
                    message: 'timeout:tick',
                    id: e.data.id,
                  });
                }, e.data.timeout);
  
                postMessage({
                  message: 'timeout:started',
                  id: e.data.id,
                });
  
                timeoutIds[e.data.id] = timeoutId;
                break;
              case 'timeout:clear': // 销毁
                clearTimeout(timeoutIds[e.data.id]);
  
                postMessage({
                  message: 'timeout:cleared',
                  id: e.data.id,
                });
  
                delete timeoutIds[e.data.id];
                break;
            }
          };
        }.toString(),
  
        ')()',
      ],
      { type: 'application/javascript' },
    ),
  );
  
  const worker = new Worker(blobURL);
  
  URL.revokeObjectURL(blobURL);
  
  const workerTimer = {
    id: 0,
    callbacks: {},
    setInterval: function(cb, interval, context) {
      this.id++;
      const id = this.id;
      this.callbacks[id] = { fn: cb, context: context };
      worker.postMessage({
        command: 'interval:start',
        interval: interval,
        id: id,
      });
      return id;
    },
    setTimeout: function(cb, timeout, context) {
      this.id++;
      const id = this.id;
      this.callbacks[id] = { fn: cb, context: context };
      worker.postMessage({ command: 'timeout:start', timeout: timeout, id: id });
      return id;
    },
  
    // 监听worker 里面的定时器发送的message 然后执行回调函数
    onMessage: function(e) {
      switch (e.data.message) {
        case 'interval:tick':
        case 'timeout:tick': {
          const callbackItem = this.callbacks[e.data.id];
          if (callbackItem && callbackItem.fn)
            callbackItem.fn.apply(callbackItem.context);
          break;
        }
  
        case 'interval:cleared':
        case 'timeout:cleared':
          delete this.callbacks[e.data.id];
          break;
      }
    },
  
    // 往worker里面发送销毁指令
    clearInterval: function(id) {
      worker.postMessage({ command: 'interval:clear', id: id });
    },
    clearTimeout: function(id) {
      worker.postMessage({ command: 'timeout:clear', id: id });
    },
  };
  
  worker.onmessage = workerTimer.onMessage.bind(workerTimer);
  
  export default workerTimer;
