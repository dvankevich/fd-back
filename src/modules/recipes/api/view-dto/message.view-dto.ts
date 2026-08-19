import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { MessageView } from "../../domain/recipe.view.ts";

export const MessageSchema = registry.register(
  "Message",
  z.object({
    message: z.string().openapi({ example: "Added to favorites" }),
  }) satisfies z.ZodType<MessageView>,
);
