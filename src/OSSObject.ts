import { Readable } from 'node:stream';
import type {
  // IObjectSimple,
  // GetObjectOptions,
  ListObjectsQuery,
  RequestOptions,
  ListObjectResult,
  PutObjectOptions,
  PutObjectResult,
  // NormalSuccessResponse,
  // HeadObjectOptions,
  // HeadObjectResult,
  // GetObjectResult,
  // GetStreamOptions,
  // GetStreamResult,
  // CopyObjectOptions,
  // CopyAndPutMetaResult,
  // StorageType,
  // OwnerType,
  // UserMeta,
  // ObjectCallback,
} from 'oss-interface';
import {
  OSSBaseClientInitOptions,
  OSSBaseClient,
} from './OSSBaseClient.js';
import {
  OSSRequestParams,
  // RequestHeaders, RequestMeta,
  RequestMethod } from './type/index.js';
import { checkBucketName } from './util/index.js';

export interface OSSObjectClientInitOptions extends OSSBaseClientInitOptions {
  bucket: string;
}

export class OSSObject extends OSSBaseClient {
// export class OSSObject extends OSSBaseClient implements IObjectSimple {
  #bucket: string;
  #bucketEndpoint: string;

  constructor(options: OSSObjectClientInitOptions) {
    checkBucketName(options.bucket);
    super(options);
    this.#bucket = options.bucket;
    const urlObject = new URL(this.options.endpoint);
    urlObject.hostname = `${this.#bucket}.${urlObject.hostname}`;
    this.#bucketEndpoint = urlObject.toString();
  }

  // /**
  //  * append an object from String(file path)/Buffer/ReadableStream
  //  * @param {String} name the object key
  //  * @param {Mixed} file String(file path)/Buffer/ReadableStream
  //  * @param {Object} options options
  //  * @return {Object} result
  //  */
  // proto.append = async function append(name, file, options) {
  //   options = options || {};
  //   if (options.position === undefined) options.position = '0';
  //   options.subres = {
  //     append: '',
  //     position: options.position,
  //   };
  //   options.method = 'POST';

  //   const result = await this.put(name, file, options);
  //   result.nextAppendPosition = result.res.headers['x-oss-next-append-position'];
  //   return result;
  // };

  /**
   * put an object from String(file path)/Buffer/Readable
   * @param {String} name the object key
   * @param {Mixed} file String(file path)/Buffer/Readable
   * @param {Object} options options
   *        {Object} options.callback The callback parameter is composed of a JSON string encoded in Base64
   *        {String} options.callback.url  the OSS sends a callback request to this URL
   *        {String} options.callback.host  The host header value for initiating callback requests
   *        {String} options.callback.body  The value of the request body when a callback is initiated
   *        {String} options.callback.contentType  The Content-Type of the callback requests initiated
   *        {Object} options.callback.customValue  Custom parameters are a map of key-values, e.g:
   *                  customValue = {
   *                    key1: 'value1',
   *                    key2: 'value2'
   *                  }
   * @return {Object} result
   */
  async put(name: string, file: string | Buffer | Readable, options?: PutObjectOptions): Promise<PutObjectResult> {
    let content;
    name = this.#objectName(name);
    options = options || {};
    if (Buffer.isBuffer(file)) {
      content = file;
    } else if (typeof file === 'string') {
      const stats = fs.statSync(file);
      if (!stats.isFile()) {
        throw new Error(`${file} is not file`);
      }
      options.mime = options.mime || mime.getType(path.extname(file));
      options.contentLength = await this._getFileSize(file);
      const getStream = () => fs.createReadStream(file);
      const putStreamStb = (objectName, makeStream, configOption) => {
        return this.putStream(objectName, makeStream(), configOption);
      };
      return await retry(putStreamStb, this.options.retryMax, {
        errorHandler: err => {
          const _errHandle = _err => {
            const statusErr = [ -1, -2 ].includes(_err.status);
            const requestErrorRetryHandle = this.options.requestErrorRetryHandle || (() => true);
            return statusErr && requestErrorRetryHandle(_err);
          };
          if (_errHandle(err)) return true;
          return false;
        },
      })(name, getStream, options);
    } else if (isReadable(file)) {
      return await this.putStream(name, file, options);
    } else {
      throw new TypeError('Must provide String/Buffer/ReadableStream for put.');
    }

    options.headers = options.headers || {};
    this._convertMetaToHeaders(options.meta, options.headers);

    const method = options.method || 'PUT';
    const params = this._objectRequestParams(method, name, options);

    callback.encodeCallback(params, options);

    params.mime = options.mime;
    params.content = content;
    params.successStatuses = [ 200 ];

    const result = await this.request(params);

    const ret = {
      name,
      url: this._objectUrl(name),
      res: result.res,
    };

    if (params.headers && params.headers['x-oss-callback']) {
      ret.data = JSON.parse(result.data.toString());
    }

    return ret;
  }

