import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { UnauthorizedError } from "../../../core/exceptions/errors.ts";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { AuthService } from "../application/auth.service.ts";
import { AUTH_MESSAGE } from "../domain/auth.messages.ts";
import { isSessionEnded } from "../domain/session-ended.error.ts";
import type { AuthenticatedHandler } from "./authenticate.middleware.ts";
import type { RefreshCookie } from "./refresh-cookie.ts";
import type { LoginBody } from "./input-dto/login.input-dto.ts";
import type { RefreshTokenBody } from "./input-dto/refresh-token.input-dto.ts";
import type { RegisterBody } from "./input-dto/register.input-dto.ts";
import type { AuthResponse, Tokens } from "./view-dto/tokens.view-dto.ts";

type AuthControllerOptions = {
  auth: AuthService;
  refreshCookie: Pick<RefreshCookie, "read" | "set" | "clear">;
};

const clearCookieWhenEnded =
  (clear: () => void) =>
  (err: unknown): never => {
    if (isSessionEnded(err)) {
      clear();
    }
    throw err;
  };

export class AuthController {
  private readonly auth: AuthService;
  private readonly refreshCookie: AuthControllerOptions["refreshCookie"];

  constructor({ auth, refreshCookie }: AuthControllerOptions) {
    this.auth = auth;
    this.refreshCookie = refreshCookie;
  }

  register = async (
    req: Request<ParamsDictionary, AuthResponse, RegisterBody>,
    res: Response<AuthResponse>,
  ): Promise<void> => {
    const { user, tokens } = await this.auth.register(req.body);

    this.refreshCookie.set(res, tokens.refreshToken);

    res.status(HTTP_STATUS.created).json({ ...tokens, user });
  };

  login = async (
    req: Request<ParamsDictionary, AuthResponse, LoginBody>,
    res: Response<AuthResponse>,
  ): Promise<void> => {
    const { user, tokens } = await this.auth.login(req.body);

    this.refreshCookie.set(res, tokens.refreshToken);

    res.status(HTTP_STATUS.ok).json({ ...tokens, user });
  };

  refresh = async (
    req: Request<ParamsDictionary, Tokens, RefreshTokenBody>,
    res: Response<Tokens>,
  ): Promise<void> => {
    const presentedToken = this.refreshCookie.read(req);

    if (!presentedToken) {
      throw new UnauthorizedError(AUTH_MESSAGE.refreshTokenRequired);
    }

    const { userId, ...tokens } = await this.auth
      .refresh(presentedToken)
      .catch(clearCookieWhenEnded(() => this.refreshCookie.clear(res)));

    this.refreshCookie.set(res, tokens.refreshToken);

    res.status(HTTP_STATUS.ok).json(tokens);
  };

  logout: AuthenticatedHandler<ParamsDictionary, void, RefreshTokenBody> = async (req, res) => {
    await this.auth.logout({ userId: req.user.sub, refreshToken: this.refreshCookie.read(req) });

    this.refreshCookie.clear(res);

    res.status(HTTP_STATUS.noContent).end();
  };
}
