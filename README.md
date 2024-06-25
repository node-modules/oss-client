# oss-client

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/node-modules/oss-client/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/oss-client/actions/workflows/nodejs.yml)
[![coverage][cov-image]][cov-url]

[npm-image]: https://img.shields.io/npm/v/oss-client.svg?style=flat-square
[npm-url]: https://npmjs.org/package/oss-client
[cov-image]: http://codecov.io/github/node-modules/oss-client/coverage.svg?branch=master
[cov-url]: http://codecov.io/github/node-modules/oss-client?branch=master

Alibaba cloud OSS(Object Storage Service) Node.js Client.

## Install

```bash
npm install oss-client
```

## License

[MIT](LICENSE)

# OSS Usage

OSS, Object Storage Service. Equal to well known Amazon [S3](http://aws.amazon.com/s3/).

All operation use es7 async/await to implement. All api is async function.

## Summary

- [oss-client](#oss-client)
  - [Install](#install)
  - [License](#license)
- [OSS Usage](#oss-usage)
  - [Summary](#summary)
  - [Node.js Usage](#nodejs-usage)
    - [Compatibility](#compatibility)
    - [Basic usage](#basic-usage)
  - [Data Regions](#data-regions)
  - [Create Account](#create-account)
  - [Create A Bucket Instance](#create-a-bucket-instance)
  - [new OSSObject(options)](#new-ossobjectoptions)
  - [Object Operations](#object-operations)
    - [.put(name, file\[, options\])](#putname-file-options)
    - [.putStream(name, stream\[, options\])](#putstreamname-stream-options)
    - [.append(name, file\[, options\])](#appendname-file-options)
    - [.generateObjectUrl(name\[, baseUrl\])](#generateobjecturlname-baseurl)
    - [.head(name\[, options\])](#headname-options)
    - [.getObjectMeta(name\[, options\])](#getobjectmetaname-options)
    - [.get(name\[, file, options\])](#getname-file-options)
    - [.getStream(name\[, options\])](#getstreamname-options)
    - [.delete(name\[, options\])](#deletename-options)
    - [.copy(name, sourceName\[, sourceBucket, options\])](#copyname-sourcename-sourcebucket-options)
    - [.putMeta(name, meta\[, options\])](#putmetaname-meta-options)
    - [.deleteMulti(names\[, options\])](#deletemultinames-options)
    - [.list(query\[, options\])](#listquery-options)
    - [.listV2(query\[, options\])](#listv2query-options)
    - [.getBucketVersions(query\[, options\])](#getbucketversionsquery-options)
    - [.signatureUrl(name\[, options\])](#signatureurlname-options)
    - [.asyncSignatureUrl(name\[, options\])](#asyncsignatureurlname-options)
    - [.putACL(name, acl\[, options\])](#putaclname-acl-options)
    - [.getACL(name\[, options\])](#getaclname-options)
    - [.restore(name\[, options\])](#restorename-options)
    - [.putSymlink(name, targetName\[, options\])](#putsymlinkname-targetname-options)
    - [.getSymlink(name\[, options\])](#getsymlinkname-options)
    - [.calculatePostSignature(policy)](#calculatepostsignaturepolicy)
    - [.getObjectTagging(name\[, options\])](#getobjecttaggingname-options)
    - [.putObjectTagging(name, tag\[, options\])](#putobjecttaggingname-tag-options)
    - [.deleteObjectTagging(name\[, options\])](#deleteobjecttaggingname-options)
    - [.processObjectSave(sourceObject, targetObject, process\[, targetBucket\])](#processobjectsavesourceobject-targetobject-process-targetbucket)
  - [Known Errors](#known-errors)
  - [Contributors](#contributors)

## Node.js Usage

### Compatibility

- Node.js >= 16.0.0
- urllib >= 3.0.0

### Basic usage

1. install SDK using npm

```bash
npm install oss-client
```

2. for example:

Commonjs

```js
const { OSSObject } = require('oss-client');
const ossObject = new OSSObject({
  region: '<oss region>',
  endpoint: '<oss endpoint>',
  accessKeyId: '<Your accessKeyId>',
  accessKeySecret: '<Your accessKeySecret>',
  bucket: '<Your bucket name>'
});
```

TypeScript and ESM

```ts
import { OSSObject } from 'oss-client';

const ossObject = new OSSObject({
  region: '<oss region>',
  endpoint: '<oss endpoint>',
  accessKeyId: '<Your accessKeyId>',
  accessKeySecret: '<Your accessKeySecret>',
  bucket: '<Your bucket name>'
});
```

## Data Regions

[OSS current data regions](https://help.aliyun.com/document_detail/31837.html).

## Create Account

Go to [OSS website](http://www.aliyun.com/product/oss/?lang=en), create a new account for new user.

After account created, you can create the OSS instance and get the `accessKeyId` and `accessKeySecret`.

## Create A Bucket Instance

Each OSS instance required `accessKeyId`, `accessKeySecret` and `bucket`.

## new OSSObject(options)

Create a Bucket store instance.

options:

- accessKeyId {String} access key you create on aliyun console website
- accessKeySecret {String} access secret you create
- [bucket] {String} the default bucket you want to access
- [endpoint] {String} oss region domain. It takes priority over `region`. Set as extranet domain name, intranet domain name, accelerated domain name, etc. according to different needs. please see [endpoints](https://www.alibabacloud.com/help/doc-detail/31837.htm)
- [region] {String} the bucket data region location, please see [Data Regions](#data-regions),
  default is `oss-cn-hangzhou`.
- [internal] {Boolean} access OSS with aliyun internal network or not, default is `false`.
  If your servers are running on aliyun too, you can set `true` to save lot of money.
- [timeout] {String|Number} instance level timeout for all operations, default is `60s`.
- [isRequestPay] {Boolean}, default false, whether request payer function of the bucket is open, if true, will send headers `'x-oss-request-payer': 'requester'` to oss server.
  the details you can see [requestPay](https://help.aliyun.com/document_detail/91337.htm)

example:

1. basic usage

```js
const { OSSObject } = require('oss-client');

const store = new OSSObject({
  accessKeyId: 'your access key',
  accessKeySecret: 'your access secret',
  bucket: 'your bucket name',
  region: 'oss-cn-hangzhou',
});
```

2. use accelerate endpoint

- Global accelerate endpoint: oss-accelerate.aliyuncs.com
- Accelerate endpoint of regions outside mainland China: oss-accelerate-overseas.aliyuncs.com

```js
const { OSSObject } = require('oss-client');

const store = new OSSObject({
  accessKeyId: 'your access key',
  accessKeySecret: 'your access secret',
  bucket: 'your bucket name',
  endpoint: 'https://oss-accelerate.aliyuncs.com',
});
```

3. use custom domain

See https://help.aliyun.com/zh/oss/user-guide/map-custom-domain-names-5

```js
const { OSSObject } = require('oss-client');

const store = new OSSObject({
  accessKeyId: 'your access key',
  accessKeySecret: 'your access secret',
  cname: true,
  // your custom domain endpoint
  endpoint: 'https://my-static.domain.com',
});
```

## Object Operations

All operations function return Promise, except `signatureUrl`.

### .put(name, file[, options])

Add an object to the bucket.

parameters:

- name {String} object name store on OSS
- file {String|Buffer|ReadStream} object local path, content buffer or ReadStream content instance use in Node, Blob and html5 File
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [mime] {String} custom mime, will send with `Content-Type` entity header
  - [meta] {Object} user meta, will send with `x-oss-meta-` prefix string
    e.g.: `{ uid: 123, pid: 110 }`
  - [callback] {Object} The callback parameter is composed of a JSON string encoded in Base64,detail [see](https://www.alibabacloud.com/help/doc-detail/31989.htm)<br>
    - url {String} After a file is uploaded successfully, the OSS sends a callback request to this URL.
    - [host] {String} The host header value for initiating callback requests.
    - body {String} The value of the request body when a callback is initiated, for example, `key=${key}&etag=${etag}&my_var=${x:my_var}`.
    - [contentType] {String} The Content-Type of the callback requests initiatiated, It supports application/x-www-form-urlencoded and application/json, and the former is the default value.
    - [customValue] {Object} Custom parameters are a map of key-values<br>
         e.g.:

        ```js
           var customValue = {var1: 'value1', var2: 'value2'}
        ```

  - [headers] {Object} extra headers
    - 'Cache-Control' cache control for download, e.g.: `Cache-Control: public, no-cache`
    - 'Content-Disposition' object name for download, e.g.: `Content-Disposition: somename`
    - 'Content-Encoding' object content encoding for download, e.g.: `Content-Encoding: gzip`
    - 'Expires' expires time for download, an absolute date and time. e.g.: `Tue, 08 Dec 2020 13:49:43 GMT`
    - See more: [PutObject](https://help.aliyun.com/document_detail/31978.html#title-yxe-96d-x61)

Success will return the object information.

object:

- name {String} object name
- data {Object} callback server response data, sdk use JSON.parse() return
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Add an object through local file path

```js
const filepath = '/home/ossdemo/demo.txt';
store.put('ossdemo/demo.txt', filepath).then((result) => {
  console.log(result);
});

{
  name: 'ossdemo/demo.txt',
  res: {
    status: 200,
    headers: {
      date: 'Tue, 17 Feb 2015 13:28:17 GMT',
      'content-length': '0',
      connection: 'close',
      etag: '"BF7A03DA01440845BC5D487B369BC168"',
      server: 'AliyunOSS',
      'x-oss-request-id': '54E341F1707AA0275E829244'
    },
    size: 0,
    rt: 92
  }
}
```

- Add an object through content buffer

```js
store.put('ossdemo/buffer', Buffer.from('foo content')).then((result) => {
  console.log(result);
});

{
  name: 'ossdemo/buffer',
  url: 'http://demo.oss-cn-hangzhou.aliyuncs.com/ossdemo/buffer',
  res: {
    status: 200,
    headers: {
      date: 'Tue, 17 Feb 2015 13:28:17 GMT',
      'content-length': '0',
      connection: 'close',
      etag: '"xxx"',
      server: 'AliyunOSS',
      'x-oss-request-id': '54E341F1707AA0275E829243'
    },
    size: 0,
    rt: 92
  }
}
```

- Add an object through readstream

```js
const filepath = '/home/ossdemo/demo.txt';
store.put('ossdemo/readstream.txt', fs.createReadStream(filepath)).then((result) => {
  console.log(result);
});

{
  name: 'ossdemo/readstream.txt',
  url: 'http://demo.oss-cn-hangzhou.aliyuncs.com/ossdemo/readstream.txt',
  res: {
    status: 200,
    headers: {
      date: 'Tue, 17 Feb 2015 13:28:17 GMT',
      'content-length': '0',
      connection: 'close',
      etag: '"BF7A03DA01440845BC5D487B369BC168"',
      server: 'AliyunOSS',
      'x-oss-request-id': '54E341F1707AA0275E829242'
    },
    size: 0,
    rt: 92
  }
}
```

### .putStream(name, stream[, options])

Add a stream object to the bucket.

parameters:

- name {String} object name store on OSS
- stream {ReadStream} object ReadStream content instance
- [options] {Object} optional parameters
  - [contentLength] {Number} the stream length, `chunked encoding` will be used if absent
  - [timeout] {Number} the operation timeout
  - [mime] {String} custom mime, will send with `Content-Type` entity header
  - [meta] {Object} user meta, will send with `x-oss-meta-` prefix string
    e.g.: `{ uid: 123, pid: 110 }`
  - [callback] {Object} The callback parameter is composed of a JSON string encoded in Base64,detail [see](https://www.alibabacloud.com/help/doc-detail/31989.htm)<br>
    - url {String} After a file is uploaded successfully, the OSS sends a callback request to this URL.
    - [host] {String} The host header value for initiating callback requests.
    - body {String} The value of the request body when a callback is initiated, for example, key=${key}&etag=${etag}&my_var=${x:my_var}.
    - [contentType] {String} The Content-Type of the callback requests initiatiated, It supports application/x-www-form-urlencoded and application/json, and the former is the default value.
    - [customValue] {Object} Custom parameters are a map of key-values<br>
         e.g.:

        ```js
           var customValue = {var1: 'value1', var2: 'value2'}
        ```

  - [headers] {Object} extra headers, detail see [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616.html)
    - 'Cache-Control' cache control for download, e.g.: `Cache-Control: public, no-cache`
    - 'Content-Disposition' object name for download, e.g.: `Content-Disposition: somename`
    - 'Content-Encoding' object content encoding for download, e.g.: `Content-Encoding: gzip`
    - 'Expires' expires time for download, an absolute date and time. e.g.: `Tue, 08 Dec 2020 13:49:43 GMT`

Success will return the object information.

object:

- name {String} object name
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Add an object through readstream

```js
const filepath = '/home/ossdemo/demo.txt';
store.putStream('ossdemo/readstream.txt', fs.createReadStream(filepath)).then((result) => {
  console.log(result);
});

{
  name: 'ossdemo/readstream.txt',
  url: 'http://demo.oss-cn-hangzhou.aliyuncs.com/ossdemo/readstream.txt',
  res: {
    status: 200,
    headers: {
      date: 'Tue, 17 Feb 2015 13:28:17 GMT',
      'content-length': '0',
      connection: 'close',
      etag: '"BF7A03DA01440845BC5D487B369BC168"',
      server: 'AliyunOSS',
      'x-oss-request-id': '54E341F1707AA0275E829242'
    },
    size: 0,
    rt: 92
  }
}
```

### .append(name, file[, options])

Append an object to the bucket, it's almost same as put, but it can add content to existing object rather than override it.

All parameters are same as put except for options.position

- name {String} object name store on OSS
- file {String|Buffer|ReadStream} object local path, content buffer or ReadStream content instance
- [options] {Object} optional parameters
  - [position] {String} specify the position which is the content length of the latest object
  - [timeout] {Number} the operation timeout
  - [mime] {String} custom mime, will send with `Content-Type` entity header
  - [meta] {Object} user meta, will send with `x-oss-meta-` prefix string
    e.g.: `{ uid: 123, pid: 110 }`
  - [headers] {Object} extra headers, detail see [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616.html)
    - 'Cache-Control' cache control for download, e.g.: `Cache-Control: public, no-cache`
    - 'Content-Disposition' object name for download, e.g.: `Content-Disposition: somename`
    - 'Content-Encoding' object content encoding for download, e.g.: `Content-Encoding: gzip`
    - 'Expires' expires time for download, an absolute date and time. e.g.: `Tue, 08 Dec 2020 13:49:43 GMT`

object:

- name {String} object name
- url {String} the url of oss
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)
- nextAppendPosition {String} the next position

example:

```js
let object = await store.append('ossdemo/buffer', Buffer.from('foo'));

// append content to the existing object
object = await store.append('ossdemo/buffer', Buffer.from('bar'), {
  position: object.nextAppendPosition,
});
```

### .generateObjectUrl(name[, baseUrl])

Get the Object url.
If provide `baseUrl`, will use `baseUrl` instead the default `bucket and endpoint`.
Suggest use generateObjectUrl instead of getObjectUrl.

e.g.:

```js
const url = store.generateObjectUrl('foo/bar.jpg');
// cdnUrl should be `https://${bucketname}.${endpotint}foo/bar.jpg`

const cdnUrl = store.generateObjectUrl('foo/bar.jpg', 'https://mycdn.domian.com');
// cdnUrl should be `https://mycdn.domian.com/foo/bar.jpg`
```

### .head(name[, options])

Head an object and get the meta info.

parameters:

- name {String} object name store on OSS
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [versionId] {String} the version id of history object
  - [headers] {Object} extra headers, detail see [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616.html)
    - 'If-Modified-Since' object modified after this time will return 200 and object meta,
        otherwise return 304 not modified
    - 'If-Unmodified-Since' object modified before this time will return 200 and object meta,
        otherwise throw PreconditionFailedError
    - 'If-Match' object etag equal this will return 200 and object meta,
        otherwise throw PreconditionFailedError
    - 'If-None-Match' object etag not equal this will return 200 and object meta,
        otherwise return 304 not modified

Success will return the object's meta information.

object:

- status {Number} response status, maybe 200 or 304
- meta {Object} object user meta, if not set on `put()`, will return null.
    If return status 304, meta will be null too
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
    - [x-oss-version-id] return in multiversion
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Head an exists object and get user meta

```js
await this.store.put('ossdemo/head-meta', Buffer.from('foo'), {
  meta: {
    uid: 1,
    path: 'foo/demo.txt'
  }
});
const object = await this.store.head('ossdemo/head-meta');
console.log(object);

{
  status: 200,
  meta: {
    uid: '1',
    path: 'foo/demo.txt'
  },
  res: { ... }
}
```

- Head a not exists object

```js
const object = await this.store.head('ossdemo/head-meta');
// will throw NoSuchKeyError
```

### .getObjectMeta(name[, options])

Get an  object meta info include ETag、Size、LastModified and so on, not return object content.

parameters:

- name {String} object name store on OSS
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [versionId] {String} the version id of history object

Success will return the object's meta information.

object:

- status {Number} response status
- res {Object} response info, including
  - headers {Object} response headers

example:

- Head an exists object and get object meta info

```js
await this.store.put('ossdemo/object-meta', Buffer.from('foo'));
const object = await this.store.getObjectMeta('ossdemo/object-meta');
console.log(object);

{
  status: 200,
  res: { ... }
}
```

### .get(name[, file, options])

Get an object from the bucket.

parameters:

- name {String} object name store on OSS
- [file] {String|WriteStream} file path or WriteStream instance to store the content
  If `file` is null or ignore this parameter, function will return info contains `content` property.
- [options] {Object} optional parameters
  - [versionId] {String} the version id of history object
  - [timeout] {Number} the operation timeout
  - [process] {String} image process params, will send with `x-oss-process`
    e.g.: `{process: 'image/resize,w_200'}`
  - [headers] {Object} extra headers, detail see [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616.html)
    - 'Range' get specifying range bytes content, e.g.: `Range: bytes=0-9`
    - 'If-Modified-Since' object modified after this time will return 200 and object meta,
        otherwise return 304 not modified
    - 'If-Unmodified-Since' object modified before this time will return 200 and object meta,
        otherwise throw PreconditionFailedError
    - 'If-Match' object etag equal this will return 200 and object meta,
        otherwise throw PreconditionFailedError
    - 'If-None-Match' object etag not equal this will return 200 and object meta,
        otherwise return 304 not modified

Success will return the info contains response.

object:

- [content] {Buffer} file content buffer if `file` parameter is null or ignore
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

If object not exists, will throw NoSuchKeyError.

example:

- Get an exists object and store it to the local file

```js
const filepath = '/home/ossdemo/demo.txt';
await store.get('ossdemo/demo.txt', filepath);
```

_ Store object to a writestream

```js
await store.get('ossdemo/demo.txt', somestream);
```

- Get an object content buffer

```js
const result = await store.get('ossdemo/demo.txt');
console.log(Buffer.isBuffer(result.content));
```

- Get a processed image and store it to the local file

```js
const filepath = '/home/ossdemo/demo.png';
await store.get('ossdemo/demo.png', filepath, {process: 'image/resize,w_200'});
```

- Get a not exists object

```js
const filepath = '/home/ossdemo/demo.txt';
await store.get('ossdemo/not-exists-demo.txt', filepath);
// will throw NoSuchKeyError
```

- Get a historic version object

```js
const filepath = '/home/ossdemo/demo.txt';
const versionId = 'versionId string';
await store.get('ossdemo/not-exists-demo.txt', filepath, {
  versionId
});
```

### .getStream(name[, options])

Get an object read stream.

parameters:

- name {String} object name store on OSS
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [process] {String} image process params, will send with `x-oss-process`
  - [headers] {Object} extra headers
    - 'If-Modified-Since' object modified after this time will return 200 and object meta,
        otherwise return 304 not modified
    - 'If-Unmodified-Since' object modified before this time will return 200 and object meta,
        otherwise throw PreconditionFailedError
    - 'If-Match' object etag equal this will return 200 and object meta,
        otherwise throw PreconditionFailedError
    - 'If-None-Match' object etag not equal this will return 200 and object meta,
        otherwise return 304 not modified

Success will return the stream instance and response info.

object:

- stream {ReadStream} readable stream instance
    if response status is not 200, stream will be `null`.
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

If object not exists, will throw NoSuchKeyError.

example:

- Get an exists object stream

```js
const result = await store.getStream('ossdemo/demo.txt');
result.stream.pipe(fs.createWriteStream('some file.txt'));
```

### .delete(name[, options])

Delete an object from the bucket.

parameters:

- name {String} object name store on OSS
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [versionId] {String} the version id of history object

Success will return the info contains response.

object:

- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

If delete object not exists, will also delete success.

example:

- Delete an exists object

```js
await store.delete('ossdemo/someobject');
```

- Delete a not exists object

```js
await store.delete('ossdemo/some-not-exists-object');
```

- Delete a history object or deleteMarker

```js
const versionId = 'versionId';
await store.delete('ossdemo/some-not-exists-object', { versionId });
```

### .copy(name, sourceName[, sourceBucket, options])

Copy an object from `sourceName` to `name`.

parameters:

- name {String} object name store on OSS
- sourceName {String} source object name
- [sourceBucket] {String} source Bucket. if doesn't exist，`sourceBucket` is same bucket.
- [options] {Object} optional parameters
  - [versionId] {String} the version id of history object
  - [timeout] {Number} the operation timeout
  - [meta] {Object} user meta, will send with `x-oss-meta-` prefix string
    e.g.: `{ uid: 123, pid: 110 }`
    If the `meta` set, will override the source object meta.
  - [headers] {Object} extra headers
    - 'If-Match' do copy if source object etag equal this,
      otherwise throw PreconditionFailedError
    - 'If-None-Match' do copy if source object etag not equal this,
      otherwise throw PreconditionFailedError
    - 'If-Modified-Since' do copy if source object modified after this time,
        otherwise throw PreconditionFailedError
    - 'If-Unmodified-Since' do copy if source object modified before this time,
        otherwise throw PreconditionFailedError
    - See more: [CopyObject](https://help.aliyun.com/document_detail/31979.html?#title-tzy-vxc-ncx)

Success will return the copy result in `data` property.

object:

- data {Object} copy result
  - lastModified {String} object last modified GMT string
  - etag {String} object etag contains `"`, e.g.: `"5B3C1A2E053D763E1B002CC607C5A0FE"`
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

If source object not exists, will throw NoSuchKeyError.

example:

- Copy same bucket object

```js
store.copy('newName', 'oldName').then((result) => {
  console.log(result);
});
```

- Copy other bucket object

```js
store.copy('logo.png', 'logo.png', 'other-bucket').then((result) => {
  console.log(result);
});
```

- Copy historic object

```js
const versionId = 'your verisonId'
store.copy('logo.png', 'logo.png', 'other-bucket', { versionId }).then((result) => {
  console.log(result);
});
```

### .putMeta(name, meta[, options])

Set an exists object meta.

parameters:

- name {String} object name store on OSS
- meta {Object} user meta, will send with `x-oss-meta-` prefix string
  e.g.: `{ uid: 123, pid: 110 }`
  If `meta: null`, will clean up the exists meta
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout

Success will return the putMeta result in `data` property.

- data {Object} copy result
  - lastModified {String} object last modified GMT date, e.g.: `2015-02-19T08:39:44.000Z`
  - etag {String} object etag contains `"`, e.g.: `"5B3C1A2E053D763E1B002CC607C5A0FE"`
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

If object not exists, will throw NoSuchKeyError.

example:

- Update exists object meta

```js
const result = await store.putMeta('ossdemo.txt', {
  uid: 1, pid: 'p123'
});
console.log(result);
```

- Clean up object meta

```js
await store.putMeta('ossdemo.txt', null);
```

### .deleteMulti(names[, options])

Delete multi objects in one request.

parameters:

- names {Array<Object>} object names, max 1000 objects in once.
  - key {String} object name
  - [versionId] {String} the version id of history object or deleteMarker
- [options] {Object} optional parameters
  - [quiet] {Boolean} quiet mode or verbose mode, default is `false`, verbose mode
    quiet mode: if all objects delete succes, return emtpy response.
      otherwise return delete error object results.
    verbose mode: return all object delete results.
  - [timeout] {Number} the operation timeout

Success will return delete success objects in `deleted` property.

- [deleted] {Array<Object>} deleted object or deleteMarker info list
  - [Key] {String} object name
  - [VersionId] {String} object versionId
  - [DeleteMarker] {String} generate or delete marker
  - [DeleteMarkerVersionId] {String} marker versionId
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Delete multi objects in quiet mode

```js
const result = await store.deleteMulti(['obj1', 'obj2', 'obj3'], {
  quiet: true
});
```

- Delete multi objects in verbose mode

```js
const result = await store.deleteMulti(['obj1', 'obj2', 'obj3']);
```

- Delete multi objects in multiversion

```js
const obj1 = {
  key: 'key1',
  versionId: 'versionId1'
}
const obj2 = {
  key: 'key2',
  versionId: 'versionId2'
}
const result = await store.deleteMulti([obj1, obj2]);
```

### .list(query[, options])

List objects in the bucket.

parameters:

- [query] {Object} query parameters, default is `null`
  - [prefix] {String} search object using `prefix` key
  - [marker] {String} search start from `marker`, including `marker` key
  - [delimiter] {String} delimiter search scope
    e.g. `/` only search current dir, not including subdir
  - [max-keys] {String|Number} max objects, default is `100`, limit to `1000`
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout

Success will return objects list on `objects` properties.

- objects {Array<ObjectMeta>} object meta info list
  Each `ObjectMeta` will contains blow properties:
  - name {String} object name on oss
  - lastModified {String} object last modified GMT date, e.g.: `2015-02-19T08:39:44.000Z`
  - etag {String} object etag contains `"`, e.g.: `"5B3C1A2E053D763E1B002CC607C5A0FE"`
  - type {String} object type, e.g.: `Normal`
  - size {Number} object size, e.g.: `344606`
  - storageClass {String} storage class type, e.g.: `Standard`
  - owner {Object} object owner, including `id` and `displayName`
- prefixes {Array<String>} prefix list
- isTruncated {Boolean} truncate or not
- nextMarker {String} next marker string
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- List top 10 objects

```js
const result = await store.list();
console.log(result.objects);
```

- List `fun/` dir including subdirs objects

```js
const result = await store.list({
  prefix: 'fun/'
});
console.log(result.objects);
```

- List `fun/` dir objects, not including subdirs

```js
const result = await store.list({
  prefix: 'fun/',
  delimiter: '/'
});
console.log(result.objects);
```

### .listV2(query[, options])

List objects in the bucket.(recommended)

parameters:

- [query] {Object} query parameters, default is `null`
  - [prefix] {String} search object using `prefix` key
  - [continuation-token] (continuationToken) {String} search start from `continuationToken`, including `continuationToken` key
  - [delimiter] {String} delimiter search scope
    e.g. `/` only search current dir, not including subdir
  - [max-keys] {String|Number} max objects, default is `100`, limit to `1000`
  - [start-after] {String} specifies the Start-after value from which to start the list. The names of objects are returned in alphabetical order.
  - [fetch-owner] {Boolean} specifies whether to include the owner information in the response.
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout

Success will return objects list on `objects` properties.

- objects {Array<ObjectMeta>} object meta info list
  Each `ObjectMeta` will contains blow properties:
  - name {String} object name on oss
  - url {String} resource url
  - lastModified {String} object last modified GMT date, e.g.: `2015-02-19T08:39:44.000Z`
  - etag {String} object etag contains `"`, e.g.: `"5B3C1A2E053D763E1B002CC607C5A0FE"`
  - type {String} object type, e.g.: `Normal`
  - size {Number} object size, e.g.: `344606`
  - storageClass {String} storage class type, e.g.: `Standard`
  - owner {Object|null} object owner, including `id` and `displayName`
- prefixes {Array<String>} prefix list
- isTruncated {Boolean} truncate or not
- nextContinuationToken {String} next continuation-token string
- keyCount {Number} The number of keys returned for this request. If Delimiter is specified, KeyCount is the sum of the elements in Key and CommonPrefixes.
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

- List top 10 objects

```js
const result = await store.listV2({
  'max-keys': 10
});
console.log(result.objects);
```

- List `fun/` dir including subdirs objects

```js
const result = await store.listV2({
  prefix: 'fun/'
});
console.log(result.objects);
```

- List `fun/` dir objects, not including subdirs

```js
const result = await store.listV2({
  prefix: 'fun/',
  delimiter: '/'
});
console.log(result.objects);
```

- List `a/` dir objects, after `a/b` and not include `a/b`

```js
const result = await store.listV2({
  delimiter: '/',
  prefix: 'a/',
  'start-after': 'a/b'
});
console.log(result.objects);
```

### .getBucketVersions(query[, options])

List the version information of all objects in the bucket, including the delete marker (Delete Marker).

parameters:

- [query] {Object} query parameters, default is `null`
  - [prefix] {String} search object using `prefix` key
  - [versionIdMarker] {String} set the result to return from the version ID marker of the key marker object and sort by the versions
  - [keyMarker] {String} search start from `keyMarker`, including `keyMarker` key
  - [encodingType] {String} specifies that the returned content is encoded, and specifies the type of encoding
  - [delimiter] {String} delimiter search scope
    e.g. `/` only search current dir, not including subdir
  - [maxKeys] {String|Number} max objects, default is `100`, limit to `1000`
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout

Success will return objects list on `objects` properties.

- objects {Array<ObjectMeta>} object meta info list
  Each `ObjectMeta` will contains blow properties:
  - name {String} object name on oss
  - lastModified {String} object last modified GMT date, e.g.: `2015-02-19T08:39:44.000Z`
  - etag {String} object etag contains `"`, e.g.: `"5B3C1A2E053D763E1B002CC607C5A0FE"`
  - type {String} object type, e.g.: `Normal`
  - size {Number} object size, e.g.: `344606`
  - isLatest {Boolean}
  - versionId {String} object versionId
  - storageClass {String} storage class type, e.g.: `Standard`
  - owner {Object} object owner, including `id` and `displayName`
- deleteMarker {Array<ObjectDeleteMarker>} object delete marker info list
  Each `ObjectDeleteMarker`
  - name {String} object name on oss
  - lastModified {String} object last modified GMT date, e.g.: `2015-02-19T08:39:44.000Z`
  - versionId {String} object versionId
- isTruncated {Boolean} truncate or not
- nextKeyMarker (nextMarker) {String} next marker string
- nextVersionIdMarker (NextVersionIdMarker) {String} next version ID marker string
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- View all versions of objects and deleteMarker of bucket

```js
const result = await store.getBucketVersions();
console.log(result.objects);
console.log(result.deleteMarker);
```

- List from key-marker

```js
const result = await store.getBucketVersions({
  'keyMarker': 'keyMarker'
});
console.log(result.objects);
```

- List from the version-id-marker of key-marker

```js
const result = await store.getBucketVersions({
  'versionIdMarker': 'versionIdMarker',
  'keyMarker': 'keyMarker'
});
console.log(result.objects);
console.log(result.deleteMarker);
```

### .signatureUrl(name[, options])

Create a signature url for download or upload object. When you put object with signatureUrl ,you need to pass `Content-Type`.Please look at the example.

parameters:

- name {String} object name store on OSS
- [options] {Object} optional parameters
  - [expires] {Number} after expires seconds, the url will become invalid, default is `1800`
  - [method] {String} the HTTP method, default is 'GET'
  - [Content-Type] {String} set the request content type
  - [process] {String} image process params, will send with `x-oss-process`
    e.g.: `{process: 'image/resize,w_200'}`
  - [trafficLimit] {Number} traffic limit, range: `819200`~`838860800`.
  - [subResource] {Object} additional signature parameters in url.
  - [response] {Object} set the response headers for download
    - [content-type] {String} set the response content type
    - [content-disposition] {String} set the response content disposition
    - [cache-control] {String} set the response cache control
    - See more: <https://help.aliyun.com/document_detail/31980.html>
  - [callback] {Object} set the callback for the operation
    - url {String} set the url for callback
    - [host] {String} set the host for callback
    - body {String} set the body for callback
    - [contentType] {String} set the type for body
    - [customValue] {Object} set the custom value for callback,eg. {var1: value1,var2:value2}

Success will return signature url.

example:

- Get signature url for object

```js
const url = store.signatureUrl('ossdemo.txt');
console.log(url);
// --------------------------------------------------
const url = store.signatureUrl('ossdemo.txt', {
  expires: 3600,
  method: 'PUT'
});
console.log(url);

//  put object with signatureUrl
// -------------------------------------------------

const url = store.signatureUrl('ossdemo.txt', {
  expires: 3600,
  method: 'PUT',
  'Content-Type': 'text/plain; charset=UTF-8',
});
console.log(url);

// --------------------------------------------------
const url = store.signatureUrl('ossdemo.txt', {
  expires: 3600,
  response: {
    'content-type': 'text/custom',
    'content-disposition': 'attachment'
  }
});
console.log(url);

// put operation
```

- Get a signature url for a processed image

```js
const url = store.signatureUrl('ossdemo.png', {
  process: 'image/resize,w_200'
});
console.log(url);
// --------------------------------------------------
const url = store.signatureUrl('ossdemo.png', {
  expires: 3600,
  process: 'image/resize,w_200'
});
console.log(url);
```

### .asyncSignatureUrl(name[, options])

Basically the same as signatureUrl, if refreshSTSToken is configured asyncSignatureUrl will refresh stsToken

parameters:

- name {String} object name store on OSS
- [options] {Object} optional parameters
  - [expires] {Number} after expires seconds, the url will become invalid, default is `1800`
  - [method] {String} the HTTP method, default is 'GET'
  - [Content-Type] {String} set the request content type
  - [process] {String} image process params, will send with `x-oss-process`
    e.g.: `{process: 'image/resize,w_200'}`
  - [trafficLimit] {Number} traffic limit, range: `819200`~`838860800`.
  - [subResource] {Object} additional signature parameters in url.
  - [response] {Object} set the response headers for download
    - [content-type] {String} set the response content type
    - [content-disposition] {String} set the response content disposition
    - [cache-control] {String} set the response cache control
    - See more: <https://help.aliyun.com/document_detail/31980.html>
  - [callback] {Object} set the callback for the operation
    - url {String} set the url for callback
    - [host] {String} set the host for callback
    - body {String} set the body for callback
    - [contentType] {String} set the type for body
    - [customValue] {Object} set the custom value for callback,eg. {var1: value1,var2:value2}

Success will return signature url.

example:

- Get signature url for object

```js
const url = await store.asyncSignatureUrl('ossdemo.txt');
console.log(url);
// --------------------------------------------------
const url = await store.asyncSignatureUrl('ossdemo.txt', {
  expires: 3600,
  method: 'PUT'
});
console.log(url);
//  put object with signatureUrl
// -------------------------------------------------
const url = await store.asyncSignatureUrl('ossdemo.txt', {
  expires: 3600,
  method: 'PUT',
  'Content-Type': 'text/plain; charset=UTF-8',
});
console.log(url);
// --------------------------------------------------
const url = await store.asyncSignatureUrl('ossdemo.txt', {
  expires: 3600,
  response: {
    'content-type': 'text/custom',
    'content-disposition': 'attachment'
  }
});
console.log(url);
// put operation
```

- Get a signature url for a processed image

```js
const url = await store.asyncSignatureUrl('ossdemo.png', {
  process: 'image/resize,w_200'
});
console.log(url);
// --------------------------------------------------
const url = await store.asyncSignatureUrl('ossdemo.png', {
  expires: 3600,
  process: 'image/resize,w_200'
});
console.log(url);
```

### .putACL(name, acl[, options])

Set object's ACL.

parameters:

- name {String} object name
- acl {String} acl (private/public-read/public-read-write)
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [versionId] {String} the version id of history object

Success will return:

- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Set an object's ACL

```js
await store.putACL('ossdemo.txt', 'public-read');
```

- Set an history object's ACL

```js
const versionId = 'object versionId'
await store.putACL('ossdemo.txt', 'public-read', {
  versionId
});
```

### .getACL(name[, options])

Get object's ACL.

parameters:

- name {String} object name
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [versionId] {String} the version id of history object

Success will return:

- acl {String} acl settiongs string
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Get an object's ACL

```js
const result = await store.getACL('ossdemo.txt');
console.log(result.acl);
```

- Get an history object's ACL

```js
const versionId = 'object versionId'
const result = await store.getACL('ossdemo.txt', { versionId });
console.log(result.acl);
```

### .restore(name[, options])

Restore Object.

parameters:

- name {String} object name
- [options] {Object} optional parameters
  - [timeout] {Number} the operation timeout
  - [versionId] {String} the version id of history object
  - [type] {String} the default type is Archive

Success will return:

- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

- Restore an object with Archive type

```js
const result = await store.restore('ossdemo.txt');
console.log(result.status);
```

- Restore an object with ColdArchive type

```js
const result = await store.restore('ossdemo.txt',{type:'ColdArchive'});
console.log(result.status);
```

- Days for unfreezing Specifies the days for unfreezing

```js
const result = await store.restore('ossdemo.txt',{type:'ColdArchive',Days:2});
console.log(result.status);
```

- Restore an history object

```js
const versionId = 'object versionId';
const result = await store.restore('ossdemo.txt', { versionId });
console.log(result.status);
```

### .putSymlink(name, targetName[, options])

PutSymlink

parameters:

- name {String} object name
- targetName {String} target object name
- [options] {Object} optional parameters
  - [storageClass] {String} the storage type include (Standard,IA,Archive)
  - [meta] {Object} user meta, will send with `x-oss-meta-` prefix string
  - [headers] {Object} extra headers, detail see [PutSymlink](https://help.aliyun.com/document_detail/45126.html#title-x71-l2b-7i8)

- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

```js
const options = {
  storageClass: 'IA',
  meta: {
    uid: '1',
    slus: 'test.html'
  }
}
const result = await store.putSymlink('ossdemo.txt', 'targetName', options)
console.log(result.res)
```

putSymlink multiversion

```js
const options = {
  storageClass: 'IA',
  meta: {
    uid: '1',
    slus: 'test.html'
  },
}
const result = await store.putSymlink('ossdemo.txt', 'targetName', options)
console.log(result.res.headers['x-oss-version-id'])
```

### .getSymlink(name[, options])

GetSymlink

parameters:

- name {String} object name
- [options] {Object} optional parameters
- [versionId] {String} the version id of history object

Success will return

- targetName {String} target object name
- res {Object} response info, including
  - status {Number} response status
  - headers {Object} response headers
  - size {Number} response size
  - rt {Number} request total use time (ms)

example:

```js
const result = await store.getSymlink('ossdemo.txt')
console.log(result.targetName)
```

for history object

```js
const versionId = 'object versionId';
const result = await store.getSymlink('ossdemo.txt', { versionId })
console.log(result.targetName)
```

### .calculatePostSignature(policy)

get postObject params

parameters:

- policy {JSON or Object} policy must contain expiration and conditions.

Success will return postObject Api params.

Object:

- OSSAccessKeyId {String}
- Signature {String}
- policy {Object} response info

### .getObjectTagging(name[, options])

Obtains the tags of an object.

parameters:

- name {String} the object name
- [options] {Object} optional args
  - [versionId] {String} the version id of history object

Success will return the channel information.

object:

- tag {Object} the tag of object
- res {Object} response info

### .putObjectTagging(name, tag[, options])

Configures or updates the tags of an object.

parameters:

- name {String} the object name
- tag {Object} tag, eg. `{var1: value1,var2:value2}`
- [options] {Object} optional args
  - [versionId] {String} the version id of history object

Success will return the channel information.

object:

- status {Number} response status
- res {Object} response info

### .deleteObjectTagging(name[, options])

Deletes the tag of a specified object.

parameters:

- name {String} the object name
- tag {Object} tag, eg. `{var1: value1,var2:value2}`
- [options] {Object} optional args
  - [versionId] {String} the version id of history object

Success will return the channel information.

object:

- status {Number} response status
- res {Object} response info

### .processObjectSave(sourceObject, targetObject, process[, targetBucket])

Persistency indicates that images are asynchronously stored in the specified Bucket

parameters:

- sourceObject {String} source object name
- targetObject {String} target object name
- process {String} process string
- [targetBucket] {String} target bucket

Success will return the channel information.

object:

- status {Number} response status
- res {Object} response info

```js
const sourceObject = 'a.png'
const targetObject = 'b.png'
const process = 'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00'

await this.store.processObjectSave(sourceObject, targetObject, process);
```

## Known Errors

Each error return by OSS server will contains these properties:

- name {String} error name
- message {String} error message
- requestId {String} uuid for this request, if you meet some unhandled problem,
    you can send this request id to OSS engineer to find out what's happend.
- hostId {String} OSS cluster name for this request

The following table lists the OSS error codes:

[More code info](https://help.aliyun.com/knowledge_detail/32005.html)

code | status | message | message in Chinese
---  | --- | ---     | ---
AccessDenied | 403 | Access Denied | 拒绝访问
BucketAlreadyExists | 409 | Bucket already exists | Bucket 已经存在
BucketNotEmpty | 409 | Bucket is not empty | Bucket 不为空
RestoreAlreadyInProgress | 409 | The restore operation is in progress. | restore 操作正在进行中
OperationNotSupported | 400 | The operation is not supported for this resource | 该资源暂不支持restore操作
EntityTooLarge | 400 | Entity too large | 实体过大
EntityTooSmall | 400 | Entity too small | 实体过小
FileGroupTooLarge | 400 | File group too large | 文件组过大
InvalidLinkName | 400 | Link name can't be the same as the object name | Object Link 与指向的 Object 同名
LinkPartNotExist | 400 | Can't link to not exists object | Object Link 中指向的 Object 不存在
ObjectLinkTooLarge | 400 | Too many links to this object | Object Link 中 Object 个数过多
FieldItemTooLong | 400 | Post form fields items too large | Post 请求中表单域过大
FilePartInterity | 400 | File part has changed | 文件 Part 已改变
FilePartNotExist | 400 | File part not exists | 文件 Part 不存在
FilePartStale| 400 | File part stale | 文件 Part 过时
IncorrectNumberOfFilesInPOSTRequest | 400 | Post request contains invalid number of files | Post 请求中文件个数非法
InvalidArgument | 400 | Invalid format argument | 参数格式错误
InvalidAccessKeyId | 400 | Access key id not exists | Access Key ID 不存在
InvalidBucketName | 400 | Invalid bucket name | 无效的 Bucket 名字
InvalidDigest | 400 | Invalid digest | 无效的摘要
InvalidEncryptionAlgorithm | 400 | Invalid encryption algorithm | 指定的熵编码加密算法错误
InvalidObjectName | 400 | Invalid object name | 无效的 Object 名字
InvalidPart | 400 | Invalid part | 无效的 Part
InvalidPartOrder | 400 | Invalid part order | 无效的 part 顺序
InvalidPolicyDocument | 400 | Invalid policy document | 无效的 Policy 文档
InvalidTargetBucketForLogging | 400 | Invalid bucket on logging operation | Logging 操作中有无效的目标 bucket
Internal | 500 | OSS server internal error | OSS 内部发生错误
MalformedXML | 400 | Malformed XML format | XML 格式非法
MalformedPOSTRequest | 400 | Invalid post body format | Post 请求的 body 格式非法
MaxPOSTPreDataLengthExceeded | 400 | Post extra data too large | Post 请求上传文件内容之外的 body 过大
MethodNotAllowed | 405 | Not allowed method | 不支持的方法
MissingArgument | 411 | Missing argument | 缺少参数
MissingContentLength | 411 | Missing `Content-Length` header | 缺少内容长度
NoSuchBucket | 404 | Bucket not exists | Bucket 不存在
NoSuchKey | 404 | Object not exists | 文件不存在
NoSuchUpload | 404 | Multipart upload id not exists | Multipart Upload ID 不存在
NotImplemented | 501 | Not implemented | 无法处理的方法
PreconditionFailed | 412 | Pre condition failed | 预处理错误
RequestTimeTooSkewed | 403 | Request time exceeds 15 minutes to server time | 发起请求的时间和服务器时间超出 15 分钟
RequestTimeout | 400 | Request timeout | 请求超时
RequestIsNotMultiPartContent | 400 | Invalid post content-type | Post 请求 content-type 非法
SignatureDoesNotMatch | 403 | Invalid signature | 签名错误
TooManyBuckets | 400 | Too many buckets on this user | 用户的 Bucket 数目超过限制
RequestError | -1 | network error | 网络出现中断或异常
ConnectionTimeoutError | -2 | request connect timeout | 请求连接超时
SecurityTokenExpired | 403 | sts Security Token Expired | sts Security Token 超时失效

## Contributors

[![Contributors](https://contrib.rocks/image?repo=node-modules/oss-client)](https://github.com/node-modules/oss-client/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
