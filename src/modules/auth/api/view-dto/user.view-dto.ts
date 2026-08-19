import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { AuthUser } from "../../domain/auth.ports.ts";

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string().openapi({ example: "clx8p2k1v0000qz7h9m4n2t5b" }),
    name: z.string().openapi({ example: "FirstName LastName" }),
    email: z.email().openapi({ example: "user01@example.com" }),
    avatar: z.string().nullable().openapi({
      example: "https://res.cloudinary.com/dvc0lg6q7/image/upload/v1787152924/foodies/avatars/user_clx8p2k1v0000qz7h9m4n2t5b.webp",
    }),
    createdAt: z.iso.datetime().openapi({ example: "2025-01-10T12:00:00.000Z" }),
  }),
);

export const AuthUserSchema = registry.register(
  "AuthUser",
  UserSchema.omit({ createdAt: true }) satisfies z.ZodType<AuthUser>,
);
