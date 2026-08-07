import type { Request } from "express";

export interface AuthPayload {
  sub: string; // userId (string)
}

export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}