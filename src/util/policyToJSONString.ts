export function policyToJSONString(policy: object | string) {
  let policyJSONString: string;
  if (typeof policy === 'string') {
    try {
      policyJSONString = JSON.stringify(JSON.parse(policy));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TypeError(`Policy string is not a valid JSON: ${message}`);
    }
  } else {
    policyJSONString = JSON.stringify(policy);
  }
  return policyJSONString;
}
