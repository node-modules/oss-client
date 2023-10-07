import { Readable, Writable } from 'node:stream';
import { createReadStream, createWriteStream } from 'node:fs';
import { strict as assert } from 'node:assert';
import querystring from 'node:querystring';
import fs from 'node:fs/promises';
import mime from 'mime';
import { isReadable, isWritable } from 'is-type-of';
import type { IncomingHttpHeaders } from 'urllib';
import type {
  ListObjectsQuery,
  RequestOptions,
  ListObjectResult,
  PutObjectOptions,
  PutObjectResult,
  UserMeta,
  DeleteObjectOptions,
  DeleteObjectResult,
  GetObjectOptions,
  GetObjectResult,
  SignatureUrlOptions,
  HeadObjectOptions,
  HeadObjectResult,
  IObjectSimple,
  GetStreamOptions,
  GetStreamResult,
  CopyObjectOptions,
  CopyAndPutMetaResult,
} from 'oss-interface';
import {
  OSSBaseClientInitOptions,
  OSSBaseClient,
} from './OSSBaseClient.js';
import {
  ACLType,
  AppendObjectOptions,
  AppendObjectResult,
  DeleteMultipleObject,
  DeleteMultipleObjectOptions,
  DeleteMultipleObjectResponse,
  DeleteMultipleObjectXML,
  DeleteObjectTaggingOptions,
  DeleteObjectTaggingResult,
  GetACLOptions,
  GetACLResult,
  GetSymlinkOptions,
  GetSymlinkResult,
  GutObjectTaggingOptions,
  GutObjectTaggingResult,
  ListV2ObjectResult,
  ListV2ObjectsQuery,
  OSSRequestParams,
  OSSResult,
  PutACLOptions,
  PutACLResult,
  PutObjectTaggingOptions,
  PutObjectTaggingResult,
  PutSymlinkOptions,
  PutSymlinkResult,
  RequestMethod,
} from './type/index.js';
import {
  checkBucketName, signatureForURL, encodeCallback, json2xml, timestamp,
  checkObjectTag, computeSignature, policyToJSONString,
} from './util/index.js';

export interface OSSObjectClientInitOptions extends OSSBaseClientInitOptions {
  bucket: string;
}

export class OSSObject extends OSSBaseClient implements IObjectSimple {
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

