import { debuglog } from 'node:util';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import type { IncomingHttpHeaders } from 'node:http';
import { sendToWormhole } from 'stream-wormhole';
import { parseStringPromise } from 'xml2js';
import utility from 'utility';
import mime from 'mime';
import { HttpClient, RequestOptions, HttpClientResponse } from 'urllib';
import ms from 'ms';
import pkg from '../package.json' assert { type: 'json' };
import { authorization, buildCanonicalString, computeSignature } from './util/sign.js';
import { OSSRequestParams, OSSResult, RequestParameters } from './type/Request.js';
import { OSSClientError } from './error/index.js';

const debug = debuglog('oss-client:client');

export interface OSSBaseClientInitOptions {
  /** access key you create */
  accessKeyId: string;
  /** access secret you create */
  accessKeySecret: string;
  /**
   * oss region domain. It takes priority over region.
   * e.g.:
   * - oss-cn-shanghai.aliyuncs.com
   * - oss-cn-shanghai-internal.aliyuncs.com
   */
  endpoint: string;
  /** the bucket data region location, please see Data Regions, default is oss-cn-hangzhou. */
  region?: string | undefined;
  /** access OSS with aliyun internal network or not, default is false. If your servers are running on aliyun too, you can set true to save lot of money. */
  internal?: boolean | undefined;
  /** instance level timeout for all operations, default is 60s */
  timeout?: number | string;
  isRequestPay?: boolean;
}

export type OSSBaseClientOptions = Required<OSSBaseClientInitOptions> & {
  timeout: number;
};

export abstract class OSSBaseClient {
  readonly #httpClient = new HttpClient();
  readonly #userAgent: string;
  protected readonly options: OSSBaseClientOptions;

  constructor(options: OSSBaseClientInitOptions) {
    this.options = this.#initOptions(options);
    this.#userAgent = this.#getUserAgent();
  }

  /** public methods */

  /**
   * get OSS signature
   */
  signature(stringToSign: string) {
    debug('authorization stringToSign: %s', stringToSign);
    return computeSignature(this.options.accessKeySecret, stringToSign);
  }

  /** protected methods */

  /**
   * get author header
   *
   * "Authorization: OSS " + Access Key Id + ":" + Signature
   *
   * Signature = base64(hmac-sha1(Access Key Secret + "\n"
   *  + VERB + "\n"
   *  + CONTENT-MD5 + "\n"
   *  + CONTENT-TYPE + "\n"
   *  + DATE + "\n"
   *  + CanonicalizedOSSHeaders
   *  + CanonicalizedResource))
   */
  protected authorization(method: string, resource: string, headers: IncomingHttpHeaders, subResource?: RequestParameters) {
    const stringToSign = buildCanonicalString(method.toUpperCase(), resource, {
      headers,
      parameters: subResource,
    });
    debug('stringToSign: %o', stringToSign);
    const auth = authorization(this.options.accessKeyId, this.options.accessKeySecret, stringToSign);
    debug('authorization: %o', auth);
    return auth;
  }

  protected escape(name: string) {
    return utility.encodeURIComponent(name).replaceAll('%2F', '/');
  }

  protected abstract getRequestEndpoint(): string;

  protected getRequestURL(params: Pick<OSSRequestParams, 'object' | 'query' | 'subResource'>) {
    let resourcePath = '/';
    if (params.object) {
      // Preserve '/' in result url
      resourcePath += this.escape(params.object).replaceAll('+', '%2B');
    }
    const urlObject = new URL(this.getRequestEndpoint());
    urlObject.pathname = resourcePath;
    if (params.query) {
      const query = params.query as Record<string, string | number>;
      for (const key in query) {
        const value = query[key];
        urlObject.searchParams.set(key, `${value}`);
      }
    }
    if (params.subResource) {
      let subresAsQuery: Record<string, string | number> = {};
      if (typeof params.subResource === 'string') {
        subresAsQuery[params.subResource] = '';
      } else if (Array.isArray(params.subResource)) {
        params.subResource.forEach(k => {
          subresAsQuery[k] = '';
        });
      } else {
        subresAsQuery = params.subResource;
      }
      for (const key in subresAsQuery) {
        urlObject.searchParams.set(key, `${subresAsQuery[key]}`);
      }
    }
    return urlObject.toString();
  }

  getResource(params: { bucket?: string; object?: string; }) {
    let resource = '/';
    if (params.bucket) resource += `${params.bucket}/`;
    if (params.object) resource += params.object;
    return resource;
  }

  createHttpClientRequestParams(params: OSSRequestParams) {
    const headers: IncomingHttpHeaders = {
      ...params.headers,
      // https://help.aliyun.com/zh/oss/developer-reference/include-signatures-in-the-authorization-header
      // 此次操作的时间，Date必须为GMT格式，且不能为空。该值取自请求头的Date字段或者x-oss-date字段。当这两个字段同时存在时，以x-oss-date为准。
      // e.g.: Sun, 22 Nov 2015 08:16:38 GMT
      'x-oss-date': new Date().toUTCString(),
      'user-agent': this.#userAgent,
    };
    if (this.options.isRequestPay) {
      headers['x-oss-request-payer'] = 'requester';
    }
    if (!headers['content-type']) {
      let contentType: string | null = null;
      if (params.mime) {
        if (params.mime.includes('/')) {
          contentType = params.mime;
        } else {
          contentType = mime.getType(params.mime);
        }
      } else if (params.object) {
        contentType = mime.getType(extname(params.object));
      }
      if (contentType) {
        headers['content-type'] = contentType;
      }
    }
    if (params.content) {
      if (!params.disabledMD5) {
        if (!headers['content-md5']) {
          headers['content-md5'] = createHash('md5').update(Buffer.from(params.content)).digest('base64');
        }
      }
      if (!headers['content-length']) {
        headers['content-length'] = `${params.content.length}`;
      }
    }
    const authResource = this.getResource(params);
    headers.authorization = this.authorization(params.method, authResource, headers, params.subResource);
    const url = this.getRequestURL(params);
    debug('request %s %s, with headers %j, !!stream: %s', params.method, url, headers, !!params.stream);
    const timeout = params.timeout ?? this.options.timeout;
    const options: RequestOptions = {
      method: params.method,
      content: params.content,
      stream: params.stream,
      headers,
      timeout,
      writeStream: params.writeStream,
      timing: true,
    };
    if (params.streaming) {
      options.dataType = 'stream';
    }
    return { url, options };
  }

