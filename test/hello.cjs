const { OSSObject } = require('..');

const ossObject = new OSSObject({
  region: 'oss-cn-hangzhou',
  endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
  accessKeyId: 'LTAI5tG666666666666666',
  accessKeySecret: '66666666666666666666666666666666',
  bucket: 'foo',
});

console.log(ossObject);
