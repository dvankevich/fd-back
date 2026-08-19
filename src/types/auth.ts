import type { Request } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

export interface AuthPayload {
  sub: string;
}

export interface AuthenticatedRequest<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown>
  extends Request<P, ResBody, ReqBody> {
  user: AuthPayload;
}
