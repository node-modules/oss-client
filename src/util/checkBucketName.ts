export function checkBucketName(name: string, createBucket = false) {
  const bucketRegex = createBucket ? /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/ : /^[a-z0-9_][a-z0-9-_]{1,61}[a-z0-9_]$/;
  if (!bucketRegex.test(name)) {
    throw new TypeError('The bucket must be conform to the specifications');
  }
}
