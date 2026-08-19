import { describe, it, expect, vi } from "vitest";
import express, { type RequestHandler } from "express";
import createHttpError from "http-errors";
import request from "supertest";
import { withUser, createAuthenticate } from "../../src/middleware/authenticate.ts";
import { errorHandler } from "../../src/core/http/error-handler.middleware.ts";
import type { AuthPayload } from "../../src/types/auth.ts";

const userId = "clx1234567890abcdefghij";

const appWith = (...handlers: RequestHandler[]) => {
  const app = express();
  app.get("/", ...handlers);
  app.use(errorHandler);
  return app;
};

const echoUser: RequestHandler = (req, res) => {
  res.json({ user: req.user ?? null });
};

const authenticatorResolving = (payload: AuthPayload) => ({
  authenticate: vi.fn<(authorization: string | undefined) => Promise<AuthPayload>>().mockResolvedValue(payload),
});

describe("createAuthenticate", () => {
  it("should set req.user from the Authorization header and continue", async () => {
    const authenticator = authenticatorResolving({ sub: userId });

    const res = await request(appWith(createAuthenticate(authenticator), echoUser))
      .get("/")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(authenticator.authenticate).toHaveBeenCalledWith("Bearer token");
    expect(res.body).toEqual({ user: { sub: userId } });
  });

  it("should turn an authenticator rejection into the error response and stop the chain", async () => {
    const authenticate = vi.fn().mockRejectedValue(createHttpError(401, "Authentication required"));
    const next = vi.fn<RequestHandler>((_req, res) => {
      res.sendStatus(200);
    });

    const res = await request(appWith(createAuthenticate({ authenticate }), next)).get("/").expect(401);

    expect(res.body).toEqual({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("withUser", () => {
  it("should hand the narrowed request to the handler after authenticate", async () => {
    const handler = vi.fn(async (req: { user: AuthPayload }, res: express.Response) => {
      res.json({ sub: req.user.sub });
    });

    const res = await request(appWith(createAuthenticate(authenticatorResolving({ sub: userId })), withUser(handler)))
      .get("/")
      .expect(200);

    expect(res.body).toEqual({ sub: userId });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should fail as a server error when the route forgot the authenticate middleware", async () => {
    const handler = vi.fn(async () => undefined);

    const res = await request(appWith(withUser(handler))).get("/").expect(500);

    expect(res.body).toEqual({ error: "Internal server error" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("should forward a rejected handler to the error handler", async () => {
    const handler = vi.fn(async () => {
      throw createHttpError(409, "boom");
    });

    const res = await request(appWith(createAuthenticate(authenticatorResolving({ sub: userId })), withUser(handler)))
      .get("/")
      .expect(409);

    expect(res.body).toEqual({ error: "boom" });
  });
});
