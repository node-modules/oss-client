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
});
