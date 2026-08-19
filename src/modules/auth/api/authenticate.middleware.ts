import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import type { AuthenticatorService } from "../application/authenticator.service.ts";
import type { AuthenticatedRequest } from "./authenticated-request.ts";

export const createAuthenticate =
  (authenticator: Pick<AuthenticatorService, "authenticate">): RequestHandler =>
  async (req, _res, next) => {
    req.user = await authenticator.authenticate(req.headers.authorization);
    next();
  };

export const createOptionalAuthenticate =
  (authenticator: Pick<AuthenticatorService, "identify">): RequestHandler =>
  async (req, res, next) => {
    res.vary("Authorization");
    req.user = await authenticator.identify(req.headers.authorization);
    next();
  };

export type AuthenticatedHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody>,
  res: Response<ResBody, Locals>,
) => Promise<void>;

const MISSING_AUTHENTICATE = "withUser() requires the authenticate middleware on the route";

export const withUser =
  <
    P = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    Locals extends Record<string, unknown> = Record<string, unknown>,
  >(
    handler: AuthenticatedHandler<P, ResBody, ReqBody, Locals>,
  ): RequestHandler<P, ResBody, ReqBody, ParsedQs, Locals> =>
  (req: Request<P, ResBody, ReqBody>, res: Response<ResBody, Locals>, next: NextFunction) => {
    const { user } = req;
    if (!user) {
      next(new Error(MISSING_AUTHENTICATE));
      return;
    }
    return handler(Object.assign(req, { user }), res);
  };
