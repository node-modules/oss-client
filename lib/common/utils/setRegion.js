const { parse } = require('url');
const { checkConfigValid } = require('./checkConfigValid');

function setRegion(region, internal = false, secure = false) {
  checkConfigValid(region, 'region');
  const protocol = secure ? 'https://' : 'http://';
  let suffix = internal ? '-internal.aliyuncs.com' : '.aliyuncs.com';
  const prefix = 'vpc100-oss-cn-';
  // aliyun VPC region: https://help.aliyun.com/knowledge_detail/38740.html
  if (region.substr(0, prefix.length) === prefix) {
    suffix = '.aliyuncs.com';
  }
  return parse(protocol + region + suffix);
}

exports.setRegion = setRegion;
