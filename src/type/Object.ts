import type { DeleteObjectOptions, NormalSuccessResponse } from 'oss-interface';

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
