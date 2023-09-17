const fs = require('fs');
const { stat } = require('fs/promises');
const is = require('is-type-of');
const copy = require('copy-to');
const path = require('path');
const mime = require('mime');
const callback = require('./common/callback');
const { retry } = require('./common/utils/retry');
const { obj2xml } = require('./common/utils/obj2xml');

const proto = exports;

/**
 * Object operations
 */

/**
 * append an object from String(file path)/Buffer/ReadableStream
 * @param {String} name the object key
 * @param {Mixed} file String(file path)/Buffer/ReadableStream
 * @param {Object} options options
 * @return {Object} result
 */
proto.append = async function append(name, file, options) {
  options = options || {};
  if (options.position === undefined) options.position = '0';
  options.subres = {
    append: '',
    position: options.position,
  };
  options.method = 'POST';

  const result = await this.put(name, file, options);
  result.nextAppendPosition = result.res.headers['x-oss-next-append-position'];
  return result;
};

/**
 * put an object from String(file path)/Buffer/ReadableStream
 * @param {String} name the object key
 * @param {Mixed} file String(file path)/Buffer/ReadableStream
 * @param {Object} options options
 *        {Object} options.callback The callback parameter is composed of a JSON string encoded in Base64
 *        {String} options.callback.url  the OSS sends a callback request to this URL
 *        {String} options.callback.host  The host header value for initiating callback requests
 *        {String} options.callback.body  The value of the request body when a callback is initiated
 *        {String} options.callback.contentType  The Content-Type of the callback requests initiatiated
 *        {Object} options.callback.customValue  Custom parameters are a map of key-values, e.g:
 *                  customValue = {
 *                    key1: 'value1',
 *                    key2: 'value2'
 *                  }
 * @return {Object} result
 */
