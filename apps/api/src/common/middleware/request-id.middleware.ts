import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generates (or passes through an inbound) request id ONCE, before the
 * Nest interceptor/filter pipeline runs, and echoes it as a response
 * header. LoggingInterceptor and AllExceptionsFilter both read it off the
 * request instead of each minting their own — otherwise a failing
 * request's success-path log and its error-response correlationId carry
 * two different ids, and "find the log lines for this failure" (backend
 * PRD §13, observability) doesn't actually work.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers[REQUEST_ID_HEADER];
  const id = typeof existing === "string" && existing.length > 0 ? existing : randomUUID();
  req.headers[REQUEST_ID_HEADER] = id;
  res.setHeader("X-Request-Id", id);
  next();
}
