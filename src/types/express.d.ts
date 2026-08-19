import type { AuthPayload } from "./auth.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
