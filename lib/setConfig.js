'use strict';
const __importDefault = (this && this.__importDefault) || function(mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.client = exports.setConfig = void 0;
const urllib_1 = __importDefault(require('urllib'));
const getUserAgent_1 = require('./common/utils/getUserAgent');
const initOptions_1 = __importDefault(require('./common/client/initOptions'));
class Client {
  constructor(options, ctx) {
    if (!(this instanceof Client)) {
      return new Client(options, ctx);
    }
    if (options && options.inited) {
      this.options = options;
    } else {
      this.options = initOptions_1.default(options);
    }
    // support custom agent and urllib client
    if (this.options.urllib) {
      this.urllib = this.options.urllib;
    } else {
      this.urllib = urllib_1.default;
    }
    this.ctx = ctx;
    this.userAgent = getUserAgent_1.getUserAgent();
  }
}
let client;
exports.client = client;
exports.setConfig = (options, ctx) => {
  exports.client = client = new Client(options, ctx);
};
