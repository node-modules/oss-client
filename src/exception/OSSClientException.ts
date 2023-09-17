const REQUEST_ID_KEY = 'request-id';
const RESPONSE_CODE_KEY = 'response-code';
const RESPONSE_HOST_KEY = 'response-host';

export class OSSClientException extends Error {
  code: string;

  constructor(code: string, message: string, requestId?: string, hostId?: string) {
    super(`[${REQUEST_ID_KEY}=${requestId}, ${RESPONSE_CODE_KEY}=${code}, ${RESPONSE_HOST_KEY}=${hostId}] ${message}`);
    this.code = code;
    this.name = 'OSSClientException';
  }
}