  // /**
  //  * put an object from ReadableStream.
  //  * @param {String} name the object key
  //  * @param {Readable} stream the ReadableStream
  //  * @param {Object} options options
  //  * @return {Object} result
  //  */
  // proto.putStream = async function putStream(name, stream, options) {
  //   options = options || {};
  //   options.headers = options.headers || {};
  //   name = this._objectName(name);
  //   this._convertMetaToHeaders(options.meta, options.headers);

  //   const method = options.method || 'PUT';
  //   const params = this._objectRequestParams(method, name, options);
  //   callback.encodeCallback(params, options);
  //   params.mime = options.mime;
  //   params.stream = stream;
  //   params.successStatuses = [ 200 ];

  //   const result = await this.request(params);
  //   const ret = {
  //     name,
  //     url: this._objectUrl(name),
  //     res: result.res,
  //   };

  //   if (params.headers && params.headers['x-oss-callback']) {
  //     ret.data = JSON.parse(result.data.toString());
  //   }

  //   return ret;
  // };

  // proto.getStream = async function getStream(name, options) {
  //   options = options || {};

  //   if (options.process) {
  //     options.subres = options.subres || {};
  //     options.subres['x-oss-process'] = options.process;
  //   }

  //   const params = this._objectRequestParams('GET', name, options);
  //   params.customResponse = true;
  //   params.successStatuses = [ 200, 206, 304 ];

  //   const result = await this.request(params);

  //   return {
  //     stream: result.res,
  //     res: {
  //       status: result.status,
  //       headers: result.headers,
  //     },
  //   };
  // };

  // proto.putMeta = async function putMeta(name, meta, options) {
  //   return await this.copy(name, name, {
  //     meta: meta || {},
  //     timeout: options && options.timeout,
  //     ctx: options && options.ctx,
  //   });
  // };

  async list(query?: ListObjectsQuery, options?: RequestOptions): Promise<ListObjectResult> {
    // prefix, marker, max-keys, delimiter
    const params = this.#objectRequestParams('GET', '', options);
    if (query) {
      params.query = query;
    }
    params.xmlResponse = true;
    params.successStatuses = [ 200 ];

    const { data, res } = await this.request(params);
    let objects = data.Contents || [];
    if (objects) {
      if (!Array.isArray(objects)) {
        objects = [ objects ];
      }
      objects = objects.map((obj: any) => ({
        name: obj.Key,
        url: this.#objectUrl(obj.Key),
        lastModified: obj.LastModified,
        etag: obj.ETag,
        type: obj.Type,
        size: Number(obj.Size),
        storageClass: obj.StorageClass,
        owner: {
          id: obj.Owner.ID,
          displayName: obj.Owner.DisplayName,
        },
      }));
    }
    let prefixes = data.CommonPrefixes || null;
    if (prefixes) {
      if (!Array.isArray(prefixes)) {
        prefixes = [ prefixes ];
      }
      prefixes = prefixes.map((item: any) => item.Prefix);
    }
    return {
      res,
      objects,
      prefixes,
      nextMarker: data.NextMarker || null,
      isTruncated: data.IsTruncated === 'true',
    };
  }

