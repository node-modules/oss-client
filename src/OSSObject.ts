import { Readable, Writable } from 'node:stream';
import { createReadStream, createWriteStream } from 'node:fs';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import mime from 'mime';
import { isReadable, isWritable } from 'is-type-of';
import type { IncomingHttpHeaders } from 'urllib';
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
  UserMeta,
  DeleteObjectOptions,
  DeleteObjectResult,
  GetObjectOptions,
  GetObjectResult,
  // ObjectCallback,
  SignatureUrlOptions,
  HeadObjectOptions,
  HeadObjectResult,
} from 'oss-interface';
import {
  OSSBaseClientInitOptions,
  OSSBaseClient,
} from './OSSBaseClient.js';
import {
  DeleteMultipleObject,
  DeleteMultipleObjectOptions,
  DeleteMultipleObjectResponse,
  DeleteMultipleObjectXML,
  OSSRequestParams,
  OSSResult,
  RequestMethod,
} from './type/index.js';
import {
  checkBucketName, signatureForURL, encodeCallback, json2xml, timestamp,
} from './util/index.js';

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

  /** public methods */

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
    name = this.#objectName(name);
    options = options ?? {};
    if (typeof file === 'string') {
      const stats = await fs.stat(file);
      if (!stats.isFile()) {
        throw new Error(`${file} is not file`);
      }
      if (!options.mime) {
        const mimeFromFile = mime.getType(file);
        if (mimeFromFile) {
          options.mime = mimeFromFile;
        }
      }
      // options.contentLength = stats.size;
      return await this.putStream(name, createReadStream(file), options);
    } else if (isReadable(file)) {
      return await this.putStream(name, file, options);
    } else if (Buffer.isBuffer(file)) {
      // file is Buffer
      return await this.#sendPutRequest(name, options, file);
    }

    throw new TypeError('Must provide String/Buffer/ReadableStream for put.');
  }

  /**
   * put an object from ReadableStream.
   */
  async putStream(name: string, stream: Readable, options?: PutObjectOptions): Promise<PutObjectResult> {
    return await this.#sendPutRequest(name, options ?? {}, stream);
  }

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

  /**
   * GetObject
   * @see https://help.aliyun.com/zh/oss/developer-reference/getobject
   */
  async get(name: string, options?: GetObjectOptions): Promise<GetObjectResult>;
  async get(name: string, file: string | Writable, options?: GetObjectOptions): Promise<GetObjectResult>;
  async get(name: string, file?: string | Writable | GetObjectOptions, options?: GetObjectOptions): Promise<GetObjectResult> {
    let writeStream: Writable | undefined;
    let needDestroy = false;

    if (isWritable(file)) {
      writeStream = file;
    } else if (typeof file === 'string') {
      writeStream = createWriteStream(file);
      needDestroy = true;
    } else {
      // get(name, options)
      options = file;
    }

    options = options ?? {};
    // 兼容老的 subres 参数
    if (options.subres && !options.subResource) {
      options.subResource = options.subres;
    }
    if (!options.subResource) {
      options.subResource = {};
    }

    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    if (options.process) {
      options.subResource['x-oss-process'] = options.process;
    }

    let result: OSSResult<Buffer>;
    try {
      const params = this.#objectRequestParams('GET', name, options);
      params.writeStream = writeStream;
      params.successStatuses = [ 200, 206, 304 ];

      result = await this.request<Buffer>(params);
      if (needDestroy && writeStream) {
        writeStream.destroy();
      }
    } catch (err) {
      if (needDestroy && writeStream) {
        writeStream.destroy();
        // should delete the exists file before throw error
        await fs.rm(file as string, { force: true });
      }
      throw err;
    }

    return {
      res: result.res,
      content: result.data,
    };
  }

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

  /**
   * DeleteObject
   * @see https://help.aliyun.com/zh/oss/developer-reference/deleteobject
   */
  async delete(name: string, options?: DeleteObjectOptions): Promise<DeleteObjectResult> {
    const requestOptions = {
      timeout: options?.timeout,
      subResource: {} as Record<string, string>,
    };
    if (options?.versionId) {
      requestOptions.subResource.versionId = options.versionId;
    }
    const params = this.#objectRequestParams('DELETE', name, requestOptions);
    params.successStatuses = [ 204 ];
    const { res } = await this.request(params);
    return {
      res,
      status: res.status,
      headers: res.headers,
      size: res.size,
      rt: res.rt,
    };
  }

  /**
   * DeleteMultipleObjects
   * @see https://help.aliyun.com/zh/oss/developer-reference/deletemultipleobjects
   */
  async deleteMulti(namesOrObjects: string[] | DeleteMultipleObject[], options?: DeleteMultipleObjectOptions): Promise<DeleteMultipleObjectResponse> {
    const objects: DeleteMultipleObjectXML[] = [];
    assert(namesOrObjects.length > 0, 'namesOrObjects is empty');
    for (const nameOrObject of namesOrObjects) {
      if (typeof nameOrObject === 'string') {
        objects.push({ Key: this.#objectName(nameOrObject) });
      } else {
        assert(nameOrObject.key, 'key is empty');
        objects.push({ Key: this.#objectName(nameOrObject.key), VersionId: nameOrObject.versionId });
      }
    }

    const xml = json2xml({
      Delete: {
        Quiet: !!options?.quiet,
        Object: objects,
      },
    }, { headers: true });

    const requestOptions = {
      timeout: options?.timeout,
      // ?delete
      subResource: { delete: '' } as Record<string, string>,
    };
    if (options?.versionId) {
      requestOptions.subResource.versionId = options.versionId;
    }

    const params = this.#objectRequestParams('POST', '', requestOptions);
    params.mime = 'xml';
    params.content = Buffer.from(xml, 'utf-8');
    params.xmlResponse = true;
    params.successStatuses = [ 200 ];
    const { data, res } = await this.request(params);
    // quiet will return null
    let deleted = data?.Deleted || [];
    if (deleted) {
      if (!Array.isArray(deleted)) {
        deleted = [ deleted ];
      }
    }
    return {
      res,
      deleted,
    } satisfies DeleteMultipleObjectResponse;
  }

  /**
   * HeadObject
   * @see https://help.aliyun.com/zh/oss/developer-reference/headobject
   */
  async head(name: string, options?: HeadObjectOptions): Promise<HeadObjectResult> {
    options = options ?? {};
    if (options.subres && !options.subResource) {
      options.subResource = options.subres;
    }
    if (options.versionId) {
      if (!options.subResource) {
        options.subResource = {};
      }
      options.subResource.versionId = options.versionId;
    }
    const params = this.#objectRequestParams('HEAD', name, options);
    params.successStatuses = [ 200, 304 ];
    const { res } = await this.request(params);
    const meta: UserMeta = {};
    const result = {
      meta,
      res,
      status: res.status,
    } satisfies HeadObjectResult;
    for (const k in res.headers) {
      if (k.startsWith('x-oss-meta-')) {
        const key = k.substring(11);
        meta[key] = res.headers[k] as string;
      }
    }
    return result;
  }

  /**
   * GetObjectMeta
   * @see https://help.aliyun.com/zh/oss/developer-reference/getobjectmeta
   */
  async getObjectMeta(name: string, options?: HeadObjectOptions) {
    options = options ?? {};
    name = this.#objectName(name);
    if (options.subres && !options.subResource) {
      options.subResource = options.subres;
    }
    if (!options.subResource) {
      options.subResource = {};
    }
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    options.subResource.objectMeta = '';
    const params = this.#objectRequestParams('HEAD', name, options);
    params.successStatuses = [ 200 ];
    const { res } = await this.request(params);
    return {
      status: res.status,
      res,
    };
  }

  /**
   * signatureUrl URL签名
   * @see https://help.aliyun.com/zh/oss/developer-reference/signed-urls
   */
  signatureUrl(name: string, options?: SignatureUrlOptions) {
    options = options ?? {};
    name = this.#objectName(name);
    options.method = options.method ?? 'GET';
    const expires = options.expires ?? 1800;
    const expiresTimestamp = timestamp() + expires;
    const params = {
      bucket: this.#bucket,
      object: name,
    };
    const resource = this.getResource(params);
    const signRes = signatureForURL(this.options.accessKeySecret, options, resource, expiresTimestamp);

    const url = this.getRequestURL({
      object: name,
      subResource: {
        OSSAccessKeyId: this.options.accessKeyId,
        Expires: expiresTimestamp,
        Signature: signRes.Signature,
        ...signRes.subResource,
      },
    });
    return url;
  }

  async asyncSignatureUrl(name: string, options?: SignatureUrlOptions) {
    return this.signatureUrl(name, options);
  }

  /** protected methods */

  protected getRequestEndpoint(): string {
    return this.#bucketEndpoint;
  }

  /** private methods */

  async #sendPutRequest(name: string, options: PutObjectOptions, contentOrStream: Buffer | Readable) {
    options.headers = options.headers ?? {};
    if (options.headers['Content-Type'] && !options.headers['content-type']) {
      options.headers['content-type'] = options.headers['Content-Type'] as string;
      delete options.headers['Content-Type'];
    }
    name = this.#objectName(name);
    this.#convertMetaToHeaders(options.meta, options.headers);
    // don't override exists headers
    if (options.callback && !options.headers['x-oss-callback']) {
      const callbackOptions = encodeCallback(options.callback);
      options.headers['x-oss-callback'] = callbackOptions.callback;
      if (callbackOptions.callbackVar) {
        options.headers['x-oss-callback-var'] = callbackOptions.callbackVar;
      }
    }
    const params = this.#objectRequestParams('PUT', name, options);
    params.mime = options.mime;
    if (Buffer.isBuffer(contentOrStream)) {
      params.content = contentOrStream;
    } else {
      params.stream = contentOrStream;
    }
    params.successStatuses = [ 200 ];

    const { res, data } = await this.request<Buffer>(params);
    const putResult = {
      name,
      url: this.#objectUrl(name),
      res,
      data: {},
    } satisfies PutObjectResult;

    if (params.headers?.['x-oss-callback']) {
      putResult.data = JSON.parse(data.toString());
    }

    return putResult;
  }

  #objectUrl(name: string) {
    return this.getRequestURL({ object: name });
  }

  /**
   * generator request params
   */
  #objectRequestParams(method: RequestMethod, name: string,
    options?: Pick<OSSRequestParams, 'headers' | 'subResource' | 'timeout'>) {
    name = this.#objectName(name);
    const params: OSSRequestParams = {
      object: name,
      bucket: this.#bucket,
      method,
      headers: options?.headers,
      subResource: options?.subResource,
      timeout: options?.timeout,
    };
    return params;
  }

  #objectName(name: string) {
    return name.replace(/^\/+/, '');
  }

  #convertMetaToHeaders(meta: UserMeta | undefined, headers: IncomingHttpHeaders) {
    if (!meta) {
      return;
    }
    for (const key in meta) {
      headers[`x-oss-meta-${key}`] = `${meta[key]}`;
    }
  }
}
