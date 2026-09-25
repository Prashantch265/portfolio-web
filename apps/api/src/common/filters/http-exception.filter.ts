import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { CustomHttpException } from "../exceptions/exceptions.js";
import type { IErrorResponse } from "../interfaces/response.interface.js";

/**
 * Single place every thrown error passes through on its way to the
 * client (backend PRD §13). The rule that matters: an unrecognized
 * Error's `.message` is NEVER sent to the client — only logged, keyed by
 * the request id. Returning raw driver/stack-trace text on a 500 hands
 * an attacker schema/internals for free.
 *
 * correlationId is the SAME id requestIdMiddleware attached to this
 * request (echoed as X-Request-Id) — not a fresh one — so a client-visible
 * error and its log lines are trivially connectable.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const correlationId = (req.headers["x-request-id"] as string | undefined) ?? "unknown";

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error.";
    let source: unknown = null;

    if (exception instanceof CustomHttpException) {
      status = exception.getStatus();
      message = exception.message;
      source = exception.source;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === "string" ? body : ((body as { message?: string }).message ?? exception.message);
    }
    // else: unrecognized Error/unknown throw — status/message stay generic.
    // The real detail goes to the log line below, never to the response body.

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
        correlationId,
      );
    } else {
      // Expected-shape errors (404/422/...) are normal traffic, not
      // incidents — logged for traceability, not at error severity.
      this.logger.warn(`${status} ${message}`, correlationId);
    }

    const body: IErrorResponse = {
      success: false,
      statusCode: status,
      message,
      source,
      correlationId,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(body);
  }
}
