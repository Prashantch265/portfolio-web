import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, type Observable } from "rxjs";
import { SUCCESS_MESSAGE_KEY } from "../decorators/success-message.decorator.js";
import { SKIP_ENVELOPE_KEY } from "../decorators/skip-envelope.decorator.js";
import type {
  IPaginatedResponse,
  IPaginatedSuccessResponse,
  ISuccessResponse,
} from "../interfaces/response.interface.js";

const DEFAULT_SUCCESS_MESSAGE = "Operation completed successfully.";

/**
 * Wraps every controller return value in {success, message, data} (or
 * {success, message, data, meta} when the handler returns {items, meta}).
 * @SkipEnvelope() opts a route out entirely — health/readiness routes
 * use this since their body is an infra contract, not a business response.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T | IPaginatedResponse<T>, unknown>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T | IPaginatedResponse<T>>,
  ): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }

    const message =
      this.reflector.getAllAndOverride<string>(SUCCESS_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_SUCCESS_MESSAGE;

    return next.handle().pipe(
      map((data): ISuccessResponse<T> | IPaginatedSuccessResponse<T> => {
        if (isPaginated<T>(data)) {
          return { success: true, message, data: data.items, meta: data.meta };
        }
        return { success: true, message, data: data as T };
      }),
    );
  }
}

function isPaginated<T>(value: unknown): value is IPaginatedResponse<T> {
  return typeof value === "object" && value !== null && "items" in value && "meta" in value;
}
