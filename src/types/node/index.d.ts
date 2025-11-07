declare module "node:events" {
  export class EventEmitter {
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
  }
}

declare module "node:http" {
  import type { EventEmitter } from "node:events";

  export type OutgoingHttpHeaders = Record<string, string | string[] | number | undefined>;
  export type ClientRequestArgs = Record<string, any>;

  export class IncomingMessage extends EventEmitter {
    url?: string;
  }
  export class ClientRequest extends EventEmitter {}
  export class Agent extends EventEmitter {}
  export class Server extends EventEmitter {}
  export class ServerResponse extends EventEmitter {}
}

declare module "node:http2" {
  import type { EventEmitter } from "node:events";
  export class Http2SecureServer extends EventEmitter {}
}

declare module "node:https" {
  import type { Server as HttpServer } from "node:http";
  export type ServerOptions = Record<string, any>;
  export class Server extends HttpServer {}
}

declare module "node:url" {
  export class URL {
    constructor(input: string, base?: string);
  }
  export interface Url {}
}

declare module "node:stream" {
  import type { EventEmitter } from "node:events";
  export class Stream extends EventEmitter {}
  export class Duplex extends Stream {}
  export interface DuplexOptions {}
  export class Writable extends Stream {}
}

declare module "node:stream/web" {
  export interface WritableStream {}
}

declare module "node:tls" {
  export interface SecureContextOptions {}
}

declare module "node:zlib" {
  export interface ZlibOptions {}
}

declare module "node:fs" {
  import type { EventEmitter } from "node:events";
  export interface Stats {
    size?: number;
  }
  export class FSWatcher extends EventEmitter {}
}

declare module "node:net" {
  import type { EventEmitter } from "node:events";
  export class Socket extends EventEmitter {}
}

declare module "node:worker_threads" {
  import type { EventEmitter } from "node:events";
  export class MessagePort extends EventEmitter {}
}

declare var setImmediate: (...args: any[]) => any;
declare var clearImmediate: (...args: any[]) => void;

type Buffer = any;

declare namespace NodeJS {
  interface EventEmitter {}
  interface WriteStream {}
  interface ReadStream {}
  interface WritableStream {}
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare interface SymbolConstructor {
  readonly asyncDispose: symbol;
}
