import { escape as escapeHTML } from 'utility';

export function json2xml(
  json: Record<string, unknown>,
  options?: { headers: boolean }
) {
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
      xml += json2xml(value as Record<string, unknown>);
      xml += `</${key}>`;
    } else {
      xml += `<${key}>${escapeHTML(value.toString())}</${key}>`;
    }
  }
  return xml;
}
