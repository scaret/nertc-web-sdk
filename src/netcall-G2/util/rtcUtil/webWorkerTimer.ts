import {getBlobUrl} from "../../module/blobs/getBlobUrl";

class WorkerTimer{
  private id = 0
  private callbacks: {
    [id: number]: {
      fn: ()=>void,
      context: any,
    }
  } = {}
  private worker: Worker|null = null
  private getWorker(){
    if (!this.worker){
      this.worker = new Worker(getBlobUrl('webWorkerTimer'));
      // 监听worker 里面的定时器发送的message 然后执行回调函数
      this.worker.onmessage = (e) => {
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
      }
    }
    return this.worker
  }


  setInterval(cb: ()=>void, interval:number, context: any) {
    this.id++;
    const id = this.id;
    this.callbacks[id] = { fn: cb, context: context };
    this.getWorker().postMessage({
      command: 'interval:start',
      interval: interval,
      id: id,
    });
    return id;
  }

  setTimeout(cb: ()=>void, timeout: number, context: any) {
    this.id++;
    const id = this.id;
    this.callbacks[id] = { fn: cb, context: context };
    this.getWorker().postMessage({ command: 'timeout:start', timeout: timeout, id: id });
    return id;
  }

  // 往worker里面发送销毁指令
  clearInterval(id: number) {
    this.getWorker().postMessage({ command: 'interval:clear', id: id });
  }
  clearTimeout(id: number) {
    this.getWorker().postMessage({ command: 'timeout:clear', id: id });
  }
}

const workerTimer = new WorkerTimer()
export default workerTimer;
