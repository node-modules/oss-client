import type { ObjectCallback } from 'oss-interface';

export interface CallbackOptions {
  callback: string;
  callbackVar?: string;
}

export function encodeCallback(objectCallback: ObjectCallback) {
  const data: Record<string, string> = {
    // must use encodeURI not encodeURIComponent
    callbackUrl: encodeURI(objectCallback.url),
    callbackBody: objectCallback.body,
  };
  if (objectCallback.host) {
    data.callbackHost = objectCallback.host;
  }
  if (objectCallback.contentType) {
    data.callbackBodyType = objectCallback.contentType;
  }
  const callbackHeaderValue = Buffer.from(JSON.stringify(data)).toString(
    'base64'
  );
  const options: CallbackOptions = {
    callback: callbackHeaderValue,
  };

  if (objectCallback.customValue) {
    const callbackVar: Record<string, string> = {};
    for (const key in objectCallback.customValue) {
      callbackVar[`x:${key}`] = objectCallback.customValue[key].toString();
    }
    options.callbackVar = Buffer.from(JSON.stringify(callbackVar)).toString(
      'base64'
    );
  }
  return options;
}
