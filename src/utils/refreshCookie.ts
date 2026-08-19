import type { CookieOptions, Response } from "express";
import type { Optional } from "../types/common.ts";
import { isNonEmptyString } from "./guards.ts";

type RefreshCookieOptions = { name: string; options: CookieOptions; maxAgeMs: number };

export type RefreshTokenSource = {
  body?: { refreshToken?: Optional<string> };
  cookies?: Record<string, unknown>;
};

export class RefreshCookie {
  private readonly name: string;
  private readonly options: CookieOptions;
  private readonly maxAgeMs: number;

  constructor({ name, options, maxAgeMs }: RefreshCookieOptions) {
    this.name = name;
    this.options = options;
    this.maxAgeMs = maxAgeMs;
  }

  read(req: RefreshTokenSource): Optional<string> {
    return [req.body?.refreshToken, req.cookies?.[this.name]].find(isNonEmptyString);
  }

  set(res: Pick<Response, "cookie">, refreshToken: string): void {
    res.cookie(this.name, refreshToken, { ...this.options, maxAge: this.maxAgeMs });
  }

  clear(res: Pick<Response, "clearCookie">): void {
    res.clearCookie(this.name, this.options);
  }
}
