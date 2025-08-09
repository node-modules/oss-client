import { debuglog } from 'node:util';
import crypto from 'node:crypto';

import type { IncomingHttpHeaders } from 'urllib';
import type { SignatureUrlOptions } from 'oss-interface';

import type { Request, RequestParameters } from '../type/Request.js';
import { encodeCallback } from './encodeCallback.js';

const debug = debuglog('oss-client:sign');
const OSS_PREFIX = 'x-oss-';

function compareCanonicalizedString(entry1: string, entry2: string) {
  if (entry1[0] > entry2[0]) {
    return 1;
  } else if (entry1[0] < entry2[0]) {
    return -1;
  }
  return 0;
}

/**
 * build canonicalized resource
 * @see https://help.aliyun.com/zh/oss/developer-reference/include-signatures-in-the-authorization-header#section-rvv-dx2-xdb
 */
function buildCanonicalizedResource(
  resourcePath: string,
  parameters?: RequestParameters
) {
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
    const processFunc = (key: string) => {
      canonicalizedResource += separatorString + key;
      if (parameters[key] || parameters[key] === 0) {
        canonicalizedResource += `=${parameters[key]}`;
      }
      separatorString = '&';
    };
    for (const key of Object.keys(parameters).sort(
      compareCanonicalizedString
    )) {
      processFunc(key);
    }
  }
  debug('canonicalizedResource: %o', canonicalizedResource);
  return canonicalizedResource;
}

function lowercaseKeyHeader(headers: IncomingHttpHeaders) {
  const lowercaseHeaders: IncomingHttpHeaders = {};
  if (headers) {
    for (const name in headers) {
      lowercaseHeaders[name.toLowerCase()] = headers[name];
    }
  }
  return lowercaseHeaders;
}

export function buildCanonicalString(
  method: string,
  resourcePath: string,
  request: Request,
  expiresTimestamp?: string
) {
  const headers = lowercaseKeyHeader(request.headers);
  const headersToSign: IncomingHttpHeaders = {};
  const signContent: string[] = [
    method.toUpperCase(),
    (headers['content-md5'] as string) ?? '',
    headers['content-type'] as string,
    expiresTimestamp || (headers['x-oss-date'] as string),
  ];

  for (const key of Object.keys(headers)) {
    if (key.startsWith(OSS_PREFIX)) {
      headersToSign[key] = String(headers[key]).trim();
    }
  }

  for (const key of Object.keys(headersToSign).sort()) {
    signContent.push(`${key}:${headersToSign[key]}`);
  }
  signContent.push(
    buildCanonicalizedResource(resourcePath, request.parameters)
  );

  return signContent.join('\n');
}

export function computeSignature(
  accessKeySecret: string,
  canonicalString: string
) {
  const signature = crypto.createHmac('sha1', accessKeySecret);
  return signature.update(Buffer.from(canonicalString)).digest('base64');
}

export function authorization(
  accessKeyId: string,
  accessKeySecret: string,
  canonicalString: string
) {
  // https://help.aliyun.com/zh/oss/developer-reference/include-signatures-in-the-authorization-header
  return `OSS ${accessKeyId}:${computeSignature(accessKeySecret, canonicalString)}`;
}

export function signatureForURL(
  accessKeySecret: string,
  options: SignatureUrlOptions,
  resource: string,
  expiresTimestamp: number
) {
  const headers: Record<string, string> = {};
  const subResource = options.subResource ?? {};

  if (options.process) {
    subResource['x-oss-process'] = options.process;
  }

  if (options.trafficLimit) {
    subResource['x-oss-traffic-limit'] = `${options.trafficLimit}`;
  }

  if (options.response) {
    const customResponseHeaders = options.response as Record<string, string>;
    for (const k in customResponseHeaders) {
      subResource[`response-${k.toLowerCase()}`] = customResponseHeaders[k];
    }
  }

  if (options['Content-MD5'] && !options['content-md5']) {
    options['content-md5'] = options['Content-MD5'];
  }
  if (options['Content-Md5'] && !options['content-md5']) {
    options['content-md5'] = options['Content-Md5'];
  }
  if (options['content-md5']) {
    headers['content-md5'] = options['content-md5'];
  }
  if (options['Content-Type'] && !options['content-type']) {
    options['content-type'] = options['Content-Type'];
  }
  if (options['content-type']) {
    headers['content-type'] = options['content-type'];
  }

  // copy other x-oss-* headers
  for (const key in options) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('x-oss-')) {
      headers[lowerKey] = options[key];
    }
  }

  if (options.callback) {
    const callbackOptions = encodeCallback(options.callback);
    subResource.callback = callbackOptions.callback;
    if (callbackOptions.callbackVar) {
      subResource['callback-var'] = callbackOptions.callbackVar;
    }
  }

  const canonicalString = buildCanonicalString(
    options.method as string,
    resource,
    {
      headers,
      parameters: subResource,
    },
    `${expiresTimestamp}`
  );

  return {
    Signature: computeSignature(accessKeySecret, canonicalString),
    subResource,
  };
}
