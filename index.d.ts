// Forked from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/ali-oss/index.d.ts

import { Readable, Writable } from 'stream';
import {
  IObjectSimple,
  GetObjectOptions,
  ListObjectsQuery,
  RequestOptions,
  ListObjectResult,
  PutObjectOptions,
  PutObjectResult,
  NormalSuccessResponse,
  HeadObjectOptions,
  HeadObjectResult,
  GetObjectResult,
  GetStreamOptions,
  GetStreamResult,
  CopyObjectOptions,
  CopyAndPutMetaResult,
  StorageType,
  OwnerType,
  UserMeta,
  ObjectCallback,
  DeleteObjectResult,
} from 'oss-interface';

export * from 'oss-interface';

export interface ClientOptions {
  /** access secret you create */
  accessKeyId: string;
  /** access secret you create */
  accessKeySecret: string;
  /** used by temporary authorization */
  stsToken?: string | undefined;
  /** the default bucket you want to access If you don't have any bucket, please use putBucket() create one first. */
  bucket?: string | undefined;
  /** oss region domain. It takes priority over region. */
  endpoint?: string | undefined;
  /** the bucket data region location, please see Data Regions, default is oss-cn-hangzhou. */
  region?: string | undefined;
  /** access OSS with aliyun internal network or not, default is false. If your servers are running on aliyun too, you can set true to save lot of money. */
  internal?: boolean | undefined;
  /** instruct OSS client to use HTTPS (secure: true) or HTTP (secure: false) protocol. */
  secure?: boolean | undefined;
  /** instance level timeout for all operations, default is 60s */
  timeout?: string | number | undefined;
  /** use custom domain name */
  cname?: boolean | undefined;
  /** use time (ms) of refresh STSToken interval it should be less than sts info expire interval, default is 300000ms(5min) when sts info expires. */
  refreshSTSTokenInterval?: number;
  /** used by auto set stsToken、accessKeyId、accessKeySecret when sts info expires. return value must be object contains stsToken、accessKeyId、accessKeySecret */
  refreshSTSToken?: () => Promise<{ accessKeyId: string, accessKeySecret: string, stsToken: string }>;
}

/**
 * Generate STS Authorization
 */
export class STS {
  constructor(options: STSOptions);

  assumeRole(
    roleArn: string,
    /**
     * RAM Policy config object or valid JSON string
     */
    policy?: object | string, // TODO: RAM policy type
    expirationSeconds?: number,
    session?: string,
    options?: {
      timeout: number;
      /**
       * ctx param in urllib's request param
       */
      ctx: any;
    },
  ): Promise<{ credentials: Credentials }>;
}

export interface Credentials {
  /**
   * STS access key id.
   */
  AccessKeyId: string;

  /**
   * STS access key secret.
   */
  AccessKeySecret: string;

  /**
   * STS token.
   */
  SecurityToken: string;

  /**
   * STS expiration UTC time in ISO format.
   */
  Expiration: string;
}

export interface STSOptions {
  /**
   * Access key id.
   */
  accessKeyId: string;

  /**
   * Access key secret.
   */
  accessKeySecret: string;
}

export interface Bucket {
  name: string;
  region: string;
  creationDate: string;
  StorageClass: StorageType;
}

export type ACLType = 'public-read-write' | 'public-read' | 'private';

export type HTTPMethods = 'GET' | 'POST' | 'DELETE' | 'PUT';

export type RedundancyType = 'LRS' | 'ZRS';

export type RuleStatusType = 'Enabled' | 'Disabled';

export interface LifecycleRule {
  /** rule id, if not set, OSS will auto create it with random string. */
  id?: string | undefined;
  /** store prefix */
  prefix: string;
  /** rule status, allow values: Enabled or Disabled */
  status: RuleStatusType;
  /** expire after the days */
  days?: number | string | undefined;
  /** expire date, e.g.: 2022-10-11T00:00:00.000Z date and days only set one. */
  date: string;
}

export interface CORSRule {
  /** configure for Access-Control-Allow-Origin header */
  allowedOrigin: string | string[];
  /** configure for Access-Control-Allow-Methods header */
  allowedMethod: string | string[];
  /** configure for Access-Control-Allow-Headers header */
  allowedHeader?: string | string[] | undefined;
  /** configure for Access-Control-Expose-Headers header */
  exposeHeader?: string | string[] | undefined;
  /** configure for Access-Control-Max-Age header */
  maxAgeSeconds?: string | string[] | undefined;
}

