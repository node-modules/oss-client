export default {
  prefix: `${process.platform}-${process.version}-${new Date().getTime()}/`,
  oss: {
    accessKeyId: process.env.OSS_CLIENT_ID!,
    accessKeySecret: process.env.OSS_CLIENT_SECRET!,
    region: process.env.OSS_CLIENT_REGION,
    endpoint: process.env.OSS_CLIENT_ENDPOINT!,
    bucket: process.env.OSS_CLIENT_BUCKET!,
  },
  timeout: '120s',
};
