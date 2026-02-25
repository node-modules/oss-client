/* oxlint-disable no-named-export, no-nodejs-modules */
import { debuglog } from 'node:util';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';

import { sendToWormhole } from 'stream-wormhole';
import { parseStringPromise } from 'xml2js';
import { encodeURIComponent as safeEncodeURIComponent } from 'utility';
import mime from 'mime';
import {
  type RequestOptions,
  type HttpClientResponse,
  type IncomingHttpHeaders,
  HttpClient,
} from 'urllib';
import ms from 'ms';
import {
  authorization,
  buildCanonicalString,
  computeSignature,
} from './util/index.js';
import type {
  OSSRequestParams,
  OSSResult,
  RequestParameters,
} from './type/Request.js';
import { OSSClientError } from './error/index.js';

const debug = debuglog('oss-client:client');

export interface OSSBaseClientInitOptions {
  /** Access key you create */
  accessKeyId: string;
  /** Access secret you create */
  accessKeySecret: string;
  /**
   * Oss region domain. It takes priority over region.
   * e.g.:
   * - oss-cn-shanghai.aliyuncs.com
   * - oss-cn-shanghai-internal.aliyuncs.com
   */
  endpoint: string;
  /** The bucket data region location, please see Data Regions, default is oss-cn-hangzhou. */
  region?: string | undefined;
  /** Access OSS with aliyun internal network or not, default is false. If your servers are running on aliyun too, you can set true to save lot of money. */
  internal?: boolean | undefined;
  /** Instance level timeout for all operations, default is 60s */
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

  /** Public methods */

  /**
   * Get OSS signature
   */
  signature(stringToSign: string) {
    debug('authorization stringToSign: %s', stringToSign);
    return computeSignature(this.options.accessKeySecret, stringToSign);
  }

  /** Protected methods */

  /**
   * Get author header
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
  protected authorization(
    method: string,
    resource: string,
    headers: IncomingHttpHeaders,
    subResource?: RequestParameters
  ) {
    const stringToSign = buildCanonicalString(method.toUpperCase(), resource, {
      headers,
      parameters: subResource,
    });
    debug('stringToSign: %o', stringToSign);
    const auth = authorization(
      this.options.accessKeyId,
      this.options.accessKeySecret,
      stringToSign
    );
    debug('authorization: %o', auth);
    return auth;
  }

  /**
   * EncodeURIComponent name except '/'
   */
  // oxlint-disable-next-line class-methods-use-this
  protected escape(name: string) {
    return safeEncodeURIComponent(name).replaceAll('%2F', '/');
  }

  protected abstract getRequestEndpoint(): string;

