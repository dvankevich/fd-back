import type { Request } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { AuthPayload } from "../domain/auth-payload.ts";

export interface AuthenticatedRequest<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown>
  extends Request<P, ResBody, ReqBody> {
  user: AuthPayload;
}
