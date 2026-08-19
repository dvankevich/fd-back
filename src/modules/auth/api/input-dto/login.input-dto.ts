import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import { EmailSchema, PasswordSchema } from "./auth-fields.ts";

export const LoginSchema = registry.register(
  "Login",
  z.object({
    email: EmailSchema,
    password: PasswordSchema.min(1),
  }),
);

export type LoginBody = z.infer<typeof LoginSchema>;
