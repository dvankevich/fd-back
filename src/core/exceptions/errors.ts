import { HTTP_STATUS, type HttpStatus } from "../http/http-status.ts";
import type { Optional } from "../types/common.ts";

export type ErrorDetails = Record<string, string[]>;

type AppErrorOptions = { status: HttpStatus; message: string; details?: ErrorDetails };

export class AppError extends Error {
  readonly status: HttpStatus;
  readonly statusCode: HttpStatus;
  readonly expose = true;
  readonly details: Optional<ErrorDetails>;

  constructor({ status, message, details }: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.statusCode = status;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({ status: HTTP_STATUS.badRequest, message, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super({ status: HTTP_STATUS.unauthorized, message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super({ status: HTTP_STATUS.forbidden, message });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super({ status: HTTP_STATUS.notFound, message });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super({ status: HTTP_STATUS.conflict, message });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({ status: HTTP_STATUS.unprocessableEntity, message, details });
  }
}

export const isAppError = (err: unknown): err is AppError => err instanceof AppError;
