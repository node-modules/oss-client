const { checkBucketName } = require('../utils/checkBucketName');
const { dataFix } = require('../utils/dataFix');

async function getBucketWorm(name, options) {
  checkBucketName(name);
  const params = this._bucketRequestParams('GET', name, 'worm', options);
  params.successStatuses = [ 200 ];
  params.xmlResponse = true;
  const result = await this.request(params);
  dataFix(result.data, {
    lowerFirst: true,
    rename: {
      RetentionPeriodInDays: 'days',
    },
  });
  return Object.assign(Object.assign({}, result.data), { res: result.res, status: result.status });
}

exports.getBucketWorm = getBucketWorm;
