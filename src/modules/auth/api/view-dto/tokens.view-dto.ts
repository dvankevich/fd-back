import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { TokenPair } from "../../domain/auth.ports.ts";
import { EXAMPLE } from "../auth.examples.ts";
import { AuthUserSchema } from "./user.view-dto.ts";

export const TokensSchema = registry.register(
  "Tokens",
  z.object({
    accessToken: z.string().openapi({ example: EXAMPLE.accessToken }),
    refreshToken: z.string().openapi({ example: EXAMPLE.refreshToken }),
  }) satisfies z.ZodType<TokenPair>,
);

export const AuthResponseSchema = registry.register(
  "AuthResponse",
  TokensSchema.extend({ user: AuthUserSchema }),
);

export type Tokens = z.infer<typeof TokensSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
