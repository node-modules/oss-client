import type { Readable, Writable } from 'node:stream';
import type { IncomingHttpHeaders } from 'node:http';
import { ListObjectsQuery } from 'oss-interface';

export type RequestParameters = string | string[] | Record<string, string | number>;
export type RequestQuery = Record<string, string> | ListObjectsQuery;
export type RequestMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Request {
  headers: IncomingHttpHeaders;
  parameters?: RequestParameters;
}

export interface OSSRequestParams {
  method: RequestMethod;
  headers?: IncomingHttpHeaders;
  bucket?: string;
  object?: string;
  query?: RequestQuery;
  mime?: string;
  content?: Buffer;
  disabledMD5?: boolean;
  stream?: Readable;
  writeStream?: Writable;
  timeout?: number;
  subres?: RequestParameters;
  xmlResponse?: boolean;
  streaming?: boolean;
  successStatuses?: number[];
}