export interface BucketPolicy {
  Version: string;
  Statement: Array<{
    Action: string[];
    Effect: 'Allow' | 'Deny';
    Principal: string[];
    Resource: string[];
  }>;
}

export interface Checkpoint {
  /** The file object selected by the user, if the browser is restarted, it needs the user to manually trigger the settings */
  file: any;
  /** object key */
  name: string;
  fileSize: number;
  partSize: number;
  uploadId: string;
  doneParts: Array<{ number: number; etag: string }>;
}

export interface ObjectPart {
  PartNumber: number;
  /** {Date} Time when a part is uploaded. */
  LastModified: any;
  ETag: string;
  size: number;
}

export interface Upload {
  name: string;
  uploadId: string;
  initiated: any;
}

export interface Channel {
  Name: string;
  Description: string;
  Status: string;
  LastModified: string;
  PublishUrls: string[];
  PlayUrls: string[];
}

export interface ChannelHistory {
  StartTime: string;
  EndTime: string;
  /** the remote addr */
  RemoteAddr: string;
}

// parameters type
export interface ListBucketsQueryType {
  /** search buckets using prefix key */
  prefix?: string | undefined;
  /** search start from marker, including marker key */
  marker?: string | undefined;
  /** max buckets, default is 100, limit to 1000 */
  'max-keys'?: string | number | undefined;
}

export interface PutBucketOptions {
  acl: ACLType;
  dataRedundancyType: RedundancyType;
  timeout: number;
  storageClass: StorageType;
}

export interface PutBucketWebsiteConfig {
  /** default page, e.g.: index.html */
  index: string;
  /** error page, e.g.: 'error.html' */
  error?: string | undefined;
}

