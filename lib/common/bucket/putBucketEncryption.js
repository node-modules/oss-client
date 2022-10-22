const proto = exports;
const { checkBucketName } = require('../utils/checkBucketName');
const { obj2xml } = require('../utils/obj2xml');

/**
 * putBucketEncryption
 * @param {String} bucketName - bucket name
 * @param {Object} options - options
 */
proto.putBucketEncryption = async function putBucketEncryption(bucketName, options) {
  options = options || {};
  checkBucketName(bucketName);
  const params = this._bucketRequestParams('PUT', bucketName, 'encryption', options);
  params.successStatuses = [ 200 ];
  const paramXMLObj = {
    ServerSideEncryptionRule: {
      ApplyServerSideEncryptionByDefault: {
        SSEAlgorithm: options.SSEAlgorithm,
      },
    },
  };
  if (options.KMSMasterKeyID !== undefined) {
    paramXMLObj.ServerSideEncryptionRule.ApplyServerSideEncryptionByDefault.KMSMasterKeyID = options.KMSMasterKeyID;
  }
  const paramXML = obj2xml(paramXMLObj, {
    headers: true,
  });
  params.mime = 'xml';
  params.content = paramXML;
  const result = await this.request(params);
  return {
    status: result.status,
    res: result.res,
  };
};
