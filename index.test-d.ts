import { expectType } from 'tsd';
import { Writable, Readable } from 'stream';
import {
  GetObjectOptions,
  IObjectSimple,
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
  Client,
  ImageClient,
  ClusterClient,
} from '.';

const getObjectOptions = {} as GetObjectOptions;
expectType<string | undefined>(getObjectOptions.process);

class SimpleClient implements IObjectSimple {
  async list(query: ListObjectsQuery | null, options: RequestOptions): Promise<ListObjectResult> {
    console.log(query, options);
    return {} as any;
  }
  async put(name: string, file: string | Buffer | Readable, options?: PutObjectOptions): Promise<PutObjectResult> {
    console.log(name, file, options);
    return {} as any;
  }
  async head(name: string, options?: HeadObjectOptions): Promise<HeadObjectResult> {
    console.log(name, options);
    return {} as any;
  }

  async get(name: string, options?: GetObjectOptions): Promise<GetObjectResult>;
  async get(name: string, file: string | Writable, options?: GetObjectOptions): Promise<GetObjectResult>;
  async get(name: string, file?: string | Writable | GetObjectOptions, options?: GetObjectOptions): Promise<GetObjectResult> {
    console.log(name, file, options);
    return {} as any;
  }
  async getStream(name?: string, options?: GetStreamOptions): Promise<GetStreamResult> {
    console.log(name, options);
    return {} as any;
  }
  async delete(name: string, options?: RequestOptions): Promise<NormalSuccessResponse> {
    console.log(name, options);
    return {} as any;
  }

  async copy(name: string, sourceName: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;
  async copy(name: string, sourceName: string, sourceBucket: string, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult>;
  async copy(name: string, sourceName: string, sourceBucket?: string | CopyObjectOptions, options?: CopyObjectOptions): Promise<CopyAndPutMetaResult> {
    console.log(name, sourceName, sourceBucket, options);
    return {} as any;
  }
}

const simpleClient = new SimpleClient();
expectType<Promise<GetObjectResult>>(simpleClient.get('foo'));
expectType<Promise<GetObjectResult>>(simpleClient.get('foo', { timeout: 10 }));
expectType<Promise<GetObjectResult>>(simpleClient.get('foo', 'file.path'));

const ossClient = {} as Client;
expectType<Promise<GetObjectResult>>(ossClient.get('foo'));
expectType<Promise<ListObjectResult>>(ossClient.list({ 'max-keys': 100 }));

const clusterClient = {} as ClusterClient;
expectType<Promise<GetObjectResult>>(clusterClient.get('foo'));

const imageClient = {} as ImageClient;
expectType<Promise<{ content: any; res: NormalSuccessResponse }>>(imageClient.get('foo'));
