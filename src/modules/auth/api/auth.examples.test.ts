import { describe, expect, it } from "vitest";
import type { z } from "zod";
import type { ErrorDetails } from "../../../core/exceptions/errors.ts";
import { toErrorDetails } from "../../../core/http/validate.middleware.ts";
import { VALIDATION_DETAILS_EXAMPLE } from "./auth.examples.ts";
import { LoginSchema } from "./input-dto/login.input-dto.ts";
import { RefreshTokenBodySchema } from "./input-dto/refresh-token.input-dto.ts";
import { RegisterSchema } from "./input-dto/register.input-dto.ts";

const rejectionDetails = <T extends z.ZodType>(schema: T, body: unknown): ErrorDetails => {
  const result = schema.safeParse(body);

  return result.success ? {} : toErrorDetails(result.error);
};

describe("VALIDATION_DETAILS_EXAMPLE", () => {
  it("should show what register really answers", () => {
    expect(rejectionDetails(RegisterSchema, { email: "not-email", password: "123", name: "" })).toEqual(
      VALIDATION_DETAILS_EXAMPLE.register,
    );
  });

  it("should show what login really answers", () => {
    expect(rejectionDetails(LoginSchema, { email: "not-email" })).toEqual(
      VALIDATION_DETAILS_EXAMPLE.login,
    );
  });

  it("should show what refresh and logout really answer", () => {
    expect(rejectionDetails(RefreshTokenBodySchema, { refreshToken: "" })).toEqual(
      VALIDATION_DETAILS_EXAMPLE.refreshToken,
    );
  });
});
