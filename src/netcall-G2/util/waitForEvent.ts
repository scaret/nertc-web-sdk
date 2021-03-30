"use strict";

import {Timer} from "../types";

export async function waitForEvent(emitter: any, eventName:string, ttl: number) {

  return new Promise((resolve, reject) => {

    let timeout:Timer;

    const cb = (msg:any) => {
      if (timeout) clearTimeout(timeout);
      resolve(msg);
    };

    if (ttl) {
      timeout = setTimeout(
        () => {
          emitter.removeListener(eventName, cb);
          reject(`timed out after ${ttl}ms:${eventName}`);
        },
        ttl
      );
    }
    emitter.once(eventName, cb);
  });

};