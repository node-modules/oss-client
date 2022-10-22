const { obj2xml } = require('../utils/obj2xml');
const { checkBucketName } = require('../utils/checkBucketName');

async function initiateBucketWorm(name, days, options) {
  checkBucketName(name);
  const params = this._bucketRequestParams('POST', name, 'worm', options);
  const paramlXMLObJ = {
    InitiateWormConfiguration: {
      RetentionPeriodInDays: days,
    },
  };
  params.mime = 'xml';
  params.content = obj2xml(paramlXMLObJ, { headers: true });
  params.successStatuses = [ 200 ];
  const result = await this.request(params);
  return {
    res: result.res,
    wormId: result.res.headers['x-oss-worm-id'],
    status: result.status,
  };
}

exports.initiateBucketWorm = initiateBucketWorm;
