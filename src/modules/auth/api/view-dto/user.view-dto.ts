import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { AuthUser } from "../../domain/auth.ports.ts";

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "FirstName LastName" }),
    email: z.email().openapi({ example: "user01@example.com" }),
    avatar: z.string().nullable().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
    createdAt: z.iso.datetime().openapi({ example: "2025-01-10T12:00:00.000Z" }),
  }),
);

export const AuthUserSchema = registry.register(
  "AuthUser",
  UserSchema.omit({ createdAt: true }) satisfies z.ZodType<AuthUser>,
);