proto.put = async function put(name, file, options) {
  let content;
  options = options || {};
  name = this._objectName(name);

  if (Buffer.isBuffer(file)) {
    content = file;
  } else if (is.string(file)) {
    const stats = await stat(file);
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
  } else if (is.readableStream(file)) {
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
};

/**
 * put an object from ReadableStream.
 * @param {String} name the object key
 * @param {Readable} stream the ReadableStream
 * @param {Object} options options
 * @return {Object} result
 */
proto.putStream = async function putStream(name, stream, options) {
  options = options || {};
  options.headers = options.headers || {};
  name = this._objectName(name);
  this._convertMetaToHeaders(options.meta, options.headers);

  const method = options.method || 'PUT';
  const params = this._objectRequestParams(method, name, options);
  callback.encodeCallback(params, options);
  params.mime = options.mime;
  params.stream = stream;
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
};

proto.getStream = async function getStream(name, options) {
  options = options || {};

  if (options.process) {
    options.subres = options.subres || {};
    options.subres['x-oss-process'] = options.process;
  }

  const params = this._objectRequestParams('GET', name, options);
  params.customResponse = true;
  params.successStatuses = [ 200, 206, 304 ];

  const result = await this.request(params);

  return {
    stream: result.res,
    res: {
      status: result.status,
      headers: result.headers,
    },
  };
};

proto.putMeta = async function putMeta(name, meta, options) {
  return await this.copy(name, name, {
    meta: meta || {},
    timeout: options && options.timeout,
    ctx: options && options.ctx,
  });
};

proto.list = async function list(query, options) {
  // prefix, marker, max-keys, delimiter

  const params = this._objectRequestParams('GET', '', options);
  params.query = query;
  params.xmlResponse = true;
  params.successStatuses = [ 200 ];

  const result = await this.request(params);
  let objects = result.data.Contents || [];
  const that = this;
  if (objects) {
    if (!Array.isArray(objects)) {
      objects = [ objects ];
    }
    objects = objects.map(obj => ({
      name: obj.Key,
      url: that._objectUrl(obj.Key),
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
  let prefixes = result.data.CommonPrefixes || null;
  if (prefixes) {
    if (!Array.isArray(prefixes)) {
      prefixes = [ prefixes ];
    }
    prefixes = prefixes.map(item => item.Prefix);
  }
  return {
    res: result.res,
    objects,
    prefixes,
    nextMarker: result.data.NextMarker || null,
    isTruncated: result.data.IsTruncated === 'true',
  };
};

proto.listV2 = async function listV2(query = {}, options = {}) {
  const continuation_token = query['continuation-token'] || query.continuationToken;
  delete query['continuation-token'];
  delete query.continuationToken;
  if (continuation_token) {
    options.subres = Object.assign(
      {
        'continuation-token': continuation_token,
      },
      options.subres
    );
  }
  const params = this._objectRequestParams('GET', '', options);
  params.query = Object.assign({ 'list-type': 2 }, query);
  delete params.query['continuation-token'];
  delete query.continuationToken;
  params.xmlResponse = true;
  params.successStatuses = [ 200 ];

  const result = await this.request(params);
  let objects = result.data.Contents || [];
  const that = this;
  if (objects) {
    if (!Array.isArray(objects)) {
      objects = [ objects ];
    }
    objects = objects.map(obj => ({
      name: obj.Key,
      url: that._objectUrl(obj.Key),
      lastModified: obj.LastModified,
      etag: obj.ETag,
      type: obj.Type,
      size: Number(obj.Size),
      storageClass: obj.StorageClass,
      owner: obj.Owner
        ? {
          id: obj.Owner.ID,
          displayName: obj.Owner.DisplayName,
        }
        : null,
    }));
  }
  let prefixes = result.data.CommonPrefixes || null;
  if (prefixes) {
    if (!Array.isArray(prefixes)) {
      prefixes = [ prefixes ];
    }
    prefixes = prefixes.map(item => item.Prefix);
  }
  return {
    res: result.res,
    objects,
    prefixes,
    isTruncated: result.data.IsTruncated === 'true',
    keyCount: +result.data.KeyCount,
    continuationToken: result.data.ContinuationToken || null,
    nextContinuationToken: result.data.NextContinuationToken || null,
  };
};

/**
 * Restore Object
 * @param {String} name the object key
 * @param {Object} options {type : Archive or ColdArchive}
 * @return {{res}} result
 */
proto.restore = async function restore(name, options = { type: 'Archive' }) {
  options = options || {};
  options.subres = Object.assign({ restore: '' }, options.subres);
  if (options.versionId) {
    options.subres.versionId = options.versionId;
  }
  const params = this._objectRequestParams('POST', name, options);
  if (options.type === 'ColdArchive') {
    const paramsXMLObj = {
      RestoreRequest: {
        Days: options.Days ? options.Days : 2,
        JobParameters: {
          Tier: options.JobParameters ? options.JobParameters : 'Standard',
        },
      },
    };
    params.content = obj2xml(paramsXMLObj, {
      headers: true,
    });
    params.mime = 'xml';
  }
  params.successStatuses = [ 202 ];

  const result = await this.request(params);

  return {
    res: result.res,
  };
};

proto._objectUrl = function _objectUrl(name) {
  return this._getReqUrl({ bucket: this.options.bucket, object: name });
};

/**
 * generator request params
 * @return {Object} params
 *
 * @private
 */

proto._objectRequestParams = function(method, name, options) {
  if (!this.options.bucket && !this.options.cname) {
    throw new Error('Please create a bucket first');
  }

  options = options || {};
  name = this._objectName(name);
  const params = {
    object: name,
    bucket: this.options.bucket,
    method,
    subres: options && options.subres,
    timeout: options && options.timeout,
    ctx: options && options.ctx,
  };

  if (options.headers) {
    params.headers = {};
    copy(options.headers).to(params.headers);
  }
  return params;
};

proto._objectName = function(name) {
  return name.replace(/^\/+/, '');
};

proto._convertMetaToHeaders = function(meta, headers) {
  if (!meta) {
    return;
  }

  Object.keys(meta).forEach(k => {
    headers[`x-oss-meta-${k}`] = meta[k];
  });
};
