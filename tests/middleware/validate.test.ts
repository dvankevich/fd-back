import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import { errorHandler } from "../../src/middleware/errorHandler.ts";
import { validateBody } from "../../src/middleware/validate.ts";

const BodySchema = z.object({ email: z.email(), password: z.string().min(8) });

const app = express();
app.use(express.json());
app.post("/", validateBody(BodySchema), (_req, res) => {
  res.sendStatus(200);
});
app.use(errorHandler);

describe("validateBody", () => {
  it("should report every failing field", async () => {
    const res = await request(app).post("/").send({ email: "nope", password: "short" }).expect(422);

    expect(res.body).toEqual({
      error: "Validation failed",
      details: { email: expect.any(Array), password: expect.any(Array) },
    });
  });

  it("should explain a body that is not an object instead of returning empty details", async () => {
    const res = await request(app).post("/").send([]).expect(422);

    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.body).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it("should pass a valid body through", async () => {
    await request(app).post("/").send({ email: "user@example.com", password: "securepass123" }).expect(200);
  });
});
