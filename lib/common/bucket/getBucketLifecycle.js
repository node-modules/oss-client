const { checkBucketName: _checkBucketName } = require('../utils/checkBucketName');
const { formatObjKey } = require('../utils/formatObjKey');

const proto = exports;

proto.getBucketLifecycle = async function getBucketLifecycle(name, options) {
  _checkBucketName(name);
  const params = this._bucketRequestParams('GET', name, 'lifecycle', options);
  params.successStatuses = [ 200 ];
  params.xmlResponse = true;
  const result = await this.request(params);
  let rules = result.data.Rule || null;
  if (rules) {
    if (!Array.isArray(rules)) {
      rules = [ rules ];
    }
    rules = rules.map(_ => {
      if (_.ID) {
        _.id = _.ID;
        delete _.ID;
      }
      if (_.Tag && !Array.isArray(_.Tag)) {
        _.Tag = [ _.Tag ];
      }
      return formatObjKey(_, 'firstLowerCase');
    });
  }
  return {
    rules,
    res: result.res,
  };
};

