import type { Readable, Writable } from 'node:stream';
import { ListObjectsQuery } from 'oss-interface';

export type RequestParameters = string | string[] | Record<string, string | number>;
export type RequestQuery = Record<string, string> | ListObjectsQuery;
export type RequestHeaders = Record<string, string>;
export type RequestMeta = Record<string, string>;
export type RequestMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Request {
  headers: RequestHeaders;
  parameters?: RequestParameters;
}

export interface OSSRequestParams {
  method: RequestMethod;
  headers?: RequestHeaders;
  bucket?: string;
  object?: string;
  query?: RequestQuery;
  mime?: string;
  content?: string;
  disabledMD5?: boolean;
  stream?: Readable;
  writeStream?: Writable;
  timeout?: number;
  subres?: RequestParameters;
  xmlResponse?: boolean;
  streaming?: boolean;
  successStatuses?: number[];
}
