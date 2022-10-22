const debug = require('util').debuglog('oss-client:client');
const sendToWormhole = require('stream-wormhole');
const xml = require('xml2js');
const AgentKeepalive = require('agentkeepalive');
const HttpsAgentKeepalive = require('agentkeepalive').HttpsAgent;
const merge = require('merge-descriptors');
const utility = require('utility');
const urllib = require('urllib');
const pkg = require('../package.json');
const signUtils = require('./common/signUtils');
const _initOptions = require('./common/client/initOptions');
const { createRequest } = require('./common/utils/createRequest');
const { encoder } = require('./common/utils/encoder');
const { getReqUrl } = require('./common/client/getReqUrl');
const { setSTSToken } = require('./common/utils/setSTSToken');
const { retry } = require('./common/utils/retry');
const { isFunction } = require('./common/utils/isFunction');

const globalHttpAgent = new AgentKeepalive();
const globalHttpsAgent = new HttpsAgentKeepalive();

function Client(options, ctx) {
  if (!(this instanceof Client)) {
    return new Client(options, ctx);
  }

  if (options && options.inited) {
    this.options = options;
  } else {
    this.options = Client.initOptions(options);
  }

  // support custom agent and urllib client
  if (this.options.urllib) {
    this.urllib = this.options.urllib;
  } else {
    this.urllib = urllib;
    if (this.options.maxSockets) {
      globalHttpAgent.maxSockets = this.options.maxSockets;
      globalHttpsAgent.maxSockets = this.options.maxSockets;
    }
    this.agent = this.options.agent || globalHttpAgent;
    this.httpsAgent = this.options.httpsAgent || globalHttpsAgent;
  }
  this.ctx = ctx;
  this.userAgent = this._getUserAgent();
  this.stsTokenFreshTime = new Date();
}

/**
 * Expose `Client`
 */

module.exports = Client;

Client.initOptions = function initOptions(options) {
  return _initOptions(options);
};

/**
 * prototype
 */

const proto = Client.prototype;

/**
 * Object operations
 */
merge(proto, require('./common/object'));
merge(proto, require('./object'));
merge(proto, require('./common/image'));
/**
 * Bucket operations
 */
merge(proto, require('./common/bucket'));
merge(proto, require('./bucket'));
// multipart upload
merge(proto, require('./managed-upload'));
/**
 * RTMP operations
 */
merge(proto, require('./rtmp'));

/**
 * common multipart-copy support node and browser
 */
merge(proto, require('./common/multipart-copy'));
/**
 * Common module parallel
 */
merge(proto, require('./common/parallel'));
/**
 * Multipart operations
 */
merge(proto, require('./common/multipart'));
/**
 * ImageClient class
 */
Client.ImageClient = require('./image')(Client);
/**
 * Cluster Client class
 */
Client.ClusterClient = require('./cluster')(Client);

/**
 * STS Client class
 */
Client.STS = require('./sts');

/**
 * get OSS signature
 * @param {String} stringToSign
 * @return {String} the signature
 */
proto.signature = function signature(stringToSign) {
  debug('authorization stringToSign: %s', stringToSign);

  return signUtils.computeSignature(this.options.accessKeySecret, stringToSign, this.options.headerEncoding);
};

proto._getReqUrl = getReqUrl;

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
 *
 * @param {String} method
 * @param {String} resource
 * @param {Object} header
 * @return {String}
 *
 * @api private
 */

proto.authorization = function authorization(method, resource, subres, headers) {
  const stringToSign = signUtils.buildCanonicalString(method.toUpperCase(), resource, {
    headers,
    parameters: subres,
  });

  return signUtils.authorization(
    this.options.accessKeyId,
    this.options.accessKeySecret,
    stringToSign,
    this.options.headerEncoding
  );
};

/**
 * request oss server
 * @param {Object} params
 *   - {String} object
 *   - {String} bucket
 *   - {Object} [headers]
 *   - {Object} [query]
 *   - {Buffer} [content]
 *   - {Stream} [stream]
 *   - {Stream} [writeStream]
 *   - {String} [mime]
 *   - {Boolean} [xmlResponse]
 *   - {Boolean} [customResponse]
 *   - {Number} [timeout]
 *   - {Object} [ctx] request context, default is `this.ctx`
 *
 * @api private
 */

