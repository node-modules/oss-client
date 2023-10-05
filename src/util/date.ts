/**
 * Get Unix's timestamp in seconds
 * 一个 Unix 时间戳（自UTC时间1970年01月01号开始的秒数）
 */
export function timestamp() {
  return Math.round(Date.now() / 1000);
}
