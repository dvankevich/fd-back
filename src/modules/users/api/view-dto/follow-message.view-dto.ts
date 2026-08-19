import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { MessageView } from "../../domain/user.view.ts";

export const FollowMessageSchema = registry.register(
  "FollowMessage",
  z.object({
    message: z.string().openapi({ example: "Successfully followed" }),
  }) satisfies z.ZodType<MessageView>,
);
