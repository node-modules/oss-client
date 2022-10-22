const { checkBucketName: _checkBucketName } = require('../utils/checkBucketName');
const querystring = require('querystring');
const { base64encode } = require('utility');

const proto = exports;

proto.processObjectSave = async function processObjectSave(sourceObject, targetObject, process, targetBucket) {
  checkArgs(sourceObject, 'sourceObject');
  checkArgs(targetObject, 'targetObject');
  checkArgs(process, 'process');
  targetObject = this._objectName(targetObject);
  if (targetBucket) {
    _checkBucketName(targetBucket);
  }

  const params = this._objectRequestParams('POST', sourceObject, {
    subres: 'x-oss-process',
  });

  const bucketParam = targetBucket ? `,b_${base64encode(targetBucket)}` : '';
  targetObject = base64encode(targetObject);

  const content = {
    'x-oss-process': `${process}|sys/saveas,o_${targetObject}${bucketParam}`,
  };
  params.content = querystring.stringify(content);

  const result = await this.request(params);
  return {
    res: result.res,
    status: result.res.status,
  };
};

function checkArgs(name, key) {
  if (!name) {
    throw new Error(`${key} is required`);
  }
  if (typeof name !== 'string') {
    throw new Error(`${key} must be String`);
  }
}