  /**
   * AppendObject
   * @see https://help.aliyun.com/zh/oss/developer-reference/appendobject
   */
  async append(name: string, file: string | Buffer | Readable, options?: AppendObjectOptions): Promise<AppendObjectResult> {
    const position = options?.position ?? '0';
    const result = await this.#sendPutRequest(name, {
      ...options,
      subResource: {
        append: '',
        position: `${position}`,
      },
    }, file, 'POST');
    return {
      ...result,
      nextAppendPosition: result.res.headers['x-oss-next-append-position'] as string,
    };
  }

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
    if (typeof file === 'string' || isReadable(file) || Buffer.isBuffer(file)) {
      return await this.#sendPutRequest(name, options ?? {}, file);
    }
    throw new TypeError('Must provide String/Buffer/ReadableStream for put.');
  }

  /**
   * put an object from ReadableStream.
   */
  async putStream(name: string, stream: Readable, options?: PutObjectOptions): Promise<PutObjectResult> {
    return await this.#sendPutRequest(name, options ?? {}, stream);
  }

  async putMeta(name: string, meta: UserMeta, options?: Omit<CopyObjectOptions, 'meta'>) {
    return await this.copy(name, name, {
      meta,
      ...options,
    });
  }

  /**
   * GetBucket (ListObjects)
   * @see https://help.aliyun.com/zh/oss/developer-reference/listobjects
   */
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
      prefixes: prefixes || [],
      nextMarker: data.NextMarker || null,
      isTruncated: data.IsTruncated === 'true',
    } satisfies ListObjectResult;
  }

  /**
   * ListObjectsV2（GetBucketV2）
   * @see https://help.aliyun.com/zh/oss/developer-reference/listobjectsv2
   */
  async listV2(query?: ListV2ObjectsQuery, options?: RequestOptions): Promise<ListV2ObjectResult> {
    const params = this.#objectRequestParams('GET', '', options);
    params.query = {
      'list-type': '2',
    };
    const continuationToken = query?.['continuation-token'] ?? query?.continuationToken;
    if (continuationToken) {
      // should set subResource to add sign string
      params.subResource = {
        'continuation-token': continuationToken,
      };
    }
    if (query?.prefix) {
      params.query.prefix = query.prefix;
    }
    if (query?.delimiter) {
      params.query.delimiter = query.delimiter;
    }
    if (query?.['max-keys']) {
      params.query['max-keys'] = `${query['max-keys']}`;
    }
    if (query?.['start-after']) {
      params.query['start-after'] = query['start-after'];
    }
    if (query?.['encoding-type']) {
      params.query['encoding-type'] = query['encoding-type'];
    }
    if (query?.['fetch-owner']) {
      params.query['fetch-owner'] = 'true';
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
        owner: obj.Owner ? {
          id: obj.Owner.ID,
          displayName: obj.Owner.DisplayName,
        } : undefined,
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
      prefixes: prefixes || [],
      isTruncated: data.IsTruncated === 'true',
      keyCount: parseInt(data.KeyCount),
      continuationToken: data.ContinuationToken,
      nextContinuationToken: data.NextContinuationToken,
    } satisfies ListV2ObjectResult;
  }

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

    options = this.#formatGetOptions(options);
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

  async getStream(name: string, options?: GetStreamOptions): Promise<GetStreamResult> {
    options = this.#formatGetOptions(options);
    const params = this.#objectRequestParams('GET', name, options);
    params.streaming = true;
    params.successStatuses = [ 200, 206, 304 ];
    const { res } = await this.request(params);
    return {
      stream: res,
      res,
    } satisfies GetStreamResult;
  }

  /**
   * PutObjectACL
   * @see https://help.aliyun.com/zh/oss/developer-reference/putobjectacl
   */
  async putACL(name: string, acl: ACLType, options?: PutACLOptions): Promise<PutACLResult> {
    options = options ?? {};
    if (options.subres && !options.subResource) {
      options.subResource = options.subres;
    }
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.acl = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    options.headers = options.headers ?? {};
    options.headers['x-oss-object-acl'] = acl;
    name = this.#objectName(name);
    const params = this.#objectRequestParams('PUT', name, options);
    params.successStatuses = [ 200 ];
    const { res } = await this.request(params);
    return {
      res,
    } satisfies PutACLResult;
  }

  /**
  * GetObjectACL
  * @see https://help.aliyun.com/zh/oss/developer-reference/getobjectacl
  */
  async getACL(name: string, options?: GetACLOptions): Promise<GetACLResult> {
    options = options ?? {};
    if (options.subres && !options.subResource) {
      options.subResource = options.subres;
      delete options.subres;
    }
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.acl = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    name = this.#objectName(name);

    const params = this.#objectRequestParams('GET', name, options);
    params.successStatuses = [ 200 ];
    params.xmlResponse = true;

    const { data, res } = await this.request(params);
    return {
      acl: data.AccessControlList.Grant,
      owner: {
        id: data.Owner.ID,
        displayName: data.Owner.DisplayName,
      },
      res,
    } satisfies GetACLResult;
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
   * PutSymlink
   * @see https://help.aliyun.com/zh/oss/developer-reference/putsymlink
   */
  async putSymlink(name: string, targetName: string, options: PutSymlinkOptions): Promise<PutSymlinkResult> {
    options = options ?? {};
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.symlink = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    options.headers = options.headers ?? {};
    this.#convertMetaToHeaders(options.meta, options.headers);

    targetName = this.escape(this.#objectName(targetName));
    options.headers['x-oss-symlink-target'] = targetName;
    if (options.storageClass) {
      options.headers['x-oss-storage-class'] = options.storageClass;
    }

    name = this.#objectName(name);
    const params = this.#objectRequestParams('PUT', name, options);

    params.successStatuses = [ 200 ];
    const { res } = await this.request(params);
    return {
      res,
    };
  }

  /**
   * GetSymlink
   * @see https://help.aliyun.com/zh/oss/developer-reference/getsymlink
   */
  async getSymlink(name: string, options?: GetSymlinkOptions): Promise<GetSymlinkResult> {
    options = options ?? {};
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.symlink = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    name = this.#objectName(name);
    const params = this.#objectRequestParams('GET', name, options);
    params.successStatuses = [ 200 ];
    const { res } = await this.request(params);
    const target = res.headers['x-oss-symlink-target'] as string;
    const meta: Record<string, string> = {};
    for (const k in res.headers) {
      if (k.startsWith('x-oss-meta-')) {
        const key = k.substring(11);
        meta[key] = res.headers[k] as string;
      }
    }
    return {
      targetName: decodeURIComponent(target),
      res,
      meta,
    };
  }

  /**
   * PutObjectTagging
   * @see https://help.aliyun.com/zh/oss/developer-reference/putobjecttagging
   */
  async putObjectTagging(name: string, tag: Record<string, string>, options?: PutObjectTaggingOptions): Promise<PutObjectTaggingResult> {
    checkObjectTag(tag);
    options = options ?? {};
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.tagging = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    name = this.#objectName(name);
    const params = this.#objectRequestParams('PUT', name, options);
    params.successStatuses = [ 200 ];
    const tags: { Key: string; Value: string }[] = [];
    for (const key in tag) {
      tags.push({ Key: key, Value: tag[key] });
    }

    const paramXMLObj = {
      Tagging: {
        TagSet: {
          Tag: tags,
        },
      },
    };
    params.mime = 'xml';
    params.content = Buffer.from(json2xml(paramXMLObj));

    const { res } = await this.request(params);
    return {
      res,
      status: res.status,
    };
  }

  /**
   * GetObjectTagging
   * @see https://help.aliyun.com/zh/oss/developer-reference/getobjecttagging
   */
  async getObjectTagging(name: string, options?: GutObjectTaggingOptions): Promise<GutObjectTaggingResult> {
    options = options ?? {};
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.tagging = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    name = this.#objectName(name);
    const params = this.#objectRequestParams('GET', name, options);
    params.successStatuses = [ 200 ];
    params.xmlResponse = true;
    const { res, data } = await this.request(params);
    // console.log(data.toString());
    let tags = data.TagSet?.Tag;
    if (tags && !Array.isArray(tags)) {
      tags = [ tags ];
    }
    const tag: Record<string, string> = {};
    if (tags) {
      for (const item of tags) {
        tag[item.Key] = item.Value;
      }
    }
    return {
      status: res.status,
      res,
      tag,
    };
  }

  /**
   * DeleteObjectTagging
   * @see https://help.aliyun.com/zh/oss/developer-reference/deleteobjecttagging
   */
  async deleteObjectTagging(name: string, options?: DeleteObjectTaggingOptions): Promise<DeleteObjectTaggingResult> {
    options = options ?? {};
    if (!options.subResource) {
      options.subResource = {};
    }
    options.subResource.tagging = '';
    if (options.versionId) {
      options.subResource.versionId = options.versionId;
    }
    name = this.#objectName(name);
    const params = this.#objectRequestParams('DELETE', name, options);
    params.successStatuses = [ 204 ];
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

  /**
   * Get Object url by name
   * @param name - object name
   * @param baseUrl - If provide `baseUrl`, will use `baseUrl` instead the default `endpoint and bucket`.
   * return object url include bucket
   */
  generateObjectUrl(name: string, baseUrl?: string) {
    const urlObject = new URL(baseUrl ?? this.getRequestEndpoint());
    urlObject.pathname = this.escape(this.#objectName(name));
    return urlObject.toString();
  }

  /**
   * @alias generateObjectUrl
   */
  getObjectUrl(name: string, baseUrl?: string) {
    return this.generateObjectUrl(name, baseUrl);
  }

  /**
   * @param policy specifies the validity of the fields in the request.
   *
   * return params.OSSAccessKeyId
   *  params.Signature
   *  params.policy JSON text encoded with UTF-8 and Base64.
   */
  calculatePostSignature(policy: object | string) {
    if (typeof policy !== 'object' && typeof policy !== 'string') {
      throw new TypeError('policy must be JSON string or Object');
    }
    const policyString = Buffer.from(policyToJSONString(policy), 'utf8').toString('base64');
    const Signature = computeSignature(this.options.accessKeySecret, policyString);
    return {
      OSSAccessKeyId: this.options.accessKeyId,
      Signature,
      policy: policyString,
    };
  }

  /**
   * Copy an object from sourceName to name.
   */
  async copy(name: string, sourceName: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;
  async copy(name: string, sourceName: string, sourceBucket: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;
  async copy(name: string, sourceName: string, sourceBucket?: string | CopyObjectOptions, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult> {
    if (typeof sourceBucket === 'object') {
      options = sourceBucket; // 兼容旧版本，旧版本第三个参数为options
      sourceBucket = undefined;
    }
    options = options ?? {};
    options.headers = options.headers ?? {};
    let hasMetadata = !!options.meta;
    const REPLACE_HEADERS = [
      'content-type',
      'content-encoding',
      'content-language',
      'content-disposition',
      'cache-control',
      'expires',
    ];
    for (const key in options.headers) {
      const lowerCaseKey = key.toLowerCase();
      options.headers[`x-oss-copy-source-${lowerCaseKey}`] = options.headers[key];
      if (REPLACE_HEADERS.includes(lowerCaseKey)) {
        hasMetadata = true;
      }
    }
    if (hasMetadata) {
      options.headers['x-oss-metadata-directive'] = 'REPLACE';
    }
    this.#convertMetaToHeaders(options.meta, options.headers);

    sourceName = this.#getCopySourceName(sourceName, sourceBucket);
    if (options.versionId) {
      sourceName = `${sourceName}?versionId=${options.versionId}`;
    }
    options.headers['x-oss-copy-source'] = sourceName;
    const params = this.#objectRequestParams('PUT', name, options);
    params.xmlResponse = true;
    params.successStatuses = [ 200, 304 ];
    const { data, res } = await this.request(params);
    return {
      data: data ? {
        etag: data.ETag ?? '',
        lastModified: data.LastModified ?? '',
      } : null,
      res,
    } satisfies CopyAndPutMetaResult;
  }

  /**
   * 另存为
   * @see https://help.aliyun.com/zh/oss/user-guide/sys-or-saveas
   */
  async processObjectSave(sourceObject: string, targetObject: string, process: string, targetBucket?: string) {
    targetObject = this.#objectName(targetObject);
    const params = this.#objectRequestParams('POST', sourceObject, {
      subResource: {
        'x-oss-process': '',
      },
    });

    const bucketParam = targetBucket ? `,b_${Buffer.from(targetBucket).toString('base64')}` : '';
    targetObject = Buffer.from(targetObject).toString('base64');
    const content = {
      'x-oss-process': `${process}|sys/saveas,o_${targetObject}${bucketParam}`,
    };
    params.content = Buffer.from(querystring.stringify(content));
    params.successStatuses = [ 200 ];

    const result = await this.request(params);
    return {
      res: result.res,
      status: result.res.status,
    };
  }

  /** protected methods */

  protected getRequestEndpoint(): string {
    return this.#bucketEndpoint;
  }

  /** private methods */

  #getCopySourceName(sourceName: string, bucketName?: string) {
    if (typeof bucketName === 'string') {
      sourceName = this.#objectName(sourceName);
    } else if (sourceName[0] !== '/') {
      bucketName = this.#bucket;
    } else {
      bucketName = sourceName.replace(/\/(.+?)(\/.*)/, '$1');
      sourceName = sourceName.replace(/(\/.+?\/)(.*)/, '$2');
    }
    checkBucketName(bucketName);
    sourceName = encodeURIComponent(sourceName);
    sourceName = `/${bucketName}/${sourceName}`;
    return sourceName;
  }

  async #sendPutRequest(name: string, options: PutObjectOptions & { subResource?: Record<string, string> },
    fileOrBufferOrStream: string | Buffer | Readable, method: RequestMethod = 'PUT') {
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
    const params = this.#objectRequestParams(method, name, options);
    if (typeof fileOrBufferOrStream === 'string') {
      const stats = await fs.stat(fileOrBufferOrStream);
      if (!stats.isFile()) {
        throw new TypeError(`${fileOrBufferOrStream} is not file`);
      }
      if (!options.mime) {
        const mimeFromFile = mime.getType(fileOrBufferOrStream);
        if (mimeFromFile) {
          options.mime = mimeFromFile;
        }
      }
      params.stream = createReadStream(fileOrBufferOrStream);
    } else if (Buffer.isBuffer(fileOrBufferOrStream)) {
      params.content = fileOrBufferOrStream;
    } else {
      params.stream = fileOrBufferOrStream;
    }
    params.mime = options.mime;
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

  #formatGetOptions(options?: GetObjectOptions) {
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
    return options;
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
