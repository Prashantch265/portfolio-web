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
 * Cursor pagination's own meta shape — genuinely different from
 * IPaginationMeta's page/totalPages, which don't mean anything for a
 * keyset-paginated list (backend PRD §5's `/api/posts?cursor=`).
 * ResponseInterceptor's paginated-response detection is structural
 * (`"items" in value && "meta" in value`), so this rides the same
 * {items, meta} envelope without needing interceptor changes.
 */
export interface ICursorPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ICursorPaginatedResponse<T> {
  items: T[];
  meta: ICursorPaginationMeta;
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