export interface ListV2ObjectsQuery {
  /** search object using prefix key */
  prefix?: string;
  /** search start from token, including token key */
  'continuation-token'?: string;
  /** only search current dir, not including subdir */
  delimiter?: string | number;
  /** max objects, default is 100, limit to 1000  */
  'max-keys'?: string;
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

export interface PutStreamOptions {
  /** the stream length, chunked encoding will be used if absent */
  contentLength?: number | undefined;
  /** the operation timeout */
  timeout: number;
  /** custom mime, will send with Content-Type entity header */
  mime: string;
  meta: UserMeta;
  callback: ObjectCallback;
  headers?: object | undefined;
}

export interface AppendObjectOptions {
  /** specify the position which is the content length of the latest object */
  position?: string | undefined;
  /** the operation timeout */
  timeout?: number | undefined;
  /** custom mime, will send with Content-Type entity header */
  mime?: string | undefined;
  meta?: UserMeta | undefined;
  headers?: object | undefined;
}

export interface AppendObjectResult {
  name: string;
  /** the url of oss */
  url: string;
  res: NormalSuccessResponse;
  /** the next position */
  nextAppendPosition: string;
}

export interface DeleteMultiOptions {
  /** quite mode or verbose mode, default is false */
  quiet?: boolean | undefined;
  timeout?: number | undefined;
}

export interface DeleteMultiResult {
  /** deleted object names list */
  deleted?: string[] | undefined;
  res: NormalSuccessResponse;
}

export interface ResponseHeaderType {
  'content-type'?: string | undefined;
  'content-disposition'?: string | undefined;
  'cache-control'?: string | undefined;
}

export interface SignatureUrlOptions {
  /** after expires seconds, the url will become invalid, default is 1800 */
  expires?: number | undefined;
  /** the HTTP method, default is 'GET' */
  method?: HTTPMethods | undefined;
  /** set the request content type */
  'Content-Type'?: string | undefined;
  /**  image process params, will send with x-oss-process e.g.: {process: 'image/resize,w_200'} */
  process?: string | undefined;
  /** traffic limit, range: 819200~838860800 */
  trafficLimit?: number | undefined;
  /** additional signature parameters in url */
  subResource?: object | undefined;
  /** set the response headers for download */
  response?: ResponseHeaderType | undefined;
  /** set the callback for the operation */
  callback?: ObjectCallback | undefined;
}

export interface GetACLResult {
  acl: ACLType;
  res: NormalSuccessResponse;
}

export interface InitMultipartUploadOptions {
  timeout?: number | undefined;
  /** Mime file type */
  mime?: string | undefined;
  meta?: UserMeta | undefined;
  headers?: object | undefined;
}

export interface InitMultipartUploadResult {
  res: { status: number; headers: object; size: number; rt: number };
  /** bucket name */
  bucket: string;
  /** object name store on OSS */
  name: string;
  /** upload id, use for uploadPart, completeMultipart */
  uploadId: string;
}

export interface UploadPartResult {
  name: string;
  etag: string;
  res: NormalSuccessResponse;
}

export interface CompleteMultipartUploadOptions {
  timeout?: number | undefined;
  callback?: ObjectCallback | undefined;
  headers?: object | undefined;
}

export interface CompleteMultipartUploadResult {
  bucket: string;
  name: string;
  etag: string;
  data: object;
  res: NormalSuccessResponse;
}

export interface MultipartUploadOptions {
  /** the number of parts to be uploaded in parallel */
  parallel?: number | undefined;
  /** the suggested size for each part */
  partSize?: number | undefined;
  /** the progress callback called after each successful upload of one part */
  progress?: ((...args: any[]) => any) | undefined;
  /** the checkpoint to resume upload, if this is provided, it will continue the upload from where interrupted, otherwise a new multipart upload will be created. */
  checkpoint?: Checkpoint | undefined;
  meta?: UserMeta | undefined;
  mime?: string | undefined;
  callback?: ObjectCallback | undefined;
  headers?: object | undefined;
  timeout?: number | undefined;
  /** {Object} only uploadPartCopy api used, detail */
  copyheaders?: object | undefined;
}

export interface MultipartUploadResult {
  bucket: string;
  name: string;
  etag: string;
  data: object;
  res: NormalSuccessResponse;
}

export interface MultipartUploadCopyResult {
  bucket: string;
  name: string;
  etag: string;
  res: NormalSuccessResponse;
}

export interface MultipartUploadCopySourceData {
  /** the source object name */
  sourceKey: string;
  /** sourceData.  the source bucket name */
  sourceBucketName: string;
  /** data copy start byte offset, e.g: 0 */
  startOffset: number;
  /** data copy end byte offset, e.g: 102400 */
  endOffset: number;
}

export interface ListPartsQuery {
  /** The maximum part number in the response of the OSS. default value: 1000. */
  'max-parts': number;
  /** Starting position of a specific list. A part is listed only when the part number is greater than the value of this parameter. */
  'part-number-marker': number;
  /** Specify the encoding of the returned content and the encoding type. Optional value: url */
  'encoding-type': string;
}

export interface ListPartsResult {
  uploadId: string;
  bucket: string;
  name: string;
  PartNumberMarker: number;
  nextPartNumberMarker: number;
  maxParts: number;
  isTruncated: boolean;
  parts: ObjectPart[];
  res: NormalSuccessResponse;
}

export interface ListUploadsQuery {
  prefix?: string | undefined;
  'max-uploads'?: number | undefined;
  'key-marker'?: string | undefined;
  'upload-id-marker'?: string | undefined;
}

export interface ListUploadsResult {
  res: NormalSuccessResponse;
  bucket: string;
  nextKeyMarker: any;
  nextUploadIdMarker: any;
  isTruncated: boolean;
  uploads: Upload[];
}

export interface PutChannelConf {
  Description?: string | undefined;
  Status?: string | undefined;
  Target?: {
    Type: string;
    FragDuration: number;
    FragCount: number;
    PlaylistName: string;
  } | undefined;
}

export interface PutChannelResult {
  publishUrls: string[];
  playUrls: string[];
  res: NormalSuccessResponse;
}

export interface GetChannelResult {
  Status: string;
  ConnectedTime?: string | undefined;
  RemoteAddr?: string | undefined;
  Video?: object | undefined;
  Audio?: object | undefined;
  res: NormalSuccessResponse;
}

export interface ListChannelsQuery {
  /** the channel id prefix (returns channels with this prefix) */
  prefix: string;
  /** the channel id marker (returns channels after this id) */
  marker: string;
  /** max number of channels to return */
  'max-keys ': number;
}

export interface ListChannelsResult {
  channels: Channel[];
  nextMarker: string | null;
  isTruncated: boolean;
  res: NormalSuccessResponse;
}

export interface ChannelHistoryResult {
  records: ChannelHistory;
  res: NormalSuccessResponse;
}

export interface GetRtmpUrlOptions {
  /** the expire time in seconds of the url */
  expires?: number | undefined;
  /** the additional parameters for url, e.g.: {playlistName: 'play.m3u8'} */
  params?: object | undefined;
  /** the operation timeout */
  timeout?: number | undefined;
}

export interface GetBucketPolicyResult {
  policy: BucketPolicy | null;
  status: number;
  res: NormalSuccessResponse;
}

export interface PostObjectParams {
  policy: string;
  OSSAccessKeyId: string;
  Signature: string;
}

// cluster
export interface ClusterType {
  host: string;
  accessKeyId: string;
  accessKeySecret: string;
}

export interface ClusterOptions {
  clusters: ClusterType[];
  schedule?: string | undefined;
}

export class ClusterClient {
  constructor(options: ClusterOptions);

