/* oxlint-disable no-named-export */
import type {
  DeleteObjectOptions,
  NormalSuccessResponse,
  OwnerType,
  RequestOptions,
  UserMeta,
  ListObjectResult,
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
  /** Additional parameters in url */
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
  /** Additional parameters in url */
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

export interface PutSymlinkOptions extends RequestOptions {
  meta?: UserMeta;
  versionId?: string;
  storageClass?: string;
  subResource?: Record<string, string>;
  headers?: IncomingHttpHeaders;
}

export interface PutSymlinkResult {
  res: NormalSuccessResponse;
}

export interface GetSymlinkOptions extends RequestOptions {
  versionId?: string;
  subResource?: Record<string, string>;
}

export interface GetSymlinkResult {
  targetName: string;
  res: NormalSuccessResponse;
  meta: Record<string, string>;
}

export interface PutObjectTaggingOptions extends RequestOptions {
  versionId?: string;
  subResource?: Record<string, string>;
}

export interface PutObjectTaggingResult {
  res: NormalSuccessResponse;
  status: number;
}

export interface GutObjectTaggingOptions extends RequestOptions {
  versionId?: string;
  subResource?: Record<string, string>;
}

export interface GutObjectTaggingResult {
  res: NormalSuccessResponse;
  status: number;
  tag: Record<string, string>;
}

export interface DeleteObjectTaggingOptions extends RequestOptions {
  versionId?: string;
  subResource?: Record<string, string>;
}

export interface DeleteObjectTaggingResult {
  res: NormalSuccessResponse;
  status: number;
}

export interface AppendObjectOptions {
  /** Specify the position which is the content length of the latest object */
  position?: string | number;
  /** The operation timeout */
  timeout?: number;
  /** Custom mime, will send with Content-Type entity header */
  mime?: string;
  meta?: UserMeta;
  headers?: IncomingHttpHeaders;
}

export interface AppendObjectResult {
  name: string;
  /** The url of oss */
  url: string;
  res: NormalSuccessResponse;
  /** The next position */
  nextAppendPosition: string;
}

export interface ListV2ObjectsQuery {
  /** Search object using prefix key */
  prefix?: string;
  /** Search start from token, including token key */
  'continuation-token'?: string;
  /**
   * @alias 'continuation-token'
   */
  continuationToken?: string;
  /** Only search current dir, not including subdir */
  delimiter?: string;
  /** Max objects, default is 100, limit to 1000  */
  'max-keys'?: string | number;
  /**
   * The name of the object from which the list operation begins.
   * If this parameter is specified, objects whose names are alphabetically greater than the start-after parameter value are returned.
   */
  'start-after'?: string;
  /** Specifies whether to include the information about object owners in the response. */
  'fetch-owner'?: boolean;
  /** Specifies that the object names in the response are URL-encoded. */
  'encoding-type'?: 'url' | '';
}

export interface ListV2ObjectResult
  extends Omit<ListObjectResult, 'nextMarker'> {
  keyCount: number;
  /** Prev index */
  continuationToken?: string;
  /** Next index */
  nextContinuationToken?: string;
}
