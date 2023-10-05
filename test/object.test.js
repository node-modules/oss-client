const fs = require('fs');
const { readFile, writeFile } = require('fs/promises');
const path = require('path');
const assert = require('assert');
const os = require('os');
const { Readable } = require('stream');
const ms = require('humanize-ms');
const urllib = require('urllib');
const copy = require('copy-to');
const mm = require('mm');
const crypto = require('crypto');
const urlutil = require('url');
const { metaSyncTime, oss: config } = require('./config');
const utils = require('./utils');
const oss = require('..');

describe('test/object.test.js', () => {
  const tmpdir = os.tmpdir();
  const { prefix } = utils;
  const bucket = config.bucket;
  let store;
  // let archvieBucket;
  before(async () => {
    store = oss(config);
    // just for archive bucket test
    // archvieBucket = `oss-client-archvie-bucket-${prefix.replace(/[/.]/g, '-')}`;
    // archvieBucket = archvieBucket.substring(0, archvieBucket.length - 1);
    store.useBucket(bucket);
    // await store.putBucket(archvieBucket, { StorageClass: 'Archive' });
    // store.useBucket(archvieBucket, bucketRegion);
  });

  afterEach(mm.restore);

  describe('processObjectSave()', () => {
    const name = 'sourceObject.png';
    const target = `processObject_target${Date.now()}.jpg`;
    before(async () => {
      const imagepath = path.join(__dirname, 'nodejs-1024x768.png');
      await store.putStream(name, fs.createReadStream(imagepath), {
        mime: 'image/png',
      });
    });

    it('should process image', async () => {
      const result = await store.processObjectSave(
        name,
        target,
        'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00,'
      );
      assert.equal(result.res.status, 200);
      assert.equal(result.status, 200);
    });

    // it('should process image with targetBucket', async () => {
    //   try {
    //     const result = await store.processObjectSave(
    //       name,
    //       target,
    //       'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00,',
    //       archvieBucket
    //     );
    //     assert.strictEqual(result.res.status, 200);
    //   } catch (error) {
    //     assert(false, error);
    //   }
    // });

    it('should throw error when sourceObjectName is invalid', async () => {
      await assert.rejects(async () => {
        await store.processObjectSave('', target,
          'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00,');
      }, err => {
        assert.equal(err.message, 'sourceObject is required');
        return true;
      });
      await assert.rejects(async () => {
        await store.processObjectSave({}, target,
          'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00,');
      }, err => {
        assert.equal(err.message, 'sourceObject must be String');
        return true;
      });
    });

    it('should throw error when targetObjectName is invalid', async () => {
      await assert.rejects(async () => {
        await store.processObjectSave(name, '',
          'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00,');
      }, err => {
        assert.equal(err.message, 'targetObject is required');
        return true;
      });

      await assert.rejects(async () => {
        await store.processObjectSave(name, {},
          'image/watermark,text_aGVsbG8g5Zu+54mH5pyN5Yqh77yB,color_ff6a00,');
      }, err => {
        assert.equal(err.message, 'targetObject must be String');
        return true;
      });
    });

    it('should throw error when process is invalid', async () => {
      await assert.rejects(async () => {
        await store.processObjectSave(name, target, '');
      }, err => {
        assert.equal(err.message, 'process is required');
        return true;
      });

      await assert.rejects(async () => {
        await store.processObjectSave(name, target, {});
      }, err => {
        assert.equal(err.message, 'process must be String');
        return true;
      });
    });
  });

  describe('getObjectUrl()', () => {
    it('should return object url', () => {
      let name = 'test.js';
      let url = store.getObjectUrl(name);
      assert.equal(url, store.options.endpoint.format() + name);

      name = '/foo/bar/a%2Faa/test&+-123~!.js';
      url = store.getObjectUrl(name, 'https://foo.com');
      assert.equal(url, 'https://foo.com/foo/bar/a%252Faa/test%26%2B-123~!.js');
      const url2 = store.getObjectUrl(name, 'https://foo.com/');
      assert.equal(url2, 'https://foo.com/foo/bar/a%252Faa/test%26%2B-123~!.js');
    });
  });

  describe('generateObjectUrl()', () => {
    it('should return object url', () => {
      let name = 'test.js';
      let url = store.generateObjectUrl(name);

      let baseUrl = store.options.endpoint.format();
      const copyUrl = urlutil.parse(baseUrl);
      copyUrl.hostname = `${bucket}.${copyUrl.hostname}`;
      copyUrl.host = `${bucket}.${copyUrl.host}`;
      baseUrl = copyUrl.format();
      assert.equal(url, `${baseUrl}${name}`);

      name = '/foo/bar/a%2Faa/test&+-123~!.js';
      url = store.generateObjectUrl(name, 'https://foo.com');
      assert.equal(url, 'https://foo.com/foo/bar/a%252Faa/test%26%2B-123~!.js');
      const url2 = store.generateObjectUrl(name, 'https://foo.com/');
      assert.equal(url2, 'https://foo.com/foo/bar/a%252Faa/test%26%2B-123~!.js');
    });
  });

  describe('test-content-type', () => {
    it('should put object and content-type not null when upload file and object name has no MIME', async () => {
      const name = `${prefix}oss-client/oss/test-content-type`;
      const bigfile = path.join(tmpdir, 'test-content-type');
      await writeFile(bigfile, Buffer.alloc(4 * 1024).fill('a\n'));
      const object = await store.put(name, bigfile);
      assert.equal(typeof object.res.headers['x-oss-request-id'], 'string');
      assert.equal(typeof object.res.rt, 'number');
      assert.equal(object.res.size, 0);
      assert.equal(object.name, name);

      const r = await store.get(name);
      assert.equal(r.res.status, 200);
      assert.equal(r.res.headers['content-type'], 'application/octet-stream');
    });
  });

  describe('mimetype', () => {
    const createFile = async (name, size) => {
      size = size || 200 * 1024;
      await new Promise((resolve, reject) => {
        const rs = fs.createReadStream('/dev/random', {
          start: 0,
          end: size - 1,
        });
        const ws = fs.createWriteStream(name);
        rs.pipe(ws);
        ws.on('finish', (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });

      return name;
    };

    it('should set mimetype by file ext', async () => {
      const filepath = path.join(tmpdir, 'content-type-by-file.jpg');
      await createFile(filepath);
      const name = `${prefix}oss-client/oss/content-type-by-file.png`;
      await store.put(name, filepath);

      let result = await store.head(name);
      assert.equal(result.res.headers['content-type'], 'image/jpeg');

      await store.multipartUpload(name, filepath);
      result = await store.head(name);
      assert.equal(result.res.headers['content-type'], 'image/jpeg');
    });

    it('should set mimetype by object key', async () => {
      const filepath = path.join(tmpdir, 'content-type-by-file');
      await createFile(filepath);
      const name = `${prefix}oss-client/oss/content-type-by-file.png`;
      await store.put(name, filepath);

      let result = await store.head(name);
      assert.equal(result.res.headers['content-type'], 'image/png');
      await store.multipartUpload(name, filepath);
      result = await store.head(name);
      assert.equal(result.res.headers['content-type'], 'image/png');
    });

    it('should set user-specified mimetype', async () => {
      const filepath = path.join(tmpdir, 'content-type-by-file.jpg');
      await createFile(filepath);
      const name = `${prefix}oss-client/oss/content-type-by-file.png`;
      await store.put(name, filepath, { mime: 'text/plain' });

      let result = await store.head(name);
      assert.equal(result.res.headers['content-type'], 'text/plain');
      await store.multipartUpload(name, filepath, {
        mime: 'text/plain',
      });
      result = await store.head(name);
      assert.equal(result.res.headers['content-type'], 'text/plain');
    });
  });

  describe.skip('restore()', () => {
    before(async () => {
      await store.put('/oss/coldRestore.js', __filename, {
        headers: {
          'x-oss-storage-class': 'ColdArchive',
        },
      });
      await store.put('/oss/daysRestore.js', __filename, {
        headers: {
          'x-oss-storage-class': 'ColdArchive',
        },
      });
    });
    after(async () => {
      await store.useBucket(bucket);
    });

    it('Should return OperationNotSupportedError when the type of bucket is not archive', async () => {
      const name = '/oss/restore.js';
      await store.put(name, __filename);

      try {
        await store.restore(name);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.status, 400);
      }
    });

    // it.skip('Should return 202 when restore is called first', async () => {
    //   store.setBucket(archvieBucket);
    //   const name = '/oss/restore.js';
    //   await store.put(name, __filename);

    //   const info = await store.restore(name);
    //   assert.equal(info.res.status, 202);

    //   // in 1 minute verify RestoreAlreadyInProgressError
    //   try {
    //     await store.restore(name);
    //   } catch (err) {
    //     assert.equal(err.name, 'RestoreAlreadyInProgressError');
    //   }
    // });

    // it.skip('Category should be Archive', async () => {
    //   const name = '/oss/restore.js';
    //   try {
    //     await store.restore(name, { type: 'ColdArchive' });
    //   } catch (err) {
    //     assert.equal(err.code, 'MalformedXML');
    //   }
    //   await store.useBucket(bucket);
    // });

    it('ColdArchive choice Days', async () => {
      const name = '/oss/daysRestore.js';
      const result = await store.restore(name, {
        type: 'ColdArchive',
        Days: 2,
      });
      assert.equal(
        [ 'Expedited', 'Standard', 'Bulk' ].includes(result.res.headers['x-oss-object-restore-priority']),
        true
      );
    });

    it('ColdArchive is Accepted', async () => {
      const name = '/oss/coldRestore.js';
      const result = await store.restore(name, {
        type: 'ColdArchive',
      });
      assert.equal(
        [ 'Expedited', 'Standard', 'Bulk' ].includes(result.res.headers['x-oss-object-restore-priority']),
        true
      );
    });
  });

  describe('calculatePostSignature()', () => {
    it('should get signature for postObject', async () => {
      // not work on Node.js 14 with undici
      if (process.version.startsWith('v14.')) return;
      const name = 'calculatePostSignature.js';
      const url = store.generateObjectUrl(name).replace(name, '');
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const policy = {
        expiration: date.toISOString(),
        conditions: [{ bucket: store.options.bucket }],
      };

      const params = store.calculatePostSignature(policy);
      const options = {
        method: 'POST',
        data: {
          ...params,
          key: name,
        },
        files: {
          file: fs.createReadStream(__filename),
        },
      };

      const result = await urllib.request(url, options);
      assert(result.statusCode === 204);
      const headRes = await store.head(name);
      assert.equal(headRes.status, 200);
      // console.log(headRes.res.headers);
    });

    it('should throw error when policy is not JSON or Object', async () => {
      let policy = 'string';
      const errorMessage = 'policy must be JSON string or Object';
      try {
        store.calculatePostSignature(policy);
        assert(false);
      } catch (error) {
        assert.strictEqual(errorMessage, error.message);
      }
      try {
        policy = 123;
        store.calculatePostSignature(policy);
        assert(false);
      } catch (error) {
        assert.strictEqual(errorMessage, error.message);
      }
    });
  });

  describe('getObjectTagging() putObjectTagging() deleteObjectTagging()', () => {
    const name = `${prefix}oss/tagging.js`;

    before(async () => {
      await store.put(name, __filename);
    });

    it('should get the tags of object', async () => {
      const result = await store.getObjectTagging(name);
      assert.strictEqual(result.status, 200);
      assert.deepEqual(result.tag, {});
    });

    it('should configures or updates the tags of object', async () => {
      let result;
      let tag = { a: '1', b: '2' };
      result = await store.putObjectTagging(name, tag);
      assert.strictEqual(result.status, 200);

      result = await store.getObjectTagging(name);
      assert.strictEqual(result.status, 200);
      assert.deepEqual(result.tag, tag);

      tag = { a: '1' };
      result = await store.putObjectTagging(name, tag);
      assert.strictEqual(result.status, 200);

      result = await store.getObjectTagging(name);
      assert.strictEqual(result.status, 200);
      assert.deepEqual(result.tag, tag);
    });

    it('maximum of 10 tags for a object', async () => {
      await assert.rejects(async () => {
        const tag = {};
        Array(11)
          .fill(1)
          .forEach((_, index) => {
            tag[index] = index;
          });
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual('maximum of 10 tags for a object', err.message);
        return true;
      });
    });

    it('tag can contain invalid string', async () => {
      await assert.rejects(async () => {
        const errorStr = '错误字符串@#￥%……&*！';
        const key = errorStr;
        const value = errorStr;
        const tag = { [key]: value };
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual(
          'tag can contain letters, numbers, spaces, and the following symbols: plus sign (+), hyphen (-), equal sign (=), period (.), underscore (_), colon (:), and forward slash (/)',
          err.message);
        return true;
      });
    });

    it('tag key can be a maximum of 128 bytes in length', async () => {
      await assert.rejects(async () => {
        const key = new Array(129).fill('1').join('');
        const tag = { [key]: '1' };
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual('tag key can be a maximum of 128 bytes in length', err.message);
        return true;
      });
    });

    it('tag value can be a maximum of 256 bytes in length', async () => {
      await assert.rejects(async () => {
        const value = new Array(257).fill('1').join('');
        const tag = { a: value };
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual('tag value can be a maximum of 256 bytes in length', err.message);
        return true;
      });
    });

    it('should throw error when the type of tag is not Object', async () => {
      await assert.rejects(async () => {
        const tag = [{ a: 1 }];
        await store.putObjectTagging(name, tag);
      }, err => {
        assert(err.message.includes('tag must be Object'));
        return true;
      });
    });

    it('should throw error when the type of tag value is number', async () => {
      await assert.rejects(async () => {
        const tag = { a: 1 };
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual('the key and value of the tag must be String', err.message);
        return true;
      });
    });

    it('should throw error when the type of tag value is Object', async () => {
      await assert.rejects(async () => {
        const tag = { a: { inner: '1' } };
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual('the key and value of the tag must be String', err.message);
        return true;
      });
    });

    it('should throw error when the type of tag value is Array', async () => {
      await assert.rejects(async () => {
        const tag = { a: [ '1', '2' ] };
        await store.putObjectTagging(name, tag);
      }, err => {
        assert.strictEqual('the key and value of the tag must be String', err.message);
        return true;
      });
    });

    it('should delete the tags of object', async () => {
      let result;
      const tag = { a: '1', b: '2' };
      await store.putObjectTagging(name, tag);

      result = await store.deleteObjectTagging(name);
      assert.strictEqual(result.status, 204);

      result = await store.getObjectTagging(name);
      assert.strictEqual(result.status, 200);
      assert.deepEqual(result.tag, {});
    });
  });
});
