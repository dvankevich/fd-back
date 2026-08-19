import { z } from "zod";
import { AUTH_LIMITS } from "../../domain/auth.limits.ts";

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(AUTH_LIMITS.emailMaxLength))
  .openapi({
    type: "string",
    format: "email",
    maxLength: AUTH_LIMITS.emailMaxLength,
    example: "user01@example.com",
  });

export const PasswordSchema = z.string().openapi({ example: "securepass123" });

export const NameSchema = z
  .string()
  .trim()
  .min(1)
  .max(AUTH_LIMITS.nameMaxLength)
  .openapi({ example: "FirstName LastName" });