  list(query: ListObjectsQuery | null, options: RequestOptions): Promise<ListObjectResult>;

  /**
   * @since 6.12.0
   */
  listV2(query: ListV2ObjectsQuery | null, options: RequestOptions): Promise<ListObjectResult>;

  put(name: string, file: any, options?: PutObjectOptions): Promise<PutObjectResult>;

  putStream(
    name: string,
    stream: any,
    options?: PutStreamOptions,
  ): Promise<{ name: string; res: NormalSuccessResponse }>;

  head(name: string, options?: HeadObjectOptions): Promise<HeadObjectResult>;

  get(name: string, file?: any, options?: GetObjectOptions): Promise<GetObjectResult>;

  getStream(name?: string, options?: GetStreamOptions): Promise<GetStreamResult>;

  delete(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  copy(name: string, sourceName: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;

  putMeta(name: string, meta: UserMeta, options: RequestOptions): Promise<CopyAndPutMetaResult>;

  deleteMulti(names: string[], options?: DeleteMultiOptions): Promise<DeleteMultiResult>;

  signatureUrl(name: string, options?: SignatureUrlOptions): string;

  asyncSignatureUrl(name: string, options?: SignatureUrlOptions): Promise<string>;

  putACL(name: string, acl: ACLType, options?: RequestOptions): Promise<NormalSuccessResponse>;

  restore(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;
}

// image
export interface ImageClientOptions {
  /** your image service domain that binding to a OSS bucket */
  imageHost: string;
  /** access key you create on aliyun console website */
  accessKeyId: string;
  /** access secret you create */
  accessKeySecret: string;
  /** the default bucket you want to access If you don't have any bucket, please use putBucket() create one first. */
  bucket: string;
  /** the bucket data region location, please see Data Regions, default is oss-cn-hangzhou */
  region?: string | undefined;
  /** access OSS with aliyun internal network or not, default is false If your servers are running on aliyun too, you can set true to save lot of money. */
  internal?: boolean | undefined;
  /** instance level timeout for all operations, default is 60s */
  timeout?: string | number | undefined;
}

export interface ImageGetOptions {
  timeout?: number | undefined;
  headers?: object | undefined;
}

export interface StyleData {
  /** style name */
  Name: string;
  /** style content */
  Content: string;
  /** style create time */
  CreateTime: string;
  /** style last modify time */
  LastModifyTime: string;
}

export class ImageClient {
  constructor(options: ImageClientOptions);

  /**
   * Get an image from the image channel.
   */
  get(name: string, file?: any, options?: ImageGetOptions): Promise<{ content: any; res: NormalSuccessResponse }>;

  /**
   * Get an image read stream.
   */
  getStream(name: string, options?: ImageGetOptions): Promise<{ stream: any; res: NormalSuccessResponse }>;

  /**
   * Get a image exif info by image object name from the image channel.
   */
  getExif(name: string, options?: RequestOptions): Promise<{ data: object; res: NormalSuccessResponse }>;

  /**
   * Get a image info and exif info by image object name from the image channel.
   */
  getInfo(name: string, options?: RequestOptions): Promise<{ data: object; res: NormalSuccessResponse }>;

  /**
   * todo
   */
  putStyle(
    name: string,
    style: string,
    options?: RequestOptions,
  ): Promise<{ data: object; res: NormalSuccessResponse }>;

  /**
   * Get a style by name from the image channel.
   */
  getStyle(name: string, options?: RequestOptions): Promise<{ data: StyleData; res: NormalSuccessResponse }>;

  /**
   * Get all styles from the image channel.
   */
  listStyle(options?: RequestOptions): Promise<StyleData[]>;

  /**
   * todo
   */
  deleteStyle(styleName: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Create a signature url for directly download.
   */
  signatureUrl(name: string, options?: { expires?: string | undefined; timeout?: string | undefined }): string;

  /**
   * Basically the same as signatureUrl, if refreshSTSToken is configured asyncSignatureUrl will refresh stsToken
   */
  asyncSignatureUrl(name: string, options?: SignatureUrlOptions): Promise<string>;
}

// base Client
export class Client implements IObjectSimple {
  constructor(options: ClientOptions);

  /******************************************* the bucket operations *************************************************/

  // base operators
  /**
   * List buckets in this account.
   */
  listBuckets(query: ListBucketsQueryType | null, options?: RequestOptions): Promise<Bucket[]>;

  /**
   * Create a new bucket.
   */
  putBucket(
    name: string,
    options?: PutBucketOptions,
  ): Promise<{ bucket: string; res: NormalSuccessResponse }>;

  /**
   * Use the bucket.
   */
  useBucket(name: string): void;

  /**
   * Delete an empty bucket.
   */
  deleteBucket(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Get bucket information,include CreationDate、ExtranetEndpoint、IntranetEndpoint、Location、Name、StorageClass、 Owner、AccessControlList
   */
  getBucketInfo(name: string): Promise<any>;

  /**
   * Get bucket location
   */
  getBucketLocation(name: string): Promise<any>;

  // ACL operations
  /**
   * Update the bucket ACL.
   */
  putBucketACL(name: string, acl: ACLType, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Get the bucket ACL.
   *   acl - acl settings string
   */
  getBucketACL(name: string, options?: RequestOptions): Promise<{ acl: string; res: NormalSuccessResponse }>;

  // logging operations
  /**
   * Update the bucket logging settings. Log file will create every one hour and name format: <prefix><bucket>-YYYY-mm-DD-HH-MM-SS-UniqueString.
   */
  putBucketLogging(name: string, prefix?: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Get the bucket logging settings.
   */
  getBucketLogging(
    name: string,
    options?: RequestOptions,
  ): Promise<{ enable: boolean; prefix: string | null; res: NormalSuccessResponse }>;

  /**
   * Delete the bucket logging settings.
   */
  deleteBucketLogging(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  // Website operations
  /**
   * Set the bucket as a static website.
   */
  putBucketWebsite(name: string, config: PutBucketWebsiteConfig): Promise<NormalSuccessResponse>;

  /**
   * Get the bucket website config.
   */
  getBucketWebsite(
    name: string,
    options?: RequestOptions,
  ): Promise<{ index: string; error: string; res: NormalSuccessResponse }>;

  /**
   * Delete the bucket website config.
   */
  deleteBucketWebsite(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  // referer operations
  /**
   * Set the bucket request Referer white list.
   */
  putBucketReferer(
    name: string,
    allowEmpty: boolean,
    referers: string[],
    options?: RequestOptions,
  ): Promise<NormalSuccessResponse>;

  /**
   * Get the bucket request Referer white list.
   */
  getBucketReferer(
    name: string,
    options?: RequestOptions,
  ): Promise<{ allowEmpty: boolean; referers: string[]; res: NormalSuccessResponse }>;

  /**
   * Delete the bucket request Referer white list.
   */
  deleteBucketReferer(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  // lifecycle operations
  /**
   * Set the bucket object lifecycle.
   */
  putBucketLifecycle(
    name: string,
    rules: LifecycleRule[],
    options?: RequestOptions,
  ): Promise<NormalSuccessResponse>;

  /**
   * Get the bucket object lifecycle.
   */
  getBucketLifecycle(
    name: string,
    options?: RequestOptions,
  ): Promise<{ rules: LifecycleRule[]; res: NormalSuccessResponse }>;

  /**
   * Delete the bucket object lifecycle.
   */
  deleteBucketLifecycle(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  // CORS operations
  /**
   * Set CORS rules of the bucket object
   */
  putBucketCORS(
    name: string,
    rules: CORSRule[],
    options?: RequestOptions,
  ): Promise<NormalSuccessResponse>;

  /**
   * Get CORS rules of the bucket object.
   */
  getBucketCORS(name: string): Promise<{ rules: CORSRule[]; res: NormalSuccessResponse }>;

  /**
   * Delete CORS rules of the bucket object.
   */
  deleteBucketCORS(name: string): Promise<NormalSuccessResponse>;

  // policy operations
  /**
   * Adds or modify policy for a bucket.
   */
  putBucketPolicy(
    name: string,
    policy: BucketPolicy,
    options?: RequestOptions
  ): Promise<{
    status: number,
    res: NormalSuccessResponse,
  }>;

  /**
   * Obtains the policy for a bucket.
   */
  getBucketPolicy(name: string, options?: RequestOptions): Promise<GetBucketPolicyResult>;

  /**
   * Deletes the policy added for a bucket.
   */
  deleteBucketPolicy(
    name: string,
    options?: RequestOptions
  ): Promise<{
    status: number,
    res: NormalSuccessResponse,
  }>;

  /********************************************************** Object operations ********************************************/
  /**
   * List objects in the bucket.
   */
  list(query: ListObjectsQuery | null, options?: RequestOptions): Promise<ListObjectResult>;

  /**
   * Add an object to the bucket.
   */
  put(name: string, file: string | Buffer | Uint8Array | Readable, options?: PutObjectOptions): Promise<PutObjectResult>;

  /**
   * Add a stream object to the bucket.
   */
  putStream(
    name: string,
    stream: any,
    options?: PutStreamOptions,
  ): Promise<{ name: string; res: NormalSuccessResponse }>;

  /**
   * Append an object to the bucket, it's almost same as put, but it can add content to existing object rather than override it.
   */
  append(name: string, file: any, options?: AppendObjectOptions): Promise<AppendObjectResult>;

  /**
   * Get the Object url. If provide baseUrl, will use baseUrl instead the default endpoint.
   */
  getObjectUrl(name: string, baseUrl?: string): string;

  /**
   * Get the Object url. If provide baseUrl, will use baseUrl instead the default bucket and endpoint. Suggest use generateObjectUrl instead of getObjectUrl.
   */
  generateObjectUrl(name: string, baseUrl?: string): string;

  /**
   * Head an object and get the meta info.
   */
  head(name: string, options?: HeadObjectOptions): Promise<HeadObjectResult>;

  /**
   * Get an object from the bucket.
   */
  get(name: string, options?: GetObjectOptions): Promise<GetObjectResult>;
  get(name: string, file: string | Writable, options?: GetObjectOptions): Promise<GetObjectResult>;

  /**
   * Get an object read stream.
   */
  getStream(name?: string, options?: GetStreamOptions): Promise<GetStreamResult>;

  /**
   * Delete an object from the bucket.
   */
  delete(name: string, options?: RequestOptions): Promise<DeleteObjectResult>;

  /**
   * Copy an object from sourceName to name.
   */
  copy(name: string, sourceName: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;
  copy(name: string, sourceName: string, sourceBucket: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;

  /**
   * Set an exists object meta.
   */
  putMeta(name: string, meta: UserMeta, options: RequestOptions): Promise<CopyAndPutMetaResult>;

  /**
   * Delete multi objects in one request.
   */
  deleteMulti(names: string[], options?: DeleteMultiOptions): Promise<DeleteMultiResult>;

  /**
   * Create a signature url for download or upload object. When you put object with signatureUrl ,you need to pass Content-Type.Please look at the example.
   */
  signatureUrl(name: string, options?: SignatureUrlOptions): string;

  /**
   * Basically the same as signatureUrl, if refreshSTSToken is configured asyncSignatureUrl will refresh stsToken
   */
  asyncSignatureUrl(name: string, options?: SignatureUrlOptions): Promise<string>;

  /**
   * Set object's ACL.
   */
  putACL(name: string, acl: ACLType, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Get object's ACL.
   */
  getACL(name: string, options?: RequestOptions): Promise<GetACLResult>;

  /**
   * Restore Object.
   */
  restore(name: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * multi upload
   */
  initMultipartUpload(name: string, options?: InitMultipartUploadOptions): Promise<InitMultipartUploadResult>;

  /**
   * After initiating a Multipart Upload event, you can upload data in parts based on the specified object name and Upload ID.
   */
  uploadPart(
    name: string,
    uploadId: string,
    partNo: number,
    file: any,
    start: number,
    end: number,
    options?: RequestOptions,
  ): Promise<UploadPartResult>;

  /**
   * Using Upload Part Copy, you can copy data from an existing object and upload a part of the data.
   * When copying a file larger than 1 GB, you must use the Upload Part Copy method. If you want to copy a file smaller than 1 GB, see Copy Object.
   */
  uploadPartCopy(
    name: string,
    uploadId: string,
    partNo: number,
    range: string,
    sourceData: { sourceKey: string; sourceBucketName: string },
    options: { timeout?: number | undefined; headers?: object | undefined },
  ): Promise<UploadPartResult>;

  /**
   * After uploading all data parts, you must call the Complete Multipart Upload API to complete Multipart Upload for the entire file.
   */
  completeMultipartUpload(
    name: string,
    uploadId: string,
    parts: Array<{ number: number; etag: string }>,
    options?: CompleteMultipartUploadOptions,
  ): Promise<CompleteMultipartUploadResult>;

  /**
   * Upload file with OSS multipart.
   */
  multipartUpload(name: string, file: any, options: MultipartUploadOptions): Promise<MultipartUploadResult>;

  /**
   * Copy file with OSS multipart.
   * this function contains head, initMultipartUpload, uploadPartCopy, completeMultipartUpload.
   * When copying a file larger than 1 GB, you should use the Upload Part Copy method. If you want to copy a file smaller than 1 GB, see Copy Object.
   */
  multipartUploadCopy(
    name: string,
    sourceData: MultipartUploadCopySourceData,
    options?: MultipartUploadOptions,
  ): Promise<MultipartUploadCopyResult>;

  /**
   * The ListParts command can be used to list all successfully uploaded parts mapped to a specific upload ID, i.e.: those not completed and not aborted.
   */
  listParts(
    name: string,
    uploadId: string,
    query?: ListPartsQuery,
    options?: RequestOptions,
  ): Promise<ListPartsResult>;

  /**
   * List on-going multipart uploads, i.e.: those not completed and not aborted.
   */
  listUploads(query: ListUploadsQuery, options?: RequestOptions): Promise<ListUploadsResult>;

  /**
   * Abort a multipart upload for object.
   */
  abortMultipartUpload(
    name: string,
    uploadId: string,
    options?: RequestOptions,
  ): Promise<NormalSuccessResponse>;

  /**
   * get postObject params.
   */
  calculatePostSignature(
    /**
     * policy config object or JSON string
     */
    policy: object | string
  ): PostObjectParams;

  /************************************************ RTMP Operations *************************************************************/
  /**
   * Create a live channel.
   */
  putChannel(id: string, conf: PutChannelConf, options?: RequestOptions): Promise<PutChannelResult>;

  /**
   * Get live channel info.
   */
  getChannel(
    id: string,
    options?: RequestOptions,
  ): Promise<{ data: PutChannelConf; res: NormalSuccessResponse }>;

  /**
   * Delete a live channel.
   */
  deleteChannel(id: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Change the live channel status.
   */
  putChannelStatus(id: string, status?: string, options?: RequestOptions): Promise<NormalSuccessResponse>;

  /**
   * Get the live channel status.
   */
  getChannelStatus(id: string, options?: RequestOptions): Promise<GetChannelResult>;

  /**
   * List channels.
   */
  listChannels(query: ListChannelsQuery, options?: RequestOptions): Promise<ListChannelsResult>;

  /**
   * Get the live channel history.
   */
  getChannelHistory(id: string, options?: RequestOptions): Promise<ChannelHistoryResult>;

  /**
   * Create a VOD playlist for the channel.
   */
  createVod(
    id: string,
    name: string,
    time: { startTime: number; endTime: number },
    options?: RequestOptions,
  ): Promise<NormalSuccessResponse>;

  /**
   * Get signatured rtmp url for publishing.
   */
  getRtmpUrl(channelId?: string, options?: GetRtmpUrlOptions): string;
}
