const dns = require('dns').promises;
const assert = require('assert');
const utils = require('./utils');
const oss = require('../lib/client');
const config = require('./config').oss;

describe.skip('test/endpointIsIP.test.js', () => {
  const { prefix } = utils;
  let store;
  before(async () => {
    store = oss(config);
    const bucket = config.bucket;
    const endpoint = await dns.lookup(`${bucket}.${store.options.endpoint.hostname}`);
    console.log(`${bucket}.${store.options.endpoint.hostname}`);
    console.log(endpoint);
    const testEndponitConfig = Object.assign({}, config, {
      cname: true,
      endpoint: endpoint.address,
    });
    store = oss(testEndponitConfig);
    store.useBucket(bucket);
  });

  describe('endpoint is ip', () => {
    it('should put and get', async () => {
      const name = `${prefix}oss-client/oss/putWidhIP.js`;
      const object = await store.put(name, __filename);
      assert.equal(object.name, name);
      const result = await store.get(name);
      assert(result.res.status, 200);
    });
  });
});
