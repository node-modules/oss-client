import type { Readable, Writable } from 'node:stream';
import type { ListObjectsQuery } from 'oss-interface';
import type { RawResponseWithMeta, IncomingHttpHeaders } from 'urllib';

export type RequestParameters =
  | string
  | string[]
  | Record<string, string | number>;
export type RequestQuery = Record<string, string> | ListObjectsQuery;
export type RequestMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

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
  /**
   * set request query params
   * e.g.:
   *  - DELETE object `versionId`
   */
  subResource?: RequestParameters;
  xmlResponse?: boolean;
  streaming?: boolean;
  successStatuses?: number[];
}

export interface OSSResult<T> {
  data: T;
  res: RawResponseWithMeta;
}
