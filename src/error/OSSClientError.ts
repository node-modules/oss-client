const REQUEST_ID_KEY = 'request-id';
const RESPONSE_CODE_KEY = 'response-code';
const RESPONSE_HOST_KEY = 'response-host';

export class OSSClientError extends Error {
  code: string;
  status: number;
  requestId?: string;
  hostId?: string;
  nextAppendPosition?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
    hostId?: string
  ) {
    super(
      `[${REQUEST_ID_KEY}=${requestId}, ${RESPONSE_CODE_KEY}=${code}, ${RESPONSE_HOST_KEY}=${hostId}] ${message}`
    );
    this.status = status;
    this.code = code;
    this.name = 'OSSClientError';
    this.requestId = requestId;
    this.hostId = hostId;
  }
}
