import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { RefreshCookie, type RefreshTokenSource } from "../../src/utils/refreshCookie.ts";

const cookie = new RefreshCookie({
  name: "refreshToken",
  options: { httpOnly: true, sameSite: "strict", path: "/api/auth" },
  maxAgeMs: 1000,
});

const source = ({ body = {}, cookies = {} }: Partial<RefreshTokenSource>): RefreshTokenSource => ({ body, cookies });

describe("RefreshCookie", () => {
  it("should prefer the body token over the cookie", () => {
    expect(cookie.read(source({ body: { refreshToken: "from-body" }, cookies: { refreshToken: "from-cookie" } }))).toBe(
      "from-body",
    );
  });

  it("should fall back to the cookie and ignore empty or non-string values", () => {
    expect(cookie.read(source({ cookies: { refreshToken: "from-cookie" } }))).toBe("from-cookie");
    expect(cookie.read(source({ cookies: { refreshToken: "" } }))).toBeUndefined();
    expect(cookie.read(source({ cookies: { refreshToken: 5 } }))).toBeUndefined();
    expect(cookie.read(source({}))).toBeUndefined();
  });

  it("should read nothing when the route parsed neither a body nor cookies", () => {
    expect(cookie.read({})).toBeUndefined();
    expect(cookie.read({ cookies: { refreshToken: "from-cookie" } })).toBe("from-cookie");
    expect(cookie.read({ body: { refreshToken: "from-body" } })).toBe("from-body");
  });

  it("should set and clear with the same options so the browser drops the cookie", () => {
    const res = { cookie: vi.fn<Response["cookie"]>(), clearCookie: vi.fn<Response["clearCookie"]>() };

    cookie.set(res, "token");
    cookie.clear(res);

    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "token", {
      httpOnly: true,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 1000,
    });
    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", { httpOnly: true, sameSite: "strict", path: "/api/auth" });
  });
});
