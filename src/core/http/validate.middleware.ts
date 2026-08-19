import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { BadRequestError, ValidationError, type ErrorDetails } from "../exceptions/errors.ts";

export const VALIDATION_MESSAGE = {
  body: "Validation failed",
  params: "Invalid parameters",
  query: "Invalid query parameters",
} as const;

const VALIDATION_FAILURE = {
  body: (details: ErrorDetails) => new ValidationError(VALIDATION_MESSAGE.body, details),
  params: (details: ErrorDetails) => new BadRequestError(VALIDATION_MESSAGE.params, details),
  query: (details: ErrorDetails) => new BadRequestError(VALIDATION_MESSAGE.query, details),
} as const;

const ROOT_ERROR_KEY = "body";

export const toErrorDetails = (error: z.ZodError): ErrorDetails => {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return formErrors.length > 0 ? { [ROOT_ERROR_KEY]: formErrors, ...fieldErrors } : fieldErrors;
};

export const validateBody =
  <T extends z.ZodType>(schema: T) =>
  (req: Request<ParamsDictionary, unknown, z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      return next(VALIDATION_FAILURE.body(toErrorDetails(result.error)));
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  <T extends z.ZodType>(schema: T) =>
  (req: Request<z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(VALIDATION_FAILURE.params(toErrorDetails(result.error)));
    }

    req.params = result.data;
    next();
  };

export const validateQuery =
  <T extends z.ZodType>(schema: T) =>
  (req: Request, res: Response<unknown, { query: z.infer<T> }>, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(VALIDATION_FAILURE.query(toErrorDetails(result.error)));
    }

    res.locals.query = result.data;
    next();
  };
