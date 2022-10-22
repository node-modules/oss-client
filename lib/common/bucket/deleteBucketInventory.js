const { checkBucketName } = require('../utils/checkBucketName');

/**
 * deleteBucketInventory
 * @param {String} bucketName - bucket name
 * @param {String} inventoryId - inventory id
 * @param {Object} options - options
 */
async function deleteBucketInventory(bucketName, inventoryId, options = {}) {
  const subres = Object.assign({ inventory: '', inventoryId }, options.subres);
  checkBucketName(bucketName);
  const params = this._bucketRequestParams('DELETE', bucketName, subres, options);
  params.successStatuses = [ 204 ];
  const result = await this.request(params);
  return {
    status: result.status,
    res: result.res,
  };
}
exports.deleteBucketInventory = deleteBucketInventory;
