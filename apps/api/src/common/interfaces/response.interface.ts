export interface IPaginationMeta {
  totalRecords: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> {
  items: T[];
  meta: IPaginationMeta;
}

/**
 * `success` is a literal true/false, not boolean — that makes
 * ISuccessResponse<T> | IErrorResponse a discriminated union, so a client
 * (or a test) narrows on `.success` and TypeScript knows which shape it got.
 */
export interface ISuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface IPaginatedSuccessResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: IPaginationMeta;
}

export interface IErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  source: unknown;
  correlationId: string;
  timestamp: string;
}
