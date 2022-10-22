const { checkBucketName } = require('../utils/checkBucketName');

async function getBucketStat(name, options) {
  name = name || this.options.bucket;
  checkBucketName(name);
  const params = this._bucketRequestParams('GET', name, 'stat', options);
  params.successStatuses = [ 200 ];
  params.xmlResponse = true;
  const result = await this.request(params);
  return {
    res: result.res,
    stat: result.data,
  };
}

exports.getBucketStat = getBucketStat;
