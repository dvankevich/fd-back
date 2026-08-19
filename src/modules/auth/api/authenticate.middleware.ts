import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { AuthenticatorService } from "../application/authenticator.service.ts";
import type { AuthenticatedRequest } from "./authenticated-request.ts";

export const createAuthenticate =
  (authenticator: Pick<AuthenticatorService, "authenticate">): RequestHandler =>
  async (req, _res, next) => {
    req.user = await authenticator.authenticate(req.headers.authorization);
    next();
  };

export type AuthenticatedHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
> = (req: AuthenticatedRequest<P, ResBody, ReqBody>, res: Response<ResBody>) => Promise<void>;

const MISSING_AUTHENTICATE = "withUser() requires the authenticate middleware on the route";

export const withUser =
  <P = ParamsDictionary, ResBody = unknown, ReqBody = unknown>(
    handler: AuthenticatedHandler<P, ResBody, ReqBody>,
  ): RequestHandler<P, ResBody, ReqBody> =>
  (req: Request<P, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => {
    const { user } = req;
    if (!user) {
      next(new Error(MISSING_AUTHENTICATE));
      return;
    }
    return handler(Object.assign(req, { user }), res);
  };
