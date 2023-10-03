import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createReadStream, createWriteStream, existsSync, readFileSync } from 'node:fs';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { ObjectMeta } from 'oss-interface';
import urllib, { IncomingHttpHeaders, RawResponseWithMeta } from 'urllib';
import config from './config.js';
import { OSSObject } from '../src/index.js';
import { OSSClientError } from '../src/error/OSSClientError.js';
import { Readable } from 'node:stream';

describe('test/OSSObject.test.ts', () => {
  const tmpdir = os.tmpdir();
  const prefix = config.prefix;
  const ossObject = new OSSObject(config.oss);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  describe('list()', () => {
    // oss.jpg
    // fun/test.jpg
    // fun/movie/001.avi
    // fun/movie/007.avi
    const listPrefix = `${prefix}oss-client/list/`;
    before(async () => {
      await ossObject.put(`${listPrefix}oss.jpg`, Buffer.from('oss.jpg'));
      await ossObject.put(`${listPrefix}fun/test.jpg`, Buffer.from('fun/test.jpg'));
      await ossObject.put(`${listPrefix}fun/movie/001.avi`, Buffer.from('fun/movie/001.avi'));
      await ossObject.put(`${listPrefix}fun/movie/007.avi`, Buffer.from('fun/movie/007.avi'));
      await ossObject.put(`${listPrefix}other/movie/007.avi`, Buffer.from('other/movie/007.avi'));
      await ossObject.put(`${listPrefix}other/movie/008.avi`, Buffer.from('other/movie/008.avi'));
    });

    function checkObjectProperties(obj: ObjectMeta) {
      assert.equal(typeof obj.name, 'string');
      assert.equal(typeof obj.lastModified, 'string');
      assert.equal(typeof obj.etag, 'string');
      assert(obj.type === 'Normal' || obj.type === 'Multipart');
      assert.equal(typeof obj.size, 'number');
      assert.equal(obj.storageClass, 'Standard');
      assert.equal(typeof obj.owner, 'object');
      assert.equal(typeof obj.owner!.id, 'string');
      assert.equal(typeof obj.owner!.displayName, 'string');
    }

    it('should list with query', async () => {
      const result = await ossObject.list();
      assert(result.objects.length > 0);
      // console.log(result.objects);
      result.objects.map(checkObjectProperties);
      assert.equal(typeof result.nextMarker, 'string');
      assert(result.isTruncated);
      assert.deepEqual(result.prefixes, []);
      assert(result.res.headers.date);
      const obj = result.objects[0];
      assert.match(obj.url, /^https:\/\//);
      assert(obj.url.endsWith(`/${obj.name}`));
      assert(obj.owner!.id);
      assert(obj.size > 0);
    });

    it('should list timeout work', async () => {
      await assert.rejects(async () => {
        await ossObject.list({}, { timeout: 1 });
      }, (err: Error) => {
        assert.match(err.message, /Request timeout for 1 ms/);
        assert.equal(err.name, 'HttpClientRequestTimeoutError');
        return true;
      });
    });

    it('should list only 1 object', async () => {
      const result = await ossObject.list({
        'max-keys': 1,
      });
      assert(result.objects.length <= 1);
      result.objects.map(checkObjectProperties);
      assert.equal(typeof result.nextMarker, 'string');
      assert(result.isTruncated);
      assert.deepEqual(result.prefixes, []);
      assert(result.res.headers.date);
      const obj = result.objects[0];
      assert.match(obj.url, /^https:\/\//);
      assert(obj.url.endsWith(`/${obj.name}`));
      assert(obj.owner!.id);
      assert(obj.size > 0);
    });

    it('should list top 3 objects', async () => {
      const result = await ossObject.list({
        'max-keys': 3,
      });
      assert(result.objects.length <= 3);
      result.objects.map(checkObjectProperties);
      assert.equal(typeof result.nextMarker, 'string');
      assert(result.isTruncated);
      assert.deepEqual(result.prefixes, []);

      // next 2
      const result2 = await ossObject.list({
        'max-keys': '2',
        marker: result.nextMarker,
      });
      assert.equal(result2.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(typeof result2.nextMarker, 'string');
      assert(result2.isTruncated);
      assert.deepEqual(result2.prefixes, []);
    });

    it('should list with prefix', async () => {
      let result = await ossObject.list({
        prefix: `${listPrefix}fun/movie/`,
      });
      assert.equal(result.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, []);

      result = await ossObject.list({
        prefix: `${listPrefix}fun/movie`,
      });
      assert.equal(result.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, []);
    });

    it('should list current dir files only', async () => {
      let result = await ossObject.list({
        prefix: listPrefix,
        delimiter: '/',
      });
      assert.equal(result.objects.length, 1);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, [ `${listPrefix}fun/`, `${listPrefix}other/` ]);

      result = await ossObject.list({
        prefix: `${listPrefix}fun/`,
        delimiter: '/',
      });
      assert.equal(result.objects.length, 1);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, [ `${listPrefix}fun/movie/` ]);

      result = await ossObject.list({
        prefix: `${listPrefix}fun/movie/`,
        delimiter: '/',
      });
      assert.equal(result.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, []);
    });
  });

  describe('listV2()', () => {
    const listPrefix = `${prefix}oss-client/listV2/`;
    before(async () => {
      await ossObject.put(`${listPrefix}oss.jpg`, Buffer.from('oss.jpg'));
      await ossObject.put(`${listPrefix}fun/test.jpg`, Buffer.from('fun/test.jpg'));
      await ossObject.put(`${listPrefix}fun/movie/001.avi`, Buffer.from('fun/movie/001.avi'));
      await ossObject.put(`${listPrefix}fun/movie/007.avi`, Buffer.from('fun/movie/007.avi'));
      await ossObject.put(`${listPrefix}other/movie/007.avi`, Buffer.from('other/movie/007.avi'));
      await ossObject.put(`${listPrefix}other/movie/008.avi`, Buffer.from('other/movie/008.avi'));
    });

    function checkObjectProperties(obj: ObjectMeta, options?: { owner: boolean }) {
      assert.equal(typeof obj.name, 'string');
      assert.equal(typeof obj.lastModified, 'string');
      assert.equal(typeof obj.etag, 'string');
      assert(obj.type === 'Normal' || obj.type === 'Multipart');
      assert.equal(typeof obj.size, 'number');
      assert.equal(obj.storageClass, 'Standard');
      if (options?.owner) {
        assert(typeof obj.owner!.id === 'string' && typeof obj.owner!.displayName === 'string');
      } else {
        assert.equal(obj.owner, undefined);
      }
    }

    it('should list top 3 objects', async () => {
      const result = await ossObject.listV2({
        'max-keys': 1,
      });
      assert.equal(result.objects.length, 1);
      result.objects.forEach(obj => checkObjectProperties(obj));
      assert.equal(typeof result.nextContinuationToken, 'string');
      assert(result.isTruncated);
      assert.deepEqual(result.prefixes, []);
      assert.equal(result.keyCount, 1);

      // next 2
      const result2 = await ossObject.listV2({
        'max-keys': '2',
        continuationToken: result.nextContinuationToken,
      });
      assert.equal(result2.objects.length, 2);
      result.objects.forEach(obj => checkObjectProperties(obj));
      assert.equal(typeof result2.nextContinuationToken, 'string');
      assert(result2.isTruncated);
      assert.deepEqual(result2.prefixes, []);
      assert.equal(result2.keyCount, 2);
    });

    it('should list with prefix', async () => {
      let result = await ossObject.listV2({
        prefix: `${listPrefix}fun/movie/`,
        'fetch-owner': true,
      });
      assert.equal(result.objects.length, 2);
      result.objects.forEach(obj => checkObjectProperties(obj, { owner: true }));
      assert.equal(result.nextContinuationToken, undefined);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, []);

      result = await ossObject.listV2({
        prefix: `${listPrefix}fun/movie`,
      });
      assert.equal(result.objects.length, 2);
      result.objects.forEach(obj => checkObjectProperties(obj));
      assert.equal(result.nextContinuationToken, undefined);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, []);
    });

    it('should list current dir files only', async () => {
      let result = await ossObject.listV2({
        prefix: listPrefix,
        delimiter: '/',
      });
      assert.equal(result.objects.length, 1);
      result.objects.forEach(obj => checkObjectProperties(obj));
      assert.equal(result.nextContinuationToken, undefined);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, [ `${listPrefix}fun/`, `${listPrefix}other/` ]);

      result = await ossObject.listV2({
        prefix: `${listPrefix}fun/`,
        delimiter: '/',
      });
      assert.equal(result.objects.length, 1);
      result.objects.forEach(obj => checkObjectProperties(obj));
      assert.equal(result.nextContinuationToken, undefined);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, [ `${listPrefix}fun/movie/` ]);

      result = await ossObject.listV2({
        prefix: `${listPrefix}fun/movie/`,
        delimiter: '/',
      });
      assert.equal(result.objects.length, 2);
      result.objects.forEach(obj => checkObjectProperties(obj));
      assert.equal(result.nextContinuationToken, undefined);
      assert(!result.isTruncated);
      assert.deepEqual(result.prefixes, []);
    });

    it('should list with start-after', async () => {
      let result = await ossObject.listV2({
        'start-after': `${listPrefix}fun`,
        'max-keys': 1,
      });
      assert(result.objects[0].name === `${listPrefix}fun/movie/001.avi`);

      result = await ossObject.listV2({
        'start-after': `${listPrefix}fun/movie/001.avi`,
        'max-keys': 1,
      });
      assert(result.objects[0].name === `${listPrefix}fun/movie/007.avi`);

      result = await ossObject.listV2({
        delimiter: '/',
        prefix: `${listPrefix}fun/movie/`,
        'start-after': `${listPrefix}fun/movie/002.avi`,
      });
      assert(result.objects.length === 1);
      assert(result.objects[0].name === `${listPrefix}fun/movie/007.avi`);

      result = await ossObject.listV2({
        prefix: `${listPrefix}`,
        'max-keys': 5,
        'start-after': `${listPrefix}a`,
        delimiter: '/',
      });
      assert.equal(result.keyCount, 3);
      assert.equal(result.objects.length, 1);
      assert.equal(result.objects[0].name, `${listPrefix}oss.jpg`);
      assert.equal(result.prefixes.length, 2);
      assert.equal(result.prefixes[0], `${listPrefix}fun/`);
      assert.equal(result.prefixes[1], `${listPrefix}other/`);

      result = await ossObject.listV2({
        prefix: `${listPrefix}`,
        'max-keys': 5,
        'start-after': `${listPrefix}oss.jpg`,
        delimiter: '/',
      });
      assert.equal(result.keyCount, 1);
      assert.equal(result.objects.length, 0);
      assert.equal(result.prefixes[0], `${listPrefix}other/`);
    });

    it('should list with continuation-token', async () => {
      let nextContinuationToken: string | undefined;
      let keyCount = 0;
      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await ossObject.listV2({
          prefix: listPrefix,
          'max-keys': 2,
          'continuation-token': nextContinuationToken,
        });
        if (nextContinuationToken) {
          // should has prev index
          assert(result.continuationToken);
        }
        keyCount += result.keyCount;
        nextContinuationToken = result.nextContinuationToken;
      } while (nextContinuationToken);
      assert.equal(keyCount, 6);
    });
  });

  describe('append()', () => {
    const name = `/${prefix}oss-client/oss/append${Date.now()}`;
    afterEach(async () => {
      await ossObject.delete(name);
    });

    it('should append object with content buffer', async () => {
      let object = await ossObject.append(name, Buffer.from('foo'));
      assert.equal(object.res.status, 200);
      assert.equal(object.nextAppendPosition, '3');
      assert.equal(object.res.headers['x-oss-next-append-position'], '3');
      assert(object.url);
      assert(object.name);

      let res = await ossObject.get(name);
      assert.equal(res.content.toString(), 'foo');
      assert.equal(res.res.headers['x-oss-next-append-position'], '3');

      object = await ossObject.append(name, Buffer.from('bar'), {
        position: 3,
      });
      assert.equal(object.res.status, 200);
      assert.equal(object.nextAppendPosition, '6');
      assert.equal(object.res.headers['x-oss-next-append-position'], '6');

      res = await ossObject.get(name);
      assert.equal(res.content.toString(), 'foobar');
      assert.equal(res.res.headers['x-oss-next-append-position'], '6');

      object = await ossObject.append(name, Buffer.from(', ok'), {
        position: '6',
      });
      assert.equal(object.res.status, 200);
      assert.equal(object.nextAppendPosition, '10');
      assert.equal(object.res.headers['x-oss-next-append-position'], '10');

      res = await ossObject.get(name);
      assert.equal(res.content.toString(), 'foobar, ok');
      assert.equal(res.res.headers['x-oss-next-append-position'], '10');
    });

    it('should append object with local file path', async () => {
      const file = path.join(__dirname, 'fixtures/foo.js');
      let object = await ossObject.append(name, file);
      assert.equal(object.nextAppendPosition, '16');

      object = await ossObject.append(name, file, { position: 16 });
      assert.equal(object.nextAppendPosition, '32');
    });

    it('should append object with readstream', async () => {
      const file = path.join(__dirname, 'fixtures/foo.js');
      let object = await ossObject.append(name, createReadStream(file));
      assert.equal(object.nextAppendPosition, '16');

      object = await ossObject.append(name, createReadStream(file), {
        position: 16,
      });
      assert.equal(object.nextAppendPosition, '32');
    });

    it('should error when position not match', async () => {
      await ossObject.append(name, Buffer.from('foo'));
      await assert.rejects(async () => {
        await ossObject.append(name, Buffer.from('foo'));
      }, (err: OSSClientError) => {
        assert.equal(err.name, 'OSSClientError');
        assert.equal(err.code, 'PositionNotEqualToLength');
        assert.equal(err.status, 409);
        assert.match(err.message, /Position is not equal to file length/);
        return true;
      });
    });

    it('should use nextAppendPosition to append next', async () => {
      let object = await ossObject.append(name, Buffer.from('foo'));
      assert.equal(object.nextAppendPosition, '3');

      object = await ossObject.append(name, Buffer.from('bar'), {
        position: object.nextAppendPosition,
      });

      object = await ossObject.append(name, Buffer.from(', baz'), {
        position: object.nextAppendPosition,
      });
      assert.equal(object.nextAppendPosition, '11');

      const res = await ossObject.get(name);
      assert.equal(res.content.toString(), 'foobar, baz');
      assert.equal(res.res.headers['x-oss-next-append-position'], '11');
    });
  });

  describe('put()', () => {
    let name: string;
    afterEach(async () => {
      await ossObject.delete(name);
    });

    it('should add object with local file path', async () => {
      name = `${prefix}oss-client/oss/put-localfile-${randomUUID()}.js`;
      // put not exists name
      const object = await ossObject.put(name, __filename);
      assert.equal(object.res.status, 200);
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.res.size, 0);
      assert.equal(object.name, name);

      // put exists name
      const object2 = await ossObject.put(name, __filename);
      assert.equal(object.res.status, 200);
      assert.equal(typeof object2.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object2.res.rt, 'number');
      assert.equal(object2.res.size, 0);
      assert.equal(object2.name, name);

      // put with callback fail
      await assert.rejects(async () => {
        await ossObject.put(name, __filename, {
          callback: {
            url: 'https://help.aliyun.com/zh/oss/support/0007-00000205',
            body: 'foo=bar',
          },
        });
      }, (err: OSSClientError) => {
        assert.equal(err.name, 'OSSClientError');
        assert.equal(err.code, 'CallbackFailed');
        assert(err.hostId);
        assert(err.requestId);
        assert.match(err.message, /\[request-id=\w+, response-code=CallbackFailed, response-host=oss-client-unittest-china.oss-cn-hangzhou.aliyuncs.com] Response body is not valid json format\./);
        return true;
      });

      // delete the new file
      const result = await ossObject.delete(name);
      assert.equal(result.res.status, 204);
    });

    it('should add object with content buffer', async () => {
      name = `${prefix}oss-client/oss/put-buffer`;
      const object = await ossObject.put(`/${name}`, Buffer.from('foo content'));
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.name, name);
    });

    it('should add object with readstream', async () => {
      name = `${prefix}oss-client/oss/put-readstream`;
      const object = await ossObject.put(name, createReadStream(__filename));
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(typeof object.res.headers.etag, 'string');
      assert.equal(object.name, name);
    });

    it('should add object with Readable', async () => {
      name = `${prefix}oss-client/oss/put-Readable`;
      async function* generate() {
        yield 'Hello, ';
        yield '你好 OSS';
      }
      const readable = Readable.from(generate());
      const object = await ossObject.put(name, readable, {
        headers: {
          'content-length': Buffer.byteLength('Hello, 你好 OSS', 'utf-8').toString(),
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(typeof object.res.headers.etag, 'string');
      assert.equal(object.name, name);
      const result = await ossObject.get(name);
      assert.equal(result.content.toString(), 'Hello, 你好 OSS');
    });

    it('should add object with meta', async () => {
      name = `${prefix}oss-client/oss/put-meta.js`;
      const object = await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.res.size, 0);
      assert.equal(object.name, name);

      const info = await ossObject.head(name);
      assert.deepEqual(info.meta, {
        uid: '1',
        slus: 'test.html',
      });
      assert.equal(info.status, 200);
    });

    it('should set Content-Disposition with ascii name', async () => {
      name = `${prefix}oss-client/oss/put-Content-Disposition.js`;
      const object = await ossObject.put(name, __filename, {
        headers: {
          'Content-Disposition': 'ascii-name.js',
        },
      });
      assert(object.name, name);
      const info = await ossObject.head(name);
      assert.equal(info.res.headers['content-disposition'], 'ascii-name.js');
    });

    it('should set Content-Disposition with no-ascii name', async () => {
      name = `${prefix}oss-client/oss/put-Content-Disposition.js`;
      const object = await ossObject.put(name, __filename, {
        headers: {
          'Content-Disposition': encodeURIComponent('non-ascii-名字.js'),
        },
      });
      assert(object.name, name);
      const info = await ossObject.head(name);
      assert.equal(info.res.headers['content-disposition'], 'non-ascii-%E5%90%8D%E5%AD%97.js');
    });

    it('should set Expires', async () => {
      name = `${prefix}oss-client/oss/put-Expires.js`;
      const object = await ossObject.put(name, __filename, {
        headers: {
          Expires: '1000000',
        },
      });
      assert(object.name, name);
      const info = await ossObject.head(name);
      assert.equal(info.res.headers.expires, '1000000');
    });

    it('should set custom Content-Type', async () => {
      name = `${prefix}oss-client/oss/put-Content-Type.js`;
      const object = await ossObject.put(name, __filename, {
        headers: {
          'Content-Type': 'text/plain; charset=gbk',
        },
      });
      assert(object.name, name);
      const info = await ossObject.head(name);
      assert.equal(info.res.headers['content-type'], 'text/plain; charset=gbk');
    });

    it('should set custom content-type lower case', async () => {
      name = `${prefix}oss-client/oss/put-content-type.js`;
      const object = await ossObject.put(name, __filename, {
        headers: {
          'content-type': 'application/javascript; charset=utf8',
        },
      });
      assert(object.name, name);
      const info = await ossObject.head(name);
      assert.equal(info.res.headers['content-type'], 'application/javascript; charset=utf8');
    });

    it('should set custom Content-MD5 and ignore case', async () => {
      name = `test-md5-${Date.now()}.js`;
      const content = Buffer.alloc(1024 * 4);
      const MD5Value = createHash('md5').update(content).digest('base64');
      await ossObject.put(name, content, {
        headers: {
          'Content-MD5': MD5Value,
        },
      });
      await ossObject.put(name, content, {
        headers: {
          'content-Md5': MD5Value,
        },
      });
    });

    it('should return correct encode when name include + and space', async () => {
      name = `${prefix}ali-sdkhahhhh+oss+mm xxx.js`;
      const object = await ossObject.put(name, __filename, {
        headers: {
          'Content-Type': 'text/plain; charset=gbk',
        },
      });
      assert(object.name, name);
      const info = await ossObject.head(name);
      const url = (info.res as any).requestUrls[0];
      const urlObject = new URL(url);
      assert.equal(urlObject.pathname, `/${prefix}ali-sdkhahhhh%2Boss%2Bmm%20xxx.js`);
      assert.equal(info.res.headers['content-type'], 'text/plain; charset=gbk');
    });

    it('should work with x-oss-forbid-overwrite header to not allow put same name file', async () => {
      const body = Buffer.from('san');
      name = `${prefix}put/testsan`;
      const resultPut = await ossObject.put(name, body);
      assert.equal(resultPut.res.status, 200);
      await assert.rejects(async () => {
        await ossObject.put(name, body, {
          headers: { 'x-oss-forbid-overwrite': 'true' },
        });
      }, (err: OSSClientError) => {
        assert.equal(err.name, 'OSSClientError');
        assert.equal(err.code, 'FileAlreadyExists');
        assert.match(err.message, /The object you specified already exists and can not be overwritten\./);
        return true;
      });
    });

    it('should throw error when path is not file ', async () => {
      const file = __dirname;
      name = `${prefix}put/testpathnotfile`;
      await assert.rejects(async () => {
        await ossObject.put(name, file);
      }, (err: Error) => {
        assert.equal(`${__dirname} is not file`, err.message);
        return true;
      });
    });
  });

  describe('putStream()', () => {
    let name: string;
    afterEach(async () => {
      await ossObject.delete(name);
    });

    it('should add object with streaming way', async () => {
      name = `${prefix}oss-client/oss/putStream-localfile.js`;
      const object = await ossObject.putStream(name, createReadStream(__filename));
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.res.size, 0);
      assert.equal(object.name, name);
      assert(object.url);

      // check content
      const r = await ossObject.get(name);
      assert.equal(r.res.headers['content-type'], 'application/javascript');
      const stats = await stat(__filename);
      assert.equal(r.res.headers['content-length'], `${stats.size}`);
      assert.equal(r.res.status, 200);
      assert((r.res as RawResponseWithMeta).timing.contentDownload > 0);
      assert(r.content);
      assert.equal(r.content.toString(), await readFile(__filename, 'utf8'));
    });

    it('should add image with file streaming way', async () => {
      name = `${prefix}oss-client/oss/nodejs-1024x768.png`;
      const imagePath = path.join(__dirname, 'nodejs-1024x768.png');
      const object = await ossObject.putStream(name, createReadStream(imagePath), {
        mime: 'image/png',
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.res.size, 0);
      assert.equal(object.name, name);

      // check content
      const r = await ossObject.get(name);
      // console.log(r.res.headers);
      // {
      //   server: 'AliyunOSS',
      //   date: 'Sat, 22 Oct 2022 13:25:55 GMT',
      //   'content-type': 'image/png',
      //   'content-length': '502182',
      //   connection: 'keep-alive',
      //   'x-oss-request-id': '6353EF633DE20A809D8088EA',
      //   'accept-ranges': 'bytes',
      //   etag: '"39D12ED73B63BAAC31F980F555AE4FDE"',
      //   'last-modified': 'Sat, 22 Oct 2022 13:25:55 GMT',
      //   'x-oss-object-type': 'Normal',
      //   'x-oss-hash-crc64ecma': '8835162692478804631',
      //   'x-oss-storage-class': 'Standard',
      //   'content-md5': 'OdEu1ztjuqwx+YD1Va5P3g==',
      //   'x-oss-server-time': '14'
      // }
      assert.equal(r.res.status, 200);
      assert.equal(r.res.headers['content-type'], 'image/png');
      const buf = await readFile(imagePath);
      assert.equal(r.res.headers['content-length'], `${buf.length}`);
      assert(r.content);
      assert.equal(r.content.length, buf.length);
      assert.deepEqual(r.content, buf);
    });

    it('should put object with http streaming way', async () => {
      name = `${prefix}oss-client/oss/nodejs-1024x768.png`;
      const nameCpy = `${prefix}oss-client/oss/nodejs-1024x768`;
      const imagePath = path.join(__dirname, 'nodejs-1024x768.png');
      await ossObject.putStream(name, createReadStream(imagePath), { mime: 'image/png' });
      const signUrl = ossObject.signatureUrl(name, { expires: 3600 });
      const { res: httpStream, status } = await urllib.request(signUrl, {
        dataType: 'stream',
      });
      assert.equal(httpStream.headers['content-type'], 'image/png');
      assert.equal(httpStream.headers['content-length'], '502182');
      assert.equal(status, 200);
      const putResult = await ossObject.putStream(nameCpy, httpStream);
      assert.equal(putResult.res.status, 200);
      const getResult = await ossObject.get(nameCpy);
      assert.equal(getResult.res.status, 200);
      assert.equal(getResult.res.headers['content-type'], 'application/octet-stream');
      assert.equal(getResult.res.headers['content-length'], httpStream.headers['content-length']);
      assert.equal(getResult.res.headers.etag, putResult.res.headers.etag);
      assert.equal(getResult.res.headers.etag, httpStream.headers.etag);
    });

    it('should add very big file: 4mb with streaming way', async () => {
      name = `${prefix}oss-client/oss/bigfile-4mb.bin`;
      const bigFile = path.join(tmpdir, 'bigfile-4mb.bin');
      await writeFile(bigFile, Buffer.alloc(4 * 1024 * 1024).fill('a\n'));
      const object = await ossObject.putStream(name, createReadStream(bigFile));
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.res.size, 0);
      assert.equal(object.name, name);

      // check content
      const r = await ossObject.get(name);
      assert.equal(r.res.status, 200);
      assert.equal(r.res.headers['content-type'], 'application/octet-stream');
      assert.equal(r.res.size, 4 * 1024 * 1024);
      const buf = await readFile(bigFile);
      assert(r.content);
      assert.equal(r.content.length, buf.length);
      assert.deepEqual(r.content, buf);
    });

    it('should throw error with stream destroy', async () => {
      name = `${prefix}oss-client/oss/putStream-source-destroy.js`;
      await assert.rejects(async () => {
        const readerStream = createReadStream(`${__filename}.notexists.js`);
        await ossObject.putStream(name, readerStream);
      }, (err: any) => {
        assert.strictEqual(err.status, -1);
        return true;
      });
    });
  });

  describe('putMeta()', () => {
    let name: string;
    before(async () => {
      name = `${prefix}oss-client/oss/putMeta.js`;
      const object = await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should update exists object meta', async () => {
      await ossObject.putMeta(name, {
        uid: '2',
      });
      const info = await ossObject.head(name);
      assert.equal(info.meta.uid, '2');
      assert(!info.meta.pid);
      assert(!info.meta.slus);
    });

    it('should throw NoSuchKeyError when update not exists object meta', async () => {
      await assert.rejects(async () => {
        await ossObject.putMeta(`${name}not-exists`, {
          uid: '2',
        });
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        assert.equal(err.status, 404);
        return true;
      });
    });
  });

  describe('putACL(), getACL()', () => {
    let name: string;
    after(async () => {
      await ossObject.delete(name);
    });

    it('should put and get object ACL', async () => {
      name = `${prefix}object/acl`;
      const r1 = await ossObject.put(name, Buffer.from('hello world'));
      assert.equal(r1.res.status, 200);

      const r2 = await ossObject.getACL(name);
      assert.equal(r2.res.status, 200);
      assert.equal(r2.acl, 'default');
      assert(r2.owner);
      assert(r2.owner.displayName);
      assert(r2.owner.id);

      const r3 = await ossObject.putACL(name, 'public-read');
      assert.equal(r3.res.status, 200);

      const r4 = await ossObject.getACL(name);
      assert.equal(r4.res.status, 200);
      assert.equal(r4.acl, 'public-read');

      const r5 = await ossObject.get(name);
      assert.equal(r5.res.status, 200);
      assert.deepEqual(r5.content, Buffer.from('hello world'));
    });
  });

  describe('delete()', () => {
    it('should delete exists object', async () => {
      const name = `${prefix}oss-client/oss/delete.js`;
      await ossObject.put(name, __filename);

      const info = await ossObject.delete(name);
      assert.equal(info.res.status, 204);
      assert.equal(info.status, 204);

      // await utils.throws(async () => {
      //   await store.head(name);
      // }, 'NoSuchKeyError');
    });

    it('should delete not exists object', async () => {
      const info = await ossObject.delete(`not-exists-name-${randomUUID()}`);
      assert.equal(info.res.status, 204);
    });
  });

  describe('deleteMulti()', () => {
    const names: string[] = [];
    beforeEach(async () => {
      let name = `${prefix}oss-client/oss/deleteMulti0.js`;
      names.push(name);
      await ossObject.put(name, __filename);

      name = `${prefix}oss-client/oss/deleteMulti1.js`;
      names.push(name);
      await ossObject.put(name, __filename);

      name = `${prefix}oss-client/oss/deleteMulti2.js`;
      names.push(name);
      await ossObject.put(name, __filename);
    });

    after(async () => {
      for (const name of names) {
        await ossObject.delete(name);
      }
    });

    it('should delete 3 exists objs', async () => {
      const result = await ossObject.deleteMulti(names);
      assert.deepEqual(
        result.deleted.map(v => v.Key),
        names,
      );
      assert.equal(result.res.status, 200);
    });

    it('should delete 2 exists and 2 not exists objs', async () => {
      const result = await ossObject.deleteMulti(names.slice(0, 2).concat([ 'not-exist1', 'not-exist2' ]));
      assert.deepEqual(
        result.deleted.map(v => v.Key),
        names.slice(0, 2).concat([ 'not-exist1', 'not-exist2' ]),
      );
      assert.equal(result.res.status, 200);
    });

    it('should delete 1 exists objs', async () => {
      const result = await ossObject.deleteMulti(names.slice(0, 1));
      assert.deepEqual(
        result.deleted.map(v => v.Key),
        names.slice(0, 1),
      );
      assert.equal(result.res.status, 200);
    });

    it('should delete in quiet mode', async () => {
      const result = await ossObject.deleteMulti(names, {
        quiet: true,
      });
      assert.equal(result.deleted.length, 0);
      assert.equal(result.res.status, 200);
    });
  });

  describe('head()', () => {
    let name: string;
    let resHeaders: IncomingHttpHeaders;
    before(async () => {
      name = `${prefix}oss-client/oss/head-meta.js`;
      const object = await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      resHeaders = object.res.headers;
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should head not exists object throw NoSuchKey', async () => {
      await assert.rejects(async () => {
        await ossObject.head(`${name}not-exists`);
      }, (err: OSSClientError) => {
        assert.equal(err.name, 'OSSClientError');
        assert.equal(err.code, 'NoSuchKey');
        assert.equal(err.status, 404);
        assert.equal(typeof err.requestId, 'string');
        return true;
      });
    });

    it('should head exists object with If-Modified-Since < object modified time', async () => {
      const lastYear = new Date(resHeaders.date!);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const info = await ossObject.head(name, {
        headers: {
          'If-Modified-Since': lastYear.toUTCString(),
        },
      });
      assert.equal(info.status, 200);
      assert(info.meta);
      assert.deepEqual(info.meta, { pid: '123', slus: 'test.html', uid: '1' });
    });

    it('should head exists object with If-Modified-Since = object modified time', async () => {
      const info = await ossObject.head(name, {
        headers: {
          'If-Modified-Since': resHeaders.date,
        },
      });
      assert.equal(info.status, 304);
      assert.deepEqual(info.meta, { pid: '123', slus: 'test.html', uid: '1' });
    });

    it('should head exists object with If-Modified-Since > object modified time', async () => {
      const nextYear = new Date(resHeaders.date!);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const info = await ossObject.head(name, {
        headers: {
          'If-Modified-Since': nextYear.toUTCString(),
        },
      });
      assert.equal(info.status, 304);
      assert.deepEqual(info.meta, { pid: '123', slus: 'test.html', uid: '1' });
    });

    it('should head exists object with If-Unmodified-Since < object modified time', async () => {
      const lastYear = new Date(resHeaders.date!);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      await assert.rejects(async () => {
        await ossObject.head(name, {
          headers: {
            'If-Unmodified-Since': lastYear.toUTCString(),
          },
        });
      }, (err: OSSClientError) => {
        assert.equal(err.name, 'OSSClientError');
        assert.equal(err.code, 'PreconditionFailed');
        assert.equal(err.status, 412);
        return true;
      });
    });

    it('should head exists object with If-Unmodified-Since = object modified time', async () => {
      const info = await ossObject.head(name, {
        headers: {
          'If-Unmodified-Since': resHeaders.date,
        },
      });
      assert.equal(info.status, 200);
      assert(info.meta);
    });

    it('should head exists object with If-Unmodified-Since > object modified time', async () => {
      const nextYear = new Date(resHeaders.date!);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const info = await ossObject.head(name, {
        headers: {
          'If-Unmodified-Since': nextYear.toUTCString(),
        },
      });
      assert.equal(info.status, 200);
      assert(info.meta);
    });

    it('should head exists object with If-Match equal etag', async () => {
      const info = await ossObject.head(name, {
        headers: {
          'If-Match': resHeaders.etag,
        },
      });
      assert.equal(info.meta.uid, '1');
      assert.equal(info.meta.pid, '123');
      assert.equal(info.meta.slus, 'test.html');
      assert.equal(info.status, 200);
    });

    it('should head exists object with If-Match not equal etag', async () => {
      await assert.rejects(async () => {
        await ossObject.head(name, {
          headers: {
            'If-Match': '"foo-etag"',
          },
        });
      }, (err: OSSClientError) => {
        assert.equal(err.name, 'OSSClientError');
        assert.equal(err.code, 'PreconditionFailed');
        assert.equal(err.status, 412);
        return true;
      });
    });

    it('should head exists object with If-None-Match equal etag', async () => {
      const info = await ossObject.head(name, {
        headers: {
          'If-None-Match': resHeaders.etag,
        },
      });
      assert(info.meta);
      assert.equal(info.status, 304);
    });

    it('should head exists object with If-None-Match not equal etag', async () => {
      const info = await ossObject.head(name, {
        headers: {
          'If-None-Match': '"foo-etag"',
        },
      });
      assert.equal(info.meta.uid, '1');
      assert.equal(info.meta.pid, '123');
      assert.equal(info.meta.slus, 'test.html');
      assert.equal(info.status, 200);
    });
  });

  describe('signatureUrl()', () => {
    let name: string;
    let needEscapeName: string;
    before(async () => {
      name = `${prefix}oss-client/oss/signatureUrl.js`;
      let object = await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');

      needEscapeName = `${prefix}oss-client/oss/%3get+meta-signatureUrl.js`;
      object = await ossObject.put(needEscapeName, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should signature url get object ok', async () => {
      const result = await ossObject.get(name);
      const url = ossObject.signatureUrl(name);
      const urlRes = await urllib.request(url);
      assert.equal(urlRes.status, 200);
      assert.equal(urlRes.data.toString(), result.content.toString());
    });

    it('should signature url with response limitation', () => {
      const response = {
        'content-type': 'xml',
        'content-language': 'zh-cn',
      };
      const url = ossObject.signatureUrl(name, { response });
      assert(url.includes('response-content-type=xml'));
      assert(url.includes('response-content-language=zh-cn'));
    });

    it('should signature url with options contains other parameters', async () => {
      const options = {
        expires: 3600,
        subResource: {
          'x-oss-process': 'image/resize,w_20',
        },
        // others parameters
        filename: 'test.js',
        testParameters: 'xxx',
      };
      const imageName = `${prefix}oss-client/oss/nodejs-test-signature-1024x768.png`;
      const originImagePath = path.join(__dirname, 'nodejs-1024x768.png');
      await ossObject.put(imageName, originImagePath, {
        mime: 'image/png',
      });

      const signUrl = ossObject.signatureUrl(imageName, options);
      assert.match(signUrl, /x-oss-process=image%2Fresize%2Cw_20/);
      const urlRes = await urllib.request(signUrl);
      assert.equal(urlRes.status, 200);
    });

    it('should signature url with image processed and get object ok', async () => {
      const imageName = `${prefix}oss-client/oss/nodejs-test-signature-1024x768.png`;
      const originImagePath = path.join(__dirname, 'nodejs-1024x768.png');
      await ossObject.put(imageName, originImagePath, {
        mime: 'image/png',
      });

      const signUrl = ossObject.signatureUrl(imageName, { expires: 3600, process: 'image/resize,w_200' });
      assert.match(signUrl, /x-oss-process=image%2Fresize%2Cw_200/);
      const urlRes = await urllib.request(signUrl);
      assert.equal(urlRes.status, 200);
    });

    it('should signature url for PUT', async () => {
      const putString = 'Hello World';
      const contentMD5 = createHash('md5').update(Buffer.from(putString, 'utf8')).digest('base64');
      const url = ossObject.signatureUrl(name, {
        method: 'PUT',
        'Content-Type': 'text/plain; charset=UTF-8',
        'Content-Md5': contentMD5,
      });
      const headers = {
        'Content-Type': 'text/plain; charset=UTF-8',
        'Content-MD5': contentMD5,
      };
      // console.log('%o', url);
      const res = await urllib.request<string>(url, { method: 'PUT', data: putString, headers, dataType: 'text' });
      // console.log(res.data);
      assert.equal(res.status, 200);
      const headRes = await ossObject.head(name);
      assert.equal(headRes.status, 200);
      assert.equal(headRes.res.headers.etag,
        `"${Buffer.from(contentMD5, 'base64').toString('hex').toUpperCase()}"`);
    });

    it('should signature url get need escape object ok', async () => {
      const result = await ossObject.get(needEscapeName);
      const url = ossObject.signatureUrl(needEscapeName);
      const urlRes = await urllib.request(url);
      assert.equal(urlRes.data.toString(), result.content.toString());
    });

    it('should signature url with custom host ok', async () => {
      const tempStore = new OSSObject({
        ...config.oss,
        endpoint: 'http://www.aliyun.com',
      });

      const url = tempStore.signatureUrl(name);
      // http://${bucket}.www.aliyun.com/darwin-v4.4.2/oss-client/oss/get-meta.js?OSSAccessKeyId=
      assert.match(url, /http:\/\/.+?\.www\.aliyun.com\//);
    });

    it('should signature url with traffic limit', async () => {
      const limitName = `${prefix}oss-client/oss/trafficLimit.js`;
      const size = 1 * 1024 * 1024;
      const content1mb = Buffer.alloc(size).fill('a\n');

      let url = ossObject.signatureUrl(limitName, {
        trafficLimit: 8 * 1024 * 100 * 4,
        method: 'PUT',
      });
      let result = await urllib.request(url, {
        method: 'PUT',
        content: content1mb,
        timeout: 600000,
      });
      assert.equal(200, result.status);

      url = ossObject.signatureUrl(limitName, {
        trafficLimit: 8 * 1024 * 100 * 4,
      });
      result = await urllib.request(url, {
        timeout: 600000,
      });
      assert.equal(200, result.status);
      assert.equal(result.headers['content-length'], size.toString());
    });
  });

  describe('get()', () => {
    let name: string;
    let resHeaders: IncomingHttpHeaders;
    let needEscapeName: string;
    before(async () => {
      name = `${prefix}oss-client/oss/get-meta.js`;
      let object = await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      resHeaders = object.res.headers;

      needEscapeName = `${prefix}oss-client/oss/%3get+meta.js`;
      object = await ossObject.put(needEscapeName, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should store object to local file', async () => {
      const savePath = path.join(tmpdir, name.replace(/\//g, '-'));
      const result = await ossObject.get(name, savePath);
      assert.equal(result.res.status, 200);
      assert(!(result.res as any).requestUrls[0].includes('response-cache-control=no-cache'));
      assert.equal((await stat(savePath)).size, (await stat(__filename)).size);
    });

    it('should escape uri path ok', async () => {
      const savePath = path.join(tmpdir, needEscapeName.replace(/\//g, '-'));
      const result = await ossObject.get(needEscapeName, savePath);
      assert.equal(result.res.status, 200);
      assert.equal((await stat(savePath)).size, (await stat(__filename)).size);
    });

    it.skip('should throw error when save path parent dir not exists', async () => {
      const savePath = path.join(tmpdir, 'not-exists', name.replace(/\//g, '-'));
      await assert.rejects(async () => {
        await ossObject.get(name, savePath);
      }, (err: Error) => {
        assert(err.message.includes('ENOENT'));
        return true;
      });
    });

    it('should store object to writeStream', async () => {
      const savePath = path.join(tmpdir, name.replace(/\//g, '-'));
      const result = await ossObject.get(name, createWriteStream(savePath));
      assert.equal(result.res.status, 200);
      assert.equal((await stat(savePath)).size, (await stat(__filename)).size);
    });

    it('should store not exists object to file', async () => {
      const savePath = path.join(tmpdir, name.replace(/\//g, '-'));
      await assert.rejects(async () => {
        await ossObject.get(`${name}not-exists`, savePath);
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        assert.equal(err.status, 404);
        assert(!existsSync(savePath));
        return true;
      });
    });

    it.skip('should throw error when writeStream emit error', async () => {
      const savePath = path.join(tmpdir, 'not-exists-dir', name.replace(/\//g, '-'));
      await assert.rejects(async () => {
        await ossObject.get(name, createWriteStream(savePath));
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        assert.equal(err.status, 404);
        assert(!existsSync(savePath));
        return true;
      });
    });

    it('should get object content buffer', async () => {
      let result = await ossObject.get(name);
      assert(Buffer.isBuffer(result.content), 'content should be Buffer');
      assert(result.content.toString().includes('oss-client/oss/get-meta.js'));

      result = await ossObject.get(name, undefined);
      assert(Buffer.isBuffer(result.content), 'content should be Buffer');
      assert(result.content.toString().includes('oss-client/oss/get-meta.js'));
    });

    it('should get object content buffer with image process', async () => {
      const imageName = `${prefix}oss-client/oss/nodejs-test-get-image-1024x768.png`;
      const originImagePath = path.join(__dirname, 'nodejs-1024x768.png');
      path.join(__dirname, 'nodejs-processed-w200.png');
      await ossObject.put(imageName, originImagePath, {
        mime: 'image/png',
      });

      let result = await ossObject.get(imageName, { process: 'image/resize,w_200' });
      assert.equal(result.res.status, 200);
      assert(Buffer.isBuffer(result.content), 'content should be Buffer');
      // assert.deepEqual(result.content == fs.readFileSync(processedImagePath),
      //   'get content should be same as test/nodejs-processed-w200.png');

      // it should use the value of process
      // when 'subres.x-oss-process' coexists with 'process'.
      result = await ossObject.get(imageName, {
        process: 'image/resize,w_200',
        subres: { 'x-oss-process': 'image/resize,w_100' },
      });
      assert.equal(result.res.status, 200);
      assert(Buffer.isBuffer(result.content), 'content should be Buffer');
    });

    it('should throw NoSuchKeyError when object not exists', async () => {
      await assert.rejects(async () => {
        await ossObject.get('not-exists-key');
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        assert.equal(err.status, 404);
        assert.equal(typeof err.requestId, 'string');
        assert.match(err.message, /The specified key does not exist\./);
        return true;
      });
    });

    describe('If-Modified-Since header', () => {
      it('should 200 when If-Modified-Since < object modified time', async () => {
        const lastYear = new Date(resHeaders.date!);
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        const result = await ossObject.get(name, {
          headers: {
            'If-Modified-Since': lastYear.toUTCString(),
          },
        });
        assert(Buffer.isBuffer(result.content), 'content should be Buffer');
        assert(result.content.toString().indexOf('oss-client/oss/get-meta.js') > 0);
        assert.equal(result.res.status, 200);
      });

      it('should 304 when If-Modified-Since = object modified time', async () => {
        const result = await ossObject.get(name, {
          headers: {
            'If-Modified-Since': resHeaders.date,
          },
        });
        assert(Buffer.isBuffer(result.content), 'content should be Buffer');
        assert.equal(result.content.length, 0);
        assert.equal(result.res.status, 304);
      });

      it('should 304 when If-Modified-Since > object modified time', async () => {
        const nextYear = new Date(resHeaders.date!);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const result = await ossObject.get(name, {
          headers: {
            'If-Modified-Since': nextYear.toUTCString(),
          },
        });
        assert(Buffer.isBuffer(result.content), 'content should be Buffer');
        assert.equal(result.content.length, 0);
        assert.equal(result.res.status, 304);
      });
    });

    describe('If-Unmodified-Since header', () => {
      it('should throw PreconditionFailedError when If-Unmodified-Since < object modified time', async () => {
        const lastYear = new Date(resHeaders.date!);
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        await assert.rejects(async () => {
          await ossObject.get(name, {
            headers: {
              'If-Unmodified-Since': lastYear.toUTCString(),
            },
          });
        }, (err: OSSClientError) => {
          assert.equal(err.status, 412);
          assert.equal(err.code, 'PreconditionFailed');
          assert.match(err.message,
            /At least one of the pre-conditions you specified did not hold. \(condition=If-Unmodified-Since\)/);
          assert.equal(typeof err.requestId, 'string');
          assert.equal(typeof err.hostId, 'string');
          return true;
        });
      });

      it('should 200 when If-Unmodified-Since = object modified time', async () => {
        const result = await ossObject.get(name, {
          headers: {
            'If-Unmodified-Since': resHeaders.date,
          },
        });
        assert.equal(result.res.status, 200);
        assert(Buffer.isBuffer(result.content), 'content should be Buffer');
        assert(result.content.toString().indexOf('oss-client/oss/get-meta.js') > 0);
      });

      it('should 200 when If-Unmodified-Since > object modified time', async () => {
        const nextYear = new Date(resHeaders.date!);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const result = await ossObject.get(name, {
          headers: {
            'If-Unmodified-Since': nextYear.toUTCString(),
          },
        });
        assert.equal(result.res.status, 200);
        assert(Buffer.isBuffer(result.content), 'content should be Buffer');
        assert(result.content.toString().indexOf('oss-client/oss/get-meta.js') > 0);
      });
    });

    describe('If-Match header', () => {
      it('should 200 when If-Match equal object etag', async () => {
        const result = await ossObject.get(name, {
          headers: {
            'If-Match': resHeaders.etag,
          },
        });
        assert.equal(result.res.status, 200);
      });

      it('should throw PreconditionFailedError when If-Match not equal object etag', async () => {
        await assert.rejects(async () => {
          await ossObject.get(name, {
            headers: {
              'If-Match': 'foo',
            },
          });
        }, (err: OSSClientError) => {
          assert.equal(err.code, 'PreconditionFailed');
          assert.equal(err.status, 412);
          return true;
        });
      });
    });

    describe('If-None-Match header', () => {
      it('should 200 when If-None-Match not equal object etag', async () => {
        const result = await ossObject.get(name, {
          headers: {
            'If-None-Match': 'foo',
          },
        });
        assert.equal(result.res.status, 200);
      });

      it('should 304 when If-None-Match equal object etag', async () => {
        const result = await ossObject.get(name, {
          headers: {
            'If-None-Match': resHeaders.etag,
          },
        });
        assert.equal(result.res.status, 304);
        assert.equal(result.content.length, 0);
      });
    });

    describe('Range header', () => {
      it('should work with Range header and get top 10 bytes content', async () => {
        const content = Buffer.from('aaaaaaaaaabbbbbbbbbb');
        await ossObject.put('range-header-test', content);
        const result = await ossObject.get('range-header-test', {
          headers: {
            Range: 'bytes=0-9',
          },
        });
        assert.equal(result.res.headers['content-length'], '10');
        assert(Buffer.isBuffer(result.content), 'content should be Buffer');
        assert.equal(result.content.toString(), 'aaaaaaaaaa');
      });
    });
  });

  describe('getStream()', () => {
    let name: string;
    before(async () => {
      name = `${prefix}oss-client/oss/get-stream.js`;
      await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test.html',
        },
      });
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should get exists object stream', async () => {
      const result = await ossObject.getStream(name);
      assert.equal(result.res.status, 200);
      assert(result.stream instanceof Readable);
      const tmpfile = path.join(tmpdir, 'get-stream.js');
      const tmpStream = createWriteStream(tmpfile);

      function finish() {
        return new Promise<void>(resolve => {
          tmpStream.on('finish', () => {
            resolve();
          });
        });
      }

      result.stream.pipe(tmpStream);
      await finish();
      assert.equal(readFileSync(tmpfile, 'utf8'), readFileSync(__filename, 'utf8'));
    });

    /**
     * Image processing uses different compression algorithms,
     * and the performance may be inconsistent
     * between different regions
     */
    it('should get image stream with image process', async () => {
      const imageName = `${prefix}oss-client/oss/nodejs-test-getstream-image-1024x768.png`;
      const originImagePath = path.join(__dirname, 'nodejs-1024x768.png');
      await ossObject.put(imageName, originImagePath, {
        mime: 'image/png',
      });

      let result = await ossObject.getStream(imageName, { process: 'image/resize,w_200' });
      let result2 = await ossObject.getStream(imageName, { process: 'image/resize,w_200' });
      assert.equal(result.res.status, 200);
      assert.equal(result2.res.status, 200);
      result = await ossObject.getStream(imageName, {
        process: 'image/resize,w_200',
        subres: { 'x-oss-process': 'image/resize,w_100' },
      });
      result2 = await ossObject.getStream(imageName, {
        process: 'image/resize,w_200',
        subres: { 'x-oss-process': 'image/resize,w_100' },
      });
      assert.equal(result.res.status, 200);
      assert.equal(result2.res.status, 200);
    });

    it('should throw error when object not exists', async () => {
      await assert.rejects(async () => {
        await ossObject.getStream(`${name}not-exists`);
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        return true;
      });
    });
  });

  describe('getObjectMeta()', () => {
    let name: string;
    let resHeaders: IncomingHttpHeaders;
    let fileSize: number;
    before(async () => {
      name = `${prefix}oss-client/oss/object-meta.js`;
      const object = await ossObject.put(name, __filename);
      fileSize = (await stat(__filename)).size;
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      resHeaders = object.res.headers;
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should head not exists object throw NoSuchKeyError', async () => {
      await assert.rejects(async () => {
        await ossObject.getObjectMeta(`${name}not-exists`);
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        assert.equal(err.status, 404);
        assert.equal(typeof err.requestId, 'string');
        return true;
      });
    });

    it('should return Etag and Content-Length', async () => {
      const info = await ossObject.getObjectMeta(name);
      assert.equal(info.status, 200);
      assert.equal(info.res.headers.etag, resHeaders.etag);
      assert.equal(info.res.headers['content-length'], fileSize.toString());
      // no versionId won't return this header
      assert(!info.res.headers['x-oss-last-access-time']);
    });
  });

  describe('copy()', () => {
    let name: string;
    let resHeaders: IncomingHttpHeaders;
    let otherBucket: string;
    let otherBucketObject: string;
    before(async () => {
      name = `${prefix}oss-client/oss/copy-meta.js`;
      const object = await ossObject.put(name, __filename, {
        meta: {
          uid: 1,
          pid: '123',
          slus: 'test-copy.html',
        },
      });
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      resHeaders = object.res.headers;

      // otherBucket = `oss-client-copy-source-bucket-${prefix.replace(/[/.]/g, '-')}`;
      // otherBucket = otherBucket.substring(0, otherBucket.length - 1);
      // await store.putBucket(otherBucket);
      // store.useBucket(otherBucket);
      // otherBucketObject = `${prefix}oss-client/oss/copy-source.js`;
      // await store.put(otherBucketObject, __filename);
      // store.useBucket(bucket);
    });

    after(async () => {
      await ossObject.delete(name);
    });

    it('should copy object from same bucket', async () => {
      const targetName = `${prefix}oss-client/oss/copy-new.js`;
      const result = await ossObject.copy(targetName, name);
      assert.equal(result.res.status, 200);
      assert.equal(typeof result.data?.etag, 'string');
      assert.equal(typeof result.data?.lastModified, 'string');

      const info = await ossObject.head(targetName);
      assert.equal(info.meta.uid, '1');
      assert.equal(info.meta.pid, '123');
      assert.equal(info.meta.slus, 'test-copy.html');
      assert.equal(info.status, 200);
      assert.equal(info.res.headers.etag, resHeaders.etag);
    });

    it('should copy object from same bucket and set content-disposition', async () => {
      const targetName = `${prefix}oss-client/oss/copy-content-disposition.js`;
      const disposition = 'attachment; filename=test';
      const result = await ossObject.copy(targetName, name, {
        headers: {
          'Content-Disposition': disposition,
        },
      });
      assert.strictEqual(result.res.status, 200);
      const { res } = await ossObject.get(targetName);
      assert.strictEqual(res.headers['content-disposition'], disposition);
    });

    it.skip('should copy object from other bucket, sourceBucket in copySource', async () => {
      const copySource = `/${otherBucket}/${otherBucketObject}`;
      const copyTarget = `${prefix}oss-client/oss/copy-target.js`;
      const result = await ossObject.copy(copyTarget, copySource);
      assert.equal(result.res.status, 200);

      const info = await ossObject.head(copyTarget);
      assert.equal(info.status, 200);
    });

    it.skip('should copy object from other bucket, sourceBucket is a separate parameter', async () => {
      const copySource = otherBucketObject;
      const copyTarget = `${prefix}oss-client/oss/has-bucket-name-copy-target.js`;
      const result = await ossObject.copy(copyTarget, copySource, otherBucket);
      assert.equal(result.res.status, 200);

      const info = await ossObject.head(copyTarget);
      assert.equal(info.status, 200);
    });

    it('should copy object with non-english name', async () => {
      const sourceName = `${prefix}oss-client/oss/copy-meta_测试.js`;
      await ossObject.put(sourceName, __filename, {
        meta: {
          uid: 2,
          pid: '1234',
          slus: 'test1.html',
        },
      });
      const targetName = `${prefix}oss-client/oss/copy-new_测试.js`;
      const result = await ossObject.copy(targetName, sourceName);
      assert.equal(result.res.status, 200);
      assert.equal(typeof result.data?.etag, 'string');
      assert.equal(typeof result.data?.lastModified, 'string');

      const info = await ossObject.head(targetName);
      assert.equal(info.meta.uid, '2');
      assert.equal(info.meta.pid, '1234');
      assert.equal(info.meta.slus, 'test1.html');
      assert.equal(info.status, 200);
    });

    it.skip('should copy object with non-english name and bucket', async () => {
      // let sourceName = `${prefix}oss-client/oss/copy-meta_测试2.js`;
      // let result = await ossObject.put(sourceName, __filename, {
      //   meta: {
      //     uid: 3,
      //     pid: '12345',
      //     slus: 'test2.html',
      //   },
      // });

      // let info = await ossObject.head(sourceName);
      // assert.equal(info.meta.uid, '3');
      // assert.equal(info.meta.pid, '12345');
      // assert.equal(info.meta.slus, 'test2.html');
      // assert.equal(info.status, 200);

      // sourceName = `/${bucket}/${sourceName}`;
      // const originname = `${prefix}oss-client/oss/copy-new_测试2.js`;
      // result = await ossObject.copy(originname, sourceName);
      // assert.equal(result.res.status, 200);
      // assert.equal(typeof result.data.etag, 'string');
      // assert.equal(typeof result.data.lastModified, 'string');

      // info = await ossObject.head(originname);
      // assert.equal(info.meta.uid, '3');
      // assert.equal(info.meta.pid, '12345');
      // assert.equal(info.meta.slus, 'test2.html');
      // assert.equal(info.status, 200);
    });

    it('should copy object and set other meta', async () => {
      const targetName = `${prefix}oss-client/oss/copy-new-2.js`;
      const result = await ossObject.copy(targetName, name, {
        meta: {
          uid: '2',
        },
      });
      assert.equal(result.res.status, 200);
      assert.equal(typeof result.data?.etag, 'string');
      assert.equal(typeof result.data?.lastModified, 'string');

      const info = await ossObject.head(targetName);
      assert.equal(info.meta.uid, '2');
      assert(!info.meta.pid);
      assert(!info.meta.slus);
      assert.equal(info.status, 200);
    });

    it('should copy object with special characters such as ;,/?:@&=+$#', async () => {
      const sourceName = `${prefix}oss-client/oss/copy-a;,/?:@&=+$#b.js`;
      await ossObject.put(sourceName, Buffer.alloc(1024 * 1024));
      await ossObject.copy(`${prefix}oss-client/oss/copy-a.js`, sourceName);
      await ossObject.copy(`${prefix}oss-client/oss/copy-a+b.js`, sourceName);
    });

    it('should use copy to change exists object headers', async () => {
      const targetName = `${prefix}oss-client/oss/copy-new-3.js`;
      let result = await ossObject.copy(targetName, name);
      assert.equal(result.res.status, 200);
      assert.equal(typeof result.data?.etag, 'string');
      assert.equal(typeof result.data?.lastModified, 'string');
      let info = await ossObject.head(targetName);
      assert(!info.res.headers['cache-control']);

      // add Cache-Control header to a exists object
      result = await ossObject.copy(targetName, targetName, {
        headers: {
          'Cache-Control': 'max-age=0, s-maxage=86400',
        },
      });
      assert.equal(result.res.status, 200);
      assert.equal(typeof result.data?.etag, 'string');
      assert.equal(typeof result.data?.lastModified, 'string');
      info = await ossObject.head(targetName);
      assert.equal(info.res.headers['cache-control'], 'max-age=0, s-maxage=86400');
    });

    it('should throw NoSuchKeyError when source object not exists', async () => {
      await assert.rejects(async () => {
        await ossObject.copy('new-object', 'not-exists-object');
      }, (err: OSSClientError) => {
        assert.equal(err.code, 'NoSuchKey');
        assert.match(err.message, /The specified key does not exist\./);
        assert.equal(err.status, 404);
        return true;
      });
    });

    describe('If-Match header', () => {
      it('should throw PreconditionFailedError when If-Match not equal source object etag', async () => {
        await assert.rejects(async () => {
          await ossObject.copy('new-name', name, {
            headers: {
              'If-Match': 'foo-bar',
            },
          });
        }, (err: OSSClientError) => {
          assert.equal(err.code, 'PreconditionFailed');
          assert.match(
            err.message,
            /At least one of the pre-conditions you specified did not hold. \(condition=If-Match\)/,
          );
          assert.equal(err.status, 412);
          return true;
        });
      });

      it('should copy object when If-Match equal source object etag', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Match.js`;
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-Match': resHeaders.etag,
          },
        });
        assert.equal(result.res.status, 200);
        assert.equal(typeof result.data?.etag, 'string');
        assert.equal(typeof result.data?.lastModified, 'string');
      });
    });

    describe('If-None-Match header', () => {
      it('should return 304 when If-None-Match equal source object etag', async () => {
        const result = await ossObject.copy('new-name', name, {
          headers: {
            'If-None-Match': resHeaders.etag,
          },
        });
        assert.equal(result.res.status, 304);
        assert.equal(result.data, null);
      });

      it('should copy object when If-None-Match not equal source object etag', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-None-Match.js`;
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-None-Match': 'foo-bar',
          },
        });
        assert.equal(result.res.status, 200);
        assert.equal(typeof result.data?.etag, 'string');
        assert.equal(typeof result.data?.lastModified, 'string');
      });
    });

    describe('If-Modified-Since header', () => {
      it('should 304 when If-Modified-Since > source object modified time', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Modified-Since.js`;
        const nextYear = new Date(resHeaders.date!);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-Modified-Since': nextYear.toUTCString(),
          },
        });
        assert.equal(result.res.status, 304);
      });

      it('should 304 when If-Modified-Since >= source object modified time', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Modified-Since.js`;
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-Modified-Since': resHeaders.date,
          },
        });
        assert.equal(result.res.status, 304);
      });

      it('should 200 when If-Modified-Since < source object modified time', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Modified-Since.js`;
        const lastYear = new Date(resHeaders.date!);
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-Modified-Since': lastYear.toUTCString(),
          },
        });
        assert.equal(result.res.status, 200);
      });
    });

    describe('If-Unmodified-Since header', () => {
      it('should 200 when If-Unmodified-Since > source object modified time', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Unmodified-Since.js`;
        const nextYear = new Date(resHeaders.date!);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-Unmodified-Since': nextYear.toUTCString(),
          },
        });
        assert.equal(result.res.status, 200);
      });

      it('should 200 when If-Unmodified-Since >= source object modified time', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Unmodified-Since.js`;
        const result = await ossObject.copy(targetName, name, {
          headers: {
            'If-Unmodified-Since': resHeaders.date,
          },
        });
        assert.equal(result.res.status, 200);
      });

      it('should throw PreconditionFailedError when If-Unmodified-Since < source object modified time', async () => {
        const targetName = `${prefix}oss-client/oss/copy-new-If-Unmodified-Since.js`;
        const lastYear = new Date(resHeaders.date!);
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        await assert.rejects(async () => {
          await ossObject.copy(targetName, name, {
            headers: {
              'If-Unmodified-Since': lastYear.toUTCString(),
            },
          });
        }, (err: OSSClientError) => {
          assert.equal(err.code, 'PreconditionFailed');
          assert.match(
            err.message,
            /At least one of the pre-conditions you specified did not hold. \(condition=If-Unmodified-Since\)/,
          );
          assert.equal(err.status, 412);
          return true;
        });
      });
    });
  });
});
