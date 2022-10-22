const { env } = process;

const config = module.exports;

config.oss = {
  accessKeyId: env.ALI_SDK_OSS_ID,
  accessKeySecret: env.ALI_SDK_OSS_SECRET,
  region: env.ALI_SDK_OSS_REGION,
  endpoint: env.ALI_SDK_OSS_ENDPOINT,
  bucket: env.ALI_SDK_OSS_BUCKET,
};

config.sts = {
  accessKeyId: env.ALI_SDK_STS_ID,
  accessKeySecret: env.ALI_SDK_STS_SECRET,
  roleArn: env.ALI_SDK_STS_ROLE,
  bucket: env.ALI_SDK_STS_BUCKET,
  endpoint: env.ALI_SDK_STS_ENDPOINT,
};

config.metaSyncTime = env.CI ? '30s' : '1000ms';
config.timeout = '120s';
