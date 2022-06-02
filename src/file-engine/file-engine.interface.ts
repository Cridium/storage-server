import { Readable } from "stream";

export abstract class FileEngine {
  abstract bootstrap(options: FileEngineOptions): Promise<void>;
  abstract store(source: Readable): Promise<string>;
  abstract retrieve(key: string): Promise<Readable>;
}

export interface FileEngineOptions extends Record<string, unknown> {}

export interface FileEngineClass {
  new (): FileEngine;
}