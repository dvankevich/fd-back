import type { Request } from "express";

/**
 * Те, що реально кладемо в JWT access token
 */
export interface AuthPayload {
  sub: string; // userId як рядок
}

/**
 * Request після проходження middleware authenticate
 */
export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}
