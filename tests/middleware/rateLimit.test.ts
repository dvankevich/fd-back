import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { TIME_MS } from "../../src/constants/time.ts";
import { createAuthRateLimiter } from "../../src/middleware/rateLimit.ts";

const appWith = (config: { windowMs: number; limit: number; enabled: boolean }) => {
  const app = express();
  app.post("/", createAuthRateLimiter(config), (_req, res) => {
    res.sendStatus(200);
  });
  return app;
};

describe("createAuthRateLimiter", () => {
  it("should give each created limiter its own budget", async () => {
    const config = { windowMs: TIME_MS.minute, limit: 1, enabled: true };
    const app = express();
    app.post("/register", createAuthRateLimiter(config), (_req, res) => {
      res.sendStatus(200);
    });
    app.post("/login", createAuthRateLimiter(config), (_req, res) => {
      res.sendStatus(200);
    });

    await request(app).post("/register").expect(200);
    await request(app).post("/login").expect(200);
    await request(app).post("/register").expect(429);
  });

  it("should answer 429 with the error body once the window limit is spent", async () => {
    const app = appWith({ windowMs: TIME_MS.minute, limit: 2, enabled: true });

    await request(app).post("/").expect(200);
    await request(app).post("/").expect(200);
    const res = await request(app).post("/").expect(429);

    expect(res.body).toEqual({ error: "Too many requests, please try again later" });
    expect(res.headers["ratelimit-policy"]).toBeDefined();
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("should let everything through when disabled", async () => {
    const app = appWith({ windowMs: TIME_MS.minute, limit: 1, enabled: false });

    await request(app).post("/").expect(200);
    await request(app).post("/").expect(200);
  });
});
