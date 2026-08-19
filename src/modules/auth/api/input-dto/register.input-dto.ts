import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import { AUTH_LIMITS } from "../../domain/auth.limits.ts";
import { EmailSchema, NameSchema, PasswordSchema } from "./auth-fields.ts";

export const RegisterSchema = registry.register(
  "Register",
  z.object({
    email: EmailSchema,
    password: PasswordSchema.min(AUTH_LIMITS.passwordMinLength)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= AUTH_LIMITS.passwordMaxBytes,
        `Password must be at most ${AUTH_LIMITS.passwordMaxBytes} bytes`,
      )
      .openapi({
        description: `At least ${AUTH_LIMITS.passwordMinLength} characters and at most ${AUTH_LIMITS.passwordMaxBytes} bytes (bcrypt limit)`,
      }),
    name: NameSchema,
  }),
);

export type RegisterBody = z.infer<typeof RegisterSchema>;
