/* oxlint-disable no-named-export, no-nodejs-modules */
import { isIP as _isIP } from 'node:net';

export function isIP(address: string) {
  return _isIP(address) > 0;
}
