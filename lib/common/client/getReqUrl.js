const copy = require('copy-to');
const { format: urlformat } = require('url');
const merge = require('merge-descriptors');
const is = require('is-type-of');
const isIP_1 = require('../utils/isIP');
const { checkConfigValid } = require('../utils/checkConfigValid');

function getReqUrl(params) {
  const ep = {};
  const isCname = this.options.cname;
  checkConfigValid(this.options.endpoint, 'endpoint');
  copy(this.options.endpoint, false).to(ep);
  if (params.bucket && !isCname && !isIP_1.isIP(ep.hostname) && !this.options.sldEnable) {
    ep.host = `${params.bucket}.${ep.host}`;
  }
  let resourcePath = '/';
  if (params.bucket && (this.options.sldEnable)) {
    resourcePath += `${params.bucket}/`;
  }
  if (params.object) {
    // Preserve '/' in result url
    resourcePath += this._escape(params.object).replace(/\+/g, '%2B');
  }
  ep.pathname = resourcePath;
  const query = {};
  if (params.query) {
    merge(query, params.query);
  }
  if (params.subres) {
    let subresAsQuery = {};
    if (is.string(params.subres)) {
      subresAsQuery[params.subres] = '';
    } else if (is.array(params.subres)) {
      params.subres.forEach(k => {
        subresAsQuery[k] = '';
      });
    } else {
      subresAsQuery = params.subres;
    }
    merge(query, subresAsQuery);
  }
  ep.query = query;
  return urlformat(ep);
}

exports.getReqUrl = getReqUrl;
