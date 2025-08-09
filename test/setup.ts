import { File } from 'node:buffer';

// multi undici version in node version less than 20 https://github.com/nodejs/undici/issues/4374
if (typeof global.File === 'undefined') {
  // @ts-ignore
  global.File = File;
}
