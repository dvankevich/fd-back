import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { AvatarView } from "../../domain/user.view.ts";

export const AvatarResponseSchema = registry.register(
  "AvatarResponse",
  z.object({
    avatar: z.string().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
  }) satisfies z.ZodType<AvatarView>,
);
