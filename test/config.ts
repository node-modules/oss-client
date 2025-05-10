import { env } from 'read-env-value';

export default {
  prefix: `${process.platform}-${process.version}-${Date.now()}/`,
  oss: {
    accessKeyId: env('OSS_CLIENT_ID', 'string', ''),
    accessKeySecret: env('OSS_CLIENT_SECRET', 'string', ''),
    region: env('OSS_CLIENT_REGION', 'string', 'oss-cn-hangzhou'),
    endpoint: env(
      'OSS_CLIENT_ENDPOINT',
      'string',
      'https://oss-cn-hangzhou.aliyuncs.com'
    ),
    bucket: env('OSS_CLIENT_BUCKET', 'string', 'oss-client-test'),
  },
  timeout: '120s',
};
