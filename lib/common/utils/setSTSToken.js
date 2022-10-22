const { formatObjKey } = require('./formatObjKey');

async function setSTSToken() {
  if (!this.options) { this.options = {}; }
  const now = new Date();
  if (this.stsTokenFreshTime) {
    if (+now - this.stsTokenFreshTime >= this.options.refreshSTSTokenInterval) {
      this.stsTokenFreshTime = now;
      let credentials = await this.options.refreshSTSToken();
      credentials = formatObjKey(credentials, 'firstLowerCase');
      if (credentials.securityToken) {
        credentials.stsToken = credentials.securityToken;
      }
      checkCredentials(credentials);
      Object.assign(this.options, credentials);
    }
  } else {
    this.stsTokenFreshTime = now;
  }
  return null;
}

exports.setSTSToken = setSTSToken;

function checkCredentials(obj) {
  const stsTokenKey = [ 'accessKeySecret', 'accessKeyId', 'stsToken' ];
  const objKeys = Object.keys(obj);
  stsTokenKey.forEach(_ => {
    if (!objKeys.find(key => key === _)) {
      throw Error(`refreshSTSToken must return contains ${_}`);
    }
  });
}

exports.checkCredentials = checkCredentials;