proto.request = async function(params) {
  if (this.options.retryMax) {
    return await retry(request.bind(this), this.options.retryMax, {
      errorHandler: err => {
        const _errHandle = _err => {
          if (params.stream) return false;
          const statusErr = [ -1, -2 ].includes(_err.status);
          const requestErrorRetryHandle = this.options.requestErrorRetryHandle || (() => true);
          return statusErr && requestErrorRetryHandle(_err);
        };
        if (_errHandle(err)) return true;
        return false;
      },
    })(params);
  }
  return await request.call(this, params);

};

async function request(params) {
  if (this.options.stsToken && isFunction(this.options.refreshSTSToken)) {
    await setSTSToken.call(this);
  }
  const reqParams = createRequest.call(this, params);
  let result;
  let reqErr;
  try {
    result = await this.urllib.request(reqParams.url, reqParams.params);
    debug('response %s %s, got %s, headers: %j', params.method, reqParams.url, result.status, result.headers);
  } catch (err) {
    reqErr = err;
  }
  let err;
  if (result && params.successStatuses && params.successStatuses.indexOf(result.status) === -1) {
    err = await this.requestError(result);
    err.params = params;
  } else if (reqErr) {
    err = await this.requestError(reqErr);
  }

  if (err) {
    if (params.customResponse && result && result.res) {
      // consume the response stream
      await sendToWormhole(result.res);
    }

    if (err.name === 'ResponseTimeoutError') {
      err.message = `${err.message.split(',')[0]}, please increase the timeout or use multipartDownload.`;
    }
    throw err;
  }

  if (params.xmlResponse) {
    result.data = await this.parseXML(result.data);
  }
  return result;
}

proto._getResource = function _getResource(params) {
  let resource = '/';
  if (params.bucket) resource += `${params.bucket}/`;
  if (params.object) resource += encoder(params.object, this.options.headerEncoding);

  return resource;
};

proto._escape = function _escape(name) {
  return utility.encodeURIComponent(name).replace(/%2F/g, '/');
};

/*
 * Get User-Agent for node.js
 * @example
 *   oss-client/1.0.0 Node.js/5.3.0 (darwin; arm64)
 */

proto._getUserAgent = function _getUserAgent() {
  const sdk = `${pkg.name}/${pkg.version}`;
  const platform = `Node.js/${process.version.slice(1)} (${process.platform}; ${process.arch})`;
  return `${sdk} ${platform}`;
};

/**
 * thunkify xml.parseString
 * @param {String|Buffer} str
 *
 * @private
 */

proto.parseXML = function parseXMLThunk(str) {
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(str)) {
      str = str.toString();
    }
    xml.parseString(
      str,
      {
        explicitRoot: false,
        explicitArray: false,
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
};

/**
 * generater a request error with request response
 * @param {Object} result
 *
 * @api private
 */

proto.requestError = async function requestError(result) {
  let err = null;
  if (result.name === 'ResponseTimeoutError') {
    err = new Error(result.message);
    err.name = result.name;
  } else if (!result.data || !result.data.length) {
    if (result.status === -1 || result.status === -2) {
      // -1 is net error , -2 is timeout
      err = new Error(result.message);
      err.name = result.name;
      err.status = result.status;
      err.code = result.name;
    } else {
      // HEAD not exists resource
      if (result.status === 404) {
        err = new Error('Object not exists');
        err.name = 'NoSuchKeyError';
        err.status = 404;
        err.code = 'NoSuchKey';
      } else if (result.status === 412) {
        err = new Error('Pre condition failed');
        err.name = 'PreconditionFailedError';
        err.status = 412;
        err.code = 'PreconditionFailed';
      } else {
        err = new Error(`Unknow error, status: ${result.status}`);
        err.name = 'UnknownError';
        err.status = result.status;
      }
      err.requestId = result.headers['x-oss-request-id'];
      err.host = '';
    }
  } else {
    const message = String(result.data);
    debug('request response error data: %s', message);

    let info;
    try {
      info = (await this.parseXML(message)) || {};
    } catch (error) {
      debug(message);
      error.message += `\nraw xml: ${message}`;
      error.status = result.status;
      error.requestId = result.headers['x-oss-request-id'];
      return error;
    }

    let msg = info.Message || `unknow request error, status: ${result.status}`;
    if (info.Condition) {
      msg += ` (condition: ${info.Condition})`;
    }
    err = new Error(msg);
    err.name = info.Code ? `${info.Code}Error` : 'UnknownError';
    err.status = result.status;
    err.code = info.Code;
    err.requestId = info.RequestId;
    err.hostId = info.HostId;
  }

  debug('generate error %j', err);
  return err;
};

proto.setSLDEnabled = function setSLDEnabled(enable) {
  this.options.sldEnable = !!enable;
  return this;
};
