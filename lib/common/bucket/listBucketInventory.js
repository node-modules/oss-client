const { checkBucketName } = require('../utils/checkBucketName');
const { formatInventoryConfig } = require('../utils/formatInventoryConfig');

/**
 * listBucketInventory
 * @param {String} bucketName - bucket name
 * @param {Object} options - options
 */
async function listBucketInventory(bucketName, options = {}) {
  const { continuationToken } = options;
  const subres = Object.assign({ inventory: '' }, continuationToken && { 'continuation-token': continuationToken }, options.subres);
  checkBucketName(bucketName);
  const params = this._bucketRequestParams('GET', bucketName, subres, options);
  params.successStatuses = [ 200 ];
  params.xmlResponse = true;
  const result = await this.request(params);
  const { data, res, status } = result;
  return {
    isTruncated: data.IsTruncated === 'true',
    nextContinuationToken: data.NextContinuationToken,
    inventoryList: formatInventoryConfig(data.InventoryConfiguration, true),
    status,
    res,
  };
}
exports.listBucketInventory = listBucketInventory;
