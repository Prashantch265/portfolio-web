import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Base for every domain exception. `source` is the structured-detail
 * channel — validation errors put `{field: string[]}` here, everything
 * else leaves it null. The global filter reads `source` off this class
 * specifically, so throwing @nestjs/common's NotFoundException instead
 * loses that channel silently. Import exceptions from here, never from
 * @nestjs/common, so there is exactly one NotFoundException in scope.
 */
export class CustomHttpException extends HttpException {
  constructor(
    status: HttpStatus,
    message: string,
    public readonly source: unknown = null,
  ) {
    super(message, status);
  }
}

export class AuthException extends CustomHttpException {
  constructor(message = "Authentication failed.", source: unknown = null) {
    super(HttpStatus.UNAUTHORIZED, message, source);
  }
}

export class ForbiddenException extends CustomHttpException {
  constructor(message = "You do not have access to this resource.", source: unknown = null) {
    super(HttpStatus.FORBIDDEN, message, source);
  }
}

export class ValidationException extends CustomHttpException {
  constructor(message = "Validation failed.", source: Record<string, string[]> = {}) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message, source);
  }
}

export class NotFoundException extends CustomHttpException {
  constructor(message = "Resource not found.", source: unknown = null) {
    super(HttpStatus.NOT_FOUND, message, source);
  }
}

export class ConflictException extends CustomHttpException {
  constructor(message = "Resource already exists.", source: unknown = null) {
    super(HttpStatus.CONFLICT, message, source);
  }
}

export class DatabaseException extends CustomHttpException {
  constructor(message = "A database error occurred.", source: unknown = null) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message, source);
  }
}

export class BadGatewayException extends CustomHttpException {
  constructor(message = "Upstream service returned an error.", source: unknown = null) {
    super(HttpStatus.BAD_GATEWAY, message, source);
  }
}

export class ServiceUnavailableException extends CustomHttpException {
  constructor(message = "Service temporarily unavailable.", source: unknown = null) {
    super(HttpStatus.SERVICE_UNAVAILABLE, message, source);
  }
}