  /**
   * request oss server
   */
  protected async request<T = any>(params: OSSRequestParams): Promise<OSSResult<T>> {
    const { url, options } = this.createHttpClientRequestParams(params);
    const result = await this.#httpClient.request<Buffer>(url, options);
    debug('response %s %s, got %s, headers: %j', params.method, url, result.status, result.headers);
    let err;
    if (!params.successStatuses?.includes(result.status)) {
      err = await this.#createClientException(result);
      if (params.streaming && result.res) {
        // consume the response stream
        await sendToWormhole(result.res);
      }
      throw err;
    }

    let data = result.data as T;
    if (params.xmlResponse) {
      data = await this.#xml2json<T>(result.data);
    }
    return {
      data,
      res: result.res,
    } satisfies OSSResult<T>;
  }


  /** private methods */

  #initOptions(options: OSSBaseClientInitOptions) {
    assert(options.accessKeyId && options.accessKeySecret, 'require accessKeyId and accessKeySecret');
    assert(options.endpoint, 'require endpoint');
    let timeout = 60000;
    if (options.timeout) {
      if (typeof options.timeout === 'string') {
        timeout = ms(options.timeout);
      } else {
        timeout = options.timeout;
      }
    }

    const initOptions = {
      accessKeyId: options.accessKeyId.trim(),
      accessKeySecret: options.accessKeySecret.trim(),
      endpoint: options.endpoint,
      region: options.region ?? 'oss-cn-hangzhou',
      internal: options.internal ?? false,
      isRequestPay: options.isRequestPay ?? false,
      timeout,
    } satisfies OSSBaseClientOptions;
    return initOptions;
  }

  /**
   * Get User-Agent for Node.js
   * @example
   *   oss-client/1.0.0 Node.js/5.3.0 (darwin; arm64)
   */
  #getUserAgent() {
    const sdk = `${pkg.name}/${pkg.version}`;
    const platform = `Node.js/${process.version.slice(1)} (${process.platform}; ${process.arch})`;
    return `${sdk} ${platform}`;
  }

  async #xml2json<T = any>(xml: string | Buffer) {
    if (Buffer.isBuffer(xml)) {
      xml = xml.toString();
    }
    debug('xml2json %o', xml);
    return await parseStringPromise(xml, {
      explicitRoot: false,
      explicitArray: false,
    }) as T;
  }

  async #createClientException(result: HttpClientResponse<Buffer>) {
    let err: OSSClientError;
    let requestId = result.headers['x-oss-request-id'] as string ?? '';
    let hostId = '';
    if (!result.data || !result.data.length) {
      // HEAD not exists resource
      if (result.status === 404) {
        err = new OSSClientError('NoSuchKey', 'Object not exists', requestId, hostId);
      } else if (result.status === 412) {
        err = new OSSClientError('PreconditionFailed', 'Pre condition failed', requestId, hostId);
      } else {
        err = new OSSClientError('Unknown', `Unknown error, status=${result.status}, raw error=${result}`,
          requestId, hostId);
      }
    } else {
      const xml = result.data.toString();
      debug('request response error xml: %o', xml);

      let info;
      try {
        info = await this.#xml2json(xml);
      } catch (e: any) {
        err = new OSSClientError('PreconditionFailed', `${e.message} (raw xml=${JSON.stringify(xml)})`, requestId, hostId);
        return err;
      }

      let message = info?.Message ?? `Unknown request error, status=${result.status}, raw xml=${JSON.stringify(xml)}`;
      if (info?.Condition) {
        message += ` (condition=${info.Condition})`;
      }
      if (info?.RequestId) {
        requestId = info.RequestId;
      }
      if (info?.HostId) {
        hostId = info.HostId;
      }
      err = new OSSClientError(info?.Code ?? 'Unknown', message, requestId, hostId);
    }

    debug('generate error %o', err);
    return err;
  }
}

// /**
//  * Object operations
//  */
// merge(proto, require('./common/object'));
// merge(proto, require('./object'));
// merge(proto, require('./common/image'));
// /**
//  * Bucket operations
//  */
// merge(proto, require('./common/bucket'));
// merge(proto, require('./bucket'));
// // multipart upload
// merge(proto, require('./managed-upload'));
// /**
//  * RTMP operations
//  */
// merge(proto, require('./rtmp'));

// /**
//  * common multipart-copy
//  */
// merge(proto, require('./common/multipart-copy'));
// /**
//  * Common module parallel
//  */
// merge(proto, require('./common/parallel'));
// /**
//  * Multipart operations
//  */
// merge(proto, require('./common/multipart'));
// /**
//  * ImageClient class
//  */
// Client.ImageClient = require('./image')(Client);
// /**
//  * Cluster Client class
//  */
// Client.ClusterClient = require('./cluster')(Client);

// /**
//  * STS Client class
//  */
// Client.STS = require('./sts');

