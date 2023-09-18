import utility from 'utility';

export function json2xml(json: Record<string, any>, options?: { headers: boolean }) {
  let xml = '';
  if (options?.headers) {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  }
  for (const key in json) {
    const value = json[key];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        xml += `<${key}>`;
        xml += json2xml(item);
        xml += `</${key}>`;
      }
    } else if (typeof value === 'object') {
      xml += `<${key}>`;
      xml += json2xml(value);
      xml += `</${key}>`;
    } else {
      xml += `<${key}>${utility.escape(value.toString())}</${key}>`;
    }
  }
  return xml;
}
