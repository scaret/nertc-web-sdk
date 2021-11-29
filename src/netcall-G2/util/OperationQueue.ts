import {Client, ILogger, JoinOptions} from "../types";
import {LocalStream, LocalStreamCloseOptions, LocalStreamOpenOptions} from "../api/localStream";

type OperationArgs = {
  caller: Client,
  method: "join",
  options: JoinOptions,
}|{
  caller: Client,
  method: "leave",
  options: null,
}|{
  caller: Client,
  method: "publish",
  options: LocalStream,
}|{
  caller: Client,
  method: "unpublish",
  options: null,
}|{
  caller: LocalStream,
  method: "open",
  options: LocalStreamOpenOptions,
}|{
  caller: LocalStream,
  method: "close",
  options: LocalStreamCloseOptions,
}

interface QueueElem{
  id: number,
  enqueueTs: number,
  startTs?: number,
  args: OperationArgs,
  resolve: any,
  reject: any
}

type callMeWhenFinished = ()=>void

export class OperationQueue{
  cnt: number = 0;
  current: QueueElem|null = null
  queue: QueueElem[] = []
  logger: ILogger
  constructor(logger: ILogger) {
    this.logger = logger.getChild(()=>{
      let tag = "oper"
      if (this.current){
        tag += ` ${this.current.args.method}#${this.current.id}`
      }
      this.queue.forEach((queueElem)=>{
        tag += `|${queueElem.args.method}#${queueElem.id}`
      })
      return tag
    })
    setInterval(()=>{
      if (this.current && Date.now() - this.current.enqueueTs > 5000){
        this.logger.error(`当前操作已执行了${Date.now() - this.current.enqueueTs}ms，放开锁限制：${this.current.args.method}#${this.current.id}`)
        this.current = null
        this.fire("timer")
      }
    }, 5000);
  }
  enqueue(args: OperationArgs) :Promise<callMeWhenFinished>{
    return new Promise((resolve, reject)=>{
      // await enqueue操作会卡住所有join/leave操作。
      // resolve被调用时代表继续执行下面的操作。
      // reject被调用时代表下面的操作被取消。目前没有操作被取消的行为。
      this.queue.push({
        id: ++this.cnt,
        enqueueTs: Date.now(),
        args,
        resolve,
        reject,
      })
      if (!this.current){
        this.fire("instant")
      }
    })
  }
  private fire(source: "instant"|"functionEnd"|"timer"){
    if (!this.current){
      const elem = this.queue.shift();
      if (elem){
        this.current = elem;
        if (source === "instant"){
          this.logger.log(`开始执行操作${elem.args.method}#${elem.id}。参数：`, elem.args.options)
        }else{
          this.logger.log(`开始执行队列中的操作${elem.args.method}#${elem.id}，等待时间：${Date.now() - elem.enqueueTs}ms。参数：`, elem.args.options)
        }
        elem.startTs = Date.now();
        elem.resolve(()=>{
          if (this.current === elem){
            this.current = null
            this.logger.log(`操作${elem.args.method}#${elem.id}执行完毕。花费 ${elem.startTs ? Date.now() - elem.startTs : null}ms`)
            this.fire("functionEnd")
          }else{
            this.logger.error(`操作收到多次返回：${elem.args.method}#${elem.id}。花费 ${elem.startTs ? Date.now() - elem.startTs : null}ms`)
          }
        });
      }
    }
  }
}