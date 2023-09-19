import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { ObjectMeta } from 'oss-interface';
import urllib, { RawResponseWithMeta } from 'urllib';
import config from './config.js';
import { OSSObject } from '../src/index.js';
import { OSSClientError } from '../src/error/OSSClientError.js';

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
      assert.equal(result.prefixes, null);
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
      assert.equal(result.prefixes, null);
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
      assert.equal(result.prefixes, null);

      // next 2
      const result2 = await ossObject.list({
        'max-keys': '2',
        marker: result.nextMarker,
      });
      assert.equal(result2.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(typeof result2.nextMarker, 'string');
      assert(result2.isTruncated);
      assert.equal(result2.prefixes, null);
    });

    it('should list with prefix', async () => {
      let result = await ossObject.list({
        prefix: `${listPrefix}fun/movie/`,
      });
      assert.equal(result.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.equal(result.prefixes, null);

      result = await ossObject.list({
        prefix: `${listPrefix}fun/movie`,
      });
      assert.equal(result.objects.length, 2);
      result.objects.map(checkObjectProperties);
      assert.equal(result.nextMarker, null);
      assert(!result.isTruncated);
      assert.equal(result.prefixes, null);
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
      assert.equal(result.prefixes, null);
    });
  });

  describe('put()', () => {
    it('should add object with local file path', async () => {
      const name = `${prefix}oss-client/oss/put-localfile-${randomUUID()}.js`;
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

    // it('should with options.ctx', async () => {
    //   const name = `${prefix}oss-client/oss/put-localfile-options-ctx.js`;
    //   let ctx = {
    //     httpclient: {},
    //   };
    //   await assert.rejects(async () => {
    //     await ossObject.put(name, __filename, { ctx });
    //   }, (err: Error) => {
    //     assert(err.message.includes('raw error: TypeError: urllib.request is not a function'));
    //     return true;
    //   });
    //   ctx = {
    //     httpclient: urllib,
    //   };
    //   let object = await store.put(name, __filename, { ctx });
    //   assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    //   assert.equal(typeof object.res.rt, 'number');
    //   assert.equal(object.res.size, 0);
    //   assert.equal(object.name, name);

    //   ctx = {
    //     urllib,
    //   };
    //   object = await store.put(name, __filename, { ctx });
    //   assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    //   assert.equal(typeof object.res.rt, 'number');
    //   assert.equal(object.res.size, 0);
    //   assert.equal(object.name, name);
    // });

    it('should add object with content buffer', async () => {
      const name = `${prefix}oss-client/oss/put-buffer`;
      const object = await ossObject.put(`/${name}`, Buffer.from('foo content'));
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.name, name);
    });

    it('should add object with readstream', async () => {
      const name = `${prefix}oss-client/oss/put-readstream`;
      const object = await ossObject.put(name, createReadStream(__filename));
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(typeof object.res.headers.etag, 'string');
      assert.equal(object.name, name);
    });

    // it('should add object with Readable', async () => {
    //   const name = `${prefix}oss-client/oss/put-Readable`;
    //   async function* generate() {
    //     yield 'Hello, ';
    //     yield '你好 OSS';
    //   }
    //   // Using stream.Readable.from() method
    //   const readable = Readable.from(generate());
    //   const object = await ossObject.put(name, readable, {
    //     headers: {
    //       'content-length': Buffer.byteLength('Hello, 你好 OSS', 'utf-8').toString(),
    //     },
    //   });
    //   assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    //   assert.equal(typeof object.res.rt, 'number');
    //   assert.equal(typeof object.res.headers.etag, 'string');
    //   assert.equal(object.name, name);
    //   const result = await ossObject.get(name);
    //   assert.equal(result.content.toString(), 'Hello, 你好 OSS');
    // });

    // it('should add object with meta', async () => {
    //   const name = `${prefix}oss-client/oss/put-meta.js`;
    //   const object = await ossObject.put(name, __filename, {
    //     meta: {
    //       uid: 1,
    //       slus: 'test.html',
    //     },
    //   });
    //   assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
    //   assert.equal(typeof object.res.rt, 'number');
    //   assert.equal(object.res.size, 0);
    //   assert.equal(object.name, name);

    //   const info = await ossObject.head(name);
    //   assert.deepEqual(info.meta, {
    //     uid: '1',
    //     slus: 'test.html',
    //   });
    //   assert.equal(info.status, 200);
    // });

    // it('should set Content-Disposition with ascii name', async () => {
    //   const name = `${prefix}oss-client/oss/put-Content-Disposition.js`;
    //   const object = await ossObject.put(name, __filename, {
    //     headers: {
    //       'Content-Disposition': 'ascii-name.js',
    //     },
    //   });
    //   assert(object.name, name);
    //   const info = await ossObject.head(name);
    //   assert.equal(info.res.headers['content-disposition'], 'ascii-name.js');
    // });

    // it('should set Content-Disposition with no-ascii name', async () => {
    //   const name = `${prefix}oss-client/oss/put-Content-Disposition.js`;
    //   const object = await ossObject.put(name, __filename, {
    //     headers: {
    //       'Content-Disposition': encodeURIComponent('non-ascii-名字.js'),
    //     },
    //   });
    //   assert(object.name, name);
    //   const info = await ossObject.head(name);
    //   assert.equal(info.res.headers['content-disposition'], 'non-ascii-%E5%90%8D%E5%AD%97.js');
    // });

    // it('should set Expires', async () => {
    //   const name = `${prefix}oss-client/oss/put-Expires.js`;
    //   const object = await ossObject.put(name, __filename, {
    //     headers: {
    //       Expires: '1000000',
    //     },
    //   });
    //   assert(object.name, name);
    //   const info = await ossObject.head(name);
    //   assert.equal(info.res.headers.expires, '1000000');
    // });

    // it('should set custom Content-Type', async () => {
    //   const name = `${prefix}oss-client/oss/put-Content-Type.js`;
    //   const object = await ossObject.put(name, __filename, {
    //     headers: {
    //       'Content-Type': 'text/plain; charset=gbk',
    //     },
    //   });
    //   assert(object.name, name);
    //   const info = await ossObject.head(name);
    //   assert.equal(info.res.headers['content-type'], 'text/plain; charset=gbk');
    // });

    // it('should set custom content-type lower case', async () => {
    //   const name = `${prefix}oss-client/oss/put-Content-Type.js`;
    //   const object = await ossObject.put(name, __filename, {
    //     headers: {
    //       'content-type': 'application/javascript; charset=utf8',
    //     },
    //   });
    //   assert(object.name, name);
    //   const info = await ossObject.head(name);
    //   assert.equal(info.res.headers['content-type'], 'application/javascript; charset=utf8');
    // });

    // it('should set custom Content-MD5 and ignore case', async () => {
    //   const name = `test-md5-${Date.now()}.js`;
    //   const fileName = await utils.createTempFile(name, 1024 * 4);
    //   const MD5Value = crypto.createHash('md5').update(fs.readFileSync(fileName)).digest('base64');
    //   await store.put(name, fileName, {
    //     headers: {
    //       'Content-MD5': MD5Value,
    //     },
    //   });
    //   await store.put(name, fileName, {
    //     headers: {
    //       'content-Md5': MD5Value,
    //     },
    //   });
    // });

    // it('should return correct encode when name include + and space', async () => {
    //   const name = 'ali-sdkhahhhh+oss+mm xxx.js';
    //   const object = await ossObject.put(name, __filename, {
    //     headers: {
    //       'Content-Type': 'text/plain; charset=gbk',
    //     },
    //   });
    //   assert(object.name, name);
    //   const info = await ossObject.head(name);
    //   const url = info.res.requestUrls[0];
    //   const { pathname } = urlutil.parse(url);
    //   assert.equal(pathname, '/ali-sdkhahhhh%2Boss%2Bmm%20xxx.js');
    //   assert.equal(info.res.headers['content-type'], 'text/plain; charset=gbk');
    // });

    it('should work with x-oss-forbid-overwrite header to not allow put same name file', async () => {
      const body = Buffer.from('san');
      const name = `${prefix}put/testsan`;
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
      const name = `${prefix}put/testpathnotfile`;
      await assert.rejects(async () => {
        await ossObject.put(name, file);
      }, (err: Error) => {
        assert.equal(`${__dirname} is not file`, err.message);
        return true;
      });
    });
  });

  describe('putStream()', () => {
    it('should add object with streaming way', async () => {
      const name = `${prefix}oss-client/oss/putStream-localfile.js`;
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
      const name = `${prefix}oss-client/oss/nodejs-1024x768.png`;
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
      const name = `${prefix}oss-client/oss/nodejs-1024x768.png`;
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
      const name = `${prefix}oss-client/oss/bigfile-4mb.bin`;
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
      const name = `${prefix}oss-client/oss/putStream-source-destroy.js`;
      await assert.rejects(async () => {
        const readerStream = createReadStream(`${__filename}.notexists.js`);
        await ossObject.putStream(name, readerStream);
      }, (err: any) => {
        assert.strictEqual(err.status, -1);
        return true;
      });
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
});
