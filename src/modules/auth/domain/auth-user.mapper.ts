import type { AuthAccount, AuthUser } from "./auth.ports.ts";

export const toAuthUser = ({ id, name, email, avatar }: AuthAccount): AuthUser => ({
  id,
  name,
  email,
  avatar,
});
