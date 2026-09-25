import { Injectable, Optional, type PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";
import { ValidationException } from "../exceptions/exceptions.js";

/**
 * Registered globally in AppModule (backend PRD §3) so no handler body
 * reaches a controller unvalidated once M1 adds real DTOs. A route with
 * no @ZodBody()-style metadata simply passes through untouched — this
 * pipe only acts on values it's been given a schema for.
 *
 * @Optional() matters here: without it, Nest's DI tries to resolve the
 * constructor parameter's design-time type (a third-party interface with
 * no provider) when this class is instantiated via the global APP_PIPE
 * registration, and throws UnknownDependenciesException at boot. Per-route
 * usage still works by constructing the class manually — @UsePipes(new
 * ZodValidationPipe(schema)) — which bypasses DI entirely.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(@Optional() private readonly schema?: ZodSchema) {}

  transform(value: unknown) {
    if (!this.schema) return value;
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // {field: [messages]} shape — AllExceptionsFilter reads this off
      // ValidationException.source and returns it as the error body's
      // `source` field, per the unified exception hierarchy.
      const source: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        (source[path] ??= []).push(issue.message);
      }
      throw new ValidationException("Validation failed", source);
    }
    return result.data;
  }
}
