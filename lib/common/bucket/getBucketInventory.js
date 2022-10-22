const { checkBucketName } = require('../utils/checkBucketName');
const { formatInventoryConfig } = require('../utils/formatInventoryConfig');

/**
 * getBucketInventory
 * @param {String} bucketName - bucket name
 * @param {String} inventoryId - inventory id
 * @param {Object} options - options
 */
async function getBucketInventory(bucketName, inventoryId, options = {}) {
  const subres = Object.assign({ inventory: '', inventoryId }, options.subres);
  checkBucketName(bucketName);
  const params = this._bucketRequestParams('GET', bucketName, subres, options);
  params.successStatuses = [ 200 ];
  params.xmlResponse = true;
  const result = await this.request(params);
  return {
    status: result.status,
    res: result.res,
    inventory: formatInventoryConfig(result.data),
  };
}
exports.getBucketInventory = getBucketInventory;
