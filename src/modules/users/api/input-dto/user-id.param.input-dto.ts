import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";

export const UserIdParamSchema = registry.register(
  "UserIdParam",
  z.object({
    id: z.string().min(1).openapi({ example: "64c8d958249fae54bae90bb9" }),
  }),
);

export type UserIdParam = z.infer<typeof UserIdParamSchema>;
