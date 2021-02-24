"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("debug");
const APP_NAME = 'mediasoup-client';
class Logger {
    constructor(prefix) {
        if (prefix) {
            /*this._debug = debug_1.default(`${APP_NAME}:${prefix}`);
            this._warn = debug_1.default(`${APP_NAME}:WARN:${prefix}`);
            this._error = debug_1.default(`${APP_NAME}:ERROR:${prefix}`);*/
            this._debug = debug_1.default(`${APP_NAME}:${prefix}`);
            this._warn = debug_1.default(`${APP_NAME}:WARN:${prefix}`);
            this._error = debug_1.default(`${APP_NAME}:ERROR:${prefix}`);
        }
        else {
            this._debug = debug_1.default(APP_NAME);
            this._warn = debug_1.default(`${APP_NAME}:WARN`);
            this._error = debug_1.default(`${APP_NAME}:ERROR`);
        }
        /* eslint-disable no-console */
        this._debug.log = console.info.bind(console);
        this._warn.log = console.warn.bind(console);
        this._error.log = console.error.bind(console);
        /* eslint-enable no-console */
    }
    get debug() {
        this._debug.enabled = window.debugG2
        return this._debug;
    }
    get warn() {
        this._warn.enabled = window.debugG2
        return this._warn;
    }
    get error() {
        this._error.enabled = window.debugG2
        return this._error;
    }
}
exports.Logger = Logger;
