import { UnauthorizedError } from "../../../core/exceptions/errors.ts";
import type { ValueOf } from "../../../core/types/common.ts";

export const SESSION_END_REASON = {
  invalid: "invalid",
  expired: "expired",
  reuse: "reuse",
} as const;

export type SessionEndReason = ValueOf<typeof SESSION_END_REASON>;

export const SESSION_ERROR = {
  invalid: "Invalid refresh token",
  expired: "Refresh token expired",
  reuse: "Refresh token reuse detected",
} as const satisfies Record<SessionEndReason, string>;

export class SessionEndedError extends UnauthorizedError {
  constructor(readonly reason: SessionEndReason) {
    super(SESSION_ERROR[reason]);
  }
}

export const isSessionEnded = (err: unknown): err is SessionEndedError =>
  err instanceof SessionEndedError;
