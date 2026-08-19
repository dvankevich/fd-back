import { z } from "zod";
import { registry } from "./registry.ts";

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.string().openapi({ example: "Invalid credentials" }),
  }),
);

export const ValidationErrorSchema = registry.register(
  "ValidationError",
  z.object({
    error: z.string().openapi({ example: "Validation failed" }),
    details: z.record(z.string(), z.array(z.string())).openapi({
      example: {
        email: ["Invalid email address"],
        password: ["Too small: expected string to have >=8 characters"],
      },
    }),
  }),
);

export const jsonResponse = <T extends z.ZodType>(description: string, schema: T) => ({
  description,
  content: { "application/json": { schema } },
});
