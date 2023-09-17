import { strict as assert } from 'node:assert';
// import os from 'node:os';
import config from './config.js';
import { OSSObject } from '../src/index.js';
import { ObjectMeta } from 'oss-interface';

describe('test/OSSObject.test.ts', () => {
  // const tmpdir = os.tmpdir();
  const prefix = config.prefix;
  // const bucket = config.oss.bucket;
  const ossObject = new OSSObject(config.oss);

  describe('list()', () => {
    // oss.jpg
    // fun/test.jpg
    // fun/movie/001.avi
    // fun/movie/007.avi
    const listPrefix = `${prefix}oss-client/list/`;
    // before(async () => {
    //   await ossObject.put(`${listPrefix}oss.jpg`, Buffer.from('oss.jpg'));
    //   await ossObject.put(`${listPrefix}fun/test.jpg`, Buffer.from('fun/test.jpg'));
    //   await ossObject.put(`${listPrefix}fun/movie/001.avi`, Buffer.from('fun/movie/001.avi'));
    //   await ossObject.put(`${listPrefix}fun/movie/007.avi`, Buffer.from('fun/movie/007.avi'));
    //   await ossObject.put(`${listPrefix}other/movie/007.avi`, Buffer.from('other/movie/007.avi'));
    //   await ossObject.put(`${listPrefix}other/movie/008.avi`, Buffer.from('other/movie/008.avi'));
    // });

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
});
