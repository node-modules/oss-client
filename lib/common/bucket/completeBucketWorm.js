const { checkBucketName } = require('../utils/checkBucketName');

async function completeBucketWorm(name, wormId, options) {
  checkBucketName(name);
  const params = this._bucketRequestParams('POST', name, { wormId }, options);
  const result = await this.request(params);
  return {
    res: result.res,
    status: result.status,
  };
}

exports.completeBucketWorm = completeBucketWorm;
