import type { ValueOf } from "../types/common.ts";

export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessableEntity: 422,
  tooManyRequests: 429,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;

export type HttpStatus = ValueOf<typeof HTTP_STATUS>;
