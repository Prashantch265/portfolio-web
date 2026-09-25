import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { tap } from "rxjs";

/**
 * Structured JSON request logging (backend PRD §13). Deliberately narrow:
 * this interceptor only ever reads route/status/duration/request-id off
 * the already-in-flight request — never the body, never the raw request
 * object, never an IP — so there is no code path here that *could* log
 * PII, rather than a policy that merely says not to.
 *
 * requestId comes from requestIdMiddleware, which runs before this and
 * guarantees the header is set — AllExceptionsFilter reads the same
 * header, so a request's success-path log and its error correlationId
 * are always the same id.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const requestId = req.headers["x-request-id"] as string;
    const start = performance.now();
    const { method, path } = req;

    return next.handle().pipe(
      tap({
        next: () => this.log(requestId, method, path, res.statusCode, start),
        error: () => this.log(requestId, method, path, res.statusCode || 500, start),
      }),
    );
  }

  private log(requestId: string, method: string, route: string, status: number, start: number) {
    const durationMs = Math.round(performance.now() - start);
    this.logger.log(JSON.stringify({ requestId, method, route, status, durationMs }));
  }
}
