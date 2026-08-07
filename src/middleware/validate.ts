import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";

export const validateBody =
  <T extends z.ZodTypeAny>(schema: T) =>
  (req: Request<{}, {}, z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const flattened = z.flattenError(result.error);

      const error = createHttpError(422, "Validation failed");
      // Завжди об'єкт Record<string, string[]> — відповідає ValidationErrorSchema
      (error as any).details = flattened.fieldErrors;

      return next(error);
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  <T extends z.ZodTypeAny>(schema: T) =>
  (req: Request<z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const error = createHttpError(400, "Invalid parameters");
      (error as any).details = z.flattenError(result.error).fieldErrors;
      return next(error);
    }

    req.params = result.data;
    next();
  };

export const validateQuery =
  <T extends z.ZodTypeAny>(schema: T) =>
  (
    req: Request,
    res: Response<any, { query: z.infer<T> }>,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const error = createHttpError(400, "Invalid query parameters");
      (error as any).details = z.flattenError(result.error).fieldErrors;
      return next(error);
    }

    res.locals.query = result.data;
    next();
  };
  