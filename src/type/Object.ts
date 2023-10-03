import type {
  DeleteObjectOptions, NormalSuccessResponse, OwnerType, RequestOptions, UserMeta,
} from 'oss-interface';
import type { IncomingHttpHeaders } from 'urllib';

export interface DeleteMultipleObject {
  key: string;
  versionId?: string;
}

export interface DeleteMultipleObjectXML {
  Key: string;
  VersionId?: string;
}

export interface DeleteMultipleObjectOptions extends DeleteObjectOptions {
  quiet?: boolean;
}

export interface DeleteMultipleResponseObjectXML {
  Key: string;
  VersionId?: string;
  DeleteMarker?: boolean;
  DeleteMarkerVersionId?: string;
}

export interface DeleteMultipleObjectResponse {
  res: NormalSuccessResponse;
  deleted: DeleteMultipleResponseObjectXML[];
}

export type ACLType = 'public-read-write' | 'public-read' | 'private';

export interface PutACLOptions extends RequestOptions {
  versionId?: string;
  /** additional parameters in url */
  subResource?: Record<string, string>;
  /**
   * @alias subResource
   * @deprecated
   */
  subres?: Record<string, string>;
  headers?: IncomingHttpHeaders;
}

export interface PutACLResult {
  res: NormalSuccessResponse;
}

export interface GetACLOptions extends RequestOptions {
  versionId?: string;
  /** additional parameters in url */
  subResource?: Record<string, string>;
  /**
   * @alias subResource
   * @deprecated
   */
  subres?: Record<string, string>;
}

export interface GetACLResult {
  acl: ACLType;
  owner: OwnerType;
  res: NormalSuccessResponse;
}

export interface AppendObjectOptions {
  /** specify the position which is the content length of the latest object */
  position?: string | number;
  /** the operation timeout */
  timeout?: number;
  /** custom mime, will send with Content-Type entity header */
  mime?: string;
  meta?: UserMeta;
  headers?: IncomingHttpHeaders;
}

export interface AppendObjectResult {
  name: string;
  /** the url of oss */
  url: string;
  res: NormalSuccessResponse;
  /** the next position */
  nextAppendPosition: string;
}
