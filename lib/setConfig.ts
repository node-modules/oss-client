import urllib from 'urllib';
import { getUserAgent } from './common/utils/getUserAgent';
import initOptions from './common/client/initOptions';

class Client {
  public options;

  public urllib;

  public agent;

  public httpsAgent;

  public ctx;

  public userAgent;

  public constructor(options, ctx) {
    if (!(this instanceof Client)) {
      return new Client(options, ctx);
    }

    if (options && options.inited) {
      this.options = options;
    } else {
      this.options = initOptions(options);
    }

    // support custom agent and urllib client
    if (this.options.urllib) {
      this.urllib = this.options.urllib;
    } else {
      this.urllib = urllib;
    }
    this.ctx = ctx;
    this.userAgent = getUserAgent();
  }
}

let client;
export const setConfig = (options, ctx) => {
  client = new Client(options, ctx);
};

export {
  client
};