  // proto.listV2 = async function listV2(query = {}, options = {}) {
  //   const continuation_token = query['continuation-token'] || query.continuationToken;
  //   delete query['continuation-token'];
  //   delete query.continuationToken;
  //   if (continuation_token) {
  //     options.subres = Object.assign(
  //       {
  //         'continuation-token': continuation_token,
  //       },
  //       options.subres
  //     );
  //   }
  //   const params = this._objectRequestParams('GET', '', options);
  //   params.query = Object.assign({ 'list-type': 2 }, query);
  //   delete params.query['continuation-token'];
  //   delete query.continuationToken;
  //   params.xmlResponse = true;
  //   params.successStatuses = [ 200 ];

  //   const result = await this.request(params);
  //   let objects = result.data.Contents || [];
  //   const that = this;
  //   if (objects) {
  //     if (!Array.isArray(objects)) {
  //       objects = [ objects ];
  //     }
  //     objects = objects.map(obj => ({
  //       name: obj.Key,
  //       url: that._objectUrl(obj.Key),
  //       lastModified: obj.LastModified,
  //       etag: obj.ETag,
  //       type: obj.Type,
  //       size: Number(obj.Size),
  //       storageClass: obj.StorageClass,
  //       owner: obj.Owner
  //         ? {
  //           id: obj.Owner.ID,
  //           displayName: obj.Owner.DisplayName,
  //         }
  //         : null,
  //     }));
  //   }
  //   let prefixes = result.data.CommonPrefixes || null;
  //   if (prefixes) {
  //     if (!Array.isArray(prefixes)) {
  //       prefixes = [ prefixes ];
  //     }
  //     prefixes = prefixes.map(item => item.Prefix);
  //   }
  //   return {
  //     res: result.res,
  //     objects,
  //     prefixes,
  //     isTruncated: result.data.IsTruncated === 'true',
  //     keyCount: +result.data.KeyCount,
  //     continuationToken: result.data.ContinuationToken || null,
  //     nextContinuationToken: result.data.NextContinuationToken || null,
  //   };
  // };

  // /**
  //  * Restore Object
  //  * @param {String} name the object key
  //  * @param {Object} options {type : Archive or ColdArchive}
  //  * @return {{res}} result
  //  */
  // proto.restore = async function restore(name, options = { type: 'Archive' }) {
  //   options = options || {};
  //   options.subres = Object.assign({ restore: '' }, options.subres);
  //   if (options.versionId) {
  //     options.subres.versionId = options.versionId;
  //   }
  //   const params = this._objectRequestParams('POST', name, options);
  //   if (options.type === 'ColdArchive') {
  //     const paramsXMLObj = {
  //       RestoreRequest: {
  //         Days: options.Days ? options.Days : 2,
  //         JobParameters: {
  //           Tier: options.JobParameters ? options.JobParameters : 'Standard',
  //         },
  //       },
  //     };
  //     params.content = obj2xml(paramsXMLObj, {
  //       headers: true,
  //     });
  //     params.mime = 'xml';
  //   }
  //   params.successStatuses = [ 202 ];

  //   const result = await this.request(params);

  //   return {
  //     res: result.res,
  //   };
  // };

  protected getRequestEndpoint(): string {
    return this.#bucketEndpoint;
  }

  #objectUrl(name: string) {
    return this.getRequestURL({ object: name });
  }

  /**
   * generator request params
   */
  #objectRequestParams(method: RequestMethod, name: string,
    options?: Pick<OSSRequestParams, 'headers' | 'subres' | 'timeout'>) {
    name = this.#objectName(name);
    const params: OSSRequestParams = {
      object: name,
      bucket: this.#bucket,
      method,
      headers: options?.headers,
      subres: options?.subres,
      timeout: options?.timeout,
    };
    return params;
  }

  #objectName(name: string) {
    return name.replace(/^\/+/, '');
  }

  // #convertMetaToHeaders(meta: RequestMeta, headers: RequestHeaders) {
  //   if (!meta) {
  //     return;
  //   }

  //   for (const key in meta) {
  //     headers[`x-oss-meta-${key}`] = meta[key];
  //   }
  // }
}
