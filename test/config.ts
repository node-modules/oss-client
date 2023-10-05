export default {
  prefix: `${process.platform}-${process.version}-${new Date().getTime()}/`,
  oss: {
    accessKeyId: process.env.OSS_CLIENT_ID! || process.env.ALI_SDK_OSS_ID,
    accessKeySecret: process.env.OSS_CLIENT_SECRET! || process.env.ALI_SDK_OSS_SECRET,
    region: process.env.OSS_CLIENT_REGION || process.env.ALI_SDK_OSS_REGION,
    endpoint: process.env.OSS_CLIENT_ENDPOINT! || process.env.ALI_SDK_OSS_ENDPOINT,
    bucket: process.env.OSS_CLIENT_BUCKET! || process.env.ALI_SDK_OSS_BUCKET,
  },
  timeout: '120s',
};
