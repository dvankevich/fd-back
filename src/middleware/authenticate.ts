import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.ts";
import type { AuthPayload } from "../types/auth.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw createHttpError(401, "Authentication required");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    throw createHttpError(401, "Invalid or expired token");
  }
};

export default authenticate;
