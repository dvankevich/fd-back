import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { AvatarView } from "../../domain/user.view.ts";

export const AvatarResponseSchema = registry.register(
  "AvatarResponse",
  z.object({
    avatar: z.string().openapi({
      example: "https://res.cloudinary.com/dvc0lg6q7/image/upload/v1787152924/foodies/avatars/user_clx8p2k1v0000qz7h9m4n2t5b.webp",
    }),
  }) satisfies z.ZodType<AvatarView>,
);
