import { debuglog } from 'node:util';
import crypto from 'node:crypto';
import { Request, RequestHeaders, RequestParameters } from '../type/Request.js';

const debug = debuglog('oss-client:sign');
const OSS_PREFIX = 'x-oss-';

/**
 * build canonicalized resource
 * @see https://help.aliyun.com/zh/oss/developer-reference/include-signatures-in-the-authorization-header#section-rvv-dx2-xdb
 */
function buildCanonicalizedResource(resourcePath: string, parameters?: RequestParameters) {
  let canonicalizedResource = `${resourcePath}`;
  let separatorString = '?';

  if (typeof parameters === 'string') {
    if (parameters.trim()) {
      canonicalizedResource += separatorString + parameters;
    }
  } else if (Array.isArray(parameters)) {
    parameters.sort();
    canonicalizedResource += separatorString + parameters.join('&');
  } else if (parameters) {
    const compareFunc = (entry1: string, entry2: string) => {
      if (entry1[0] > entry2[0]) {
        return 1;
      } else if (entry1[0] < entry2[0]) {
        return -1;
      }
      return 0;
    };
    const processFunc = (key: string) => {
      canonicalizedResource += separatorString + key;
      if (parameters[key] || parameters[key] === 0) {
        canonicalizedResource += `=${parameters[key]}`;
      }
      separatorString = '&';
    };
    Object.keys(parameters).sort(compareFunc).forEach(processFunc);
  }
  debug('canonicalizedResource: %o', canonicalizedResource);
  return canonicalizedResource;
}

function lowercaseKeyHeader(headers: RequestHeaders) {
  const lowercaseHeaders: RequestHeaders = {};
  if (headers) {
    for (const name in headers) {
      lowercaseHeaders[name.toLowerCase()] = headers[name];
    }
  }
  return lowercaseHeaders;
}

export function buildCanonicalString(method: string, resourcePath: string, request: Request, expires?: string) {
  const headers = lowercaseKeyHeader(request.headers);
  const headersToSign: RequestHeaders = {};
  const signContent: string[] = [
    method.toUpperCase(),
    headers['content-md5'] || '',
    headers['content-type'],
    expires || headers['x-oss-date'],
  ];

  Object.keys(headers).forEach(key => {
    if (key.startsWith(OSS_PREFIX)) {
      headersToSign[key] = String(headers[key]).trim();
    }
  });

  Object.keys(headersToSign).sort().forEach(key => {
    signContent.push(`${key}:${headersToSign[key]}`);
  });
  signContent.push(buildCanonicalizedResource(resourcePath, request.parameters));

  return signContent.join('\n');
}

export function computeSignature(accessKeySecret: string, canonicalString: string) {
  const signature = crypto.createHmac('sha1', accessKeySecret);
  return signature.update(Buffer.from(canonicalString)).digest('base64');
}

export function authorization(accessKeyId: string, accessKeySecret: string, canonicalString: string) {
  // https://help.aliyun.com/zh/oss/developer-reference/include-signatures-in-the-authorization-header
  return `OSS ${accessKeyId}:${computeSignature(accessKeySecret, canonicalString)}`;
}

// export function signatureForURL(accessKeySecret: string, options = {}, resource: string, expires: string) {
//   const headers = {};
//   const { subResource = {} } = options;

//   if (options.process) {
//     const processKeyword = 'x-oss-process';
//     subResource[processKeyword] = options.process;
//   }

//   if (options.trafficLimit) {
//     const trafficLimitKey = 'x-oss-traffic-limit';
//     subResource[trafficLimitKey] = options.trafficLimit;
//   }

//   if (options.response) {
//     Object.keys(options.response).forEach(k => {
//       const key = `response-${k.toLowerCase()}`;
//       subResource[key] = options.response[k];
//     });
//   }

//   Object.keys(options).forEach(key => {
//     const lowerKey = key.toLowerCase();
//     const value = options[key];
//     if (lowerKey.indexOf('x-oss-') === 0) {
//       headers[lowerKey] = value;
//     } else if (lowerKey.indexOf('content-md5') === 0) {
//       headers[key] = value;
//     } else if (lowerKey.indexOf('content-type') === 0) {
//       headers[key] = value;
//     }
//   });

//   if (Object.prototype.hasOwnProperty.call(options, 'security-token')) {
//     subResource['security-token'] = options['security-token'];
//   }

//   if (Object.prototype.hasOwnProperty.call(options, 'callback')) {
//     const json = {
//       callbackUrl: encodeURI(options.callback.url),
//       callbackBody: options.callback.body,
//     };
//     if (options.callback.host) {
//       json.callbackHost = options.callback.host;
//     }
//     if (options.callback.contentType) {
//       json.callbackBodyType = options.callback.contentType;
//     }
//     subResource.callback = Buffer.from(JSON.stringify(json)).toString('base64');

//     if (options.callback.customValue) {
//       const callbackVar = {};
//       Object.keys(options.callback.customValue).forEach(key => {
//         callbackVar[`x:${key}`] = options.callback.customValue[key];
//       });
//       subResource['callback-var'] = Buffer.from(JSON.stringify(callbackVar)).toString('base64');
//     }
//   }

//   const canonicalString = buildCanonicalString(options.method, resource, {
//     headers,
//     parameters: subResource,
//   }, expires.toString());

//   return {
//     Signature: this.computeSignature(accessKeySecret, canonicalString, headerEncoding),
//     subResource,
//   };
// };
