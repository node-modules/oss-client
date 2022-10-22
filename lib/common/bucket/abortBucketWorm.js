const { checkBucketName } = require('../utils/checkBucketName');

async function abortBucketWorm(name, options) {
  checkBucketName(name);
  const params = this._bucketRequestParams('DELETE', name, 'worm', options);
  const result = await this.request(params);
  return {
    res: result.res,
    status: result.status,
  };
}

exports.abortBucketWorm = abortBucketWorm;
