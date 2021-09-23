import { EventEmitter } from 'events';
import { Logger } from './Logger';

const prefix = 'EnhancedEventEmitter';

export class EnhancedEventEmitter extends EventEmitter
{
  constructor()
  {
    super();
    this.setMaxListeners(Infinity);
  }

  safeEmit(event: string, ...args: any[]): boolean
  {
    const numListeners = this.listenerCount(event);

    try
    {
      return this.emit(event, ...args);
    }
    catch (error)
    {
      Logger.error(prefix, 'safeEmit() | event listener threw an error [event:%s]:%o', event, error);

      return Boolean(numListeners);
    }
  }

  async safeEmitAsPromise(event: string, ...args: any[]): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      try
      {
        this.emit(event, ...args, resolve, reject);
      }
      catch (error)
      {
        Logger.error(prefix,
          'safeEmitAsPromise() | event listener threw an error [event:%s]:%o',
          event, error);

        reject(error);
      }
    });
  }
}
