import type { AuthPayload } from "../domain/auth-payload.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
