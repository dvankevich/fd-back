import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import { EXAMPLE } from "../auth.examples.ts";

export const RefreshTokenBodySchema = registry.register(
  "RefreshTokenBody",
  z.object({
    refreshToken: z.string().min(1).optional().openapi({ example: EXAMPLE.refreshToken }),
  }),
);

export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;
