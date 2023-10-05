const ALLOW_STRING_RE = /^[a-zA-Z0-9 +-=._:/]+$/;

export function checkObjectTag(tag: Record<string, string>) {
  if (typeof tag !== 'object') {
    throw new TypeError('tag must be Object');
  }
  const entries = Object.entries(tag);
  if (entries.length > 10) {
    throw new TypeError('maximum of 10 tags for a object');
  }
  for (const [ key, value ] of entries) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new TypeError('the key and value of the tag must be String');
    }
    if (!ALLOW_STRING_RE.test(key) || (value.length > 0 && !ALLOW_STRING_RE.test(value))) {
      throw new TypeError('tag can contain letters, numbers, spaces, and the following symbols: plus sign (+), hyphen (-), equal sign (=), period (.), underscore (_), colon (:), and forward slash (/)');
    }
    if (key.length < 1 || key.length > 128) {
      throw new TypeError('tag key can be a minimum of 1 byte and a maximum of 128 bytes in length');
    }
    if (value.length > 256) {
      throw new TypeError('tag value can be a maximum of 256 bytes in length');
    }
  }
}