  // oxlint-disable-next-line max-statements
  protected getRequestURL(
    params: Pick<OSSRequestParams, 'object' | 'query' | 'subResource'>
  ) {
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
        for (const k of params.subResource) {
          subresAsQuery[k] = '';
        }
      } else {
        subresAsQuery = params.subResource;
      }
      for (const key in subresAsQuery) {
        urlObject.searchParams.set(key, `${subresAsQuery[key]}`);
      }
    }
    return urlObject.toString();
  }

  // oxlint-disable-next-line class-methods-use-this
  getResource(params: { bucket?: string; object?: string }) {
    let resource = '/';
    if (params.bucket) resource += `${params.bucket}/`;
    if (params.object) resource += params.object;
    return resource;
  }

  // oxlint-disable-next-line max-statements
  createHttpClientRequestParams(params: OSSRequestParams) {
    const headers: IncomingHttpHeaders = {
      ...params.headers,
      // https://help.aliyun.com/zh/oss/developer-reference/include-signatures-in-the-authorization-header
      // 此次操作的时间，Date必须为GMT格式，且不能为空。该值取自请求头的Date字段或者x-oss-date字段。当这两个字段同时存在时，以x-oss-date为准。
      // E.g.: Sun, 22 Nov 2015 08:16:38 GMT
      'x-oss-date': new Date().toUTCString(),
      'user-agent': this.#userAgent,
    };
    if (this.options.isRequestPay) {
      headers['x-oss-request-payer'] = 'requester';
    }
    if (!headers['content-type']) {
      let contentType: string | null = null;
      if (params.mime) {
        contentType = params.mime.includes('/')
          ? params.mime
          : mime.getType(params.mime);
      } else if (params.object) {
        contentType = mime.getType(extname(params.object));
      }
      if (contentType) {
        headers['content-type'] = contentType;
      }
    }
    if (params.content) {
      if (!params.disabledMD5 && !headers['content-md5']) {
        headers['content-md5'] = createHash('md5')
          .update(Buffer.from(params.content))
          .digest('base64');
      }
      if (!headers['content-length']) {
        headers['content-length'] = `${params.content.length}`;
      }
    }
    const authResource = this.getResource(params);
    headers.authorization = this.authorization(
      params.method,
      authResource,
      headers,
      params.subResource
    );
    const url = this.getRequestURL(params);
    debug(
      'request %s %s, with headers %j, !!stream: %s',
      params.method,
      url,
      headers,
      Boolean(params.stream)
    );
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
   * Request oss server
   */
  // oxlint-disable-next-line max-statements, no-explicit-any
  protected async request<T = any>(
    params: OSSRequestParams
  ): Promise<OSSResult<T>> {
    const { url, options } = this.createHttpClientRequestParams(params);
    const result = await this.#httpClient.request<Buffer>(url, options);
    debug(
      'response %s %s, got %s, headers: %j',
      params.method,
      url,
      result.status,
      result.headers
    );
    if (!params.successStatuses?.includes(result.status)) {
      const err = await this.#createClientException(result);
      if (params.streaming && result.res) {
        // Consume the response stream
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

  /** Private methods */

  // oxlint-disable-next-line class-methods-use-this
  #initOptions(options: OSSBaseClientInitOptions) {
    assert.ok(
      options.accessKeyId && options.accessKeySecret,
      'require accessKeyId and accessKeySecret'
    );
    assert.ok(options.endpoint, 'require endpoint');
    let timeout = 60_000;
    if (options.timeout) {
      timeout =
        typeof options.timeout === 'string'
          ? ms(options.timeout)
          : options.timeout;
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
   *   oss-client/2.0.0 Node.js/5.3.0 (darwin; arm64)
   */
  // oxlint-disable-next-line class-methods-use-this
  #getUserAgent() {
    // Read version from package.json in the future
    const sdk = 'oss-client/2.0.0';
    const platform = `Node.js/${process.version.slice(1)} (${process.platform}; ${process.arch})`;
    return `${sdk} ${platform}`;
  }

  // oxlint-disable-next-line class-methods-use-this, no-explicit-any
  async #xml2json<T = any>(xml: string | Buffer) {
    const _xml = Buffer.isBuffer(xml) ? xml.toString() : xml;
    debug('xml2json %o', _xml);
    return (await parseStringPromise(_xml, {
      explicitRoot: false,
      explicitArray: false,
    })) as T;
  }

  // oxlint-disable-next-line max-statements, complexity
  async #createClientException(result: HttpClientResponse<Buffer>) {
    let err: OSSClientError;
    let requestId = (result.headers['x-oss-request-id'] as string) ?? '';
    let hostId = '';
    const status = result.status;
    if (!result.data || result.data.length === 0) {
      // HEAD not exists resource
      if (status === 404) {
        err = new OSSClientError(
          status,
          'NoSuchKey',
          'Object not exists',
          requestId,
          hostId
        );
      } else if (status === 412) {
        err = new OSSClientError(
          status,
          'PreconditionFailed',
          'Pre condition failed',
          requestId,
          hostId
        );
      } else {
        err = new OSSClientError(
          status,
          'Unknown',
          `Unknown error, status=${status}, raw error=${result}`,
          requestId,
          hostId
        );
      }
    } else {
      const xml = result.data.toString();
      debug('request response error xml: %o', xml);

      let info;
      try {
        info = await this.#xml2json(xml);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        err = new OSSClientError(
          status,
          'PreconditionFailed',
          `${message} (raw xml=${JSON.stringify(xml)})`,
          requestId,
          hostId
        );
        return err;
      }

      let message =
        info?.Message ??
        `Unknown request error, status=${result.status}, raw xml=${JSON.stringify(xml)}`;
      if (info?.Condition) {
        message += ` (condition=${info.Condition})`;
      }
      if (info?.RequestId) {
        requestId = info.RequestId;
      }
      if (info?.HostId) {
        hostId = info.HostId;
      }
      err = new OSSClientError(
        status,
        info?.Code ?? 'Unknown',
        message,
        requestId,
        hostId
      );

      // https://help.aliyun.com/zh/oss/support/http-status-code-409#section-rmc-hvd-j38
      if (
        info?.Code === 'PositionNotEqualToLength' &&
        result.headers['x-oss-next-append-position']
      ) {
        err.nextAppendPosition = result.headers[
          'x-oss-next-append-position'
        ] as string;
      }
    }

    debug('generate error %o', err);
    return err;
  }
}

// /**
//  * Object operations
//  */
// Merge(proto, require('./common/object'));
// Merge(proto, require('./object'));
// Merge(proto, require('./common/image'));
// /**
//  * Bucket operations
//  */
// Merge(proto, require('./common/bucket'));
// Merge(proto, require('./bucket'));
// // multipart upload
// Merge(proto, require('./managed-upload'));
// /**
//  * RTMP operations
//  */
// Merge(proto, require('./rtmp'));

// /**
//  * Common multipart-copy
//  */
// Merge(proto, require('./common/multipart-copy'));
// /**
//  * Common module parallel
//  */
// Merge(proto, require('./common/parallel'));
// /**
//  * Multipart operations
//  */
// Merge(proto, require('./common/multipart'));
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
