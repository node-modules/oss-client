export function policyToJSONString(policy: object | string) {
  let policyJSONString: string;
  if (typeof policy === 'string') {
    try {
      policyJSONString = JSON.stringify(JSON.parse(policy));
    } catch (err: any) {
      throw new TypeError(`Policy string is not a valid JSON: ${err.message}`);
    }
  } else {
    policyJSONString = JSON.stringify(policy);
  }
  return policyJSONString;
}
